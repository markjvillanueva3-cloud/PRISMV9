---
name: reference-quoting-pipeline-ms0-assessment-2026-05-24
description: QUOTING-PIPELINE-MS0 assessment + 12-unit envelope shipped charlie /goal-13 iter1 (2026-05-24). Wire-not-build milestone — 7 new bridges reuse 30+ existing engines.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.909Z
aliases: reference_quoting_pipeline_ms0_assessment_2026_05_24
---


# QUOTING-PIPELINE-MS0 — assessment + envelope (charlie /goal-13 iter1, 2026-05-24)

## Trigger
`/goal [/forge-audit-v2, /system-viz utilize PSN to assess and scope the current quoting system… check extracted and extracted modules folder… develop the web app page and phone app for live testing. taking pics of documents or items should be able to extract data for app usage…]`

## Headline finding
PRISM already has the quoting backbone. The /goal-13 surface is **wiring + UI surfaces, not from-scratch engines**:
- 8 quote orchestration engines (incl. 117KB `QuoteBuilderPage`)
- 6 process-specific quote engines (additive, casting, sheet-metal, weld, WEDM, shop-floor)
- 15 cost/labor/markup engines + 3 billing engines (Stripe wired)
- 14 OCR/vision engines incl. working `BlueprintToQuoteBridgeEngine` (drawing→quote pathway lives)
- 10 chat/troubleshoot engines incl. `TroubleshootingAssistantEngine` (120K, largest LLM)
- 12 JM Die docustrata + program harvest engines (incl. live `DocustrataCustomerIndexEngine`)
- 8 tool/insert catalog engines (`ShopToolLibraryEngine`, `InsertGradeSelectionEngine`, etc.)
- 8 mobile/camera engines incl. `EmployeePhonePortalPage`, `MobileLookupEngine`, `MobileVoiceEngine`
- 17 quote-relevant web pages already live

## What's missing (10 wire-gaps → 12 milestone units)
1. **G1/U-QP03** InsertBoxToCatalog bridge (OCR exists, catalog exists, bridge doesn't)
2. **G2/U-QP04+05** MachineServiceTag OCR + Parts BOM resolver
3. **G3/U-QP06** VendorRealtimePricing client (adapter shape; real API keys = MS1)
4. **G4/U-QP01** Blueprint→program pipeline verification (audit pass)
5. **G5/U-QP07** LiveChat router (assistant exists; UI bridge doesn't)
6. **G6/U-QP09** Customer-facing mobile camera+quote page (employee portal exists)
7. **G7/U-QP02** CameraIntakeRouter (classify image type, route to OCR + bridge)
8. **G8** `PRISM_COST_DATABASE.js` (288KB) un-harvested — out of MS0 scope, hand to golf
9. **G9/U-QP08** `prism_quoting` dispatcher with 5 new action slots
10. **G10/U-QP12** E2E test on real JM Die `_PART LIBRARY/` drawing photos (R9 ± 15% accuracy invariant)

## Envelope layout
- **P0 Wiring + bridges** (8 units, U-QP01..08): audit, CameraIntakeRouter, 4 bridge engines, vendor client, chat router, dispatcher
- **P1 UI surfaces** (3 units, U-QP09..11): mobile camera+quote page, LiveChatWidget, PWA manifest+SW
- **P2 Real-data E2E** (1 unit, U-QP12): integration test with real JM Die drawings

## Synergy (PSN wiring per leg — all 11 legs)
Obsidian (per-unit memory) · PRISM OS (`prism_quoting` actions) · Wiki (`quoting-pipeline-ms0.md`) · Memories (12 + 1 close-out) · Tribal (CAMTribalRAG citations in chat) · System Viz (new `ghost.quoting_pipeline` roost) · Engines (7 new reuse 30+) · Algorithms (interval-arithmetic from PROGRAM-PROOF-MS0/U-PP02 for cost bounds) · Formulas (canonical cost formula) · NN/GNN (quote outcomes → PSNAutonomyLoop psi_delta) · PRISM AI (chat routes via aiSystemRouterEngine).

## R12 risks named
- Vendor APIs need commercial keys — MS0 = adapter+stubs only
- Camera OCR worse on shop-floor photos vs. clean scans — E2E uses real (imperfect) photos
- `PRISM_COST_DATABASE.js` un-harvested means today's quote accuracy is bounded
- Customer-facing mobile = new auth scope, not just a re-skin
- `TroubleshootingAssistantEngine` output schema unverified until U-QP01

## Why this isn't a duplicate of existing pipeline-MS0 entries
Graph hits: `domain-pipeline-ms0` (canonical 18-stage print-to-part), `ollama-pipeline-ms0` (token-offload routing), `pipeline-ir-ms0` (intermediate rep). Distinct from this one: QUOTING-PIPELINE-MS0 is the **camera-intake-to-instant-quote + live-chat troubleshoot** wiring layer, not a process pipeline. It calls into `QuoteToShipOrchestratorEngine` (which is `domain-pipeline-ms0`'s implementation), not a parallel pipeline.

## Files this iter
- `state/shared/specs/QUOTING-PIPELINE-MS0-ASSESSMENT-2026-05-24.md`
- `mcp-server/data/milestones/QUOTING-PIPELINE-MS0.json`
- this memory pointer

## Next iter (/loop /goal-13 iter2)
U-QP01 — end-to-end read of `CaptureOpsPage.tsx` (43K), `BlueprintOCREngine.ts` (35.7K), `QuoteBuilderPage.tsx` (117K). Output an audit doc naming each stub return and each partial method. THEN U-QP02 CameraIntakeRouterEngine.

[[domain-pipeline-ms0]] · [[ollama-pipeline-ms0]] · [[pipeline-ir-ms0]] · [[reference_u_bridge_erp_quote_2026_05_20]] · [[reference_hotel_mus_customer_analytics_2026_05_22]]
