import { useState } from "preact/hooks";
import { t } from "../i18n.js";
import * as I from "../icons.jsx";
import { Top, Ask, Choice, Steps, Nav, TeamHead, toast, go } from "../ui.jsx";
import { act, useStore } from "../store/index.js";
import { reliability } from "../match.js";

export const CITIES = ["Harare", "Chitungwiza", "Bulawayo", "Mutare", "Gweru", "Masvingo", "Kwekwe", "Kadoma", "Marondera", "Chinhoyi", "Bindura", "Victoria Falls"];
const AREAS = {
  Harare: ["Mbare", "Highfield", "Glen View", "Glen Norah", "Budiriro", "Kuwadzana", "Dzivarasekwa", "Warren Park", "Mufakose", "Kambuzuma", "Epworth", "Mabvuku", "Tafara", "Avondale", "Belvedere", "Waterfalls"],
  Chitungwiza: ["Zengeza", "Seke", "St Mary's", "Unit L", "Makoni"],
  Bulawayo: ["Nkulumane", "Luveve", "Magwegwe", "Pumula", "Entumbane", "Mpopoma", "Makokoba", "Lobengula"],
  Mutare: ["Sakubva", "Dangamvura", "Chikanga"],
  Gweru: ["Mkoba", "Senga", "Mambo"],
  Masvingo: ["Mucheke", "Rujeko"],
};
const COLOURS = ["#B3121F", "#0B1F4B", "#13306E", "#1E7B3C", "#E5B611", "#FFFFFF", "#14181F", "#F07C1A", "#6B2C91", "#7FB3E6"];

export function CreateTeam() {
  const [step, setStep] = useState(1);
  const [d, setD] = useState({ name: "", city: "", area: "", c1: "", c2: "", level: 0 });
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); await act("createTeam", d); setStep(6); setBusy(false); };
  const NextBtn = ({ ok, onClick }) => <button class="btn main" style="margin-top:18px" disabled={!ok} onClick={onClick || (() => setStep(step + 1))}><I.Check />{t("next")}</button>;

  return (
    <>
      <Top title={t("team")} back={step > 1 && step < 6} />
      <main>
        {step < 6 && <Steps n={step} of={5} />}
        {step === 1 && (<>
          <Ask q="team_name_q" hint="team_name_hint" />
          <input class="field" value={d.name} maxLength={28} onInput={(e) => set("name", e.currentTarget.value)} aria-label={t("team_name_q")} />
          <NextBtn ok={d.name.trim().length >= 2} />
        </>)}
        {step === 2 && (<>
          <Ask q="city_q" />
          <div class="choices two">
            {CITIES.map((c) => <Choice key={c} on={d.city === c} label={c} onClick={() => { set("city", c); setTimeout(() => setStep(3), 150); }} />)}
          </div>
        </>)}
        {step === 3 && (<>
          <Ask q="area_q" hint="area_hint" />
          {(AREAS[d.city] || []).length > 0 && (
            <div class="choices two" style="margin-bottom:14px">
              {AREAS[d.city].map((a) => <Choice key={a} on={d.area === a} label={a} onClick={() => set("area", a)} />)}
            </div>
          )}
          <input class="field" placeholder={t("other")} value={AREAS[d.city]?.includes(d.area) ? "" : d.area} onInput={(e) => set("area", e.currentTarget.value)} aria-label={t("area_q")} />
          <NextBtn ok={d.area.trim().length >= 2} />
        </>)}
        {step === 4 && (<>
          <Ask q="colours_q" hint="colours_hint" />
          <div class="center" style="margin-bottom:12px"><span style="display:inline-block;width:120px;height:120px"><I.Shirt c1={d.c1 || "#D9D4C7"} c2={d.c2 || "#FFFFFF"} /></span></div>
          <p class="sec">{t("main_colour")}</p>
          <div class="swatches">{COLOURS.map((c) => <button key={c} class={d.c1 === c ? "on" : ""} style={`background:${c}`} onClick={() => set("c1", c)} aria-label={c} />)}</div>
          <p class="sec">{t("second_colour")}</p>
          <div class="swatches">{COLOURS.map((c) => <button key={c} class={d.c2 === c ? "on" : ""} style={`background:${c}`} onClick={() => set("c2", c)} aria-label={c} />)}</div>
          <NextBtn ok={d.c1 && d.c2} />
        </>)}
        {step === 5 && (<>
          <Ask q="level_q" hint="level_hint" />
          <div class="choices">
            {[1, 2, 3].map((n) => <Choice key={n} on={d.level === n} pic={<I.Stars n={n} />} label={t(`level${n}`)} onClick={() => set("level", n)} />)}
          </div>
          <NextBtn ok={d.level > 0 && !busy} onClick={save} />
        </>)}
        {step === 6 && <TeamReady />}
      </main>
    </>
  );
}

function TeamReady() {
  const s = useStore();
  const team = s.teams.find((x) => x.id === s.me?.teamId);
  return (
    <>
      <div class="hero"><span style="display:inline-block;width:140px;height:140px"><I.Shirt c1={team?.c1} c2={team?.c2} /></span></div>
      <Ask q="team_ready" />
      <div class="card"><TeamHead team={team} /></div>
      <button class="btn main" onClick={() => go("/team")}><I.People n={3} />{t("add_players")}</button>
      <button class="btn dark" onClick={() => go("/find")}><I.Ball />{t("find_match")}</button>
    </>
  );
}

export function TeamPage() {
  const s = useStore();
  const team = s.teams.find((x) => x.id === s.me?.teamId);
  const [name, setName] = useState("");
  if (!team) return (<><Top title={t("team")} /><main><button class="btn main" onClick={() => go("/team/new")}><I.Plus />{t("team")}</button></main><Nav here="team" /></>);
  const st = team.stats || {};
  const rel = reliability(st);
  const add = async (e) => { e.preventDefault(); if (!name.trim()) return; await act("addPlayer", team.id, name); setName(""); toast(t("saved")); };
  const remove = async (n) => { await act("removePlayer", team.id, n); toast(n, { label: t("undo"), fn: () => act("addPlayer", team.id, n) }); };
  return (
    <>
      <Top title={team.name} back={false} />
      <main>
        <div class="card"><TeamHead team={team} /></div>
        <div class="card">
          <h3>{t("record")}</h3>
          <div class="row" style="grid-template-columns:repeat(3,1fr);text-align:center;margin-top:8px">
            <div><div class="count">{st.won || 0}</div>{t("won")}</div>
            <div><div class="count">{st.drew || 0}</div>{t("drew")}</div>
            <div><div class="count">{st.lost || 0}</div>{t("lost")}</div>
          </div>
          <div class="reasons"><div><I.Check />{t("shows_up", { a: rel.turnedUp, b: rel.outOf })}</div></div>
        </div>
        <Ask q="players_t" say={["players_t", "add_player"]}><p class="count" style="margin-top:4px">{team.players.length}</p></Ask>
        <form onSubmit={add} style="display:grid;grid-template-columns:1fr auto;gap:10px;margin-bottom:14px">
          <input class="field" placeholder={t("player_name")} value={name} onInput={(e) => setName(e.currentTarget.value)} aria-label={t("player_name")} maxLength={30} />
          <button class="btn main" style="width:auto;padding:0 18px" aria-label={t("add_player")}><I.Plus /></button>
        </form>
        <div class="people">
          {team.players.map((p) => (
            <div class="person" key={p}><span class="face">{p[0]?.toUpperCase()}</span>{p}
              <button class="state" style="color:var(--red)" onClick={() => remove(p)} aria-label={`Remove ${p}`}><I.Cross /></button>
            </div>
          ))}
        </div>
      </main>
      <Nav here="team" />
    </>
  );
}
