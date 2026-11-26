// Practice mode: everything stays on this phone. Sample teams are clearly marked "Sample".
// Used when no Firebase project is connected (zero cost, zero setup) — good for testing and training.
import { uid, todayISO, addDays, cleanPhone, joinCode, emptyStats, applyMatchToStats, decideScore } from "./common.js";

const KEY = "gr_demo_v2";

function nextWeekday(day) { // 6 = Saturday, 0 = Sunday
  let d = todayISO();
  for (let i = 0; i < 8; i++) { if (new Date(d + "T12:00:00").getDay() === day && i > 0) return d; d = addDays(d, 1); }
  return d;
}

function seed() {
  const sat = nextWeekday(6), sun = nextWeekday(0);
  const mk = (name, city, area, c1, c2, level, stats) => ({ id: uid(), name, city, area, c1, c2, level, sample: true, captainId: "sample", captainPhone: "", players: [], joinCode: joinCode(), stats: { ...emptyStats(), ...stats } });
  const teams = [
    mk("Mbare Stars", "Harare", "Mbare", "#B3121F", "#FFFFFF", 2, { played: 9, home: 4, away: 5, won: 4, drew: 2, lost: 3, lateCancel: 1 }),
    mk("Highfield Legends", "Harare", "Highfield", "#1E7B3C", "#E5B611", 2, { played: 12, home: 7, away: 5, won: 6, drew: 3, lost: 3 }),
    mk("Glen View Young Stars", "Harare", "Glen View", "#13306E", "#FFFFFF", 1, { played: 3, home: 1, away: 2, won: 1, lost: 2 }),
    mk("Kuwadzana United", "Harare", "Kuwadzana", "#E5B611", "#0B1F4B", 3, { played: 15, home: 8, away: 7, won: 11, drew: 2, lost: 2, noShow: 1 }),
    mk("Zengeza Veterans", "Chitungwiza", "Zengeza", "#4A5363", "#E5B611", 2, { played: 6, home: 3, away: 3, won: 2, drew: 2, lost: 2 }),
  ];
  const slot = (team, date, time, format) => ({ id: uid(), teamId: team.id, date, time, format, status: "open", createdAt: Date.now() });
  const slots = [
    slot(teams[0], sat, "15:00", 11), slot(teams[1], sat, "13:00", 11), slot(teams[2], sat, "09:00", 7),
    slot(teams[3], sat, "15:00", 11), slot(teams[4], sun, "10:00", 11), slot(teams[1], sun, "15:00", 7),
  ];
  // One sample match between two sample teams that still needs a referee (for the referee screen).
  const [h, a] = [teams[3], teams[4]];
  const refMatch = { id: uid(), homeId: h.id, awayId: a.id, home: { name: h.name, c1: h.c1, c2: h.c2, phone: "" }, away: { name: a.name, c1: a.c1, c2: a.c2, phone: "" }, captains: ["sample"], teamIds: [h.id, a.id], date: sun, time: "13:00", format: 11, venue: { name: "Kuwadzana grounds", landmark: "behind the shopping centre" }, status: "on", rsvp: {}, players: { [h.id]: [], [a.id]: [] }, scores: {}, final: null, ref: null, needRef: true, cost: {}, paid: {}, createdAt: Date.now(), sample: true };
  return { users: [], meId: null, teams, slots, challenges: [], matches: [refMatch] };
}

export function createDemoStore(emit) {
  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { db = seed(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} publish(); };
  const me = () => db.users.find((u) => u.id === db.meId) || null;
  const team = (id) => db.teams.find((t) => t.id === id);
  const publish = () => emit({ ready: true, mode: "demo", me: me(), teams: db.teams, slots: db.slots, challenges: db.challenges, matches: db.matches });

  const later = (fn, ms = 1500) => setTimeout(() => { fn(); save(); }, ms);
  const countStats = (m) => {
    for (const id of [m.homeId, m.awayId]) {
      const t = team(id); if (!t) continue;
      const s = applyMatchToStats(t.stats, m, id); if (s) t.stats = s;
    }
  };

  const api = {
    async signUp({ name, phone, pin, role }) {
      const p = cleanPhone(phone);
      if (db.users.some((u) => u.phone === p)) throw new Error("exists");
      const u = { id: uid(), name: name.trim(), phone: p, pin, role, teamId: null };
      db.users.push(u); db.meId = u.id; save(); return u;
    },
    async signIn({ phone, pin }) {
      const u = db.users.find((x) => x.phone === cleanPhone(phone) && x.pin === pin);
      if (!u) throw new Error("wrong"); db.meId = u.id; save(); return u;
    },
    async signOut() { db.meId = null; save(); },
    async resetPractice() { db = seed(); save(); },
    async createTeam(d) {
      const u = me();
      const t = { id: uid(), name: d.name.trim(), city: d.city, area: d.area.trim(), c1: d.c1, c2: d.c2, level: d.level, captainId: u.id, captainPhone: u.phone, captainName: u.name, players: [u.name], joinCode: joinCode(), stats: emptyStats() };
      db.teams.push(t); u.teamId = t.id; save(); return t;
    },
    async addPlayer(teamId, name) { const t = team(teamId); const n = name.trim(); if (n && !t.players.includes(n)) t.players.push(n); save(); },
    async removePlayer(teamId, name) { const t = team(teamId); t.players = t.players.filter((x) => x !== name); save(); },
    async postSlot({ date, time, format }) {
      const u = me(); db.slots = db.slots.filter((s) => !(s.teamId === u.teamId && s.date === date));
      const s = { id: uid(), teamId: u.teamId, date, time, format, status: "open", createdAt: Date.now() };
      db.slots.push(s); save(); return s;
    },
    async sendChallenge({ toTeamId, date, time, format, venue, hostId }) {
      const u = me();
      const c = { id: uid(), fromTeamId: u.teamId, toTeamId, date, time, format, venue, hostId, status: "sent", createdAt: Date.now() };
      db.challenges.push(c); save();
      if (team(toTeamId)?.sample) later(() => { api._accept(c); }, 1800); // sample teams say yes in practice mode
      return c;
    },
    _accept(c) {
      c.status = "accepted";
      const home = team(c.hostId), away = team(c.hostId === c.fromTeamId ? c.toTeamId : c.fromTeamId);
      const m = { id: uid(), challengeId: c.id, homeId: home.id, awayId: away.id, home: { name: home.name, c1: home.c1, c2: home.c2, phone: home.captainPhone }, away: { name: away.name, c1: away.c1, c2: away.c2, phone: away.captainPhone }, captains: [home.captainId, away.captainId], teamIds: [home.id, away.id], date: c.date, time: c.time, format: c.format, venue: c.venue, status: "on", rsvp: {}, players: { [home.id]: [...home.players], [away.id]: [...away.players] }, scores: {}, final: null, ref: null, needRef: true, cost: {}, paid: {}, createdAt: Date.now() };
      db.matches.push(m);
      db.slots.forEach((s) => { if ((s.teamId === home.id || s.teamId === away.id) && s.date === c.date) s.status = "taken"; });
      return m;
    },
    async answerChallenge(id, yes) {
      const c = db.challenges.find((x) => x.id === id); if (!c) return;
      if (yes) { const m = api._accept(c); save(); return m; }
      c.status = "declined"; save();
    },
    async rsvp(matchId, teamId, name, going) {
      const m = db.matches.find((x) => x.id === matchId); if (!m) return;
      m.rsvp[teamId] = { ...(m.rsvp[teamId] || {}), [name]: going };
      if (!m.players[teamId].includes(name)) m.players[teamId].push(name);
      save();
    },
    async submitScore(matchId, teamId, h, a) {
      const m = db.matches.find((x) => x.id === matchId);
      m.scores = { ...m.scores, [teamId]: [h, a] };
      const other = teamId === m.homeId ? m.awayId : m.homeId;
      if (team(other)?.sample) later(() => { m.scores[other] = [h, a]; const r = decideScore(m); if (r.final) { m.final = r.final; m.status = "done"; countStats(m); } }, 1600);
      const r = decideScore(m); if (r.final) { m.final = r.final; m.status = "done"; countStats(m); }
      save();
    },
    async cancelMatch(matchId, teamId) {
      const m = db.matches.find((x) => x.id === matchId);
      m.status = "cancelled"; m.cancelledBy = teamId; m.cancelledAt = Date.now(); countStats(m); save();
    },
    async setCost(matchId, teamId, total) { const m = db.matches.find((x) => x.id === matchId); m.cost = { ...m.cost, [teamId]: total }; save(); },
    async markPaid(matchId, teamId, name, on) { const m = db.matches.find((x) => x.id === matchId); m.paid = { ...m.paid, [teamId]: { ...(m.paid[teamId] || {}), [name]: on } }; save(); },
    async volunteerRef(matchId) { const u = me(); const m = db.matches.find((x) => x.id === matchId); m.ref = { name: u.name, phone: u.phone, id: u.id }; m.needRef = false; save(); },
    async getMatch(id) { return db.matches.find((x) => x.id === id) || null; },
    async joinByCode() { return null; },
  };
  setTimeout(publish, 0);
  return api;
}
