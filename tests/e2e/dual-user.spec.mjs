import { expect, test, chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { deleteApp, initializeApp } from "firebase/app";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

const localEnvironment = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      return [
        line.slice(0, separator),
        line.slice(separator + 1).replace(/^['"]|['"]$/g, ""),
      ];
    }),
);

const firebaseConfig = {
  apiKey: localEnvironment.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: localEnvironment.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: localEnvironment.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: localEnvironment.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    localEnvironment.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: localEnvironment.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const password = `Grassroots-${suffix}!`;
const coachEmail = `friendlies.coach.${suffix}@example.com`;
const playerEmail = `friendlies.player.${suffix}@example.com`;
const teamId = `e2e-team-${suffix}`;
const conversationId = `e2e-chat-${suffix}`;
const chatTitle = `Two person test ${suffix}`;
const coachMessage = `Kickoff confirmed ${suffix}`;
const playerMessage = `I have received it ${suffix}`;

async function createTestIdentity(email, name, role, appName) {
  const app = initializeApp(firebaseConfig, appName);
  const auth = getAuth(app);
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const uid = credential.user.uid;
  const firestore = getFirestore(app);
  await setDoc(doc(firestore, "users", uid), {
    displayName: name,
    email,
    primaryRole: role,
    roles: [role],
    authProvider: "password",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await setDoc(doc(firestore, "publicProfiles", uid), {
    displayName: name,
    name,
    ownerId: uid,
    role,
    primaryRole: role,
    roles: [role],
    area: "Harare",
    published: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { app, auth, firestore, uid, email, name, role };
}

async function signInThroughApp(page, identity) {
  await page.goto("/");
  await page.getByPlaceholder("you@example.com").fill(identity.email);
  await page.getByPlaceholder("At least 8 characters").fill(password);
  await page.getByText("Sign in", { exact: true }).last().click();
  await expect(page.getByText(identity.role, { exact: true }).first()).toBeVisible();
}

async function openConversation(page, role) {
  if (role === "Coach") {
    await page.getByRole("tab", { name: "More" }).click();
    await page.getByText("Chat", { exact: true }).first().click();
  } else {
    await page.getByRole("tab", { name: "Chat" }).click();
  }
  await expect(page.getByText(chatTitle, { exact: true })).toBeVisible();
  await page.getByText(chatTitle, { exact: true }).click();
  await expect(page.getByPlaceholder("Write a message")).toBeVisible();
}

test("Chrome coach and Edge player stay synchronized in a private chat", async ({
  baseURL,
}, testInfo) => {
  const coach = await createTestIdentity(
    coachEmail,
    "E2E Coach",
    "Coach",
    `coach-${suffix}`,
  );
  const player = await createTestIdentity(
    playerEmail,
    "E2E Player",
    "Player",
    `player-${suffix}`,
  );
  const chrome = await chromium.launch({ channel: "chrome", headless: true });
  const edge = await chromium.launch({ channel: "msedge", headless: true });
  const coachContext = await chrome.newContext({
    viewport: { width: 390, height: 844 },
  });
  const playerContext = await edge.newContext({
    viewport: { width: 360, height: 740 },
  });
  const coachPage = await coachContext.newPage();
  const playerPage = await playerContext.newPage();
  const browserErrors = [];
  for (const [label, page] of [
    ["Chrome coach", coachPage],
    ["Edge player", playerPage],
  ]) {
    page.on("pageerror", (error) =>
      browserErrors.push(`${label}: ${error.message}`),
    );
  }

  try {
    await Promise.all([
      signInThroughApp(coachPage, coach),
      signInThroughApp(playerPage, player),
    ]);

    await setDoc(doc(coach.firestore, "teams", teamId), {
      name: "E2E Grassroots",
      ownerId: coach.uid,
      adminIds: [coach.uid],
      coachIds: [coach.uid],
      captainIds: [],
      memberIds: [coach.uid],
      area: "Harare",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(coach.firestore, "conversations", conversationId), {
      scope: "direct",
      teamId,
      title: chatTitle,
      participantIds: [coach.uid, player.uid],
      archived: false,
      active: true,
      readBy: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await Promise.all([
      openConversation(coachPage, coach.role),
      openConversation(playerPage, player.role),
    ]);

    await coachPage.getByPlaceholder("Write a message").fill(coachMessage);
    await coachPage.getByLabel("Send message").click();
    await expect(playerPage.getByText(coachMessage, { exact: true })).toBeVisible();

    await playerPage.getByPlaceholder("Write a message").fill(playerMessage);
    await playerPage.getByLabel("Send message").click();
    await expect(coachPage.getByText(playerMessage, { exact: true })).toBeVisible();

    await coachPage.screenshot({
      path: testInfo.outputPath("chrome-coach-chat.png"),
      fullPage: true,
    });
    await playerPage.screenshot({
      path: testInfo.outputPath("edge-player-chat.png"),
      fullPage: true,
    });
    expect(browserErrors).toEqual([]);
  } finally {
    const messageSnapshot = await getDocs(
      collection(coach.firestore, "conversations", conversationId, "messages"),
    ).catch(() => null);
    for (const message of messageSnapshot?.docs || []) {
      const owner =
        message.data().senderId === coach.uid ? coach : player;
      await deleteDoc(
        doc(
          owner.firestore,
          "conversations",
          conversationId,
          "messages",
          message.id,
        ),
      ).catch(() => {});
    }
    await deleteDoc(
      doc(coach.firestore, "conversations", conversationId),
    ).catch(() => {});
    await deleteDoc(doc(coach.firestore, "teams", teamId)).catch(() => {});
    for (const identity of [coach, player]) {
      await deleteDoc(
        doc(identity.firestore, "users", identity.uid, "private", "appState"),
      ).catch(() => {});
      await deleteDoc(
        doc(identity.firestore, "publicProfiles", identity.uid),
      ).catch(() => {});
      await deleteDoc(doc(identity.firestore, "users", identity.uid)).catch(
        () => {},
      );
      const signedIn =
        identity.auth.currentUser ||
        (
          await signInWithEmailAndPassword(
            identity.auth,
            identity.email,
            password,
          )
        ).user;
      await deleteUser(signedIn).catch(() => {});
      await deleteApp(identity.app).catch(() => {});
    }
    await coachContext.close().catch(() => {});
    await playerContext.close().catch(() => {});
    await chrome.close().catch(() => {});
    await edge.close().catch(() => {});
  }
});
