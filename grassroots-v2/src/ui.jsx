import { useEffect, useState } from "preact/hooks";
import { t } from "./i18n.js";
import { speak, stopSpeaking } from "./speak.js";
import * as I from "./icons.jsx";
import { useOnline, useStore } from "./store/index.js";

export const go = (path) => { stopSpeaking(); location.hash = path; window.scrollTo(0, 0); };
export const goBack = () => { stopSpeaking(); history.length > 1 ? history.back() : go("/"); };

// Every screen: navy bar, back button, title, and the same Help button in the same place (consistency).
export function Top({ title, back = true }) {
  return (
    <>
      <header class="top">
        {back ? <button class="iconbtn" onClick={goBack} aria-label={t("back")}><I.Back /></button> : <span style="width:48px;height:48px"><I.Logo /></span>}
        <h1>{title}</h1>
        <button class="iconbtn" onClick={() => go("/help")} aria-label={t("help")}><I.Help /></button>
      </header>
      <div class="stripe" />
      <Strips />
    </>
  );
}

function Strips() {
  const online = useOnline();
  const s = useStore();
  return (
    <>
      {!online && <div class="strip offline" role="status"><I.Wifi0 />{t("offline")}</div>}
      {s.mode === "demo" && <div class="strip demo" role="status"><I.Ball />{t("demo")}</div>}
    </>
  );
}

// Big question + yellow speaker. Tapping the speaker reads the question (and hint) aloud.
export function Ask({ q, hint, say, vars, children }) {
  const [on, setOn] = useState(false);
  const keys = say || [q, hint].filter(Boolean);
  const play = () => { if (on) { stopSpeaking(); setOn(false); return; } setOn(true); speak(keys, vars, () => setOn(false)); };
  useEffect(() => () => stopSpeaking(), []);
  return (
    <div class="ask">
      <div style="flex:1">
        <h2>{t(q, vars)}</h2>
        {hint && <p>{t(hint, vars)}</p>}
        {children}
      </div>
      <button class={`speak ${on ? "on" : ""}`} onClick={play} aria-label="Listen"><I.Speaker /></button>
    </div>
  );
}

export function Steps({ n, of }) {
  return <div class="steps" aria-label={`${n} / ${of}`}>{Array.from({ length: of }).map((_, i) => <i key={i} class={i < n ? "f" : ""} />)}</div>;
}

export function Choice({ on, onClick, pic, label, sub }) {
  return (
    <button class={`choice ${on ? "on" : ""}`} onClick={onClick} aria-pressed={on ? "true" : "false"}>
      {pic && <span class="pic">{pic}</span>}
      <span>{label}{sub && <small>{sub}</small>}</span>
      {on && <span class="tick"><I.Check /></span>}
    </button>
  );
}

// Number pad like USSD (*151#) — everybody already knows it. No phone keyboard pops up.
export function NumPad({ value, onChange, max = 12 }) {
  const press = (d) => { if (value.length < max) onChange(value + d); };
  return (
    <div class="pad">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => <button key={d} onClick={() => press(d)}>{d}</button>)}
      <button onClick={() => onChange("")} aria-label="Clear"><I.Erase /></button>
      <button onClick={() => press("0")}>0</button>
      <button onClick={() => onChange(value.slice(0, -1))} aria-label={t("back")}><I.Back /></button>
    </div>
  );
}

export function PinDots({ n }) {
  return <div class="dots" aria-label={`${n} of 4`}>{[0, 1, 2, 3].map((i) => <span key={i} class={i < n ? "f" : ""} />)}</div>;
}

export function Err({ msg }) {
  if (!msg) return null;
  return <div class="err" role="alert"><I.Cross />{msg}</div>;
}

let toastSet = null;
export function toast(msg, action) { toastSet && toastSet({ msg, action, id: Date.now() }); }
export function Toast() {
  const [tt, set] = useState(null);
  toastSet = set;
  useEffect(() => { if (!tt) return; const x = setTimeout(() => set(null), tt.action ? 6000 : 3000); return () => clearTimeout(x); }, [tt]);
  if (!tt) return null;
  return (
    <div class="toast" role="status"><I.Check /><span>{tt.msg}</span>
      {tt.action && <button onClick={() => { tt.action.fn(); set(null); }}>{tt.action.label}</button>}
    </div>
  );
}

// Bottom tabs — same idea as WhatsApp's bottom tabs.
export function Nav({ here }) {
  const s = useStore();
  const myTeam = s.me?.teamId;
  const waiting = s.challenges.filter((c) => c.toTeamId === myTeam && c.status === "sent").length;
  const items = [
    ["/", "home", <I.Home />],
    ["/matches", "matches", <I.Calendar />],
    [s.me?.role === "ref" ? "/ref" : "/team", s.me?.role === "ref" ? "referee" : "team", s.me?.role === "ref" ? <I.Whistle /> : <I.People n={3} />],
    ["/help", "help", <I.Help />],
  ];
  return (
    <nav class="nav"><div class="in">
      {items.map(([path, key, icon]) => (
        <button key={key} class={here === key ? "on" : ""} onClick={() => go(path)} aria-current={here === key ? "page" : undefined}>
          {icon}{t(key)}{key === "matches" && waiting > 0 && <span class="dot" />}
        </button>
      ))}
    </div></nav>
  );
}

export function TeamHead({ team, sub }) {
  if (!team) return null;
  return (
    <div class="teamhead">
      <I.Shirt c1={team.c1} c2={team.c2} />
      <div><b>{team.name}{team.sample && <span class="sample">Sample</span>}</b><span class="meta">{sub ?? [team.area, team.city].filter(Boolean).join(", ")}</span></div>
    </div>
  );
}
