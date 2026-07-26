import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  reload,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  firebaseAuth,
  firebaseConfigured,
  firestore,
} from "./firebaseClient";
import { FIREBASE_CONFIGURATION_ERROR } from "./firebaseConfig";

const allowedRoles = new Set([
  "Coach",
  "Player",
  "Referee",
  "Sponsor",
  "Scout",
]);

function safeRole(role) {
  return allowedRoles.has(role) ? role : "Player";
}

function safeRoles(roles, primaryRole) {
  const valid = Array.from(
    new Set((Array.isArray(roles) ? roles : []).filter((role) => allowedRoles.has(role))),
  );
  const primary = safeRole(primaryRole);
  return valid.length ? valid : [primary];
}

function readableAuthError(error) {
  switch (error?.code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "The email or password is incorrect.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Use a stronger password with at least 8 characters.";
    case "auth/network-request-failed":
      return "Check your connection and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a little and try again.";
    default:
      return "Authentication could not be completed. Please try again.";
  }
}

async function readUserProfile(uid) {
  const snapshot = await getDoc(doc(firestore, "users", uid));
  return snapshot.exists() ? snapshot.data() : null;
}

async function writeUserProfile(user, values = {}) {
  const primaryRole = safeRole(values.primaryRole);
  const roles = safeRoles(values.roles, primaryRole);
  await setDoc(
    doc(firestore, "users", user.uid),
    {
      displayName: values.displayName || user.displayName || "",
      email: user.email || values.email || null,
      phoneNumber: values.phoneNumber || null,
      primaryRole,
      roles,
      authProvider: user.isAnonymous ? "anonymous" : "password",
      updatedAt: serverTimestamp(),
      ...(values.createdAt ? { createdAt: values.createdAt } : {}),
    },
    { merge: true },
  );
  await setDoc(
    doc(firestore, "publicProfiles", user.uid),
    {
      displayName: values.displayName || user.displayName || "",
      ownerId: user.uid,
      role: primaryRole,
      primaryRole,
      roles,
      area: values.area || "",
      profileImage: values.profileImage || null,
      published: false,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

function guestSession(user, role) {
  return {
    type: "guest",
    role: safeRole(role),
    id: user?.uid || `local-guest-${Date.now()}`,
    firebase: Boolean(user),
  };
}

function accountSession(user, profile) {
  const role = safeRole(profile?.primaryRole);
  return {
    type: "account",
    user: {
      id: user.uid,
      name: profile?.displayName || user.displayName || "",
      email: user.email || "",
      phoneNumber: profile?.phoneNumber || "",
      role,
      roles: safeRoles(profile?.roles, role),
    },
  };
}

export async function initializeDatabase() {
  if (firebaseConfigured) await firebaseAuth.authStateReady();
}

export async function createGuestSession(role) {
  const primaryRole = safeRole(role);
  if (!firebaseConfigured) return guestSession(null, primaryRole);
  try {
    let user = firebaseAuth.currentUser;
    if (!user) user = (await signInAnonymously(firebaseAuth)).user;
    await writeUserProfile(user, {
      primaryRole,
      createdAt: serverTimestamp(),
    });
    return guestSession(user, primaryRole);
  } catch {
    // Guest preview must remain usable even when anonymous sign-in is disabled.
    return guestSession(null, primaryRole);
  }
}

export async function createAccount({ name, email, password, role }) {
  if (!firebaseConfigured) throw new Error(FIREBASE_CONFIGURATION_ERROR);
  try {
    const credential = EmailAuthProvider.credential(email.trim(), password);
    const currentUser = firebaseAuth.currentUser;
    const result = currentUser?.isAnonymous
      ? await linkWithCredential(currentUser, credential)
      : await createUserWithEmailAndPassword(
          firebaseAuth,
          email.trim(),
          password,
        );
    await updateProfile(result.user, { displayName: name.trim() });
    let profile = {
      displayName: name.trim(),
      primaryRole: role,
      roles: [role],
    };
    try {
      await writeUserProfile(result.user, {
        displayName: name.trim(),
        email: email.trim().toLowerCase(),
        primaryRole: role,
        roles: [role],
        createdAt: serverTimestamp(),
      });
      profile = (await readUserProfile(result.user.uid)) || profile;
    } catch {
      // The account is already valid. Profile recovery runs on the next sign-in.
    }
    return accountSession(result.user, profile);
  } catch (error) {
    throw new Error(readableAuthError(error));
  }
}

export async function signIn({ email, password }) {
  if (!firebaseConfigured) throw new Error(FIREBASE_CONFIGURATION_ERROR);
  try {
    if (firebaseAuth.currentUser?.isAnonymous)
      await firebaseSignOut(firebaseAuth);
    const result = await signInWithEmailAndPassword(
      firebaseAuth,
      email.trim(),
      password,
    );
    let profile = await readUserProfile(result.user.uid);
    if (!profile) {
      await writeUserProfile(result.user, {
        displayName: result.user.displayName || "",
        primaryRole: "Player",
        createdAt: serverTimestamp(),
      });
      profile = await readUserProfile(result.user.uid);
    }
    return accountSession(result.user, profile);
  } catch (error) {
    throw new Error(readableAuthError(error));
  }
}

export async function getCurrentSession() {
  if (!firebaseConfigured) return null;
  await firebaseAuth.authStateReady();
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  try {
    await reload(user);
  } catch (error) {
    if (
      ["auth/user-not-found", "auth/user-token-expired", "auth/user-disabled"].includes(
        error?.code,
      )
    ) {
      await firebaseSignOut(firebaseAuth).catch(() => {});
      return null;
    }
    // Keep the current session during a temporary network outage.
  }
  let profile = await readUserProfile(user.uid);
  if (user.isAnonymous)
    return guestSession(user, profile?.primaryRole || "Player");
  if (!profile) {
    await writeUserProfile(user, {
      displayName: user.displayName || "",
      primaryRole: "Player",
      roles: ["Player"],
      createdAt: serverTimestamp(),
    });
    profile = await readUserProfile(user.uid);
  }
  return accountSession(user, profile);
}

export async function addAccountRole(role) {
  if (!firebaseConfigured) throw new Error(FIREBASE_CONFIGURATION_ERROR);
  const user = firebaseAuth.currentUser;
  if (!user || user.isAnonymous)
    throw new Error("Sign in before adding another role.");
  const profile = await readUserProfile(user.uid);
  const primaryRole = safeRole(profile?.primaryRole);
  const roles = safeRoles([...(profile?.roles || []), safeRole(role)], primaryRole);
  await writeUserProfile(user, {
    displayName: profile?.displayName || user.displayName || "",
    phoneNumber: profile?.phoneNumber || null,
    primaryRole,
    roles,
  });
  return accountSession(user, { ...profile, primaryRole, roles });
}

export async function removeAccountRole(role) {
  if (!firebaseConfigured) throw new Error(FIREBASE_CONFIGURATION_ERROR);
  const user = firebaseAuth.currentUser;
  if (!user || user.isAnonymous)
    throw new Error("Sign in before managing roles.");
  const profile = await readUserProfile(user.uid);
  const currentPrimaryRole = safeRole(profile?.primaryRole);
  const currentRoles = safeRoles(profile?.roles, currentPrimaryRole);
  if (currentRoles.length === 1)
    throw new Error("Keep at least one role on your account.");
  const roles = currentRoles.filter((item) => item !== safeRole(role));
  const primaryRole =
    currentPrimaryRole === role ? roles[0] : currentPrimaryRole;
  await writeUserProfile(user, {
    displayName: profile?.displayName || user.displayName || "",
    phoneNumber: profile?.phoneNumber || null,
    primaryRole,
    roles,
  });
  return accountSession(user, { ...profile, primaryRole, roles });
}

export async function signOut() {
  if (firebaseConfigured && firebaseAuth.currentUser)
    await firebaseSignOut(firebaseAuth);
}
