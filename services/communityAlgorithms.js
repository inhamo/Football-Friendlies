const clamp01 = (value) => Math.max(0, Math.min(1, value));

export function competitiveFit(team, opponent) {
  const ratingGap = Math.abs((team.rating || 1000) - (opponent.rating || 1000));
  return clamp01(1 - ratingGap / 600);
}

export function homeAwayFairness(team, opponent, proposedSide) {
  const teamTravelDebt = (team.awayLast6 || 0) - (team.homeLast6 || 0);
  const opponentTravelDebt =
    (opponent.awayLast6 || 0) - (opponent.homeLast6 || 0);
  const fairHomeTeam =
    teamTravelDebt >= opponentTravelDebt ? team.id : opponent.id;
  return proposedSide.homeTeamId === fairHomeTeam
    ? 1
    : clamp01(1 - Math.abs(teamTravelDebt - opponentTravelDebt) / 6);
}

export function internalReliability(events, now = Date.now()) {
  if (!events.length) return 0.65;
  let weighted = 0;
  let totalWeight = 0;
  events.forEach((event) => {
    const ageDays = Math.max(
      0,
      (now - new Date(event.at).getTime()) / 86400000,
    );
    const weight = Math.exp(-ageDays / 60);
    const value =
      event.type === "completed"
        ? 1
        : event.type === "late"
          ? 0.55
          : event.type === "cancelled"
            ? 0
            : 0.7;
    weighted += value * weight;
    totalWeight += weight;
  });
  return clamp01(weighted / totalWeight);
}

export function cancellationImpact(cancellation) {
  const hours = Math.max(0, cancellation.hoursBeforeKickoff || 0);
  const affected = cancellation.confirmedPlayers || 0;
  const lateFactor = clamp01(1 - hours / 72);
  return {
    severity: clamp01(lateFactor * 0.7 + Math.min(affected, 30) / 100),
    affectedPlayers: affected,
    visibilityDays: Math.round(7 + lateFactor * 21),
  };
}

export function travelFairness(team, opponent, distanceKm) {
  const teamKm = team.travelKm30 || 0;
  const opponentKm = opponent.travelKm30 || 0;
  const debtBoost = clamp01(0.5 + (opponentKm - teamKm) / 200);
  const distanceScore = clamp01(1 - distanceKm / 80);
  return clamp01(distanceScore * 0.65 + debtBoost * 0.35);
}

export function locationCompatibility(team, opponent) {
  const zone = (area) => {
    const value = String(area || "").toLowerCase();
    const known = {
      harare: [
        "harare",
        "avondale",
        "mbare",
        "highfield",
        "greendale",
        "borrowdale",
        "belgravia",
        "arcadia",
        "glen view",
        "glen norah",
        "dzivarasekwa",
        "warren park",
      ],
      bulawayo: ["bulawayo", "nkulumane", "luveve", "magwegwe", "pumula"],
      nyanga: ["nyanga"],
      mutare: ["mutare", "dangamvura", "sakubva"],
      chitungwiza: ["chitungwiza", "seke", "zengeza", "unit l", "st mary"],
      gweru: ["gweru", "mkoba"],
      masvingo: ["masvingo", "mucheke"],
    };
    return (
      Object.entries(known).find(([, aliases]) =>
        aliases.some((alias) => value.includes(alias)),
      )?.[0] || ""
    );
  };
  const teamZone = zone(team.area);
  const opponentZone = zone(opponent.area);
  if (teamZone && opponentZone) return teamZone === opponentZone ? 1 : 0.15;
  const tokens = (value) =>
    String(value || "")
      .toLowerCase()
      .split(/[,/\s-]+/)
      .filter((token) => token.length > 2);
  const teamTokens = tokens(team.area);
  const opponentTokens = tokens(opponent.area);
  if (!teamTokens.length || !opponentTokens.length) return 0.35;
  const shared = teamTokens.filter((token) => opponentTokens.includes(token));
  if (shared.length === Math.min(teamTokens.length, opponentTokens.length))
    return 1;
  if (shared.length) return 0.75;
  return 0.15;
}

export function squadOverlap(teamAvailability, opponentAvailability, slot) {
  const teamReady = teamAvailability.filter(
    (item) => item.slot === slot && item.available,
  ).length;
  const opponentReady = opponentAvailability.filter(
    (item) => item.slot === slot && item.available,
  ).length;
  return clamp01(Math.min(teamReady, opponentReady) / 14);
}

export function costCompatibility(teamBudget, proposal) {
  const total =
    (proposal.pitch || 0) + (proposal.referee || 0) + (proposal.transport || 0);
  const lowerBudget = Math.max(
    1,
    Math.min(teamBudget.team || 0, teamBudget.opponent || 0),
  );
  return clamp01(1 - Math.max(0, total - lowerBudget) / lowerBudget);
}

export function rivalryAndVariety(history) {
  const recentMeetings = history.filter((match) => match.daysAgo <= 45).length;
  const closeGames = history.filter(
    (match) => Math.abs(match.homeScore - match.awayScore) <= 1,
  ).length;
  const rivalry = clamp01(closeGames / Math.max(1, history.length));
  const repetitionPenalty = clamp01(recentMeetings / 3);
  return clamp01(0.5 + rivalry * 0.4 - repetitionPenalty * 0.55);
}

export function ageCompatibility(team, opponent) {
  if (team.ageBand === opponent.ageBand) return 1;
  if (team.ageBand === "Senior" || opponent.ageBand === "Senior") return 0;
  return Math.abs((team.maxAge || 0) - (opponent.maxAge || 0)) <= 1 ? 0.75 : 0;
}

export function leagueConflictGuard(team, league) {
  const reasons = [];
  if (team.activeMatchDays?.includes(league.matchDay))
    reasons.push("match-day-overlap");
  if (team.registeredCompetitionTypes?.includes(league.registrationType))
    reasons.push("player-registration-conflict");
  if (team.unpaidLeagueBalance > 0) reasons.push("unsettled-league-balance");
  return {
    allowed: reasons.length === 0,
    reasons,
    action: reasons.length ? "resolve-before-request" : "request-review",
  };
}

export function rankOpponentCandidates(team, candidates, context) {
  return candidates
    .map((opponent) => {
      const proposedSide =
        context.proposedSide.homeTeamId === "__opponent__"
          ? { homeTeamId: opponent.id }
          : context.proposedSide.homeTeamId === "__fair__"
            ? {
                homeTeamId:
                  (team.awayLast6 || 0) - (team.homeLast6 || 0) >=
                  (opponent.awayLast6 || 0) - (opponent.homeLast6 || 0)
                    ? team.id
                    : opponent.id,
              }
            : context.proposedSide;
      const scores = {
        location: locationCompatibility(team, opponent),
        competitive: competitiveFit(team, opponent),
        homeAway: homeAwayFairness(team, opponent, proposedSide),
        reliability: internalReliability(opponent.behaviour || []),
        travel: travelFairness(team, opponent, opponent.distanceKm || 0),
        availability: squadOverlap(
          team.availability || [],
          opponent.availability || [],
          context.slot,
        ),
        cost: costCompatibility(
          { team: team.matchBudget, opponent: opponent.matchBudget },
          context.costs,
        ),
        rivalry: rivalryAndVariety(opponent.historyWithTeam || []),
        age: ageCompatibility(team, opponent),
      };
      const score =
        scores.location * 0.45 +
        scores.travel * 0.15 +
        scores.availability * 0.12 +
        scores.competitive * 0.1 +
        scores.homeAway * 0.14 +
        scores.reliability * 0.05 +
        scores.cost * 0.03 +
        scores.rivalry * 0.02 +
        scores.age * 0.02;
      return { opponent, score, signals: scores };
    })
    .filter(
      (item) =>
        item.signals.age > 0 &&
        item.signals.location >= 0.75,
    )
    .sort((a, b) => b.score - a.score);
}
