// Cloud mode: Firebase free (Spark) plan only.
//  - Login = phone number + 4-number code (Email/Password provider under the hood).
//    No SMS, because Firebase charges per SMS.
//  - Players who tap a WhatsApp link sign in anonymously (free) and can only tick "I'm in / out".
//  - Firestore keeps a copy on the phone, so the app works offline and sends later.
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, signOut } from "firebase/auth";
import {
  initializeFirestore, persistentLocalCache, persistentSingleTabManager, collection, doc, setDoc, updateDoc, getDoc,
  onSnapshot, query, where, limit, serverTimestamp, FieldPath,
} from "firebase/firestore";
import { cleanPhone, joinCode, emptyStats, applyMatchToStats, decideScore, todayISO } from "./common.js";

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const emailFor = (phone) => `${cleanPhone(phone)}@players.grassroots.app`;
const passFor = (phone, pin) => `gr-${pin}-${cleanPhone(phone).slice(-4)}`; // Firebase needs 6+ characters

export function createCloudStore(emit) {
  const app = initializeApp(cfg);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }) });

  const state = { ready: false, mode: "cloud", me: null, teams: [], slots: [], challenges: [], matches: [], refMatches: [] };
  const push = () => emit({ ...state, matches: mergeMatches() });
  const mergeMatches = () => { const m = new Map(); [...state.matches, ...state.refMatches].forEach((x) => m.set(x.id, x)); return [...m.values()]; };
  let unsubs = [];
  const stopAll = () => { unsubs.forEach((u) => u()); unsubs = []; };
  const listen = (q, key, after) => unsubs.push(onSnapshot(q, (snap) => { state[key] = snap.docs.map((d) => ({ id: d.id, ...d.data() })); after && after(); push(); }, () => push()));
  // Writes are not awaited: offline they wait in the phone's queue and go when network returns.
  const write = (p) => { p.catch((e) => console.warn("write failed", e)); };

  const myTeam = () => state.teams.find((t) => t.id === state.me?.teamId);

  function countMyStats() {
    const t = myTeam(); if (!t || t.captainId !== state.me?.id) return;
    let stats = t.stats || emptyStats(), changed = false;
    for (const m of state.matches) {
      const s = applyMatchToStats(stats, m, t.id);
      if (s) { stats = s; changed = true; }
    }
    if (changed) write(updateDoc(doc(db, "teams", t.id), { stats }));
  }

  function startListening(user) {
    stopAll();
    listen(query(collection(db, "teams"), limit(800)), "teams");
    listen(query(collection(db, "slots"), where("date", ">=", todayISO()), limit(500)), "slots");
    if (user.teamId) {
      // Query must match the security rule (captains array), or Firestore refuses it.
      listen(query(collection(db, "challenges"), where("captains", "array-contains", user.id), limit(200)), "challenges");
      listen(query(collection(db, "matches"), where("teamIds", "array-contains", user.teamId), limit(300)), "matches", countMyStats);
    }
    if (user.role === "ref") listen(query(collection(db, "matches"), where("needRef", "==", true), where("date", ">=", todayISO()), limit(100)), "refMatches");
  }

  let userUnsub = null, listeningKey = null;
  onAuthStateChanged(auth, (fu) => {
    if (userUnsub) { userUnsub(); userUnsub = null; }
    if (!fu || fu.isAnonymous) { stopAll(); listeningKey = null; state.me = null; state.ready = true; push(); return; }
    userUnsub = onSnapshot(doc(db, "users", fu.uid), (s) => {
      state.me = s.exists() ? { id: fu.uid, ...s.data() } : null;
      state.ready = true;
      const key = state.me ? `${state.me.teamId}|${state.me.role}` : null;
      if (key && key !== listeningKey) { listeningKey = key; startListening(state.me); }
      push();
    });
  });

  const api = {
    async signUp({ name, phone, pin, role }) {
      const cred = await createUserWithEmailAndPassword(auth, emailFor(phone), passFor(phone, pin));
      await setDoc(doc(db, "users", cred.user.uid), { name: name.trim(), phone: cleanPhone(phone), role, teamId: null, createdAt: serverTimestamp() });
    },
    async signIn({ phone, pin }) {
      try { await signInWithEmailAndPassword(auth, emailFor(phone), passFor(phone, pin)); }
      catch { throw new Error("wrong"); }
    },
    async signOut() { stopAll(); listeningKey = null; await signOut(auth); },
    async createTeam(d) {
      const me = state.me; const ref = doc(collection(db, "teams"));
      const t = { name: d.name.trim(), city: d.city, area: d.area.trim(), c1: d.c1, c2: d.c2, level: d.level, captainId: me.id, captainPhone: me.phone, captainName: me.name, players: [me.name], joinCode: joinCode(), stats: emptyStats(), createdAt: serverTimestamp() };
      await setDoc(ref, t);
      await updateDoc(doc(db, "users", me.id), { teamId: ref.id });
      return { id: ref.id, ...t };
    },
    async addPlayer(teamId, name) { const t = state.teams.find((x) => x.id === teamId); const n = name.trim(); if (!n || t.players.includes(n)) return; write(updateDoc(doc(db, "teams", teamId), { players: [...t.players, n] })); },
    async removePlayer(teamId, name) { const t = state.teams.find((x) => x.id === teamId); write(updateDoc(doc(db, "teams", teamId), { players: t.players.filter((x) => x !== name) })); },
    async postSlot({ date, time, format }) {
      const id = `${state.me.teamId}_${date}`; // one free-day post per team per day
      write(setDoc(doc(db, "slots", id), { teamId: state.me.teamId, ownerId: state.me.id, date, time, format, status: "open", createdAt: serverTimestamp() }));
      return { id };
    },
    async sendChallenge({ toTeamId, date, time, format, venue, hostId }) {
      const ref = doc(collection(db, "challenges"));
      const to = state.teams.find((t) => t.id === toTeamId);
      write(setDoc(ref, { fromTeamId: state.me.teamId, toTeamId, teamIds: [state.me.teamId, toTeamId], captains: [state.me.id, to.captainId], date, time, format, venue, hostId, status: "sent", createdAt: serverTimestamp() }));
      return { id: ref.id };
    },
    async answerChallenge(id, yes) {
      const c = state.challenges.find((x) => x.id === id); if (!c) return;
      if (!yes) { write(updateDoc(doc(db, "challenges", id), { status: "declined" })); return; }
      const home = state.teams.find((t) => t.id === c.hostId);
      const away = state.teams.find((t) => t.id === (c.hostId === c.fromTeamId ? c.toTeamId : c.fromTeamId));
      const ref = doc(db, "matches", id); // match id = challenge id, so it can't be created twice
      write(setDoc(ref, {
        challengeId: id, homeId: home.id, awayId: away.id,
        home: { name: home.name, c1: home.c1, c2: home.c2, phone: home.captainPhone }, away: { name: away.name, c1: away.c1, c2: away.c2, phone: away.captainPhone },
        captains: [home.captainId, away.captainId], teamIds: [home.id, away.id],
        date: c.date, time: c.time, format: c.format, venue: c.venue || null, status: "on",
        rsvp: {}, players: { [home.id]: home.players || [], [away.id]: away.players || [] },
        scores: {}, final: null, ref: null, needRef: true, cost: {}, paid: {}, createdAt: serverTimestamp(),
      }));
      write(updateDoc(doc(db, "challenges", id), { status: "accepted" }));
      for (const t of [home, away]) write(updateDoc(doc(db, "slots", `${t.id}_${c.date}`), { status: "taken" }).catch(() => {}));
      return { id };
    },
    async rsvp(matchId, teamId, name, going) {
      if (!auth.currentUser) await signInAnonymously(auth);
      write(updateDoc(doc(db, "matches", matchId), new FieldPath("rsvp", teamId, name), going));
    },
    async submitScore(matchId, teamId, h, a) {
      const m = mergeMatches().find((x) => x.id === matchId);
      const next = { ...m, scores: { ...(m.scores || {}), [teamId]: [h, a] } };
      const r = decideScore(next);
      write(updateDoc(doc(db, "matches", matchId), { [`scores.${teamId}`]: [h, a], ...(r.final ? { final: r.final, status: "done" } : {}) }));
    },
    async cancelMatch(matchId, teamId) { write(updateDoc(doc(db, "matches", matchId), { status: "cancelled", cancelledBy: teamId, cancelledAt: Date.now() })); },
    async setCost(matchId, teamId, total) { write(updateDoc(doc(db, "matches", matchId), { [`cost.${teamId}`]: total })); },
    async markPaid(matchId, teamId, name, on) { write(updateDoc(doc(db, "matches", matchId), new FieldPath("paid", teamId, name), on)); },
    async volunteerRef(matchId) { write(updateDoc(doc(db, "matches", matchId), { ref: { name: state.me.name, phone: state.me.phone, id: state.me.id }, needRef: false })); },
    async getMatch(id) {
      if (!auth.currentUser) await signInAnonymously(auth);
      const s = await getDoc(doc(db, "matches", id));
      return s.exists() ? { id: s.id, ...s.data() } : null;
    },
  };
  return api;
}
