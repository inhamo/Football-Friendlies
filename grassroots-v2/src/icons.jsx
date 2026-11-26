// Concrete pictures, thick lines, drawn from everyday football things.
// Research: concrete, context-specific pictures are understood better than abstract icons,
// so every picture is always shown WITH a word next to it.
const S = (p) => ({ viewBox: "0 0 48 48", fill: "none", stroke: "currentColor", "stroke-width": 3.2, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", ...p });

export const Speaker = () => (
  <svg {...S()}><path d="M8 19h7l10-8v26l-10-8H8z" fill="currentColor" /><path d="M31 18c3 3 3 9 0 12M36 13c6 6 6 16 0 22" /></svg>
);
export const Ball = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="24" cy="24" r="20" fill="#fff" stroke="#0B1F4B" stroke-width="3" />
    <path d="M24 15l7 5-3 8h-8l-3-8z" fill="#0B1F4B" />
    <path d="M24 4v11M31 20l11-4M28 28l6 10M20 28l-6 10M17 20L6 16" stroke="#0B1F4B" stroke-width="2.6" />
  </svg>
);
export const Shirt = ({ c1 = "#0B1F4B", c2 = "#E5B611", class: cls = "shirt" }) => (
  <svg viewBox="0 0 64 64" class={cls} aria-hidden="true">
    <path d="M22 6l-14 8-6 14 9 4 3-6v34h36V26l3 6 9-4-6-14-14-8c-1 5-5 8-10 8s-9-3-10-8z" fill={c1} stroke="#14181F" stroke-width="2.4" stroke-linejoin="round" />
    <path d="M22 6c1 5 5 8 10 8s9-3 10-8" fill="none" stroke={c2} stroke-width="4" />
    <path d="M26 24h12v28H26z" fill={c2} opacity=".95" />
  </svg>
);
export const Calendar = () => (
  <svg {...S()}><rect x="6" y="10" width="36" height="32" rx="5" /><path d="M6 19h36M15 5v9M33 5v9" /><rect x="13" y="25" width="7" height="6" fill="currentColor" stroke="none" /></svg>
);
export const SunMorning = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M4 36h40" stroke="#0B1F4B" stroke-width="3.2" stroke-linecap="round" /><path d="M12 36a12 12 0 0 1 24 0z" fill="#E5B611" /><path d="M24 12v5M10 20l4 3M38 20l-4 3" stroke="#B48C00" stroke-width="3" stroke-linecap="round" /></svg>
);
export const SunNoon = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="9" fill="#E5B611" /><g stroke="#B48C00" stroke-width="3" stroke-linecap="round"><path d="M24 4v6M24 38v6M4 24h6M38 24h6M10 10l4 4M34 34l4 4M38 10l-4 4M14 34l-4 4" /></g></svg>
);
export const SunAfternoon = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="30" cy="20" r="9" fill="#E5B611" /><path d="M6 38c6-6 14-6 20 0s14 6 18 0" stroke="#0B1F4B" stroke-width="3" fill="none" stroke-linecap="round" /><path d="M30 4v4M44 20h-4M40 10l-3 3" stroke="#B48C00" stroke-width="3" stroke-linecap="round" /></svg>
);
export const Clock = () => (<svg {...S()}><circle cx="24" cy="24" r="18" /><path d="M24 13v12l8 5" /></svg>);
export const People = ({ n = 3 }) => (
  <svg viewBox="0 0 48 48" aria-hidden="true" fill="#0B1F4B">
    {Array.from({ length: n }).map((_, i) => {
      const w = 44 / n, x = 2 + w * i + w / 2, r = Math.min(5, w / 3.2);
      return <g key={i}><circle cx={x} cy={16} r={r} /><path d={`M${x - r * 1.5} 40v-9a${r * 1.5} ${r * 1.5} 0 0 1 ${r * 3} 0v9z`} /></g>;
    })}
  </svg>
);
export const Pin = () => (<svg {...S()}><path d="M24 44s14-13 14-24a14 14 0 0 0-28 0c0 11 14 24 14 24z" /><circle cx="24" cy="20" r="5" fill="currentColor" /></svg>);
export const Whistle = () => (<svg {...S()}><path d="M6 22h20a10 10 0 1 1-10 10" /><circle cx="26" cy="32" r="4" fill="currentColor" /><path d="M26 22l14-8M12 14l-3-4M18 12l1-5" /></svg>);
export const Trophy = () => (<svg {...S()}><path d="M14 6h20v12a10 10 0 0 1-20 0z" /><path d="M14 10H6c0 8 4 11 9 11M34 10h8c0 8-4 11-9 11M24 28v8M16 42h16M19 36h10" /></svg>);
export const Home = () => (<svg {...S()}><path d="M6 22L24 7l18 15M11 19v22h26V19" /><path d="M20 41V29h8v12" /></svg>);
export const Help = () => (<svg {...S()}><circle cx="24" cy="24" r="19" /><path d="M18 18a6 6 0 1 1 8 6c-2 1-2 2-2 5" /><circle cx="24" cy="35" r="1.6" fill="currentColor" /></svg>);
export const Back = () => (<svg {...S()}><path d="M30 8L14 24l16 16" /></svg>);
export const Check = () => (<svg {...S({ "stroke-width": 4.5 })}><path d="M9 25l10 10 20-22" /></svg>);
export const DoubleCheck = () => (<svg {...S({ "stroke-width": 4 })}><path d="M4 26l9 9 18-20M20 33l3 3 18-20" /></svg>);
export const Cross = () => (<svg {...S({ "stroke-width": 4.5 })}><path d="M12 12l24 24M36 12L12 36" /></svg>);
export const ThumbUp = () => (<svg {...S()}><path d="M14 22v20H6V22zM14 22l8-14c3 0 5 2 4 6l-2 7h12c3 0 5 3 4 6l-3 11c-1 3-3 4-6 4H14" /></svg>);
export const ThumbDown = () => (<svg {...S()}><g transform="rotate(180 24 24)"><path d="M14 22v20H6V22zM14 22l8-14c3 0 5 2 4 6l-2 7h12c3 0 5 3 4 6l-3 11c-1 3-3 4-6 4H14" /></g></svg>);
export const WhatsApp = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4a19 19 0 0 0-16.4 28.6L5 43l10.7-2.6A19 19 0 1 0 24 4z" fill="#fff" /><path d="M17 14c1-1 3-1 3 0l2 5c0 1-1 2-2 3 1 3 4 6 7 7 1-1 2-2 3-2l5 2c1 0 1 2 0 3-2 3-5 3-8 2-5-2-9-6-11-11-1-3-1-6 1-9z" fill="#1E7B3C" /></svg>
);
export const Money = () => (<svg {...S()}><rect x="4" y="12" width="40" height="24" rx="4" /><circle cx="24" cy="24" r="5" /><path d="M10 18v12M38 18v12" /></svg>);
export const Shield = () => (<svg {...S()}><path d="M24 4l16 6v12c0 10-7 18-16 22C15 40 8 32 8 22V10z" /><path d="M16 24l6 6 10-12" /></svg>);
export const Wifi0 = () => (<svg {...S()}><path d="M6 18a26 26 0 0 1 36 0M12 25a17 17 0 0 1 24 0M18 32a8 8 0 0 1 12 0" opacity=".35" /><path d="M8 8l32 32" /></svg>);
export const Upload = () => (<svg {...S()}><path d="M24 32V10M14 20l10-10 10 10M8 38h32" /></svg>);
export const Plus = () => (<svg {...S({ "stroke-width": 4 })}><path d="M24 8v32M8 24h32" /></svg>);
export const Star = ({ on = true }) => (<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3 7 7 .6-5.4 4.7L18.2 22 12 18l-6.2 4 1.6-7.7L2 9.6 9 9z" fill={on ? "#E5B611" : "none"} stroke="#B48C00" stroke-width="1.6" /></svg>);
export const Stars = ({ n = 1, of = 3 }) => (<span style="display:inline-flex;gap:2px;width:auto">{Array.from({ length: of }).map((_, i) => <span key={i} style="width:26px;height:26px;display:inline-block"><Star on={i < n} /></span>)}</span>);
export const Swap = () => (<svg {...S()}><path d="M8 16h30l-7-7M40 32H10l7 7" /></svg>);
export const Bell = () => (<svg {...S()}><path d="M12 34V22a12 12 0 0 1 24 0v12l4 4H8z" /><path d="M20 42h8" /></svg>);
export const List = () => (<svg {...S()}><path d="M16 12h26M16 24h26M16 36h26" /><circle cx="7" cy="12" r="2" fill="currentColor" /><circle cx="7" cy="24" r="2" fill="currentColor" /><circle cx="7" cy="36" r="2" fill="currentColor" /></svg>);
export const Erase = () => (<svg {...S()}><path d="M16 10h26v28H16L4 24z" /><path d="M24 18l10 12M34 18L24 30" /></svg>);
export const Road = () => (<svg {...S()}><path d="M16 44L20 4M32 44L28 4" /><path d="M24 8v6M24 20v6M24 32v6" /></svg>);
export const Pitch = () => (
  <svg viewBox="0 0 64 48" aria-hidden="true"><rect x="2" y="2" width="60" height="44" rx="4" fill="#1E7B3C" /><g stroke="#fff" stroke-width="2.4" fill="none"><rect x="6" y="6" width="52" height="36" /><path d="M32 6v36" /><circle cx="32" cy="24" r="7" /><rect x="6" y="16" width="8" height="16" /><rect x="50" y="16" width="8" height="16" /></g></svg>
);
export const Logo = () => (
  <svg viewBox="0 0 96 96" aria-hidden="true">
    <circle cx="48" cy="48" r="46" fill="#0B1F4B" />
    <circle cx="48" cy="48" r="38" fill="none" stroke="#E5B611" stroke-width="4" />
    <path d="M18 66h60" stroke="#1E7B3C" stroke-width="6" stroke-linecap="round" />
    <circle cx="48" cy="44" r="17" fill="#fff" />
    <path d="M48 35l7 5-3 8h-8l-3-8z" fill="#0B1F4B" />
    <path d="M30 76l6-4M66 76l-6-4" stroke="#B3121F" stroke-width="4" stroke-linecap="round" />
  </svg>
);
