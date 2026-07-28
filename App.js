import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Modal,
  TextInput,
  StatusBar,
  Animated,
  AccessibilityInfo,
  Alert,
  PanResponder,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  useWindowDimensions,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Asset } from "expo-asset";
import { useFonts } from "expo-font";
import AppIcon, { APP_ICON_ASSETS } from "./components/AppIcon";
import AsyncStorage from "./services/storage";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import * as Location from "expo-location";
import Svg, {
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import GroundMap from "./components/GroundMap";
import DateField from "./components/DateField";
import {
  addAccountRole,
  createAccount,
  createGuestSession,
  getCurrentSession,
  initializeDatabase,
  removeAccountRole,
  signIn,
  signOut as clearSession,
} from "./services/database";
import { firebaseConfigured } from "./services/firebaseClient";
import {
  addExistingPlayerToTeam,
  acceptTeamChallenge,
  approveRefereeForMatch,
  rejectRefereeForMatch,
  clearNotification,
  closeConversation,
  confirmMatchResultRecord,
  confirmCommunityGround,
  createCommunityGround,
  createLeagueRecord,
  createOpportunityRecord,
  createSafeguardingReport,
  createSponsorshipProposal,
  createNotifications,
  completeMatchRecord,
  createTeamChallenge,
  createTeamRecord,
  ensureTeamConversation,
  ensurePlayerConversation,
  ensureDirectConversation,
  joinLeagueRecord,
  loadConversations,
  loadCommunityGrounds,
  loadConversationMessages,
  loadAvailabilityPosts,
  loadDiscoverableTeams,
  loadLeagueRecords,
  loadMatchReviews,
  loadNotifications,
  loadOpportunities,
  loadPublicProfiles,
  loadPlayerAssignments,
  loadTeamRecord,
  loadTeamChallenges,
  loadTeamJoinRequests,
  loadUserTeamMemberships,
  loadUserWorkspace,
  markConversationRead,
  negotiateTeamChallenge,
  requestToJoinTeam,
  requestRefereeForMatch,
  requestMatchCancellation,
  requestMatchReschedule,
  reportMatchNoShow,
  reportConversation,
  reportOpportunity,
  removePlayerFromTeam,
  respondToTeamChallenge,
  respondToRefereeAssignment,
  respondMatchCancellation,
  respondMatchReschedule,
  respondMatchNoShow,
  respondToTeamJoinRequest,
  saveAvailabilityPost,
  syncLeagueSchedule,
  savePostMatchReview,
  savePublicProfile,
  saveUserWorkspace,
  sendConversationMessage,
  setConversationControl,
  disputeMatchResultRecord,
  subscribeConversationMessages,
  subscribeConversations,
  subscribeConfirmedMatches,
  subscribeLeagueRecords,
  subscribeMatches,
  subscribeMatchReviews,
  subscribeRefereeAssignments,
  subscribeTeamChallenges,
  updateTeamRecord,
  updateOpportunityStatus,
  respondToOpportunity,
} from "./services/firestoreData";
import { fetchLiveScores, liveRecordToFixture } from "./services/liveScores";
import { rankOpponentCandidates } from "./services/communityAlgorithms";
import { rankRefereeAssignments } from "./services/roleAlgorithms";

const Archivo_400Regular = require("@expo-google-fonts/archivo/400Regular/Archivo_400Regular.ttf");
const Archivo_500Medium = require("@expo-google-fonts/archivo/500Medium/Archivo_500Medium.ttf");
const Archivo_600SemiBold = require("@expo-google-fonts/archivo/600SemiBold/Archivo_600SemiBold.ttf");
const Archivo_700Bold = require("@expo-google-fonts/archivo/700Bold/Archivo_700Bold.ttf");
const Archivo_800ExtraBold = require("@expo-google-fonts/archivo/800ExtraBold/Archivo_800ExtraBold.ttf");
const Archivo_900Black = require("@expo-google-fonts/archivo/900Black/Archivo_900Black.ttf");

const C = {
  red: "#6C2BEA",
  redDark: "#2D0A45",
  ink: "#17131D",
  cream: "#F3F1F6",
  white: "#FFFFFF",
  muted: "#6D6575",
  line: "#DED8E6",
  green: "#168A53",
  gold: "#B9F34A",
};
const F = {
  regular: "Archivo_400Regular",
  medium: "Archivo_500Medium",
  semibold: "Archivo_600SemiBold",
  bold: "Archivo_700Bold",
  extra: "Archivo_800ExtraBold",
  black: "Archivo_900Black",
};

function AppText({ style, ...props }) {
  return <Text {...props} style={[{ fontFamily: F.regular }, style]} />;
}

function Ionicons({ name, ...props }) {
  return <AppIcon {...props} name={name} />;
}

function Icons8Credit() {
  return (
    <Pressable
      onPress={() => Linking.openURL("https://icons8.com")}
      accessibilityRole="link"
      accessibilityLabel="Icons provided by Icons8"
      style={s.icons8Credit}
    >
      <AppText style={s.icons8CreditText}>Icons by Icons8</AppText>
    </Pressable>
  );
}

function SignOutAction({ onSignOut, compact = false }) {
  return (
    <Pressable
      onPress={onSignOut}
      style={[s.moreSignOut, compact && s.moreSignOutCompact]}
      accessibilityRole="button"
      accessibilityLabel="Sign out of Grassroots"
    >
      <Ionicons name="log-out-outline" size={20} color={C.white} />
      <View style={{ flex: 1 }}>
        <AppText style={s.moreSignOutTitle}>Sign out</AppText>
        <AppText style={s.moreSignOutCopy}>Return to the sign-in screen</AppText>
      </View>
    </Pressable>
  );
}

const numbersOnly = (value) => value.replace(/[^0-9]/g, "");
const formatStoredDate = (value) => {
  if (!value) return "Not selected";
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};
const formatChatTime = (value) => {
  const date = value?.toDate
    ? value.toDate()
    : value?.seconds
      ? new Date(value.seconds * 1000)
      : value
        ? new Date(value)
        : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
const conversationIsUnread = (conversation, uid) =>
  Boolean(
    conversation?.lastMessage &&
      conversation.lastMessageSenderId !== uid &&
      !(conversation.readBy || []).includes(uid),
  );
const getMatchdayLineup = () => ({
  exactMatch: false,
  context: "No lineup has been reported for this fixture.",
  starting: [],
  substitutes: [],
  captain: "",
  coach: "",
});

async function choosePlayerClip(data, update) {
  if ((data.videos || []).length >= 8)
    return Alert.alert(
      "Clip portfolio full",
      "Keep your best eight clips so a club can review the CV quickly.",
    );
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted)
    return Alert.alert(
      "Videos permission needed",
      "Allow Grassroots to choose a football clip from this device.",
    );
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["videos"],
    allowsEditing: false,
  });
  if (result.canceled) return;
  const asset = result.assets[0];
  if (asset.duration && asset.duration > 30000)
    return Alert.alert(
      "Clip is longer than 30 seconds",
      "Trim it to one decisive football moment, then add it again.",
    );
  update((current) => ({
    videos: [
      ...(current.videos || []),
      {
        uri: asset.uri,
        name:
          asset.fileName ||
          `Evidence clip ${(current.videos || []).length + 1}`,
        duration: asset.duration || 30000,
        added: "Today",
      },
    ],
  }));
  Alert.alert(
    "Clip added",
    "The 30-second clip is now part of your player CV.",
  );
}

function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(key)
      .then((saved) => {
        if (active && saved) setValue(JSON.parse(saved));
      })
      .catch(() => {})
      .finally(() => active && setHydrated(true));
    return () => {
      active = false;
    };
  }, [key]);
  useEffect(() => {
    if (hydrated)
      AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});
  }, [hydrated, key, value]);
  return [value, setValue, hydrated];
}

const initialRoleData = {
  Coach: {
    name: "",
    area: "",
    qualification: "",
    bio: "",
    profileImage: null,
    contactVisible: false,
    verificationRequested: false,
  },
  Player: {
    name: "",
    position: "",
    secondaryPosition: "",
    preferredFoot: "",
    area: "",
    bio: "",
    profileImage: null,
    contactVisible: false,
    verificationRequested: false,
    shirtNumber: "",
    ageBand: "",
    dateOfBirth: "",
    guardianName: "",
    guardianContact: "",
    guardianAccountId: "",
    guardianLinked: false,
    teamManagedYouthProfile: false,
    consentPhotos: false,
    consentVideos: false,
    consentTransport: false,
    consentTrials: false,
    nationality: "",
    heightCm: "",
    weightKg: "",
    languages: "",
    contractStatus: "",
    registrationId: "",
    season: "",
    appearances: "0",
    appearanceClaims: [],
    starts: "0",
    minutes: "0",
    goals: "0",
    assists: "0",
    yellowCards: "0",
    redCards: "0",
    careerHistory: [],
    achievements: [],
    club: "",
    rsvp: false,
    paid: false,
    videos: [],
    training: [],
    messages: [],
    chatRead: true,
  },
  Referee: {
    name: "",
    profileImage: null,
    area: "",
    nationality: "",
    association: "",
    refereePath: "Community volunteer",
    refereeRole: "",
    category: "",
    certificateLevel: 0,
    certificates: [],
    observerRating: 0,
    fitnessTest: "",
    languages: "",
    fifaId: "",
    matchesRefereed: 0,
    assistantMatches: 0,
    contactVisible: false,
    verificationRequested: false,
    volunteered: [],
    subscribed: false,
    availability: false,
  },
  Sponsor: {
    name: "",
    organization: "",
    sector: "",
    area: "",
    website: "",
    sponsorTypes: [],
    logoUri: null,
    contactVisible: false,
    verificationRequested: false,
    sponsorshipHistory: [],
    impactFocus: [],
    objectives: [],
    rightsWanted: [],
    proposals: [],
    watchlist: [],
    safeguardingAccepted: false,
    interests: [],
    budget: "",
  },
  Scout: {
    name: "",
    organization: "",
    credential: "",
    area: "",
    specialties: [],
    philosophy: "",
    licenceNumber: "",
    yearsExperience: "",
    safeguardingAccepted: false,
    notes: "",
    profileImage: null,
    contactVisible: false,
    verificationRequested: false,
    reports: [],
    watchlist: [],
    attending: [],
  },
};
const clubLogos = {
  Scottland: require("./assets/scottland.png"),
  Dynamos: require("./assets/dynamos.png"),
  Highlanders: require("./assets/highlanders.png"),
  "CAPS United": require("./assets/caps-united.png"),
  Herentals: require("./assets/herentals.png"),
  MWOS: require("./assets/mwos.png"),
  "Simba Bhora": require("./assets/simba-bhora.png"),
  "FC Platinum": require("./assets/fc-platinum.png"),
  "Bulawayo Chiefs": require("./assets/bulawayo-chiefs.png"),
  "Chicken Inn": require("./assets/chicken-inn.png"),
  TelOne: require("./assets/telone.png"),
  "Manica Diamonds": require("./assets/manica-diamonds.png"),
  "Triangle United": require("./assets/triangle-united.png"),
  "ZPC Kariba": require("./assets/zpc-kariba.png"),
  Agama: require("./assets/agama.png"),
  "Ngezi Platinum": require("./assets/ngezi-platinum.png"),
  "Hard Rock": require("./assets/hard-rock.png"),
  "FC Hunters": require("./assets/fc-hunters.png"),
};
const archivedSigningNews = [
  {
    image: require("./assets/dynamos-cullen.jpg"),
    title: "Dynamos announce Cullen English-Brown",
  },
  {
    image: require("./assets/dynamos-salbe.jpg"),
    title: "Salbe Ben Daouda joins the Glamour Boys",
  },
  {
    image: require("./assets/dynamos-mutasa.jpg"),
    title: "Nathan Mutasa unveiled in blue",
  },
];
const archivedFixtures = [
  ["SAT 18 JUL", "Bulawayo Chiefs", "FC Platinum", "15:00", "Barbourfields"],
  ["SAT 18 JUL", "TelOne", "ZPC Kariba", "15:00", "Ascot Stadium"],
  ["SAT 18 JUL", "FC Hunters", "Chicken Inn", "15:00", "Rufaro Stadium"],
  ["SAT 18 JUL", "Ngezi Platinum", "Herentals", "15:00", "Baobab Stadium"],
  ["SAT 18 JUL", "MWOS", "Agama", "15:00", "Ngoni Stadium"],
  ["SAT 18 JUL", "Manica Diamonds", "CAPS United", "15:00", "Gibbo Stadium"],
  ["SUN 19 JUL", "Hard Rock", "Triangle United", "15:00", "Chahwanda"],
  ["SUN 19 JUL", "Highlanders", "Scottland", "15:00", "Barbourfields"],
  ["SUN 19 JUL", "Dynamos", "Simba Bhora", "15:00", "Rufaro Stadium"],
];
const archivedCommunityTeams = [
  {
    name: "Mbare City Boys",
    area: "Mbare",
    players: 19,
    reliability: 98,
    open: "Sunday morning",
  },
  {
    name: "Avondale Athletic",
    area: "Avondale",
    players: 17,
    reliability: 96,
    open: "Saturday afternoon",
  },
  {
    name: "Seke XI",
    area: "Chitungwiza",
    players: 21,
    reliability: 94,
    open: "Sunday afternoon",
  },
  {
    name: "Greendale Social",
    area: "Greendale",
    players: 16,
    reliability: 92,
    open: "Saturday morning",
  },
  {
    name: "Highfield Lions",
    area: "Highfield",
    players: 18,
    reliability: 91,
    open: "Sunday morning",
  },
];
const archivedCommunityFixtures = [
  {
    id: "community-1",
    day: "TODAY",
    time: "14:00",
    home: "Mbare City Boys",
    away: "Avondale Athletic",
    venue: "Gwanzura Outer Ground",
    status: "Confirmed",
  },
  {
    id: "community-2",
    day: "TODAY",
    time: "15:30",
    home: "Seke XI",
    away: "Highfield Lions",
    venue: "Chitungwiza Aquatic",
    status: "Confirmed",
  },
  {
    id: "community-3",
    day: "TODAY",
    time: "16:00",
    home: "Greendale Social",
    away: "Arcadia United",
    venue: "Alex Sports Club",
    status: "Open spot",
  },
  {
    id: "community-4",
    day: "SUN 26 JUL",
    time: "10:00",
    home: "Avondale Social",
    away: "Mbare City Boys",
    venue: "Belgravia Sports Club",
    status: "Confirmed",
  },
  {
    id: "community-5",
    day: "SUN 26 JUL",
    time: "13:00",
    home: "Highfield Lions",
    away: "Greendale Social",
    venue: "Zimbabwe Grounds",
    status: "Pending",
  },
];
const archivedCommunityPlayers = [
  ["Tawanda Ncube", "GK", "Available"],
  ["Kudakwashe Moyo", "DEF", "Available"],
  ["Munyaradzi Chikore", "DEF", "Pending"],
  ["Tafadzwa Mupfumi", "MID", "Available"],
  ["Blessing Dube", "MID", "Unavailable"],
  ["Takudzwa Nhamo", "FWD", "Available"],
  ["Simbarashe Gutu", "FWD", "Available"],
];
const archivedLineupPlayers = [
  { number: 1, name: "Ncube" },
  { number: 2, name: "Dube" },
  { number: 4, name: "Sibanda" },
  { number: 5, name: "Moyo" },
  { number: 6, name: "Chirwa" },
  { number: 7, name: "Gumbo" },
  { number: 8, name: "Banda" },
  { number: 10, name: "Mutasa" },
  { number: 9, name: "Chidzonga" },
  { number: 11, name: "Zulu" },
  { number: 17, name: "Ndlovu" },
];
const archivedBenchPlayers = [
  { number: 14, name: "Mafu" },
  { number: 15, name: "Tapfuma" },
  { number: 16, name: "Musona" },
  { number: 19, name: "Chikafu" },
  { number: 21, name: "Gwaze" },
];
const formationLayouts = {
  "4-3-3": [
    [50, 89],
    [16, 70],
    [38, 74],
    [62, 74],
    [84, 70],
    [24, 50],
    [50, 54],
    [76, 50],
    [20, 25],
    [50, 20],
    [80, 25],
  ],
  "4-4-2": [
    [50, 89],
    [16, 70],
    [38, 74],
    [62, 74],
    [84, 70],
    [16, 48],
    [38, 51],
    [62, 51],
    [84, 48],
    [35, 23],
    [65, 23],
  ],
  "3-5-2": [
    [50, 89],
    [25, 72],
    [50, 75],
    [75, 72],
    [12, 48],
    [32, 53],
    [50, 48],
    [68, 53],
    [88, 48],
    [35, 22],
    [65, 22],
  ],
  "5-4-1": [
    [50, 89],
    [10, 69],
    [30, 74],
    [50, 76],
    [70, 74],
    [90, 69],
    [17, 47],
    [39, 52],
    [61, 52],
    [83, 47],
    [50, 20],
  ],
};
const generatedBadgeColors = [
  "#2D0A45",
  "#6C2BEA",
  "#173B2A",
  "#B64A23",
  "#184B76",
  "#8C283B",
  "#335A3F",
  "#6E4D1F",
  "#21364C",
  "#4B286D",
  "#0F5A63",
  "#7A331E",
  "#28345E",
  "#455A22",
  "#5B2148",
  "#31506B",
  "#754F13",
  "#224F46",
  "#592D2D",
  "#3C3C63",
  ...Array.from({ length: 72 }, (_, index) => `hsl(${index * 5}, 72%, 38%)`),
];

const polarPoint = (center, radius, angle) => {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: center + radius * Math.cos(radians),
    y: center + radius * Math.sin(radians),
  };
};

const colourWheelSegment = (
  center,
  innerRadius,
  outerRadius,
  startAngle,
  endAngle,
) => {
  const outerStart = polarPoint(center, outerRadius, startAngle);
  const outerEnd = polarPoint(center, outerRadius, endAngle);
  const innerEnd = polarPoint(center, innerRadius, endAngle);
  const innerStart = polarPoint(center, innerRadius, startAngle);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 0 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 0 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
};
const secondaryPositionsByPrimary = {
  Goalkeeper: ["Sweeper keeper"],
  Defender: ["Centre back", "Left back", "Right back", "Wing back"],
  Midfielder: [
    "Defensive midfield",
    "Central midfield",
    "Attacking midfield",
    "Left midfield",
    "Right midfield",
  ],
  Forward: ["Striker", "Second striker", "Left wing", "Right wing"],
};
const archivedTable = [
  ["Scottland", 22, 14, 7, 31, 49, "WWWWW"],
  ["Hard Rock", 22, 12, 6, 22, 42, "WWDLW"],
  ["Dynamos", 22, 10, 10, 17, 40, "DDWWW"],
  ["Ngezi Platinum", 22, 9, 10, 7, 37, "WLDWD"],
  ["CAPS United", 22, 9, 9, 6, 36, "DLDDD"],
  ["Herentals", 22, 10, 6, 4, 36, "DWLWL"],
  ["Highlanders", 22, 7, 13, 6, 34, "WDWDD"],
  ["Simba Bhora", 22, 8, 7, 2, 31, "WLLDW"],
  ["FC Platinum", 22, 5, 13, -1, 28, "LDDDD"],
  ["MWOS", 22, 6, 9, 0, 27, "DDLLL"],
  ["Chicken Inn", 22, 7, 6, -4, 27, "DWLLW"],
  ["Bulawayo Chiefs", 22, 5, 9, -6, 24, "LWDWL"],
  ["ZPC Kariba", 22, 3, 12, -6, 21, "DLDLD"],
  ["FC Hunters", 22, 3, 12, -11, 21, "DWDLD"],
  ["Agama", 22, 4, 7, -15, 19, "DLWLW"],
  ["TelOne", 22, 3, 8, -14, 17, "LDWDL"],
  ["Manica Diamonds", 22, 3, 7, -21, 16, "LDLWL"],
  ["Triangle United", 22, 2, 5, -17, 11, "DLDLL"],
];
const archivedSquads = {
  Dynamos: [
    "Tatenda Makoni · GK · 31",
    "Christopher Nettey · DEF · 23",
    "Salbe Ben Daouda · DEF · 14",
    "Cullen English-Brown · DEF · -",
    "Shadreck Nyahwa · MID · 32",
    "Nathan Mutasa · MID · 66",
    "Leeroy Mavunga · MID · 10",
    "Jairos Kasondo · FWD · 9",
    "Keith Seweje · FWD · 30",
  ],
  Scottland: [
    "Prince Tafiremutsa · GK · 70",
    "Peter Muduhwa · DEF · 18",
    "Godknows Murwira · DEF · 21",
    "Walter Musona · FWD · 10",
    "Khama Billiat · FWD · 11",
    "Knowledge Musona · FWD · 17",
  ],
};
const playerImages = {
  "Cullen English-Brown": require("./assets/dynamos-cullen.jpg"),
  "Salbe Ben Daouda": require("./assets/dynamos-salbe.jpg"),
  "Nathan Mutasa": require("./assets/dynamos-mutasa.jpg"),
};
const roleNames = {
  GK: "Goalkeeper",
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
};
const parseSquadPlayer = (entry) => {
  const [name, role = "Player", number = "-"] = String(entry || "")
    .split("·")
    .map((value) => value.trim());
  return {
    name: name || "Unnamed player",
    role,
    position: roleNames[role] || role,
    number,
  };
};
const archivedFantasyPlayers = [
  ["Tafiremutsa", "Scottland", "GK", 6],
  ["Nettey", "Dynamos", "DEF", 5],
  ["Muduhwa", "Highlanders", "DEF", 4],
  ["Murwira", "Scottland", "DEF", 7],
  ["Chaziya", "Simba Bhora", "DEF", 3],
  ["Billiat", "Scottland", "MID", 12],
  ["Nyahwa", "Dynamos", "MID", 6],
  ["Madhanhanga", "Ngezi Platinum", "MID", 5],
  ["Wadi", "CAPS United", "MID", 8],
  ["Navaya", "Hard Rock", "FWD", 14],
  ["Agyemang", "Dynamos", "FWD", 11],
];
const signingNews = [];
const fixtures = [];
const communityTeams = [];
const communityFixtures = [];
const communityPlayers = [];
const lineupPlayers = [];
const benchPlayers = [];
const emptyFormationSlots = Array.from({ length: 11 }, (_, index) => ({
  number: index + 1,
  name: "",
  empty: true,
}));
const emptyBenchSlots = Array.from({ length: 5 }, (_, index) => ({
  number: index + 12,
  name: "",
  empty: true,
}));
const table = [];
const squads = {};
const fantasyPlayers = [];
const scorerRecords = [];
const normalizeScorerTeam = (name) => {
  const aliases = {
    "Hardrock FC": "Hard Rock",
    "Dynamos FC": "Dynamos",
    "Scottland FC": "Scottland",
    "Herentals College FC": "Herentals",
    "Simba Bhora FC": "Simba Bhora",
    "Caps United FC": "CAPS United",
    "Highlanders FC": "Highlanders",
    "Bulawayo Chiefs FC": "Bulawayo Chiefs",
    "Ngezi Platinum Stars": "Ngezi Platinum",
    "FC Hunters": "FC Hunters",
    "FC Platinum": "FC Platinum",
    "Chicken Inn FC": "Chicken Inn",
    "MWOS FC": "MWOS",
    "Triangle United FC": "Triangle United",
    "ZPC Kariba FC": "ZPC Kariba",
    "Manica Diamonds FC": "Manica Diamonds",
    "TelOne FC": "TelOne",
    "Agama FC": "Agama",
  };
  const safeName = String(name || "Unknown team");
  return aliases[safeName] || safeName.replace(/ FC\s*$/, "");
};
const displayName = (value, fallback = "Player") =>
  String(value || fallback).trim() || fallback;
const titleLabel = (value) =>
  String(value || "")
    .split(/\s+/)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
const firstName = (value) => displayName(value).split(/\s+/)[0];
const lastName = (value) => {
  const safe = displayName(value);
  return safe.split(/\s+/).slice(1).join(" ") || safe;
};
const initials = (n) =>
  displayName(n, "?")
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const localDateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const validClockTime = (value) => {
  const match = String(value || "").match(/^(\d{2}):(\d{2})$/);
  return Boolean(
    match &&
    Number(match[1]) >= 0 &&
    Number(match[1]) <= 23 &&
    Number(match[2]) >= 0 &&
    Number(match[2]) <= 59,
  );
};

const clockInput = (value) => {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 4);
  return digits.length <= 2
    ? digits
    : `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

const ageFromDate = (value) => {
  if (!value) return "";
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const birthdayPassed =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() &&
      today.getDate() >= birth.getDate());
  if (!birthdayPassed) age -= 1;
  return age >= 0 ? `${age} years` : "";
};

const availabilityProblem = (post, matches = [], teamId = "") => {
  if (!post.date) return "Choose an availability date.";
  if (!validClockTime(post.time)) return "Enter a valid time in HH:MM format.";
  const today = localDateKey();
  if (post.date === today) {
    const kickoff = new Date(`${post.date}T${post.time}:00`);
    if (kickoff.getTime() <= Date.now())
      return "Today’s availability must start after the current time.";
  }
  const conflict = matches.some(
    (match) =>
      ["confirmed", "result_pending", "result_disputed"].includes(
        match.status,
      ) &&
      match.participantTeamIds?.includes(teamId) &&
      match.matchDate === post.date &&
      match.kickoff === post.time,
  );
  return conflict
    ? "Your team already has a confirmed match at this date and time."
    : "";
};

const TEAM_REGION_TREE = {
  Zimbabwe: {
    Harare: ["Harare", "Chitungwiza", "Epworth"],
    Bulawayo: ["Bulawayo"],
    Manicaland: ["Mutare", "Rusape", "Chipinge", "Nyanga"],
    "Mashonaland Central": ["Bindura", "Shamva", "Mazowe"],
    "Mashonaland East": ["Marondera", "Murehwa", "Mutoko"],
    "Mashonaland West": ["Chinhoyi", "Kadoma", "Kariba", "Chegutu"],
    Masvingo: ["Masvingo", "Chiredzi", "Triangle"],
    "Matabeleland North": ["Hwange", "Victoria Falls", "Lupane"],
    "Matabeleland South": ["Gwanda", "Beitbridge", "Plumtree"],
    Midlands: ["Gweru", "Kwekwe", "Zvishavane", "Shurugwi"],
  },
  Botswana: {
    Central: ["Serowe", "Palapye", "Francistown"],
    Gaborone: ["Gaborone"],
    Kweneng: ["Molepolole"],
    "North East": ["Masunga"],
    "South East": ["Ramotswa"],
  },
  Mozambique: {
    "Maputo City": ["Maputo"],
    "Maputo Province": ["Matola", "Boane"],
    Manica: ["Chimoio"],
    Sofala: ["Beira"],
    Tete: ["Tete"],
  },
  "South Africa": {
    Gauteng: ["Johannesburg", "Pretoria", "Soweto"],
    Limpopo: ["Polokwane", "Musina"],
    Mpumalanga: ["Mbombela", "Emalahleni"],
    "North West": ["Rustenburg", "Mahikeng"],
    "Western Cape": ["Cape Town", "George"],
    "KwaZulu-Natal": ["Durban", "Pietermaritzburg"],
  },
  Zambia: {
    Lusaka: ["Lusaka", "Kafue"],
    Copperbelt: ["Ndola", "Kitwe", "Chingola"],
    Central: ["Kabwe"],
    Eastern: ["Chipata"],
    Southern: ["Livingstone", "Choma"],
  },
};

const teamLocationLabel = (location = {}) =>
  [location.suburb, location.city, location.province, location.country]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(", ");

const savedTeamLocation = (team = {}) => ({
  country: team.location?.country || "Zimbabwe",
  province: team.location?.province || "",
  city: team.location?.city || "",
  suburb: team.location?.suburb || (!team.location ? team.area || "" : ""),
});

const locationZone = (area = "") => {
  const value = String(area).toLowerCase();
  const zones = {
    harare: [
      "harare",
      "avondale",
      "mbarе",
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
  const match = Object.entries(zones).find(([, names]) =>
    names.some((name) => value.includes(name)),
  );
  if (match) return match[0];
  return (
    value
      .split(/[,/|-]+/)
      .map((part) => part.trim())
      .find(Boolean) || ""
  );
};

const prioritizeByLocation = (items, area = "") => {
  const localZone = locationZone(area);
  if (!localZone) return items;
  const localityScore = (item) => {
    const candidateZone = locationZone(
      `${item.area || ""}, ${item.ground?.name || ""}`,
    );
    return candidateZone === localZone ? 1 : 0;
  };
  return items.filter(localityScore).sort((first, second) => {
    const difference = localityScore(second) - localityScore(first);
    if (difference) return difference;
    return (first.name || "").localeCompare(second.name || "");
  });
};

const statsPeriods = ["All time", "This year", "This month", "This week"];

const isDateInStatsPeriod = (value, period, now = new Date()) => {
  if (period === "All time") return true;
  const date = new Date(`${String(value || "").slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  if (period === "This year") return date.getFullYear() === now.getFullYear();
  if (period === "This month")
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  const start = new Date(now);
  const day = (start.getDay() + 6) % 7;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - day);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return date >= start && date < end;
};

const emptyTeamStats = () => ({
  matches: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  points: 0,
  rankingScore: 0,
  yellowCards: 0,
  redCards: 0,
});

const teamStatsForPeriod = (team, matches = [], period = "All time") => {
  if (period === "All time")
    return { ...emptyTeamStats(), ...(team?.stats || {}) };
  return matches
    .filter(
      (match) =>
        match.status === "completed" &&
        match.result &&
        match.participantTeamIds?.includes(team?.id) &&
        isDateInStatsPeriod(
          match.matchDate || match.completedAt?.toDate?.()?.toISOString(),
          period,
        ),
    )
    .reduce((stats, match) => {
      const home = match.homeTeamId === team.id;
      const goalsFor = Number(
        home ? match.result.homeScore || 0 : match.result.awayScore || 0,
      );
      const goalsAgainst = Number(
        home ? match.result.awayScore || 0 : match.result.homeScore || 0,
      );
      const draw = goalsFor === goalsAgainst;
      const win = goalsFor > goalsAgainst;
      const teamEvents = (match.result.events || []).filter(
        (event) =>
          event.teamId === team.id ||
          (!event.teamId && match.resultSubmittedByTeamId === team.id),
      );
      stats.matches += 1;
      stats.wins += win ? 1 : 0;
      stats.draws += draw ? 1 : 0;
      stats.losses += !win && !draw ? 1 : 0;
      stats.goalsFor += goalsFor;
      stats.goalsAgainst += goalsAgainst;
      stats.points += draw ? 1 : win ? 3 : 0;
      stats.rankingScore +=
        (draw ? 1 : win ? 3 : 0) *
        (match.competitionId || match.matchType === "league" ? 2 : 1);
      stats.yellowCards += teamEvents.filter((event) =>
        ["yellow", "yellow_card", "Yellow card"].includes(event.type),
      ).length;
      stats.redCards += teamEvents.filter((event) =>
        ["red", "red_card", "Red card"].includes(event.type),
      ).length;
      return stats;
    }, emptyTeamStats());
};

const teamHonours = (team, leagues = []) => {
  const participated = leagues.filter((league) =>
    league.teamIds?.includes(team?.id),
  );
  const won = participated.filter(
    (league) =>
      [league.winnerTeamId, league.championTeamId].includes(team?.id) ||
      league.winner?.teamId === team?.id,
  );
  const awards = participated.flatMap((league) =>
    (league.awardRecipients || [])
      .filter((award) => award.teamId === team?.id)
      .map((award) => ({
        ...award,
        competitionName: league.name,
      })),
  );
  return { participated, won, awards };
};

const matchesToGoalMilestone = (team, matches = [], target = 100) => {
  let total = 0;
  const completed = matches
    .filter(
      (match) =>
        match.status === "completed" &&
        match.result &&
        match.participantTeamIds?.includes(team?.id),
    )
    .sort((first, second) =>
      String(first.matchDate || "").localeCompare(
        String(second.matchDate || ""),
      ),
    );
  for (let index = 0; index < completed.length; index += 1) {
    const match = completed[index];
    const home = match.homeTeamId === team.id;
    total += Number(
      home ? match.result.homeScore || 0 : match.result.awayScore || 0,
    );
    if (total >= target)
      return {
        reached: true,
        matches: index + 1,
        date: match.matchDate || "",
      };
  }
  return {
    reached: false,
    goals: total,
    remaining: Math.max(0, target - total),
  };
};

const playerStatsForPeriod = (data, period = "All time") => {
  if (period === "All time")
    return {
      appearances: Number(data.appearances || 0),
      starts: Number(data.starts || 0),
      minutes: Number(data.minutes || 0),
      goals: Number(data.goals || 0),
      assists: Number(data.assists || 0),
      yellowCards: Number(data.yellowCards || 0),
      redCards: Number(data.redCards || 0),
    };
  const records = [
    ...(data.statHistory || []),
    ...(data.appearanceClaims || []),
  ];
  return records
    .filter((record) => {
      const status = String(record.status || "").toLowerCase();
      return (
        ["confirmed", "verified", "accepted", "completed"].some((value) =>
          status.includes(value),
        ) &&
        isDateInStatsPeriod(
          record.playedOn || record.matchDate || record.date,
          period,
        )
      );
    })
    .reduce(
      (stats, record) => ({
        appearances: stats.appearances + Number(record.appearances || 1),
        starts:
          stats.starts +
          Number(record.started === false ? 0 : record.starts || 1),
        minutes: stats.minutes + Number(record.minutes || 0),
        goals: stats.goals + Number(record.goals || 0),
        assists: stats.assists + Number(record.assists || 0),
        yellowCards: stats.yellowCards + Number(record.yellowCards || 0),
        redCards: stats.redCards + Number(record.redCards || 0),
      }),
      {
        appearances: 0,
        starts: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
      },
    );
};

const distanceBetweenTeams = (first, second) => {
  const firstPoint = first?.ground?.coordinate;
  const secondPoint = second?.ground?.coordinate;
  if (
    !first?.ground?.name ||
    !second?.ground?.name ||
    !Number.isFinite(firstPoint?.latitude) ||
    !Number.isFinite(firstPoint?.longitude) ||
    !Number.isFinite(secondPoint?.latitude) ||
    !Number.isFinite(secondPoint?.longitude)
  )
    return locationZone(first?.area) === locationZone(second?.area) ? 1 : null;
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeGap = radians(secondPoint.latitude - firstPoint.latitude);
  const longitudeGap = radians(secondPoint.longitude - firstPoint.longitude);
  const firstLatitude = radians(firstPoint.latitude);
  const secondLatitude = radians(secondPoint.latitude);
  const haversine =
    Math.sin(latitudeGap / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeGap / 2) ** 2;
  return Math.round(
    6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)),
  );
};

function TeamBadge({ name, onPress, size = 38 }) {
  const source = clubLogos[name];
  const badge = source ? (
    <Image
      source={source}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  ) : (
    <View style={[s.emptyBadge, { width: size, height: size }]} />
  );
  return onPress ? (
    <Pressable
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Open ${name} club page`}
    >
      {badge}
    </Pressable>
  ) : (
    badge
  );
}
function BrandHeader({
  title = "GRASSROOTS",
  notificationCount = 0,
  onNotifications,
}) {
  return (
    <View style={s.header}>
      <View style={s.friendliesMark}>
        <AppText style={s.friendliesMarkText}>F</AppText>
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={s.headerTitle}>{title}</AppText>
        <AppText style={s.headerSub}>GRASSROOTS FOOTBALL · ZIMBABWE</AppText>
      </View>
      <Ionicons name="search" size={22} />
      <Pressable
        onPress={onNotifications}
        disabled={!onNotifications}
        style={s.headerBell}
        accessibilityRole="button"
        accessibilityLabel={
          notificationCount
            ? `${notificationCount} unread notifications`
            : "Notifications"
        }
      >
        <Ionicons name="notifications-outline" size={22} color={C.ink} />
        {notificationCount ? (
          <View style={s.headerBellBadge}>
            <AppText style={s.headerBellBadgeText}>
              {notificationCount > 9 ? "9+" : notificationCount}
            </AppText>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

function NotificationInbox({ notifications = [], onClear, close }) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={s.subHeader}>
        <Pressable onPress={close} accessibilityLabel="Close notifications">
          <Ionicons name="close" size={24} color={C.ink} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <AppText style={s.headerTitle}>NOTIFICATIONS</AppText>
          <AppText style={s.headerSub}>YOUR FOOTBALL UPDATES</AppText>
        </View>
      </View>
      <View style={s.screenIntro}>
        <AppText style={s.screenTitle}>Updates</AppText>
        <AppText style={s.body}>
          Match, team and football requests that need your attention.
        </AppText>
      </View>
      <View style={s.communityListSection}>
        {notifications.map((item) => (
          <View style={s.notificationRow} key={item.id}>
            <View style={s.notificationIcon}>
              <Ionicons
                name={
                  item.type === "team_challenge"
                    ? "shield-outline"
                    : item.type === "result_confirmation"
                      ? "football-outline"
                      : "person-add-outline"
                }
                size={20}
                color={C.ink}
              />
              {!item.read ? <View style={s.notificationUnreadDot} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={s.notificationTitle}>{item.title}</AppText>
              <AppText style={s.notificationBody}>{item.body}</AppText>
            </View>
            <Pressable
              onPress={() => onClear?.(item)}
              accessibilityLabel={`Clear ${item.title || "notification"}`}
              style={s.notificationClear}
            >
              <Ionicons name="close" size={18} color={C.muted} />
            </Pressable>
          </View>
        ))}
        {!notifications.length ? (
          <View style={s.emptyState}>
            <Ionicons
              name="checkmark-circle-outline"
              size={30}
              color={C.green}
            />
            <AppText style={s.team}>You are up to date</AppText>
            <AppText style={s.body}>
              New requests and match updates will appear here.
            </AppText>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
function Label({ children }) {
  return <AppText style={s.label}>{children}</AppText>;
}
function Latest() {
  const [match, setMatch] = useState(null);
  const [club, setClub] = useState(null);
  const [liveMatches, setLiveMatches] = useState([]);
  const [feedState, setFeedState] = useState("loading");

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const records = await fetchLiveScores();
        if (active) {
          setLiveMatches(records);
          setFeedState(records.length ? "live" : "quiet");
        }
      } catch {
        if (active) setFeedState("unavailable");
      }
    };
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  if (club)
    return (
      <ClubPage
        name={club}
        close={() => setClub(null)}
        openMatch={(fixture) => {
          setClub(null);
          setMatch(fixture);
        }}
      />
    );
  if (match)
    return (
      <MatchDetail
        match={match}
        close={() => setMatch(null)}
        openClub={(name) => {
          setMatch(null);
          setClub(name);
        }}
        openMatch={setMatch}
      />
    );

  const scheduledMatches = fixtures.map((fixture, index) => ({
    id: `scheduled-${index}-${fixture[1]}-${fixture[2]}`,
    fixture,
    date: fixture[0],
    home: fixture[1],
    away: fixture[2],
    kickoff: fixture[3],
    venue: fixture[4],
    status: "UPCOMING",
    homeScore: null,
    awayScore: null,
  }));
  const matchRail = liveMatches.length ? liveMatches : scheduledMatches;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <BrandHeader title="LATEST" />
      <View style={s.hero}>
        <Image
          source={require("./assets/dynamos-match.jpg")}
          style={s.heroImage}
        />
        <View style={s.heroShade} />
        <View style={s.heroCopy}>
          <Label>FEATURED · ZIMBABWE FOOTBALL</Label>
          <AppText style={s.heroTitle}>DEMBARE{`\n`}DELIVERS.</AppText>
          <AppText style={s.heroBody}>
            Real players, real clubs and the stories shaping our league.
          </AppText>
          <Pressable
            style={s.primary}
            onPress={() =>
              Alert.alert(
                "Match report",
                "The full Dynamos match report is now open in Latest.",
              )
            }
          >
            <AppText style={s.primaryText}>Read match report</AppText>
            <Ionicons name="arrow-forward" color="white" size={16} />
          </Pressable>
        </View>
      </View>
      <View style={s.liveSection}>
        <View style={s.liveSectionHead}>
          <View style={s.liveTitleLine}>
            <View
              style={[s.liveDot, feedState === "live" && s.liveDotActive]}
            />
            <AppText style={s.liveSectionTitle}>
              {liveMatches.length ? "Live matches" : "Today’s matches"}
            </AppText>
          </View>
          {liveMatches.length ? (
            <AppText style={s.liveCount}>{liveMatches.length} LIVE</AppText>
          ) : (
            <AppText style={s.matchdayLabel}>MATCHDAY 23</AppText>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.liveRail}
        >
          {matchRail.map((record) => {
            const isLive = record.status === "LIVE";
            const hasScore =
              record.homeScore != null && record.awayScore != null;
            return (
              <Pressable
                key={record.id}
                style={({ pressed }) => [
                  s.liveMatchCard,
                  isLive && s.liveMatchCardActive,
                  pressed && s.liveMatchCardPressed,
                ]}
                onPress={() =>
                  setMatch(record.fixture || liveRecordToFixture(record))
                }
                accessibilityRole="button"
                accessibilityLabel={`Open match ${record.home} against ${record.away}`}
              >
                <View style={s.liveMatchTop}>
                  <View style={s.liveStatusLine}>
                    {isLive ? <View style={s.livePulse} /> : null}
                    <AppText
                      style={[s.liveMinute, !isLive && s.upcomingStatus]}
                    >
                      {isLive
                        ? record.minute
                          ? `${record.minute}’ LIVE`
                          : "LIVE"
                        : record.date}
                    </AppText>
                  </View>
                  <AppText style={s.liveVenue} numberOfLines={1}>
                    {record.venue}
                  </AppText>
                </View>
                <View style={s.liveMatchup}>
                  <View style={s.liveClubSide}>
                    <TeamBadge name={record.home} size={42} />
                    <AppText style={s.liveTeamName} numberOfLines={2}>
                      {record.home}
                    </AppText>
                  </View>
                  <View
                    style={[s.liveScoreBox, isLive && s.liveScoreBoxActive]}
                  >
                    <AppText
                      style={[s.liveScore, isLive && s.liveScoreActiveText]}
                    >
                      {hasScore
                        ? `${record.homeScore} : ${record.awayScore}`
                        : record.kickoff}
                    </AppText>
                    <AppText
                      style={[s.liveScoreSub, isLive && { color: "#FFE0E1" }]}
                    >
                      {isLive ? "LIVE" : "CAT"}
                    </AppText>
                  </View>
                  <View style={s.liveClubSide}>
                    <TeamBadge name={record.away} size={42} />
                    <AppText style={s.liveTeamName} numberOfLines={2}>
                      {record.away}
                    </AppText>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <View style={s.content}>
        <AppText style={s.h2}>Latest news</AppText>
        {signingNews.map((item, i) => (
          <View style={s.signingCard} key={item.title}>
            <Image source={item.image} style={s.signingImage} />
            <View style={s.signingCopy}>
              <Label>DYNAMOS · NEW SIGNING</Label>
              <AppText style={s.rowTitle}>{item.title}</AppText>
              <AppText style={s.meta}>
                {i + 1}h ago · Official club media
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
function Fantasy() {
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <BrandHeader title="FANTASY PSL" />
      <View style={s.darkHead}>
        <Label>GAMEWEEK 27</Label>
        <AppText style={s.heroTitle}>
          Your team.{`\n`}Your bragging rights.
        </AppText>
        <View style={s.stats}>
          {[
            ["POINTS", "68"],
            ["OVERALL", "12,481"],
            ["BUDGET", "$24.5m"],
          ].map((x) => (
            <View key={x[0]}>
              <AppText style={s.meta}>{x[0]}</AppText>
              <AppText style={s.stat}>{x[1]}</AppText>
            </View>
          ))}
        </View>
      </View>
      <View style={s.pitch}>
        <View style={s.half} />
        {[
          ["Ncube", "HI"],
          ["Mapfumo", "DY"],
          ["Moyo", "FP"],
          ["Mushure", "CU"],
          ["Banda", "SC"],
          ["Chikuhwa", "SB"],
          ["Mutizwa", "NP"],
        ].map((p, i) => (
          <View
            key={p[0]}
            style={[
              s.player,
              {
                left: [168, 35, 168, 300, 45, 168, 290][i],
                top: [18, 125, 115, 125, 260, 245, 260][i],
              },
            ]}
          >
            <View style={s.shirt}>
              <AppText style={s.shirtText}>{p[1]}</AppText>
            </View>
            <AppText style={s.playerName}>{p[0]}</AppText>
          </View>
        ))}
      </View>
      <View style={s.content}>
        <Pressable
          style={s.wideButton}
          onPress={() =>
            Alert.alert(
              "Squad editor",
              "Select any player on the pitch to edit your fantasy squad.",
            )
          }
        >
          <Ionicons name="people" color="white" size={18} />
          <AppText style={s.primaryText}>Edit squad</AppText>
        </Pressable>
        <Pressable
          style={s.outlineButton}
          onPress={() =>
            Alert.alert(
              "Fantasy leagues",
              "Your leagues are listed on the Fantasy home screen.",
            )
          }
        >
          <Ionicons name="stats-chart" size={18} />
          <AppText style={s.buttonText}>View leagues</AppText>
        </Pressable>
        <AppText style={[s.meta, { textAlign: "center" }]}>
          Deadline: Sat 19 Jul, 12:00 CAT
        </AppText>
      </View>
    </ScrollView>
  );
}

function FantasyPlayerCard({ player, compact = false }) {
  return (
    <View style={[s.fantasyPlayer, compact && s.fantasyPlayerCompact]}>
      <View style={s.kitTile}>
        <Ionicons name="shirt" size={compact ? 24 : 30} color={C.red} />
      </View>
      <AppText style={s.fantasyPlayerName} numberOfLines={1}>
        {player[0]}
      </AppText>
      <AppText style={s.fantasyPoints}>{player[3]}</AppText>
    </View>
  );
}

function FantasyPitch({ close }) {
  const rows = [
    fantasyPlayers.slice(0, 1),
    fantasyPlayers.slice(1, 5),
    fantasyPlayers.slice(5, 9),
    fantasyPlayers.slice(9, 11),
  ];
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={s.subHeader}>
        <Pressable onPress={close} style={s.roundBack}>
          <Ionicons name="arrow-back" size={22} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <AppText style={s.headerTitle}>Mbare Lions</AppText>
          <AppText style={s.headerSub}>GAMEWEEK 23</AppText>
        </View>
        <Ionicons name="ellipsis-horizontal" size={22} />
      </View>
      <View style={s.fantasyScoreStrip}>
        <View>
          <AppText style={s.fantasyScore}>41</AppText>
          <AppText style={s.fantasyScoreLabel}>AVERAGE</AppText>
        </View>
        <View style={s.fantasyScoreMain}>
          <AppText style={s.fantasyScoreMainNumber}>68</AppText>
          <AppText style={s.primaryText}>TOTAL POINTS</AppText>
        </View>
        <View>
          <AppText style={s.fantasyScore}>117</AppText>
          <AppText style={s.fantasyScoreLabel}>HIGHEST</AppText>
        </View>
      </View>
      <View style={s.fantasyPitch}>
        <View style={s.pitchBox} />
        <View style={s.pitchCircle} />
        {rows.map((row, index) => (
          <View style={s.fantasyFormationRow} key={index}>
            {row.map((player) => (
              <FantasyPlayerCard key={player[0]} player={player} />
            ))}
          </View>
        ))}
      </View>
      <View style={s.fantasyBench}>
        <AppText style={s.h2}>Bench</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            ["Makarati", "Dynamos", "DEF", 2],
            ["Musona", "Scottland", "FWD", 8],
            ["Adeogun", "Highlanders", "FWD", 5],
            ["Chigwida", "CAPS United", "MID", 3],
          ].map((player) => (
            <FantasyPlayerCard compact key={player[0]} player={player} />
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

function FantasyV2() {
  const [mode, setMode] = useState("Fantasy");
  const [screen, setScreen] = useState("home");
  const [panel, setPanel] = useState(null);
  if (screen === "pitch")
    return <FantasyPitch close={() => setScreen("home")} />;
  if (panel) {
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.subHeader}>
          <Pressable onPress={() => setPanel(null)} style={s.roundBack}>
            <Ionicons name="arrow-back" size={22} />
          </Pressable>
          <AppText style={[s.headerTitle, { flex: 1, marginLeft: 14 }]}>
            {panel.toUpperCase()}
          </AppText>
        </View>
        <View style={s.content}>
          <View style={s.fantasyInfoHero}>
            <Ionicons name="trophy" size={34} color="white" />
            <AppText style={s.fantasyInfoTitle}>{panel}</AppText>
            <AppText style={s.fantasyInfoCopy}>
              The full {panel.toLowerCase()} workspace is ready for live data
              and account services.
            </AppText>
          </View>
          {[
            "Overview",
            "Gameweek 23",
            "My selections",
            "Rules and scoring",
          ].map((item) => (
            <Pressable
              style={s.menuRow}
              key={item}
              onPress={() =>
                Alert.alert(item, `Opened ${item.toLowerCase()} for ${panel}.`)
              }
            >
              <AppText style={s.menuText}>{item}</AppText>
              <Ionicons name="chevron-forward" color={C.muted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    );
  }
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={s.fantasyHeader}>
        <View style={s.fantasyModeSwitch}>
          {["Fantasy", "Challenge", "Draft"].map((item) => (
            <Pressable
              key={item}
              onPress={() => setMode(item)}
              style={[
                s.fantasyModeButton,
                mode === item && s.fantasyModeActive,
              ]}
            >
              <AppText
                style={[s.fantasyModeText, mode === item && { color: C.ink }]}
              >
                {item}
              </AppText>
            </Pressable>
          ))}
        </View>
        {mode === "Fantasy" ? (
          <View style={s.fantasyHeroCopy}>
            <AppText style={s.fantasyHeroTitle}>Fantasy PSL</AppText>
            <AppText style={s.fantasyHeroBody}>
              Build your Zimbabwe XI. Score every matchweek.
            </AppText>
            <View style={s.managerLine}>
              <View style={s.managerBadge}>
                <AppText style={s.primaryText}>TN</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={s.fantasyTeamName}>Mbare Lions</AppText>
                <AppText style={s.fantasyHeroBody}>
                  Takudzwa Nhamo · Zimbabwe
                </AppText>
              </View>
              <Ionicons name="arrow-forward" color="white" size={22} />
            </View>
            <View style={s.fantasyMetrics}>
              <View>
                <AppText style={s.fantasyMetricNumber}>41</AppText>
                <AppText style={s.fantasyHeroBody}>Average</AppText>
              </View>
              <View>
                <AppText style={s.fantasyMetricNumber}>68</AppText>
                <AppText style={s.fantasyHeroBody}>Points</AppText>
              </View>
              <View>
                <AppText style={s.fantasyMetricNumber}>117</AppText>
                <AppText style={s.fantasyHeroBody}>Highest</AppText>
              </View>
            </View>
            <Pressable
              onPress={() => setScreen("pitch")}
              style={s.fantasyManage}
            >
              <Ionicons name="football" color={C.red} />
              <AppText style={s.buttonText}>View my team</AppText>
              <Ionicons name="chevron-forward" color={C.red} />
            </Pressable>
          </View>
        ) : (
          <View style={s.fantasyHeroCopy}>
            <AppText style={s.fantasyHeroTitle}>{mode}</AppText>
            <AppText style={s.fantasyHeroBody}>
              {mode === "Challenge"
                ? "Pick a fresh team for a short competition."
                : "Build a unique squad in a private league draft."}
            </AppText>
            <Pressable onPress={() => setPanel(mode)} style={s.fantasyManage}>
              <AppText style={s.buttonText}>Open {mode}</AppText>
              <Ionicons name="arrow-forward" color={C.red} />
            </Pressable>
          </View>
        )}
      </View>
      <View style={s.content}>
        {[
          "Fixtures",
          "Fixture difficulty rating",
          "Player statistics",
          "Set-piece takers",
        ].map((item) => (
          <Pressable
            key={item}
            onPress={() => setPanel(item)}
            style={s.fantasyMenuRow}
          >
            <AppText style={s.menuText}>{item}</AppText>
            <Ionicons name="chevron-forward" color={C.muted} />
          </Pressable>
        ))}
        <AppText style={s.h2}>Leagues & cups</AppText>
        <View style={s.modeSwitch}>
          <Pressable
            style={[s.modeButton, s.modeActive]}
            onPress={() => setPanel("Leagues")}
          >
            <AppText style={s.buttonText}>Leagues</AppText>
          </Pressable>
          <Pressable style={s.modeButton} onPress={() => setPanel("Cups")}>
            <AppText style={s.buttonText}>Cups</AppText>
          </Pressable>
        </View>
        {[
          "Zimbabwe Overall",
          "Dynamos Supporters",
          "Harare Friends League",
        ].map((name, index) => (
          <Pressable key={name} onPress={() => setPanel(name)} style={s.league}>
            <View style={s.leagueIcon}>
              <AppText style={s.primaryText}>{index + 1}</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={s.team}>{name}</AppText>
              <AppText style={s.meta}>
                {index === 0 ? "Overall rank 12,481" : `${14 - index} managers`}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" color={C.muted} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
function Season() {
  const [tab, setTab] = useState("Matches");
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <BrandHeader title="2025 SEASON" />
      <View style={s.tabs}>
        {["Matches", "Table", "Stats"].map((t) => (
          <Pressable
            onPress={() => setTab(t)}
            key={t}
            style={[s.tab, tab === t && s.tabActive]}
          >
            <AppText style={[s.tabText, tab === t && { color: C.ink }]}>
              {t}
            </AppText>
          </Pressable>
        ))}
      </View>
      <View style={s.content}>
        {tab === "Matches" && (
          <>
            <View style={s.week}>
              <AppText style={s.weekControl}>Previous</AppText>
              <View>
                <AppText style={s.meta}>MATCHWEEK</AppText>
                <AppText style={s.weekNo}>27</AppText>
              </View>
              <AppText style={s.weekControl}>Next</AppText>
            </View>
            {fixtures.map((f) => (
              <View style={s.fixture} key={f[1]}>
                <View style={s.fixtureMeta}>
                  <AppText style={s.meta}>{f[0]}</AppText>
                  <AppText style={s.meta}>{f[4]}</AppText>
                </View>
                <View style={s.fixtureTeams}>
                  <AppText style={s.team}>{f[1]}</AppText>
                  <TeamBadge name={f[1]} />
                  <AppText style={s.time}>{f[3]}</AppText>
                  <TeamBadge name={f[2]} />
                  <AppText style={s.team}>{f[2]}</AppText>
                </View>
              </View>
            ))}
          </>
        )}
        {tab === "Table" && (
          <>
            <View style={s.tableHead}>
              <AppText style={s.pos}>POS</AppText>
              <AppText style={{ flex: 1 }}>CLUB</AppText>
              <AppText style={s.col}>P</AppText>
              <AppText style={s.col}>W</AppText>
              <AppText style={s.col}>GD</AppText>
              <AppText style={s.col}>PTS</AppText>
            </View>
            {table.map((r, i) => (
              <View style={s.tableRow} key={r[0]}>
                <AppText style={s.pos}>{i + 1}</AppText>
                <TeamBadge name={r[0]} />
                <AppText style={[s.team, { flex: 1 }]}>{r[0]}</AppText>
                <AppText style={s.col}>{r[1]}</AppText>
                <AppText style={s.col}>{r[2]}</AppText>
                <AppText style={s.col}>{r[4]}</AppText>
                <AppText style={[s.col, s.points]}>{r[5]}</AppText>
              </View>
            ))}
            <AppText style={s.dataNote}>
              Updated 18 July 2026 · reconciled from current results
            </AppText>
          </>
        )}
        {tab === "Stats" && (
          <>
            <Label>VERIFIED PLAYER RECORD</Label>
            <AppText style={s.h2}>2026 leaders</AppText>
            <View style={s.statCard}>
              <Label>GOALS</Label>
              <AppText style={s.rank}>01</AppText>
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>Knowledge Musona</AppText>
                <AppText style={s.meta}>Scottland · verified 3 Jul</AppText>
              </View>
              <AppText style={s.bigStat}>8</AppText>
            </View>
            <AppText style={s.dataNote}>
              Only independently verified totals are published. Full scorer
              records will update as match sheets are confirmed.
            </AppText>
            <Label>DYNAMOS · REGISTERED SQUAD</Label>
            {[
              "Tatenda Makoni · GK · 31",
              "Christopher Nettey · DEF · 23",
              "Shadreck Nyahwa · MID · 32",
              "Leeroy Mavunga · MID · 10",
              "Jairos Kasondo · FWD · 9",
              "Keith Seweje · FWD · 30",
            ].map((r, i) => (
              <View style={s.statCard} key={r}>
                <AppText style={s.rank}>0{i + 1}</AppText>
                <AppText style={[s.team, { flex: 1 }]}>{r}</AppText>
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}
function TableView({ onClub, initialMode = "Short" }) {
  const [mode, setMode] = useState(initialMode);
  const canvasWidth = mode === "Full" ? 690 : mode === "Form" ? 560 : 540;
  return (
    <View>
      <View style={s.modeSwitch}>
        {["Short", "Full", "Form"].map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={[s.modeButton, mode === m && s.modeActive]}
          >
            <AppText style={s.buttonText}>{m}</AppText>
          </Pressable>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={{ width: canvasWidth }}>
          <View style={s.cleanTableHead}>
            <AppText style={s.posCell}>POS</AppText>
            <AppText style={s.clubHead}>CLUB</AppText>
            <AppText style={s.numCell}>P</AppText>
            {mode !== "Form" && (
              <>
                <AppText style={s.numCell}>W</AppText>
                {mode === "Full" && (
                  <>
                    <AppText style={s.numCell}>D</AppText>
                    <AppText style={s.numCell}>L</AppText>
                  </>
                )}
                <AppText style={s.numCell}>GD</AppText>
              </>
            )}
            <AppText style={mode === "Form" ? s.formHead : s.numCell}>
              {mode === "Form" ? "FORM" : "PTS"}
            </AppText>
          </View>
          {table.map((r, i) => (
            <View style={s.cleanTableRow} key={r[0]}>
              <AppText
                style={[s.posCell, i < 3 && s.topPos, i > 14 && s.dropPos]}
              >
                {i + 1}
              </AppText>
              <Pressable style={s.clubCell} onPress={() => onClub?.(r[0])}>
                <TeamBadge name={r[0]} size={32} />
                <AppText style={s.clubName} numberOfLines={1}>
                  {r[0]}
                </AppText>
              </Pressable>
              <AppText style={s.numCell}>{r[1]}</AppText>
              {mode !== "Form" && (
                <>
                  <AppText style={s.numCell}>{r[2]}</AppText>
                  {mode === "Full" && (
                    <>
                      <AppText style={s.numCell}>{r[3]}</AppText>
                      <AppText style={s.numCell}>{r[1] - r[2] - r[3]}</AppText>
                    </>
                  )}
                  <AppText style={s.numCell}>
                    {r[4] > 0 ? `+${r[4]}` : r[4]}
                  </AppText>
                </>
              )}
              {mode === "Form" ? (
                <View style={s.formCell}>
                  {(r?.[6] || "-----").split("").map((x, j) => (
                    <AppText
                      key={j}
                      style={[
                        s.formDot,
                        x === "W" ? s.formW : x === "D" ? s.formD : s.formL,
                      ]}
                    >
                      {x}
                    </AppText>
                  ))}
                </View>
              ) : (
                <AppText style={[s.numCell, s.points]}>{r[5]}</AppText>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
      <AppText style={s.dataNote}>
        Updated 18 July 2026 · cross-checked with SofaScore and TNT Sports.
      </AppText>
    </View>
  );
}

function PlayerPage({ player, club, close, openMatch }) {
  const [tab, setTab] = useState("Overview");
  const [followed, setFollowed] = useState(false);
  const [notice, setNotice] = useState("");
  const scorer = scorerRecords.find(
    (record) => record.name.toLowerCase() === player.name.toLowerCase(),
  );
  const clubFixtures = fixtures.filter(
    (fixture) => fixture[1] === club || fixture[2] === club,
  );
  const nextMatch = clubFixtures[0];
  const photo = playerImages[player.name];
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={s.playerHero}>
        <Pressable onPress={close} style={s.playerBack}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </Pressable>
        <Pressable
          onPress={() => setFollowed((value) => !value)}
          style={[s.followButton, followed && s.followButtonActive]}
        >
          <AppText style={s.primaryText}>
            {followed ? "Following" : "Follow"}
          </AppText>
        </Pressable>
        {photo ? (
          <Image source={photo} style={s.playerHeroPhoto} resizeMode="cover" />
        ) : (
          <View style={s.playerSilhouette}>
            <Ionicons name="person" size={98} color="#ffffffdd" />
          </View>
        )}
        <View style={s.playerHeroCopy}>
          <AppText style={s.playerFirstName}>{firstName(player?.name)}</AppText>
          <AppText style={s.playerLastName} numberOfLines={2}>
            {lastName(player?.name)}
          </AppText>
          <View style={s.playerClubLine}>
            <TeamBadge name={club} size={26} />
            <AppText style={s.playerClubText}>
              {club} · {player.number} {player.position}
            </AppText>
          </View>
        </View>
      </View>
      <View style={s.playerActions}>
        <Pressable
          style={s.playerAction}
          onPress={() => setNotice("Club shop structure opened")}
        >
          <AppText style={s.primaryText}>Club shop</AppText>
          <Ionicons name="open-outline" color="white" />
        </Pressable>
        <Pressable
          style={s.playerAction}
          onPress={() => setNotice("Profile link copied")}
        >
          <AppText style={s.primaryText}>Share profile</AppText>
          <Ionicons name="share-social" color="white" />
        </Pressable>
      </View>
      {notice ? (
        <Pressable style={s.profileNotice} onPress={() => setNotice("")}>
          <Ionicons name="checkmark-circle" color="white" />
          <AppText style={s.primaryText}>{notice}</AppText>
        </Pressable>
      ) : null}
      <View style={s.playerTabs}>
        {["Overview", "Matches", "Stats"].map((item) => (
          <Pressable
            key={item}
            onPress={() => setTab(item)}
            style={[s.playerTab, tab === item && s.playerTabActive]}
          >
            <AppText style={[s.tabText, tab === item && { color: C.ink }]}>
              {item}
            </AppText>
          </Pressable>
        ))}
      </View>
      <View style={s.content}>
        {tab === "Overview" && (
          <>
            <View style={s.playerOverviewGrid}>
              {[
                ["Club", club],
                ["Position", player.position],
                ["Shirt number", player.number],
                ["Nationality", player.nation || "Not verified"],
                ["PSL goals", scorer?.goals ?? "Not set"],
                ["Scorer rank", scorer?.rank ?? "Not set"],
                ["Status", followed ? "Following" : "Available"],
              ].map(([label, value]) => (
                <View style={s.playerOverviewItem} key={label}>
                  <AppText style={s.meta}>{label}</AppText>
                  <AppText style={s.team} numberOfLines={2}>
                    {value}
                  </AppText>
                </View>
              ))}
            </View>
            <AppText style={s.h2}>Next match</AppText>
            {nextMatch ? (
              <Pressable
                style={s.nextMatchCard}
                onPress={() => openMatch(nextMatch)}
              >
                <View style={s.nextMatchTeams}>
                  <TeamBadge name={nextMatch[1]} size={42} />
                  <AppText style={s.team}>{nextMatch[1]}</AppText>
                  <AppText style={s.kickoffText}>{nextMatch[3]}</AppText>
                  <AppText style={s.team}>{nextMatch[2]}</AppText>
                  <TeamBadge name={nextMatch[2]} size={42} />
                </View>
                <AppText style={s.matchMeta}>
                  {nextMatch[0]} · {nextMatch[4]}
                </AppText>
              </Pressable>
            ) : (
              <View style={s.emptyState}>
                <AppText style={s.team}>
                  Next fixture awaiting confirmation
                </AppText>
              </View>
            )}
          </>
        )}
        {tab === "Matches" && (
          <>
            <AppText style={s.h2}>Club fixtures</AppText>
            {clubFixtures.map((fixture) => (
              <Pressable
                key={`${fixture[1]}-${fixture[2]}`}
                style={s.playerMatchRow}
                onPress={() => openMatch(fixture)}
              >
                <TeamBadge name={fixture[1]} size={32} />
                <AppText style={[s.team, { flex: 1 }]}>{fixture[1]}</AppText>
                <AppText style={s.time}>{fixture[3]}</AppText>
                <AppText style={[s.team, { flex: 1, textAlign: "right" }]}>
                  {fixture[2]}
                </AppText>
                <TeamBadge name={fixture[2]} size={32} />
              </Pressable>
            ))}
          </>
        )}
        {tab === "Stats" && (
          <>
            <AppText style={s.h2}>2026 league record</AppText>
            <View style={s.playerOverviewGrid}>
              {[
                ["Goals", scorer?.goals ?? "Awaiting data"],
                ["Rank", scorer?.rank ?? "Awaiting data"],
                ["Assists", "Awaiting data"],
                ["Appearances", "Awaiting data"],
              ].map(([label, value]) => (
                <View style={s.playerOverviewItem} key={label}>
                  <AppText style={s.meta}>{label}</AppText>
                  <AppText style={s.team}>{value}</AppText>
                </View>
              ))}
            </View>
            <AppText style={s.dataNote}>
              Unconfirmed figures stay hidden until a reliable match-sheet
              source is available.
            </AppText>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function ClubPage({ name, close, openMatch }) {
  const row = table.find((r) => r[0] === name);
  const players = squads[name] || [];
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [clubTool, setClubTool] = useState(null);
  const [followed, setFollowed] = useState(false);
  if (selectedPlayer)
    return (
      <PlayerPage
        player={selectedPlayer}
        club={name}
        close={() => setSelectedPlayer(null)}
        openMatch={openMatch}
      />
    );
  if (clubTool)
    return <FeaturePage tool={clubTool} close={() => setClubTool(null)} />;
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={s.subHeader}>
        <Pressable onPress={close}>
          <Ionicons name="arrow-back" size={24} />
        </Pressable>
        <AppText style={[s.headerTitle, { flex: 1, marginLeft: 15 }]}>
          {name.toUpperCase()}
        </AppText>
        <Pressable onPress={() => setFollowed((value) => !value)}>
          <Ionicons
            name={followed ? "star" : "star-outline"}
            color={followed ? C.red : C.ink}
            size={24}
          />
        </Pressable>
      </View>
      <View style={s.clubHero}>
        <TeamBadge name={name} size={86} />
        <AppText style={s.clubHeroTitle}>{name}</AppText>
        <AppText style={s.meta}>GRASSROOTS PREMIERSHIP · ZIMBABWE</AppText>
        {row && (
          <View style={s.clubNumbers}>
            <View>
              <AppText style={s.bigStat}>#{table.indexOf(row) + 1}</AppText>
              <AppText style={s.meta}>POSITION</AppText>
            </View>
            <View>
              <AppText style={s.bigStat}>{row[5]}</AppText>
              <AppText style={s.meta}>POINTS</AppText>
            </View>
            <View>
              <AppText style={s.bigStat}>{row[1]}</AppText>
              <AppText style={s.meta}>PLAYED</AppText>
            </View>
          </View>
        )}
      </View>
      <View style={s.content}>
        <Label>FIRST TEAM</Label>
        <AppText style={s.h2}>2026 squad</AppText>
        {players.length ? (
          players.map((p) => (
            <Pressable
              style={s.playerRow}
              key={p}
              onPress={() => setSelectedPlayer(parseSquadPlayer(p))}
            >
              <View style={s.playerAvatar}>
                {playerImages[parseSquadPlayer(p).name] ? (
                  <Image
                    source={playerImages[parseSquadPlayer(p).name]}
                    style={s.playerRowPhoto}
                  />
                ) : (
                  <Ionicons name="person" color={C.muted} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>{parseSquadPlayer(p).name}</AppText>
                <AppText style={s.meta}>
                  {parseSquadPlayer(p).number} · {parseSquadPlayer(p).position}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" color={C.muted} />
            </Pressable>
          ))
        ) : (
          <View style={s.emptyState}>
            <Ionicons name="shield-outline" size={30} color={C.muted} />
            <AppText style={s.team}>Squad verification in progress</AppText>
            <AppText style={s.meta}>
              We only publish players confirmed by club or PSL records.
            </AppText>
          </View>
        )}
        <AppText style={s.h2}>Club tools</AppText>
        <View style={s.featureGrid}>
          {[
            ["notifications", "Match alerts"],
            ["calendar", "Fixtures"],
            ["newspaper", "Club news"],
            ["map", "Home venue"],
          ].map((x) => (
            <Pressable
              style={s.featureTile}
              key={x[1]}
              onPress={() => setClubTool(x[1])}
            >
              <Ionicons name={x[0]} size={21} color={C.red} />
              <AppText style={s.team}>{x[1]}</AppText>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function buildTimeline(match, coverage, exactTeamNews) {
  if (coverage?.events?.length) {
    const labels = {
      goal: "Goal",
      own_goal: "Own goal",
      penalty: "Penalty scored",
      yellow_card: "Yellow card",
      red_card: "Red card",
      substitution: "Substitution",
      half_time: "Half-time",
      full_time: "Full-time",
      var: "VAR review",
    };
    return [...coverage.events].reverse().map((event, index) => {
      const type = event.type || "update";
      return {
        id: event.id || `${type}-${event.minute ?? index}-${index}`,
        time:
          event.minute != null ? `${event.minute}’` : event.time || "Not set",
        icon: type.includes("card")
          ? "card"
          : type === "substitution"
            ? "swap-horizontal"
            : type === "var"
              ? "tv-outline"
              : "football",
        title: event.title || labels[type] || "Match update",
        copy:
          event.copy ||
          [
            event.player,
            event.assist ? `Assist: ${event.assist}` : null,
            event.team,
          ]
            .filter(Boolean)
            .join(" · "),
        active: true,
      };
    });
  }
  return [
    {
      time: "T−75",
      icon: "people",
      title: "Team news",
      copy: exactTeamNews
        ? "Both reported line-ups are available."
        : "Waiting for line-ups confirmed for this fixture.",
      active: exactTeamNews,
    },
    {
      time: "T−30",
      icon: "walk",
      title: "Warm-ups",
      copy: "Venue update and late changes will appear here.",
    },
    {
      time: match[3],
      icon: "football",
      title: "Kick-off",
      copy: `${match[1]} v ${match[2]} · ${match[4]}`,
    },
  ];
}

function MatchDetail({ match, close, openClub, openMatch }) {
  const [tab, setTab] = useState("Preview");
  const [side, setSide] = useState(match[1]);
  const [squadGroup, setSquadGroup] = useState("Starting XI");
  const [reminded, setReminded] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [motmVote, setMotmVote] = useState(null);
  const coverage = match.coverage || null;
  const isFinished = coverage?.status === "FT";
  const home = table.find((r) => r[0] === match[1]);
  const away = table.find((r) => r[0] === match[2]);
  const opponent = side === match[1] ? match[2] : match[1];
  const lineup = getMatchdayLineup(side, opponent);
  const homeLineup = getMatchdayLineup(match[1], match[2]);
  const awayLineup = getMatchdayLineup(match[2], match[1]);
  const exactTeamNews = homeLineup?.exactMatch && awayLineup?.exactMatch;
  const timeline = buildTimeline(match, coverage, exactTeamNews);
  if (selectedPlayer) {
    return (
      <PlayerPage
        player={selectedPlayer}
        club={side}
        close={() => setSelectedPlayer(null)}
        openMatch={(fixture) => {
          setSelectedPlayer(null);
          openMatch(fixture);
        }}
      />
    );
  }
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={s.subHeader}>
        <Pressable onPress={close}>
          <Ionicons name="arrow-back" size={24} />
        </Pressable>
        <AppText style={[s.headerTitle, { flex: 1, marginLeft: 15 }]}>
          MATCH CENTRE
        </AppText>
        <Pressable
          style={[s.smallPill, reminded && { backgroundColor: "#dcefe3" }]}
          onPress={() => setReminded((value) => !value)}
        >
          <Ionicons
            name={reminded ? "notifications" : "notifications-outline"}
            color={reminded ? C.green : C.ink}
          />
          <AppText style={s.meta}>
            {reminded ? "Reminder on" : "Remind me"}
          </AppText>
        </Pressable>
      </View>
      <View style={s.matchHero}>
        <Pressable onPress={() => openClub(match[1])} style={s.matchSide}>
          <TeamBadge name={match[1]} size={66} />
          <AppText style={s.matchTeam}>{match[1]}</AppText>
        </Pressable>
        <View style={s.kickoff}>
          <AppText style={s.kickoffText}>
            {coverage?.homeScore != null && coverage?.awayScore != null
              ? `${coverage.homeScore} : ${coverage.awayScore}`
              : match[3]}
          </AppText>
          <AppText style={s.meta}>
            {coverage
              ? coverage.status === "LIVE"
                ? `${coverage.minute || ""}’ LIVE`
                : coverage.status
              : "CAT"}
          </AppText>
        </View>
        <Pressable onPress={() => openClub(match[2])} style={s.matchSide}>
          <TeamBadge name={match[2]} size={66} />
          <AppText style={s.matchTeam}>{match[2]}</AppText>
        </Pressable>
      </View>
      <AppText style={s.matchMeta}>
        Grassroots Premiership · Matchday 23{`\n`}
        {match[0]} · {match[4]}
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.matchTabs}
      >
        {[
          "Preview",
          "Squads",
          "Timeline",
          "Match Stats",
          "Players",
          "Vote",
          "Table",
          "Match Info",
        ].map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[s.matchTab, tab === t && s.matchTabActive]}
          >
            <AppText style={[s.tabText, tab === t && { color: C.ink }]}>
              {t}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>
      <View style={s.content}>
        {tab === "Preview" && (
          <>
            <AppText style={s.h2}>Team form</AppText>
            {[home, away].map((r, i) => (
              <Pressable
                key={i}
                style={s.formTeam}
                onPress={() => openClub(r?.[0] || match[i + 1])}
              >
                <TeamBadge name={r?.[0] || match[i + 1]} size={36} />
                <AppText style={[s.team, { flex: 1 }]}>
                  {r?.[0] || match[i + 1]}
                </AppText>
                <View style={s.formCell}>
                  {(r?.[6] || "-----").split("").map((x, j) => (
                    <AppText
                      key={j}
                      style={[
                        s.formDot,
                        x === "W" ? s.formW : x === "D" ? s.formD : s.formL,
                      ]}
                    >
                      {x}
                    </AppText>
                  ))}
                </View>
              </Pressable>
            ))}
            <View style={s.infoCard}>
              <AppText style={s.h2}>Matchday essentials</AppText>
              <AppText style={s.body}>
                Verified line-ups, score events, cards and substitutions will
                appear here.
              </AppText>
            </View>
          </>
        )}
        {tab === "Squads" && (
          <>
            <View style={s.modeSwitch}>
              {[match[1], match[2]].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => {
                    setSide(n);
                    setSquadGroup("Starting XI");
                  }}
                  style={[s.modeButton, side === n && s.modeActive]}
                >
                  <AppText style={s.buttonText}>{n}</AppText>
                </Pressable>
              ))}
            </View>
            {lineup ? (
              <>
                <View
                  style={[
                    s.lineupStatus,
                    lineup.exactMatch
                      ? s.lineupStatusConfirmed
                      : s.lineupStatusReported,
                  ]}
                >
                  <Ionicons
                    name={
                      lineup.exactMatch ? "checkmark-circle" : "radio-outline"
                    }
                    size={21}
                    color={lineup.exactMatch ? C.green : C.gold}
                  />
                  <View style={{ flex: 1 }}>
                    <AppText style={s.lineupStatusTitle}>
                      {lineup.exactMatch
                        ? "Reported for this fixture"
                        : "Latest reported line-up"}
                    </AppText>
                    <AppText style={s.lineupStatusCopy}>
                      {lineup.exactMatch
                        ? lineup.context
                        : `${lineup.context} · not yet confirmed for this fixture`}
                    </AppText>
                  </View>
                </View>
                <View style={s.lineupHeadingRow}>
                  <View style={{ flex: 1 }}>
                    <AppText style={s.h2}>{side}</AppText>
                    <AppText style={s.meta}>
                      {lineup.starting.length} starters ·{" "}
                      {lineup.substitutes.length} substitutes
                    </AppText>
                  </View>
                </View>
                <View style={s.modeSwitch}>
                  {["Starting XI", "Substitutes"].map((group) => (
                    <Pressable
                      key={group}
                      onPress={() => setSquadGroup(group)}
                      style={[
                        s.modeButton,
                        squadGroup === group && s.modeActive,
                      ]}
                    >
                      <AppText style={s.buttonText}>{group}</AppText>
                    </Pressable>
                  ))}
                </View>
                {(squadGroup === "Starting XI"
                  ? lineup.starting
                  : lineup.substitutes
                ).map((p, index) => (
                  <Pressable
                    style={({ pressed }) => [
                      s.playerRow,
                      pressed && s.playerRowPressed,
                    ]}
                    key={`${squadGroup}-${p.name}`}
                    onPress={() => setSelectedPlayer(p)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${p.name} profile`}
                  >
                    <View style={s.playerAvatar}>
                      {playerImages[p.name] ? (
                        <Image
                          source={playerImages[p.name]}
                          style={s.playerRowPhoto}
                        />
                      ) : (
                        <AppText style={s.lineupOrdinal}>
                          {String(index + 1).padStart(2, "0")}
                        </AppText>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.playerNameLine}>
                        <AppText style={s.team}>{p.name}</AppText>
                        {lineup.captain === p.name ? (
                          <View style={s.captainChip}>
                            <AppText style={s.captainChipText}>C</AppText>
                          </View>
                        ) : null}
                      </View>
                      <AppText style={s.meta}>
                        {squadGroup === "Starting XI"
                          ? "Starting XI"
                          : "Substitute"}
                        {p.number !== "–" ? ` · #${p.number}` : ""}
                      </AppText>
                    </View>
                    {p.nation ? (
                      <AppText style={s.nationFlag}>{p.nation}</AppText>
                    ) : null}
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={C.muted}
                    />
                  </Pressable>
                ))}
                {squadGroup === "Substitutes" && !lineup.substitutes.length ? (
                  <View style={s.emptyState}>
                    <AppText style={s.team}>Substitutes not supplied</AppText>
                    <AppText style={s.meta}>
                      This report only contained the starting XI.
                    </AppText>
                  </View>
                ) : null}
                {lineup.coach ? (
                  <View style={s.coachRow}>
                    <Ionicons
                      name="clipboard-outline"
                      size={20}
                      color={C.red}
                    />
                    <View>
                      <AppText style={s.meta}>HEAD COACH</AppText>
                      <AppText style={s.team}>{lineup.coach}</AppText>
                    </View>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={s.emptyState}>
                <AppText style={s.team}>No reported line-up yet</AppText>
                <AppText style={s.meta}>
                  The verified team sheet will appear here when supplied.
                </AppText>
              </View>
            )}
          </>
        )}
        {tab === "Timeline" && (
          <>
            <View style={s.timelineHeader}>
              <View style={{ flex: 1 }}>
                <AppText style={s.h2}>Match timeline</AppText>
                <AppText style={s.body}>
                  Key events will appear here in match order.
                </AppText>
              </View>
              <View style={s.liveState}>
                <View
                  style={[
                    s.liveStateDot,
                    coverage?.status === "LIVE" && { backgroundColor: C.red },
                  ]}
                />
                <AppText style={s.liveStateText}>
                  {coverage?.status || "PRE-MATCH"}
                </AppText>
              </View>
            </View>
            <View style={s.timelineRail}>
              {timeline.map((event, index) => (
                <View style={s.timelineEvent} key={event.id || event.title}>
                  <View style={s.timelineTimeWrap}>
                    <AppText style={s.timelineTime}>{event.time}</AppText>
                  </View>
                  <View
                    style={[
                      s.timelineIcon,
                      event.active && s.timelineIconActive,
                    ]}
                  >
                    <Ionicons
                      name={event.icon}
                      size={17}
                      color={event.active ? "white" : C.muted}
                    />
                  </View>
                  <View
                    style={[
                      s.timelineEventCopy,
                      index === timeline.length - 1 && {
                        borderBottomWidth: 0,
                      },
                    ]}
                  >
                    <AppText style={s.team}>{event.title}</AppText>
                    <AppText style={s.body}>{event.copy}</AppText>
                  </View>
                </View>
              ))}
            </View>
            <View style={s.infoCard}>
              <AppText style={s.team}>Planned live event types</AppText>
              <AppText style={[s.body, { marginTop: 6 }]}>
                Goals, assists, yellow and red cards, substitutions, VAR,
                half-time, full-time and corrected events.
              </AppText>
            </View>
          </>
        )}
        {tab === "Match Stats" && (
          <>
            <AppText style={s.h2}>Match statistics</AppText>
            {coverage?.stats?.length ? (
              <>
                <View style={s.matchStatTeams}>
                  <AppText style={s.team}>{match[1]}</AppText>
                  <AppText style={s.meta}>MATCH</AppText>
                  <AppText style={s.team}>{match[2]}</AppText>
                </View>
                {coverage.stats.map((stat) => (
                  <View style={s.compareRow} key={stat.label}>
                    <AppText style={s.compareValue}>{stat.home}</AppText>
                    <AppText style={s.compareLabel}>{stat.label}</AppText>
                    <AppText style={s.compareValue}>{stat.away}</AppText>
                  </View>
                ))}
              </>
            ) : (
              <View style={s.emptyState}>
                <Ionicons name="stats-chart" size={28} color={C.muted} />
                <AppText style={s.team}>Match stats begin at kickoff</AppText>
                <AppText style={s.meta}>
                  Possession, shots, corners, fouls, offsides and saves will
                  update from the verified live feed.
                </AppText>
              </View>
            )}
          </>
        )}
        {tab === "Players" && (
          <>
            <AppText style={s.h2}>Goals & discipline</AppText>
            {coverage?.events?.some((event) =>
              [
                "goal",
                "own_goal",
                "penalty",
                "yellow_card",
                "red_card",
              ].includes(event.type),
            ) ? (
              coverage.events
                .filter((event) =>
                  [
                    "goal",
                    "own_goal",
                    "penalty",
                    "yellow_card",
                    "red_card",
                  ].includes(event.type),
                )
                .map((event) => (
                  <View style={s.matchPlayerEvent} key={event.id}>
                    <View
                      style={[
                        s.matchEventIcon,
                        event.type === "red_card" && { backgroundColor: C.red },
                        event.type === "yellow_card" && {
                          backgroundColor: C.gold,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          event.type?.includes("card") ? "card" : "football"
                        }
                        size={17}
                        color={event.type?.includes("card") ? C.white : C.ink}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={s.team}>{event.player}</AppText>
                      <AppText style={s.meta}>
                        {event.team}
                        {event.assist ? ` · Assist: ${event.assist}` : ""}
                      </AppText>
                    </View>
                    <AppText style={s.eventMinute}>{event.minute}’</AppText>
                  </View>
                ))
            ) : (
              <View style={s.emptyState}>
                <Ionicons name="football-outline" size={28} color={C.muted} />
                <AppText style={s.team}>No player events yet</AppText>
                <AppText style={s.meta}>
                  Scorers, assists and cards will be linked to player profiles.
                </AppText>
              </View>
            )}
          </>
        )}
        {tab === "Vote" && (
          <>
            <AppText style={s.h2}>Man of the Match</AppText>
            {!isFinished ? (
              <View style={s.voteLocked}>
                <View style={s.voteLockIcon}>
                  <Ionicons name="lock-closed" size={22} color={C.white} />
                </View>
                <AppText style={s.team}>Voting opens at full-time</AppText>
                <AppText style={s.body}>
                  One verified account gets one vote. Voting closes 12 hours
                  after the final whistle.
                </AppText>
              </View>
            ) : (
              <>
                <AppText style={[s.body, { marginBottom: 14 }]}>
                  Choose the player who made the biggest impact.
                </AppText>
                {[
                  ...(homeLineup?.starting || []).map((player) => ({
                    ...player,
                    team: match[1],
                  })),
                  ...(awayLineup?.starting || []).map((player) => ({
                    ...player,
                    team: match[2],
                  })),
                ].map((player) => (
                  <Pressable
                    key={`${player.team}-${player.name}`}
                    style={[
                      s.votePlayer,
                      motmVote === `${player.team}-${player.name}` &&
                        s.votePlayerSelected,
                    ]}
                    onPress={() => setMotmVote(`${player.team}-${player.name}`)}
                  >
                    <TeamBadge name={player.team} size={32} />
                    <View style={{ flex: 1 }}>
                      <AppText style={s.team}>{player.name}</AppText>
                      <AppText style={s.meta}>{player.team}</AppText>
                    </View>
                    <Ionicons
                      name={
                        motmVote === `${player.team}-${player.name}`
                          ? "checkmark-circle"
                          : "ellipse-outline"
                      }
                      size={22}
                      color={
                        motmVote === `${player.team}-${player.name}`
                          ? C.green
                          : C.muted
                      }
                    />
                  </Pressable>
                ))}
                {motmVote ? (
                  <View style={s.voteConfirmation}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={C.white}
                    />
                    <AppText style={s.primaryText}>Vote recorded</AppText>
                  </View>
                ) : null}
              </>
            )}
          </>
        )}
        {tab === "Table" && <TableView onClub={openClub} />}
        {tab === "Match Info" && (
          <>
            <AppText style={s.h2}>Match details</AppText>
            <View style={s.infoCard}>
              {[
                ["Kick-off", `${match[0]} at ${match[3]} CAT`],
                ["Stadium", match[4]],
                ["Competition", "Grassroots Social Premiership"],
                ["Matchday", "23"],
              ].map((x) => (
                <View style={s.detailRow} key={x[0]}>
                  <AppText style={s.muted}>{x[0]}</AppText>
                  <AppText style={s.team}>{x[1]}</AppText>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const toolDetails = {
  "Live centre": [
    "Live score timeline",
    "Goals and cards",
    "Substitutions",
    "Match momentum",
  ],
  "Match reminders": [
    "15 minutes before",
    "Kick-off alert",
    "Half-time score",
    "Full-time result",
  ],
  "Add to calendar": [
    "Matchday 23",
    "Home fixtures",
    "Away fixtures",
    "All club fixtures",
  ],
  "Favourite club": [
    "Follow club news",
    "Pin fixtures",
    "Goal alerts",
    "Squad updates",
  ],
  "Venue map": [
    "Directions",
    "Parking",
    "Gate information",
    "Nearby transport",
  ],
  "Goal alerts": [
    "All goals",
    "Favourite club only",
    "Penalty alerts",
    "Final result",
  ],
  "Team news": ["Starting XI", "Bench", "Injuries", "Press conference"],
  Highlights: [
    "Match highlights",
    "Goals",
    "Key moments",
    "Post-match interviews",
  ],
  "Share fixture": ["Share card", "Copy fixture", "WhatsApp", "Match link"],
  "Offline matchday": [
    "Cache fixture",
    "Save squads",
    "Save table",
    "Low-data mode",
  ],
  Predictions: [
    "Pick winner",
    "Correct score",
    "First scorer",
    "Prediction league",
  ],
  "Player comparison": [
    "Choose player one",
    "Choose player two",
    "Compare season",
    "Save comparison",
  ],
  "Head-to-head": [
    "Previous meetings",
    "Recent form",
    "Home record",
    "Away record",
  ],
  "Ticket information": [
    "Ticket outlets",
    "Prices",
    "Matchday sales",
    "Stadium gates",
  ],
  "Travel planner": [
    "Start location",
    "Route options",
    "Travel time",
    "Share journey",
  ],
  "Fan polls": [
    "Player of the match",
    "Score prediction",
    "Best goal",
    "Club poll",
  ],
  "Line-up builder": [
    "Select formation",
    "Choose XI",
    "Pick captain",
    "Share line-up",
  ],
  "Injury centre": ["Unavailable", "Doubtful", "Returning", "Suspensions"],
  "Transfer tracker": [
    "Confirmed",
    "Rumours",
    "Released players",
    "Window summary",
  ],
  "Club directory": ["All clubs", "Grounds", "Squads", "Contact information"],
};
const matchdayFeatures = [
  ["radio", "Live centre"],
  ["alarm", "Match reminders"],
  ["calendar", "Add to calendar"],
  ["star", "Favourite club"],
  ["map", "Venue map"],
  ["notifications", "Goal alerts"],
  ["newspaper", "Team news"],
  ["play-circle", "Highlights"],
  ["share-social", "Share fixture"],
  ["cloud-offline", "Offline matchday"],
  ["analytics", "Predictions"],
  ["git-compare", "Player comparison"],
  ["repeat", "Head-to-head"],
  ["ticket", "Ticket information"],
  ["navigate", "Travel planner"],
  ["stats-chart", "Fan polls"],
  ["people", "Line-up builder"],
  ["medkit", "Injury centre"],
  ["swap-horizontal", "Transfer tracker"],
  ["shield", "Club directory"],
];

function FeaturePage({ tool, close }) {
  const [enabled, setEnabled] = useState([]);
  const rows = toolDetails[tool] || [
    "Overview",
    "Latest updates",
    "Saved items",
    "Settings",
  ];
  const toggle = (item) =>
    setEnabled((old) =>
      old.includes(item) ? old.filter((x) => x !== item) : [...old, item],
    );
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={s.subHeader}>
        <Pressable onPress={close} style={s.roundBack}>
          <Ionicons name="arrow-back" size={22} />
        </Pressable>
        <AppText style={[s.headerTitle, { flex: 1, marginLeft: 14 }]}>
          {tool.toUpperCase()}
        </AppText>
      </View>
      <View style={s.toolHero}>
        <Ionicons name="football" size={38} color="white" />
        <AppText style={s.toolHeroTitle}>{tool}</AppText>
        <AppText style={s.toolHeroCopy}>
          Set up now. Live services can connect to this structure without
          redesigning the screen.
        </AppText>
      </View>
      <View style={s.content}>
        {rows.map((item) => {
          const active = enabled.includes(item);
          return (
            <Pressable
              key={item}
              style={s.toolRow}
              onPress={() => toggle(item)}
            >
              <View style={[s.toolCheck, active && s.toolCheckActive]}>
                {active && <Ionicons name="checkmark" color="white" />}
              </View>
              <AppText style={[s.team, { flex: 1 }]}>{item}</AppText>
              <AppText style={s.meta}>{active ? "ON" : "OFF"}</AppText>
            </Pressable>
          );
        })}
        <Pressable
          style={[
            s.primary,
            { alignSelf: "stretch", justifyContent: "center" },
          ]}
          onPress={() => setEnabled(rows)}
        >
          <AppText style={s.primaryText}>Enable all</AppText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function ToolsHub({ close }) {
  const [tool, setTool] = useState(null);
  if (tool) return <FeaturePage tool={tool} close={() => setTool(null)} />;
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={s.subHeader}>
        <Pressable onPress={close} style={s.roundBack}>
          <Ionicons name="arrow-back" size={22} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <AppText style={s.headerTitle}>MATCHDAY TOOLS</AppText>
          <AppText style={s.headerSub}>ALL FOOTBALL UTILITIES</AppText>
        </View>
      </View>
      <View style={s.content}>
        {matchdayFeatures.map(([icon, label]) => (
          <Pressable
            key={label}
            style={s.menuRow}
            onPress={() => setTool(label)}
          >
            <Ionicons name={icon} size={21} color={C.red} />
            <AppText style={[s.menuText, { marginLeft: 12 }]}>{label}</AppText>
            <Ionicons name="chevron-forward" color={C.muted} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function ScorersPage({ close, openClub }) {
  const [selected, setSelected] = useState(null);
  if (selected) {
    const club = normalizeScorerTeam(selected.team);
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.subHeader}>
          <Pressable onPress={() => setSelected(null)} style={s.roundBack}>
            <Ionicons name="arrow-back" size={22} />
          </Pressable>
          <AppText style={[s.headerTitle, { flex: 1, marginLeft: 14 }]}>
            PLAYER
          </AppText>
        </View>
        <View style={s.scorerHero}>
          <View style={s.scorerAvatar}>
            <Ionicons name="person" size={46} color={C.red} />
          </View>
          <AppText style={s.clubHeroTitle}>{selected.name}</AppText>
          <Pressable onPress={() => openClub(club)} style={s.scorerClub}>
            <TeamBadge name={club} size={32} />
            <AppText style={s.team}>{club}</AppText>
          </Pressable>
        </View>
        <View style={s.content}>
          <View style={s.playerStatGrid}>
            <View>
              <AppText style={s.bigStat}>{selected.goals}</AppText>
              <AppText style={s.meta}>GOALS</AppText>
            </View>
            <View>
              <AppText style={s.bigStat}>{selected.rank}</AppText>
              <AppText style={s.meta}>SCORER RANK</AppText>
            </View>
            <View>
              <AppText style={s.bigStat}>22</AppText>
              <AppText style={s.meta}>MATCHDAY</AppText>
            </View>
          </View>
          <Pressable style={s.menuRow} onPress={() => setSelected(null)}>
            <AppText style={s.menuText}>View all 168 goal scorers</AppText>
            <Ionicons name="list" color={C.red} />
          </Pressable>
        </View>
      </ScrollView>
    );
  }
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={s.subHeader}>
        <Pressable onPress={close} style={s.roundBack}>
          <Ionicons name="arrow-back" size={22} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <AppText style={s.headerTitle}>GOAL SCORERS</AppText>
          <AppText style={s.headerSub}>MATCHDAY 22 · 168 SCORERS</AppText>
        </View>
      </View>
      <View style={s.content}>
        <View style={s.scorerHead}>
          <AppText style={s.scorerRank}>#</AppText>
          <AppText style={s.scorerName}>PLAYER</AppText>
          <AppText style={s.scorerGoals}>GOALS</AppText>
        </View>
        {scorerRecords.map((player, index) => {
          const club = normalizeScorerTeam(player.team);
          return (
            <Pressable
              key={`${player.name}-${index}`}
              style={s.scorerRow}
              onPress={() => setSelected(player)}
            >
              <AppText style={s.scorerRank}>{player.rank}</AppText>
              <TeamBadge name={club} size={30} />
              <View style={s.scorerName}>
                <AppText style={s.team} numberOfLines={1}>
                  {player.name}
                </AppText>
                <AppText style={s.meta} numberOfLines={1}>
                  {club}
                </AppText>
              </View>
              <AppText style={s.scorerGoals}>{player.goals}</AppText>
              <Ionicons name="chevron-forward" size={16} color={C.muted} />
            </Pressable>
          );
        })}
        <AppText style={s.dataNote}>
          Source: Zim Football Data · Matchday 22 · scorer availability applies.
        </AppText>
      </View>
    </ScrollView>
  );
}

function SeasonV2() {
  const [tab, setTab] = useState("Matches");
  const [club, setClub] = useState(null);
  const [match, setMatch] = useState(null);
  const [tool, setTool] = useState(null);
  const [statsPage, setStatsPage] = useState(null);
  if (club)
    return (
      <ClubPage
        name={club}
        close={() => setClub(null)}
        openMatch={(fixture) => {
          setClub(null);
          setMatch(fixture);
        }}
      />
    );
  if (tool) return <FeaturePage tool={tool} close={() => setTool(null)} />;
  if (statsPage === "Goals")
    return <ScorersPage close={() => setStatsPage(null)} openClub={setClub} />;
  if (match)
    return (
      <MatchDetail
        match={match}
        close={() => setMatch(null)}
        openClub={setClub}
        openMatch={setMatch}
      />
    );
  const fixtureGroups = [
    [
      "Saturday 18 July",
      fixtures.filter((fixture) => fixture[0].startsWith("SAT")),
    ],
    [
      "Sunday 19 July",
      fixtures.filter((fixture) => fixture[0].startsWith("SUN")),
    ],
  ];
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={s.seasonHead}>
        <BrandHeader title="2026 SEASON" />
        <AppText style={s.seasonTitle}>Season</AppText>
        <AppText style={s.heroBody}>Zimbabwe grassroots football</AppText>
      </View>
      <View style={s.tabs}>
        {["Matches", "Table", "Stats"].map((t) => (
          <Pressable
            onPress={() => setTab(t)}
            key={t}
            style={[s.tab, tab === t && s.tabActive]}
          >
            <AppText style={[s.tabText, tab === t && { color: C.ink }]}>
              {t}
            </AppText>
          </Pressable>
        ))}
      </View>
      <View style={s.content}>
        {tab === "Matches" && (
          <>
            <View style={s.week}>
              <AppText style={s.weekControl}>Previous</AppText>
              <View>
                <AppText style={s.meta}>MATCHWEEK</AppText>
                <AppText style={s.weekNo}>23</AppText>
              </View>
              <AppText style={s.weekControl}>Next</AppText>
            </View>
            {fixtureGroups.map(([day, dayFixtures]) => (
              <View key={day} style={s.fixtureGroup}>
                <AppText style={s.fixtureGroupTitle}>{day}</AppText>
                {dayFixtures.map((fixture) => (
                  <Pressable
                    style={s.fixtureAligned}
                    key={`${fixture[1]}-${fixture[2]}`}
                    onPress={() => setMatch(fixture)}
                  >
                    <AppText style={s.fixtureVenue}>{fixture[4]}</AppText>
                    <View style={s.fixtureGrid}>
                      <AppText style={s.fixtureHomeName} numberOfLines={1}>
                        {fixture[1]}
                      </AppText>
                      <View style={s.fixtureBadgeSlot}>
                        <TeamBadge
                          name={fixture[1]}
                          size={38}
                          onPress={() => setClub(fixture[1])}
                        />
                      </View>
                      <AppText style={s.fixtureKickoff}>{fixture[3]}</AppText>
                      <View style={s.fixtureBadgeSlot}>
                        <TeamBadge
                          name={fixture[2]}
                          size={38}
                          onPress={() => setClub(fixture[2])}
                        />
                      </View>
                      <AppText style={s.fixtureAwayName} numberOfLines={1}>
                        {fixture[2]}
                      </AppText>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={C.muted}
                      />
                    </View>
                  </Pressable>
                ))}
              </View>
            ))}
          </>
        )}
        {tab === "Table" && <TableView onClub={setClub} />}
        {tab === "Stats" && (
          <>
            <Label>VERIFIED LEAGUE STATISTICS</Label>
            <AppText style={s.h2}>2026 leaders</AppText>
            {[
              ["football", "Goals", "Washington Navaya", "12"],
              ["football-outline", "Assists", "Open assists workspace", "Open"],
              ["hand-left", "Clean sheets", "Open goalkeeper records", "Open"],
              ["flash", "League goals", "Recorded scorer total", "385"],
            ].map((x) => (
              <Pressable
                style={s.leaderCard}
                key={x[1]}
                onPress={() =>
                  x[1] === "Goals" ? setStatsPage("Goals") : setTool(x[1])
                }
              >
                <Ionicons name={x[0]} size={22} color={C.red} />
                <View style={{ flex: 1 }}>
                  <AppText style={s.meta}>{x[1].toUpperCase()}</AppText>
                  <AppText style={s.team}>{x[2]}</AppText>
                </View>
                <AppText style={s.bigStat}>{x[3]}</AppText>
                <Ionicons name="chevron-forward" size={17} color={C.muted} />
              </Pressable>
            ))}
            <AppText style={s.dataNote}>
              Squads live on club pages. Statistics contains statistics only.
            </AppText>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function CommunityFixtureRow({
  item,
  onPress,
  compact = false,
  narrow = false,
}) {
  if (narrow) {
    return (
      <Pressable
        onPress={() => onPress?.(item)}
        style={({ pressed }) => [
          s.communityFixtureNarrow,
          pressed && s.communityFixturePressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${item.home} against ${item.away}, ${item.time}`}
      >
        <View style={s.communityFixtureNarrowTop}>
          <View style={s.communityNarrowKickoff}>
            <AppText style={s.communityTime}>{item.time}</AppText>
            <AppText style={s.communityDay}>{item.day}</AppText>
          </View>
          <AppText
            style={[
              s.communityStatus,
              item.status === "Open spot" && s.communityStatusOpen,
            ]}
          >
            {item.status}
          </AppText>
        </View>
        <View style={s.communityFixtureNarrowTeams}>
          {[item.home, item.away].map((team, index) => (
            <View key={team} style={s.communityTeamLine}>
              <View
                style={[
                  s.communityMiniBadge,
                  index === 1 && s.communityMiniBadgeAway,
                ]}
              >
                <AppText style={s.communityMiniBadgeText}>
                  {initials(team)}
                </AppText>
              </View>
              <AppText style={s.communityTeamName}>{team}</AppText>
            </View>
          ))}
        </View>
        <View style={s.communityFixtureNarrowFooter}>
          <Ionicons name="location-outline" size={15} color={C.muted} />
          <AppText style={s.communityNarrowVenue} numberOfLines={1}>
            {item.venue}
          </AppText>
          <Ionicons name="chevron-forward" size={17} color={C.muted} />
        </View>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={() => onPress?.(item)}
      style={({ pressed }) => [
        s.communityFixtureRow,
        compact && s.communityFixtureRowCompact,
        pressed && s.communityFixturePressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${item.home} against ${item.away}, ${item.time}`}
    >
      <View style={s.communityTimeBlock}>
        <AppText style={s.communityTime}>{item.time}</AppText>
        <AppText style={s.communityDay}>{item.day}</AppText>
      </View>
      <View style={s.communityFixtureMain}>
        <View style={s.communityTeamLine}>
          <View style={s.communityMiniBadge}>
            <AppText style={s.communityMiniBadgeText}>
              {initials(item.home)}
            </AppText>
          </View>
          <AppText style={s.communityTeamName} numberOfLines={1}>
            {item.home}
          </AppText>
        </View>
        <View style={s.communityTeamLine}>
          <View style={[s.communityMiniBadge, s.communityMiniBadgeAway]}>
            <AppText style={s.communityMiniBadgeText}>
              {initials(item.away)}
            </AppText>
          </View>
          <AppText style={s.communityTeamName} numberOfLines={1}>
            {item.away}
          </AppText>
        </View>
        <AppText style={s.communityVenue} numberOfLines={1}>
          {item.venue}
        </AppText>
      </View>
      <View style={s.communityFixtureEnd}>
        <AppText
          style={[
            s.communityStatus,
            item.status === "Open spot" && s.communityStatusOpen,
          ]}
        >
          {item.status}
        </AppText>
        <Ionicons name="chevron-forward" size={16} color={C.muted} />
      </View>
    </Pressable>
  );
}

function CommunityMatchSheet({ match, close }) {
  return (
    <Modal
      transparent
      visible={Boolean(match)}
      animationType="slide"
      onRequestClose={close}
    >
      <View style={s.modalBack}>
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <Label>
            {match?.day} · {match?.status}
          </Label>
          <AppText style={s.h2}>Match details</AppText>
          <View style={s.matchSheetTeams}>
            <View style={s.matchSheetTeam}>
              <View style={s.matchSheetBadge}>
                <AppText style={s.matchSheetBadgeText}>
                  {initials(match?.home || "")}
                </AppText>
              </View>
              <AppText style={s.team}>{match?.home}</AppText>
            </View>
            <View style={s.matchSheetKickoff}>
              <AppText style={s.matchSheetTime}>{match?.time}</AppText>
              <AppText style={s.meta}>KICK-OFF</AppText>
            </View>
            <View style={s.matchSheetTeam}>
              <View style={[s.matchSheetBadge, { backgroundColor: C.red }]}>
                <AppText style={s.matchSheetBadgeText}>
                  {initials(match?.away || "")}
                </AppText>
              </View>
              <AppText style={s.team}>{match?.away}</AppText>
            </View>
          </View>
          <View style={s.matchSheetVenue}>
            <Ionicons name="location-outline" size={19} color={C.red} />
            <View>
              <AppText style={s.team}>{match?.venue}</AppText>
              <AppText style={s.meta}>Open venue and arrival details</AppText>
            </View>
          </View>
          <Pressable style={s.wideButton} onPress={close}>
            <Ionicons name="chatbubble-outline" color="white" />
            <AppText style={s.primaryText}>Message both captains</AppText>
          </Pressable>
          <Pressable style={s.outlineButton} onPress={close}>
            <AppText style={s.buttonText}>Close</AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function PostAvailabilityFlow({ close, team, onPublish, matches = [] }) {
  const [post, setPost] = usePersistentState(
    `friendlies-team-availability-${team?.id || "draft"}`,
    { date: "", days: [], time: "", venue: "", published: false },
  );
  const [publishing, setPublishing] = useState(false);
  const [customTime, setCustomTime] = useState(false);
  const problem = availabilityProblem(post, matches, team?.id);
  const homeBlocked = consecutiveHomeMatches(matches, team?.id) >= 3;
  useEffect(() => {
    if (homeBlocked && post.venue === "Can host") {
      setPost((current) => ({
        ...current,
        venue: "Can travel",
        published: false,
      }));
    }
  }, [homeBlocked, post.venue, setPost]);
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={s.subHeader}>
        <Pressable onPress={close}>
          <Ionicons name="arrow-back" size={23} />
        </Pressable>
        <View style={{ marginLeft: 14 }}>
          <AppText style={s.headerTitle}>POST AVAILABILITY</AppText>
          <AppText style={s.headerSub}>{team?.name || "YOUR TEAM"}</AppText>
        </View>
      </View>
      <View style={s.formIntro}>
        <AppText style={s.screenTitle}>When can your team play?</AppText>
        <AppText style={s.body}>
          Nearby teams can send a request after you publish.
        </AppText>
        <AppText style={s.formLabel}>Available date</AppText>
        <DateField
          value={post.date || ""}
          onChange={(date) =>
            setPost((current) => ({
              ...current,
              date,
              days: [
                new Date(`${date}T12:00:00`).toLocaleDateString("en-ZW", {
                  weekday: "long",
                }),
              ],
              published: false,
            }))
          }
          minimumDate={new Date()}
          accessibilityLabel="Choose availability date"
        />
        <AppText style={s.formLabel}>Preferred kickoff</AppText>
        <View style={s.optionWrap}>
          {["10:00", "15:00", "18:00", "Custom"].map((item) => (
            <Pressable
              key={item}
              onPress={() => {
                setCustomTime(item === "Custom");
                setPost((current) => ({
                  ...current,
                  time: item === "Custom" ? "" : item,
                  published: false,
                }));
              }}
              style={[
                s.formChoice,
                ((item === "Custom" && customTime) || post.time === item) &&
                  s.formChoiceActive,
              ]}
            >
              <AppText
                style={[
                  s.formChoiceText,
                  ((item === "Custom" && customTime) || post.time === item) &&
                    s.formChoiceTextActive,
                ]}
              >
                {item}
              </AppText>
            </Pressable>
          ))}
        </View>
        {customTime ? (
          <>
            <AppText style={s.formLabel}>Custom kickoff time</AppText>
            <TextInput
              value={post.time}
              onChangeText={(time) =>
                setPost((current) => ({
                  ...current,
                  time: clockInput(time),
                  published: false,
                }))
              }
              keyboardType="number-pad"
              maxLength={5}
              placeholder="14:30"
              placeholderTextColor={C.muted}
              style={s.formInput}
              accessibilityLabel="Enter custom kickoff time"
            />
          </>
        ) : null}
        <AppText style={s.formLabel}>Venue</AppText>
        <View style={s.optionWrap}>
          {["Can host", "Can travel", "Either"].map((item) => (
            <Pressable
              key={item}
              disabled={item === "Can host" && homeBlocked}
              onPress={() =>
                setPost((current) => ({
                  ...current,
                  venue: item,
                  published: false,
                }))
              }
              style={[
                s.formChoice,
                post.venue === item && s.formChoiceActive,
                item === "Can host" && homeBlocked && s.buttonDisabled,
              ]}
            >
              <AppText
                style={[
                  s.formChoiceText,
                  post.venue === item && s.formChoiceTextActive,
                ]}
              >
                {item}
              </AppText>
            </Pressable>
          ))}
        </View>
        {homeBlocked ? (
          <AppText style={s.formHelp}>
            Hosting is paused after three home matches. Your next listing must
            be travel or either.
          </AppText>
        ) : null}
        <View style={s.availabilityPreview}>
          <Ionicons name="calendar-outline" size={23} color={C.red} />
          <View style={{ flex: 1 }}>
            <AppText style={s.team}>
              {post.date ? formatStoredDate(post.date) : "Choose a date"}
            </AppText>
            <AppText style={s.meta}>
              {post.time || "Choose a time"} · {post.venue || "Choose a venue"}
            </AppText>
          </View>
        </View>
        {post.date && post.time && problem ? (
          <View style={s.profilePrivacyNote}>
            <Ionicons name="alert-circle-outline" size={20} color={C.red} />
            <AppText style={[s.body, { flex: 1 }]}>{problem}</AppText>
          </View>
        ) : null}
        <Pressable
          disabled={
            publishing ||
            !post.date ||
            !post.time ||
            !post.venue ||
            Boolean(problem)
          }
          onPress={async () => {
            setPublishing(true);
            try {
              await onPublish(post);
              setPost((current) => ({ ...current, published: true }));
              Alert.alert(
                "Availability published",
                "Other teams can now find this availability.",
              );
            } catch (error) {
              Alert.alert(
                "Couldn’t publish availability",
                error?.message || "Please check your connection and try again.",
              );
            } finally {
              setPublishing(false);
            }
          }}
          style={[
            s.saveLineupButton,
            post.published && s.saveLineupButtonSaved,
            (publishing ||
              !post.date ||
              !post.time ||
              !post.venue ||
              Boolean(problem)) &&
              s.buttonDisabled,
          ]}
        >
          <Ionicons
            name={post.published ? "checkmark-circle" : "megaphone-outline"}
            color="white"
            size={18}
          />
          <AppText style={s.saveLineupText}>
            {publishing
              ? "PUBLISHING"
              : post.published
                ? "AVAILABILITY LIVE"
                : "PUBLISH AVAILABILITY"}
          </AppText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function CommunityHome({
  onFindFriendly,
  onSeeAll,
  team,
  onOpenTeam,
  onPublishAvailability,
  matches = [],
  notifications = [],
  onClearNotification,
}) {
  const [match, setMatch] = useState(null);
  const [posting, setPosting] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { width } = useWindowDimensions();
  const narrowMatches = width < 360;
  const hasTeam = Boolean(team);
  if (posting)
    return (
      <PostAvailabilityFlow
        close={() => setPosting(false)}
        team={team}
        onPublish={onPublishAvailability}
        matches={matches}
      />
    );
  if (showNotifications)
    return (
      <NotificationInbox
        notifications={notifications}
        onClear={onClearNotification}
        close={() => setShowNotifications(false)}
      />
    );
  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <BrandHeader
          title="HOME"
          notificationCount={notifications.filter((item) => !item.read).length}
          onNotifications={() => setShowNotifications(true)}
        />
        <View style={s.communityWelcome}>
          <View style={s.communityWelcomeTop}>
            <View style={s.homeTeamBadge}>
              {hasTeam ? (
                <AppText style={s.homeTeamBadgeText}>
                  {initials(team.name)}
                </AppText>
              ) : (
                <Ionicons name="add" color="white" size={22} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={s.homeGreeting}>
                {hasTeam ? team.name : "Welcome to Grassroots"}
              </AppText>
              <AppText style={s.homeTeamMeta}>
                {hasTeam ? team.area : "Your football space is ready"}
              </AppText>
            </View>
          </View>
          <AppText style={s.communityWelcomeTitle}>
            {hasTeam ? "Build the next match." : "Start with your first team."}
          </AppText>
          <AppText style={s.communityWelcomeBody}>
            {hasTeam
              ? "Team activity stays in the Team space. Matches are shared across every role."
              : "Add your players, share availability and arrange a match when you are ready."}
          </AppText>
          <View style={s.communityHomeActions}>
            {hasTeam ? (
              <>
                <Pressable
                  style={s.communityPrimaryAction}
                  onPress={onFindFriendly}
                >
                  <Ionicons name="search" color={C.redDark} size={18} />
                  <AppText style={s.communityPrimaryActionText}>
                    Find a team
                  </AppText>
                </Pressable>
                <Pressable
                  style={s.communitySecondaryAction}
                  onPress={() => setPosting(true)}
                >
                  <Ionicons name="add" color="white" size={18} />
                  <AppText style={s.communitySecondaryActionText}>
                    Post availability
                  </AppText>
                </Pressable>
              </>
            ) : (
              <Pressable
                style={s.communitySecondaryAction}
                onPress={onOpenTeam}
              >
                <Ionicons name="add" color="white" size={18} />
                <AppText style={s.communitySecondaryActionText}>
                  Create your team
                </AppText>
              </Pressable>
            )}
          </View>
        </View>
        <View style={s.communityHomeSection}>
          <View style={s.communitySectionHead}>
            <View>
              <AppText style={s.communitySectionTitle}>Today’s matches</AppText>
              <AppText style={s.communitySectionSub}>
                Community football near you
              </AppText>
            </View>
            <Pressable onPress={onSeeAll}>
              <AppText style={s.communitySeeAll}>See all</AppText>
            </Pressable>
          </View>
          <View style={s.communityMatchCard}>
            {communityFixtures.length ? (
              communityFixtures
                .slice(0, 3)
                .map((item) => (
                  <CommunityFixtureRow
                    key={item.id}
                    item={item}
                    compact
                    narrow={narrowMatches}
                    onPress={setMatch}
                  />
                ))
            ) : (
              <View style={s.emptyState}>
                <Ionicons name="calendar-outline" size={30} color={C.muted} />
                <AppText style={s.team}>No matches yet</AppText>
                <AppText style={s.body}>
                  Confirmed fixtures will appear here.
                </AppText>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      <CommunityMatchSheet match={match} close={() => setMatch(null)} />
    </>
  );
}

function TeamHub({
  role,
  currentUid,
  team,
  onCreate,
  teams = [],
  onRequestTeam,
  conversations = [],
  publicProfiles = [],
}) {
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [search, setSearch] = useState("");
  const [requestedTeams, setRequestedTeams] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedTeamChat, setSelectedTeamChat] = useState(null);
  const [teamMessages, setTeamMessages] = useState([]);
  const [teamDraft, setTeamDraft] = useState("");
  const [sendingTeamMessage, setSendingTeamMessage] = useState(false);
  useEffect(() => {
    if (!selectedTeamChat?.id) return undefined;
    return subscribeConversationMessages(
      selectedTeamChat.id,
      setTeamMessages,
      () => setTeamMessages([]),
    );
  }, [selectedTeamChat]);
  const create = async () => {
    if (!name.trim() || !area.trim()) {
      setError("Add the team name and home area.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onCreate({ name, area });
      setName("");
      setArea("");
    } catch {
      setError("The team could not be created. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const matchingTeams = prioritizeByLocation(
    teams.filter((item) => {
      const needle = search.trim().toLowerCase();
      if (!needle) return true;
      return `${item.name || ""} ${item.area || ""}`
        .toLowerCase()
        .includes(needle);
    }),
    team?.area,
  );
  const playerCount = publicProfiles.filter(
    (profile) =>
      profile.role === "Player" && team?.memberIds?.includes(profile.ownerId),
  ).length;
  const recordedPlayerCount = Math.max(
    playerCount,
    Number(team?.stats?.players || 0),
  );
  const staffCount = new Set([
    ...(team?.adminIds || []),
    ...(team?.coachIds || []),
    ...(team?.captainIds || []),
  ]).size;
  const teamConversation = conversations.find(
    (conversation) =>
      conversation.scope === "team" &&
      conversation.teamId === team?.id &&
      conversation.archived !== true,
  );
  const teamRows = [
    {
      icon: "people-outline",
      title: "Members",
      copy: "Players and staff connected to this team",
      value: `${recordedPlayerCount + staffCount}`,
    },
    {
      icon: "chatbubbles-outline",
      title: "Team chat",
      copy: "Messages shared only with team members",
      value: teamConversation ? "OPEN" : "SETTING UP",
    },
    {
      icon: "wallet-outline",
      title: "Team payments",
      copy: "Dues and team expenses",
      value: `$${Number(team?.wallet?.balance || 0).toFixed(2)}`,
    },
    {
      icon: "shirt-outline",
      title: "Squad",
      copy: "Team selection and formation",
      value: recordedPlayerCount
        ? `${recordedPlayerCount} PLAYER${recordedPlayerCount === 1 ? "" : "S"}`
        : "NO PLAYERS",
    },
  ];
  const teamStats = team?.stats || {};
  const goalDifference =
    Number(teamStats.goalsFor || 0) - Number(teamStats.goalsAgainst || 0);
  const pointsPerGame = Number(teamStats.matches || 0)
    ? (Number(teamStats.points || 0) / Number(teamStats.matches)).toFixed(2)
    : "0.00";
  if (selectedTeamChat)
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.subHeader}>
          <Pressable
            onPress={() => setSelectedTeamChat(null)}
            accessibilityLabel="Back to team"
          >
            <Ionicons name="arrow-back" size={23} color={C.ink} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <AppText style={s.headerTitle}>
              {selectedTeamChat.title || `${team?.name || "Team"} chat`}
            </AppText>
            <AppText style={s.headerSub}>PERMANENT TEAM ROOM</AppText>
          </View>
          <Ionicons name="lock-closed" size={17} color={C.green} />
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.conversationMessages}
        >
          {!teamMessages.length ? (
            <View style={s.chatEmpty}>
              <Ionicons name="chatbubble-outline" size={27} color={C.muted} />
              <AppText style={s.team}>Start the team conversation</AppText>
              <AppText style={s.body}>
                Every current team member can read and reply here.
              </AppText>
            </View>
          ) : null}
          {teamMessages.map((message) => (
            <View
              key={message.id}
              style={[
                s.chatBubble,
                message.senderId === currentUid && s.chatBubbleOwn,
              ]}
            >
              <AppText
                style={[
                  s.body,
                  message.senderId === currentUid && {
                    color: C.white,
                  },
                ]}
              >
                {message.text}
              </AppText>
            </View>
          ))}
        </ScrollView>
        <View style={s.chatComposer}>
          <TextInput
            value={teamDraft}
            onChangeText={setTeamDraft}
            placeholder="Message the team"
            placeholderTextColor={C.muted}
            style={s.chatInput}
            editable={!sendingTeamMessage}
          />
          <Pressable
            disabled={!teamDraft.trim() || sendingTeamMessage}
            style={[
              s.chatSend,
              (!teamDraft.trim() || sendingTeamMessage) && s.buttonDisabled,
            ]}
            onPress={async () => {
              const text = teamDraft.trim();
              if (!text || sendingTeamMessage) return;
              setSendingTeamMessage(true);
              try {
                await sendConversationMessage(
                  selectedTeamChat.id,
                  currentUid,
                  text,
                );
                setTeamDraft("");
              } catch (error) {
                Alert.alert(
                  "Message not sent",
                  error?.message || "Please try again.",
                );
              } finally {
                setSendingTeamMessage(false);
              }
            }}
          >
            {sendingTeamMessage ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Ionicons name="send" color={C.white} size={17} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
      <BrandHeader title="TEAM" />
      <View style={s.screenIntro}>
        <AppText style={s.screenTitle}>
          {team ? team.name : "Your team space"}
        </AppText>
        <AppText style={s.body}>
          Team members, chat, payments and squad decisions belong here.
        </AppText>
      </View>
      <View style={s.communityListSection}>
        {!team ? (
          role === "Coach" ? (
            <View>
              <AppText style={s.formLabel}>Team name</AppText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter the team name"
                placeholderTextColor="#756D7D"
                style={s.formInput}
              />
              <AppText style={s.formLabel}>Home area</AppText>
              <TextInput
                value={area}
                onChangeText={setArea}
                placeholder="Town, suburb or district"
                placeholderTextColor="#756D7D"
                style={s.formInput}
              />
              {error ? (
                <AppText style={s.authErrorText}>{error}</AppText>
              ) : null}
              <Pressable
                onPress={create}
                disabled={busy}
                style={[s.saveLineupButton, busy && s.buttonDisabled]}
              >
                {busy ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <AppText style={s.saveLineupText}>CREATE TEAM</AppText>
                )}
              </Pressable>
            </View>
          ) : (
            <>
              <View style={s.emptyState}>
                <Ionicons name="search-outline" size={30} color={C.muted} />
                <AppText style={s.team}>Find your team</AppText>
                <AppText style={s.body}>
                  Search teams already using Grassroots and request to join.
                </AppText>
              </View>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search team name or area"
                placeholderTextColor={C.muted}
                style={s.formInput}
              />
              {matchingTeams.map((item) => {
                const requested = requestedTeams.includes(item.id);
                return (
                  <View key={item.id} style={s.teamDiscoveryRow}>
                    <CrestPreview
                      shape={item.crest?.shape || 0}
                      color={item.crest?.color || C.red}
                      label={item.crest?.label || initials(item.name)}
                      small
                    />
                    <View style={{ flex: 1 }}>
                      <AppText style={s.team}>{item.name}</AppText>
                      <AppText style={s.meta}>
                        {item.area || "Area not added"}
                      </AppText>
                    </View>
                    <Pressable
                      disabled={requested}
                      onPress={async () => {
                        try {
                          await onRequestTeam(item);
                          setRequestedTeams((current) => [...current, item.id]);
                          Alert.alert(
                            "Request sent",
                            `${item.name} can now review your profile.`,
                          );
                        } catch {
                          Alert.alert(
                            "Couldn’t send request",
                            "Please check your connection and try again.",
                          );
                        }
                      }}
                      style={[s.join, requested && s.buttonDisabled]}
                    >
                      <AppText style={s.buttonText}>
                        {requested ? "SENT" : "REQUEST"}
                      </AppText>
                    </Pressable>
                  </View>
                );
              })}
              {!matchingTeams.length ? (
                <View style={s.emptyState}>
                  <AppText style={s.team}>No matching teams</AppText>
                  <AppText style={s.body}>
                    Try a shorter team name or search by area.
                  </AppText>
                </View>
              ) : null}
            </>
          )
        ) : (
          <>
            <View style={s.profilePrivacyNote}>
              <Ionicons name="location-outline" size={21} color={C.red} />
              <AppText style={[s.body, { flex: 1 }]}>
                {team.area || "No home area added"}
              </AppText>
            </View>
            <AppText style={s.settingsGroupTitle}>TEAM RECORD</AppText>
            <View style={s.teamStatsGrid}>
              {[
                ["PL", teamStats.matches || 0],
                ["W", teamStats.wins || 0],
                ["D", teamStats.draws || 0],
                ["L", teamStats.losses || 0],
                ["GF", teamStats.goalsFor || 0],
                ["GA", teamStats.goalsAgainst || 0],
                [
                  "GD",
                  goalDifference > 0 ? `+${goalDifference}` : goalDifference,
                ],
                ["PTS", teamStats.points || 0],
              ].map(([label, value]) => (
                <View style={s.teamStatCell} key={label}>
                  <AppText style={s.teamStatValue}>{value}</AppText>
                  <AppText style={s.teamStatLabel}>{label}</AppText>
                </View>
              ))}
            </View>
            <View style={s.teamPpgRow}>
              <AppText style={s.meta}>POINTS PER GAME</AppText>
              <AppText style={s.team}>{pointsPerGame}</AppText>
            </View>
            {teamRows.map(({ icon, title, copy, value }) => (
              <Pressable
                key={title}
                style={s.roleActionRow}
                disabled={title !== "Team chat" || !teamConversation}
                onPress={() => setSelectedTeamChat(teamConversation)}
              >
                <View style={s.roleActionIcon}>
                  <Ionicons name={icon} size={21} color={C.red} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={s.team}>{title}</AppText>
                  <AppText style={s.meta}>{copy}</AppText>
                </View>
                <AppText style={s.bestMatch}>{value}</AppText>
                {title === "Team chat" && teamConversation ? (
                  <Ionicons name="chevron-forward" color={C.muted} />
                ) : null}
              </Pressable>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function RecordMatchWizard({ match, close, finish }) {
  const roster = match.roster || [];
  const [step, setStep] = useState(1);
  const [homeScore, setHomeScore] = useState("0");
  const [awayScore, setAwayScore] = useState("0");
  const [eventType, setEventType] = useState("Goal");
  const [player, setPlayer] = useState(roster[0] || "");
  const [assister, setAssister] = useState(roster[1] || roster[0] || "");
  const [events, setEvents] = useState([]);
  const addEvent = () => {
    const event = {
      id: `${Date.now()}-${events.length}`,
      type: eventType,
      player,
      assister: eventType === "Goal" ? assister : null,
    };
    setEvents((current) => [...current, event]);
  };
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      <View style={s.subHeader}>
        <Pressable
          onPress={step === 1 ? close : () => setStep(step - 1)}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={23} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <AppText style={s.headerTitle}>RECORD MATCH</AppText>
          <AppText style={s.headerSub}>STEP {step} OF 3</AppText>
        </View>
      </View>
      <View style={s.wizardProgress}>
        {[1, 2, 3].map((item) => (
          <View
            key={item}
            style={[
              s.wizardProgressBar,
              item <= step && s.wizardProgressBarActive,
            ]}
          />
        ))}
      </View>
      {step === 1 && (
        <View style={s.formIntro}>
          <AppText style={s.screenTitle}>Final score</AppText>
          <AppText style={s.body}>
            Enter the result agreed by both captains.
          </AppText>
          <View style={s.wizardScoreCard}>
            <View style={s.wizardScoreTeam}>
              <View style={s.matchSheetBadge}>
                <AppText style={s.matchSheetBadgeText}>
                  {initials(match.home)}
                </AppText>
              </View>
              <AppText style={s.team}>{match.home}</AppText>
              <TextInput
                value={homeScore}
                onChangeText={(value) => setHomeScore(numbersOnly(value))}
                keyboardType="numeric"
                style={s.wizardScoreInput}
                accessibilityLabel={`${match.home} score`}
              />
            </View>
            <AppText style={s.wizardScoreDivider}>:</AppText>
            <View style={s.wizardScoreTeam}>
              <View style={[s.matchSheetBadge, { backgroundColor: C.red }]}>
                <AppText style={s.matchSheetBadgeText}>
                  {initials(match.away)}
                </AppText>
              </View>
              <AppText style={s.team}>{match.away}</AppText>
              <TextInput
                value={awayScore}
                onChangeText={(value) => setAwayScore(numbersOnly(value))}
                keyboardType="numeric"
                style={s.wizardScoreInput}
                accessibilityLabel={`${match.away} score`}
              />
            </View>
          </View>
          <Pressable onPress={() => setStep(2)} style={s.saveLineupButton}>
            <AppText style={s.saveLineupText}>NEXT: MATCH EVENTS</AppText>
            <Ionicons name="arrow-forward" color="white" />
          </Pressable>
        </View>
      )}
      {step === 2 && (
        <View style={s.formIntro}>
          <AppText style={s.screenTitle}>Goals & discipline</AppText>
          <AppText style={s.body}>
            These events build player and team statistics.
          </AppText>
          <AppText style={s.formLabel}>Event type</AppText>
          <View style={s.optionWrap}>
            {[
              ["Goal", "football-outline"],
              ["Yellow card", "square"],
              ["Red card", "square"],
            ].map((item) => (
              <Pressable
                key={item[0]}
                onPress={() => setEventType(item[0])}
                style={[
                  s.formChoice,
                  eventType === item[0] && s.formChoiceActive,
                ]}
              >
                <Ionicons
                  name={item[1]}
                  size={15}
                  color={
                    eventType === item[0]
                      ? "white"
                      : item[0] === "Yellow card"
                        ? "#D9A516"
                        : item[0] === "Red card"
                          ? C.red
                          : C.ink
                  }
                />
                <AppText
                  style={[
                    s.formChoiceText,
                    eventType === item[0] && s.formChoiceTextActive,
                  ]}
                >
                  {item[0]}
                </AppText>
              </Pressable>
            ))}
          </View>
          <AppText style={s.formLabel}>
            {eventType === "Goal" ? "Goal scorer" : "Carded player"}
          </AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.playerPicker}
          >
            {roster.map((name) => (
              <Pressable
                key={name}
                onPress={() => setPlayer(name)}
                style={[
                  s.playerPickerChip,
                  player === name && s.playerPickerChipActive,
                ]}
              >
                <View style={s.playerPickerAvatar}>
                  <AppText style={s.playerAvatarText}>{initials(name)}</AppText>
                </View>
                <AppText
                  style={[
                    s.playerPickerText,
                    player === name && { color: "white" },
                  ]}
                >
                  {firstName(name)}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
          {eventType === "Goal" ? (
            <>
              <AppText style={s.formLabel}>Assisted by</AppText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.playerPicker}
              >
                <Pressable
                  onPress={() => setAssister(null)}
                  style={[
                    s.playerPickerChip,
                    assister == null && s.playerPickerChipActive,
                  ]}
                >
                  <AppText
                    style={[
                      s.playerPickerText,
                      assister == null && { color: "white" },
                    ]}
                  >
                    No assist
                  </AppText>
                </Pressable>
                {roster
                  .filter((name) => name !== player)
                  .map((name) => (
                    <Pressable
                      key={name}
                      onPress={() => setAssister(name)}
                      style={[
                        s.playerPickerChip,
                        assister === name && s.playerPickerChipActive,
                      ]}
                    >
                      <AppText
                        style={[
                          s.playerPickerText,
                          assister === name && { color: "white" },
                        ]}
                      >
                        {firstName(name)}
                      </AppText>
                    </Pressable>
                  ))}
              </ScrollView>
            </>
          ) : null}
          <Pressable onPress={addEvent} style={s.addEventButton}>
            <Ionicons name="add" color={C.red} size={18} />
            <AppText style={s.communitySeeAll}>
              Add {eventType.toLowerCase()}
            </AppText>
          </Pressable>
          {events.map((event, index) => (
            <View style={s.matchEventRow} key={event.id}>
              <View
                style={[
                  s.eventIcon,
                  event.type === "Yellow card" && {
                    backgroundColor: "#E7B62D",
                  },
                  event.type === "Red card" && { backgroundColor: C.red },
                ]}
              >
                <Ionicons
                  name={event.type === "Goal" ? "football" : "square"}
                  color="white"
                  size={15}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>
                  {event.type} · {event.player}
                </AppText>
                {event.assister ? (
                  <AppText style={s.meta}>Assist: {event.assister}</AppText>
                ) : null}
              </View>
              <Pressable
                onPress={() =>
                  setEvents((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                <Ionicons name="close" color={C.muted} />
              </Pressable>
            </View>
          ))}
          <Pressable onPress={() => setStep(3)} style={s.saveLineupButton}>
            <AppText style={s.saveLineupText}>REVIEW MATCH</AppText>
            <Ionicons name="arrow-forward" color="white" />
          </Pressable>
        </View>
      )}
      {step === 3 && (
        <View style={s.formIntro}>
          <AppText style={s.screenTitle}>Review & submit</AppText>
          <AppText style={s.body}>
            This result updates rankings and player statistics after opponent
            confirmation.
          </AppText>
          <View style={s.reviewScore}>
            <AppText style={s.reviewTeam}>{match.home}</AppText>
            <AppText style={s.reviewScoreValue}>
              {homeScore} : {awayScore}
            </AppText>
            <AppText style={s.reviewTeam}>{match.away}</AppText>
          </View>
          <AppText style={s.settingsGroupTitle}>RECORDED EVENTS</AppText>
          {events.length ? (
            events.map((event) => (
              <View style={s.matchEventRow} key={event.id}>
                <View style={s.eventIcon}>
                  <Ionicons
                    name={event.type === "Goal" ? "football" : "square"}
                    color="white"
                    size={15}
                  />
                </View>
                <View>
                  <AppText style={s.team}>
                    {event.type} · {event.player}
                  </AppText>
                  {event.assister ? (
                    <AppText style={s.meta}>Assist: {event.assister}</AppText>
                  ) : null}
                </View>
              </View>
            ))
          ) : (
            <View style={s.emptyState}>
              <AppText style={s.team}>No events recorded</AppText>
              <AppText style={s.body}>
                You can go back to add scorers, assists or cards.
              </AppText>
            </View>
          )}
          <View style={s.statsNotice}>
            <Ionicons name="stats-chart-outline" color={C.red} size={22} />
            <AppText style={s.body}>
              Goals, assists, yellow cards and red cards will update player
              profiles and team statistics.
            </AppText>
          </View>
          <Pressable
            onPress={() =>
              finish({
                homeScore: Number(homeScore || 0),
                awayScore: Number(awayScore || 0),
                events,
                confirmationStatus: "pending_opponent",
              })
            }
            style={s.saveLineupButton}
          >
            <Ionicons name="checkmark-circle-outline" color="white" size={18} />
            <AppText style={s.saveLineupText}>SUBMIT FOR CONFIRMATION</AppText>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function RecordMatchWizardV2({ match, close, finish }) {
  const roster = match.roster || [];
  const correctionResult =
    match.status === "result_disputed"
      ? match.proposedResult || match.result
      : match.result;
  const offlineDraftKey = `friendlies-match-draft-${match.canonicalId || match.id || "local"}-${match.status || "initial"}-${match.activeDisputeId || "none"}`;
  const [step, setStep] = useState(1);
  const [homeScore, setHomeScore] = useState(
    String(correctionResult?.homeScore ?? 0),
  );
  const [awayScore, setAwayScore] = useState(
    String(correctionResult?.awayScore ?? 0),
  );
  const [eventType, setEventType] = useState("Goal");
  const [eventSide, setEventSide] = useState("home");
  const [minute, setMinute] = useState("34");
  const [player, setPlayer] = useState(roster[0] || "");
  const [assister, setAssister] = useState(roster[1] || "");
  const [events, setEvents] = useState(
    Array.isArray(correctionResult?.events) ? correctionResult.events : [],
  );
  const [submitting, setSubmitting] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(offlineDraftKey)
      .then((saved) => {
        if (!active || !saved) return;
        const draft = JSON.parse(saved);
        setStep(Number(draft.step || 1));
        setHomeScore(String(draft.homeScore ?? "0"));
        setAwayScore(String(draft.awayScore ?? "0"));
        setEvents(Array.isArray(draft.events) ? draft.events : []);
      })
      .catch(() => {})
      .finally(() => active && setDraftReady(true));
    return () => {
      active = false;
    };
  }, [offlineDraftKey]);
  useEffect(() => {
    if (!draftReady) return;
    AsyncStorage.setItem(
      offlineDraftKey,
      JSON.stringify({ step, homeScore, awayScore, events }),
    ).catch(() => {});
  }, [awayScore, draftReady, events, homeScore, offlineDraftKey, step]);
  const addEvent = () =>
    setEvents((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length}`,
        type: eventType,
        side: eventSide,
        minute: minute || "Not set",
        player,
        assister: eventType === "Goal" ? assister : null,
      },
    ]);
  const goalsFor = (side) =>
    events.filter((event) => event.type === "Goal" && event.side === side);
  const extras = events.filter(
    (event) => event.type !== "Goal" || event.assister,
  );
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      <View style={s.subHeader}>
        <Pressable
          onPress={step === 1 ? close : () => setStep(step - 1)}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={23} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <AppText style={s.headerTitle}>RECORD MATCH</AppText>
          <AppText style={s.headerSub}>
            STEP {step} OF 3 · SAVED ON THIS PHONE
          </AppText>
        </View>
      </View>
      <View style={s.wizardProgress}>
        {[1, 2, 3].map((item) => (
          <View
            key={item}
            style={[
              s.wizardProgressBar,
              item <= step && s.wizardProgressBarActive,
            ]}
          />
        ))}
      </View>
      {step === 1 && (
        <View style={s.formIntro}>
          <AppText style={s.screenTitle}>Final score</AppText>
          <AppText style={s.body}>
            Enter the result agreed by both captains.
          </AppText>
          <View style={s.wizardScoreCard}>
            <View style={s.wizardScoreTeam}>
              <View style={s.matchSheetBadge}>
                <AppText style={s.matchSheetBadgeText}>
                  {initials(match.home)}
                </AppText>
              </View>
              <AppText style={s.team}>{match.home}</AppText>
              <TextInput
                value={homeScore}
                onChangeText={(value) => setHomeScore(numbersOnly(value))}
                keyboardType="numeric"
                style={s.wizardScoreInput}
                accessibilityLabel={`${match.home} score`}
              />
            </View>
            <AppText style={s.wizardScoreDivider}>:</AppText>
            <View style={s.wizardScoreTeam}>
              <View style={[s.matchSheetBadge, { backgroundColor: C.red }]}>
                <AppText style={s.matchSheetBadgeText}>
                  {initials(match.away)}
                </AppText>
              </View>
              <AppText style={s.team}>{match.away}</AppText>
              <TextInput
                value={awayScore}
                onChangeText={(value) => setAwayScore(numbersOnly(value))}
                keyboardType="numeric"
                style={s.wizardScoreInput}
                accessibilityLabel={`${match.away} score`}
              />
            </View>
          </View>
          <Pressable onPress={() => setStep(2)} style={s.saveLineupButton}>
            <AppText style={s.saveLineupText}>NEXT: MATCH EVENTS</AppText>
            <Ionicons name="arrow-forward" color="white" />
          </Pressable>
        </View>
      )}
      {step === 2 && (
        <View style={s.formIntro}>
          <AppText style={s.screenTitle}>Goals & discipline</AppText>
          <AppText style={s.body}>
            Record the team, minute and player for every event.
          </AppText>
          <AppText style={s.formLabel}>Team</AppText>
          {!roster.length ? (
            <View style={s.profilePrivacyNote}>
              <Ionicons name="people-outline" size={20} color={C.red} />
              <AppText style={[s.body, { flex: 1 }]}>
                Add accepted squad members before recording player events.
              </AppText>
            </View>
          ) : null}
          <View style={s.optionWrap}>
            {[
              ["home", match.home],
              ["away", match.away],
            ].map((item) => (
              <Pressable
                key={item[0]}
                onPress={() => setEventSide(item[0])}
                style={[
                  s.formChoice,
                  eventSide === item[0] && s.formChoiceActive,
                ]}
              >
                <AppText
                  style={[
                    s.formChoiceText,
                    eventSide === item[0] && s.formChoiceTextActive,
                  ]}
                >
                  {item[1]}
                </AppText>
              </Pressable>
            ))}
          </View>
          <AppText style={s.formLabel}>Event</AppText>
          <View style={s.optionWrap}>
            {[
              ["Goal", "football-outline"],
              ["Yellow card", "square"],
              ["Red card", "square"],
            ].map((item) => (
              <Pressable
                key={item[0]}
                onPress={() => setEventType(item[0])}
                style={[
                  s.formChoice,
                  eventType === item[0] && s.formChoiceActive,
                ]}
              >
                <Ionicons
                  name={item[1]}
                  size={15}
                  color={
                    eventType === item[0]
                      ? "white"
                      : item[0] === "Yellow card"
                        ? "#D9A516"
                        : item[0] === "Red card"
                          ? C.red
                          : C.ink
                  }
                />
                <AppText
                  style={[
                    s.formChoiceText,
                    eventType === item[0] && s.formChoiceTextActive,
                  ]}
                >
                  {item[0]}
                </AppText>
              </Pressable>
            ))}
          </View>
          <AppText style={s.formLabel}>Minute</AppText>
          <TextInput
            value={minute}
            onChangeText={(value) => setMinute(numbersOnly(value))}
            keyboardType="numeric"
            style={[s.formInput, { width: 86 }]}
            accessibilityLabel="Event minute"
          />
          <AppText style={s.formLabel}>
            {eventType === "Goal" ? "Goal scorer" : "Carded player"}
          </AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.playerPicker}
          >
            {roster.map((name) => (
              <Pressable
                key={name}
                onPress={() => setPlayer(name)}
                style={[
                  s.playerPickerChip,
                  player === name && s.playerPickerChipActive,
                ]}
              >
                <View style={s.playerPickerAvatar}>
                  <AppText style={s.playerAvatarText}>{initials(name)}</AppText>
                </View>
                <AppText
                  style={[
                    s.playerPickerText,
                    player === name && { color: "white" },
                  ]}
                >
                  {firstName(name)}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
          {eventType === "Goal" ? (
            <>
              <AppText style={s.formLabel}>Assisted by</AppText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.playerPicker}
              >
                <Pressable
                  onPress={() => setAssister(null)}
                  style={[
                    s.playerPickerChip,
                    assister == null && s.playerPickerChipActive,
                  ]}
                >
                  <AppText
                    style={[
                      s.playerPickerText,
                      assister == null && { color: "white" },
                    ]}
                  >
                    No assist
                  </AppText>
                </Pressable>
                {roster
                  .filter((name) => name !== player)
                  .map((name) => (
                    <Pressable
                      key={name}
                      onPress={() => setAssister(name)}
                      style={[
                        s.playerPickerChip,
                        assister === name && s.playerPickerChipActive,
                      ]}
                    >
                      <AppText
                        style={[
                          s.playerPickerText,
                          assister === name && { color: "white" },
                        ]}
                      >
                        {firstName(name)}
                      </AppText>
                    </Pressable>
                  ))}
              </ScrollView>
            </>
          ) : null}
          <Pressable
            disabled={!player}
            onPress={addEvent}
            style={[s.addEventButton, !player && s.buttonDisabled]}
          >
            <Ionicons name="add" color={C.red} size={18} />
            <AppText style={s.communitySeeAll}>
              Add {eventType.toLowerCase()}
            </AppText>
          </Pressable>
          {events.map((event, index) => (
            <View style={s.matchEventRow} key={event.id}>
              <View
                style={[
                  s.eventIcon,
                  event.type === "Yellow card" && {
                    backgroundColor: "#E7B62D",
                  },
                  event.type === "Red card" && { backgroundColor: C.red },
                ]}
              >
                <Ionicons
                  name={event.type === "Goal" ? "football" : "square"}
                  color="white"
                  size={15}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>
                  {event.minute}′ · {event.type} · {event.player}
                </AppText>
                <AppText style={s.meta}>
                  {event.side === "home" ? match.home : match.away}
                  {event.assister ? ` · Assist: ${event.assister}` : ""}
                </AppText>
              </View>
              <Pressable
                accessibilityLabel={`Remove ${event.type}`}
                onPress={() =>
                  setEvents((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                <Ionicons name="close" color={C.muted} />
              </Pressable>
            </View>
          ))}
          <Pressable onPress={() => setStep(3)} style={s.saveLineupButton}>
            <AppText style={s.saveLineupText}>REVIEW MATCH</AppText>
            <Ionicons name="arrow-forward" color="white" />
          </Pressable>
        </View>
      )}
      {step === 3 && (
        <View style={s.formIntro}>
          <AppText style={s.screenTitle}>Review & submit</AppText>
          <AppText style={s.body}>
            Scorers sit in small type beneath each team, like a TV result
            graphic.
          </AppText>
          <View style={s.reviewScore}>
            <View style={s.reviewTeamBlock}>
              <AppText style={s.reviewTeam}>{match.home}</AppText>
              {goalsFor("home").map((event) => (
                <AppText key={event.id} style={s.reviewScorer}>
                  {lastName(event.player)} {event.minute}′
                </AppText>
              ))}
            </View>
            <AppText style={s.reviewScoreValue}>
              {homeScore} : {awayScore}
            </AppText>
            <View style={s.reviewTeamBlock}>
              <AppText style={s.reviewTeam}>{match.away}</AppText>
              {goalsFor("away").map((event) => (
                <AppText key={event.id} style={s.reviewScorer}>
                  {lastName(event.player)} {event.minute}′
                </AppText>
              ))}
            </View>
          </View>
          <AppText style={s.settingsGroupTitle}>DISCIPLINE & ASSISTS</AppText>
          {extras.length ? (
            extras.map((event) => (
              <View style={s.matchEventRow} key={event.id}>
                <View
                  style={[
                    s.eventIcon,
                    event.type === "Yellow card" && {
                      backgroundColor: "#E7B62D",
                    },
                    event.type === "Red card" && { backgroundColor: C.red },
                  ]}
                >
                  <Ionicons
                    name={
                      event.type === "Goal" ? "git-merge-outline" : "square"
                    }
                    color="white"
                    size={15}
                  />
                </View>
                <View>
                  <AppText style={s.team}>
                    {event.type === "Goal"
                      ? `Assist · ${event.assister}`
                      : `${event.type} · ${event.player}`}
                  </AppText>
                  <AppText style={s.meta}>
                    {event.minute}′ ·{" "}
                    {event.side === "home" ? match.home : match.away}
                  </AppText>
                </View>
              </View>
            ))
          ) : (
            <View style={s.emptyState}>
              <AppText style={s.team}>No additional events</AppText>
              <AppText style={s.body}>
                Scorers are already shown under the team names.
              </AppText>
            </View>
          )}
          <View style={s.statsNotice}>
            <Ionicons name="stats-chart-outline" color={C.red} size={22} />
            <AppText style={s.body}>
              Only events confirmed by both teams become official player
              statistics.
            </AppText>
          </View>
          <Pressable
            disabled={submitting}
            onPress={async () => {
              if (submitting) return;
              setSubmitting(true);
              const result = {
                homeScore: Number(homeScore || 0),
                awayScore: Number(awayScore || 0),
                events,
                confirmationStatus: "pending_opponent",
              };
              try {
                await finish(result);
                await AsyncStorage.removeItem(offlineDraftKey);
              } catch {
                Alert.alert(
                  "Saved on this phone",
                  "The match record is safe here. Submit it again when you have a connection.",
                );
              } finally {
                setSubmitting(false);
              }
            }}
            style={[s.saveLineupButton, submitting && s.buttonDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Ionicons
                name="checkmark-circle-outline"
                color="white"
                size={18}
              />
            )}
            <AppText style={s.saveLineupText}>
              {submitting
                ? "SAVING SCORE"
                : match.status === "result_disputed"
                  ? "SUBMIT CORRECTED SCORE"
                  : "SUBMIT FOR CONFIRMATION"}
            </AppText>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function MatchFlowScreen({ match, close, finish }) {
  return (
    <RecordMatchWizardV2 match={match} close={close} finish={finish} />
  );
}

function UpcomingMatchCard({
  match,
  teams,
  onFindReferee,
  onOpenChat,
  onOpenMatch,
  isOwnMatch = false,
  onApproveReferee,
  onRejectReferee,
  onConfirmResult,
  onManageFixture,
  viewerTeamId,
}) {
  const { width } = useWindowDimensions();
  const compact = width < 390;
  const home = teams.find((candidate) => candidate.id === match.homeTeamId) || {
    name: match.homeTeamName,
  };
  const away = teams.find((candidate) => candidate.id === match.awayTeamId) || {
    name: match.awayTeamName,
  };
  const pendingHomeScore = Number(match.result?.homeScore || 0);
  const pendingAwayScore = Number(match.result?.awayScore || 0);
  const disputedHomeScore = Number(
    match.proposedResult?.homeScore ?? match.result?.homeScore ?? 0,
  );
  const disputedAwayScore = Number(
    match.proposedResult?.awayScore ?? match.result?.awayScore ?? 0,
  );
  return (
    <View
      style={[
        s.upcomingMatchCard,
        isOwnMatch && { borderColor: C.red, borderWidth: 2 },
      ]}
    >
      <View style={[s.upcomingMatchTop, compact && s.stackOnCompact]}>
        <View>
          <AppText style={s.upcomingMatchDate}>
            {formatStoredDate(match.matchDate)}
          </AppText>
          <AppText style={s.upcomingMatchVenue}>
            {match.venue || "Venue to confirm"}
          </AppText>
          {match.status === "result_disputed" &&
          match.resultCorrectionDeadline ? (
            <AppText style={s.meta}>
              Correction due{" "}
              {new Date(match.resultCorrectionDeadline).toLocaleString()}
            </AppText>
          ) : null}
        </View>
        <View style={s.confirmedPill}>
          <View style={s.confirmedDot} />
          <AppText style={s.confirmedPillText}>
            {match.status === "result_pending"
              ? "RESULT TO CONFIRM"
              : match.status === "result_disputed"
                ? "SCORE CORRECTION"
                : match.matchType === "league"
                  ? "LEAGUE"
                  : "CONFIRMED"}
          </AppText>
        </View>
      </View>
      <View style={[s.upcomingTeams, compact && s.upcomingTeamsCompact]}>
        <View style={s.upcomingTeamSide}>
          <AppText style={s.upcomingSideLabel}>HOME</AppText>
          <CrestPreview
            shape={home.crest?.shape || 0}
            color={home.crest?.color || C.redDark}
            label={home.crest?.label || initials(home.name)}
          />
          <AppText style={s.upcomingTeamName} numberOfLines={2}>
            {home.name}
          </AppText>
        </View>
        <View style={s.upcomingKickoff}>
          <AppText style={s.upcomingTime}>
            {match.status === "result_pending"
              ? `${pendingHomeScore} : ${pendingAwayScore}`
              : match.status === "result_disputed"
                ? `${disputedHomeScore} : ${disputedAwayScore}`
                : match.kickoff || "TBC"}
          </AppText>
          <AppText style={s.upcomingVs}>
            {match.status === "result_pending"
              ? "SUBMITTED SCORE"
              : match.status === "result_disputed"
                ? "PROPOSED CORRECTION"
                : "VS"}
          </AppText>
          <AppText style={s.upcomingFormat}>
            {match.format} · {match.durationMinutes || 90} min
          </AppText>
        </View>
        <View style={s.upcomingTeamSide}>
          <AppText style={s.upcomingSideLabel}>AWAY</AppText>
          <CrestPreview
            shape={away.crest?.shape || 0}
            color={away.crest?.color || C.red}
            label={away.crest?.label || initials(away.name)}
          />
          <AppText style={s.upcomingTeamName} numberOfLines={2}>
            {away.name}
          </AppText>
        </View>
      </View>
      {match.status === "result_disputed" ? (
        <View style={s.profilePrivacyNote}>
          <Ionicons name="information-circle-outline" size={20} color={C.red} />
          <AppText style={[s.body, { flex: 1 }]}>
            {match.disputeReason ||
              "The other team requested a score correction."}
          </AppText>
        </View>
      ) : null}
      <View style={s.upcomingAgreement}>
        <View style={s.upcomingAgreementItem}>
          <Ionicons name="cash-outline" size={17} color={C.red} />
          <View>
            <AppText style={s.upcomingAgreementValue}>
              ${match.teamFee || "0"} per team
            </AppText>
            <AppText style={s.upcomingAgreementLabel}>MATCH COST</AppText>
          </View>
        </View>
        <View style={s.upcomingAgreementItem}>
          <Ionicons name="flag-outline" size={17} color={C.red} />
          <View>
            <AppText style={s.upcomingAgreementValue}>
              {match.refereeStatus === "accepted"
                ? match.refereeName
                : match.refereeStatus === "requested"
                  ? `${match.refereeName || "Proposed referee"} · awaiting reply`
                  : match.refereeStatus === "team_confirmation"
                    ? `${match.refereeName || "Proposed referee"} · approval needed`
                    : `Budget $${match.proposedRefereeFee || "0"}`}
            </AppText>
            <AppText style={s.upcomingAgreementLabel}>
              REFEREE · ${match.refereeFee || match.proposedRefereeFee || "0"}
            </AppText>
          </View>
        </View>
      </View>
      <View style={[s.upcomingActions, compact && s.actionsCompact]}>
        {onOpenMatch ? (
          <Pressable style={s.upcomingChatButton} onPress={onOpenMatch}>
            <Ionicons name="football-outline" size={17} color={C.redDark} />
            <AppText style={s.buttonText}>
              {match.status === "result_disputed"
                ? "Correct score"
                : "Record result"}
            </AppText>
          </Pressable>
        ) : null}
        {onOpenChat ? (
          <Pressable style={s.upcomingChatButton} onPress={onOpenChat}>
            <Ionicons name="chatbubbles-outline" size={17} color={C.redDark} />
            <AppText style={s.buttonText}>Game chat</AppText>
          </Pressable>
        ) : null}
        {match.refereeStatus === "needed" && onFindReferee ? (
          <Pressable style={s.upcomingRefButton} onPress={onFindReferee}>
            <Ionicons name="flag-outline" size={17} color="white" />
            <AppText style={s.primaryText}>Choose referee</AppText>
          </Pressable>
        ) : null}
        {onApproveReferee ? (
          <>
            <Pressable style={s.upcomingRefButton} onPress={onApproveReferee}>
              <Ionicons
                name="checkmark-circle-outline"
                size={17}
                color="white"
              />
              <AppText style={s.primaryText}>Approve referee</AppText>
            </Pressable>
            {onRejectReferee ? (
              <Pressable style={s.upcomingChatButton} onPress={onRejectReferee}>
                <Ionicons
                  name="close-circle-outline"
                  size={17}
                  color={C.redDark}
                />
                <AppText style={s.buttonText}>Choose someone else</AppText>
              </Pressable>
            ) : null}
          </>
        ) : null}
        {onConfirmResult ? (
          <Pressable style={s.upcomingRefButton} onPress={onConfirmResult}>
            <Ionicons name="eye-outline" size={17} color="white" />
            <AppText style={s.primaryText}>
              Review {pendingHomeScore} : {pendingAwayScore}
            </AppText>
          </Pressable>
        ) : null}
        {onManageFixture ? (
          <Pressable style={s.upcomingChatButton} onPress={onManageFixture}>
            <Ionicons name="alert-circle-outline" size={17} color={C.redDark} />
            <AppText style={s.buttonText}>
              {match.rescheduleStatus === "pending"
                ? match.rescheduleConfirmationTeamId === viewerTeamId
                  ? "Respond to kickoff"
                  : "Kickoff requested"
                : match.cancellationStatus === "pending" ||
                    match.noShowStatus === "pending_confirmation"
                  ? match.cancellationConfirmationTeamId === viewerTeamId ||
                    match.noShowConfirmationTeamId === viewerTeamId
                    ? "Respond to issue"
                    : "Issue sent"
                  : "Fixture issue"}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function FixtureAccountabilityScreen({
  match,
  team,
  close,
  onRequestReschedule,
  onRespondReschedule,
  onRequestCancellation,
  onRespondCancellation,
  onReportNoShow,
  onRespondNoShow,
}) {
  const [reason, setReason] = useState("Rain");
  const [details, setDetails] = useState("");
  const [proposedDate, setProposedDate] = useState(match.matchDate || "");
  const [proposedTime, setProposedTime] = useState(match.kickoff || "");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [busy, setBusy] = useState(false);
  const pendingReschedule =
    match.rescheduleStatus === "pending" &&
    match.rescheduleConfirmationTeamId === team?.id;
  const waitingForReschedule =
    match.rescheduleStatus === "pending" &&
    match.rescheduleRequestedByTeamId === team?.id;
  const pendingCancellation =
    match.cancellationStatus === "pending" &&
    match.cancellationConfirmationTeamId === team?.id;
  const waitingForCancellation =
    match.cancellationStatus === "pending" &&
    match.cancellationRequestedByTeamId === team?.id;
  const pendingNoShow =
    match.noShowStatus === "pending_confirmation" &&
    match.noShowConfirmationTeamId === team?.id;
  const waitingForNoShow =
    match.noShowStatus === "pending_confirmation" &&
    match.noShowReportedByTeamId === team?.id;
  const opponentTeamId = match.participantTeamIds?.find(
    (teamId) => teamId !== team?.id,
  );
  const kickoffAt = new Date(
    `${match.matchDate || ""}T${match.kickoff || "00:00"}:00`,
  ).getTime();
  const canReportNoShow = Number.isFinite(kickoffAt) && Date.now() >= kickoffAt;
  const run = async (action, success) => {
    setBusy(true);
    try {
      await action();
      Alert.alert(success, "The fixture record has been updated.");
      close();
    } catch (error) {
      Alert.alert(
        "Couldn’t update fixture",
        error?.message || "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={s.subHeader}>
        <Pressable onPress={close}>
          <Ionicons name="arrow-back" size={23} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <AppText style={s.headerTitle}>FIXTURE ISSUE</AppText>
          <AppText style={s.headerSub}>
            {match.homeTeamName} VS {match.awayTeamName}
          </AppText>
        </View>
      </View>
      <View style={s.communityListSection}>
        {pendingReschedule ? (
          <>
            <View style={s.grassrootsLead}>
              <AppText style={s.screenTitle}>New kickoff requested</AppText>
              <AppText style={s.body}>
                Current · {formatStoredDate(match.matchDate)} at {match.kickoff}
              </AppText>
              <AppText style={s.team}>
                Proposed · {formatStoredDate(match.proposedMatchDate)} at{" "}
                {match.proposedKickoff}
              </AppText>
              {match.rescheduleReason ? (
                <AppText style={s.meta}>{match.rescheduleReason}</AppText>
              ) : null}
            </View>
            <Pressable
              disabled={busy}
              style={[s.saveLineupButton, busy && s.buttonDisabled]}
              onPress={() =>
                run(
                  () => onRespondReschedule(match, true),
                  "New kickoff agreed",
                )
              }
            >
              <AppText style={s.saveLineupText}>ACCEPT NEW KICKOFF</AppText>
            </Pressable>
            <Pressable
              disabled={busy}
              style={s.outlineButton}
              onPress={() =>
                run(
                  () => onRespondReschedule(match, false),
                  "Original kickoff kept",
                )
              }
            >
              <AppText style={s.buttonText}>KEEP ORIGINAL KICKOFF</AppText>
            </Pressable>
            <AppText style={s.formHelp}>
              Use the private match chat to discuss another option before a new
              request is sent.
            </AppText>
          </>
        ) : waitingForReschedule ? (
          <View style={s.grassrootsLead}>
            <Ionicons name="time-outline" size={25} color={C.red} />
            <AppText style={s.screenTitle}>Waiting for the other team</AppText>
            <AppText style={s.body}>
              You asked to play on {formatStoredDate(match.proposedMatchDate)}{" "}
              at {match.proposedKickoff}. The original kickoff remains active
              until they accept.
            </AppText>
            <AppText style={s.formHelp}>
              Continue discussing details in the private match chat.
            </AppText>
          </View>
        ) : waitingForCancellation ? (
          <View style={s.grassrootsLead}>
            <Ionicons name="hourglass-outline" size={25} color={C.red} />
            <AppText style={s.screenTitle}>Cancellation sent</AppText>
            <AppText style={s.body}>
              The other team must now choose whether this is mutual, your team
              is responsible, or the game remains scheduled.
            </AppText>
          </View>
        ) : pendingCancellation ? (
          <>
            <View style={s.grassrootsLead}>
              <AppText style={s.screenTitle}>Cancellation requested</AppText>
              <AppText style={s.body}>
                {match.cancellationReason}
                {match.cancellationDetails
                  ? ` · ${match.cancellationDetails}`
                  : ""}
              </AppText>
              <AppText style={s.meta}>
                {match.cancellationType === "with_notice"
                  ? `${Math.max(0, match.cancellationHoursNotice || 0)} hours’ notice`
                  : "Less than 24 hours’ notice"}
              </AppText>
            </View>
            <View style={s.profilePrivacyNote}>
              <Ionicons
                name="information-circle-outline"
                size={21}
                color={C.red}
              />
              <AppText style={[s.body, { flex: 1 }]}>
                Agreeing records a mutual cancellation. Neither team is
                penalised.
              </AppText>
            </View>
            <Pressable
              disabled={busy}
              style={[s.saveLineupButton, busy && s.buttonDisabled]}
              onPress={() =>
                run(
                  () => onRespondCancellation(match, "mutual"),
                  "Cancellation agreed",
                )
              }
            >
              <AppText style={s.saveLineupText}>AGREE TO CANCEL</AppText>
            </Pressable>
            <Pressable
              disabled={busy}
              style={s.outlineButton}
              onPress={() =>
                run(
                  () => onRespondCancellation(match, "requester_responsible"),
                  "Match cancelled",
                )
              }
            >
              <AppText style={s.buttonText}>
                CANCEL · REQUESTING TEAM RESPONSIBLE
              </AppText>
            </Pressable>
            <Pressable
              disabled={busy}
              style={s.outlineButton}
              onPress={() =>
                run(
                  () => onRespondCancellation(match, "keep"),
                  "Fixture remains active",
                )
              }
            >
              <AppText style={s.buttonText}>
                DO NOT CANCEL · GAME STAYS ON
              </AppText>
            </Pressable>
            <AppText style={s.formHelp}>
              If the game stays on and a team does not arrive, the opponent can
              report a no-show after kickoff.
            </AppText>
          </>
        ) : pendingNoShow ? (
          <>
            <View style={s.grassrootsLead}>
              <AppText style={s.screenTitle}>No-show report</AppText>
              <AppText style={s.body}>
                The other team reported that your team did not attend.
              </AppText>
              {match.noShowDetails ? (
                <AppText style={s.meta}>{match.noShowDetails}</AppText>
              ) : null}
            </View>
            <Pressable
              disabled={busy}
              style={[s.saveLineupButton, busy && s.buttonDisabled]}
              onPress={() =>
                run(() => onRespondNoShow(match, true), "No-show confirmed")
              }
            >
              <AppText style={s.saveLineupText}>CONFIRM NO-SHOW</AppText>
            </Pressable>
            <Pressable
              disabled={busy}
              style={s.outlineButton}
              onPress={() =>
                run(() => onRespondNoShow(match, false), "No-show disputed")
              }
            >
              <AppText style={s.buttonText}>
                WE ATTENDED OR HAD AGREEMENT
              </AppText>
            </Pressable>
          </>
        ) : waitingForNoShow ? (
          <View style={s.grassrootsLead}>
            <Ionicons name="hourglass-outline" size={25} color={C.red} />
            <AppText style={s.screenTitle}>No show sent</AppText>
            <AppText style={s.body}>
              The reported team must confirm or dispute the record.
            </AppText>
          </View>
        ) : (
          <>
            <View style={s.grassrootsLead}>
              <AppText style={s.screenTitle}>Ask for a new kickoff</AppText>
              <AppText style={s.body}>
                The match stays at its current time until the other team
                accepts.
              </AppText>
            </View>
            <AppText style={s.formLabel}>Proposed date</AppText>
            <DateField
              value={proposedDate}
              onChange={setProposedDate}
              minimumDate={new Date()}
              accessibilityLabel="Choose proposed match date"
            />
            <AppText style={s.formLabel}>Proposed time</AppText>
            <TextInput
              value={proposedTime}
              onChangeText={setProposedTime}
              keyboardType="numbers-and-punctuation"
              placeholder="15:00"
              placeholderTextColor={C.muted}
              style={s.formInput}
            />
            <AppText style={s.formLabel}>Reason or agreed detail</AppText>
            <TextInput
              value={rescheduleReason}
              onChangeText={setRescheduleReason}
              placeholder="For example: ground unavailable until 16:00"
              placeholderTextColor={C.muted}
              style={s.formInput}
            />
            <Pressable
              disabled={
                busy ||
                !proposedDate ||
                !validClockTime(proposedTime) ||
                (proposedDate === match.matchDate &&
                  proposedTime === match.kickoff)
              }
              style={[
                s.saveLineupButton,
                (busy ||
                  !proposedDate ||
                  !validClockTime(proposedTime) ||
                  (proposedDate === match.matchDate &&
                    proposedTime === match.kickoff)) &&
                  s.buttonDisabled,
              ]}
              onPress={() =>
                run(
                  () =>
                    onRequestReschedule(
                      match,
                      proposedDate,
                      proposedTime,
                      rescheduleReason,
                    ),
                  "New kickoff requested",
                )
              }
            >
              <AppText style={s.saveLineupText}>SEND TIME REQUEST</AppText>
            </Pressable>
            <AppText style={s.settingsGroupTitle}>CANNOT PLAY</AppText>
            <View style={s.grassrootsLead}>
              <AppText style={s.screenTitle}>Request a cancellation</AppText>
              <AppText style={s.body}>
                The opponent must agree. Rain, unsafe grounds and bereavement
                are recorded as circumstances, not misconduct.
              </AppText>
            </View>
            <ProfileChoiceGroup
              label="Reason"
              options={[
                "Rain",
                "Unsafe ground",
                "Bereavement",
                "Transport problem",
                "Not enough players",
                "Other",
              ]}
              value={reason}
              onChange={setReason}
            />
            <AppText style={s.formLabel}>Short explanation</AppText>
            <TextInput
              value={details}
              onChangeText={setDetails}
              multiline
              placeholder="Tell the other team what changed"
              placeholderTextColor={C.muted}
              style={[s.formInput, s.grassrootsTextArea]}
            />
            <Pressable
              disabled={busy}
              style={[s.saveLineupButton, busy && s.buttonDisabled]}
              onPress={() =>
                run(
                  () => onRequestCancellation(match, reason, details),
                  "Cancellation requested",
                )
              }
            >
              <AppText style={s.saveLineupText}>ASK TO CANCEL</AppText>
            </Pressable>
            <AppText style={s.settingsGroupTitle}>TEAM DID NOT ARRIVE</AppText>
            <Pressable
              disabled={busy || !canReportNoShow}
              style={[
                s.outlineButton,
                (!canReportNoShow || busy) && s.buttonDisabled,
              ]}
              onPress={() =>
                run(
                  () =>
                    onReportNoShow(
                      match,
                      opponentTeamId,
                      details || "Team was not present at the agreed kickoff.",
                    ),
                  "No-show sent for confirmation",
                )
              }
            >
              <AppText style={s.buttonText}>REPORT OPPONENT NO-SHOW</AppText>
            </Pressable>
            {!canReportNoShow ? (
              <AppText style={s.formHelp}>
                No-shows can only be reported after the agreed kickoff.
              </AppText>
            ) : null}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function PersonSearchCard({
  profile,
  status = "AVAILABLE",
  teamName = "",
  action,
  secondaryAction,
}) {
  const details = [
    profile.role === "Referee"
      ? profile.category || profile.refereeRole || "Referee"
      : profile.position || "Position not added",
    ageFromDate(profile.dateOfBirth) || profile.ageBand,
    profile.area || "Area not added",
  ].filter(Boolean);
  return (
    <View style={s.personSearchCard}>
      {profile.profileImage || profile.logoUri ? (
        <Image
          source={{ uri: profile.profileImage || profile.logoUri }}
          style={s.personSearchImage}
        />
      ) : (
        <View style={[s.personSearchImage, s.personSearchFallback]}>
          <AppText style={s.profileImageInitials}>
            {initials(profile.name)}
          </AppText>
        </View>
      )}
      <View style={s.personSearchBody}>
        <AppText
          style={[
            s.personSearchStatus,
            status !== "AVAILABLE" && { color: C.redDark },
          ]}
        >
          {status}
        </AppText>
        <AppText style={s.personSearchName}>{profile.name}</AppText>
        <AppText style={s.meta}>{details.join(" · ")}</AppText>
        {teamName ? (
          <AppText style={s.personSearchTeam}>{teamName}</AppText>
        ) : null}
        <View style={s.personSearchActions}>
          {action}
          {secondaryAction}
        </View>
      </View>
    </View>
  );
}

function PostMatchFeedback({ match, close, onSave }) {
  const [refereeRating, setRefereeRating] = useState(0);
  const [conduct, setConduct] = useState("Praise");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={s.subHeader}>
        <Pressable onPress={close}>
          <Ionicons name="close" size={23} />
        </Pressable>
        <View style={{ marginLeft: 14 }}>
          <AppText style={s.headerTitle}>POST MATCH</AppText>
          <AppText style={s.headerSub}>PRIVATE QUALITY FEEDBACK</AppText>
        </View>
      </View>
      <View style={s.formIntro}>
        <AppText style={s.screenTitle}>How was the game?</AppText>
        <AppText style={s.body}>
          Rate the referee and record praise or concerns about the other team.
        </AppText>
        {match.refereeId ? (
          <>
            <AppText style={s.formLabel}>
              {match.refereeName || "Referee"} rating
            </AppText>
            <View style={s.optionWrap}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <Pressable
                  key={rating}
                  onPress={() => setRefereeRating(rating)}
                  style={[
                    s.formChoice,
                    refereeRating >= rating && s.formChoiceActive,
                  ]}
                >
                  <Ionicons
                    name="star"
                    size={18}
                    color={refereeRating >= rating ? C.white : C.gold}
                  />
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
        <ProfileChoiceGroup
          label="Other team conduct"
          options={["Praise", "Fair", "Complaint", "Report"]}
          value={conduct}
          onChange={setConduct}
        />
        <AppText style={s.formLabel}>What happened?</AppText>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          style={[s.formInput, { minHeight: 110, textAlignVertical: "top" }]}
          placeholder="Optional details about respect, organisation or safety"
          placeholderTextColor={C.muted}
        />
        <Pressable
          disabled={saving}
          style={[s.saveLineupButton, saving && s.buttonDisabled]}
          onPress={async () => {
            setSaving(true);
            try {
              await onSave({ refereeRating, conduct, note });
              Alert.alert(
                "Feedback saved",
                "Thank you for helping football improve.",
              );
              close();
            } catch (error) {
              Alert.alert(
                "Couldn’t save feedback",
                error?.message || "Please try again.",
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          <Ionicons name="heart-outline" size={18} color={C.white} />
          <AppText style={s.saveLineupText}>
            {saving ? "SAVING" : "SAVE FEEDBACK"}
          </AppText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function CommunityMatches({
  team,
  teams = [],
  challenges = [],
  matches = [],
  publicProfiles = [],
  onRespond,
  onNegotiate,
  onRequestReferee,
  conversations = [],
  currentUid,
  onCompleteMatch,
  onApproveReferee,
  onRejectReferee,
  onConfirmResult,
  onDisputeResult,
  onRequestReschedule,
  onRespondReschedule,
  onRequestCancellation,
  onRespondCancellation,
  onReportNoShow,
  onRespondNoShow,
  canManageMatch = false,
  onSaveReview,
  matchReviews = [],
}) {
  const { width } = useWindowDimensions();
  const compact = width < 390;
  const [view, setView] = useState("Upcoming");
  const [match, setMatch] = useState(null);
  const [negotiating, setNegotiating] = useState(null);
  const [refereeMatch, setRefereeMatch] = useState(null);
  const [refereeFee, setRefereeFee] = useState("25");
  const [busyRequestId, setBusyRequestId] = useState(null);
  const [captainChat, setCaptainChat] = useState(null);
  const [captainMessages, setCaptainMessages] = useState([]);
  const [captainDraft, setCaptainDraft] = useState("");
  const [resultDetail, setResultDetail] = useState(null);
  const [resultApproval, setResultApproval] = useState(null);
  const [confirmingResult, setConfirmingResult] = useState(false);
  const [disputingResult, setDisputingResult] = useState(false);
  const [proposedHomeScore, setProposedHomeScore] = useState("");
  const [proposedAwayScore, setProposedAwayScore] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [reviewMatch, setReviewMatch] = useState(null);
  const [fixtureIssue, setFixtureIssue] = useState(null);
  useEffect(() => {
    if (!captainChat?.id) return undefined;
    return subscribeConversationMessages(
      captainChat.id,
      setCaptainMessages,
      () => setCaptainMessages([]),
    );
  }, [captainChat]);
  const requests = challenges
    .filter((item) => ["pending", "negotiating"].includes(item.status))
    .map((item) => {
      const opponentId =
        item.senderTeamId === team?.id
          ? item.recipientTeamId
          : item.senderTeamId;
      const opponent = teams.find((candidate) => candidate.id === opponentId);
      return {
        ...item,
        name:
          opponent?.name ||
          (item.senderTeamId === team?.id
            ? item.recipientTeamName
            : item.senderTeamName),
        area:
          item.recipientTeamId === team?.id
            ? "Challenge received"
            : "Challenge sent",
        when: `${formatStoredDate(item.terms?.day)} · ${item.terms?.time || ""} · ${item.terms?.venue || "Venue to agree"} · $${item.terms?.fee || "0"} each`,
        opponent,
      };
    });
  const upcoming = matches
    .filter((item) =>
      ["confirmed", "result_pending", "result_disputed"].includes(item.status),
    )
    .sort((first, second) => {
      const firstPriority = first.matchType === "league" ? 0 : 1;
      const secondPriority = second.matchType === "league" ? 0 : 1;
      if (firstPriority !== secondPriority)
        return firstPriority - secondPriority;
      return `${first.matchDate || ""} ${first.kickoff || ""}`.localeCompare(
        `${second.matchDate || ""} ${second.kickoff || ""}`,
      );
    });
  const teamReviews = matchReviews.filter(
    (review) => review.teamId === team?.id && Number(review.refereeRating || 0),
  );
  const refereeShouldBeLast = (profile) => {
    const lowUndisputedReview = teamReviews.some((review) => {
      if (
        review.refereeId !== profile.ownerId ||
        Number(review.refereeRating || 0) > 3
      )
        return false;
      const reviewedMatch = matches.find((item) => item.id === review.matchId);
      return reviewedMatch && !reviewedMatch.activeDisputeId;
    });
    const otherRatings = teamReviews
      .filter((review) => review.refereeId !== profile.ownerId)
      .map((review) => Number(review.refereeRating || 0))
      .filter(Boolean);
    const usualRating =
      otherRatings.reduce((sum, rating) => sum + rating, 0) /
      Math.max(otherRatings.length, 1);
    return lowUndisputedReview && otherRatings.length > 0 && usualRating >= 4;
  };
  const nearbyReferees = prioritizeByLocation(
    publicProfiles.filter(
      (profile) => profile.role === "Referee" && profile.availability !== false,
    ),
    team?.area,
  ).sort((first, second) => {
    const lowPriorityDifference =
      Number(refereeShouldBeLast(first)) - Number(refereeShouldBeLast(second));
    if (lowPriorityDifference) return lowPriorityDifference;
    const qualificationScore = (profile) =>
      (profile.refereePath === "Association registered" ? 100 : 0) +
      Number(profile.certificateLevel || 0) * 10 +
      Number(profile.matchesRefereed || 0);
    return qualificationScore(second) - qualificationScore(first);
  });
  const results = matches
    .filter(
      (item) =>
        ["result_pending", "result_disputed", "completed"].includes(
          item.status,
        ) && item.result,
    )
    .map((item) => ({
      id: item.id,
      home: item.homeTeamName,
      away: item.awayTeamName,
      date: formatStoredDate(item.matchDate),
      homeScore: item.result.homeScore,
      awayScore: item.result.awayScore,
      homeScorers: (item.result.events || [])
        .filter((event) => event.type === "Goal" && event.side === "home")
        .map((event) => `${event.player} ${event.minute}′`)
        .join(", "),
      awayScorers: (item.result.events || [])
        .filter((event) => event.type === "Goal" && event.side === "away")
        .map((event) => `${event.player} ${event.minute}′`)
        .join(", "),
      status:
        item.status === "completed"
          ? "Verified"
          : item.status === "result_disputed"
            ? "Correction requested"
            : "Awaiting opponent",
      match: item,
    }));
  useEffect(() => {
    if (
      challenges.some(
        (item) =>
          item.status === "negotiating" && item.recipientTeamId === team?.id,
      )
    )
      setView("Requests");
  }, [challenges, team?.id]);
  const opponentFor = (request) => {
    const opponentId =
      request.senderTeamId === team?.id
        ? request.recipientTeamId
        : request.senderTeamId;
    return (
      teams.find((item) => item.id === opponentId) || {
        id: opponentId,
        name:
          request.senderTeamId === team?.id
            ? request.recipientTeamName
            : request.senderTeamName,
      }
    );
  };
  if (reviewMatch)
    return (
      <PostMatchFeedback
        match={reviewMatch}
        close={() => setReviewMatch(null)}
        onSave={(review) => onSaveReview?.(reviewMatch, review)}
      />
    );
  if (fixtureIssue)
    return (
      <FixtureAccountabilityScreen
        match={fixtureIssue}
        team={team}
        close={() => setFixtureIssue(null)}
        onRequestReschedule={onRequestReschedule}
        onRespondReschedule={onRespondReschedule}
        onRequestCancellation={onRequestCancellation}
        onRespondCancellation={onRespondCancellation}
        onReportNoShow={onReportNoShow}
        onRespondNoShow={onRespondNoShow}
      />
    );
  if (resultApproval) {
    const approvalHome = teams.find(
      (candidate) => candidate.id === resultApproval.homeTeamId,
    ) || {
      name: resultApproval.homeTeamName,
    };
    const approvalAway = teams.find(
      (candidate) => candidate.id === resultApproval.awayTeamId,
    ) || {
      name: resultApproval.awayTeamName,
    };
    const approvalEvents = resultApproval.result?.events || [];
    const homeScore = Number(resultApproval.result?.homeScore || 0);
    const awayScore = Number(resultApproval.result?.awayScore || 0);
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={s.subHeader}>
          <Pressable onPress={() => setResultApproval(null)}>
            <Ionicons name="close" size={24} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <AppText style={s.headerTitle}>REVIEW SCORE</AppText>
            <AppText style={s.headerSub}>CHECK BEFORE YOU CONFIRM</AppText>
          </View>
        </View>
        <View style={s.scoreConfirmation}>
          <AppText style={s.scoreConfirmationDate}>
            {formatStoredDate(resultApproval.matchDate)} · Full time
          </AppText>
          <View
            style={[
              s.scoreConfirmationTeams,
              compact && s.scoreConfirmationTeamsCompact,
            ]}
          >
            <View style={s.scoreConfirmationSide}>
              <CrestPreview
                shape={approvalHome.crest?.shape || 0}
                color={approvalHome.crest?.color || C.redDark}
                label={approvalHome.crest?.label || initials(approvalHome.name)}
                small
              />
              <AppText style={s.scoreConfirmationTeam} numberOfLines={2}>
                {approvalHome.name}
              </AppText>
              <AppText style={s.scoreConfirmationSideLabel}>HOME</AppText>
            </View>
            <View style={s.scoreConfirmationScoreBlock}>
              <AppText style={s.scoreConfirmationScore}>
                {homeScore}
                <AppText style={s.scoreConfirmationDivider}> : </AppText>
                {awayScore}
              </AppText>
              <AppText style={s.scoreConfirmationPrompt}>
                Is this correct?
              </AppText>
            </View>
            <View style={[s.scoreConfirmationSide, { alignItems: "flex-end" }]}>
              <CrestPreview
                shape={approvalAway.crest?.shape || 0}
                color={approvalAway.crest?.color || C.red}
                label={approvalAway.crest?.label || initials(approvalAway.name)}
                small
              />
              <AppText
                style={[s.scoreConfirmationTeam, { textAlign: "right" }]}
                numberOfLines={2}
              >
                {approvalAway.name}
              </AppText>
              <AppText style={s.scoreConfirmationSideLabel}>AWAY</AppText>
            </View>
          </View>
          <View style={s.scoreConfirmationNote}>
            <Ionicons name="shield-checkmark-outline" size={19} color={C.red} />
            <AppText style={s.scoreConfirmationNoteText}>
              Confirming makes this score official and updates the table.
            </AppText>
          </View>
          {resultApproval.resultCorrectionDeadline ? (
            <View style={s.settingRow}>
              <Ionicons name="hourglass-outline" size={20} color={C.red} />
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>Correction deadline</AppText>
                <AppText style={s.meta}>
                  {new Date(
                    resultApproval.resultCorrectionDeadline,
                  ).toLocaleString()}
                  {" · "}Both teams are accountable if it expires unresolved.
                </AppText>
              </View>
            </View>
          ) : null}
          <AppText style={s.settingsGroupTitle}>RECORDED EVENTS</AppText>
          {approvalEvents.map((event, index) => (
            <View
              style={s.settingRow}
              key={event.id || `${event.type}-${index}`}
            >
              <Ionicons
                name={
                  event.type === "Goal" ? "football-outline" : "card-outline"
                }
                size={20}
                color={event.type === "Yellow card" ? C.gold : C.red}
              />
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>{event.player || event.type}</AppText>
                <AppText style={s.meta}>
                  {event.minute}′ ·{" "}
                  {event.side === "home"
                    ? approvalHome.name
                    : approvalAway.name}
                  {event.assister ? ` · assist ${event.assister}` : ""}
                </AppText>
              </View>
            </View>
          ))}
          {!approvalEvents.length ? (
            <AppText style={s.body}>
              No scorer or card events were submitted.
            </AppText>
          ) : null}
          <Pressable
            disabled={confirmingResult}
            style={[s.saveLineupButton, confirmingResult && s.buttonDisabled]}
            onPress={async () => {
              setConfirmingResult(true);
              try {
                await onConfirmResult?.(resultApproval);
                setResultApproval(null);
                setView("Results");
                Alert.alert(
                  "Result confirmed",
                  `${approvalHome.name} ${homeScore} : ${awayScore} ${approvalAway.name}. Statistics are now updated.`,
                );
              } catch (error) {
                Alert.alert(
                  "Couldn’t confirm result",
                  error?.message || "Please try again.",
                );
              } finally {
                setConfirmingResult(false);
              }
            }}
          >
            {confirmingResult ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Ionicons
                name="checkmark-done-outline"
                size={18}
                color={C.white}
              />
            )}
            <AppText style={s.saveLineupText}>
              {confirmingResult
                ? "CONFIRMING SCORE"
                : `CONFIRM ${homeScore} : ${awayScore}`}
            </AppText>
          </Pressable>
          <Pressable
            disabled={confirmingResult}
            style={s.outlineButton}
            onPress={() => {
              setDisputingResult((current) => !current);
              setProposedHomeScore(String(homeScore));
              setProposedAwayScore(String(awayScore));
            }}
          >
            <AppText style={s.buttonText}>THIS SCORE IS WRONG</AppText>
          </Pressable>
          {disputingResult ? (
            <View style={s.scoreCorrectionPanel}>
              <AppText style={s.team}>Propose the correct score</AppText>
              <View style={s.scoreCorrectionInputs}>
                <View style={{ flex: 1 }}>
                  <AppText style={s.formLabel}>{approvalHome.name}</AppText>
                  <TextInput
                    value={proposedHomeScore}
                    onChangeText={(value) =>
                      setProposedHomeScore(numbersOnly(value))
                    }
                    keyboardType="number-pad"
                    style={s.formInput}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={s.formLabel}>{approvalAway.name}</AppText>
                  <TextInput
                    value={proposedAwayScore}
                    onChangeText={(value) =>
                      setProposedAwayScore(numbersOnly(value))
                    }
                    keyboardType="number-pad"
                    style={s.formInput}
                  />
                </View>
              </View>
              <AppText style={s.formLabel}>What needs checking?</AppText>
              <TextInput
                value={disputeReason}
                onChangeText={setDisputeReason}
                multiline
                placeholder="Keep it factual and short"
                placeholderTextColor={C.muted}
                style={[s.formInput, s.grassrootsTextArea]}
              />
              <Pressable
                disabled={confirmingResult || !disputeReason.trim()}
                style={[
                  s.saveLineupButton,
                  (confirmingResult || !disputeReason.trim()) &&
                    s.buttonDisabled,
                ]}
                onPress={async () => {
                  setConfirmingResult(true);
                  try {
                    await onDisputeResult?.(
                      resultApproval,
                      {
                        homeScore: Number(proposedHomeScore || 0),
                        awayScore: Number(proposedAwayScore || 0),
                      },
                      disputeReason,
                    );
                    setResultApproval(null);
                    setDisputingResult(false);
                    setDisputeReason("");
                    Alert.alert(
                      "Correction sent",
                      "Rankings will not change until a corrected score is submitted and confirmed.",
                    );
                  } catch (error) {
                    Alert.alert(
                      "Couldn’t send correction",
                      error?.message || "Please try again.",
                    );
                  } finally {
                    setConfirmingResult(false);
                  }
                }}
              >
                <AppText style={s.saveLineupText}>
                  SEND SCORE CORRECTION
                </AppText>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    );
  }
  if (resultDetail) {
    const detailEvents = resultDetail.match.result?.events || [];
    const detailHome = teams.find(
      (candidate) => candidate.id === resultDetail.match.homeTeamId,
    ) || { name: resultDetail.home };
    const detailAway = teams.find(
      (candidate) => candidate.id === resultDetail.match.awayTeamId,
    ) || { name: resultDetail.away };
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={s.subHeader}>
          <Pressable onPress={() => setResultDetail(null)}>
            <Ionicons name="arrow-back" size={23} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <AppText style={s.headerTitle}>MATCH DETAILS</AppText>
            <AppText style={s.headerSub}>{resultDetail.date}</AppText>
          </View>
          <Ionicons name="checkmark-circle" size={19} color={C.green} />
        </View>
        <View style={s.matchStoryScore}>
          <AppText style={s.matchStoryState}>Full time</AppText>
          <View style={s.matchStoryTeams}>
            <View style={s.matchStorySide}>
              <CrestPreview
                shape={detailHome.crest?.shape || 0}
                color={detailHome.crest?.color || C.redDark}
                label={detailHome.crest?.label || initials(detailHome.name)}
                small
              />
              <AppText style={s.matchStoryTeam} numberOfLines={2}>
                {detailHome.name}
              </AppText>
              <AppText style={s.matchStoryVenueLabel}>HOME</AppText>
            </View>
            <View style={s.matchStoryScoreBlock}>
              <AppText style={s.matchStoryScoreValue}>
                {resultDetail.homeScore} : {resultDetail.awayScore}
              </AppText>
              <AppText style={s.matchStoryVerified}>VERIFIED</AppText>
            </View>
            <View style={[s.matchStorySide, { alignItems: "flex-end" }]}>
              <CrestPreview
                shape={detailAway.crest?.shape || 0}
                color={detailAway.crest?.color || C.red}
                label={detailAway.crest?.label || initials(detailAway.name)}
                small
              />
              <AppText
                style={[s.matchStoryTeam, { textAlign: "right" }]}
                numberOfLines={2}
              >
                {detailAway.name}
              </AppText>
              <AppText style={s.matchStoryVenueLabel}>AWAY</AppText>
            </View>
          </View>
        </View>
        <View style={s.matchStoryBody}>
          <AppText style={s.matchStorySectionTitle}>Match events</AppText>
          {detailEvents.map((event, index) => (
            <View
              style={s.matchStoryEvent}
              key={event.id || `${event.type}-${index}`}
            >
              <AppText style={s.matchStoryMinute}>{event.minute || 0}′</AppText>
              <View style={s.matchStoryEventMark}>
                <Ionicons
                  name={
                    event.type === "Goal" ? "football-outline" : "card-outline"
                  }
                  size={17}
                  color={event.type === "Yellow card" ? C.gold : C.red}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>
                  {event.player || event.type || "Match event"}
                </AppText>
                <AppText style={s.meta}>
                  {event.type || "Event"} ·{" "}
                  {event.side === "home" ? detailHome.name : detailAway.name}
                  {event.assister ? ` · Assist ${event.assister}` : ""}
                </AppText>
              </View>
            </View>
          ))}
          {!detailEvents.length ? (
            <View style={s.chatEmpty}>
              <Ionicons name="football-outline" size={26} color={C.muted} />
              <AppText style={s.team}>No match events recorded</AppText>
              <AppText style={s.body}>
                The verified score remains part of both teams’ records.
              </AppText>
            </View>
          ) : null}
        </View>
      </ScrollView>
    );
  }
  if (negotiating) {
    const opponent = opponentFor(negotiating);
    return (
      <ChallengeWizard
        team={opponent}
        ownTeam={team}
        existingRequest={negotiating}
        matches={matches}
        onSubmit={(terms) => onNegotiate(negotiating, terms)}
        close={() => setNegotiating(null)}
      />
    );
  }
  if (captainChat)
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.subHeader}>
          <Pressable onPress={() => setCaptainChat(null)}>
            <Ionicons name="arrow-back" size={23} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <AppText style={s.headerTitle}>{captainChat.title}</AppText>
            <AppText style={s.headerSub}>
              COACHES AND CAPTAINS · PRIVATE
            </AppText>
          </View>
          <Ionicons name="lock-closed" size={17} color={C.green} />
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 8 }}
        >
          {!captainMessages.length ? (
            <View style={s.emptyState}>
              <Ionicons name="chatbubble-outline" size={30} color={C.muted} />
              <AppText style={s.team}>Start the match conversation</AppText>
              <AppText style={s.body}>
                Both teams’ coaches and captains can use this room for game
                logistics. It closes automatically after the match.
              </AppText>
            </View>
          ) : null}
          {captainMessages.map((message) => (
            <View
              key={message.id}
              style={[
                s.chatBubble,
                message.senderId === currentUid && s.chatBubbleOwn,
              ]}
            >
              <AppText
                style={[
                  s.body,
                  message.senderId === currentUid && { color: C.white },
                ]}
              >
                {message.text}
              </AppText>
            </View>
          ))}
        </ScrollView>
        <View style={s.chatComposer}>
          <TextInput
            value={captainDraft}
            onChangeText={setCaptainDraft}
            placeholder="Message the other team staff"
            placeholderTextColor={C.muted}
            style={s.chatInput}
          />
          <Pressable
            disabled={!captainDraft.trim()}
            style={[s.chatSend, !captainDraft.trim() && s.buttonDisabled]}
            onPress={async () => {
              const text = captainDraft.trim();
              if (!text) return;
              setCaptainDraft("");
              try {
                await sendConversationMessage(captainChat.id, currentUid, text);
              } catch {
                Alert.alert(
                  "Couldn’t send message",
                  "Please check your connection and try again.",
                );
              }
            }}
          >
            <Ionicons name="send" color="white" size={17} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  if (refereeMatch)
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={s.subHeader}>
          <Pressable onPress={() => setRefereeMatch(null)}>
            <Ionicons name="arrow-back" size={23} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <AppText style={s.headerTitle}>CHOOSE A REFEREE</AppText>
            <AppText style={s.headerSub}>
              {refereeMatch.homeTeamName} VS {refereeMatch.awayTeamName}
            </AppText>
          </View>
        </View>
        <View style={s.formIntro}>
          <AppText style={s.screenTitle}>Agree the official</AppText>
          <AppText style={s.body}>
            Nearby referees appear first. The fee remains visible as part of the
            match agreement.
          </AppText>
          <AppText style={s.formLabel}>Referee fee</AppText>
          <View style={s.moneyInput}>
            <AppText style={s.moneyPrefix}>$</AppText>
            <TextInput
              value={refereeFee}
              onChangeText={(value) => setRefereeFee(numbersOnly(value))}
              keyboardType="number-pad"
              style={s.moneyTextInput}
            />
          </View>
        </View>
        <View style={s.communityListSection}>
          {nearbyReferees.map((profile) => (
            <PersonSearchCard
              key={profile.id}
              profile={profile}
              status={
                profile.refereePath === "Association registered"
                  ? "ASSOCIATION REGISTERED"
                  : "COMMUNITY REFEREE"
              }
              action={
                <Pressable
                  style={s.join}
                  onPress={async () => {
                    try {
                      await onRequestReferee(refereeMatch, profile, refereeFee);
                      setRefereeMatch(null);
                    } catch (error) {
                      Alert.alert(
                        "Couldn’t request referee",
                        error?.message ||
                          "Please check your connection and try again.",
                      );
                    }
                  }}
                >
                  <AppText style={s.buttonText}>
                    PROPOSE ${refereeFee || "0"}
                  </AppText>
                </Pressable>
              }
            />
          ))}
          {!nearbyReferees.length ? (
            <View style={s.emptyState}>
              <Ionicons name="flag-outline" size={30} color={C.muted} />
              <AppText style={s.team}>No referees available yet</AppText>
              <AppText style={s.body}>
                Saved referee profiles near your team will appear first.
              </AppText>
            </View>
          ) : null}
        </View>
      </ScrollView>
    );
  if (match)
    return (
      <MatchFlowScreen
        match={match}
        close={() => setMatch(null)}
        finish={async (result) => {
          if (match.canonicalId && onCompleteMatch)
            await onCompleteMatch(match.canonicalId, result);
          setMatch(null);
          setView("Results");
        }}
      />
    );
  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <BrandHeader title="MATCHES" />
        <View style={s.screenIntro}>
          <AppText style={s.screenTitle}>Match centre</AppText>
          <AppText style={s.body}>
            Arrange, confirm and record every community game.
          </AppText>
        </View>
        <View style={s.communitySegments}>
          {["Upcoming", "Requests", "Results"].map((item) => (
            <Pressable
              key={item}
              onPress={() => setView(item)}
              style={[
                s.communitySegment,
                view === item && s.communitySegmentActive,
              ]}
            >
              <AppText
                style={[
                  s.communitySegmentText,
                  view === item && s.communitySegmentTextActive,
                ]}
              >
                {item}
              </AppText>
              {item === "Requests" && requests.length ? (
                <View style={s.segmentBadge}>
                  <AppText style={s.segmentBadgeText}>
                    {requests.length}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
        <View style={s.communityListSection}>
          {view === "Upcoming" && (
            <View style={s.communityMatchCard}>
              {upcoming.length ? (
                upcoming.map((item) => {
                  const home = teams.find(
                    (candidate) => candidate.id === item.homeTeamId,
                  ) || { name: item.homeTeamName };
                  const away = teams.find(
                    (candidate) => candidate.id === item.awayTeamId,
                  ) || { name: item.awayTeamName };
                  const captainConversation = conversations.find(
                    (conversation) =>
                      ["match", "captains"].includes(conversation.scope) &&
                      conversation.archived !== true &&
                      conversation.teamIds?.includes(item.homeTeamId) &&
                      conversation.teamIds?.includes(item.awayTeamId),
                  );
                  const teamMatch = Boolean(
                    team?.id && item.participantTeamIds?.includes(team.id),
                  );
                  const ownMatch = teamMatch || item.refereeId === currentUid;
                  const pendingFixtureIssue =
                    item.rescheduleStatus === "pending" ||
                    item.cancellationStatus === "pending" ||
                    item.noShowStatus === "pending_confirmation";
                  const needsThisTeamRefApproval =
                    teamMatch &&
                    item.refereeStatus === "team_confirmation" &&
                    !item.refereeTeamApprovalIds?.includes(team.id);
                  const needsThisTeamResultConfirmation =
                    teamMatch &&
                    item.status === "result_pending" &&
                    item.resultConfirmationTeamId === team.id;
                  return (
                    <UpcomingMatchCard
                      key={item.id}
                      match={item}
                      teams={teams}
                      onFindReferee={
                        teamMatch &&
                        !pendingFixtureIssue &&
                        item.refereeStatus === "needed"
                          ? () => {
                              setRefereeFee(
                                String(item.proposedRefereeFee || "25"),
                              );
                              setRefereeMatch(item);
                            }
                          : undefined
                      }
                      onOpenChat={
                        canManageMatch && teamMatch
                          ? async () => {
                              if (captainConversation) {
                                setCaptainChat(captainConversation);
                                return;
                              }
                              try {
                                const [storedHome, storedAway] =
                                  await Promise.all([
                                    home.ownerId
                                      ? home
                                      : loadTeamRecord(item.homeTeamId),
                                    away.ownerId
                                      ? away
                                      : loadTeamRecord(item.awayTeamId),
                                  ]);
                                const conversation =
                                  await ensureCaptainConversation(
                                    storedHome,
                                    storedAway,
                                    item.id,
                                    item.challengeId || "",
                                  );
                                setCaptainChat({
                                  ...conversation,
                                  title: `${storedHome.name} vs ${storedAway.name} logistics`,
                                  teamIds: [storedHome.id, storedAway.id],
                                  matchId: item.id,
                                });
                              } catch (error) {
                                Alert.alert(
                                  "Chat is not ready",
                                  error?.message ||
                                    "Please try opening the game chat again.",
                                );
                              }
                            }
                          : undefined
                      }
                      onOpenMatch={
                        canManageMatch &&
                        teamMatch &&
                        !pendingFixtureIssue &&
                        (item.status === "confirmed" ||
                          (item.status === "result_disputed" &&
                            item.disputedByTeamId !== team.id))
                          ? () =>
                              setMatch({
                                ...item,
                                canonicalId: item.id,
                                home: home.name,
                                away: away.name,
                                day: formatStoredDate(item.matchDate),
                                time: item.kickoff,
                                displayStatus: "Confirmed",
                                roster: publicProfiles
                                  .filter(
                                    (profile) =>
                                      profile.role === "Player" &&
                                      [
                                        ...(home.memberIds || []),
                                        ...(away.memberIds || []),
                                      ].includes(profile.ownerId),
                                  )
                                  .map((profile) => profile.name),
                              })
                          : undefined
                      }
                      isOwnMatch={ownMatch}
                      onApproveReferee={
                        canManageMatch &&
                        !pendingFixtureIssue &&
                        needsThisTeamRefApproval
                          ? () => onApproveReferee?.(item)
                          : undefined
                      }
                      onRejectReferee={
                        canManageMatch &&
                        !pendingFixtureIssue &&
                        needsThisTeamRefApproval
                          ? () => onRejectReferee?.(item)
                          : undefined
                      }
                      onConfirmResult={
                        canManageMatch &&
                        !pendingFixtureIssue &&
                        needsThisTeamResultConfirmation
                          ? () => setResultApproval(item)
                          : undefined
                      }
                      onManageFixture={
                        canManageMatch &&
                        teamMatch &&
                        (item.status === "confirmed" ||
                          item.rescheduleStatus === "pending" ||
                          item.cancellationStatus === "pending" ||
                          item.noShowStatus === "pending_confirmation")
                          ? () => setFixtureIssue(item)
                          : undefined
                      }
                      viewerTeamId={team?.id}
                    />
                  );
                })
              ) : (
                <View style={s.emptyState}>
                  <Ionicons name="calendar-outline" size={30} color={C.muted} />
                  <AppText style={s.team}>No upcoming matches</AppText>
                  <AppText style={s.body}>
                    Matches you arrange will appear here.
                  </AppText>
                </View>
              )}
            </View>
          )}
          {view === "Requests" &&
            requests.map((item) => (
              <View style={s.requestRow} key={item.id}>
                <CrestPreview
                  shape={item.opponent?.crest?.shape || 0}
                  color={item.opponent?.crest?.color || C.redDark}
                  label={item.opponent?.crest?.label || initials(item.name)}
                  small
                />
                <View style={{ flex: 1 }}>
                  <AppText style={s.team}>{item.name}</AppText>
                  <AppText style={s.meta}>
                    {item.area} · {item.when}
                  </AppText>
                  <AppText style={s.bestMatch}>
                    MATCH FEE ${item.terms?.fee || "0"} PER TEAM
                  </AppText>
                  <View style={s.requestActions}>
                    <Pressable
                      disabled={
                        item.recipientTeamId !== team?.id ||
                        busyRequestId === item.id
                      }
                      style={[
                        s.acceptButton,
                        item.recipientTeamId !== team?.id && s.buttonDisabled,
                      ]}
                      onPress={async () => {
                        setBusyRequestId(item.id);
                        try {
                          await onRespond(item, "accepted");
                          setView("Upcoming");
                        } catch (error) {
                          Alert.alert(
                            "Couldn’t accept match",
                            "The match could not be confirmed. Please try again.",
                          );
                        } finally {
                          setBusyRequestId(null);
                        }
                      }}
                    >
                      <AppText style={s.primaryText}>
                        {busyRequestId === item.id
                          ? "Accepting"
                          : item.recipientTeamId === team?.id
                            ? "Accept"
                            : "Waiting"}
                      </AppText>
                    </Pressable>
                    <Pressable
                      style={s.declineButton}
                      onPress={() => setNegotiating(item)}
                    >
                      <AppText style={s.buttonText}>Negotiate</AppText>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          {view === "Requests" && requests.length === 0 && (
            <View style={s.emptyState}>
              <Ionicons
                name="checkmark-circle-outline"
                size={34}
                color={C.green}
              />
              <AppText style={s.team}>You’re all caught up</AppText>
              <AppText style={s.body}>
                New match requests will appear here.
              </AppText>
            </View>
          )}
          {view === "Results" &&
            results.map((result) => (
              <View style={s.resultListItem} key={result.id}>
                <View style={s.resultListHead}>
                  <AppText style={s.resultListDate}>
                    {result.date} · Full time
                  </AppText>
                  <View
                    style={[
                      s.statusBadge,
                      result.status === "Verified"
                        ? s.statusBadgeSuccess
                        : s.statusBadgePending,
                    ]}
                  >
                    <AppText style={s.statusBadgeText}>{result.status}</AppText>
                  </View>
                </View>
                <View
                  style={[
                    s.resultListScoreLine,
                    compact && s.resultListScoreLineCompact,
                  ]}
                >
                  <View style={s.resultListTeam}>
                    <CrestPreview
                      shape={
                        teams.find(
                          (candidate) =>
                            candidate.id === result.match.homeTeamId,
                        )?.crest?.shape || 0
                      }
                      color={
                        teams.find(
                          (candidate) =>
                            candidate.id === result.match.homeTeamId,
                        )?.crest?.color || C.redDark
                      }
                      label={initials(result.home)}
                      small
                    />
                    <AppText style={s.resultListTeamName} numberOfLines={2}>
                      {result.home}
                    </AppText>
                    <AppText style={s.resultListScorers} numberOfLines={2}>
                      {result.homeScorers}
                    </AppText>
                  </View>
                  <AppText style={s.resultListScore}>
                    {result.homeScore} : {result.awayScore}
                  </AppText>
                  <View style={[s.resultListTeam, { alignItems: "flex-end" }]}>
                    <CrestPreview
                      shape={
                        teams.find(
                          (candidate) =>
                            candidate.id === result.match.awayTeamId,
                        )?.crest?.shape || 0
                      }
                      color={
                        teams.find(
                          (candidate) =>
                            candidate.id === result.match.awayTeamId,
                        )?.crest?.color || C.red
                      }
                      label={initials(result.away)}
                      small
                    />
                    <AppText
                      style={[s.resultListTeamName, { textAlign: "right" }]}
                      numberOfLines={2}
                    >
                      {result.away}
                    </AppText>
                    <AppText
                      style={[s.resultListScorers, { textAlign: "right" }]}
                      numberOfLines={2}
                    >
                      {result.awayScorers}
                    </AppText>
                  </View>
                </View>
                <View style={s.resultListActions}>
                  <Pressable
                    onPress={() => setResultDetail(result)}
                    style={s.resultListAction}
                  >
                    <AppText style={s.communitySeeAll}>MATCH DETAILS</AppText>
                  </Pressable>
                  {canManageMatch &&
                  result.match.participantTeamIds?.includes(team?.id) ? (
                    <Pressable
                      onPress={() => setReviewMatch(result.match)}
                      style={s.resultListAction}
                    >
                      <AppText style={s.communitySeeAll}>
                        REVIEW CONDUCT
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          {view === "Results" && results.length === 0 && (
            <View style={s.emptyState}>
              <Ionicons name="trophy-outline" size={30} color={C.muted} />
              <AppText style={s.team}>No results yet</AppText>
              <AppText style={s.body}>
                Completed matches will build your record here.
              </AppText>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

function DraggablePitchPlayer({
  player,
  index,
  position,
  custom,
  pitchSize,
  goalkeeper,
  selectedBench,
  benchName,
  onSwap,
  onMove,
  onDragStateChange,
}) {
  const drag = useRef(new Animated.ValueXY()).current;
  const positionRef = useRef(position);
  const pitchRef = useRef(pitchSize);
  const customRef = useRef(custom);
  positionRef.current = position;
  pitchRef.current = pitchSize;
  customRef.current = custom;
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => customRef.current,
      onStartShouldSetPanResponderCapture: () => customRef.current,
      onMoveShouldSetPanResponder: (_, gesture) =>
        customRef.current &&
        (Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2),
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        customRef.current &&
        (Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2),
      onPanResponderGrant: () => onDragStateChange?.(true),
      onPanResponderMove: (_, gesture) =>
        drag.setValue({ x: gesture.dx, y: gesture.dy }),
      onPanResponderRelease: (_, gesture) => {
        const x = Math.max(
          7,
          Math.min(
            93,
            positionRef.current[0] +
              (gesture.dx / Math.max(1, pitchRef.current.width)) * 100,
          ),
        );
        const y = Math.max(
          7,
          Math.min(
            93,
            positionRef.current[1] +
              (gesture.dy / Math.max(1, pitchRef.current.height)) * 100,
          ),
        );
        drag.setValue({ x: 0, y: 0 });
        onMove(index, x, y);
        onDragStateChange?.(false);
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => {
        drag.setValue({ x: 0, y: 0 });
        onDragStateChange?.(false);
      },
      onShouldBlockNativeResponder: () => customRef.current,
    }),
  ).current;
  return (
    <Animated.View
      {...responder.panHandlers}
      style={[
        s.lineupPlayer,
        {
          left: `${position[0]}%`,
          top: `${position[1]}%`,
          zIndex: custom ? 2 : 1,
          transform: drag.getTranslateTransform(),
        },
      ]}
    >
      <Pressable
        disabled={custom}
        onPress={() => onSwap(index)}
        accessibilityRole="button"
        accessibilityLabel={
          custom
            ? `Drag ${player.name || "empty slot"}, number ${player.number}`
            : selectedBench == null
              ? `${player.name || "Empty slot"}, number ${player.number}`
              : `Replace ${player.name || "empty slot"} with ${benchName || "empty slot"}`
        }
      >
        <View
          style={[
            s.lineupPlayerDisc,
            goalkeeper && s.lineupGoalkeeperDisc,
            custom && s.lineupPlayerDiscSelected,
          ]}
        >
          <AppText style={s.lineupPlayerNumber}>{player.number}</AppText>
        </View>
        <AppText style={s.lineupPlayerName}>{player.name || "Open"}</AppText>
      </Pressable>
    </Animated.View>
  );
}

function CommunitySquad({ team, onSave, rosterProfiles = [] }) {
  const savedLineup = team?.lineup;
  const rosterPlayers = rosterProfiles.map((profile, index) => ({
    number: Number(profile.shirtNumber || index + 1),
    name: profile.name || "Player",
    ownerId: profile.ownerId,
  }));
  const rosterStarters = [...rosterPlayers, ...emptyFormationSlots].slice(
    0,
    11,
  );
  const rosterBench = [...rosterPlayers.slice(11), ...emptyBenchSlots].slice(
    0,
    5,
  );
  const [formation, setFormation] = useState(savedLineup?.formation || "4-4-2");
  const [starters, setStarters] = useState(
    savedLineup?.starters?.length
      ? savedLineup.starters
      : lineupPlayers.length
        ? lineupPlayers
        : rosterStarters,
  );
  const [bench, setBench] = useState(
    savedLineup?.bench?.length
      ? savedLineup.bench
      : benchPlayers.length
        ? benchPlayers
        : rosterBench,
  );
  const [selectedBench, setSelectedBench] = useState(null);
  const [pitchSize, setPitchSize] = useState({ width: 1, height: 510 });
  const [draggingPlayer, setDraggingPlayer] = useState(false);
  const [customLayout, setCustomLayout] = useState(
    savedLineup?.customLayout?.length
      ? savedLineup.customLayout
      : formationLayouts["4-4-2"].map((position) => [...position]),
  );
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!team?.lineup) return;
    setFormation(team.lineup.formation || "4-4-2");
    setStarters(
      team.lineup.starters?.length ? team.lineup.starters : emptyFormationSlots,
    );
    setBench(team.lineup.bench?.length ? team.lineup.bench : emptyBenchSlots);
    setCustomLayout(
      team.lineup.customLayout?.length
        ? team.lineup.customLayout
        : formationLayouts["4-4-2"].map((position) => [...position]),
    );
    setSaved(true);
  }, [team?.id, team?.lineup]);
  useEffect(() => {
    if (team?.lineup || !rosterPlayers.length) return;
    setStarters(rosterStarters);
    setBench(rosterBench);
  }, [team?.id, rosterProfiles.map((profile) => profile.id).join("|")]);
  const layout =
    formation === "Custom" ? customLayout : formationLayouts[formation];
  const swapPlayer = (index) => {
    if (selectedBench == null) return;
    const nextStarters = [...starters];
    const nextBench = [...bench];
    const outgoing = nextStarters[index];
    nextStarters[index] = nextBench[selectedBench];
    nextBench[selectedBench] = outgoing;
    setStarters(nextStarters);
    setBench(nextBench);
    setSelectedBench(null);
    setSaved(false);
  };
  const moveCustomPlayer = (playerIndex, x, y) => {
    setCustomLayout((current) =>
      current.map((position, index) =>
        index === playerIndex ? [x, y] : position,
      ),
    );
    setSaved(false);
  };
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      scrollEnabled={!draggingPlayer}
      contentContainerStyle={{ paddingBottom: 28 }}
    >
      <BrandHeader title="SQUAD" />
      <View style={s.lineupIntro}>
        <View>
          <AppText style={s.screenTitle}>Team formation</AppText>
          <AppText style={s.body}>
            Formation slots stay visible before players are added.
          </AppText>
        </View>
      </View>
      <View style={s.lineupSection}>
        <AppText style={s.lineupSectionTitle}>FORMATION</AppText>
        <View style={s.formationOptions}>
          {["4-3-3", "4-4-2", "3-5-2", "5-4-1", "Custom"].map((item) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: formation === item }}
              key={item}
              onPress={() => {
                if (item === "Custom" && formation !== "Custom") {
                  setCustomLayout(layout.map((position) => [...position]));
                }
                setFormation(item);
                setSaved(false);
              }}
              style={[
                s.formationButton,
                formation === item && s.formationButtonActive,
              ]}
            >
              <AppText
                style={[
                  s.formationButtonText,
                  formation === item && s.formationButtonTextActive,
                ]}
              >
                {item}
              </AppText>
            </Pressable>
          ))}
        </View>
        {formation === "Custom" ? (
          <View style={s.customFormationHint}>
            <Ionicons name="hand-left-outline" size={18} color={C.red} />
            <View style={{ flex: 1 }}>
              <AppText style={s.team}>Press and drag any player</AppText>
              <AppText style={s.meta}>
                Release anywhere on the board to build your shape.
              </AppText>
            </View>
          </View>
        ) : null}
        <View
          onLayout={(event) => setPitchSize(event.nativeEvent.layout)}
          style={s.lineupPitch}
          accessibilityLabel="Formation pitch"
        >
          <View style={s.pitchHalfLine} />
          <View style={s.pitchCircle} />
          <View style={s.pitchTopBox} />
          <View style={s.pitchBottomBox} />
          {starters.map((player, index) => (
            <DraggablePitchPlayer
              key={`${player.number}-${player.name}`}
              player={player}
              index={index}
              position={layout[index]}
              custom={formation === "Custom"}
              pitchSize={pitchSize}
              goalkeeper={index === 0}
              selectedBench={selectedBench}
              benchName={bench[selectedBench]?.name}
              onSwap={swapPlayer}
              onMove={moveCustomPlayer}
              onDragStateChange={setDraggingPlayer}
            />
          ))}
        </View>
        <View style={s.benchHeader}>
          <AppText style={s.lineupSectionTitle}>BENCH</AppText>
          <AppText style={s.benchHint}>
            {selectedBench == null
              ? "tap a substitute"
              : `replace with ${bench[selectedBench]?.name}`}
          </AppText>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.benchRow}
        >
          {bench.map((player, index) => (
            <Pressable
              key={`${player.number}-${player.name}`}
              onPress={() =>
                setSelectedBench(selectedBench === index ? null : index)
              }
              accessibilityRole="button"
              accessibilityState={{ selected: selectedBench === index }}
              style={s.benchPlayer}
            >
              <View
                style={[
                  s.benchDisc,
                  selectedBench === index && s.benchDiscSelected,
                ]}
              >
                <AppText style={s.benchNumber}>{player.number}</AppText>
              </View>
              <AppText style={s.benchName}>{player.name || "Open"}</AppText>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable
          disabled={saving}
          style={[
            s.saveLineupButton,
            saved && s.saveLineupButtonSaved,
            saving && s.buttonDisabled,
          ]}
          onPress={async () => {
            if (!team?.id) {
              Alert.alert(
                "Create your team first",
                "A team is needed before a lineup can be saved.",
              );
              return;
            }
            setSaving(true);
            try {
              await onSave({
                lineup: { formation, starters, bench, customLayout },
              });
              setSaved(true);
            } catch (error) {
              Alert.alert(
                "Couldn’t save lineup",
                "Please check your connection and try again.",
              );
            } finally {
              setSaving(false);
            }
          }}
          accessibilityRole="button"
        >
          <Ionicons
            name={saved ? "checkmark-circle" : "save-outline"}
            size={18}
            color="white"
          />
          <AppText style={s.saveLineupText}>
            {saving ? "SAVING" : saved ? "LINEUP SAVED" : "SAVE LINEUP"}
          </AppText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function nextAvailableDate(days = []) {
  const weekdayMap = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Weekday: 1,
  };
  const targets = days.map((item) => weekdayMap[item]).filter(Number.isInteger);
  if (!targets.length) return "";
  const now = new Date();
  const offsets = targets.map((target) => {
    const distance = (target - now.getDay() + 7) % 7;
    return distance === 0 ? 7 : distance;
  });
  const next = new Date(now);
  next.setDate(now.getDate() + Math.min(...offsets));
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

function consecutiveHomeMatches(matches = [], teamId = "") {
  if (!teamId) return 0;
  const recent = matches
    .filter(
      (match) =>
        [
          "confirmed",
          "result_pending",
          "result_disputed",
          "completed",
        ].includes(match.status) && match.participantTeamIds?.includes(teamId),
    )
    .sort((first, second) =>
      `${second.matchDate || ""} ${second.kickoff || ""}`.localeCompare(
        `${first.matchDate || ""} ${first.kickoff || ""}`,
      ),
    );
  let streak = 0;
  for (const match of recent) {
    if (match.homeTeamId !== teamId) break;
    streak += 1;
  }
  return streak;
}

function ChallengeWizard({
  team,
  ownTeam,
  availability,
  existingRequest,
  onSubmit,
  close,
  matches = [],
}) {
  const [step, setStep] = useState(1);
  const [day, setDay] = useState(
    existingRequest?.terms?.day ||
      availability?.date ||
      nextAvailableDate(availability?.days),
  );
  const [time, setTime] = useState(
    existingRequest?.terms?.time ||
      (validClockTime(availability?.time)
        ? availability.time
        : { Morning: "10:00", Afternoon: "15:00", Evening: "18:00" }[
            availability?.time
          ]) ||
      "10:00",
  );
  const [customTime, setCustomTime] = useState(
    !["10:00", "13:00", "15:00"].includes(
      existingRequest?.terms?.time ||
        (validClockTime(availability?.time) ? availability.time : "10:00"),
    ),
  );
  const [format, setFormat] = useState(
    existingRequest?.terms?.format || "11-a-side",
  );
  const [durationMinutes, setDurationMinutes] = useState(
    String(existingRequest?.terms?.durationMinutes || "90"),
  );
  const [venue, setVenue] = useState(
    existingRequest?.terms?.venue ||
      (availability?.venue === "Can host"
        ? team?.ground?.name
        : ownTeam?.ground?.name) ||
      "",
  );
  const [fee, setFee] = useState(existingRequest?.terms?.fee || "0");
  const [refereeBudget, setRefereeBudget] = useState(
    existingRequest?.terms?.refereeBudget || "25",
  );
  const ownHomeBlocked = consecutiveHomeMatches(matches, ownTeam?.id) >= 3;
  const opponentHomeBlocked = consecutiveHomeMatches(matches, team?.id) >= 3;
  const [homeTeamId, setHomeTeamId] = useState(
    existingRequest?.terms?.homeTeamId ||
      (ownHomeBlocked
        ? team?.id
        : opponentHomeBlocked
          ? ownTeam?.id
          : availability?.venue === "Can host"
            ? team?.id
            : ownTeam?.id),
  );
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const scheduleProblem = availabilityProblem(
    { date: day, time },
    matches,
    ownTeam?.id,
  );
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      <View style={s.subHeader}>
        <Pressable
          onPress={step === 1 ? close : () => setStep(step - 1)}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={23} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <AppText style={s.headerTitle}>
            {existingRequest ? "NEGOTIATE MATCH" : "CHALLENGE TEAM"}
          </AppText>
          <AppText style={s.headerSub}>STEP {step} OF 3</AppText>
        </View>
      </View>
      <View style={s.wizardProgress}>
        {[1, 2, 3].map((item) => (
          <View
            key={item}
            style={[
              s.wizardProgressBar,
              item <= step && s.wizardProgressBarActive,
            ]}
          />
        ))}
      </View>
      {step === 1 && (
        <View style={s.formIntro}>
          <AppText style={s.screenTitle}>Pick a time</AppText>
          <AppText style={s.body}>
            Choose when {ownTeam?.name || "your team"} can play {team.name}.
          </AppText>
          <View style={s.challengeOpponent}>
            <View style={s.challengeBadge}>
              <AppText style={s.primaryText}>{initials(team.name)}</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={s.moreToolTitle}>{team.name}</AppText>
              <AppText style={s.meta}>
                {team.area} · verified match history
              </AppText>
            </View>
            <View style={s.reliabilityMark}>
              <Ionicons name="checkmark" size={14} color={C.green} />
              <AppText style={s.reliabilityText}>VERIFIED</AppText>
            </View>
          </View>
          <AppText style={s.formLabel}>Match day</AppText>
          <DateField
            value={day}
            onChange={setDay}
            minimumDate={new Date()}
            accessibilityLabel="Choose match day"
          />
          <AppText style={s.formLabel}>Kick-off</AppText>
          <View style={s.optionWrap}>
            {["10:00", "13:00", "15:00", "Custom"].map((item) => (
              <Pressable
                key={item}
                onPress={() => {
                  setCustomTime(item === "Custom");
                  setTime(item === "Custom" ? "" : item);
                }}
                style={[
                  s.formChoice,
                  ((item === "Custom" && customTime) || time === item) &&
                    s.formChoiceActive,
                ]}
              >
                <AppText
                  style={[
                    s.formChoiceText,
                    ((item === "Custom" && customTime) || time === item) &&
                      s.formChoiceTextActive,
                  ]}
                >
                  {item}
                </AppText>
              </Pressable>
            ))}
          </View>
          {customTime ? (
            <TextInput
              value={time}
              onChangeText={(value) => setTime(clockInput(value))}
              keyboardType="number-pad"
              maxLength={5}
              placeholder="14:30"
              placeholderTextColor={C.muted}
              style={s.formInput}
              accessibilityLabel="Enter custom kickoff time"
            />
          ) : null}
          {day && time && scheduleProblem ? (
            <View style={s.profilePrivacyNote}>
              <Ionicons name="alert-circle-outline" size={20} color={C.red} />
              <AppText style={[s.body, { flex: 1 }]}>{scheduleProblem}</AppText>
            </View>
          ) : null}
          <Pressable
            disabled={Boolean(scheduleProblem)}
            onPress={() => setStep(2)}
            style={[
              s.saveLineupButton,
              Boolean(scheduleProblem) && s.buttonDisabled,
            ]}
          >
            <AppText style={s.saveLineupText}>NEXT: MATCH DETAILS</AppText>
            <Ionicons name="arrow-forward" color="white" />
          </Pressable>
        </View>
      )}
      {step === 2 && (
        <View style={s.formIntro}>
          <AppText style={s.screenTitle}>Match details</AppText>
          <AppText style={s.body}>
            Agree the format and proposed venue before sending.
          </AppText>
          <AppText style={s.formLabel}>Football format</AppText>
          <View style={s.optionWrap}>
            {["11-a-side", "7-a-side", "5-a-side"].map((item) => (
              <Pressable
                key={item}
                onPress={() => setFormat(item)}
                style={[s.formChoice, format === item && s.formChoiceActive]}
              >
                <AppText
                  style={[
                    s.formChoiceText,
                    format === item && s.formChoiceTextActive,
                  ]}
                >
                  {item}
                </AppText>
              </Pressable>
            ))}
          </View>
          <AppText style={s.formLabel}>Proposed venue</AppText>
          <TextInput
            value={venue}
            onChangeText={setVenue}
            style={s.formInput}
            placeholder="Ground or area"
            placeholderTextColor={C.muted}
          />
          <AppText style={s.formLabel}>Match length in minutes</AppText>
          <TextInput
            value={durationMinutes}
            onChangeText={(value) => setDurationMinutes(numbersOnly(value))}
            keyboardType="number-pad"
            style={s.formInput}
            placeholder="90"
            placeholderTextColor={C.muted}
          />
          <AppText style={s.formLabel}>Home team</AppText>
          <View style={s.optionWrap}>
            {[
              [ownTeam?.id, ownTeam?.name || "Your team"],
              [team?.id, team?.name || "Opponent"],
            ].map(([id, name]) => (
              <Pressable
                key={id}
                disabled={
                  (id === ownTeam?.id && ownHomeBlocked) ||
                  (id === team?.id && opponentHomeBlocked)
                }
                onPress={() => setHomeTeamId(id)}
                style={[
                  s.formChoice,
                  homeTeamId === id && s.formChoiceActive,
                  ((id === ownTeam?.id && ownHomeBlocked) ||
                    (id === team?.id && opponentHomeBlocked)) &&
                    s.buttonDisabled,
                ]}
              >
                <AppText
                  style={[
                    s.formChoiceText,
                    homeTeamId === id && s.formChoiceTextActive,
                  ]}
                >
                  {name} hosts
                </AppText>
              </Pressable>
            ))}
          </View>
          {ownHomeBlocked || opponentHomeBlocked ? (
            <AppText style={s.formHelp}>
              {ownHomeBlocked
                ? `${ownTeam?.name} hosted the last three matches and must travel next.`
                : `${team?.name} hosted the last three matches and must travel next.`}
            </AppText>
          ) : null}
          <AppText style={s.formLabel}>Each team pays</AppText>
          <View style={s.moneyInput}>
            <AppText style={s.moneyPrefix}>$</AppText>
            <TextInput
              value={fee}
              onChangeText={(value) => setFee(numbersOnly(value))}
              keyboardType="number-pad"
              style={s.moneyTextInput}
            />
          </View>
          <AppText style={s.formLabel}>Proposed total referee fee</AppText>
          <View style={s.moneyInput}>
            <AppText style={s.moneyPrefix}>$</AppText>
            <TextInput
              value={refereeBudget}
              onChangeText={(value) => setRefereeBudget(numbersOnly(value))}
              keyboardType="number-pad"
              style={s.moneyTextInput}
            />
          </View>
          <AppText style={s.settingsGroupTitle}>MATCH TERMS</AppText>
          {[
            [
              "Referee",
              `$${refereeBudget || "0"} proposed, split by both teams`,
            ],
            ["Pitch", "Home team confirms access 24 hours before"],
            ["Result", "Both captains verify goals and cards"],
          ].map((item) => (
            <View key={item[0]} style={s.settingRow}>
              <View style={s.checkCircleActive}>
                <Ionicons name="checkmark" size={15} color="white" />
              </View>
              <View>
                <AppText style={s.team}>{item[0]}</AppText>
                <AppText style={s.meta}>{item[1]}</AppText>
              </View>
            </View>
          ))}
          <Pressable onPress={() => setStep(3)} style={s.saveLineupButton}>
            <AppText style={s.saveLineupText}>REVIEW CHALLENGE</AppText>
            <Ionicons name="arrow-forward" color="white" />
          </Pressable>
        </View>
      )}
      {step === 3 && (
        <View style={s.formIntro}>
          <AppText style={s.screenTitle}>
            {sent ? "Challenge sent" : "Ready to send"}
          </AppText>
          <AppText style={s.body}>
            {sent
              ? `${team.name} has 24 hours to respond.`
              : "Both captains will see the same proposed terms."}
          </AppText>
          <View style={s.challengeReview}>
            <View style={s.reviewTeamsLine}>
              <View>
                <AppText style={s.meta}>YOUR TEAM</AppText>
                <AppText style={s.moreToolTitle}>
                  {ownTeam?.name || "Your team"}
                </AppText>
              </View>
              <AppText style={s.reviewVs}>VS</AppText>
              <View style={{ alignItems: "flex-end" }}>
                <AppText style={s.meta}>OPPONENT</AppText>
                <AppText style={s.moreToolTitle}>{team.name}</AppText>
              </View>
            </View>
            {[
              ["Date", formatStoredDate(day)],
              ["Kick-off", time],
              ["Format", format],
              ["Match length", `${durationMinutes || "90"} minutes`],
              ["Venue", venue],
              ["Team fee", `$${fee || "0"}`],
              ["Referee budget", `$${refereeBudget || "0"} total`],
            ].map((item) => (
              <View key={item[0]} style={s.reviewDetailRow}>
                <AppText style={s.meta}>{item[0].toUpperCase()}</AppText>
                <AppText style={s.team}>{item[1]}</AppText>
              </View>
            ))}
          </View>
          <Pressable
            disabled={
              sent || sending || !day || !venue || Boolean(scheduleProblem)
            }
            onPress={async () => {
              setSending(true);
              try {
                await onSubmit({
                  day,
                  time,
                  format,
                  durationMinutes: Number(durationMinutes || 90),
                  venue,
                  fee: fee || "0",
                  refereeBudget: refereeBudget || "0",
                  homeTeamId,
                  awayTeamId:
                    homeTeamId === ownTeam?.id ? team?.id : ownTeam?.id,
                  communityRules: {
                    ...(ownTeam?.communityRules || {}),
                    preset: format,
                    playersPerSide:
                      Number(String(format).match(/\d+/)?.[0]) ||
                      Number(ownTeam?.communityRules?.playersPerSide || 0),
                    durationMinutes: Number(durationMinutes || 90),
                  },
                });
                setSent(true);
                close();
              } catch (error) {
                Alert.alert(
                  "Couldn’t send request",
                  error?.message ||
                    "The request wasn’t sent. Please try again.",
                );
              } finally {
                setSending(false);
              }
            }}
            style={[
              s.saveLineupButton,
              sent && s.saveLineupButtonSaved,
              (sending || !day || !venue || Boolean(scheduleProblem)) &&
                s.buttonDisabled,
            ]}
          >
            <Ionicons
              name={sent ? "checkmark-circle" : "send-outline"}
              color="white"
              size={18}
            />
            <AppText style={s.saveLineupText}>
              {sending
                ? "SENDING"
                : sent
                  ? existingRequest
                    ? "NEW TERMS SENT"
                    : "CHALLENGE SENT"
                  : existingRequest
                    ? "SEND NEW TERMS"
                    : "SEND CHALLENGE"}
            </AppText>
          </Pressable>
          {sent ? (
            <Pressable onPress={close} style={s.outlineButton}>
              <AppText style={s.buttonText}>Back to teams</AppText>
            </Pressable>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

function HoneycombLoader() {
  const cells = useRef(
    Array.from({ length: 7 }, () => new Animated.Value(0)),
  ).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.stagger(
        100,
        cells.map((cell) =>
          Animated.sequence([
            Animated.timing(cell, {
              toValue: 1,
              duration: 260,
              useNativeDriver: Platform.OS !== "web",
            }),
            Animated.delay(620),
            Animated.timing(cell, {
              toValue: 0,
              duration: 260,
              useNativeDriver: Platform.OS !== "web",
            }),
            Animated.delay(720),
          ]),
        ),
      ),
    );
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) =>
      reduced ? cells.forEach((cell) => cell.setValue(1)) : animation.start(),
    );
    return () => animation.stop();
  }, [cells]);
  const positions = [
    [0, 28],
    [14, 50],
    [42, 50],
    [56, 28],
    [42, 6],
    [14, 6],
    [28, 28],
  ];
  return (
    <View style={s.honeycomb} accessibilityLabel="Matching in progress">
      {cells.map((cell, index) => (
        <Animated.View
          key={index}
          style={[
            s.honeyCell,
            {
              left: positions[index][0],
              top: positions[index][1],
              opacity: cell,
              transform: [{ scale: cell }],
            },
          ]}
        >
          <View style={s.honeyBar} />
          <View style={[s.honeyBar, s.honeyBarLeft]} />
          <View style={[s.honeyBar, s.honeyBarRight]} />
        </Animated.View>
      ))}
    </View>
  );
}

function FriendlyFinder({
  close,
  onChallenge,
  teams = [],
  ownTeam,
  challenges = [],
  matches = [],
  availabilityPosts = [],
}) {
  const [day, setDay] = useState("Sunday");
  const [time, setTime] = useState("Morning");
  const [venue, setVenue] = useState("Either");
  const [maxDistance, setMaxDistance] = useState("25 km");
  const [status, setStatus] = useState("setup");
  const [results, setResults] = useState([]);
  const homeBlocked = consecutiveHomeMatches(matches, ownTeam?.id) >= 3;
  useEffect(() => {
    if (homeBlocked && venue === "Can host") setVenue("Can travel");
  }, [homeBlocked, venue]);
  const runMatch = () => {
    setStatus("matching");
    const available = Array.from({ length: 16 }, (_, index) => ({
      slot: `${day}-${time}`,
      available: index < 14,
    }));
    const sideBalance = (teamId) => {
      const recent = matches
        .filter((match) => match.participantTeamIds?.includes(teamId))
        .sort((first, second) =>
          `${second.matchDate || ""}`.localeCompare(`${first.matchDate || ""}`),
        )
        .slice(0, 6);
      return {
        homeLast6: recent.filter((match) => match.homeTeamId === teamId).length,
        awayLast6: recent.filter((match) => match.awayTeamId === teamId).length,
      };
    };
    const ownBalance = sideBalance(ownTeam?.id);
    const searchTeam = {
      id: ownTeam?.id || "current-team",
      area: ownTeam?.area || "",
      rating: 1110,
      ageBand: ownTeam?.ageGroup || "Senior",
      ...ownBalance,
      travelKm30: 60,
      matchBudget: 45,
      availability: available,
    };
    const searchDate = nextAvailableDate([day]);
    const searchTime =
      { Morning: "10:00", Afternoon: "15:00", Evening: "18:00" }[time] || time;
    const activeOpponentIds = new Set(
      challenges
        .filter(
          (challenge) =>
            ["pending", "negotiating", "accepted"].includes(challenge.status) &&
            [challenge.senderTeamId, challenge.recipientTeamId].includes(
              ownTeam?.id,
            ),
        )
        .map((challenge) =>
          challenge.senderTeamId === ownTeam?.id
            ? challenge.recipientTeamId
            : challenge.senderTeamId,
        ),
    );
    const distanceLimit =
      maxDistance === "Any distance"
        ? Infinity
        : Number(maxDistance.split(" ")[0]);
    const candidates = teams
      .filter((item) => !activeOpponentIds.has(item.id))
      .map((item, index) => {
        const post = availabilityPosts.find(
          (availability) =>
            availability.teamId === item.id && availability.published === true,
        );
        const venueFits =
          !post ||
          venue === "Either" ||
          post.venue === "Either" ||
          (venue === "Can host" && post.venue === "Can travel") ||
          (venue === "Can travel" && post.venue === "Can host");
        const availabilityFits =
          Boolean(post) &&
          post.date === searchDate &&
          post.time === searchTime &&
          venueFits;
        const distanceKm = distanceBetweenTeams(ownTeam, item);
        return {
          ...item,
          rating: Number(item.stats?.rankingScore || 1000),
          ageBand: item.ageGroup || ownTeam?.ageGroup || "Senior",
          ...sideBalance(item.id),
          travelKm30: Number(item.travelKm30 || 0),
          distanceKm,
          distanceKnown: distanceKm !== null,
          matchBudget: Number(item.matchBudget || 0),
          availabilityPost: post,
          availabilityFits,
          availability: Array.from({ length: 14 }, (_, playerIndex) => ({
            slot: `${day}-${time}`,
            available: availabilityFits && playerIndex < 14,
          })),
          behaviour: item.behaviour || [],
          historyWithTeam: item.historyWithTeam || [],
          busyMatch: matches.find(
            (match) =>
              ["confirmed", "result_pending", "result_disputed"].includes(
                match.status,
              ) &&
              match.participantTeamIds?.includes(item.id) &&
              match.matchDate === searchDate &&
              match.kickoff === searchTime,
          ),
        };
      })
      .filter(
        (item) =>
          distanceLimit === Infinity ||
          (item.distanceKm !== null && item.distanceKm <= distanceLimit),
      );
    setTimeout(() => {
      const availableCandidates = candidates.filter(
        (candidate) => !candidate.busyMatch,
      );
      const busyCandidates = candidates
        .filter((candidate) => candidate.busyMatch)
        .map((opponent) => ({ opponent, score: -1, signals: {} }));
      setResults(
        [
          ...rankOpponentCandidates(searchTeam, availableCandidates, {
            slot: `${day}-${time}`,
            proposedSide: {
              homeTeamId:
                venue === "Can travel"
                  ? "__opponent__"
                  : venue === "Either"
                    ? "__fair__"
                    : searchTeam.id,
            },
            costs: {
              pitch: 20,
              referee: 10,
              transport: venue === "Can travel" ? 15 : 0,
            },
          }).sort(
            (first, second) =>
              Number(second.opponent.availabilityFits) -
                Number(first.opponent.availabilityFits) ||
              second.score - first.score,
          ),
          ...busyCandidates,
        ].slice(0, 8),
      );
      setStatus("results");
    }, 1800);
  };
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={s.subHeader}>
        <Pressable onPress={close}>
          <Ionicons name="arrow-back" size={23} />
        </Pressable>
        <View style={{ marginLeft: 14 }}>
          <AppText style={s.headerTitle}>FIND A FRIENDLY</AppText>
          <AppText style={s.headerSub}>FAIR MATCHING</AppText>
        </View>
      </View>
      {status === "setup" ? (
        <View style={s.formIntro}>
          <AppText style={s.screenTitle}>What game do you need?</AppText>
          <AppText style={s.body}>
            We compare availability, travel, playing level, cost and verified
            behaviour.
          </AppText>
          {[
            ["Day", ["Saturday", "Sunday"], day, setDay],
            ["Kick-off", ["Morning", "Afternoon", "Evening"], time, setTime],
            ["Venue", ["Can host", "Can travel", "Either"], venue, setVenue],
            [
              "Distance",
              ["10 km", "25 km", "50 km", "Any distance"],
              maxDistance,
              setMaxDistance,
            ],
          ].map(([label, choices, value, setter]) => (
            <View key={label}>
              <AppText style={s.formLabel}>{label}</AppText>
              <View style={s.optionWrap}>
                {choices.map((choice) => (
                  <Pressable
                    key={choice}
                    disabled={
                      label === "Venue" && choice === "Can host" && homeBlocked
                    }
                    onPress={() => setter(choice)}
                    style={[
                      s.formChoice,
                      value === choice && s.formChoiceActive,
                      label === "Venue" &&
                        choice === "Can host" &&
                        homeBlocked &&
                        s.buttonDisabled,
                    ]}
                  >
                    <AppText
                      style={[
                        s.formChoiceText,
                        value === choice && s.formChoiceTextActive,
                      ]}
                    >
                      {choice}
                    </AppText>
                  </Pressable>
                ))}
              </View>
              {label === "Venue" && homeBlocked ? (
                <AppText style={s.formHelp}>
                  Hosting is paused because your team hosted its last three
                  matches.
                </AppText>
              ) : null}
            </View>
          ))}
          <Pressable onPress={runMatch} style={s.saveLineupButton}>
            <Ionicons name="search" color="white" size={18} />
            <AppText style={s.saveLineupText}>FIND TEAMS</AppText>
          </Pressable>
        </View>
      ) : null}
      {status === "matching" ? (
        <View style={s.matchingPanel}>
          <HoneycombLoader />
          <AppText style={s.screenTitle}>Finding the right game</AppText>
          <AppText style={s.body}>
            Checking teams that can genuinely play {day.toLowerCase()}{" "}
            {time.toLowerCase()}.
          </AppText>
        </View>
      ) : null}
      {status === "results" ? (
        <View style={s.communityListSection}>
          <AppText style={s.screenTitle}>Best available teams</AppText>
          <AppText style={s.body}>
            Ranked privately by fit. Reliability percentages remain hidden.
          </AppText>
          {results.map(({ opponent }, index) => (
            <View key={opponent.id} style={s.friendlyResult}>
              <View style={s.friendlyResultTop}>
                <CrestPreview
                  shape={opponent.crest?.shape || 0}
                  color={opponent.crest?.color || C.redDark}
                  label={opponent.crest?.label || initials(opponent.name)}
                  small
                />
                <View style={{ flex: 1 }}>
                  <AppText style={s.team}>{opponent.name}</AppText>
                  <AppText style={s.meta}>
                    {opponent.area || "Area not added"} Â·{" "}
                    {opponent.distanceKnown
                      ? `${opponent.distanceKm} km away`
                      : "distance unavailable"}
                  </AppText>
                </View>
                {index === 0 ? (
                  <AppText style={s.bestMatch}>BEST FIT</AppText>
                ) : null}
              </View>
              <View style={s.matchReasons}>
                {opponent.busyMatch ? (
                  <AppText style={[s.meta, { color: C.red }]}>
                    Unavailable · playing{" "}
                    {opponent.busyMatch.homeTeamId === opponent.id
                      ? opponent.busyMatch.awayTeamName
                      : opponent.busyMatch.homeTeamName}
                  </AppText>
                ) : (
                  <>
                    <AppText style={s.meta}>
                      {opponent.availabilityFits
                        ? "Available for this exact date and time"
                        : "No matching availability post"}
                    </AppText>
                    <AppText style={s.meta}>
                      {opponent.distanceKnown
                        ? `Travel distance ${opponent.distanceKm} km`
                        : "Same area, exact distance not added"}
                    </AppText>
                    <AppText style={s.meta}>Compatible playing level</AppText>
                  </>
                )}
              </View>
              {(() => {
                const request = challenges.find(
                  (item) =>
                    ["pending", "negotiating", "accepted"].includes(
                      item.status,
                    ) &&
                    [item.senderTeamId, item.recipientTeamId].includes(
                      ownTeam?.id,
                    ) &&
                    [item.senderTeamId, item.recipientTeamId].includes(
                      opponent.id,
                    ),
                );
                const incoming = request?.recipientTeamId === ownTeam?.id;
                return (
                  <Pressable
                    disabled={Boolean(request || opponent.busyMatch)}
                    onPress={() => onChallenge(opponent)}
                    style={[
                      s.challengeButton,
                      (request || opponent.busyMatch) && s.buttonDisabled,
                    ]}
                  >
                    <AppText style={s.buttonText}>
                      {incoming
                        ? "Challenge received"
                        : opponent.busyMatch
                          ? "Unavailable"
                          : request
                            ? "Challenge sent"
                            : "Challenge team"}
                    </AppText>
                  </Pressable>
                );
              })()}
            </View>
          ))}
          <Pressable onPress={() => setStatus("setup")} style={s.outlineButton}>
            <AppText style={s.buttonText}>Change search</AppText>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

function StandingsHeader() {
  return (
    <View style={s.standingsRow}>
      {[
        ["#", 34],
        ["TEAM", 150],
        ["PL", 38],
        ["W", 34],
        ["D", 34],
        ["L", 34],
        ["GA", 40],
        ["GF", 40],
        ["GD", 40],
        ["PTS", 44],
        ["PTS/GAME", 76],
      ].map(([label, width]) => (
        <AppText key={label} style={[s.standingsHead, { width }]}>
          {label}
        </AppText>
      ))}
    </View>
  );
}

function StandingsRow({ position, team, stats = {}, detailed = false }) {
  const played = Number(stats.matches || 0);
  const goalsFor = Number(stats.goalsFor || 0);
  const goalsAgainst = Number(stats.goalsAgainst || 0);
  const points = Number(stats.points || 0);
  const cells = [
    [position || "—", 34],
    [team.name, 150],
    [played, 38],
    [Number(stats.wins || 0), 34],
    [Number(stats.draws || 0), 34],
    [Number(stats.losses || 0), 34],
    [goalsAgainst, 40],
    [goalsFor, 40],
    [goalsFor - goalsAgainst, 40],
    [points, 44],
    [played ? (points / played).toFixed(2) : "0.00", 76],
  ];
  return (
    <View style={[s.standingsRow, detailed && s.standingsRowDetailed]}>
      {cells.map(([value, width], index) => (
        <AppText
          key={`${index}-${width}`}
          numberOfLines={1}
          style={[index === 1 ? s.standingsTeam : s.standingsCell, { width }]}
        >
          {value}
        </AppText>
      ))}
    </View>
  );
}

function StatsPeriodControl({ value, onChange }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.statsPeriodControl}
    >
      {statsPeriods.map((period) => (
        <Pressable
          key={period}
          onPress={() => onChange(period)}
          style={[
            s.statsPeriodButton,
            value === period && s.statsPeriodButtonActive,
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: value === period }}
        >
          <AppText
            style={[
              s.statsPeriodText,
              value === period && s.statsPeriodTextActive,
            ]}
          >
            {period}
          </AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function StatsChoiceControl({ options, value, onChange }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.statsChoiceControl}
    >
      {options.map((option) => (
        <Pressable
          key={option}
          onPress={() => onChange(option)}
          style={[
            s.statsChoiceButton,
            value === option && s.statsChoiceButtonActive,
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: value === option }}
        >
          <AppText
            style={[
              s.statsChoiceText,
              value === option && s.statsChoiceTextActive,
            ]}
          >
            {option}
          </AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function PublicTeamStatsProfile({ team, matches = [], leagues = [], period }) {
  const stats = teamStatsForPeriod(team, matches, period);
  const honours = teamHonours(team, leagues);
  const milestone = matchesToGoalMilestone(team, matches);
  const cards = Number(stats.yellowCards || 0) + Number(stats.redCards || 0);
  return (
    <>
      <View style={s.publicTeamStatHero}>
        <CrestPreview
          shape={team.crest?.shape || 0}
          color={team.crest?.color || C.redDark}
          label={team.crest?.label || initials(team.name)}
        />
        <View style={{ flex: 1 }}>
          <AppText style={s.h2}>{team.name}</AppText>
          <AppText style={s.body}>
            {team.area || "Region not added"} Â·{" "}
            {team.ageGroup || "Age group not added"}
          </AppText>
        </View>
      </View>
      <View style={s.teamStatsGrid}>
        {[
          ["PL", stats.matches || 0],
          ["W", stats.wins || 0],
          ["D", stats.draws || 0],
          ["L", stats.losses || 0],
          ["GF", stats.goalsFor || 0],
          ["GA", stats.goalsAgainst || 0],
          ["CARDS", cards],
          ["PTS", stats.points || 0],
        ].map(([label, value]) => (
          <View style={s.teamStatCell} key={label}>
            <AppText style={s.teamStatValue}>{value}</AppText>
            <AppText style={s.teamStatLabel}>{label}</AppText>
          </View>
        ))}
      </View>
      <AppText style={s.settingsGroupTitle}>MILESTONES AND HONOURS</AppText>
      {[
        [
          "rocket-outline",
          "Fastest to 100 goals",
          milestone.reached
            ? `${milestone.matches} matches Â· ${formatStoredDate(milestone.date)}`
            : `${milestone.goals || 0} goals Â· ${milestone.remaining || 100} to go`,
        ],
        [
          "flag-outline",
          "50 match club",
          Number(stats.matches || 0) >= 50
            ? `Reached · ${stats.matches} matches played`
            : `${stats.matches || 0} of 50 matches`,
        ],
        [
          "checkmark-done-outline",
          "25 wins",
          Number(stats.wins || 0) >= 25
            ? `Reached · ${stats.wins} wins`
            : `${stats.wins || 0} of 25 wins`,
        ],
        ["trophy-outline", "Tournaments won", String(honours.won.length)],
        [
          "medal-outline",
          "Tournaments participated",
          String(honours.participated.length),
        ],
        [
          "ribbon-outline",
          "Best award",
          honours.awards[0]
            ? `${honours.awards[0].label || honours.awards[0].name} Â· ${honours.awards[0].competitionName}`
            : "No confirmed award yet",
        ],
      ].map(([icon, label, value]) => (
        <View style={s.statRecordRow} key={label}>
          <View style={s.statsScopeIcon}>
            <Ionicons name={icon} size={20} color={C.red} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={s.team}>{label}</AppText>
            <AppText style={s.body}>{value}</AppText>
          </View>
        </View>
      ))}
      {honours.awards.length ? (
        <>
          <AppText style={s.settingsGroupTitle}>AWARD HISTORY</AppText>
          {honours.awards.map((award, index) => (
            <View
              style={s.statRecordRow}
              key={`${award.competitionName}-${award.label || award.name}-${index}`}
            >
              <Ionicons name="ribbon-outline" size={20} color={C.red} />
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>{award.label || award.name}</AppText>
                <AppText style={s.body}>{award.competitionName}</AppText>
              </View>
            </View>
          ))}
        </>
      ) : null}
    </>
  );
}

function Community({
  statsOnly = false,
  close,
  startFinder = false,
  onFinderOpened,
  team,
  onCreateTeam,
  teams = [],
  availabilityPosts = [],
  onPublishAvailability,
  challenges = [],
  onSendChallenge,
  matches = [],
  leagues = [],
  publicProfiles = [],
}) {
  const [tab, setTab] = useState(statsOnly ? "Stats" : "My team");
  const [record, setRecord] = useState(false);
  const [finder, setFinder] = useState(false);
  const [challengeTeam, setChallengeTeam] = useState(null);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [postingAvailability, setPostingAvailability] = useState(false);
  const [rankingTeam, setRankingTeam] = useState(null);
  const [rankingFilter, setRankingFilter] = useState("Overall");
  const [rankingPeriod, setRankingPeriod] = useState("All time");
  const [statsLevel, setStatsLevel] = useState("Teams");
  const [teamMetric, setTeamMetric] = useState("Ranking");
  const [playerMetric, setPlayerMetric] = useState("Goals");
  const [regionFilter, setRegionFilter] = useState("All regions");
  const [ageFilter, setAgeFilter] = useState("All ages");
  const activeOpponentIds = new Set(
    challenges
      .filter(
        (challenge) =>
          ["pending", "negotiating", "accepted"].includes(challenge.status) &&
          [challenge.senderTeamId, challenge.recipientTeamId].includes(
            team?.id,
          ),
      )
      .map((challenge) =>
        challenge.senderTeamId === team?.id
          ? challenge.recipientTeamId
          : challenge.senderTeamId,
      ),
  );
  const visibleTeams = prioritizeByLocation(
    teams.filter(
      (item) => item.id !== team?.id && !activeOpponentIds.has(item.id),
    ),
    team?.area,
  ).sort((first, second) => {
    const firstAvailable = availabilityPosts.some(
      (post) => post.teamId === first.id && post.published === true,
    );
    const secondAvailable = availabilityPosts.some(
      (post) => post.teamId === second.id && post.published === true,
    );
    return Number(secondAvailable) - Number(firstAvailable);
  });
  const allRankingTeams = [
    ...new Map(
      [team, ...teams].filter(Boolean).map((item) => [item.id, item]),
    ).values(),
  ];
  const regionOptions = [
    "All regions",
    ...new Set(
      [...allRankingTeams, ...publicProfiles]
        .map((item) => locationZone(item.area))
        .filter(Boolean)
        .map(titleLabel),
    ),
  ];
  const ageOptions = [
    "All ages",
    ...new Set(
      [...allRankingTeams, ...publicProfiles]
        .map((item) => item.ageGroup || item.ageBand)
        .filter(Boolean),
    ),
  ];
  const matchesStatFilters = (item) => {
    const sameRegion =
      regionFilter === "All regions" ||
      titleLabel(locationZone(item.area)) === regionFilter;
    const itemAge = item.ageGroup || item.ageBand || "";
    return sameRegion && (ageFilter === "All ages" || itemAge === ageFilter);
  };
  const rankingTeams = allRankingTeams
    .filter(matchesStatFilters)
    .sort((first, second) => {
      const firstStats = teamStatsForPeriod(first, matches, rankingPeriod);
      const secondStats = teamStatsForPeriod(second, matches, rankingPeriod);
      const valueFor = (candidate, stats) => {
        if (teamMetric === "Goals") return Number(stats.goalsFor || 0);
        if (teamMetric === "Cards")
          return (
            Number(stats.yellowCards || 0) + Number(stats.redCards || 0) * 2
          );
        if (teamMetric === "Trophies")
          return teamHonours(candidate, leagues).won.length;
        if (teamMetric === "Fastest to 100") {
          const milestone = matchesToGoalMilestone(candidate, matches);
          return milestone.reached ? 100000 - milestone.matches : -1;
        }
        return Number(stats.rankingScore || stats.points || 0);
      };
      const scoreGap =
        valueFor(second, secondStats) - valueFor(first, firstStats);
      if (scoreGap) return scoreGap;
      const firstDifference =
        Number(firstStats.goalsFor || 0) - Number(firstStats.goalsAgainst || 0);
      const secondDifference =
        Number(secondStats.goalsFor || 0) -
        Number(secondStats.goalsAgainst || 0);
      return secondDifference - firstDifference;
    });
  const standingsTeams = [...allRankingTeams].sort((first, second) => {
    const firstStats = teamStatsForPeriod(first, matches, "All time");
    const secondStats = teamStatsForPeriod(second, matches, "All time");
    const pointsGap =
      Number(secondStats.points || 0) - Number(firstStats.points || 0);
    if (pointsGap) return pointsGap;
    const goalDifference = (stats) =>
      Number(stats.goalsFor || 0) - Number(stats.goalsAgainst || 0);
    return goalDifference(secondStats) - goalDifference(firstStats);
  });
  const rankedPlayers = publicProfiles
    .filter(
      (profile) => profile.role === "Player" && matchesStatFilters(profile),
    )
    .map((profile) => ({
      profile,
      stats: playerStatsForPeriod(profile, rankingPeriod),
    }))
    .sort((first, second) => {
      const key =
        {
          Goals: "goals",
          Assists: "assists",
          Appearances: "appearances",
          Minutes: "minutes",
        }[playerMetric] || "goals";
      if (playerMetric === "Cards")
        return (
          second.stats.yellowCards +
          second.stats.redCards * 2 -
          (first.stats.yellowCards + first.stats.redCards * 2)
        );
      return Number(second.stats[key] || 0) - Number(first.stats[key] || 0);
    });
  const teamMetricDisplay = (candidate) => {
    const stats = teamStatsForPeriod(candidate, matches, rankingPeriod);
    if (teamMetric === "Goals") return `${stats.goalsFor || 0} goals`;
    if (teamMetric === "Cards")
      return `${stats.yellowCards || 0} yellow Â· ${stats.redCards || 0} red`;
    if (teamMetric === "Trophies")
      return `${teamHonours(candidate, leagues).won.length} won`;
    if (teamMetric === "Fastest to 100") {
      const milestone = matchesToGoalMilestone(candidate, matches);
      return milestone.reached
        ? `${milestone.matches} matches`
        : `${milestone.goals || 0} of 100 goals`;
    }
    return `${stats.points || 0} points`;
  };
  const rankingBuckets = [
    ["Overall", null],
    ["Friendlies", "friendlies"],
    ...leagues.map((league) => [league.name, `competition_${league.id}`]),
  ];
  const rankingStatsFor = (candidate) => {
    const bucket = rankingBuckets.find(
      ([label]) => label === rankingFilter,
    )?.[1];
    if (!bucket) return teamStatsForPeriod(candidate, matches, rankingPeriod);
    if (rankingPeriod === "All time")
      return candidate.statsByCompetition?.[bucket] || {};
    const competitionMatches = matches.filter((match) =>
      bucket === "friendlies"
        ? !match.competitionId && match.matchType !== "league"
        : `competition_${match.competitionId}` === bucket,
    );
    return teamStatsForPeriod(candidate, competitionMatches, rankingPeriod);
  };
  useEffect(() => {
    if (startFinder) {
      setFinder(true);
      onFinderOpened?.();
    }
  }, [startFinder, onFinderOpened]);
  if (challengeTeam) {
    const availability = availabilityPosts.find(
      (post) => post.teamId === challengeTeam.id,
    );
    return (
      <ChallengeWizard
        team={challengeTeam}
        ownTeam={team}
        availability={availability}
        matches={matches}
        onSubmit={(terms) => onSendChallenge(challengeTeam, terms)}
        close={() => setChallengeTeam(null)}
      />
    );
  }
  if (creatingTeam)
    return (
      <CreateTeamScreenV2
        close={() => setCreatingTeam(false)}
        onCreateTeam={async (values) => {
          await onCreateTeam(values);
          setCreatingTeam(false);
        }}
      />
    );
  if (postingAvailability)
    return (
      <PostAvailabilityFlow
        close={() => setPostingAvailability(false)}
        team={team}
        onPublish={onPublishAvailability}
        matches={matches}
      />
    );
  if (record)
    return (
      <RecordMatchWizard
        match={communityFixtures[3]}
        close={() => setRecord(false)}
        finish={() => setRecord(false)}
      />
    );
  if (finder)
    return (
      <FriendlyFinder
        close={() => setFinder(false)}
        teams={visibleTeams}
        ownTeam={team}
        challenges={challenges}
        matches={matches}
        availabilityPosts={availabilityPosts}
        onChallenge={(team) => {
          setFinder(false);
          setChallengeTeam(team);
        }}
      />
    );
  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false}>
        {statsOnly ? (
          <View style={s.subHeader}>
            <Pressable
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="Back to More"
            >
              <Ionicons name="arrow-back" size={23} color={C.ink} />
            </Pressable>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <AppText style={s.headerTitle}>STATS</AppText>
              <AppText style={s.headerSub}>PUBLIC FOOTBALL RECORDS</AppText>
            </View>
          </View>
        ) : null}
        {!statsOnly ? (
          <>
            <View style={s.subHeader}>
              {close ? (
                <Pressable onPress={close}>
                  <Ionicons name="arrow-back" size={23} />
                </Pressable>
              ) : (
                <View style={s.friendliesMark}>
                  <AppText style={s.friendliesMarkText}>F</AppText>
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText style={s.headerTitle}>TEAMS</AppText>
                <AppText style={s.headerSub}>
                  DISCOVER. CHALLENGE. PLAY.
                </AppText>
              </View>
              <Ionicons name="add-circle-outline" size={25} />
            </View>
            <View style={s.darkHead}>
              <Label>GRASSROOTS ZIMBABWE</Label>
              <AppText style={s.heroTitle}>Find your{`\n`}next game.</AppText>
              <AppText style={[s.body, { color: "#aaa" }]}>
                Join a league or arrange a friendly with teams near you.
              </AppText>
              <View style={s.actionRow}>
                {false ? (
                  <Pressable style={s.primary} onPress={() => setRecord(true)}>
                    <Ionicons name="camera" color="white" />
                    <AppText style={s.primaryText}>Record result</AppText>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => setFinder(true)}
                  style={[s.primary, { backgroundColor: "#383838" }]}
                >
                  <AppText style={s.primaryText}>Find friendly</AppText>
                </Pressable>
              </View>
            </View>
            <View style={s.tabs}>
              {["Nearby", "Rankings", "My team"].map((t) => (
                <Pressable
                  onPress={() => setTab(t)}
                  key={t}
                  style={[s.tab, tab === t && s.tabActive]}
                >
                  <AppText style={s.tabText}>{t}</AppText>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
        <View style={s.content}>
          {tab === "Nearby" && (
            <>
              <Label>NEAR YOU</Label>
              <AppText style={s.h2}>Teams ready to play</AppText>
              {visibleTeams.map((item) => {
                const availability = availabilityPosts.find(
                  (post) => post.teamId === item.id,
                );
                const request = challenges.find(
                  (challenge) =>
                    ["pending", "negotiating", "accepted"].includes(
                      challenge.status,
                    ) &&
                    [
                      challenge.senderTeamId,
                      challenge.recipientTeamId,
                    ].includes(team?.id) &&
                    [
                      challenge.senderTeamId,
                      challenge.recipientTeamId,
                    ].includes(item.id),
                );
                const incoming = request?.recipientTeamId === team?.id;
                const conflictingMatch = availability
                  ? matches.find(
                      (match) =>
                        [
                          "confirmed",
                          "result_pending",
                          "result_disputed",
                        ].includes(match.status) &&
                        match.participantTeamIds?.includes(item.id) &&
                        match.matchDate === availability.date &&
                        match.kickoff === availability.time,
                    )
                  : null;
                const opponentName = conflictingMatch
                  ? conflictingMatch.homeTeamId === item.id
                    ? conflictingMatch.awayTeamName
                    : conflictingMatch.homeTeamName
                  : "";
                return (
                  <View style={s.teamDiscoveryRow} key={item.name}>
                    <View style={s.teamDiscoveryProfile}>
                      <CrestPreview
                        shape={item.crest?.shape || 0}
                        color={item.crest?.color || C.redDark}
                        label={item.crest?.label || initials(item.name)}
                        small
                      />
                      <View style={{ flex: 1 }}>
                        <AppText style={s.team}>{item.name}</AppText>
                        <AppText style={s.meta}>
                          {item.area || "Area not added"} ·{" "}
                          {item.stats?.players ?? 0} players
                        </AppText>
                        {conflictingMatch ? (
                          <View style={s.teamTrustLine}>
                            <Ionicons
                              name="close-circle"
                              size={12}
                              color={C.red}
                            />
                            <AppText
                              style={[s.teamTrustText, { color: C.red }]}
                            >
                              Unavailable · playing {opponentName}
                            </AppText>
                          </View>
                        ) : availability ? (
                          <View style={s.teamTrustLine}>
                            <Ionicons
                              name="calendar-outline"
                              size={12}
                              color={C.green}
                            />
                            <AppText style={s.teamTrustText}>
                              Available{" "}
                              {availability.date
                                ? formatStoredDate(availability.date)
                                : availability.days?.join(" and ")}{" "}
                              · {availability.time}
                            </AppText>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <Pressable
                      disabled={Boolean(request || conflictingMatch)}
                      style={[
                        s.challengeButton,
                        (request || conflictingMatch) && s.buttonDisabled,
                      ]}
                      onPress={() => setChallengeTeam(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Challenge ${item.name}`}
                    >
                      <AppText style={s.buttonText}>
                        {incoming
                          ? "Received"
                          : conflictingMatch
                            ? "Unavailable"
                            : request
                              ? "Sent"
                              : "Challenge"}
                      </AppText>
                    </Pressable>
                  </View>
                );
              })}
              {!visibleTeams.length ? (
                <View style={s.emptyState}>
                  <Ionicons name="search-outline" size={30} color={C.muted} />
                  <AppText style={s.team}>No other teams yet</AppText>
                  <AppText style={s.body}>
                    Teams created by other coaches will appear here.
                  </AppText>
                </View>
              ) : null}
              <View style={s.friendly}>
                <Ionicons name="hand-left" color="white" size={26} />
                <AppText style={s.storyTitle}>Just looking for a game?</AppText>
                <AppText style={s.heroBody}>
                  Post your preferred day and area. Nearby teams can challenge
                  you.
                </AppText>
                <Pressable
                  style={[s.outlineButton, { backgroundColor: "white" }]}
                  onPress={() => setPostingAvailability(true)}
                >
                  <AppText style={s.buttonText}>Post availability</AppText>
                </Pressable>
              </View>
            </>
          )}
          {tab === "Rankings" && (
            <>
              <View style={s.statsScopeHeader}>
                <View style={s.statsScopeIcon}>
                  <Ionicons name="podium-outline" size={22} color={C.red} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={s.team}>Team rankings</AppText>
                  <AppText style={s.body}>
                    Confirmed results only. Detailed records are in More, then
                    Stats.
                  </AppText>
                </View>
              </View>
              {standingsTeams.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View>
                    <StandingsHeader />
                    {standingsTeams.map((candidate, index) => (
                      <View key={candidate.id}>
                        <StandingsRow
                          position={index + 1}
                          team={candidate}
                          stats={teamStatsForPeriod(
                            candidate,
                            matches,
                            "All time",
                          )}
                        />
                      </View>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <View style={s.emptyState}>
                  <Ionicons name="podium-outline" size={30} color={C.muted} />
                  <AppText style={s.team}>No rankings yet</AppText>
                  <AppText style={s.body}>
                    The table starts after a result is confirmed.
                  </AppText>
                </View>
              )}
            </>
          )}
          {tab === "Stats" && (
            <>
              <View style={s.statsScopeHeader}>
                <View style={s.statsScopeIcon}>
                  <Ionicons name="podium-outline" size={22} color={C.red} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={s.team}>Public football statistics</AppText>
                  <AppText style={s.body}>
                    Teams and players, built from confirmed records.
                  </AppText>
                </View>
              </View>
              <StatsChoiceControl
                options={["Teams", "Players"]}
                value={statsLevel}
                onChange={(level) => {
                  setStatsLevel(level);
                  setRankingTeam(null);
                }}
              />
              <StatsPeriodControl
                value={rankingPeriod}
                onChange={(period) => {
                  setRankingPeriod(period);
                  setRankingTeam(null);
                }}
              />
              <AppText style={s.statsFilterLabel}>REGION</AppText>
              <StatsChoiceControl
                options={regionOptions}
                value={regionFilter}
                onChange={(region) => {
                  setRegionFilter(region);
                  setRankingTeam(null);
                }}
              />
              <AppText style={s.statsFilterLabel}>AGE GROUP</AppText>
              <StatsChoiceControl
                options={ageOptions}
                value={ageFilter}
                onChange={(age) => {
                  setAgeFilter(age);
                  setRankingTeam(null);
                }}
              />
              {statsLevel === "Teams" ? (
                <>
                  <AppText style={s.statsFilterLabel}>TEAM RECORD</AppText>
                  <StatsChoiceControl
                    options={[
                      "Ranking",
                      "Goals",
                      "Cards",
                      "Fastest to 100",
                      "Trophies",
                    ]}
                    value={teamMetric}
                    onChange={(metric) => {
                      setTeamMetric(metric);
                      setRankingTeam(null);
                    }}
                  />
                </>
              ) : (
                <>
                  <AppText style={s.statsFilterLabel}>PLAYER RECORD</AppText>
                  <StatsChoiceControl
                    options={[
                      "Goals",
                      "Assists",
                      "Appearances",
                      "Minutes",
                      "Cards",
                    ]}
                    value={playerMetric}
                    onChange={setPlayerMetric}
                  />
                </>
              )}
              {statsLevel === "Teams" && rankingTeam ? (
                <>
                  <Pressable
                    style={s.outlineButton}
                    onPress={() => setRankingTeam(null)}
                  >
                    <Ionicons name="arrow-back" size={18} color={C.red} />
                    <AppText style={s.buttonText}>All team stats</AppText>
                  </Pressable>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={s.optionWrap}>
                      {rankingBuckets.map(([label]) => (
                        <Pressable
                          key={label}
                          onPress={() => setRankingFilter(label)}
                          style={[
                            s.formChoice,
                            rankingFilter === label && s.formChoiceActive,
                          ]}
                        >
                          <AppText
                            style={[
                              s.formChoiceText,
                              rankingFilter === label && s.formChoiceTextActive,
                            ]}
                          >
                            {label}
                          </AppText>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                  <StandingsRow
                    position={
                      rankingTeams.findIndex(
                        (item) => item.id === rankingTeam.id,
                      ) + 1
                    }
                    team={rankingTeam}
                    stats={rankingStatsFor(rankingTeam)}
                    detailed
                  />
                  <PublicTeamStatsProfile
                    team={rankingTeam}
                    matches={matches}
                    leagues={leagues}
                    period={rankingPeriod}
                  />
                </>
              ) : (
                <>
                  {statsLevel === "Players" ? (
                    rankedPlayers.map(({ profile, stats }, index) => {
                      const metricValue =
                        playerMetric === "Cards"
                          ? `${stats.yellowCards} yellow Â· ${stats.redCards} red`
                          : `${
                              stats[
                                {
                                  Goals: "goals",
                                  Assists: "assists",
                                  Appearances: "appearances",
                                  Minutes: "minutes",
                                }[playerMetric] || "goals"
                              ] || 0
                            } ${playerMetric.toLowerCase()}`;
                      return (
                        <View style={s.publicStatsLeaderRow} key={profile.id}>
                          <AppText style={s.publicStatsPosition}>
                            {index + 1}
                          </AppText>
                          <View style={s.playerAvatar}>
                            <AppText style={s.playerAvatarText}>
                              {initials(profile.name)}
                            </AppText>
                          </View>
                          <View style={{ flex: 1 }}>
                            <AppText style={s.team}>{profile.name}</AppText>
                            <AppText style={s.body}>
                              {profile.teamName || profile.club || "Unattached"}{" "}
                              Â· {profile.position || "Player"}
                            </AppText>
                          </View>
                          <AppText style={s.publicStatsValue}>
                            {metricValue}
                          </AppText>
                        </View>
                      );
                    })
                  ) : teamMetric === "Ranking" ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator>
                      <View>
                        <StandingsHeader />
                        {rankingTeams.map((candidate, index) => (
                          <Pressable
                            key={candidate.id}
                            onPress={() => {
                              setRankingFilter("Overall");
                              setRankingTeam(candidate);
                            }}
                          >
                            <StandingsRow
                              position={index + 1}
                              team={candidate}
                              stats={teamStatsForPeriod(
                                candidate,
                                matches,
                                rankingPeriod,
                              )}
                            />
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                  ) : (
                    rankingTeams.map((candidate, index) => (
                      <Pressable
                        style={s.publicStatsLeaderRow}
                        key={candidate.id}
                        onPress={() => {
                          setRankingFilter("Overall");
                          setRankingTeam(candidate);
                        }}
                      >
                        <AppText style={s.publicStatsPosition}>
                          {index + 1}
                        </AppText>
                        <CrestPreview
                          shape={candidate.crest?.shape || 0}
                          color={candidate.crest?.color || C.redDark}
                          label={
                            candidate.crest?.label || initials(candidate.name)
                          }
                          small
                        />
                        <View style={{ flex: 1 }}>
                          <AppText style={s.team}>{candidate.name}</AppText>
                          <AppText style={s.body}>
                            {candidate.area || "Region not added"} Â·{" "}
                            {candidate.ageGroup || "Age not added"}
                          </AppText>
                        </View>
                        <AppText style={s.publicStatsValue}>
                          {teamMetricDisplay(candidate)}
                        </AppText>
                      </Pressable>
                    ))
                  )}
                </>
              )}
              {statsLevel === "Teams" && !rankingTeams.length ? (
                <View style={s.emptyState}>
                  <Ionicons name="podium-outline" size={30} color={C.muted} />
                  <AppText style={s.team}>No team statistics yet</AppText>
                  <AppText style={s.body}>
                    Verified match records will appear here.
                  </AppText>
                </View>
              ) : null}
              {statsLevel === "Players" && !rankedPlayers.length ? (
                <View style={s.emptyState}>
                  <Ionicons name="people-outline" size={30} color={C.muted} />
                  <AppText style={s.team}>No player statistics yet</AppText>
                  <AppText style={s.body}>
                    Verified player match records will appear here.
                  </AppText>
                </View>
              ) : null}
            </>
          )}
          {tab === "My team" && !team ? (
            <View style={s.emptyState}>
              <Ionicons name="shield-outline" size={30} color={C.muted} />
              <AppText style={s.team}>No team created</AppText>
              <AppText style={s.body}>
                Start with your real team name, area, crest and kit.
              </AppText>
              <Pressable
                onPress={() => setCreatingTeam(true)}
                style={s.saveLineupButton}
              >
                <AppText style={s.saveLineupText}>CREATE YOUR TEAM</AppText>
              </Pressable>
            </View>
          ) : null}
          {tab === "My team" && team ? (
            <>
              <View style={s.teamPanel}>
                <CrestPreview
                  shape={team.crest?.shape || 0}
                  color={team.crest?.color || C.red}
                  label={team.crest?.label || initials(team.name)}
                  small
                />
                <View style={{ flex: 1 }}>
                  <Label>YOUR TEAM</Label>
                  <AppText style={s.h2White}>{team.name}</AppText>
                  <AppText style={[s.meta, { color: "#D7C8E6" }]}>
                    {team.area || "No home area added"}
                  </AppText>
                </View>
              </View>
              <View style={s.playerMetricRow}>
                {[
                  [team.stats?.players ?? 0, "PLAYERS"],
                  [team.stats?.matches ?? 0, "MATCHES"],
                  [team.stats?.wins ?? 0, "WINS"],
                  [team.stats?.points ?? 0, "POINTS"],
                ].map(([value, label]) => (
                  <View key={label} style={s.playerMetric}>
                    <AppText style={s.playerMetricValue}>{value}</AppText>
                    <AppText style={s.playerMetricLabel}>{label}</AppText>
                  </View>
                ))}
              </View>
              {[
                ["Home ground", team.ground?.name || "Not added"],
                ["Coach", team.coachName || "Not added"],
                ["Sponsor", team.sponsor || "Not added"],
              ].map(([label, value]) => (
                <View key={label} style={s.settingRow}>
                  <AppText style={s.meta}>{label.toUpperCase()}</AppText>
                  <AppText style={s.team}>{value}</AppText>
                </View>
              ))}
            </>
          ) : null}
        </View>
      </ScrollView>
      <Modal
        transparent
        visible={record}
        animationType="slide"
        onRequestClose={() => setRecord(false)}
      >
        <View style={s.modalBack}>
          <View style={s.sheet}>
            <Label>MATCH RECORD</Label>
            <AppText style={s.h2}>Submit a result</AppText>
            <AppText style={s.body}>
              Both captains must confirm before rankings update.
            </AppText>
            <View style={s.score}>
              <View>
                <AppText style={s.meta}>HOME</AppText>
                <AppText style={s.team}>Avondale</AppText>
                <TextInput
                  defaultValue="2"
                  keyboardType="number-pad"
                  style={s.scoreInput}
                />
              </View>
              <AppText style={s.h2}>:</AppText>
              <View>
                <AppText style={s.meta}>AWAY</AppText>
                <AppText style={s.team}>Opponent</AppText>
                <TextInput
                  defaultValue="1"
                  keyboardType="number-pad"
                  style={s.scoreInput}
                />
              </View>
            </View>
            <Pressable
              style={s.evidence}
              onPress={async () => {
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ["images", "videos"],
                });
                if (!result.canceled)
                  Alert.alert(
                    "Evidence added",
                    result.assets[0].fileName ||
                      "Media attached to the match record.",
                  );
              }}
            >
              <Ionicons name="camera" size={22} />
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>Add match evidence</AppText>
                <AppText style={s.meta}>
                  Photo, team sheet or short video
                </AppText>
              </View>
              <Ionicons name="add" />
            </Pressable>
            <AppText style={s.trust}>
              Opponent captain has 24 hours to confirm. Disagreements go to
              league admins with your evidence.
            </AppText>
            <Pressable style={s.wideButton} onPress={() => setRecord(false)}>
              <AppText style={s.primaryText}>Send for confirmation</AppText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
function LegacyCreateLeagueScreen({ close, onCreateLeague }) {
  const [name, setName] = useState("");
  const [format, setFormat] = useState("11-a-side");
  const [relegation, setRelegation] = useState(true);
  const [promotion, setPromotion] = useState(true);
  const [subscription, setSubscription] = useState("");
  const [prize, setPrize] = useState("");
  const [sponsor, setSponsor] = useState("");
  const [maxSponsors, setMaxSponsors] = useState("3");
  const [preferAppCreators, setPreferAppCreators] = useState(true);
  const [invite, setInvite] = useState("");
  const [invited, setInvited] = useState([]);
  const [created, setCreated] = useState(false);
  const [createdName, setCreatedName] = useState("");
  const [createdInviteCount, setCreatedInviteCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const addInvite = () => {
    if (!invite.trim()) return;
    setInvited((current) => [...current, invite.trim()]);
    setInvite("");
  };
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      <View style={s.subHeader}>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Back to Leagues"
        >
          <Ionicons name="arrow-back" size={23} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <AppText style={s.headerTitle}>CREATE A LEAGUE</AppText>
          <AppText style={s.headerSub}>COACH & ORGANISER TOOLS</AppText>
        </View>
      </View>
      {created ? (
        <View style={s.createdBanner}>
          <Ionicons name="checkmark-circle" size={24} color={C.green} />
          <View style={{ flex: 1 }}>
            <AppText style={s.team}>{createdName} is ready</AppText>
            <AppText style={s.meta}>
              Invites are queued for {createdInviteCount} coaches.
            </AppText>
          </View>
        </View>
      ) : null}
      <View style={s.formIntro}>
        <AppText style={s.screenTitle}>Build your competition</AppText>
        <AppText style={s.body}>
          Set the sporting rules, invite coaches and make the finances clear
          before teams join.
        </AppText>
      </View>
      <View style={s.formSection}>
        <AppText style={s.formSectionTitle}>League identity</AppText>
        <AppText style={s.formLabel}>League name</AppText>
        <TextInput
          value={name}
          onChangeText={setName}
          style={s.formInput}
          placeholder="League name"
          placeholderTextColor={C.muted}
        />
        <AppText style={s.formLabel}>Maximum sponsors</AppText>
        <TextInput
          value={maxSponsors}
          onChangeText={(value) => setMaxSponsors(numbersOnly(value))}
          keyboardType="number-pad"
          style={s.formInput}
        />
        <Pressable
          onPress={() => setPreferAppCreators((current) => !current)}
          style={s.settingRow}
        >
          <View style={{ flex: 1 }}>
            <AppText style={s.team}>Prefer sponsors using Grassroots</AppText>
            <AppText style={s.meta}>
              In-app sponsors appear first when reviewing proposals
            </AppText>
          </View>
          <View
            style={[s.toggleTrack, preferAppCreators && s.toggleTrackActive]}
          >
            <View
              style={[s.toggleKnob, preferAppCreators && s.toggleKnobActive]}
            />
          </View>
        </Pressable>
        <AppText style={s.formLabel}>Football format</AppText>
        <View style={s.optionWrap}>
          {["11-a-side", "7-a-side", "5-a-side"].map((item) => (
            <Pressable
              key={item}
              onPress={() => setFormat(item)}
              style={[s.formChoice, format === item && s.formChoiceActive]}
            >
              <AppText
                style={[
                  s.formChoiceText,
                  format === item && s.formChoiceTextActive,
                ]}
              >
                {item}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={s.formSection}>
        <AppText style={s.formSectionTitle}>Rules & structure</AppText>
        {[
          [
            "Promotion",
            "Top two move up",
            promotion,
            () => setPromotion(!promotion),
          ],
          [
            "Relegation",
            "Bottom two move down",
            relegation,
            () => setRelegation(!relegation),
          ],
        ].map((item) => (
          <Pressable key={item[0]} style={s.settingRow} onPress={item[3]}>
            <View style={{ flex: 1 }}>
              <AppText style={s.team}>{item[0]}</AppText>
              <AppText style={s.meta}>{item[1]}</AppText>
            </View>
            <View style={[s.toggleTrack, item[2] && s.toggleTrackActive]}>
              <View style={[s.toggleKnob, item[2] && s.toggleKnobActive]} />
            </View>
          </Pressable>
        ))}
        <View style={s.ruleSummary}>
          <View>
            <AppText style={s.ruleValue}>0</AppText>
            <AppText style={s.ruleLabel}>TEAMS</AppText>
          </View>
          <View>
            <AppText style={s.ruleValue}>0</AppText>
            <AppText style={s.ruleLabel}>MATCHDAYS</AppText>
          </View>
          <View>
            <AppText style={s.ruleValue}>3 / 1 / 0</AppText>
            <AppText style={s.ruleLabel}>POINTS</AppText>
          </View>
        </View>
        <Pressable
          style={s.inlineLink}
          onPress={() =>
            Alert.alert(
              "Competition rules",
              "Cards, suspensions and tie-breakers will be included in the league rules sent to every team.",
            )
          }
        >
          <AppText style={s.communitySeeAll}>
            Edit cards, suspensions and tie-breakers
          </AppText>
          <Ionicons name="chevron-forward" size={16} color={C.red} />
        </Pressable>
      </View>
      <View style={s.formSection}>
        <AppText style={s.formSectionTitle}>Subscriptions & rewards</AppText>
        <View style={s.moneyRow}>
          <View style={{ flex: 1 }}>
            <AppText style={s.formLabel}>Team subscription</AppText>
            <View style={s.moneyInput}>
              <AppText style={s.moneyPrefix}>$</AppText>
              <TextInput
                value={subscription}
                onChangeText={(value) => setSubscription(numbersOnly(value))}
                keyboardType="numeric"
                style={s.moneyTextInput}
              />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={s.formLabel}>Winning prize</AppText>
            <View style={s.moneyInput}>
              <AppText style={s.moneyPrefix}>$</AppText>
              <TextInput
                value={prize}
                onChangeText={(value) => setPrize(numbersOnly(value))}
                keyboardType="numeric"
                style={s.moneyTextInput}
              />
            </View>
          </View>
        </View>
        <AppText style={s.formLabel}>Title sponsor</AppText>
        <TextInput
          value={sponsor}
          onChangeText={setSponsor}
          style={s.formInput}
          placeholder="Optional sponsor name"
          placeholderTextColor={C.muted}
        />
        <AppText style={s.formLabel}>Maximum sponsors</AppText>
        <TextInput
          value={maxSponsors}
          onChangeText={(value) => setMaxSponsors(numbersOnly(value))}
          keyboardType="number-pad"
          style={s.formInput}
        />
        <Pressable
          onPress={() => setPreferAppCreators((current) => !current)}
          style={s.settingRow}
        >
          <View style={{ flex: 1 }}>
            <AppText style={s.team}>Prefer in-app sponsors</AppText>
            <AppText style={s.meta}>
              Sponsors with saved Grassroots profiles appear first
            </AppText>
          </View>
          <View
            style={[s.toggleTrack, preferAppCreators && s.toggleTrackActive]}
          >
            <View
              style={[s.toggleKnob, preferAppCreators && s.toggleKnobActive]}
            />
          </View>
        </Pressable>
        <AppText style={s.formHelp}>
          Subscriptions, prize payments and sponsor income will be tracked in
          one league ledger.
        </AppText>
      </View>
      <View style={s.formSection}>
        <AppText style={s.formSectionTitle}>Invite coaches</AppText>
        <View style={s.inviteComposer}>
          <TextInput
            value={invite}
            onChangeText={setInvite}
            style={s.inviteInput}
            placeholder="Name, phone or email"
            placeholderTextColor={C.muted}
          />
          <Pressable onPress={addInvite} style={s.inviteButton}>
            <Ionicons name="add" color="white" size={19} />
          </Pressable>
        </View>
        {invited.map((coach) => (
          <View style={s.invitedRow} key={coach}>
            <View style={s.playerAvatar}>
              <AppText style={s.playerAvatarText}>{initials(coach)}</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={s.team}>{coach}</AppText>
              <AppText style={s.meta}>Coach invite ready</AppText>
            </View>
            <Ionicons name="checkmark-circle" size={19} color={C.green} />
          </View>
        ))}
      </View>
      <View style={s.formFooter}>
        <Pressable
          disabled={saving || created || !name.trim()}
          style={[
            s.saveLineupButton,
            (saving || created || !name.trim()) && s.buttonDisabled,
          ]}
          onPress={async () => {
            setSaving(true);
            try {
              await onCreateLeague({
                name: name.trim(),
                format,
                promotion,
                relegation,
                subscription: Number(subscription || 0),
                prize: Number(prize || 0),
                sponsor: sponsor.trim(),
                maxSponsors: Number(maxSponsors || 0),
                preferAppCreators,
                invited,
              });
              setCreatedName(name.trim());
              setCreatedInviteCount(invited.length);
              setName("");
              setSubscription("");
              setPrize("");
              setSponsor("");
              setInvite("");
              setInvited([]);
              setCreated(true);
            } catch {
              Alert.alert(
                "Couldn’t create league",
                "Please check your connection and try again.",
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          <Ionicons name="trophy-outline" color="white" size={18} />
          <AppText style={s.saveLineupText}>
            {saving ? "CREATING" : created ? "LEAGUE CREATED" : "CREATE LEAGUE"}
          </AppText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function CreateLeagueScreen({ close, onCreateLeague, publicProfiles = [] }) {
  const [name, setName] = useState("");
  const [competitionType, setCompetitionType] = useState("Round robin");
  const [fixtureCycle, setFixtureCycle] = useState("Play once");
  const [format, setFormat] = useState("11 a side");
  const [startDate, setStartDate] = useState("");
  const [kickoffStart, setKickoffStart] = useState("15:00");
  const [schedulePace, setSchedulePace] = useState("Every 7 days");
  const [customScheduleDays, setCustomScheduleDays] = useState("");
  const [baseVenue, setBaseVenue] = useState("");
  const [venueCount, setVenueCount] = useState("1");
  const [matchDuration, setMatchDuration] = useState("60");
  const [minimumRest, setMinimumRest] = useState("30");
  const [visibility, setVisibility] = useState("Public");
  const [maxTeams, setMaxTeams] = useState("12");
  const [joiningFee, setJoiningFee] = useState("");
  const [sponsor, setSponsor] = useState("");
  const [maxSponsors, setMaxSponsors] = useState("3");
  const [preferAppCreators, setPreferAppCreators] = useState(true);
  const [rulesPreset, setRulesPreset] = useState("Community standard");
  const [rules, setRules] = useState("");
  const [invite, setInvite] = useState("");
  const [invited, setInvited] = useState([]);
  const [awards, setAwards] = useState([
    { id: "champions", label: "Champions", amount: "" },
    { id: "runners-up", label: "Runners up", amount: "" },
    {
      id: "player-of-tournament",
      label: "Player of the tournament",
      amount: "",
    },
  ]);
  const [saving, setSaving] = useState(false);
  const inviteResults = invite.trim()
    ? publicProfiles
        .filter(
          (profile) =>
            profile.role === "Coach" &&
            !invited.some((item) => item.ownerId === profile.ownerId) &&
            `${profile.name || ""} ${profile.area || ""}`
              .toLowerCase()
              .includes(invite.trim().toLowerCase()),
        )
        .slice(0, 6)
    : [];
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 34 }}
    >
      <View style={s.subHeader}>
        <Pressable onPress={close} accessibilityLabel="Back to competitions">
          <Ionicons name="close" size={23} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <AppText style={s.headerTitle}>CREATE COMPETITION</AppText>
          <AppText style={s.headerSub}>FORMAT, ACCESS, MONEY AND RULES</AppText>
        </View>
      </View>
      <View style={s.formIntro}>
        <AppText style={s.screenTitle}>Build the whole competition</AppText>
        <AppText style={s.body}>
          Choose how teams enter, how games run and where every award goes.
        </AppText>
      </View>
      <View style={s.formSection}>
        <AppText style={s.formSectionTitle}>Identity and format</AppText>
        <AppText style={s.formLabel}>Competition name</AppText>
        <TextInput
          value={name}
          onChangeText={setName}
          style={s.formInput}
          placeholder="Competition name"
          placeholderTextColor={C.muted}
        />
        <ProfileChoiceGroup
          label="Competition type"
          options={[
            "Round robin",
            "Knockout",
            "Community Shield",
            "One day tournament",
            "Two day tournament",
            "World Cup format",
          ]}
          value={competitionType}
          onChange={(value) => {
            setCompetitionType(value);
            if (value === "Community Shield") setMaxTeams("2");
            if (
              ["One day tournament", "Two day tournament"].includes(value) &&
              kickoffStart === "15:00"
            )
              setKickoffStart("09:00");
          }}
        />
        <ProfileChoiceGroup
          label="Football format"
          options={["11 a side", "7 a side", "5 a side"]}
          value={format}
          onChange={setFormat}
        />
        {competitionType === "Round robin" ? (
          <>
            <ProfileChoiceGroup
              label="League fixtures"
              options={["Play once", "Home and away"]}
              value={fixtureCycle}
              onChange={setFixtureCycle}
            />
            <AppText style={s.formHelp}>
              {fixtureCycle === "Home and away"
                ? "Each pair meets twice, with one match hosted by each team."
                : "Each pair meets once, with the home team assigned in the fixture plan."}
            </AppText>
          </>
        ) : null}
      </View>
      <View style={s.formSection}>
        <AppText style={s.formSectionTitle}>Match calendar</AppText>
        <AppText style={s.formLabel}>First match date</AppText>
        <DateField
          value={startDate}
          onChange={setStartDate}
          minimumDate={new Date()}
          accessibilityLabel="Choose the first competition date"
        />
        <AppText style={s.formLabel}>First kickoff</AppText>
        <TextInput
          value={kickoffStart}
          onChangeText={setKickoffStart}
          keyboardType="numbers-and-punctuation"
          style={s.formInput}
          placeholder="15:00"
          placeholderTextColor={C.muted}
        />
        {!["One day tournament", "Two day tournament"].includes(
          competitionType,
        ) ? (
          <ProfileChoiceGroup
            label="Matchday spacing"
            options={[
              "Every day",
              "Every 2 days",
              "Every 3 days",
              "Every 7 days",
              "Every 14 days",
              "Custom",
            ]}
            value={schedulePace}
            onChange={setSchedulePace}
          />
        ) : null}
        {schedulePace === "Custom" &&
        !["One day tournament", "Two day tournament"].includes(
          competitionType,
        ) ? (
          <>
            <AppText style={s.formLabel}>Days between matchdays</AppText>
            <TextInput
              value={customScheduleDays}
              onChangeText={(value) =>
                setCustomScheduleDays(numbersOnly(value))
              }
              keyboardType="number-pad"
              style={s.formInput}
              placeholder="For example 5"
              placeholderTextColor={C.muted}
            />
          </>
        ) : null}
        <AppText style={s.formLabel}>Main venue or directions</AppText>
        <TextInput
          value={baseVenue}
          onChangeText={setBaseVenue}
          style={s.formInput}
          placeholder="Optional · home ground is used when blank"
          placeholderTextColor={C.muted}
        />
        {["One day tournament", "Two day tournament"].includes(
          competitionType,
        ) ? (
          <>
            <AppText style={s.formLabel}>Pitches available</AppText>
            <TextInput
              value={venueCount}
              onChangeText={(value) => setVenueCount(numbersOnly(value))}
              keyboardType="number-pad"
              style={s.formInput}
              placeholder="1"
              placeholderTextColor={C.muted}
            />
            <AppText style={s.formLabel}>Minutes per match</AppText>
            <TextInput
              value={matchDuration}
              onChangeText={(value) => setMatchDuration(numbersOnly(value))}
              keyboardType="number-pad"
              style={s.formInput}
              placeholder="60"
              placeholderTextColor={C.muted}
            />
            <AppText style={s.formLabel}>Minimum rest between games</AppText>
            <TextInput
              value={minimumRest}
              onChangeText={(value) => setMinimumRest(numbersOnly(value))}
              keyboardType="number-pad"
              style={s.formInput}
              placeholder="30"
              placeholderTextColor={C.muted}
            />
          </>
        ) : null}
        <View style={s.profilePrivacyNote}>
          <Ionicons name="calendar-outline" size={21} color={C.red} />
          <AppText style={[s.body, { flex: 1 }]}>
            {competitionType === "One day tournament"
              ? "Games share this date and receive staggered kickoff times."
              : competitionType === "Two day tournament"
                ? "Group games begin here and progression can continue the next day."
                : "Known fixtures are added to Upcoming automatically. Both teams must approve any later time change."}
          </AppText>
        </View>
      </View>
      <View style={s.formSection}>
        <AppText style={s.formSectionTitle}>Who can join</AppText>
        <ProfileChoiceGroup
          label="Access"
          options={["Public", "Private"]}
          value={visibility}
          onChange={setVisibility}
        />
        <AppText style={s.formHelp}>
          {visibility === "Private"
            ? "Only invited teams can join."
            : "Any team can join until the competition is full."}
        </AppText>
        <AppText style={s.formLabel}>Maximum teams</AppText>
        <TextInput
          value={maxTeams}
          onChangeText={(value) => setMaxTeams(numbersOnly(value))}
          keyboardType="number-pad"
          style={s.formInput}
          placeholder="12"
          placeholderTextColor={C.muted}
        />
      </View>
      <View style={s.formSection}>
        <AppText style={s.formSectionTitle}>Entry fee and awards</AppText>
        <AppText style={s.formLabel}>Joining fee per team</AppText>
        <View style={s.moneyInput}>
          <AppText style={s.moneyPrefix}>$</AppText>
          <TextInput
            value={joiningFee}
            onChangeText={(value) => setJoiningFee(numbersOnly(value))}
            keyboardType="number-pad"
            style={s.moneyTextInput}
          />
        </View>
        {awards.map((award, index) => (
          <View style={s.moneyRow} key={award.id}>
            <TextInput
              value={award.label}
              onChangeText={(label) =>
                setAwards((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, label } : item,
                  ),
                )
              }
              style={[s.formInput, { flex: 1 }]}
              placeholder="Award name"
              placeholderTextColor={C.muted}
            />
            <View style={[s.moneyInput, { flex: 1 }]}>
              <AppText style={s.moneyPrefix}>$</AppText>
              <TextInput
                value={award.amount}
                onChangeText={(amount) =>
                  setAwards((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, amount: numbersOnly(amount) }
                        : item,
                    ),
                  )
                }
                keyboardType="number-pad"
                style={s.moneyTextInput}
              />
            </View>
            {awards.length > 1 ? (
              <Pressable
                onPress={() =>
                  setAwards((current) =>
                    current.filter((item) => item.id !== award.id),
                  )
                }
              >
                <Ionicons name="close-circle" size={22} color={C.muted} />
              </Pressable>
            ) : null}
          </View>
        ))}
        <Pressable
          style={s.outlineButton}
          onPress={() =>
            setAwards((current) => [
              ...current,
              { id: `${Date.now()}`, label: "", amount: "" },
            ])
          }
        >
          <Ionicons name="add" size={18} color={C.red} />
          <AppText style={s.buttonText}>ADD AWARD</AppText>
        </Pressable>
        <AppText style={s.formLabel}>Title sponsor</AppText>
        <TextInput
          value={sponsor}
          onChangeText={setSponsor}
          style={s.formInput}
          placeholder="Optional"
          placeholderTextColor={C.muted}
        />
        <AppText style={s.formLabel}>Maximum sponsors</AppText>
        <TextInput
          value={maxSponsors}
          onChangeText={(value) => setMaxSponsors(numbersOnly(value))}
          keyboardType="number-pad"
          style={s.formInput}
        />
        <Pressable
          onPress={() => setPreferAppCreators((current) => !current)}
          style={s.settingRow}
        >
          <View style={{ flex: 1 }}>
            <AppText style={s.team}>Prefer in-app sponsors</AppText>
            <AppText style={s.meta}>
              Sponsors with saved Grassroots profiles appear first
            </AppText>
          </View>
          <View
            style={[s.toggleTrack, preferAppCreators && s.toggleTrackActive]}
          >
            <View
              style={[s.toggleKnob, preferAppCreators && s.toggleKnobActive]}
            />
          </View>
        </Pressable>
      </View>
      <View style={s.formSection}>
        <AppText style={s.formSectionTitle}>Rules</AppText>
        <ProfileChoiceGroup
          label="Preset"
          options={[
            "Community standard",
            "Youth safeguarding",
            "Knockout standard",
            "Custom",
          ]}
          value={rulesPreset}
          onChange={setRulesPreset}
        />
        <AppText style={s.formLabel}>Extra rules</AppText>
        <TextInput
          value={rules}
          onChangeText={setRules}
          multiline
          style={[s.formInput, { minHeight: 100, textAlignVertical: "top" }]}
          placeholder="Eligibility, cards, tie breakers and match length"
          placeholderTextColor={C.muted}
        />
      </View>
      <View style={s.formSection}>
        <AppText style={s.formSectionTitle}>Invite teams</AppText>
        <TextInput
          value={invite}
          onChangeText={setInvite}
          style={s.formInput}
          placeholder="Start typing a coach or area"
          placeholderTextColor={C.muted}
        />
        {inviteResults.map((profile) => (
          <Pressable
            key={profile.id}
            style={s.playerDirectoryRow}
            onPress={() => {
              setInvited((current) => [
                ...current,
                {
                  id: profile.id,
                  ownerId: profile.ownerId,
                  name: profile.name,
                  area: profile.area || "",
                },
              ]);
              setInvite("");
            }}
          >
            <View style={s.playerAvatar}>
              <AppText style={s.playerAvatarText}>
                {initials(profile.name)}
              </AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={s.team}>{profile.name}</AppText>
              <AppText style={s.meta}>
                {profile.area || "Area not added"} · Coach
              </AppText>
            </View>
            <Ionicons name="add-circle" size={21} color={C.red} />
          </Pressable>
        ))}
        {invite.trim() && !inviteResults.length ? (
          <AppText style={s.formHelp}>No matching in app coach found.</AppText>
        ) : null}
        {invited.map((profile) => (
          <View style={s.invitedRow} key={profile.ownerId}>
            <View style={{ flex: 1 }}>
              <AppText style={s.team}>{profile.name}</AppText>
              <AppText style={s.meta}>
                {profile.area || "Coach invited"}
              </AppText>
            </View>
            <Pressable
              onPress={() =>
                setInvited((current) =>
                  current.filter((item) => item.ownerId !== profile.ownerId),
                )
              }
            >
              <Ionicons name="close-circle" size={21} color={C.muted} />
            </Pressable>
          </View>
        ))}
      </View>
      <View style={s.formFooter}>
        <Pressable
          disabled={
            saving ||
            !name.trim() ||
            !Number(maxTeams) ||
            !startDate ||
            !validClockTime(kickoffStart)
          }
          style={[
            s.saveLineupButton,
            (saving ||
              !name.trim() ||
              !Number(maxTeams) ||
              !startDate ||
              !validClockTime(kickoffStart)) &&
              s.buttonDisabled,
          ]}
          onPress={async () => {
            setSaving(true);
            try {
              await onCreateLeague({
                name: name.trim(),
                competitionType,
                fixtureCycle,
                format,
                startDate,
                kickoffStart,
                schedulePaceDays:
                  schedulePace === "Custom"
                    ? Math.max(1, Number(customScheduleDays || 1))
                    : Number(schedulePace.match(/\d+/)?.[0] || 1),
                baseVenue: baseVenue.trim(),
                venueCount: Math.max(1, Number(venueCount || 1)),
                matchDurationMinutes: Math.max(10, Number(matchDuration || 60)),
                minimumRestMinutes: Math.max(0, Number(minimumRest || 0)),
                visibility: visibility.toLowerCase(),
                maxTeams: Number(maxTeams),
                joiningFee: Number(joiningFee || 0),
                sponsor: sponsor.trim(),
                maxSponsors: Number(maxSponsors || 0),
                preferAppCreators,
                rulesPreset,
                rules: rules.trim(),
                awards: awards
                  .filter((award) => award.label.trim())
                  .map((award) => ({
                    ...award,
                    label: award.label.trim(),
                    amount: Number(award.amount || 0),
                  })),
                invited,
                invitedUserIds: invited.map((item) => item.ownerId),
              });
              Alert.alert("Competition created", `${name.trim()} is ready.`);
              close();
            } catch (error) {
              Alert.alert(
                "Couldn’t create competition",
                error?.message || "Please check your connection and try again.",
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          <Ionicons name="trophy-outline" color="white" size={18} />
          <AppText style={s.saveLineupText}>
            {saving ? "CREATING" : "CREATE COMPETITION"}
          </AppText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const crestShapes = [
  {
    name: "Shield",
    icon: "flash",
    style: {
      borderRadius: 8,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
  },
  { name: "Round", icon: "football", style: { borderRadius: 30 } },
  { name: "Oval", icon: "star", style: { borderRadius: 28, width: 48 } },
  { name: "Square", icon: "diamond", style: { borderRadius: 4 } },
  {
    name: "Banner",
    icon: "flame",
    style: {
      borderRadius: 5,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
    },
  },
  { name: "Crown", icon: "ribbon", style: { borderRadius: 12 } },
  {
    name: "Classic",
    icon: "trophy",
    style: {
      borderRadius: 7,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
    },
  },
  {
    name: "Roundel",
    icon: "planet",
    style: { borderRadius: 32, borderWidth: 4 },
  },
  { name: "Academy", icon: "school", style: { borderRadius: 18, width: 52 } },
  {
    name: "Heritage",
    icon: "leaf",
    style: { borderRadius: 6, transform: [{ rotate: "3deg" }] },
  },
];

function CrestPreview({
  shape = 0,
  color = C.redDark,
  label = "AS",
  small = false,
}) {
  const crest = crestShapes[shape] || crestShapes[0];
  return (
    <View
      style={[
        s.crestPreview,
        small && s.crestPreviewSmall,
        crest.style,
        { backgroundColor: color },
      ]}
    >
      <View style={s.crestBand} />
      <Ionicons name={crest.icon} size={small ? 17 : 26} color="white" />
      {label ? (
        <AppText style={[s.crestPreviewText, small && s.crestPreviewTextSmall]}>
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

function JerseyArt({ kit, size = "large", sponsor = "", crestLabel = "" }) {
  const configured = Boolean(kit);
  const primary = kit?.primary || "#E8E4EC";
  const accent = kit?.accent || "#BEB7C6";
  const pattern = kit?.pattern || "Blank";
  const width = size === "small" ? 76 : 150;
  const height = size === "small" ? 78 : 154;
  const shirtPath =
    "M48 20 L64 12 Q80 24 96 12 L112 20 L146 38 L132 69 L112 58 L108 132 Q80 143 52 132 L48 58 L28 69 L14 38 Z";
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox="0 0 160 160">
        <Defs>
          <ClipPath id="shirtClip">
            <Path d={shirtPath} />
          </ClipPath>
          <LinearGradient id="fabricLight" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#000" stopOpacity="0.28" />
            <Stop offset="0.22" stopColor="#fff" stopOpacity="0.12" />
            <Stop offset="0.5" stopColor="#fff" stopOpacity="0.03" />
            <Stop offset="0.78" stopColor="#000" stopOpacity="0.09" />
            <Stop offset="1" stopColor="#000" stopOpacity="0.38" />
          </LinearGradient>
          <LinearGradient id="collarLight" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#fff" stopOpacity="0.34" />
            <Stop offset="1" stopColor="#000" stopOpacity="0.32" />
          </LinearGradient>
        </Defs>
        <Ellipse
          cx="80"
          cy="150"
          rx="48"
          ry="6"
          fill="#17131D"
          opacity="0.18"
        />
        <G clipPath="url(#shirtClip)">
          <Rect width="160" height="145" fill={primary} />
          {configured && pattern === "Stripes"
            ? [20, 52, 84, 116].map((x) => (
                <Rect
                  key={x}
                  x={x}
                  y="0"
                  width="16"
                  height="145"
                  fill={accent}
                />
              ))
            : null}
          {configured && pattern === "Hoops"
            ? [38, 70, 102].map((y) => (
                <Rect
                  key={y}
                  x="0"
                  y={y}
                  width="160"
                  height="14"
                  fill={accent}
                />
              ))
            : null}
          {configured && pattern === "Sash" ? (
            <Path d="M28 3 L55 3 L132 145 L105 145 Z" fill={accent} />
          ) : null}
          <Rect width="160" height="145" fill="url(#fabricLight)" />
          {[56, 64, 72, 80, 88, 96, 104].map((x) => (
            <Path
              key={x}
              d={`M${x} 26 Q${x - 3} 76 ${x} 132`}
              stroke="#fff"
              strokeOpacity="0.055"
              strokeWidth="1"
              fill="none"
            />
          ))}
        </G>
        <Path
          d={shirtPath}
          fill="none"
          stroke="#17131D"
          strokeOpacity="0.36"
          strokeWidth="1.5"
        />
        <Path
          d="M63 13 Q80 38 97 13 Q91 31 80 33 Q69 31 63 13Z"
          fill={accent}
        />
        <Path
          d="M63 13 Q80 38 97 13"
          fill="none"
          stroke="url(#collarLight)"
          strokeWidth="5"
        />
        <Path
          d="M48 57 Q80 67 112 57"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.12"
        />
        {configured && crestLabel ? (
          <>
            <Ellipse cx="62" cy="52" rx="8" ry="9" fill="#fff" opacity="0.92" />
            <SvgText
              x="62"
              y="55"
              textAnchor="middle"
              fontSize="6"
              fontWeight="800"
              fill={primary}
            >
              {crestLabel}
            </SvgText>
          </>
        ) : null}
        {configured && sponsor ? (
          <SvgText
            x="80"
            y="82"
            textAnchor="middle"
            fontSize={sponsor.length > 12 ? "8" : "10"}
            fontWeight="800"
            fill="#fff"
          >
            {sponsor.slice(0, 18).toUpperCase()}
          </SvgText>
        ) : null}
        {!configured ? (
          <SvgText
            x="80"
            y="82"
            textAnchor="middle"
            fontSize="24"
            fill={C.muted}
          >
            +
          </SvgText>
        ) : null}
      </Svg>
    </View>
  );
}

function TeamSetupTool({ tool, close }) {
  const [contact, setContact] = useState("");
  const [items, setItems] = useState([]);
  const [permission, setPermission] = useState("Squad & lineup");
  const [ground, setGround] = useState("");
  const [area, setArea] = useState("");
  const [groundCoordinate, setGroundCoordinate] = useState({
    latitude: -17.8249,
    longitude: 31.053,
  });
  const [groundSaved, setGroundSaved] = useState(false);
  const [checks, setChecks] = useState({
    captain: false,
    phone: false,
    identity: false,
    ground: false,
  });
  const [verificationSent, setVerificationSent] = useState(false);
  const addItem = () => {
    if (!contact.trim()) return;
    setItems((current) => [...current, { name: contact.trim(), permission }]);
    setContact("");
  };
  const verifiedReady = Object.values(checks).every(Boolean);
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      <View style={s.subHeader}>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Back to team creation"
        >
          <Ionicons name="arrow-back" size={23} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <AppText style={s.headerTitle}>{tool.toUpperCase()}</AppText>
          <AppText style={s.headerSub}>TEAM SETUP</AppText>
        </View>
      </View>
      <View style={s.formIntro}>
        <AppText style={s.screenTitle}>{tool}</AppText>
        <AppText style={s.body}>
          {tool === "Player invitations"
            ? "Invite players now and track every pending place."
            : tool === "Assistant coaches"
              ? "Add staff with a clear, limited permission level."
              : tool === "Home ground"
                ? "Save the ground teams will use for fixture and travel checks."
                : "Submit evidence once the team identity is complete."}
        </AppText>
      </View>
      {tool === "Player invitations" ? (
        <View style={s.formSection}>
          <AppText style={s.formLabel}>Phone number or email</AppText>
          <View style={s.inviteComposer}>
            <TextInput
              value={contact}
              onChangeText={setContact}
              style={s.inviteInput}
              placeholder="e.g. +263 77 123 4567"
              placeholderTextColor={C.muted}
            />
            <Pressable
              onPress={addItem}
              style={s.inviteButton}
              accessibilityLabel="Send player invitation"
            >
              <Ionicons name="send" color="white" size={18} />
            </Pressable>
          </View>
          {items.map((item) => (
            <View key={item.name} style={s.invitedRow}>
              <View style={s.playerAvatar}>
                <AppText style={s.playerAvatarText}>
                  {initials(item.name)}
                </AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>{item.name}</AppText>
                <AppText style={s.meta}>
                  Invite sent · expires in 7 days
                </AppText>
              </View>
              <Ionicons name="checkmark-circle" color={C.green} size={20} />
            </View>
          ))}
          {!items.length ? (
            <View style={s.setupEmpty}>
              <AppText style={s.team}>No invitations yet</AppText>
              <AppText style={s.body}>
                Add the first player by phone or email.
              </AppText>
            </View>
          ) : null}
        </View>
      ) : null}
      {tool === "Assistant coaches" ? (
        <View style={s.formSection}>
          <AppText style={s.formLabel}>Coach phone or email</AppText>
          <TextInput
            value={contact}
            onChangeText={setContact}
            style={s.formInput}
            placeholder="Coach contact"
            placeholderTextColor={C.muted}
          />
          <AppText style={s.formLabel}>Permission</AppText>
          <View style={s.optionWrap}>
            {["Squad & lineup", "Fixtures & chat", "Full team access"].map(
              (item) => (
                <Pressable
                  key={item}
                  onPress={() => setPermission(item)}
                  style={[
                    s.formChoice,
                    permission === item && s.formChoiceActive,
                  ]}
                >
                  <AppText
                    style={[
                      s.formChoiceText,
                      permission === item && s.formChoiceTextActive,
                    ]}
                  >
                    {item}
                  </AppText>
                </Pressable>
              ),
            )}
          </View>
          <Pressable onPress={addItem} style={s.saveLineupButton}>
            <Ionicons name="person-add-outline" color="white" size={18} />
            <AppText style={s.saveLineupText}>INVITE ASSISTANT</AppText>
          </Pressable>
          {items.map((item) => (
            <View key={item.name} style={s.invitedRow}>
              <View style={s.playerAvatar}>
                <AppText style={s.playerAvatarText}>
                  {initials(item.name)}
                </AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>{item.name}</AppText>
                <AppText style={s.meta}>{item.permission} · Pending</AppText>
              </View>
              <Ionicons name="time-outline" color={C.red} size={20} />
            </View>
          ))}
        </View>
      ) : null}
      {tool === "Home ground" ? (
        <View style={s.formSection}>
          {groundSaved ? (
            <View style={s.inlineSuccess}>
              <Ionicons name="checkmark-circle" color={C.green} size={21} />
              <AppText style={s.team}>Home ground saved</AppText>
            </View>
          ) : null}
          <AppText style={s.formLabel}>Ground name</AppText>
          <TextInput
            value={ground}
            onChangeText={(value) => {
              setGround(value);
              setGroundSaved(false);
            }}
            style={s.formInput}
          />
          <AppText style={s.formLabel}>Area</AppText>
          <TextInput
            value={area}
            onChangeText={(value) => {
              setArea(value);
              setGroundSaved(false);
            }}
            style={s.formInput}
          />
          <GroundMap
            coordinate={groundCoordinate}
            onChange={setGroundCoordinate}
          />
          <Pressable
            onPress={() =>
              setGroundSaved(Boolean(ground.trim() && area.trim()))
            }
            style={[s.saveLineupButton, groundSaved && s.saveLineupButtonSaved]}
          >
            <Ionicons name="location-outline" color="white" size={18} />
            <AppText style={s.saveLineupText}>
              {groundSaved ? "GROUND SAVED" : "SAVE HOME GROUND"}
            </AppText>
          </Pressable>
        </View>
      ) : null}
      {tool === "Verification" ? (
        <View style={s.formSection}>
          {[
            ["captain", "Captain identity", "Photo ID and team authority"],
            ["phone", "Contact number", "One-time phone confirmation"],
            ["identity", "Team identity", "Name, badge and kit completed"],
            ["ground", "Home ground", "Ground or area confirmed"],
          ].map((item) => (
            <Pressable
              key={item[0]}
              onPress={() => {
                setChecks((current) => ({
                  ...current,
                  [item[0]]: !current[item[0]],
                }));
                setVerificationSent(false);
              }}
              style={s.checklistRow}
            >
              <View
                style={[s.checkCircle, checks[item[0]] && s.checkCircleActive]}
              >
                {checks[item[0]] ? (
                  <Ionicons name="checkmark" color="white" size={15} />
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>{item[1]}</AppText>
                <AppText style={s.meta}>{item[2]}</AppText>
              </View>
            </Pressable>
          ))}
          <Pressable
            disabled={!verifiedReady}
            onPress={() => setVerificationSent(true)}
            style={[
              s.saveLineupButton,
              !verifiedReady && s.buttonDisabled,
              verificationSent && s.saveLineupButtonSaved,
            ]}
          >
            <Ionicons
              name={
                verificationSent
                  ? "checkmark-circle"
                  : "shield-checkmark-outline"
              }
              color="white"
              size={18}
            />
            <AppText style={s.saveLineupText}>
              {verificationSent ? "UNDER REVIEW" : "SUBMIT VERIFICATION"}
            </AppText>
          </Pressable>
          <AppText style={s.formHelp}>
            {verifiedReady
              ? "Review normally takes one working day."
              : "Complete all four checks before submitting."}
          </AppText>
        </View>
      ) : null}
    </ScrollView>
  );
}

function DropdownField({
  label,
  value,
  options,
  placeholder,
  disabled = false,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <AppText style={s.formLabel}>{label}</AppText>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        style={[s.dropdownField, disabled && s.dropdownFieldDisabled]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder}`}
        accessibilityState={{ expanded: open, disabled }}
      >
        <AppText
          style={[
            s.dropdownValue,
            !value && s.dropdownPlaceholder,
            disabled && s.dropdownValueDisabled,
          ]}
        >
          {value || placeholder}
        </AppText>
        <Ionicons
          name="chevron-down"
          size={18}
          color={disabled ? C.line : C.red}
        />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={s.dropdownBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={s.dropdownSheet} onPress={() => {}}>
            <View style={s.dropdownSheetHeader}>
              <View style={{ flex: 1 }}>
                <AppText style={s.formSectionTitle}>{label}</AppText>
                <AppText style={s.meta}>{placeholder}</AppText>
              </View>
              <Pressable
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel={`Close ${label}`}
                style={s.dropdownClose}
              >
                <Ionicons name="close" size={21} color={C.ink} />
              </Pressable>
            </View>
            <ScrollView
              style={s.dropdownOptions}
              keyboardShouldPersistTaps="handled"
            >
              {options.map((option) => {
                const selected = option === value;
                return (
                  <Pressable
                    key={option}
                    onPress={() => {
                      onChange(option);
                      setOpen(false);
                    }}
                    style={[
                      s.dropdownOption,
                      selected && s.dropdownOptionSelected,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <AppText
                      style={[
                        s.dropdownOptionText,
                        selected && s.dropdownOptionTextSelected,
                      ]}
                    >
                      {option}
                    </AppText>
                    {selected ? (
                      <Ionicons name="checkmark" size={19} color={C.red} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function TeamRegionFields({ value, onChange }) {
  const countries = Object.keys(TEAM_REGION_TREE);
  const provinces = Object.keys(TEAM_REGION_TREE[value.country] || {});
  const cities = TEAM_REGION_TREE[value.country]?.[value.province] || [];
  return (
    <>
      <DropdownField
        label="Country"
        options={countries}
        value={value.country}
        placeholder="Choose country"
        onChange={(country) =>
          onChange({ country, province: "", city: "", suburb: "" })
        }
      />
      <DropdownField
        label="Province"
        options={provinces}
        value={value.province}
        placeholder={
          value.country ? "Choose province" : "Choose a country first"
        }
        disabled={!value.country}
        onChange={(province) =>
          onChange({ ...value, province, city: "", suburb: "" })
        }
      />
      <DropdownField
        label="City or town"
        options={cities}
        value={value.city}
        placeholder={
          value.province ? "Choose city or town" : "Choose a province first"
        }
        disabled={!value.province}
        onChange={(city) => onChange({ ...value, city, suburb: "" })}
      />
      <AppText style={s.formLabel}>Suburb or local area</AppText>
      <TextInput
        value={value.suburb}
        onChangeText={(suburb) => onChange({ ...value, suburb })}
        editable={Boolean(value.city)}
        style={[s.formInput, !value.city && s.buttonDisabled]}
        placeholder={
          value.city ? "For example, Highfield" : "Choose a city first"
        }
        placeholderTextColor={C.muted}
      />
    </>
  );
}

function ColourWheelPicker({ value, onChange }) {
  const { width } = useWindowDimensions();
  const size = Math.min(286, Math.max(230, width - 64));
  const center = size / 2;
  const innerRadius = 24;
  const outerRadius = center - 7;
  const hueCount = 18;
  const ringCount = 4;
  const ringWidth = (outerRadius - innerRadius) / ringCount;
  const rings = [
    { saturation: 46, lightness: 82 },
    { saturation: 58, lightness: 65 },
    { saturation: 68, lightness: 49 },
    { saturation: 76, lightness: 35 },
  ];
  let selectedMarker = null;
  return (
    <View
      style={s.colourWheelFrame}
      accessible
      accessibilityLabel="Full spectrum team colour picker"
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {rings.map((ring, ringIndex) =>
          Array.from({ length: hueCount }, (_, hueIndex) => {
            const hue = Math.round((hueIndex * 360) / hueCount);
            const color = `hsl(${hue}, ${ring.saturation}%, ${ring.lightness}%)`;
            const startAngle = (hueIndex * 360) / hueCount + 0.5;
            const endAngle = ((hueIndex + 1) * 360) / hueCount - 0.5;
            const segmentInner = innerRadius + ringIndex * ringWidth + 0.7;
            const segmentOuter =
              innerRadius + (ringIndex + 1) * ringWidth - 0.7;
            if (value === color) {
              const marker = polarPoint(
                center,
                (segmentInner + segmentOuter) / 2,
                (startAngle + endAngle) / 2,
              );
              selectedMarker = marker;
            }
            return (
              <Path
                key={`${ringIndex}-${hueIndex}`}
                d={colourWheelSegment(
                  center,
                  segmentInner,
                  segmentOuter,
                  startAngle,
                  endAngle,
                )}
                fill={color}
                onPress={() => onChange(color)}
                accessibilityRole="button"
                accessibilityLabel={`Choose hue ${hue + 1}, shade ${
                  ringIndex + 1
                }`}
              />
            );
          }),
        )}
        <Ellipse
          cx={center}
          cy={center}
          rx={innerRadius - 2}
          ry={innerRadius - 2}
          fill={C.white}
          stroke={C.line}
          strokeWidth={1}
        />
        {selectedMarker ? (
          <Ellipse
            cx={selectedMarker.x}
            cy={selectedMarker.y}
            rx={6}
            ry={6}
            fill={C.white}
            stroke={C.ink}
            strokeWidth={2}
            pointerEvents="none"
          />
        ) : null}
      </Svg>
      <View style={s.colourWheelLegend}>
        <View
          style={[s.colourWheelSelected, { backgroundColor: value || C.red }]}
        />
        <AppText style={s.meta}>Centre is softer · edge is stronger</AppText>
      </View>
    </View>
  );
}

const normaliseLiveAddress = (address, current) => {
  const normalise = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/\bprovince\b/g, "")
      .trim();
  const country =
    Object.keys(TEAM_REGION_TREE).find(
      (item) => normalise(item) === normalise(address?.country),
    ) ||
    current.country ||
    "";
  const provinceOptions = Object.keys(TEAM_REGION_TREE[country] || {});
  const provinceCandidates = [
    address?.region,
    address?.subregion,
    address?.district,
  ];
  const province =
    provinceOptions.find((item) =>
      provinceCandidates.some((candidate) => {
        const first = normalise(item);
        const second = normalise(candidate);
        return (
          first === second || first.includes(second) || second.includes(first)
        );
      }),
    ) ||
    (TEAM_REGION_TREE[country]?.[current.province] ? current.province : "");
  const cityOptions = TEAM_REGION_TREE[country]?.[province] || [];
  const cityCandidates = [
    address?.city,
    address?.subregion,
    address?.district,
    address?.name,
  ];
  const city =
    cityOptions.find((item) =>
      cityCandidates.some((candidate) => {
        const first = normalise(item);
        const second = normalise(candidate);
        return (
          first === second || first.includes(second) || second.includes(first)
        );
      }),
    ) || (cityOptions.includes(current.city) ? current.city : "");
  return {
    country,
    province,
    city,
    suburb:
      address?.district ||
      address?.street ||
      address?.name ||
      (city ? current.suburb : ""),
  };
};

function CreateTeamScreenV2({ close, onCreateTeam }) {
  const [teamName, setTeamName] = useState("");
  const [coachName, setCoachName] = useState("");
  const [location, setLocation] = useState(savedTeamLocation());
  const [ageGroup, setAgeGroup] = useState("Senior");
  const [sponsor, setSponsor] = useState("");
  const [groundCoordinate, setGroundCoordinate] = useState({
    latitude: -17.8249,
    longitude: 31.053,
  });
  const [wheelBadgeColor, setWheelBadgeColor] = useState("#6C2BEA");
  const [customBadgeColor, setCustomBadgeColor] = useState("");
  const [badgeShape, setBadgeShape] = useState(0);
  const [kits, setKits] = useState([null, null, null]);
  const [activeKit, setActiveKit] = useState(null);
  const [draftKit, setDraftKit] = useState({
    pattern: "Stripes",
    primary: "#6C2BEA",
    accent: "#B9F34A",
  });
  const [setupTool, setSetupTool] = useState(null);
  const [saved, setSaved] = useState(false);
  const [savedTeamName, setSavedTeamName] = useState("");
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const saveLock = useRef(false);
  const area = teamLocationLabel(location);
  const selectedBadgeColor = /^#[0-9A-F]{6}$/i.test(customBadgeColor)
    ? customBadgeColor
    : wheelBadgeColor;
  const palette = [
    "#6C2BEA",
    "#B9F34A",
    "#FFFFFF",
    "#17131D",
    "#D93B4B",
    "#168A53",
    "#E4A72E",
    "#2878C8",
    "#F07C37",
  ];
  const openKit = (index) => {
    setActiveKit(index);
    setDraftKit(
      kits[index] || {
        pattern: "Stripes",
        primary: palette[index],
        accent: index === 0 ? "#B9F34A" : "#FFFFFF",
      },
    );
  };
  const saveKit = () => {
    setKits((current) =>
      current.map((kit, index) => (index === activeKit ? draftKit : kit)),
    );
    setActiveKit(null);
    setSaved(false);
  };
  const useCurrentLocation = async () => {
    if (locating) return;
    setLocating(true);
    setLocationMessage("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setLocationMessage(
          "Location access was not allowed. You can still enter the area manually.",
        );
        return;
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coordinate = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
      setGroundCoordinate(coordinate);
      if (Platform.OS === "web") {
        setLocationMessage(
          "Current map pin added. Add the written area details before saving.",
        );
        return;
      }
      const addresses = await Location.reverseGeocodeAsync(coordinate);
      if (addresses[0]) {
        const nextLocation = normaliseLiveAddress(addresses[0], location);
        setLocation(nextLocation);
        setLocationMessage(
          nextLocation.city
            ? "Current location added. Check the local area before saving."
            : "Map pin added. Choose the closest province and city to finish.",
        );
      } else {
        setLocationMessage(
          "Map pin added. Add the written area details before saving.",
        );
      }
    } catch (error) {
      setLocationMessage(
        "Current location is unavailable. Check that location services are on, or enter the area manually.",
      );
    } finally {
      setLocating(false);
    }
  };
  const clearTeamDraft = () => {
    setTeamName("");
    setCoachName("");
    setLocation(savedTeamLocation());
    setAgeGroup("Senior");
    setSponsor("");
    setGroundCoordinate({ latitude: -17.8249, longitude: 31.053 });
    setWheelBadgeColor("#6C2BEA");
    setCustomBadgeColor("");
    setBadgeShape(0);
    setKits([null, null, null]);
    setActiveKit(null);
    setDraftKit({
      pattern: "Stripes",
      primary: "#6C2BEA",
      accent: "#B9F34A",
    });
    setLocationMessage("");
  };
  const createTeam = async () => {
    if (saveLock.current || saved) return;
    if (
      !teamName.trim() ||
      !location.country ||
      !location.province ||
      !location.city ||
      !location.suburb.trim()
    ) {
      setSaveError("Add the team name, country, province, city and suburb.");
      return;
    }
    saveLock.current = true;
    setSaving(true);
    setSaveError("");
    try {
      const submittedTeamName = teamName.trim();
      await onCreateTeam({
        name: submittedTeamName,
        area,
        location,
        ageGroup,
        coachName,
        sponsor,
        crest: {
          shape: badgeShape,
          color: selectedBadgeColor,
          label: initials(teamName),
        },
        kits,
        ground: { name: "", coordinate: groundCoordinate },
      });
      setSavedTeamName(submittedTeamName);
      clearTeamDraft();
      setSaved(true);
    } catch (error) {
      saveLock.current = false;
      setSaveError(
        error?.code === "permission-denied"
          ? "Your account could not complete team setup. Sign out, sign in again and retry."
          : error?.code === "unavailable"
            ? "The connection dropped before the team was saved. Check your connection and retry."
            : "The team could not be saved. Please try again.",
      );
      console.warn("Team setup failed", error?.code || error?.message);
    } finally {
      setSaving(false);
    }
  };
  if (setupTool)
    return <TeamSetupTool tool={setupTool} close={() => setSetupTool(null)} />;
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      <View style={s.subHeader}>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Back to Team"
        >
          <Ionicons name="arrow-back" size={23} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <AppText style={s.headerTitle}>CREATE A TEAM</AppText>
          <AppText style={s.headerSub}>COACH TOOLS</AppText>
        </View>
      </View>
      {saved ? (
        <View style={s.createdBanner}>
          <Ionicons name="checkmark-circle" size={24} color={C.green} />
          <View>
            <AppText style={s.team}>{savedTeamName} saved</AppText>
            <AppText style={s.meta}>
              Your team profile is ready for players.
            </AppText>
          </View>
        </View>
      ) : null}
      <View style={s.teamCreatorHero}>
        <CrestPreview
          shape={badgeShape}
          color={selectedBadgeColor}
          label={initials(teamName || "New Team")}
        />
        <View style={s.jerseyPreview}>
          <JerseyArt
            kit={kits[0]}
            size="small"
            sponsor={sponsor}
            crestLabel={initials(teamName)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <AppText style={s.teamCreatorName}>{teamName || "Your team"}</AppText>
          <AppText style={s.teamCreatorMeta}>
            {kits.filter(Boolean).length}/3 kits designed ·{" "}
            {area || "Area not added"}
          </AppText>
          <AppText style={s.teamCreatorCoach}>
            Coach {coachName || "not added"}
          </AppText>
        </View>
      </View>
      <View style={s.formSection}>
        <AppText style={s.formSectionTitle}>Team details</AppText>
        <AppText style={s.formLabel}>Team name</AppText>
        <TextInput
          value={teamName}
          onChangeText={setTeamName}
          style={s.formInput}
          placeholder="Team name"
          placeholderTextColor={C.muted}
        />
        <Pressable
          onPress={useCurrentLocation}
          disabled={locating}
          style={[s.liveLocationButton, locating && s.buttonDisabled]}
          accessibilityRole="button"
          accessibilityState={{ busy: locating, disabled: locating }}
        >
          {locating ? (
            <ActivityIndicator size="small" color={C.red} />
          ) : (
            <Ionicons name="navigate-circle-outline" size={21} color={C.red} />
          )}
          <View style={{ flex: 1 }}>
            <AppText style={s.buttonText}>
              {locating ? "FINDING YOUR LOCATION" : "USE CURRENT LOCATION"}
            </AppText>
            <AppText style={s.meta}>
              Fills the area and moves the home ground pin
            </AppText>
          </View>
        </Pressable>
        {locationMessage ? (
          <AppText style={s.liveLocationMessage}>{locationMessage}</AppText>
        ) : null}
        <TeamRegionFields value={location} onChange={setLocation} />
        <ProfileChoiceGroup
          label="Age group"
          options={["U13", "U15", "U17", "U20", "Senior", "Veterans"]}
          value={ageGroup}
          onChange={setAgeGroup}
        />
        <AppText style={s.formLabel}>Kit sponsor</AppText>
        <TextInput
          value={sponsor}
          onChangeText={setSponsor}
          style={s.formInput}
          placeholder="Optional sponsor name"
          placeholderTextColor={C.muted}
        />
        <AppText style={s.formLabel}>Coach name</AppText>
        <TextInput
          value={coachName}
          onChangeText={setCoachName}
          style={s.formInput}
          placeholder="Coach or manager"
          placeholderTextColor={C.muted}
        />
      </View>
      <View style={s.formSection}>
        <AppText style={s.formSectionTitle}>Badge designer</AppText>
        <AppText style={s.formLabel}>Shape</AppText>
        <View style={s.crestShapeRow}>
          {crestShapes.map((shape, index) => (
            <Pressable
              key={shape.name}
              onPress={() => setBadgeShape(index)}
              style={[
                s.crestShapeChoice,
                badgeShape === index && s.crestShapeChoiceActive,
              ]}
            >
              <CrestPreview
                shape={index}
                color={selectedBadgeColor}
                label={initials(teamName)}
                small
              />
              <AppText style={s.meta}>{shape.name}</AppText>
            </Pressable>
          ))}
        </View>
        <AppText style={s.formLabel}>Badge colour</AppText>
        <ColourWheelPicker
          value={selectedBadgeColor}
          onChange={(color) => {
            setWheelBadgeColor(color);
            setCustomBadgeColor("");
            setSaved(false);
          }}
        />
        <AppText style={s.formLabel}>Exact colour</AppText>
        <TextInput
          value={customBadgeColor}
          onChangeText={(value) => setCustomBadgeColor(value.toUpperCase())}
          autoCapitalize="characters"
          maxLength={7}
          placeholder="#6C2BEA"
          placeholderTextColor={C.muted}
          style={s.formInput}
        />
        <AppText style={s.formHelp}>
          Enter any six-digit colour code, or spin through the full spectrum.
        </AppText>
      </View>
      <View style={s.formSection}>
        <AppText style={s.formSectionTitle}>Team kits</AppText>
        <AppText style={s.body}>
          Open each empty shirt and design it separately.
        </AppText>
        <View style={s.kitSlotRow}>
          {["Home", "Away", "Third"].map((name, index) => (
            <Pressable
              key={name}
              onPress={() => openKit(index)}
              style={[s.kitSlot, activeKit === index && s.kitSlotActive]}
            >
              <JerseyArt
                kit={kits[index]}
                size="small"
                sponsor={sponsor}
                crestLabel={initials(teamName)}
              />
              <AppText style={s.team}>{name}</AppText>
              <AppText style={s.meta}>
                {kits[index] ? kits[index].pattern : "Tap to design"}
              </AppText>
            </Pressable>
          ))}
        </View>
        {activeKit != null ? (
          <View style={s.kitEditor}>
            <View style={s.formTitleRow}>
              <AppText style={s.formSectionTitle}>
                Design {["Home", "Away", "Third"][activeKit]}
              </AppText>
              <JerseyArt
                kit={draftKit}
                size="small"
                sponsor={sponsor}
                crestLabel={initials(teamName)}
              />
            </View>
            <AppText style={s.formLabel}>Pattern</AppText>
            <View style={s.optionWrap}>
              {["Plain", "Stripes", "Hoops", "Sash"].map((item) => (
                <Pressable
                  key={item}
                  onPress={() =>
                    setDraftKit((current) => ({ ...current, pattern: item }))
                  }
                  style={[
                    s.formChoice,
                    draftKit.pattern === item && s.formChoiceActive,
                  ]}
                >
                  <AppText
                    style={[
                      s.formChoiceText,
                      draftKit.pattern === item && s.formChoiceTextActive,
                    ]}
                  >
                    {item}
                  </AppText>
                </Pressable>
              ))}
            </View>
            <AppText style={s.formLabel}>Main colour</AppText>
            <View style={s.colorPicker}>
              {palette.map((color) => (
                <Pressable
                  key={`main-${color}`}
                  onPress={() =>
                    setDraftKit((current) => ({ ...current, primary: color }))
                  }
                  style={[
                    s.colorChoice,
                    { backgroundColor: color },
                    draftKit.primary === color && s.colorChoiceSelected,
                  ]}
                />
              ))}
            </View>
            <AppText style={s.formLabel}>Pattern colour</AppText>
            <View style={s.colorPicker}>
              {palette.map((color) => (
                <Pressable
                  key={`accent-${color}`}
                  onPress={() =>
                    setDraftKit((current) => ({ ...current, accent: color }))
                  }
                  style={[
                    s.colorChoice,
                    { backgroundColor: color },
                    draftKit.accent === color && s.colorChoiceSelected,
                  ]}
                />
              ))}
            </View>
            <Pressable onPress={saveKit} style={s.saveLineupButton}>
              <Ionicons name="shirt-outline" color="white" size={18} />
              <AppText style={s.saveLineupText}>SAVE KIT DESIGN</AppText>
            </Pressable>
          </View>
        ) : null}
      </View>
      <View style={s.formSection}>
        <AppText style={s.formSectionTitle}>Ground location</AppText>
        <AppText style={s.body}>
          Tap the map or drag the pin to the team’s usual home area.
        </AppText>
        <GroundMap
          coordinate={groundCoordinate}
          onChange={setGroundCoordinate}
        />
        <AppText style={s.formHelp}>
          {groundCoordinate.latitude.toFixed(5)},{" "}
          {groundCoordinate.longitude.toFixed(5)}
        </AppText>
      </View>
      <View style={s.formSection}>
        <AppText style={s.formSectionTitle}>Finish team setup</AppText>
        {[
          ["Player invitations", "Invite by phone or email"],
          ["Assistant coaches", "Add staff and choose permissions"],
          ["Home ground", "Save venue and map location"],
          ["Verification", "Complete identity checks"],
        ].map((item) => (
          <Pressable
            onPress={() => setSetupTool(item[0])}
            style={s.settingRow}
            key={item[0]}
          >
            <View style={{ flex: 1 }}>
              <AppText style={s.team}>{item[0]}</AppText>
              <AppText style={s.meta}>{item[1]}</AppText>
            </View>
            <Ionicons name="chevron-forward" color={C.muted} />
          </Pressable>
        ))}
      </View>
      <View style={s.formFooter}>
        {saveError ? (
          <AppText style={s.authErrorText}>{saveError}</AppText>
        ) : null}
        <Pressable
          style={[s.saveLineupButton, (saving || saved) && s.buttonDisabled]}
          onPress={createTeam}
          disabled={saving || saved}
          accessibilityRole="button"
          accessibilityState={{
            disabled: saving || saved,
            busy: saving,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={C.white} />
          ) : (
            <Ionicons name="shield-checkmark-outline" color="white" size={18} />
          )}
          <AppText style={s.saveLineupText}>
            {saving ? "SAVING" : saved ? "TEAM SAVED" : "CREATE TEAM"}
          </AppText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function CreateTeamScreen({ close }) {
  const [teamName, setTeamName] = useState("");
  const [coachName, setCoachName] = useState("");
  const [badge, setBadge] = useState(1);
  const [jersey, setJersey] = useState("Classic");
  const [colors, setColors] = useState(["#6C2BEA", "#B9F34A", "#FFFFFF"]);
  const [saved, setSaved] = useState(false);
  const palette = [
    "#6C2BEA",
    "#B9F34A",
    "#FFFFFF",
    "#17131D",
    "#D93B4B",
    "#168A53",
    "#E4A72E",
    "#2878C8",
    "#F07C37",
  ];
  const toggleColor = (color) =>
    setColors((current) =>
      current.includes(color)
        ? current.filter((item) => item !== color)
        : current.length < 3
          ? [...current, color]
          : [current[1], current[2], color],
    );
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      <View style={s.subHeader}>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Back to Team"
        >
          <Ionicons name="arrow-back" size={23} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <AppText style={s.headerTitle}>CREATE A TEAM</AppText>
          <AppText style={s.headerSub}>COACH TOOLS</AppText>
        </View>
      </View>
      {saved ? (
        <View style={s.createdBanner}>
          <Ionicons name="checkmark-circle" size={24} color={C.green} />
          <View>
            <AppText style={s.team}>{teamName} saved</AppText>
            <AppText style={s.meta}>
              Your team profile is ready for players.
            </AppText>
          </View>
        </View>
      ) : null}
      <View style={s.teamCreatorHero}>
        <View
          style={[
            s.teamCreatorBadge,
            { backgroundColor: generatedBadgeColors[badge] },
          ]}
        >
          <AppText style={s.teamCreatorBadgeText}>
            {initials(teamName || "New Team")}
          </AppText>
          <View style={s.badgeNumber}>
            <AppText style={s.badgeNumberText}>{badge + 1}</AppText>
          </View>
        </View>
        <View style={s.jerseyPreview}>
          <Ionicons name="shirt" size={78} color={colors[0] || C.red} />
          <View style={s.jerseyColorDots}>
            {colors.map((color) => (
              <View
                key={color}
                style={[s.jerseyColorDot, { backgroundColor: color }]}
              />
            ))}
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <AppText style={s.teamCreatorName}>{teamName || "Your team"}</AppText>
          <AppText style={s.teamCreatorMeta}>{jersey} kit · Harare</AppText>
          <AppText style={s.teamCreatorCoach}>
            Coach {coachName || "not added"}
          </AppText>
        </View>
      </View>
      <View style={s.formSection}>
        <AppText style={s.formSectionTitle}>Team details</AppText>
        <AppText style={s.formLabel}>Team name</AppText>
        <TextInput
          value={teamName}
          onChangeText={setTeamName}
          style={s.formInput}
          placeholder="Team name"
          placeholderTextColor={C.muted}
        />
        <AppText style={s.formLabel}>Coach name</AppText>
        <TextInput
          value={coachName}
          onChangeText={setCoachName}
          style={s.formInput}
          placeholder="Coach or manager"
          placeholderTextColor={C.muted}
        />
        <View style={s.twoFieldRow}>
          <View style={{ flex: 1 }}>
            <AppText style={s.formLabel}>Home area</AppText>
            <TextInput defaultValue="" style={s.formInput} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={s.formLabel}>Team size</AppText>
            <TextInput defaultValue="11-a-side" style={s.formInput} />
          </View>
        </View>
      </View>
      <View style={s.formSection}>
        <View style={s.formTitleRow}>
          <View>
            <AppText style={s.formSectionTitle}>Choose a badge</AppText>
            <AppText style={s.formHelp}>20 ready-made badges included</AppText>
          </View>
          <AppText style={s.badgeSelectionLabel}>{badge + 1}/20</AppText>
        </View>
        <View style={s.badgeGrid}>
          {generatedBadgeColors.map((color, index) => (
            <Pressable
              key={`${color}-${index}`}
              onPress={() => setBadge(index)}
              accessibilityRole="button"
              accessibilityLabel={`Select badge ${index + 1}`}
              accessibilityState={{ selected: badge === index }}
              style={[
                s.generatedBadge,
                { backgroundColor: color },
                badge === index && s.generatedBadgeSelected,
              ]}
            >
              <AppText style={s.generatedBadgeText}>
                {["F", "A", "S", "U"][index % 4]}
              </AppText>
              <View
                style={[
                  s.generatedBadgeStripe,
                  { backgroundColor: index % 2 ? C.gold : "white" },
                ]}
              />
            </Pressable>
          ))}
        </View>
      </View>
      <View style={s.formSection}>
        <AppText style={s.formSectionTitle}>Jersey & team colours</AppText>
        <View style={s.optionWrap}>
          {["Classic", "Stripe", "Sash", "Hoops"].map((item) => (
            <Pressable
              key={item}
              onPress={() => setJersey(item)}
              style={[s.formChoice, jersey === item && s.formChoiceActive]}
            >
              <AppText
                style={[
                  s.formChoiceText,
                  jersey === item && s.formChoiceTextActive,
                ]}
              >
                {item}
              </AppText>
            </Pressable>
          ))}
        </View>
        <AppText style={s.formLabel}>Choose up to three colours</AppText>
        <View style={s.colorPicker}>
          {palette.map((color) => (
            <Pressable
              key={color}
              onPress={() => toggleColor(color)}
              accessibilityRole="button"
              accessibilityLabel={`Toggle team color ${color}`}
              accessibilityState={{ selected: colors.includes(color) }}
              style={[
                s.colorChoice,
                { backgroundColor: color },
                colors.includes(color) && s.colorChoiceSelected,
              ]}
            >
              {colors.includes(color) ? (
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={
                    color === "#FFFFFF" || color === "#B9F34A" ? C.ink : "white"
                  }
                />
              ) : null}
            </Pressable>
          ))}
        </View>
      </View>
      <View style={s.formSection}>
        <AppText style={s.formSectionTitle}>Registration</AppText>
        {[
          ["Player invitations", "Invite by phone, link or QR code"],
          ["Assistant coaches", "Add staff and permissions"],
          ["Home ground", "Set venue and map location"],
          ["Verification", "Confirm captain and team identity"],
        ].map((item) => (
          <Pressable
            style={s.settingRow}
            key={item[0]}
            onPress={() => Alert.alert(item[0], item[1])}
          >
            <View style={{ flex: 1 }}>
              <AppText style={s.team}>{item[0]}</AppText>
              <AppText style={s.meta}>{item[1]}</AppText>
            </View>
            <Ionicons name="chevron-forward" color={C.muted} />
          </Pressable>
        ))}
      </View>
      <View style={s.formFooter}>
        <Pressable style={s.saveLineupButton} onPress={() => setSaved(true)}>
          <Ionicons name="shield-checkmark-outline" color="white" size={18} />
          <AppText style={s.saveLineupText}>
            {saved ? "TEAM SAVED" : "CREATE TEAM"}
          </AppText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function RoleAccessScreen({ role, setRole, close }) {
  const roles = [
    [
      "Coach",
      "Create teams and leagues, manage squads and confirm matches",
      "clipboard-outline",
    ],
    [
      "Player",
      "Manage availability, view lineups and player profile",
      "football-outline",
    ],
    [
      "Referee",
      "See assignments, submit reports and verify results",
      "flag-outline",
    ],
  ];
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={s.subHeader}>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Back to More"
        >
          <Ionicons name="arrow-back" size={23} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <AppText style={s.headerTitle}>ACCOUNT & ROLE</AppText>
          <AppText style={s.headerSub}>ACCESS CHANGES WITH YOUR ROLE</AppText>
        </View>
      </View>
      <View style={s.formIntro}>
        <AppText style={s.screenTitle}>How are you joining?</AppText>
        <AppText style={s.body}>
          Each role gets a focused workspace. One person can hold more than one
          verified role.
        </AppText>
      </View>
      <View style={s.communityListSection}>
        {roles.map((item) => (
          <Pressable
            key={item[0]}
            onPress={() => setRole(item[0])}
            style={[s.roleCard, role === item[0] && s.roleCardActive]}
          >
            <View style={[s.roleIcon, role === item[0] && s.roleIconActive]}>
              <Ionicons
                name={item[2]}
                size={23}
                color={role === item[0] ? "white" : C.red}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={s.moreToolTitle}>{item[0]}</AppText>
              <AppText style={s.body}>{item[1]}</AppText>
            </View>
            {role === item[0] ? (
              <Ionicons name="checkmark-circle" size={22} color={C.red} />
            ) : (
              <Ionicons name="chevron-forward" color={C.muted} />
            )}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function TeamSettingsScreen({ team, close, onUpdateTeam }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name || "");
  const [location, setLocation] = useState(savedTeamLocation(team));
  const [sponsor, setSponsor] = useState(team.sponsor || "");
  const [groundName, setGroundName] = useState(team.ground?.name || "");
  const [coordinate, setCoordinate] = useState(
    team.ground?.coordinate || { latitude: -17.8249, longitude: 31.053 },
  );
  const [syncState, setSyncState] = useState("Saved");
  const area = teamLocationLabel(location);
  const save = async () => {
    if (
      !name.trim() ||
      !location.country ||
      !location.province ||
      !location.city ||
      !location.suburb.trim()
    )
      return;
    setSyncState("Saving");
    try {
      await onUpdateTeam({
        name: name.trim(),
        area: area.trim(),
        location,
        sponsor: sponsor.trim(),
        ground: { name: groundName.trim(), coordinate },
      });
      setSyncState("Saved");
      setEditing(false);
      Alert.alert("Team saved", "Your team profile has been updated.");
    } catch (error) {
      setSyncState("Couldn’t save");
      Alert.alert(
        "Couldn’t save team",
        "Please check your connection and try again.",
      );
    }
  };
  if (!editing)
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={s.subHeader}>
          <Pressable onPress={close} accessibilityLabel="Back to More">
            <Ionicons name="arrow-back" size={23} />
          </Pressable>
          <View style={{ marginLeft: 14, flex: 1 }}>
            <AppText style={s.headerTitle}>TEAM PROFILE</AppText>
            <AppText style={s.headerSub}>YOUR PUBLIC TEAM VIEW</AppText>
          </View>
          <Pressable onPress={() => setEditing(true)} style={s.roleMiniButton}>
            <AppText style={s.roleMiniButtonText}>EDIT</AppText>
          </Pressable>
        </View>
        <View style={s.teamProfileHero}>
          <CrestPreview
            shape={team.crest?.shape || 0}
            color={team.crest?.color || C.redDark}
            label={team.crest?.label || initials(team.name)}
          />
          <View style={{ flex: 1 }}>
            <AppText style={s.squadTeamName}>{team.name}</AppText>
            <AppText style={s.squadTeamMeta}>
              {team.area || "No home area added"}
            </AppText>
          </View>
        </View>
        <View style={s.playerMetricRow}>
          {[
            [team.stats?.players ?? 0, "PLAYERS"],
            [team.stats?.matches ?? 0, "MATCHES"],
            [team.stats?.wins ?? 0, "WINS"],
            [team.stats?.points ?? 0, "POINTS"],
          ].map(([value, label]) => (
            <View key={label} style={s.playerMetric}>
              <AppText style={s.playerMetricValue}>{value}</AppText>
              <AppText style={s.playerMetricLabel}>{label}</AppText>
            </View>
          ))}
        </View>
        <View style={s.communityListSection}>
          {[
            ["Home ground", team.ground?.name || "Not added"],
            ["Coach", team.coachName || "Not added"],
            ["Sponsor", team.sponsor || "Not added"],
          ].map(([label, value]) => (
            <View key={label} style={s.settingRow}>
              <AppText style={s.meta}>{label.toUpperCase()}</AppText>
              <AppText style={s.team}>{value}</AppText>
            </View>
          ))}
          <View style={s.teamKitSettingsPreview}>
            {(team.kits || []).slice(0, 3).map((kit, index) => (
              <JerseyArt
                key={index}
                kit={kit}
                size="small"
                sponsor={team.sponsor}
                crestLabel={team.crest?.label || initials(team.name)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    );
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={s.subHeader}>
        <Pressable onPress={close} accessibilityLabel="Back to More">
          <Ionicons name="arrow-back" size={23} />
        </Pressable>
        <View style={{ marginLeft: 14, flex: 1 }}>
          <AppText style={s.headerTitle}>EDIT TEAM</AppText>
          <AppText style={s.headerSub}>TEAM DETAILS</AppText>
        </View>
      </View>
      <View style={s.formIntro}>
        <View style={s.formTitleRow}>
          <AppText style={s.screenTitle}>{name || "Your team"}</AppText>
          <View style={s.syncPill}>
            <View
              style={[
                s.syncDot,
                syncState === "Couldn’t save" && {
                  backgroundColor: "#A62435",
                },
              ]}
            />
            <AppText style={s.syncText}>{syncState}</AppText>
          </View>
        </View>
        <AppText style={s.body}>
          These details appear across squad, wallet, fixtures and discovery.
        </AppText>
      </View>
      <View style={s.formSection}>
        <View style={s.teamKitSettingsPreview}>
          <CrestPreview
            shape={team.crest?.shape || 0}
            color={team.crest?.color || C.redDark}
            label={team.crest?.label || initials(name)}
          />
          <JerseyArt
            kit={team.kits?.[0]}
            sponsor={sponsor}
            crestLabel={team.crest?.label || initials(name)}
          />
        </View>
        <AppText style={s.formLabel}>Team name</AppText>
        <TextInput value={name} onChangeText={setName} style={s.formInput} />
        <TeamRegionFields value={location} onChange={setLocation} />
        <AppText style={s.formLabel}>Kit sponsor</AppText>
        <TextInput
          value={sponsor}
          onChangeText={setSponsor}
          placeholder="No sponsor"
          placeholderTextColor={C.muted}
          style={s.formInput}
        />
        <AppText style={s.formLabel}>Home ground</AppText>
        <TextInput
          value={groundName}
          onChangeText={setGroundName}
          placeholder="Ground name"
          placeholderTextColor={C.muted}
          style={s.formInput}
        />
        <GroundMap coordinate={coordinate} onChange={setCoordinate} />
        <Pressable onPress={save} style={s.saveLineupButton}>
          <Ionicons name="cloud-done-outline" color="white" size={18} />
          <AppText style={s.saveLineupText}>SAVE TEAM SETTINGS</AppText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const nextPowerOfTwo = (value) => {
  let result = 2;
  while (result < Math.max(2, value)) result *= 2;
  return Math.min(result, 32);
};

const competitionRoundLabel = (matchCount) => {
  if (matchCount === 1) return "Final";
  if (matchCount === 2) return "Semi finals";
  if (matchCount === 4) return "Quarter finals";
  return `Round of ${matchCount * 2}`;
};

function BracketTeam({ team, label, mirrored = false }) {
  return (
    <View style={[s.bracketTeam, mirrored && s.bracketTeamMirrored]}>
      <View
        style={[
          s.bracketTeamMark,
          !team && { backgroundColor: C.cream, borderColor: C.line },
        ]}
      >
        <AppText style={[s.bracketTeamMarkText, !team && { color: C.muted }]}>
          {team ? initials(team.name) : "?"}
        </AppText>
      </View>
      <AppText
        numberOfLines={1}
        style={[
          s.bracketTeamName,
          mirrored && { textAlign: "right" },
          !team && { color: C.muted },
        ]}
      >
        {team?.name || label}
      </AppText>
    </View>
  );
}

function KnockoutBracketView({ teams, openingLabels, compactTitle = false }) {
  const requestedPlaces = Math.max(teams.length, openingLabels?.length || 0);
  if (requestedPlaces < 2)
    return (
      <View style={s.structureEmpty}>
        <AppText style={s.team}>Bracket needs at least two teams</AppText>
        <AppText style={s.body}>
          It will form from the teams that actually join this tournament.
        </AppText>
      </View>
    );
  const bracketSize = nextPowerOfTwo(requestedPlaces);
  const openingSlots = Array.from({ length: bracketSize }, (_, index) => ({
    team: teams[index] || null,
    label: openingLabels?.[index] || "Bye",
  }));
  const halfSize = bracketSize / 2;
  const buildSide = (slots, sideName) =>
    Array.from({ length: Math.log2(halfSize) }, (_, roundIndex) => {
      const matchCount = halfSize / 2 ** (roundIndex + 1);
      return {
        label: competitionRoundLabel(matchCount * 2),
        matches: Array.from({ length: matchCount }, (_, matchIndex) => {
          if (roundIndex === 0)
            return {
              top: slots[matchIndex * 2],
              bottom: slots[matchIndex * 2 + 1],
            };
          return {
            top: {
              team: null,
              label: `Winner ${sideName}${matchIndex * 2 + 1}`,
            },
            bottom: {
              team: null,
              label: `Winner ${sideName}${matchIndex * 2 + 2}`,
            },
          };
        }),
      };
    });
  const leftRounds = buildSide(openingSlots.slice(0, halfSize), "L");
  const rightRounds = buildSide(openingSlots.slice(halfSize), "R");
  const renderRound = (round, roundIndex, side) => (
    <View style={s.bracketRound} key={`${side}_${round.label}_${roundIndex}`}>
      <AppText
        style={[
          s.bracketRoundTitle,
          side === "right" && { textAlign: "right" },
        ]}
      >
        {round.label}
      </AppText>
      <View
        style={[
          s.bracketRoundMatches,
          {
            paddingTop: roundIndex * 24,
            gap: Math.max(12, 12 + roundIndex * 38),
          },
        ]}
      >
        {round.matches.map((match, matchIndex) => (
          <View
            style={s.bracketMatch}
            key={`${side}_${round.label}_${matchIndex}`}
          >
            <BracketTeam {...match.top} mirrored={side === "right"} />
            <View style={s.bracketDivider} />
            <BracketTeam {...match.bottom} mirrored={side === "right"} />
            <View
              style={[
                s.bracketConnector,
                side === "right" && s.bracketConnectorLeft,
              ]}
            />
          </View>
        ))}
      </View>
    </View>
  );
  return (
    <View style={s.competitionStructure}>
      {!compactTitle ? (
        <View style={s.competitionSectionHeading}>
          <View style={{ flex: 1 }}>
            <AppText style={s.formSectionTitle}>Knockout bracket</AppText>
            <AppText style={s.meta}>
              Winners advance until one champion remains
            </AppText>
          </View>
          <Ionicons name="trophy" size={24} color={C.gold} />
        </View>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.bracketScroll}
      >
        {leftRounds.map((round, roundIndex) =>
          renderRound(round, roundIndex, "left"),
        )}
        <View style={s.bracketFinalColumn}>
          <AppText style={[s.bracketRoundTitle, { textAlign: "center" }]}>
            Final
          </AppText>
          <View style={[s.bracketMatch, { marginTop: 44 }]}>
            <BracketTeam
              {...(bracketSize === 2
                ? openingSlots[0]
                : { team: null, label: "Left finalist" })}
            />
            <View style={s.bracketDivider} />
            <BracketTeam
              {...(bracketSize === 2
                ? openingSlots[1]
                : { team: null, label: "Right finalist" })}
              mirrored
            />
            <View style={[s.bracketConnector, s.bracketFinalConnectorLeft]} />
            <View style={s.bracketConnector} />
          </View>
          <View style={s.bracketChampionMark}>
            <Ionicons name="trophy" size={30} color={C.gold} />
          </View>
          <AppText style={s.bracketRoundTitle}>Champion</AppText>
        </View>
        {[...rightRounds]
          .reverse()
          .map((round, visualIndex) =>
            renderRound(round, rightRounds.length - 1 - visualIndex, "right"),
          )}
      </ScrollView>
    </View>
  );
}

function GroupStageView({
  teams,
  matches = [],
  showKnockout = false,
}) {
  const { width } = useWindowDimensions();
  if (!teams.length)
    return (
      <View style={s.structureEmpty}>
        <AppText style={s.team}>No groups yet</AppText>
        <AppText style={s.body}>
          Groups will be balanced automatically as teams join.
        </AppText>
      </View>
    );
  const groupCount = Math.max(1, Math.ceil(teams.length / 4));
  const groups = Array.from({ length: groupCount }, (_, groupIndex) => ({
    name: `Group ${String.fromCharCode(65 + groupIndex)}`,
    teams: teams.filter(
      (_, teamIndex) => teamIndex % groupCount === groupIndex,
    ),
  }));
  const qualifierLabels = groups.flatMap((group) => [
    `1st ${group.name}`,
    `2nd ${group.name}`,
  ]);
  return (
    <View style={s.competitionStructure}>
      <View style={s.competitionSectionHeading}>
        <View style={{ flex: 1 }}>
          <AppText style={s.formSectionTitle}>Group stage</AppText>
          <AppText style={s.meta}>
            Teams begin in groups before the knockout rounds
          </AppText>
        </View>
        <Ionicons name="people" size={23} color={C.red} />
      </View>
      <View style={s.groupTables}>
        {groups.map((group) => {
          const groupStandings = competitionStandings(
            group.teams,
            matches.filter(
              (match) =>
                match.competitionStage?.startsWith(group.name) ||
                (!match.competitionStage &&
                  (match.participantTeamIds || []).every((teamId) =>
                    group.teams.some((team) => team.id === teamId),
                  )),
            ),
          );
          return (
            <View
              style={[
                s.groupTable,
                { width: width >= 700 ? "48.5%" : "100%" },
              ]}
              key={group.name}
            >
              <View style={s.groupTableHeader}>
                <AppText style={s.team}>{group.name}</AppText>
                <AppText style={s.meta}>
                  P&nbsp;&nbsp; GD&nbsp;&nbsp; PTS
                </AppText>
              </View>
              {groupStandings.map((entry) => (
                <View style={s.groupTableRow} key={entry.team.id}>
                  <AppText numberOfLines={1} style={s.groupTeamName}>
                    {entry.team.name}
                  </AppText>
                  <AppText style={s.groupNumbers}>
                    {entry.played}&nbsp;&nbsp; {entry.goalDifference}
                    &nbsp;&nbsp; {entry.points}
                  </AppText>
                </View>
              ))}
              <AppText style={s.groupQualification}>
                Top two qualify for the knockout rounds
              </AppText>
            </View>
          );
        })}
      </View>
      <View style={s.stageTransition}>
        <Ionicons
          name={showKnockout ? "checkmark-circle" : "lock-closed"}
          size={20}
          color={showKnockout ? C.green : C.muted}
        />
        <AppText style={[s.body, { flex: 1 }]}>
          {showKnockout
            ? "Group results are confirmed. The knockout stage is seeded below."
            : "The knockout stage will be seeded from confirmed group positions."}
        </AppText>
      </View>
      {showKnockout ? (
        <>
          <KnockoutBracketView
            teams={[]}
            openingLabels={qualifierLabels}
            compactTitle
          />
        </>
      ) : null}
    </View>
  );
}

const competitionStandings = (teams = [], matches = []) => {
  const table = new Map(
    teams.map((team) => [
      team.id,
      {
        team,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      },
    ]),
  );
  matches
    .filter((match) => match.status === "completed" && match.result)
    .forEach((match) => {
      const home = table.get(match.homeTeamId);
      const away = table.get(match.awayTeamId);
      if (!home || !away) return;
      const homeScore = Number(match.result.homeScore || 0);
      const awayScore = Number(match.result.awayScore || 0);
      home.played += 1;
      away.played += 1;
      home.goalsFor += homeScore;
      home.goalsAgainst += awayScore;
      away.goalsFor += awayScore;
      away.goalsAgainst += homeScore;
      if (homeScore === awayScore) {
        home.draws += 1;
        away.draws += 1;
        home.points += 1;
        away.points += 1;
      } else if (homeScore > awayScore) {
        home.wins += 1;
        away.losses += 1;
        home.points += 3;
      } else {
        away.wins += 1;
        home.losses += 1;
        away.points += 3;
      }
    });
  return [...table.values()]
    .map((entry) => ({
      ...entry,
      goalDifference: entry.goalsFor - entry.goalsAgainst,
    }))
    .sort(
      (first, second) =>
        second.points - first.points ||
        second.goalDifference - first.goalDifference ||
        second.goalsFor - first.goalsFor ||
        first.team.name.localeCompare(second.team.name),
    );
};

const tournamentPlayerLeaders = (matches = []) => {
  const players = new Map();
  matches
    .filter((match) => match.status === "completed" && match.result)
    .flatMap((match) => match.result.events || [])
    .forEach((event) => {
      if (event.type === "Goal" && event.player) {
        const scorer = players.get(event.player) || {
          name: event.player,
          goals: 0,
          assists: 0,
        };
        scorer.goals += 1;
        players.set(event.player, scorer);
      }
      if (event.type === "Goal" && event.assister) {
        const assister = players.get(event.assister) || {
          name: event.assister,
          goals: 0,
          assists: 0,
        };
        assister.assists += 1;
        players.set(event.assister, assister);
      }
    });
  return [...players.values()].sort(
    (first, second) =>
      second.goals * 3 +
        second.assists * 2 -
        (first.goals * 3 + first.assists * 2) ||
      second.goals - first.goals ||
      first.name.localeCompare(second.name),
  );
};

const buildRoundRobinRounds = (teams) => {
  if (teams.length < 2) return [];
  const rotation = [...teams];
  if (rotation.length % 2) rotation.push(null);
  const rounds = [];
  for (let roundIndex = 0; roundIndex < rotation.length - 1; roundIndex += 1) {
    const fixtures = [];
    for (let index = 0; index < rotation.length / 2; index += 1) {
      const home = rotation[index];
      const away = rotation[rotation.length - 1 - index];
      if (home && away) fixtures.push({ home, away });
    }
    rounds.push(fixtures);
    rotation.splice(1, 0, rotation.pop());
  }
  return rounds;
};

function RoundRobinView({
  teams,
  matches = [],
  fixtureCycle = "Play once",
}) {
  const firstLegRounds = buildRoundRobinRounds(teams);
  const standings = competitionStandings(teams, matches);
  const rounds =
    fixtureCycle === "Home and away"
      ? [
          ...firstLegRounds,
          ...firstLegRounds.map((round) =>
            round.map((fixture) => ({
              home: fixture.away,
              away: fixture.home,
            })),
          ),
        ]
      : firstLegRounds;
  return (
    <View style={s.competitionStructure}>
      <View style={s.competitionSectionHeading}>
        <View style={{ flex: 1 }}>
          <AppText style={s.formSectionTitle}>League table</AppText>
          <AppText style={s.meta}>
            {fixtureCycle === "Home and away"
              ? "Every pairing has a home fixture and an away fixture"
              : "Every team plays every other team once"}
          </AppText>
        </View>
        <Ionicons name="list" size={23} color={C.red} />
      </View>
      <View style={s.roundRobinTable}>
        <View style={[s.roundRobinRow, s.roundRobinHead]}>
          <AppText style={[s.groupTeamName, { color: C.muted }]}>TEAM</AppText>
          <AppText style={s.roundRobinNumbers}>
            PL&nbsp; W&nbsp; D&nbsp; L&nbsp; GD&nbsp; PTS
          </AppText>
        </View>
        {standings.map((entry, index) => (
          <View style={s.roundRobinRow} key={entry.team.id}>
            <AppText style={s.groupTeamName} numberOfLines={1}>
              {index + 1}. {entry.team.name}
            </AppText>
            <AppText style={s.roundRobinNumbers}>
              {entry.played}&nbsp;&nbsp; {entry.wins}&nbsp;&nbsp;{" "}
              {entry.draws}&nbsp;&nbsp; {entry.losses}&nbsp;&nbsp;{" "}
              {entry.goalDifference}&nbsp;&nbsp;&nbsp; {entry.points}
            </AppText>
          </View>
        ))}
        {!teams.length ? (
          <View style={s.structureEmpty}>
            <AppText style={s.team}>No teams registered yet</AppText>
            <AppText style={s.body}>
              The table will begin as teams join this competition.
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText style={s.formSectionTitle}>Matchdays</AppText>
      {rounds.length ? (
        rounds.map((round, index) => (
          <View style={s.matchdayBlock} key={`round_${index}`}>
            <AppText style={s.bracketRoundTitle}>Matchday {index + 1}</AppText>
            {round.map((fixture) => (
              <View
                style={s.matchdayFixture}
                key={`${index}_${fixture.home.id}_${fixture.away.id}`}
              >
                <AppText style={s.matchdayTeam} numberOfLines={1}>
                  {fixture.home.name}
                </AppText>
                <AppText style={s.matchdayVersus}>VS</AppText>
                <AppText
                  style={[s.matchdayTeam, { textAlign: "right" }]}
                  numberOfLines={1}
                >
                  {fixture.away.name}
                </AppText>
              </View>
            ))}
          </View>
        ))
      ) : (
        <View style={s.structureEmpty}>
          <AppText style={s.team}>Fixtures need at least two teams</AppText>
          <AppText style={s.body}>
            Matchdays are generated automatically after another team joins.
          </AppText>
        </View>
      )}
    </View>
  );
}

function DayTournamentView({
  teams,
  matches = [],
  twoDays = false,
}) {
  return (
    <View style={s.competitionStructure}>
      <View style={s.dayPlan}>
        <View style={s.dayPlanItem}>
          <AppText style={[s.bracketRoundTitle, { color: C.gold }]}>
            {twoDays ? "Day 1" : "Morning"}
          </AppText>
          <AppText style={[s.team, { color: C.white }]}>Group matches</AppText>
          <AppText style={[s.meta, { color: "#D8CDE1" }]}>
            Every team gets an opening game
          </AppText>
        </View>
        <View style={s.dayPlanItem}>
          <AppText style={[s.bracketRoundTitle, { color: C.gold }]}>
            {twoDays ? "Day 2" : "Afternoon"}
          </AppText>
          <AppText style={[s.team, { color: C.white }]}>
            Knockout matches
          </AppText>
          <AppText style={[s.meta, { color: "#D8CDE1" }]}>
            Qualifiers play through to the final
          </AppText>
        </View>
      </View>
      <GroupStageView teams={teams} matches={matches} />
    </View>
  );
}

function TournamentResultsPanel({
  league,
  teams,
  matches,
  complete,
}) {
  const standings = competitionStandings(teams, matches);
  const verifiedResults = matches
    .filter((match) => match.status === "completed" && match.result)
    .sort((first, second) =>
      `${second.matchDate || ""} ${second.kickoff || ""}`.localeCompare(
        `${first.matchDate || ""} ${first.kickoff || ""}`,
      ),
    );
  const finalMatch = verifiedResults.find(
    (match) => match.competitionStage === "Final",
  );
  const finalWinnerId = finalMatch
    ? Number(finalMatch.result.homeScore || 0) >
      Number(finalMatch.result.awayScore || 0)
      ? finalMatch.homeTeamId
      : Number(finalMatch.result.awayScore || 0) >
          Number(finalMatch.result.homeScore || 0)
        ? finalMatch.awayTeamId
        : finalMatch.result.winnerTeamId
    : "";
  const winner =
    teams.find((team) => team.id === finalWinnerId) ||
    (league.competitionType === "Round robin" && complete
      ? standings[0]?.team
      : null);
  const runnerUp =
    finalMatch && winner
      ? teams.find(
          (team) =>
            team.id ===
            (finalMatch.homeTeamId === winner.id
              ? finalMatch.awayTeamId
              : finalMatch.homeTeamId),
        )
      : league.competitionType === "Round robin" && complete
        ? standings[1]?.team
        : null;
  const playerLeaders = tournamentPlayerLeaders(matches);
  const playerOfTournament = playerLeaders[0];
  return (
    <View style={s.tournamentResults}>
      <View style={s.competitionSectionHeading}>
        <View style={{ flex: 1 }}>
          <AppText style={s.formSectionTitle}>Results and honours</AppText>
          <AppText style={s.meta}>
            Only scores confirmed by both teams count here
          </AppText>
        </View>
        <Ionicons name="medal-outline" size={23} color={C.gold} />
      </View>
      {complete && winner ? (
        <View style={s.championPanel}>
          <Ionicons name="trophy" size={30} color={C.gold} />
          <View style={{ flex: 1 }}>
            <AppText style={s.championLabel}>CHAMPIONS</AppText>
            <AppText style={s.championName}>{winner.name}</AppText>
            {runnerUp ? (
              <AppText style={[s.meta, { color: "#D9CFE2" }]}>
                Runners up · {runnerUp.name}
              </AppText>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={s.competitionStatusNote}>
          <Ionicons name="time-outline" size={19} color={C.red} />
          <AppText style={[s.body, { flex: 1 }]}>
            Honours are confirmed after every scheduled match has a verified
            result.
          </AppText>
        </View>
      )}
      {playerOfTournament ? (
        <View style={s.tournamentHonourRow}>
          <View style={s.playerAvatar}>
            <AppText style={s.playerAvatarText}>
              {initials(playerOfTournament.name)}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={s.team}>
              {complete
                ? "Player of the tournament"
                : "Current player leader"}
            </AppText>
            <AppText style={s.body}>{playerOfTournament.name}</AppText>
          </View>
          <AppText style={s.publicStatsValue}>
            {playerOfTournament.goals} G · {playerOfTournament.assists} A
          </AppText>
        </View>
      ) : null}
      <AppText style={s.settingsGroupTitle}>MATCH RESULTS</AppText>
      {verifiedResults.map((match) => (
        <View style={s.tournamentResultRow} key={match.id}>
          <View style={{ flex: 1 }}>
            <AppText style={s.meta}>
              {match.competitionStage || formatStoredDate(match.matchDate)}
            </AppText>
            <AppText style={s.team} numberOfLines={1}>
              {match.homeTeamName}
            </AppText>
          </View>
          <AppText style={s.tournamentResultScore}>
            {match.result.homeScore} : {match.result.awayScore}
          </AppText>
          <AppText
            style={[s.team, { flex: 1, textAlign: "right" }]}
            numberOfLines={1}
          >
            {match.awayTeamName}
          </AppText>
        </View>
      ))}
      {!verifiedResults.length ? (
        <View style={s.structureEmpty}>
          <AppText style={s.team}>No confirmed results yet</AppText>
          <AppText style={s.body}>
            Recorded scores appear after the opposing team confirms them.
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

function MoreDetail({
  section,
  close,
  navigate,
  role,
  team,
  onUpdateTeam,
  publicProfiles = [],
  onAddPlayer,
  onRemovePlayer,
  teamJoinRequests = [],
  onAcceptJoinRequest,
  conversations = [],
  leagues = [],
  onJoinLeague,
  notifications = [],
  currentUid,
  matchChatRepairing = false,
  matchChatRepairFailed = false,
  onRetryMatchChats,
  onClearNotification,
  playerAssignments = [],
  teams = [],
  onStartPlayerChat,
  matches = [],
}) {
  const [preferences, setPreferences] = useState({
    requests: true,
    squad: true,
    results: false,
  });
  const [leagueReview, setLeagueReview] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [products, setProducts] = useState([]);
  const [playerSearch, setPlayerSearch] = useState("");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatLoadError, setChatLoadError] = useState("");
  const [teamStatsPeriod, setTeamStatsPeriod] = useState("All time");
  useEffect(() => {
    if (!selectedLeague?.id) return;
    const refreshedLeague = leagues.find(
      (league) => league.id === selectedLeague.id,
    );
    if (refreshedLeague) setSelectedLeague(refreshedLeague);
  }, [leagues, selectedLeague?.id]);
  useEffect(() => {
    if (!selectedConversation?.id) return undefined;
    setChatLoadError("");
    markConversationRead(selectedConversation.id, currentUid).catch(() => {});
    return subscribeConversationMessages(
      selectedConversation.id,
      setMessages,
      () => {
        setMessages([]);
        setChatLoadError(
          "Messages could not be loaded. Check your connection.",
        );
      },
    );
  }, [selectedConversation?.id, currentUid]);
  const chatThreads = conversations
    .filter((conversation) => conversation.archived !== true)
    .sort((first, second) => {
      const priority = { team: 0, match: 1, captains: 1, player: 2, direct: 2 };
      return (priority[first.scope] ?? 3) - (priority[second.scope] ?? 3);
    });
  const coachRecords = [];
  const leagueRecords = leagues;
  const savedTeamStats = teamStatsForPeriod(team, matches, teamStatsPeriod);
  const teamPlayers = publicProfiles.filter(
    (profile) =>
      profile.role === "Player" && team?.memberIds?.includes(profile.ownerId),
  );
  const leaderFor = (key) =>
    [...teamPlayers].sort(
      (first, second) => Number(second[key] || 0) - Number(first[key] || 0),
    )[0];
  const statsSummary = [
    [String(savedTeamStats.matches || 0), "PLAYED"],
    [String(savedTeamStats.wins || 0), "WINS"],
    [String(savedTeamStats.goalsFor || 0), "GOALS"],
    [String(savedTeamStats.points || 0), "POINTS"],
  ];
  const statLeaders = [
    ["football-outline", "Goals", leaderFor("goals"), "goals"],
    ["git-merge-outline", "Assists", leaderFor("assists"), "assists"],
    ["time-outline", "Minutes", leaderFor("minutes"), "minutes"],
  ].filter((item) => item[2]);
  const playerDirectory = prioritizeByLocation(
    publicProfiles.filter((profile) => {
      if (profile.role !== "Player") return false;
      const needle = playerSearch.trim().toLowerCase();
      if (!needle) return true;
      return `${profile.name || ""} ${profile.position || ""} ${profile.area || ""}`
        .toLowerCase()
        .includes(needle);
    }),
    team?.area,
  );
  const assignmentFor = (profile) =>
    playerAssignments.find((item) => item.userId === profile.ownerId);
  const teamNameFor = (profile) => {
    const assignment = assignmentFor(profile);
    return teams.find((item) => item.id === assignment?.teamId)?.name || "";
  };
  const coachDirectory = prioritizeByLocation(
    publicProfiles.filter((profile) => profile.role === "Coach"),
    team?.area,
  );
  const pendingJoinRequests = teamJoinRequests.filter(
    (request) =>
      request.teamId === team?.id &&
      !playerAssignments.some(
        (assignment) =>
          assignment.userId ===
          publicProfiles.find(
            (profile) => profile.id === request.playerProfileId,
          )?.ownerId,
      ),
  );
  const toggle = (key) =>
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  const detailDescriptions = {
    Chat: "Private team rooms and temporary game logistics conversations.",
    Team: "Your club identity, staff, ground and verified playing record.",
    Players: "Find registered players across your team and community.",
    Coaches: "Manage coaching staff, responsibilities and permissions.",
    Stats: "Team and player performance built from verified match events.",
    Leagues: "Competitions built for local teams and verified results.",
    Merchandise: "Sell club shirts and supporter items from the team profile.",
    Web: "Share your team, fixtures and results beyond the app.",
    Settings: "Control your team account, alerts and match preferences.",
    Notifications:
      "Requests and updates from teams, players and football partners.",
  };
  if (section === "Stats")
    return (
      <Community
        statsOnly
        close={close}
        team={team}
        teams={teams}
        matches={matches}
        leagues={leagues}
        publicProfiles={publicProfiles}
      />
    );
  if (section === "Team" && team)
    return (
      <TeamSettingsScreen
        team={team}
        close={close}
        onUpdateTeam={onUpdateTeam}
      />
    );
  if (section === "Chat" && selectedConversation)
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.subHeader}>
          <Pressable onPress={() => setSelectedConversation(null)}>
            <Ionicons name="arrow-back" size={23} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <AppText style={s.headerTitle}>
              {selectedConversation.title || "PRIVATE CHAT"}
            </AppText>
            <AppText style={s.headerSub}>
              {selectedConversation.scope === "team"
                ? "TEAM MEMBERS ONLY"
                : selectedConversation.scope === "player"
                  ? "COACH AND PLAYER"
                  : "COACHES AND CAPTAINS · CLOSES AFTER MATCH"}
            </AppText>
          </View>
          {["player", "direct"].includes(selectedConversation.scope) ? (
            <Pressable
              onPress={() =>
                closeConversation(selectedConversation.id, currentUid)
                  .then(() => setSelectedConversation(null))
                  .catch(() =>
                    Alert.alert("Couldn’t close chat", "Please try again."),
                  )
              }
            >
              <AppText style={s.communitySeeAll}>CLOSE CHAT</AppText>
            </Pressable>
          ) : (
            <Ionicons name="lock-closed" size={18} color={C.green} />
          )}
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.conversationMessages}
        >
          {chatLoadError ? (
            <View style={s.chatNotice}>
              <Ionicons
                name="cloud-offline-outline"
                size={18}
                color="#9C2635"
              />
              <AppText style={[s.body, { flex: 1 }]}>{chatLoadError}</AppText>
            </View>
          ) : null}
          {!messages.length ? (
            <View style={s.chatEmpty}>
              <Ionicons name="chatbubble-outline" size={28} color={C.muted} />
              <AppText style={s.team}>Start the conversation</AppText>
              <AppText style={s.body}>
                Only the people named above can read these messages.
              </AppText>
            </View>
          ) : null}
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                s.chatBubble,
                message.senderId === currentUid && s.chatBubbleOwn,
              ]}
            >
              <AppText
                style={[
                  s.body,
                  message.senderId === currentUid && { color: C.white },
                ]}
              >
                {message.text}
              </AppText>
              <AppText
                style={[
                  s.chatMessageTime,
                  message.senderId === currentUid && s.chatMessageTimeOwn,
                ]}
              >
                {formatChatTime(message.createdAt)}
              </AppText>
            </View>
          ))}
        </ScrollView>
        <View style={s.chatComposer}>
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Write a message"
            placeholderTextColor={C.muted}
            style={s.chatInput}
          />
          <Pressable
            disabled={!messageText.trim() || chatSending}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            style={[
              s.chatSend,
              (!messageText.trim() || chatSending) && s.buttonDisabled,
            ]}
            onPress={async () => {
              const text = messageText.trim();
              if (!text || chatSending) return;
              setChatSending(true);
              try {
                await sendConversationMessage(
                  selectedConversation.id,
                  currentUid,
                  text,
                );
                setMessageText("");
              } catch (error) {
                Alert.alert(
                  "Couldn’t send message",
                  error?.message ||
                    "Please check your connection and try again.",
                );
              } finally {
                setChatSending(false);
              }
            }}
          >
            {chatSending ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Ionicons name="send" color="white" size={18} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  if (section === "Leagues" && selectedLeague) {
    const leagueAwards = Array.isArray(selectedLeague.awards)
      ? selectedLeague.awards
      : selectedLeague.awards && typeof selectedLeague.awards === "object"
        ? Object.entries(selectedLeague.awards).map(([label, amount]) => ({
            id: label,
            label,
            amount,
          }))
        : [];
    const registeredTeams = (selectedLeague.teamIds || [])
      .map((teamId) => teams.find((item) => item.id === teamId))
      .filter(Boolean);
    const competitionType = selectedLeague.competitionType || "Round robin";
    const competitionMatches = matches.filter(
      (match) => match.competitionId === selectedLeague.id,
    );
    const competitionComplete =
      competitionMatches.length > 0 &&
      competitionMatches.every((match) => match.status === "completed");
    const distributedPrize = leagueAwards.reduce(
      (total, award) => total + Number(award.amount || 0),
      0,
    );
    const collectedEntryFees =
      registeredTeams.length * Number(selectedLeague.joiningFee || 0);
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={s.subHeader}>
          <Pressable onPress={() => setSelectedLeague(null)}>
            <Ionicons name="close" size={23} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <AppText style={s.headerTitle}>{selectedLeague.name}</AppText>
            <AppText style={s.headerSub}>COMPETITION CENTRE</AppText>
          </View>
        </View>
        <View style={s.formIntro}>
          <View style={s.competitionTitleRow}>
            <AppText style={[s.screenTitle, { flex: 1 }]}>
              {selectedLeague.competitionType || "Round robin"}
            </AppText>
            <View
              style={[
                s.statusBadge,
                competitionComplete
                  ? s.statusBadgeSuccess
                  : s.statusBadgePending,
              ]}
            >
              <AppText style={s.statusBadgeText}>
                {competitionComplete ? "COMPLETED" : "IN PROGRESS"}
              </AppText>
            </View>
          </View>
          <AppText style={s.body}>
            {selectedLeague.format} · {registeredTeams.length} of{" "}
            {selectedLeague.maxTeams || 0} teams · $
            {selectedLeague.joiningFee || 0} entry
          </AppText>
          {competitionType === "Round robin" ? (
            <AppText style={s.meta}>
              {selectedLeague.fixtureCycle || "Play once"} league schedule
            </AppText>
          ) : null}
        </View>
        <View style={s.communityListSection}>
          {competitionType === "Round robin" ? (
            <RoundRobinView
              teams={registeredTeams}
              matches={competitionMatches}
              fixtureCycle={selectedLeague.fixtureCycle || "Play once"}
            />
          ) : competitionType === "Knockout" ? (
            <KnockoutBracketView teams={registeredTeams} />
          ) : competitionType === "World Cup format" ? (
            <GroupStageView
              teams={registeredTeams}
              matches={competitionMatches}
            />
          ) : competitionType === "Two day tournament" ? (
            <DayTournamentView
              teams={registeredTeams}
              matches={competitionMatches}
              twoDays
            />
          ) : (
            <DayTournamentView
              teams={registeredTeams}
              matches={competitionMatches}
            />
          )}
          <TournamentResultsPanel
            league={selectedLeague}
            teams={registeredTeams}
            matches={competitionMatches}
            complete={competitionComplete}
          />
          <AppText style={s.settingsGroupTitle}>AWARDS AND MONEY</AppText>
          {leagueAwards.map((award) => (
            <View style={s.settingRow} key={award.id || award.label}>
              <AppText style={s.team}>{award.label}</AppText>
              <AppText style={s.transactionAmount}>
                ${award.amount || 0}
              </AppText>
            </View>
          ))}
          <View style={s.settingRow}>
            <AppText style={s.team}>Joining fee</AppText>
            <AppText style={s.transactionAmount}>
              ${selectedLeague.joiningFee || 0}
            </AppText>
          </View>
          <View style={s.prizeSummary}>
            <View>
              <AppText style={s.meta}>POTENTIAL FEE POOL</AppText>
              <AppText style={s.team}>${collectedEntryFees}</AppText>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <AppText style={s.meta}>PLANNED PRIZES</AppText>
              <AppText style={s.team}>${distributedPrize}</AppText>
            </View>
          </View>
          <AppText style={s.settingsGroupTitle}>RULES</AppText>
          <AppText style={s.body}>
            {selectedLeague.rules ||
              selectedLeague.rulesPreset ||
              "Community standard rules"}
          </AppText>
          <AppText style={s.settingsGroupTitle}>SPONSORS</AppText>
          <AppText style={s.body}>
            {selectedLeague.sponsor
              ? selectedLeague.sponsor
              : "No tournament sponsor added yet."}
          </AppText>
          <AppText style={s.meta}>
            Up to {selectedLeague.maxSponsors || 0} sponsors ·{" "}
            {selectedLeague.preferAppCreators
              ? "in app sponsors reviewed first"
              : "open review"}
          </AppText>
        </View>
      </ScrollView>
    );
  }
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <View style={s.subHeader}>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={
            section === "Merchandise" ? "Back to Team" : "Back to More"
          }
        >
          <Ionicons name="arrow-back" size={23} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <AppText style={s.headerTitle}>{section.toUpperCase()}</AppText>
          <AppText style={s.headerSub}>COMMUNITY FOOTBALL</AppText>
        </View>
      </View>
      <View style={s.screenIntro}>
        <AppText style={s.screenTitle}>{section}</AppText>
        <AppText style={s.body}>{detailDescriptions[section]}</AppText>
      </View>
      <View style={s.communityListSection}>
        {section === "Notifications" &&
          notifications.map((item) => (
            <View style={s.requestRow} key={item.id}>
              <View style={s.utilityIcon}>
                <Ionicons
                  name={
                    item.type === "team_challenge"
                      ? "shield-outline"
                      : "person-add-outline"
                  }
                  size={20}
                  color={C.red}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>{item.title}</AppText>
                <AppText style={s.body}>{item.body}</AppText>
              </View>
              {!item.read ? <View style={s.unreadBadge} /> : null}
              <Pressable
                onPress={() => onClearNotification?.(item)}
                accessibilityLabel="Clear notification"
              >
                <Ionicons
                  name="close-circle-outline"
                  size={21}
                  color={C.muted}
                />
              </Pressable>
            </View>
          ))}
        {section === "Notifications" && !notifications.length ? (
          <View style={s.emptyState}>
            <Ionicons name="notifications-outline" size={30} color={C.muted} />
            <AppText style={s.team}>No notifications yet</AppText>
            <AppText style={s.body}>
              Team, player, scout, referee and sponsor requests will appear
              here.
            </AppText>
          </View>
        ) : null}
        {section === "Team" && role === "Coach" ? (
          <Pressable
            onPress={() => navigate("Create Team")}
            style={s.entityCreateButton}
            accessibilityRole="button"
            accessibilityLabel="Create team"
          >
            <View style={s.entityCreateIcon}>
              <Ionicons name="add" size={22} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={s.entityCreateTitle}>Create team</AppText>
              <AppText style={s.entityCreateCopy}>
                Set the badge, kit, colours, staff and home ground
              </AppText>
            </View>
            <Ionicons name="arrow-forward" size={19} color={C.red} />
          </Pressable>
        ) : null}
        {section === "Leagues" && role === "Coach" ? (
          <Pressable
            onPress={() => navigate("Create League")}
            style={s.entityCreateButton}
            accessibilityRole="button"
            accessibilityLabel="Create league"
          >
            <View style={s.entityCreateIcon}>
              <Ionicons name="add" size={22} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={s.entityCreateTitle}>Create league</AppText>
              <AppText style={s.entityCreateCopy}>
                Set rules, subscriptions, prizes and sponsorship
              </AppText>
            </View>
            <Ionicons name="arrow-forward" size={19} color={C.red} />
          </Pressable>
        ) : null}
        {section === "Chat" &&
          chatThreads.map((item) => (
            <Pressable
              style={s.chatRow}
              key={item.id}
              onPress={() => setSelectedConversation(item)}
            >
              <View style={s.chatRoomIcon}>
                <Ionicons
                  name={
                    item.scope === "team"
                      ? "people-outline"
                      : ["match", "captains"].includes(item.scope)
                        ? "football-outline"
                        : "person-outline"
                  }
                  size={21}
                  color={C.red}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>{item.title || "Conversation"}</AppText>
                <AppText style={s.body} numberOfLines={1}>
                  {item.lastMessage ||
                    (item.scope === "team"
                      ? "Private team room"
                      : item.scope === "player"
                        ? "Private coach and player conversation"
                        : "Game logistics · coaches and captains")}
                </AppText>
              </View>
              <View style={s.chatRoomState}>
                {conversationIsUnread(item, currentUid) ? (
                  <View style={s.unreadBadge} />
                ) : (
                  <View
                    style={[
                      s.confirmedDot,
                      ["match", "captains"].includes(item.scope) && {
                        backgroundColor: C.gold,
                      },
                    ]}
                  />
                )}
                <AppText style={s.chatRoomStateText}>
                  {["match", "captains"].includes(item.scope)
                    ? "MATCH ROOM"
                    : "OPEN"}
                </AppText>
              </View>
            </Pressable>
          ))}
        {section === "Chat" && !chatThreads.length ? (
          <View style={s.emptyState}>
            {matchChatRepairing ? (
              <ActivityIndicator color={C.red} />
            ) : (
              <Ionicons name="chatbubbles-outline" size={30} color={C.muted} />
            )}
            <AppText style={s.team}>
              {matchChatRepairing
                ? "Opening match conversations"
                : matchChatRepairFailed
                  ? "Match chat needs another try"
                  : "No conversations yet"}
            </AppText>
            <AppText style={s.body}>
              {matchChatRepairing
                ? "Confirmed fixtures are being connected to their private logistics rooms."
                : matchChatRepairFailed
                  ? "Your match is safe. Try opening its logistics room again."
                  : "Team and opponent messages will appear here."}
            </AppText>
            {matchChatRepairFailed ? (
              <Pressable style={s.outlineButton} onPress={onRetryMatchChats}>
                <AppText style={s.buttonText}>TRY AGAIN</AppText>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {section === "Team" && team && (
          <>
            <View style={s.teamProfileHero}>
              <CrestPreview
                shape={team.crest?.shape || 0}
                color={team.crest?.color || C.redDark}
                label={team.crest?.label || initials(team.name)}
              />
              <View style={{ flex: 1 }}>
                <AppText style={s.squadTeamName}>{team.name}</AppText>
                <AppText style={s.squadTeamMeta}>
                  {team.ageGroup || "Senior"} · {team.area || "Area not added"}
                </AppText>
              </View>
            </View>
            <View style={s.playerMetricRow}>
              {[
                [String(team.stats?.players || 0), "PLAYERS"],
                [String(team.stats?.matches || 0), "MATCHES"],
                [String(team.stats?.wins || 0), "WINS"],
                [String(team.stats?.points || 0), "POINTS"],
              ].map((item) => (
                <View key={item[1]} style={s.playerMetric}>
                  <AppText style={s.playerMetricValue}>{item[0]}</AppText>
                  <AppText style={s.playerMetricLabel}>{item[1]}</AppText>
                </View>
              ))}
            </View>
            <Pressable
              onPress={() => navigate("Merchandise")}
              style={s.entityCreateButton}
              accessibilityRole="button"
              accessibilityLabel="Open merchandise store"
            >
              <View style={s.entityCreateIcon}>
                <Ionicons name="shirt-outline" size={21} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={s.entityCreateTitle}>Merchandise store</AppText>
                <AppText style={s.entityCreateCopy}>
                  List shirts, scarves and supporter items for sale
                </AppText>
              </View>
              <Ionicons name="arrow-forward" size={19} color={C.red} />
            </Pressable>
            {[
              ["Home ground", team.ground?.name || "Not added"],
              ["Primary coach", team.coachName || "Not added"],
              [
                "Captain",
                team.captainIds?.length
                  ? `${team.captainIds.length} assigned`
                  : "Not assigned",
              ],
              ["Kit sponsor", team.sponsor || "No sponsor"],
            ].map((item) => (
              <Pressable
                key={item[0]}
                style={s.settingRow}
                onPress={() => Alert.alert(item[0], item[1])}
              >
                <View style={{ flex: 1 }}>
                  <AppText style={s.team}>{item[0]}</AppText>
                  <AppText style={s.meta}>{item[1]}</AppText>
                </View>
                <Ionicons name="chevron-forward" color={C.muted} />
              </Pressable>
            ))}
          </>
        )}
        {section === "Players" ? (
          <>
            {pendingJoinRequests.length ? (
              <>
                <AppText style={s.settingsGroupTitle}>JOIN REQUESTS</AppText>
                {pendingJoinRequests.map((request) => {
                  const profile = publicProfiles.find(
                    (item) => item.id === request.playerProfileId,
                  );
                  if (!profile) return null;
                  return (
                    <View key={request.id} style={s.playerRow}>
                      <View style={s.playerAvatar}>
                        <AppText style={s.playerAvatarText}>
                          {initials(profile.name)}
                        </AppText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText style={s.team}>{profile.name}</AppText>
                        <AppText style={s.meta}>
                          Wants to join · {profile.position || "Player"}
                        </AppText>
                      </View>
                      <Pressable
                        onPress={async () => {
                          try {
                            await onAcceptJoinRequest(request, profile);
                            Alert.alert(
                              "Request accepted",
                              `${profile.name} is now in your team.`,
                            );
                          } catch {
                            Alert.alert(
                              "Couldn’t accept request",
                              "Please check your connection and try again.",
                            );
                          }
                        }}
                        style={s.roleMiniButton}
                      >
                        <AppText style={s.roleMiniButtonText}>ACCEPT</AppText>
                      </Pressable>
                    </View>
                  );
                })}
              </>
            ) : null}
            <AppText style={s.settingsGroupTitle}>YOUR SQUAD</AppText>
            {publicProfiles
              .filter(
                (profile) =>
                  profile.role === "Player" &&
                  team?.memberIds?.includes(profile.ownerId),
              )
              .map((profile) => (
                <PersonSearchCard
                  key={`squad-${profile.id}`}
                  profile={profile}
                  status="YOUR PLAYER"
                  teamName={team?.name}
                  action={
                    <Pressable
                      style={[s.roleMiniButton, s.declineButton]}
                      onPress={() => onRemovePlayer(profile)}
                    >
                      <AppText
                        style={[s.roleMiniButtonText, { color: C.redDark }]}
                      >
                        REMOVE
                      </AppText>
                    </Pressable>
                  }
                />
              ))}
            {!publicProfiles.some(
              (profile) =>
                profile.role === "Player" &&
                team?.memberIds?.includes(profile.ownerId),
            ) ? (
              <View style={s.emptyState}>
                <Ionicons name="shirt-outline" size={28} color={C.muted} />
                <AppText style={s.team}>No players in the squad yet</AppText>
                <AppText style={s.body}>
                  Accepted players will appear here and in the formation.
                </AppText>
              </View>
            ) : null}
            <AppText style={s.settingsGroupTitle}>FIND PLAYERS</AppText>
            <TextInput
              value={playerSearch}
              onChangeText={setPlayerSearch}
              placeholder="Search name, position or area"
              placeholderTextColor={C.muted}
              style={s.formInput}
            />
            {playerDirectory.map((profile) => {
              const added = team?.memberIds?.includes(profile.ownerId);
              const assignedTeamName = teamNameFor(profile);
              return (
                <PersonSearchCard
                  key={profile.id}
                  profile={profile}
                  status={assignedTeamName ? "WITH A TEAM" : "AVAILABLE"}
                  teamName={assignedTeamName}
                  action={
                    <Pressable
                      onPress={async () => {
                        if (added) {
                          Alert.alert(
                            "Remove player",
                            `Remove ${profile.name} from this team and its group chat?`,
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Remove",
                                style: "destructive",
                                onPress: () =>
                                  onRemovePlayer(profile).catch(() =>
                                    Alert.alert(
                                      "Couldn’t remove player",
                                      "Please check your connection and try again.",
                                    ),
                                  ),
                              },
                            ],
                          );
                          return;
                        }
                        if (assignedTeamName) {
                          await onStartPlayerChat(profile);
                          return;
                        }
                        try {
                          await onAddPlayer(profile);
                          Alert.alert(
                            "Player added",
                            `${profile.name} is now in your team.`,
                          );
                        } catch {
                          Alert.alert(
                            "Couldn’t add player",
                            "Please check your connection and try again.",
                          );
                        }
                      }}
                      style={[s.roleMiniButton, added && s.declineButton]}
                    >
                      <AppText
                        style={[
                          s.roleMiniButtonText,
                          added && { color: C.redDark },
                        ]}
                      >
                        {added
                          ? "REMOVE"
                          : assignedTeamName
                            ? "DISCUSS MOVE"
                            : "ADD"}
                      </AppText>
                    </Pressable>
                  }
                  secondaryAction={
                    !added ? (
                      <Pressable
                        style={s.outlineButton}
                        onPress={() => onStartPlayerChat(profile)}
                      >
                        <AppText style={s.buttonText}>MESSAGE</AppText>
                      </Pressable>
                    ) : null
                  }
                />
              );
            })}
            {!playerDirectory.length ? (
              <View style={s.emptyState}>
                <Ionicons name="people-outline" size={30} color={C.muted} />
                <AppText style={s.team}>No matching players</AppText>
                <AppText style={s.body}>
                  Players with saved profiles will appear here. Use an invite
                  only when the player is not already using Grassroots.
                </AppText>
              </View>
            ) : null}
          </>
        ) : null}
        {section === "Coaches" &&
          coachDirectory.map((profile, index) => (
            <View style={s.playerRow} key={profile.id}>
              <View
                style={[
                  s.playerAvatar,
                  index === 0 && { backgroundColor: C.redDark },
                ]}
              >
                <AppText
                  style={[
                    s.playerAvatarText,
                    index === 0 && { color: "white" },
                  ]}
                >
                  {initials(profile.name)}
                </AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>{profile.name}</AppText>
                <AppText style={s.meta}>
                  {profile.qualification || "Qualification not added"} ·{" "}
                  {profile.area || "Area not added"}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" color={C.muted} />
            </View>
          ))}
        {section === "Coaches" && !coachDirectory.length ? (
          <View style={s.emptyState}>
            <Ionicons name="clipboard-outline" size={30} color={C.muted} />
            <AppText style={s.team}>No coaching staff added</AppText>
            <AppText style={s.body}>
              Invite coaches and choose their permissions.
            </AppText>
          </View>
        ) : null}
        {section === "Stats" && (
          <>
            <View style={s.statsScopeHeader}>
              <View style={s.statsScopeIcon}>
                <Ionicons name="shield-outline" size={22} color={C.red} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>Team statistics</AppText>
                <AppText style={s.body}>
                  Public club record for {team?.name || "your team"}. Anyone can
                  view confirmed statistics.
                </AppText>
              </View>
            </View>
            <StatsPeriodControl
              value={teamStatsPeriod}
              onChange={setTeamStatsPeriod}
            />
            <View style={s.statsSummaryStrip}>
              {statsSummary.map((item) => (
                <View key={item[1]} style={s.playerMetric}>
                  <AppText style={s.playerMetricValue}>{item[0]}</AppText>
                  <AppText style={s.playerMetricLabel}>{item[1]}</AppText>
                </View>
              ))}
            </View>
            <AppText style={s.settingsGroupTitle}>TEAM RECORD</AppText>
            <View style={s.teamStatsGrid}>
              {[
                ["PL", savedTeamStats.matches || 0],
                ["W", savedTeamStats.wins || 0],
                ["D", savedTeamStats.draws || 0],
                ["L", savedTeamStats.losses || 0],
                ["GF", savedTeamStats.goalsFor || 0],
                ["GA", savedTeamStats.goalsAgainst || 0],
                [
                  "GD",
                  Number(savedTeamStats.goalsFor || 0) -
                    Number(savedTeamStats.goalsAgainst || 0),
                ],
                ["PTS", savedTeamStats.points || 0],
              ].map(([label, value]) => (
                <View style={s.teamStatCell} key={label}>
                  <AppText style={s.teamStatValue}>{value}</AppText>
                  <AppText style={s.teamStatLabel}>{label}</AppText>
                </View>
              ))}
            </View>
            <View style={s.teamPpgRow}>
              <AppText style={s.meta}>POINTS PER GAME</AppText>
              <AppText style={s.team}>
                {Number(savedTeamStats.matches || 0)
                  ? (
                      Number(savedTeamStats.points || 0) /
                      Number(savedTeamStats.matches)
                    ).toFixed(2)
                  : "0.00"}
              </AppText>
            </View>
            <AppText style={s.settingsGroupTitle}>TEAM LEADERS</AppText>
            {statLeaders.map((item) => (
              <View key={item[1]} style={s.statLeaderRow}>
                <View style={s.utilityIcon}>
                  <Ionicons
                    name={item[0]}
                    size={20}
                    color={item[1] === "Yellow cards" ? "#D9A516" : C.red}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={s.meta}>{item[1].toUpperCase()}</AppText>
                  <AppText style={s.team}>{item[2].name}</AppText>
                </View>
                <AppText style={s.statLeaderValue}>
                  {Number(item[2][item[3]] || 0)}
                </AppText>
              </View>
            ))}
            {!Number(savedTeamStats.matches || 0) && !teamPlayers.length ? (
              <View style={s.emptyState}>
                <Ionicons
                  name="stats-chart-outline"
                  size={30}
                  color={C.muted}
                />
                <AppText style={s.team}>No statistics yet</AppText>
                <AppText style={s.body}>
                  Verified match events will build team statistics.
                </AppText>
              </View>
            ) : null}
            <View style={s.statsNotice}>
              <Ionicons
                name="information-circle-outline"
                color={C.red}
                size={22}
              />
              <AppText style={s.body}>
                Only captain-confirmed match events count toward official
                statistics.
              </AppText>
            </View>
          </>
        )}
        {section === "Merchandise" && (
          <>
            <View style={s.storeSummary}>
              <View>
                <AppText style={s.storeValue}>$0</AppText>
                <AppText style={s.meta}>SALES THIS MONTH</AppText>
              </View>
              <View>
                <AppText style={s.storeValue}>
                  {products.filter((item) => item.live).length}
                </AppText>
                <AppText style={s.meta}>LIVE PRODUCTS</AppText>
              </View>
            </View>
            {products.map((product, index) => (
              <View style={s.productRow} key={product.name}>
                <View style={s.productThumb}>
                  <Ionicons
                    name={
                      product.name.includes("scarf")
                        ? "ribbon-outline"
                        : "shirt-outline"
                    }
                    size={23}
                    color={C.red}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={s.team}>{product.name}</AppText>
                  <AppText style={s.meta}>
                    ${product.price} · {product.stock} in stock
                  </AppText>
                </View>
                <Pressable
                  onPress={() =>
                    setProducts((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, live: !item.live }
                          : item,
                      ),
                    )
                  }
                  style={[s.storeStatus, product.live && s.storeStatusLive]}
                >
                  <AppText style={s.storeStatusText}>
                    {product.live ? "On sale" : "Draft"}
                  </AppText>
                </Pressable>
              </View>
            ))}
            {!products.length ? (
              <View style={s.emptyState}>
                <Ionicons name="shirt-outline" size={30} color={C.muted} />
                <AppText style={s.team}>No products yet</AppText>
                <AppText style={s.body}>
                  Products you add will appear here.
                </AppText>
              </View>
            ) : null}
            <Pressable
              style={s.addEventButton}
              onPress={() =>
                Alert.alert(
                  "New product",
                  "Product creation is ready. Add the item name, price and stock before publishing.",
                )
              }
            >
              <Ionicons name="add" color={C.red} size={18} />
              <AppText style={s.communitySeeAll}>Add product</AppText>
            </Pressable>
          </>
        )}
        {section === "Leagues" && (
          <>
            <View style={s.leagueSafety}>
              <Ionicons
                name="shield-checkmark-outline"
                size={25}
                color={C.red}
              />
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>
                  One active league per match day
                </AppText>
                <AppText style={s.body}>
                  Grassroots checks fixture, registration and payment conflicts
                  before a request is sent.
                </AppText>
              </View>
            </View>
            {leagueReview ? (
              <View style={s.leagueReviewPanel}>
                <View style={s.formTitleRow}>
                  <AppText style={s.formSectionTitle}>{leagueReview}</AppText>
                  <Pressable
                    onPress={() => setLeagueReview(null)}
                    accessibilityLabel="Close league check"
                  >
                    <Ionicons name="close" size={20} />
                  </Pressable>
                </View>
                {[
                  [
                    "calendar-outline",
                    "Schedule",
                    "Conflicts with your current Sunday league",
                  ],
                  [
                    "people-outline",
                    "Player registration",
                    "18 players are registered elsewhere",
                  ],
                  [
                    "wallet-outline",
                    "Subscriptions",
                    "No payment will be taken now",
                  ],
                ].map((item, index) => (
                  <View key={item[1]} style={s.checklistRow}>
                    <View style={s.utilityIcon}>
                      <Ionicons
                        name={item[0]}
                        color={index === 2 ? C.green : C.red}
                        size={20}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={s.team}>{item[1]}</AppText>
                      <AppText style={s.meta}>{item[2]}</AppText>
                    </View>
                  </View>
                ))}
                <View style={[s.saveLineupButton, s.buttonDisabled]}>
                  <AppText style={s.saveLineupText}>
                    RESOLVE CONFLICTS FIRST
                  </AppText>
                </View>
              </View>
            ) : null}
            {leagueRecords.map((item) => {
              const joinedTeamCount = new Set(item.teamIds || []).size;
              const itemMatches = matches.filter(
                (match) => match.competitionId === item.id,
              );
              const competitionComplete =
                itemMatches.length > 0 &&
                itemMatches.every((match) => match.status === "completed");
              const leagueIsFull =
                joinedTeamCount >= Number(item.maxTeams || Infinity);
              return (
                <Pressable
                  style={s.league}
                  key={item.id}
                  onPress={() => setSelectedLeague(item)}
                >
                  <View style={s.leagueIcon}>
                    <AppText style={s.primaryText}>
                      {initials(item.name)}
                    </AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={s.team}>{item.name}</AppText>
                    <AppText style={s.meta}>
                      {item.competitionType || "Round robin"} · {item.format}
                  </AppText>
                  <AppText style={s.meta}>
                    {competitionComplete
                      ? "COMPLETED"
                      : (item.visibility || "public").toUpperCase()}{" "}
                    ·{" "}
                    {joinedTeamCount} of {item.maxTeams || "∞"} teams · $
                      {item.joiningFee || 0}
                    </AppText>
                  </View>
                  {item.ownerId === currentUid && !competitionComplete ? (
                    <Pressable
                      onPress={async () => {
                        const link = `friendlies://join-league?league=${encodeURIComponent(item.id)}`;
                        await Clipboard.setStringAsync(link);
                        Alert.alert(
                          "League link copied",
                          `Share this with coaches so they can open ${item.name} and request to join.`,
                        );
                      }}
                      style={s.join}
                    >
                      <AppText style={s.buttonText}>SHARE</AppText>
                    </Pressable>
                  ) : (
                    <Pressable
                      disabled={
                        !team?.id ||
                        competitionComplete ||
                        item.teamIds?.includes(team.id) ||
                        leagueIsFull ||
                        (item.visibility === "private" &&
                          !(item.invitedUserIds || []).includes(currentUid))
                      }
                      onPress={() =>
                        onJoinLeague(item).catch((error) =>
                          Alert.alert(
                            "Couldn’t join competition",
                            error?.message ||
                              "Please check your connection and try again.",
                          ),
                        )
                      }
                      style={s.join}
                    >
                      <AppText style={s.buttonText}>
                        {competitionComplete
                          ? "COMPLETED"
                          : item.teamIds?.includes(team?.id)
                            ? "JOINED"
                          : item.visibility === "private" &&
                              !(item.invitedUserIds || []).includes(currentUid)
                            ? "INVITE ONLY"
                            : leagueIsFull
                              ? "FULL"
                              : "JOIN"}
                      </AppText>
                    </Pressable>
                  )}
                </Pressable>
              );
            })}
            {!leagueRecords.length ? (
              <View style={s.emptyState}>
                <Ionicons name="trophy-outline" size={30} color={C.muted} />
                <AppText style={s.team}>No leagues yet</AppText>
                <AppText style={s.body}>
                  Create a league or join one when registrations open.
                </AppText>
              </View>
            ) : null}
          </>
        )}
        {section === "Web" &&
          [
            [
              "Public team page",
              team
                ? `Share ${team.name}’s profile`
                : "Create a team before sharing",
              "globe-outline",
            ],
            [
              "Match share link",
              "Send a fixture card to WhatsApp",
              "share-social-outline",
            ],
            [
              "League registration",
              "Complete forms on the web dashboard",
              "document-text-outline",
            ],
          ].map((item) => (
            <Pressable
              style={s.menu}
              key={item[0]}
              onPress={() => Alert.alert(item[0], item[1])}
            >
              <View style={s.utilityIcon}>
                <Ionicons name={item[2]} color={C.red} size={21} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>{item[0]}</AppText>
                <AppText style={s.meta}>{item[1]}</AppText>
              </View>
              <Ionicons name="chevron-forward" color={C.muted} />
            </Pressable>
          ))}
        {section === "Settings" && (
          <>
            <AppText style={s.settingsGroupTitle}>MATCH ALERTS</AppText>
            {[
              ["requests", "Match requests", "Challenges and opponent replies"],
              ["squad", "Squad availability", "Player responses and reminders"],
              [
                "results",
                "Result confirmations",
                "Captain verification updates",
              ],
            ].map((item) => (
              <Pressable
                key={item[0]}
                style={s.settingRow}
                onPress={() => toggle(item[0])}
              >
                <View style={{ flex: 1 }}>
                  <AppText style={s.team}>{item[1]}</AppText>
                  <AppText style={s.meta}>{item[2]}</AppText>
                </View>
                <View
                  style={[
                    s.toggleTrack,
                    preferences[item[0]] && s.toggleTrackActive,
                  ]}
                >
                  <View
                    style={[
                      s.toggleKnob,
                      preferences[item[0]] && s.toggleKnobActive,
                    ]}
                  />
                </View>
              </Pressable>
            ))}
            <AppText style={s.settingsGroupTitle}>ACCOUNT</AppText>
            {[
              ["Team profile", team?.name || "No team created"],
              ["Home area", team?.area || "Not added"],
              ["Privacy", "Captains can contact us"],
            ].map((item) => (
              <Pressable
                style={s.settingRow}
                key={item[0]}
                onPress={() => Alert.alert(item[0], item[1])}
              >
                <View style={{ flex: 1 }}>
                  <AppText style={s.team}>{item[0]}</AppText>
                  <AppText style={s.meta}>{item[1]}</AppText>
                </View>
                <Ionicons name="chevron-forward" color={C.muted} />
              </Pressable>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function RoleToolScreen({
  section,
  role,
  close,
  team,
  publicProfiles = [],
  onAddPlayer,
  onSendProfileRequest,
}) {
  const { width } = useWindowDimensions();
  const compact = width < 390;
  const [availability, setAvailability] = useState({
    Sat: true,
    Sun: true,
    Tue: false,
    Thu: false,
  });
  const [inviteType, setInviteType] = useState("Player");
  const [contact, setContact] = useState("");
  const [sent, setSent] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [moneyOwner, setMoneyOwner] = useState("Grassroots managed");
  const [assignment, setAssignment] = useState("Pending");
  const [joinRequests, setJoinRequests] = useState([]);
  const [report, setReport] = useState({
    home: "2",
    away: "1",
    yellow: "3",
    red: "0",
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const descriptions = {
    "Club Wallet": "Track team dues, expenses and sponsor money.",
    "Invite People": "Bring players, coaches and referees into Grassroots.",
    "My Player Card": "Your verified football identity and playing record.",
    Availability: "Tell the coach when you can train and play.",
    "Find a Team": "Discover teams that fit your position and location.",
    Assignments: "Accept fixtures and keep your referee calendar clear.",
    "Match Report": "Submit the official score, discipline and incidents.",
    "Referee Wallet": "See match fees, pending payments and payouts.",
  };
  const setReportField = (key, value) =>
    setReport((current) => ({ ...current, [key]: value }));
  const inviteMatches = publicProfiles
    .filter((profile) => profile.role === inviteType)
    .filter((profile) => {
      const needle = contact.trim().toLowerCase();
      if (!needle) return false;
      return `${profile.name || ""} ${profile.area || ""} ${profile.position || ""}`
        .toLowerCase()
        .includes(needle);
    })
    .slice(0, 8);
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      <View style={s.subHeader}>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Back to More"
        >
          <Ionicons name="arrow-back" size={23} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <AppText style={s.headerTitle}>{section.toUpperCase()}</AppText>
          <AppText style={s.headerSub}>{role.toUpperCase()} WORKSPACE</AppText>
        </View>
      </View>
      <View style={s.formIntro}>
        <AppText style={s.screenTitle}>{section}</AppText>
        <AppText style={s.body}>{descriptions[section]}</AppText>
      </View>
      {section === "Club Wallet" && (
        <View style={s.communityListSection}>
          <View style={s.walletHero}>
            <AppText style={s.walletLabel}>AVAILABLE CLUB BALANCE</AppText>
            <AppText style={s.walletBalance}>$0.00</AppText>
            <View style={s.walletSplit}>
              <View>
                <AppText style={s.walletMiniValue}>$0</AppText>
                <AppText style={s.walletMiniLabel}>COLLECTED</AppText>
              </View>
              <View>
                <AppText style={s.walletMiniValue}>$0</AppText>
                <AppText style={s.walletMiniLabel}>SPENT</AppText>
              </View>
              <View>
                <AppText style={s.walletMiniValue}>0/0</AppText>
                <AppText style={s.walletMiniLabel}>DUES PAID</AppText>
              </View>
            </View>
          </View>
          <AppText style={s.settingsGroupTitle}>WHO MANAGES THE MONEY?</AppText>
          <View style={s.moneyOwnership}>
            {[
              [
                "Grassroots managed",
                "Payments, receipts and payouts stay inside the app",
                "shield-checkmark-outline",
              ],
              [
                "Team managed",
                "Your treasurer records totals; money stays in your own account",
                "people-outline",
              ],
            ].map((item) => (
              <Pressable
                key={item[0]}
                onPress={() => setMoneyOwner(item[0])}
                style={[
                  s.moneyOwnerChoice,
                  moneyOwner === item[0] && s.moneyOwnerChoiceActive,
                ]}
              >
                <Ionicons
                  name={item[2]}
                  size={22}
                  color={moneyOwner === item[0] ? C.red : C.muted}
                />
                <View style={{ flex: 1 }}>
                  <AppText style={s.team}>{item[0]}</AppText>
                  <AppText style={s.meta}>{item[1]}</AppText>
                </View>
                {moneyOwner === item[0] ? (
                  <Ionicons name="checkmark-circle" size={21} color={C.green} />
                ) : null}
              </Pressable>
            ))}
          </View>
          <View style={s.statsNotice}>
            <Ionicons
              name="information-circle-outline"
              color={C.red}
              size={21}
            />
            <AppText style={s.body}>
              {moneyOwner === "Grassroots managed"
                ? "Grassroots can collect dues and merchandise payments, then pay the team after the settlement period."
                : "Grassroots will never hold or move team funds; the app only keeps your ledger."}
            </AppText>
          </View>
          <View style={s.quickMoneyActions}>
            {[
              ["add-circle-outline", "Collect dues"],
              ["remove-circle-outline", "Record expense"],
              ["receipt-outline", "Export ledger"],
            ].map((item) => (
              <Pressable
                key={item[1]}
                style={s.quickMoneyButton}
                onPress={() =>
                  Alert.alert(
                    item[1],
                    item[1] === "Export ledger"
                      ? "The club ledger is ready to share."
                      : "The club wallet entry form is ready.",
                  )
                }
              >
                <Ionicons name={item[0]} size={21} color={C.red} />
                <AppText style={s.quickMoneyText}>{item[1]}</AppText>
              </Pressable>
            ))}
          </View>
          <AppText style={s.settingsGroupTitle}>RECENT ACTIVITY</AppText>
          <View style={s.emptyState}>
            <Ionicons name="receipt-outline" size={30} color={C.muted} />
            <AppText style={s.team}>No wallet activity</AppText>
            <AppText style={s.body}>
              Dues and expenses you add will appear here.
            </AppText>
          </View>
        </View>
      )}
      {section === "Invite People" && (
        <View style={s.communityListSection}>
          <View style={s.communitySegments}>
            {["Player", "Coach", "Referee"].map((item) => (
              <Pressable
                key={item}
                onPress={() => {
                  setInviteType(item);
                  setSent(false);
                }}
                style={[
                  s.communitySegment,
                  inviteType === item && s.communitySegmentActive,
                ]}
              >
                <AppText
                  style={[
                    s.communitySegmentText,
                    inviteType === item && s.communitySegmentTextActive,
                  ]}
                >
                  {item}
                </AppText>
              </Pressable>
            ))}
          </View>
          <View style={s.invitePanel}>
            <AppText style={s.inviteHeading}>
              Find a {inviteType.toLowerCase()}
            </AppText>
            <AppText style={s.inviteSubheading}>
              Search people already using the app. Use the team link only when
              they are not here yet.
            </AppText>
            <View style={s.inviteSearch}>
              <Ionicons name="search-outline" size={19} color={C.muted} />
              <TextInput
                value={contact}
                onChangeText={(value) => {
                  setContact(value);
                  setSent(false);
                  setSelectedProfile(null);
                }}
                style={s.inviteSearchInput}
                placeholder={`Name, position or area`}
                placeholderTextColor={C.muted}
                autoCapitalize="words"
                returnKeyType="search"
              />
            </View>
            {inviteMatches.map((profile) => (
              <Pressable
                key={profile.id}
                onPress={() => setSelectedProfile(profile)}
                style={[
                  s.inviteResultRow,
                  selectedProfile?.id === profile.id &&
                    s.inviteResultRowSelected,
                ]}
              >
                {profile.profileImage ? (
                  <Image
                    source={{
                      uri:
                        typeof profile.profileImage === "string"
                          ? profile.profileImage
                          : profile.profileImage.uri,
                    }}
                    style={s.inviteAvatar}
                  />
                ) : (
                  <View style={s.inviteAvatarFallback}>
                    <AppText style={s.inviteAvatarText}>
                      {initials(profile.name)}
                    </AppText>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <AppText style={s.inviteResultName} numberOfLines={1}>
                    {profile.name}
                  </AppText>
                  <AppText style={s.inviteResultMeta} numberOfLines={2}>
                    {[
                      profile.position || profile.role,
                      profile.ageBand,
                      profile.area || "Area not added",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </AppText>
                </View>
                <Ionicons
                  name={
                    selectedProfile?.id === profile.id
                      ? "checkmark-circle"
                      : "add-circle-outline"
                  }
                  size={22}
                  color={C.red}
                />
              </Pressable>
            ))}
            {contact.trim() && !inviteMatches.length ? (
              <AppText style={s.formHelp}>
                No matching profile. Use the team link below for someone new.
              </AppText>
            ) : null}
            <Pressable
              disabled={!selectedProfile || sent || inviteBusy}
              onPress={async () => {
                if (!selectedProfile) return;
                setInviteBusy(true);
                try {
                  if (inviteType === "Player")
                    await onAddPlayer(selectedProfile);
                  else await onSendProfileRequest(selectedProfile, inviteType);
                  setSent(true);
                  setContact("");
                  setSelectedProfile(null);
                } catch {
                  Alert.alert(
                    "Couldn’t add this person",
                    "Please check your connection and try again.",
                  );
                } finally {
                  setInviteBusy(false);
                }
              }}
              style={[
                s.saveLineupButton,
                sent && s.saveLineupButtonSaved,
                (!selectedProfile || inviteBusy) && s.buttonDisabled,
              ]}
            >
              {inviteBusy ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Ionicons
                  name={sent ? "checkmark-circle" : "person-add-outline"}
                  size={18}
                  color="white"
                />
              )}
              <AppText style={s.saveLineupText}>
                {inviteBusy
                  ? "ADDING"
                  : sent
                    ? inviteType === "Player"
                      ? "PLAYER ADDED"
                      : "REQUEST SENT"
                    : selectedProfile
                      ? inviteType === "Player"
                        ? "ADD PLAYER"
                        : `SEND ${inviteType.toUpperCase()} REQUEST`
                      : "CHOOSE SOMEONE ABOVE"}
              </AppText>
            </Pressable>
            <View style={s.inviteDivider}>
              <View style={s.inviteDividerLine} />
              <AppText style={s.inviteDividerText}>
                OR INVITE SOMEONE NEW
              </AppText>
              <View style={s.inviteDividerLine} />
            </View>
            <Pressable
              style={[s.outlineButton, compact && { paddingHorizontal: 10 }]}
              onPress={async () => {
                if (!team?.id) {
                  Alert.alert(
                    "Create a team first",
                    "A team link needs a saved team.",
                  );
                  return;
                }
                const link = `friendlies://join-team?team=${encodeURIComponent(team.id)}`;
                await Clipboard.setStringAsync(link);
                Alert.alert(
                  "Team link copied",
                  `This link opens ${team.name} in Grassroots so the person can request to join:\n\n${link}`,
                );
              }}
            >
              <Ionicons name="link-outline" size={18} />
              <AppText style={s.buttonText}>COPY TEAM INVITATION</AppText>
            </Pressable>
          </View>
        </View>
      )}
      {section === "My Player Card" && (
        <View style={s.communityListSection}>
          <View style={s.playerIdentityHero}>
            <View style={s.playerIdentityAvatar}>
              <AppText style={s.playerIdentityInitials}>TN</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={s.playerIdentityName}>Takudzwa Nhamo</AppText>
              <AppText style={s.playerIdentityMeta}>
                Forward · Avondale Social · #9
              </AppText>
              <View style={s.verifiedLine}>
                <Ionicons name="checkmark-circle" size={14} color={C.gold} />
                <AppText style={s.verifiedText}>Verified player</AppText>
              </View>
            </View>
          </View>
          <View style={s.playerMetricRow}>
            {[
              ["18", "MATCHES"],
              ["11", "GOALS"],
              ["5", "ASSISTS"],
              ["86%", "AVAILABLE"],
            ].map((item) => (
              <View key={item[1]} style={s.playerMetric}>
                <AppText style={s.playerMetricValue}>{item[0]}</AppText>
                <AppText style={s.playerMetricLabel}>{item[1]}</AppText>
              </View>
            ))}
          </View>
          <AppText style={s.settingsGroupTitle}>PLAYER DETAILS</AppText>
          {[
            ["Preferred foot", "Right"],
            ["Secondary position", "Left wing"],
            ["Area", "Avondale, Harare"],
            ["Transfer status", "Not looking"],
          ].map((item) => (
            <Pressable
              key={item[0]}
              style={s.settingRow}
              onPress={() => Alert.alert(item[0], item[1])}
            >
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>{item[0]}</AppText>
                <AppText style={s.meta}>{item[1]}</AppText>
              </View>
              <Ionicons name="chevron-forward" color={C.muted} />
            </Pressable>
          ))}
        </View>
      )}
      {section === "Availability" && (
        <View style={s.communityListSection}>
          <View style={s.availabilityHero}>
            <Ionicons name="calendar-outline" size={28} color={C.red} />
            <View>
              <AppText style={s.moreToolTitle}>Next 7 days</AppText>
              <AppText style={s.body}>
                Your coach sees changes immediately.
              </AppText>
            </View>
          </View>
          {Object.keys(availability).map((day) => (
            <Pressable
              key={day}
              onPress={() =>
                setAvailability((current) => ({
                  ...current,
                  [day]: !current[day],
                }))
              }
              style={s.availabilityDay}
            >
              <View style={s.dayBadge}>
                <AppText style={s.dayBadgeText}>{day}</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>
                  {day === "Sat"
                    ? "Saturday match"
                    : day === "Sun"
                      ? "Sunday match"
                      : `${day === "Tue" ? "Tuesday" : "Thursday"} training`}
                </AppText>
                <AppText style={s.meta}>
                  {availability[day]
                    ? "Coach can select you"
                    : "Marked unavailable"}
                </AppText>
              </View>
              <View
                style={[
                  s.toggleTrack,
                  availability[day] && s.toggleTrackActive,
                ]}
              >
                <View
                  style={[
                    s.toggleKnob,
                    availability[day] && s.toggleKnobActive,
                  ]}
                />
              </View>
            </Pressable>
          ))}
        </View>
      )}
      {section === "Find a Team" && (
        <View style={s.communityListSection}>
          <View style={s.fitSummary}>
            <Ionicons name="location-outline" size={21} color={C.red} />
            <AppText style={s.team}>
              Forward · within 12 km · weekend football
            </AppText>
            <Pressable
              onPress={() =>
                Alert.alert(
                  "Player search",
                  "Update your position, distance and preferred match days from your profile.",
                )
              }
            >
              <AppText style={s.communitySeeAll}>Edit</AppText>
            </Pressable>
          </View>
          {[
            ["Mbare City Boys", "Mbare · Sundays", "Strong fit"],
            ["Greendale Social", "Greendale · Saturdays", "Good fit"],
            ["Highfield Lions", "Highfield · Sundays", "Good fit"],
          ].map((item) => {
            const requested = joinRequests.includes(item[0]);
            return (
              <View style={s.teamFitRow} key={item[0]}>
                <View style={s.leagueIcon}>
                  <AppText style={s.primaryText}>{initials(item[0])}</AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={s.team}>{item[0]}</AppText>
                  <AppText style={s.meta}>
                    {item[1]} · {item[2]}
                  </AppText>
                </View>
                <Pressable
                  onPress={() =>
                    setJoinRequests((current) =>
                      requested
                        ? current.filter((name) => name !== item[0])
                        : [...current, item[0]],
                    )
                  }
                  style={[
                    s.join,
                    requested && {
                      backgroundColor: "#DCEFE3",
                      borderColor: "#B8DCC8",
                    },
                  ]}
                >
                  <AppText style={s.buttonText}>
                    {requested ? "Requested" : "Join"}
                  </AppText>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
      {section === "Assignments" && (
        <View style={s.communityListSection}>
          <View style={s.assignmentCard}>
            <View style={s.assignmentTop}>
              <View>
                <AppText style={s.operationLabel}>SUNDAY · 10:00</AppText>
                <AppText style={s.assignmentTeams}>
                  Avondale Social{`\n`}vs Mbare City Boys
                </AppText>
              </View>
              <View
                style={[
                  s.assignmentStatus,
                  assignment === "Accepted" && { backgroundColor: "#DCEFE3" },
                ]}
              >
                <AppText style={s.assignmentStatusText}>{assignment}</AppText>
              </View>
            </View>
            <View style={s.assignmentMeta}>
              <Ionicons name="location-outline" size={17} color={C.red} />
              <AppText style={s.meta}>
                Belgravia Sports Club · $20 match fee
              </AppText>
            </View>
            <View style={s.requestActions}>
              <Pressable
                onPress={() => setAssignment("Accepted")}
                style={s.acceptButton}
              >
                <AppText style={s.primaryText}>
                  {assignment === "Accepted" ? "Accepted" : "Accept"}
                </AppText>
              </Pressable>
              <Pressable
                style={s.declineButton}
                onPress={() => setAssignment("Declined")}
              >
                <AppText style={s.buttonText}>Decline</AppText>
              </Pressable>
            </View>
          </View>
          <AppText style={s.settingsGroupTitle}>UPCOMING</AppText>
          {[
            [
              "SUN 02 AUG · 14:00",
              "Seke XI vs Greendale Social",
              "Chitungwiza Aquatic",
            ],
            [
              "SAT 08 AUG · 15:00",
              "Highfield Lions vs Arcadia United",
              "Zimbabwe Grounds",
            ],
          ].map((item) => (
            <View style={s.settingRow} key={item[1]}>
              <View style={{ flex: 1 }}>
                <AppText style={s.meta}>{item[0]}</AppText>
                <AppText style={s.team}>{item[1]}</AppText>
                <AppText style={s.meta}>{item[2]}</AppText>
              </View>
              <Ionicons name="chevron-forward" color={C.muted} />
            </View>
          ))}
        </View>
      )}
      {section === "Match Report" && (
        <View style={s.communityListSection}>
          {submitted ? (
            <View style={s.createdBanner}>
              <Ionicons name="checkmark-circle" size={23} color={C.green} />
              <View>
                <AppText style={s.team}>Report submitted</AppText>
                <AppText style={s.meta}>
                  Both captains have been notified.
                </AppText>
              </View>
            </View>
          ) : null}
          <View style={s.reportMatch}>
            <AppText style={[s.meta, { color: "#D7C8E6" }]}>
              HARARE SOCIAL LEAGUE · FINAL
            </AppText>
            <AppText
              style={[
                s.assignmentTeams,
                { color: "white", textAlign: "center" },
              ]}
            >
              Avondale Social vs Mbare City Boys
            </AppText>
            <View style={s.reportScoreRow}>
              <TextInput
                value={report.home}
                onChangeText={(value) =>
                  setReportField("home", numbersOnly(value))
                }
                keyboardType="numeric"
                style={s.reportScoreInput}
              />
              <AppText style={s.reportDash}>:</AppText>
              <TextInput
                value={report.away}
                onChangeText={(value) =>
                  setReportField("away", numbersOnly(value))
                }
                keyboardType="numeric"
                style={s.reportScoreInput}
              />
            </View>
          </View>
          <View style={s.moneyRow}>
            <View style={{ flex: 1 }}>
              <AppText style={s.formLabel}>Yellow cards</AppText>
              <TextInput
                value={report.yellow}
                onChangeText={(value) =>
                  setReportField("yellow", numbersOnly(value))
                }
                keyboardType="numeric"
                style={s.formInput}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={s.formLabel}>Red cards</AppText>
              <TextInput
                value={report.red}
                onChangeText={(value) =>
                  setReportField("red", numbersOnly(value))
                }
                keyboardType="numeric"
                style={s.formInput}
              />
            </View>
          </View>
          <AppText style={s.formLabel}>Incidents and notes</AppText>
          <TextInput
            value={report.notes}
            onChangeText={(value) => setReportField("notes", value)}
            multiline
            style={[s.formInput, s.reportNotes]}
            placeholder="Add discipline, injury or abandonment details"
            placeholderTextColor={C.muted}
          />
          <Pressable
            onPress={() => setSubmitted(true)}
            style={[s.saveLineupButton, submitted && s.saveLineupButtonSaved]}
          >
            <Ionicons
              name={submitted ? "checkmark-circle" : "document-text-outline"}
              size={18}
              color="white"
            />
            <AppText style={s.saveLineupText}>
              {submitted ? "REPORT SUBMITTED" : "SUBMIT OFFICIAL REPORT"}
            </AppText>
          </Pressable>
        </View>
      )}
      {section === "Referee Wallet" && (
        <View style={s.communityListSection}>
          <View style={s.walletHero}>
            <AppText style={s.walletLabel}>AVAILABLE TO WITHDRAW</AppText>
            <AppText style={s.walletBalance}>$56.00</AppText>
            <View style={s.walletSplit}>
              <View>
                <AppText style={s.walletMiniValue}>$116</AppText>
                <AppText style={s.walletMiniLabel}>EARNED</AppText>
              </View>
              <View>
                <AppText style={s.walletMiniValue}>$40</AppText>
                <AppText style={s.walletMiniLabel}>PENDING</AppText>
              </View>
              <View>
                <AppText style={s.walletMiniValue}>6</AppText>
                <AppText style={s.walletMiniLabel}>MATCHES</AppText>
              </View>
            </View>
          </View>
          <Pressable
            style={s.saveLineupButton}
            onPress={() =>
              Alert.alert(
                "Withdrawal requested",
                "Your payout request has been recorded for review.",
              )
            }
          >
            <Ionicons name="wallet-outline" color="white" size={18} />
            <AppText style={s.saveLineupText}>WITHDRAW FUNDS</AppText>
          </Pressable>
          <AppText style={s.settingsGroupTitle}>MATCH FEES</AppText>
          {[
            ["Avondale vs Mbare", "$20.00", "Paid"],
            ["Seke XI vs Greendale", "$20.00", "Pending"],
            ["Highfield vs Arcadia", "$20.00", "Scheduled"],
          ].map((item) => (
            <View style={s.transactionRow} key={item[0]}>
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>{item[0]}</AppText>
                <AppText style={s.meta}>{item[2]}</AppText>
              </View>
              <AppText style={s.transactionAmount}>{item[1]}</AppText>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function GrassrootsHub({
  team,
  currentUid,
  role = "Coach",
  matches = [],
  challenges = [],
  grounds = [],
  opportunities = [],
  onCreateGround,
  onConfirmGround,
  onCreateOpportunity,
  onChangeOpportunityStatus,
  onAskOpportunity,
  onReportOpportunity,
  onSubmitSafetyReport,
  onUpdateTeam,
  onMessageOwner,
  close,
}) {
  const [view, setView] = useState("Trust");
  const [saving, setSaving] = useState(false);
  const [ground, setGround] = useState({
    name: "",
    area: team?.area || "",
    landmark: "",
    surface: "Open ground",
    access: "Community use",
    facilities: [],
    notes: "",
  });
  const [opportunity, setOpportunity] = useState({
    type: "Friendly wanted",
    title: "",
    area: team?.area || "",
    date: "",
    ageGroup: "Open age",
    playingLevel: "Any level",
    wantedRole: "Any role",
    details: "",
  });
  const [opportunityFilter, setOpportunityFilter] = useState({
    ageGroup: "All ages",
    playingLevel: "All levels",
    wantedRole: "All roles",
    date: "",
  });
  const [questionFor, setQuestionFor] = useState("");
  const [opportunityQuestion, setOpportunityQuestion] = useState("");
  const [safety, setSafety] = useState({
    category: "Safeguarding concern",
    urgency: "Needs follow-up",
    details: "",
  });
  const [safetyContact, setSafetyContact] = useState({
    name: team?.safeguardingContact?.name || "",
    contact: team?.safeguardingContact?.contact || "",
  });
  const [rules, setRules] = useState({
    preset: team?.communityRules?.preset || "11-a-side",
    playersPerSide: String(team?.communityRules?.playersPerSide || 11),
    durationMinutes: String(team?.communityRules?.durationMinutes || 90),
    periodType: team?.communityRules?.periodType || "Two halves",
    halftimeMinutes: String(team?.communityRules?.halftimeMinutes || 10),
    substitutions:
      team?.communityRules?.substitutions || "Return substitutions",
    offside: team?.communityRules?.offside || "Agree before kickoff",
    referee: team?.communityRules?.referee || "Community referee is okay",
    discipline:
      team?.communityRules?.discipline || "Cards and calm-down breaks",
    drawResolution: team?.communityRules?.drawResolution || "Draw stands",
    mercyRule: team?.communityRules?.mercyRule || "No mercy rule",
  });
  const teamMatches = matches.filter((match) =>
    match.participantTeamIds?.includes(team?.id),
  );
  const completed = teamMatches.filter(
    (match) => match.status === "completed",
  ).length;
  const arranged = challenges.filter(
    (challenge) =>
      challenge.senderTeamId === team?.id ||
      challenge.recipientTeamId === team?.id,
  );
  const cancelledMatches = teamMatches.filter(
    (match) => match.status === "cancelled",
  );
  const mutuallyAgreed = cancelledMatches.filter(
    (match) => match.cancellationMutuallyAgreed === true,
  ).length;
  const withNotice = cancelledMatches.filter(
    (match) => match.cancellationType === "with_notice",
  ).length;
  const lateCancellations = cancelledMatches.filter(
    (match) => match.cancellationType === "late",
  ).length;
  const confirmedNoShows = cancelledMatches.filter(
    (match) =>
      match.cancellationType === "no_show" &&
      match.cancellationPenaltyTeamIds?.includes(team?.id),
  ).length;
  const overdueDisputes = teamMatches.filter(
    (match) =>
      ["open", "awaiting_confirmation"].includes(match.resultDisputeStatus) &&
      match.resultCorrectionDeadline &&
      Date.now() > new Date(match.resultCorrectionDeadline).getTime() &&
      match.disputePenaltyTeamIds?.includes(team?.id),
  ).length;
  const disputesResolved = teamMatches.filter(
    (match) =>
      match.resultDisputeStatus === "resolved" && match.activeDisputeId,
  ).length;
  const timestampMs = (value) =>
    value?.toMillis?.() ||
    (value?.seconds ? value.seconds * 1000 : new Date(value || 0).getTime());
  const responseTimes = arranged
    .map((challenge) => {
      const created = timestampMs(challenge.createdAt);
      const responded = timestampMs(challenge.respondedAt);
      return created && responded && responded >= created
        ? responded - created
        : null;
    })
    .filter((value) => value != null);
  const averageResponseHours = responseTimes.length
    ? Math.round(
        responseTimes.reduce((total, value) => total + value, 0) /
          responseTimes.length /
          (60 * 60 * 1000),
      )
    : null;
  const cancelled = cancelledMatches.length;
  const reliabilityBase = completed + cancelled;
  const completionRate = reliabilityBase
    ? Math.round((completed / reliabilityBase) * 100)
    : 0;
  const latestProblemTime = Math.max(
    0,
    ...teamMatches
      .filter(
        (match) =>
          match.cancellationPenaltyTeamIds?.includes(team?.id) ||
          (match.disputePenaltyTeamIds?.includes(team?.id) &&
            ["open", "awaiting_confirmation"].includes(
              match.resultDisputeStatus,
            )),
      )
      .map((match) => timestampMs(match.updatedAt)),
  );
  const recoveryMatches = latestProblemTime
    ? teamMatches.filter(
        (match) =>
          match.status === "completed" &&
          timestampMs(match.completedAt || match.updatedAt) > latestProblemTime,
      ).length
    : completed;
  const nearbyGrounds = prioritizeByLocation(grounds, team?.area);
  const nearbyOpportunities = prioritizeByLocation(
    opportunities.filter(
      (item) =>
        !["closed", "expired"].includes(item.status) &&
        (item.status !== "paused" || item.ownerId === currentUid) &&
        (opportunityFilter.ageGroup === "All ages" ||
          item.ageGroup === opportunityFilter.ageGroup) &&
        (opportunityFilter.playingLevel === "All levels" ||
          item.playingLevel === opportunityFilter.playingLevel) &&
        (opportunityFilter.wantedRole === "All roles" ||
          item.wantedRole === opportunityFilter.wantedRole) &&
        (!opportunityFilter.date || item.date === opportunityFilter.date),
    ),
    team?.area,
  );
  const toggleFacility = (facility) =>
    setGround((current) => ({
      ...current,
      facilities: current.facilities.includes(facility)
        ? current.facilities.filter((item) => item !== facility)
        : [...current.facilities, facility],
    }));
  const submit = async (action, clear) => {
    setSaving(true);
    try {
      await action();
      clear();
    } finally {
      setSaving(false);
    }
  };
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 36 }}
    >
      <View style={s.subHeader}>
        <Pressable onPress={close} accessibilityLabel="Back to more tools">
          <Ionicons name="arrow-back" size={23} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <AppText style={s.headerTitle}>GRASSROOTS HUB</AppText>
          <AppText style={s.headerSub}>BUILT FOR THE FOOTBALL YOU HAVE</AppText>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.grassrootsTabs}
      >
        {["Trust", "Grounds", "Rules", "Safety", "Opportunities"].map(
          (item) => (
            <Pressable
              key={item}
              onPress={() => setView(item)}
              style={[s.grassrootsTab, view === item && s.grassrootsTabActive]}
            >
              <AppText
                style={[
                  s.grassrootsTabText,
                  view === item && s.grassrootsTabTextActive,
                ]}
              >
                {item}
              </AppText>
            </Pressable>
          ),
        )}
      </ScrollView>
      {view === "Trust" ? (
        <View style={s.communityListSection}>
          <View style={s.grassrootsLead}>
            <AppText style={s.screenTitle}>Reliability, not popularity</AppText>
            <AppText style={s.body}>
              This uses completed fixtures and verified problems, never
              anonymous star ratings.
            </AppText>
          </View>
          <View style={s.profileRecordStrip}>
            {[
              [completed, "PLAYED"],
              [disputesResolved, "DISPUTES RESOLVED"],
              [
                averageResponseHours == null ? "—" : `${averageResponseHours}h`,
                "AVG RESPONSE",
              ],
            ].map(([value, label]) => (
              <View style={s.profileRecordItem} key={label}>
                <AppText style={s.profileRecordValue}>{value}</AppText>
                <AppText style={s.playerMetricLabel}>{label}</AppText>
              </View>
            ))}
          </View>
          <View style={s.settingRow}>
            <View style={{ flex: 1 }}>
              <AppText style={s.team}>Fixture completion</AppText>
              <AppText style={s.meta}>
                {reliabilityBase
                  ? `${completed} of ${reliabilityBase} decided fixtures completed`
                  : "Starts after your first completed or cancelled fixture"}
              </AppText>
            </View>
            <AppText style={s.reliabilityValue}>{completionRate}%</AppText>
          </View>
          <AppText style={s.settingsGroupTitle}>VERIFIED RECORD</AppText>
          {[
            [
              "checkmark-done-outline",
              "Recovery",
              `${recoveryMatches} completed match${recoveryMatches === 1 ? "" : "es"} since the latest recorded problem`,
            ],
            [
              "time-outline",
              "Cancelled with notice",
              `${withNotice} cancellation${withNotice === 1 ? "" : "s"} with at least 24 hours’ notice`,
            ],
            [
              "alert-circle-outline",
              "Late cancellations",
              `${lateCancellations} cancellation${lateCancellations === 1 ? "" : "s"} with less than 24 hours’ notice`,
            ],
            [
              "people-outline",
              "Mutually agreed",
              `${mutuallyAgreed} cancellation${mutuallyAgreed === 1 ? "" : "s"} agreed by both teams · no penalty`,
            ],
            [
              "close-circle-outline",
              "Confirmed no-shows",
              `${confirmedNoShows} opponent-confirmed no-show${confirmedNoShows === 1 ? "" : "s"}`,
            ],
            [
              "hourglass-outline",
              "Overdue corrections",
              `${overdueDisputes} unresolved correction${overdueDisputes === 1 ? "" : "s"} past the 48-hour deadline · both teams accountable`,
            ],
          ].map(([icon, title, copy]) => (
            <View style={s.settingRow} key={title}>
              <View style={s.utilityIcon}>
                <Ionicons name={icon} size={20} color={C.red} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>{title}</AppText>
                <AppText style={s.meta}>{copy}</AppText>
              </View>
            </View>
          ))}
          <View style={s.profilePrivacyNote}>
            <Ionicons name="shield-checkmark-outline" size={21} color={C.red} />
            <AppText style={[s.body, { flex: 1 }]}>
              Facilities, league membership and association registration are not
              required to build a strong record.
            </AppText>
          </View>
        </View>
      ) : null}
      {view === "Grounds" ? (
        <View style={s.communityListSection}>
          <View style={s.grassrootsLead}>
            <AppText style={s.screenTitle}>Add somewhere people play</AppText>
            <AppText style={s.body}>
              An open field, school ground or landmark is enough. Leave
              facilities empty when none exist.
            </AppText>
          </View>
          {[
            ["Ground or field name", "name", "e.g. Field behind the shops"],
            ["Area", "area", "Town, village, suburb or ward"],
            ["Nearest landmark", "landmark", "School, shops, road or borehole"],
          ].map(([label, key, placeholder]) => (
            <React.Fragment key={key}>
              <AppText style={s.formLabel}>{label}</AppText>
              <TextInput
                value={ground[key]}
                onChangeText={(value) =>
                  setGround((current) => ({ ...current, [key]: value }))
                }
                placeholder={placeholder}
                placeholderTextColor={C.muted}
                style={s.formInput}
              />
            </React.Fragment>
          ))}
          <ProfileChoiceGroup
            label="Playing surface"
            options={["Open ground", "Grass", "Dust", "School field", "Other"]}
            value={ground.surface}
            onChange={(surface) =>
              setGround((current) => ({ ...current, surface }))
            }
          />
          <AppText style={s.formLabel}>Facilities nearby, if any</AppText>
          <View style={s.optionWrap}>
            {["Water", "Toilets", "Changing space", "Lighting"].map(
              (facility) => (
                <Pressable
                  key={facility}
                  onPress={() => toggleFacility(facility)}
                  style={[
                    s.formChoice,
                    ground.facilities.includes(facility) && s.formChoiceActive,
                  ]}
                >
                  <AppText
                    style={[
                      s.formChoiceText,
                      ground.facilities.includes(facility) &&
                        s.formChoiceTextActive,
                    ]}
                  >
                    {facility}
                  </AppText>
                </Pressable>
              ),
            )}
          </View>
          <AppText style={s.formLabel}>Helpful directions</AppText>
          <TextInput
            value={ground.notes}
            onChangeText={(notes) =>
              setGround((current) => ({ ...current, notes }))
            }
            multiline
            placeholder="How to find it, who to ask, or when it is usually free"
            placeholderTextColor={C.muted}
            style={[s.formInput, s.grassrootsTextArea]}
          />
          <Pressable disabled style={[s.outlineButton, s.buttonDisabled]}>
            <Ionicons name="mic-outline" size={17} color={C.red} />
            <AppText style={s.buttonText}>
              VOICE DIRECTIONS · COMING LATER
            </AppText>
          </Pressable>
          <Pressable
            disabled={saving || !ground.name.trim() || !ground.area.trim()}
            style={[
              s.saveLineupButton,
              (saving || !ground.name.trim() || !ground.area.trim()) &&
                s.buttonDisabled,
            ]}
            onPress={() =>
              submit(
                () => onCreateGround(ground),
                () => {
                  setGround((current) => ({
                    ...current,
                    name: "",
                    landmark: "",
                    facilities: [],
                    notes: "",
                  }));
                  Alert.alert("Ground shared", "Nearby teams can now find it.");
                },
              ).catch(() =>
                Alert.alert("Couldn’t share ground", "Please try again."),
              )
            }
          >
            <AppText style={s.saveLineupText}>SHARE THIS GROUND</AppText>
          </Pressable>
          <AppText style={s.settingsGroupTitle}>NEARBY PLACES TO PLAY</AppText>
          {nearbyGrounds.map((item) => (
            <View style={s.groundRow} key={item.id}>
              <View style={s.utilityIcon}>
                <Ionicons name="location-outline" size={21} color={C.red} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>{item.name}</AppText>
                <AppText style={s.meta}>
                  {item.area} · {item.landmark || "Ask locally for directions"}
                </AppText>
                <AppText style={s.body}>
                  {item.surface || "Open ground"} ·{" "}
                  {item.facilities?.length
                    ? item.facilities.join(", ")
                    : "No facilities listed"}
                </AppText>
                {item.writtenDirections || item.notes ? (
                  <AppText style={s.body}>
                    Directions: {item.writtenDirections || item.notes}
                  </AppText>
                ) : null}
                <AppText style={s.meta}>
                  Last confirmed{" "}
                  {item.lastConfirmedAt?.toDate
                    ? item.lastConfirmedAt.toDate().toLocaleDateString()
                    : item.lastConfirmedAt
                      ? new Date(item.lastConfirmedAt).toLocaleDateString()
                      : "not yet"}
                  {" · "}
                  {item.confirmations || 0} local confirmation
                  {item.confirmations === 1 ? "" : "s"}
                </AppText>
                <Pressable
                  style={s.inlineTextButton}
                  onPress={() =>
                    onConfirmGround(item)
                      .then((result) =>
                        Alert.alert(
                          result?.created
                            ? "Ground confirmed"
                            : "Already confirmed",
                          result?.created
                            ? "Your local confirmation is now recorded."
                            : "You have already confirmed this place.",
                        ),
                      )
                      .catch((error) =>
                        Alert.alert(
                          "Couldn’t confirm ground",
                          error?.message || "Please try again.",
                        ),
                      )
                  }
                >
                  <AppText style={s.communitySeeAll}>
                    I CONFIRMED THIS PLACE
                  </AppText>
                </Pressable>
              </View>
            </View>
          ))}
          {!nearbyGrounds.length ? (
            <View style={s.emptyState}>
              <AppText style={s.team}>No grounds shared yet</AppText>
              <AppText style={s.body}>
                Add the first place people use for football in your area.
              </AppText>
            </View>
          ) : null}
        </View>
      ) : null}
      {view === "Rules" ? (
        <View style={s.communityListSection}>
          <View style={s.grassrootsLead}>
            <AppText style={s.screenTitle}>Agree the game you can play</AppText>
            <AppText style={s.body}>
              These are practical defaults, not association laws. Both teams can
              change them for one match.
            </AppText>
          </View>
          <ProfileChoiceGroup
            label="Quick preset"
            options={[
              "5-a-side",
              "7-a-side",
              "9-a-side",
              "11-a-side",
              "Custom",
            ]}
            value={rules.preset}
            onChange={(preset) => {
              const players = {
                "5-a-side": 5,
                "7-a-side": 7,
                "9-a-side": 9,
                "11-a-side": 11,
              }[preset];
              setRules((current) => ({
                ...current,
                preset,
                ...(players ? { playersPerSide: String(players) } : {}),
              }));
            }}
          />
          <AppText style={s.formLabel}>Players per side</AppText>
          <TextInput
            value={rules.playersPerSide}
            onChangeText={(playersPerSide) =>
              setRules((current) => ({
                ...current,
                playersPerSide: numbersOnly(playersPerSide),
              }))
            }
            keyboardType="number-pad"
            style={s.formInput}
          />
          <ProfileChoiceGroup
            label="Match structure"
            options={["Two halves", "One continuous game"]}
            value={rules.periodType}
            onChange={(periodType) =>
              setRules((current) => ({ ...current, periodType }))
            }
          />
          {rules.periodType === "Two halves" ? (
            <>
              <AppText style={s.formLabel}>Halftime minutes</AppText>
              <TextInput
                value={rules.halftimeMinutes}
                onChangeText={(halftimeMinutes) =>
                  setRules((current) => ({
                    ...current,
                    halftimeMinutes: numbersOnly(halftimeMinutes),
                  }))
                }
                keyboardType="number-pad"
                style={s.formInput}
              />
            </>
          ) : null}
          <AppText style={s.formLabel}>Total match minutes</AppText>
          <TextInput
            value={rules.durationMinutes}
            onChangeText={(durationMinutes) =>
              setRules((current) => ({
                ...current,
                durationMinutes: numbersOnly(durationMinutes),
              }))
            }
            keyboardType="number-pad"
            style={s.formInput}
          />
          <ProfileChoiceGroup
            label="Substitutions"
            options={[
              "Return substitutions",
              "Rolling substitutions",
              "Agree before kickoff",
              "Limited substitutions",
            ]}
            value={rules.substitutions}
            onChange={(substitutions) =>
              setRules((current) => ({ ...current, substitutions }))
            }
          />
          <ProfileChoiceGroup
            label="Referee"
            options={[
              "Community referee is okay",
              "Teams share officiating",
              "Appointed referee",
            ]}
            value={rules.referee}
            onChange={(referee) =>
              setRules((current) => ({ ...current, referee }))
            }
          />
          <ProfileChoiceGroup
            label="Offside"
            options={["Full offside", "Only near goal", "No offside"]}
            value={rules.offside}
            onChange={(offside) =>
              setRules((current) => ({ ...current, offside }))
            }
          />
          <ProfileChoiceGroup
            label="If scores are level"
            options={["Draw stands", "Penalties", "Agree on the day"]}
            value={rules.drawResolution}
            onChange={(drawResolution) =>
              setRules((current) => ({ ...current, drawResolution }))
            }
          />
          <ProfileChoiceGroup
            label="Youth mercy rule"
            options={[
              "No mercy rule",
              "Pause at 5-goal gap",
              "Add or rotate players",
              "End early by agreement",
            ]}
            value={rules.mercyRule}
            onChange={(mercyRule) =>
              setRules((current) => ({ ...current, mercyRule }))
            }
          />
          <ProfileChoiceGroup
            label="Discipline"
            options={[
              "Cards and calm-down breaks",
              "Cards only",
              "Captains manage conduct",
            ]}
            value={rules.discipline}
            onChange={(discipline) =>
              setRules((current) => ({ ...current, discipline }))
            }
          />
          <Pressable
            disabled={saving}
            style={[s.saveLineupButton, saving && s.buttonDisabled]}
            onPress={() =>
              submit(
                () =>
                  onUpdateTeam({
                    communityRules: {
                      ...rules,
                      playersPerSide: Number(rules.playersPerSide || 0),
                      durationMinutes: Number(rules.durationMinutes || 0),
                      halftimeMinutes: Number(rules.halftimeMinutes || 0),
                    },
                  }),
                () =>
                  Alert.alert(
                    "Community rules saved",
                    "These defaults can change for any arranged match.",
                  ),
              ).catch(() =>
                Alert.alert("Couldn’t save rules", "Please try again."),
              )
            }
          >
            <AppText style={s.saveLineupText}>SAVE TEAM DEFAULTS</AppText>
          </Pressable>
        </View>
      ) : null}
      {view === "Safety" ? (
        <View style={s.communityListSection}>
          <Pressable style={s.quickExitButton} onPress={close}>
            <Ionicons name="close" size={18} color={C.white} />
            <AppText style={s.saveLineupText}>QUICK EXIT</AppText>
          </Pressable>
          <View style={s.grassrootsLead}>
            <AppText style={s.screenTitle}>A private way to speak up</AppText>
            <AppText style={s.body}>
              Reports are visible only to the person who submits them for now.
              In immediate danger, contact trusted local help directly.
            </AppText>
          </View>
          <AppText style={s.settingsGroupTitle}>TRUSTED TEAM CONTACT</AppText>
          <AppText style={s.body}>
            This can be any trusted adult chosen by the team. Formal
            certification is not required.
          </AppText>
          <TextInput
            value={safetyContact.name}
            onChangeText={(name) =>
              setSafetyContact((current) => ({ ...current, name }))
            }
            placeholder="Trusted person’s name"
            placeholderTextColor={C.muted}
            style={s.formInput}
          />
          <TextInput
            value={safetyContact.contact}
            onChangeText={(contact) =>
              setSafetyContact((current) => ({ ...current, contact }))
            }
            placeholder="Contact detail shared with the team"
            placeholderTextColor={C.muted}
            style={s.formInput}
          />
          <Pressable
            style={s.outlineButton}
            onPress={() =>
              onUpdateTeam({ safeguardingContact: safetyContact })
                .then(() =>
                  Alert.alert(
                    "Safety contact saved",
                    "The trusted team contact is ready.",
                  ),
                )
                .catch(() =>
                  Alert.alert("Couldn’t save contact", "Please try again."),
                )
            }
          >
            <AppText style={s.buttonText}>SAVE TRUSTED CONTACT</AppText>
          </Pressable>
          <View style={s.profilePrivacyNote}>
            <Ionicons name="lock-closed-outline" size={21} color={C.red} />
            <AppText style={[s.body, { flex: 1 }]}>
              Never post a child’s phone number, home address or sensitive
              details in team or match chat.
            </AppText>
          </View>
          <ProfileChoiceGroup
            label="What is this about?"
            options={[
              "Safeguarding concern",
              "Harassment",
              "Unsafe ground",
              "Discrimination",
            ]}
            value={safety.category}
            onChange={(category) =>
              setSafety((current) => ({ ...current, category }))
            }
          />
          <ProfileChoiceGroup
            label="Urgency"
            options={[
              "Immediate danger",
              "Conduct complaint",
              "Needs follow-up",
              "For the record",
            ]}
            value={safety.urgency}
            onChange={(urgency) =>
              setSafety((current) => ({ ...current, urgency }))
            }
          />
          <AppText style={s.formLabel}>What happened?</AppText>
          <TextInput
            value={safety.details}
            onChangeText={(details) =>
              setSafety((current) => ({ ...current, details }))
            }
            multiline
            placeholder="Share only what is necessary"
            placeholderTextColor={C.muted}
            style={[s.formInput, s.grassrootsTextArea]}
          />
          <Pressable
            disabled={saving || safety.details.trim().length < 10}
            style={[
              s.saveLineupButton,
              (saving || safety.details.trim().length < 10) && s.buttonDisabled,
            ]}
            onPress={() =>
              submit(
                () => onSubmitSafetyReport(safety),
                () => {
                  setSafety((current) => ({ ...current, details: "" }));
                  Alert.alert(
                    "Private report saved",
                    "The report is stored privately in your account.",
                  );
                },
              ).catch(() =>
                Alert.alert("Couldn’t save report", "Please try again."),
              )
            }
          >
            <AppText style={s.saveLineupText}>SAVE PRIVATE REPORT</AppText>
          </Pressable>
          <View style={s.profilePrivacyNote}>
            <Ionicons name="list-outline" size={21} color={C.red} />
            <AppText style={[s.body, { flex: 1 }]}>
              After submission, the report is marked received. An audit entry
              records who submitted it and when. Future authorised handlers must
              add their view and action to the same trail.
            </AppText>
          </View>
        </View>
      ) : null}
      {view === "Opportunities" ? (
        <View style={s.communityListSection}>
          <View style={s.grassrootsLead}>
            <AppText style={s.screenTitle}>
              Local football opportunities
            </AppText>
            <AppText style={s.body}>
              Post one clear need. People respond through private in-app chat.
            </AppText>
          </View>
          <ProfileChoiceGroup
            label="Opportunity"
            options={[
              "Friendly wanted",
              "Players wanted",
              "Referee wanted",
              "Open training",
              "Trial or scout visit",
              "Community support",
            ]}
            value={opportunity.type}
            onChange={(type) =>
              setOpportunity((current) => ({ ...current, type }))
            }
          />
          {[
            ["Title", "title", "What do you need?"],
            ["Area", "area", "Town, village, suburb or district"],
          ].map(([label, key, placeholder]) => (
            <React.Fragment key={key}>
              <AppText style={s.formLabel}>{label}</AppText>
              <TextInput
                value={opportunity[key]}
                onChangeText={(value) =>
                  setOpportunity((current) => ({
                    ...current,
                    [key]: value,
                  }))
                }
                placeholder={placeholder}
                placeholderTextColor={C.muted}
                style={s.formInput}
              />
            </React.Fragment>
          ))}
          <AppText style={s.formLabel}>Date, if there is one</AppText>
          <DateField
            value={opportunity.date}
            onChange={(date) =>
              setOpportunity((current) => ({ ...current, date }))
            }
            placeholder="Optional date"
          />
          <ProfileChoiceGroup
            label="Age group"
            options={["Open age", "U13", "U15", "U17", "Adult"]}
            value={opportunity.ageGroup}
            onChange={(ageGroup) =>
              setOpportunity((current) => ({ ...current, ageGroup }))
            }
          />
          <ProfileChoiceGroup
            label="Playing level"
            options={["Any level", "Beginners", "Social", "Competitive"]}
            value={opportunity.playingLevel}
            onChange={(playingLevel) =>
              setOpportunity((current) => ({ ...current, playingLevel }))
            }
          />
          <ProfileChoiceGroup
            label="Role needed"
            options={["Any role", "Player", "Referee", "Scout", "Sponsor"]}
            value={opportunity.wantedRole}
            onChange={(wantedRole) =>
              setOpportunity((current) => ({ ...current, wantedRole }))
            }
          />
          <AppText style={s.formLabel}>Details</AppText>
          <TextInput
            value={opportunity.details}
            onChangeText={(details) =>
              setOpportunity((current) => ({ ...current, details }))
            }
            multiline
            placeholder="Age group, level, timing and anything people should know"
            placeholderTextColor={C.muted}
            style={[s.formInput, s.grassrootsTextArea]}
          />
          <Pressable
            disabled={
              saving || !opportunity.title.trim() || !opportunity.area.trim()
            }
            style={[
              s.saveLineupButton,
              (saving ||
                !opportunity.title.trim() ||
                !opportunity.area.trim()) &&
                s.buttonDisabled,
            ]}
            onPress={() =>
              submit(
                () =>
                  onCreateOpportunity({
                    ...opportunity,
                    posterRole: role,
                    youthTrial:
                      opportunity.type === "Trial or scout visit" &&
                      opportunity.ageGroup.startsWith("U"),
                  }),
                () => {
                  setOpportunity((current) => ({
                    ...current,
                    title: "",
                    date: "",
                    details: "",
                  }));
                  Alert.alert(
                    "Opportunity posted",
                    "People near this area can now find it.",
                  );
                },
              ).catch(() =>
                Alert.alert("Couldn’t post opportunity", "Please try again."),
              )
            }
          >
            <AppText style={s.saveLineupText}>POST OPPORTUNITY</AppText>
          </Pressable>
          <AppText style={s.settingsGroupTitle}>NEARBY NOW</AppText>
          <AppText style={s.formLabel}>FILTER AGE</AppText>
          <View style={s.optionWrap}>
            {["All ages", "U13", "U15", "U17", "Adult"].map((value) => (
              <Pressable
                key={value}
                onPress={() =>
                  setOpportunityFilter((current) => ({
                    ...current,
                    ageGroup: value,
                  }))
                }
                style={[
                  s.formChoice,
                  opportunityFilter.ageGroup === value && s.formChoiceActive,
                ]}
              >
                <AppText
                  style={[
                    s.formChoiceText,
                    opportunityFilter.ageGroup === value &&
                      s.formChoiceTextActive,
                  ]}
                >
                  {value}
                </AppText>
              </Pressable>
            ))}
          </View>
          <AppText style={s.formLabel}>FILTER LEVEL</AppText>
          <View style={s.optionWrap}>
            {["All levels", "Beginners", "Social", "Competitive"].map(
              (value) => (
                <Pressable
                  key={value}
                  onPress={() =>
                    setOpportunityFilter((current) => ({
                      ...current,
                      playingLevel: value,
                    }))
                  }
                  style={[
                    s.formChoice,
                    opportunityFilter.playingLevel === value &&
                      s.formChoiceActive,
                  ]}
                >
                  <AppText
                    style={[
                      s.formChoiceText,
                      opportunityFilter.playingLevel === value &&
                        s.formChoiceTextActive,
                    ]}
                  >
                    {value}
                  </AppText>
                </Pressable>
              ),
            )}
          </View>
          <AppText style={s.formLabel}>FILTER ROLE</AppText>
          <View style={s.optionWrap}>
            {["All roles", "Player", "Referee", "Scout", "Sponsor"].map(
              (value) => (
                <Pressable
                  key={value}
                  onPress={() =>
                    setOpportunityFilter((current) => ({
                      ...current,
                      wantedRole: value,
                    }))
                  }
                  style={[
                    s.formChoice,
                    opportunityFilter.wantedRole === value &&
                      s.formChoiceActive,
                  ]}
                >
                  <AppText
                    style={[
                      s.formChoiceText,
                      opportunityFilter.wantedRole === value &&
                        s.formChoiceTextActive,
                    ]}
                  >
                    {value}
                  </AppText>
                </Pressable>
              ),
            )}
          </View>
          <AppText style={s.formLabel}>FILTER DATE</AppText>
          <DateField
            value={opportunityFilter.date}
            onChange={(date) =>
              setOpportunityFilter((current) => ({ ...current, date }))
            }
            placeholder="Any date"
          />
          {opportunityFilter.date ? (
            <Pressable
              style={s.inlineTextButton}
              onPress={() =>
                setOpportunityFilter((current) => ({ ...current, date: "" }))
              }
            >
              <AppText style={s.communitySeeAll}>CLEAR DATE FILTER</AppText>
            </Pressable>
          ) : null}
          {nearbyOpportunities.map((item) => (
            <View style={s.opportunityRow} key={item.id}>
              <AppText style={s.bestMatch}>
                {normalizeArea(item.area) === normalizeArea(team?.area)
                  ? "SAME AREA · "
                  : ""}
                {item.posterRole || "Team"} · {item.type}
              </AppText>
              <AppText style={s.assignmentTeams}>{item.title}</AppText>
              <AppText style={s.meta}>
                {item.area}
                {item.date ? ` · ${formatStoredDate(item.date)}` : ""}
                {item.teamName ? ` · ${item.teamName}` : ""}
              </AppText>
              <AppText style={s.meta}>
                {item.ageGroup || "Open age"} ·{" "}
                {item.playingLevel || "Any level"} ·{" "}
                {item.wantedRole || "Any role"} · {item.responseCount || 0}{" "}
                genuine response
                {item.responseCount === 1 ? "" : "s"}
              </AppText>
              {item.details ? (
                <AppText style={s.body}>{item.details}</AppText>
              ) : null}
              {item.ownerId === currentUid ? (
                <View style={s.optionWrap}>
                  {item.status === "paused" ? (
                    <Pressable
                      style={s.outlineButton}
                      onPress={() => onChangeOpportunityStatus(item, "open")}
                    >
                      <AppText style={s.buttonText}>REOPEN</AppText>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={s.outlineButton}
                      onPress={() => onChangeOpportunityStatus(item, "paused")}
                    >
                      <AppText style={s.buttonText}>PAUSE</AppText>
                    </Pressable>
                  )}
                  <Pressable
                    style={s.outlineButton}
                    onPress={() => onChangeOpportunityStatus(item, "closed")}
                  >
                    <AppText style={s.buttonText}>CLOSE</AppText>
                  </Pressable>
                </View>
              ) : item.ownerId ? (
                <>
                  {questionFor === item.id ? (
                    <View style={s.scoreCorrectionPanel}>
                      <TextInput
                        value={opportunityQuestion}
                        onChangeText={setOpportunityQuestion}
                        placeholder="Ask one short question first"
                        placeholderTextColor={C.muted}
                        maxLength={180}
                        style={s.formInput}
                      />
                      <Pressable
                        disabled={!opportunityQuestion.trim()}
                        style={[
                          s.saveLineupButton,
                          !opportunityQuestion.trim() && s.buttonDisabled,
                        ]}
                        onPress={() =>
                          onAskOpportunity(item, opportunityQuestion)
                            .then(() => {
                              setQuestionFor("");
                              setOpportunityQuestion("");
                              Alert.alert(
                                "Question sent",
                                "A private conversation is now ready.",
                              );
                            })
                            .catch((error) =>
                              Alert.alert(
                                "Couldn’t send question",
                                error?.message || "Please try again.",
                              ),
                            )
                        }
                      >
                        <AppText style={s.saveLineupText}>
                          SEND QUESTION
                        </AppText>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={s.optionWrap}>
                      <Pressable
                        style={s.outlineButton}
                        onPress={() => setQuestionFor(item.id)}
                      >
                        <Ionicons
                          name="help-circle-outline"
                          size={17}
                          color={C.red}
                        />
                        <AppText style={s.buttonText}>ASK FIRST</AppText>
                      </Pressable>
                      <Pressable
                        style={s.outlineButton}
                        onPress={() =>
                          onReportOpportunity(item).then(() =>
                            Alert.alert(
                              "Report saved",
                              "The opportunity was reported privately for review.",
                            ),
                          )
                        }
                      >
                        <Ionicons name="flag-outline" size={17} color={C.red} />
                        <AppText style={s.buttonText}>REPORT</AppText>
                      </Pressable>
                    </View>
                  )}
                </>
              ) : null}
            </View>
          ))}
          {!nearbyOpportunities.length ? (
            <View style={s.emptyState}>
              <AppText style={s.team}>Nothing posted nearby yet</AppText>
              <AppText style={s.body}>
                Your post can be the first one in this community.
              </AppText>
            </View>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

function More({
  role,
  onSignOut,
  team,
  onCreateTeam,
  onUpdateTeam,
  publicProfiles,
  onAddPlayer,
  onRemovePlayer,
  teamJoinRequests,
  onAcceptJoinRequest,
  conversations = [],
  leagues = [],
  onCreateLeague,
  onJoinLeague,
  notifications = [],
  currentUid,
  onSendProfileRequest,
  profileData,
  onUpdateProfile,
  onSaveProfile,
  sharedLeagueId,
  matchChatRepairing,
  matchChatRepairFailed,
  onRetryMatchChats,
  onClearNotification,
  playerAssignments,
  teams,
  onStartPlayerChat,
  matches,
  challenges,
  grounds,
  opportunities,
  onCreateGround,
  onConfirmGround,
  onCreateOpportunity,
  onChangeOpportunityStatus,
  onAskOpportunity,
  onReportOpportunity,
  onSubmitSafetyReport,
  onStartDirectChat,
}) {
  const [section, setSection] = useState(null);
  useEffect(() => {
    if (sharedLeagueId) setSection("Leagues");
  }, [sharedLeagueId]);
  const roleItems = {
    Coach: [
      [
        "wallet-outline",
        "Club Wallet",
        "Dues, expenses, sponsors and club balance",
      ],
      [
        "person-add-outline",
        "Invite People",
        "Invite someone only when search cannot find them",
      ],
    ],
    Player: [
      [
        "person-circle-outline",
        "My Player Card",
        "Verified profile, position and playing record",
      ],
      ["calendar-outline", "Availability", "Tell your coach when you can play"],
      [
        "search-outline",
        "Find a Team",
        "Discover teams that fit your football",
      ],
    ],
    Referee: [
      [
        "calendar-outline",
        "Assignments",
        "Accept fixtures and manage your calendar",
      ],
      [
        "document-text-outline",
        "Match Report",
        "Scores, cards and official incidents",
      ],
      [
        "wallet-outline",
        "Referee Wallet",
        "Match fees, pending payments and payouts",
      ],
    ],
  };
  if (roleItems[role].some((item) => item[1] === section))
    return (
      <RoleToolScreen
        section={section}
        role={role}
        close={() => setSection(null)}
        team={team}
        publicProfiles={publicProfiles}
        onAddPlayer={onAddPlayer}
        onRemovePlayer={onRemovePlayer}
        onSendProfileRequest={onSendProfileRequest}
      />
    );
  if (section === "Create League")
    return (
      <CreateLeagueScreen
        close={() => setSection("Leagues")}
        onCreateLeague={onCreateLeague}
        publicProfiles={publicProfiles}
      />
    );
  if (section === "Create Team")
    return (
      <CreateTeamScreenV2
        close={() => setSection("Team")}
        onCreateTeam={onCreateTeam}
      />
    );
  if (section === "Profile")
    return (
      <RoleProfile
        role={role}
        data={profileData}
        update={onUpdateProfile}
        onSaveProfile={onSaveProfile}
      />
    );
  if (section === "Grassroots Hub")
    return (
      <GrassrootsHub
        team={team}
        currentUid={currentUid}
        role={role}
        matches={matches}
        challenges={challenges}
        grounds={grounds}
        opportunities={opportunities}
        onCreateGround={onCreateGround}
        onConfirmGround={onConfirmGround}
        onCreateOpportunity={onCreateOpportunity}
        onChangeOpportunityStatus={onChangeOpportunityStatus}
        onAskOpportunity={onAskOpportunity}
        onReportOpportunity={onReportOpportunity}
        onSubmitSafetyReport={onSubmitSafetyReport}
        onUpdateTeam={onUpdateTeam}
        onMessageOwner={onStartDirectChat}
        close={() => setSection(null)}
      />
    );
  if (section)
    return (
      <MoreDetail
        section={section}
        close={() => setSection(section === "Merchandise" ? "Team" : null)}
        navigate={setSection}
        role={role}
        team={team}
        onUpdateTeam={onUpdateTeam}
        publicProfiles={publicProfiles}
        onAddPlayer={onAddPlayer}
        onRemovePlayer={onRemovePlayer}
        teamJoinRequests={teamJoinRequests}
        onAcceptJoinRequest={onAcceptJoinRequest}
        conversations={conversations}
        leagues={leagues}
        onJoinLeague={onJoinLeague}
        notifications={notifications}
        currentUid={currentUid}
        matchChatRepairing={matchChatRepairing}
        matchChatRepairFailed={matchChatRepairFailed}
        onRetryMatchChats={onRetryMatchChats}
        onClearNotification={onClearNotification}
        playerAssignments={playerAssignments}
        teams={teams}
        onStartPlayerChat={onStartPlayerChat}
        matches={matches}
      />
    );
  const items = [
    ...roleItems[role],
    [
      "earth-outline",
      "Grassroots Hub",
      "Trust, places to play, local rules, safety and opportunities",
    ],
    [
      "chatbubbles-outline",
      "Chat",
      "Team chat, player chat and temporary game logistics",
    ],
    ["shield-outline", "Team", "Identity, staff, home ground and team record"],
    ["people-outline", "Players", "Registered squad members and free agents"],
    [
      "people-circle-outline",
      "Coaches",
      "Coaching staff, roles and permissions",
    ],
    [
      "stats-chart-outline",
      "Stats",
      "Goals, assists, cards and team performance",
    ],
    ["trophy-outline", "Leagues", "Join local competitions and view tables"],
    ["globe-outline", "Web", "Public pages, sharing and registrations"],
    ["settings-outline", "Settings", "Alerts, privacy and team account"],
  ];
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <BrandHeader title="MORE" />
      <View style={s.screenIntro}>
        <AppText style={s.screenTitle}>Your football tools</AppText>
        <AppText style={s.body}>
          Everything that supports the team away from the pitch.
        </AppText>
      </View>
      <View style={s.roleSummary}>
        <View style={s.roleSummaryAvatar}>
          <AppText style={s.roleSummaryInitial}>{role[0]}</AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText style={s.roleSummaryTitle}>Coach workspace</AppText>
          <AppText style={s.meta}>Team and competition management</AppText>
        </View>
      </View>
      <View style={s.communityListSection}>
        {items.map((item) => (
          <Pressable
            key={item[1]}
            onPress={() => setSection(item[1])}
            style={s.moreToolRow}
          >
            <View style={s.moreToolIcon}>
              <Ionicons name={item[0]} size={23} color={C.red} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={s.moreToolTitle}>{item[1]}</AppText>
              <AppText style={s.body}>{item[2]}</AppText>
            </View>
            <Ionicons name="chevron-forward" color={C.muted} />
          </Pressable>
        ))}
        <Pressable
          onPress={onSignOut}
          style={s.moreSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out of Grassroots"
        >
          <Ionicons name="log-out-outline" size={20} color={C.white} />
          <View style={{ flex: 1 }}>
            <AppText style={s.moreSignOutTitle}>Sign out</AppText>
            <AppText style={s.moreSignOutCopy}>
              Return to the sign-in screen
            </AppText>
          </View>
        </Pressable>
        <Icons8Credit />
      </View>
    </ScrollView>
  );
}
function AppLoader() {
  const reveal = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0.08)).current;
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!mounted) return;
      if (reduceMotion) {
        reveal.setValue(1);
        progress.setValue(1);
        return;
      }
      Animated.parallel([
        Animated.timing(reveal, {
          toValue: 1,
          duration: 420,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(progress, {
          toValue: 1,
          duration: 1300,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start();
    });
    return () => {
      mounted = false;
    };
  }, []);
  const imageScale = reveal.interpolate({
    inputRange: [0, 1],
    outputRange: [1.035, 1],
  });
  return (
    <View style={s.loader}>
      <StatusBar barStyle="light-content" />
      <Animated.Image
        source={require("./assets/grassroots-kickoff.png")}
        resizeMode="cover"
        style={[
          s.loaderImage,
          { opacity: reveal, transform: [{ scale: imageScale }] },
        ]}
      />
      <View style={s.loaderShade} />
      <Animated.View style={[s.loaderContent, { opacity: reveal }]}>
        <View style={s.loaderWordmark}>
          <View style={s.loaderMark}>
            <AppText style={s.loaderMarkText}>G</AppText>
          </View>
          <AppText style={s.loaderTitle}>GRASSROOTS</AppText>
        </View>
        <View style={s.loaderMessage}>
          <AppText style={s.loaderHeadline}>Football starts here.</AppText>
          <AppText style={s.loaderSub}>
            ZIMBABWE · BUILT FROM THE GROUND UP
          </AppText>
          <View style={s.loaderTrack}>
            <Animated.View
              style={[s.loaderBar, { transform: [{ scaleX: progress }] }]}
            />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const ENTRY_ROLES = [
  ["Coach", "clipboard-outline"],
  ["Player", "football-outline"],
  ["Referee", "flag-outline"],
  ["Sponsor", "business-outline"],
  ["Scout", "eye-outline"],
];

function AuthGateway({ onGuest, onAuthenticated, canClose = false, onClose }) {
  const [mode, setMode] = useState(canClose ? "signup" : "welcome");
  const [role, setRole] = useState("Player");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!email.trim() || !email.includes("@"))
      return setError("Enter a valid email address.");
    if (mode === "signup" && name.trim().length < 2)
      return setError("Tell us the name your football community knows you by.");
    if (password.length < 8)
      return setError("Use at least 8 characters for your password.");
    setBusy(true);
    try {
      const session =
        mode === "signup"
          ? await createAccount({ name, email, password, role })
          : await signIn({ email, password });
      onAuthenticated(session);
    } catch (submitError) {
      setError(submitError.message || "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const rolePicker = (
    <View style={s.authRoleWrap}>
      {ENTRY_ROLES.map(([itemRole, icon]) => {
        const active = itemRole === role;
        return (
          <Pressable
            key={itemRole}
            onPress={() => setRole(itemRole)}
            style={[s.authRoleChip, active && s.authRoleChipActive]}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
          >
            <Ionicons
              name={icon}
              size={17}
              color={active ? C.white : C.redDark}
            />
            <AppText
              style={[s.authRoleChipText, active && s.authRoleChipTextActive]}
            >
              {itemRole}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );

  if (mode === "welcome") {
    return (
      <SafeAreaView style={s.authSafe}>
        <StatusBar barStyle="light-content" />
        <ScrollView
          contentContainerStyle={s.authWelcome}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.authBrandRow}>
            <View style={s.authMark}>
              <AppText style={s.authMarkText}>F</AppText>
            </View>
            <View>
              <AppText style={s.authBrand}>GRASSROOTS</AppText>
              <AppText style={s.authBrandSub}>ZIMBABWE · OUR FOOTBALL</AppText>
            </View>
          </View>

          <View style={s.authHeroCopy}>
            <View style={s.authGuestPromise}>
              <Ionicons name="eye-outline" size={15} color={C.gold} />
              <AppText style={s.authGuestPromiseText}>
                LOOK AROUND BEFORE YOU SIGN UP
              </AppText>
            </View>
            <AppText style={s.authTitle}>
              A proper game should be easier to organise.
            </AppText>
            <AppText style={s.authIntro}>
              Find a suitable opponent, agree the details and keep everyone
              ready for kickoff in one place.
            </AppText>
          </View>

          <View style={s.authMatchPreview}>
            <View style={s.authPreviewTop}>
              <View style={s.authLiveDot} />
              <AppText style={s.authPreviewLabel}>ARRANGE A MATCH</AppText>
            </View>
            <View style={s.authMatchup}>
              <View style={s.authMatchupSide}>
                <View style={s.authMiniCrest}>
                  <AppText style={s.authMiniCrestText}>YT</AppText>
                </View>
                <AppText style={s.authMatchupTeam}>Your team</AppText>
              </View>
              <View style={s.authMatchupSignal}>
                <Ionicons name="swap-horizontal" size={18} color={C.gold} />
                <AppText style={s.authMatchupSignalText}>MATCH</AppText>
              </View>
              <View style={s.authMatchupSide}>
                <View style={[s.authMiniCrest, s.authMiniCrestAway]}>
                  <AppText style={s.authMiniCrestText}>NT</AppText>
                </View>
                <AppText style={s.authMatchupTeam}>Nearby team</AppText>
              </View>
            </View>
            <View style={s.authFitReasons}>
              <View style={s.authFitReason}>
                <Ionicons name="location-outline" size={15} color={C.gold} />
                <AppText style={s.authFitReasonText}>Choose your area</AppText>
              </View>
              <View style={s.authFitReason}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={15}
                  color={C.gold}
                />
                <AppText style={s.authFitReasonText}>
                  Confirm the details
                </AppText>
              </View>
            </View>
          </View>

          <View style={s.authDecision}>
            <AppText style={s.authQuestion}>What brings you here?</AppText>
            {rolePicker}
            <Pressable
              style={s.authPrimaryButton}
              onPress={() => onGuest(role)}
              accessibilityRole="button"
            >
              <AppText style={s.authPrimaryButtonText}>Preview the app</AppText>
              <Ionicons name="arrow-forward" size={20} color={C.redDark} />
            </Pressable>
            <AppText style={s.authNoPressure}>
              No email needed. Your progress stays on this phone.
            </AppText>
            <View style={s.authAccountRow}>
              <Pressable
                onPress={() => setMode("signin")}
                style={s.authTextButton}
              >
                <AppText style={s.authTextButtonLabel}>Sign in</AppText>
              </Pressable>
              <View style={s.authDivider} />
              <Pressable
                onPress={() => setMode("signup")}
                style={s.authTextButton}
              >
                <AppText style={s.authTextButtonLabel}>Create account</AppText>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const isSignup = mode === "signup";
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.authFormScreen}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.authFormTop}>
            <Pressable
              onPress={() => (canClose ? onClose() : setMode("welcome"))}
              style={s.authBackButton}
              accessibilityLabel={canClose ? "Return to guest mode" : "Back"}
            >
              <AppText style={s.authCancelText}>Cancel</AppText>
            </Pressable>
          </View>
          <AppText style={s.signInTitle}>
            {isSignup ? "Create account" : "Sign in"}
          </AppText>
          {isSignup ? (
            <AppText style={s.signInCopy}>
              Save your teams, fixtures and profile.
            </AppText>
          ) : null}

          {isSignup ? (
            <>
              <AppText style={s.authFieldLabel}>Name</AppText>
              <TextInput
                value={name}
                onChangeText={setName}
                style={s.authInput}
                placeholder="e.g. Taku Nhamo"
                placeholderTextColor="#756D7D"
                textContentType="name"
                autoCapitalize="words"
              />
              <AppText style={s.authFieldLabel}>Main role</AppText>
              {rolePicker}
            </>
          ) : null}

          <AppText style={s.authFieldLabel}>Email</AppText>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={s.authInput}
            placeholder="you@example.com"
            placeholderTextColor="#756D7D"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <AppText style={s.authFieldLabel}>Password</AppText>
          <View style={s.authPasswordField}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              style={s.authPasswordInput}
              placeholder="At least 8 characters"
              placeholderTextColor="#756D7D"
              secureTextEntry={!showPassword}
              textContentType={isSignup ? "newPassword" : "password"}
              autoCapitalize="none"
            />
            <Pressable
              onPress={() => setShowPassword((current) => !current)}
              style={s.authPasswordToggle}
              accessibilityLabel={
                showPassword ? "Hide password" : "Show password"
              }
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={21}
                color={C.muted}
              />
            </Pressable>
          </View>

          {error ? (
            <View style={s.authError} accessibilityRole="alert">
              <Ionicons name="alert-circle-outline" size={19} color="#A62435" />
              <AppText style={s.authErrorText}>{error}</AppText>
            </View>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={busy}
            style={[s.authSubmit, busy && s.authSubmitDisabled]}
          >
            {busy ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <AppText style={s.authSubmitText}>
                {isSignup ? "Create account" : "Sign in"}
              </AppText>
            )}
          </Pressable>
          {!isSignup && !canClose ? (
            <Pressable
              onPress={() => setMode("welcome")}
              style={s.authExploreButton}
            >
              <Ionicons name="location-outline" size={18} color={C.red} />
              <AppText style={s.authExploreButtonText}>Preview the app</AppText>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => {
              setError("");
              setMode(isSignup ? "signin" : "signup");
            }}
            style={s.authSwitch}
          >
            <AppText style={s.authSwitchText}>
              {isSignup
                ? "Already have an account? Sign in"
                : "Need an account? Create one"}
            </AppText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RoleHeader({ role, title }) {
  return (
    <>
      <BrandHeader title={role.toUpperCase()} />
      <View style={s.screenIntro}>
        <AppText style={s.screenTitle}>{title}</AppText>
      </View>
    </>
  );
}

function RoleAction({ icon, title, copy, action, label, complete, style }) {
  return (
    <View style={[s.roleActionRow, style]}>
      <View style={s.roleActionIcon}>
        <Ionicons name={icon} size={21} color={complete ? C.green : C.red} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={s.team}>{title}</AppText>
        <AppText style={s.meta}>{copy}</AppText>
      </View>
      {action ? (
        <Pressable
          onPress={action}
          style={[s.roleMiniButton, complete && s.roleMiniButtonDone]}
        >
          <AppText style={s.roleMiniButtonText}>{label}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

function ProfileChoiceGroup({
  label,
  options,
  value,
  onChange,
  multiple = false,
}) {
  const selected = (option) =>
    multiple ? value.includes(option) : value === option;
  return (
    <>
      <AppText style={s.formLabel}>{label}</AppText>
      <View style={s.optionWrap}>
        {options.map((option) => (
          <Pressable
            key={option}
            onPress={() =>
              onChange(
                multiple
                  ? selected(option)
                    ? value.filter((item) => item !== option)
                    : [...value, option]
                  : option,
              )
            }
            style={[s.formChoice, selected(option) && s.formChoiceActive]}
          >
            <AppText
              style={[
                s.formChoiceText,
                selected(option) && s.formChoiceTextActive,
              ]}
            >
              {option}
            </AppText>
          </Pressable>
        ))}
      </View>
    </>
  );
}

function ProfileTabs({
  value,
  onChange,
  options = ["Details", "Portfolio", "Public view"],
}) {
  return (
    <View style={s.profileTabs}>
      {options.map((item) => (
        <Pressable
          key={item}
          onPress={() => onChange(item)}
          style={[s.profileTab, value === item && s.profileTabActive]}
        >
          <AppText
            style={[s.profileTabText, value === item && s.profileTabTextActive]}
          >
            {item}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

function RefereeProfile({ data, update, onSave }) {
  const [view, setView] = useState("Identity");
  const [certificate, setCertificate] = useState("");
  const tabs = ["Identity", "Credentials", "Official card"];
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted)
      return Alert.alert(
        "Photos permission needed",
        "Allow Grassroots to choose an ID portrait.",
      );
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled) update({ profileImage: result.assets[0].uri });
  };
  const identity = (
    <View style={s.profileIdentity}>
      <Pressable onPress={pickImage} style={s.profileImageButton}>
        {data.profileImage ? (
          <Image source={{ uri: data.profileImage }} style={s.profileImage} />
        ) : (
          <AppText style={s.profileImageInitials}>
            {initials(data.name)}
          </AppText>
        )}
        <View style={s.profileImageEdit}>
          <Ionicons name="camera" size={14} color="white" />
        </View>
      </Pressable>
      <View style={{ flex: 1 }}>
        <AppText style={s.playerIdentityName}>{data.name}</AppText>
        <AppText style={s.meta}>
          {data.refereePath || "Community volunteer"} ·{" "}
          {data.area || "Area not added"}
        </AppText>
        <AppText style={s.meta}>
          {data.refereeRole} · {data.nationality}
        </AppText>
      </View>
    </View>
  );
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <RoleHeader
        role="Referee"
        title={
          view === "Official card" ? "Official referee card" : "Referee profile"
        }
      />
      <ProfileTabs value={view} onChange={setView} options={tabs} />
      {identity}
      <View style={s.communityListSection}>
        {view === "Identity" ? (
          <>
            <AppText style={s.settingsGroupTitle}>OFFICIAL IDENTITY</AppText>
            {[
              ["Full name", "name"],
              ["Town, suburb or district", "area"],
              ["Nationality", "nationality"],
              ["Languages", "languages"],
            ].map(([label, key]) => (
              <React.Fragment key={key}>
                <AppText style={s.formLabel}>{label}</AppText>
                <TextInput
                  value={String(data[key] || "")}
                  onChangeText={(value) => update({ [key]: value })}
                  style={s.formInput}
                />
              </React.Fragment>
            ))}
            <ProfileChoiceGroup
              label="Referee pathway"
              options={["Community volunteer", "Association registered"]}
              value={data.refereePath || "Community volunteer"}
              onChange={(refereePath) => update({ refereePath })}
            />
            {data.refereePath === "Association registered" ? (
              <>
                {[
                  ["Association", "association"],
                  ["Association ID", "fifaId"],
                  ["Category", "category"],
                ].map(([label, key]) => (
                  <React.Fragment key={key}>
                    <AppText style={s.formLabel}>{label}</AppText>
                    <TextInput
                      value={String(data[key] || "")}
                      onChangeText={(value) => update({ [key]: value })}
                      style={s.formInput}
                    />
                  </React.Fragment>
                ))}
              </>
            ) : (
              <View style={s.profilePrivacyNote}>
                <Ionicons name="heart-outline" size={20} color={C.red} />
                <AppText style={[s.body, { flex: 1 }]}>
                  Community referees can take local friendly matches. Registered
                  officials are ranked first for larger and higher level games.
                </AppText>
              </View>
            )}
            <ProfileChoiceGroup
              label="Match role"
              options={["Referee", "Assistant referee", "Fourth official"]}
              value={data.refereeRole}
              onChange={(refereeRole) => update({ refereeRole })}
            />
            <Pressable
              onPress={() => update({ contactVisible: !data.contactVisible })}
              style={s.settingRow}
            >
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>Appointments contact</AppText>
                <AppText style={s.meta}>
                  Only verified organisers can contact you
                </AppText>
              </View>
              <View
                style={[
                  s.toggleTrack,
                  data.contactVisible && s.toggleTrackActive,
                ]}
              >
                <View
                  style={[
                    s.toggleKnob,
                    data.contactVisible && s.toggleKnobActive,
                  ]}
                />
              </View>
            </Pressable>
          </>
        ) : view === "Credentials" ? (
          <>
            <AppText style={s.settingsGroupTitle}>
              CATEGORY & ASSESSMENTS
            </AppText>
            <View style={s.profileRecordStrip}>
              {[
                [data.category, "CATEGORY"],
                [`${data.observerRating}%`, "OBSERVER"],
                [data.matchesRefereed, "MATCHES"],
              ].map(([value, label]) => (
                <View key={label} style={s.profileRecordItem}>
                  <AppText style={s.profileRecordValue}>{value}</AppText>
                  <AppText style={s.playerMetricLabel}>{label}</AppText>
                </View>
              ))}
            </View>
            <AppText style={s.formLabel}>Observer rating</AppText>
            <TextInput
              value={String(data.observerRating)}
              onChangeText={(observerRating) =>
                update({
                  observerRating: Number(observerRating.replace(/[^0-9]/g, "")),
                })
              }
              keyboardType="numeric"
              style={s.formInput}
            />
            <AppText style={s.formLabel}>Fitness assessment</AppText>
            <TextInput
              value={data.fitnessTest}
              onChangeText={(fitnessTest) => update({ fitnessTest })}
              style={s.formInput}
            />
            {data.certificates.map((item, index) => (
              <View key={`${item}-${index}`} style={s.portfolioRow}>
                <Ionicons name="ribbon-outline" size={21} color={C.red} />
                <AppText style={[s.team, { flex: 1 }]}>{item}</AppText>
                <Pressable
                  onPress={() =>
                    update({
                      certificates: data.certificates.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                >
                  <Ionicons name="close" size={20} color={C.muted} />
                </Pressable>
              </View>
            ))}
            <View style={s.profileAddRow}>
              <TextInput
                value={certificate}
                onChangeText={setCertificate}
                placeholder="Add certificate or assessment"
                style={s.chatInput}
              />
              <Pressable
                disabled={!certificate.trim()}
                onPress={() => {
                  update({
                    certificates: [...data.certificates, certificate.trim()],
                  });
                  setCertificate("");
                }}
                style={[
                  s.roleMiniButton,
                  !certificate.trim() && s.buttonDisabled,
                ]}
              >
                <Ionicons name="add" size={18} color="white" />
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View style={s.profilePrivacyNote}>
              <Ionicons
                name="shield-checkmark-outline"
                size={21}
                color={C.red}
              />
              <AppText style={[s.body, { flex: 1 }]}>
                Association identity, category, assessments and appointment
                history form your official record. Private contact details stay
                hidden.
              </AppText>
            </View>
            {[
              "Association",
              "Category",
              "Role",
              "Fitness",
              "Languages",
              "Matches",
            ].map((label, index) => {
              const value = [
                data.association,
                data.category,
                data.refereeRole,
                data.fitnessTest,
                data.languages,
                `${data.matchesRefereed} referee · ${data.assistantMatches} assistant`,
              ][index];
              return (
                <View key={label} style={s.settingRow}>
                  <AppText style={s.meta}>{label.toUpperCase()}</AppText>
                  <AppText
                    style={[s.team, { maxWidth: "62%", textAlign: "right" }]}
                  >
                    {value}
                  </AppText>
                </View>
              );
            })}
            <Pressable
              onPress={() => update({ verificationRequested: true })}
              style={s.saveLineupButton}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color="white"
              />
              <AppText style={s.saveLineupText}>
                {data.verificationRequested
                  ? "VERIFICATION IN REVIEW"
                  : "SUBMIT TO ASSOCIATION"}
              </AppText>
            </Pressable>
          </>
        )}
        <Pressable
          disabled={!data.name?.trim()}
          onPress={onSave}
          style={[s.saveLineupButton, !data.name?.trim() && s.buttonDisabled]}
        >
          <AppText style={s.saveLineupText}>SAVE PROFILE</AppText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function ProfilePortfolio({ role, data, update, view, setView }) {
  const [draft, setDraft] = useState("");
  const [reportPlayer, setReportPlayer] = useState("");
  const [recommendation, setRecommendation] = useState("Follow");
  const [rating, setRating] = useState("Good");
  const addItem = () => {
    if (!draft.trim()) return;
    if (role === "Sponsor")
      update({
        sponsorshipHistory: [...data.sponsorshipHistory, draft.trim()],
      });
    else update({ achievements: [...data.achievements, draft.trim()] });
    setDraft("");
  };
  const saveReport = () => {
    if (!reportPlayer) return;
    update({
      reports: [
        {
          id: Date.now().toString(),
          player: reportPlayer,
          recommendation,
          rating,
          note: draft.trim() || "No additional note",
          created: "Today",
        },
        ...data.reports,
      ],
    });
    setDraft("");
  };
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <RoleHeader role={role} title={`${role} profile`} />
      <ProfileTabs value={view} onChange={setView} />
      <View style={s.communityListSection}>
        {role === "Player" ? (
          <>
            <AppText style={s.settingsGroupTitle}>PLAYING RECORD</AppText>
            <View style={s.profileRecordStrip}>
              {[
                [data.club || "Unattached", "CURRENT CLUB"],
                [data.shirtNumber || "Not set", "SHIRT"],
                [data.videos.length, "VIDEOS"],
              ].map(([value, label]) => (
                <View key={label} style={s.profileRecordItem}>
                  <AppText style={s.profileRecordValue}>{value}</AppText>
                  <AppText style={s.playerMetricLabel}>{label}</AppText>
                </View>
              ))}
            </View>
            <AppText style={s.settingsGroupTitle}>SEASON RECORD</AppText>
            {[
              ["Appearances", "appearances"],
              ["Starts", "starts"],
              ["Minutes", "minutes"],
              ["Goals", "goals"],
              ["Assists", "assists"],
              ["Yellow cards", "yellowCards"],
              ["Red cards", "redCards"],
            ].map(([label, key]) => (
              <React.Fragment key={key}>
                <AppText style={s.formLabel}>{label}</AppText>
                <TextInput
                  value={String(data[key] || "")}
                  onChangeText={(value) =>
                    update({ [key]: value.replace(/[^0-9]/g, "") })
                  }
                  keyboardType="numeric"
                  style={s.formInput}
                />
              </React.Fragment>
            ))}
            {(data.appearanceClaims || []).length ? (
              <>
                <AppText style={s.settingsGroupTitle}>
                  APPEARANCES TO CONFIRM
                </AppText>
                {(data.appearanceClaims || []).map((claim) => (
                  <View key={claim.id} style={s.appearanceClaimRow}>
                    <View style={s.appearanceClaimIcon}>
                      <Ionicons name="time-outline" size={19} color={C.red} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={s.team}>vs {claim.opponent}</AppText>
                      <AppText style={s.meta}>
                        {formatStoredDate(claim.playedOn)} · {claim.minutes} min
                      </AppText>
                      <AppText style={s.appearanceClaimStatus}>
                        {claim.status}
                      </AppText>
                    </View>
                  </View>
                ))}
              </>
            ) : null}
            <AppText style={s.settingsGroupTitle}>EVIDENCE CLIPS</AppText>
            {data.videos.map((video, index) => (
              <View key={`${video.uri}-${index}`} style={s.portfolioRow}>
                <Ionicons name="play-circle" size={24} color={C.red} />
                <View style={{ flex: 1 }}>
                  <AppText style={s.team}>{video.name}</AppText>
                  <AppText style={s.meta}>30-second player CV clip</AppText>
                </View>
                <Pressable
                  onPress={() =>
                    update({
                      videos: data.videos.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                >
                  <Ionicons name="trash-outline" size={20} color={C.muted} />
                </Pressable>
              </View>
            ))}
            <Pressable
              onPress={() => choosePlayerClip(data, update)}
              style={s.outlineButton}
            >
              <Ionicons name="videocam-outline" size={18} color={C.red} />
              <AppText style={s.buttonText}>ADD 30-SECOND CLIP</AppText>
            </Pressable>
            <AppText style={s.formLabel}>Shirt number</AppText>
            <TextInput
              value={data.shirtNumber}
              onChangeText={(shirtNumber) =>
                update({ shirtNumber: numbersOnly(shirtNumber) })
              }
              keyboardType="numeric"
              style={s.formInput}
            />
            <ProfileChoiceGroup
              label="Age category"
              options={["U18", "U23", "Open age", "Veterans"]}
              value={data.ageBand}
              onChange={(ageBand) => update({ ageBand })}
            />
            <AppText style={s.settingsGroupTitle}>ACHIEVEMENTS</AppText>
            {data.achievements.map((item, index) => (
              <View key={`${item}-${index}`} style={s.portfolioRow}>
                <Ionicons name="trophy-outline" size={21} color={C.red} />
                <AppText style={[s.team, { flex: 1 }]}>{item}</AppText>
                <Pressable
                  onPress={() =>
                    update({
                      achievements: data.achievements.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                >
                  <Ionicons name="close" size={20} color={C.muted} />
                </Pressable>
              </View>
            ))}
            <View style={s.profileAddRow}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Add an achievement"
                style={s.chatInput}
              />
              <Pressable
                disabled={!draft.trim()}
                onPress={addItem}
                style={[s.roleMiniButton, !draft.trim() && s.buttonDisabled]}
              >
                <Ionicons name="add" color="white" size={18} />
              </Pressable>
            </View>
          </>
        ) : null}
        {role === "Sponsor" ? (
          <>
            <AppText style={s.settingsGroupTitle}>SPONSORSHIP HISTORY</AppText>
            {data.sponsorshipHistory.map((item, index) => (
              <View key={`${item}-${index}`} style={s.portfolioRow}>
                <Ionicons name="ribbon-outline" size={21} color={C.red} />
                <AppText style={[s.team, { flex: 1 }]}>{item}</AppText>
                <Pressable
                  onPress={() =>
                    update({
                      sponsorshipHistory: data.sponsorshipHistory.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                >
                  <Ionicons name="close" size={20} color={C.muted} />
                </Pressable>
              </View>
            ))}
            <View style={s.profileAddRow}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Add previous sponsorship"
                style={s.chatInput}
              />
              <Pressable
                disabled={!draft.trim()}
                onPress={addItem}
                style={[s.roleMiniButton, !draft.trim() && s.buttonDisabled]}
              >
                <Ionicons name="add" color="white" size={18} />
              </Pressable>
            </View>
            <ProfileChoiceGroup
              multiple
              label="Impact you want to support"
              options={[
                "Youth participation",
                "Women’s football",
                "Equipment",
                "Safe grounds",
                "Travel",
              ]}
              value={data.impactFocus}
              onChange={(impactFocus) => update({ impactFocus })}
            />
            <View style={s.profilePrivacyNote}>
              <Ionicons name="analytics-outline" size={21} color={C.red} />
              <AppText style={[s.body, { flex: 1 }]}>
                Confirmed sponsorships will receive reach, participation and
                delivery reports, not vanity impressions.
              </AppText>
            </View>
          </>
        ) : null}
        {role === "Scout" ? (
          <>
            <AppText style={s.settingsGroupTitle}>NEW PRIVATE REPORT</AppText>
            <ProfileChoiceGroup
              label="Player"
              options={[]}
              value={reportPlayer}
              onChange={setReportPlayer}
            />
            <ProfileChoiceGroup
              label="Current level"
              options={["Developing", "Good", "Standout"]}
              value={rating}
              onChange={setRating}
            />
            <ProfileChoiceGroup
              label="Recommendation"
              options={["Pass", "Follow", "Contact club"]}
              value={recommendation}
              onChange={setRecommendation}
            />
            <AppText style={s.formLabel}>Private observation</AppText>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Strengths, risks and next action"
              multiline
              style={[s.formInput, s.profileMultiline]}
            />
            <Pressable
              onPress={saveReport}
              disabled={!reportPlayer}
              style={[s.saveLineupButton, !reportPlayer && s.buttonDisabled]}
            >
              <Ionicons name="lock-closed-outline" size={18} color="white" />
              <AppText style={s.saveLineupText}>SAVE PRIVATE REPORT</AppText>
            </Pressable>
            <AppText style={s.settingsGroupTitle}>SAVED REPORTS</AppText>
            {data.reports.length ? (
              data.reports.map((report) => (
                <View key={report.id} style={s.scoutReport}>
                  <View style={s.scoutReportHead}>
                    <AppText style={s.team}>{report.player}</AppText>
                    <AppText style={s.communityStatus}>
                      {report.recommendation}
                    </AppText>
                  </View>
                  <AppText style={s.meta}>
                    {report.rating} · {report.created}
                  </AppText>
                  <AppText style={s.body}>{report.note}</AppText>
                  <Pressable
                    onPress={() =>
                      update({
                        reports: data.reports.filter(
                          (item) => item.id !== report.id,
                        ),
                      })
                    }
                    style={s.scoutReportDelete}
                  >
                    <AppText style={s.communitySeeAll}>Delete report</AppText>
                  </Pressable>
                </View>
              ))
            ) : (
              <View style={s.emptyState}>
                <Ionicons
                  name="document-lock-outline"
                  size={28}
                  color={C.muted}
                />
                <AppText style={s.team}>No reports yet</AppText>
                <AppText style={s.meta}>
                  Reports are visible only to this scout account.
                </AppText>
              </View>
            )}
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

function PublicProfilePreview({ role, data, view, setView, onEdit }) {
  const playerLike = role === "Player";
  const [playerStatsPeriod, setPlayerStatsPeriod] = useState("All time");
  const playerPeriodStats = playerStatsForPeriod(data, playerStatsPeriod);
  const title =
    role === "Sponsor" ? data.organization : data.name || "Incomplete profile";
  const imageUri = role === "Sponsor" ? data.logoUri : data.profileImage;
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      {onEdit ? (
        <View style={s.subHeader}>
          <View style={{ flex: 1 }}>
            <AppText style={s.headerTitle}>
              {playerLike ? "PLAYER PROFILE" : `${role.toUpperCase()} PROFILE`}
            </AppText>
            <AppText style={s.headerSub}>PREVIEW</AppText>
          </View>
          <Pressable onPress={onEdit} style={s.roleMiniButton}>
            <AppText style={s.roleMiniButtonText}>EDIT</AppText>
          </Pressable>
        </View>
      ) : (
        <>
          <RoleHeader
            role={role}
            title={playerLike ? "International player CV" : "Public profile"}
          />
          <ProfileTabs value={view} onChange={setView} />
        </>
      )}
      <View style={s.publicProfileHero}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={s.publicProfileImage} />
        ) : (
          <View style={s.publicProfileImageFallback}>
            <AppText style={s.profileImageInitials}>{initials(title)}</AppText>
          </View>
        )}
        <AppText style={s.publicProfileTitle}>{title}</AppText>
        <AppText style={s.publicProfileMeta}>
          {playerLike
            ? `${data.position} · ${data.area}`
            : role === "Sponsor"
              ? `${data.sector} · ${data.area}`
              : `${data.credential} · ${data.area}`}
        </AppText>
        {data.verificationRequested ? (
          <View style={s.publicPending}>
            <Ionicons name="time-outline" size={15} color={C.redDark} />
            <AppText style={s.meta}>Verification pending</AppText>
          </View>
        ) : null}
      </View>
      <View style={s.communityListSection}>
        {playerLike ? (
          <>
            <AppText style={s.publicProfileSummary}>
              {data.bio || "No playing summary yet."}
            </AppText>
            <View style={s.profileRecordStrip}>
              {[
                [data.preferredFoot, "FOOT"],
                [`${data.heightCm} cm`, "HEIGHT"],
                [data.contractStatus, "STATUS"],
              ].map(([value, label]) => (
                <View key={label} style={s.profileRecordItem}>
                  <AppText style={s.profileRecordValue}>{value}</AppText>
                  <AppText style={s.playerMetricLabel}>{label}</AppText>
                </View>
              ))}
            </View>
            <View style={s.statsScopeHeader}>
              <View style={s.statsScopeIcon}>
                <Ionicons name="person-outline" size={22} color={C.red} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>Player statistics</AppText>
                <AppText style={s.body}>
                  Personal verified appearances across every team.
                </AppText>
              </View>
            </View>
            <StatsPeriodControl
              value={playerStatsPeriod}
              onChange={setPlayerStatsPeriod}
            />
            <View style={s.playerMetricRow}>
              {[
                [playerPeriodStats.appearances, "APPS"],
                [playerPeriodStats.goals, "GOALS"],
                [playerPeriodStats.assists, "ASSISTS"],
                [playerPeriodStats.minutes, "MIN"],
              ].map(([value, label]) => (
                <View key={label} style={s.playerMetric}>
                  <AppText style={s.playerMetricValue}>{value}</AppText>
                  <AppText style={s.playerMetricLabel}>{label}</AppText>
                </View>
              ))}
            </View>
            <View style={s.teamPpgRow}>
              <AppText style={s.meta}>STARTS</AppText>
              <AppText style={s.team}>{playerPeriodStats.starts}</AppText>
            </View>
            <View style={s.teamPpgRow}>
              <AppText style={s.meta}>YELLOW / RED CARDS</AppText>
              <AppText style={s.team}>
                {playerPeriodStats.yellowCards} / {playerPeriodStats.redCards}
              </AppText>
            </View>
            <AppText style={s.settingsGroupTitle}>PLAYER INFORMATION</AppText>
            {[
              [
                "Age group",
                data.ageBand ||
                  (data.dateOfBirth
                    ? Number.parseInt(ageFromDate(data.dateOfBirth), 10) < 18
                      ? "Youth player"
                      : "Adult"
                    : "Not shared"),
              ],
              ["Nationality", data.nationality],
              ["Position", `${data.position} / ${data.secondaryPosition}`],
              ["Current club", data.club || "Unattached"],
              ["Languages", data.languages],
              ["Registration", data.registrationId],
            ].map(([label, value]) => (
              <View key={label} style={s.settingRow}>
                <AppText style={s.meta}>{label.toUpperCase()}</AppText>
                <AppText
                  style={[s.team, { maxWidth: "62%", textAlign: "right" }]}
                >
                  {value}
                </AppText>
              </View>
            ))}
            <AppText style={s.settingsGroupTitle}>30-SECOND EVIDENCE</AppText>
            {data.videos.length ? (
              data.videos.map((video, index) => (
                <Pressable
                  key={`${video.uri}-${index}`}
                  onPress={() =>
                    Alert.alert(
                      "Evidence clip",
                      `${video.name}\nReady to share with the player CV.`,
                    )
                  }
                  style={s.portfolioRow}
                >
                  <Ionicons name="play-circle" size={24} color={C.red} />
                  <View style={{ flex: 1 }}>
                    <AppText style={s.team}>{video.name}</AppText>
                    <AppText style={s.meta}>
                      ≤ 30 sec · football evidence
                    </AppText>
                  </View>
                  <Ionicons name="open-outline" size={19} color={C.red} />
                </Pressable>
              ))
            ) : (
              <AppText style={s.meta}>
                No clips added yet. Add up to eight focused moments from
                Details.
              </AppText>
            )}
          </>
        ) : role === "Sponsor" ? (
          <>
            <AppText style={s.settingsGroupTitle}>LOOKING TO SUPPORT</AppText>
            <View style={s.optionWrap}>
              {data.sponsorTypes.map((item) => (
                <View key={item} style={s.publicTag}>
                  <AppText style={s.formChoiceText}>{item}</AppText>
                </View>
              ))}
            </View>
            <AppText style={s.publicProfileSummary}>
              {data.impactFocus.join(" · ") || "Impact preferences not added."}
            </AppText>
            <AppText style={s.settingsGroupTitle}>PARTNERSHIP BRIEF</AppText>
            <View style={s.settingRow}>
              <AppText style={s.meta}>OBJECTIVES</AppText>
              <AppText
                style={[s.team, { maxWidth: "62%", textAlign: "right" }]}
              >
                {data.objectives.join(" · ")}
              </AppText>
            </View>
            <View style={s.settingRow}>
              <AppText style={s.meta}>RIGHTS</AppText>
              <AppText
                style={[s.team, { maxWidth: "62%", textAlign: "right" }]}
              >
                {data.rightsWanted.join(" · ")}
              </AppText>
            </View>
          </>
        ) : (
          <>
            <AppText style={s.settingsGroupTitle}>SCOUTING FOCUS</AppText>
            <View style={s.optionWrap}>
              {data.specialties.map((item) => (
                <View key={item} style={s.publicTag}>
                  <AppText style={s.formChoiceText}>{item}</AppText>
                </View>
              ))}
            </View>
            <AppText style={s.publicProfileSummary}>{data.philosophy}</AppText>
            <View style={s.settingRow}>
              <AppText style={s.meta}>ORGANISATION</AppText>
              <AppText style={s.team}>{data.organization}</AppText>
            </View>
            <View style={s.settingRow}>
              <AppText style={s.meta}>EXPERIENCE</AppText>
              <AppText style={s.team}>{data.yearsExperience} years</AppText>
            </View>
            <View style={s.settingRow}>
              <AppText style={s.meta}>CREDENTIAL</AppText>
              <AppText
                style={[s.team, { maxWidth: "62%", textAlign: "right" }]}
              >
                {data.credential}
              </AppText>
            </View>
            <View style={s.profilePrivacyNote}>
              <Ionicons name="eye-off-outline" size={20} color={C.red} />
              <AppText style={[s.body, { flex: 1 }]}>
                Private reports, notes and watchlists are never shown on this
                public profile.
              </AppText>
            </View>
          </>
        )}
        <RoleAction
          icon={
            data.contactVisible ? "chatbubble-outline" : "lock-closed-outline"
          }
          title={data.contactVisible ? "Contact available" : "Contact private"}
          copy={
            data.contactVisible
              ? "Verified members can send a request"
              : "This profile is not accepting direct contact"
          }
        />
        <Pressable
          onPress={() =>
            Alert.alert("Profile link ready", `Share ${title} on Grassroots.`)
          }
          style={s.saveLineupButton}
        >
          <Ionicons name="share-social-outline" size={18} color="white" />
          <AppText style={s.saveLineupText}>SHARE PUBLIC PROFILE</AppText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function SavedRolePreview({ role, data, onEdit }) {
  if (role === "Player" || role === "Sponsor" || role === "Scout")
    return <PublicProfilePreview role={role} data={data} onEdit={onEdit} />;
  const title = data.name || `${role} profile`;
  const rows =
    role === "Coach"
      ? [
          ["Qualification", data.qualification || "Not added"],
          ["Area", data.area || "Not added"],
          ["Summary", data.bio || "Not added"],
        ]
      : [
          ["Association", data.association || "Not added"],
          ["Category", data.category || "Not added"],
          ["Role", data.refereeRole || "Not added"],
          ["Matches", data.matchesRefereed || 0],
        ];
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={s.subHeader}>
        <View style={{ flex: 1 }}>
          <AppText style={s.headerTitle}>{role.toUpperCase()} PROFILE</AppText>
          <AppText style={s.headerSub}>PREVIEW</AppText>
        </View>
        <Pressable onPress={onEdit} style={s.roleMiniButton}>
          <AppText style={s.roleMiniButtonText}>EDIT</AppText>
        </Pressable>
      </View>
      <View style={s.publicProfileHero}>
        <View style={s.publicProfileImageFallback}>
          <AppText style={s.profileImageInitials}>{initials(title)}</AppText>
        </View>
        <AppText style={s.publicProfileTitle}>{title}</AppText>
        <AppText style={s.publicProfileMeta}>
          {role === "Coach"
            ? data.area || "Area not added"
            : `${data.refereeRole || "Referee"} · ${data.area || "Area not added"}`}
        </AppText>
      </View>
      <View style={s.communityListSection}>
        {rows.map(([label, value]) => (
          <View key={label} style={s.settingRow}>
            <AppText style={s.meta}>{label.toUpperCase()}</AppText>
            <AppText style={[s.team, { maxWidth: "62%", textAlign: "right" }]}>
              {value}
            </AppText>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function CoachProfile({ data, update, onSave }) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <RoleHeader role="Coach" title="Coach profile" />
      <View style={s.communityListSection}>
        <AppText style={s.formLabel}>Full name</AppText>
        <TextInput
          value={data.name}
          onChangeText={(name) => update({ name })}
          placeholder="Your name"
          placeholderTextColor="#756D7D"
          style={s.formInput}
        />
        <AppText style={s.formLabel}>Coaching qualification</AppText>
        <TextInput
          value={data.qualification}
          onChangeText={(qualification) => update({ qualification })}
          placeholder="Licence or coaching level"
          placeholderTextColor="#756D7D"
          style={s.formInput}
        />
        <AppText style={s.formLabel}>Area</AppText>
        <TextInput
          value={data.area}
          onChangeText={(area) => update({ area })}
          placeholder="Town, suburb or district"
          placeholderTextColor="#756D7D"
          style={s.formInput}
        />
        <AppText style={s.formLabel}>Coaching summary</AppText>
        <TextInput
          value={data.bio}
          onChangeText={(bio) => update({ bio })}
          placeholder="Your experience and the football you coach"
          placeholderTextColor="#756D7D"
          multiline
          style={[s.formInput, s.profileMultiline]}
        />
        <View style={s.profilePrivacyNote}>
          <Ionicons name="shield-outline" size={21} color={C.red} />
          <AppText style={[s.body, { flex: 1 }]}>
            This is your personal coach profile. Team members, chat, payments
            and squad information stay in the Team space.
          </AppText>
        </View>
        <Pressable
          disabled={!data.name?.trim()}
          onPress={onSave}
          style={[s.saveLineupButton, !data.name?.trim() && s.buttonDisabled]}
        >
          <AppText style={s.saveLineupText}>SAVE PROFILE</AppText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function RoleProfile({ role, data, update, onSaveProfile }) {
  const [view, setView] = useState("Details");
  const [editing, setEditing] = useState(!data.profileSaved);
  const [saving, setSaving] = useState(false);
  const saveProfile = async () => {
    setSaving(true);
    try {
      await onSaveProfile(data);
      setEditing(false);
      Alert.alert("Profile saved", "Your preview is ready.");
    } catch {
      Alert.alert(
        "Couldn’t save profile",
        "Please check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  if (data.profileSaved && !editing)
    return (
      <SavedRolePreview
        role={role}
        data={data}
        onEdit={() => setEditing(true)}
      />
    );
  if (role === "Coach")
    return <CoachProfile data={data} update={update} onSave={saveProfile} />;
  if (role === "Referee")
    return <RefereeProfile data={data} update={update} onSave={saveProfile} />;
  const playerLike = role === "Player";
  const imageUri = role === "Sponsor" ? data.logoUri : data.profileImage;
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted)
      return Alert.alert(
        "Photos permission needed",
        "Allow Grassroots to choose a profile image.",
      );
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled)
      update(
        role === "Sponsor"
          ? { logoUri: result.assets[0].uri }
          : { profileImage: result.assets[0].uri },
      );
  };
  const requestVerification = () => {
    if (!data.name?.trim() || (role !== "Player" && !data.organization?.trim()))
      return Alert.alert(
        "Complete the profile first",
        "Add the required identity details before requesting verification.",
      );
    update({ verificationRequested: true });
  };
  const title =
    role === "Sponsor" ? data.organization : data.name || `${role} profile`;
  if (view === "Portfolio")
    return (
      <ProfilePortfolio
        role={role}
        data={data}
        update={update}
        view={view}
        setView={setView}
      />
    );
  if (view === "Public view")
    return (
      <PublicProfilePreview
        role={role}
        data={data}
        view={view}
        setView={setView}
      />
    );
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <RoleHeader
        role={role}
        title={playerLike ? "International player CV" : `${role} profile`}
      />
      <ProfileTabs value={view} onChange={setView} />
      <View style={s.profileIdentity}>
        <Pressable onPress={pickImage} style={s.profileImageButton}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={s.profileImage} />
          ) : (
            <AppText style={s.profileImageInitials}>{initials(title)}</AppText>
          )}
          <View style={s.profileImageEdit}>
            <Ionicons name="camera" size={14} color="white" />
          </View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText style={s.playerIdentityName}>{title}</AppText>
          <AppText style={s.meta}>
            {playerLike
              ? `${data.position} · ${data.club || "Looking for a club"}`
              : role === "Sponsor"
                ? `${data.sector} · ${data.area}`
                : `${data.organization} · ${data.area}`}
          </AppText>
          <View style={s.profileVerificationLine}>
            <Ionicons
              name={
                data.verificationRequested ? "time" : "shield-checkmark-outline"
              }
              size={15}
              color={data.verificationRequested ? C.gold : C.muted}
            />
            <AppText style={s.meta}>
              {data.verificationRequested
                ? "Verification review requested"
                : "Not yet verified"}
            </AppText>
          </View>
        </View>
      </View>
      <View style={s.communityListSection}>
        <AppText style={s.settingsGroupTitle}>
          {playerLike
            ? "FOOTBALL IDENTITY"
            : role === "Sponsor"
              ? "ORGANISATION"
              : "SCOUT IDENTITY"}
        </AppText>
        <AppText style={s.formLabel}>
          {role === "Sponsor" ? "Contact person" : "Full name"}
        </AppText>
        <TextInput
          value={data.name}
          onChangeText={(name) => {
            update({ name });
          }}
          placeholder="Full name"
          style={s.formInput}
        />
        {role === "Sponsor" || role === "Scout" ? (
          <>
            <AppText style={s.formLabel}>Organisation</AppText>
            <TextInput
              value={data.organization}
              onChangeText={(organization) => {
                update({ organization });
              }}
              placeholder={
                role === "Sponsor"
                  ? "Business or organisation"
                  : "Club, academy or independent"
              }
              style={s.formInput}
            />
          </>
        ) : null}
        {playerLike ? (
          <>
            <ProfileChoiceGroup
              label="Primary position"
              options={["Goalkeeper", "Defender", "Midfielder", "Forward"]}
              value={data.position}
              onChange={(position) =>
                update({
                  position,
                  secondaryPosition: secondaryPositionsByPrimary[
                    position
                  ]?.includes(data.secondaryPosition)
                    ? data.secondaryPosition
                    : "",
                })
              }
            />
            <ProfileChoiceGroup
              label="Secondary position"
              options={secondaryPositionsByPrimary[data.position] || []}
              value={data.secondaryPosition}
              onChange={(secondaryPosition) => update({ secondaryPosition })}
            />
            <ProfileChoiceGroup
              label="Preferred foot"
              options={["Right", "Left", "Both"]}
              value={data.preferredFoot}
              onChange={(preferredFoot) => update({ preferredFoot })}
            />
            <AppText style={s.settingsGroupTitle}>PERSONAL & PHYSICAL</AppText>
            {[
              ["Date of birth", "dateOfBirth", "14 May 2002"],
              ["Nationality", "nationality", "Zimbabwean"],
              ["Height (cm)", "heightCm", "181"],
              ["Weight (kg)", "weightKg", "74"],
              ["Languages", "languages", "English, Shona"],
              ["Registration ID", "registrationId", "Association registration"],
            ].map(([label, key, placeholder]) => (
              <React.Fragment key={key}>
                <AppText style={s.formLabel}>{label}</AppText>
                {key === "dateOfBirth" ? (
                  <DateField
                    value={data.dateOfBirth}
                    onChange={(dateOfBirth) => update({ dateOfBirth })}
                    maximumDate={new Date()}
                    accessibilityLabel="Choose date of birth"
                  />
                ) : (
                  <TextInput
                    value={data[key]}
                    onChangeText={(value) =>
                      update({
                        [key]:
                          key === "heightCm" || key === "weightKg"
                            ? numbersOnly(value)
                            : value,
                      })
                    }
                    placeholder={placeholder}
                    keyboardType={
                      key === "heightCm" || key === "weightKg"
                        ? "numeric"
                        : "default"
                    }
                    style={s.formInput}
                  />
                )}
              </React.Fragment>
            ))}
            <ProfileChoiceGroup
              label="Contract status"
              options={["Available", "Open to offers", "Under contract"]}
              value={data.contractStatus}
              onChange={(contractStatus) => update({ contractStatus })}
            />
            <AppText style={s.formLabel}>Home area</AppText>
            <TextInput
              value={data.area}
              onChangeText={(area) => update({ area })}
              placeholder="Area and city"
              style={s.formInput}
            />
            <AppText style={s.formLabel}>Playing summary</AppText>
            <TextInput
              value={data.bio}
              onChangeText={(bio) => update({ bio })}
              placeholder="Describe your football and availability"
              multiline
              style={[s.formInput, s.profileMultiline]}
            />
            <Pressable
              onPress={() => choosePlayerClip(data, update)}
              style={s.profileEvidence}
            >
              <Ionicons name="videocam-outline" size={22} color={C.red} />
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>Add a 30-second evidence clip</AppText>
                <AppText style={s.meta}>
                  {data.videos.length}/8 clips · one decisive moment per clip
                </AppText>
              </View>
              <Ionicons name="add" size={21} color={C.red} />
            </Pressable>
            <AppText style={s.settingsGroupTitle}>YOUTH LINK & CONSENT</AppText>
            <AppText style={s.body}>
              Exact birth dates, guardian contacts and addresses stay private.
              Public profiles show only an age band and whether protection is
              linked.
            </AppText>
            <TextInput
              value={data.guardianName || ""}
              onChangeText={(guardianName) => update({ guardianName })}
              placeholder="Guardian or trusted adult name"
              placeholderTextColor={C.muted}
              style={s.formInput}
            />
            <TextInput
              value={data.guardianContact || ""}
              onChangeText={(guardianContact) => update({ guardianContact })}
              placeholder="Private guardian contact"
              placeholderTextColor={C.muted}
              style={s.formInput}
            />
            <TextInput
              value={data.guardianAccountId || ""}
              onChangeText={(guardianAccountId) =>
                update({
                  guardianAccountId: guardianAccountId.trim(),
                  guardianLinked: Boolean(guardianAccountId.trim()),
                })
              }
              autoCapitalize="none"
              placeholder="Guardian account code"
              placeholderTextColor={C.muted}
              style={s.formInput}
            />
            <View style={s.settingRow}>
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>Guardian linked</AppText>
                <AppText style={s.meta}>
                  Required for private adult-to-youth contact
                </AppText>
              </View>
              <View
                style={[
                  s.toggleTrack,
                  data.guardianLinked && s.toggleTrackActive,
                ]}
              >
                <View
                  style={[
                    s.toggleKnob,
                    data.guardianLinked && s.toggleKnobActive,
                  ]}
                />
              </View>
            </View>
            {[
              ["consentPhotos", "Photos"],
              ["consentVideos", "Videos"],
              ["consentTransport", "Team transport"],
              ["consentTrials", "Trials and scouting"],
            ].map(([key, label]) => (
              <Pressable
                key={key}
                style={s.settingRow}
                onPress={() => update({ [key]: !data[key] })}
              >
                <View style={{ flex: 1 }}>
                  <AppText style={s.team}>{label}</AppText>
                  <AppText style={s.meta}>
                    {data[key] ? "Consent recorded" : "No consent recorded"}
                  </AppText>
                </View>
                <Ionicons
                  name={data[key] ? "checkmark-circle" : "ellipse-outline"}
                  size={22}
                  color={data[key] ? C.green : C.muted}
                />
              </Pressable>
            ))}
          </>
        ) : null}
        {role === "Sponsor" ? (
          <>
            <ProfileChoiceGroup
              label="Sector"
              options={[
                "Retail",
                "Finance",
                "Health",
                "Transport",
                "Hospitality",
              ]}
              value={data.sector}
              onChange={(sector) => update({ sector })}
            />
            <AppText style={s.formLabel}>Operating area</AppText>
            <TextInput
              value={data.area}
              onChangeText={(area) => update({ area })}
              placeholder="City or coverage area"
              style={s.formInput}
            />
            <AppText style={s.formLabel}>Website or public page</AppText>
            <TextInput
              value={data.website}
              onChangeText={(website) => update({ website })}
              autoCapitalize="none"
              placeholder="https://"
              style={s.formInput}
            />
            <ProfileChoiceGroup
              multiple
              label="Interested in sponsoring"
              options={["Kits", "Matches", "Leagues", "Youth", "Grounds"]}
              value={data.sponsorTypes}
              onChange={(sponsorTypes) => update({ sponsorTypes })}
            />
            <ProfileChoiceGroup
              multiple
              label="Partnership objectives"
              options={[
                "Community trust",
                "Local awareness",
                "Sales",
                "Staff engagement",
                "Social impact",
              ]}
              value={data.objectives}
              onChange={(objectives) => update({ objectives })}
            />
            <ProfileChoiceGroup
              multiple
              label="Rights you need"
              options={[
                "Kit branding",
                "Matchday mentions",
                "Content",
                "Hospitality",
                "Naming rights",
              ]}
              value={data.rightsWanted}
              onChange={(rightsWanted) => update({ rightsWanted })}
            />
            <AppText style={s.formLabel}>Typical budget (USD)</AppText>
            <TextInput
              value={data.budget}
              onChangeText={(budget) => update({ budget: numbersOnly(budget) })}
              keyboardType="numeric"
              style={s.formInput}
            />
            <Pressable
              onPress={() =>
                update({ safeguardingAccepted: !data.safeguardingAccepted })
              }
              style={s.settingRow}
            >
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>Responsible activation pledge</AppText>
                <AppText style={s.meta}>
                  Protect players, minors, club marks and community data
                </AppText>
              </View>
              <View
                style={[
                  s.toggleTrack,
                  data.safeguardingAccepted && s.toggleTrackActive,
                ]}
              >
                <View
                  style={[
                    s.toggleKnob,
                    data.safeguardingAccepted && s.toggleKnobActive,
                  ]}
                />
              </View>
            </Pressable>
          </>
        ) : null}
        {role === "Scout" ? (
          <>
            <AppText style={s.formLabel}>Credential or role</AppText>
            <TextInput
              value={data.credential}
              onChangeText={(credential) => update({ credential })}
              placeholder="Scouting role or licence"
              style={s.formInput}
            />
            <AppText style={s.formLabel}>Coverage area</AppText>
            <TextInput
              value={data.area}
              onChangeText={(area) => update({ area })}
              placeholder="Areas you cover"
              style={s.formInput}
            />
            <ProfileChoiceGroup
              multiple
              label="Scouting focus"
              options={[
                "U18",
                "U23",
                "Women",
                "Goalkeepers",
                "Defenders",
                "Midfielders",
                "Forwards",
              ]}
              value={data.specialties}
              onChange={(specialties) => update({ specialties })}
            />
            <AppText style={s.formLabel}>Private scouting brief</AppText>
            <TextInput
              value={data.notes}
              onChangeText={(notes) => update({ notes })}
              placeholder="What profiles are you looking for?"
              multiline
              style={[s.formInput, s.profileMultiline]}
            />
            <AppText style={s.formLabel}>Talent philosophy</AppText>
            <TextInput
              value={data.philosophy}
              onChangeText={(philosophy) => update({ philosophy })}
              placeholder="What qualities matter in your playing model?"
              multiline
              style={[s.formInput, s.profileMultiline]}
            />
            <AppText style={s.formLabel}>Licence / membership number</AppText>
            <TextInput
              value={data.licenceNumber}
              onChangeText={(licenceNumber) => update({ licenceNumber })}
              style={s.formInput}
            />
            <AppText style={s.formLabel}>Years scouting</AppText>
            <TextInput
              value={data.yearsExperience}
              onChangeText={(yearsExperience) =>
                update({
                  yearsExperience: yearsExperience.replace(/[^0-9]/g, ""),
                })
              }
              keyboardType="numeric"
              style={s.formInput}
            />
            <Pressable
              onPress={() =>
                update({ safeguardingAccepted: !data.safeguardingAccepted })
              }
              style={s.settingRow}
            >
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>Safeguarding declaration</AppText>
                <AppText style={s.meta}>
                  Required before contacting youth players or clubs
                </AppText>
              </View>
              <View
                style={[
                  s.toggleTrack,
                  data.safeguardingAccepted && s.toggleTrackActive,
                ]}
              >
                <View
                  style={[
                    s.toggleKnob,
                    data.safeguardingAccepted && s.toggleKnobActive,
                  ]}
                />
              </View>
            </Pressable>
            <View style={s.profilePrivacyNote}>
              <Ionicons name="lock-closed-outline" size={20} color={C.red} />
              <AppText style={[s.body, { flex: 1 }]}>
                Your brief and watchlist remain private. Players only see your
                verified public identity.
              </AppText>
            </View>
          </>
        ) : null}
        <Pressable
          onPress={() => update({ contactVisible: !data.contactVisible })}
          style={s.settingRow}
        >
          <View style={{ flex: 1 }}>
            <AppText style={s.team}>Allow direct contact</AppText>
            <AppText style={s.meta}>
              {data.contactVisible
                ? "Verified members can contact this profile"
                : "Contact details remain private"}
            </AppText>
          </View>
          <View
            style={[s.toggleTrack, data.contactVisible && s.toggleTrackActive]}
          >
            <View
              style={[s.toggleKnob, data.contactVisible && s.toggleKnobActive]}
            />
          </View>
        </Pressable>
        <Pressable
          onPress={requestVerification}
          style={[
            s.outlineButton,
            data.verificationRequested && s.profileVerificationRequested,
          ]}
        >
          <Ionicons
            name={
              data.verificationRequested
                ? "time-outline"
                : "shield-checkmark-outline"
            }
            size={18}
            color={C.red}
          />
          <AppText style={s.buttonText}>
            {data.verificationRequested
              ? "VERIFICATION REQUESTED"
              : "REQUEST VERIFICATION"}
          </AppText>
        </Pressable>
        <Pressable
          disabled={!data.name?.trim()}
          onPress={saveProfile}
          style={[
            s.saveLineupButton,
            (saving || !data.name?.trim()) && s.buttonDisabled,
          ]}
        >
          <AppText style={s.saveLineupText}>
            {saving ? "SAVING" : "SAVE PROFILE"}
          </AppText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const archivedRefereeAssignments = [
  {
    id: "HSL-207",
    match: "Avondale Social vs Mbare City Boys",
    date: "Sunday · 10:00",
    ground: "Belgravia Sports Club",
    role: "Referee",
    fee: 25,
    transport: 8,
    minimumTier: 2,
    distanceKm: 6,
  },
  {
    id: "NPL-118",
    match: "Highfield United vs Seke XI",
    date: "Saturday · 15:00",
    ground: "Gwanzura Annex",
    role: "Referee",
    fee: 40,
    transport: 10,
    minimumTier: 3,
    distanceKm: 14,
  },
  {
    id: "YTH-092",
    match: "Greendale U18 vs Borrowdale U18",
    date: "Wednesday · 16:00",
    ground: "Greendale Sports Club",
    role: "Assistant referee",
    fee: 15,
    transport: 5,
    minimumTier: 1,
    distanceKm: 8,
  },
];
const refereeAssignments = [];

function RefereeAssignments({ data, update, assignments = [], onRespond }) {
  const [busyId, setBusyId] = useState(null);
  const ranked = assignments.map((assignment) => ({
    ...assignment,
    match: assignment.matchLabel,
    date: `${formatStoredDate(assignment.matchDate)} · ${assignment.kickoff}`,
    ground: assignment.venue,
    role: "Referee",
    transport: 0,
    eligible: true,
  }));
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
      <RoleHeader role="Referee" title="Paid appointments" />
      <View style={s.communityListSection}>
        <View style={s.profilePrivacyNote}>
          <Ionicons name="options-outline" size={21} color={C.red} />
          <AppText style={[s.body, { flex: 1 }]}>
            Your category, certificates, observer reports and experience place
            eligible matches first. Fees are always shown before you apply.
          </AppText>
        </View>
        {ranked.map((assignment, index) => {
          const active = assignment.status === "accepted";
          return (
            <View key={assignment.id} style={s.roleFixture}>
              <View style={s.scoutReportHead}>
                <AppText style={s.communityStatus}>
                  {index === 0
                    ? "BEST MATCH"
                    : assignment.eligible
                      ? "ELIGIBLE"
                      : `TIER ${assignment.minimumTier} REQUIRED`}
                </AppText>
                <AppText style={s.playerMetricValue}>
                  USD {assignment.fee}
                </AppText>
              </View>
              <AppText style={s.meta}>
                {assignment.date} · {assignment.ground}
              </AppText>
              <AppText style={s.assignmentTeams}>{assignment.match}</AppText>
              <AppText style={s.body}>
                {assignment.role} · USD {assignment.transport} transport
                included
              </AppText>
              <Pressable
                disabled={active || busyId === assignment.id}
                onPress={async () => {
                  setBusyId(assignment.id);
                  try {
                    await onRespond(assignment, "accepted");
                  } catch (error) {
                    Alert.alert(
                      "Couldn’t accept appointment",
                      error?.message ||
                        "Please check your connection and try again.",
                    );
                  } finally {
                    setBusyId(null);
                  }
                }}
                style={[
                  s.saveLineupButton,
                  active && s.saveLineupButtonSaved,
                  (active || busyId === assignment.id) && s.buttonDisabled,
                ]}
              >
                <AppText style={s.saveLineupText}>
                  {busyId === assignment.id
                    ? "ACCEPTING"
                    : active
                      ? "APPOINTMENT ACCEPTED"
                      : "ACCEPT APPOINTMENT"}
                </AppText>
              </Pressable>
            </View>
          );
        })}
        {!ranked.length ? (
          <View style={s.emptyState}>
            <Ionicons name="flag-outline" size={30} color={C.muted} />
            <AppText style={s.team}>No appointments yet</AppText>
            <AppText style={s.body}>
              Eligible referee appointments will appear here.
            </AppText>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function PlayerAppearanceEntry({ data, update, close }) {
  const [opponent, setOpponent] = useState("");
  const [playedOn, setPlayedOn] = useState("");
  const [minutes, setMinutes] = useState("");
  const [goals, setGoals] = useState("0");
  const [assists, setAssists] = useState("0");
  const [matchType, setMatchType] = useState("Friendly");
  const [submitted, setSubmitted] = useState(false);
  const claims = data.appearanceClaims || [];
  const numeric = (value) => value.replace(/[^0-9]/g, "");
  const submitAppearance = () => {
    if (!opponent.trim() || !playedOn.trim()) return;
    const claim = {
      id: `appearance-${Date.now()}`,
      opponent: opponent.trim(),
      playedOn: playedOn.trim(),
      minutes: Number(minutes || 0),
      goals: Number(goals || 0),
      assists: Number(assists || 0),
      matchType,
      status: "Awaiting team confirmation",
      created: "Today",
    };
    update({ appearanceClaims: [claim, ...claims] });
    setOpponent("");
    setPlayedOn("");
    setMinutes("");
    setGoals("0");
    setAssists("0");
    setSubmitted(true);
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 34 }}
      >
        <View style={s.subHeader}>
          <Pressable onPress={close} accessibilityLabel="Back to player home">
            <Ionicons name="arrow-back" size={23} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <AppText style={s.headerTitle}>ADD APPEARANCE</AppText>
            <AppText style={s.headerSub}>
              SELF-REPORTED · REVIEWED BY YOUR TEAM
            </AppText>
          </View>
        </View>
        <View style={s.appearanceIntro}>
          <Ionicons name="football-outline" size={25} color={C.gold} />
          <View style={{ flex: 1 }}>
            <AppText style={s.appearanceIntroTitle}>
              Tell us where you played.
            </AppText>
            <AppText style={s.appearanceIntroCopy}>
              Your entry appears immediately as reported by you. It becomes an
              official statistic only after a coach or opponent confirms it.
            </AppText>
          </View>
        </View>
        <View style={s.communityListSection}>
          {submitted ? (
            <View style={s.appearanceSuccess} accessibilityRole="alert">
              <Ionicons name="checkmark-circle" size={21} color={C.green} />
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>
                  Appearance sent for confirmation
                </AppText>
                <AppText style={s.meta}>
                  Your official totals have not changed yet.
                </AppText>
              </View>
            </View>
          ) : null}
          <AppText style={s.formLabel}>Opponent</AppText>
          <TextInput
            value={opponent}
            onChangeText={(value) => {
              setOpponent(value);
              setSubmitted(false);
            }}
            placeholder="e.g. Mbare City Boys"
            placeholderTextColor="#756D7D"
            style={s.formInput}
          />
          <AppText style={s.formLabel}>When did you play?</AppText>
          <DateField
            value={playedOn}
            onChange={setPlayedOn}
            maximumDate={new Date()}
            accessibilityLabel="Choose appearance date"
          />
          <ProfileChoiceGroup
            label="Match type"
            options={["Friendly", "League", "Cup"]}
            value={matchType}
            onChange={setMatchType}
          />
          <View style={s.appearanceStatInputs}>
            {[
              ["Minutes", minutes, setMinutes],
              ["Goals", goals, setGoals],
              ["Assists", assists, setAssists],
            ].map(([label, value, setter]) => (
              <View key={label} style={s.appearanceStatInput}>
                <AppText style={s.formLabel}>{label}</AppText>
                <TextInput
                  value={value}
                  onChangeText={(next) => setter(numeric(next))}
                  keyboardType="numeric"
                  style={[s.formInput, s.appearanceNumberInput]}
                  accessibilityLabel={label}
                />
              </View>
            ))}
          </View>
          <Pressable
            disabled={!opponent.trim() || !playedOn.trim()}
            onPress={submitAppearance}
            style={[
              s.saveLineupButton,
              (!opponent.trim() || !playedOn.trim()) && s.buttonDisabled,
            ]}
          >
            <Ionicons name="send-outline" size={18} color="white" />
            <AppText style={s.saveLineupText}>SEND FOR CONFIRMATION</AppText>
          </Pressable>

          {claims.length ? (
            <View style={s.appearanceHistory}>
              <AppText style={s.communitySectionTitle}>
                Your submissions
              </AppText>
              {claims.map((claim) => (
                <View key={claim.id} style={s.appearanceClaimRow}>
                  <View style={s.appearanceClaimIcon}>
                    <Ionicons name="time-outline" size={19} color={C.red} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={s.team}>vs {claim.opponent}</AppText>
                    <AppText style={s.meta}>
                      {formatStoredDate(claim.playedOn)} · {claim.minutes} min ·{" "}
                      {claim.goals} goals
                    </AppText>
                    <AppText style={s.appearanceClaimStatus}>
                      {claim.status}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AccountRoleBar({ roles, activeRole, onSwitch, onAdd, onRemove }) {
  const [mode, setMode] = useState("switch");
  const [busyRole, setBusyRole] = useState(null);
  const availableRoles = ENTRY_ROLES.map(([role]) => role).filter(
    (role) => !roles.includes(role),
  );
  const addRole = async (role) => {
    setBusyRole(role);
    try {
      await onAdd(role);
      setMode("switch");
    } catch {
      Alert.alert("Couldn’t add role", "Please try again.");
    } finally {
      setBusyRole(null);
    }
  };
  const removeRole = async (role) => {
    setBusyRole(role);
    try {
      await onRemove(role);
      setMode("switch");
    } catch {
      Alert.alert("Couldn’t remove role", "Please try again.");
    } finally {
      setBusyRole(null);
    }
  };
  const visibleRoles = mode === "add" ? availableRoles : roles;
  return (
    <View style={s.accountRoleBar}>
      <ScrollView
        style={{ flex: 1 }}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.accountRoleBarContent}
      >
        {visibleRoles.map((role) => {
          const active = role === activeRole;
          return (
            <Pressable
              key={role}
              onPress={() =>
                mode === "add"
                  ? addRole(role)
                  : mode === "remove"
                    ? removeRole(role)
                    : onSwitch(role)
              }
              disabled={Boolean(busyRole)}
              style={[s.accountRoleChoice, active && s.accountRoleChoiceActive]}
            >
              <AppText
                style={[
                  s.accountRoleChoiceText,
                  active && s.accountRoleChoiceTextActive,
                ]}
              >
                {busyRole === role
                  ? mode === "remove"
                    ? "Removing…"
                    : "Adding…"
                  : role}
              </AppText>
              {mode === "remove" ? (
                <Ionicons
                  name="close"
                  size={16}
                  color={active ? C.white : C.red}
                />
              ) : null}
            </Pressable>
          );
        })}
        <Pressable
          onPress={() =>
            setMode((current) => (current === "add" ? "switch" : "add"))
          }
          style={s.accountRoleAdd}
          accessibilityLabel={
            mode === "add" ? "Cancel adding role" : "Add another role"
          }
        >
          <Ionicons
            name={mode === "add" ? "close" : "add"}
            size={18}
            color={C.red}
          />
          <AppText style={s.accountRoleAddText}>
            {mode === "add" ? "Cancel" : "Add role"}
          </AppText>
        </Pressable>
        <Pressable
          onPress={() =>
            setMode((current) => (current === "remove" ? "switch" : "remove"))
          }
          disabled={roles.length < 2}
          style={[s.accountRoleAdd, roles.length < 2 && s.buttonDisabled]}
          accessibilityLabel={
            mode === "remove" ? "Cancel removing role" : "Remove a role"
          }
        >
          <Ionicons
            name={mode === "remove" ? "close" : "remove"}
            size={18}
            color={C.red}
          />
          <AppText style={s.accountRoleAddText}>
            {mode === "remove" ? "Cancel" : "Remove role"}
          </AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function RoleWorkspace({
  role,
  section,
  data,
  update,
  onSignOut,
  publicProfiles = [],
  onSaveProfile,
  conversations = [],
  currentUid,
  refereeAssignments = [],
  onRespondReferee,
  matches = [],
  teams = [],
  team,
  notifications = [],
  onClearNotification,
  leagues = [],
  onSponsorCompetition,
  onStartDirectChat,
}) {
  const [detail, setDetail] = useState(null);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [scoutFilter, setScoutFilter] = useState("All");
  const [selectedPrivateChat, setSelectedPrivateChat] = useState(null);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [privateChatSending, setPrivateChatSending] = useState(false);
  const [privateChatError, setPrivateChatError] = useState("");
  const [showNotificationInbox, setShowNotificationInbox] = useState(false);
  useEffect(() => {
    if (!selectedPrivateChat?.id) return undefined;
    setPrivateChatError("");
    markConversationRead(selectedPrivateChat.id, currentUid).catch(() => {});
    return subscribeConversationMessages(
      selectedPrivateChat.id,
      setPrivateMessages,
      () => {
        setPrivateMessages([]);
        setPrivateChatError(
          "Messages could not be loaded. Check your connection.",
        );
      },
    );
  }, [selectedPrivateChat?.id, currentUid]);
  useEffect(() => {
    setDetail(null);
    setSaved(false);
    setSelectedPrivateChat(null);
  }, [section]);
  const playerLike = role === "Player";
  const toggleList = (key, item) =>
    update((current) => ({
      [key]: current[key].includes(item)
        ? current[key].filter((value) => value !== item)
        : [...current[key], item],
    }));
  const pickVideo = () => choosePlayerClip(data, update);
  if (showNotificationInbox)
    return (
      <NotificationInbox
        notifications={notifications}
        onClear={onClearNotification}
        close={() => setShowNotificationInbox(false)}
      />
    );
  if (detail === "appearance")
    return (
      <PlayerAppearanceEntry
        data={data}
        update={update}
        close={() => setDetail(null)}
      />
    );
  if (detail === "profile")
    return (
      <View style={{ flex: 1 }}>
        <View style={s.subHeader}>
          <Pressable
            onPress={() => setDetail(null)}
            accessibilityRole="button"
            accessibilityLabel="Back to More"
          >
            <Ionicons name="close" size={23} color={C.ink} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <AppText style={s.headerTitle}>PROFILE</AppText>
            <AppText style={s.headerSub}>{role.toUpperCase()} ACCOUNT</AppText>
          </View>
        </View>
        <RoleProfile
          role={role}
          data={data}
          update={update}
          onSaveProfile={onSaveProfile}
        />
      </View>
    );
  if (detail === "private-chat" || section === "Chat") {
    const availableChats = conversations.filter(
      (conversation) =>
        ["team", "player", "direct"].includes(conversation.scope) &&
        conversation.archived !== true,
    );
    if (selectedPrivateChat)
      return (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={s.subHeader}>
            <Pressable onPress={() => setSelectedPrivateChat(null)}>
              <Ionicons name="arrow-back" size={23} />
            </Pressable>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <AppText style={s.headerTitle}>
                {selectedPrivateChat.title || "PRIVATE CHAT"}
              </AppText>
              <AppText style={s.headerSub}>ONLY MEMBERS CAN READ THIS</AppText>
            </View>
            {["player", "direct"].includes(selectedPrivateChat.scope) ? (
              <Pressable
                onPress={() =>
                  closeConversation(selectedPrivateChat.id, currentUid)
                    .then(() => setSelectedPrivateChat(null))
                    .catch(() =>
                      Alert.alert("Couldn’t close chat", "Please try again."),
                    )
                }
              >
                <AppText style={s.communitySeeAll}>CLOSE CHAT</AppText>
              </Pressable>
            ) : (
              <Ionicons name="lock-closed" size={17} color={C.green} />
            )}
          </View>
          {["player", "direct"].includes(selectedPrivateChat.scope) ? (
            <View style={s.chatSafetyBar}>
              <Pressable
                style={s.chatSafetyAction}
                onPress={async () => {
                  const muted =
                    selectedPrivateChat.mutedBy?.includes(currentUid);
                  await setConversationControl(
                    selectedPrivateChat.id,
                    currentUid,
                    "mute",
                    !muted,
                  );
                  setSelectedPrivateChat((current) => ({
                    ...current,
                    mutedBy: muted
                      ? (current.mutedBy || []).filter(
                          (id) => id !== currentUid,
                        )
                      : [...(current.mutedBy || []), currentUid],
                  }));
                }}
              >
                <Ionicons
                  name="notifications-off-outline"
                  size={17}
                  color={C.red}
                />
                <AppText style={s.chatSafetyText}>
                  {selectedPrivateChat.mutedBy?.includes(currentUid)
                    ? "Unmute"
                    : "Mute"}
                </AppText>
              </Pressable>
              <Pressable
                style={s.chatSafetyAction}
                onPress={() =>
                  Alert.alert(
                    selectedPrivateChat.blockedBy?.includes(currentUid)
                      ? "Unblock chat?"
                      : "Block chat?",
                    "Blocking stops new messages in this conversation.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: selectedPrivateChat.blockedBy?.includes(
                          currentUid,
                        )
                          ? "Unblock"
                          : "Block",
                        style: "destructive",
                        onPress: async () => {
                          const blocked =
                            selectedPrivateChat.blockedBy?.includes(currentUid);
                          await setConversationControl(
                            selectedPrivateChat.id,
                            currentUid,
                            "block",
                            !blocked,
                          );
                          setSelectedPrivateChat((current) => ({
                            ...current,
                            blockedBy: blocked
                              ? (current.blockedBy || []).filter(
                                  (id) => id !== currentUid,
                                )
                              : [...(current.blockedBy || []), currentUid],
                          }));
                        },
                      },
                    ],
                  )
                }
              >
                <Ionicons name="ban-outline" size={17} color={C.red} />
                <AppText style={s.chatSafetyText}>Block</AppText>
              </Pressable>
              <Pressable
                style={s.chatSafetyAction}
                onPress={() =>
                  reportConversation(
                    selectedPrivateChat.id,
                    currentUid,
                    "Conversation reported from chat controls.",
                  )
                    .then(() =>
                      Alert.alert(
                        "Report saved",
                        "It is stored privately with an audit entry. Blocking is available separately.",
                      ),
                    )
                    .catch(() =>
                      Alert.alert("Couldn’t report chat", "Please try again."),
                    )
                }
              >
                <Ionicons name="flag-outline" size={17} color={C.red} />
                <AppText style={s.chatSafetyText}>Report</AppText>
              </Pressable>
            </View>
          ) : null}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.conversationMessages}
          >
            {privateChatError ? (
              <View style={s.chatNotice}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={18}
                  color="#9C2635"
                />
                <AppText style={[s.body, { flex: 1 }]}>
                  {privateChatError}
                </AppText>
              </View>
            ) : null}
            {!privateMessages.length ? (
              <View style={s.chatEmpty}>
                <Ionicons name="chatbubble-outline" size={28} color={C.muted} />
                <AppText style={s.team}>Start the conversation</AppText>
              </View>
            ) : null}
            {privateMessages.map((message) => (
              <View
                key={message.id}
                style={[
                  s.chatBubble,
                  message.senderId === currentUid && s.chatBubbleOwn,
                ]}
              >
                <AppText
                  style={[
                    s.body,
                    message.senderId === currentUid && { color: C.white },
                  ]}
                >
                  {message.text}
                </AppText>
                <AppText
                  style={[
                    s.chatMessageTime,
                    message.senderId === currentUid && s.chatMessageTimeOwn,
                  ]}
                >
                  {formatChatTime(message.createdAt)}
                </AppText>
              </View>
            ))}
          </ScrollView>
          <View style={s.chatComposer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a message"
              placeholderTextColor={C.muted}
              style={s.chatInput}
              editable={!privateChatSending}
            />
            <Pressable
              disabled={!draft.trim() || privateChatSending}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              style={[
                s.chatSend,
                (!draft.trim() || privateChatSending) && s.buttonDisabled,
              ]}
              onPress={async () => {
                const text = draft.trim();
                if (!text || privateChatSending) return;
                setPrivateChatSending(true);
                try {
                  await sendConversationMessage(
                    selectedPrivateChat.id,
                    currentUid,
                    text,
                  );
                  setDraft("");
                } catch (error) {
                  Alert.alert(
                    "Couldn’t send message",
                    error?.message ||
                      "Please check your connection and try again.",
                  );
                } finally {
                  setPrivateChatSending(false);
                }
              }}
            >
              {privateChatSending ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Ionicons name="send" color="white" size={17} />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      );
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={s.subHeader}>
          {section !== "Chat" ? (
            <Pressable onPress={() => setDetail(null)}>
              <Ionicons name="arrow-back" size={23} />
            </Pressable>
          ) : null}
          <View style={{ marginLeft: section === "Chat" ? 0 : 14 }}>
            <AppText style={s.headerTitle}>PRIVATE CHATS</AppText>
            <AppText style={s.headerSub}>
              YOU CAN SEND AND RECEIVE MESSAGES
            </AppText>
          </View>
        </View>
        <View style={s.communityListSection}>
          {availableChats.map((conversation) => (
            <Pressable
              key={conversation.id}
              style={s.chatRow}
              onPress={() => setSelectedPrivateChat(conversation)}
            >
              <View style={s.playerAvatar}>
                <AppText style={s.playerAvatarText}>
                  {initials(conversation.title || "Chat")}
                </AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>
                  {conversation.title || "Team chat"}
                </AppText>
                <AppText style={s.meta}>
                  {conversation.lastMessage ||
                    (conversation.scope === "player"
                      ? "Private player and coach chat"
                      : conversation.scope === "direct"
                        ? "Private football conversation"
                        : "Team chat")}
                </AppText>
              </View>
              {conversationIsUnread(conversation, currentUid) ? (
                <View style={s.unreadBadge} />
              ) : (
                <Ionicons name="lock-closed" size={15} color={C.green} />
              )}
            </Pressable>
          ))}
          {!availableChats.length ? (
            <View style={s.emptyState}>
              <Ionicons name="chatbubbles-outline" size={28} color={C.muted} />
              <AppText style={s.team}>No chat is available yet</AppText>
              <AppText style={s.body}>
                Your coach will open one when you join a team.
              </AppText>
            </View>
          ) : null}
        </View>
      </ScrollView>
    );
  }
  if (detail === "chat")
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={s.subHeader}>
          <Pressable onPress={() => setDetail(null)}>
            <Ionicons name="arrow-back" size={23} />
          </Pressable>
          <View style={{ marginLeft: 14 }}>
            <AppText style={s.headerTitle}>TEAM CHAT</AppText>
            <AppText style={s.headerSub}>{data.club || "NO CLUB YET"}</AppText>
          </View>
        </View>
        <View style={s.communityListSection}>
          {data.messages.length ? (
            data.messages.map((message, index) => (
              <View key={`${message}-${index}`} style={s.chatBubble}>
                <AppText style={s.body}>{message}</AppText>
              </View>
            ))
          ) : (
            <View style={s.emptyState}>
              <Ionicons name="chatbubbles-outline" size={28} color={C.muted} />
              <AppText style={s.team}>No messages yet</AppText>
            </View>
          )}
          <View style={s.chatComposer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Message the team"
              style={s.chatInput}
            />
            <Pressable
              disabled={!draft.trim()}
              onPress={() => {
                update((current) => ({
                  messages: [...current.messages, `You: ${draft.trim()}`],
                  chatRead: true,
                }));
                setDraft("");
              }}
              style={[s.roleMiniButton, !draft.trim() && s.buttonDisabled]}
            >
              <Ionicons name="send" color="white" size={17} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    );
  if (section === "Chat")
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <RoleHeader role={role} title="Messages and appointments" />
        <View style={s.communityListSection}>
          <Pressable style={s.menu} onPress={() => setDetail("private-chat")}>
            <View style={s.utilityIcon}>
              <Ionicons name="chatbubbles-outline" size={21} color={C.red} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={s.team}>Private chats</AppText>
              <AppText style={s.meta}>
                Team messages and recruitment conversations
              </AppText>
            </View>
            <AppText style={s.bestMatch}>
              {conversations.filter((item) => item.archived !== true).length}
            </AppText>
          </Pressable>
          <AppText style={s.settingsGroupTitle}>APPOINTMENT UPDATES</AppText>
          {notifications.map((notification) => (
            <View style={s.requestRow} key={notification.id}>
              <View style={s.utilityIcon}>
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={C.red}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>{notification.title}</AppText>
                <AppText style={s.body}>{notification.body}</AppText>
              </View>
              <Pressable onPress={() => onClearNotification?.(notification)}>
                <Ionicons
                  name="close-circle-outline"
                  size={21}
                  color={C.muted}
                />
              </Pressable>
            </View>
          ))}
          {!notifications.length ? (
            <View style={s.emptyState}>
              <Ionicons name="mail-open-outline" size={28} color={C.muted} />
              <AppText style={s.team}>No appointment updates</AppText>
              <AppText style={s.body}>
                Referee appointment news will appear here.
              </AppText>
            </View>
          ) : null}
        </View>
      </ScrollView>
    );
  if (section === "Appointments" && role === "Referee")
    return (
      <RefereeAssignments
        data={data}
        update={update}
        assignments={refereeAssignments.filter(
          (assignment) =>
            assignment.refereeId === currentUid &&
            assignment.status !== "team_confirmation",
        )}
        onRespond={onRespondReferee}
      />
    );
  if (section === "Games" || section === "Matches")
    return (
      <CommunityMatches
        team={team}
        matches={matches}
        teams={teams}
        publicProfiles={publicProfiles}
        currentUid={currentUid}
      />
    );
  if (section === "History")
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <RoleHeader role={role} title="Games refereed" />
        <View style={s.communityListSection}>
          <View style={s.emptyState}>
            <Ionicons name="time-outline" size={30} color={C.muted} />
            <AppText style={s.team}>No history yet</AppText>
            <AppText style={s.body}>
              Completed appointments will appear here.
            </AppText>
          </View>
        </View>
      </ScrollView>
    );
  if (section === "Campaigns")
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <RoleHeader role={role} title="Sponsorship campaigns" />
        <View style={s.communityListSection}>
          <AppText style={s.settingsGroupTitle}>TEAMS TO SUPPORT</AppText>
          {prioritizeByLocation(teams, data.area)
            .slice(0, 8)
            .map((candidate) => (
              <View style={s.teamDiscoveryRow} key={candidate.id}>
                <CrestPreview
                  shape={candidate.crest?.shape || 0}
                  color={candidate.crest?.color || C.redDark}
                  label={candidate.crest?.label || initials(candidate.name)}
                  small
                />
                <View style={{ flex: 1 }}>
                  <AppText style={s.team}>{candidate.name}</AppText>
                  <AppText style={s.meta}>
                    {candidate.area || "Area not added"}
                  </AppText>
                </View>
                <Pressable
                  style={s.join}
                  onPress={() =>
                    onStartDirectChat?.({
                      ownerId: candidate.ownerId,
                      name: candidate.name,
                    })
                  }
                >
                  <AppText style={s.buttonText}>MESSAGE</AppText>
                </Pressable>
              </View>
            ))}
          <AppText style={s.settingsGroupTitle}>PLAYERS TO SUPPORT</AppText>
          {publicProfiles
            .filter((profile) => profile.role === "Player")
            .slice(0, 8)
            .map((profile) => {
              const watched = (data.watchlist || []).includes(profile.id);
              return (
                <PersonSearchCard
                  key={`sponsor-${profile.id}`}
                  profile={profile}
                  status={watched ? "ON YOUR WATCHLIST" : "PLAYER PROFILE"}
                  teamName={profile.club || ""}
                  action={
                    <Pressable
                      style={[
                        s.roleMiniButton,
                        watched && s.roleMiniButtonDone,
                      ]}
                      onPress={() => toggleList("watchlist", profile.id)}
                    >
                      <AppText style={s.roleMiniButtonText}>
                        {watched ? "REMOVE" : "WATCH"}
                      </AppText>
                    </Pressable>
                  }
                  secondaryAction={
                    <Pressable
                      style={s.outlineButton}
                      onPress={() => onStartDirectChat?.(profile)}
                    >
                      <AppText style={s.buttonText}>MESSAGE</AppText>
                    </Pressable>
                  }
                />
              );
            })}
          <AppText style={s.settingsGroupTitle}>OTHER SPONSORS</AppText>
          {publicProfiles
            .filter(
              (profile) =>
                profile.role === "Sponsor" && profile.ownerId !== currentUid,
            )
            .map((profile) => (
              <PersonSearchCard
                key={profile.id}
                profile={profile}
                status="SPONSOR PROFILE"
                teamName={profile.organization || profile.sector || ""}
              />
            ))}
          <AppText style={s.settingsGroupTitle}>
            TOURNAMENT OPPORTUNITIES
          </AppText>
          {leagues.map((league) => {
            const proposed = data.proposals.includes(league.id);
            return (
              <View style={s.roleFixture} key={league.id}>
                <AppText style={s.assignmentTeams}>{league.name}</AppText>
                <AppText style={s.body}>
                  {league.competitionType} · {league.maxSponsors || 0} sponsor
                  places
                </AppText>
                <AppText style={s.meta}>
                  {league.preferAppCreators
                    ? "Grassroots sponsors reviewed first"
                    : "Open sponsorship review"}
                </AppText>
                <Pressable
                  disabled={proposed}
                  style={[s.saveLineupButton, proposed && s.buttonDisabled]}
                  onPress={() => {
                    onSponsorCompetition?.(league);
                    update({
                      proposals: [...new Set([...data.proposals, league.id])],
                    });
                  }}
                >
                  <AppText style={s.saveLineupText}>
                    {proposed ? "PROPOSAL SENT" : "SPONSOR TOURNAMENT"}
                  </AppText>
                </Pressable>
              </View>
            );
          })}
          {!leagues.length ? (
            <View style={s.emptyState}>
              <Ionicons name="heart-outline" size={30} color={C.muted} />
              <AppText style={s.team}>No campaigns yet</AppText>
            </View>
          ) : null}
        </View>
      </ScrollView>
    );
  if (section === "Players" || section === "Watchlist") {
    const availablePlayers = prioritizeByLocation(
      publicProfiles.filter(
        (profile) =>
          profile.role === "Player" &&
          (section !== "Watchlist" || data.watchlist.includes(profile.id)),
      ),
      data.area,
    );
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <RoleHeader
          role={role}
          title={
            section === "Watchlist" ? "Your watchlist" : "Players to watch"
          }
        />
        <View style={s.communityListSection}>
          {section === "Watchlist" ? (
            <Pressable style={s.menu} onPress={() => setDetail("private-chat")}>
              <View style={s.utilityIcon}>
                <Ionicons name="chatbubbles-outline" size={21} color={C.red} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>Private chats</AppText>
                <AppText style={s.meta}>
                  Continue conversations with players and teams
                </AppText>
              </View>
              <AppText style={s.bestMatch}>
                {conversations.filter((item) => item.archived !== true).length}
              </AppText>
            </Pressable>
          ) : null}
          {availablePlayers.map((profile) => {
            const watched = data.watchlist.includes(profile.id);
            return (
              <PersonSearchCard
                key={profile.id}
                profile={profile}
                status={watched ? "ON YOUR WATCHLIST" : "AVAILABLE TO WATCH"}
                teamName={profile.club || ""}
                action={
                  <Pressable
                    onPress={() => toggleList("watchlist", profile.id)}
                    style={[s.roleMiniButton, watched && s.roleMiniButtonDone]}
                  >
                    <AppText style={s.roleMiniButtonText}>
                      {watched ? "REMOVE" : "SAVE"}
                    </AppText>
                  </Pressable>
                }
                secondaryAction={
                  <Pressable
                    style={s.outlineButton}
                    onPress={() => onStartDirectChat?.(profile)}
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={17}
                      color={C.red}
                    />
                    <AppText style={s.buttonText}>MESSAGE</AppText>
                  </Pressable>
                }
              />
            );
          })}
          {!availablePlayers.length ? (
            <View style={s.emptyState}>
              <Ionicons name="people-outline" size={30} color={C.muted} />
              <AppText style={s.team}>
                {section === "Watchlist"
                  ? "Your watchlist is empty"
                  : "No players yet"}
              </AppText>
              <AppText style={s.body}>
                {section === "Watchlist"
                  ? "Players you save will appear here."
                  : "Verified player profiles will appear here."}
              </AppText>
            </View>
          ) : null}
        </View>
      </ScrollView>
    );
  }
  if (section === "Teams" && playerLike)
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <RoleHeader role={role} title="Teams and training" />
        <View style={s.communityListSection}>
          <View style={s.emptyState}>
            <Ionicons name="shield-outline" size={30} color={C.muted} />
            <AppText style={s.team}>No team connected</AppText>
            <AppText style={s.body}>
              Teams and open training sessions will appear here.
            </AppText>
          </View>
        </View>
      </ScrollView>
    );
  if (section === "Games" || section === "Matches") {
    const match = "Avondale Social vs Mbare City Boys";
    const active =
      role === "Referee"
        ? data.volunteered.includes(match)
        : role === "Sponsor"
          ? data.interests.includes(match)
          : role === "Scout"
            ? data.attending.includes(match)
            : data.rsvp;
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <RoleHeader role={role} title="Upcoming matches" />
        <View style={s.communityListSection}>
          <View style={s.roleFixture}>
            <AppText style={s.meta}>SUNDAY · 10:00 · BELGRAVIA</AppText>
            <AppText style={s.assignmentTeams}>{match}</AppText>
            <AppText style={s.body}>Harare Social League · Round 7</AppText>
            <Pressable
              onPress={() =>
                role === "Referee"
                  ? toggleList("volunteered", match)
                  : role === "Sponsor"
                    ? toggleList("interests", match)
                    : role === "Scout"
                      ? toggleList("attending", match)
                      : update({ rsvp: !data.rsvp })
              }
              style={[s.saveLineupButton, active && s.saveLineupButtonSaved]}
            >
              <AppText style={s.saveLineupText}>
                {active
                  ? role === "Player"
                    ? "PLAYING"
                    : "INTEREST SENT"
                  : role === "Referee"
                    ? "VOLUNTEER TO REFEREE"
                    : role === "Sponsor"
                      ? "SPONSOR THIS MATCH"
                      : role === "Scout"
                        ? "ADD TO SCOUTING PLAN"
                        : "CONFIRM AVAILABILITY"}
              </AppText>
            </Pressable>
            {role === "Referee" ? (
              <AppText style={s.formHelp}>
                Transport support is discussed privately after appointment.
              </AppText>
            ) : null}
          </View>
          <AppText style={s.settingsGroupTitle}>LEAGUE TABLE</AppText>
          {[
            ["1", "Mbare City Boys", "16"],
            ["2", "Greendale Social", "14"],
            ["3", "Avondale Social", "12"],
          ].map((row) => (
            <View key={row[1]} style={s.tableRow}>
              <AppText style={s.tablePos}>{row[0]}</AppText>
              <AppText style={[s.team, { flex: 1 }]}>{row[1]}</AppText>
              <AppText style={s.tablePts}>{row[2]} PTS</AppText>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }
  if (section === "Teams" && playerLike) {
    const sessions = [
      {
        team: "Greendale Social",
        time: "Tuesday · 17:30",
        ground: "Greendale Sports Club",
        access: "Open",
      },
      {
        team: "Mbare City Boys",
        time: "Thursday · 16:30",
        ground: "Stodart Hall Ground",
        access: "Restricted",
      },
    ];
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <RoleHeader role={role} title="Teams & training" />
        <View style={s.communityListSection}>
          {!data.club ? (
            <RoleAction
              icon="shield-outline"
              title="Request Avondale Social"
              copy={
                data.requestedClub
                  ? "Club request sent"
                  : "Ask the coach to review your profile"
              }
              action={() => update({ requestedClub: !data.requestedClub })}
              label={data.requestedClub ? "SENT" : "REQUEST"}
              complete={data.requestedClub}
            />
          ) : (
            <RoleAction
              icon="checkmark-circle"
              title={data.club}
              copy="Your registered club"
              complete
            />
          )}
          <View style={s.profilePrivacyNote}>
            <Ionicons name="walk-outline" size={21} color={C.red} />
            <AppText style={[s.body, { flex: 1 }]}>
              Open training needs no request. Approval is only used when a
              ground or session has restricted access.
            </AppText>
          </View>
          {sessions.map(({ team, time, ground, access }) => {
            const requested = data.training.includes(team);
            const restricted = access === "Restricted";
            return (
              <RoleAction
                key={team}
                icon="fitness-outline"
                title={team}
                copy={`${access} training · ${time} · ${ground}`}
                action={() => toggleList("training", team)}
                label={
                  requested
                    ? restricted
                      ? "REQUESTED"
                      : "GOING"
                    : restricted
                      ? "REQUEST"
                      : "ATTEND"
                }
                complete={requested}
              />
            );
          })}
          {data.club ? (
            <>
              <RoleAction
                icon="chatbubbles-outline"
                title="Team chat"
                copy={data.chatRead ? "Up to date" : "1 unread message"}
                action={() => {
                  update({ chatRead: true });
                  setDetail("private-chat");
                }}
                label="OPEN"
              />
              <RoleAction
                icon="videocam-outline"
                title="30-second evidence clips"
                copy={`${data.videos.length}/8 clips in your international player CV`}
                action={pickVideo}
                label="ADD"
              />
            </>
          ) : null}
        </View>
      </ScrollView>
    );
  }
  if (section === "History")
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <RoleHeader role={role} title="Games refereed" />
        <View style={s.communityListSection}>
          {[
            [
              "Avondale 3 : 1 Greendale",
              "Clear communication and good control",
            ],
            ["Mbare 2 : 2 Seke XI", "Handled a difficult finish calmly"],
          ].map(([game, comment]) => (
            <View key={game} style={s.roleHistoryRow}>
              <Ionicons name="checkmark-circle" color={C.green} size={21} />
              <View style={{ flex: 1 }}>
                <AppText style={s.team}>{game}</AppText>
                <AppText style={s.meta}>{comment}</AppText>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  if (section === "Campaigns")
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <RoleHeader role={role} title="Sponsorship campaigns" />
        <View style={s.communityListSection}>
          <View style={s.profilePrivacyNote}>
            <Ionicons name="analytics-outline" size={21} color={C.red} />
            <AppText style={[s.body, { flex: 1 }]}>
              Every opportunity states the rights, cost range and evidence the
              organiser must return.
            </AppText>
          </View>
          {[
            {
              id: "youth-cup",
              title: "Harare Youth Cup",
              scope: "8 teams · 3 matchdays · U18",
              ask: "USD 250 to 500",
              rights: "Kit branding · matchday mentions",
              report: "Attendance, clips, delivery photos",
            },
            {
              id: "women-series",
              title: "Women’s Community Series",
              scope: "6 teams · 5 matchdays",
              ask: "USD 400 to 800",
              rights: "Naming rights · digital content",
              report: "Participation, reach, player stories",
            },
            {
              id: "ground-lights",
              title: "Mbare Ground Lights",
              scope: "Safe evening training · 4 clubs",
              ask: "USD 900 to 1,400",
              rights: "Ground board · launch event",
              report: "Training hours, teams served, receipts",
            },
          ].map((campaign) => {
            const proposed = data.proposals.includes(campaign.id);
            return (
              <View key={campaign.id} style={s.roleFixture}>
                <AppText style={s.meta}>VERIFIED COMMUNITY OPPORTUNITY</AppText>
                <AppText style={s.assignmentTeams}>{campaign.title}</AppText>
                <AppText style={s.body}>{campaign.scope}</AppText>
                <View style={s.settingRow}>
                  <AppText style={s.meta}>INVESTMENT</AppText>
                  <AppText style={s.team}>{campaign.ask}</AppText>
                </View>
                <View style={s.settingRow}>
                  <AppText style={s.meta}>RIGHTS</AppText>
                  <AppText
                    style={[s.team, { maxWidth: "62%", textAlign: "right" }]}
                  >
                    {campaign.rights}
                  </AppText>
                </View>
                <View style={s.settingRow}>
                  <AppText style={s.meta}>REPORT BACK</AppText>
                  <AppText
                    style={[s.team, { maxWidth: "62%", textAlign: "right" }]}
                  >
                    {campaign.report}
                  </AppText>
                </View>
                <Pressable
                  onPress={() =>
                    data.safeguardingAccepted
                      ? update({
                          proposals: proposed
                            ? data.proposals.filter(
                                (item) => item !== campaign.id,
                              )
                            : [...data.proposals, campaign.id],
                        })
                      : Alert.alert(
                          "Responsible activation pledge",
                          "Open Profile and accept the safeguarding and community-data pledge before starting a proposal.",
                        )
                  }
                  style={[
                    s.saveLineupButton,
                    proposed && s.saveLineupButtonSaved,
                    !data.safeguardingAccepted && s.buttonDisabled,
                  ]}
                >
                  <AppText style={s.saveLineupText}>
                    {!data.safeguardingAccepted
                      ? "ACCEPT PLEDGE IN PROFILE"
                      : proposed
                        ? "PROPOSAL STARTED"
                        : "START PROPOSAL"}
                  </AppText>
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  if (section === "Players" || section === "Watchlist")
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <RoleHeader
          role={role}
          title={
            section === "Watchlist" ? "Your watchlist" : "Players to watch"
          }
        />
        <View style={s.communityListSection}>
          {section === "Players" ? (
            <ProfileChoiceGroup
              label="Profile filter"
              options={["All", "U18", "U23", "Women", "Forward"]}
              value={scoutFilter}
              onChange={setScoutFilter}
            />
          ) : null}
          {[
            {
              name: "Takudzwa Nhamo",
              age: "23",
              group: "U23",
              position: "Forward",
              foot: "Right",
              club: "Avondale Social",
              record: "18 apps · 11 goals · 5 assists",
              clips: 4,
            },
            {
              name: "Tafadzwa Mupfumi",
              age: "18",
              group: "U18",
              position: "Midfielder",
              foot: "Left",
              club: "Greendale Social",
              record: "14 apps · 3 goals · 8 assists",
              clips: 3,
            },
            {
              name: "Tawanda Ncube",
              age: "22",
              group: "U23",
              position: "Defender",
              foot: "Right",
              club: "Mbare City Boys",
              record: "17 apps · 10 clean sheets",
              clips: 2,
            },
            {
              name: "Ruvimbo Dube",
              age: "20",
              group: "Women",
              position: "Forward",
              foot: "Both",
              club: "Harare Queens",
              record: "12 apps · 9 goals · 4 assists",
              clips: 5,
            },
          ]
            .filter(
              (player) =>
                (section !== "Watchlist" ||
                  data.watchlist.includes(player.name)) &&
                (scoutFilter === "All" ||
                  player.group === scoutFilter ||
                  player.position === scoutFilter),
            )
            .map((player) => {
              const watched = data.watchlist.includes(player.name);
              return (
                <View key={player.name} style={s.roleFixture}>
                  <View style={s.scoutReportHead}>
                    <AppText style={s.communityStatus}>
                      VERIFIED MATCH DATA
                    </AppText>
                    <AppText style={s.meta}>{player.clips} CLIPS</AppText>
                  </View>
                  <AppText style={s.assignmentTeams}>{player.name}</AppText>
                  <AppText style={s.body}>
                    {player.position} ·{" "}
                    {player.foot === "Both"
                      ? "Both feet"
                      : `${player.foot} foot`}{" "}
                    · age {player.age}
                  </AppText>
                  <AppText style={s.meta}>
                    {player.club} · {player.record}
                  </AppText>
                  <View style={s.profileAddRow}>
                    <Pressable
                      onPress={() =>
                        Alert.alert(
                          `${player.name} · Player CV`,
                          `${player.position} · ${player.foot} foot\n${player.club}\n${player.record}\n${player.clips} evidence clips available`,
                        )
                      }
                      style={[s.outlineButton, { flex: 1, marginTop: 0 }]}
                    >
                      <AppText style={s.buttonText}>REVIEW CV</AppText>
                    </Pressable>
                    <Pressable
                      onPress={() => toggleList("watchlist", player.name)}
                      style={[
                        s.roleMiniButton,
                        watched && s.roleMiniButtonDone,
                      ]}
                    >
                      <AppText style={s.roleMiniButtonText}>
                        {watched ? "SAVED" : "SAVE"}
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          {section === "Watchlist" && !data.watchlist.length ? (
            <View style={s.emptyState}>
              <AppText style={s.team}>Your watchlist is empty</AppText>
              <AppText style={s.meta}>
                Save players from the Players tab.
              </AppText>
            </View>
          ) : null}
        </View>
      </ScrollView>
    );
  if (section === "Profile")
    return (
      <RoleProfile
        role={role}
        data={data}
        update={update}
        onSaveProfile={onSaveProfile}
      />
    );
  if (false && section === "Profile")
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <RoleHeader role={role} title={`${role} profile`} />
        <View style={s.communityListSection}>
          <AppText style={s.formLabel}>Name</AppText>
          <TextInput
            value={data.name}
            onChangeText={(name) => {
              update({ name });
              setSaved(false);
            }}
            placeholder="Your full name"
            style={s.formInput}
          />
          {playerLike ? (
            <>
              <AppText style={s.formLabel}>Position</AppText>
              <View style={s.optionWrap}>
                {["Goalkeeper", "Defender", "Midfielder", "Forward"].map(
                  (position) => (
                    <Pressable
                      key={position}
                      onPress={() => update({ position })}
                      style={[
                        s.formChoice,
                        data.position === position && s.formChoiceActive,
                      ]}
                    >
                      <AppText
                        style={[
                          s.formChoiceText,
                          data.position === position && s.formChoiceTextActive,
                        ]}
                      >
                        {position}
                      </AppText>
                    </Pressable>
                  ),
                )}
              </View>
              <Pressable onPress={pickVideo} style={s.outlineButton}>
                <Ionicons name="videocam-outline" size={18} color={C.red} />
                <AppText style={s.buttonText}>Choose football video</AppText>
              </Pressable>
              {data.videos.map((video, index) => (
                <View key={`${video.uri}-${index}`} style={s.videoRow}>
                  <Ionicons name="play-circle" size={25} color={C.red} />
                  <View style={{ flex: 1 }}>
                    <AppText style={s.team}>{video.name}</AppText>
                    <AppText style={s.meta}>Ready on this device</AppText>
                  </View>
                  <Pressable
                    onPress={() =>
                      update((current) => ({
                        videos: current.videos.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      }))
                    }
                  >
                    <Ionicons name="trash-outline" size={20} color={C.muted} />
                  </Pressable>
                </View>
              ))}
            </>
          ) : null}
          <Pressable
            disabled={!data.name.trim()}
            onPress={() => setSaved(true)}
            style={[
              s.saveLineupButton,
              saved && s.saveLineupButtonSaved,
              !data.name.trim() && s.buttonDisabled,
            ]}
          >
            <AppText style={s.saveLineupText}>
              {saved ? "PROFILE SAVED" : "SAVE PROFILE"}
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    );
  if (section === "More")
    return (
      <View style={s.roleMorePage}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 12 }}
        >
          <RoleHeader role={role} title="Account & tools" />
          <View style={s.communityListSection}>
          <RoleAction
            icon="person-circle-outline"
            title={`${role} profile`}
            copy="View or update your public football information"
            action={() => setDetail("profile")}
            label="OPEN"
          />
          {playerLike ? (
            <>
              <RoleAction
                icon="videocam-outline"
                title="Football videos"
                copy={`${data.videos.length} saved on this device`}
                action={pickVideo}
                label="ADD"
              />
            </>
          ) : null}
          {role === "Referee" ? (
            <RoleAction
              icon="card-outline"
              title="Referee subscription"
              copy={
                data.subscribed
                  ? "Active until 22 August"
                  : "Required to remain available for appointments"
              }
              action={() => update({ subscribed: !data.subscribed })}
              label={data.subscribed ? "ACTIVE" : "ACTIVATE"}
              complete={data.subscribed}
            />
          ) : null}
          {role === "Sponsor" ? (
            <RoleAction
              icon="heart-outline"
              title="Sponsorship brief"
              copy={`${data.sponsorTypes.length} opportunity types · USD ${data.budget || "0"} typical budget`}
              action={() =>
                Alert.alert(
                  "Sponsorship brief",
                  data.sponsorTypes.length
                    ? data.sponsorTypes.join(", ")
                    : "Add sponsorship interests from Profile.",
                )
              }
              label="VIEW"
            />
          ) : null}
          {role === "Scout" ? (
            <RoleAction
              icon="bookmark-outline"
              title="Private watchlist"
              copy={`${data.watchlist.length} saved players`}
              action={() =>
                Alert.alert(
                  "Private watchlist",
                  data.watchlist.length
                    ? data.watchlist.join("\n")
                    : "No saved players yet.",
                )
              }
              label="VIEW"
            />
          ) : null}
          </View>
        </ScrollView>
        <View style={s.roleMoreFooter}>
          <SignOutAction onSignOut={onSignOut} compact />
          <Icons8Credit />
        </View>
      </View>
    );
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
      <BrandHeader
        title={role.toUpperCase()}
        notificationCount={notifications.filter((item) => !item.read).length}
        onNotifications={() => setShowNotificationInbox(true)}
      />
      <View style={s.roleHomeHero}>
        <AppText style={s.roleHomeTitle}>
          {playerLike
            ? data.club
              ? `Ready for ${data.club}.`
              : "Find your football."
            : role === "Referee"
              ? "Keep the game fair."
              : role === "Sponsor"
                ? "Back local football."
                : "Find the next player."}
        </AppText>
        <AppText style={s.roleHomeCopy}>
          {playerLike
            ? "Games, training, club requests and your verified playing record."
            : role === "Referee"
              ? "Appointments, volunteering and your refereeing record."
              : role === "Sponsor"
                ? "Upcoming matches and transparent local opportunities."
                : "Fixtures, verified players and a private watchlist."}
        </AppText>
      </View>
      <View style={s.communityListSection}>
        <AppText style={s.communitySectionTitle}>Next actions</AppText>
        {playerLike ? (
          <>
            <View style={s.playerNextActions}>
              <RoleAction
                icon="videocam-outline"
                title="30-second evidence clips"
                copy={`${data.videos.length}/8 clips in your international player CV`}
                action={pickVideo}
                label="ADD"
                style={s.playerNextActionItem}
              />
              <RoleAction
                icon="add-circle-outline"
                title="Add an appearance"
                copy={
                  (data.appearanceClaims || []).length
                    ? `${data.appearanceClaims.length} awaiting team confirmation`
                    : "Log a match you played outside the app"
                }
                action={() => setDetail("appearance")}
                label="ADD"
                style={s.playerNextActionItem}
              />
            </View>
            <View style={s.playerMetricRow}>
              {[
                [data.appearances, "MATCHES"],
                [data.goals, "GOALS"],
                [data.assists, "ASSISTS"],
                [
                  Number(data.yellowCards || 0) + Number(data.redCards || 0),
                  "CARDS",
                ],
              ].map(([value, label]) => (
                <View key={label} style={s.playerMetric}>
                  <AppText style={s.playerMetricValue}>{value}</AppText>
                  <AppText style={s.playerMetricLabel}>{label}</AppText>
                </View>
              ))}
            </View>
          </>
        ) : role === "Referee" ? (
          <>
            <RoleAction
              icon="calendar-outline"
              title="Referee requests"
              copy={
                data.availability
                  ? "Teams can find and request you for upcoming matches."
                  : "Your profile stays saved, but teams cannot request you."
              }
              action={() => update({ availability: !data.availability })}
              label={data.availability ? "ACCEPTING" : "PAUSED"}
              complete={data.availability}
            />
          </>
        ) : role === "Sponsor" ? (
          <View style={s.emptyState}>
            <Ionicons name="heart-outline" size={30} color={C.muted} />
            <AppText style={s.team}>No opportunities yet</AppText>
            <AppText style={s.body}>
              Verified sponsorship opportunities will appear here.
            </AppText>
          </View>
        ) : (
          <View style={s.emptyState}>
            <Ionicons name="eye-outline" size={30} color={C.muted} />
            <AppText style={s.team}>Nothing to scout yet</AppText>
            <AppText style={s.body}>
              Verified players and fixtures will appear here.
            </AppText>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function App() {
  const [tab, setTab] = useState("Home");
  const [teamFinderRequested, setTeamFinderRequested] = useState(false);
  const [authSession, setAuthSession] = useState(undefined);
  const [authOpen, setAuthOpen] = useState(false);
  const [cloudHydratedUid, setCloudHydratedUid] = useState(null);
  const [userRole, setUserRole, roleHydrated] = usePersistentState(
    "friendlies-active-role-v4",
    null,
  );
  const [roleData, setRoleData, dataHydrated] = usePersistentState(
    "friendlies-personal-profiles-v4",
    initialRoleData,
  );
  const [activeTeamId, setActiveTeamId, teamHydrated] = usePersistentState(
    "friendlies-active-team-v4",
    null,
  );
  const [activeTeam, setActiveTeam] = useState(null);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [playerAssignments, setPlayerAssignments] = useState([]);
  const [discoverableTeams, setDiscoverableTeams] = useState([]);
  const [availabilityPosts, setAvailabilityPosts] = useState([]);
  const [teamJoinRequests, setTeamJoinRequests] = useState([]);
  const [teamChallenges, setTeamChallenges] = useState([]);
  const [confirmedMatches, setConfirmedMatches] = useState([]);
  const [matchReviews, setMatchReviews] = useState([]);
  const [refereeAssignments, setRefereeAssignments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [matchChatRepairing, setMatchChatRepairing] = useState(false);
  const [matchChatRepairFailed, setMatchChatRepairFailed] = useState(false);
  const [matchChatRepairVersion, setMatchChatRepairVersion] = useState(0);
  const [leagues, setLeagues] = useState([]);
  const [communityGrounds, setCommunityGrounds] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const mutationFlights = useRef(new Map());
  const [sharedLeagueId, setSharedLeagueId] = useState(null);
  const [ready, setReady] = useState(false);
  const [fontsLoaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    Archivo_900Black,
  });
  useEffect(() => {
    const handleLeagueLink = (url) => {
      const match = url?.match(/[?&]league=([^&]+)/);
      if (!match) return;
      setSharedLeagueId(decodeURIComponent(match[1]));
      setTab("More");
    };
    Linking.getInitialURL()
      .then(handleLeagueLink)
      .catch(() => {});
    const subscription = Linking.addEventListener("url", ({ url }) =>
      handleLeagueLink(url),
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    Promise.all(
      [
        "friendlies-active-role-v1",
        "friendlies-role-data-v1",
        "friendlies-coach-availability-v1",
        "friendlies-web-users-v1",
        "friendlies-session-v1",
        "friendlies-active-role-v2",
        "friendlies-role-data-v2",
        "friendlies-coach-availability-v2",
        "friendlies-active-role-v3",
        "friendlies-personal-profiles-v3",
        "friendlies-active-team-v3",
      ].map((key) => AsyncStorage.removeItem(key)),
    ).catch(() => {});
  }, []);
  useEffect(() => {
    const assets = [
      require("./assets/grassroots-kickoff.png"),
      ...APP_ICON_ASSETS,
      ...Object.values(clubLogos),
      require("./assets/dynamos-match.jpg"),
      ...signingNews.map((n) => n.image),
    ];
    Promise.all([
      Asset.loadAsync(assets),
      new Promise((r) => setTimeout(r, 900)),
    ]).finally(() => setReady(true));
  }, []);
  useEffect(() => {
    let active = true;
    initializeDatabase()
      .then(getCurrentSession)
      .then((session) => active && setAuthSession(session))
      .catch(() => active && setAuthSession(null));
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!roleHydrated || authSession !== null || !userRole) return;
    createGuestSession(userRole)
      .then(setAuthSession)
      .catch(() => {});
  }, [authSession, roleHydrated, userRole]);
  useEffect(() => {
    if (!authSession || userRole || authSession.type !== "account") return;
    const sessionRole = authSession.user.role;
    if (sessionRole) setUserRole(sessionRole);
  }, [authSession, setUserRole, userRole]);
  useEffect(() => {
    if (
      !firebaseConfigured ||
      !roleHydrated ||
      !dataHydrated ||
      !teamHydrated ||
      !authSession
    )
      return;
    const uid =
      authSession.type === "account" ? authSession.user.id : authSession.id;
    if (!uid) return;
    let active = true;
    setCloudHydratedUid(null);
    loadUserWorkspace(uid)
      .then((workspace) => {
        if (!active) return;
        if (workspace?.personalProfiles)
          setRoleData((current) => ({
            ...current,
            ...workspace.personalProfiles,
          }));
        if (workspace?.activeRole) setUserRole(workspace.activeRole);
        if (workspace?.activeTeamId) setActiveTeamId(workspace.activeTeamId);
      })
      .catch(() => {})
      .finally(() => active && setCloudHydratedUid(uid));
    return () => {
      active = false;
    };
  }, [
    authSession,
    dataHydrated,
    roleHydrated,
    teamHydrated,
    setRoleData,
    setUserRole,
  ]);
  useEffect(() => {
    if (!firebaseConfigured || !cloudHydratedUid) return;
    const saveTimer = setTimeout(() => {
      saveUserWorkspace(cloudHydratedUid, {
        activeRole: userRole,
        personalProfiles: roleData,
        activeTeamId,
      }).catch(() => {});
    }, 750);
    return () => clearTimeout(saveTimer);
  }, [activeTeamId, cloudHydratedUid, roleData, userRole]);
  useEffect(() => {
    if (!cloudHydratedUid) return;
    let active = true;
    Promise.all([
      loadPublicProfiles(),
      loadDiscoverableTeams(),
      loadAvailabilityPosts(),
      loadUserTeamMemberships(cloudHydratedUid),
      loadTeamJoinRequests(cloudHydratedUid),
      loadTeamChallenges(cloudHydratedUid),
      loadNotifications(cloudHydratedUid),
      loadLeagueRecords(),
      loadPlayerAssignments(),
      loadCommunityGrounds(),
      loadOpportunities(),
      loadMatchReviews(),
    ])
      .then(
        ([
          profiles,
          teams,
          posts,
          memberships,
          joinRequests,
          challenges,
          savedNotifications,
          savedLeagues,
          savedPlayerAssignments,
          savedGrounds,
          savedOpportunities,
          savedMatchReviews,
        ]) => {
          if (!active) return;
          setPublicProfiles(profiles);
          setDiscoverableTeams(teams);
          setAvailabilityPosts(posts);
          setTeamJoinRequests(joinRequests);
          setTeamChallenges(challenges);
          setNotifications(savedNotifications);
          setLeagues(savedLeagues);
          setPlayerAssignments(savedPlayerAssignments);
          setCommunityGrounds(savedGrounds);
          setOpportunities(savedOpportunities);
          setMatchReviews(savedMatchReviews);
          const membership = memberships.find(
            (item) => item.status === "active" && item.teamId,
          );
          if (membership && !activeTeamId) setActiveTeamId(membership.teamId);
        },
      )
      .catch(() => {
        if (!active) return;
        setPublicProfiles([]);
        setDiscoverableTeams([]);
      });
    return () => {
      active = false;
    };
  }, [cloudHydratedUid, activeTeamId, setActiveTeamId]);
  useEffect(() => {
    if (!cloudHydratedUid) return undefined;
    const unsubscribers = [
      subscribeTeamChallenges(cloudHydratedUid, setTeamChallenges),
      subscribeConfirmedMatches(setConfirmedMatches),
      subscribeLeagueRecords(setLeagues),
      subscribeMatchReviews(setMatchReviews),
      subscribeRefereeAssignments(cloudHydratedUid, setRefereeAssignments),
      subscribeConversations(cloudHydratedUid, setConversations),
    ];
    const refreshSecondaryState = () => {
      Promise.all([
        loadTeamJoinRequests(cloudHydratedUid),
        loadNotifications(cloudHydratedUid),
        loadPlayerAssignments(),
      ])
        .then(([joinRequests, savedNotifications, savedAssignments]) => {
          setTeamJoinRequests(joinRequests);
          setNotifications(savedNotifications);
          setPlayerAssignments(savedAssignments);
        })
        .catch(() => {});
    };
    refreshSecondaryState();
    const timer = setInterval(refreshSecondaryState, 5000);
    return () => {
      clearInterval(timer);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [cloudHydratedUid]);
  useEffect(() => {
    if (!cloudHydratedUid) return undefined;
    let active = true;
    Promise.all([
      loadPublicProfiles(),
      loadDiscoverableTeams(),
      loadAvailabilityPosts(),
      loadTeamJoinRequests(cloudHydratedUid),
      loadNotifications(cloudHydratedUid),
      loadLeagueRecords(),
      loadPlayerAssignments(),
      loadCommunityGrounds(),
      loadOpportunities(),
      loadMatchReviews(),
      loadConversations(cloudHydratedUid, activeTeamId),
      activeTeamId ? loadTeamRecord(activeTeamId) : Promise.resolve(null),
    ])
      .then(
        ([
          profiles,
          teams,
          posts,
          joinRequests,
          savedNotifications,
          savedLeagues,
          assignments,
          grounds,
          savedOpportunities,
          reviews,
          savedConversations,
          savedTeam,
        ]) => {
          if (!active) return;
          setPublicProfiles(profiles);
          setDiscoverableTeams(teams);
          setAvailabilityPosts(posts);
          setTeamJoinRequests(joinRequests);
          setNotifications(savedNotifications);
          setLeagues(savedLeagues);
          setPlayerAssignments(assignments);
          setCommunityGrounds(grounds);
          setOpportunities(savedOpportunities);
          setMatchReviews(reviews);
          setConversations(savedConversations);
          if (savedTeam) setActiveTeam(savedTeam);
        },
      )
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [activeTeamId, cloudHydratedUid, tab]);
  useEffect(() => {
    if (!cloudHydratedUid || !confirmedMatches.length) return undefined;
    const canRepairMatchChats = Boolean(
      activeTeam &&
      [
        ...(activeTeam.adminIds || []),
        ...(activeTeam.coachIds || []),
        ...(activeTeam.captainIds || []),
      ].includes(cloudHydratedUid),
    );
    if (!canRepairMatchChats) {
      setMatchChatRepairing(false);
      setMatchChatRepairFailed(false);
      return undefined;
    }
    const relevantMatches = confirmedMatches.filter(
      (match) =>
        ["confirmed", "result_pending", "result_disputed"].includes(
          match.status,
        ) &&
        (match.participantUserIds?.includes(cloudHydratedUid) ||
          match.participantTeamIds?.includes(activeTeamId)),
    );
    const missingChats = relevantMatches.filter(
      (match) =>
        !conversations.some(
          (conversation) =>
            conversation.matchId === match.id && conversation.archived !== true,
        ),
    );
    if (!missingChats.length) {
      setMatchChatRepairing(false);
      setMatchChatRepairFailed(false);
      return undefined;
    }
    let active = true;
    setMatchChatRepairing(true);
    setMatchChatRepairFailed(false);
    const knownTeams = [activeTeam, ...discoverableTeams].filter(Boolean);
    const findTeam = async (teamId) =>
      knownTeams.find((team) => team.id === teamId) || loadTeamRecord(teamId);
    Promise.all(
      missingChats.map(async (match) => {
        const firstTeamId = match.participantTeamIds?.[0] || match.homeTeamId;
        const secondTeamId = match.participantTeamIds?.[1] || match.awayTeamId;
        const [firstTeam, secondTeam] = await Promise.all([
          findTeam(firstTeamId),
          findTeam(secondTeamId),
        ]);
        if (!firstTeam || !secondTeam)
          throw new Error("Both match teams are required.");
        return ensureCaptainConversation(
          firstTeam,
          secondTeam,
          match.id,
          match.challengeId || "",
        );
      }),
    )
      .then(() => loadConversations(cloudHydratedUid, activeTeamId))
      .then((records) => {
        if (!active) return;
        setConversations(records);
        setMatchChatRepairFailed(false);
      })
      .catch(() => {
        if (active) setMatchChatRepairFailed(true);
      })
      .finally(() => {
        if (active) setMatchChatRepairing(false);
      });
    return () => {
      active = false;
    };
  }, [
    activeTeam,
    activeTeamId,
    cloudHydratedUid,
    confirmedMatches,
    conversations,
    discoverableTeams,
    matchChatRepairVersion,
  ]);
  useEffect(() => {
    if (!cloudHydratedUid || !activeTeam?.id) return;
    const canRepairStats = [
      ...(activeTeam.adminIds || []),
      ...(activeTeam.coachIds || []),
      ...(activeTeam.captainIds || []),
    ].includes(cloudHydratedUid);
    if (!canRepairStats) return;
    const unfinishedStats = confirmedMatches.filter(
      (match) =>
        match.status === "completed" &&
        match.statsApplied !== true &&
        match.result &&
        match.participantTeamIds?.includes(activeTeam.id),
    );
    if (!unfinishedStats.length) return;
    Promise.all(
      unfinishedStats.map((match) =>
        confirmMatchResultRecord(match.id, activeTeam.id, cloudHydratedUid),
      ),
    )
      .then(() =>
        Promise.all([loadDiscoverableTeams(), loadTeamRecord(activeTeam.id)]),
      )
      .then(([savedTeams, refreshedTeam]) => {
        setDiscoverableTeams(savedTeams);
        setActiveTeam(refreshedTeam);
      })
      .catch(() => {});
  }, [activeTeam, cloudHydratedUid, confirmedMatches]);
  useEffect(() => {
    if (!cloudHydratedUid) return;
    const legacyProfiles = Object.entries(roleData).filter(
      ([, profile]) => profile?.name?.trim() && !profile.profileSaved,
    );
    if (!legacyProfiles.length) return;
    let active = true;
    Promise.all(
      legacyProfiles.map(([role, profile]) =>
        savePublicProfile(cloudHydratedUid, role, profile),
      ),
    )
      .then((published) => {
        if (!active) return;
        setRoleData((current) => {
          const next = { ...current };
          legacyProfiles.forEach(([role]) => {
            next[role] = { ...next[role], profileSaved: true };
          });
          return next;
        });
        setPublicProfiles((current) => [
          ...published,
          ...current.filter(
            (item) => !published.some((profile) => profile.id === item.id),
          ),
        ]);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [cloudHydratedUid, roleData, setRoleData]);
  useEffect(() => {
    let active = true;
    if (!activeTeamId) {
      setActiveTeam(null);
      return undefined;
    }
    loadTeamRecord(activeTeamId)
      .then((team) => {
        if (!active) return;
        if (team?.name?.trim().toLowerCase() === "avondale social") {
          setActiveTeam(null);
          setActiveTeamId(null);
          return;
        }
        setActiveTeam(team);
        if (team && cloudHydratedUid) {
          ensureTeamConversation(team)
            .then(() => loadConversations(cloudHydratedUid, team.id))
            .then((records) => active && setConversations(records))
            .catch(() => {});
        }
      })
      .catch(() => active && setActiveTeam(null));
    return () => {
      active = false;
    };
  }, [activeTeamId, cloudHydratedUid]);
  useEffect(() => {
    if (
      !cloudHydratedUid ||
      !activeTeam?.name ||
      !roleData.Player?.profileSaved ||
      roleData.Player.club === activeTeam.name
    )
      return;
    const updatedPlayer = {
      ...initialRoleData.Player,
      ...roleData.Player,
      club: activeTeam.name,
    };
    setRoleData((current) => ({
      ...current,
      Player: updatedPlayer,
    }));
    savePublicProfile(cloudHydratedUid, "Player", updatedPlayer).catch(
      () => {},
    );
  }, [activeTeam, cloudHydratedUid, roleData.Player, setRoleData]);
  useEffect(() => {
    if (userRole !== "Guest Player") return;
    setRoleData((current) => ({
      ...current,
      Player: { ...initialRoleData.Player, ...(current["Guest Player"] || {}) },
    }));
    setUserRole("Player");
  }, [setRoleData, setUserRole, userRole]);
  if (
    !ready ||
    !fontsLoaded ||
    !roleHydrated ||
    !dataHydrated ||
    !teamHydrated ||
    authSession === undefined
  )
    return <AppLoader />;
  if (userRole === "Guest Player") return <AppLoader />;
  const enterGuest = async (role) => {
    const session = await createGuestSession(role);
    setAuthSession(session);
    setUserRole(role);
    setTab("Home");
  };
  const removeRole = async (role) => {
    const session = await removeAccountRole(role);
    setAuthSession(session);
    if (role === userRole) {
      setUserRole(session.user.role);
      setTab("Home");
    }
  };
  const enterAccount = (session) => {
    setAuthSession(session);
    setUserRole(session.user.role);
    setTab("Home");
    setAuthOpen(false);
  };
  if (!authSession || !userRole || authOpen)
    return (
      <AuthGateway
        onGuest={enterGuest}
        onAuthenticated={enterAccount}
        canClose={Boolean(authSession?.type === "guest" && userRole)}
        onClose={() => setAuthOpen(false)}
      />
    );
  const signOut = async () => {
    await clearSession();
    setCloudHydratedUid(null);
    setAuthSession(null);
    setUserRole(null);
    setRoleData(initialRoleData);
    setActiveTeamId(null);
    setActiveTeam(null);
    setTab("Home");
    setTeamFinderRequested(false);
  };
  const confirmSignOut = () => {
    if (Platform.OS === "web") {
      const confirmed =
        typeof globalThis.confirm === "function"
          ? globalThis.confirm(
              "Sign out of Grassroots? Your saved account information will remain available.",
            )
          : true;
      if (confirmed)
        signOut().catch(() =>
          Alert.alert("Couldn’t sign out", "Please try again."),
        );
      return;
    }
    Alert.alert(
      "Sign out?",
      "Your saved account information will remain available when you sign in again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: () =>
            signOut().catch(() =>
              Alert.alert("Couldn’t sign out", "Please try again."),
            ),
        },
      ],
    );
  };
  const coachNav = [
    ["Teams", "shield-outline"],
    ["Matches", "calendar-outline"],
    ["Home", "home"],
    ["Squad", "shirt-outline"],
    ["More", "ellipsis-horizontal"],
  ];
  const roleNav = {
    Player: [
      ["Matches", "calendar-outline"],
      ["Teams", "shield-outline"],
      ["Home", "home"],
      ["Chat", "chatbubbles-outline"],
      ["More", "ellipsis-horizontal"],
    ],
    Referee: [
      ["Appointments", "flag-outline"],
      ["Matches", "calendar-outline"],
      ["Home", "home"],
      ["Profile", "person-outline"],
      ["More", "ellipsis-horizontal"],
    ],
    Sponsor: [
      ["Matches", "calendar-outline"],
      ["Campaigns", "heart-outline"],
      ["Home", "home"],
      ["Watchlist", "bookmark-outline"],
      ["More", "ellipsis-horizontal"],
    ],
    Scout: [
      ["Matches", "calendar-outline"],
      ["Players", "people-outline"],
      ["Home", "home"],
      ["Watchlist", "bookmark-outline"],
      ["More", "ellipsis-horizontal"],
    ],
  };
  const navItems = userRole === "Coach" ? coachNav : roleNav[userRole];
  const accountRoles =
    authSession.type === "account"
      ? authSession.user.roles || [authSession.user.role]
      : [userRole];
  const switchRole = (role) => {
    if (!accountRoles.includes(role)) return;
    setUserRole(role);
    setTab("Home");
  };
  const addRole = async (role) => {
    const session = await addAccountRole(role);
    setAuthSession(session);
    setUserRole(role);
    setTab("Home");
  };
  const currentUid =
    authSession.type === "account" ? authSession.user.id : authSession.id;
  const runSingleFlight = (key, action) => {
    const running = mutationFlights.current.get(key);
    if (running) return running;
    const request = Promise.resolve()
      .then(action)
      .finally(() => {
        if (mutationFlights.current.get(key) === request)
          mutationFlights.current.delete(key);
      });
    mutationFlights.current.set(key, request);
    return request;
  };
  const createTeam = (values) =>
    runSingleFlight(
      `create-team:${currentUid}:${values.name?.trim().toLowerCase()}`,
      async () => {
        const team = await createTeamRecord(currentUid, values);
        ensureTeamConversation(team).catch((error) =>
          console.warn(
            "Team chat will be repaired automatically",
            error?.code || error?.message,
          ),
        );
        setActiveTeam(team);
        setActiveTeamId(team.id);
        setDiscoverableTeams((current) => [
          team,
          ...current.filter((item) => item.id !== team.id),
        ]);
        return team;
      },
    );
  const updateTeam = async (values) => {
    if (!activeTeam?.id)
      throw new Error("Create a team before editing settings.");
    const team = await updateTeamRecord(activeTeam.id, values);
    setActiveTeam(team);
    return team;
  };
  const currentData = {
    ...initialRoleData[userRole],
    ...(roleData[userRole] || {}),
  };
  const updateRole = (change) =>
    setRoleData((current) => {
      const base = {
        ...initialRoleData[userRole],
        ...(current[userRole] || {}),
      };
      const patch = typeof change === "function" ? change(base) : change;
      return { ...current, [userRole]: { ...base, ...patch } };
    });
  const saveRoleProfile = async (profile) => {
    const published = await savePublicProfile(currentUid, userRole, profile);
    setRoleData((current) => ({
      ...current,
      [userRole]: {
        ...initialRoleData[userRole],
        ...(current[userRole] || {}),
        profileSaved: true,
      },
    }));
    setPublicProfiles((current) => [
      published,
      ...current.filter((item) => item.id !== published.id),
    ]);
    return published;
  };
  const requestTeamJoin = async (team) => {
    const playerProfile = publicProfiles.find(
      (item) => item.ownerId === currentUid && item.role === "Player",
    );
    await requestToJoinTeam(currentUid, team, playerProfile?.id || "");
  };
  const addPlayer = async (profile) => {
    if (!activeTeam?.id)
      throw new Error("Create a team before adding players.");
    await addExistingPlayerToTeam(activeTeam.id, profile, currentUid);
    try {
      await ensurePlayerConversation(activeTeam, profile);
      setConversations(await loadConversations(currentUid, activeTeam.id));
    } catch {
      // The player is already added; the private chat will retry on refresh.
    }
    const refreshed = await loadTeamRecord(activeTeam.id);
    await ensureTeamConversation(refreshed);
    setActiveTeam(refreshed);
    setPlayerAssignments((current) => [
      {
        id: profile.ownerId,
        userId: profile.ownerId,
        teamId: activeTeam.id,
        publicProfileId: profile.id,
      },
      ...current.filter((item) => item.userId !== profile.ownerId),
    ]);
    return refreshed;
  };
  const startPlayerChat = async (profile) => {
    if (!activeTeam?.id) throw new Error("Create a team first.");
    await ensurePlayerConversation(activeTeam, profile);
    setConversations(await loadConversations(currentUid, activeTeam.id));
    return profile;
  };
  const startDirectChat = async (profile) => {
    await ensureDirectConversation(currentUid, profile);
    setConversations(await loadConversations(currentUid, activeTeam?.id));
    setTab(userRole === "Player" ? "Chat" : "Watchlist");
    return profile;
  };
  const removePlayer = async (profile) => {
    if (!activeTeam?.id) throw new Error("Create a team first.");
    await removePlayerFromTeam(activeTeam.id, profile);
    const refreshed = await loadTeamRecord(activeTeam.id);
    await ensureTeamConversation(refreshed);
    setActiveTeam(refreshed);
    setPlayerAssignments((current) =>
      current.filter((item) => item.userId !== profile.ownerId),
    );
    return refreshed;
  };
  const acceptTeamJoinRequest = async (request, profile) => {
    await addPlayer(profile);
    await respondToTeamJoinRequest(request.id, "accepted");
    setTeamJoinRequests((current) =>
      current.filter((item) => item.id !== request.id),
    );
  };
  const publishAvailability = async (post) => {
    if (!activeTeam?.id) throw new Error("Create a team first.");
    const problem = availabilityProblem(post, confirmedMatches, activeTeam.id);
    if (problem) throw new Error(problem);
    const savedPost = await saveAvailabilityPost(currentUid, activeTeam, {
      ...post,
      published: true,
    });
    setAvailabilityPosts((current) => [
      savedPost,
      ...current.filter((item) => item.id !== savedPost.id),
    ]);
    return savedPost;
  };
  const sendChallenge = async (recipientTeam, terms) => {
    if (!activeTeam?.id)
      throw new Error("Create your team before challenging.");
    const problem = availabilityProblem(
      { date: terms.day, time: terms.time },
      confirmedMatches,
      activeTeam.id,
    );
    if (problem) throw new Error(problem);
    const saved = await createTeamChallenge(
      currentUid,
      activeTeam,
      recipientTeam,
      terms,
    );
    if (saved.alreadyExists)
      throw new Error("A challenge between these teams is already active.");
    setTeamChallenges((current) => [
      saved,
      ...current.filter((item) => item.id !== saved.id),
    ]);
    try {
      const records = await loadConversations(currentUid, activeTeam.id);
      setConversations(records);
    } catch {
      // The challenge was saved; chat records are refreshed separately.
    }
    return saved;
  };
  const respondChallenge = async (request, status, terms) => {
    if (status !== "accepted") {
      await respondToTeamChallenge(request.id, status, terms);
      setTeamChallenges((current) =>
        current.map((item) =>
          item.id === request.id
            ? { ...item, status, ...(terms ? { terms } : {}) }
            : item,
        ),
      );
      return;
    }
    const senderTeam =
      request.senderTeamId === activeTeam?.id
        ? activeTeam
        : discoverableTeams.find((item) => item.id === request.senderTeamId);
    const recipientTeam =
      request.recipientTeamId === activeTeam?.id
        ? activeTeam
        : discoverableTeams.find((item) => item.id === request.recipientTeamId);
    if (!senderTeam || !recipientTeam)
      throw new Error("Refresh teams and try accepting the match again.");
    const confirmed = await acceptTeamChallenge(
      request,
      currentUid,
      senderTeam,
      recipientTeam,
    );
    setTeamChallenges((current) =>
      current.filter((item) => item.id !== request.id),
    );
    loadConversations(currentUid, activeTeam?.id)
      .then(setConversations)
      .catch(() => {});
  };
  const negotiateChallenge = async (request, terms) => {
    if (!activeTeam?.id)
      throw new Error("Create your team before negotiating.");
    const problem = availabilityProblem(
      { date: terms.day, time: terms.time },
      confirmedMatches,
      activeTeam.id,
    );
    if (problem) throw new Error(problem);
    const opponentId =
      request.senderTeamId === activeTeam.id
        ? request.recipientTeamId
        : request.senderTeamId;
    const opponent = discoverableTeams.find((item) => item.id === opponentId);
    if (!opponent) throw new Error("Refresh teams and try again.");
    const revised = await negotiateTeamChallenge(
      request,
      currentUid,
      activeTeam,
      opponent,
      terms,
    );
    setTeamChallenges((current) =>
      current.map((item) => (item.id === request.id ? revised : item)),
    );
  };
  const requestMatchReferee = async (match, profile, fee) => {
    if (!activeTeam?.id) throw new Error("Create your team first.");
    return requestRefereeForMatch(match, activeTeam, profile, currentUid, fee);
  };
  const approveMatchReferee = async (match) => {
    if (!activeTeam?.id) throw new Error("Create your team first.");
    await approveRefereeForMatch(match, activeTeam, currentUid);
  };
  const rejectMatchReferee = async (match) => {
    if (!activeTeam?.id) throw new Error("Create your team first.");
    await rejectRefereeForMatch(match, activeTeam, currentUid);
    setConfirmedMatches((current) =>
      current.map((item) =>
        item.id === match.id
          ? {
              ...item,
              refereeId: "",
              refereeName: "",
              refereeFee: 0,
              refereeStatus: "needed",
              refereeTeamApprovalIds: [],
            }
          : item,
      ),
    );
  };
  const respondReferee = async (assignment, status) =>
    respondToRefereeAssignment(assignment, status, currentUid);
  const completeConfirmedMatch = async (matchId, result) => {
    await completeMatchRecord(matchId, result, activeTeam?.id, currentUid);
    setConfirmedMatches((current) =>
      current.map((item) =>
        item.id === matchId
          ? {
              ...item,
              status: "result_pending",
              result,
              resultSubmittedByTeamId: activeTeam?.id || "",
              resultConfirmationTeamId:
                item.participantTeamIds?.find(
                  (teamId) => teamId !== activeTeam?.id,
                ) || "",
            }
          : item,
      ),
    );
  };
  const confirmMatchResult = async (match) => {
    await confirmMatchResultRecord(match.id, activeTeam?.id, currentUid);
    if (match.competitionId)
      await syncLeagueSchedule(match.competitionId, currentUid).catch(() => {});
    setConfirmedMatches((current) =>
      current.map((item) =>
        item.id === match.id
          ? {
              ...item,
              status: "completed",
              statsApplied: true,
              resultConfirmedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    setConversations((current) =>
      current.filter((conversation) => conversation.matchId !== match.id),
    );
    Promise.allSettled([
      loadDiscoverableTeams(),
      activeTeam?.id ? loadTeamRecord(activeTeam.id) : Promise.resolve(null),
    ]).then(([teamsResult, teamResult]) => {
      if (teamsResult.status === "fulfilled")
        setDiscoverableTeams(teamsResult.value);
      if (teamResult.status === "fulfilled" && teamResult.value)
        setActiveTeam(teamResult.value);
    });
  };
  const disputeMatchResult = async (match, proposedResult, reason) => {
    if (!activeTeam?.id) throw new Error("Choose your team first.");
    await disputeMatchResultRecord(
      match,
      activeTeam.id,
      currentUid,
      proposedResult,
      reason,
    );
    const homeTeam =
      (activeTeam?.id === match.homeTeamId ? activeTeam : null) ||
      discoverableTeams.find((item) => item.id === match.homeTeamId);
    const awayTeam =
      (activeTeam?.id === match.awayTeamId ? activeTeam : null) ||
      discoverableTeams.find((item) => item.id === match.awayTeamId);
    if (homeTeam && awayTeam) {
      await ensureCaptainConversation(
        homeTeam,
        awayTeam,
        match.id,
        match.challengeId || "",
      );
      setConversations(await loadConversations(currentUid, activeTeam.id));
    }
    const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    setConfirmedMatches((current) =>
      current.map((item) =>
        item.id === match.id
          ? {
              ...item,
              status: "result_disputed",
              resultDisputeStatus: "open",
              disputedByTeamId: activeTeam.id,
              proposedResult,
              disputeReason: reason,
              resultCorrectionDeadline: deadline,
              disputePenaltyTeamIds: item.participantTeamIds || [],
            }
          : item,
      ),
    );
  };
  const shareCommunityGround = async (values) => {
    const saved = await createCommunityGround(currentUid, activeTeam, values);
    setCommunityGrounds((current) => [
      saved,
      ...current.filter((item) => item.id !== saved.id),
    ]);
    return saved;
  };
  const confirmGround = async (ground) => {
    if (normalizeArea(ground.area) !== normalizeArea(activeTeam?.area)) {
      throw new Error("Only someone in the same area can confirm this ground.");
    }
    const result = await confirmCommunityGround(ground.id, currentUid);
    if (result?.created) {
      setCommunityGrounds((current) =>
        current.map((item) =>
          item.id === ground.id
            ? {
                ...item,
                confirmations: Number(item.confirmations || 0) + 1,
                confirmedByIds: [...(item.confirmedByIds || []), currentUid],
                lastConfirmedAt: new Date().toISOString(),
                lastConfirmedBy: currentUid,
              }
            : item,
        ),
      );
    }
    return result;
  };
  const postOpportunity = (values) =>
    runSingleFlight(
      `create-opportunity:${currentUid}:${values.type}:${values.title?.trim().toLowerCase()}:${values.area?.trim().toLowerCase()}`,
      async () => {
        const saved = await createOpportunityRecord(
          currentUid,
          activeTeam,
          values,
        );
        setOpportunities((current) => [
          saved,
          ...current.filter((item) => item.id !== saved.id),
        ]);
        return saved;
      },
    );
  const changeOpportunityStatus = async (opportunity, status) => {
    await updateOpportunityStatus(opportunity.id, status);
    setOpportunities((current) =>
      current.map((item) =>
        item.id === opportunity.id ? { ...item, status } : item,
      ),
    );
  };
  const askOpportunityQuestion = async (opportunity, question) => {
    const response = await respondToOpportunity(
      opportunity,
      currentUid,
      userRole,
      question,
    );
    if (response?.created) {
      setOpportunities((current) =>
        current.map((item) =>
          item.id === opportunity.id
            ? { ...item, responseCount: Number(item.responseCount || 0) + 1 }
            : item,
        ),
      );
    }
    return startDirectChat({
      ownerId: opportunity.ownerId,
      name: opportunity.teamName || opportunity.title,
      isYouth: false,
    });
  };
  const flagOpportunity = (opportunity) =>
    reportOpportunity(
      opportunity,
      currentUid,
      "Misleading or unsafe opportunity.",
    );
  const submitSafetyReport = (values) =>
    createSafeguardingReport(currentUid, activeTeam, values);
  const requestReschedule = async (
    match,
    proposedDate,
    proposedTime,
    reason,
  ) => {
    await requestMatchReschedule(
      match,
      activeTeam?.id,
      currentUid,
      proposedDate,
      proposedTime,
      reason,
    );
    setConfirmedMatches((current) =>
      current.map((item) =>
        item.id === match.id
          ? {
              ...item,
              rescheduleStatus: "pending",
              rescheduleRequestedByTeamId: activeTeam?.id,
              rescheduleConfirmationTeamId: item.participantTeamIds?.find(
                (teamId) => teamId !== activeTeam?.id,
              ),
              proposedMatchDate: proposedDate,
              proposedKickoff: proposedTime,
              rescheduleReason: reason,
            }
          : item,
      ),
    );
  };
  const respondReschedule = async (match, accepted) => {
    await respondMatchReschedule(match, activeTeam?.id, currentUid, accepted);
    setConfirmedMatches((current) =>
      current.map((item) =>
        item.id === match.id
          ? {
              ...item,
              ...(accepted
                ? {
                    matchDate: item.proposedMatchDate,
                    kickoff: item.proposedKickoff,
                  }
                : {}),
              rescheduleStatus: accepted ? "accepted" : "rejected",
            }
          : item,
      ),
    );
  };
  const requestCancellation = async (match, reason, details) => {
    await requestMatchCancellation(
      match,
      activeTeam?.id,
      currentUid,
      reason,
      details,
    );
    const scheduled = new Date(
      `${match.matchDate || ""}T${match.kickoff || "00:00"}:00`,
    ).getTime();
    const hoursNotice = Number.isFinite(scheduled)
      ? Math.floor((scheduled - Date.now()) / (60 * 60 * 1000))
      : 0;
    setConfirmedMatches((current) =>
      current.map((item) =>
        item.id === match.id
          ? {
              ...item,
              cancellationStatus: "pending",
              cancellationType: hoursNotice >= 24 ? "with_notice" : "late",
              cancellationHoursNotice: hoursNotice,
              cancellationReason: reason,
              cancellationDetails: details,
              cancellationRequestedByTeamId: activeTeam?.id,
              cancellationConfirmationTeamId: item.participantTeamIds?.find(
                (teamId) => teamId !== activeTeam?.id,
              ),
            }
          : item,
      ),
    );
  };
  const respondCancellation = async (match, decision) => {
    await respondMatchCancellation(match, activeTeam?.id, currentUid, decision);
    const cancelled = decision !== "keep";
    const mutuallyAgreed = decision === "mutual";
    setConfirmedMatches((current) =>
      current.map((item) =>
        item.id === match.id
          ? {
              ...item,
              status: cancelled ? "cancelled" : "confirmed",
              cancellationStatus: cancelled ? "confirmed" : "rejected",
              cancellationDecision: decision,
              cancellationMutuallyAgreed: mutuallyAgreed,
              cancellationPenaltyTeamIds:
                decision === "requester_responsible"
                  ? [item.cancellationRequestedByTeamId]
                  : [],
            }
          : item,
      ),
    );
  };
  const reportNoShow = async (match, reportedTeamId, details) => {
    await reportMatchNoShow(
      match,
      activeTeam?.id,
      currentUid,
      reportedTeamId,
      details,
    );
    setConfirmedMatches((current) =>
      current.map((item) =>
        item.id === match.id
          ? {
              ...item,
              noShowStatus: "pending_confirmation",
              noShowReportedTeamId: reportedTeamId,
              noShowConfirmationTeamId: reportedTeamId,
              noShowDetails: details,
            }
          : item,
      ),
    );
  };
  const respondNoShow = async (match, confirmed) => {
    await respondMatchNoShow(match, activeTeam?.id, currentUid, confirmed);
    setConfirmedMatches((current) =>
      current.map((item) =>
        item.id === match.id
          ? {
              ...item,
              status: confirmed ? "cancelled" : "confirmed",
              noShowStatus: confirmed ? "confirmed" : "disputed",
              cancellationType: confirmed ? "no_show" : "",
              cancellationPenaltyTeamIds: confirmed
                ? [item.noShowReportedTeamId]
                : [],
            }
          : item,
      ),
    );
  };
  const dismissNotification = async (notification) => {
    await clearNotification(notification.id);
    setNotifications((current) =>
      current.filter((item) => item.id !== notification.id),
    );
  };
  const saveMatchReview = async (match, review) => {
    await savePostMatchReview(match, activeTeam?.id, currentUid, review);
    setMatchReviews(await loadMatchReviews());
  };
  const createLeague = (values) =>
    runSingleFlight(
      `create-league:${currentUid}:${values.name?.trim().toLowerCase()}`,
      async () => {
        const league = await createLeagueRecord(currentUid, activeTeam, values);
        if (values.invitedUserIds?.length) {
          await createNotifications(
            values.invitedUserIds,
            currentUid,
            "competition_invite",
            "Competition invitation",
            `${activeTeam?.name || "A team"} invited you to ${league.name}. Open Leagues to view it.`,
            league.id,
          ).catch(() => {});
        }
        if (activeTeam?.id) {
          await joinLeagueRecord(league, activeTeam, currentUid);
          league.teamIds = [activeTeam.id];
          await syncLeagueSchedule(league.id, currentUid);
        }
        const refreshedLeagues = await loadLeagueRecords();
        setLeagues(refreshedLeagues);
        return (
          refreshedLeagues.find((item) => item.id === league.id) || league
        );
      },
    );
  const joinLeague = async (league) => {
    await joinLeagueRecord(league, activeTeam, currentUid);
    await syncLeagueSchedule(league.id, currentUid);
    setLeagues((current) =>
      current.map((item) =>
        item.id === league.id
          ? {
              ...item,
              teamIds: [...new Set([...(item.teamIds || []), activeTeam.id])],
            }
          : item,
      ),
    );
    loadLeagueRecords()
      .then(setLeagues)
      .catch(() => {});
  };
  const sendProfileRequest = async (profile, type) => {
    await createNotifications(
      [profile.ownerId],
      currentUid,
      `${type.toLowerCase()}_request`,
      `${type} request`,
      `${activeTeam?.name || "A team"} wants to connect with you.`,
      activeTeam?.id || "",
    );
  };
  const sponsorCompetition = async (league) => {
    await createSponsorshipProposal(currentUid, roleData.Sponsor || {}, league);
    Alert.alert(
      "Proposal sent",
      `${league.name} can now review your sponsorship interest.`,
    );
  };
  const screens =
    userRole === "Coach"
      ? {
          Teams: (
            <Community
              startFinder={teamFinderRequested}
              onFinderOpened={() => setTeamFinderRequested(false)}
              team={activeTeam}
              onCreateTeam={createTeam}
              teams={discoverableTeams}
              availabilityPosts={availabilityPosts}
              onPublishAvailability={publishAvailability}
              challenges={teamChallenges}
              onSendChallenge={sendChallenge}
              matches={confirmedMatches}
              leagues={leagues}
              publicProfiles={publicProfiles}
            />
          ),
          Matches: (
            <CommunityMatches
              team={activeTeam}
              teams={discoverableTeams}
              challenges={teamChallenges}
              matches={confirmedMatches}
              publicProfiles={publicProfiles}
              onRespond={respondChallenge}
              onNegotiate={negotiateChallenge}
              onRequestReferee={requestMatchReferee}
              onApproveReferee={approveMatchReferee}
              onRejectReferee={rejectMatchReferee}
              onConfirmResult={confirmMatchResult}
              onDisputeResult={disputeMatchResult}
              onRequestReschedule={requestReschedule}
              onRespondReschedule={respondReschedule}
              onRequestCancellation={requestCancellation}
              onRespondCancellation={respondCancellation}
              onReportNoShow={reportNoShow}
              onRespondNoShow={respondNoShow}
              conversations={conversations}
              currentUid={currentUid}
              onCompleteMatch={completeConfirmedMatch}
              canManageMatch
              onSaveReview={saveMatchReview}
              matchReviews={matchReviews}
            />
          ),
          Home: (
            <CommunityHome
              team={activeTeam}
              onOpenTeam={() => setTab("Teams")}
              onFindFriendly={() => {
                setTeamFinderRequested(true);
                setTab("Teams");
              }}
              onSeeAll={() => setTab("Matches")}
              onPublishAvailability={publishAvailability}
              matches={confirmedMatches}
              notifications={notifications}
              onClearNotification={dismissNotification}
            />
          ),
          Squad: (
            <CommunitySquad
              team={activeTeam}
              onSave={updateTeam}
              rosterProfiles={publicProfiles.filter(
                (profile) =>
                  profile.role === "Player" &&
                  activeTeam?.memberIds?.includes(profile.ownerId),
              )}
            />
          ),
          More: (
            <More
              role="Coach"
              onSignOut={confirmSignOut}
              team={activeTeam}
              onCreateTeam={createTeam}
              onUpdateTeam={updateTeam}
              publicProfiles={publicProfiles}
              onAddPlayer={addPlayer}
              onRemovePlayer={removePlayer}
              teamJoinRequests={teamJoinRequests}
              onAcceptJoinRequest={acceptTeamJoinRequest}
              conversations={conversations}
              leagues={leagues}
              onCreateLeague={createLeague}
              onJoinLeague={joinLeague}
              notifications={notifications}
              onClearNotification={dismissNotification}
              currentUid={currentUid}
              onSendProfileRequest={sendProfileRequest}
              profileData={currentData}
              onUpdateProfile={updateRole}
              onSaveProfile={saveRoleProfile}
              sharedLeagueId={sharedLeagueId}
              matchChatRepairing={matchChatRepairing}
              matchChatRepairFailed={matchChatRepairFailed}
              onRetryMatchChats={() =>
                setMatchChatRepairVersion((current) => current + 1)
              }
              playerAssignments={playerAssignments}
              teams={discoverableTeams}
              onStartPlayerChat={startPlayerChat}
              matches={confirmedMatches}
              challenges={teamChallenges}
              grounds={communityGrounds}
              opportunities={opportunities}
              onCreateGround={shareCommunityGround}
              onConfirmGround={confirmGround}
              onCreateOpportunity={postOpportunity}
              onChangeOpportunityStatus={changeOpportunityStatus}
              onAskOpportunity={askOpportunityQuestion}
              onReportOpportunity={flagOpportunity}
              onSubmitSafetyReport={submitSafetyReport}
              onStartDirectChat={startDirectChat}
            />
          ),
        }
      : {
          [tab]:
            tab === "Teams" ? (
              <TeamHub
                role={userRole}
                currentUid={currentUid}
                team={activeTeam}
                onCreate={createTeam}
                teams={discoverableTeams}
                onRequestTeam={requestTeamJoin}
                conversations={conversations}
                publicProfiles={publicProfiles}
              />
            ) : (
              <RoleWorkspace
                role={userRole}
                section={tab}
                data={currentData}
                update={updateRole}
                onSignOut={confirmSignOut}
                publicProfiles={publicProfiles}
                onSaveProfile={saveRoleProfile}
                conversations={conversations}
                currentUid={currentUid}
                refereeAssignments={refereeAssignments}
                onRespondReferee={respondReferee}
                matches={confirmedMatches}
                teams={discoverableTeams}
                team={activeTeam}
                notifications={notifications}
                onClearNotification={dismissNotification}
                leagues={leagues}
                onSponsorCompetition={sponsorCompetition}
                onStartDirectChat={startDirectChat}
              />
            ),
        };
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      {authSession.type === "guest" ? (
        <View style={s.guestBar}>
          <View style={s.guestBarIdentity}>
            <Ionicons name="sparkles-outline" size={16} color={C.gold} />
            <AppText style={s.guestBarText}>Exploring as {userRole}</AppText>
          </View>
          <Pressable
            onPress={() => setAuthOpen(true)}
            style={s.guestBarButton}
            accessibilityLabel="Create an account to save your progress"
          >
            <AppText style={s.guestBarButtonText}>Save progress</AppText>
          </Pressable>
        </View>
      ) : null}
      {authSession.type === "account" ? (
        <AccountRoleBar
          roles={accountRoles}
          activeRole={userRole}
          onSwitch={switchRole}
          onAdd={addRole}
          onRemove={removeRole}
        />
      ) : null}
      <View style={{ flex: 1 }}>{screens[tab]}</View>
      <View style={s.bottomNav}>
        {navItems.map((x) => {
          const active = tab === x[0];
          const home = x[0] === "Home";
          return (
            <Pressable
              key={x[0]}
              accessibilityRole="tab"
              accessibilityLabel={x[0]}
              accessibilityState={{ selected: active }}
              onPress={() => setTab(x[0])}
              style={[s.navItem, home && s.homeNavItem]}
            >
              {home ? (
                <View
                  style={[s.homeNavCircle, active && s.homeNavCircleActive]}
                >
                  <Ionicons name="home" size={24} color={C.redDark} />
                </View>
              ) : (
                <Ionicons
                  name={x[1]}
                  size={21}
                  color={active ? C.red : C.muted}
                />
              )}
              <AppText
                style={[
                  s.navText,
                  active && s.navTextActive,
                  home && s.homeNavText,
                ]}
              >
                {x[0]}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },
  header: {
    height: 70,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 36,
    height: 42,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ skewX: "-7deg" }],
  },
  logoText: { color: "white", fontSize: 26, fontFamily: F.black },
  pslLogo: { width: 48, height: 52 },
  friendliesMark: {
    width: 38,
    height: 42,
    borderRadius: 10,
    backgroundColor: C.red,
    borderWidth: 2,
    borderColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  friendliesMarkText: { color: C.white, fontSize: 22, fontFamily: F.black },
  clubLogo: { width: 38, height: 42 },
  headerTitle: { fontSize: 18, fontFamily: F.black, letterSpacing: -0.35 },
  headerSub: {
    fontSize: 8,
    color: C.muted,
    letterSpacing: 0.8,
    fontFamily: F.semibold,
  },
  hero: {
    height: 465,
    marginHorizontal: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  heroImage: { width: "100%", height: "100%" },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0006" },
  heroCopy: { position: "absolute", left: 20, right: 20, bottom: 20 },
  label: {
    fontSize: 10,
    fontFamily: F.bold,
    letterSpacing: 1.15,
    color: C.red,
  },
  heroTitle: {
    fontSize: 48,
    lineHeight: 44,
    color: "white",
    fontFamily: F.black,
    letterSpacing: -1.8,
    marginVertical: 10,
  },
  heroBody: { color: "#F4F4F0", fontSize: 13, lineHeight: 19, maxWidth: 290 },
  primary: {
    alignSelf: "flex-start",
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    backgroundColor: C.red,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  primaryText: { color: "white", fontFamily: F.bold, fontSize: 12 },
  next: {
    margin: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: C.ink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nextTitle: { color: "white", fontFamily: F.bold, fontSize: 15, marginTop: 6 },
  liveSection: {
    marginTop: 12,
    paddingVertical: 16,
    backgroundColor: "#F0F0ED",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  liveSectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  liveTitleLine: { flexDirection: "row", alignItems: "center", gap: 9 },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#B9B9B5" },
  liveDotActive: { backgroundColor: C.red },
  liveSectionTitle: { color: C.ink, fontSize: 18, fontFamily: F.extra },
  liveCount: {
    color: C.red,
    fontSize: 9,
    fontFamily: F.bold,
    letterSpacing: 0.7,
  },
  matchdayLabel: {
    color: C.muted,
    fontSize: 9,
    fontFamily: F.bold,
    letterSpacing: 0.7,
  },
  liveRail: { paddingHorizontal: 16, gap: 10 },
  liveMatchCard: {
    width: 302,
    minHeight: 176,
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.line,
  },
  liveMatchCardActive: { borderColor: C.red },
  liveMatchCardPressed: {
    backgroundColor: "#F7F7F4",
    transform: [{ scale: 0.99 }],
  },
  liveMatchTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  liveStatusLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveMinute: { color: C.red, fontSize: 10, fontFamily: F.bold },
  upcomingStatus: { color: C.muted },
  livePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.red },
  liveMatchup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  liveClubSide: {
    width: 82,
    alignItems: "center",
    gap: 8,
  },
  liveTeamName: {
    color: C.ink,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: F.bold,
    textAlign: "center",
  },
  liveScoreBox: {
    minWidth: 80,
    minHeight: 58,
    borderRadius: 10,
    backgroundColor: "#F0F0ED",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  liveScoreBoxActive: { backgroundColor: C.red },
  liveScore: {
    color: C.ink,
    fontSize: 18,
    fontFamily: F.black,
    fontVariant: ["tabular-nums"],
  },
  liveScoreActiveText: { color: C.white },
  liveScoreSub: {
    color: C.muted,
    fontSize: 8,
    fontFamily: F.bold,
    marginTop: 2,
  },
  liveVenue: {
    maxWidth: 145,
    color: C.muted,
    fontSize: 8,
    textAlign: "right",
  },
  muted: { fontSize: 10, color: C.muted, fontFamily: F.medium },
  content: { paddingHorizontal: 16, paddingVertical: 20 },
  h2: {
    fontSize: 26,
    lineHeight: 31,
    fontFamily: F.black,
    letterSpacing: -0.55,
    marginTop: 4,
    marginBottom: 14,
  },
  h2White: {
    fontSize: 28,
    fontFamily: F.black,
    color: "white",
    marginVertical: 5,
  },
  newsImage: { height: 190, width: "100%", borderRadius: 15, marginBottom: 14 },
  signingCard: {
    backgroundColor: "white",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.line,
  },
  signingImage: { width: "100%", height: 265, resizeMode: "cover" },
  signingCopy: { padding: 14 },
  storyTitle: {
    fontSize: 22,
    lineHeight: 25,
    fontFamily: F.extra,
    color: C.ink,
    marginVertical: 6,
  },
  body: { fontSize: 13, color: C.muted, lineHeight: 19 },
  storyRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  storyThumb: {
    width: 82,
    borderRadius: 12,
    backgroundColor: C.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 16, fontFamily: F.bold, lineHeight: 20, marginTop: 4 },
  meta: {
    fontSize: 9,
    color: C.muted,
    letterSpacing: 0.45,
    fontFamily: F.medium,
  },
  darkHead: { backgroundColor: C.ink, padding: 22 },
  stats: {
    borderTopWidth: 1,
    borderColor: "#444",
    paddingTop: 16,
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stat: { color: "white", fontSize: 20, fontWeight: "900", marginTop: 3 },
  pitch: {
    height: 400,
    backgroundColor: "#23864e",
    position: "relative",
    borderWidth: 2,
    borderColor: "#ffffff55",
    margin: 14,
  },
  half: {
    position: "absolute",
    top: "50%",
    width: "100%",
    borderTopWidth: 2,
    borderColor: "#ffffff55",
  },
  player: { position: "absolute", width: 60, alignItems: "center" },
  shirt: {
    height: 44,
    width: 38,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  shirtText: { fontSize: 8, fontWeight: "900" },
  playerName: {
    backgroundColor: "#111",
    color: "white",
    fontSize: 8,
    padding: 3,
    fontWeight: "700",
  },
  wideButton: {
    backgroundColor: C.red,
    borderRadius: 4,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 4,
    padding: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  buttonText: { fontSize: 12, fontFamily: F.bold },
  tabs: {
    height: 50,
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderColor: "transparent",
  },
  tabActive: { borderColor: C.red },
  tabText: { fontSize: 12, fontFamily: F.semibold, color: C.muted },
  week: {
    backgroundColor: C.ink,
    borderRadius: 15,
    padding: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  weekControl: {
    minWidth: 54,
    color: C.white,
    fontSize: 11,
    fontFamily: F.semibold,
    textAlign: "center",
  },
  weekNo: {
    color: "white",
    fontSize: 24,
    fontFamily: F.black,
    textAlign: "center",
  },
  fixture: { paddingVertical: 16, borderBottomWidth: 1, borderColor: C.line },
  fixtureMeta: { flexDirection: "row", justifyContent: "space-between" },
  fixtureTeams: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  team: { fontSize: 13, lineHeight: 18, fontFamily: F.bold },
  badge: {
    width: 32,
    height: 36,
    backgroundColor: "white",
    borderWidth: 3,
    borderColor: C.red,
    alignItems: "center",
    justifyContent: "center",
  },
  time: { fontSize: 12, fontFamily: F.black, fontVariant: ["tabular-nums"] },
  tableRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    color: C.muted,
  },
  col: { width: 28, textAlign: "center", fontSize: 9, color: C.muted },
  dataNote: { fontSize: 9, lineHeight: 14, color: C.muted, marginVertical: 14 },
  pos: { width: 20, fontFamily: F.black, fontVariant: ["tabular-nums"] },
  points: { fontSize: 16, fontFamily: F.black, fontVariant: ["tabular-nums"] },
  statCard: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 14,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rank: { fontSize: 25, fontWeight: "900", color: "#bbb" },
  bigStat: { fontSize: 27, fontWeight: "900" },
  subHeader: {
    height: 66,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  actionRow: { flexDirection: "row", gap: 8 },
  league: {
    padding: 12,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  leagueIcon: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: C.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  join: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 13,
  },
  friendly: {
    marginTop: 14,
    padding: 18,
    borderRadius: 15,
    backgroundColor: C.red,
  },
  friendly: {
    marginTop: 14,
    padding: 18,
    borderRadius: 15,
    backgroundColor: C.red,
  },
  rankRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  standingsRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    backgroundColor: C.white,
  },
  standingsRowDetailed: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  standingsHead: {
    paddingHorizontal: 5,
    color: C.muted,
    fontSize: 10,
    fontWeight: "800",
  },
  standingsCell: {
    paddingHorizontal: 5,
    color: C.ink,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  standingsTeam: {
    paddingHorizontal: 7,
    color: C.ink,
    fontSize: 12,
    fontWeight: "800",
  },
  teamPanel: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: C.ink,
    marginBottom: 18,
  },
  record: {
    padding: 13,
    borderRadius: 13,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 8,
  },
  modalBack: { flex: 1, backgroundColor: "#0008", justifyContent: "flex-end" },
  sheet: {
    padding: 20,
    paddingBottom: 30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: C.cream,
  },
  score: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 16,
  },
  scoreInput: {
    backgroundColor: "white",
    borderRadius: 10,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    padding: 8,
    marginTop: 8,
  },
  evidence: {
    padding: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#aaa",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trust: { fontSize: 9, color: C.muted, lineHeight: 14, marginVertical: 14 },
  menu: {
    minHeight: 65,
    borderBottomWidth: 1,
    borderColor: C.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuFeatured: {
    backgroundColor: "white",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  bottomNav: {
    height: 66,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderColor: C.line,
    flexDirection: "row",
    overflow: "visible",
    paddingHorizontal: 4,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    minHeight: 48,
  },
  homeNavItem: { zIndex: 2 },
  homeNavCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginTop: -24,
    marginBottom: -3,
    backgroundColor: C.gold,
    borderWidth: 4,
    borderColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    elevation: 0,
  },
  homeNavCircleActive: { transform: [{ scale: 1.04 }] },
  navText: { fontSize: 10, color: C.muted, fontFamily: F.semibold },
  navTextActive: { color: C.red },
  homeNavText: { color: C.redDark, fontSize: 9, fontFamily: F.bold },
  guestBar: {
    minHeight: 42,
    paddingHorizontal: 16,
    backgroundColor: C.redDark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  guestBarIdentity: { flexDirection: "row", alignItems: "center", gap: 7 },
  guestBarText: { color: C.white, fontSize: 12, fontFamily: F.semibold },
  guestBarButton: {
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 11,
  },
  guestBarButtonText: { color: C.gold, fontSize: 12, fontFamily: F.bold },
  accountRoleBar: {
    minHeight: 48,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    flexDirection: "row",
    alignItems: "stretch",
  },
  accountRoleBarContent: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  accountRoleChoice: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    paddingHorizontal: 13,
    borderRadius: 17,
    backgroundColor: C.cream,
  },
  accountRoleChoiceActive: { backgroundColor: C.redDark },
  accountRoleChoiceText: {
    color: C.redDark,
    fontSize: 12,
    fontFamily: F.semibold,
  },
  accountRoleChoiceTextActive: { color: C.white },
  accountRoleAdd: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
  },
  accountRoleAddText: {
    color: C.red,
    fontSize: 12,
    fontFamily: F.semibold,
  },
  accountSignOut: {
    width: 74,
    borderLeftWidth: 1,
    borderLeftColor: C.line,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    backgroundColor: C.white,
  },
  accountSignOutText: {
    color: C.red,
    fontSize: 10,
    fontFamily: F.bold,
  },
  emptyBadge: {
    borderWidth: 1.5,
    borderColor: "#c9c8c3",
    borderRadius: 999,
    backgroundColor: "#eeece7",
  },
  loader: {
    flex: 1,
    minHeight: 480,
    backgroundColor: C.redDark,
    overflow: "hidden",
  },
  loaderImage: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  loaderShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#170A24A8",
  },
  loaderContent: {
    flex: 1,
    minHeight: 480,
    paddingHorizontal: 22,
    paddingTop: Platform.OS === "ios" ? 62 : 34,
    paddingBottom: Platform.OS === "ios" ? 48 : 30,
    justifyContent: "space-between",
  },
  loaderWordmark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loaderMark: {
    width: 36,
    height: 40,
    borderRadius: 9,
    backgroundColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderMarkText: {
    color: C.redDark,
    fontSize: 22,
    fontFamily: F.black,
  },
  loaderTitle: {
    color: C.white,
    fontSize: 21,
    lineHeight: 25,
    fontFamily: F.black,
    letterSpacing: 0.3,
  },
  loaderMessage: {
    maxWidth: 340,
    paddingBottom: 4,
  },
  loaderHeadline: {
    color: C.white,
    fontSize: 35,
    lineHeight: 38,
    fontFamily: F.black,
    letterSpacing: -1.1,
  },
  loaderSub: {
    color: "#F3EEF8",
    fontSize: 10,
    lineHeight: 14,
    fontFamily: F.bold,
    letterSpacing: 0.8,
    marginTop: 10,
  },
  loaderTrack: {
    width: "100%",
    maxWidth: 240,
    height: 4,
    backgroundColor: "#FFFFFF3D",
    borderRadius: 2,
    marginTop: 20,
    overflow: "hidden",
  },
  loaderBar: {
    width: "100%",
    height: 4,
    backgroundColor: C.gold,
    borderRadius: 2,
  },
  seasonHead: { backgroundColor: C.red, paddingBottom: 26 },
  seasonTitle: {
    fontSize: 40,
    lineHeight: 44,
    fontFamily: F.black,
    letterSpacing: -1.2,
    color: "white",
    paddingHorizontal: 18,
    marginTop: 10,
  },
  modeSwitch: {
    flexDirection: "row",
    backgroundColor: "#e9e5e8",
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 9,
  },
  modeActive: { backgroundColor: "white" },
  cleanTableHead: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  cleanTableRow: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderBottomWidth: 1,
    borderColor: "#ebeae6",
  },
  posCell: {
    width: 44,
    textAlign: "center",
    fontSize: 10,
    fontFamily: F.bold,
    color: C.muted,
    fontVariant: ["tabular-nums"],
  },
  topPos: { color: C.green },
  dropPos: { color: C.red },
  clubHead: { width: 210, fontSize: 9, color: C.muted },
  clubCell: {
    width: 210,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  clubName: { flex: 1, fontSize: 12, fontFamily: F.bold },
  numCell: {
    width: 48,
    textAlign: "center",
    fontSize: 11,
    fontFamily: F.medium,
    fontVariant: ["tabular-nums"],
  },
  formHead: { width: 122, textAlign: "center", fontSize: 9 },
  formCell: {
    width: 122,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 3,
  },
  formDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 7,
    lineHeight: 16,
    color: "white",
    fontWeight: "900",
  },
  formW: { backgroundColor: C.green },
  formD: { backgroundColor: "#888" },
  formL: { backgroundColor: C.red },
  clubHero: {
    backgroundColor: "white",
    alignItems: "center",
    padding: 28,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  clubHeroTitle: {
    fontSize: 30,
    fontFamily: F.black,
    letterSpacing: -0.7,
    marginTop: 12,
  },
  clubNumbers: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
    textAlign: "center",
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderColor: C.line,
  },
  playerRow: {
    minHeight: 64,
    backgroundColor: "white",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    marginBottom: 7,
    borderWidth: 1,
    borderColor: C.line,
  },
  playerRowPressed: {
    backgroundColor: "#F0F0EC",
    transform: [{ scale: 0.992 }],
  },
  lineupStatus: {
    minHeight: 68,
    padding: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
  },
  lineupStatusConfirmed: {
    backgroundColor: "#EDF7F1",
    borderColor: "#B8DCC8",
  },
  lineupStatusReported: {
    backgroundColor: "#FFF8E6",
    borderColor: "#EAD08B",
  },
  lineupStatusTitle: { fontSize: 12, fontFamily: F.bold, color: C.ink },
  lineupStatusCopy: {
    fontSize: 10,
    lineHeight: 15,
    color: C.muted,
    marginTop: 2,
  },
  lineupHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  lineupOrdinal: {
    fontSize: 11,
    fontFamily: F.bold,
    color: C.muted,
    fontVariant: ["tabular-nums"],
  },
  playerNameLine: { flexDirection: "row", alignItems: "center", gap: 7 },
  captainChip: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  captainChipText: { color: C.white, fontSize: 9, fontFamily: F.black },
  nationFlag: { fontSize: 18 },
  coachRow: {
    minHeight: 64,
    marginTop: 12,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFEFEC",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    padding: 24,
    backgroundColor: "white",
    borderRadius: 14,
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
  },
  smallPill: {
    backgroundColor: "#ece9eb",
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  matchHero: {
    backgroundColor: C.red,
    minHeight: 190,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  matchSide: { width: 115, alignItems: "center", gap: 8 },
  matchTeam: {
    fontSize: 13,
    fontFamily: F.extra,
    color: "white",
    textAlign: "center",
  },
  kickoff: {
    backgroundColor: C.white,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    alignItems: "center",
  },
  kickoffText: {
    fontSize: 24,
    fontFamily: F.black,
    fontVariant: ["tabular-nums"],
    color: C.ink,
  },
  matchMeta: {
    textAlign: "center",
    fontSize: 10,
    color: C.muted,
    lineHeight: 17,
    backgroundColor: C.white,
    padding: 15,
    color: C.muted,
  },
  matchTabs: {
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  matchTab: {
    paddingHorizontal: 10,
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderColor: "transparent",
  },
  matchTabActive: { borderColor: C.red },
  timelineHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
  },
  liveState: {
    minHeight: 32,
    borderRadius: 16,
    backgroundColor: "#EEEDEA",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
  },
  liveStateDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.gold,
  },
  liveStateText: { fontSize: 8, fontFamily: F.bold, letterSpacing: 0.6 },
  timelineRail: {
    backgroundColor: C.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.line,
  },
  timelineEvent: { minHeight: 84, flexDirection: "row", alignItems: "stretch" },
  timelineTimeWrap: { width: 52, paddingTop: 22 },
  timelineTime: {
    fontSize: 10,
    fontFamily: F.bold,
    color: C.muted,
    fontVariant: ["tabular-nums"],
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEEDEA",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  timelineIconActive: { backgroundColor: C.green },
  timelineEventCopy: {
    flex: 1,
    marginLeft: 12,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: C.line,
    gap: 3,
  },
  formTeam: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  infoCard: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
  },
  compareRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  compareValue: {
    fontSize: 16,
    fontFamily: F.black,
    width: 50,
    textAlign: "center",
  },
  compareLabel: { flex: 1, textAlign: "center", fontSize: 12, color: C.muted },
  matchStatTeams: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  matchPlayerEvent: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  matchEventIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ECECEA",
    alignItems: "center",
    justifyContent: "center",
  },
  eventMinute: {
    minWidth: 38,
    textAlign: "right",
    fontSize: 13,
    fontFamily: F.black,
    fontVariant: ["tabular-nums"],
  },
  voteLocked: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: C.white,
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: C.line,
  },
  voteLockIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.ink,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  votePlayer: {
    minHeight: 62,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  votePlayerSelected: { backgroundColor: "#EDF7F1" },
  voteConfirmation: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: C.green,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  fixtureDate: {
    fontSize: 8,
    color: C.muted,
    textAlign: "center",
    marginBottom: 11,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  fixtureLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  fixtureClub: {
    width: "40%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  fixtureName: { fontSize: 11, fontWeight: "800", maxWidth: 86 },
  fixtureTime: {
    width: "18%",
    textAlign: "center",
    fontSize: 15,
    fontWeight: "900",
  },
  fixtureArrow: { position: "absolute", right: 6, bottom: 25 },
  fixtureGroup: { marginTop: 22 },
  fixtureGroupTitle: {
    fontSize: 20,
    fontFamily: F.extra,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  fixtureAligned: {
    minHeight: 92,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderColor: C.line,
    paddingVertical: 11,
  },
  fixtureVenue: {
    color: C.muted,
    fontSize: 8,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 9,
  },
  fixtureGrid: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  fixtureHomeName: {
    flex: 1,
    minWidth: 0,
    textAlign: "right",
    paddingRight: 8,
    fontSize: 11,
    fontFamily: F.bold,
  },
  fixtureAwayName: {
    flex: 1,
    minWidth: 0,
    textAlign: "left",
    paddingLeft: 8,
    fontSize: 11,
    fontFamily: F.bold,
  },
  fixtureBadgeSlot: {
    width: 46,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  fixtureKickoff: {
    width: 58,
    textAlign: "center",
    fontSize: 15,
    fontFamily: F.black,
    fontVariant: ["tabular-nums"],
  },
  featureGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  featureTile: {
    width: "48%",
    minHeight: 72,
    backgroundColor: "white",
    borderRadius: 13,
    padding: 12,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: C.line,
  },
  actionToast: {
    backgroundColor: C.green,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  leaderCard: {
    height: 72,
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 9,
  },
  roundBack: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#ece9eb",
    alignItems: "center",
    justifyContent: "center",
  },
  fantasyHeader: { backgroundColor: C.red, padding: 12, paddingBottom: 22 },
  fantasyModeSwitch: {
    flexDirection: "row",
    backgroundColor: C.redDark,
    borderRadius: 12,
    padding: 4,
  },
  fantasyModeButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 9,
  },
  fantasyModeActive: { backgroundColor: "white" },
  fantasyModeText: { color: "white", fontWeight: "800", fontSize: 12 },
  fantasyHeroCopy: { paddingTop: 24 },
  fantasyHeroTitle: { color: "white", fontSize: 38, fontWeight: "900" },
  fantasyHeroBody: { color: "#E8D9FF", fontSize: 12, marginTop: 4 },
  managerLine: {
    marginTop: 22,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#ffffff45",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  managerBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  fantasyTeamName: { color: "white", fontSize: 17, fontWeight: "900" },
  fantasyMetrics: {
    flexDirection: "row",
    justifyContent: "space-around",
    textAlign: "center",
    paddingTop: 18,
  },
  fantasyMetricNumber: {
    color: "white",
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center",
  },
  fantasyManage: {
    marginTop: 20,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  fantasyMenuRow: {
    height: 58,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  fantasyInfoHero: {
    backgroundColor: C.red,
    borderRadius: 14,
    padding: 22,
    marginBottom: 16,
  },
  fantasyInfoTitle: {
    color: "white",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 16,
  },
  fantasyInfoCopy: {
    color: "#E8D9FF",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  menuRow: {
    minHeight: 58,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  menuText: { flex: 1, fontSize: 13, fontWeight: "800" },
  fantasyScoreStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    padding: 18,
    backgroundColor: "white",
  },
  fantasyScore: { fontSize: 26, fontWeight: "900", textAlign: "center" },
  fantasyScoreLabel: { fontSize: 8, color: C.muted, fontWeight: "800" },
  fantasyScoreMain: {
    backgroundColor: C.red,
    borderRadius: 12,
    paddingHorizontal: 25,
    paddingVertical: 12,
    alignItems: "center",
  },
  fantasyScoreMainNumber: { color: "white", fontSize: 34, fontWeight: "900" },
  fantasyPitch: {
    minHeight: 610,
    backgroundColor: "#128a4a",
    margin: 10,
    borderRadius: 14,
    paddingVertical: 18,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  pitchBox: {
    position: "absolute",
    top: 0,
    left: 30,
    right: 30,
    height: 105,
    borderWidth: 2,
    borderColor: "#ffffffaa",
  },
  pitchCircle: {
    position: "absolute",
    top: 255,
    left: "38%",
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: "#ffffffaa",
  },
  fantasyFormationRow: {
    minHeight: 125,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 5,
  },
  fantasyPlayer: { width: 78, alignItems: "center" },
  fantasyPlayerCompact: { marginRight: 10 },
  kitTile: {
    width: 56,
    height: 56,
    borderRadius: 9,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  fantasyPlayerName: {
    width: "100%",
    backgroundColor: "white",
    color: C.ink,
    fontSize: 9,
    fontWeight: "900",
    paddingVertical: 3,
    paddingHorizontal: 3,
    textAlign: "center",
  },
  fantasyPoints: {
    width: "100%",
    backgroundColor: "#6f0010",
    color: "white",
    fontSize: 9,
    fontWeight: "900",
    textAlign: "center",
    paddingVertical: 3,
  },
  fantasyBench: { padding: 14, backgroundColor: "#d7f0df" },
  toolHero: {
    backgroundColor: C.red,
    padding: 24,
    minHeight: 180,
    justifyContent: "flex-end",
  },
  toolHeroTitle: {
    color: "white",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 18,
  },
  toolHeroCopy: {
    color: "#ffd8da",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 310,
  },
  toolRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  toolCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  toolCheckActive: { backgroundColor: C.green, borderColor: C.green },
  scorerHead: {
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  scorerRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  scorerRank: {
    width: 34,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "900",
  },
  scorerName: { flex: 1 },
  scorerGoals: {
    width: 46,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "900",
  },
  scorerHero: { padding: 28, backgroundColor: "white", alignItems: "center" },
  scorerAvatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#f2e7e8",
    alignItems: "center",
    justifyContent: "center",
  },
  scorerClub: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  playerStatGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "white",
    borderRadius: 14,
    padding: 20,
    marginBottom: 14,
  },
  playerHero: {
    height: 322,
    backgroundColor: C.red,
    overflow: "hidden",
  },
  playerBack: {
    position: "absolute",
    top: 18,
    left: 16,
    zIndex: 3,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.redDark,
    alignItems: "center",
    justifyContent: "center",
  },
  followButton: {
    position: "absolute",
    top: 20,
    right: 16,
    zIndex: 3,
    minWidth: 78,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.redDark,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  followButtonActive: { backgroundColor: C.green },
  playerHeroPhoto: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: "47%",
    height: 225,
    borderTopRightRadius: 16,
  },
  playerSilhouette: {
    position: "absolute",
    left: 22,
    bottom: 0,
    width: 145,
    height: 190,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  playerHeroCopy: {
    position: "absolute",
    left: "42%",
    right: 14,
    bottom: 30,
  },
  playerFirstName: {
    color: "white",
    fontSize: 21,
    fontFamily: F.medium,
    letterSpacing: -0.25,
  },
  playerLastName: {
    color: "white",
    fontSize: 31,
    lineHeight: 31,
    fontFamily: F.black,
    letterSpacing: -0.9,
  },
  playerClubLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  playerClubText: {
    flex: 1,
    color: "white",
    fontSize: 11,
    fontFamily: F.semibold,
  },
  playerActions: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    backgroundColor: "white",
  },
  playerAction: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: C.ink,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  profileNotice: {
    marginHorizontal: 10,
    backgroundColor: C.green,
    padding: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playerTabs: {
    height: 58,
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 10,
  },
  playerTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderColor: "transparent",
  },
  playerTabActive: { borderColor: C.red },
  playerOverviewGrid: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 22,
  },
  playerOverviewItem: {
    width: "50%",
    minHeight: 68,
    justifyContent: "center",
    paddingRight: 8,
  },
  nextMatchCard: {
    backgroundColor: "white",
    borderRadius: 12,
    paddingTop: 20,
    overflow: "hidden",
  },
  nextMatchTeams: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 8,
  },
  playerMatchRow: {
    minHeight: 66,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  playerRowPhoto: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  communityFixtureRow: {
    minHeight: 108,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: C.line,
    gap: 10,
  },
  communityFixtureRowCompact: { minHeight: 96 },
  communityFixtureNarrow: {
    minHeight: 142,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  communityFixtureNarrowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  communityNarrowKickoff: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  communityFixtureNarrowTeams: { gap: 7, marginTop: 11 },
  communityFixtureNarrowFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  communityNarrowVenue: { flex: 1, color: C.muted, fontSize: 11 },
  communityFixturePressed: { backgroundColor: "#F7F4FA" },
  communityTimeBlock: { width: 48, alignItems: "center" },
  communityTime: {
    fontSize: 15,
    fontFamily: F.black,
    color: C.ink,
    fontVariant: ["tabular-nums"],
  },
  communityDay: {
    fontSize: 8,
    fontFamily: F.bold,
    color: C.muted,
    marginTop: 3,
  },
  communityFixtureMain: { flex: 1, gap: 5 },
  communityTeamLine: { flexDirection: "row", alignItems: "center", gap: 7 },
  communityMiniBadge: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: C.redDark,
    alignItems: "center",
    justifyContent: "center",
  },
  communityMiniBadgeAway: { backgroundColor: C.red },
  communityMiniBadgeText: { color: "white", fontSize: 7, fontFamily: F.black },
  communityTeamName: {
    flex: 1,
    fontSize: 12,
    fontFamily: F.bold,
    color: C.ink,
  },
  communityVenue: { fontSize: 8, color: C.muted, marginLeft: 31 },
  communityFixtureEnd: { width: 64, alignItems: "flex-end", gap: 10 },
  communityStatus: {
    fontSize: 8,
    fontFamily: F.bold,
    color: C.muted,
    textAlign: "right",
  },
  communityStatusOpen: { color: C.red },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.line,
    alignSelf: "center",
    marginBottom: 20,
  },
  matchSheetTeams: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 20,
  },
  matchSheetTeam: { width: 105, alignItems: "center", gap: 8 },
  matchSheetBadge: {
    width: 58,
    height: 58,
    borderRadius: 15,
    backgroundColor: C.redDark,
    alignItems: "center",
    justifyContent: "center",
  },
  matchSheetBadgeText: { color: "white", fontSize: 15, fontFamily: F.black },
  matchSheetKickoff: { alignItems: "center" },
  matchSheetTime: {
    fontSize: 25,
    fontFamily: F.black,
    fontVariant: ["tabular-nums"],
  },
  matchSheetVenue: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 12,
    marginBottom: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  communityWelcome: {
    marginHorizontal: 12,
    padding: 18,
    borderRadius: 14,
    backgroundColor: C.redDark,
    overflow: "hidden",
  },
  communityWelcomeTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  homeTeamBadge: {
    width: 42,
    height: 42,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.gold,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
  },
  homeTeamBadgeText: { color: "white", fontSize: 12, fontFamily: F.black },
  homeGreeting: { color: "white", fontSize: 13, fontFamily: F.bold },
  homeTeamMeta: { color: "#D7C8E6", fontSize: 9, marginTop: 3 },
  readyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF18",
  },
  readyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold },
  readyText: { color: "white", fontSize: 8, fontFamily: F.bold },
  communityWelcomeTitle: {
    color: "white",
    fontSize: 29,
    lineHeight: 32,
    fontFamily: F.black,
    letterSpacing: -0.7,
    marginTop: 24,
    maxWidth: 290,
  },
  communityWelcomeBody: {
    color: "#D7C8E6",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    maxWidth: 310,
  },
  communityHomeActions: { flexDirection: "row", gap: 8, marginTop: 20 },
  communityPrimaryAction: {
    flex: 1,
    minHeight: 46,
    borderRadius: 4,
    backgroundColor: C.gold,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  communityPrimaryActionText: {
    color: C.redDark,
    fontSize: 11,
    fontFamily: F.bold,
  },
  communitySecondaryAction: {
    flex: 1,
    minHeight: 46,
    borderRadius: 4,
    backgroundColor: C.red,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  communitySecondaryActionText: {
    color: "white",
    fontSize: 11,
    fontFamily: F.bold,
  },
  communityHomeSection: { paddingHorizontal: 16, paddingTop: 22 },
  communitySectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  communitySectionTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: F.black,
    color: C.ink,
    letterSpacing: -0.35,
  },
  communitySectionSub: { fontSize: 9, color: C.muted, marginTop: 3 },
  communitySeeAll: { fontSize: 10, fontFamily: F.bold, color: C.red },
  communityMatchCard: {
    gap: 12,
  },
  upcomingMatchCard: {
    padding: 14,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
  },
  upcomingMatchTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  upcomingMatchDate: {
    color: C.ink,
    fontSize: 13,
    fontFamily: F.black,
  },
  upcomingMatchVenue: {
    maxWidth: 210,
    marginTop: 3,
    color: C.muted,
    fontSize: 10,
  },
  confirmedPill: {
    minHeight: 25,
    paddingHorizontal: 9,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E8F6ED",
  },
  confirmedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.green,
  },
  confirmedPillText: {
    color: C.green,
    fontSize: 8,
    fontFamily: F.bold,
  },
  upcomingTeams: {
    minHeight: 132,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  upcomingTeamsCompact: { minHeight: 122 },
  upcomingTeamSide: {
    flex: 1,
    alignItems: "center",
    gap: 7,
  },
  upcomingSideLabel: {
    color: C.muted,
    fontSize: 8,
    fontFamily: F.bold,
    letterSpacing: 1.2,
  },
  upcomingTeamName: {
    minHeight: 32,
    color: C.ink,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: F.black,
    textAlign: "center",
  },
  upcomingKickoff: {
    width: 68,
    alignItems: "center",
    gap: 3,
  },
  upcomingTime: {
    color: C.ink,
    fontSize: 16,
    fontFamily: F.black,
    fontVariant: ["tabular-nums"],
  },
  upcomingVs: {
    color: C.red,
    fontSize: 10,
    fontFamily: F.black,
  },
  upcomingFormat: {
    color: C.muted,
    fontSize: 8,
    fontFamily: F.bold,
    textAlign: "center",
  },
  upcomingAgreement: {
    paddingVertical: 12,
    paddingHorizontal: 11,
    borderRadius: 11,
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#F7F4F8",
  },
  upcomingAgreementItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  upcomingAgreementValue: {
    color: C.ink,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: F.bold,
  },
  upcomingAgreementLabel: {
    color: C.muted,
    fontSize: 7,
    lineHeight: 11,
    fontFamily: F.bold,
  },
  upcomingActions: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionsCompact: { flexDirection: "column" },
  stackOnCompact: { flexDirection: "column", alignItems: "flex-start" },
  upcomingChatButton: {
    flex: 1,
    minWidth: 118,
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  upcomingRefButton: {
    flex: 1,
    minWidth: 118,
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: C.red,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  readinessValue: { fontSize: 20, fontFamily: F.black, color: C.red },
  readinessTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: C.line,
    overflow: "hidden",
  },
  readinessFill: {
    width: "78%",
    height: "100%",
    backgroundColor: C.red,
    borderRadius: 4,
  },
  readinessLegend: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  screenIntro: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 18 },
  screenTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontFamily: F.black,
    letterSpacing: -0.7,
    color: C.ink,
    marginBottom: 5,
  },
  communitySegments: {
    minHeight: 44,
    flexDirection: "row",
    padding: 4,
    borderRadius: 10,
    backgroundColor: "#E9E5EC",
    gap: 3,
  },
  communitySegment: {
    flex: 1,
    minHeight: 36,
    borderRadius: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  communitySegmentActive: { backgroundColor: "white" },
  communitySegmentText: { fontSize: 10, fontFamily: F.bold, color: C.muted },
  communitySegmentTextActive: { color: C.red },
  segmentBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBadgeText: { color: "white", fontSize: 8, fontFamily: F.bold },
  communityListSection: { paddingHorizontal: 16, paddingBottom: 20 },
  requestRow: {
    minHeight: 124,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  personSearchCard: {
    minHeight: 146,
    marginBottom: 12,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "white",
    flexDirection: "row",
    gap: 13,
  },
  personSearchImage: {
    width: 102,
    minHeight: 126,
    borderRadius: 10,
    resizeMode: "cover",
  },
  personSearchFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.redDark,
  },
  personSearchBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: 5,
  },
  personSearchStatus: {
    color: C.green,
    fontSize: 8,
    fontFamily: F.bold,
    letterSpacing: 0.8,
  },
  personSearchName: {
    color: C.ink,
    fontSize: 19,
    lineHeight: 22,
    fontFamily: F.black,
  },
  personSearchTeam: {
    color: C.redDark,
    fontSize: 11,
    fontFamily: F.bold,
  },
  personSearchActions: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  requestActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  acceptButton: {
    minHeight: 34,
    borderRadius: 4,
    paddingHorizontal: 15,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
  },
  declineButton: {
    minHeight: 34,
    borderRadius: 4,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  resultRow: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  resultScore: {
    fontSize: 17,
    lineHeight: 23,
    fontFamily: F.black,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  squadHero: {
    marginHorizontal: 12,
    marginBottom: 20,
    padding: 18,
    borderRadius: 14,
    backgroundColor: C.redDark,
  },
  squadIdentity: { flexDirection: "row", alignItems: "center", gap: 12 },
  squadCrest: {
    width: 62,
    height: 66,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: C.gold,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
  },
  squadCrestText: { color: "white", fontSize: 17, fontFamily: F.black },
  squadTeamName: { color: "white", fontSize: 18, fontFamily: F.black },
  squadTeamMeta: { color: "#D7C8E6", fontSize: 9, marginTop: 4 },
  squadStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderColor: "#5D3478",
    marginTop: 18,
    paddingTop: 16,
  },
  squadStatValue: {
    color: "white",
    fontSize: 19,
    fontFamily: F.black,
    textAlign: "center",
  },
  squadStatLabel: {
    color: "#D7C8E6",
    fontSize: 8,
    fontFamily: F.bold,
    marginTop: 2,
  },
  addPlayerButton: {
    minHeight: 34,
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: C.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  squadFilter: {
    flex: 1,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
  },
  squadFilterActive: { backgroundColor: "white" },
  playerList: { marginTop: 14 },
  playerAvatarText: { color: C.redDark, fontSize: 10, fontFamily: F.black },
  availabilityPill: {
    minWidth: 76,
    minHeight: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
  },
  availablePill: { backgroundColor: "#DCEFE3" },
  unavailablePill: { backgroundColor: "#F6DCE0" },
  pendingPill: { backgroundColor: "#F5E9C9" },
  availabilityText: { color: C.ink, fontSize: 8, fontFamily: F.bold },
  teamOpenText: { color: C.red, fontSize: 8, fontFamily: F.bold, marginTop: 4 },
  chatRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: { color: "white", fontSize: 9, fontFamily: F.bold },
  utilityIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#EEE8F6",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsGroupTitle: {
    color: C.muted,
    fontSize: 9,
    fontFamily: F.bold,
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 6,
  },
  settingRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  toggleTrack: {
    width: 42,
    height: 24,
    borderRadius: 12,
    padding: 3,
    backgroundColor: "#CAC4CE",
  },
  toggleTrackActive: { backgroundColor: C.red },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "white",
  },
  toggleKnobActive: { transform: [{ translateX: 18 }] },
  moreToolRow: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  moreToolIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#EEE8F6",
    alignItems: "center",
    justifyContent: "center",
  },
  moreToolTitle: {
    fontSize: 15,
    fontFamily: F.bold,
    color: C.ink,
    marginBottom: 3,
  },
  entityCreateButton: {
    minHeight: 72,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.red,
    backgroundColor: "white",
    paddingHorizontal: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  entityCreateIcon: {
    width: 38,
    height: 38,
    borderRadius: 4,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
  },
  entityCreateTitle: {
    fontSize: 14,
    fontFamily: F.bold,
    color: C.ink,
    marginBottom: 3,
  },
  entityCreateCopy: { fontSize: 9, lineHeight: 13, color: C.muted },
  lineupIntro: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lineupManagerBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.redDark,
    borderWidth: 3,
    borderColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  lineupManagerText: { color: C.gold, fontSize: 14, fontFamily: F.black },
  lineupSection: { paddingHorizontal: 16 },
  lineupSectionTitle: {
    color: C.ink,
    fontSize: 12,
    fontFamily: F.black,
    letterSpacing: 1.1,
  },
  formationOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    marginBottom: 18,
  },
  formationButton: {
    minWidth: 70,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  formationButtonActive: { backgroundColor: C.redDark, borderColor: C.redDark },
  formationButtonText: { color: C.ink, fontSize: 12, fontFamily: F.bold },
  formationButtonTextActive: { color: "white" },
  lineupPitch: {
    height: 510,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: "#5E8B6A",
    backgroundColor: "#183F29",
    overflow: "hidden",
    position: "relative",
  },
  pitchHalfLine: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#FFFFFF55",
  },
  pitchCircle: {
    position: "absolute",
    width: 94,
    height: 94,
    borderRadius: 47,
    borderWidth: 2,
    borderColor: "#FFFFFF55",
    left: "50%",
    top: "50%",
    transform: [{ translateX: -47 }, { translateY: -47 }],
  },
  pitchTopBox: {
    position: "absolute",
    width: "46%",
    height: 74,
    left: "27%",
    top: 0,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#FFFFFF55",
  },
  pitchBottomBox: {
    position: "absolute",
    width: "46%",
    height: 74,
    left: "27%",
    bottom: 0,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderColor: "#FFFFFF55",
  },
  lineupPlayer: {
    position: "absolute",
    width: 70,
    alignItems: "center",
    marginLeft: -35,
    marginTop: -28,
  },
  lineupPlayerDisc: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.gold,
    borderWidth: 2,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  lineupGoalkeeperDisc: { backgroundColor: "#D9532B" },
  lineupPlayerNumber: { color: C.redDark, fontSize: 12, fontFamily: F.black },
  lineupPlayerName: {
    color: "white",
    fontSize: 8,
    lineHeight: 14,
    fontFamily: F.bold,
    backgroundColor: "#102B1D",
    paddingHorizontal: 5,
    borderRadius: 4,
    marginTop: 3,
  },
  benchHeader: {
    marginTop: 18,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  benchHint: { color: C.red, fontSize: 10, fontFamily: F.bold },
  benchRow: { gap: 15, paddingHorizontal: 4, paddingBottom: 8 },
  benchPlayer: { width: 56, alignItems: "center", gap: 7 },
  benchDisc: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  benchDiscSelected: { backgroundColor: C.gold, borderColor: C.redDark },
  benchNumber: { color: C.ink, fontSize: 12, fontFamily: F.black },
  benchName: { color: C.muted, fontSize: 9, fontFamily: F.bold },
  saveLineupButton: {
    minHeight: 54,
    borderRadius: 4,
    marginTop: 18,
    backgroundColor: C.red,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveLineupButtonSaved: { backgroundColor: C.green },
  saveLineupText: {
    color: "white",
    fontSize: 12,
    fontFamily: F.black,
    letterSpacing: 0.4,
  },
  formIntro: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16 },
  formSection: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderColor: C.line,
  },
  formSectionTitle: {
    color: C.ink,
    fontSize: 18,
    fontFamily: F.black,
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  formLabel: {
    color: C.ink,
    fontSize: 10,
    fontFamily: F.bold,
    marginBottom: 7,
    marginTop: 9,
  },
  formInput: {
    minHeight: 48,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "white",
    color: C.ink,
    paddingHorizontal: 12,
    fontFamily: F.medium,
    fontSize: 12,
  },
  dropdownField: {
    minHeight: 50,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  dropdownFieldDisabled: { backgroundColor: "#ECE8F0" },
  dropdownValue: {
    flex: 1,
    color: C.ink,
    fontSize: 13,
    fontFamily: F.medium,
  },
  dropdownPlaceholder: { color: C.muted },
  dropdownValueDisabled: { color: "#817887" },
  dropdownBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: "#17131DB8",
  },
  dropdownSheet: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "72%",
    alignSelf: "center",
    borderRadius: 14,
    backgroundColor: C.white,
    overflow: "hidden",
  },
  dropdownSheetHeader: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingTop: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  dropdownClose: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -8,
    marginRight: -10,
  },
  dropdownOptions: { flexGrow: 0 },
  dropdownOption: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  dropdownOptionSelected: { backgroundColor: "#EEE8F6" },
  dropdownOptionText: {
    flex: 1,
    color: C.ink,
    fontSize: 14,
    fontFamily: F.medium,
  },
  dropdownOptionTextSelected: { color: C.redDark, fontFamily: F.bold },
  formHelp: { color: C.muted, fontSize: 9, lineHeight: 14, marginTop: 7 },
  optionWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  formChoice: {
    minHeight: 40,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "white",
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  formChoiceActive: { backgroundColor: C.redDark, borderColor: C.redDark },
  formChoiceText: { color: C.ink, fontSize: 10, fontFamily: F.bold },
  formChoiceTextActive: { color: "white" },
  ruleSummary: {
    minHeight: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#EEE8F6",
    borderRadius: 11,
    marginTop: 14,
  },
  ruleValue: {
    color: C.redDark,
    fontSize: 18,
    fontFamily: F.black,
    textAlign: "center",
  },
  ruleLabel: { color: C.muted, fontSize: 7, fontFamily: F.bold, marginTop: 2 },
  inlineLink: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  moneyRow: { flexDirection: "row", gap: 10 },
  moneyInput: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "white",
    paddingHorizontal: 11,
  },
  moneyPrefix: { color: C.red, fontSize: 15, fontFamily: F.black },
  moneyTextInput: {
    flex: 1,
    color: C.ink,
    fontSize: 13,
    fontFamily: F.bold,
    paddingLeft: 6,
  },
  inviteComposer: { flexDirection: "row", gap: 8 },
  inviteInput: {
    flex: 1,
    minHeight: 46,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "white",
    paddingHorizontal: 12,
    color: C.ink,
  },
  inviteButton: {
    width: 46,
    height: 46,
    borderRadius: 4,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
  },
  invitedRow: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  formFooter: { paddingHorizontal: 16, paddingBottom: 18 },
  createdBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 11,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#DCEFE3",
  },
  teamCreatorHero: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 14,
    backgroundColor: C.redDark,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  teamCreatorBadge: {
    width: 64,
    height: 72,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  teamCreatorBadgeText: { color: "white", fontSize: 17, fontFamily: F.black },
  badgeNumber: {
    position: "absolute",
    right: -6,
    bottom: -6,
    minWidth: 21,
    height: 21,
    borderRadius: 11,
    paddingHorizontal: 4,
    backgroundColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeNumberText: { color: C.redDark, fontSize: 8, fontFamily: F.black },
  jerseyPreview: { width: 72, alignItems: "center" },
  jerseyColorDots: { flexDirection: "row", gap: 3, marginTop: -7 },
  jerseyColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#FFFFFF88",
  },
  teamCreatorName: { color: "white", fontSize: 16, fontFamily: F.black },
  teamCreatorMeta: { color: "#D7C8E6", fontSize: 8, marginTop: 4 },
  teamCreatorCoach: {
    color: C.gold,
    fontSize: 8,
    fontFamily: F.bold,
    marginTop: 7,
  },
  twoFieldRow: { flexDirection: "row", gap: 10 },
  formTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeSelectionLabel: { color: C.red, fontSize: 10, fontFamily: F.bold },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  generatedBadge: {
    width: 48,
    height: 54,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  generatedBadgeSelected: { borderColor: C.gold, transform: [{ scale: 1.05 }] },
  generatedBadgeText: {
    color: "white",
    fontSize: 13,
    fontFamily: F.black,
    zIndex: 1,
  },
  generatedBadgeStripe: {
    position: "absolute",
    width: 12,
    height: 70,
    transform: [{ rotate: "18deg" }],
    opacity: 0.7,
  },
  colorPicker: { flexDirection: "row", gap: 10, paddingVertical: 6 },
  colorChoice: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  colorChoiceSelected: { borderColor: C.redDark, transform: [{ scale: 1.08 }] },
  colourWheelFrame: {
    alignItems: "center",
    alignSelf: "center",
    width: "100%",
    paddingVertical: 10,
  },
  colourWheelLegend: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  colourWheelSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.ink,
  },
  liveLocationButton: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: "#EEE8F6",
  },
  liveLocationMessage: {
    color: C.redDark,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  roleSummary: {
    marginHorizontal: 16,
    marginBottom: 8,
    minHeight: 76,
    borderRadius: 12,
    backgroundColor: C.redDark,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  roleSummaryAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  roleSummaryInitial: { color: C.redDark, fontSize: 15, fontFamily: F.black },
  roleSummaryTitle: {
    color: "white",
    fontSize: 13,
    fontFamily: F.bold,
    marginBottom: 3,
  },
  roleCard: {
    minHeight: 96,
    borderBottomWidth: 1,
    borderColor: C.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  roleCardActive: {
    backgroundColor: "#EEE8F6",
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 11,
    borderBottomWidth: 0,
    marginBottom: 6,
  },
  roleIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#EEE8F6",
    alignItems: "center",
    justifyContent: "center",
  },
  roleIconActive: { backgroundColor: C.red },
  operationHero: {
    minHeight: 176,
    borderRadius: 14,
    padding: 17,
    backgroundColor: C.redDark,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  operationLabel: {
    color: C.gold,
    fontSize: 8,
    fontFamily: F.bold,
    letterSpacing: 0.7,
  },
  operationTitle: {
    color: "white",
    fontSize: 21,
    lineHeight: 25,
    fontFamily: F.black,
    marginTop: 12,
  },
  operationMeta: { color: "#D7C8E6", fontSize: 9, marginTop: 12 },
  operationScore: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  operationScoreValue: { color: "white", fontSize: 15, fontFamily: F.black },
  operationScoreLabel: { color: C.gold, fontSize: 6, fontFamily: F.bold },
  checklistRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircleActive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.green,
    borderColor: C.green,
    alignItems: "center",
    justifyContent: "center",
  },
  walletHero: {
    minHeight: 190,
    borderRadius: 14,
    padding: 18,
    backgroundColor: C.redDark,
  },
  walletLabel: {
    color: "#D7C8E6",
    fontSize: 8,
    fontFamily: F.bold,
    letterSpacing: 0.8,
  },
  walletBalance: {
    color: "white",
    fontSize: 38,
    fontFamily: F.black,
    marginTop: 8,
    fontVariant: ["tabular-nums"],
  },
  walletSplit: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: "#5D3478",
    paddingTop: 16,
    marginTop: 20,
  },
  walletMiniValue: {
    color: "white",
    fontSize: 15,
    fontFamily: F.black,
    textAlign: "center",
  },
  walletMiniLabel: {
    color: "#D7C8E6",
    fontSize: 7,
    fontFamily: F.bold,
    marginTop: 3,
  },
  quickMoneyActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  quickMoneyButton: {
    flex: 1,
    minHeight: 74,
    borderRadius: 10,
    backgroundColor: "#EEE8F6",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: 6,
  },
  quickMoneyText: {
    color: C.ink,
    fontSize: 8,
    fontFamily: F.bold,
    textAlign: "center",
  },
  transactionRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  transactionAmount: {
    color: C.ink,
    fontSize: 13,
    fontFamily: F.black,
    fontVariant: ["tabular-nums"],
  },
  invitePanel: { paddingVertical: 20 },
  inviteHeading: {
    color: C.ink,
    fontSize: 21,
    lineHeight: 25,
    fontFamily: F.black,
    letterSpacing: -0.35,
  },
  inviteSubheading: {
    maxWidth: 520,
    marginTop: 5,
    marginBottom: 16,
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  inviteSearch: {
    minHeight: 50,
    paddingHorizontal: 13,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  inviteSearchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    color: C.ink,
    fontSize: 14,
    fontFamily: F.medium,
  },
  inviteResultRow: {
    minHeight: 72,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  inviteResultRowSelected: {
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderBottomColor: "transparent",
    backgroundColor: "#EEE8F6",
  },
  inviteAvatar: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: "#EEE8F6",
  },
  inviteAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: C.redDark,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteAvatarText: { color: C.white, fontSize: 14, fontFamily: F.black },
  inviteResultName: {
    color: C.ink,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: F.bold,
  },
  inviteResultMeta: {
    marginTop: 3,
    color: C.muted,
    fontSize: 10,
    lineHeight: 14,
  },
  inviteDivider: {
    marginVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inviteDividerLine: { flex: 1, height: 1, backgroundColor: C.line },
  inviteDividerText: { color: C.muted, fontSize: 8, fontFamily: F.bold },
  inviteRoleIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#EEE8F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  playerIdentityHero: {
    minHeight: 142,
    borderRadius: 14,
    padding: 17,
    backgroundColor: C.redDark,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  playerIdentityAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: C.red,
    borderWidth: 3,
    borderColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  playerIdentityInitials: { color: "white", fontSize: 19, fontFamily: F.black },
  playerIdentityName: { color: "white", fontSize: 18, fontFamily: F.black },
  playerIdentityMeta: { color: "#D7C8E6", fontSize: 9, marginTop: 4 },
  verifiedLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
  },
  verifiedText: { color: C.gold, fontSize: 8, fontFamily: F.bold },
  playerMetricRow: {
    minHeight: 88,
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 11,
    marginTop: 12,
  },
  playerMetric: { flex: 1, alignItems: "center", justifyContent: "center" },
  playerMetricValue: { color: C.redDark, fontSize: 17, fontFamily: F.black },
  playerMetricLabel: {
    color: C.muted,
    fontSize: 6,
    fontFamily: F.bold,
    marginTop: 3,
  },
  availabilityHero: {
    minHeight: 78,
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#EEE8F6",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  availabilityDay: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  dayBadge: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: C.redDark,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBadgeText: { color: "white", fontSize: 10, fontFamily: F.black },
  fitSummary: {
    minHeight: 58,
    borderRadius: 11,
    backgroundColor: "#EEE8F6",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  teamFitRow: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  assignmentCard: {
    borderRadius: 14,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
  },
  assignmentTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  assignmentTeams: {
    color: C.ink,
    fontSize: 19,
    lineHeight: 24,
    fontFamily: F.black,
    marginTop: 8,
  },
  assignmentStatus: {
    alignSelf: "flex-start",
    borderRadius: 20,
    backgroundColor: "#F5E9C9",
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  assignmentStatusText: { color: C.ink, fontSize: 8, fontFamily: F.bold },
  assignmentMeta: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.line,
    marginTop: 14,
  },
  reportMatch: {
    borderRadius: 14,
    backgroundColor: C.redDark,
    padding: 17,
    alignItems: "center",
  },
  reportScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
  },
  reportScoreInput: {
    width: 70,
    height: 64,
    borderRadius: 11,
    backgroundColor: "white",
    color: C.ink,
    fontSize: 28,
    fontFamily: F.black,
    textAlign: "center",
  },
  reportDash: { color: "white", fontSize: 24, fontFamily: F.black },
  reportNotes: { minHeight: 104, paddingTop: 12, textAlignVertical: "top" },
  wizardProgress: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  wizardProgressBar: { flex: 1, height: 4, backgroundColor: C.line },
  wizardProgressBarActive: { backgroundColor: C.red },
  wizardScoreCard: {
    marginTop: 22,
    paddingVertical: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  wizardScoreTeam: { width: 130, alignItems: "center", gap: 8 },
  wizardScoreInput: {
    width: 72,
    height: 60,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "white",
    color: C.ink,
    textAlign: "center",
    fontSize: 26,
    fontFamily: F.black,
  },
  wizardScoreDivider: { color: C.muted, fontSize: 24, fontFamily: F.black },
  playerPicker: { gap: 7, paddingVertical: 3 },
  playerPickerChip: {
    minWidth: 76,
    minHeight: 66,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "white",
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  playerPickerChipActive: {
    backgroundColor: C.redDark,
    borderColor: C.redDark,
  },
  playerPickerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EEE8F6",
    alignItems: "center",
    justifyContent: "center",
  },
  playerPickerText: { color: C.ink, fontSize: 8, fontFamily: F.bold },
  addEventButton: {
    minHeight: 44,
    marginTop: 14,
    marginBottom: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.red,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  matchEventRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  eventIcon: {
    width: 34,
    height: 34,
    borderRadius: 4,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewScore: {
    minHeight: 110,
    borderRadius: 12,
    backgroundColor: C.redDark,
    padding: 15,
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  reviewTeam: {
    flex: 1,
    color: "white",
    fontSize: 11,
    fontFamily: F.bold,
    textAlign: "center",
  },
  reviewScoreValue: { color: C.gold, fontSize: 24, fontFamily: F.black },
  statsNotice: {
    minHeight: 74,
    borderRadius: 4,
    backgroundColor: "#EEE8F6",
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  flowActions: { marginTop: 10 },
  flowActionRow: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  recordMatchButton: {
    minHeight: 66,
    borderRadius: 4,
    marginTop: 18,
    paddingHorizontal: 15,
    backgroundColor: C.red,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  recordButtonMeta: { color: "#E8D9FF", fontSize: 8, marginTop: 3 },
  teamDiscoveryRow: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: C.line,
    paddingVertical: 10,
  },
  teamDiscoveryProfile: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  teamDiscoveryBadge: {
    width: 46,
    height: 50,
    borderRadius: 4,
    backgroundColor: C.redDark,
    alignItems: "center",
    justifyContent: "center",
  },
  teamTrustLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },
  teamTrustText: { color: C.green, fontSize: 8, fontFamily: F.bold },
  challengeButton: {
    minHeight: 36,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.red,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  challengeOpponent: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.line,
    marginTop: 20,
  },
  challengeBadge: {
    width: 48,
    height: 52,
    borderRadius: 4,
    backgroundColor: C.redDark,
    alignItems: "center",
    justifyContent: "center",
  },
  reliabilityMark: { alignItems: "center", gap: 3 },
  reliabilityText: { color: C.green, fontSize: 6, fontFamily: F.bold },
  challengeReview: {
    borderRadius: 12,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: C.line,
    padding: 15,
    marginTop: 18,
  },
  reviewTeamsLine: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  reviewVs: { color: C.red, fontSize: 10, fontFamily: F.black },
  reviewDetailRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  reviewTeamBlock: {
    flex: 1,
    alignItems: "center",
    minHeight: 66,
    justifyContent: "center",
  },
  reviewScorer: {
    color: "#E8D9FF",
    fontSize: 8,
    lineHeight: 12,
    fontFamily: F.medium,
    textAlign: "center",
  },
  customFormationHint: {
    minHeight: 64,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.red,
    backgroundColor: "white",
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  lineupPlayerDiscSelected: {
    backgroundColor: "white",
    borderColor: C.gold,
    borderWidth: 4,
  },
  crestPreview: {
    width: 58,
    height: 66,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  crestPreviewSmall: { width: 38, height: 44, borderWidth: 1 },
  crestPreviewText: {
    color: "white",
    fontSize: 15,
    fontFamily: F.black,
    zIndex: 1,
  },
  crestPreviewTextSmall: { fontSize: 9 },
  crestBand: {
    position: "absolute",
    width: 14,
    height: 90,
    backgroundColor: "#FFFFFF26",
    transform: [{ rotate: "18deg" }],
  },
  crestShapeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  crestShapeChoice: {
    width: "31.5%",
    minHeight: 74,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  crestShapeChoiceActive: { borderColor: C.red, backgroundColor: "#EEE8F6" },
  chatBubble: {
    alignSelf: "flex-start",
    maxWidth: "82%",
    backgroundColor: C.white,
    borderRadius: 14,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chatBubbleOwn: {
    alignSelf: "flex-end",
    backgroundColor: C.red,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 4,
  },
  chatComposer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
  },
  chatInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: C.cream,
    paddingHorizontal: 15,
    color: C.ink,
  },
  chatSend: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
  },
  jerseyArt: {
    width: 78,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  jerseyArtSmall: { width: 58, height: 58 },
  jerseyBody: {
    width: 48,
    height: 58,
    borderRadius: 4,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  jerseyBodySmall: { width: 36, height: 44 },
  jerseySleeve: {
    position: "absolute",
    top: 9,
    width: 24,
    height: 22,
    borderRadius: 3,
  },
  jerseySleeveLeft: { left: 4, transform: [{ rotate: "22deg" }] },
  jerseySleeveRight: { right: 4, transform: [{ rotate: "-22deg" }] },
  kitStripeRow: { ...StyleSheet.absoluteFillObject, flexDirection: "row" },
  kitVerticalStripe: { flex: 1 },
  kitHoops: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-around",
  },
  kitHoop: { height: 8 },
  kitSash: {
    position: "absolute",
    width: 13,
    height: 78,
    transform: [{ rotate: "-28deg" }],
  },
  kitSlotRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  kitSlot: {
    flex: 1,
    minHeight: 112,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  kitSlotActive: { borderColor: C.red, backgroundColor: "#EEE8F6" },
  kitEditor: {
    borderTopWidth: 1,
    borderColor: C.line,
    marginTop: 18,
    paddingTop: 18,
  },
  setupEmpty: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  inlineSuccess: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DCEFE3",
    borderRadius: 4,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  groundMap: {
    minHeight: 150,
    backgroundColor: "#EEE8F6",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 14,
  },
  buttonDisabled: { opacity: 0.45 },
  storeSummary: {
    minHeight: 92,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.line,
    marginBottom: 8,
  },
  storeValue: {
    color: C.redDark,
    fontSize: 24,
    fontFamily: F.black,
    textAlign: "center",
  },
  productRow: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  productThumb: {
    width: 44,
    height: 48,
    borderRadius: 4,
    backgroundColor: "#EEE8F6",
    alignItems: "center",
    justifyContent: "center",
  },
  storeStatus: {
    minHeight: 34,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  storeStatusLive: { borderColor: C.green, backgroundColor: "#DCEFE3" },
  storeStatusText: { color: C.ink, fontSize: 8, fontFamily: F.bold },
  leagueSafety: {
    minHeight: 88,
    borderRadius: 4,
    backgroundColor: "#EEE8F6",
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 10,
  },
  leagueReviewPanel: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.red,
    backgroundColor: "white",
    padding: 14,
    marginBottom: 12,
  },
  moneyOwnership: { borderTopWidth: 1, borderColor: C.line },
  moneyOwnerChoice: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 6,
  },
  moneyOwnerChoiceActive: { backgroundColor: "#EEE8F6" },
  teamProfileHero: {
    minHeight: 128,
    borderRadius: 12,
    backgroundColor: C.redDark,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  statsSummaryStrip: {
    minHeight: 92,
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: C.line,
  },
  statLeaderRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  statLeaderValue: {
    color: C.redDark,
    fontSize: 22,
    fontFamily: F.black,
    fontVariant: ["tabular-nums"],
  },
  signInTitle: {
    marginTop: 34,
    fontSize: 32,
    letterSpacing: -0.8,
    fontFamily: F.black,
    color: C.ink,
  },
  signInCopy: {
    marginTop: 7,
    marginBottom: 12,
    color: C.muted,
    lineHeight: 21,
  },
  authSafe: { flex: 1, backgroundColor: C.redDark },
  authWelcome: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    backgroundColor: C.redDark,
  },
  authBrandRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  authMark: {
    width: 40,
    height: 44,
    borderRadius: 9,
    backgroundColor: C.red,
    borderWidth: 2,
    borderColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  authMarkText: { color: C.white, fontSize: 23, fontFamily: F.black },
  authBrand: { color: C.white, fontSize: 15, fontFamily: F.black },
  authBrandSub: {
    color: "#D7C8E6",
    fontSize: 10,
    marginTop: 2,
    fontFamily: F.semibold,
    letterSpacing: 0.45,
  },
  authHeroCopy: { marginTop: 28 },
  authGuestPromise: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  authGuestPromiseText: {
    color: C.gold,
    fontSize: 10,
    fontFamily: F.bold,
    letterSpacing: 0.45,
  },
  authTitle: {
    color: C.white,
    fontSize: 34,
    lineHeight: 37,
    fontFamily: F.black,
    letterSpacing: -1.1,
    maxWidth: 350,
  },
  authIntro: {
    color: "#E7DEEE",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    maxWidth: 345,
  },
  authMatchPreview: {
    marginTop: 25,
    borderRadius: 12,
    backgroundColor: "#3B1554",
    padding: 14,
  },
  authPreviewTop: { flexDirection: "row", alignItems: "center", gap: 7 },
  authLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.gold,
  },
  authPreviewLabel: {
    flex: 1,
    color: "#D7C8E6",
    fontSize: 10,
    fontFamily: F.bold,
    letterSpacing: 0.35,
  },
  authPreviewTime: {
    color: C.white,
    fontSize: 13,
    fontFamily: F.black,
    fontVariant: ["tabular-nums"],
  },
  authMatchup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 15,
  },
  authMatchupSide: { flex: 1, alignItems: "center", gap: 7 },
  authMatchupTeam: {
    color: C.white,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: F.bold,
    textAlign: "center",
  },
  authMatchupSignal: { width: 68, alignItems: "center", gap: 3 },
  authMatchupSignalText: { color: C.gold, fontSize: 8, fontFamily: F.bold },
  authMiniCrestAway: { backgroundColor: C.redDark },
  authFitReasons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 18,
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
    borderColor: "#67447C",
  },
  authFitReason: { flexDirection: "row", alignItems: "center", gap: 5 },
  authFitReasonText: { color: "#E7DEEE", fontSize: 10, fontFamily: F.medium },
  authPreviewTeams: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginTop: 14,
  },
  authMiniCrest: {
    width: 42,
    height: 46,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: C.gold,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
  },
  authMiniCrestText: { color: C.white, fontSize: 12, fontFamily: F.black },
  authPreviewTitle: { color: C.white, fontSize: 15, fontFamily: F.bold },
  authPreviewMeta: { color: "#D7C8E6", fontSize: 11, marginTop: 4 },
  authDecision: { marginTop: 25 },
  authQuestion: { color: C.white, fontSize: 14, fontFamily: F.bold },
  authRoleWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 11,
    marginBottom: 18,
  },
  authRoleChip: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 21,
    backgroundColor: "#EEE8F6",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  authRoleChipActive: { backgroundColor: C.red },
  authRoleChipText: { color: C.redDark, fontSize: 12, fontFamily: F.semibold },
  authRoleChipTextActive: { color: C.white },
  authPrimaryButton: {
    minHeight: 52,
    borderRadius: 4,
    paddingHorizontal: 16,
    backgroundColor: C.gold,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  authPrimaryButtonText: { color: C.redDark, fontSize: 15, fontFamily: F.bold },
  authNoPressure: {
    color: "#D7C8E6",
    fontSize: 11,
    textAlign: "center",
    marginTop: 9,
  },
  authAccountRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },
  authTextButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  authTextButtonLabel: { color: C.white, fontSize: 13, fontFamily: F.semibold },
  authDivider: { width: 1, height: 18, backgroundColor: "#67447C" },
  authFormScreen: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 34,
    backgroundColor: C.cream,
  },
  authFormTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  authBackButton: {
    minWidth: 64,
    height: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  authCancelText: { color: C.red, fontSize: 14, fontFamily: F.semibold },
  authFieldLabel: {
    color: C.ink,
    fontSize: 13,
    fontFamily: F.semibold,
    marginBottom: 7,
    marginTop: 18,
  },
  authInput: {
    minHeight: 50,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    color: C.ink,
    paddingHorizontal: 13,
    fontSize: 15,
    fontFamily: F.regular,
  },
  authPasswordField: {
    minHeight: 50,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    flexDirection: "row",
    alignItems: "center",
  },
  authPasswordInput: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 13,
    color: C.ink,
    fontSize: 15,
    fontFamily: F.regular,
  },
  authPasswordToggle: {
    width: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  authError: {
    minHeight: 44,
    marginTop: 14,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#F8E2E5",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  authErrorText: { flex: 1, color: "#7E1D2A", fontSize: 12, lineHeight: 17 },
  authSubmit: {
    minHeight: 52,
    marginTop: 24,
    borderRadius: 4,
    backgroundColor: C.red,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  authSubmitDisabled: { opacity: 0.65 },
  authSubmitText: { color: C.white, fontSize: 15, fontFamily: F.bold },
  authExploreButton: {
    minHeight: 48,
    marginTop: 10,
    borderWidth: 1,
    borderColor: C.red,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  authExploreButtonText: {
    color: C.red,
    fontSize: 14,
    fontFamily: F.semibold,
  },
  authSwitch: {
    minHeight: 48,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  authSwitchText: { color: C.red, fontSize: 13, fontFamily: F.semibold },
  syncPill: {
    minHeight: 30,
    maxWidth: 150,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9,
    borderRadius: 15,
    backgroundColor: "#E7F3EB",
  },
  syncDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.green,
  },
  syncText: {
    color: C.ink,
    fontSize: 10,
    fontFamily: F.semibold,
  },
  teamKitSettingsPreview: {
    minHeight: 175,
    marginBottom: 16,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: C.redDark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  roleActionRow: {
    minHeight: 72,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  playerNextActions: { gap: 10, marginTop: 13 },
  playerNextActionItem: {
    minHeight: 78,
    borderBottomWidth: 0,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  roleActionIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.cream,
  },
  roleMiniButton: {
    minHeight: 38,
    minWidth: 66,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.red,
    borderRadius: 4,
  },
  roleMiniButtonDone: { backgroundColor: C.green },
  roleMiniButtonText: { color: "white", fontSize: 9, fontFamily: F.black },
  chatBubble: {
    alignSelf: "flex-start",
    maxWidth: "86%",
    padding: 12,
    marginBottom: 8,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 4,
  },
  chatComposer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 18,
  },
  chatInput: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 12,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 4,
    color: C.ink,
  },
  roleFixture: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: C.line,
    gap: 7,
  },
  roleHistoryRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  chatMessageTime: {
    marginTop: 4,
    color: C.muted,
    fontSize: 9,
    fontFamily: F.medium,
    alignSelf: "flex-end",
  },
  chatMessageTimeOwn: {
    color: "#EEE5FF",
  },
  videoRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  roleHomeHero: {
    paddingHorizontal: 18,
    paddingVertical: 28,
    backgroundColor: C.redDark,
  },
  roleHomeTitle: {
    color: "white",
    fontSize: 30,
    lineHeight: 34,
    fontFamily: F.black,
    letterSpacing: -0.8,
  },
  roleHomeCopy: { color: "#E9DFF5", lineHeight: 20, marginTop: 9 },
  appearanceIntro: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    backgroundColor: C.redDark,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  appearanceIntroTitle: { color: C.white, fontSize: 16, fontFamily: F.bold },
  appearanceIntroCopy: {
    color: "#E9DFF5",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  appearanceSuccess: {
    minHeight: 62,
    borderRadius: 10,
    backgroundColor: "#E1F1E8",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  appearanceStatInputs: { flexDirection: "row", gap: 10, marginBottom: 18 },
  appearanceStatInput: { flex: 1 },
  appearanceNumberInput: { textAlign: "center", fontFamily: F.bold },
  appearanceHistory: { marginTop: 28 },
  appearanceClaimRow: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  appearanceClaimIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#EEE8F6",
    alignItems: "center",
    justifyContent: "center",
  },
  appearanceClaimStatus: {
    color: C.red,
    fontSize: 11,
    fontFamily: F.semibold,
    marginTop: 5,
  },
  tablePos: { width: 28, color: C.muted, fontFamily: F.bold },
  tablePts: { color: C.redDark, fontSize: 10, fontFamily: F.black },
  availabilityPreview: {
    minHeight: 76,
    marginTop: 24,
    marginBottom: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: C.line,
  },
  honeycomb: { width: 80, height: 78, position: "relative", marginBottom: 24 },
  honeyCell: {
    width: 24,
    height: 24,
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  honeyBar: {
    position: "absolute",
    width: 24,
    height: 12,
    backgroundColor: C.red,
  },
  honeyBarLeft: { transform: [{ rotate: "60deg" }] },
  honeyBarRight: { transform: [{ rotate: "-60deg" }] },
  matchingPanel: {
    minHeight: 420,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 34,
  },
  friendlyResult: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  friendlyResultTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  bestMatch: { color: C.red, fontSize: 8, fontFamily: F.black },
  matchReasons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginVertical: 13,
  },
  resultBroadcast: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: C.line,
    marginBottom: 10,
  },
  resultBroadcastHead: {
    minHeight: 36,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  resultBroadcastTeams: {
    minHeight: 108,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  resultBroadcastSide: { flex: 1 },
  resultBroadcastTeam: { fontSize: 13, fontFamily: F.bold, color: C.ink },
  resultBroadcastScorers: {
    marginTop: 5,
    fontSize: 9,
    lineHeight: 13,
    color: C.muted,
  },
  resultBroadcastScore: {
    minWidth: 74,
    textAlign: "center",
    fontSize: 25,
    fontFamily: F.black,
    color: C.redDark,
    fontVariant: ["tabular-nums"],
  },
  scoreConfirmation: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: C.white,
  },
  scoreConfirmationDate: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 15,
    textAlign: "center",
  },
  scoreConfirmationTeams: {
    minHeight: 150,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  scoreConfirmationTeamsCompact: { minHeight: 138, paddingVertical: 16 },
  scoreConfirmationSide: {
    flex: 1,
    minWidth: 0,
    gap: 7,
    alignItems: "flex-start",
  },
  scoreConfirmationTeam: {
    color: C.ink,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: F.bold,
  },
  scoreConfirmationSideLabel: {
    color: C.muted,
    fontSize: 8,
    fontFamily: F.bold,
  },
  scoreConfirmationScoreBlock: {
    width: 92,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreConfirmationScore: {
    color: C.redDark,
    fontSize: 34,
    lineHeight: 39,
    fontFamily: F.black,
    fontVariant: ["tabular-nums"],
  },
  scoreConfirmationDivider: { color: C.muted, fontSize: 24 },
  scoreConfirmationPrompt: {
    marginTop: 2,
    color: C.muted,
    fontSize: 9,
    fontFamily: F.medium,
  },
  scoreConfirmationNote: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  scoreConfirmationNoteText: {
    flex: 1,
    color: C.ink,
    fontSize: 11,
    lineHeight: 16,
  },
  resultListItem: {
    marginBottom: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: C.white,
  },
  resultListHead: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  resultListDate: { color: C.muted, fontSize: 10, lineHeight: 14 },
  statusBadge: {
    minHeight: 24,
    maxWidth: 132,
    paddingHorizontal: 9,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadgeSuccess: { backgroundColor: "#E8F6ED" },
  statusBadgePending: { backgroundColor: "#F5E9C9" },
  statusBadgeText: {
    color: C.ink,
    fontSize: 8,
    lineHeight: 11,
    fontFamily: F.bold,
    textAlign: "center",
  },
  resultListScoreLine: {
    minHeight: 128,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  resultListScoreLineCompact: { minHeight: 116, paddingVertical: 12 },
  resultListTeam: { flex: 1, minWidth: 0, gap: 6 },
  resultListTeamName: {
    color: C.ink,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: F.bold,
  },
  resultListScorers: {
    minHeight: 28,
    color: C.muted,
    fontSize: 9,
    lineHeight: 14,
  },
  resultListScore: {
    width: 82,
    color: C.redDark,
    fontSize: 27,
    lineHeight: 32,
    textAlign: "center",
    fontFamily: F.black,
    fontVariant: ["tabular-nums"],
  },
  resultListActions: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  resultListAction: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  resultDetails: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderColor: C.line,
  },
  profileIdentity: {
    minHeight: 112,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  profileImageButton: {
    width: 68,
    height: 68,
    backgroundColor: C.redDark,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "visible",
  },
  profileImage: { width: 68, height: 68 },
  profileImageInitials: { color: "white", fontSize: 20, fontFamily: F.black },
  profileImageEdit: {
    position: "absolute",
    right: -5,
    bottom: -5,
    width: 28,
    height: 28,
    backgroundColor: C.red,
    borderWidth: 2,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  profileVerificationLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 7,
  },
  profileMultiline: { minHeight: 94, paddingTop: 12, textAlignVertical: "top" },
  profileEvidence: {
    minHeight: 64,
    paddingHorizontal: 12,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: C.line,
  },
  profilePrivacyNote: {
    minHeight: 72,
    paddingHorizontal: 12,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: "#EEE8F6",
    borderWidth: 1,
    borderColor: C.line,
  },
  profileVerificationRequested: {
    backgroundColor: "#F5F1FA",
    borderColor: C.red,
  },
  profileTabs: {
    minHeight: 48,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  profileTab: {
    minHeight: 46,
    justifyContent: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  profileTabActive: { borderBottomColor: C.red },
  profileTabText: { color: C.muted, fontSize: 11, fontFamily: F.bold },
  profileTabTextActive: { color: C.ink },
  profileRecordStrip: {
    minHeight: 88,
    flexDirection: "row",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: C.line,
    marginBottom: 18,
  },
  profileRecordItem: {
    flex: 1,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderColor: C.line,
  },
  profileRecordValue: {
    color: C.redDark,
    fontSize: 15,
    fontFamily: F.black,
    textAlign: "center",
  },
  portfolioRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  profileAddRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    marginBottom: 22,
  },
  scoutReport: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: C.line,
    gap: 6,
  },
  scoutReportHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scoutReportDelete: {
    minHeight: 36,
    alignSelf: "flex-start",
    justifyContent: "center",
  },
  publicProfileHero: {
    paddingHorizontal: 22,
    paddingVertical: 28,
    alignItems: "center",
    backgroundColor: C.redDark,
  },
  publicProfileImage: { width: 86, height: 86, marginBottom: 16 },
  publicProfileImageFallback: {
    width: 86,
    height: 86,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.red,
  },
  publicProfileTitle: {
    color: "white",
    fontSize: 24,
    fontFamily: F.black,
    textAlign: "center",
  },
  publicProfileMeta: { color: "#E9DFF5", marginTop: 6, textAlign: "center" },
  publicPending: {
    marginTop: 12,
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.gold,
    borderRadius: 20,
  },
  publicProfileSummary: { color: C.ink, lineHeight: 21, marginBottom: 20 },
  publicTag: {
    minHeight: 38,
    paddingHorizontal: 12,
    justifyContent: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 4,
  },
  grassrootsTabs: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 7,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  grassrootsTab: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: C.cream,
  },
  grassrootsTabActive: { backgroundColor: C.redDark },
  grassrootsTabText: {
    color: C.ink,
    fontSize: 12,
    fontFamily: F.semibold,
  },
  grassrootsTabTextActive: { color: C.white },
  grassrootsLead: { paddingVertical: 6, gap: 6 },
  grassrootsTextArea: {
    minHeight: 104,
    paddingTop: 13,
    textAlignVertical: "top",
  },
  reliabilityValue: {
    color: C.redDark,
    fontSize: 24,
    fontFamily: F.black,
  },
  groundRow: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  opportunityRow: {
    paddingVertical: 16,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  inlineTextButton: {
    alignSelf: "flex-start",
    minHeight: 38,
    justifyContent: "center",
    marginTop: 4,
  },
  quickExitButton: {
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: C.ink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  chatSafetyBar: {
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    backgroundColor: C.cream,
  },
  chatSafetyAction: {
    minHeight: 42,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  chatSafetyText: {
    color: C.redDark,
    fontSize: 12,
    fontFamily: F.semibold,
  },
  scoreCorrectionPanel: {
    marginTop: 12,
    paddingTop: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  scoreCorrectionInputs: {
    flexDirection: "row",
    gap: 10,
  },
  headerBell: {
    width: 44,
    height: 44,
    marginLeft: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBellBadge: {
    position: "absolute",
    top: 3,
    right: 2,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: "#D93B4B",
    borderWidth: 2,
    borderColor: C.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBellBadgeText: {
    color: C.white,
    fontSize: 8,
    lineHeight: 11,
    fontFamily: F.black,
  },
  notificationRow: {
    minHeight: 76,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  notificationIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#F1EDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationUnreadDot: {
    position: "absolute",
    right: 3,
    top: 3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D93B4B",
    borderWidth: 1,
    borderColor: C.white,
  },
  notificationTitle: {
    color: C.ink,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: F.bold,
  },
  notificationBody: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  notificationClear: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  moreSignOut: {
    minHeight: 66,
    marginTop: 28,
    marginBottom: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#B42335",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  moreSignOutTitle: {
    color: C.white,
    fontSize: 14,
    fontFamily: F.bold,
  },
  moreSignOutCopy: {
    color: "#FBE9EC",
    fontSize: 11,
    marginTop: 3,
  },
  moreSignOutCompact: {
    marginTop: 0,
    marginBottom: 0,
  },
  roleMorePage: {
    flex: 1,
  },
  roleMoreFooter: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 2,
    backgroundColor: C.cream,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
  },
  icons8Credit: {
    alignSelf: "center",
    minHeight: 40,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  icons8CreditText: {
    color: C.muted,
    fontSize: 11,
    textDecorationLine: "underline",
  },
  conversationMessages: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 8,
  },
  chatEmpty: {
    flex: 1,
    minHeight: 220,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  chatNotice: {
    minHeight: 48,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#FBE9EC",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chatRoomIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#F1EDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  chatRoomState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  chatRoomStateText: {
    color: C.muted,
    fontSize: 8,
    fontFamily: F.bold,
  },
  teamStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
  },
  teamStatCell: {
    width: "25%",
    minHeight: 68,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  teamStatValue: {
    color: C.ink,
    fontSize: 20,
    fontFamily: F.black,
    fontVariant: ["tabular-nums"],
  },
  teamStatLabel: {
    color: C.muted,
    fontSize: 8,
    fontFamily: F.bold,
    marginTop: 3,
  },
  teamPpgRow: {
    minHeight: 52,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F7F4F8",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: C.line,
  },
  matchStoryScore: {
    marginHorizontal: 14,
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: C.redDark,
  },
  matchStoryState: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  matchStoryTeams: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  matchStorySide: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 8,
  },
  matchStoryTeam: {
    color: C.white,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: F.bold,
    textAlign: "center",
  },
  matchStoryVenueLabel: {
    color: "#D8CBE2",
    fontSize: 8,
    fontFamily: F.bold,
    letterSpacing: 1,
  },
  matchStoryScoreBlock: {
    width: 88,
    alignItems: "center",
  },
  matchStoryScoreValue: {
    color: C.white,
    fontSize: 34,
    lineHeight: 40,
    fontFamily: F.black,
    fontVariant: ["tabular-nums"],
  },
  matchStoryVerified: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  matchStoryBody: {
    paddingHorizontal: 14,
    paddingTop: 24,
    paddingBottom: 32,
  },
  matchStorySectionTitle: {
    color: C.ink,
    fontSize: 15,
    fontFamily: F.black,
    marginBottom: 8,
  },
  matchStoryEvent: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  matchStoryMinute: {
    width: 38,
    color: C.red,
    fontSize: 12,
    fontFamily: F.black,
    fontVariant: ["tabular-nums"],
  },
  matchStoryEventMark: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#F1EDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  statsScopeHeader: {
    minHeight: 70,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  statsScopeIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1EDF5",
  },
  statsPeriodControl: {
    paddingVertical: 14,
    gap: 7,
  },
  statsPeriodButton: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  statsPeriodButtonActive: {
    borderColor: C.redDark,
    backgroundColor: C.redDark,
  },
  statsPeriodText: {
    color: C.ink,
    fontSize: 11,
    fontFamily: F.semibold,
  },
  statsPeriodTextActive: {
    color: C.white,
  },
  statsChoiceControl: {
    paddingVertical: 8,
    gap: 7,
  },
  statsChoiceButton: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  statsChoiceButtonActive: {
    borderColor: C.red,
    backgroundColor: "#FBE9EC",
  },
  statsChoiceText: {
    color: C.muted,
    fontSize: 11,
    fontFamily: F.semibold,
  },
  statsChoiceTextActive: {
    color: C.redDark,
  },
  statsFilterLabel: {
    color: C.muted,
    fontSize: 8,
    fontFamily: F.bold,
    letterSpacing: 1,
    marginTop: 10,
  },
  publicTeamStatHero: {
    minHeight: 92,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  statRecordRow: {
    minHeight: 66,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  publicStatsLeaderRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  publicStatsPosition: {
    width: 28,
    color: C.red,
    fontSize: 15,
    fontFamily: F.black,
    fontVariant: ["tabular-nums"],
  },
  publicStatsValue: {
    color: C.ink,
    fontSize: 18,
    fontFamily: F.black,
    fontVariant: ["tabular-nums"],
  },
  competitionStructure: {
    gap: 16,
    marginBottom: 24,
  },
  competitionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  competitionSectionHeading: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingBottom: 12,
  },
  bracketScroll: {
    paddingVertical: 8,
    paddingHorizontal: 2,
    minHeight: 250,
  },
  bracketRound: {
    width: 184,
    marginRight: 24,
  },
  bracketRoundTitle: {
    color: C.redDark,
    fontSize: 11,
    fontFamily: F.black,
    textTransform: "uppercase",
  },
  bracketRoundMatches: {
    marginTop: 12,
  },
  bracketMatch: {
    width: 176,
    minHeight: 74,
    borderRadius: 8,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    paddingVertical: 5,
    position: "relative",
  },
  bracketTeam: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    gap: 7,
  },
  bracketTeamMirrored: {
    flexDirection: "row-reverse",
  },
  bracketTeamMark: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: C.red,
    borderWidth: 1,
    borderColor: C.red,
    alignItems: "center",
    justifyContent: "center",
  },
  bracketTeamMarkText: {
    color: C.white,
    fontSize: 8,
    fontFamily: F.black,
  },
  bracketTeamName: {
    flex: 1,
    color: C.ink,
    fontSize: 11,
    fontFamily: F.bold,
  },
  bracketDivider: {
    height: 1,
    backgroundColor: C.line,
  },
  bracketConnector: {
    position: "absolute",
    right: -25,
    top: 36,
    width: 24,
    height: 1,
    backgroundColor: C.line,
  },
  bracketConnectorLeft: {
    left: -25,
    right: undefined,
  },
  bracketFinalConnectorLeft: {
    left: -25,
    right: undefined,
  },
  bracketFinalColumn: {
    width: 184,
    marginRight: 24,
    alignItems: "center",
  },
  bracketChampion: {
    width: 112,
    paddingTop: 68,
    alignItems: "center",
    gap: 7,
  },
  bracketChampionMark: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: C.redDark,
    alignItems: "center",
    justifyContent: "center",
  },
  groupTables: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  groupTable: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    overflow: "hidden",
  },
  groupTableHeader: {
    minHeight: 42,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.cream,
  },
  groupTableRow: {
    minHeight: 40,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  groupTeamName: {
    flex: 1,
    color: C.ink,
    fontSize: 12,
    fontFamily: F.bold,
  },
  groupNumbers: {
    width: 82,
    color: C.ink,
    fontSize: 11,
    fontFamily: F.semibold,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  groupQualification: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: C.green,
    fontSize: 10,
    fontFamily: F.bold,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  stageTransition: {
    minHeight: 52,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#EDF7F1",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  roundRobinTable: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    overflow: "hidden",
  },
  roundRobinRow: {
    minHeight: 42,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  roundRobinHead: {
    borderTopWidth: 0,
    backgroundColor: C.cream,
  },
  roundRobinNumbers: {
    width: 154,
    color: C.ink,
    fontSize: 10,
    fontFamily: F.bold,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  structureEmpty: {
    padding: 18,
    gap: 4,
  },
  tournamentResults: {
    gap: 12,
    marginBottom: 24,
  },
  championPanel: {
    minHeight: 92,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.redDark,
  },
  championLabel: {
    color: C.gold,
    fontSize: 9,
    fontFamily: F.black,
  },
  championName: {
    marginTop: 2,
    color: C.white,
    fontSize: 21,
    lineHeight: 25,
    fontFamily: F.black,
  },
  competitionStatusNote: {
    minHeight: 54,
    padding: 12,
    borderRadius: 10,
    backgroundColor: C.cream,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tournamentHonourRow: {
    minHeight: 66,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  tournamentResultRow: {
    minHeight: 62,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  tournamentResultScore: {
    minWidth: 56,
    color: C.redDark,
    fontSize: 18,
    fontFamily: F.black,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  prizeSummary: {
    minHeight: 66,
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: C.cream,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  matchdayBlock: {
    borderRadius: 10,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    padding: 12,
    gap: 8,
  },
  matchdayFixture: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 8,
  },
  matchdayTeam: {
    flex: 1,
    color: C.ink,
    fontSize: 11,
    fontFamily: F.bold,
  },
  matchdayVersus: {
    color: C.muted,
    fontSize: 9,
    fontFamily: F.black,
  },
  dayPlan: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  dayPlanItem: {
    minWidth: 145,
    flex: 1,
    minHeight: 96,
    padding: 14,
    borderRadius: 10,
    backgroundColor: C.redDark,
    gap: 5,
  },
});
export default function FriendliesRoot() {
  return (
    <SafeAreaProvider>
      <App />
    </SafeAreaProvider>
  );
}
