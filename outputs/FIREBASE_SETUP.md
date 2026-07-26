# Firebase connection guide

Friendlies now uses the Firebase JavaScript SDK because it works in Expo Go,
Android, iOS and web. Authentication uses Anonymous Auth for guests and
Email/Password Auth for registered accounts.

Phone numbers are optional profile/contact data. Phone verification is not
enabled because Firebase verification SMS requires the Blaze billing plan and
is billed per message. Twilio is not required anywhere in this setup.

## 1. Create the Firebase project

1. Open https://console.firebase.google.com/
2. Choose **Create a project**.
3. Use a name such as **Friendlies Zimbabwe**.
4. Google Analytics can remain disabled for the first release.
5. Wait for the project to finish provisioning.

The Firebase project ID is permanent and may differ from the display name.

## 2. Register the Expo app

1. On Firebase Project Overview, choose the **Web** app icon.
2. Use **Friendlies Expo** as the app nickname.
3. Do not enable Firebase Hosting.
4. Copy the values inside the generated `firebaseConfig` object.
5. Copy `.env.example` to `.env.local`.
6. Replace every placeholder in `.env.local` with the matching Firebase value.

The six `EXPO_PUBLIC_FIREBASE_*` values identify the Firebase project. Firebase
protects data with Authentication, Security Rules and App Check, not by hiding
the web API key.

## 3. Enable free authentication methods

In **Build > Authentication > Sign-in method**:

1. Enable **Anonymous**.
2. Enable **Email/Password**.
3. Leave **Email link** disabled.
4. Leave **Phone** disabled.

The guest flow creates an anonymous Firebase user. When that person creates an
account, the app links email/password credentials to the same Firebase user ID.
Their guest workspace therefore remains attached to the account.

## 4. Create Firestore

1. Open **Build > Firestore Database**.
2. Choose **Create database**.
3. Choose **Production mode**.
4. Select **Johannesburg (`africa-south1`)**.

The database location cannot be changed later.

Firestore has collections and documents rather than SQL tables. A collection
appears when its first document is written, so there is no separate empty-table
creation step.

## 5. Connect the Firebase CLI

From this project folder:

```powershell
npm run firebase:login
Copy-Item .firebaserc.example .firebaserc
```

Replace `your-firebase-project-id` in `.firebaserc`, then run:

```powershell
npm run firebase:deploy
```

This deploys `firestore.rules` and `firestore.indexes.json`. Do not use Firestore
test mode or an allow-all rule.

## 6. Restart and test the app

```powershell
npm run start:clear
```

Test this sequence:

1. Enter as a guest.
2. Make one player or coach change.
3. Choose **Save progress**.
4. Create an email/password account.
5. Sign out and sign in again.
6. Confirm the same role and workspace return.

In Firebase Authentication, the anonymous account should become a password
account with the same user ID. Firestore should contain:

- `users/{uid}`
- `users/{uid}/private/appState`
- `publicProfiles/{uid}`

## Confirm team data is really saving

1. Open the Firebase Console for the project selected in `.firebaserc`.
2. Open **Build > Firestore Database > Data**.
3. Create a team in the app.
4. Open `teams`, then open the newest team document. It should contain the
   team name, area, sponsor, crest, kits, ground and owner/admin IDs.
5. Open `users/{uid}/private/appState`. Its `activeTeamId` should match that
   team document.
6. Change the sponsor or ground in **Team settings**, then choose **Save team**.
   The same team document should update and its `updatedAt` value should change.
7. Save a formation in **Squad**. The same document should now contain a
   `lineup` object with its formation, numbered slots, bench and custom layout.

The Team settings screen also shows **Saving**, **Saved in Firebase**, or
**Save failed** so a failed write is not mistaken for a saved local change.

## Firestore collection map

| Collection | Purpose | Main write authority |
|---|---|---|
| `users` | Private identity, role, email and optional phone | The user |
| `publicProfiles` | Safe public football profile | The user |
| `teams` | Team identity, ground, staff and admin IDs | Team admins |
| `teamMembers` | Player and staff membership records | Team admins |
| `matches` | Confirmed fixtures and results | Fixture participants |
| `matchRequests` | Challenges before confirmation | Sender and recipients |
| `availabilityPosts` | Teams looking for opponents | The posting user |
| `lineups` | Formation and selected players | Coach or team admin |
| `appearanceClaims` | Player submitted appearances | Player, then reviewers |
| `conversations` | Participant list and chat metadata | Participants |
| `conversations/{id}/messages` | Chat messages | The message sender |
| `payments` | Club dues and ledger references | User and team admins |
| `media` | Profile images and evidence metadata | Media owner |
| `refereeAssignments` | Appointments and acceptance | Creator and referee |
| `sponsorships` | Sponsor proposals and delivery state | Sponsor owner |
| `scoutReports` | Private evaluation notes | Scout owner only |
| `leagues` | Competition identity and rules | League admins |
| `leagueMemberships` | Teams registered in leagues | Team or league admins |
| `notifications` | Private user alerts | Server writes, user reads |
| `appSettings` | Shared app configuration | Server writes |
| `auditLogs` | Sensitive server audit trail | Server only |

## Important migration note

Accounts previously created in the on-device SQLite prototype are not Firebase
accounts. Their password hashes cannot safely be converted from the mobile app.
Those users must create a Firebase account once. Existing guest role data stays
on the phone and is uploaded to their new Firebase workspace.

## Useful files

- `services/firebaseConfig.js`: reads the Expo environment values
- `services/firebaseClient.native.js`: native Auth persistence and Firestore
- `services/firebaseClient.web.js`: web Auth persistence and Firestore
- `services/firebaseAuth.js`: guest, account, sign-in and sign-out flows
- `services/firestoreData.js`: collection names and workspace persistence
- `firestore.rules`: production access control
- `firestore.indexes.json`: compound query indexes
