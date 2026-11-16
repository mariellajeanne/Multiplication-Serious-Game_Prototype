# Co-Baker Phase 4 follow-up: immediate helper rewards

Implemented scope: small helper coin bonuses over the existing browser and peer
message transports. No remote worksheet commands, shared bakery, helper Mastery,
new economy, or changes to worksheet mathematics/Golden Challenges/Boost.

## Eligibility

The learner owns qualification. Only a cue accepted by the existing Guidance
validator from its currently reserved helper can arm a contribution. Peer,
connection, reservation, stream, recipient, sequence, lease, visibility and rate
checks still apply. Reward eligibility additionally requires the published state
to agree with a fresh local engine snapshot. An in-flight cue may retain its
existing live lease when a watch refresh rotates tokens without changing state.

A delivered cue is saved with its helper's persistent UUID, order ID, exact
worksheet attempt and semantic action. It has **no time or session expiry** after
successful delivery. Refresh, helper closure, connection loss and session end do
not erase it. The helper may lose observation/new-cue permissions normally while
the learner follows an earlier saved suggestion. No new help reservation is
required for payment.

The shell must accept a new action from its own worksheet iframe with the
existing origin/attempt/action checks; the rewards adapter also reads the local
engine's action ledger directly. Actions already accepted when a cue arrives
cannot receive retroactive credit. Wrong orders, wrong attempts and unrelated
actions never match. A fresh retry requires a fresh suggestion, but cannot earn
the same already-credited semantic action again. The first delivered meaningful
suggestion for an uncredited action within an attempt wins; repeat cues do not
replace its recipient.

| Current action | Relevant pointers | Relevant preset hints |
| --- | --- | --- |
| Connect | Current top/bottom operand digit | Next digit, Try again |
| Reveal | Product display, Generate | Try again |
| Apply carry | Current carry shelf, carry source/tray | Carry, Try again |
| Place ones | Current ones slot/source | Ones, Place, Try again |
| Place final tens | Current final tens slot/source | Place, Try again |
| Lift/place outgoing carry | Next carry shelf/tens source; provisional tens slot when present | Carry, Place, Try again |
| Complete addition | Add Rows | Add rows, Try again |

Undo, calculator keystrokes, automatic combo sealing, optional provisional tens
placement, accepting invitations and transmitting cues do not earn credit.
Each `row:column:action` (or final `complete`) can qualify once per **order**,
including after Undo, retry, refresh, new help reservations and helper changes.
There are at most five qualifying actions total across all helpers on that order.

## Formula

`cumulative(n) = Math.round(base * min(n * 1, 5) / 100)`

`receiptCoins(n) = cumulative(n) - cumulative(n - 1)`

Rates, cap and retry interval are named constants in
`CoBakerRewards.CONFIG` in `src/network/helper-rewards.js`.

**Compatibility choice:** final random coin denominations do not exist when an
early worksheet action occurs. Current step-coin orders therefore freeze the
existing **unboosted order quote** (`orderCoinQuote(ticket, 1)`) when assistance
first establishes the reward context. This is the production weighted base quote
for all digit pairs, excluding Golden multipliers and Baker's Boost. Legacy
orders retain their frozen base coins. This changes only the helper's reference
base; learner rolls, payout formulas, Boost and Golden Challenges are unchanged.

Each verified action issues the increase in the rounded cumulative bonus
immediately. There is no minimum payment. Base 49 gives zero for the first action;
five credits at base 150 distribute eight coins total, never ten. Each receipt's
amount is immutable. A later abandonment, failed claim, completed order, extra
helper or coin roll cannot reduce or recalculate earned coins.

The aggregate unrounded bonus is bounded by 5% of the same order's ordinary base;
splitting credits between helpers does not increase that budget. The contribution
ordinal is global to the order, including replacement helpers, so its rounded
delta is assigned to whoever earned that action. This replaces the earlier
claim-time largest-remainder allocation, which required knowing future helpers.
The learner keeps their entire existing payout.
Comparable full orders remain much more valuable than the helper bonus. This
per-order bound does not establish measured coins per minute or educational
outcomes; those still need playtesting.

## Persistence and delivery

Both sides use **their own `panaderyaQuestV2` save**. The learner's version-2 reward
ledger stores order tombstones, delivered suggestions, earned semantic actions
and outgoing receipts outside disposable worksheet attempts. Each earned action
has its own stable random receipt ID and persistent recipient UUID. Legacy run
recreation, retry, switching orders, Save & Exit and ordinary board refresh cannot
reset this budget. The board already preserves every started ticket; when all
slots have saved work it refuses refresh until an order frees space. There is no
discard/restart loop that replenishes the same order's reward budget.

The helper stores its sent-cue witness. The learner acknowledges **durable
delivery** with `reward-suggested`, pinning that witness against spam eviction.
When the matching legitimate action is accepted, one learner save commits both
the earned-step tombstone and its `reward-earned` outbox receipt. Completion and
`creditCompletedOrder` have no part in new reward eligibility or payment.

The helper checks each receipt against its saved sent-cue witness/context,
the expected frozen quote, semantic action, ordinal and bounded accepted-action
snapshot. It calculates the cumulative coin delta locally; no arbitrary inbound
coin amount is accepted. One synchronous helper save commits coins and its
received receipt. Only then does it acknowledge. Failed writes roll back and send
no acknowledgement. Duplicate receipts or a second receipt ID for the same
order/action/ordinal cannot pay twice. Packets can arrive out of order.

The learner persists acknowledgements. Unacknowledged outboxes retry every three
seconds when the same helper identity is present, even after observation ends.
Suggestion acknowledgements also retry. Coordinator election has no authority
over rewards. Save revisions refuse writes from stale tabs that could overwrite
newer reward evidence or coins. Reward notices are small, transient and do not
remount or interrupt the helper's personal worksheet.

Version-1 earned-but-unsettled credits migrate to immediate per-action receipts.
Already paid version-1 combined receipts remain paid and are never credited
again. Existing combined outboxes are retained for delivery. The old implementation
never persisted unearned suggestions; suggestions lost before installing this
fix cannot be reconstructed from nonexistent records.

## Boundaries

- Delivery requires both identities to be online together again, using the same
  origin/profile and retained local saves. There is no cloud mailbox. If they
  never reunite, retain the pending outbox; do not invent a payment locally.
- Clearing/rolling back saves, changing origins/profiles, permanent loss of the
  learner device or persistent storage failure can prevent recovery. Received
  tombstones are deliberately retained to reject replays.
- These are client-authoritative, unverified peer identities. Witness matching,
  engine checks and math validation protect normal clients from accidental,
  duplicate, stale and unsolicited rewards. Modified clients, colluding peers,
  identity impersonation and edited localStorage are **not** fully prevented.
  An accepted-action snapshot cannot remotely prove human participation.
- Android receives the same bounded reward message schemas; discovery and LAN
  routing are unchanged. JVM validation/build checks are distinct from physical
  Android LAN verification, which has not been performed.

## Manual two-client check

1. Start `node tools/co-baker-dev.mjs`. Open its printed `127.0.0.1` URL with
   `?cobaker=debug&webrelay=1` in **two independent browser profiles** (for example,
   Edge and another browser). Use one consistent hostname in each profile.
2. In the learner profile, start an order and Call for Help. In the helper
   profile, accept. Wait for the live worksheet. Accepting alone changes no coins.
3. In Edge, point at the current operand digit. Refresh Edge, then connect that
   pair in Chrome. Expect an immediate "Co-Baker bonus: +N coins" notice, before
   order completion. Mastery, luck, inventory and personal worksheet stay unchanged.
4. Send another relevant suggestion, then close Edge. Wait for assistance to
   expire. Follow the suggestion in Chrome, Save & Exit, and refresh Chrome.
   Reopen the same Edge profile and join the same relay/group normally. Expect
   the outstanding reward automatically, without another Call for Help.
5. Refresh/reconnect both profiles repeatedly. The same receipt must not add
   coins again. Wrong-column cues, hints without matching actions and Undo/retry
   loops do not create new rewards. Completing/claiming afterward adds no extra
   helper bonus.

For remote browser testing, restart the source Node relay and refresh both
clients: the acknowledgement is now **protocol 8, Phase 4 receipts**. Existing
relay/group/password setup still applies. Do not test against an old running relay.

Automated checks: `node --test tests/*.test.mjs`,
`python tests/browser-helper-rewards.py` and the same command with `--remote`.
The browser test uses real Chrome/Edge profiles and the real 79 × 18 procedure,
including carrying, Undo, helper refresh before action, actual browser closures,
both process restarts, expired sessions, replacement helpers, ordinary-peer
delivery, multiple pending receipts, coordinator loss and independent worksheets.
Pass `--webkit` to run the learner in WebKit instead.