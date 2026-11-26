import { useState } from "preact/hooks";
import { t, LANGS, setLang, getLang } from "../i18n.js";
import * as I from "../icons.jsx";
import { Top, Ask, Choice, Steps, NumPad, PinDots, Err, go } from "../ui.jsx";
import { act } from "../store/index.js";

export function Language({ onDone }) {
  const [cur, setCur] = useState(getLang());
  return (
    <>
      <Top title="Grassroots" back={false} />
      <main>
        <div class="hero"><I.Logo /></div>
        <Ask q="pick_lang" />
        <div class="choices">
          {LANGS.map((l) => (
            <Choice key={l.id} on={cur === l.id} label={l.label} pic={<I.Speaker />}
              onClick={() => { setLang(l.id); setCur(l.id); }} />
          ))}
        </div>
        <button class="btn main" style="margin-top:22px" onClick={() => { try { localStorage.setItem("gr_lang_set", "1"); } catch {} onDone ? onDone() : go("/"); }}>
          <I.Check />{t("next")}
        </button>
      </main>
    </>
  );
}

export function Welcome() {
  return (
    <>
      <Top title="Grassroots" back={false} />
      <main>
        <div class="hero"><I.Pitch /></div>
        <Ask q="welcome_t" hint="welcome_p" />
        <div class="choices">
          <Choice pic={<I.Shirt c1="#0B1F4B" c2="#E5B611" />} label={t("i_captain")} sub={t("i_captain_s")} onClick={() => go("/signup/captain")} />
          <Choice pic={<I.Ball />} label={t("i_player")} sub={t("i_player_s")} onClick={() => go("/player")} />
          <Choice pic={<I.Whistle />} label={t("i_ref")} sub={t("i_ref_s")} onClick={() => go("/signup/ref")} />
        </div>
        <button class="btn plain" style="margin-top:18px" onClick={() => go("/login")}>{t("have_acc")}</button>
      </main>
    </>
  );
}

export function PlayerInfo() {
  return (
    <>
      <Top title={t("i_player")} />
      <main>
        <div class="hero"><I.WhatsApp /></div>
        <Ask q="player_t" hint="player_p" />
        <div class="helpstep"><span class="num-badge">1</span><I.WhatsApp /><b>{t("send_team_wa")}</b></div>
        <div class="helpstep"><span class="num-badge">2</span><I.People n={3} /><b>{t("pick_name")}</b></div>
        <div class="helpstep"><span class="num-badge">3</span><I.ThumbUp /><b>{t("im_in")}</b></div>
        <button class="btn main" onClick={() => go("/")}><I.Check />{t("ok")}</button>
      </main>
    </>
  );
}

// Sign up: one question per screen — name, phone, code, code again.
export function SignUp({ role }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const title = role === "ref" ? t("i_ref") : t("i_captain");

  const finish = async (p2) => {
    if (p2 !== pin) { setErr(t("pin_nomatch")); setPin2(""); return; }
    setBusy(true);
    try { await act("signUp", { name, phone, pin, role }); go(role === "ref" ? "/ref" : "/team/new"); }
    catch (e) { setErr(e.message === "exists" || /email-already/.test(e.code || "") ? t("wrong_login") : String(e.message || e)); setBusy(false); }
  };

  return (
    <>
      <Top title={title} />
      <main>
        <Steps n={step} of={4} />
        <Err msg={err} />
        {step === 1 && (
          <>
            <Ask q="name_q" hint="name_hint" />
            <input class="field" value={name} onInput={(e) => setName(e.currentTarget.value)} autocomplete="name" aria-label={t("name_q")} maxLength={30} />
            <button class="btn main" style="margin-top:18px" disabled={name.trim().length < 2} onClick={() => setStep(2)}><I.Check />{t("next")}</button>
          </>
        )}
        {step === 2 && (
          <>
            <Ask q="phone_q" hint="phone_hint" />
            <div class="phone-show" aria-live="polite">{phone || "07…"}</div>
            <NumPad value={phone} onChange={setPhone} max={13} />
            <button class="btn main" style="margin-top:16px" disabled={phone.replace(/\D/g, "").length < 9} onClick={() => setStep(3)}><I.Check />{t("next")}</button>
          </>
        )}
        {step === 3 && (
          <>
            <Ask q="pin_q" say={["pin_q", "pin_safe"]} />
            <div class="safe"><I.Shield />{t("pin_safe")}</div>
            <PinDots n={pin.length} />
            <NumPad value={pin} max={4} onChange={(v) => { setPin(v); if (v.length === 4) setTimeout(() => setStep(4), 200); }} />
          </>
        )}
        {step === 4 && (
          <>
            <Ask q="pin_q2" />
            <PinDots n={pin2.length} />
            <NumPad value={pin2} max={4} onChange={(v) => { setPin2(v); setErr(""); if (v.length === 4) finish(v); }} />
            {busy && <p class="center hint">…</p>}
          </>
        )}
      </main>
    </>
  );
}

export function Login() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const tryIn = async (p) => {
    try { await act("signIn", { phone, pin: p }); go("/"); }
    catch { setErr(t("wrong_login")); setPin(""); }
  };
  return (
    <>
      <Top title={t("login_t")} />
      <main>
        <Err msg={err} />
        {step === 1 ? (
          <>
            <Ask q="phone_q" />
            <div class="phone-show">{phone || "07…"}</div>
            <NumPad value={phone} onChange={setPhone} max={13} />
            <button class="btn main" style="margin-top:16px" disabled={phone.replace(/\D/g, "").length < 9} onClick={() => setStep(2)}><I.Check />{t("next")}</button>
          </>
        ) : (
          <>
            <Ask q="pin_login" />
            <div class="safe"><I.Shield />{t("pin_safe")}</div>
            <PinDots n={pin.length} />
            <NumPad value={pin} max={4} onChange={(v) => { setPin(v); setErr(""); if (v.length === 4) tryIn(v); }} />
          </>
        )}
      </main>
    </>
  );
}
