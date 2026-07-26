const LIVE_FEED_URL = process.env.EXPO_PUBLIC_MATCH_FEED_URL;

function normalizeMatch(record) {
  return {
    id: String(record.id),
    date: record.date,
    kickoff: record.kickoff,
    venue: record.venue || "Venue awaiting confirmation",
    home: record.home,
    away: record.away,
    status: record.status || "SCHEDULED",
    minute: record.minute ?? null,
    homeScore: record.homeScore ?? null,
    awayScore: record.awayScore ?? null,
    events: Array.isArray(record.events) ? record.events : [],
    stats: Array.isArray(record.stats) ? record.stats : [],
  };
}

export async function fetchLiveScores() {
  if (!LIVE_FEED_URL) return [];
  const response = await fetch(
    `${LIVE_FEED_URL.replace(/\/$/, "")}/matches/live`,
    {
      headers: { Accept: "application/json" },
    },
  );
  if (!response.ok) throw new Error(`Live feed returned ${response.status}`);
  const body = await response.json();
  const matches = Array.isArray(body) ? body : body.matches;
  if (!Array.isArray(matches))
    throw new Error("Live feed returned invalid data");
  return matches.map(normalizeMatch);
}

export function liveRecordToFixture(record) {
  const fixture = [
    record.date,
    record.home,
    record.away,
    record.kickoff,
    record.venue,
  ];
  fixture.coverage = record;
  return fixture;
}
