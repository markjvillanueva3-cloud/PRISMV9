# BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U4 — [MAIN] [BLUEPRINT-OCR-TRAINING-MS1]/U-MS1-U4: GroundTruthValidationEngine extraction-confidence cross-validation

**Commit:** `8bdf10d5a246` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T21:32:58-05:00
**Tags:** blueprint-ocr-training-ms1, u-ms1-u4, auto-distilled

## Subject
[MAIN] [BLUEPRINT-OCR-TRAINING-MS1]/U-MS1-U4: GroundTruthValidationEngine extraction-confidence cross-validation

## Body
```
[MAIN] [BLUEPRINT-OCR-TRAINING-MS1]/U-MS1-U4: GroundTruthValidationEngine extraction-confidence cross-validation

EXTEND mcp-server/src/engines/GroundTruthValidationEngine.ts (+340 LOC additive):
- 3 new methods on existing class:
  - validateExtractionBackend({backendId, trainingPairSetId, pairs, backend, conformalAlpha?}) -> {accuracy, conformalCoverage, conformalAlpha, perDimTypeBreakdown, disagreementRegions, totalPairs, totalCorrect}
  - compareBackends({backends[{backendId, backend}], trainingPairSetId, pairs, regressionThresholdPct?}) -> {rank, regressionFlags, results, leaderId}
  - regressionGate({current, baselineSnapshotId, perDimTolerancePct?}) -> {passed, reason, regressions[]}
- 2 baseline helpers: snapshotBaseline / getBaseline / clearBaselines
- 3 pure helpers exported: pickGroundTruthScalar (trust-ordered: operator_correction > erp_actual > macro_vc_var > ocr_inferred), extractionMatches (case-insensitive string match OR numeric-format-tolerant within 1e-6 rel), computeConformalCoverage (per-dim-type nonconformity quantile)
- 5 type exports: ExtractionTrainingPair, ExtractionBackendOutput, BackendValidationResult, BackendComparisonResult, RegressionGateResult
- Clamped knobs: conformalAlpha ∈ [0.01, 0.5] default 0.1; regressionThresholdPct ∈ [0, 100] default 2.0

WIRED 4 new actions in cadDispatcher.ts (additive):
- gt_validate_backend (MCP path requires precomputedExtractions[] one per pair — backends can't cross MCP boundary as functions; programmatic callers use full signature)
- gt_compare_backends (direct-comparison mode — caller passes pre-computed BackendValidationResult[])
- gt_snapshot_baseline (in-memory baseline storage)
- gt_regression_gate (compares current vs baseline by snapshotId)

TESTS mcp-server/src/__tests__/groundTruthValidationEngine.test.ts (vitest, 58/58 PASS):
+31 new cases on top of existing 27:
  5 pickGroundTruthScalar (trust ordering + null fallbacks)
  8 extractionMatches (exact, case-insensitive, numeric-tolerant, zero-handling, empty/non-string rejection)
  3 computeConformalCoverage (empty, 100% coverage, partial coverage)
  7 validateExtractionBackend (100% accuracy + 0% accuracy disagreement-region recording + per-dim-type breakdown + unlabeled-pair skip + conformal coverage shape + empty backendId rejection + conformalAlpha clamping)
  8 compareBackends + regressionGate (ranking, regression flags, empty backend rejection, baseline-match no-regression, baseline-miss regression, baseline-missing fail, dim_type_dropped detection, empty snapshotId rejection, clearBaselines)

Per-file scrutiny: covered by 3-of-3 end-of-task gate.

BLUEPRINT-OCR-TRAINING-MS1 4->5 of 8 in followup commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../__tests__/groundTruthValidationEngine.test.ts  | 393 +++++++++++++++++++++
- .../src/engines/GroundTruthValidationEngine.ts     | 351 ++++++++++++++++++
- mcp-server/src/tools/dispatchers/cadDispatcher.ts  | 107 ++++++
- 3 files changed, 851 insertions(+)

## Lessons surfaced in commit body
- tile)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8bdf10d5a246`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-OCR-TRAINING-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._