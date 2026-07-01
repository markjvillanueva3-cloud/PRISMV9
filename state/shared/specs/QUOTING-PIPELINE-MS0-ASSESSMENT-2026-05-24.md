# QUOTING-PIPELINE-MS0 — Assessment + Scope

**Date:** 2026-05-24
**Slot:** charlie (/goal-13 iter1)
**Trigger:** "/forge-audit-v2, /system-viz utilize PSN to assess and scope the current quoting system…" + camera-OCR (3 scopes) + live chat AI + web/phone app
**Methodology:** PSN/system-viz HAVE survey → gap analysis → NEED inventory → WIRE plan → milestone envelope

---

## Executive Summary

PRISM already has a **dense quoting backbone** — ~30+ quote/cost/billing engines, a working `BlueprintToQuoteBridgeEngine` that maps `BlueprintOCREngine` output → `QuoteEstimatorEngine` input (Xometry-class upload→quote), and a 117KB `QuoteBuilderPage` UI. The **mobile/PWA scaffold exists** (`EmployeeShopFloorMobileEngine`, `MobileInterfaceEngine`, `MobileLookupEngine`, `MobileVoiceEngine`, `EmployeePhonePortalPage`). The **troubleshooting LLM exists** (`TroubleshootingAssistantEngine` at 120KB, `LatheTroubleshootingIntelligenceEngine` at 60KB).

What's missing is **wiring, not engines** — three OCR-to-pricing bridges (insert box → catalog lookup, machine service tag → parts BOM, tool body → compatible inserts), a real-time vendor pricing client, a live-chat UI bridge from the front-end to `TroubleshootingAssistantEngine`, and a mobile-first quote+capture page that ties the camera intake to the existing `BlueprintToQuoteBridge`. That's a **wiring/bridge milestone**, not a from-scratch build.

R12 fail-loud: **CaptureOpsPage (43KB) and BlueprintOCREngine (35.7KB) are not yet read end-to-end for full delivery surface confirmation** — this assessment scopes on dispatcher action inventory + filename catalog; a P0 verification pass during U-QP01 reads each candidate to verify it does what the name claims (no stub returns, no placeholder OCR).

---

## HAVE — already built (inventory by capability)

### Quote orchestration (8 engines)
| Engine | Size | Role |
|---|---|---|
| `QuoteToShipOrchestratorEngine` | 205.9K | end-to-end pipeline |
| `QuoteEstimatorEngine` | 39.7K | core estimate calc |
| `QuoteAutopilotEngine` | 16.4K | autonomous quoting |
| `QuoteAnalyticsEngine` | 19.4K | post-quote analytics |
| `QuoteRevisionEngine` | 14.0K | rev tracking |
| `QuoteToOrderBridgeEngine` | 10.4K | quote → ERP order |
| `QuoteEngine` | 7.4K | base / facade |
| `BlueprintToQuoteBridgeEngine` | 15.0K | **drawing → quote input** (key pathway) |

### Process-specific quote (5 engines)
| Engine | Process |
|---|---|
| `AdditiveQuoteEngine` | additive / 3D print |
| `CastingQuoteEngine` | casting |
| `SheetMetalQuoteEngine` | sheet metal |
| `ShopFloorQuoteEngine` | shop-floor walk-up |
| `WeldFabricationQuoteEngine` | weld fab |
| `WEDMQuoteBridgeEngine` | wire EDM |

### Cost / labor / markup (15 engines)
`ActualCostEngine`, `CostEstimationEngine`, `CostEstimatorEngine`, `CostAlarmEngine`, `CostSavingsTrackerEngine`, `CoolantCostOptimizationEngine`, `EDMCostDocumentationEngine`, `ERPCostFeedbackEngine`, `SetupCostOptimizationEngine`, `ShopFloorCostEngine`, `SinkerElectrodeCostEngine`, `StrategyCostOptimalEngine`, `ToolCostPerPartEngine`, `ToolCostPredictorEngine`, `CycleTimeEstimatorEngine` (48.5K — drives labor hours).

### Billing / invoice (3 engines)
`BillingEngine` (24.6K), `StripeBillingEngine` (14.3K, already wired), `WEDMInvoiceLineEngine` (13.9K).

### OCR / vision (14 engines)
`BlueprintOCREngine` (35.7K), `BlueprintVisionOCREngine` (37.9K), `BlueprintOCRAdapter`, `CADLiveBlueprintOcrAdapter`, `ImageOCRPipelineEngine` (6.1K — **generic image pipeline**), `CADFeatureRecognitionEngine`, `FeatureRecognitionEngine`, `CADRevisionDetectorEngine`, `CADRevisionPromotionWorkflowEngine`, `CrossProcessVisionTabularFusionEngine`, `VisionActionAnalyzerEngine`, `WEDMPartRecognitionEngine`, `QuoteRevisionEngine`.

### Chat / troubleshoot (10 engines)
`TroubleshootingAssistantEngine` (120.2K — **largest LLM**), `LatheTroubleshootingIntelligenceEngine` (59.7K), `TroubleshootingDecisionTreeEngine` (39.5K), `TroubleshootingEngine` (14.5K), `ChatBusEngine` (16.4K), `ConversationalMemoryEngine` (15.3K), `ConversationBudgetEngine`, `ConversationStaleDetectorEngine`, `ConversationTrimmerEngine`.

### JM Die docustrata + program corpus (12 engines)
`DocustrataCustomerIndexEngine` (15.2K — **docustrata index live**), `JMDieArchiveBackAnnotationEngine` (33.4K), `JMDIEPatternAnalyzer` (20.9K), `JMDieMillProgramHarvestEngine` + `JMDieMillProgramHarvesterEngine` (35.4K combined), `JMDieLatheProgramUpgraderEngine` + V2 (18.7K), `JMDiePostProcessorLearningEngine` (26.2K), `JMDieMachineEnvelopeCatalogEngine` (8.5K — **shipped today U-PP01**), `CADJMDieArchetypeFrequencyEngine`, `BusinessDocumentExtractorEngine` (17.2K), `DocumentInboxEngine` (37.9K).

### Customer (7 engines)
`CustomerKnowledgeEngine`, `CustomerManagementEngine`, `CustomerMaterialMapEngine`, `CustomerPortalEngine`, `CustomerPortfolioMinerEngine`, `CrossCustomerPolicyTransferEngine`, `CustomerPortalPage` (64.7K UI).

### Tool / insert catalog (8 engines)
`CAMToolLibraryEngine`, `FusionToolLibraryEngine`, `FusionToolLibraryExtractorEngine`, `ShopToolLibraryEngine`, `InsertChangeRecommendationEngine`, `InsertGradeSelectionEngine`, `ToolAssemblyEngine`, `ToolAssemblyModelEngine`.

### Catalog ingest (10 engines)
`ArchiveToPartsCatalogIngesterEngine`, `BatchCAMOperationCatalogEngines`, `CADReverseCorpusCatalogEngine`, `CAMCatalogLoaderEngine`, `CAMCatalogPhysicsLinkerEngine`, `CAMCatalogSplitterEngine`, `CatalogExtractionEngine`, `CatalogRegistryBridgeEngine`, `Fusion360ControllerCatalogEngine`, `FixturePartCatalogEngine`, `HyperMillControllerCatalogEngine`.

### Mobile / camera (8 engines)
`EmployeeShopFloorMobileEngine` (20.7K), `MobileInterfaceEngine` (17.2K), `MobileLookupEngine` (11.6K — **part lookup**), `MobileVoiceEngine` (11.3K), `MobileAlarmEngine`, `MobileCacheEngine`, `MobileTimerEngine`, `CADScreenshotCapturer` (18.9K), `CaptureSharpenEngine` (11.1K).

### Web pages already live (17 quote-relevant)
- `QuoteBuilderPage` (117.4K), `QuoteAnalyticsPage` (25.4K), `QuoteFollowUpPage` (42.3K)
- `BlueprintQuotePage` (10.4K), `AdditiveQuotePage` (15.6K), `SheetMetalQuotePage` (10.7K)
- `CostEstimatorPage` (6.6K), `ToolingCostPage` (10.9K), `MachineRatesPage` (37.5K)
- `CaptureOpsPage` (43.0K), `LatheUploadPage`, `MillingUploadPage`, `WireEdmUploadPage`
- `ToolOptimizationPage` (27.4K), `ToolpathAdvisorPage` (39.9K)
- `EmployeePhonePortalPage` (24.2K — **mobile prototype**)
- `CustomerPortalPage` (64.7K)

### JM Die corpus (filesystem)
Root `H:/PRISM/JM DIE/` has 19 program-class directories incl. `CNC LATHE/`, `CNC MILL HAAS/`, `CNC OKUMA MULTUS/`, `HURCO CNC PROGRAMS/`, `LATHE/`, `MACRO PROGRAMS/`, `OKUMA/`, `ROKU-ROKU/`, `SETUPS/`, `WIRE EDM/`, `_PART LIBRARY/`, `PRISM CAD TESTING/`, `Automated Program_Corrected 5-25.xlsm` (5.3MB master), `vba Sheet11–16.cls` (VBA source for the macro pipeline).

### Extracted/ legacy corpus (39 engines, 25 sub-dirs)
- `Extracted/business/` — `PRISM_COST_DATABASE.js` (288.2K!), `PRISM_COST_ESTIMATION.js`, `PRISM_BUSINESS_AI_SYSTEM.js`, `PRISM_SCHEDULING_ENGINE.js`, `PRISM_SHOP_ANALYTICS_ENGINE.js`, `PRISM_SHOP_LEARNING_ENGINE.js`, `PRISM_SHOP_OPTIMIZER.js`
- `Extracted/engines/` — physics catalog (Kienzle/Taylor/thermal). Already harvested.
- (No `Extracted Modules/` dir — does not exist; only `Extracted/`.)

The 288KB `PRISM_COST_DATABASE.js` is a **major un-harvested asset** — likely the canonical legacy pricing table set.

---

## GAP — what's missing for /goal-13 (the wires)

### G1 — InsertBoxOCR → ToolLibrary lookup bridge ❌
No engine takes a photo of an insert box / tool body, runs OCR on the part number, and resolves it to `ShopToolLibraryEngine` + compatible-insert recommendations via `InsertGradeSelectionEngine` + `InsertChangeRecommendationEngine`. The OCR exists (`ImageOCRPipelineEngine`); the catalogs exist. The **bridge** does not.

### G2 — MachineServiceTagOCR → Parts BOM + realtime pricing ❌
No engine takes a photo of a machine service tag (make + model + serial), resolves to a parts BOM, and pulls real-time pricing from vendor APIs. The OCR exists. The vendor catalog ingester exists (`ArchiveToPartsCatalogIngesterEngine`). The **service-tag parser + parts-BOM resolver + vendor-pricing client** do not exist.

### G3 — VendorRealtimePricingClientEngine ❌
No engine queries vendor APIs (Misumi, McMaster, Sandvik, Iscar, Kennametal) for live SKU pricing. Required for G2 + insert-replacement quoting + tool-replacement quoting. R12 caveat: scope likely needs to start with **vendor-CSV + Z-API stub + per-vendor adapter shape**, real APIs need keys + scraping policy.

### G4 — Blueprint → instant program pipeline ⚠ (partial — verify)
`BlueprintToQuoteBridgeEngine` covers print→quote. The print→**program** side leans on existing pipelines (`PrintToProgramPipeline`, `QuoteToShipOrchestratorEngine`) but the **one-touch path from a photo capture to an emitted G-code** is not surfaced as a single API. Needs verification + UI bridge.

### G5 — Live-chat UI bridge to TroubleshootingAssistantEngine ❌
`TroubleshootingAssistantEngine` (120K!) + `ChatBusEngine` exist but no `LiveChatRouterEngine` brokers a user-facing chat session → assistant → ChatBus → response with citation provenance.

### G6 — Mobile-first capture+quote page ⚠ (partial)
`EmployeePhonePortalPage` exists but is employee-internal. The **customer-facing mobile quote page** (camera intake → BlueprintToQuoteBridge → live quote) is not present as a discrete page; `CaptureOpsPage` (43K) overlaps but needs verification it's customer-grade.

### G7 — Camera intake → multi-route dispatcher ❌
A single mobile `CameraIntakeRouterEngine` that classifies "this image is: blueprint | insert-box | tool-body | machine-service-tag" and routes to the right OCR + bridge does not exist. Needed so one camera button works for all three scopes.

### G8 — Legacy `PRISM_COST_DATABASE.js` harvest ❌
288.2KB of canonical pricing data sitting un-imported in `Extracted/business/`. Likely contains the historical material+labor+overhead rate tables that should seed `JMDieMaterialPricingEngine`. R12: until harvested, current quote estimates are running on whatever's wired today — may be partial.

### G9 — `prism_quoting` dispatcher actions for the new bridges ❌
Each new bridge engine needs a dispatcher action so the web/mobile UI + Claude/Codex sessions can invoke it without bespoke wiring. Wire to `prism_quoting` (if exists, else create) + `prism_intelligence` for the chat router.

### G10 — End-to-end E2E test against a real JM Die part ❌
Per CLAUDE.md R9 + R12: every new bridge needs an E2E test on a real JM Die print (e.g. one of the `_PART LIBRARY/` SVGs or a scanned drawing) — not a synthetic fixture — to prove the entire pipeline actually quotes correctly. No such test exists today for camera-intake.

---

## WIRE — milestone scope (12 units across 3 phases)

### P0 — Wiring + bridges (8 units)
| Unit | Title | Files |
|---|---|---|
| `U-QP01` | Audit: end-to-end read of CaptureOpsPage + BlueprintOCREngine + QuoteBuilderPage; verify no stub returns (R12) | spec only |
| `U-QP02` | `CameraIntakeRouterEngine` — classifies image type, routes to OCR + bridge | engine + 12 tests |
| `U-QP03` | `InsertBoxToCatalogBridgeEngine` — wires ImageOCRPipeline → ShopToolLibrary + InsertGradeSelection | engine + 12 tests |
| `U-QP04` | `MachineServiceTagOCREngine` — make/model/SN extraction (uses ImageOCRPipeline base) | engine + 12 tests |
| `U-QP05` | `MachinePartsBOMResolverEngine` — service-tag → parts BOM via DocustrataCustomerIndex | engine + 12 tests |
| `U-QP06` | `VendorRealtimePricingClientEngine` — vendor adapter shape (Misumi + McMaster stubs first; real-API knobs) | engine + 15 tests |
| `U-QP07` | `LiveChatRouterEngine` — UI session ↔ TroubleshootingAssistantEngine ↔ ChatBus with citation provenance | engine + 12 tests |
| `U-QP08` | `prism_quoting` dispatcher — wire 5 new action slots (camera_intake_route, insert_box_lookup, machine_tag_parts, vendor_realtime_price, live_chat) | dispatcher + schemas + 8 tests |

### P1 — UI surfaces (3 units)
| Unit | Title | Files |
|---|---|---|
| `U-QP09` | `MobileCameraQuotePage` — customer-facing mobile-first capture → BlueprintToQuote → live estimate | web/src/pages + 6 component tests |
| `U-QP10` | `LiveChatWidget` component — embeddable troubleshoot chat (calls live_chat action) | component + 6 tests |
| `U-QP11` | PWA manifest + service-worker for offline cache (`MobileCacheEngine` exists, needs registration) | manifest + sw + 4 tests |

### P2 — Real-data E2E (1 unit)
| Unit | Title | Files |
|---|---|---|
| `U-QP12` | E2E integration test: photograph of a real JM Die `_PART LIBRARY/` drawing → CameraIntakeRouter → BlueprintToQuote → cost ± 15% of historical actual cost. Plus a real tool-body photo for InsertBoxToCatalog. (Per R9: tests verify intent, not behavior — quote ± 15% encodes the business invariant.) | integration test (real JPG fixtures) |

**Out of scope for MS0** (tracked for MS1):
- Native iOS/Android app (PWA only in MS0).
- Real vendor-API integration (adapter stub layer in MS0; real-API keys + scraping policy in MS1).
- `PRISM_COST_DATABASE.js` harvest — separate G8 unit, hand off to golf-slot or echo for ingestion pass.
- Visual G-code preview (CaptureOpsPage may already cover; verify in U-QP01).

---

## SYNERGY — PSN wiring per leg

| PSN leg | Wired by |
|---|---|
| **Obsidian brain** | Each new bridge writes a `reference_qp_*.md` memory pointer; live troubleshoot chat sessions feed Obsidian via existing Stop hook |
| **PRISM OS** | `prism_quoting` actions surface in `prism_operating_system` workspace |
| **Wiki** | `knowledge/wiki/architecture/quoting-pipeline-ms0.md` |
| **Memories** | 12 unit-keyed references + 1 milestone close-out |
| **Tribal** | `LiveChatRouterEngine` queries `CAMTribalRAGEngine` + `CAMTribalKnowledgeEngine` for citation provenance |
| **System Viz** | New `ghost.quoting_pipeline` roost; 12 new nodes + edges to existing quote engines |
| **Engines** | 7 new engines reuse 30+ existing quote/cost/OCR/troubleshoot/catalog engines (high leverage ratio) |
| **Algorithms** | Reuses interval-arithmetic (PROGRAM-PROOF-MS0/U-PP02) for cost-uncertainty bounds; Bayesian update for historical-actuals feedback |
| **Formulas** | Cost = labor + tooling + material + overhead + margin; vendor pricing uses canonical rate-table format |
| **NN/GNN** | Quote outcomes feed `PSNAutonomyLoopEngine` as `psi_delta` signals (per E07-E10 wiring) |
| **PRISM AI** | `LiveChatRouterEngine` routes deep-reasoning queries to `aiSystemRouterEngine` (Claude vs Ollama vs prism_calc) |

---

## RISKS + R12 honesty

- **R12-1** — Real vendor pricing APIs typically require commercial keys + are rate-limited. MS0 ships adapter shape + stubs only; no real prices until MS1 commercial layer.
- **R12-2** — Camera OCR quality on handheld shop-floor photos (oil, glare, motion blur) is meaningfully worse than scanned PDFs. `CaptureSharpenEngine` helps but the E2E test in U-QP12 needs a real (imperfect) photo, not a clean scan.
- **R12-3** — `PRISM_COST_DATABASE.js` un-harvested means current quote estimates are running on whatever's already wired; until G8 is closed, "real" quote accuracy is bounded by today's wiring (we don't know the gap until we measure).
- **R12-4** — `EmployeePhonePortalPage` is employee-internal; a customer-facing mobile page (U-QP09) means new auth/session scope, not just a re-skin.
- **R12-5** — `TroubleshootingAssistantEngine` is 120KB but until U-QP01 reads it end-to-end we don't know its output schema; the chat-router bridge depends on that schema.

---

## DELIVERABLES (this assessment unit)

1. ✅ This file: `state/shared/specs/QUOTING-PIPELINE-MS0-ASSESSMENT-2026-05-24.md`
2. → milestone envelope: `mcp-server/data/milestones/QUOTING-PIPELINE-MS0.json` (12 units)
3. → roadmap-index entry
4. → CLAUDE.md `## QUOTING-PIPELINE-MS0` pointer + `## Recent regressions` tail
5. → memory `reference_quoting_pipeline_ms0_assessment_2026_05_24.md`

Next iteration (`/loop` /goal-13 iter2): begin U-QP01 audit pass (end-to-end read of CaptureOpsPage + BlueprintOCREngine + QuoteBuilderPage), then U-QP02 CameraIntakeRouterEngine.
