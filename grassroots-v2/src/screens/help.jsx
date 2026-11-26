import { useState } from "preact/hooks";
import { t, LANGS, setLang, getLang } from "../i18n.js";
import * as I from "../icons.jsx";
import { Top, Ask, Nav, Choice, go } from "../ui.jsx";
import { act, useStore } from "../store/index.js";

export function Help({ onLang }) {
  const s = useStore();
  const [big, setBig] = useState(document.documentElement.classList.contains("big"));
  const [lang, setL] = useState(getLang());
  const toggleBig = () => { const v = !big; setBig(v); document.documentElement.classList.toggle("big", v); try { localStorage.setItem("gr_big", v ? "1" : ""); } catch {} };
  return (
    <>
      <Top title={t("help")} back={false} />
      <main>
        <Ask q="how_t" say={["how_t", "how1", "how2", "how3", "how4"]} />
        {[[<I.Shirt c1="#0B1F4B" c2="#E5B611" />, "how1"], [<I.Calendar />, "how2"], [<I.Ball />, "how3"], [<I.Trophy />, "how4"]].map(([pic, k], i) => (
          <div class="helpstep" key={k}><span class="num-badge">{i + 1}</span>{pic}<b>{t(k)}</b></div>
        ))}
        <div class="safe"><I.Shield />{t("pin_safe")}</div>
        <p class="hint">{t("sound_note")}</p>

        <p class="sec"><I.Speaker />{t("language")}</p>
        <div class="choices">
          {LANGS.map((l) => <Choice key={l.id} on={lang === l.id} label={l.label} onClick={() => { setLang(l.id); setL(l.id); onLang && onLang(); }} />)}
        </div>

        <button class={`btn ${big ? "dark" : "plain"}`} style="margin-top:18px" onClick={toggleBig} aria-pressed={big ? "true" : "false"}>
          <span style="font-size:1.6rem">A+</span>{t("big_text")}{big && <I.Check />}
        </button>

        <p class="hint" style="margin-top:18px">{t("data_note", { kb: s.mode === "cloud" ? 270 : 80 })}</p>

        {s.me && <button class="btn plain" style="margin-top:8px" onClick={async () => { await act("signOut"); go("/"); }}>{t("sign_out")}</button>}
        {s.mode === "demo" && <button class="link" onClick={async () => { await act("resetPractice"); go("/"); }}>Reset practice data</button>}
      </main>
      {s.me && <Nav here="help" />}
    </>
  );
}
