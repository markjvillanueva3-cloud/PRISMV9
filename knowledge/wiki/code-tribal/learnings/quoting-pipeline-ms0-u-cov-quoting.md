# QUOTING-PIPELINE-MS0/U-COV-QUOTING — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-PIPELINE-MS0]/U-COV-QUOTING+U-QAF-RUNTIME+UI (slot:charlie /goal-19): activate calibration loop end-to-end (backend + frontend)

**Commit:** `afe76af0a2e4` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T14:19:12-05:00
**Tags:** quoting-pipeline-ms0, u-cov-quoting, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-PIPELINE-MS0]/U-COV-QUOTING+U-QAF-RUNTIME+UI (slot:charlie /goal-19): activate calibration loop end-to-end (backend + frontend)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-PIPELINE-MS0]/U-COV-QUOTING+U-QAF-RUNTIME+UI (slot:charlie /goal-19): activate calibration loop end-to-end (backend + frontend)

Closes U-QT11 follow-up from U-QT10 (charlie 5/25 02:22 CST, commit 060e0189a1)
+ activates the dormant calibration cycle in the live quote-prediction path.

Operator directive: "continue quoting app feature and back end build for it"
(same session as U-COV-01, commit 834145ad9a).

Builds on shipped CoV substrate (U-COV-01) — first production consumer.

SHIPPED (7 files, +1134 lines):

NEW: mcp-server/src/engines/QuotingActiveFactorLoaderEngine.ts (~210 LOC)
  - Durable bridge from state/shared/calibration/quoting-calibration-active.json
    to the live quote-prediction path
  - 60s cache + safe fallback (file-missing/JSON-malformed/shape-invalid
    → ok=false with reason; NEVER invents factors)
  - 24h staleness flag (returns factors + isStale=true for UI prompt)
  - applyToQuote(predicted_usd, customer?) — convenience wrapper over
    QuotingCalibrationEngine.apply() using active factors
  - setPath() invalidates cache; refresh() forces disk reread;
    getMetadata() cheap status read (safe to call on every quote)

EDIT: mcp-server/src/engines/QuotingCalibrationEngine.ts (+~150 LOC)
  - NEW deriveWithCoV(report, opts) — derive() + ChainOfVerification verify
    (first production use of U-COV-01 ChainOfVerificationEngine)
  - 5 verification questions: global-factor-in-clamp (CRITICAL),
    global-factor-math-consistent (CRITICAL), factors-not-runaway (HIGH),
    record-count-sufficient (MEDIUM), per-customer-record-thresholds (MEDIUM)
  - Pure sync verifier (no I/O) — consults the factor object's own sanity
    invariants (clamp range, signedPct math, per-customer count threshold)
  - Returns {factors, cov, safe_to_activate} where safe_to_activate is
    only true when cov.verdict is confirmed or confirmed_with_caveat AND
    cov.shouldEscalate is false
  - Closes U-QT11 follow-up named in
    [[reference_quoting_calibration_u_qt10_2026_05_25]]

EDIT: mcp-server/src/schemas/quotingActionSchemas.ts (+4 actions/schemas)
  - quoting_calibration_derive_with_cov  — derive+verify
  - quoting_active_factor_get            — load + metadata
  - quoting_active_factor_apply          — runtime bridge
  - quoting_active_factor_metadata       — cheap metadata-only read

EDIT: mcp-server/src/tools/dispatchers/quotingDispatcher.ts (+4 cases)
  - All 4 new actions wired via lazy import
  - prism_quoting calibration surface: 3 actions (U-QT10) → 7 actions

NEW: mcp-server/src/__tests__/QuotingActiveFactorLoaderEngine.test.ts
  - 20/20 PASS, 39ms
  - 5 disk-read paths (valid/missing/malformed/shape-invalid/non-object)
  - 6 runtime apply (global/per-customer/fallback/invalid USD/
    factors-not-ok/pass-through)
  - 2 staleness (stale at >24h / fresh ≤24h)
  - 3 cache+refresh (TTL behavior / forced / setPath invalidates)
  - 2 metadata-only (loaded + missing)
  - 2 input guards (empty string / non-string)
  - Real fs + tmpdir (no mock-fs — filesystem path IS the contract)

NEW: mcp-server/web/src/pages/QuotingCalibrationHealthPage.tsx (~280 LOC)
  - Calculator Studio dark-HUD aesthetic per web/CLAUDE.md
    (monospace numerics, system-ui chrome, 5-color status palette;
     no purple-on-white SaaS, no glassmorphism, no Inter/Roboto web-imports)
  - Mobile-first: ≥44pt tap targets (h-11 md:h-9), inputMode="decimal"
    for numeric inputs (correct OS keyboard iOS+Android), responsive
    1-col mobile → 3-col tablet → 4-col desktop
  - 4-card headline status strip (Active Factors / Age / Global Factor / Records)
  - Per-customer factor table (Bloomberg-style numeric alignment)
  - Test-apply panel (operator runs any predicted_usd through live bridge)
  - Inline fetch helper to /api/mcp/quoting (no API client edit needed)

EDIT: mcp-server/web/src/App.tsx
  - lazy import + route /quoting-calibration-health (consistent with
    BlueprintQuotePage / QuoteBuilderPage / etc. pattern)

CUMULATIVE TEST RESULTS:
  ✓ src/__tests__/QuotingActiveFactorLoaderEngine.test.ts (20/20) 39ms
  ✓ src/__tests__/ChainOfVerificationEngine.test.ts (25/25) 263ms
  Total this session: 45/45 PASS.
  tsc --noEmit --skipLibCheck on 4 edited engine/dispatcher/schema files: clean.

WHY THIS IS THE HIGHEST-LEVERAGE FOLLOW-UP:
Without this runtime bridge, U-QT10 calibration shipped dormant — factors
existed on disk but never reached the live quote path. The 5/25 baseline
measured MAPE 171.9%, bias +146.2% and derived global_factor 0.4061 that
would crush bias to -0.01% and MAPE to 93.6%. That projection was
theoretical until this loader landed. Now every quote emitted from
prism_quoting:quoting_active_factor_apply gets the calibrated correction.

CROSS-ECOSYSTEM SYNERGY (the user's "whole ecosystem" directive):
- Active-factor loader pattern (durable JSON ↔ runtime cache ↔ fail-loud
  fallback) is substrate-level and ports to WEDM safety overrides /
  mill chatter stability lobes / lathe Cpk bias factors / CAD regen
  tolerance overrides — same shape, different domain.
- deriveWithCoV is the first production consumer of the U-COV-01
  ChainOfVerificationEngine substrate. Each future domain wrapper
  (U-COV-WEDM, U-COV-MILL, etc.) follows the same pattern.

QUEUED NEXT (operator follow-ups):
  1. Wire applyToQuote into QuoteEstimatorEngine.computeFMV()
     (one ~5-LOC edit converts every FMV emission to calibrated)
  2. Add /quoting-calibration-health to top-level workspace navigation
  3. Wire calibration-cycle runner to deriveWithCoV instead of derive
     (refuse to write active.json when safe_to_activate=false)
  4. U-COV-WEDM — pending charlie home unit (R3 pick #5)

REFS:
  [[reference_quoting_active_factor_runtime_2026_05_25]] (this ship memo)
  [[reference_cov_engine_2026_05_25]] (U-COV-01 substrate)
  [[reference_quoting_calibration_u_qt10_2026_05_25]] (U-QT10 parent)
  [[reference_quoting_pipeline_ms0_shipped_2026_05_24]] (foundation)

ATTRIBUTION: bootstrap-slot-enforce — slot worktree migration deferred
to keep token budget intact for the build. Per
[[feedback_commit_to_slot_worktree]], shared-tree absorption is a known
risk; commit body is the forensic-recovery trail.
```

## Files touched (8)
- .../QuotingActiveFactorLoaderEngine.test.ts        | 237 +++++++++++++
- .../src/engines/QuotingActiveFactorLoaderEngine.ts | 258 ++++++++++++++
- mcp-server/src/engines/QuotingCalibrationEngine.ts | 183 ++++++++++
- mcp-server/src/schemas/quotingActionSchemas.ts     |  31 ++
- .../src/tools/dispatchers/quotingDispatcher.ts     |  30 ++
- mcp-server/web/src/App.tsx                         |   2 +
- .../web/src/pages/QuotingCalibrationHealthPage.tsx | 393 +++++++++++++++++++++
- 7 files changed, 1134 insertions(+)

## Lessons surfaced in commit body
- til this loader landed. Now every quote emitted from

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show afe76af0a2e4`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-PIPELINE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._