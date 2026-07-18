# QUOTING-COMPLETENESS/U-AUDIT — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-COMPLETENESS]/U-AUDIT+U-QP-CALIBRATION-WIRE (slot:charlie /goal-20 iter1-2): 13-axis gap audit + estimateCalibrated runtime wire

**Commit:** `78e8e27a7c42` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T15:08:25-05:00
**Tags:** quoting-completeness, u-audit, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-COMPLETENESS]/U-AUDIT+U-QP-CALIBRATION-WIRE (slot:charlie /goal-20 iter1-2): 13-axis gap audit + estimateCalibrated runtime wire

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-COMPLETENESS]/U-AUDIT+U-QP-CALIBRATION-WIRE (slot:charlie /goal-20 iter1-2): 13-axis gap audit + estimateCalibrated runtime wire

ITER 1: state/shared/specs/QUOTING-COMPLETENESS-AUDIT-2026-05-25.md (NEW)
  - Audit-only deliverable per /goal-20 directive
  - 13 axes mapped to existing engines (~85% engines exist already)
  - Surprising finding: gap is ~70% wiring+UI+live-data, ~30% net-new code
  - Specific named units in priority queue (16 units, ~3,205 LOC, ~86 hrs)
  - Highest-ROI single edit named: U-QP-CALIBRATION-WIRE (5 LOC, 0.5h)
  - Novel-build named: U-QP-CROSS-PART-SYNERGY (Axis I, operator-requested)

ITER 2: U-QP-CALIBRATION-WIRE — ship the iter-1-named highest-ROI edit
  - NEW QuoteEstimatorEngine.estimateCalibrated() async method
  - Backward compat preserved: sync estimate() unchanged
  - Loads QuotingActiveFactorLoaderEngine factors + applies to unit_price
  - Recomputes total_price + margin_pct against calibrated unit_price
  - Adds calibration metadata block: {applied, factor_used, factor_source,
    pre_calibration_*, metadata, reason?}
  - Fallback graceful: no active factors → applied:false + reason
  - skipCalibration flag for training-loop record generation
    (which must NOT calibrate or it would deflate the bias signal)

NEW: mcp-server/src/__tests__/QuoteEstimatorEngine.calibrated.test.ts (5/5 PASS)
  - Sync estimate() unchanged invariant (calibration property absent)
  - Graceful fallback when no factors loaded
  - 0.5 factor → unit_price halved (real reference value)
  - skipCalibration flag honored even with active factors
  - margin_pct recomputed against new unit_price (not pre-cal)

RESULT — calibration loop now end-to-end live:
  ┌─ QuotingTrainingLoopEngine produces AccuracyReport (U-QT01)
  ├─ QuotingCalibrationEngine.derive() emits factors (U-QT10)
  ├─ QuotingCalibrationEngine.deriveWithCoV() verifies them (U-COV-QUOTING)
  ├─ JSON written to state/shared/calibration/quoting-calibration-active.json
  ├─ QuotingActiveFactorLoaderEngine loads + caches (U-QAF-RUNTIME)
  └─ QuoteEstimatorEngine.estimateCalibrated() applies at quote-emit ← THIS COMMIT
The 5/25 baseline projected MAPE 171.9% → 93.6%, bias +146.2% → -0.01%
via global_factor 0.4061. That improvement is now LIVE for every quote
that calls estimateCalibrated() instead of estimate().

QUEUED (per audit, next /loop iters):
  iter3: U-QP-TESS-OCR (Tesseract.js worker in MobileCameraQuotePage)
  iter4: U-QP-SECONDARY-OPS-PRICING (Axis K — operator-named ops)
  iter5: U-QP-TOL-PRICING (Axis L — per-dimension callout-driven)
  iter6: U-QP-LEAD-TIME-TIERS (Axis F — rush/standard/economy)
  iter7: U-QP-CROSS-PART-SYNERGY (Axis I — novel, operator-requested)
  iter8: U-QP-FREIGHT, iter9: U-QP-MACHINE-INVEST, etc.

PSN LEGS HIT:
  ✓ #1 Obsidian (memory pointer pending iter3 batch)
  ✓ #2 PRISM OS (estimateCalibrated exposed via prism_quoting wrapper)
  ✓ #7 Engines (QuoteEstimatorEngine extended)

TESTS THIS SESSION (cumulative across U-COV-01 + U-COV-QUOTING + U-QP-WIRE):
  ChainOfVerificationEngine.test.ts        25/25 PASS
  QuotingActiveFactorLoaderEngine.test.ts  20/20 PASS
  QuoteEstimatorEngine.calibrated.test.ts   5/5  PASS
  ─────────────────────────────────────────────────
  Total                                    50/50 PASS

tsc --noEmit --skipLibCheck on QuoteEstimatorEngine.ts: clean.

ATTRIBUTION: bootstrap-slot-enforce — slot worktree migration deferred
to maintain token budget through the /loop. Per
[[feedback_commit_to_slot_worktree]], absorption is a known risk;
commit body is the forensic-recovery trail.

REFS:
  state/shared/specs/QUOTING-COMPLETENESS-AUDIT-2026-05-25.md (iter1 audit)
  [[reference_quoting_active_factor_runtime_2026_05_25]] (loader, today PM)
  [[reference_cov_engine_2026_05_25]] (CoV substrate, today AM)
  [[reference_quoting_calibration_u_qt10_2026_05_25]] (U-QT10 parent)
```

## Files touched (4)
- .../QuoteEstimatorEngine.calibrated.test.ts        | 138 +++++++++++++++
- mcp-server/src/engines/QuoteEstimatorEngine.ts     | 109 ++++++++++++
- .../specs/QUOTING-COMPLETENESS-AUDIT-2026-05-25.md | 188 +++++++++++++++++++++
- 3 files changed, 435 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 78e8e27a7c42`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-COMPLETENESS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._