# BLUEPRINT-VISION-OCR/U-XRAY-P15-FUSED-SUMMARY-RECOMPUTE — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-FUSED-SUMMARY-RECOMPUTE (slot:xray): buildRegionRoutedFused recomputes summary.n_hallucination_candidates over the union dims (AL-routing correctness)

**Commit:** `25d0a1d3bebb` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T19:39:44-05:00
**Tags:** blueprint-vision-ocr, u-xray-p15-fused-summary-recompute, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-FUSED-SUMMARY-RECOMPUTE (slot:xray): buildRegionRoutedFused recomputes summary.n_hallucination_candidates over the union dims (AL-routing correctness)

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-FUSED-SUMMARY-RECOMPUTE (slot:xray): buildRegionRoutedFused recomputes summary.n_hallucination_candidates over the union dims (AL-routing correctness)

Closes the iter-8 2-arm P2: the hybrid kept the full-page summary, so a region-ONLY hallucination candidate (a singleton a region crop recovers) was not counted in summary.n_hallucination_candidates -> classifyActiveLearning (ocr-training-loop-lib.mjs:173) could miss routing it to active-learning review. buildRegionRoutedFused now recomputes n_hallucination_candidates over the UNION dims, mirroring fuseEnsemble (vision-ensemble-fuse.mjs:291) -- counts union dims with hallucination_candidate===true (the per-dim flag is preserved through mergeTiledDimensions ...dim spread). Pure (new summary object, input unmutated); absent summary stays absent (failed-floor -> AL via n_models=0 default); strict ===true (the flag is a pure boolean). n_ambiguous_pairs stays the full-page value (pairwise, not per-dim derivable -- documented limit, safe under-count since any ambiguous pair already routes to AL). 18/18 region-glue tests (3 new: recompute / no-mutation / no-summary; 1 updated to the recompute intent, NOT weakened) + region-classify 10/10. Per-file scrutiny PASS (0 P0/P1; one PRE-EXISTING safe-direction P2: per-dim flag stale-after-clique-merge can over-route to AL -- optional future refine from tileAgreement). The cron-wire is now fully unblocked: feed rr.fused into buildTrainsetRow + classifyActiveLearning with correct AL routing.
```

## Files touched (3)
- scripts/lib/region-glue-lib.mjs      | 14 +++++++++++++-
- scripts/lib/region-glue-lib.test.mjs | 29 ++++++++++++++++++++++++++++-
- 2 files changed, 41 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- TiledDimensions ...dim spread). Pure (new summary object, input unmutated); absent summary stays absent (failed-floor -> AL via n_models=0 default); strict ===true (the flag is a pure boolean). n_ambiguous_pairs stays the full-page value (pairwise, not per-dim derivable -- documented limit, safe under-count since any ambiguous pair already routes to AL). 18/18 region-glue tests (3 new: recompute / no
- tileAgreement). The cron-wire is now fully unblocked: feed rr.fused into buildTrainsetRow + classifyActiveLearning with correct AL routing.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 25d0a1d3bebb`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._