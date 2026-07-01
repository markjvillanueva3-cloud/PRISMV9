---
name: reference_close_loop_bridge_p0u04_2026_06_02
description: "P0-U04 CLOSED-LOOP BRIDGE shipped (slot india, 2026-06-02, commit d0a0978c6c). PRISM's learning loop was OPEN: the 12 domain galaxies feed OutcomeCaptureBusEngine (domain-keyed JSONL, no pub/sub) but the ENTIRE learning stack (neural auto-train, drift/calibration/replay/episodic) only subscribes to feedbackBus events from CrossProcessOutcomeStore — two disjoint islands. OutcomeCaptureBusToFeedbackBridgeEngine + addRecordListener hook forward captures → feedbackBus outcome.recorded; armed as the 6th XProcNeuralAutoFire bridge. 55 tests incl E2E loop-closure. Formal scrutiny deferred to agent-limit reset."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.519Z
aliases: reference_close_loop_bridge_p0u04_2026_06_02
---


**Shipped (slot india, 2026-06-02, FLEET-AI-SYSTEMS/U-CLOSE-LOOP-BRIDGE, commit `d0a0978c6c`):** built the documented-but-never-built **P0-U04 bridge** that closes PRISM's learning loop for all 12 domain galaxies at once.

**THE GAP (workflow-verified, 4/4 agreement + 2 self-incriminating code headers):** PRISM had TWO DISJOINT outcome islands —
- **Island A (producers, no learner):** the 12 domains + P2P PrintToProgram engines emit via `recordRecommendationEmitted`/`emitP2POutcome` → `outcomeCaptureBusEngine` → `state/outcomes/<domain>.jsonl`. Domain-keyed, NO pub/sub. Nothing read it.
- **Island B (learner attached):** `CrossProcessOutcomeStore.record()` publishes `outcome.recorded`/`outcome.completed` to `feedbackBusEngine`, where the ENTIRE learning stack subscribes (CrossProcessNeuralLearningEngine auto-train @ ~line 1446, + drift/calibration/replay/episodic bridges, armed by XProcNeuralAutoFireEngine).

The bridge between them was deferred: `p2pOutcomeEmission.ts` ("P0-U04 — next unit, NOT this one… future-facing") + `OutcomeRecord.jobId` ("Backfilled from OutcomeCaptureBus context.job_id WHEN THE P0-U04 BRIDGE LANDS"). So the high-volume domain/shop-floor signal accumulated UNREAD — the learner trained only on explicit MCP calls + tests.

**THE BUILD (one engine closes it for all 12 — higher leverage than 13 per-domain wires):**
- `OutcomeCaptureBusEngine.addRecordListener(fn)` — generic post-append hook (pure, default no-op, isolated try/catch so a listener can never break a producer; keeps the bus feedbackBus-free).
- `OutcomeCaptureBusToFeedbackBridgeEngine` — registers a listener, maps capture `OutcomeEvent`→`OutcomeRecord`, publishes `{record}` to the EXISTING feedbackBus `outcome.recorded` topic the learner already consumes (no new topic, no enum-widening, no consumer changes — the learner's `recordToLabel` reads ONLY `outcome.kind`). Kind map: terminal success(`first_article_pass`/`quote_accepted`/`collision_avoided`)/failure(`tool_break`/`scrap_event`/`first_article_fail`/`quote_rejected`/`chatter_event`)/override → train; predictions + raw measurements → `pending` (skipped — NO fabricated labels, R12). `lineage_id→jobId` + true domain→`response_summary.primary_output` preserved through the lossy CLOSED `process`[mill/lathe/wedm]/`bridge`[sf/post/feature/ai/router] enum projection (learner ignores process/bridge). No cycle (publishes only into feedbackBus). Idempotent + `publish_failures` counter.
- Wired into `XProcNeuralAutoFireEngine` as the 6th fan-out bridge (`capture_outcome_bridge`), armed LAST so the learner + 5 consumer bridges subscribe before it forwards. Full uniform contract: subscribe/unsubscribe/isSubscribed/reset + status() liveActive + ALL_COMPONENTS.

**Verify:** 55 tests (15 new bridge incl. **end-to-end loop-closure proof** — a terminal outcome emitted via the capture bus trains the REAL CrossProcessNeuralLearningEngine, asserted via `neural.train.tick`; + autofire regression updated 6→7 components everywhere; + synergy). My 3 files tsc-clean (the 1278 tsc errors are the pre-existing untouched backlog, e.g. CrossProcessOutcomeStore 261/424).

**KEY LESSONS:** (1) **V8 max-string ~512MB blocks naive JSON.parse of the 548MB system-graph** — use streaming readers; a dashboard-only consumer sidesteps it. (2) **A "feed" is not a "loop"** — 12/12 producers feeding OutcomeCaptureBus looked closed but the learner was on a DIFFERENT bus; always trace producer→consumer connectivity, not just "does it emit." (3) **recordToLabel reads only outcome.kind** → forward everything, let the consumer self-filter (predictions→pending→skip); don't pre-judge or fabricate labels. (4) **lossy enum projection is OK if provenance is preserved elsewhere** (true domain in primary_output).

**Deferred (R12-honest):** per-file 2-reviewer gate + 3-of-3 could not run (subagent session limit, resets 3pm America/Chicago); formal scrutiny against `d0a0978c6c` scheduled for the reset; P0/P1 → follow-up commit. **Next (per-domain consume fan-out):** speed_feed=1/12 closes (in-memory), lathe/wedm/cam=3 PARTIAL (read-back built-not-applied — highest ROI), mill static, 7 no path. Sibling: [[reference_fleet_master_brain_12of12_complete_2026_06_01]] · [[reference_fleet_systemviz_roost_synergy_demo_2026_06_02]].
