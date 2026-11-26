# Grassroots v2 — football friendlies

This is a full rebuild of the Football Friendlies app, designed to be easy for people who read slowly, read English as a second language, or never went to school. It costs nothing to run.

The design decisions come from 69 UI/UX sources. They are listed in `docs/ux-sources.md`, and the design system and screens are in `docs/Grassroots-v2-design-system.png`.

## What it does

1. **Captain makes a team** by answering one question per screen: name, town, area, shirt colours and strength.
2. **Find a match.** The captain picks a day (pictures of dates), a time (morning, midday or afternoon suns) and a format (5, 7 or 11 a side). The app shows up to 3 fair teams, each with a reason: same level, near you, and how often they turn up.
3. **Ask to play.** The captain chooses whose ground, adds a landmark ("behind Mai Rudo's shop") and taps Send, then "Tell them on WhatsApp".
4. **The other captain** taps **Yes, we play** or **No thanks**.
5. **Players** don't need an account. The captain taps "Ask my players on WhatsApp". Each player taps the link, finds their name and taps 👍 or 👎.
6. **Referee.** The captain shares a WhatsApp request. Referees have their own screen listing matches that need a ref.
7. **Money (optional).** The app splits the pitch and referee cost and ticks off who paid. **It never takes money and never asks for a PIN.**
8. **Score.** Both captains tap + and −. The score locks only when both agree. If they don't, both see the clash and can change their entry.
9. **Record.** Won, drawn, lost and "turns up 9 of 10 times" feed back into finding fair matches.

There are also three languages (English, ChiShona, isiNdebele), a yellow speaker button on every screen, an "A+" bigger-text option, and the app keeps working offline.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production files go to dist/
```

With no Firebase keys, the app runs in **Practice mode**. Everything stays on the phone, and sample teams (marked "Sample") reply automatically. Use this for testing and for training captains. You can also add `?practice=1` to the URL to force Practice mode.

## Go live for $0

### 1. Firebase (free Spark plan, no card needed)

1. In the Firebase console, open your existing project, or create a new one.
2. Go to **Authentication → Sign-in method** and turn on **Email/Password** and **Anonymous**.
   - Login is the phone number plus a 4-number code. The app uses Email/Password behind the scenes, so it never sends SMS. Firebase charges for every SMS, which is why phone-number SMS login is not used.
   - Anonymous login is for players who open a WhatsApp link.
3. Create **Firestore Database**.
4. Deploy the rules and the single index:
   ```bash
   npx firebase-tools login
   npx firebase-tools use <your-project-id>
   npx firebase-tools deploy --only firestore
   ```
5. Copy `.env.example` to `.env.local` and fill in the 4 values from **Project settings → Your apps → Web app**. Your v1 `.env.local` already has these values under different names, so copy them across.

The free limits are 50,000 reads and 20,000 writes per day, and 1 GB of storage. That is plenty for hundreds of teams. If you get close to the limit, the first place to save reads is the `teams` listener in `src/store/firebase.js`.

### 2. Cloudflare Pages (free, unlimited bandwidth — you already use it)

- Build command: `npm run build`
- Output folder: `dist`
- Environment variables: the same 4 `VITE_FIREBASE_…` values

### 3. Put it on phones

Share the link. On Android, Chrome offers **"Add to Home screen"**, which installs the app with no Play Store fee. Later, if you want a Play Store listing, you can wrap the same site as a Trusted Web Activity.

## Record your own voices (free, and better than the phone's voice)

The phone's voice reads English well, but it reads ChiShona and isiNdebele badly. You can fix that with your own recordings:

1. Record short voice notes on WhatsApp or the phone recorder. Good starting keys are `welcome_t`, `day_q`, `time_q`, `format_q`, `found_t`, `whos_coming`, `pick_name`, `are_you_playing`, `score_q` and `pin_safe`. The wording for each key is in `src/i18n.js`.
2. Convert each one to mp3 and save it as `public/audio/sn/day_q.mp3` (use `nd/` for isiNdebele and `en/` for English).
3. List the keys you recorded in `public/audio/index.json`, for example `{ "sn": ["day_q", "time_q"] }`.

Your recordings play first. The phone's voice is only used where no recording exists.

## Check the translations ⚠️

The ChiShona and isiNdebele text in `src/i18n.js` is a **first draft**. Ask two native speakers (one for each language) to read every line out loud and correct it before launch. Any key that is missing falls back to English, so nothing breaks while you work on it.

## Design system

| Token | Value | Used for |
|---|---|---|
| PSL Navy | `#0B1F4B` | top bar, headings |
| Castle Gold | `#E5B611` | the one main action on each screen |
| Pitch Green | `#1E7B3C` | yes, done and WhatsApp (always shown with ✓) |
| Card Red | `#B3121F` | no, cancel and problems (always shown with ✕) |
| Stand Cream | `#FBF8F1` | background |
| Fonts | Atkinson Hyperlegible Next 400/700 + Barlow Condensed 700 | self-hosted in `public/fonts` (OFL licence, 47 KB) |

The colours are a close match to the Castle Lager PSL look. If you get the official brand file, put its exact values in `src/styles.css`. The league logo itself is not used, because it belongs to the PSL and Delta.

## Files

```
src/main.jsx            routes
src/screens/*.jsx       start, team, find, matches, help
src/store/demo.js       Practice mode (on the phone)
src/store/firebase.js   cloud mode (Firebase free plan)
src/match.js            fair-match score: level 40% · distance 25% · turns up 20% · home/away 15%
src/i18n.js             English / ChiShona / isiNdebele
src/speak.js            read-aloud (recorded voice first, phone voice second)
src/whatsapp.js         free wa.me sharing
firestore.rules         security: players can only tick in/out; a final score must match both captains
public/sw.js            offline cache
```

## Known gaps (honest list)

- **Cloud mode has not been run against a real Firebase project yet.** The build compiles and starts cleanly, and Practice mode was tested end to end on a 360px phone screen. The security rules also need testing: run `npx firebase-tools emulators:start` on your PC (it needs Java) before launch.
- A 4-number code is easy to remember but weak. Firebase slows down repeated wrong guesses, but don't use this login for anything more sensitive than fixtures.
- WhatsApp messages are sent by the person tapping the button, so there are no automatic reminders. Automatic reminders would need the paid WhatsApp API.
- Leagues, tournaments, scouts and sponsors from v1 are not in v2 yet. They can be added once the friendly loop is working well.
