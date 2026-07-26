import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { firebaseConfig, firebaseConfigured } from "./firebaseConfig";

let firebaseApp = null;
let firebaseAuth = null;
let firestore = null;

if (firebaseConfigured) {
  firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  firebaseAuth = getAuth(firebaseApp);
  try {
    firestore = initializeFirestore(firebaseApp, {
      ignoreUndefinedProperties: true,
      experimentalForceLongPolling: true,
    });
  } catch {
    firestore = getFirestore(firebaseApp);
  }
}

export { firebaseApp, firebaseAuth, firebaseConfigured, firestore };
