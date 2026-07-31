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

const resultValue = (result) => {
  if (typeof result === "number") return Math.max(-1, Math.min(1, result));
  if (["win", "won", "w"].includes(String(result).toLowerCase())) return 1;
  if (["loss", "lost", "l"].includes(String(result).toLowerCase())) return -1;
  return 0;
};

const formProfile = (team) => {
  const results = (team.recentResults || []).slice(0, 8).map(resultValue);
  const played = Math.max(Number(team.matchesPlayed || 0), results.length);
  const wins = results.filter((value) => value > 0).length;
  const losses = results.filter((value) => value < 0).length;
  return {
    played,
    sample: results.length,
    winRate: results.length ? wins / results.length : 0,
    lossRate: results.length ? losses / results.length : 0,
    momentum: results.length
      ? results.reduce((total, value, index) => total + value * (8 - index), 0) /
        results.reduce((total, _value, index) => total + (8 - index), 0)
      : 0,
  };
};

const stableFraction = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < String(value).length; index += 1) {
    hash ^= String(value).charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
};

const isLocalOpponent = (team, opponent) =>
  Number.isFinite(opponent.distanceKm)
    ? opponent.distanceKm <= 10
    : locationCompatibility(team, opponent) >= 0.75;

export function adaptiveSearchPolicy(team, candidates) {
  const form = formProfile(team);
  const suitableLocal = candidates.filter(
    (opponent) =>
      isLocalOpponent(team, opponent) && competitiveFit(team, opponent) >= 0.55,
  );
  const recentlyPlayedLocal = suitableLocal.filter((opponent) =>
    (opponent.historyWithTeam || []).some(
      (meeting) => Number(meeting.daysAgo ?? Infinity) <= 120,
    ),
  );
  const exhaustion = suitableLocal.length
    ? recentlyPlayedLocal.length / suitableLocal.length
    : form.played >= 3
      ? 1
      : 0;
  const onboarding = form.played < 5;
  const strong = !onboarding && form.sample >= 4 && form.winRate >= 0.6;
  const struggling = !onboarding && form.sample >= 4 && form.lossRate >= 0.55;
  const localExhausted = exhaustion >= 0.7;
  const radiusKm = onboarding
    ? 10
    : strong && localExhausted
      ? 50
      : strong || localExhausted
        ? 25
        : struggling
          ? 15
          : 10;
  return {
    radiusKm,
    onboarding,
    strong,
    struggling,
    localExhausted,
    localPoolSize: suitableLocal.length,
    recentlyPlayedLocal: recentlyPlayedLocal.length,
    outsideShare: struggling
      ? 0.125
      : strong
        ? 0.35
        : localExhausted
          ? 0.2
          : 0,
  };
}

const momentumFit = (team, opponent) => {
  const teamForm = formProfile(team);
  const opponentForm = formProfile(opponent);
  const adjustedTeamRating =
    Number(team.rating || 1000) + teamForm.momentum * 120;
  const adjustedOpponentRating =
    Number(opponent.rating || 1000) + opponentForm.momentum * 120;
  return clamp01(1 - Math.abs(adjustedTeamRating - adjustedOpponentRating) / 550);
};

const gravityFit = (team, opponent) => {
  const qualityProduct =
    (Math.max(500, Number(team.rating || 1000)) / 1200) *
    (Math.max(500, Number(opponent.rating || 1000)) / 1200);
  const distance = Math.max(1, Number(opponent.distanceKm || 8));
  return clamp01(qualityProduct / (1 + (distance / 10) ** 2));
};

const consentFit = (team, opponent, slot) => {
  const teamRate = Number(team.acceptRateBySlot?.[slot] ?? team.acceptRate ?? 0.6);
  const opponentRate = Number(
    opponent.acceptRateBySlot?.[slot] ?? opponent.acceptRate ?? 0.6,
  );
  return clamp01(Math.sqrt(teamRate * opponentRate));
};

const declineDecay = (opponent) => {
  const recentDeclines = (opponent.declinesWithTeam || []).filter(
    (decline) => Number(decline.daysAgo ?? Infinity) <= 90,
  ).length;
  return Math.pow(0.28, Math.min(3, recentDeclines));
};

const onboardingFit = (team, opponent) => {
  const first = formProfile(team).played < 5;
  const second = formProfile(opponent).played < 5;
  if (!first) return 1;
  return second ? 1 : 0;
};

const slotFit = (opponent, slot) =>
  clamp01(Number(opponent.acceptRateBySlot?.[slot] ?? 0.6));

const sharedTrustFit = (opponent) =>
  clamp01(Number(opponent.sharedTrustedConnections || 0) / 3);

const rescheduleFit = (team, opponent) =>
  clamp01(
    1 -
      Math.abs(
        Number(team.rescheduleFlexibility ?? 0.65) -
          Number(opponent.rescheduleFlexibility ?? 0.65),
      ),
  );

export function rankOpponentCandidates(team, candidates, context) {
  const policy = adaptiveSearchPolicy(team, candidates);
  const limit = Math.max(1, Number(context.resultLimit || 8));
  const ranked = candidates
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
        gravity: gravityFit(team, opponent),
        consent: consentFit(team, opponent, context.slot),
        pod: clamp01(
          1 - Math.abs(Number(team.rating || 1000) - Number(opponent.rating || 1000)) / 350,
        ),
        momentum: momentumFit(team, opponent),
        onboarding: onboardingFit(team, opponent),
        goldenHour: slotFit(opponent, context.slot),
        sharedTrust: sharedTrustFit(opponent),
        reschedule: rescheduleFit(team, opponent),
        decline: declineDecay(opponent),
      };
      const local = isLocalOpponent(team, opponent);
      const wildcard =
        !policy.onboarding &&
        stableFraction(`${team.id}:${opponent.id}:${context.slot}`) < 0.1;
      const withinRadius =
        local ||
        !Number.isFinite(opponent.distanceKm) ||
        opponent.distanceKm <= policy.radiusKm;
      const growthOpponent =
        Number(opponent.rating || 1000) > Number(team.rating || 1000) &&
        Number(opponent.rating || 1000) - Number(team.rating || 1000) <= 250;
      const score =
        scores.location * 0.2 +
        scores.gravity * 0.12 +
        scores.availability * 0.12 +
        scores.competitive * 0.12 +
        scores.homeAway * 0.08 +
        scores.reliability * 0.07 +
        scores.travel * 0.07 +
        scores.consent * 0.06 +
        scores.pod * 0.05 +
        scores.momentum * 0.04 +
        scores.goldenHour * 0.03 +
        scores.onboarding * 0.03 +
        scores.sharedTrust * 0.02 +
        scores.reschedule * 0.02 +
        scores.cost * 0.02 +
        scores.rivalry * 0.02 +
        scores.age * 0.03;
      return {
        opponent,
        score: score * scores.decline,
        signals: {
          ...scores,
          local,
          wildcard,
          withinRadius,
          growthOpponent,
          searchRadiusKm: policy.radiusKm,
        },
      };
    })
    .filter(
      (item) =>
        item.signals.age > 0 &&
        item.signals.onboarding > 0 &&
        item.signals.decline >= 0.1 &&
        (item.signals.withinRadius || item.signals.wildcard),
    )
    .sort((a, b) => b.score - a.score);

  const local = ranked.filter((item) => item.signals.local);
  const outside = ranked.filter((item) => !item.signals.local);
  let outsideLimit = Math.floor(limit * policy.outsideShare);
  if (policy.struggling && outside.length) outsideLimit = 1;
  if (!outsideLimit && outside.some((item) => item.signals.wildcard))
    outsideLimit = 1;
  outsideLimit = Math.min(outsideLimit, outside.length, limit);
  const selected = local.slice(0, Math.max(0, limit - outsideLimit));
  const outsideSelected = outside
    .sort(
      (first, second) =>
        Number(second.signals.growthOpponent) -
          Number(first.signals.growthOpponent) || second.score - first.score,
    )
    .slice(0, outsideLimit);
  const insertionPoint = policy.struggling
    ? Math.min(5, selected.length)
    : Math.min(3, selected.length);
  selected.splice(insertionPoint, 0, ...outsideSelected);
  return selected.slice(0, limit).map((item) => ({ ...item, policy }));
}
