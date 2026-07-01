# AUDIT-PRIORITIZED-GAPS — Top 20 ranked by user-facing impact

**Generated:** 2026-05-02
**Ranking criteria:** (impact on Mark's daily JM Die workflow) × (severity of capability shortfall) × (silent-rot risk for future Claude sessions). Highest first.

---

## 1. **Pillar telemetry rot** — system cannot self-report what's wired
- **Impact:** every "X% complete" status is unverifiable. Future Claude sessions will trust telemetry that says 0% complete and rebuild things that exist.
- **Symptom:** `prism_dev:pillar_summary` returns 8/8 stubs while 3,046 engines + 6,800 actions are live.
- **Fix:** rebuild `PillarMonitorEngine` registry against live engine manifest; wire SessionStart hook to refresh.
- **Effort:** medium — registry population script + hook trigger.

## 2. **Capability census + auto-wiring scan + semantic search are OFFLINE**
- **Impact:** PRISM cannot answer "what do I have?" via MCP. Self-awareness directive depends on these.
- **Symptom:** `capability_census` returns 0 engines; `auto_wiring_scan` returns no output; `search_stats` returns `mode:"disabled"`.
- **Fix:** verify Qdrant + capability-census engine boot in `mcp-server/src/server/index.ts`; check that PostgreSQL embeddings are loaded.
- **Effort:** medium — boot-sequence diagnosis.

## 3. **Lead-in/lead-out optimization is a stub**
- **Impact:** Master Post differentiator #4 — directly claimed in vision; no engine exists.
- **Symptom:** 0 engines match `LeadIn|LeadOut`, 6 generic string hits in `ppDispatcher` only.
- **Fix:** build `LeadInOutOptimizationEngine` (arc smoothing, helical entry, ramp profile per material/Vc/strategy) + dispatcher action + test.
- **Effort:** medium — physics+geometry engine class.

## 4. **Build-quality-aware feed-rate ceiling is a stub**
- **Impact:** Master Post differentiator #12 — directly claimed in vision; no integration engine.
- **Symptom:** no `BuildQualityAwareFeedCeiling` engine; no integration action wires Cpk → feed.
- **Fix:** build engine that reads SPC/Cpk class → feed ceiling backsolve; integrate to AutoSpeedFeed pipeline.
- **Effort:** medium-high — touches SPCEngine + AutoSpeedFeedEngine.

## 5. **Esprit tier-1 priority is unjustified by current wiring**
- **Impact:** Mark says Esprit is priority 4. Current Esprit wiring (2 engines, no in-host runner, no .esp parser, no tool sync) is weaker than tier-2 NX/CATIA/SolidCAM.
- **Symptom:** EspritFunctionIndexEngine + EspritCAMBridgeEngine exist; everything else absent.
- **Fix:** either (a) build Esprit in-host runner + .esp parser to match hyperMILL/Mastercam parity, OR (b) re-baseline tier-1 to NX/CATIA/SolidCAM.
- **Effort:** large for (a); small for (b).

## 6. **35-vs-38-stage post pipeline number conflict**
- **Impact:** internal documentation contradicts itself. Vision says "35-stage post pipeline orchestration"; project CLAUDE.md says "38 stages". No test asserts either.
- **Fix:** count actual stages in `PostProcessorPipelineEngine` source; assert in a test; reconcile docs.
- **Effort:** small — test + doc fix.

## 7. **Per-block adaptive S/F has no E2E test**
- **Impact:** Master Post differentiator #1; engine + dispatcher exist but no test asserts "called per motion line."
- **Symptom:** no `AutoSpeedFeedEngine.test.ts` named file (only embedded in batch tests).
- **Fix:** write integration test that runs a 100-line G-code file through pp_run_full and asserts SFC was invoked per motion block.
- **Effort:** small — test only.

## 8. **Tribal tip live count is 0** despite 3,700 in CLAUDE.md
- **Impact:** "3,700 tribal tips active" claim is unverifiable in live system.
- **Symptom:** `manifest.counts.tribalTips=0`.
- **Fix:** verify TribalKnowledgeEngine loads tip database at boot; populate manifest counter.
- **Effort:** small — boot wiring.

## 9. **Vision says 109 hooks; reality is 414**
- **Impact:** vision documentation is 4× under-reported. Future sessions reading vision will under-estimate what hooks actually run.
- **Fix:** update vision document or auto-generate hook count from inventory.
- **Effort:** trivial — doc update.

## 10. **System Coordinator AI tier is fragmented**
- **Impact:** vision claims 8 wired AI tiers; coordinator tier is split across LatheUnifiedAIOrchestrator + MillMasterOrchestratorFacadeEngine + ScalableCAMOrchestratorEngine + AIRouterEngine — no single canonical "PRISM SystemCoordinator" engine.
- **Fix:** build top-level `PRISMSystemCoordinatorEngine` that routes to per-domain orchestrators.
- **Effort:** medium.

## 11. **CAD AI lacks LoRA action surface**
- **Impact:** vision says CAD AI is wired with all infrastructure; LoRA training/predict actions exist for Mill/Lathe/WEDM/CAM/Sinker/Laser/Waterjet/MillTurn/Grinding — but NOT for CAD.
- **Symptom:** no `cad_lora_*` actions found.
- **Fix:** wire CadLoRACadenceEngine + dispatcher actions following existing pattern.
- **Effort:** small — pattern duplication from CAM LoRA.

## 12. **Probe / setup-sheet auto-gen tests missing**
- **Impact:** Master Post differentiator #7. ProbeRoutineGeneratorEngine + SetupSheetEngine exist; no named test.
- **Fix:** add `ProbeRoutineGeneratorEngine.test.ts` + `SetupSheetEngine.test.ts`.
- **Effort:** small.

## 13. **Energy/carbon footprint per move not consolidated**
- **Impact:** SFC vision element. 0 engines match `EnergyFootprint`; covered by MachiningEnergyModelEngine + GutowskiEnergyEngine + SustainabilityReportEngine but no per-move integration.
- **Fix:** create `EnergyPerMoveEngine` that integrates over toolpath; expose `cam.energy_per_move` action.
- **Effort:** medium.

## 14. **Cycle time prediction has no explicit P50/P75/P95 contract**
- **Impact:** SFC vision element. CycleTimeEngine + MonteCarloEngine present but no test asserts 3-percentile output.
- **Fix:** ensure `cycle_time_estimate` action returns `{p50, p75, p95}` schema; add test.
- **Effort:** small.

## 15. **Engine overlap scanner is broken**
- **Impact:** can't detect duplicates; manual scan found 6+ likely-duplicate clusters (AdhesiveBondEngine vs AdhesiveBondingEngine, BatchCAMStrategyEngines vs BatchCAMStrategyEngines2, 5 calibration engines).
- **Fix:** repair `engine_overlap_scan` action; consolidate flagged duplicates.
- **Effort:** medium.

## 16. **Frontend learning components — "built but unwired" per memory** needs clarification
- **Impact:** if memory is correct, Academy/Learning UI doesn't actually save user progress. If memory is stale, no fix needed.
- **Symptom:** components exist with tests; pages routed; data persistence path unverified.
- **Fix:** verify `LessonProgressEngine`/equivalent persists to backend; add E2E test from page → API → DB.
- **Effort:** small to verify; medium if broken.

## 17. **Visual design vs Prismv1.html reference unverified**
- **Impact:** vision references `Prismv1.html` as visual baseline; file not located in this audit.
- **Fix:** locate Prismv1.html; produce visual-diff against current SfcCalculatorPage / ShopDashboardPage.
- **Effort:** small.

## 18. **Insert geometry ISO-code engine surfaces only via registry**
- **Impact:** SFC vision element — "ISO codes → chip load + Vc". No `InsertGeometryEngine` class; relies on registry calls.
- **Fix:** make a thin engine wrapper around `data.insert_geometry_select` for typed AtomicValue returns.
- **Effort:** small.

## 19. **Last-calibration-timestamps not asserted**
- **Impact:** closed-loop learning vision element. Calibration engines exist but timestamps embedded in state; no `physics_calibrate_state` action assertion in tests.
- **Fix:** add test that verifies state includes ISO-8601 `lastCalibratedAt` after `physics_calibrate_submit`.
- **Effort:** small.

## 20. **WEDM "slug drop" + "multi-pass" engine names didn't match initial bucket search** despite real engines existing
- **Impact:** suggests engine naming convention drift — initial regex `wedm_slug` returned 0 hits even though `WEDMSlugTabRetentionEngine` exists; `wedm_multipass` returned 0 even though `WEDMAdaptivePassEngine` exists. Future Claude sessions doing keyword searches will miss capabilities.
- **Fix:** add CONVENTION.md for engine naming OR add semantic-search to manifest queries.
- **Effort:** small — naming doc; medium — semantic surface.

---

## Summary

**Top 5 user-facing impact gaps (one-line each):**

1. Pillar telemetry rot — system cannot honestly report wiring percentages.
2. Self-awareness MCP layer is offline (capability_census, auto_wiring_scan, search_stats all return zero/disabled).
3. Lead-in/out optimization Master-Post-differentiator is stub — no engine exists.
4. Build-quality-aware feed ceiling Master-Post-differentiator is stub — no Cpk → feed backsolve.
5. Esprit tier-1 priority does not match its actual wiring depth (currently weaker than tier-2 NX/CATIA/SolidCAM).

**Top 5 silent-rot risks for future Claude sessions:**

6. 35-vs-38 stage post pipeline conflict in internal docs.
7. 109-vs-414 hook count under-report in vision document.
8. tribalTipCount=0 in live manifest vs 3,700 claimed.
9. Engine naming convention drift (slug/multipass keyword searches missed real engines).
10. Engine overlap scanner is broken — duplicates accumulating undetected.
