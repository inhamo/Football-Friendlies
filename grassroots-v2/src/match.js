// Fair-match score. Ported and simplified from services/communityAlgorithms.js in v1.
// level 40% · distance 25% · reliability 20% · home/away fairness 15%.
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

// Turn-up record with a gentle start: a new team counts as 4 out of 5.
export function reliability(stats = {}) {
  const played = stats.played || 0;
  const late = stats.lateCancel || 0;
  const noShow = stats.noShow || 0;
  const total = played + late + noShow;
  // A late cancel hurts, a no-show hurts more.
  const score = (played + 0.3 * late + 4) / (total + 5);
  return { score: clamp(score), turnedUp: played, outOf: total };
}

export function levelFit(a, b) { return clamp(1 - Math.abs((a || 2) - (b || 2)) / 2); }

export function placeFit(me, them) {
  const norm = (s) => String(s || "").trim().toLowerCase();
  if (norm(me.area) && norm(me.area) === norm(them.area)) return 1;
  if (norm(me.city) && norm(me.city) === norm(them.city)) return 0.65;
  return 0.15;
}

// Who should host? The team that has travelled more recently.
export function hostFor(me, them) {
  const debt = (t) => (t.stats?.away || 0) - (t.stats?.home || 0);
  return debt(me) >= debt(them) ? me.id : them.id;
}

function timeFit(a, b) {
  const m = (s) => { const [h, mi] = String(s || "12:00").split(":").map(Number); return h * 60 + (mi || 0); };
  return clamp(1 - Math.abs(m(a) - m(b)) / 360);
}

export function rankSlots({ me, want, slots, teams }) {
  const out = [];
  for (const s of slots) {
    if (s.teamId === me.id || s.status !== "open") continue;
    if (s.date !== want.date || Number(s.format) !== Number(want.format)) continue;
    const them = teams.find((x) => x.id === s.teamId);
    if (!them) continue;
    const lv = levelFit(me.level, them.level);
    const pl = placeFit(me, them);
    const rel = reliability(them.stats);
    const host = hostFor(me, them);
    const fair = host === me.id ? 1 : 0.7;
    const score = 0.4 * lv + 0.25 * pl + 0.2 * rel.score + 0.15 * fair;
    out.push({ slot: s, team: them, score: score * (0.75 + 0.25 * timeFit(s.time, want.time)), lv, pl, rel, host });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 3);
}
