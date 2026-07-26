import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { firebaseConfigured, firestore } from "./firebaseClient";
import { FIREBASE_CONFIGURATION_ERROR } from "./firebaseConfig";

export const COLLECTIONS = Object.freeze({
  users: "users",
  publicProfiles: "publicProfiles",
  teams: "teams",
  teamMembers: "teamMembers",
  playerAssignments: "playerAssignments",
  matches: "matches",
  matchReviews: "matchReviews",
  matchRequests: "matchRequests",
  availabilityPosts: "availabilityPosts",
  lineups: "lineups",
  appearanceClaims: "appearanceClaims",
  conversations: "conversations",
  payments: "payments",
  media: "media",
  refereeAssignments: "refereeAssignments",
  sponsorships: "sponsorships",
  scoutReports: "scoutReports",
  leagues: "leagues",
  leagueMemberships: "leagueMemberships",
  notifications: "notifications",
  communityGrounds: "communityGrounds",
  opportunities: "opportunities",
  scoreDisputes: "scoreDisputes",
  safeguardingReports: "safeguardingReports",
  auditLogs: "auditLogs",
  appSettings: "appSettings",
});

const requireFirebase = () => {
  if (!firebaseConfigured) throw new Error(FIREBASE_CONFIGURATION_ERROR);
};
const records = (snapshot) =>
  snapshot.docs.map((item) => ({ ...item.data(), id: item.id }));
const unique = (values) => [...new Set(values.filter(Boolean))];
const stableHash = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

export async function loadUserWorkspace(uid) {
  if (!firebaseConfigured || !uid) return null;
  const snapshot = await getDoc(
    doc(firestore, COLLECTIONS.users, uid, "private", "appState"),
  );
  return snapshot.exists() ? snapshot.data() : null;
}

export async function rejectRefereeForMatch(match, team, actorId) {
  requireFirebase();
  if (!match?.participantTeamIds?.includes(team?.id))
    throw new Error("Only a team in this match can respond to the referee.");
  const assignmentId = `match_${match.id}`;
  const batch = writeBatch(firestore);
  batch.set(
    doc(firestore, COLLECTIONS.refereeAssignments, assignmentId),
    {
      matchId: match.id,
      teamIds: match.participantTeamIds || [],
      refereeId: match.refereeId || "",
      refereeName: match.refereeName || "",
      status: "rejected",
      rejectedByTeamId: team.id,
      respondedBy: actorId,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  batch.update(doc(firestore, COLLECTIONS.matches, match.id), {
    refereeId: "",
    refereeName: "",
    refereeFee: 0,
    refereeStatus: "needed",
    refereeTeamApprovalIds: [],
    refereeRejectedByTeamId: team.id,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function reportConversation(id, actorId, details) {
  requireFirebase();
  return addDoc(collection(firestore, COLLECTIONS.safeguardingReports), {
    ownerId: actorId,
    conversationId: id,
    category: "Chat conduct",
    urgency: "Conduct complaint",
    reportKind: "conduct",
    details: details.trim() || "Conversation reported from chat controls.",
    status: "received",
    private: true,
    auditTrail: [
      {
        action: "submitted",
        actorId,
        at: new Date().toISOString(),
      },
    ],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function saveUserWorkspace(uid, workspace) {
  if (!firebaseConfigured || !uid) return;
  await setDoc(doc(firestore, COLLECTIONS.users, uid, "private", "appState"), {
    activeRole: workspace.activeRole || null,
    personalProfiles: workspace.personalProfiles || {},
    activeTeamId: workspace.activeTeamId || null,
    updatedAt: serverTimestamp(),
  });
}

export async function createTeamRecord(ownerId, values) {
  requireFirebase();
  const normalizedName = values.name?.trim().toLowerCase();
  if (!ownerId || !normalizedName)
    throw new Error("A team owner and team name are required.");
  const reference = doc(
    firestore,
    COLLECTIONS.teams,
    `${ownerId}_${stableHash(normalizedName)}`,
  );
  const membershipReference = doc(
    firestore,
    COLLECTIONS.teamMembers,
    `${reference.id}_${ownerId}`,
  );
  const existing = await getDoc(reference);
  if (existing.exists()) {
    await setDoc(
      membershipReference,
      {
        teamId: reference.id,
        userId: ownerId,
        role: "Coach",
        status: "active",
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return { ...existing.data(), id: reference.id };
  }
  const team = {
    ...values,
    name: values.name.trim(),
    id: reference.id,
    ownerId,
    adminIds: unique([ownerId, ...(values.adminIds || [])]),
    coachIds: unique([ownerId, ...(values.coachIds || [])]),
    captainIds: values.captainIds || [],
    memberIds: unique([ownerId, ...(values.memberIds || [])]),
    stats: {
      players: 0,
      matches: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      yellowCards: 0,
      redCards: 0,
      points: 0,
      rankingScore: 0,
      tournamentsPlayed: 0,
      tournamentsWon: 0,
      awards: [],
      ...(values.stats || {}),
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const batch = writeBatch(firestore);
  batch.set(reference, team);
  batch.set(membershipReference, {
    teamId: reference.id,
    userId: ownerId,
    role: "Coach",
    status: "active",
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return { ...team, id: reference.id };
}

export async function loadDiscoverableTeams() {
  if (!firebaseConfigured) return [];
  return records(await getDocs(collection(firestore, COLLECTIONS.teams)));
}

export async function loadTeamRecord(teamId) {
  if (!firebaseConfigured || !teamId) return null;
  const snapshot = await getDoc(doc(firestore, COLLECTIONS.teams, teamId));
  return snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } : null;
}

export async function updateTeamRecord(teamId, values) {
  requireFirebase();
  await updateDoc(doc(firestore, COLLECTIONS.teams, teamId), {
    ...values,
    updatedAt: serverTimestamp(),
  });
  return loadTeamRecord(teamId);
}

export async function loadUserTeamMemberships(uid) {
  if (!firebaseConfigured || !uid) return [];
  return records(
    await getDocs(
      query(
        collection(firestore, COLLECTIONS.teamMembers),
        where("userId", "==", uid),
      ),
    ),
  );
}

const safePublicProfile = (data) => {
  const {
    phone,
    phoneNumber,
    email,
    address,
    preciseAddress,
    guardianName,
    guardianContact,
    emergencyContact,
    dateOfBirth,
    ...safe
  } = data || {};
  const age = dateOfBirth
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * 86400000),
        ),
      )
    : null;
  return {
    ...safe,
    ageBand:
      age == null
        ? safe.ageBand || ""
        : age < 13
          ? "Under 13"
          : age < 16
            ? "Under 16"
            : age < 18
              ? "Under 18"
              : "Adult",
    isYouth: age != null ? age < 18 : safe.isYouth === true,
  };
};

export async function savePublicProfile(ownerId, role, data) {
  requireFirebase();
  const id = `${ownerId}_${role.toLowerCase()}`;
  const safe = safePublicProfile(data);
  await setDoc(
    doc(firestore, COLLECTIONS.publicProfiles, id),
    {
      ...safe,
      ownerId,
      role,
      profileSaved: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return { id, ...safe, ownerId, role, profileSaved: true };
}

export async function loadPublicProfiles() {
  if (!firebaseConfigured) return [];
  return records(
    await getDocs(collection(firestore, COLLECTIONS.publicProfiles)),
  );
}

export async function saveAvailabilityPost(ownerId, team, values) {
  requireFirebase();
  const record = {
    ...values,
    ownerId,
    teamId: team.id,
    teamName: team.name,
    area: team.area || values.area || "",
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(firestore, COLLECTIONS.availabilityPosts, team.id), record, {
    merge: true,
  });
  return { id: team.id, ...record };
}

export async function loadAvailabilityPosts() {
  if (!firebaseConfigured) return [];
  return records(
    await getDocs(collection(firestore, COLLECTIONS.availabilityPosts)),
  );
}

export async function requestToJoinTeam(ownerId, team, profileId) {
  requireFirebase();
  return addDoc(collection(firestore, COLLECTIONS.matchRequests), {
    ownerId,
    recipientUserIds: unique([team.ownerId, ...(team.adminIds || [])]),
    teamId: team.id,
    playerProfileId: profileId,
    type: "team_join",
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function createCommunityGround(ownerId, team, values) {
  requireFirebase();
  const reference = await addDoc(
    collection(firestore, COLLECTIONS.communityGrounds),
    {
      ownerId,
      teamId: team?.id || "",
      teamName: team?.name || "",
      name: values.name.trim(),
      area: values.area.trim(),
      landmark: values.landmark.trim(),
      writtenDirections: (
        values.notes ||
        values.writtenDirections ||
        ""
      ).trim(),
      voiceDirectionUri: values.voiceDirectionUri || "",
      surface: values.surface || "Open ground",
      access: values.access || "Community use",
      facilities: values.facilities || [],
      confirmations: 1,
      confirmedByIds: [ownerId],
      lastConfirmedBy: ownerId,
      lastConfirmedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  );
  return {
    id: reference.id,
    ...values,
    ownerId,
    confirmations: 1,
    lastConfirmedAt: new Date().toISOString(),
  };
}

export async function confirmCommunityGround(id, actorId) {
  requireFirebase();
  const groundRef = doc(firestore, COLLECTIONS.communityGrounds, id);
  let created = false;
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(groundRef);
    if (!snapshot.exists())
      throw new Error("This ground is no longer available.");
    const confirmedByIds = snapshot.data().confirmedByIds || [];
    if (confirmedByIds.includes(actorId)) return;
    created = true;
    transaction.update(groundRef, {
      confirmations: increment(1),
      confirmedByIds: arrayUnion(actorId),
      lastConfirmedBy: actorId,
      lastConfirmedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  return { created };
}

export async function loadCommunityGrounds() {
  if (!firebaseConfigured) return [];
  return records(
    await getDocs(collection(firestore, COLLECTIONS.communityGrounds)),
  );
}

const expiryFor = (date) => {
  const selected = date ? new Date(`${date}T23:59:59`) : null;
  const fallback = new Date(Date.now() + 30 * 86400000);
  return (
    selected && selected > new Date() ? selected : fallback
  ).toISOString();
};

export async function createOpportunityRecord(ownerId, team, values) {
  requireFirebase();
  const all = await loadOpportunities();
  const duplicate = all.find(
    (item) =>
      item.ownerId === ownerId &&
      item.status !== "closed" &&
      item.type === values.type &&
      item.title?.trim().toLowerCase() === values.title.trim().toLowerCase() &&
      item.area?.trim().toLowerCase() === values.area.trim().toLowerCase(),
  );
  if (duplicate) throw new Error("This opportunity is already open.");
  const reference = await addDoc(
    collection(firestore, COLLECTIONS.opportunities),
    {
      ownerId,
      teamId: team?.id || "",
      teamName: team?.name || "",
      posterRole: values.posterRole || "Coach",
      type: values.type,
      title: values.title.trim(),
      area: values.area.trim(),
      date: values.date || "",
      ageGroup: values.ageGroup || "Open age",
      playingLevel: values.playingLevel || "Any level",
      wantedRole: values.wantedRole || "Any role",
      details: values.details.trim(),
      status: "open",
      responseCount: 0,
      youthTrial: values.youthTrial === true,
      requiresGuardian:
        values.youthTrial === true || values.ageGroup?.startsWith("U"),
      expiresAt: expiryFor(values.date),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  );
  return {
    id: reference.id,
    ...values,
    ownerId,
    status: "open",
    responseCount: 0,
    expiresAt: expiryFor(values.date),
  };
}

export async function loadOpportunities() {
  if (!firebaseConfigured) return [];
  const now = Date.now();
  return records(
    await getDocs(collection(firestore, COLLECTIONS.opportunities)),
  ).map((item) => ({
    ...item,
    status:
      item.status === "open" &&
      item.expiresAt &&
      new Date(item.expiresAt).getTime() < now
        ? "expired"
        : item.status,
  }));
}

export async function updateOpportunityStatus(id, status) {
  requireFirebase();
  await updateDoc(doc(firestore, COLLECTIONS.opportunities, id), {
    status,
    ...(status === "open"
      ? { expiresAt: expiryFor(""), reopenedAt: serverTimestamp() }
      : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function respondToOpportunity(
  opportunity,
  actorId,
  actorRole,
  question,
) {
  requireFirebase();
  if (opportunity.ownerId === actorId)
    throw new Error("You cannot respond to your own opportunity.");
  const id = `${opportunity.id}_${actorId}`;
  const responseRef = doc(firestore, "opportunityResponses", id);
  const opportunityRef = doc(
    firestore,
    COLLECTIONS.opportunities,
    opportunity.id,
  );
  let created = false;
  await runTransaction(firestore, async (transaction) => {
    const existing = await transaction.get(responseRef);
    transaction.set(
      responseRef,
      {
        opportunityId: opportunity.id,
        ownerId: actorId,
        opportunityOwnerId: opportunity.ownerId,
        actorRole,
        question: question.trim(),
        status: "sent",
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
    if (!existing.exists()) {
      created = true;
      transaction.update(opportunityRef, {
        responseCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    }
  });
  return { created };
}

export async function reportOpportunity(opportunity, actorId, reason) {
  requireFirebase();
  await addDoc(collection(firestore, "opportunityReports"), {
    ownerId: actorId,
    opportunityId: opportunity.id,
    opportunityOwnerId: opportunity.ownerId,
    reason: reason.trim(),
    status: "submitted",
    private: true,
    createdAt: serverTimestamp(),
  });
}

export async function createSafeguardingReport(ownerId, team, values) {
  requireFirebase();
  const reference = await addDoc(
    collection(firestore, COLLECTIONS.safeguardingReports),
    {
      ownerId,
      teamId: team?.id || "",
      category: values.category,
      urgency: values.urgency,
      reportKind: values.urgency === "Immediate danger" ? "urgent" : "conduct",
      details: values.details.trim(),
      status: "received",
      private: true,
      auditTrail: [
        {
          action: "submitted",
          actorId: ownerId,
          at: new Date().toISOString(),
        },
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  );
  return reference.id;
}

export async function createLeagueRecord(ownerId, team, values) {
  requireFirebase();
  const reference = await addDoc(collection(firestore, COLLECTIONS.leagues), {
    ...values,
    ownerId,
    creatorTeamId: team?.id || "",
    adminIds: unique([ownerId, ...(values.adminIds || [])]),
    teamIds: unique([team?.id, ...(values.teamIds || [])]),
    invitedUserIds: values.invitedUserIds || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { ...values, ownerId, id: reference.id };
}

export async function loadLeagueRecords() {
  if (!firebaseConfigured) return [];
  return records(await getDocs(collection(firestore, COLLECTIONS.leagues)));
}

export function subscribeLeagueRecords(onChange, onError = () => {}) {
  if (!firebaseConfigured) return () => {};
  return onSnapshot(
    collection(firestore, COLLECTIONS.leagues),
    (snapshot) => onChange(records(snapshot)),
    onError,
  );
}

export async function joinLeagueRecord(league, team, actorId) {
  requireFirebase();
  if (!league?.id || !team?.id)
    throw new Error("Choose a tournament and a team before joining.");
  const id = `${league.id}_${team.id}`;
  const leagueRef = doc(firestore, COLLECTIONS.leagues, league.id);
  const membershipRef = doc(firestore, COLLECTIONS.leagueMemberships, id);
  await runTransaction(firestore, async (transaction) => {
    const leagueSnapshot = await transaction.get(leagueRef);
    if (!leagueSnapshot.exists())
      throw new Error("This competition is no longer available.");
    const storedLeague = leagueSnapshot.data();
    const joinedTeamIds = unique(storedLeague.teamIds || []);
    if (
      !joinedTeamIds.includes(team.id) &&
      joinedTeamIds.length >= Number(storedLeague.maxTeams || 0)
    )
      throw new Error("This competition has reached its team limit.");
    transaction.set(
      membershipRef,
      {
        leagueId: league.id,
        teamId: team.id,
        joinedBy: actorId,
        status: "active",
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
    transaction.update(leagueRef, {
      teamIds: arrayUnion(team.id),
      lastJoinedTeamId: team.id,
      updatedAt: serverTimestamp(),
    });
  });
  return id;
}

const dateOnly = (value) => {
  const date = new Date(`${value || ""}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const addDays = (value, days) => {
  const date = dateOnly(value);
  if (!date) return "";
  date.setDate(date.getDate() + Number(days || 0));
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const addMinutes = (value, minutes) => {
  const [hour = 9, minute = 0] = String(value || "09:00")
    .split(":")
    .map(Number);
  const total = hour * 60 + minute + Number(minutes || 0);
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(
    total % 60,
  ).padStart(2, "0")}`;
};

const roundRobinRounds = (teams) => {
  const entrants = [...teams];
  if (entrants.length % 2) entrants.push(null);
  if (entrants.length < 2) return [];
  const rounds = [];
  for (let round = 0; round < entrants.length - 1; round += 1) {
    const games = [];
    for (let index = 0; index < entrants.length / 2; index += 1) {
      const first = entrants[index];
      const second = entrants[entrants.length - 1 - index];
      if (!first || !second) continue;
      const reverse = (round + index) % 2 === 1;
      games.push({
        home: reverse ? second : first,
        away: reverse ? first : second,
      });
    }
    rounds.push(games);
    entrants.splice(1, 0, entrants.pop());
  }
  return rounds;
};

const competitionGroups = (league, teams) => {
  if (
    !["World Cup format", "One day tournament", "Two day tournament"].includes(
      league.competitionType,
    )
  )
    return [teams];
  const groups = [];
  teams.forEach((team, index) => {
    const groupIndex = Math.floor(index / 4);
    if (!groups[groupIndex]) groups[groupIndex] = [];
    groups[groupIndex].push(team);
  });
  return groups;
};

const teamPeople = (team) =>
  unique([
    team.ownerId,
    ...(team.adminIds || []),
    ...(team.coachIds || []),
    ...(team.captainIds || []),
    ...(team.memberIds || []),
  ]);

const competitionFixtureId = (leagueId, homeId, awayId, leg = 1) =>
  `competition_${stableHash(
    `${leagueId}:${[homeId, awayId].sort().join(":")}:${leg}`,
  )}`;

/**
 * Creates only fixtures whose two teams are already known. Re-running this is
 * safe: existing matches (including rescheduled dates) are never overwritten.
 */
export async function syncLeagueSchedule(leagueOrId, actorId) {
  requireFirebase();
  const leagueId = typeof leagueOrId === "string" ? leagueOrId : leagueOrId?.id;
  if (!leagueId) throw new Error("Choose a competition first.");
  const leagueSnapshot = await getDoc(
    doc(firestore, COLLECTIONS.leagues, leagueId),
  );
  if (!leagueSnapshot.exists())
    throw new Error("This competition is no longer available.");
  const league = { ...leagueSnapshot.data(), id: leagueSnapshot.id };
  if (!league.startDate) return [];
  const teamIds = unique(league.teamIds || []);
  const teamSnapshots = await Promise.all(
    teamIds.map((teamId) => getDoc(doc(firestore, COLLECTIONS.teams, teamId))),
  );
  const teams = teamSnapshots
    .filter((snapshot) => snapshot.exists())
    .map((snapshot) => ({ ...snapshot.data(), id: snapshot.id }));
  if (teams.length < 2) return [];

  const existing = records(
    await getDocs(
      query(
        collection(firestore, COLLECTIONS.matches),
        where("competitionId", "==", leagueId),
      ),
    ),
  );
  const existingIds = new Set(existing.map((match) => match.id));
  const spacingDays = Math.max(1, Number(league.schedulePaceDays || 7));
  const sameDay = league.competitionType === "One day tournament";
  const twoDay = league.competitionType === "Two day tournament";
  const planned = [];
  const winnerOf = (match) => {
    if (match?.status !== "completed" || !match.result) return null;
    if (match.result.winnerTeamId)
      return teams.find((team) => team.id === match.result.winnerTeamId);
    const homeScore = Number(match.result.homeScore || 0);
    const awayScore = Number(match.result.awayScore || 0);
    if (homeScore === awayScore) return null;
    const winnerId =
      homeScore > awayScore ? match.homeTeamId : match.awayTeamId;
    return teams.find((team) => team.id === winnerId);
  };

  if (
    league.competitionType === "Knockout" ||
    league.competitionType === "Community Shield"
  ) {
    if (
      league.competitionType === "Knockout" &&
      teams.length < Number(league.maxTeams || teams.length)
    )
      return [];
    const drawnTeams = [...teams].sort((first, second) =>
      stableHash(`${leagueId}:${first.id}`).localeCompare(
        stableHash(`${leagueId}:${second.id}`),
      ),
    );
    const bracketSize =
      league.competitionType === "Community Shield"
        ? 2
        : 2 ** Math.ceil(Math.log2(drawnTeams.length));
    const byeCount =
      league.competitionType === "Community Shield"
        ? 0
        : Math.max(0, bracketSize - drawnTeams.length);
    const byeTeams = drawnTeams.slice(0, byeCount);
    const openingTeams =
      league.competitionType === "Community Shield"
        ? drawnTeams.slice(0, 2)
        : drawnTeams.slice(byeCount);
    for (let index = 0; index + 1 < openingTeams.length; index += 2) {
      planned.push({
        home: openingTeams[index],
        away: openingTeams[index + 1],
        leg: 1,
        round: 0,
        game: Math.floor(index / 2),
        stage:
          league.competitionType === "Community Shield"
            ? "Community Shield"
            : "Opening round",
      });
    }
    if (league.competitionType === "Knockout") {
      let previousEntrants = [...byeTeams];
      const openingMatches = openingTeams.reduce((matches, team, index) => {
        if (index % 2 || !openingTeams[index + 1]) return matches;
        const id = competitionFixtureId(
          leagueId,
          team.id,
          openingTeams[index + 1].id,
          1,
        );
        const stored = existing.find((match) => match.id === id);
        if (stored) matches.push(stored);
        return matches;
      }, []);
      if (
        openingMatches.length === openingTeams.length / 2 &&
        openingMatches.every((match) => winnerOf(match))
      ) {
        previousEntrants.push(...openingMatches.map(winnerOf));
        let round = 1;
        while (previousEntrants.length > 1) {
          const roundMatches = [];
          for (let index = 0; index + 1 < previousEntrants.length; index += 2) {
            const home = previousEntrants[index];
            const away = previousEntrants[index + 1];
            const stage =
              previousEntrants.length === 2
                ? "Final"
                : previousEntrants.length === 4
                  ? "Semi finals"
                  : previousEntrants.length === 8
                    ? "Quarter finals"
                    : `Round ${round + 1}`;
            planned.push({
              home,
              away,
              leg: 1,
              round,
              game: Math.floor(index / 2),
              stage,
            });
            roundMatches.push(
              existing.find(
                (match) =>
                  match.id ===
                  competitionFixtureId(leagueId, home.id, away.id, 1),
              ),
            );
          }
          if (
            roundMatches.length !== previousEntrants.length / 2 ||
            !roundMatches.every((match) => winnerOf(match))
          )
            break;
          previousEntrants = roundMatches.map(winnerOf);
          round += 1;
        }
      }
    }
  } else {
    const groups = competitionGroups(league, teams);
    groups.forEach((group, groupIndex) => {
      const rounds = roundRobinRounds(group);
      rounds.forEach((games, roundIndex) => {
        games.forEach((game, gameIndex) =>
          planned.push({
            ...game,
            leg: 1,
            round: roundIndex,
            game: gameIndex,
            groupIndex,
            stage:
              league.competitionType === "Round robin"
                ? `Matchday ${roundIndex + 1}`
                : `Group ${String.fromCharCode(65 + groupIndex)} · Matchday ${
                    roundIndex + 1
                  }`,
          }),
        );
      });
      if (
        league.competitionType === "Round robin" &&
        league.fixtureCycle === "Home and away"
      ) {
        rounds.forEach((games, roundIndex) => {
          games.forEach((game, gameIndex) =>
            planned.push({
              home: game.away,
              away: game.home,
              leg: 2,
              round: rounds.length + roundIndex,
              game: gameIndex,
              groupIndex,
              stage: `Matchday ${rounds.length + roundIndex + 1}`,
            }),
          );
        });
      }
    });
    if (
      ["World Cup format", "One day tournament", "Two day tournament"].includes(
        league.competitionType,
      )
    ) {
      const groupFixtures = [...planned];
      const storedGroupMatches = groupFixtures.map((fixture) =>
        existing.find(
          (match) =>
            match.id ===
            competitionFixtureId(
              leagueId,
              fixture.home.id,
              fixture.away.id,
              fixture.leg,
            ),
        ),
      );
      const groupsComplete =
        storedGroupMatches.length === groupFixtures.length &&
        storedGroupMatches.every(
          (match) => match?.status === "completed" && match.result,
        );
      if (groupsComplete) {
        const finalsRoundBase =
          Math.max(0, ...groupFixtures.map((fixture) => fixture.round)) + 1;
        const qualifiers = groups.flatMap((group, groupIndex) => {
          const table = group.map((team) => ({
            team,
            points: 0,
            goalsFor: 0,
            goalsAgainst: 0,
          }));
          const rowFor = (teamId) =>
            table.find((row) => row.team.id === teamId);
          storedGroupMatches
            .filter(
              (match) =>
                groupFixtures.find(
                  (fixture) =>
                    fixture.groupIndex === groupIndex &&
                    competitionFixtureId(
                      leagueId,
                      fixture.home.id,
                      fixture.away.id,
                      fixture.leg,
                    ) === match.id,
                ),
            )
            .forEach((match) => {
              const home = rowFor(match.homeTeamId);
              const away = rowFor(match.awayTeamId);
              if (!home || !away) return;
              const homeScore = Number(match.result.homeScore || 0);
              const awayScore = Number(match.result.awayScore || 0);
              home.goalsFor += homeScore;
              home.goalsAgainst += awayScore;
              away.goalsFor += awayScore;
              away.goalsAgainst += homeScore;
              if (homeScore === awayScore) {
                home.points += 1;
                away.points += 1;
              } else if (homeScore > awayScore) {
                home.points += 3;
              } else {
                away.points += 3;
              }
            });
          return table
            .sort(
              (first, second) =>
                second.points - first.points ||
                second.goalsFor -
                  second.goalsAgainst -
                  (first.goalsFor - first.goalsAgainst) ||
                second.goalsFor - first.goalsFor ||
                first.team.name.localeCompare(second.team.name),
            )
            .slice(0, Math.min(2, table.length))
            .map((row, place) => ({
              ...row.team,
              seed: place,
              groupIndex,
            }));
        });
        const groupWinners = qualifiers.filter((team) => team.seed === 0);
        const runnersUp = qualifiers
          .filter((team) => team.seed === 1)
          .reverse();
        const seeded = groupWinners.flatMap((winner, index) => {
          const runner =
            runnersUp.find((team) => team.groupIndex !== winner.groupIndex) ||
            runnersUp[index];
          return [winner, runner].filter(Boolean);
        });
        const distinctSeeded = unique(seeded.map((team) => team.id))
          .map((id) => seeded.find((team) => team.id === id))
          .filter(Boolean);
        const bracketSize =
          2 ** Math.ceil(Math.log2(Math.max(2, distinctSeeded.length)));
        const byeCount = Math.max(0, bracketSize - distinctSeeded.length);
        let entrants = distinctSeeded.slice(0, byeCount);
        const openingEntrants = distinctSeeded.slice(byeCount);
        let round = 0;
        while (openingEntrants.length > 1 && round === 0) {
          const storedRound = [];
          for (let index = 0; index + 1 < openingEntrants.length; index += 2) {
            const home = openingEntrants[index];
            const away = openingEntrants[index + 1];
            const leg = `finals_${round}`;
            const stage =
              distinctSeeded.length <= 2
                ? "Final"
                : openingEntrants.length === 4
                  ? "Semi finals"
                  : "Quarter finals";
            planned.push({
              home,
              away,
              leg,
              round: finalsRoundBase + round,
              game: Math.floor(index / 2),
              stage,
            });
            storedRound.push(
              existing.find(
                (match) =>
                  match.id ===
                  competitionFixtureId(leagueId, home.id, away.id, leg),
              ),
            );
          }
          if (!storedRound.every((match) => winnerOf(match))) break;
          entrants.push(...storedRound.map(winnerOf));
          round += 1;
        }
        while (entrants.length > 1) {
          const storedRound = [];
          const nextEntrants = [];
          for (let index = 0; index < entrants.length; index += 2) {
            if (!entrants[index + 1]) {
              nextEntrants.push(entrants[index]);
              continue;
            }
            const home = entrants[index];
            const away = entrants[index + 1];
            const leg = `finals_${round}`;
            const stage =
              entrants.length === 2
                ? "Final"
                : entrants.length === 4
                  ? "Semi finals"
                  : "Quarter finals";
            planned.push({
              home,
              away,
              leg,
              round: finalsRoundBase + round,
              game: Math.floor(index / 2),
              stage,
            });
            storedRound.push(
              existing.find(
                (match) =>
                  match.id ===
                  competitionFixtureId(leagueId, home.id, away.id, leg),
              ),
            );
          }
          if (
            storedRound.length === 0 ||
            !storedRound.every((match) => winnerOf(match))
          )
            break;
          entrants = [...nextEntrants, ...storedRound.map(winnerOf)];
          round += 1;
        }
      }
    }
  }

  const durationMinutes = Math.max(
    10,
    Number(league.matchDurationMinutes || 60),
  );
  const minimumRestMinutes = Math.max(
    0,
    Number(league.minimumRestMinutes || 30),
  );
  const venueCount = Math.max(1, Number(league.venueCount || 1));
  const startClockMinutes = String(league.kickoffStart || "09:00")
    .split(":")
    .map(Number)
    .reduce((hours, minutes) => hours * 60 + minutes);
  const timetable = new Map();

  if (sameDay || twoDay) {
    const pitchBookings = Array.from({ length: venueCount }, () => []);
    const teamAvailableAt = new Map();
    const startDate = dateOnly(league.startDate);
    existing.forEach((match) => {
      const matchDate = dateOnly(match.matchDate);
      if (!matchDate || !startDate) return;
      const dayOffset = Math.round((matchDate - startDate) / 86400000);
      const [hour = 0, minute = 0] = String(match.kickoff || "00:00")
        .split(":")
        .map(Number);
      const start = dayOffset * 1440 + hour * 60 + minute;
      const end = start + Number(match.matchDurationMinutes || durationMinutes);
      const pitchIndex = Math.min(
        venueCount - 1,
        Math.max(0, Number(match.venueSlot || 1) - 1),
      );
      pitchBookings[pitchIndex].push({ start, end });
      (match.participantTeamIds || []).forEach((teamId) =>
        teamAvailableAt.set(
          teamId,
          Math.max(teamAvailableAt.get(teamId) || 0, end + minimumRestMinutes),
        ),
      );
    });

    planned.forEach((fixture) => {
      const id = competitionFixtureId(
        leagueId,
        fixture.home.id,
        fixture.away.id,
        fixture.leg,
      );
      if (existingIds.has(id)) return;
      const baseDay = twoDay ? Math.min(fixture.round, 1) : 0;
      let candidate = Math.max(
        baseDay * 1440 + startClockMinutes,
        teamAvailableAt.get(fixture.home.id) || 0,
        teamAvailableAt.get(fixture.away.id) || 0,
      );
      let pitchIndex = -1;
      while (pitchIndex < 0) {
        pitchIndex = pitchBookings.findIndex((bookings) =>
          bookings.every(
            (booking) =>
              candidate + durationMinutes <= booking.start ||
              candidate >= booking.end,
          ),
        );
        if (pitchIndex < 0) candidate += 5;
      }
      const end = candidate + durationMinutes;
      pitchBookings[pitchIndex].push({ start: candidate, end });
      teamAvailableAt.set(fixture.home.id, end + minimumRestMinutes);
      teamAvailableAt.set(fixture.away.id, end + minimumRestMinutes);
      const dayOffset = Math.floor(candidate / 1440);
      timetable.set(id, {
        date: addDays(league.startDate, dayOffset),
        time: addMinutes("00:00", candidate % 1440),
        venueSlot: pitchIndex + 1,
      });
    });
  }

  const batch = writeBatch(firestore);
  const created = [];
  planned.forEach((fixture) => {
    const id = competitionFixtureId(
      leagueId,
      fixture.home.id,
      fixture.away.id,
      fixture.leg,
    );
    if (existingIds.has(id)) return;
    const allocation = timetable.get(id);
    const fixtureDate =
      allocation?.date ||
      addDays(league.startDate, fixture.round * spacingDays);
    const fixtureTime = allocation?.time || league.kickoffStart || "15:00";
    const participantUserIds = unique([
      ...teamPeople(fixture.home),
      ...teamPeople(fixture.away),
    ]);
    const match = {
      createdBy: actorId,
      competitionId: leagueId,
      competitionName: league.name,
      competitionStage: fixture.stage,
      competitionRound: fixture.round,
      matchType: "league",
      scheduleSource: "competition",
      homeTeamId: fixture.home.id,
      homeTeamName: fixture.home.name,
      awayTeamId: fixture.away.id,
      awayTeamName: fixture.away.name,
      participantTeamIds: [fixture.home.id, fixture.away.id],
      participantUserIds,
      matchDate: fixtureDate,
      kickoff: fixtureTime,
      venue:
        league.baseVenue ||
        fixture.home.groundName ||
        fixture.home.area ||
        "Venue to confirm",
      format: league.format || "11 a side",
      matchDurationMinutes: durationMinutes,
      minimumRestMinutes,
      venueSlot: allocation?.venueSlot || 1,
      status: "confirmed",
      refereeStatus: "needed",
      refereeTeamApprovalIds: [],
      teamFee: 0,
      proposedRefereeFee: 0,
      rescheduleStatus: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    batch.set(doc(firestore, COLLECTIONS.matches, id), match);
    created.push({ ...match, id, home: fixture.home, away: fixture.away });
  });
  if (!created.length) return [];
  await batch.commit();
  await Promise.all(
    created.map((match) =>
      ensureCaptainConversation(
        match.home,
        match.away,
        match.id,
        `competition_${leagueId}`,
      ).catch(() => null),
    ),
  );
  return created.map(({ home, away, ...match }) => match);
}

export async function loadMatchReviews() {
  if (!firebaseConfigured) return [];
  return records(
    await getDocs(collection(firestore, COLLECTIONS.matchReviews)),
  );
}

export function subscribeMatchReviews(onChange, onError = () => {}) {
  if (!firebaseConfigured) return () => {};
  return onSnapshot(
    collection(firestore, COLLECTIONS.matchReviews),
    (snapshot) => onChange(records(snapshot)),
    onError,
  );
}

export async function createSponsorshipProposal(ownerId, profile, league) {
  requireFirebase();
  return addDoc(collection(firestore, COLLECTIONS.sponsorships), {
    ownerId,
    profileId: profile.id || "",
    leagueId: league.id,
    leagueName: league.name,
    status: "proposed",
    createdAt: serverTimestamp(),
  });
}

export async function savePostMatchReview(match, teamId, ownerId, review) {
  requireFirebase();
  const id = `${match.id}_${teamId}`;
  await setDoc(
    doc(firestore, COLLECTIONS.matchReviews, id),
    {
      ownerId,
      teamId,
      matchId: match.id,
      opponentTeamId: match.participantTeamIds?.find((id) => id !== teamId),
      refereeId: match.refereeId || "",
      refereeRating: Number(review.refereeRating || 0),
      conduct: review.conduct || "Fair",
      note: review.note?.trim() || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return id;
}

export async function requestRefereeForMatch(
  match,
  team,
  profile,
  actorId,
  fee,
) {
  requireFirebase();
  const [matchSnapshot, teamSnapshot] = await Promise.all([
    getDoc(doc(firestore, COLLECTIONS.matches, match.id)),
    getDoc(doc(firestore, COLLECTIONS.teams, team.id)),
  ]);
  if (!matchSnapshot.exists() || !teamSnapshot.exists())
    throw new Error("The match or team is no longer available.");
  const storedMatch = matchSnapshot.data();
  const storedTeam = teamSnapshot.data();
  if (!storedMatch.participantTeamIds?.includes(team.id))
    throw new Error("Only a team involved in this match can choose a referee.");
  const teamManagers = unique([
    storedTeam.ownerId,
    ...(storedTeam.adminIds || []),
    ...(storedTeam.coachIds || []),
    ...(storedTeam.captainIds || []),
  ]);
  if (!teamManagers.includes(actorId))
    throw new Error("Only a coach or captain can choose the referee.");
  const id = `match_${match.id}`;
  const batch = writeBatch(firestore);
  batch.set(
    doc(firestore, COLLECTIONS.refereeAssignments, id),
    {
      matchId: match.id,
      createdBy: actorId,
      refereeId: profile.ownerId,
      refereeName: profile.name,
      teamIds: storedMatch.participantTeamIds || [],
      fee: Number(fee || 0),
      status: "requested",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  batch.update(doc(firestore, COLLECTIONS.matches, match.id), {
    refereeId: profile.ownerId,
    refereeName: profile.name,
    proposedRefereeFee: Number(fee || 0),
    refereeStatus: "requested",
    refereeRequestedByTeamId: team.id,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function respondToRefereeAssignment(assignment, status, actorId) {
  requireFirebase();
  const batch = writeBatch(firestore);
  batch.update(doc(firestore, COLLECTIONS.refereeAssignments, assignment.id), {
    status,
    respondedBy: actorId,
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(firestore, COLLECTIONS.matches, assignment.matchId), {
    refereeStatus: status === "accepted" ? "team_confirmation" : "needed",
    refereeFee: status === "accepted" ? Number(assignment.fee || 0) : 0,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function approveRefereeForMatch(match, team, actorId) {
  requireFirebase();
  const approvalIds = unique([
    ...(match.refereeTeamApprovalIds || []),
    team.id,
  ]);
  const accepted = (match.participantTeamIds || []).every((id) =>
    approvalIds.includes(id),
  );
  await updateDoc(doc(firestore, COLLECTIONS.matches, match.id), {
    refereeTeamApprovalIds: approvalIds,
    refereeStatus: accepted ? "accepted" : "team_confirmation",
    refereeApprovedBy: actorId,
    updatedAt: serverTimestamp(),
  });
}

export function subscribeRefereeAssignments(uid, onChange, onError = () => {}) {
  if (!firebaseConfigured || !uid) return () => {};
  return onSnapshot(
    query(
      collection(firestore, COLLECTIONS.refereeAssignments),
      where("refereeId", "==", uid),
    ),
    (snapshot) => onChange(records(snapshot)),
    onError,
  );
}

export async function createNotifications(
  ownerIds,
  actorId,
  type,
  title,
  body,
  relatedId = "",
) {
  requireFirebase();
  if (!ownerIds?.length) return;
  const batch = writeBatch(firestore);
  unique(ownerIds).forEach((ownerId) =>
    batch.set(doc(collection(firestore, COLLECTIONS.notifications)), {
      ownerId,
      actorId,
      type,
      title,
      body,
      relatedId,
      read: false,
      createdAt: serverTimestamp(),
    }),
  );
  await batch.commit();
}

export async function loadNotifications(uid) {
  if (!firebaseConfigured || !uid) return [];
  return records(
    await getDocs(
      query(
        collection(firestore, COLLECTIONS.notifications),
        where("ownerId", "==", uid),
      ),
    ),
  );
}

export async function clearNotification(id) {
  requireFirebase();
  await deleteDoc(doc(firestore, COLLECTIONS.notifications, id));
}

export async function ensureTeamConversation(team) {
  requireFirebase();
  if (!team?.id) return null;
  const id = `team_${team.id}`;
  const participantIds = unique([
    team.ownerId,
    ...(team.adminIds || []),
    ...(team.coachIds || []),
    ...(team.captainIds || []),
    ...(team.memberIds || []),
  ]);
  await setDoc(
    doc(firestore, COLLECTIONS.conversations, id),
    {
      scope: "team",
      teamId: team.id,
      title: `${team.name} team chat`,
      participantIds,
      archived: false,
      active: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return { id, scope: "team", teamId: team.id, participantIds };
}

export async function ensureCaptainConversation(
  firstTeam,
  secondTeam,
  matchId = "",
  challengeId = "",
) {
  requireFirebase();
  const id = matchId
    ? `match_${matchId}`
    : `match_${pairKey(firstTeam.id, secondTeam.id)}`;
  const participantIds = unique([
    firstTeam.ownerId,
    ...(firstTeam.adminIds || []),
    ...(firstTeam.coachIds || []),
    ...(firstTeam.captainIds || []),
    secondTeam.ownerId,
    ...(secondTeam.adminIds || []),
    ...(secondTeam.coachIds || []),
    ...(secondTeam.captainIds || []),
  ]);
  await setDoc(
    doc(firestore, COLLECTIONS.conversations, id),
    {
      scope: "match",
      teamId: firstTeam.id,
      teamIds: [firstTeam.id, secondTeam.id],
      title: `${firstTeam.name} vs ${secondTeam.name} logistics`,
      participantIds,
      matchId,
      challengeId,
      archived: false,
      active: true,
      closedAt: null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return { id, scope: "match", participantIds };
}

export async function ensurePlayerConversation(team, profile) {
  requireFirebase();
  const id = `player_${team.id}_${profile.ownerId}`;
  const youth = profile.isYouth === true || profile.ageGroup?.startsWith("U");
  const guardianId = profile.guardianAccountId || "";
  const participantIds = unique([
    team.ownerId,
    ...(team.adminIds || []),
    profile.ownerId,
    guardianId,
  ]);
  await setDoc(
    doc(firestore, COLLECTIONS.conversations, id),
    {
      scope: "player",
      teamId: team.id,
      title: `${profile.name || "Player"} and ${team.name}`,
      participantIds,
      youthParticipantIds: youth ? [profile.ownerId] : [],
      guardianIncluded:
        !youth || Boolean(guardianId) || team.adminIds?.length > 0,
      archived: false,
      active: true,
      closedAt: null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return { id, scope: "player", participantIds };
}

export async function ensureDirectConversation(actorId, target) {
  requireFirebase();
  if (!actorId || !target?.ownerId)
    throw new Error("Choose someone to contact.");
  const youth =
    target.isYouth === true ||
    target.ageGroup?.startsWith("U") ||
    (target.dateOfBirth &&
      Date.now() - new Date(target.dateOfBirth).getTime() <
        18 * 365.25 * 86400000);
  const guardianId =
    target.guardianAccountId || target.approvedTeamAdultId || "";
  if (youth && !guardianId)
    throw new Error(
      "A guardian or approved team adult must be linked before private youth messaging.",
    );
  const conversationPair = [actorId, target.ownerId].sort();
  const participantIds = unique([...conversationPair, guardianId]);
  const id = `direct_${conversationPair.join("_")}`;
  await setDoc(
    doc(firestore, COLLECTIONS.conversations, id),
    {
      scope: "direct",
      title: target.name || target.organization || "Private conversation",
      participantIds,
      youthParticipantIds: youth ? [target.ownerId] : [],
      guardianIncluded: !youth || Boolean(guardianId),
      archived: false,
      active: true,
      closedAt: null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return { id, scope: "direct", participantIds };
}

export async function loadConversations(uid) {
  if (!firebaseConfigured || !uid) return [];
  return records(
    await getDocs(
      query(
        collection(firestore, COLLECTIONS.conversations),
        where("participantIds", "array-contains", uid),
      ),
    ),
  );
}

export function subscribeConversations(uid, onChange, onError = () => {}) {
  if (!firebaseConfigured || !uid) return () => {};
  return onSnapshot(
    query(
      collection(firestore, COLLECTIONS.conversations),
      where("participantIds", "array-contains", uid),
    ),
    (snapshot) => onChange(records(snapshot)),
    onError,
  );
}

export async function loadConversationMessages(id) {
  if (!firebaseConfigured || !id) return [];
  return records(
    await getDocs(
      collection(firestore, COLLECTIONS.conversations, id, "messages"),
    ),
  );
}

export function subscribeConversationMessages(
  id,
  onChange,
  onError = () => {},
) {
  if (!firebaseConfigured || !id) return () => {};
  return onSnapshot(
    collection(firestore, COLLECTIONS.conversations, id, "messages"),
    (snapshot) =>
      onChange(
        records(snapshot).sort(
          (a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0),
        ),
      ),
    onError,
  );
}

export async function sendConversationMessage(id, senderId, text) {
  requireFirebase();
  const clean = text.trim();
  if (!clean) throw new Error("Write a message first.");
  const conversationRef = doc(firestore, COLLECTIONS.conversations, id);
  const snapshot = await getDoc(conversationRef);
  const conversation = snapshot.data() || {};
  if (conversation.blockedBy?.length)
    throw new Error("This conversation has been blocked.");
  if (
    conversation.youthParticipantIds?.length &&
    conversation.guardianIncluded !== true
  )
    throw new Error("A guardian or approved team adult must be included.");
  const messageRef = doc(collection(conversationRef, "messages"));
  const batch = writeBatch(firestore);
  batch.set(messageRef, {
    senderId,
    text: clean,
    createdAt: serverTimestamp(),
  });
  batch.update(conversationRef, {
    lastMessage: clean,
    lastMessageSenderId: senderId,
    lastMessageAt: serverTimestamp(),
    readBy: [senderId],
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return messageRef;
}

export async function markConversationRead(id, actorId) {
  requireFirebase();
  if (!id || !actorId) return;
  await updateDoc(doc(firestore, COLLECTIONS.conversations, id), {
    readBy: arrayUnion(actorId),
  });
}

export async function closeConversation(id, actorId) {
  requireFirebase();
  await updateDoc(doc(firestore, COLLECTIONS.conversations, id), {
    archived: true,
    active: false,
    closedBy: actorId,
    closedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function setConversationControl(id, actorId, control, enabled) {
  requireFirebase();
  const field = control === "mute" ? "mutedBy" : "blockedBy";
  await updateDoc(doc(firestore, COLLECTIONS.conversations, id), {
    [field]: enabled ? arrayUnion(actorId) : arrayRemove(actorId),
    updatedAt: serverTimestamp(),
  });
}

export async function loadTeamJoinRequests(uid) {
  if (!firebaseConfigured || !uid) return [];
  const snapshot = await getDocs(
    query(
      collection(firestore, COLLECTIONS.matchRequests),
      where("recipientUserIds", "array-contains", uid),
    ),
  );
  return records(snapshot).filter(
    (item) => item.type === "team_join" && item.status === "pending",
  );
}

export async function respondToTeamJoinRequest(requestId, status) {
  requireFirebase();
  await updateDoc(doc(firestore, COLLECTIONS.matchRequests, requestId), {
    status,
    respondedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function addExistingPlayerToTeam(teamId, profile, actorId) {
  requireFirebase();
  const assignmentRef = doc(
    firestore,
    COLLECTIONS.playerAssignments,
    profile.ownerId,
  );
  const membershipRef = doc(
    firestore,
    COLLECTIONS.teamMembers,
    `${teamId}_${profile.ownerId}`,
  );
  const teamRef = doc(firestore, COLLECTIONS.teams, teamId);
  await runTransaction(firestore, async (transaction) => {
    const assignment = await transaction.get(assignmentRef);
    if (assignment.exists() && assignment.data().teamId !== teamId)
      throw new Error("This player already belongs to another team.");
    transaction.set(
      assignmentRef,
      {
        userId: profile.ownerId,
        teamId,
        publicProfileId: profile.id,
        assignedAt: assignment.exists()
          ? assignment.data().assignedAt
          : serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    transaction.set(
      membershipRef,
      {
        teamId,
        userId: profile.ownerId,
        publicProfileId: profile.id,
        role: "Player",
        status: "active",
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    transaction.update(teamRef, {
      memberIds: arrayUnion(profile.ownerId),
      ...(!assignment.exists() ? { "stats.players": increment(1) } : {}),
      updatedAt: serverTimestamp(),
    });
  });
  await createNotifications(
    [profile.ownerId],
    actorId,
    "team_invite",
    "Added to a team",
    "A team coach added your saved player profile to their squad.",
    teamId,
  ).catch(() => {});
}

export async function removePlayerFromTeam(teamId, profile) {
  requireFirebase();
  const batch = writeBatch(firestore);
  batch.delete(doc(firestore, COLLECTIONS.playerAssignments, profile.ownerId));
  batch.delete(
    doc(firestore, COLLECTIONS.teamMembers, `${teamId}_${profile.ownerId}`),
  );
  batch.update(doc(firestore, COLLECTIONS.teams, teamId), {
    memberIds: arrayRemove(profile.ownerId),
    "stats.players": increment(-1),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function loadPlayerAssignments() {
  if (!firebaseConfigured) return [];
  return records(
    await getDocs(collection(firestore, COLLECTIONS.playerAssignments)),
  );
}

const pairKey = (first, second) => [first, second].sort().join("_");

export async function createTeamChallenge(
  ownerId,
  senderTeam,
  recipientTeam,
  terms,
) {
  requireFirebase();
  const all = await loadTeamChallenges(ownerId);
  const existing = all.find(
    (item) =>
      ["pending", "negotiating", "accepted"].includes(item.status) &&
      pairKey(item.senderTeamId, item.recipientTeamId) ===
        pairKey(senderTeam.id, recipientTeam.id),
  );
  if (existing) return { ...existing, alreadyExists: true };
  const recipientUserIds = unique([
    recipientTeam.ownerId,
    ...(recipientTeam.adminIds || []),
  ]);
  const reference = await addDoc(
    collection(firestore, COLLECTIONS.matchRequests),
    {
      ownerId,
      recipientUserIds,
      senderTeamId: senderTeam.id,
      senderTeamName: senderTeam.name,
      recipientTeamId: recipientTeam.id,
      recipientTeamName: recipientTeam.name,
      type: "team_challenge",
      status: "pending",
      terms,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  );
  await createNotifications(
    recipientUserIds,
    ownerId,
    "team_challenge",
    "New match challenge",
    `${senderTeam.name} wants to arrange a match.`,
    reference.id,
  ).catch(() => {});
  return {
    id: reference.id,
    ownerId,
    recipientUserIds,
    senderTeamId: senderTeam.id,
    senderTeamName: senderTeam.name,
    recipientTeamId: recipientTeam.id,
    recipientTeamName: recipientTeam.name,
    status: "pending",
    terms,
  };
}

export function subscribeMatches(onChange, onError = () => {}) {
  if (!firebaseConfigured) return () => {};
  return onSnapshot(
    collection(firestore, COLLECTIONS.matches),
    (snapshot) => onChange(records(snapshot)),
    onError,
  );
}

export function subscribeConfirmedMatches(onChange, onError = () => {}) {
  if (!firebaseConfigured) return () => {};
  return onSnapshot(
    collection(firestore, COLLECTIONS.matches),
    (snapshot) =>
      onChange(
        records(snapshot).filter((item) =>
          [
            "confirmed",
            "result_pending",
            "result_disputed",
            "completed",
            "cancelled",
          ].includes(item.status),
        ),
      ),
    onError,
  );
}

export async function completeMatchRecord(
  matchId,
  result,
  actorTeamId,
  actorId,
) {
  requireFirebase();
  const reference = doc(firestore, COLLECTIONS.matches, matchId);
  const snapshot = await getDoc(reference);
  if (!snapshot.exists()) throw new Error("This match no longer exists.");
  const match = snapshot.data();
  const confirmationTeamId = (match.participantTeamIds || []).find(
    (teamId) => teamId !== actorTeamId,
  );
  const normalizedResult = {
    ...result,
    events: (result.events || []).map((event) => ({
      ...event,
      teamId:
        event.teamId ||
        (event.side === "home"
          ? match.homeTeamId
          : event.side === "away"
            ? match.awayTeamId
            : actorTeamId || ""),
    })),
    agreedRules: match.agreedRules || null,
  };
  await updateDoc(reference, {
    status: "result_pending",
    result: normalizedResult,
    resultDisputeStatus:
      match.resultDisputeStatus === "open"
        ? "awaiting_confirmation"
        : match.resultDisputeStatus || "",
    resultSubmittedByTeamId: actorTeamId,
    resultSubmittedBy: actorId,
    resultConfirmationTeamId: confirmationTeamId || "",
    resultSubmittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await createNotifications(
    (match.participantUserIds || []).filter((uid) => uid !== actorId),
    actorId,
    "result_confirmation",
    "Confirm match result",
    `${match.homeTeamName} vs ${match.awayTeamName} has a result waiting for confirmation.`,
    matchId,
  ).catch(() => {});
}

export async function disputeMatchResultRecord(
  match,
  actorTeamId,
  actorId,
  proposedResult,
  reason,
) {
  requireFirebase();
  if (!match?.id) throw new Error("Choose a match result.");
  const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const disputeId = `${match.id}_${actorTeamId}`;
  const batch = writeBatch(firestore);
  batch.set(
    doc(firestore, COLLECTIONS.scoreDisputes, disputeId),
    {
      matchId: match.id,
      ownerId: actorId,
      actorTeamId,
      participantUserIds: match.participantUserIds || [],
      originalResult: match.result || {},
      proposedResult,
      reason: reason.trim(),
      status: "open",
      deadline,
      penaltyTeamIds: match.participantTeamIds || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  batch.update(doc(firestore, COLLECTIONS.matches, match.id), {
    status: "result_disputed",
    resultDisputeStatus: "open",
    disputedByTeamId: actorTeamId,
    disputedBy: actorId,
    proposedResult,
    disputeReason: reason.trim(),
    activeDisputeId: disputeId,
    resultCorrectionDeadline: deadline,
    disputePenaltyTeamIds: match.participantTeamIds || [],
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  await createNotifications(
    (match.participantUserIds || []).filter((uid) => uid !== actorId),
    actorId,
    "score_dispute",
    "Score correction requested",
    `${match.homeTeamName} ${Number(proposedResult.homeScore || 0)} : ${Number(proposedResult.awayScore || 0)} ${match.awayTeamName}. ${reason.trim()}`,
    match.id,
  ).catch(() => {});
}

const nextStats = (
  team,
  goalsFor,
  goalsAgainst,
  won,
  draw,
  multiplier,
  yellowCards = 0,
  redCards = 0,
) => {
  const stats = team.stats || {};
  const points = draw ? 1 : won ? 3 : 0;
  return {
    players: Number(stats.players || 0),
    matches: Number(stats.matches || 0) + 1,
    wins: Number(stats.wins || 0) + (won ? 1 : 0),
    draws: Number(stats.draws || 0) + (draw ? 1 : 0),
    losses: Number(stats.losses || 0) + (!draw && !won ? 1 : 0),
    goalsFor: Number(stats.goalsFor || 0) + goalsFor,
    goalsAgainst: Number(stats.goalsAgainst || 0) + goalsAgainst,
    yellowCards: Number(stats.yellowCards || 0) + yellowCards,
    redCards: Number(stats.redCards || 0) + redCards,
    points: Number(stats.points || 0) + points,
    rankingScore: Number(stats.rankingScore || 0) + points * multiplier,
    tournamentsPlayed: Number(stats.tournamentsPlayed || 0),
    tournamentsWon: Number(stats.tournamentsWon || 0),
    awards: Array.isArray(stats.awards) ? stats.awards : [],
  };
};

export async function confirmMatchResultRecord(matchId, actorTeamId, actorId) {
  requireFirebase();
  const matchRef = doc(firestore, COLLECTIONS.matches, matchId);
  await runTransaction(firestore, async (transaction) => {
    const matchSnapshot = await transaction.get(matchRef);
    if (!matchSnapshot.exists())
      throw new Error("This match no longer exists.");
    const match = matchSnapshot.data();
    const allowed =
      (match.status === "result_pending" &&
        match.resultConfirmationTeamId === actorTeamId) ||
      (match.status === "completed" &&
        match.statsApplied !== true &&
        match.participantTeamIds?.includes(actorTeamId));
    if (!allowed)
      throw new Error("The opposing team must confirm this result.");
    if (match.statsApplied === true) return;
    const homeRef = doc(firestore, COLLECTIONS.teams, match.homeTeamId);
    const awayRef = doc(firestore, COLLECTIONS.teams, match.awayTeamId);
    const [homeSnapshot, awaySnapshot] = await Promise.all([
      transaction.get(homeRef),
      transaction.get(awayRef),
    ]);
    if (!homeSnapshot.exists() || !awaySnapshot.exists())
      throw new Error("Both teams are required to verify the standings.");
    const homeScore = Number(match.result?.homeScore || 0);
    const awayScore = Number(match.result?.awayScore || 0);
    const draw = homeScore === awayScore;
    const homeWon = homeScore > awayScore;
    const multiplier =
      match.competitionId || match.matchType === "league" ? 2 : 1;
    const bucketKey = match.competitionId
      ? `competition_${match.competitionId}`
      : "friendlies";
    const cardsFor = (teamId) => {
      const events = (match.result?.events || []).filter(
        (event) =>
          event.teamId === teamId ||
          (!event.teamId && match.resultSubmittedByTeamId === teamId),
      );
      return {
        yellowCards: events.filter((event) =>
          ["yellow", "yellow_card", "Yellow card"].includes(event.type),
        ).length,
        redCards: events.filter((event) =>
          ["red", "red_card", "Red card"].includes(event.type),
        ).length,
      };
    };
    const updateFor = (snapshot, goalsFor, goalsAgainst, won, cards) => {
      const data = snapshot.data();
      const currentBucket = data.statsByCompetition?.[bucketKey] || {};
      const points = draw ? 1 : won ? 3 : 0;
      return {
        stats: nextStats(
          data,
          goalsFor,
          goalsAgainst,
          won,
          draw,
          multiplier,
          cards.yellowCards,
          cards.redCards,
        ),
        statsByCompetition: {
          ...(data.statsByCompetition || {}),
          [bucketKey]: {
            matches: Number(currentBucket.matches || 0) + 1,
            wins: Number(currentBucket.wins || 0) + (won ? 1 : 0),
            draws: Number(currentBucket.draws || 0) + (draw ? 1 : 0),
            losses: Number(currentBucket.losses || 0) + (!draw && !won ? 1 : 0),
            goalsFor: Number(currentBucket.goalsFor || 0) + goalsFor,
            goalsAgainst:
              Number(currentBucket.goalsAgainst || 0) + goalsAgainst,
            yellowCards:
              Number(currentBucket.yellowCards || 0) + cards.yellowCards,
            redCards: Number(currentBucket.redCards || 0) + cards.redCards,
            points: Number(currentBucket.points || 0) + points,
          },
        },
      };
    };
    transaction.update(homeRef, {
      ...updateFor(
        homeSnapshot,
        homeScore,
        awayScore,
        homeWon,
        cardsFor(match.homeTeamId),
      ),
      lastStatsMatchId: matchId,
      updatedAt: serverTimestamp(),
    });
    transaction.update(awayRef, {
      ...updateFor(
        awaySnapshot,
        awayScore,
        homeScore,
        !draw && !homeWon,
        cardsFor(match.awayTeamId),
      ),
      lastStatsMatchId: matchId,
      updatedAt: serverTimestamp(),
    });
    transaction.update(matchRef, {
      status: "completed",
      statsApplied: true,
      resultDisputeStatus: match.activeDisputeId
        ? "resolved"
        : match.resultDisputeStatus || "",
      resultConfirmedBy: actorId,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (match.activeDisputeId)
      transaction.update(
        doc(firestore, COLLECTIONS.scoreDisputes, match.activeDisputeId),
        {
          status: "resolved",
          resolvedBy: actorId,
          resolvedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      );
    if (match.challengeId)
      transaction.update(
        doc(firestore, COLLECTIONS.matchRequests, match.challengeId),
        {
          status: "completed",
          completedMatchId: matchId,
          updatedAt: serverTimestamp(),
        },
      );
  });
  const chats = await getDocs(
    query(
      collection(firestore, COLLECTIONS.conversations),
      where("matchId", "==", matchId),
    ),
  );
  if (!chats.empty) {
    const batch = writeBatch(firestore);
    chats.docs.forEach((chat) =>
      batch.update(chat.ref, {
        archived: true,
        active: false,
        closedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    await batch.commit();
  }
}

const cancellationNotice = (match) => {
  const scheduled = new Date(
    `${match.matchDate || ""}T${match.kickoff || "00:00"}:00`,
  ).getTime();
  const hoursNotice = Number.isFinite(scheduled)
    ? Math.floor((scheduled - Date.now()) / 3600000)
    : 0;
  return {
    hoursNotice,
    type: hoursNotice >= 24 ? "with_notice" : "late",
  };
};

export async function requestMatchReschedule(
  match,
  actorTeamId,
  actorId,
  proposedDate,
  proposedTime,
  reason,
) {
  requireFirebase();
  if (!match?.participantTeamIds?.includes(actorTeamId))
    throw new Error("Only a team in this match can request a new kickoff.");
  if (!dateOnly(proposedDate) || !/^\d{2}:\d{2}$/.test(proposedTime || ""))
    throw new Error("Choose a valid date and time.");
  const proposedAt = new Date(`${proposedDate}T${proposedTime}:00`).getTime();
  if (!Number.isFinite(proposedAt) || proposedAt <= Date.now())
    throw new Error("The proposed kickoff must be in the future.");
  const confirmationTeamId = match.participantTeamIds.find(
    (id) => id !== actorTeamId,
  );
  await updateDoc(doc(firestore, COLLECTIONS.matches, match.id), {
    rescheduleStatus: "pending",
    rescheduleRequestedByTeamId: actorTeamId,
    rescheduleRequestedBy: actorId,
    rescheduleConfirmationTeamId: confirmationTeamId,
    proposedMatchDate: proposedDate,
    proposedKickoff: proposedTime,
    rescheduleReason: (reason || "").trim(),
    rescheduleRequestedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await createNotifications(
    (match.participantUserIds || []).filter((uid) => uid !== actorId),
    actorId,
    "match_reschedule",
    "New kickoff requested",
    `${match.homeTeamName} vs ${match.awayTeamName}: ${proposedDate} at ${proposedTime}.`,
    match.id,
  ).catch(() => {});
}

export async function respondMatchReschedule(
  match,
  actorTeamId,
  actorId,
  accepted,
) {
  requireFirebase();
  if (
    match.rescheduleStatus !== "pending" ||
    match.rescheduleConfirmationTeamId !== actorTeamId
  )
    throw new Error("The other team must respond to this request.");
  await updateDoc(doc(firestore, COLLECTIONS.matches, match.id), {
    ...(accepted
      ? {
          matchDate: match.proposedMatchDate,
          kickoff: match.proposedKickoff,
        }
      : {}),
    rescheduleStatus: accepted ? "accepted" : "rejected",
    rescheduleRespondedBy: actorId,
    rescheduleRespondedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await createNotifications(
    (match.participantUserIds || []).filter((uid) => uid !== actorId),
    actorId,
    "match_reschedule_response",
    accepted ? "New kickoff agreed" : "Kickoff change not agreed",
    accepted
      ? `${match.homeTeamName} vs ${match.awayTeamName} now starts on ${match.proposedMatchDate} at ${match.proposedKickoff}.`
      : "The original kickoff remains. Continue the discussion in the match chat.",
    match.id,
  ).catch(() => {});
}

export async function requestMatchCancellation(
  match,
  actorTeamId,
  actorId,
  reason,
  details,
) {
  requireFirebase();
  const notice = cancellationNotice(match);
  await updateDoc(doc(firestore, COLLECTIONS.matches, match.id), {
    cancellationStatus: "pending",
    cancellationType: notice.type,
    cancellationHoursNotice: notice.hoursNotice,
    cancellationReason: reason,
    cancellationDetails: details.trim(),
    cancellationRequestedByTeamId: actorTeamId,
    cancellationRequestedBy: actorId,
    cancellationConfirmationTeamId: match.participantTeamIds?.find(
      (id) => id !== actorTeamId,
    ),
    cancellationRequestedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function respondMatchCancellation(
  match,
  actorTeamId,
  actorId,
  decision,
) {
  requireFirebase();
  if (match.cancellationConfirmationTeamId !== actorTeamId)
    throw new Error("The other team must respond to this cancellation.");
  const outcome =
    decision === true ? "mutual" : decision === false ? "keep" : decision;
  if (!["mutual", "requester_responsible", "keep"].includes(outcome))
    throw new Error("Choose how this cancellation should be recorded.");
  const cancelled = outcome !== "keep";
  const mutuallyAgreed = outcome === "mutual";
  const penaltyTeamIds =
    outcome === "requester_responsible"
      ? [match.cancellationRequestedByTeamId]
      : [];
  const batch = writeBatch(firestore);
  batch.update(doc(firestore, COLLECTIONS.matches, match.id), {
    status: cancelled ? "cancelled" : "confirmed",
    cancellationStatus: cancelled ? "confirmed" : "rejected",
    cancellationDecision: outcome,
    cancellationMutuallyAgreed: mutuallyAgreed,
    cancellationPenaltyTeamIds: penaltyTeamIds,
    cancellationResponsibleTeamId:
      outcome === "requester_responsible"
        ? match.cancellationRequestedByTeamId
        : "",
    cancellationRespondedBy: actorId,
    cancellationRespondedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  if (match.challengeId)
    batch.update(doc(firestore, COLLECTIONS.matchRequests, match.challengeId), {
      status: cancelled ? "cancelled" : "accepted",
      updatedAt: serverTimestamp(),
    });
  await batch.commit();
  await createNotifications(
    (match.participantUserIds || []).filter((uid) => uid !== actorId),
    actorId,
    "cancellation_response",
    mutuallyAgreed
      ? "Mutual cancellation agreed"
      : outcome === "requester_responsible"
        ? "Match cancelled with responsibility recorded"
        : "Cancellation not agreed",
    mutuallyAgreed
      ? "Both teams agreed to cancel. Neither team is penalised."
      : outcome === "requester_responsible"
        ? "The match is cancelled and the requesting team is recorded as responsible."
        : "The match remains scheduled. If a team does not attend, report the no-show after kickoff.",
    match.id,
  ).catch(() => {});
}

export async function reportMatchNoShow(
  match,
  actorTeamId,
  actorId,
  reportedTeamId,
  details,
) {
  requireFirebase();
  await updateDoc(doc(firestore, COLLECTIONS.matches, match.id), {
    noShowStatus: "pending_confirmation",
    noShowReportedByTeamId: actorTeamId,
    noShowReportedBy: actorId,
    noShowReportedTeamId: reportedTeamId,
    noShowConfirmationTeamId: reportedTeamId,
    noShowDetails: details.trim(),
    noShowReportedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function respondMatchNoShow(
  match,
  actorTeamId,
  actorId,
  confirmed,
) {
  requireFirebase();
  if (match.noShowConfirmationTeamId !== actorTeamId)
    throw new Error("The reported team must respond.");
  await updateDoc(doc(firestore, COLLECTIONS.matches, match.id), {
    status: confirmed ? "cancelled" : "confirmed",
    noShowStatus: confirmed ? "confirmed" : "disputed",
    cancellationStatus: confirmed ? "confirmed" : "",
    cancellationType: confirmed ? "no_show" : "",
    cancellationMutuallyAgreed: false,
    cancellationPenaltyTeamIds: confirmed ? [match.noShowReportedTeamId] : [],
    noShowRespondedBy: actorId,
    noShowRespondedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function loadTeamChallenges(uid) {
  if (!firebaseConfigured || !uid) return [];
  const source = collection(firestore, COLLECTIONS.matchRequests);
  const [owned, received] = await Promise.all([
    getDocs(query(source, where("ownerId", "==", uid))),
    getDocs(query(source, where("recipientUserIds", "array-contains", uid))),
  ]);
  const map = new Map();
  [...owned.docs, ...received.docs].forEach((item) =>
    map.set(item.id, { ...item.data(), id: item.id }),
  );
  return [...map.values()].filter(
    (item) =>
      item.type === "team_challenge" &&
      ["pending", "negotiating", "accepted"].includes(item.status),
  );
}

export function subscribeTeamChallenges(uid, onChange, onError = () => {}) {
  if (!firebaseConfigured || !uid) return () => {};
  const sources = { owned: [], received: [] };
  const publish = () => {
    const merged = new Map();
    [...sources.owned, ...sources.received].forEach((item) =>
      merged.set(item.id, item),
    );
    onChange(
      [...merged.values()].filter(
        (item) =>
          item.type === "team_challenge" &&
          ["pending", "negotiating", "accepted"].includes(item.status),
      ),
    );
  };
  const source = collection(firestore, COLLECTIONS.matchRequests);
  const unsubscribeOwned = onSnapshot(
    query(source, where("ownerId", "==", uid)),
    (snapshot) => {
      sources.owned = records(snapshot);
      publish();
    },
    onError,
  );
  const unsubscribeReceived = onSnapshot(
    query(source, where("recipientUserIds", "array-contains", uid)),
    (snapshot) => {
      sources.received = records(snapshot);
      publish();
    },
    onError,
  );
  return () => {
    unsubscribeOwned();
    unsubscribeReceived();
  };
}

export async function respondToTeamChallenge(requestId, status, terms) {
  requireFirebase();
  await updateDoc(doc(firestore, COLLECTIONS.matchRequests, requestId), {
    status,
    ...(terms ? { terms } : {}),
    respondedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function negotiateTeamChallenge(
  request,
  senderId,
  senderTeam,
  recipientTeam,
  terms,
) {
  requireFirebase();
  const record = {
    ownerId: senderId,
    recipientUserIds: unique([
      recipientTeam.ownerId,
      ...(recipientTeam.adminIds || []),
    ]),
    senderTeamId: senderTeam.id,
    senderTeamName: senderTeam.name,
    recipientTeamId: recipientTeam.id,
    recipientTeamName: recipientTeam.name,
    status: "negotiating",
    terms,
    respondedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await updateDoc(
    doc(firestore, COLLECTIONS.matchRequests, request.id),
    record,
  );
  return { ...request, ...record };
}

export async function acceptTeamChallenge(
  request,
  actorId,
  firstTeam,
  secondTeam,
) {
  requireFirebase();
  const matchId = `match_${request.id}`;
  const participantUserIds = unique([
    request.ownerId,
    ...(request.recipientUserIds || []),
  ]);
  const match = {
    challengeId: request.id,
    createdBy: actorId,
    participantUserIds,
    participantTeamIds: [request.senderTeamId, request.recipientTeamId],
    homeTeamId: request.terms?.homeTeamId || request.senderTeamId,
    awayTeamId: request.terms?.awayTeamId || request.recipientTeamId,
    homeTeamName:
      request.terms?.homeTeamId === request.recipientTeamId
        ? request.recipientTeamName
        : request.senderTeamName,
    awayTeamName:
      request.terms?.awayTeamId === request.senderTeamId
        ? request.senderTeamName
        : request.recipientTeamName,
    matchDate: request.terms?.day || "",
    kickoff: request.terms?.time || "",
    venue: request.terms?.venue || "",
    format: request.terms?.format || "11-a-side",
    durationMinutes: Number(request.terms?.durationMinutes || 90),
    teamFee: Number(request.terms?.fee || 0),
    proposedRefereeFee: Number(request.terms?.refereeBudget || 0),
    agreedRules: request.terms?.communityRules || null,
    rulesConfirmedTeamIds: [request.senderTeamId, request.recipientTeamId],
    refereeStatus: "needed",
    status: "confirmed",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const batch = writeBatch(firestore);
  batch.update(doc(firestore, COLLECTIONS.matchRequests, request.id), {
    status: "accepted",
    matchId,
    respondedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(firestore, COLLECTIONS.matches, matchId), match);
  await batch.commit();
  await ensureCaptainConversation(
    firstTeam,
    secondTeam,
    matchId,
    request.id,
  ).catch(() => {});
  return {
    request: { ...request, status: "accepted", matchId },
    match: { ...match, id: matchId },
  };
}
