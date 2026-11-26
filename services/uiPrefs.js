// Language + text size for the whole app. AppText reads these through UiPrefsContext,
// so changing them re-renders every label without reloading the app or its data.
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "./storage";
import { translate } from "./translations";

const KEY = "grassroots-ui-prefs-v1";
export const LANGS = [
  { id: "en", label: "English" },
  { id: "sn", label: "ChiShona" },
  { id: "nd", label: "isiNdebele" },
];

const UiPrefsContext = createContext({ lang: "en", big: false, setLang: () => {}, setBig: () => {} });

export function UiPrefsProvider({ children }) {
  const [lang, setLangState] = useState("en");
  const [big, setBigState] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const saved = raw ? JSON.parse(raw) : null;
        if (saved?.lang) setLangState(saved.lang);
        if (saved?.big) setBigState(true);
      })
      .catch(() => {});
  }, []);
  const value = useMemo(() => {
    const save = (next) => AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
    return {
      lang,
      big,
      setLang: (l) => { setLangState(l); save({ lang: l, big }); },
      setBig: (b) => { setBigState(b); save({ lang, big: b }); },
    };
  }, [lang, big]);
  return React.createElement(UiPrefsContext.Provider, { value }, children);
}

export const useUiPrefs = () => useContext(UiPrefsContext);

// ALL CAPS is harder to read for people who read slowly, so labels written in
// capitals are shown in Title Case. Short codes (VS, FC, PSL…) stay as they are.
const KEEP = new Set(["VS", "FC", "PSL", "ZIFA", "AM", "PM", "OK", "GPS", "ID", "PIN", "GD", "POS", "TN", "SMS", "USSD", "U13", "U15", "U17", "U19", "U21", "FT", "HT", "VAR", "MVP"]);
function unCaps(str) {
  if (!/[A-Z]/.test(str) || /[a-z]/.test(str) || str.replace(/[^A-Z]/g, "").length < 4) return str;
  return str.replace(/[A-Z0-9][A-Z0-9'’&-]*/g, (w) => (KEEP.has(w) ? w : w[0] + w.slice(1).toLowerCase()));
}

// Turns a plain string into what the person should see: translated, and not shouting.
export function displayText(str, lang) {
  if (typeof str !== "string" || !str.trim()) return str;
  const translated = lang && lang !== "en" ? translate(str, lang) : null;
  return translated ?? unCaps(str);
}

// Small print is the biggest problem for low-vision and low-confidence readers.
// Nothing in the app is smaller than 14px; "Bigger text" adds another 20%.
export function readableSize(size, big) {
  const base = size == null ? 14 : size < 14 ? Math.max(14, Math.round(size * 1.3)) : size < 17 ? size + 1 : size;
  return big ? Math.round(base * 1.2) : base;
}
