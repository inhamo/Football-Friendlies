import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { firebaseConfig, firebaseConfigured } from "./firebaseConfig";

let firebaseApp = null;
let firebaseAuth = null;
let firestore = null;

if (firebaseConfigured) {
  firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  try {
    firebaseAuth = initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    firebaseAuth = getAuth(firebaseApp);
  }
  try {
    firestore = initializeFirestore(firebaseApp, {
      ignoreUndefinedProperties: true,
    });
  } catch {
    firestore = getFirestore(firebaseApp);
  }
}

export { firebaseApp, firebaseAuth, firebaseConfigured, firestore };
