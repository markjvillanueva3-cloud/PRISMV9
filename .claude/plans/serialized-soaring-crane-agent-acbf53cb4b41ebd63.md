# F360 Print-to-Program Pipeline — Comprehensive Integration Roadmap

## Track: F360 | Milestones: F360-MS0 through F360-MS4

---

## Executive Summary

This roadmap integrates Fusion 360 as the CAD/CAM engine into PRISM's Print-to-Program pipeline across 5 milestones (25 units, ~15 sessions). The pipeline flows:

```
Customer Print (PDF/Image)
  → BlueprintOCREngine (exists)
  → FeatureRecognitionEngine (exists)
  → DFMPipelineEngine (exists)
  → Customer Confirmation UI (NEW)
  → F360 CAD Model Generation (REWIRE PrintToGeometryEngine)
  → CAD Validation Gate (NEW)
  → F360 CAM Setup + Operations (NEW ORCHESTRATION)
  → PRISM Physics Override (WIRE SpeedFeedOrchestrator)
  → F360 Toolpath Generation (exists via bridge)
  → PRISM Simulation Verification (WIRE existing pipeline)
  → Post-Processing (F360 postProcess OR PRISM PostProcessorPipeline)
  → Output: G-code + Setup Sheet + Quote
```

**Key architectural decisions:**
1. F360 simulation is UI-only — PRISM's CNCSimulationPipelineEngine verifies all G-code
2. Novel toolpaths cannot inject XYZ into F360 — PRISM generates G-code from SegmentPoint[] and verifies independently
3. F360 handles standard CAM; PRISM handles novel algorithms; programs merge at G-code level

---

## Relationship to Existing Milestones

- **F360-MS0 through F360-MS5** (existing): Desktop control, panel UI, CAM integration, pipeline integration. These are the INFRASTRUCTURE milestones.
- **F360-AP-MS0 through F360-AP-MS8** (existing): AutoProgram pipeline inside Fusion 360. F360-AP-MS0 is COMPLETE.
- **This roadmap (F360-MS0 through F360-MS4)**: The NEW Print-to-Program pipeline that uses F360 as the CAD/CAM engine, distinct from both above tracks. Uses track code "F360" with a FRESH milestone numbering scheme.

**IMPORTANT:** This roadmap supersedes the Print-to-Program F360 portions of the existing tracks and consolidates them into a clean, linear execution path.

---

## F360-MS0: Foundation — Print-to-F360 CAD Bridge

**Units: 5 | Sessions: 3 | Priority: P0 | Prerequisites: F360-AP-MS0 (complete)**

**Brief:** Rewire PrintToGeometryEngine to output Fusion 360 bridge calls instead of CadQuery scripts. Add customer confirmation UI step after feature extraction. Add CAD validation gate that compares extracted features against generated geometry. Wire into PipelinePage.

### Unit F360-MS0-U01: PrintToGeometryEngine F360 Backend

**Description:** Add a second output mode to PrintToGeometryEngine that emits a sequence of Fusion360LiveBridgeEngine method calls (sketch, extrude, fillet, hole, etc.) instead of CadQuery Python script. The existing CadQuery path remains as fallback. The new path returns a `F360BuildPlan` — an ordered array of bridge operations that the pipeline executor will replay against the live bridge.

**Exit Conditions:**
- PrintToGeometryEngine.convert() accepts `{ target: "cadquery" | "fusion360" }` option
- When target="fusion360", returns `F360BuildPlan` with typed operations matching Fusion360LiveBridgeEngine methods
- All 26+ feature types map to F360 operations (hole→createHole, pocket→sketch+extrude cut, slot→sketch+extrude cut, fillet→createFillet, chamfer→createChamfer, thread→createHole+annotation, counterbore→createHole CB mode, boss→sketch+extrude add)
- Existing CadQuery tests still pass (no regression)
- New F360 build plan tests cover at least 10 feature types
- Unit conversion correct: all dimensions in mm, F360 bridge handles mm→cm internally

**Dependencies:** None (F360-AP-MS0 already provides the bridge endpoints)

**Files to modify:**
- `H:/PRISM/mcp-server/src/engines/PrintToGeometryEngine.ts` — add F360 backend, F360BuildPlan type
- `H:/PRISM/mcp-server/src/__tests__/print-to-geometry.test.ts` — add F360 output tests

**Estimated effort:** 80 (Implementer, sonnet-4.6)

---

### Unit F360-MS0-U02: F360 Build Plan Executor

**Description:** Create `F360BuildPlanExecutorEngine` that takes an F360BuildPlan from U01 and replays it against Fusion360LiveBridgeEngine. Handles sequential execution (sketch must complete before extrude), error recovery (retry failed operations), and returns a manifest of created features with their F360 internal names/IDs for downstream CAM reference.

**Exit Conditions:**
- Engine accepts F360BuildPlan, executes operations sequentially via Fusion360LiveBridgeEngine
- Returns execution manifest: `{ features_created: { plan_id, f360_feature_name, f360_body_name, success }[] }`
- Retry logic: up to 2 retries per failed operation with 500ms backoff
- If a feature fails after retries, logs warning but continues (partial model is better than no model)
- Health check before execution: calls bridge `/health` endpoint, aborts if F360 not connected
- Integration test with mock bridge passes (at least 8 test cases)

**Dependencies:** F360-MS0-U01

**Files to create:**
- `H:/PRISM/mcp-server/src/engines/F360BuildPlanExecutorEngine.ts`
- `H:/PRISM/mcp-server/src/__tests__/f360-build-plan-executor.test.ts`

**Estimated effort:** 85 (Implementer, sonnet-4.6)

---

### Unit F360-MS0-U03: Customer Confirmation UI Step

**Description:** Add a confirmation step in the PipelinePage between feature extraction and CAD generation. Displays extracted features (from BlueprintOCREngine + FeatureRecognitionEngine) as an editable table: feature type, dimensions, tolerance, confidence score. Customer can approve, reject individual features, or add missing features before CAD generation proceeds. This prevents wasting F360 compute on incorrect interpretations.

**Exit Conditions:**
- PipelinePage has new "Confirm Features" stage between "Analyze Print" and "Generate CAD"
- Feature table displays: type, dimensions (diameter, depth, width, length), tolerance, confidence, approve/reject toggle
- "Add Feature" button allows manual feature entry with the same schema
- "Approve All" and "Reject Low Confidence" (< 0.6) bulk actions
- Approved feature list is passed to PrintToGeometryEngine as the input
- Stage skippable via "Auto-Approve" checkbox for trusted/repeat parts
- React component renders correctly with mock data (test with 5-15 features)

**Dependencies:** None (can be built in parallel with U01/U02)

**Files to create:**
- `H:/PRISM/mcp-server/web/src/components/FeatureConfirmationTable.tsx`
- `H:/PRISM/mcp-server/web/src/components/FeatureConfirmationTable.test.tsx`

**Files to modify:**
- `H:/PRISM/mcp-server/web/src/pages/PipelinePage.tsx` — add confirmation stage

**Estimated effort:** 75 (Implementer, sonnet-4.6)

---

### Unit F360-MS0-U04: CAD Validation Gate

**Description:** After F360 creates the 3D model, validate that the generated geometry matches the extracted features. Uses `Fusion360LiveBridgeEngine.getGeometryDetail()` to read back body volumes, bounding boxes, face/edge counts. Compares against expected values from BlueprintAnalysis. Flags discrepancies: missing features (expected holes not present), dimensional errors (bounding box mismatch > 2%), unexpected features.

**Exit Conditions:**
- `CADValidationGateEngine` compares F360 geometry against BlueprintAnalysis expectations
- Checks: bounding box within 2% of expected, body count matches expected, volume within 10% (accounts for features)
- Uses `getGeometryDetail()` for actual model data and `getFeatureCandidates()` for feature verification
- Returns validation report: `{ pass: boolean, checks: { name, expected, actual, pass, delta_pct }[], warnings: string[] }`
- If validation fails, pipeline halts with actionable error (e.g., "Pocket #3 missing — depth was 0mm in blueprint")
- 6+ test cases covering: perfect match, missing feature, wrong dimensions, empty model, partial model

**Dependencies:** F360-MS0-U02 (needs executor to create model first)

**Files to create:**
- `H:/PRISM/mcp-server/src/engines/CADValidationGateEngine.ts`
- `H:/PRISM/mcp-server/src/__tests__/cad-validation-gate.test.ts`

**Estimated effort:** 80 (Architect, opus-4.6)

---

### Unit F360-MS0-U05: Pipeline Wiring — Print to Validated F360 CAD

**Description:** Wire the full MS0 pipeline end-to-end: BlueprintOCREngine → FeatureRecognitionEngine → DFMPipelineEngine → CustomerConfirmation → PrintToGeometryEngine(target=fusion360) → F360BuildPlanExecutor → CADValidationGate. Update PipelinePage to show all stages with progress. Add this as a new pipeline mode in AutoPrintToProgramBridgeEngine.

**Exit Conditions:**
- AutoPrintToProgramBridgeEngine accepts `cad_target: "fusion360" | "cadquery"` option
- When `cad_target="fusion360"`, routes through F360BuildPlanExecutor instead of CadQuery script generation
- PipelinePage `fusion360` stage triggers the full F360 CAD pipeline
- Integration test: mock print → features → F360 build plan → execution → validation (end-to-end)
- Error handling: if F360 not connected, falls back to CadQuery with user notification
- Pipeline timing logged per stage

**Dependencies:** F360-MS0-U01, U02, U03, U04

**Files to modify:**
- `H:/PRISM/mcp-server/src/engines/AutoPrintToProgramBridgeEngine.ts` — add F360 route
- `H:/PRISM/mcp-server/web/src/pages/PipelinePage.tsx` — wire stages
- `H:/PRISM/mcp-server/src/engines/index.ts` — export new engines

**Files to create:**
- `H:/PRISM/mcp-server/src/__tests__/f360-print-to-cad-e2e.test.ts`

**Estimated effort:** 85 (Integrator, sonnet-4.6)

---

**Gate:**
- All 5 units pass tests
- Build: `npx tsc --noEmit` = 0 errors
- Integration test: PDF print → feature extraction → F360 CAD model → validation gate passes
- CadQuery fallback still works (anti-regression)

---

## F360-MS1: F360 CAM Integration — Auto-Programming

**Units: 6 | Sessions: 4 | Priority: P0 | Prerequisites: F360-MS0**

**Brief:** Orchestrate F360 CAM setup from PRISM feature data. Auto-assign tools from PRISM's 95K tool registry. Override F360 default speeds/feeds with SpeedFeedOrchestrator physics. Generate optimized toolpaths in F360.

### Unit F360-MS1-U01: Feature-to-CAM Operation Mapper

**Description:** Create `FeatureToCamMapperEngine` that maps RecognizedFeature[] to F360 CAM operation specifications. Each feature type maps to one or more CAM operations with the correct strategy. Uses ToolpathStrategyRegistry (762 strategies) filtered to Fusion 360-compatible strategies.

**Exit Conditions:**
- Maps all 22 FeatureType values to F360 CAM operation types
- through_hole → drill/peck_drill, blind_hole → drill, counterbore → drill+counterbore cycle, countersink → drill+countersink, tapped_hole → drill+tap
- pocket_rectangular → adaptive_clear+pocket_2d, pocket_circular → circular_pocket, pocket_freeform → adaptive_clear
- slot_through/slot_blind → slot_mill, keyway → slot_mill with plunge
- face → face_mill, step → contour_2d+face, groove → groove/slot
- boss_circular/boss_rectangular → contour_2d (climb)
- fillet/chamfer → chamfer_mill or contour_2d with tool comp
- contour_2d/3d → contour operation with appropriate stepover
- Returns ordered operation list respecting machining sequence (face first, then roughing, then finishing, holes last)
- 15+ test cases covering each feature type mapping

**Dependencies:** F360-MS0-U04 (needs validated CAD model with feature IDs)

**Files to create:**
- `H:/PRISM/mcp-server/src/engines/FeatureToCamMapperEngine.ts`
- `H:/PRISM/mcp-server/src/__tests__/feature-to-cam-mapper.test.ts`

**Estimated effort:** 85 (Architect, opus-4.6)

---

### Unit F360-MS1-U02: Automated Tool Assignment from PRISM Registry

**Description:** For each mapped CAM operation, select the optimal tool from PRISM's ToolRegistry (95,608 tools). Uses SmartToolSelectorEngine for physics-scored selection (7-factor scoring: diameter fit, reach, flute count, material compatibility, cost, availability, tool life). Converts PRISM tool specs to F360 tool assignment format via `Fusion360LiveBridgeEngine.assignTool()`.

**Exit Conditions:**
- For each CAM operation, queries ToolRegistry with operation constraints (min diameter, required reach, material group)
- SmartToolSelectorEngine returns top-3 candidates ranked by score
- Best candidate auto-assigned unless confidence < 0.7 (then flags for user review)
- Tool assignment includes: tool number, diameter, flute count, corner radius, material, holder
- Handles tool reuse: same tool for multiple compatible operations (reduces tool changes)
- FusionToolExportEngine format used for bridge compatibility
- 10+ test cases including: standard hole, deep pocket (reach check), hard material (tool material selection)

**Dependencies:** F360-MS1-U01

**Files to create:**
- `H:/PRISM/mcp-server/src/engines/F360ToolAssignmentEngine.ts`
- `H:/PRISM/mcp-server/src/__tests__/f360-tool-assignment.test.ts`

**Files to reference (read-only):**
- `H:/PRISM/mcp-server/src/engines/FusionToolExportEngine.ts` — tool format
- `H:/PRISM/mcp-server/src/registries/ToolRegistry.ts` — 95K tools

**Estimated effort:** 80 (Implementer, sonnet-4.6)

---

### Unit F360-MS1-U03: PRISM Physics Override — SpeedFeed Injection

**Description:** After F360 creates operations with default speeds/feeds, override them with PRISM's physics-optimized values from SpeedFeedOrchestratorEngine (8 resolvers, Monte Carlo UQ). For each operation, compute: optimal RPM (from material Vc + tool diameter), optimal feed (from Kienzle force limit + machine power), optimal depths (from deflection + chatter SLD). Push overrides back to F360 via bridge operation update endpoint.

**Exit Conditions:**
- For each F360 operation, calls SpeedFeedOrchestratorEngine.calculate() with operation context (material, tool, machine, engagement)
- Override fields: spindle_speed_rpm, cutting_feedrate_mmpm, ramp_feedrate_mmpm, axial_depth_mm, radial_depth_mm
- Physics sources tracked per parameter: `{ value, source: "kienzle"|"taylor"|"sld"|"thermal", confidence, uncertainty }`
- Chip thinning correction applied for < 50% radial engagement (CTF formula)
- Chatter SLD check: if RPM falls in unstable lobe, shifts to nearest stable RPM
- Machine limit guard: clamp RPM to max_spindle_rpm, feed to max_feed_rate, power to spindle_power_kW
- 12+ test cases covering: aluminum roughing, steel finishing, titanium (thermal limit), small tool (deflection limit)

**Dependencies:** F360-MS1-U02 (needs tool assigned to compute S/F)

**Files to create:**
- `H:/PRISM/mcp-server/src/engines/F360PhysicsOverrideEngine.ts`
- `H:/PRISM/mcp-server/src/__tests__/f360-physics-override.test.ts`

**Files to reference:**
- `H:/PRISM/mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts` — 8 resolvers
- `H:/PRISM/mcp-server/src/physics/constants.ts` — canonical Kienzle/Taylor
- `H:/PRISM/mcp-server/src/engines/ChatterStabilityLobeEngine.ts` — SLD check

**Estimated effort:** 90 (Architect, opus-4.6)

---

### Unit F360-MS1-U04: CAM Setup Creation Orchestrator

**Description:** Create `F360CamSetupOrchestratorEngine` that chains U01-U03 into a single CAM setup flow: create F360 CAM setup → create operations from feature map → assign tools → override S/F → return setup manifest. Handles multi-setup parts (top/bottom, 4-side tombstone) by grouping features by accessible orientation.

**Exit Conditions:**
- Accepts: validated F360 model + RecognizedFeature[] + machine spec + material
- Creates F360 CAM setup via `Fusion360LiveBridgeEngine.createCamSetup()`
- Iterates feature-to-cam map, creates each operation via `createCamOperation()`
- Assigns tools via `assignTool()`
- Overrides S/F via physics engine
- Returns manifest: `{ setup_id, operations: { op_id, feature_id, strategy, tool, speeds_feeds, physics_source }[] }`
- Multi-setup detection: features on bottom face → second setup (flip part)
- PipelineCheckpointManager used for stage recovery
- 6+ integration test cases

**Dependencies:** F360-MS1-U01, U02, U03

**Files to create:**
- `H:/PRISM/mcp-server/src/engines/F360CamSetupOrchestratorEngine.ts`
- `H:/PRISM/mcp-server/src/__tests__/f360-cam-setup-orchestrator.test.ts`

**Estimated effort:** 85 (Integrator, sonnet-4.6)

---

### Unit F360-MS1-U05: Toolpath Generation + Post-Processing

**Description:** After CAM setup is complete, trigger F360 toolpath generation via `Fusion360LiveBridgeEngine.generateToolpaths()` (async with polling). After toolpaths complete, post-process via `postProcess()` to get G-code. Compare F360 post-processed G-code against PRISM's PostProcessorPipelineEngine output for validation.

**Exit Conditions:**
- Calls `generateToolpaths()` for all operations in the setup
- Polls `getToolpathStatus()` with exponential backoff (max 3 minutes timeout)
- On completion, calls `postProcess()` with appropriate post-processor (selected from 150+ CPS files based on machine/controller)
- Returns: `{ gcode_blocks: string[], cycle_time_sec, tool_changes, line_count }`
- Async job tracking: if F360 toolpath takes > 30s, returns job ID for later retrieval
- Error handling: if toolpath fails, returns error with F360's error message + suggested fix
- 4+ test cases (mock bridge responses for toolpath lifecycle)

**Dependencies:** F360-MS1-U04

**Files to create:**
- `H:/PRISM/mcp-server/src/engines/F360ToolpathGeneratorEngine.ts`
- `H:/PRISM/mcp-server/src/__tests__/f360-toolpath-generator.test.ts`

**Estimated effort:** 80 (Implementer, sonnet-4.6)

---

### Unit F360-MS1-U06: Full CAM Pipeline Wiring

**Description:** Wire F360-MS1 into the main pipeline: after CAD validation gate (MS0), flow into CAM setup orchestrator → toolpath generation → post-processing. Update PipelinePage with CAM stages (tool selection, S/F optimization, toolpath generation progress bar, G-code preview).

**Exit Conditions:**
- AutoPrintToProgramBridgeEngine chains: CAD validation → CAM setup → toolpath → post-process
- PipelinePage shows: "Selecting Tools (3/7)" → "Optimizing S/F" → "Generating Toolpaths [45%]" → "Post-Processing"
- G-code preview panel shows first 50 lines with syntax highlighting
- End-to-end test: mock print → F360 CAD → F360 CAM → G-code output
- Timing logged per stage for SLO tracking

**Dependencies:** F360-MS1-U05, F360-MS0-U05

**Files to modify:**
- `H:/PRISM/mcp-server/src/engines/AutoPrintToProgramBridgeEngine.ts` — add CAM stages
- `H:/PRISM/mcp-server/web/src/pages/PipelinePage.tsx` — add CAM UI stages

**Estimated effort:** 80 (Integrator, sonnet-4.6)

---

**Gate:**
- All 6 units pass tests
- Build clean
- Integration test: features → F360 CAM setup → tools assigned → S/F overridden → toolpath generated → G-code output
- Physics values validated against SpeedFeedOrchestrator standalone (no drift)

---

## F360-MS2: Simulation & Verification Loop

**Units: 5 | Sessions: 3 | Priority: P1 | Prerequisites: F360-MS1**

**Brief:** Wire PRISM's CNCSimulationPipelineEngine to verify F360-generated G-code. Collision detection, stock model verification, physics-aware force/thermal/deflection analysis per block. Simulation report generation. This is PRISM's own Vericut-class simulation — NOT F360's UI-only simulation.

### Unit F360-MS2-U01: G-Code Ingestion from F360

**Description:** Take the G-code output from F360-MS1-U05 and prepare it for PRISM's CNCSimulationPipelineEngine. Parse G-code into `gcode_blocks: string[]`, extract tool change points (M6/T commands), map tool numbers back to PRISM tool registry entries (for accurate geometry in simulation), extract stock dimensions from the CAM setup.

**Exit Conditions:**
- Parses F360 post-processed G-code into SimulationInput format
- Extracts tool changes and maps T-numbers to PRISM ToolRegistry entries (diameter, length, flutes, holder)
- Extracts stock dimensions from F360 CAM setup (or uses BlueprintAnalysis overall_dimensions + stock allowance)
- Extracts machine brand/model for kinematics lookup
- Handles multi-tool programs (tool change sequences)
- 8+ test cases with real G-code patterns (Fanuc, Haas, Okuma dialects)

**Dependencies:** F360-MS1-U05

**Files to create:**
- `H:/PRISM/mcp-server/src/engines/F360GCodeIngestionEngine.ts`
- `H:/PRISM/mcp-server/src/__tests__/f360-gcode-ingestion.test.ts`

**Estimated effort:** 75 (Implementer, sonnet-4.6)

---

### Unit F360-MS2-U02: Collision Detection on F360 Programs

**Description:** Wire CollisionDetectionEngine to check F360-generated G-code for tool/holder collisions with part, fixture, and machine components. Uses AABB + OBB with 2mm safety margins. If collisions detected, report block numbers, collision zones, and penetration depths.

**Exit Conditions:**
- Feeds SimulationInput (from U01) into CNCSimulationPipelineEngine collision substage
- CollisionDetectionEngine checks: tool vs part, holder vs part, tool vs fixture, rapid moves vs stock
- Returns: `collisions: { block, zone, penetration_mm, position }[]`
- HARD BLOCK: if any collision detected, pipeline halts with error + remediation suggestions
- Remediation suggestions: "Raise Z clearance to Xmm", "Use shorter tool holder", "Add retract before rapid"
- 6+ test cases including: clean program (0 collisions), rapid-into-stock, holder collision

**Dependencies:** F360-MS2-U01

**Files to modify:**
- `H:/PRISM/mcp-server/src/engines/CNCSimulationPipelineEngine.ts` — wire to F360 pipeline context

**Files to create:**
- `H:/PRISM/mcp-server/src/__tests__/f360-collision-detection.test.ts`

**Estimated effort:** 80 (Implementer, sonnet-4.6)

---

### Unit F360-MS2-U03: Stock Model Verification

**Description:** Wire VoxelStockEngine to track material removal through the F360 program. Verify that the final stock model matches the target part geometry (from the validated F360 CAD model). Report: stock removed percentage, remaining material locations (uncut areas), over-cut zones.

**Exit Conditions:**
- VoxelStockEngine initializes with raw stock dimensions
- Simulates material removal block-by-block through the G-code
- Compares final voxel model against target part geometry
- Reports: `{ stock_removed_pct, uncut_zones: { position, volume_mm3 }[], overcut_zones: { position, depth_mm }[] }`
- Uncut threshold: flag zones where > 0.5mm material remains above target surface
- Overcut threshold: flag zones where tool cut > 0.1mm below target surface
- 4+ test cases

**Dependencies:** F360-MS2-U01

**Files to create:**
- `H:/PRISM/mcp-server/src/__tests__/f360-stock-verification.test.ts`

**Files to reference:**
- `H:/PRISM/mcp-server/src/engines/VoxelStockIntegrationEngine.ts`

**Estimated effort:** 80 (Implementer, sonnet-4.6)

---

### Unit F360-MS2-U04: Physics-Aware Block Analysis

**Description:** Wire PhysicsAwareSimulationEngine to analyze every cutting block in the F360 G-code: Kienzle cutting force, Loewen-Shaw temperature rise, cantilever beam deflection. Flag blocks exceeding machine power, thermal limits, or deflection tolerances. This is the per-block analysis that makes PRISM's simulation Vericut-class.

**Exit Conditions:**
- For each cutting block (G1/G2/G3 with active tool): compute force (N), temperature (C), deflection (um), MRR (cm3/min)
- Force check: Fc < machine spindle power limit (considering efficiency)
- Temperature check: tool-chip interface temperature < tool material limit (carbide: 800C, HSS: 600C, ceramic: 1200C)
- Deflection check: tool deflection < tolerance/4 (conservative rule)
- Returns BlockResult[] with physics data per block
- Summary: max force, max temp, max deflection, safety score (0-1)
- 8+ test cases covering different materials and tools

**Dependencies:** F360-MS2-U01

**Files to reference:**
- `H:/PRISM/mcp-server/src/engines/CNCSimulationPipelineEngine.ts` — existing physics substage

**Files to create:**
- `H:/PRISM/mcp-server/src/__tests__/f360-physics-block-analysis.test.ts`

**Estimated effort:** 85 (Architect, opus-4.6)

---

### Unit F360-MS2-U05: Simulation Report + Pipeline Integration

**Description:** Generate AUTO-DIFF simulation report (via SimulationReportEngine) and wire the complete simulation loop into the Print-to-Program pipeline. If simulation passes, G-code is approved. If simulation fails (collisions, physics violations), pipeline halts with report. Update PipelinePage with simulation results visualization.

**Exit Conditions:**
- SimulationReportEngine generates HTML/JSON report: collision map, force chart, temperature chart, stock removal animation data
- Pipeline integration: after post-processing, simulation runs automatically
- If simulation PASSES: pipeline continues to output (G-code + setup sheet + quote)
- If simulation FAILS: pipeline halts, report shows failures with block numbers and remediation
- PipelinePage shows: simulation progress bar, pass/fail badge, expandable report
- Iterative remediation: if force too high, auto-reduce feed by 10% and re-simulate (max 3 iterations)
- 4+ integration test cases

**Dependencies:** F360-MS2-U02, U03, U04

**Files to modify:**
- `H:/PRISM/mcp-server/src/engines/AutoPrintToProgramBridgeEngine.ts` — add simulation stage
- `H:/PRISM/mcp-server/web/src/pages/PipelinePage.tsx` — add simulation UI

**Files to create:**
- `H:/PRISM/mcp-server/src/__tests__/f360-simulation-e2e.test.ts`

**Estimated effort:** 85 (Integrator, sonnet-4.6)

---

**Gate:**
- All 5 units pass tests
- Build clean
- Integration test: F360 G-code → simulation pipeline → collision check → physics analysis → report
- No regressions in existing CNCSimulationPipelineEngine tests (14 existing test files)

---

## F360-MS3: Novel Toolpath Integration

**Units: 5 | Sessions: 3 | Priority: P1 | Prerequisites: F360-MS2**

**Brief:** Convert PRISM novel toolpath coordinates (SegmentPoint[]) to G-code. Verify through PRISM simulation pipeline. Hybrid approach: F360 for standard operations + PRISM for novel operations. Merge G-code programs.

### Unit F360-MS3-U01: SegmentPoint-to-GCode Converter

**Description:** Create `NovelToolpathPostProcessorEngine` that converts PRISM's SegmentPoint[] output (from NovelToolpathEngine's 6 algorithms: TGAR, HRAF, MTHZD, CFSF, PTDC, VCER) into standard G-code. Each SegmentPoint has x/y/z coordinates, optional i/j/k axis vectors (5-axis), and per-point feed/RPM overrides. This is the critical bridge between PRISM's novel algorithms and machine execution.

**Exit Conditions:**
- Converts SegmentPoint[] to G-code blocks (G0 rapids, G1 linear, G2/G3 arcs where applicable)
- Handles per-point feed rate: each G1 block includes F-word from segment's feed_mmmin
- Handles per-point RPM: inserts S-word changes when RPM changes between segments
- 5-axis support: when i/j/k present, outputs A/B/C axis positions (machine-dependent mapping)
- Arc fitting: consecutive linear segments that form an arc within 0.005mm tolerance are consolidated to G2/G3
- Outputs controller-specific dialect (Fanuc/Haas/Siemens/Okuma) based on controller parameter
- Includes tool header (T, M6, S, M3, G43 H) and footer (M5, M9, M30)
- 12+ test cases covering all 6 algorithms' output patterns

**Dependencies:** None (uses existing NovelToolpathEngine output types)

**Files to create:**
- `H:/PRISM/mcp-server/src/engines/NovelToolpathPostProcessorEngine.ts`
- `H:/PRISM/mcp-server/src/__tests__/novel-toolpath-post-processor.test.ts`

**Files to reference:**
- `H:/PRISM/mcp-server/src/engines/NovelToolpathEngine.ts` — SegmentPoint type
- `H:/PRISM/mcp-server/src/engines/PostProcessorPipelineEngine.ts` — dialect patterns

**Estimated effort:** 85 (Architect, opus-4.6)

---

### Unit F360-MS3-U02: Novel Toolpath Simulation Verification

**Description:** Run PRISM-generated novel toolpath G-code through the full CNCSimulationPipelineEngine. Verify collision safety, force limits, thermal limits, deflection. This is critical because novel toolpaths have never been verified by a commercial CAM system — PRISM's simulation is the only safety gate.

**Exit Conditions:**
- Novel G-code feeds into CNCSimulationPipelineEngine (same pipeline as F360 programs)
- CollisionDetectionEngine verifies novel paths are collision-free
- PhysicsAware analysis verifies per-block forces within machine limits
- NovelToolpathSimulatorEngine physics compared against CNCSimulationPipelineEngine physics (cross-validation)
- Delta between novel simulator and full simulator < 15% on force, < 20% on temperature
- If novel toolpath fails simulation, flags specific segments with violations
- 6+ test cases covering each of the 6 novel algorithms

**Dependencies:** F360-MS3-U01, F360-MS2 (simulation pipeline must be wired)

**Files to create:**
- `H:/PRISM/mcp-server/src/__tests__/novel-toolpath-simulation-verify.test.ts`

**Estimated effort:** 80 (Tester, sonnet-4.6)

---

### Unit F360-MS3-U03: Hybrid Program Merger

**Description:** Create `HybridProgramMergerEngine` that merges standard F360 G-code (from MS1) with novel PRISM G-code (from MS3-U01) into a single program. The merger handles: tool change sequencing, WCS consistency, safety retracts between standard and novel sections, coolant mode transitions.

**Exit Conditions:**
- Accepts: `{ standard_gcode: string[], novel_gcode: string[], merge_strategy: "interleave" | "append" | "replace_ops" }`
- "interleave": novel operations inserted at their correct sequence position among standard ops
- "append": novel operations added after all standard operations
- "replace_ops": novel operations replace specific standard operations (by operation ID)
- Safety retract (G28 G91 Z0 or G53 Z0) inserted between standard and novel sections
- Tool change sequences properly ordered (no duplicate tool loads)
- Program header combines both sources' metadata
- Line numbering continuous across merged sections
- 8+ test cases covering all merge strategies

**Dependencies:** F360-MS3-U01

**Files to create:**
- `H:/PRISM/mcp-server/src/engines/HybridProgramMergerEngine.ts`
- `H:/PRISM/mcp-server/src/__tests__/hybrid-program-merger.test.ts`

**Estimated effort:** 80 (Implementer, sonnet-4.6)

---

### Unit F360-MS3-U04: Novel Toolpath Selection Logic

**Description:** Determine which operations should use PRISM novel toolpaths vs standard F360 toolpaths. Decision based on: feature complexity, material difficulty, tolerance requirements, and whether a novel algorithm provides measurable advantage (force reduction, cycle time, surface quality). Not every operation benefits from novel toolpaths — simple drilling stays standard.

**Exit Conditions:**
- For each CAM operation, evaluates: "Would a PRISM novel algorithm outperform standard F360 strategy?"
- Decision criteria:
  - TGAR: pockets in heat-sensitive materials (titanium, Inconel) with depth > 2xD
  - HRAF: finishing operations where chatter risk is > 30% (from SLD analysis)
  - CFSF: large surface finishing where Ra < 0.8um required
  - PTDC: operations with tool L/D ratio > 5 (deflection-prone)
  - VCER: deep pockets (depth > 3xD) with chip evacuation concerns
  - MTHZD: complex parts requiring 3+ different tool types in one zone
- Returns: `{ op_id, use_novel: boolean, algorithm?: string, expected_improvement_pct, reason }[]`
- Conservative default: use standard unless novel improvement > 15%
- 10+ test cases

**Dependencies:** F360-MS1-U01 (needs feature-to-cam map)

**Files to create:**
- `H:/PRISM/mcp-server/src/engines/NovelToolpathSelectionEngine.ts`
- `H:/PRISM/mcp-server/src/__tests__/novel-toolpath-selection.test.ts`

**Estimated effort:** 85 (Architect, opus-4.6)

---

### Unit F360-MS3-U05: Hybrid Pipeline Integration

**Description:** Wire the complete hybrid pipeline: standard ops go through F360 CAM, novel ops go through PRISM NovelToolpathEngine, both get simulated, programs get merged, final merged program gets full simulation. Update PipelinePage to show hybrid status.

**Exit Conditions:**
- Pipeline branching: operations marked "novel" route through NovelToolpathEngine, others through F360 CAM
- Both paths converge at HybridProgramMerger
- Merged program goes through CNCSimulationPipelineEngine (full verification)
- PipelinePage shows: which operations are standard vs novel, with algorithm names
- End-to-end test: part with mix of simple holes (standard) and deep pocket (TGAR novel)
- Performance: novel toolpath computation < 10s for typical operations

**Dependencies:** F360-MS3-U01, U02, U03, U04

**Files to modify:**
- `H:/PRISM/mcp-server/src/engines/AutoPrintToProgramBridgeEngine.ts` — add hybrid branching

**Files to create:**
- `H:/PRISM/mcp-server/src/__tests__/f360-hybrid-pipeline-e2e.test.ts`

**Estimated effort:** 85 (Integrator, sonnet-4.6)

---

**Gate:**
- All 5 units pass tests
- Build clean
- Integration test: feature analysis → novel selection → standard+novel generation → merge → simulate → pass
- Novel toolpath G-code validated by simulation (0 collisions, forces within limits)

---

## F360-MS4: Production Hardening

**Units: 4 | Sessions: 2 | Priority: P2 | Prerequisites: F360-MS3**

**Brief:** Error recovery and retry logic. Async job tracking for long toolpath generations. Multi-setup support (flip parts, multiple ops). Setup sheet + quote integration. End-to-end testing with real parts.

### Unit F360-MS4-U01: Error Recovery + Async Job Tracking

**Description:** Harden the pipeline for production use. F360 bridge operations can fail (F360 crash, network timeout, Fusion kernel error). Implement: per-stage retry with exponential backoff, checkpoint/resume (restart from last successful stage), async job queue for long-running toolpath generations (> 30s), progress notification via WebSocket or polling.

**Exit Conditions:**
- PipelineCheckpointManager saves state after each stage to `data/state/F360-pipeline/`
- Resume capability: pipeline can restart from any checkpoint without re-running prior stages
- Async job tracking: long toolpath generations return job ID, pollable via `/api/pipeline/status/:jobId`
- F360 disconnection handling: detect via failed health check, pause pipeline, retry connection for up to 60s
- Error classification: transient (retry), permanent (abort with error), user-fixable (pause and prompt)
- 8+ test cases covering: mid-pipeline failure+resume, F360 timeout, async completion

**Dependencies:** All prior milestones

**Files to modify:**
- `H:/PRISM/mcp-server/src/engines/AutoPrintToProgramBridgeEngine.ts` — add checkpoint + retry
- `H:/PRISM/mcp-server/src/engines/F360BuildPlanExecutorEngine.ts` — add retry logic

**Files to create:**
- `H:/PRISM/mcp-server/src/engines/F360PipelineJobTrackerEngine.ts`
- `H:/PRISM/mcp-server/src/__tests__/f360-error-recovery.test.ts`

**Estimated effort:** 85 (Implementer, sonnet-4.6)

---

### Unit F360-MS4-U02: Multi-Setup Support

**Description:** Handle parts requiring multiple setups: flip part (machine top, flip, machine bottom), 4th axis rotary indexing (machine 4 sides), tombstone (multiple parts per fixture face). Each setup gets its own F360 CAM setup, tool list, and G-code program. Setups share tool assignments where possible to minimize magazine changes.

**Exit Conditions:**
- Multi-setup detection: features on bottom face → 2 setups, features on 4+ faces → consider indexing
- Each setup creates independent F360 CAM setup with correct WCS origin
- Tool magazine optimization: shared tools placed in magazine once, unique tools per setup noted
- Setup sequencing: rough all setups before finishing (reduce thermal distortion for precision parts)
- Output: `{ setups: { setup_number, wcs, orientation, operations[], gcode, cycle_time_s }[] }`
- Total cycle time = sum of setup times + setup change time (configurable, default 5 min)
- 6+ test cases: single setup, 2-setup flip, 4-side indexing

**Dependencies:** F360-MS1-U04 (CAM orchestrator)

**Files to create:**
- `H:/PRISM/mcp-server/src/engines/F360MultiSetupEngine.ts`
- `H:/PRISM/mcp-server/src/__tests__/f360-multi-setup.test.ts`

**Estimated effort:** 85 (Architect, opus-4.6)

---

### Unit F360-MS4-U03: Setup Sheet + Quote Output

**Description:** Generate production output package: setup sheet (PDF with operation list, tool list, S/F per tool, workholding instructions, WCS diagram) and instant quote (material cost, machine time, tool cost, overhead). Uses existing SetupSheetEngine and InstantQuoteEngine, wired to F360 pipeline data.

**Exit Conditions:**
- Setup sheet includes: part number, material, machine, each operation (tool, strategy, S/F, cycle time), total cycle time, workholding notes
- Setup sheet format: JSON (for web display) + PDF (for shop floor)
- Quote: material cost (from stock dimensions + material price), machine cost (cycle time * hourly rate), tool cost (prorated from tool life), markup
- Quote scales with quantity (setup amortization over batch size)
- Wire existing SetupSheetEngine and InstantQuoteEngine / QuoteEstimatorEngine
- PipelinePage shows: downloadable setup sheet + quote summary panel
- 4+ test cases

**Dependencies:** F360-MS4-U02 (multi-setup data), F360-MS1-U05 (G-code)

**Files to create:**
- `H:/PRISM/mcp-server/src/engines/F360OutputPackageEngine.ts`
- `H:/PRISM/mcp-server/src/__tests__/f360-output-package.test.ts`

**Files to reference:**
- `H:/PRISM/mcp-server/src/engines/InstantQuoteEngine.ts`
- `H:/PRISM/mcp-server/src/engines/QuoteEstimatorEngine.ts`

**Estimated effort:** 75 (Implementer, sonnet-4.6)

---

### Unit F360-MS4-U04: End-to-End Validation with Real Parts

**Description:** Validate the entire Print-to-Program pipeline end-to-end using real engineering drawings and CAD models from the training data (BOX/PART MODELS FOR LEARNING ENGINE/BATCH 1/ — 30 parts). Run at least 5 parts through the full pipeline: print → features → F360 CAD → F360 CAM → physics override → simulation → output. Compare generated programs against reference programs (BOX/PRISM FOLDER FROM HOME/PRISM PROGRAM EXAMPLES/ — 7 programs).

**Exit Conditions:**
- 5+ real parts run through complete pipeline without crashes
- Generated G-code compiles (no syntax errors in G-code validator)
- Simulation passes for all 5 parts (0 collisions, forces within limits)
- Cycle times within 30% of reference programs (if available)
- Physics values (S/F) within 20% of manufacturer recommendations for the material/tool combo
- Documented: which parts succeeded, which required manual intervention, failure modes
- Performance: full pipeline < 5 minutes per part (excluding F360 toolpath generation time)
- Results captured in test report for MS4 gate review

**Dependencies:** All F360-MS4 units

**Files to create:**
- `H:/PRISM/mcp-server/src/__tests__/f360-real-parts-e2e.test.ts`

**Estimated effort:** 90 (Tester + Architect, opus-4.6)

---

**Gate:**
- All 4 units pass tests
- Build clean
- 5 real parts validated end-to-end
- Error recovery demonstrated (mid-pipeline failure + resume)
- Multi-setup part validated (minimum 2-setup part)
- Setup sheet + quote generated for all test parts
- Performance: < 5 min per part (excluding F360 toolpath time)

---

## Dependency Graph

```
F360-MS0 (Print-to-F360 CAD Bridge)
  ├── U01: PrintToGeometry F360 backend
  │     └── U02: Build Plan Executor
  │           └── U04: CAD Validation Gate
  ├── U03: Customer Confirmation UI (parallel)
  └── U05: Pipeline Wiring (depends on U01-U04)
       │
       ▼
F360-MS1 (F360 CAM Integration)
  ├── U01: Feature-to-CAM Mapper
  │     └── U02: Tool Assignment
  │           └── U03: Physics Override
  │                 └── U04: CAM Setup Orchestrator
  │                       └── U05: Toolpath + Post-Process
  └── U06: Full CAM Wiring (depends on U05 + MS0-U05)
       │
       ▼
F360-MS2 (Simulation & Verification)
  ├── U01: G-Code Ingestion
  │     ├── U02: Collision Detection
  │     ├── U03: Stock Verification (parallel with U02)
  │     └── U04: Physics Block Analysis (parallel with U02, U03)
  └── U05: Report + Integration (depends on U02-U04)
       │
       ▼
F360-MS3 (Novel Toolpath Integration)
  ├── U01: SegmentPoint-to-GCode
  │     ├── U02: Novel Simulation Verify
  │     └── U03: Hybrid Program Merger
  ├── U04: Novel Selection Logic (parallel, depends on MS1-U01)
  └── U05: Hybrid Pipeline Integration (depends on U01-U04)
       │
       ▼
F360-MS4 (Production Hardening)
  ├── U01: Error Recovery + Async Jobs
  ├── U02: Multi-Setup Support
  ├── U03: Setup Sheet + Quote Output
  └── U04: End-to-End Real Parts Validation (depends on U01-U03)
```

## Summary

| Milestone | Units | Sessions | Priority | Key Deliverable |
|-----------|-------|----------|----------|-----------------|
| F360-MS0  | 5     | 3        | P0       | Print → F360 CAD with validation |
| F360-MS1  | 6     | 4        | P0       | F360 CAM with physics-optimized S/F |
| F360-MS2  | 5     | 3        | P1       | Vericut-class simulation on F360 G-code |
| F360-MS3  | 5     | 3        | P1       | Novel toolpath G-code + hybrid merge |
| F360-MS4  | 4     | 2        | P2       | Production hardening + real part validation |
| **Total** | **25**| **15**   |          | **Complete Print-to-Program via F360** |

## Engines Leveraged (NOT rebuilt)

| Engine | Lines | Role |
|--------|-------|------|
| BlueprintOCREngine | 606 | PDF → dimensions/GD&T |
| FeatureRecognitionEngine | 302 | 22+ feature types |
| DFMPipelineEngine | 400+ | 4-engine DFM validation |
| PrintToGeometryEngine | 522 | Blueprint → 3D model (rewired) |
| Fusion360LiveBridgeEngine | 1,200 | HTTP bridge to F360 |
| SpeedFeedOrchestratorEngine | 2,851 | Physics S/F (8 resolvers) |
| CNCSimulationPipelineEngine | 800+ | Vericut-class simulation |
| NovelToolpathEngine | 1,100+ | 6 novel algorithms |
| NovelToolpathSimulatorEngine | 500+ | Novel physics verification |
| PostProcessorPipelineEngine | 2,000+ | 38-stage post-processing |
| CollisionDetectionEngine | 600+ | AABB+OBB collision |
| VoxelStockEngine | 500+ | 3D stock tracking |
| SmartToolSelectorEngine | 400+ | 7-factor tool selection |
| InstantQuoteEngine | 300+ | Cost estimation |

## New Engines to Create

| Engine | Milestone | Purpose |
|--------|-----------|---------|
| F360BuildPlanExecutorEngine | MS0-U02 | Replay F360 build plans against bridge |
| CADValidationGateEngine | MS0-U04 | Validate F360 model against blueprint |
| FeatureToCamMapperEngine | MS1-U01 | Map features → CAM operations |
| F360ToolAssignmentEngine | MS1-U02 | Auto-assign tools from 95K registry |
| F360PhysicsOverrideEngine | MS1-U03 | Override F360 S/F with physics |
| F360CamSetupOrchestratorEngine | MS1-U04 | Chain CAM setup flow |
| F360ToolpathGeneratorEngine | MS1-U05 | Async toolpath + post-process |
| F360GCodeIngestionEngine | MS2-U01 | Parse F360 G-code for simulation |
| NovelToolpathPostProcessorEngine | MS3-U01 | SegmentPoint[] → G-code |
| HybridProgramMergerEngine | MS3-U03 | Merge standard + novel G-code |
| NovelToolpathSelectionEngine | MS3-U04 | Decide standard vs novel per op |
| F360PipelineJobTrackerEngine | MS4-U01 | Async job queue + progress |
| F360MultiSetupEngine | MS4-U02 | Multi-setup orchestration |
| F360OutputPackageEngine | MS4-U03 | Setup sheet + quote packaging |
