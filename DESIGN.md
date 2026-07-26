# Design System

## Theme

Friendlies inherits the shared product language of Proven Champions and Football App: a pale operational canvas, white data surfaces, bold Archivo match-day typography, compact radii, and exact data rows. Its own identity is stadium violet with an electric match-day lime accent—closer to the energy of a league broadcast while remaining distinct from the green and red source products.

## Color Palette

- Brand: `#6C2BEA` — selected controls and primary actions
- Brand deep: `#2D0A45` — match hero and strong selected states
- Accent: `#B9F34A` — centred Home navigation and trusted-club highlights
- Background: `#F3F1F6` — operational wash
- Surface: `#FFFFFF` — cards and controls
- Ink: `#17131D` — primary content
- Muted: `#6D6575` — secondary content
- Rule: `#DED8E6` — boundaries and table rows
- Urgency: `#D93B4B` — losses, alerts, and live state
- Runtime note: React Native StyleSheet tokens use sRGB equivalents because native colour parsing does not reliably support OKLCH across Expo 54 targets.

## Typography

Use Archivo Semibold through Black for screen titles, section titles, scores, and football data. Keep supporting body copy in the native system sans for Proven Champions-style operational clarity. Use tabular numbers for times, scores, and standings.

## Shape and Spacing

- Major surfaces: 12px radius
- Compact controls and inputs: 4px radius
- Buttons: 4px radius, no shadow
- Status chips: full pill only when the shape communicates state
- Touch targets: 44px minimum
- Base spacing unit: 4px; common gaps: 8, 12, 16, 24, 32
- Page gutter: 20px

## Components

Primary buttons use stadium violet with white text; selected navigation uses violet while Home is permanently elevated in an electric-lime circle. Every role has five focused destinations with Home in the middle. Coach uses Teams, Matches, Home, Squad, and More. Home is a compact community dashboard with vertically stacked local fixtures; Find a team opens algorithmic matching, Post availability publishes a persistent listing, and See all opens Matches. Teams handles flat discovery rows, rankings, the honeycomb matching state, and a three-step challenge wizard. Reliability remains an internal signal; the visible UI uses verified history and concrete commitments rather than percentage scores. Matches manages requests, fixtures, and verified results; opening a fixture leads directly to Match HQ, then to a three-step recording wizard for score, scorer, assister, minute, and cards. The final review uses a TV-style score graphic with scorers beneath their team names. Squad is formation-first, with preset systems, bench substitutions, and a Custom mode where the coach drags players freely on the pitch. More contains stable entities and administration: Team, Players, Coaches, Stats, Leagues, club finances, invitations, web sharing, and settings. Team creation is an action inside Team and includes shaped crests, three independently designed kits, working staff and player invitations, ground setup, verification, and merchandise. League creation is inside Leagues, while joining another competition is protected by schedule, registration, and payment conflict checks. Club Wallet supports Friendlies-managed settlement or a team-managed ledger. Direct entry supports Coach, Player, Guest Player, Referee, Sponsor, and Scout. Their role-specific actions persist locally, including RSVPs, club and training requests, chat messages, payments, videos, referee volunteering and subscription, sponsorship interest, and scouting watchlists. Profiles are role-specific: Player and Guest Player hold football position, foot, area, evidence and club status; Sponsor holds organisation, sector, operating area, budget and sponsorship interests; Scout holds organisation, credentials, coverage, focus areas and a private scouting brief. Images or logos can be selected from the device, contact visibility defaults to private, and verification is requested only after required identity fields are complete.

## Motion

Use a short branded loading reveal and restrained native transitions for sheets, detail routes, and interaction feedback. Motion communicates navigation and state rather than decorating every section, and must respect the operating system reduced-motion setting.

## Primary Flow

Home → discover and challenge a team → accept the fixture → open Match HQ from Matches → confirm venue, squad, referee, and kit → record score and player events → opponent confirmation updates rankings and statistics. Home remains the visual and navigational centre of the product.

## Role Profile Records

Player, Sponsor and Scout profiles use three views: Details, Portfolio and Public view. Player portfolios contain shirt number, age category, evidence and achievements. Sponsor portfolios contain previous sponsorships and intended community impact. Scout portfolios contain private player reports with level, recommendation and observations. Public previews never expose scout reports, watchlists or private briefs.
