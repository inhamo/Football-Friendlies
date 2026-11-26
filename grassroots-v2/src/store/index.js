import { useEffect, useState } from "preact/hooks";
import { createDemoStore } from "./demo.js";

let state = { ready: false, mode: "demo", me: null, teams: [], slots: [], challenges: [], matches: [] };
const subs = new Set();
const emit = (s) => { state = s; subs.forEach((f) => f(s)); };

export const cloudConfigured = Boolean(import.meta.env.VITE_FIREBASE_API_KEY);
const wantDemo = typeof location !== "undefined" && /[?&]practice=1/.test(location.search);

let api = null;
let ready = null;
export function store() {
  if (!ready) {
    ready = (async () => {
      if (cloudConfigured && !wantDemo) {
        const { createCloudStore } = await import("./firebase.js"); // only downloaded when needed
        api = createCloudStore(emit);
      } else api = createDemoStore(emit);
      return api;
    })();
  }
  return ready;
}
export async function act(name, ...args) { const a = await store(); return a[name](...args); }

export function useStore() {
  const [s, set] = useState(state);
  useEffect(() => { subs.add(set); store(); set(state); return () => subs.delete(set); }, []);
  return s;
}

export function useOnline() {
  const [on, set] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const up = () => set(true), down = () => set(false);
    addEventListener("online", up); addEventListener("offline", down);
    return () => { removeEventListener("online", up); removeEventListener("offline", down); };
  }, []);
  return on;
}
