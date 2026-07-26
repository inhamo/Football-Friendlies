const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function refereeTier(profile) {
  const certificateLevel = Number(profile.certificateLevel || 0);
  const rating = Number(profile.observerRating || 0);
  const experience = Number(profile.matchesRefereed || 0);
  const earnedLevel =
    rating >= 92 && experience >= 80
      ? 4
      : rating >= 84 && experience >= 25
        ? 3
        : rating >= 72 && experience >= 8
          ? 2
          : 1;
  return clamp(Math.max(certificateLevel, earnedLevel), 1, 4);
}

export function rankRefereeAssignments(profile, assignments) {
  const tier = refereeTier(profile);
  return assignments
    .map((assignment) => {
      const eligible = tier >= assignment.minimumTier;
      const certificateFit = eligible
        ? clamp(1 - (tier - assignment.minimumTier) * 0.22, 0.45, 1)
        : tier / assignment.minimumTier;
      const quality = clamp(Number(profile.observerRating || 0) / 100, 0, 1);
      const experience = clamp(Number(profile.matchesRefereed || 0) / 80, 0, 1);
      const distanceFit = clamp(1 - Number(assignment.distanceKm || 0) / 70, 0, 1);
      const score =
        certificateFit * 0.45 + quality * 0.28 + experience * 0.17 + distanceFit * 0.1;
      return { ...assignment, eligible, score, refereeTier: tier };
    })
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);
}
