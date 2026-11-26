# Revamp: PSL look + easy for everyone

This is the same Expo app (App.js) that goes to the app stores, restyled and simplified for people who read slowly, read English as a second language, or never went to school. All features stay: leagues, referees, scouts, sponsors.

## What changed

| Area | Before | Now |
|---|---|---|
| Colours | Purple + lime | PSL matchday palette: navy `#0B1F4B` / `#13306E`, Castle gold `#E5B611`, pitch green `#1E7B3C`, card red `#B3121F`, cream `#FBF8F1`. Team kit colours are unchanged. |
| Fonts | Archivo | **Atkinson Hyperlegible Next** (Braille Institute, OFL licence, letters can't be confused) for all text. **Barlow Condensed** for scores, kick-off times and big headings. |
| Text size | Many labels at 6–12px | Nothing below 14px. Inputs are 17px. Optional **A+ Bigger text** adds another 20%. |
| ALL CAPS | Many labels | Shown in Title Case (easier to read). Short codes like VS, FC, PSL stay. |
| Language | English only | English, **ChiShona**, **isiNdebele**: tap the EN button in the header. |
| Read aloud | — | Yellow speaker on every main screen reads a short help line (expo-speech, free, uses the phone's voice). |
| WhatsApp | In-app chat only | "Share on WhatsApp" on every match card (free `wa.me` link — no API, no cost). |
| Money trust | — | "This app never takes money and never asks for a PIN" is shown on match costs, at sign-up and in the language sheet. |
| Create team | One very long form | Required questions first, then the Create button. Badge, kits, map and setup extras are folded under "More options — optional". |
| Home card | Small "Match network" chip squeezed the title | Removed, so the welcome text has room. |

## How it works (for developers)

- `AppText` (used for 1,600+ labels) now enforces the minimum size, removes ALL CAPS, applies the chosen language and Bigger text. Change it once and every screen follows.
- `services/uiPrefs.js` holds the language and text size (saved on the phone).
- `services/translations.js` is the ChiShona/isiNdebele word list (keyed by the English text) plus the spoken help lines. **First draft — have native speakers check every line.** Missing words stay in English.
- `services/voice.js` wraps `expo-speech`. Most phones don't have a ChiShona or isiNdebele voice, so the phone's default voice reads those.
- The `C` and `F` objects at the top of App.js are still the single source of colours and fonts.

New packages (already in package.json): `expo-speech`, `@expo-google-fonts/atkinson-hyperlegible-next`, `@expo-google-fonts/barlow-condensed`. After pulling, run `npm install`.

## Tested

- Web build (`npx expo export -p web`) at a 360px phone width: welcome screen, coach guest mode, Home, Matches, Teams/Create team, Squad and More tabs, language switch (EN → SN → ND), Bigger text, and the read-aloud button. There were no errors.
- Saving a team needs Firebase, which wasn't connected in the test environment. That behaves the same as before the revamp.
- **Not tested on a real Android or iPhone build yet.** Run `npx expo start` and check on your phone before you publish.

Screenshots are in `docs/revamp-screens/` and `docs/revamp-overview.png`.
