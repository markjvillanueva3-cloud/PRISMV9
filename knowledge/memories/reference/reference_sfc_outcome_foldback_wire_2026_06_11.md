---
name: reference_sfc_outcome_foldback_wire_2026_06_11
description: SFC self-learning fold-back loop closed -- SpeedFeedOutcomeFeedbackBridgeEngine (0 dispatchers) wired into calcDispatcher with 3 actions
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.186Z
aliases: reference_sfc_outcome_foldback_wire_2026_06_11
---


**OSCAR-SFC-SELFLEARN-WIRE / U-SFC-OUTCOME-FOLDBACK-WIRE (slot:bravo cross-galaxy build, 2026-06-11, main `e436c2fc3f`).** Operator directive: "accelerate self-learning, self-improving system for sfc domain." bravo `galaxy_access:all-galaxies`.

**The gap (R8 finished-but-unwired):** `SpeedFeedOutcomeFeedbackBridgeEngine` is the SFC AI-ladder ring buffer. `SpeedFeedNineAxisOrchestratorEngine` pushes PREDICTIONS into it via `capture()` (orchestrator line 679), but `recordActuals()` (shop-floor actuals -> calibration fold-back), `stats()`, and `recentForKey()` had **ZERO dispatcher surface** -> the calibration loop was OPEN (predictions in, actuals could never come back). The other 3 SFC learning engines (`SpeedFeedDeepLearningEngine`->calc, `SpeedFeedChatterStabilityAdapterEngine`->vibration, `LatheSpeedFeedDeepLearningAdvisorEngine`->cam) were already dispatcher-wired; this one was the orphan.

**DEDUP-verified distinct from the persistent loops (R8):** india's `U-SFC-LOOP-FEED` (canonical outcome bus -> LoRA, 2026-06-01) + romeo's `shop_outcome_ingest` (`U-WIRE-SHOP-OUTCOME-INGEST`, 2026-06-04) = the HEAVY persistent pipeline. THIS engine is the in-process AI-ladder ring buffer (its own comment: "the bus capture happens upstream; this bridge is the AI-ladder-facing ring buffer"). Complementary, not duplicate. Only other dispatcher `recordActuals` = `businessDispatcher` quoteAnalytics (different engine).

**The wire (calcDispatcher, cloned the `speedfeed_dl_stats` dynamic-import-in-case pattern):**
- `speedfeed_outcome_record_actuals` -> `recordActuals(key{machine_name,material_name,tool_diameter_mm}, actuals{actual_vc_mpm?,actual_fz_mm?,actual_tool_life_min?})`. Key-validated (R12) + guards content-free actuals (>=1 finite field, else the calibration training-set inflates with empty overrides).
- `speedfeed_outcome_stats` -> `stats()` + `actualsCount()`.
- `speedfeed_outcome_recent` -> `recentForKey(key, limit<=64)`.

**R12-safe:** exposes ring-buffer DATA + fold-back only, NEVER NN inference (SFC NNs untrained until LoRA training ships -- same invariant the sibling `speedfeed_*_stats` wires honor). **9/9 round-trip tests** through the real dispatcher (seeded via the engine's own `capture()`). 2-agent scrutiny PASS (both material P2s fixed pre-commit: empty-actuals guard + the `machine_name->default_3axis_vmc` capture-key/fold-key boundary test).

**FOR OSCAR (lane handoff):** `SpeedFeedOutcomeFeedbackBridgeEngine.tryBusCapture()` is an unconditional `return true` -> `stats().bus_capture_success_rate_pct` is hardwired 100% (pre-existing oscar code 2026-05-26; the new `stats` action now EXPOSES this constant -- worth a real bus-capture when convenient). Also fold the galaxy-brain note into `mcp-server/src/engines/speed-feed/MEMORY.md` on your next pass.

Related: [[reference_sfc_loop_feed_and_audit_blindspot_2026_06_01]] (india persistent loop), [[reference_wire_shop_outcome_ingest_2026_06_04]] (romeo ingest head).
