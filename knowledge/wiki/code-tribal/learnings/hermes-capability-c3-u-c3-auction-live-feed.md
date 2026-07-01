# HERMES-CAPABILITY-C3/U-C3-AUCTION-LIVE-FEED — [MAIN-FORCE] [HERMES-CAPABILITY-C3]/U-C3-AUCTION-LIVE-FEED (slot:bravo): wire C3 FleetHealthVector as the LIVE queue_penalty source into the task auction -- close the last C3 spec clause ("feeds NOT built here")

**Commit:** `88037a127d26` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T23:00:22-05:00
**Tags:** hermes-capability-c3, u-c3-auction-live-feed, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-CAPABILITY-C3]/U-C3-AUCTION-LIVE-FEED (slot:bravo): wire C3 FleetHealthVector as the LIVE queue_penalty source into the task auction -- close the last C3 spec clause ("feeds NOT built here")

## Body
```
[MAIN-FORCE] [HERMES-CAPABILITY-C3]/U-C3-AUCTION-LIVE-FEED (slot:bravo): wire C3 FleetHealthVector as the LIVE queue_penalty source into the task auction -- close the last C3 spec clause ("feeds NOT built here")

C3's ZuluFleetHealthSynthesisEngine + its two dispatcher actions (zulu_fleet_health_snapshot /
_slot_readiness) were already shipped + tested (35 tests). But the engine docstring itself flagged
the last spec clause as unbuilt: "feeds (NOT built here) to ZuluTaskAuctionEngine's queue_penalty".
Both ends existed and were dispatcher-wired (zulu_task_auction is live), but NOTHING connected
them -- the auction's queue_penalty came from a caller-supplied static queue_depth, never live
fleet health. A "built but not wired together" seam (R15 WIRE gap).

This unit builds the bridge:
- ZuluFleetHealthSynthesisEngine.auctionQueueDepths(vector): pure slot -> live queue_depth map,
  clamped to the auction's int [0, MAX_QUEUE_DEPTH] contract (single-sourced -- MAX_QUEUE_DEPTH now
  exported from ZuluTaskAuctionEngine + used in both its BidderSchema and this clamp, so they can't
  drift). Negative/NaN -> 0, fractional -> rounded, throws on a bad vector (R12).
- sessionDispatcher action `zulu_auction_live`: synthesize the FleetHealthVector -> override each
  bidder's queue_depth from live health -> run the auction. DROPS crashed/dead slots (vector.fleet
  .deadSlots) from the bidder set by default so a task is never auctioned to a slot the fleet shows
  as down; drop_dead:false keeps them; all-dead -> an explicit no-winner result (not a throw).

Tests (57/57 across C3 + auction): +5 engine bridge (live map, clamp negative->0, round fractional,
clamp to the real MAX_QUEUE_DEPTH schema bound, throw on bad vector) + 3 dispatcher round-trip (live
queue_depth flips the winner from a saturated slot to an idle one + crashed slot dropped; all-crashed
-> no-winner; drop_dead:false keeps a crashed slot). tsc clean on all 4 changed files.

Slim seam (consistent with C1/C2): ok()->slimResponse drops null/empty -- a no-win winner_slot:null
comes back absent (same as the existing zulu_task_auction contract); consumers default absent -> null.
```

## Files touched (5)
- mcp-server/src/__tests__/ZuluFleetHealthSynthesisEngine.test.ts | 102 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/ZuluFleetHealthSynthesisEngine.ts        |  25 +++++++++++++++++++++++++
- mcp-server/src/engines/ZuluTaskAuctionEngine.ts                 |   5 ++++-
- mcp-server/src/tools/dispatchers/sessionDispatcher.ts           |  37 +++++++++++++++++++++++++++++++++++++
- 4 files changed, 168 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 88037a127d26`
- Milestone envelope: `mcp-server/data/milestones/HERMES-CAPABILITY-C3.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._