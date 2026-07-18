# BLUEPRINT-VISION-OCR/U-XRAY-RECONCILE-CANDIDATES — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-RECONCILE-CANDIDATES (slot:xray): cnc+print source-adapters complete the reconcile candidate-sourcing trio; cadGtToCandidates now live (non-orphan)

**Commit:** `ae82412e37cc` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T18:42:09-05:00
**Tags:** blueprint-vision-ocr, u-xray-reconcile-candidates, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-RECONCILE-CANDIDATES (slot:xray): cnc+print source-adapters complete the reconcile candidate-sourcing trio; cadGtToCandidates now live (non-orphan)

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-RECONCILE-CANDIDATES (slot:xray): cnc+print source-adapters complete the reconcile candidate-sourcing trio; cadGtToCandidates now live (non-orphan)

scripts/lib/reconcile-candidate-adapters.mjs (12/12 tests, 2-arm scrutiny PASS, 0 P0/P1): programGtToCandidates (program GT inch->mm diameter + overall_length linear; rejects non-positive, never abs's garbage into a fake dim -- R12) + printOcrToCandidates (contract dims keep per-field confidence; bare numbers -> unknown) + buildPartCandidates merger + re-export cadGtToCandidates. Completes CrossSourceDimensionReconciliationEngine's documented 'real-candidate sourcing' next-iter: the (a) print + (c) cnc adapters joining the (b) cad adapter. Confidence is OMITTED so the engine applies its per-source prior (cad 0.95/cnc 0.90/print 0.70) -- verified the engine's prior fallback fires (CrossSourceDimensionReconciliationEngine.ts:179). Wired buildPartCandidates into validate-perfect-parts --cad-triangulate (emits reconcile-ready DimCandidate[] per part) -> makes cadGtToCandidates a LIVE consumer, closing the orphan the prior 2-arm review flagged (R15). LIVE: T-11BT-27-250-GR5 -> 13 candidates (10 cad diameters + 3 envelope linears L/W/H), canonical DimType/DimSource, ready for prism_cad:cad_dimension_reconcile.
```

## Files touched (4)
- scripts/lib/reconcile-candidate-adapters.mjs      | 105 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/reconcile-candidate-adapters.test.mjs |  76 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/validate-perfect-parts.mjs                |   8 +++++++-
- 3 files changed, 188 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ae82412e37cc`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._