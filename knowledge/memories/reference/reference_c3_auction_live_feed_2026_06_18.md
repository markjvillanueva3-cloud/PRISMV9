---
name: reference_c3_auction_live_feed_2026_06_18
description: "C3 (Hermes Fleet Health Synthesis) finished this session (slot:bravo). The ZuluFleetHealthSynthesisEngine + its 2 dispatcher actions (zulu_fleet_health_snapshot/_slot_readiness) were ALREADY shipped + tested (35 tests, not an orphan). The remaining spec clause -- 'feed ZuluTaskAuctionEngine as the live queue_penalty source' -- was an UNBUILT integration seam: BOTH the engine and ZuluTaskAuctionEngine existed AND were dispatcher-wired (zulu_task_auction live), but NOTHING connected them; the auction's queue_penalty came from a caller-supplied static queue_depth, never live fleet health. U-C3-AUCTION-LIVE-FEED (88037a127d) built the bridge: ZuluFleetHealthSynthesisEngine.auctionQueueDepths(vector) (slot->live queue_depth, clamped to the auction's MAX_QUEUE_DEPTH contract) + sessionDispatcher action zulu_auction_live (override bidder queue_depth from live health + drop crashed slots by default). 57/57 tests; 3-of-3 PASS."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.491Z
aliases: reference_c3_auction_live_feed_2026_06_18
---


# C3 auction live-feed -- the "built but not wired TOGETHER" seam (2026-06-18, slot:bravo)

## What shipped
- **88037a127d U-C3-AUCTION-LIVE-FEED** -- the last C3 spec clause. `ZuluFleetHealthSynthesisEngine.auctionQueueDepths(vector): Record<slot, number>` (pure; maps each `PerSlotHealth.queueDepth` to the auction bidder `queue_depth`, clamped to `[0, MAX_QUEUE_DEPTH]` int; negative/NaN->0, fractional rounded, throws on a bad vector). `MAX_QUEUE_DEPTH` is now EXPORTED from `ZuluTaskAuctionEngine` and used in BOTH its `BidderSchema` and the C3 clamp (single source -- can't drift). New `sessionDispatcher` action `zulu_auction_live`: synthesize FleetHealthVector -> override each bidder's queue_depth from live health -> drop crashed/dead slots (`vector.fleet.deadSlots`, default; `drop_dead:false` keeps them; all-dead -> explicit no-winner, not a throw) -> run the auction.
- C3's engine + `zulu_fleet_health_snapshot`/`_slot_readiness` actions were ALREADY done (35 tests) -- this unit was purely the auction bridge.

## The lesson (distinct from the C2 orphan lesson)
**"Wired to a dispatcher" != "wired to the capability that should consume it."** C3 was NOT an orphan (the C2 sense: no producer) -- its engine had a producer AND consumers (its own dispatcher actions). The gap was an INTEGRATION SEAM: two fully-built, fully-dispatcher-wired capabilities (FleetHealthSynthesis + TaskAuction) that the spec said should feed each other, but with NO bridge between them. The auction silently ran on a caller-supplied static `queue_depth` while a live `FleetHealthVector.queueDepth` sat unused. The engine docstring even flagged it: "feeds (NOT built here)." R15's WIRE clause is "wire to every NATURAL CONSUMER" -- and a sibling capability the spec names as a consumer counts. When two built things are *supposed* to feed each other, grep for the actual bridge call; "both exist + both are dispatcher-wired" is not "they are connected." -> [[feedback_wire_test_validate_all_galaxies]]

## Design notes (for C5 + future consumers)
- **Drop-crashed-by-default** is the safe routing default (never auction a task to a slot the fleet shows down); `drop_dead:false` is the operator override. Liveness-EXCLUSION lives in the dispatcher bridge, NOT the auction (the auction stays liveness-agnostic; the `drop_dead:false` test proves the engine itself never drops).
- **Stale (not crashed) slots are NOT dropped** -- only `crashed`/`degraded` are in `deadSlots`. A stale slot still bids (with its live queue_depth). Intentional.
- C5 (Adaptive Back-Pressure) DEPENDS on C3 and can now consume the same `auctionQueueDepths` / FleetHealthVector live signal.
- Slim seam (fleet-wide, same as C1/C2): `ok()->slimResponse` drops null + empty arrays, so a no-win `winner_slot:null` returns ABSENT -- consumers default absent -> null (identical to the existing `zulu_task_auction` contract).

## State
C2 + C3 both FINISHED this session. Next Hermes capability: **C4 (Delegation Contract, `ZuluDelegationContractEngine` exists -- verify orphan/partial state first per the "existence != working" + "built-but-not-wired-together" lessons)**, then C5 (Adaptive Back-Pressure, depends on C3). Related: [[reference_c2_producer_and_lock_2026_06_18]] (the C2 orphan lesson), [[reference_c1_governor_gate_2026_06_17]].
