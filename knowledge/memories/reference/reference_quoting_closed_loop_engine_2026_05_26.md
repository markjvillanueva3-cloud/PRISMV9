---
name: reference-quoting-closed-loop-engine-2026-05-26
description: "QuotingClosedLoopEngine — autonomous OODA loop for quoting accuracy (charlie iter46, commit b1914ea4cb on slot/charlie)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.140Z
aliases: reference_quoting_closed_loop_engine_2026_05_26
---


QUOTING-SYNERGY-MS0/U-QP-CLOSED-LOOP-CORE — closed-loop self-improving / self-learning controller for the quoting system, shipped slot:charlie iter46 2026-05-26 as commit `b1914ea4cb` on `slot/charlie` (worktree `H:/prism-slot-charlie`).

**What it is:** `QuotingClosedLoopEngine.runCycle(deps, options)` composes the 5 existing quoting substrate engines (QuotingTrainingLoopEngine, QuotingCalibrationEngine, QuotingActiveFactorLoaderEngine, QuoteOutcomeFeedEngine, QuoteOutcomePSIDeltaBridgeEngine) into ONE 7-stage cycle: observe → measure → drift_evaluated → retrained → validated → promoted/rolled_back → telemetered. Five verdicts (PROMOTED · NO_DRIFT_NO_OP · ROLLED_BACK · INSUFFICIENT_DATA · STAGE_FAILED). Rollback is the default on any validation failure — the active-factor JSON is never overwritten without a held-out improvement (≥1% MAPE win + no regression > 0.5%).

**DI pattern:** matches `PipelineRegistryBridge` — `ClosedLoopDeps` interface with `fetchOutcomes`, `runAccuracy`, `deriveWithCoV`, `validateOnHoldout`, `writeActiveFactors`, optional `feedPSIDelta`. Tests inject `vi.fn()` mocks; production wires concrete engines.

**Defaults (`QuotingClosedLoopEngine.DEFAULTS`, frozen):**
- `minSampleSize: 20` (insufficient-data gate)
- `holdoutFraction: 0.2` (validation split — tail records most recent)
- `driftMapeThresholdPct: 18`
- `driftBiasThresholdPct: 8`
- `promotionMinImprovementPct: 1`
- `promotionRegressionTolerancePct: 0.5`

**Stage-by-stage failure model:** each stage wrapped in `stage<T>(name, fn)` helper that returns `{ok, data, reason, duration_ms}` — never throws. Cycle records every attempted stage even on failure. Cold-start (no current report) → promote on any sane candidate.

**Audit trail:** `cycleLogPath` option writes JSONL line per cycle to disk via `appendCycleLog()`. Fail-soft (warn-and-continue on disk failure — `log.warn` from `utils/Logger.js`).

**Telemetry:** if `feedPSIDelta` is provided, the cycle calls it with `accuracy_before.mape_pct − accuracy_after.mape_pct` (positive = improvement, fed back to PSN autonomy substrate).

**Files:**
- `mcp-server/src/engines/QuotingClosedLoopEngine.ts` (420L)
- `mcp-server/src/__tests__/QuotingClosedLoopEngine.test.ts` (517L, 30 tests, 82ms — vitest)

**Test discipline lessons captured:**
- Test legitimacy gate flags `.not.toThrow()`, `toBeDefined()`, `toBeUndefined()` as presence-only stubs. Replace with concrete equality checks (e.g. for absent fields, assert stage-order `.toEqual([...])` so the stage in question doesn't appear).
- All thresholds extracted to named constants at top of test file (eliminates magic-number warnings + reads as contract spec rather than regression-on-internals).
- Real disk round-trip for the JSONL log test (mkdir tmpdir, append twice, parse two lines, rm). Fail-soft test uses an illegal Windows path (CON device + glob chars) and asserts NO file was created — that's the observable behavior of the warn-and-continue path.

**Continues the charlie iter chain:**
- iter44 [[reference_quoting_material_bridge_2026_05_26]] — material registry wired into quoting
- iter45 — `detectMaterialFromPath()` + letter-boundary lookarounds (`\b` ≠ what you think for `aluminum_6061`)
- iter46 — closes the OODA loop around accuracy → calibration → activation

See also: [[feedback_commit_to_slot_worktree]] (committed on `slot/charlie`, NOT shared `H:/prism`).
