# Friendlies operating workflow and algorithms

## Product workflow

1. A coach creates a team inside **More → Team**, designs a badge and three kits, adds the home ground, invites players and assistants, then submits verification.
2. Players accept invitations, complete their profiles and mark availability. Assistants receive only the permissions selected by the head coach.
3. The coach posts availability or requests an opponent. Friendlies ranks suitable teams without exposing a public reliability percentage.
4. Both teams agree date, format, venue, referee cost and pitch responsibility. A confirmed fixture automatically opens captain chat.
5. Match HQ checks the squad, opponent, ground, referee and kit before kick-off.
6. During or after the match, the recorder enters the score, goal scorers, assistants, event minutes and cards.
7. The review screen presents scorers beneath each team name in a TV-style score graphic. The opponent confirms or disputes the event record.
8. Confirmed events update fixtures, tables, player statistics and team records. Disputed events remain private until resolved.
9. Team dues, sponsorship and merchandise can use either Friendlies-managed settlement or a team-managed ledger.
10. Before another league request is sent, Friendlies checks match-day, player-registration and payment conflicts. It never joins a team automatically.

## Ten algorithms

### 1. Competitive fit

Convert the rating difference into a 0–1 score: `1 − abs(teamRating − opponentRating) / 600`. A large gap makes the recommendation weaker and reduces one-sided matches.

### 2. Home and away fairness

Compare each team's last six home and away fixtures. The team carrying the larger travel debt receives preference for the home slot; rejecting that fair slot lowers the recommendation score.

### 3. Internal reliability

Completed, late and cancelled matches are weighted with exponential time decay. Recent behaviour matters most. The value stays internal and influences ranking, verification and safety prompts—it is not advertised as “98% reliable.”

### 4. Cancellation impact

Severity combines how late the cancellation occurred and how many confirmed players were affected. The product communicates the human impact and temporarily reduces recommendation visibility.

### 5. Travel fairness

Combine distance to the proposed venue with each club’s travel over the past 30 days. Teams that have travelled more receive a home-fixture boost.

### 6. Squad availability overlap

For each proposed time slot, count available players on both sides. The score uses the smaller squad count, so a fixture is only strong when both teams can field a safe squad.

### 7. Cost compatibility

Add pitch, referee and transport costs, then compare the total with the lower of the two match budgets. Expensive proposals are suppressed before managers waste time negotiating them.

### 8. Rivalry and variety

Close historical games create a rivalry boost, while too many meetings within 45 days create a repetition penalty. This preserves meaningful rivalries without showing the same opponent every weekend.

### 9. Age compatibility

Exact age bands score highest. Adjacent youth bands may be reviewed when safeguarding rules allow. Senior, veteran and youth groups never cross automatically.

### 10. League conflict guard

Before a league request, check match-day overlap, player-registration rules and unsettled league balances. Conflicts block the request and produce actions to resolve; a clean check permits a reviewed request, never an instant join.

## Combined opponent score

The ranking service combines competitive fit (20%), internal reliability (18%), availability (15%), travel (13%), home/away fairness (12%), cost (8%), age compatibility (8%) and rivalry/variety (6%). Hard safeguarding constraints—especially age and registration conflicts—override the weighted score.
