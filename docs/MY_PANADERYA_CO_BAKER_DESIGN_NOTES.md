# My Panaderya — Co-Baker Assistance (Future Feature)

> **STATUS: DEFERRED — DESIGN NOTES ONLY, NOT AN IMPLEMENTATION TASK.**
>
> This document preserves the multiplayer/collaborative-learning discussion for later review with Codex and the team. **Do not implement this feature, refactor the network stack, or change current gameplay as a result of this file.** Prioritize completing and stabilizing the game's fundamental features first. All percentages, wording, and implementation approaches below are **proposals to validate**, not final requirements unless explicitly labeled as a design decision.

**Project:** *My Panaderya*, a Filipino bakery-themed game for practicing the **procedure/sequence of long multiplication** (primarily Grade 5, with interfaces accessible to younger readers). Existing worksheet interactions—including carries, placement, connecting/dragging steps, and provided partial-product answers—remain central. The eventual learning goal is that students can independently perform the long-multiplication procedure, including on paper.

**Document purpose:** Keep a dedicated, editable specification for a future **optional offline-LAN collaborative-learning feature**. This is intended for eventual Codex implementation, not immediate development.

---

## 1. Design intent and decisions reached so far

### Preferred design direction

- **Separate bakeries, shared assistance.** Every student maintains their own bakery, coins, food collection, menu layout/slots, purchases, upgrades, Baker's Boost, package progression, ticket rarity, individual mastery, and game save. **No shared bakery or shared economic progression.**
- **Optional collaboration only.** Normal orders remain fully playable and rewarding alone. Do **not** add mandatory co-op steps or Team Orders for the first version; these could reduce individual practice time.
- **One main collaborative feature: `Call for Help`.** A student may request help **during their own long-multiplication worksheet**. A peer temporarily views the same worksheet and guides, without completing the actions for the student.
- **Autonomous nearby-player experience.** The ideal UX is that students on the **same local Wi-Fi** see each other automatically, without a visible **Host**, **Join**, room-code, or IP-entry flow. Internet should not be required after the app/software is installed and any local resources are available.
- **At most one helper per worksheet at a time.** A direct request targets one player; **Call All** invites available players and the first valid acceptance gets the session. Other invitations close or show a friendly explanation.
- **Helpers can earn a tiny coin bonus** for meaningful, verifiable assistance, far below what independent order-solving earns. The learner's own coins are **not deducted** to pay the helper. Helping must not grant helper mastery/ticket rarity/package unlock progress.
- **Keep skill progression individualized.** Ticket rarity, mastery, and progression should reflect the student's own competence; accepting help should not let another student carry them into higher individual skill tiers.
- **Network failure must not block solo play.** Requests are optional and temporary, and disconnects must never destroy a student's independent worksheet/save.

### Explicitly *not* part of the initial version

- Shared bakery, shared coins, shared menu, shared upgrades, shared ticket rarity, or shared progression.
- Mandatory partner work, Team Orders, forced step alternation, shared ticket-solving control.
- Built-in voice chat (students are likely physically near each other and can speak normally).
- Cloud accounts or internet-dependent matchmaking.
- A visible manual host-selection UI, unless a fallback is later deemed necessary.

---

## 2. Player identity, discovery, and settings

### Identity and availability

- In **Settings**, let students choose a visible **Baker Name**.
- By default use a friendly name such as **`Guest 4821`** (four random digits is illustrative). Names may duplicate, so distinguish connections using an internal **stable, unique player/device ID**, not the display name.
- Once connected to the same local game network, show other discoverable players in the Call for Help interface **automatically**.
- Display an availability indicator, such as **Available**, **Busy**, or **Do Not Disturb**. Define whether an actively solving student is considered Busy by default; they must always be able to reject a request without disrupting their work.
- Provide optional local-only **Available to Help** preference. Respect this preference when broadcasting invitations.
- If several classrooms share a network, evaluate a simple optional classroom/group filter to avoid unrelated player lists **without making rooms mandatory**.

### Intended connection UX

1. Students connect their tablets to the same classroom Wi-Fi network, even if the network has no internet connection.
2. Students open the installed game (or connect to a locally hosted web app; see architecture caveat below).
3. The game discovers nearby participants and updates the player list.
4. Students continue working in **their own bakeries**; nothing needs to be shared or migrated.
5. They can request or respond to assistance at any time it is appropriate.

Do not expose the terms *coordinator*, *leader*, *server*, or *host* to students in the normal UI. Use simple connectivity labels such as **“3 bakers nearby”**, **“Connecting...”**, or **“Reconnecting bakers...”**.

---

## 3. Call for Help — student-facing UI

### Entry point

- Put a clear, illustrated **Call for Help** control inside the active worksheet. It should be discoverable, but not visually dominate multiplication practice.
- Pressing the button opens a **non-destructive popup**. Closing the popup leaves the worksheet unchanged.

### Request popup layout

```text
┌──────────────────── CALL FOR HELP ────────────────────┐
│                                       Wi-Fi · 5 nearby│
│                                                       │
│            [ 📣 CALL ALL ]                           │
│      Ask any available baker to help!                 │
│                                                       │
│      [ 🔎 Search baker name...             ]          │
│                                                       │
│      Ana               Available         [ Call ]     │
│      Juan              Available         [ Call ]     │
│      Guest 4821        Available         [ Call ]     │
│      Mika              Busy              [  —   ]     │
│                                                       │
│                      [ Cancel ]                       │
└───────────────────────────────────────────────────────┘
```

*Layout sketch only; implement in My Panaderya's current 2D illustrated art style and reusable popup spacing system.*

- **Call All** is prominent at the top. It notifies all **eligible and available** players, not every connected student indiscriminately.
- A search bar filters the live list by Baker Name.
- Each eligible player has a **Call** button. Busy/DND players cannot be invited unless they explicitly opt in to receiving requests.
- The list updates as players join, disconnect, change their names, or change availability.
- Include friendly empty states, e.g. **“No bakers nearby yet”** or **“No available bakers right now.”** Solo play always remains accessible.
- A student may cancel their pending request. Do not allow overlapping pending requests from the same worksheet.

### Incoming request notification

- Show a small, noticeable notification such as **“Guest 4821 needs help!”** with **Help** / **Not Now**.
- Do not force an incoming modal over the recipient's currently active worksheet. The recipient must be able to decline, dismiss, or accept later if the invitation is still valid.
- Optionally provide sound + subtle animation, subject to sound/reduced-motion preferences.
- For a pending **Call All**, only **one** helper can accept successfully. All other invitations are withdrawn automatically when the first valid acceptance is recorded.
- If a second student accepts slightly too late, show **“Already being helped! Another baker accepted this request.”**, then return them safely to their own work.
- If the request is canceled, expires, or the worksheet finishes, show **“This help request is no longer available.”**

---

## 4. Assistance session: meaningful collaboration without taking over

### Roles

**Learner / ticket owner**
- Keeps exclusive control of their original worksheet: dragging, connecting, placing carries, progressing steps, and finishing the order.
- Maintains ownership of ticket completion, coin rewards, mastery, and all progression.
- Can continue while a request is pending and can end assistance at any time.

**Helper / invited peer**
- Views a **synchronized read-only worksheet state** plus limited guidance tools.
- Can point to or briefly highlight a cell/target, use simple context-appropriate quick hints, and talk to the learner in person.
- **Cannot move worksheet pieces, submit actions, earn the ticket's completion reward, or change the learner's game state directly.**
- May leave at any time and return to their own work. Their previous worksheet must resume where it was left.

### Suggested quick hints (adapt to the real worksheet)

- **“Check the carry!”**
- **“Which step comes next?”**
- **“Move to the next row!”**
- **“Shift one place!”**
- **“Try that step again!”**

Prefer visual highlights and procedural cues over long text; some players should be able to operate the interface with minimal reading. Help is intended to reinforce **procedural sequence**, not replace it with conceptual explanations or solving multiplication facts for another student.

### Ending and interruption rules

- An assistance session ends on learner completion, either player's voluntary exit, a disconnect, or an explicit timeout/recovery condition.
- Ending help must not reset the learner's worksheet or the helper's own previously paused worksheet.
- If a player disconnects, continue **solo** and optionally allow the session to reconnect. Do not lock either player in a waiting state.
- On return, make it clear when assistance has ended and the student's own bakery is active again.

---

## 5. Helper coin bonus (original balancing proposal)

Phase 4 now implements the narrower base-only 1% per verified assisted action,
5% per-order cap and immediate per-action delivery (the follow-up overrides claim-time delivery). The current rules and manual checks are
in [Helper rewards](CO_BAKER_HELPER_REWARDS.md); the proposal below is retained as
design rationale, not the implemented payout formula.

### Goals

- Encourage genuine peer guidance without making helping a more efficient coin-farming strategy than doing your own orders.
- **Original player retains their full ticket coin reward.** Helper coins are a separate small bonus, not deducted from it.
- **Helper coins never count** toward mastery, independent performance, rare-ticket probability, package unlocks, or skill-based ranks.
- A student should never be punished simply for requesting help. However, **independent skill verification** may be necessary before mastering/unlocking advanced tiers.

### Initial example formula — not final

Let `R` be the **ticket owner's total normal coin award** for the completed ticket. A tiny helper reward might be:

| Observable contribution | Illustrative helper bonus |
|---|---:|
| A relevant pointer/highlight followed by a learner action | 1% of `R` |
| A relevant procedural error is identified and the learner corrects it | 2% of `R` |
| A guided correction/next-step cue leads to successful learner progress | 2% of `R` |
| **Total per helped ticket** | **Maximum 5% of `R`** |

Example: if the owner earns 1,000 coins and the helper earns a 3% bonus, the owner still receives 1,000 and the helper gets 30 extra coins.

**Important risk:** If Baker's Boost scales ticket rewards hugely, even 5% of the owner's total may be too attractive. During balancing, compare helper income **per minute** to the rewards available from independent practice, and consider a hard per-session cap or a bonus based on **base coins before the owner's multiplier**, rather than final boosted coins.

### Safeguards

- No bonus for merely receiving, accepting, declining, or repeatedly sending requests.
- Count each eligible step/action once. Only award for a helper action followed by **verifiable learner progress**, not for repeated tapping/highlighting.
- Award at ticket completion (or another idempotent, persisted checkpoint) rather than on every hint tap.
- Cap bonus per ticket; potentially add per-day or per-pair limits if playtests show farming.
- Use unique session/event/reward IDs and persistence to prevent duplicate grants after replays, reconnects, double taps, or coordinator change.
- The app can validate *observable sequences* (hint then learner success), but cannot prove the hint actually **caused** learning. Do not claim otherwise.
- Test whether low-value bonuses are motivating enough; adjust after actual playtesting rather than assuming 1–5% is optimal.

### Individual mastery and assisted orders

The learner may still earn their normal coins from an assisted order. However, a higher skill tier/package unlock that is intended to reflect **individual ability** should require evidence of independently demonstrated procedural performance. The precise assisted-vs-independent mastery rules are **not settled** and must be designed alongside the current ticket-rarity/mastery system.

---

## 6. LAN architecture: ideal experience vs. platform reality

### Product requirement

**Desired outcome:** No internet, no manual host/join flow, and automatic nearby-player detection. If the current coordinator disconnects, another device should ideally take over without interrupting individual gameplay.

### IMPORTANT: do not assume this works in an ordinary browser

- A standard browser tab does **not** have general-purpose UDP multicast discovery or the ability to open an arbitrary listening TCP/WebSocket server. Therefore, a pure web page cannot simply become a discoverable LAN coordinator in the same way as a native app without supporting software/architecture.
- WebRTC offers peer communication but still needs an initial discovery/signaling mechanism; it does not by itself solve automatic hostless LAN discovery.
- A **locally hosted browser version** can be internet-free with a Node.js/WebSocket/Socket.IO server on a teacher laptop or another local device, and can show connected players automatically **after they access that local site**. This meets the no-internet requirement but **does require a server device** and a way to find its address (URL/QR, managed deployment, etc.).
- For a **native Android/Unity app** (or a web app packaged with a suitable native Android network layer), implement native **mDNS/DNS-SD or UDP-based LAN discovery** and a **coordinator election/failover** protocol. This is closer to the desired zero-setup experience but takes more engineering and platform testing.
- A local Wi-Fi router or hotspot must permit device-to-device communications. Some school/guest Wi-Fi networks isolate clients. Permissions, firewalls, multicast restrictions, Android background execution, and network transitions must be tested.

### Proposed *native-capable* automatic coordinator workflow

1. On game launch, each device discovers nearby My Panaderya peers or advertises itself via a LAN discovery mechanism.
2. If an active coordinator exists, join it automatically.
3. If none exists, eligible devices perform a **deterministic coordinator election**, with a short discovery grace period and coordinator term/epoch to avoid conflicting hosts.
4. The coordinator manages only **presence, availability, pending calls, single-helper arbitration, session leases, and routing of assistance events**.
5. Participants send heartbeats / maintain liveness information. On coordinator loss, eligible peers hold an election and reconnect.
6. A new coordinator rebuilds presence and reconciles any outstanding help request/session state. Old stale invitations must not grant help or awards.
7. If election/reconnection cannot complete, **solo worksheet play continues**; help is temporarily unavailable.

> This is a design goal, **not an already-selected implementation**. Real split-brain avoidance, election membership, mobile background limits, network partitions, and state recovery require careful engineering. A native library may provide parts of this, but do not assume migration is automatic or lossless.

### Data placement

| Data | Owner / source of truth (intended) |
|---|---|
| Individual bakery, coins, foods, upgrades, mastery, ticket rarity | Each student's persisted save / authoritative game state |
| Original ticket and worksheet steps | Learner's game state; helper receives synchronized read-only updates |
| Player presence, availability, invitation routing | Current LAN coordinator |
| Active helper lock / invitation state | Coordinator plus session identifiers, expiry and recovery metadata |
| Assistance events and reward acknowledgement | Persisted safely, with idempotency and clear ownership to avoid double awards |

Do **not** migrate or merge individual bakery saves when a coordinator changes.

### Reliable Call All arbitration

- A request has a unique ID and state such as `pending → accepted → completed/canceled/expired`.
- Each invitation references the same request ID; eligible recipients may send `accept`.
- Coordinator processes acceptances **atomically**: only the first valid acceptance while pending becomes the designated helper.
- Late acceptance receives an explicit rejection, and the caller's UI reflects the chosen helper.
- Protect against stale acceptances and competing coordinator epochs after migration. Do not resolve the winner based on whichever client thinks it clicked first.

### Security/privacy considerations for a classroom

- Treat devices on the same Wi-Fi as **not automatically trusted**. Validate requests, state transitions, and award events.
- Keep transmitted data limited to what assistance needs (display names, presence, relevant worksheet state, hints). Do not broadcast full saves or personal information.
- Use a device/session ID separate from the display name and provide an easy way to leave or mute requests.
- Consider duplicate names, impersonation, noisy peers, and client isolation during testing.

---

## 7. Illustrative data/events (not final API)

```json
{
  "type": "help_request",
  "requestId": "help-unique-id",
  "ticketId": "ticket-123",
  "requesterId": "device-a",
  "target": "all_available",
  "createdAt": "example-timestamp"
}
```

```json
{
  "type": "help_accept",
  "requestId": "help-unique-id",
  "helperId": "device-b",
  "coordinatorTerm": 4
}
```

```json
{
  "type": "worksheet_hint",
  "sessionId": "assistance-session-id",
  "helperId": "device-b",
  "kind": "highlight_target",
  "targetCell": "carry_2",
  "hintEventId": "hint-unique-id"
}
```

These are **concepts**, not a demand to create these precise structures now.

---

## 8. Visual/UX direction and constraints

- Follow My Panaderya's approved **simplified, vibrant, gender-neutral 2D illustrated bakery art**: clean deliberate outlines, soft cel shading, attractive button assets, limited visual noise.
- Respect the existing popup spacing/alignment system and preserve the bakery UI geometry, clipping, and worksheet behavior.
- Prefer **small, readable UI labels**, icons, highlights and tap interactions to text-heavy teaching instructions.
- Use a concise, non-blocking reconnect status; never make students manually manage coordinator elections.
- Accessibility: large touch targets for Grade 2–5, good contrast, no hover requirement, reduced motion/sounds where appropriate.
- Do not let a Call for Help popup, invitation, or helper overlay reset worksheet progress or cause duplicate order/package rewards.

---

## 9. Evaluation plan — prove collaborative *learning*, not just multiplayer

The feature's educational purpose is to help learners execute the **long-multiplication procedure** independently, not simply improve engagement metrics.

Potential playtest outcomes:

- Independent procedural accuracy **after receiving help**.
- Correctness of carry placement, step order, row shifting and other procedural actions.
- Number of individually performed correct steps/orders per fixed practice period.
- Time lost to requesting, answering, or waiting for help.
- Proportion of requested sessions accepted and completed.
- Whether helpers offer relevant procedural cues rather than answer-giving.
- Post-game **paper-based** procedural long multiplication performance.
- Coin reward farming or domination of time spent helping vs. practicing independently.

Compare solo and help-enabled conditions where feasible; do **not** assume co-op automatically improves learning. Define measurable mastery criteria rather than equating total ticket rewards with actual skill.

---

## 10. Decisions to resolve when this feature becomes active

1. **Final deployment:** ordinary local-network browser site, native Android/Unity APK, or current web game packaged with a native LAN module?
2. **Automatic discovery:** supported networking APIs/libraries on the target tablet and school network; graceful fallback when mDNS/multicast fails.
3. **Coordinator model:** election eligibility, failover rules, session recovery; whether a classroom-managed coordinator is needed as fallback.
4. **Identity:** uniqueness and persistence of guest ID, name editing, privacy, how players are separated across classrooms.
5. **Availability:** when active learners can receive requests and how queued notifications work.
6. **Assistance scope:** exact helper hints/highlight UX given the finalized worksheet step engine.
7. **Helper rewards:** final contribution metric and magnitude (e.g., 1–5% maximum), hard caps, whether rewards use base vs. boosted ticket coins.
8. **Mastery attribution:** how an assisted order affects independent skill progression, package unlocks, and ticket rarity.
9. **Reliability:** saved-state recovery, interruption handling, coordinator change and exactly-once reward logic.
10. **Assessment:** how to compare independent learning and paper transfer before and after assisted practice.

---

## 11. Suggested later implementation stages (NOT NOW)

**Stage A — Offline networking feasibility prototype**  
Test two real Android tablets on one Wi-Fi router without internet. Confirm discovery, join, presence, disconnect and leader election **for the chosen runtime**. Do not build this on assumptions about browser capabilities.

**Stage B — Call for Help UI and presence**  
Add settings display names, player list, search, Call All, direct Call, availability, and notifications with first-accept-wins arbitration.

**Stage C — Synchronized read-only helper worksheet**  
Share the live procedure state and hints while retaining exclusive learner controls and ensuring both players can resume their individual game.

**Stage D — Reward balancing and robustness**  
Implement tiny verified helper bonuses, independent mastery checks, persistence, duplicate protection, failover recovery, and playtest instrumentation.

**Stage E — Classroom learning evaluation**  
Measure help session usage, independent procedural performance, and transfer to paper; refine reward and UX parameters based on observations.

---

## Instructions for future Codex sessions

When Codex is asked to **read or reference this file** while working on current core features:

1. Treat it as **future design context only**.
2. **Do not build, stub, or wire up the multiplayer architecture** without an explicit new implementation request.
3. Do not modify the current order worksheet, progression/economy, menu, package system, save logic, or UI layout just to accommodate this deferred feature.
4. It is fine to keep existing components clean and modular, but do not undertake speculative refactors for co-op.
5. If later asked to implement, first inspect the actual codebase and deployed target platform; resolve the open decisions above before choosing networking technology.

**Working title:** *Co-Baker Assistance — Separate Bakeries, Shared Help.*
