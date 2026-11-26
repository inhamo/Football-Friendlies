import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import "./styles.css";
import { setLang, getLang } from "./i18n.js";
import { useStore } from "./store/index.js";
import { Toast } from "./ui.jsx";
import { Language, Welcome, PlayerInfo, SignUp, Login } from "./screens/start.jsx";
import { CreateTeam, TeamPage } from "./screens/team.jsx";
import { FindMatch, AskToPlay } from "./screens/find.jsx";
import { Home, MatchesList, MatchPage, ScorePage, PlayRSVP, RefHome } from "./screens/matches.jsx";
import { Help } from "./screens/help.jsx";

setLang(getLang());
try { if (localStorage.getItem("gr_big")) document.documentElement.classList.add("big"); } catch {}

const readHash = () => (location.hash.replace(/^#/, "").split("?")[0] || "/");

function App() {
  const [path, setPath] = useState(readHash());
  const [, force] = useState(0);
  const s = useStore();
  useEffect(() => { const f = () => setPath(readHash()); addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  const p = path.split("/").filter(Boolean);
  const langSet = (() => { try { return localStorage.getItem("gr_lang_set"); } catch { return "1"; } })();

  // Player links work without any account.
  if (p[0] === "play") return <PlayRSVP id={p[1]} teamId={p[2]} />;
  if (!s.ready) return <div class="app" />;
  if (!langSet) return <Language onDone={() => force((x) => x + 1)} />;
  if (p[0] === "help") return <Help onLang={() => force((x) => x + 1)} />;

  if (!s.me) {
    if (p[0] === "player") return <PlayerInfo />;
    if (p[0] === "signup") return <SignUp role={p[1] === "ref" ? "ref" : "captain"} />;
    if (p[0] === "login") return <Login />;
    if (p[0] === "lang") return <Language />;
    return <Welcome />;
  }
  if (s.me.role === "ref") {
    if (p[0] === "m") return <MatchPage id={p[1]} />;
    return <RefHome />;
  }
  if (!s.me.teamId || p[0] === "team" && p[1] === "new") return <CreateTeam />;
  switch (p[0]) {
    case "find": return <FindMatch />;
    case "ask": return <AskToPlay slotId={p[1]} />;
    case "matches": return <MatchesList />;
    case "m": return p[2] === "score" ? <ScorePage id={p[1]} /> : <MatchPage id={p[1]} />;
    case "team": return <TeamPage />;
    default: return <Home />;
  }
}

function Root() { return <div class="app"><App /><Toast /></div>; }
render(<Root />, document.getElementById("app"));

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
