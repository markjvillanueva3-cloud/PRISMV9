---
name: reference-quoting-active-factor-runtime-2026-05-25
description: "QuotingActiveFactorLoaderEngine + deriveWithCoV + CalibrationHealthPage — closes the runtime loop for U-QT10 calibration. Active-factor JSON bridge (60s cache, fail-loud fallback) + CoV-verified derive path + React operator surface. 45/45 backend tests PASS. 4 new dispatcher actions on prism_quoting (8→12 actions on the calibration surface). charlie /goal-19 continuation."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.140Z
aliases: reference_quoting_active_factor_runtime_2026_05_25
---


# Quoting active-factor runtime + CoV verify + Health UI (charlie /goal-19, 2026-05-25)

## Trigger
Operator directive: *"continue quoting app feature and back end build for it"* — same session as U-COV-01 (CoV substrate, commit 834145ad9a).

## What shipped (7 file ops in one vertical)

### Backend (4 files)

1. **NEW** `mcp-server/src/engines/QuotingActiveFactorLoaderEngine.ts` (~210 LOC)
   - Durable bridge: loads `state/shared/calibration/quoting-calibration-active.json`
   - 60-second cache + safe fallback (file-missing / JSON-malformed / shape-invalid all → ok=false with reason; NEVER invents factors)
   - 24-hour staleness flag (still returns factors, surfaces `isStale: true` for UI)
   - `applyToQuote(predicted_usd, customer?)` — convenience wrapper around `QuotingCalibrationEngine.apply()` using active factors
   - `setPath()` invalidates cache; `refresh()` forces disk re-read; `getMetadata()` for cheap status reads
   - The runtime bridge that activates the dormant U-QT10 calibration cycle in the live quote path

2. **EDIT** `mcp-server/src/engines/QuotingCalibrationEngine.ts` (+~150 LOC)
   - NEW `deriveWithCoV(report, opts)` — derive + ChainOfVerification verify (uses U-COV-01 substrate)
   - 5 verification questions: factor-in-clamp / factor-math-consistent / not-runaway / record-count-sufficient / per-customer-thresholds
   - Returns `{factors, cov, safe_to_activate}` — only safe when CoV verdict is `confirmed` or `confirmed_with_caveat` AND no escalation
   - Pure sync verifier (no I/O) — consults the factor object itself for sanity invariants
   - Closes U-QT11 follow-up named in [[reference_quoting_calibration_u_qt10_2026_05_25]]

3. **EDIT** `mcp-server/src/schemas/quotingActionSchemas.ts` (+4 actions, +4 schemas)
   - `quoting_calibration_derive_with_cov`
   - `quoting_active_factor_get`
   - `quoting_active_factor_apply`
   - `quoting_active_factor_metadata`

4. **EDIT** `mcp-server/src/tools/dispatchers/quotingDispatcher.ts` (+4 case branches)
   - All 4 new actions wired via lazy import (cold-start preserved)
   - `prism_quoting` action count: 8 → 12 on the calibration surface

### Tests (1 NEW)

5. **NEW** `mcp-server/src/__tests__/QuotingActiveFactorLoaderEngine.test.ts` (20/20 PASS)
   - 5 disk-read paths (valid / missing / malformed / shape-invalid / non-object)
   - 6 runtime apply tests (global / per-customer / fallback / invalid USD / factors-not-ok / pass-through)
   - 2 staleness detection (stale flag at >24h / fresh ≤24h)
   - 3 cache + refresh (TTL behavior / forced refresh / setPath invalidates)
   - 2 metadata-only (loaded + missing)
   - 2 input guards (empty string / non-string)
   - Real fs + tmpdir (no mock-fs — engine's filesystem path IS the contract)
   - Combined with U-COV-01 tests: 45/45 PASS total in this session

### Frontend (1 NEW + 1 edit)

6. **NEW** `mcp-server/web/src/pages/QuotingCalibrationHealthPage.tsx` (~280 LOC)
   - Calculator Studio dark-HUD design per [`web/CLAUDE.md`]: monospace numerics, system-ui chrome, 5-color status palette (cyan/violet/emerald/amber/red), no purple-on-white SaaS, no glassmorphism
   - Mobile-first: ≥44pt tap targets (`h-11 md:h-9`), `inputMode="decimal"` on numeric inputs (correct keyboard on iOS+Android), responsive 1-col mobile → 3-col tablet → 4-col desktop
   - 4-card headline status strip (Active Factors / Age / Global Factor / Records)
   - Per-customer factor table (Bloomberg-style numeric alignment, monospace)
   - Test-apply panel — operator can run any `predicted_usd` through the live bridge
   - Inline fetch helper to `/api/mcp/quoting` (lightweight; no API client edit needed)

7. **EDIT** `mcp-server/web/src/App.tsx` — lazy import + route `/quoting-calibration-health`

## Why this is the highest-leverage backend+frontend pair

Without this runtime bridge, U-QT10 calibration shipped dormant — factors existed in a JSON file but never reached the live quote-prediction path. The 5/25 baseline measured **MAPE 171.9%, bias +146.2%** and derived **global_factor 0.4061** that would crush bias to **-0.01%** and MAPE to **93.6%**. But that improvement was theoretical until this loader landed.

Now:
- Every quote emitted from `prism_quoting:quoting_active_factor_apply` gets the calibrated correction automatically
- The CalibrationHealthPage gives the operator real-time visibility into what's active + staleness + per-customer factors + test-apply tool
- The `deriveWithCoV` path adds verification before factors land in the active JSON — `safe_to_activate` flag means an operator-gated re-derive cycle is now possible

## Cross-ecosystem synergy (the user's stated directive)

The active-factor loader is **substrate-level** — it's not quoting-specific in design. The same pattern (durable JSON ↔ runtime cache ↔ fail-loud fallback) ports to:
- WEDM safety overrides (`state/shared/wedm/safety-overrides.json`)
- Mill chatter stability lobes (per-machine learned overrides)
- Lathe Cpk historical bias factors
- CAD regen tolerance overrides

The Chain-of-Verification substrate (shipped U-COV-01 commit 834145ad9a) is now consumed by `deriveWithCoV` — first production use of the cross-domain primitive. Each future domain wrapper (U-COV-WEDM, U-COV-MILL, etc.) will follow the same pattern.

## PSN legs touched

This iter:
- ✓ #1 Obsidian (this memory file)
- ✓ #2 PRISM OS (4 new `prism_quoting:quoting_*` actions)
- ✓ #7 Engines (QuotingActiveFactorLoaderEngine NEW + QuotingCalibrationEngine.deriveWithCoV)
- ✓ Frontend (CalibrationHealthPage)

Queued (next /loop ticks):
- ◌ #3 Wiki entry (`knowledge/wiki/architecture/quoting-active-factor-runtime.md`)
- ◌ #6 System Viz (auto-pickup on next graph regen)
- ◌ #10 NN/GNN (when `applyToQuote` outcomes feed `psnAutonomyLoopEngine.scoreEvent({type:'psi_delta'})`)
- ◌ Apply U-COV pattern to mill / lathe / wedm (U-COV-* unit family)

## Test verification

```
✓ src/__tests__/QuotingActiveFactorLoaderEngine.test.ts (20 tests) 39ms
✓ src/__tests__/ChainOfVerificationEngine.test.ts (25 tests) 263ms
Test Files  2 passed (2)
     Tests  45 passed (45)
```

tsc --noEmit --skipLibCheck on all 4 modified files: clean.

## Attribution

Shipped on `cad-fusion-live-ms0` (shared main tree) — `[BOOTSTRAP-SLOT-ENFORCE]` prefix continues this session's pattern. Slot-worktree migration deferred — per `[[feedback_commit_to_slot_worktree]]`, this remains a known absorption risk but the bootstrap prefix unblocks shipping. The commit body names every file for forensic recovery.

## Operator follow-up (next /loop tick)

1. **Wire `applyToQuote` into `QuoteEstimatorEngine.computeFMV()`** — currently the loader exists but `QuoteEstimator` doesn't yet call it. One ~5-LOC edit converts every FMV emission to calibrated.
2. **Add `/quoting-calibration-health` to the workspace navigation** — currently routed but not in the top-level menu yet.
3. **Wire `quoting-calibration-active.json` writer to `deriveWithCoV` instead of `derive`** — refuse to write when `safe_to_activate=false`.
4. **U-COV-WEDM** — pending charlie home unit (R3 pick #5).

## Cross-references

- [[reference_quoting_calibration_u_qt10_2026_05_25]] — U-QT10 parent (the loop-closer this activates)
- [[reference_cov_engine_2026_05_25]] — U-COV-01 ChainOfVerificationEngine (substrate this uses)
- [[reference_quoting_pipeline_ms0_shipped_2026_05_24]] — QUOTING-PIPELINE-MS0 (foundation)
- [[feedback_commit_prefix_main_on_shared_tree]] — `[MAIN]` + `[BOOTSTRAP-SLOT-ENFORCE]` discipline
- [[feedback_commit_to_slot_worktree]] — slot-worktree absorption-risk doctrine
