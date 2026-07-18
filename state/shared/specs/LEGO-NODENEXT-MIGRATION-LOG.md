# NodeNext bulk migration log

**Generated:** 2026-05-25T05:11:36.608Z
**Scope:** all-engines (3534 .ts files)
**Files inspected this run:** 3534
**Files with changes:** 0
**Files skipped (file missing on disk):** 0
**Total import-specifier rewrites:** 0
**Mode:** **DRY-RUN — no disk writes**

## Per-engine results (first 30)

| Engine | Status | Rewrites | Sample (first 3) |
|---|---|---:|---|
| A2AProtocolEngine | no-change | 0 | — |
| AbrasiveJetMachiningEngine | no-change | 0 | — |
| AbsorptionChillerEngine | no-change | 0 | — |
| AbstractionHierarchyEngine | no-change | 0 | — |
| AccessControlListEngine | no-change | 0 | — |
| AccessibilityAnalysisEngine | no-change | 0 | — |
| AccountingHardeningEngine | no-change | 0 | — |
| AccumulatorEngine | no-change | 0 | — |
| AcoSequencerEngine | no-change | 0 | — |
| AcousticEmissionMonitoringEngine | no-change | 0 | — |
| AcquisitionRecommendationEngine | no-change | 0 | — |
| ActionableErrorTemplateEngine | no-change | 0 | — |
| ActionSchemaCacheEngine | no-change | 0 | — |
| ActionSequenceExtractorEngine | no-change | 0 | — |
| ActionTraceEngine | no-change | 0 | — |
| ActiveLearningStrategyEngine | no-change | 0 | — |
| ActualCostEngine | no-change | 0 | — |
| ActualVsPredictedCollectorEngine | no-change | 0 | — |
| AdaLoRARankAllocatorEngine | no-change | 0 | — |
| AdaptiveCalibrationEngine | no-change | 0 | — |
| AdaptiveChatterEngine | no-change | 0 | — |
| AdaptiveChiploadEngine | no-change | 0 | — |
| AdaptiveClearingEngine | no-change | 0 | — |
| AdaptiveControlEngine | no-change | 0 | — |
| AdaptiveEngagementEngine | no-change | 0 | — |
| AdaptiveFeedControlEngine | no-change | 0 | — |
| AdaptiveFeedModulationEngine | no-change | 0 | — |
| AdaptiveMachiningIntegrationEngine | no-change | 0 | — |
| AdaptiveMillingChipLoadMonitorEngine | no-change | 0 | — |
| AdaptiveOverrideEngine | no-change | 0 | — |
| _…3504 more in JSON output_ | | | |

## Verify

After `--apply`, build + test + git-diff to confirm no regression:
```bash
cd H:/prism/mcp-server && npm run build:fast
cd H:/prism/mcp-server && npx vitest run
git -C H:/prism diff --stat mcp-server/src/engines/
```

## Revert (if anything breaks)

```bash
git -C H:/prism checkout -- mcp-server/src/engines/
```

## R12 honesty

This script only rewrites *relative* import specifiers — bare specifiers (`zod`, `node:fs`) and already-suffixed paths (`./foo.js`) are left alone. It does NOT verify that the targeted `.js` files actually exist on disk — TypeScript's import resolution treats `./X` as resolvable to `./X.ts` even when the runtime needs `./X.js` — this rewrite is correct for NodeNext but can mask a missing-source error if the cohort was already broken. Always run the build verifier after `--apply`.