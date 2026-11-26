// Shared helpers for both the practice (demo) store and the cloud (Firebase) store.
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
export const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
export const cleanPhone = (p) => {
  let s = String(p || "").replace(/\D/g, "");
  if (s.startsWith("0")) s = "263" + s.slice(1);      // 0771… → 263771…
  if (s.length === 9 && s.startsWith("7")) s = "263" + s;
  return s;
};
export const joinCode = () => Math.random().toString(36).slice(2, 7).toUpperCase();

export function emptyStats() { return { played: 0, won: 0, drew: 0, lost: 0, home: 0, away: 0, lateCancel: 0, noShow: 0, counted: [] }; }

// Each captain only ever updates THEIR OWN team's record (safer rules, no cross-team writes).
export function applyMatchToStats(stats, match, teamId) {
  const s = { ...emptyStats(), ...(stats || {}) };
  s.counted = [...(s.counted || [])];
  if (s.counted.includes(match.id)) return null; // already counted
  if (match.status === "done" && match.final) {
    const isHome = match.homeId === teamId;
    const [h, a] = match.final;
    const mine = isHome ? h : a, theirs = isHome ? a : h;
    s.played++; isHome ? s.home++ : s.away++;
    if (mine > theirs) s.won++; else if (mine === theirs) s.drew++; else s.lost++;
  } else if (match.status === "cancelled" && match.cancelledBy === teamId) {
    const hoursBefore = (new Date(`${match.date}T${match.time || "12:00"}:00`) - new Date(match.cancelledAt || Date.now())) / 3600000;
    if (hoursBefore < 48) s.lateCancel++;
  } else return null;
  s.counted.push(match.id);
  if (s.counted.length > 200) s.counted = s.counted.slice(-200);
  return s;
}

export function decideScore(match) {
  const sc = match.scores || {};
  const a = sc[match.homeId], b = sc[match.awayId];
  if (a && b && a[0] === b[0] && a[1] === b[1]) return { final: a, clash: false };
  if (a && b) return { final: null, clash: true };
  return { final: null, clash: false };
}

export function linkFor(path) {
  const base = (typeof location !== "undefined" ? location.origin + location.pathname : "");
  return `${base}#${path}`;
}
