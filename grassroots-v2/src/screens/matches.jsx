import { useEffect, useState } from "preact/hooks";
import { t, dayLabel, relDay } from "../i18n.js";
import * as I from "../icons.jsx";
import { Top, Ask, Nav, TeamHead, Choice, go, toast } from "../ui.jsx";
import { act, useStore } from "../store/index.js";
import { decideScore, linkFor, todayISO } from "../store/common.js";
import { openWA } from "../whatsapp.js";

const otherId = (m, teamId) => (m.homeId === teamId ? m.awayId : m.homeId);
const names = (m, teamId) => [...new Set([...(m.players?.[teamId] || []), ...Object.keys(m.rsvp?.[teamId] || {})])];
const coming = (m, teamId) => Object.values(m.rsvp?.[teamId] || {}).filter(Boolean).length;
const whereText = (m) => [m.venue?.name, m.venue?.landmark].filter(Boolean).join(" — ");

function Board({ m, big }) {
  const score = m.final ? `${m.final[0]}–${m.final[1]}` : t("vs");
  return (
    <div class="board">
      <div class="when">{relDay(m.date) ? `${relDay(m.date)} · ` : ""}{dayLabel(m.date)} · {m.time} · {t("a_side", { n: m.format })}</div>
      <div class="sides">
        <div class="side"><I.Shirt c1={m.home.c1} c2={m.home.c2} /><b>{m.home.name}</b></div>
        <div class="mid" style={big ? "" : "font-size:2.2rem"}>{score}</div>
        <div class="side"><I.Shirt c1={m.away.c1} c2={m.away.c2} /><b>{m.away.name}</b></div>
      </div>
      {m.venue && <div class="where">📍 {whereText(m)}</div>}
    </div>
  );
}

function StatusPill({ m, teamId }) {
  if (m.status === "cancelled") return <span class="status bad"><I.Cross />{t("cancelled")}</span>;
  if (m.status === "done") return <span class="status ok"><I.DoubleCheck />{t("score_final")}</span>;
  if (m.scores?.[teamId]) return <span class="status wait"><I.Check />{t("sent")}</span>;
  return null;
}

export function Home() {
  const s = useStore();
  const team = s.teams.find((x) => x.id === s.me?.teamId);
  const mine = s.matches.filter((m) => m.teamIds?.includes(team?.id));
  const next = mine.filter((m) => m.status === "on" && m.date >= todayISO()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  const waiting = s.challenges.filter((c) => c.toTeamId === team?.id && c.status === "sent").length;
  const needScore = mine.filter((m) => m.status === "on" && m.date <= todayISO() && !m.scores?.[team?.id]).length;
  return (
    <>
      <Top title={`${t("app")} · ${s.me?.name || ""}`} back={false} />
      <main>
        {team && <div class="card"><TeamHead team={team} /></div>}
        <p class="sec"><I.Calendar />{t("next_match")}</p>
        {next ? (
          <button style="display:block;width:100%;text-align:left" onClick={() => go(`/m/${next.id}`)}>
            <Board m={next} />
          </button>
        ) : (
          <div class="card empty" style="padding:16px"><b>{t("no_match_yet")}</b>{t("no_match_p")}</div>
        )}
        <div class="tiles">
          <button class="tile big" onClick={() => go("/find")}><I.Ball />{t("find_match")}</button>
          <button class="tile" onClick={() => go("/matches")}><I.Bell />{t("challenges")}{waiting > 0 && <span class="badge">{waiting}</span>}</button>
          <button class="tile" onClick={() => go("/team")}><I.People n={3} />{t("my_players")}</button>
          <button class="tile" onClick={() => go("/matches#played")}><I.Trophy />{t("results")}{needScore > 0 && <span class="badge">{needScore}</span>}</button>
          <button class="tile" onClick={() => go("/help")}><I.Help />{t("how_t")}</button>
        </div>
      </main>
      <Nav here="home" />
    </>
  );
}

export function MatchesList() {
  const s = useStore();
  const tid = s.me?.teamId;
  const incoming = s.challenges.filter((c) => c.toTeamId === tid && c.status === "sent");
  const outgoing = s.challenges.filter((c) => c.fromTeamId === tid && c.status !== "accepted").sort((a, b) => (b.createdAt?.seconds || b.createdAt || 0) - (a.createdAt?.seconds || a.createdAt || 0)).slice(0, 5);
  const mine = s.matches.filter((m) => m.teamIds?.includes(tid));
  const upcoming = mine.filter((m) => m.status === "on").sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const played = mine.filter((m) => m.status !== "on").sort((a, b) => b.date.localeCompare(a.date));
  const team = (id) => s.teams.find((x) => x.id === id);
  const answer = async (c, yes) => { const m = await act("answerChallenge", c.id, yes); if (yes) { toast(t("accepted")); if (m?.id) go(`/m/${m.id}`); } };

  return (
    <>
      <Top title={t("matches")} back={false} />
      <main>
        {incoming.length > 0 && <Ask q="incoming" />}
        {incoming.map((c) => {
          const from = team(c.fromTeamId);
          return (
            <div class="card" key={c.id}>
              <TeamHead team={from} sub={`${dayLabel(c.date)} · ${c.time} · ${t("a_side", { n: c.format })}`} />
              <div class="reasons"><div><I.Pin />{c.venue?.name || "—"}{c.hostId === tid ? ` (${t("our_ground")})` : ""}</div><div><I.Stars n={from?.level || 1} />{t(`level${from?.level || 1}`)}</div></div>
              <div class="row">
                <button class="btn no" onClick={() => answer(c, false)}><I.Cross />{t("decline")}</button>
                <button class="btn yes" onClick={() => answer(c, true)}><I.Check />{t("accept")}</button>
              </div>
            </div>
          );
        })}
        <p class="sec"><I.Calendar />{t("upcoming")}</p>
        {upcoming.length ? upcoming.map((m) => (
          <button key={m.id} style="display:block;width:100%;text-align:left" onClick={() => go(`/m/${m.id}`)}>
            <div class="card"><TeamHead team={{ name: `${t("vs")} ${(m.homeId === tid ? m.away : m.home).name}`, c1: (m.homeId === tid ? m.away : m.home).c1, c2: (m.homeId === tid ? m.away : m.home).c2 }} sub={`${dayLabel(m.date)} · ${m.time} · 👍 ${coming(m, tid)}/${m.format}`} /></div>
          </button>
        )) : <div class="card empty" style="padding:14px"><b>{t("no_match_yet")}</b><button class="btn main" style="margin-top:10px" onClick={() => go("/find")}><I.Ball />{t("find_match")}</button></div>}
        {outgoing.length > 0 && <p class="sec"><I.Upload />{t("outgoing")}</p>}
        {outgoing.map((c) => (
          <div class="card" key={c.id}>
            <TeamHead team={team(c.toTeamId)} sub={`${dayLabel(c.date)} · ${c.time}`} />
            <div style="margin-top:8px">{c.status === "sent" ? <span class="status wait"><I.Check />{t("waiting")}</span> : <span class="status bad"><I.Cross />{t("declined")}</span>}</div>
          </div>
        ))}
        <p class="sec" id="played"><I.Trophy />{t("played")}</p>
        {played.length ? played.map((m) => (
          <button key={m.id} style="display:block;width:100%;text-align:left" onClick={() => go(`/m/${m.id}`)}>
            <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="color:var(--navy)">{m.home.name} {m.final ? `${m.final[0]}–${m.final[1]}` : ""} {m.away.name}</b><StatusPill m={m} teamId={tid} /></div><span class="meta">{dayLabel(m.date)}</span></div>
          </button>
        )) : <p class="hint">{t("no_results")}</p>}
      </main>
      <Nav here="matches" />
    </>
  );
}

export function MatchPage({ id }) {
  const s = useStore();
  const m = s.matches.find((x) => x.id === id);
  const tid = s.me?.teamId;
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cost, setCost] = useState("");
  if (!m) return <><Top title={t("matches")} /><main><div class="empty"><b>…</b></div></main></>;
  const isRef = s.me?.role === "ref";
  const mySide = m.teamIds?.includes(tid) ? tid : null;
  const them = mySide ? m[m.homeId === tid ? "away" : "home"] : null;
  const list = mySide ? names(m, tid) : [];
  const r = decideScore(m);
  const matchLink = linkFor(`/play/${m.id}/${tid}`);
  const shareTeam = () => openWA(t("share_text_match", { home: m.home.name, away: m.away.name, day: dayLabel(m.date), time: m.time, where: whereText(m) || "-", link: matchLink }));
  const shareRef = () => openWA(t("share_text_ref", { home: m.home.name, away: m.away.name, day: dayLabel(m.date), time: m.time, where: whereText(m) || "-", link: linkFor("/ref") }));
  const total = Number(m.cost?.[tid] || 0);
  const each = total && list.length ? (total / Math.max(1, coming(m, tid) || list.length)).toFixed(2) : null;

  return (
    <>
      <Top title={them ? `${t("vs")} ${them.name}` : `${m.home.name} ${t("vs")} ${m.away.name}`} />
      <main>
        <Board m={m} big />
        {m.venue && (m.venue.lat ? <a class="btn plain" href={`https://maps.google.com/?q=${m.venue.lat},${m.venue.lng}`} target="_blank" rel="noopener"><I.Pin />{t("open_map")}</a> : null)}

        {m.status === "cancelled" && <div class="card center"><span class="status bad"><I.Cross />{t("cancelled")}</span></div>}

        {isRef && !mySide && m.status === "on" && (
          m.ref?.id === s.me.id ? <><div class="card center"><span class="status ok"><I.Whistle />{t("ref_taken")}</span></div>{m.home.phone && <button class="btn wa" onClick={() => openWA(`⚽ ${s.me.name}: ${t("ref_taken")} — ${m.home.name} ${t("vs")} ${m.away.name}, ${dayLabel(m.date)} ${m.time}`, m.home.phone)}><I.WhatsApp />{t("tell_captain")}</button>}</>
            : !m.ref && <button class="btn main" onClick={async () => { await act("volunteerRef", m.id); toast(t("ref_taken")); }}><I.Whistle />{t("i_can_ref")}</button>
        )}

        {mySide && m.status !== "cancelled" && (
          <>
            {/* Score — both captains send; it locks when they agree */}
            {(m.date <= todayISO() || m.status === "done") && (
              <div class="card">
                {m.status === "done" ? <><span class="status ok"><I.DoubleCheck />{t("score_final")}: {m.final[0]}–{m.final[1]}</span><button class="btn wa" style="margin-top:12px" onClick={() => openWA(`⚽ ${t("score_final")}: ${m.home.name} ${m.final[0]}–${m.final[1]} ${m.away.name} (${dayLabel(m.date)}) ✓✓ Grassroots`)}><I.WhatsApp />{t("share_result")}</button></>
                  : r.clash ? (<><div class="err"><I.Cross />{t("score_clash", { a: m.scores[tid].join("–"), b: m.scores[otherId(m, tid)].join("–") })}</div><button class="btn main" onClick={() => go(`/m/${m.id}/score`)}>{t("change_score")}</button></>)
                  : m.scores?.[tid] ? <span class="status wait"><I.Check />{t("score_wait", { s: m.scores[tid].join("–"), team: them.name })}</span>
                  : <button class="btn main" onClick={() => go(`/m/${m.id}/score`)}><I.Trophy />{t("enter_score")}</button>}
              </div>
            )}

            {m.status === "on" && (<>
              <Ask q="whos_coming" say={["whos_coming", "send_team_wa"]}>
                <p><span class="count">{coming(m, tid)}</span> {t("of_players", { n: m.format })}</p>
              </Ask>
              <button class="btn wa" onClick={shareTeam}><I.WhatsApp />{t("send_team_wa")}</button>
              <div class="people" style="margin-top:12px">
                {list.map((p) => {
                  const v = m.rsvp?.[tid]?.[p];
                  return (
                    <div class="person" key={p}><span class="face">{p[0]?.toUpperCase()}</span>{p}
                      <span class="state" style={v === true ? "color:var(--green)" : v === false ? "color:var(--red)" : "color:var(--muted)"}>
                        {v === true ? <><I.ThumbUp />{t("im_in")}</> : v === false ? <><I.ThumbDown />{t("im_out")}</> : "…"}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p class="sec"><I.Whistle />{t("referee")}</p>
              <div class="card">
                {m.ref ? <b>{t("ref_is", { name: m.ref.name })}</b> : <><p class="meta" style="margin-bottom:10px">{t("no_ref")}</p><button class="btn wa" onClick={shareRef}><I.WhatsApp />{t("find_ref_wa")}</button></>}
              </div>

              <p class="sec"><I.Money />{t("money")}</p>
              <div class="card">
                <div class="safe"><I.Shield />{t("money_safe")}</div>
                {!total ? (
                  <form style="display:grid;grid-template-columns:1fr auto;gap:10px" onSubmit={(e) => { e.preventDefault(); if (Number(cost) > 0) act("setCost", m.id, tid, Number(cost)); }}>
                    <input class="field" inputMode="decimal" placeholder="$" value={cost} onInput={(e) => setCost(e.currentTarget.value.replace(/[^\d.]/g, ""))} aria-label={t("pitch_cost")} />
                    <button class="btn main" style="width:auto;padding:0 18px">{t("save")}</button>
                  </form>
                ) : (
                  <>
                    <p><b>${total}</b> · {t("each_pays")}: <b class="count" style="font-size:1.8rem">${each}</b></p>
                    <div class="people" style="margin-top:10px">
                      {list.filter((p) => m.rsvp?.[tid]?.[p]).map((p) => {
                        const on = !!m.paid?.[tid]?.[p];
                        return <button key={p} class="person" style="width:100%" onClick={() => act("markPaid", m.id, tid, p, !on)}><span class="face">{p[0]}</span>{p}<span class="state" style={on ? "color:var(--green)" : "color:var(--muted)"}>{on ? <><I.Check />{t("paid")}</> : t("not_paid")}</span></button>;
                      })}
                    </div>
                  </>
                )}
              </div>

              {!confirmCancel ? (
                <button class="btn no" style="margin-top:22px" onClick={() => setConfirmCancel(true)}><I.Cross />{t("cancel_match")}</button>
              ) : (
                <div class="card" style="border-color:var(--red);margin-top:22px">
                  <Ask q="cancel_q" hint="cancel_warn" />
                  <div class="row">
                    <button class="btn plain" onClick={() => setConfirmCancel(false)}>{t("keep_match")}</button>
                    <button class="btn no" onClick={async () => { await act("cancelMatch", m.id, tid); setConfirmCancel(false); openWA(`❌ ${m.home.name} vs ${m.away.name} – ${dayLabel(m.date)} ${m.time}: ${t("cancelled")}`, them.phone); }}><I.Cross />{t("yes_cancel")}</button>
                  </div>
                </div>
              )}
            </>)}
          </>
        )}
      </main>
    </>
  );
}

export function ScorePage({ id }) {
  const s = useStore();
  const m = s.matches.find((x) => x.id === id);
  const tid = s.me?.teamId;
  const prev = m?.scores?.[tid];
  const [h, setH] = useState(prev ? prev[0] : 0);
  const [a, setA] = useState(prev ? prev[1] : 0);
  if (!m) return null;
  const Col = ({ side, v, setV }) => (
    <div class="col">
      <I.Shirt c1={m[side].c1} c2={m[side].c2} />
      <b style="display:block;color:var(--navy)">{m[side].name}</b>
      <div class="num" aria-live="polite">{v}</div>
      <div class="pm">
        <button onClick={() => setV(Math.max(0, v - 1))} aria-label={`${m[side].name} minus`}>−</button>
        <button class="plus" onClick={() => setV(Math.min(30, v + 1))} aria-label={`${m[side].name} plus`}>+</button>
      </div>
    </div>
  );
  return (
    <>
      <Top title={t("enter_score")} />
      <main>
        <Ask q="score_q" />
        <div class="stepper"><Col side="home" v={h} setV={setH} /><Col side="away" v={a} setV={setA} /></div>
        <button class="btn main" onClick={async () => { await act("submitScore", m.id, tid, h, a); toast(t("sent")); go(`/m/${m.id}`); }}><I.Upload />{t("send_score")} {h}–{a}</button>
      </main>
    </>
  );
}

// Opened from the captain's WhatsApp message. No account, no password — tap your name, tap yes or no.
export function PlayRSVP({ id, teamId }) {
  const s = useStore();
  const [m, setM] = useState(null);
  const [who, setWho] = useState("");
  const [typing, setTyping] = useState(false);
  const [done, setDone] = useState(null);
  useEffect(() => { (async () => setM(s.matches.find((x) => x.id === id) || (await act("getMatch", id))))(); }, [id]);
  if (!m) return <><Top title={t("are_you_playing")} back={false} /><main><div class="empty"><I.Ball /><b>…</b></div></main></>;
  const list = names(m, teamId);
  const answer = async (going) => { await act("rsvp", m.id, teamId, who.trim(), going); setDone(going); };
  return (
    <>
      <Top title={t("are_you_playing")} back={false} />
      <main>
        <Board m={m} />
        {done !== null ? (
          <div class="hero">{done ? <I.ThumbUp /> : <I.ThumbDown />}<h2>{done ? t("thanks_in") : t("thanks_out")}</h2></div>
        ) : !who || typing ? (
          <>
            <Ask q="pick_name" />
            {!typing && <div class="choices two">{list.map((p) => <Choice key={p} label={p} onClick={() => setWho(p)} />)}</div>}
            {typing ? (
              <>
                <input class="field" value={who} onInput={(e) => setWho(e.currentTarget.value)} aria-label={t("name_q")} maxLength={30} />
                <button class="btn main" style="margin-top:14px" disabled={who.trim().length < 2} onClick={() => setTyping(false)}><I.Check />{t("next")}</button>
              </>
            ) : <button class="btn plain" style="margin-top:14px" onClick={() => { setWho(""); setTyping(true); }}>{t("not_listed")}</button>}
          </>
        ) : (
          <>
            <Ask q="are_you_playing" say={["=" + who, "are_you_playing"]}><p style="font-size:1.3rem;font-weight:700;color:var(--navy)">{who}</p></Ask>
            <div class="row">
              <button class="btn no" style="min-height:110px;flex-direction:column" onClick={() => answer(false)}><I.ThumbDown />{t("im_out")}</button>
              <button class="btn yes" style="min-height:110px;flex-direction:column" onClick={() => answer(true)}><I.ThumbUp />{t("im_in")}</button>
            </div>
            <button class="link" onClick={() => setWho("")}>{t("back")}</button>
          </>
        )}
      </main>
    </>
  );
}

export function RefHome() {
  const s = useStore();
  const list = s.matches.filter((m) => m.status === "on" && m.date >= todayISO() && (m.needRef || m.ref?.id === s.me?.id)).sort((a, b) => a.date.localeCompare(b.date));
  return (
    <>
      <Top title={t("referee")} back={false} />
      <main>
        <Ask q="ref_home_t" />
        {list.length ? list.map((m) => (
          <button key={m.id} style="display:block;width:100%;text-align:left" onClick={() => go(`/m/${m.id}`)}><Board m={m} /></button>
        )) : <div class="empty"><I.Whistle /><b>{t("ref_none")}</b></div>}
      </main>
      <Nav here="referee" />
    </>
  );
}
