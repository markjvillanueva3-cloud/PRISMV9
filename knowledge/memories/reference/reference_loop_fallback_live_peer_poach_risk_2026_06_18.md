---
name: reference_loop_fallback_live_peer_poach_risk_2026_06_18
description: "loop-state.mjs `next` fleet-fallback can resolve a slot onto a unit a LIVE peer is actively working but has NOT formally claimed -- the peer-claim filter misses informal active-work, creating a poach-risk + accidental infinite-loop on a peer's unit. Found while applying the never-idle rule (golf)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.647Z
aliases: reference_loop_fallback_live_peer_poach_risk_2026_06_18
---


# loop-state fleet-fallback can poach a LIVE peer's unclaimed-but-active unit (2026-06-18, slot:golf)

## What happened
Applying the new [[feedback_slots_never_idle_always_hunt]] rule, golf ran rung-2 `node .claude/helpers/loop-state.mjs next --session <sid>`. Golf's own fleet-hygiene queue was dry, so `pickUnitTop` fell to the fleet-wide fallback (`pick-unit` no `--slot`, peer-claim-filtered) and resolved `XPROC-NEURAL-OPTIMIZE-MS0 / U-NN-TIER05` -- india's deep-ML specialty unit. india was **LIVE and actively working** (`chat-slots.json` india heartbeat age 0min, activity `PostToolUse:Edit`). The `next` call also activated a loop with a degenerate `target=1000000000`, and the `stop-force-loop-continue` hook then pushed golf to iterate on india's unit. Golf correctly REFUSED to poach (lane discipline + the rule's "prefer own domain / never abandon specialty / never step on a live peer") and ended the loop (`loop-state.mjs end`).

## The gap -- THREE layers (all real, empirically verified 2026-06-18; root cause CORRECTED)

**Layer 2 is what actually bit golf (CORRECTED root cause): a full-roadmap pool does NOT exclude a unit a LIVE peer is informally working.** golf's pick of U-NN-TIER05 came back `source:"pick-unit"` (OWN-lane), NOT the fallback -- because `isCleanupQuery` (pick-unit.mjs:112, `slot === "golf"`) makes golf's OWN pool the FULL roadmap by design (golf is the fleet-shared/cleanup slot). So golf's own-lane pick = top devtools-priority unit of the WHOLE roadmap = U-NN-TIER05, which india was actively building. The `peerClaimedSet` filter (pick-unit.mjs:135-148) only excludes FORMALLY `slot-task-claim`ed units; the claim system is advisory/opt-in, so india's live-but-unclaimed unit was not excluded (`peer_claimed_filtered:0`). Combined with the bare `loop-state.mjs next` activating a `target=1e9` loop + `stop-force-loop-continue`, this spun golf toward an infinite loop on india's live unit. THE FIX THAT MATTERS FOR GOLF + any full-roadmap picker: a peer-LIVENESS filter (exclude units whose lane-owner slot is `alive` per chat-slots), not just claim-filter.

**Layer 1 (SEPARATE real bug, affects LANE-SCOPED slots' fallback -- did NOT cause golf's pick): the empty-slot "fleet fallback" silently serves ALPHA's lane.** `loop-state.mjs pickUnitTop` falls back via `pickUnitOnce("", chatId)` (empty slot) -> no `--slot` arg (loop-state.mjs:289) -> `pick-unit.mjs` DEFAULTS `--slot` to `"alpha"` (pick-unit.mjs:48). EMPIRICALLY VERIFIED: `pick-unit.mjs --chatId <id>` (no --slot) -> `summary.slot:"alpha", lane_size:660`. So a lane-scoped slot (alpha..foxtrot, non-golf) whose own lane is dry gets ALPHA's lane on "fallback", NOT the full roadmap. The loop-state.mjs:313-316 comment ("spans ALL lanes") + [[feedback_any_domain_fallback_slots]] ("ANY domain's next unit") are FALSE for this path. (golf bypasses this entirely -- its own lane already IS the full roadmap.)

**Layer 3 (STRUCTURAL staleness): pick-unit.mjs is still 7-slot-era.** `SLOT_TO_CHAT` (pick-unit.mjs:41) maps ONLY `alpha..golf` (7 slots, chat 1-7). For a 26-slot-fleet slot like `india`/`hotel`/`zulu`, `SLOT_TO_CHAT[slot]` is undefined -> `Number(slot)`=NaN -> `chat=NaN` -> `laneAssignments.find(l=>l.chat===NaN)` undefined -> "no lane assignment" exit 3 (unless isCleanupQuery/all-lanes bypasses the lane lookup). So pick-unit's lane scoping only works for the original 7 slots; the other 19 can't get an own-lane pick at all. This predates + compounds Layers 1-2 and must be reconciled in the same fix.

## Fix direction (next focused unit -- NOT built this session; HIGH blast radius)
HIGH blast radius: changes what ALL 26 slots pick on fallback -> needs real regression tests (own-lane unchanged + the fail-closed `slot && chatId` guard at loop-state.mjs:317 intact) + 2-arm scrutiny + a `/impact` blast-radius pass. NOT a tail-of-session patch.

1. **Layer-1 (primary): make the fallback genuinely all-lanes.** Per the any-domain rule the fallback is MEANT to span all lanes, but empty-slot silently -> alpha's lane. Route loop-state's fallback through pick-unit's real full-roadmap pool (the `slot=golf`/cleanup path, pick-unit.mjs:109-113) -- ideally via an EXPLICIT `--all-lanes` flag on pick-unit so the pool is never a silent `--slot` default. Reconcile the now-true behavior with the loop-state.mjs:313-316 comment + [[feedback_any_domain_fallback_slots]] wording.
2. **Layer-2: peer-liveness filter.** In pick-unit's filter (pick-unit.mjs:135-148, beside `peerClaimedSet`), also exclude units whose lane-owner slot is LIVE+active (cross-ref `chat-slots.json` status `alive` via `chat-slots.mjs status`), not just formally-claimed -- so an informally-active peer unit (india on U-NN-TIER05) is skipped. Map unit->lane->owning-slot via `laneAssignments` (the lane IS the owner).
3. **Layer-3: bare `loop-state.mjs next` must not silently start a `target=1e9` loop** from a discovery call -- add/require a peek/`--resolve-only` default for discovery, or a sane default target. (The `--resolve-only` flag already exists per loop-state.mjs:339 -- discovery callers should use it.)
Owner: fleet-coordination (golf) + the loop-state/pick-unit resolver owner.

## Lesson
"Peer-claim-filtered" != "peer-active-filtered". The any-domain never-idle fallback is safe ONLY if it also avoids units a LIVE specialist is actively (even if informally) working. Until the resolver is liveness-aware, a slot MUST manually verify the target is not a live peer's active unit before iterating -- exactly the check that saved this poach.

Sibling: [[feedback_slots_never_idle_always_hunt]] (the rule whose fallback this hardens) · [[feedback_any_domain_fallback_slots]] (the peer-claim-filter claim) · [[feedback_chat_lane_discipline]].
