# PRISM System Capabilities — For ALL Claude Instances
## Read this to know what PRISM can do. Updated automatically at every compaction.

## WHAT PRISM CAN DO RIGHT NOW (proven, tested)

### Blueprint/Print Reading → Structured Data ✅
- `BlueprintOCREngine` — extracts dimensions, GD&T, title block, notes from text
- `PDFBlueprintDimensionExtractorEngine` — extracts from PDF blueprints
- `CADDrawingKnowledgeEngine` — GD&T interpretation intelligence
- Tested: 14/14 tests pass against real Haas workbook data
- MCP: `prism_calc:blueprint_analyze` action

### CAD Model Generation ✅ (CadQuery + OpenCascade)
- `C:/PRISM/cad-engine/src/cad_kernel.py` — FULL solid modeling (436 lines):
  - Sketch: rect, circle, polygon, spline, slot, text
  - 3D: extrude, revolve, loft, fillet, chamfer, hole, shell, pattern, mirror
  - Boolean: union, subtract, intersect
  - Analysis: volume, surface_area, bounding_box, center_of_mass
  - Primitives: box, cylinder, sphere, cone
- `cad_export.py` — exports STEP, STL, DXF files
- `CadQueryCodeGeneratorEngine.ts` — generates CadQuery Python scripts from descriptions
- `cadquery-executor.py` — executes generated scripts → produces STEP/STL files
- **23 STEP files already generated** at C:/PRISM/cad-engine/exports/
- **10 roundtrip verifications** (STEP → features → regenerate → compare)
- **120 CAD models** exist across C:\PRISM (33 BOX production, 23 generated, 10 reference)

### Print → 3D Geometry Pipeline (exists but needs wiring)
- `PrintToGeometryEngine` — converts OCR-extracted dimensions → CadQuery script
- `StepImportEngine` — reads STEP/AP203/AP214 via occt-import-js WASM
- `FeatureRecognitionEngine` — detects 22 feature types from CAD models
- Pipeline: OCR → dimensions → PrintToGeometry → CadQuery → STEP file
- Status: individual engines work, end-to-end pipeline needs wiring (Phase 0-A)

### CNC Program Generation ✅
- 9 manufacturing pipelines (milling, turning, 5-axis, mill-turn, EDM, grinding, laser, waterjet, quote-to-ship)
- `PostProcessorPipelineEngine` — 38 stages with per-block S/F variability
- 20 controller dialects (Fanuc, Siemens, Heidenhain, Haas, Mazak, Okuma, etc.)
- MCP: `prism_cam:post_process`, `prism_turning_program:generate`, etc.

### Speed/Feed Computation ✅
- `SpeedFeedOrchestratorEngine` — 8 resolvers, Monte Carlo UQ, 2,851 lines
- `UltimateSpeedFeedEngine` — direct S/F with Kienzle/Taylor
- MCP: `prism_calc:speed_feed_orchestrate`

### Physics Models ✅
- Kienzle cutting force (with corrections for rake, wear, speed, size effect)
- Taylor tool life (per-material, with Weibull reliability)
- Stability lobe diagrams (chatter prediction)
- Thermal models (cutting temp, thermal expansion, cryogenic)
- Deflection (tool, part, boring bar — cantilever beam)
- Surface finish prediction (Brammertz kinematic + corrections)
- Residual stress prediction (7 models)
- 499 formulas in FormulaRegistry

### Quoting & Business ✅
- `QuoteEstimatorEngine` — multi-component cost breakdown
- `QuoteToShipOrchestratorEngine` — 21-stage quote-to-delivery pipeline
- `OEECalculatorEngine` — TPM six big losses
- `CapacityPlanningEngine` — machine load analysis
- MCP: `prism_business:quote_estimate`, `prism_business:oee_calc`

### Quality/Inspection ✅
- `SPCProcessCapabilityEngine` — Cp/Cpk/Pp/Ppk + Nelson rules
- `FirstArticleInspectionPipelineEngine` — AS9102 FAI
- `MetrologyUncertaintyEngine` — GUM-compliant
- MCP: `prism_quality:spc_calculate`, `prism_quality:fai_inspect`

### Machine Connectivity ✅
- `MTConnectAdapterEngine` — real-time machine data
- `OpcUaConnectorEngine` — industrial controller connection
- `MqttBridgeEngine` — IoT sensor bridge
- `GrafanaBridgeEngine` — Prometheus/Grafana dashboards

### Knowledge & Learning ✅
- 3,700+ tribal tips across 20 CAM systems
- 296 machining playbook rules
- `OnboardingEngine` — 5 disclosure levels (not wired to UI yet)
- `ApprenticeEngine` — 20 lessons, 5 challenges
- MCP: `prism_intelligence:tribal_search`, `prism_intelligence:apprentice_lesson`

### Data Available
- 95,608 cutting tools (Sandvik, Kennametal, Walter, Korloy, etc.)
- 910 CNC machines (Haas, DMG Mori, Mazak, Okuma, Makino, etc.)
- 2,957 materials with physics properties (Kienzle/Taylor constants for 13 canonical)
- 762 toolpath strategies across 18 CAM systems
- 120 CAD model files (STEP/STL)

## HOW TO USE (MCP actions available)
```
prism_calc:    speed_feed_orchestrate, cutting_force, tool_life, deflection, surface_finish, ...
prism_cam:     post_process, strategy_select, backplot, collision_check, ...
prism_business: quote_estimate, oee_calc, job_schedule, capacity_plan, ...
prism_quality: spc_calculate, fai_inspect, gauge_rr, ...
prism_intelligence: tribal_search, onboarding_welcome, apprentice_lesson, ...
prism_turning_program: generate, estimate_cycle_time
```

## MASTER INDEX (complete inventory of EVERY asset)
**READ THIS for exhaustive lookup**: `C:/PRISM/mcp-server/data/docs/MASTER_INDEX.md`
  - 1,895 lines listing EVERY engine, dispatcher, algorithm, registry, hook, command
  - 52 engine categories with engine names
  - 77 dispatchers with action counts
  - 51 algorithms
  - 22 registries
  - Tribal knowledge files, hook scripts, test files, milestones

**Compact version** (735 tokens): `C:/PRISM/mcp-server/data/docs/MASTER_INDEX_COMPACT.md`
**Engine list** (1-line per engine): `C:/PRISM/mcp-server/data/docs/ENGINE_DIGEST.md`
**Dispatcher list**: `C:/PRISM/mcp-server/data/docs/DISPATCHER_DIGEST.md`

## FILE PATHS (for direct access)
```
MCP Server:      C:/PRISM/mcp-server/
Engines:         C:/PRISM/mcp-server/src/engines/ (1,245 files)
Dispatchers:     C:/PRISM/mcp-server/src/tools/dispatchers/ (77 files)
Registries:      C:/PRISM/mcp-server/src/registries/ (24 files)
Web App:         C:/PRISM/mcp-server/web/src/ (45 pages)
CAD Engine:      C:/PRISM/cad-engine/ (176 Python files)
CAD Kernel:      C:/PRISM/cad-engine/src/cad_kernel.py (25+ solid modeling ops)
CAD Exports:     C:/PRISM/cad-engine/exports/ (23 STEP + STL files)
CAD Models:      C:/PRISM/BOX/PART MODELS FOR LEARNING ENGINE/ (33 production STEP)
Physics:         C:/PRISM/mcp-server/src/physics/constants.ts
Algorithms:      C:/PRISM/mcp-server/src/algorithms/ (51 files)
Tests:           C:/PRISM/mcp-server/src/__tests__/ (808 files)
Roadmap:         C:/PRISM/CAMX-RESTRUCTURED-ROADMAP-v24.md (5,567 lines)
MASTER_INDEX:    C:/PRISM/mcp-server/data/docs/MASTER_INDEX.md (1,895 lines, EVERYTHING)
```

## MCP RESOURCES (browsable by any connected client)
```
prism://machine/{machineId}   — Machine profile + kinematics (910 machines)
prism://material/{materialId} — Material properties (2,957 materials)
prism://tool/{toolId}         — Cutting tool geometry + coating (95,608 tools)
prism://playbook/{category}   — Machining rules by domain (296 rules)
prism://tribal/{camSystem}    — CAM tribal knowledge tips (3,700+ tips)
prism://alarm/{code}          — Controller alarm decode (10,033 alarms)
```

## FOR DESKTOP CLAUDE: Read These Files First
1. This file (SYSTEM-CAPABILITIES.md) — what PRISM can do
2. C:/PRISM/state/shared/DESKTOP-CLAUDE-BRIEF.md — your specific tasks
3. C:/PRISM/state/shared/backend-status.md — what CLI Claude just built
4. C:/PRISM/mcp-server/data/docs/MASTER_INDEX_COMPACT.md — full system map (735 tokens)
