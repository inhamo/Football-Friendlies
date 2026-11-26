import { useState } from "preact/hooks";
import { t, dayLabel, relDay } from "../i18n.js";
import * as I from "../icons.jsx";
import { Top, Ask, Choice, Steps, TeamHead, go, toast } from "../ui.jsx";
import { act, useStore } from "../store/index.js";
import { rankSlots, reliability, hostFor } from "../match.js";
import { todayISO, addDays, linkFor } from "../store/common.js";
import { openWA } from "../whatsapp.js";

export const TIMES = [
  { id: "09:00", key: "morning", pic: <I.SunMorning /> },
  { id: "12:00", key: "midday", pic: <I.SunNoon /> },
  { id: "15:00", key: "afternoon", pic: <I.SunAfternoon /> },
];
export const FORMATS = [5, 7, 11];
const peopleFor = (n) => (n === 5 ? 2 : n === 7 ? 3 : 4);

export function FindMatch() {
  const s = useStore();
  const me = s.teams.find((x) => x.id === s.me?.teamId);
  const [step, setStep] = useState(1);
  const [w, setW] = useState({ date: "", time: "", format: 0 });
  const set = (k, v, next) => { setW((x) => ({ ...x, [k]: v })); if (next) setTimeout(() => setStep(next), 150); };
  if (!me) { go("/team/new"); return null; }
  const days = Array.from({ length: 8 }, (_, i) => addDays(todayISO(), i));

  return (
    <>
      <Top title={t("find_match")} />
      <main>
        {step <= 3 && <Steps n={step} of={3} />}
        {step === 1 && (<>
          <Ask q="day_q" />
          <div class="choices two">
            {days.map((d) => <Choice key={d} on={w.date === d} pic={<I.Calendar />} label={dayLabel(d)} sub={relDay(d) || ""} onClick={() => set("date", d, 2)} />)}
          </div>
        </>)}
        {step === 2 && (<>
          <Ask q="time_q" />
          <div class="choices">
            {TIMES.map((x) => <Choice key={x.id} on={w.time === x.id} pic={x.pic} label={t(x.key)} sub={x.id} onClick={() => set("time", x.id, 3)} />)}
          </div>
        </>)}
        {step === 3 && (<>
          <Ask q="format_q" />
          <div class="choices">
            {FORMATS.map((n) => <Choice key={n} on={w.format === n} pic={<I.People n={peopleFor(n)} />} label={t("a_side", { n })} onClick={() => set("format", n, 4)} />)}
          </div>
        </>)}
        {step === 4 && <Results me={me} want={w} />}
      </main>
    </>
  );
}

function Results({ me, want }) {
  const s = useStore();
  const found = rankSlots({ me, want, slots: s.slots, teams: s.teams });
  const mine = s.slots.find((x) => x.teamId === me.id && x.date === want.date && x.status === "open");
  const post = async () => { await act("postSlot", want); toast(t("posted")); };
  const shareFree = () => openWA(t("share_text_free", { team: me.name, day: dayLabel(want.date), time: want.time, format: t("a_side", { n: want.format }), link: linkFor("/") }));

  return (
    <>
      <p class="sec"><I.Calendar />{dayLabel(want.date)} · {want.time} · {t("a_side", { n: want.format })}</p>
      {found.length ? (
        <>
          <Ask q="found_t" hint="found_p" />
          {found.map((f) => (
            <div class="card" key={f.slot.id}>
              <TeamHead team={f.team} />
              <div class="reasons">
                <div><I.Stars n={f.team.level} />{f.lv >= 0.99 ? t("same_level") : t(`level${f.team.level}`)}</div>
                <div><I.Pin />{f.pl >= 1 ? `${t("near_you")}: ${f.team.area}` : `${f.team.area}, ${f.team.city}`}</div>
                <div><I.Check />{f.rel.outOf ? t("shows_up", { a: f.rel.turnedUp, b: f.rel.outOf }) : t("new_team")}</div>
                <div><I.Clock />{f.slot.time}</div>
              </div>
              <button class="btn main" onClick={() => go(`/ask/${f.slot.id}`)}><I.Ball />{t("challenge")}</button>
            </div>
          ))}
        </>
      ) : (
        <div class="empty"><I.Ball /><b>{t("none_t")}</b>{t("none_p")}</div>
      )}
      {mine ? <div class="card center"><span class="status ok"><I.Check />{t("posted")}</span></div>
        : <button class="btn dark" onClick={post}><I.Upload />{t("post_day")}</button>}
      <button class="btn wa" onClick={shareFree}><I.WhatsApp />{t("tell_wa")}</button>
    </>
  );
}

export function AskToPlay({ slotId }) {
  const s = useStore();
  const me = s.teams.find((x) => x.id === s.me?.teamId);
  const slot = s.slots.find((x) => x.id === slotId);
  const them = s.teams.find((x) => x.id === slot?.teamId);
  const [where, setWhere] = useState("");
  const [ground, setGround] = useState({ name: "", landmark: "" });
  const [sent, setSent] = useState(false);
  if (!me || !slot || !them) return <><Top title={t("challenge")} /><main><div class="empty"><b>…</b></div></main></>;
  const fair = hostFor(me, them);
  const send = async () => {
    const hostId = where === "ours" ? me.id : them.id;
    const venue = where === "ours" ? { name: ground.name || `${me.area} ground`, landmark: ground.landmark } : { name: `${them.area} ground`, landmark: "" };
    await act("sendChallenge", { toTeamId: them.id, date: slot.date, time: slot.time, format: slot.format, venue, hostId });
    setSent(true);
  };
  const tell = () => openWA(t("share_text_challenge", { team: me.name, day: dayLabel(slot.date), time: slot.time, link: linkFor("/matches") }), them.captainPhone);

  return (
    <>
      <Top title={t("challenge")} />
      <main>
        <div class="board">
          <div class="when">{dayLabel(slot.date)} · {slot.time} · {t("a_side", { n: slot.format })}</div>
          <div class="sides">
            <div class="side"><I.Shirt c1={me.c1} c2={me.c2} /><b>{me.name}</b></div>
            <div class="mid">{t("vs")}</div>
            <div class="side"><I.Shirt c1={them.c1} c2={them.c2} /><b>{them.name}</b></div>
          </div>
        </div>
        {!sent ? (
          <>
            <Ask q="where_q" />
            <div class="choices">
              <Choice on={where === "ours"} pic={<I.Home />} label={t("our_ground")} sub={me.area + (fair === me.id ? " ✓" : "")} onClick={() => setWhere("ours")} />
              <Choice on={where === "theirs"} pic={<I.Road />} label={t("their_ground")} sub={them.area + (fair === them.id ? " ✓" : "")} onClick={() => setWhere("theirs")} />
            </div>
            {where === "ours" && (
              <div style="margin-top:14px">
                <input class="field" placeholder={t("ground_name")} value={ground.name} onInput={(e) => setGround({ ...ground, name: e.currentTarget.value })} aria-label={t("ground_name")} />
                <p class="hint">{t("landmark_hint")}</p>
                <input class="field" value={ground.landmark} onInput={(e) => setGround({ ...ground, landmark: e.currentTarget.value })} aria-label={t("landmark_hint")} />
              </div>
            )}
            <button class="btn main" style="margin-top:18px" disabled={!where} onClick={send}><I.Upload />{t("send")}</button>
          </>
        ) : (
          <>
            <div class="card center"><span class="status ok"><I.Check />{t("sent")}</span><p class="hint">{t("waiting")}</p></div>
            {them.captainPhone && <button class="btn wa" onClick={tell}><I.WhatsApp />{t("tell_wa")}</button>}
            <button class="btn plain" onClick={() => go("/matches")}><I.Calendar />{t("matches")}</button>
          </>
        )}
      </main>
    </>
  );
}
