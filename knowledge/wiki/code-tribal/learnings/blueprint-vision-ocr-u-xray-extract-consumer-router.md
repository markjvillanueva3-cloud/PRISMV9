# BLUEPRINT-VISION-OCR/U-XRAY-EXTRACT-CONSUMER-ROUTER — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-EXTRACT-CONSUMER-ROUTER (slot:xray): route a validated extraction contract -> the prism features that can consume it

**Commit:** `b7fe4242ea63` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T07:47:24-05:00
**Tags:** blueprint-vision-ocr, u-xray-extract-consumer-router, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-EXTRACT-CONSUMER-ROUTER (slot:xray): route a validated extraction contract -> the prism features that can consume it

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-EXTRACT-CONSUMER-ROUTER (slot:xray): route a validated extraction contract -> the prism features that can consume it

The "apply blueprint reading to ALL prism features" backbone (blueprint-vision-app-integration-plan-2026-06-23). The BlueprintExtractionContract NORMALIZES one part's extraction but nothing turned it into ACTION. New pure blueprintExtractionRouter.routeExtractionToConsumers maps a validated contract -> a fan-out plan: which downstream prism feature each extraction can drive (quote=prism_business / print_to_program=prism_cam / inspection_plan=prism_quality / feature_recognize+cad_reconstruct+redact=prism_cad / material_resolve=prism_business -- all 6 consumer actions disk-verified), with per-consumer eligibility, contract-derived payloads, and -- for COMMITMENT consumers (quote=money / program=machine motion / inspection=acceptance) -- a confirm-gate that blocks on any below-floor needs_confirm field (advisory/privacy never gated). NOT a dup of ExtractionIntelligenceRouter (knowledge->wiring vs part-contract->feature-consumers).

WIRE: prism_cad:blueprint_extract_route + POST /api/v1/cad/blueprint-extract-route. Chain: producer -> blueprint_extract_contract -> blueprint_extract_route.
SCHEMA: contract 5 array fields -> .default([]) so a slimResponse-stripped contract re-validates (input-only relaxation; output T[] unchanged; 28 contract tests green).
TEST: 15 router + 5 prism_cad round-trip = 20 new; 53 affected green; tsc-clean (2 ReinforcementLearningCAMFeedbackEngine TS2554 are pre-existing/out-of-domain).
SCRUTINY: per-file 2-arm both PASS; 2 P2s both arms flagged (summary mirror + REST parity) FIXED in-pass.
```

## Files touched (7)
- mcp-server/src/__tests__/blueprintExtractionRouter.test.ts           | 269 ++++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/cadDispatcher.blueprintExtractRoute.test.ts | 115 ++++++++++++++
- mcp-server/src/engines/blueprint-vision/blueprintExtractionRouter.ts | 361 +++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/routes/cad.ts                                         |  11 ++
- mcp-server/src/schemas/BlueprintExtractionContract.ts                |  13 +-
- mcp-server/src/tools/dispatchers/cadDispatcher.ts                    |  30 ++++
- 6 files changed, 794 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b7fe4242ea63`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._