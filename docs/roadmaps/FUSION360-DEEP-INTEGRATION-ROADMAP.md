# PRISM Fusion 360 Desktop Control + Deep Integration Roadmap

**Track ID**: F360
**Unified Roadmap Phase**: 22
**Version**: 1.0.0
**Created**: 2026-03-31
**Owner**: Claude (backend) + Codex (panel UI)
**Design Spec**: `docs/specs/2026-03-15-fusion360-prism-addin-design.md`
**Total Units**: 24 | **Total Sessions**: 20 | **Est. LOC**: ~4,500

---

## Cross-Roadmap Links

| Related Roadmap | Purpose | Shared Components |
|-----------------|---------|-------------------|
| `docs/roadmaps/INVENTOR-AUTOMATION-ROADMAP.md` (INV) | Inventor COM bridge for parametric CAD generation | **HSM .cps post processor format** is shared (Fusion HSM ≡ Inventor HSM). `FusionCPSParserEngine` will be generalized to `HSMCPSParserEngine` in INV-2 so both systems can use it. `CAMAddInFrameworkEngine` is shared harness. |
| `resources/HYPERMILL/HYPERMILL_SKILL_ROADMAP.md` (HM) | hyperMILL expert skill library | **Strategy taxonomy** (trochoidal/HPC/5-axis) applied identically in Fusion CAM add-in. |
| `resources/FUSION360/FUSION360_SKILL_ROADMAP.md` (F360-SKILL) | Fusion CAM skill library (sibling doc) | Parallel — skill doc is content-focused, this roadmap is integration-focused. |
| `MILL-AI-INTEGRATION-ROADMAP-v2.md` (MILL-INTEG) | Master mill harden roadmap | Fusion bridge feeds MILL-INTEG MS5 dynamic registry. |

**Shared engines**: `MultiCamKnowledgeEngine`, `CAMAddInFrameworkEngine`, `FusionCPSParserEngine` (→ `HSMCPSParserEngine`), `MillMasterOrchestratorFacadeEngine`.

---

## Brief

Validate, stabilize, and extend PRISM's existing Fusion 360 integration from untested infrastructure into a production-grade desktop-controlled CAM intelligence layer. Includes: real-hardware testing of the existing Python add-in + TypeScript bridge, a panel UI for physics-backed optimization inside Fusion's CAM workspace, deep CAM read/write integration, Windows desktop control for visual verification, and full print-to-program pipeline through Fusion 360.

**Revenue Impact**: Fusion 360 has 8.5M+ users. Phase F360-2 completion = minimum viable marketplace product. No competitor offers Kienzle/Taylor physics-backed S/F optimization as a Fusion add-in.

---

## Existing Leverage (DO NOT REBUILD)

| Component | Path | Lines | Status |
|-----------|------|-------|--------|
| Python HTTP Add-In (17+ endpoints) | `mcp-server/scripts/fusion360-addin/fusion360_api_server.py` | ~400 | Built, never tested on real F360 |
| Add-In Manifest | `mcp-server/scripts/fusion360-addin/fusion360_api_server.manifest` | 12 | Built |
| Fusion360LiveBridgeEngine (TS client) | `src/engines/Fusion360LiveBridgeEngine.ts` | ~500 | Wired to cadDispatcher (13 actions) |
| Fusion360CodeGeneratorEngine | `src/engines/Fusion360CodeGeneratorEngine.ts` | ~400 | Wired to cadDispatcher |
| FusionToolExportEngine | `src/engines/FusionToolExportEngine.ts` | ~200 | Wired to camDispatcher |
| FusionToolSyncEngine | `src/engines/FusionToolSyncEngine.ts` | ~200 | Wired to camDispatcher |
| FusionCPSParserEngine (180 .cps) | `src/engines/FusionCPSParserEngine.ts` | ~300 | Wired to camDispatcher |
| CAMAddInFrameworkEngine | `src/engines/CAMAddInFrameworkEngine.ts` | ~400 | Wired (7 CAM systems) |
| Design Spec (full UX) | `docs/specs/2026-03-15-fusion360-prism-addin-design.md` | 115 | Complete |
| Mock tests (bridge + codegen) | `src/__tests__/fusion360-bridge.test.ts` + `fusion360-code-generator.test.ts` | ~250 | Pass |
| Fusion 360 CAM tips | `src/data/fusion360-cam-tips.ts` + `fusion360-cam-tips-ext.ts` | ~500 | Built |

---

## Dependency Graph

```
MP-0 (Contract Surface) ─┐
                         ├─> F360-1 (Foundation) ─> F360-2 (Panel UI) ─> F360-3 (CAM)
MP-1A (Shop Floor) ──────┘                                                    │
                                                                              v
                                          F360-4 (Desktop Control) ──> F360-5 (Pipeline)
                                                                              │
                                                                              v
                                                                    F360-6 (Advanced)
```

**Parallel start**: F360-1 can begin immediately — existing engines are already wired. MP-0/MP-1A gates only block F360-2+ (panel needs stable dispatchers and catalog queries).

---

## Role Matrix

| Role | Name | Model | Scope |
|------|------|-------|-------|
| R1 | Systems Architect | Opus | API surface design, integration contracts |
| R2 | Python Implementer | Sonnet | Fusion 360 Python add-in code |
| R3 | TS Implementer | Sonnet | TypeScript engine code (PRISM side) |
| R4 | Test Engineer | Sonnet | Mock + live integration tests |
| R5 | Reviewer | Opus | Phase gate review, physics validation |
| R6 | Integrator | Sonnet | Dispatcher wiring, cross-engine plumbing |
| R8 | Documentarian | Haiku | Setup guides, marketplace listing |

---

## MCP Full Utilization Protocol

Every session MUST use:
1. `prism_session:context_boot` — hydrate from prior session
2. `prism_session:dispatcher_map` — discover available actions
3. `prism_session:memory_recall` — load cross-session knowledge
4. `prism_cam:cam_smart_tool` — physics-scored tool selection
5. `prism_cad:cad_f360_status` — bridge connectivity check
6. `prism_session:auto_checkpoint` — incremental state save

---

# Phase F360-1: Foundation Testing & Stabilization

**Objective**: Install the Python add-in in real Fusion 360, validate all 17+ endpoints, fix bugs, add connection resilience, and verify end-to-end part creation.
**Sessions**: 3 | **Units**: 6 | **Primary Role**: R4 (Test Engineer)

---

## SESSION F360-1-S1: Add-In Installation and Endpoint Validation

### SMART CONFIG
```yaml
role: R4 (Test Engineer)
model: sonnet
effort: 85
context_budget: high
compact_after: 3 units
```

### KNOWLEDGE SOURCES
- `mcp-server/scripts/fusion360-addin/fusion360_api_server.py` (all endpoint handlers)
- `mcp-server/scripts/fusion360-addin/fusion360_api_server.manifest`
- `mcp-server/src/engines/Fusion360LiveBridgeEngine.ts` (TypeScript client interfaces)
- `mcp-server/src/__tests__/fusion360-bridge.test.ts` (mock test patterns)
- `docs/specs/2026-03-15-fusion360-prism-addin-design.md` (install instructions)
- Fusion 360 API reference: help.autodesk.com/cloudhelp/ENU/Fusion-360-API-Ref/

### INTENT
The machinist installs the PRISM Bridge add-in in Fusion 360 and verifies every endpoint works against the real application. A compatibility matrix documents pass/fail for all 17+ endpoints.

---

### U-F360-01: Add-In Installation and Smoke Test

**effort**: 70 | **role**: R2 | **depends_on**: []

**WORK**:
1. Copy add-in folder to `%APPDATA%/Autodesk/Autodesk Fusion 360/API/AddIns/PRISMBridge/`
2. Enable add-in: Fusion 360 > Utilities > Add-Ins > PRISMBridge > Run
3. Verify /health returns `{"status": "ok", "port": 18360}`
4. Verify /status returns document info (null with no doc, populated with doc open)
5. Test with fresh document via POST /new

**4-LOOP**:
- **BUILD**: Execute install, verify HTTP server starts on port 18360
- **SCRUTINIZE**: Check for Python import errors (adsk.core), threading issues, port conflicts
- **GAP FILL**: Fix startup bugs. Verify no global-scope API calls before run()
- **TIE UP**: Document install steps, startup time, platform-specific issues

**EXIT GATE**:
- [ ] Add-in runs in Fusion 360 without errors
- [ ] /health returns 200 with `{"status": "ok"}`
- [ ] /status returns valid Fusion360Status JSON
- [ ] Server survives 5+ minutes without crash

**FORGE-TRIPLE**:
- Hook: `pre_unit: verify_fusion360_installed` (check %APPDATA%/Autodesk path)
- Action: `cad_f360_status` (cadDispatcher connectivity test)
- Skill: `/fusion-generate` (verify recognizes live bridge)

**ROLLBACK**:
- FILES_CREATED: `%APPDATA%/Autodesk/.../AddIns/PRISMBridge/` (copy)
- FILES_MODIFIED: none on PRISM side
- ABORT_CRITERIA: Add-in fails to start after 3 attempts
- ROLLBACK_PROCEDURE: Remove PRISMBridge folder from AddIns

**FEATURE CASCADE**:
- NEW_HOOKS: verify_fusion360_installed
- NEW_ACTIONS: none (existing cad_f360_status)
- NEW_SKILLS: none
- AVAILABLE_TO: [F360-1-S1, F360-1-S2, F360-1-S3]

---

### U-F360-02: Endpoint-by-Endpoint Live Validation

**effort**: 85 | **role**: R4 | **depends_on**: [U-F360-01]

**WORK**:
1. Test all CAD endpoints sequentially: POST /sketch (5 shape types: rectangle, circle, line, arc, polygon), POST /extrude, POST /fillet, POST /chamfer, POST /revolve, POST /hole, POST /pattern, POST /combine, POST /shell
2. Test utility endpoints: GET /geometry, POST /export (STEP, STL), POST /undo, POST /parameter, POST /execute
3. Test tool library endpoints: POST /tool-import, GET /tool-library, GET /tool-library/search, DELETE /tool-library/<name>
4. Compare actual response JSON against TypeScript interfaces (SketchResult, OperationResult, ExportResult, GeometryResult)
5. Verify mm-to-cm conversions (Fusion uses centimeters internally, add-in divides by 10)

**4-LOOP**:
- **BUILD**: Create test script calling each endpoint sequentially against live F360
- **SCRUTINIZE**: Compare actual JSON vs TypeScript types. Check unit conversions. Check error format consistency
- **GAP FILL**: Document every discrepancy. Priority: crashes > type mismatches > missing fields > edge cases
- **TIE UP**: Produce compatibility matrix (endpoint x pass/fail x notes). All passing endpoints confirmed

**EXIT GATE**:
- [ ] All 17+ endpoints tested against live Fusion 360
- [ ] Compatibility matrix complete with pass/fail/notes
- [ ] At least 12/17 endpoints pass without modification
- [ ] mm-to-cm conversion verified for all numeric parameters
- [ ] Response shapes match TypeScript interface expectations

**FORGE-TRIPLE**:
- Hook: `post_unit: log_endpoint_compatibility_matrix`
- Action: `cad_f360_sketch`, `cad_f360_extrude`, `cad_f360_export` (live validation)
- Skill: `/test` (smart test runner)

**ROLLBACK**:
- FILES_CREATED: compatibility-matrix.md (documentation only)
- FILES_MODIFIED: none
- ABORT_CRITERIA: Fewer than 8/17 endpoints pass
- ROLLBACK_PROCEDURE: POST /undo to revert F360 operations

---

### U-F360-03: Bug Fixes and API Hardening

**effort**: 80 | **role**: R2 | **depends_on**: [U-F360-02]

**WORK**:
1. Fix all failing endpoints from compatibility matrix
2. Standardize error response format: `{"success": false, "error": "descriptive message"}`
3. Handle edge cases: empty sketch, zero-depth extrude, invalid export path, no document open
4. Verify mm-to-cm conversion accuracy for ALL numeric parameters
5. Add request logging to Fusion 360's text commands window (optional)
6. Test DELETE /tool-library endpoint

**4-LOOP**:
- **BUILD**: Fix each bug from compatibility matrix. Focus on _select_edges(), revolve axis, tool-import format, Windows path handling
- **SCRUTINIZE**: Re-run all endpoint tests. Verify no regressions. Check error response consistency
- **GAP FILL**: Add missing error cases. Verify CORS headers. Test concurrent requests
- **TIE UP**: 100% endpoint pass rate. Update api_server.py version. Re-generate compatibility matrix

**EXIT GATE**:
- [ ] 100% of endpoints pass live testing (17/17)
- [ ] No unhandled exceptions — all errors return structured JSON
- [ ] TypeScript bridge calls every endpoint without type errors
- [ ] Error responses follow `{"success": false, "error": "..."}` format

**FORGE-TRIPLE**:
- Hook: `post_unit: verify_all_endpoints_pass`
- Action: `cad_f360_geometry` (final integration check)
- Skill: `/de-sloppify` (cleanup pass)

**ROLLBACK**:
- FILES_MODIFIED: `mcp-server/scripts/fusion360-addin/fusion360_api_server.py`
- ABORT_CRITERIA: Fixes introduce new failures
- ROLLBACK_PROCEDURE: `git checkout -- mcp-server/scripts/fusion360-addin/fusion360_api_server.py`

---

### /compact checkpoint — carry forward: compatibility matrix, fix list, endpoint pass/fail state

---

## SESSION F360-1-S2: Connection Resilience and End-to-End Test

### SMART CONFIG
```yaml
role: R3 (TS Implementer) + R4 (Test Engineer)
model: sonnet
effort: 85
context_budget: medium
compact_after: 3 units
```

### KNOWLEDGE SOURCES
- `mcp-server/src/engines/Fusion360LiveBridgeEngine.ts` (current client, lines 14-18: config constants)
- `mcp-server/src/engines/VideoActionExtractorEngine.ts` (ExtractedAction types)
- Compatibility matrix from F360-1-S1

### INTENT
PRISM auto-detects Fusion 360 availability, maintains heartbeat, auto-reconnects on restart, and can create a complete machinist-relevant part through the bridge pipeline.

---

### U-F360-04: Heartbeat, Retry, and Connection Resilience

**effort**: 75 | **role**: R3 | **depends_on**: [U-F360-03]

**WORK**:
1. Add heartbeat poller to Fusion360LiveBridgeEngine: GET /health every 5 seconds
2. Implement connection state machine: DISCONNECTED -> CONNECTING -> CONNECTED -> RECONNECTING
3. Add exponential backoff retry: 3 attempts, 1s/2s/4s delays
4. Add event callbacks: onConnectionLost, onConnectionRestored
5. Handle Fusion 360 restart (new document context, state lost)
6. Update cadDispatcher actions to check connection state before dispatch

**4-LOOP**:
- **BUILD**: Implement heartbeat, state machine, retry logic in LiveBridgeEngine
- **SCRUTINIZE**: Test: F360 running->closed, closed->opened, rapid-fire during reconnection
- **GAP FILL**: Handle orphaned timers, memory leaks. Add "last known state" cache
- **TIE UP**: Connection resilience across F360 restart cycles. No leaks

**EXIT GATE**:
- [ ] Heartbeat detects F360 availability within 10 seconds
- [ ] Auto-reconnects within 15 seconds of F360 restart
- [ ] No crashed operations during brief disconnects
- [ ] Connection state exposed via `cad_f360_status` action

**FORGE-TRIPLE**:
- Hook: `post_unit: verify_heartbeat_operational`
- Action: `cad_f360_status` (enhanced with connection state)
- Skill: `/forge-engine` (engine modification)

**ROLLBACK**:
- FILES_MODIFIED: `src/engines/Fusion360LiveBridgeEngine.ts`
- ROLLBACK_PROCEDURE: `git checkout -- src/engines/Fusion360LiveBridgeEngine.ts`

---

### U-F360-05: End-to-End Integration Test (L-Bracket)

**effort**: 90 | **role**: R4 | **depends_on**: [U-F360-04]

**WORK**:
1. Create L-bracket via MCP bridge: POST /new -> /sketch (80x50mm rect) -> /extrude (10mm) -> /sketch (50x30mm on XZ) -> /extrude (10mm, join) -> /fillet (3mm vertical edges) -> /hole (6.35mm at 4 positions)
2. GET /geometry — verify volume (~28,000mm3 minus holes/fillets), face count, edge count
3. POST /export (STEP) — verify file exists and opens
4. Test POST /undo — verify geometry changes
5. Measure total pipeline latency
6. Write integration test: `fusion360-bridge-live.test.ts`

**4-LOOP**:
- **BUILD**: Execute full L-bracket creation via Fusion360LiveBridgeEngine methods
- **SCRUTINIZE**: Verify geometry within 5% of expected. STEP file valid. Pipeline under 30s
- **GAP FILL**: Debug any step that fails. Test parameter operations
- **TIE UP**: Full round-trip documented. Integration test repeatable

**EXIT GATE**:
- [ ] Complete L-bracket created in Fusion 360 via bridge
- [ ] Geometry within 5% of expected values
- [ ] STEP file exported and openable
- [ ] Total pipeline time under 30 seconds
- [ ] Integration test written and documented

**FORGE-TRIPLE**:
- Hook: `post_unit: export_live_test_results`
- Action: `cad_f360_export` (STEP export in sequence)
- Skill: `/verify-loop` (build + test + review)

**ROLLBACK**:
- FILES_CREATED: `src/__tests__/fusion360-bridge-live.test.ts`
- ROLLBACK_PROCEDURE: Delete test document in F360. Remove test file

---

### U-F360-06: Video-to-Live-CAD Validation

**effort**: 80 | **role**: R4 | **depends_on**: [U-F360-05]

**WORK**:
1. Create sample ExtractedAction sequence (5-8 actions): sketch_create -> sketch_rectangle -> extrude -> fillet -> sketch_circle -> cut_extrude -> export
2. Execute via Fusion360LiveBridgeEngine.executeActions()
3. Verify ActionExecutionResult: success, actions_executed count, geometry non-null
4. Test error recovery: what happens if mid-sequence action fails?
5. Document action type coverage (which CADActionTypes work live)

**4-LOOP**:
- **BUILD**: Execute action sequence against live F360
- **SCRUTINIZE**: Verify result counts, geometry validity, error handling
- **GAP FILL**: Fix action type mappings. Test low-confidence actions
- **TIE UP**: Pipeline produces real parts. Action coverage documented

**EXIT GATE**:
- [ ] 5+ action sequence executes successfully against real F360
- [ ] At least 8/13 CADActionTypes work in live mode
- [ ] Error in mid-sequence handled gracefully (partial result)
- [ ] Action type coverage matrix documented

**FORGE-TRIPLE**:
- Hook: `post_unit: log_video_to_cad_results`
- Action: `cad_f360_execute_code` (fallback for unmapped actions)
- Skill: `/video-replay` (existing skill)

**ROLLBACK**:
- FILES_CREATED: none
- ROLLBACK_PROCEDURE: Undo all operations in test document

---

### /compact checkpoint — carry forward: heartbeat status, integration test results, action coverage

---

## F360-1-GATE: Foundation Phase Gate

```yaml
gate_id: F360-1-GATE
omega_floor: 0.85
build_required: true
test_required: true
anti_regression: true
reviewer_role: R5 (Opus)
criteria:
  - All 17+ endpoints pass live Fusion 360 testing
  - Heartbeat/retry operational, reconnects within 15s
  - End-to-end L-bracket creation verified with geometry
  - Video-to-live-CAD executes 5+ action sequences
  - No unhandled exceptions in Python add-in
  - TypeScript types match actual response shapes
```

**FEATURE CASCADE**: F360-1 completion unblocks F360-2 (Panel UI), F360-3 (CAM Integration), F360-5 (Full Pipeline)

---

# Phase F360-2: PRISM Panel Add-In

**Objective**: Build the Fusion 360 panel UI from the design spec, enabling material selection, physics-backed optimization, parameter review, and G-code generation from within Fusion's CAM workspace.
**Sessions**: 4 | **Units**: 5 | **Primary Role**: R2 (Python Implementer)

---

## SESSION F360-2-S1: Panel Registration and API Client

### SMART CONFIG
```yaml
role: R2 (Python Implementer)
model: sonnet
effort: 80
context_budget: medium
compact_after: 3 units
```

### KNOWLEDGE SOURCES
- `docs/specs/2026-03-15-fusion360-prism-addin-design.md` (full UX design)
- `mcp-server/scripts/fusion360-addin/fusion360_api_server.py` (existing add-in pattern)
- `mcp-server/src/engines/CAMAddInFrameworkEngine.ts` (framework template)
- Fusion 360 API: adsk.core.Workspace, ToolbarPanel, CommandDefinition

### INTENT
The machinist opens Fusion 360's CAM workspace and sees a "PRISM" panel with connection indicator and command buttons. The panel can call PRISM's MCP server for physics data.

---

### U-F360-07: Panel Entry Point and CAM Workspace Registration

**effort**: 75 | **role**: R2 | **depends_on**: [U-F360-05]

**WORK**:
1. Create `prism_addin.py` with Fusion 360 add-in lifecycle (run/stop)
2. Register PRISM panel in CAM workspace toolbar
3. Add command definitions: Material Select, Optimize, Review Parameters, Generate G-code
4. Implement connection status indicator (green/red)
5. Handle coexistence with PRISMBridge API server add-in

**EXIT GATE**:
- [ ] PRISM panel visible in Fusion 360 CAM workspace
- [ ] 4 command buttons present and clickable
- [ ] Connection indicator shows green when PRISM MCP reachable
- [ ] Coexists with PRISMBridge add-in without conflicts

**FORGE-TRIPLE**:
- Hook: `pre_unit: verify_design_spec_loaded`
- Action: `cam_addin_ui_panel` (CAMAddInFrameworkEngine)
- Skill: `/forge-engine`

**ROLLBACK**:
- FILES_CREATED: `scripts/fusion360-addin/prism_addin.py`
- ROLLBACK_PROCEDURE: Remove prism_addin.py, unregister panel commands

---

### U-F360-08: PRISM API Client (Python HTTP Client)

**effort**: 75 | **role**: R2 | **depends_on**: [U-F360-07]

**WORK**:
1. Create `prism_api_client.py` with 5 methods:
   - `get_smart_tool(material, operation, machine)` -> `cam_smart_tool`
   - `get_speed_feed(material, tool, operation)` -> `cam_unified_generate`
   - `verify_parameters(params)` -> `cam_verify`
   - `get_chatter_rpm(tool, doc, material)` -> `cam_chatter_rpm`
   - `get_cost_estimate(features)` -> `cam_cost_feature`
2. Use `urllib.request` only (no pip dependencies — F360 has limited packages)
3. Implement timeout handling (5s default, 15s for generation)
4. Add response caching for material lookups

**EXIT GATE**:
- [ ] All 5 PRISM API methods callable from F360 Python
- [ ] Responses parsed correctly (m/min, mm/tooth, mm units)
- [ ] Timeout handling prevents UI freeze (max 15s)
- [ ] Works with urllib.request only

**FORGE-TRIPLE**:
- Hook: `post_unit: verify_prism_api_reachable`
- Action: `cam_addin_http_client` (CAMAddInFrameworkEngine)
- Skill: `/sfc-quick-start`

**ROLLBACK**:
- FILES_CREATED: `scripts/fusion360-addin/prism_api_client.py`
- ROLLBACK_PROCEDURE: Delete file

---

### U-F360-09: Material Selection Panel UI

**effort**: 80 | **role**: R2 | **depends_on**: [U-F360-08]

**WORK**:
1. Build material dropdown grouped by ISO category (P/M/K/N/S/H)
2. Pre-populate top 20 materials per group from PRISM catalog
3. Implement material search field
4. On selection: call PRISM for physics properties (kc1.1, mc, hardness, thermal conductivity)
5. Display material badge with resolved physics parameters
6. Cache selection in Fusion 360 document attributes

**EXIT GATE**:
- [ ] Dropdown shows 6 ISO groups with common materials
- [ ] Selection triggers PRISM API call and displays physics badge
- [ ] Selection persists when panel closed/reopened
- [ ] Unknown material shows warning with manual entry option

**FORGE-TRIPLE**:
- Hook: `post_unit: verify_material_selection_functional`
- Action: `material_lookup` (material registry query)
- Skill: `/material-lookup`

**ROLLBACK**:
- FILES_CREATED: `scripts/fusion360-addin/prism_panel.py`
- ROLLBACK_PROCEDURE: Revert prism_panel.py

---

### /compact checkpoint — carry forward: panel registration status, API client methods, material UI

---

## SESSION F360-2-S2: Optimization and G-Code Generation

### SMART CONFIG
```yaml
role: R2 (Python Implementer)
model: sonnet
effort: 90
context_budget: high
compact_after: 2 units
```

### KNOWLEDGE SOURCES
- `docs/specs/2026-03-15-fusion360-prism-addin-design.md` (Steps 3-5)
- Fusion 360 CAM API: adsk.cam.CAM, Setup, Operation
- PRISM physics engines: SpeedFeedOrchestrator, ChatterStabilityLobe, KienzleForceModel

### INTENT
The machinist clicks "Optimize" and sees PRISM's physics dashboard with recommended speeds/feeds, risk indicators, and tribal tips. Clicking "Generate" produces verified G-code with a setup sheet.

---

### U-F360-10: Optimize Button and Physics Dashboard

**effort**: 90 | **role**: R2 | **model**: sonnet | **depends_on**: [U-F360-09]

**WORK**:
1. Read current Fusion 360 CAM setup directly via `adsk.cam.CAM` Python API (stock, machine, tool, operation type — NOTE: this is F360-internal Python, NOT the HTTP endpoints from U-F360-13 which adds PRISM-typed external endpoints later)
2. Send context to PRISM via `cam_smart_tool` + `cam_unified_generate`
3. Build physics dashboard: Tools tab (scored 0-100), Parameters tab (S/F/DOC sliders), Physics tab (deflection/chatter/power/thermal gauges)
4. Implement parameter edit -> real-time physics re-evaluation (3s max)
5. Add "Accept All" button to apply recommendations to F360 CAM operations
6. Gauge colors: green < 50%, yellow 50-80%, red > 80%

**EXIT GATE**:
- [ ] Optimize reads F360 CAM context and calls PRISM
- [ ] Physics dashboard displays S/F, deflection, chatter, power values
- [ ] Parameter change triggers re-evaluation within 3 seconds
- [ ] "Accept All" applies recommendations to F360 operations
- [ ] Gauge colors match risk thresholds

**FORGE-TRIPLE**:
- Hook: `post_unit: verify_physics_dashboard_renders`
- Action: `cam_smart_tool` (physics-scored selection)
- Skill: `/process-health`

**ROLLBACK**:
- FILES_MODIFIED: `scripts/fusion360-addin/prism_panel.py`
- ROLLBACK_PROCEDURE: Revert optimization handler

---

### U-F360-11: G-Code Generation and Setup Sheet

**effort**: 80 | **role**: R2 | **depends_on**: [U-F360-10]

**WORK**:
1. Implement "Generate" button: gather all parameters, call `cam_unified_generate` with `production_mode: true`
2. Display results: G-code preview, setup sheet, tribal tips (from 3,700+ database), cost breakdown
3. Select post-processor from PRISM's 20 controller dialects
4. "Save" button exports G-code and setup sheet to user directory
5. Add G-code validation warnings (rapids near stock, missing coolant codes)

**EXIT GATE**:
- [ ] Generate produces G-code via PRISM pipeline
- [ ] G-code uses correct post-processor for selected machine
- [ ] Setup sheet includes all tools with descriptions
- [ ] Tribal tips shown (1+ relevant tip per operation)
- [ ] Cost breakdown displayed per-feature

**FORGE-TRIPLE**:
- Hook: `post_unit: verify_gcode_output_valid`
- Action: `cam_unified_generate` (full pipeline)
- Skill: `/program-gen`

**ROLLBACK**:
- FILES_MODIFIED: `scripts/fusion360-addin/prism_panel.py`
- ROLLBACK_PROCEDURE: Revert generation handler

---

## F360-2-GATE: Panel UI Phase Gate

```yaml
gate_id: F360-2-GATE
omega_floor: 0.85
criteria:
  - Panel visible in F360 CAM workspace with 4 commands
  - Material selection with ISO group dropdown functional
  - Optimize reads CAM context, displays physics dashboard
  - Generate produces G-code with setup sheet
  - Parameter changes trigger physics re-evaluation
  - Connection indicator works (green/red)
```

**FEATURE CASCADE**: F360-2 = minimum viable product for Fusion 360 Marketplace listing.

---

# Phase F360-3: CAM Integration

**Objective**: Deep read/write integration with Fusion 360's CAM workspace — push tool libraries, read operation setups, configure parameters from physics, manage post-processors.
**Sessions**: 4 | **Units**: 4 | **Primary Role**: R6 (Integrator)

---

### U-F360-12: Tool Library Push to Fusion

**effort**: 80 | **role**: R6 | **model**: sonnet | **depends_on**: [U-F360-05, U-F360-08]

**WORK**:
1. Call `prism_session:context_boot` and `prism_session:dispatcher_map` to hydrate session
2. Create `tool_library_sync.py`: call PRISM `fusion_export_tool_library` (camDispatcher) for Fusion JSON format
3. Use FusionToolSyncEngine (`src/engines/FusionToolSyncEngine.ts`) partitioning (max 500 tools per library)
4. Push via POST /tool-import for each partition
5. Track sync state in `~/.prism/fusion360/sync-state.json` (which tools synced, when, hash diff)
6. Show progress dialog in F360 during sync
7. Verify tool geometry renders (cutter + holder + shaft 3D preview per FusionTool interface)

**4-LOOP**:
- **BUILD**: Create `tool_library_sync.py`. Import FusionToolExportEngine output format. Push 10-tool test batch
- **SCRUTINIZE**: Verify tool count matches. Check geometry fields (DC, LCF, OAL, NOF). Inspect holder segments render. Test with duplicate tool names
- **GAP FILL**: Handle library name conflicts (append timestamp). Handle failed imports (retry 3x, skip, report). Test 500+ tool batch to verify partitioning. Run `npx vitest fusion360-bridge.test.ts` — 0 regressions
- **TIE UP**: All tools synced. Sync state file correct. Library browser shows PRISM tools with 3D geometry preview

**EXIT GATE**:
- [ ] PRISM tools appear in F360 tool library browser (verified visually or via GET /tool-library)
- [ ] Tool geometry renders in 3D preview (DC, LCF, holder profile visible)
- [ ] Library partitioning keeps each <=500 tools (verified with 600-tool test batch)
- [ ] Sync state JSON tracks toolIds, lastSync timestamp, toolCount per library
- [ ] Job-specific export creates library with only tools from current program

**FORGE-TRIPLE**:
- Hook: `post_unit: verify_tool_library_sync_count` — blocks if synced count < expected
- Action: `fusion_export_tool_library`, `fusion_sync_tools` (camDispatcher, verified in DISPATCHER_DIGEST)
- Skill: `/tool-catalog`

---

### U-F360-13: CAM Workspace Read (Operations, Stock, Machine, WCS)

**effort**: 90 | **role**: R2 | **model**: sonnet | **depends_on**: [U-F360-10]

**WORK**:
1. Call `prism_session:context_boot` to hydrate session context
2. Add GET /cam/setup endpoint to Python add-in using `adsk.cam.CAM`, `adsk.cam.Setup` API
3. Add GET /cam/operations (detailed parameters: RPM, feed, DOC, stepover, strategy per operation)
4. Add GET /cam/tools (tool geometry, tool number, description for each tool in setup)
5. Add GET /cam/stock (bounding box dimensions in mm, stock type: box/cylinder/mesh)
6. Update `src/engines/Fusion360LiveBridgeEngine.ts` with typed methods: `getCAMSetup()`, `getCAMOperations()`, `getCAMTools()`, `getCAMStock()`
7. Map F360 machine names to PRISM's MachineRegistry (910 machines) — fuzzy match on make/model
8. Add 4 new actions to `src/tools/dispatchers/cadDispatcher.ts`: `cad_f360_cam_setup`, `cad_f360_cam_operations`, `cad_f360_cam_tools`, `cad_f360_cam_stock`

**4-LOOP**:
- **BUILD**: Implement 4 Python endpoints + 4 TypeScript bridge methods + 4 dispatcher actions. Run `npx tsc --noEmit` — 0 errors
- **SCRUTINIZE**: Test each endpoint against real F360 with a 3-operation CAM setup (facing, pocketing, drilling). Verify response JSON matches TypeScript interfaces. Check mm accuracy
- **GAP FILL**: Handle empty CAM workspace (no setup). Handle multi-setup documents. Map unknown machines to "generic" with warning. Run `npx vitest fusion360-bridge.test.ts` — 0 regressions
- **TIE UP**: All 4 endpoints return valid typed data. Machine name fuzzy-matched. Stock dimensions within 0.01mm of F360 value

**EXIT GATE**:
- [ ] All 4 CAM read endpoints return valid JSON from real F360 (tested with 3-op setup)
- [ ] Machine name maps to PRISM catalog entry (or returns `{matched: false, suggestion: "..."}`)
- [ ] Operation parameters readable: RPM (number), feed (mm/min), DOC (mm), stepover (mm)
- [ ] Stock bounding box dimensions accurate within 0.01mm vs F360 document attributes
- [ ] TypeScript bridge has typed methods with JSDoc for all 4 CAM reads
- [ ] 4 new cadDispatcher actions registered and callable via MCP

**FORGE-TRIPLE**:
- Hook: `post_unit: verify_cam_read_endpoints` — verifies 4 endpoints return 200 with valid schema
- Action: `cad_f360_cam_setup` (new, added to cadDispatcher)
- Skill: `/cam-toolpath-guide`

---

### /compact checkpoint — carry forward: tool sync status, 4 CAM read endpoints, machine mapping

---

### U-F360-14: CAM Operation Parameter Push

**effort**: 85 | **role**: R3 | **model**: sonnet | **depends_on**: [U-F360-13, U-F360-12]

**WORK**:
1. Add POST /cam/operation/set-params endpoint to Python add-in using `adsk.cam.Operation.parameters`
2. Accept parameters: `spindle_speed` (RPM), `feed_rate` (mm/min), `depth_of_cut` (mm), `stepover` (mm), `strategy` (string)
3. Validate against machine limits: RPM <= MachineRegistry.maxSpindleSpeed, feed <= MachineRegistry.maxFeedRate
4. Write parameters to Fusion 360 Operation objects via CAM API
5. Add POST /cam/operation/set-tool (assign tool from synced PRISM library by tool ID)
6. Build round-trip: call `cam_smart_tool` -> push S/F to F360 -> GET /cam/operations -> verify values match within tolerance
7. Import physics constants from `src/physics/constants.ts` for validation bounds

**4-LOOP**:
- **BUILD**: Implement set-params and set-tool Python endpoints. Update bridge. Run `npx tsc --noEmit` — 0 errors
- **SCRUTINIZE**: Push S/F for 3 materials (6061-T6 N=700, 4140 P=1800, Ti-6Al-4V S=2800). Verify values match Kienzle kc1.1 bounds. Test machine limit rejection (push RPM > max)
- **GAP FILL**: Handle locked operations. Handle tool not found in library. Test push to operation with no tool assigned. Verify round-trip: pushed RPM read back within ±1 RPM
- **TIE UP**: PRISM-optimized S/F flow directly into F360 operations. Round-trip verified. Machine limits enforced

**EXIT GATE**:
- [ ] PRISM-optimized S/F pushed to F360 operations (3 materials tested)
- [ ] Parameters persist in F360 document after save/reopen
- [ ] Tool assignment from synced library works (tool ID matches)
- [ ] Round-trip verified: push RPM -> read back -> delta < 1 RPM; push feed -> read back -> delta < 0.1 mm/min
- [ ] Machine limit validation: RPM > max rejected with error message naming the limit
- [ ] Cutting power check: power < 80% of spindle curve at pushed RPM (from `src/physics/constants.ts`)

**FORGE-TRIPLE**:
- Hook: `post_unit: verify_cam_param_push` — round-trip comparison, blocks if delta > tolerance
- Action: `cam_smart_tool` (camDispatcher, verified exists), `cad_f360_cam_operations` (new, reads back)
- Skill: `/auto-speed-feed`

---

### U-F360-15: Post-Processor Selection and Configuration

**effort**: 75 | **role**: R6 | **model**: sonnet | **depends_on**: [U-F360-14]

**WORK**:
1. Read installed .cps files from F360 via `adsk.cam.PostProcessor` API or desktop control fallback
2. Match against PRISM's FusionCPSParserEngine (`src/engines/FusionCPSParserEngine.ts`) — 180 .cps files with parsed metadata
3. Recommend best post-processor using: machine match score + capability overlap + controller dialect
4. Push post-processor configuration: use PostProcessorPipelineEngine (`src/engines/PostProcessorPipelineEngine.ts`, 38 stages) for dialect selection from 20 controller types
5. Falls back to generic Fanuc 0i if no match (F360's default fanuc.cps)
6. Round-trip: push post config -> read back -> verify dialect matches

**4-LOOP**:
- **BUILD**: Implement CPS reader, matcher, and configuration push. Wire to PostProcessorPipelineEngine for dialect selection
- **SCRUTINIZE**: Test with 3 machines: Haas VF-4 (Fanuc), Siemens 840D, Mazak Integrex (Mazatrol). Verify correct .cps selected for each. Check output format matches expected G-code header
- **GAP FILL**: Handle no matching .cps (fallback to fanuc.cps). Handle machine with multiple valid posts (rank by capability score). Run `npx vitest` on affected test files — 0 regressions
- **TIE UP**: Post-processor auto-selected and configured for 3+ machine types. Fallback works. Round-trip verified

**EXIT GATE**:
- [ ] Available post-processors enumerated from F360 installation (count matches installed .cps files)
- [ ] Matched against PRISM CPS metadata with confidence score (0-100) per match
- [ ] Correct post selected for 3 test machines (Haas→fanuc.cps, Siemens→siemens-840d.cps, Mazak→mazak.cps)
- [ ] Post-processor configuration applied to F360 setup (verified via GET /cam/setup)
- [ ] PostProcessorPipelineEngine dialect selection wired (not just CPS parsing)
- [ ] Fallback to generic Fanuc 0i when no match (verified with unknown machine name)

**FORGE-TRIPLE**:
- Hook: `post_unit: verify_post_selection` — verifies post matches machine type
- Action: `cam_cps_parse` (camDispatcher), `cam_post_select` (new action for PostProcessorPipelineEngine)
- Skill: `/cps-analyze`

---

## F360-3-GATE: CAM Integration Phase Gate

```yaml
gate_id: F360-3-GATE
omega_floor: 0.80
criteria:
  - Tool libraries synced with correct geometry
  - CAM setup readable (operations, stock, machine, WCS)
  - Parameters pushable from PRISM to F360 operations
  - Post-processor auto-selected and configured
  - Full cycle: read context -> optimize -> push params -> generate G-code
```

---

# Phase F360-4: Windows Desktop Control

**Objective**: Install and configure Windows desktop automation for visual verification and fallback operations the Fusion 360 API doesn't cover.
**Sessions**: 3 | **Units**: 3 | **Primary Role**: R1 (Systems Architect)

---

### U-F360-16: Install Windows-MCP as MCP Server

**effort**: 70 | **role**: R1 | **model**: opus | **depends_on**: []

**WORK**:
1. Evaluate 3 candidates using scored decision matrix:

| Criterion (weight) | Windows-MCP (4,952 stars) | Terminator (1,381 stars) | MCPControl (306 stars) |
|---------------------|---------------------------|--------------------------|------------------------|
| F360 compat (30%) | Score: ?/10 | Score: ?/10 | Score: ?/10 |
| Latency <500ms (20%) | Score: ?/10 | Score: ?/10 | Score: ?/10 |
| Background mode (15%) | No (steals focus) | Yes (background) | No |
| MCP protocol (15%) | Native MCP | MCP agent | MCP server |
| Maintenance (10%) | Active (2M+ installs) | Active ($2.8M raised) | Low activity |
| Reliability % (10%) | Score: ?/10 (measure) | Score: ?/10 (measure) | Score: ?/10 (measure) |

   Fill scores during evaluation. Select highest weighted total. Document decision rationale.
2. Decision criteria: F360 compatibility, latency < 500ms per action, background operation, MCP protocol support, maintenance activity, reliability >= 90% over 10 attempts
3. Install winner and configure as MCP server in Claude Code `settings.json`
4. Verify basic operations: app launch, click, type, read UI elements (5 operations)
5. Test with Fusion 360: launch, navigate to CAM workspace, read toolbar element text
6. Document capabilities matrix (supported actions x reliability x latency)

**4-LOOP**:
- **BUILD**: Install chosen MCP server. Configure in settings.json. Test 5 basic operations
- **SCRUTINIZE**: Measure latency per operation (target < 500ms). Test reliability (10 attempts, 90%+ success). Verify F360 navigation works
- **GAP FILL**: Handle F360 not running (launch it). Handle UAC prompts. Test with F360 in different states (CAM vs Design workspace)
- **TIE UP**: Desktop control operational. F360 reachable. Capabilities documented with latency/reliability data

**EXIT GATE**:
- [ ] Desktop control MCP server installed and configured in Claude Code settings.json
- [ ] 5 basic operations work: launch (< 3s), click (< 500ms), type (< 500ms), read (< 500ms), screenshot (< 1s)
- [ ] Fusion 360 CAM workspace reachable via desktop control (toolbar elements readable)
- [ ] Capabilities matrix documented: action x supported(Y/N) x avg_latency_ms x reliability_pct
- [ ] Chosen tool justified with decision criteria scores

**FORGE-TRIPLE**:
- Hook: `pre_unit: verify_windows_mcp_installed` — checks MCP server responds to health check
- Action: `desktop_control_status` (new action, register in `src/tools/dispatchers/desktopDispatcher.ts` — created in this unit)
- Skill: `/cowork-connectors` (external integration reference)

---

### U-F360-17: Desktop Control Adapter Engine

**effort**: 85 | **role**: R3 | **model**: sonnet | **depends_on**: [U-F360-16]

**WORK**:
1. Create `src/engines/DesktopControlAdapterEngine.ts` (~350 LOC)
2. Implement 5 core methods: `takeScreenshot()`, `clickElement(selector)`, `typeText(text)`, `readUIElement(selector)`, `navigateMenu(path[])`
3. Add F360-specific helpers: `navigateToCAMWorkspace()`, `openToolLibrary()`, `selectPostProcessor(name)`
4. Integrate with Fusion360LiveBridgeEngine as visual verification layer (screenshot after API call)
5. Add screenshot analysis: compare toolpath preview against expected geometry bounds
6. Register `desktop_control_screenshot` and `desktop_control_click` actions in new `desktopDispatcher.ts`

**4-LOOP**:
- **BUILD**: Create engine file with 5 methods + 3 F360 helpers. Register in index.ts. Create dispatcher. Run `npx tsc --noEmit` — 0 errors
- **SCRUTINIZE**: Test each method against F360. Verify screenshot captures correct viewport. Verify click targets correct element. Test navigateToCAMWorkspace from Design workspace
- **GAP FILL**: Handle F360 window not in foreground. Handle high-DPI scaling. Handle multi-monitor setups. Run `npx vitest` — 0 regressions
- **TIE UP**: Engine operational with 8+ methods. F360 navigable. Screenshots capture toolpath view. Integrated with LiveBridge

**EXIT GATE**:
- [ ] DesktopControlAdapterEngine created with 5 core + 3 F360-specific methods (8 total)
- [ ] F360-specific helpers navigate CAM workspace (verified: Design -> CAM transition)
- [ ] Screenshot capture returns valid image buffer (> 0 bytes, correct dimensions)
- [ ] Integrated with LiveBridge: `bridge.withVisualVerify(operation)` pattern works
- [ ] 2 new dispatcher actions registered: `desktop_control_screenshot`, `desktop_control_click`

**FORGE-TRIPLE**:
- Hook: `post_unit: verify_desktop_adapter`
- Action: `desktop_control_screenshot`, `desktop_control_click`
- Skill: `/fusion-generate` (enhanced with visual verify)

---

### U-F360-18: Fallback Automation for API Gaps

**effort**: 80 | **role**: R3 | **model**: sonnet | **depends_on**: [U-F360-17]

**WORK**:
1. Audit F360 operations: catalog which have API coverage vs require desktop control
2. Identify gaps: settings dialogs, preferences, toolpath simulation playback, post-processor property editing
3. Build desktop control sequences for each gap (click paths documented)
4. Implement operation router in Fusion360LiveBridgeEngine: `try { await api() } catch { await desktopFallback() }`
5. Add visual verification step: screenshot after every API operation, compare against expected UI state
6. Document coverage matrix: operation x API(Y/N) x desktop(Y/N) x manual-only(Y/N)

**4-LOOP**:
- **BUILD**: Audit API coverage. Build fallback sequences. Implement router. Run `npx tsc --noEmit` — 0 errors
- **SCRUTINIZE**: Test router with 5 operations: 2 API-covered (extrude, fillet), 2 fallback (simulation, settings), 1 unsupported. Verify correct routing
- **GAP FILL**: Handle desktop control failure (log error, continue with warning). Test router with F360 closed (both paths fail gracefully). Run `npx vitest` — 0 regressions
- **TIE UP**: All known API gaps automated. Router works. Visual verification catches missed errors. Coverage matrix complete

**EXIT GATE**:
- [ ] API coverage audit complete: N operations cataloged with coverage type
- [ ] Desktop control fallback sequences work for >= 3 identified gaps
- [ ] Router correctly routes: API-first for covered ops, desktop for gaps (tested with 5 ops)
- [ ] Visual verification catches API operation errors (tested: push wrong value, screenshot shows mismatch)
- [ ] Coverage matrix documented: operation x method x reliability x avg_latency

**FORGE-TRIPLE**:
- Hook: `post_unit: verify_fallback_coverage`
- Action: `desktop_control_execute_sequence`
- Skill: `/troubleshoot` (manufacturing problem solver)

---

## F360-4-GATE: Desktop Control Phase Gate

```yaml
gate_id: F360-4-GATE
omega_floor: 0.75
criteria:
  - Desktop control MCP server operational
  - F360 navigable via desktop automation
  - API gap operations covered by fallback
  - Visual verification integrated with API operations
```

---

# Phase F360-5: Full Pipeline Integration

**Objective**: Complete print-to-program pipeline through Fusion 360 — from engineering drawing to physics-optimized G-code with per-block variable speeds/feeds.
**Sessions**: 3 | **Units**: 3 | **Primary Role**: R1 (Systems Architect)

---

### U-F360-19: Print-to-Program Through Fusion 360

**effort**: 95 | **role**: R1 | **model**: opus | **depends_on**: [U-F360-14, U-F360-17]

**WORK**:
1. Call `prism_session:context_boot`, `prism_session:dispatcher_map`, `prism_session:memory_recall`
2. Wire `PrintToProgramPipelineEngine` (`src/engines/PrintToProgramPipelineEngine.ts`) to Fusion 360 bridge
3. Flow: blueprint OCR -> feature recognition -> F360 CAM setup via `cad_f360_cam_setup` -> PRISM optimization via `cam_smart_tool` -> push params via `cad_f360_cam_set_params` -> generate G-code via `cam_unified_generate`
4. Route PostProcessorPipelineEngine (`src/engines/PostProcessorPipelineEngine.ts`, 38 stages) through F360 post-processor selection
5. Apply safety checks: `prism_safety:check_toolpath_collision`, spindle/feed limits from MachineRegistry
6. Verify with L-bracket engineering drawing (from U-F360-05)

**4-LOOP**:
- **BUILD**: Wire pipeline stages to F360 bridge calls. Run `npx tsc --noEmit` — 0 errors
- **SCRUTINIZE**: Execute full pipeline with L-bracket drawing. Verify each stage output. Check G-code uses correct dialect (Fanuc/Siemens per machine). Validate safety gates pass (deflection < 0.05mm, power < 80%)
- **GAP FILL**: Handle OCR failures (manual feature entry fallback). Handle unsupported features. Run `npx vitest fusion360-*` — 0 regressions. Test with 2nd part (simple pocket)
- **TIE UP**: Full pipeline: drawing -> G-code in < 5 minutes. All physics constants from `src/physics/constants.ts`. G-code validated by PostProcessorPipelineEngine

**EXIT GATE**:
- [ ] Blueprint -> G-code pipeline works end-to-end through F360 (tested with L-bracket + pocket part)
- [ ] All 6 pipeline stages execute without manual intervention
- [ ] Output G-code matches expected controller dialect (verified: header, M-codes, formatting)
- [ ] Pipeline time under 5 minutes for simple part (measured with console timer)
- [ ] Safety validation passes: deflection < 0.05mm, power < 80% spindle curve, 0 collision warnings
- [ ] G-code passes `prism_safety:check_toolpath_collision` with 0 critical findings

**FORGE-TRIPLE**:
- Hook: `post_unit: verify_pipeline_e2e` — runs full pipeline, blocks if any stage fails
- Action: `cam_unified_generate` (camDispatcher), `cad_f360_cam_setup` (cadDispatcher)
- Skill: `/print-to-program`

---

### /compact checkpoint — carry forward: pipeline wiring state, safety validation results, G-code output

---

### U-F360-20: Per-Block Auto Speed/Feed into Fusion Operations

**effort**: 90 | **role**: R3 | **model**: sonnet | **depends_on**: [U-F360-19]

**WORK**:
1. Call `PostProcessorPipelineEngine` (`src/engines/PostProcessorPipelineEngine.ts`) per-block S/F variability API
2. For each toolpath block: call `SpeedFeedOrchestratorEngine` (`src/engines/SpeedFeedOrchestratorEngine.ts`, 2,851 LOC, 8 resolvers) with engagement angle, chip load, tool state
3. Apply Kienzle force model: kc = kc1.1 * h^(-mc) with constants from `src/physics/constants.ts` (P=1800, M=2100, K=1100, N=700, S=2800, H=3200)
4. Run `ChatterStabilityLobeEngine` (`src/engines/ChatterStabilityLobeEngine.ts`) — verify RPM not in instability lobes for each block
5. Run `ThermalWearCouplingEngine` (`src/engines/ThermalWearCouplingEngine.ts`, RK4 ODE) — predict tool wear over 50+ blocks
6. Push per-block parameters to F360 via POST /cam/operation/set-params overrides
7. Verify: 50+ block program where each block has unique S/F within physics bounds

**4-LOOP**:
- **BUILD**: Implement per-block S/F loop. Wire SpeedFeedOrchestrator + ChatterStabilityLobe + ThermalWearCoupling. Run `npx tsc --noEmit` — 0 errors
- **SCRUTINIZE**: Verify S/F recommendations pass Monte Carlo UQ with CoV < 5%. Verify no RPM in chatter lobes. Verify tool wear < 0.2mm over program. Check all values within machine limits
- **GAP FILL**: Handle blocks with near-zero engagement (air cuts). Handle tool change boundaries. Run `npx vitest fusion360-*` — 0 regressions. Test with 100+ block program
- **TIE UP**: Per-block S/F applied. Physics bounds verified. Chatter-safe. Wear-predicted. All from canonical constants

**EXIT GATE**:
- [ ] Per-block S/F computed via SpeedFeedOrchestratorEngine and pushed to F360 (50+ blocks)
- [ ] Each block has unique S/F (no two identical unless physics dictates same value)
- [ ] S/F values within Kienzle/Taylor bounds: Vc between [Vc_min, Vc_max] per material ISO group
- [ ] Machine limits respected per block: RPM <= max_RPM, feed <= max_feed from MachineRegistry
- [ ] Chatter check: 0 blocks with RPM in instability lobes (ChatterStabilityLobeEngine)
- [ ] Tool wear prediction: cumulative wear < 0.2mm over full program (ThermalWearCouplingEngine)
- [ ] Monte Carlo CoV < 5% for S/F recommendations (SpeedFeedOrchestratorEngine UQ output)

**FORGE-TRIPLE**:
- Hook: `post_unit: verify_per_block_sf` — validates 50+ blocks have unique S/F within bounds
- Action: `cam_smart_tool` (camDispatcher), `prism_calc:chatter_check_stability` (calcDispatcher)
- Skill: `/auto-speed-feed`

---

### U-F360-21: Cycle Time Optimization with Fusion Simulation

**effort**: 85 | **role**: R3 | **model**: sonnet | **depends_on**: [U-F360-20]

**WORK**:
1. Read F360 toolpath simulation data via `adsk.cam.CAM.generateToolpath()` API (or desktop control fallback via DesktopControlAdapterEngine)
2. Extract estimated cycle time from F360 simulation output
3. Compare against PRISM's physics-predicted cycle time (from SpeedFeedOrchestratorEngine)
4. Optimize: identify air cuts > 2mm (reduce to 1mm), improve approach angles, suggest strategy changes via ToolpathStrategyRegistry (762 strategies)
5. Re-push optimized parameters via POST /cam/operation/set-params
6. Re-simulate. Measure cycle time delta. Document before/after

**4-LOOP**:
- **BUILD**: Implement simulation read + cycle time extraction + optimization loop + re-push. Run `npx tsc --noEmit` — 0 errors
- **SCRUTINIZE**: Verify cycle time readable (number of seconds). Verify optimization produces measurable improvement. Check optimized params still pass safety gates. Test with 3 parts (L-bracket, pocket, contour)
- **GAP FILL**: Handle F360 simulation API unavailable (use desktop control screenshot of simulation timeline). Handle parts with no optimization opportunity. Run regression tests
- **TIE UP**: Cycle time optimized with measured delta. Before/after documented per part. Safety gates re-verified post-optimization

**EXIT GATE**:
- [ ] F360 cycle time readable as numeric value (seconds) — API or desktop control fallback
- [ ] PRISM optimization reduces cycle time by >= 5% (measured across 3 test parts, n=3 min)
- [ ] CoV of cycle time prediction < 8% vs F360 simulation (PRISM prediction accuracy)
- [ ] Optimized parameters pushed back to F360 and re-verified via round-trip
- [ ] Before/after comparison documented: original_time_s, optimized_time_s, delta_pct per part
- [ ] Safety gates re-pass after optimization (deflection, chatter, power all within limits)

**FORGE-TRIPLE**:
- Hook: `post_unit: verify_cycle_time_improvement` — blocks if improvement < 5% across 3 parts
- Action: `cam_unified_generate` (camDispatcher — re-generate with optimized params), `prism_calc:cycle_time_estimate` (calcDispatcher)
- Skill: `/cycle-time-crush`

---

## F360-5-GATE: Pipeline Integration Phase Gate

```yaml
gate_id: F360-5-GATE
omega_floor: 0.80
criteria:
  - Print-to-program pipeline works end-to-end through F360
  - Per-block S/F variability applied to F360 operations
  - Cycle time optimized with measured improvement
  - Full pipeline under 5 minutes for simple parts
```

---

# Phase F360-6: Advanced Manufacturing Intelligence

**Objective**: Multi-setup coordination, fixture design, tool magazine optimization, and shop floor integration through Fusion 360.
**Sessions**: 3 | **Units**: 3 | **Primary Role**: R1 (Systems Architect)

---

### U-F360-22: Multi-Setup Coordination

**effort**: 85 | **role**: R1 | **model**: opus | **depends_on**: [U-F360-19, U-F360-11]

**WORK**:
1. Call `prism_session:context_boot` and `prism_session:dispatcher_map`
2. Read multiple F360 CAM setups via repeated `cad_f360_cam_setup` calls (one per setup in document)
3. Coordinate: shared tools across setups (merge tool lists, eliminate duplicates)
4. Optimize tool changes: minimize total tool change count using ToolRouterEngine (`src/engines/ToolRouterEngine.ts`)
5. Recommend setup sequencing based on datum dependencies and feature accessibility
6. Generate multi-setup job traveler via `prism_business:job_traveler_generate`

**4-LOOP**:
- **BUILD**: Implement multi-setup reader + tool optimizer + sequencer. Run `npx tsc --noEmit` — 0 errors
- **SCRUTINIZE**: Test with 2-setup and 3-setup documents. Verify tool sharing reduces total tools by >= 1. Verify sequencing respects datum dependencies (Op2 needs Op1 datum)
- **GAP FILL**: Handle single-setup documents (no optimization needed). Handle setups with incompatible machines. Run `npx vitest` — 0 regressions
- **TIE UP**: Multi-setup coordination working. Tool count reduced. Sequencing logical. Traveler generated with setup-by-setup instructions

**EXIT GATE**:
- [ ] Multiple setups (2-3) readable from single F360 document
- [ ] Tool sharing reduces total tool count by >= 1 across setups
- [ ] Setup sequence recommended with datum dependency rationale (documented)
- [ ] Multi-setup job traveler generated with per-setup: tool list, WCS, operations, estimated cycle time
- [ ] Traveler includes safety notes from TribalKnowledgeEngine (3,700+ tips database)

**FORGE-TRIPLE**:
- Hook: `post_unit: verify_multi_setup_coordination` — verifies tool count reduction + sequencing
- Action: `prism_business:job_traveler_generate` (businessDispatcher)
- Skill: `/job-planning`

---

### /compact checkpoint — carry forward: multi-setup state, tool optimization results, traveler format

---

### U-F360-23: Fixture Design Assistance

**effort**: 80 | **role**: R2 | **model**: sonnet | **depends_on**: [U-F360-22]

**WORK**:
1. Read part geometry from F360 via `cad_f360_cam_stock` to determine clamping surfaces
2. Recommend fixture type (vise, plate, custom) based on part geometry envelope and operation forces
3. Calculate clamping forces from Kienzle cutting forces: F_clamp >= 2.0 * F_cutting (safety factor)
   - F_cutting from KienzleForceModelEngine (`src/engines/KienzleForceModelEngine.ts`)
   - kc = kc1.1 * h^(-mc) with constants from `src/physics/constants.ts`
4. Generate fixture sketch in F360 via POST /sketch (2D reference for fixture plate with clamp positions)
5. Flag interference between fixture and toolpaths via bounding box overlap check

**4-LOOP**:
- **BUILD**: Implement geometry analysis + fixture recommendation + force calc + sketch gen. Run `npx tsc --noEmit` — 0 errors
- **SCRUTINIZE**: Test with 3 part geometries (flat plate, prismatic block, cylindrical). Verify F_clamp > 2x F_cutting for each. Verify fixture sketch doesn't interfere with toolpaths
- **GAP FILL**: Handle thin-wall parts (reduced clamping force). Handle round parts (recommend V-block). Test with L-bracket from U-F360-05
- **TIE UP**: Fixture type recommended with physics rationale. Clamping force calculated and documented. Sketch generated in F360

**EXIT GATE**:
- [ ] Clamping surfaces identified from F360 part geometry (face areas ranked)
- [ ] Fixture type recommended with rationale (vise for prismatic, plate for flat, custom for complex)
- [ ] Clamping forces calculated: F_clamp >= 2.0 * F_cutting (values in N, documented per setup)
- [ ] F_cutting from KienzleForceModelEngine with kc1.1 from `src/physics/constants.ts`
- [ ] Fixture sketch generated in F360 (clamp positions marked, clearance verified)
- [ ] 0 interference between fixture geometry and toolpath bounding boxes

**FORGE-TRIPLE**:
- Hook: `post_unit: verify_fixture_force_calc` — verifies F_clamp >= 2x F_cutting
- Action: `prism_calc:kienzle_force` (calcDispatcher — KienzleForceModelEngine)
- Skill: `/fixture-design-guide`

---

### U-F360-24: Shop Floor Integration (Fusion to Machine)

**effort**: 85 | **role**: R1 | **model**: opus | **depends_on**: [U-F360-23]

**WORK**:
1. Export final G-code from F360 pipeline to network share (machine folder configurable)
2. Generate machine-specific setup sheet via `prism_business:setup_sheet_generate` — includes F360 screenshots (via DesktopControlAdapterEngine), tool list, WCS origins, clamping forces, tribal tips
3. Push tool list to tool crib management system via `prism_operating_system:tool_crib_update`
4. Log job to PRISM's JobLifecycleEngine (`src/engines/JobLifecycleEngine.ts`) for tracking
5. Integrate with PRISM's ShopFloorCheckInEngine (`src/engines/ShopFloorCheckInEngine.ts`)
6. Generate FAI (First Article Inspection) checklist via `prism_quality:fai_generate`

**4-LOOP**:
- **BUILD**: Implement export + setup sheet + tool crib push + job log + FAI. Run `npx tsc --noEmit` — 0 errors
- **SCRUTINIZE**: Verify G-code file written to correct path. Verify setup sheet completeness (tools, WCS, clamps, tips). Verify job logged with correct metadata. Verify FAI checklist includes all critical dimensions
- **GAP FILL**: Handle network share unavailable (save locally with warning). Handle empty tool crib. Test with full pipeline output from U-F360-19
- **TIE UP**: Complete shop floor chain: F360 -> G-code file -> setup sheet -> tool crib -> job tracker -> FAI. All connected

**EXIT GATE**:
- [ ] G-code exported to configurable machine network folder (path writable, file exists)
- [ ] Setup sheet includes: F360 screenshots, tool list with descriptions, WCS origins (X/Y/Z in mm), clamping forces (N), tribal tips (1+ per operation)
- [ ] Tool list pushed to tool crib (tool IDs, quantities, locations)
- [ ] Job logged in PRISM JobLifecycleEngine with: job_id, part_name, machine, cycle_time_estimate, operator
- [ ] FAI checklist generated with critical dimensions from part geometry
- [ ] ShopFloorCheckInEngine integration: department check-in record created

**FORGE-TRIPLE**:
- Hook: `post_unit: verify_shop_floor_integration` — verifies all 5 outputs exist
- Action: `prism_business:setup_sheet_generate` (businessDispatcher), `prism_quality:fai_generate` (qualityDispatcher)
- Skill: `/setup-sheet-generate`

---

## F360-6-GATE: Advanced Phase Gate

```yaml
gate_id: F360-6-GATE
omega_floor: 0.75
criteria:
  - Multi-setup coordination operational
  - Fixture design assistance functional
  - Shop floor integration end-to-end (F360 -> machine folder -> job tracker)
  - Full manufacturing intelligence chain validated
```

---

# Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Real F360 API differs from docs | HIGH | HIGH | F360-1 is entirely validation. Budget 3 sessions for fixes |
| F360 threading model breaks HTTP server | HIGH | MEDIUM | Test marshaling to UI thread. Add CustomEvent pattern if needed |
| Monthly F360 updates break add-in | MEDIUM | HIGH | Pin add-in to stable API subset. Add version check on startup |
| CAM workspace API less documented | HIGH | MEDIUM | Phase F360-3 dedicated to research. Desktop control as fallback |
| Port conflicts (18360 + 18361) | LOW | LOW | Configurable ports. Health check before operations |
| Windows desktop control unreliable | MEDIUM | MEDIUM | Phase F360-4 is optional enhancement, not critical path. Decision gate in U-F360-16 with scored comparison matrix |
| F360 marketplace listing requirements | LOW | LOW | U-F360-11 EXIT GATE includes marketplace readiness checklist |
| Python sandbox restrictions in F360 | MEDIUM | MEDIUM | Pre-validated: urllib.request confirmed available. No pip. Fallback: exec() raw code endpoint |
| Concurrent HTTP + F360 UI thread | HIGH | MEDIUM | Add-in uses threading.Thread for HTTP + adsk.core.CustomEvent for API marshaling. Test in U-F360-01 |
| F360 API version drift (2024 vs 2025+) | MEDIUM | HIGH | Pin minimum API version in manifest. Test against 2 F360 versions in U-F360-02 |

---

# Revenue Milestones

| Milestone | Phase | Revenue Impact |
|-----------|-------|----------------|
| F360-2-GATE: Panel UI complete | F360-2 | MVP for Fusion Marketplace listing (8.5M user base) |
| F360-3-GATE: CAM integration | F360-3 | Premium tier: auto tool selection + push optimization |
| F360-5-GATE: Full pipeline | F360-5 | Enterprise tier: print-to-program through F360 |

### Pricing Model (Feature-to-Tier Mapping)

| Feature | Free | Paid ($29/mo) | Enterprise ($99/mo) |
|---------|------|---------------|---------------------|
| Material lookup (ISO groups, kc1.1) | Y | Y | Y |
| Tribal knowledge tips | Y | Y | Y |
| Physics-optimized S/F | - | Y | Y |
| Tool selection with scoring | - | Y | Y |
| Chatter/deflection dashboard | - | Y | Y |
| Auto tool library sync | - | Y | Y |
| G-code generation | - | - | Y |
| Print-to-program pipeline | - | - | Y |
| Multi-setup coordination | - | - | Y |
| Shop floor integration | - | - | Y |
| Per-block variable S/F | - | - | Y |

### Marketplace Readiness Checklist (U-F360-11 EXIT GATE addition)

- [ ] Autodesk App Store listing requirements reviewed (developer account, screenshots, description)
- [ ] Add-in passes Autodesk security review (no unauthorized network calls, sandboxed)
- [ ] Free tier feature set works standalone (no PRISM server required for material lookup)
- [ ] Paid tier gating implemented (license key check before physics features)
- [ ] Support contact and documentation URL configured

### Connection Indicator Thresholds

- **Green**: Last heartbeat < 1,000ms ago, HTTP 200 response
- **Yellow**: Last heartbeat 1,000-5,000ms ago, or HTTP non-200 but reachable
- **Red**: Last heartbeat > 5,000ms ago, or 0 responses in 30 seconds

### Round-Trip Tolerance Matrix

| Parameter | Push Precision | Read-Back Match Tolerance |
|-----------|---------------|---------------------------|
| Spindle RPM | exact integer | delta < 1 RPM |
| Feed rate (mm/min) | 2 decimal places | delta < 0.1 mm/min |
| DOC (mm) | 3 decimal places | delta < 0.001 mm |
| Stepover (mm) | 3 decimal places | delta < 0.001 mm |
| Tool assignment | exact tool ID | exact string match |

### Effort Contingency (+15% per phase for F360 API unknowns)

| Phase | Base Effort | +15% Contingency | Total |
|-------|-------------|-------------------|-------|
| F360-1 | 480 | +72 | 552 |
| F360-2 | 400 | +60 | 460 |
| F360-3 | 332 | +50 | 382 |
| F360-4 | 234 | +35 | 269 |
| F360-5 | 270 | +41 | 311 |
| F360-6 | 249 | +37 | 286 |

### Risk Escape Criteria

| Risk | Escape Symptom | Halt Action |
|------|----------------|-------------|
| F360 API differs > 20% from docs | > 3/17 endpoints fail with different response shapes | Pause F360-1-S2. Open architecture review (R5 Opus). Revise scope |
| Threading crashes F360 | Add-in crashes F360 > 2x in 10 minutes | Rewrite HTTP server with CustomEvent marshaling pattern |
| CAM API undocumented | > 50% of CAM operations have no API coverage | Promote F360-4 (desktop control) to critical path, run in parallel |
| Psi regression | Psi_delta < 0 after any session | Investigate root cause. Do not proceed until Psi restored |

### Unit/Session Template Reference

Every SESSION must contain: SMART CONFIG (role, model, effort, context_budget, compact_after), KNOWLEDGE SOURCES (3+ file paths), INTENT (1-2 sentences).

Every UNIT must contain: effort + role + model + depends_on header, WORK (5+ numbered items), 4-LOOP (BUILD/SCRUTINIZE/GAP FILL/TIE UP), EXIT GATE (5+ checkboxes with numeric thresholds), FORGE-TRIPLE (Hook + Action + Skill), ROLLBACK (FILES_CREATED, FILES_MODIFIED, ABORT_CRITERIA, ROLLBACK_PROCEDURE).

---

# Scrutiny Configuration

```yaml
scrutiny_config:
  min_agents: 10
  target_agents: 20
  agent_model: haiku
  score_floor: 70
  loops: 3
  focus_areas:
    - protocol_compliance
    - physics_rigor
    - machinist_trust
    - revenue_alignment
    - api_feasibility
    - test_coverage
    - rollback_completeness
    - dependency_dag
```

---

# Enforcement Hooks

| Hook | Type | Trigger |
|------|------|---------|
| verify_fusion360_installed | pre_unit | Check %APPDATA%/Autodesk path exists |
| log_endpoint_compatibility_matrix | post_unit | Log pass/fail matrix after F360-1-S1 |
| verify_heartbeat_operational | post_unit | Confirm heartbeat poller active |
| verify_physics_dashboard_renders | post_unit | Confirm F360 panel shows physics data |
| verify_gcode_output_valid | post_unit | Validate G-code syntax + safety checks |
| verify_tool_library_sync_count | post_unit | Confirm tool count matches expected |
| verify_cam_read_endpoints | post_unit | Confirm CAM data readable |
| verify_cam_param_push | post_unit | Round-trip param verification |
| verify_machine_limits_respected | post_unit | Spindle RPM/feed within machine envelope |
| verify_canonical_constants_used | post_unit | No inline Kienzle/Taylor — import from constants.ts |

---

# SVI / Psi Integration (Scrutiny Fix — A18)

**Current Psi**: 40.8% (stale — pre-F360 work)

### SVI Impact by Phase

| Phase | Psi Delta | Watch-Status Gaps Closed | Mechanism |
|-------|-----------|--------------------------|-----------|
| F360-1 | +0.5% | Bridge coverage (5 gaps) | 17+ validated endpoints = fewer unknown-state code paths |
| F360-2 | +1.0% | Panel UI (3 gaps) | User-facing verification of physics outputs |
| F360-3 | +1.5% | Tool library + CAM read/write (4 gaps) | Round-trip: push -> read back -> confirm |
| F360-4 | +0.3% | Desktop control fallback (1 gap) | Visual verification reduces unobservable transitions |
| F360-5 | +2.0% | Print-to-program pipeline (6 gaps) | Full E2E closes biggest variability source |
| F360-6 | +0.7% | Multi-setup + shop floor (3 gaps) | Job tracker reduces post-program variability |
| **TOTAL** | **+6.0%** | **22 gaps** | **Psi target after F360: ~47%** |

### Per-Session SVI Measurement Protocol (MANDATORY)

**Pre-session (before any code work)**:
1. Run `prism_dev:svi_calculate` to capture baseline Psi_before
2. Record value in session notes: `Psi_baseline = XX.X%`
3. If `state/shared/SVI-compact.md` is stale (> 48h), refresh first

**Post-session (before /compact)**:
1. Run `prism_dev:svi_calculate` to capture Psi_after
2. Compute delta: `Psi_delta = Psi_after - Psi_before`
3. If Psi_delta < 0: flag `SVI REGRESSION`, investigate before proceeding
4. Record in FEATURE CASCADE block: `SVI_DELTA: +X.X%`
5. Update `state/shared/SVI-compact.md` with new value

**Validation**: Psi deltas in the SVI Impact table above are ESTIMATES. Actual deltas must be measured and may differ. If actual Psi gain < 50% of estimated gain for a phase, investigate before proceeding to next phase.

### Variability Reduction Targets

- S/F recommendations: CoV < 5% for same material/tool/machine
- Cycle time estimates: CoV < 8% between PRISM prediction and F360 simulation
- Tool selection: Same tool 95%+ for identical inputs
- Post-processor output: Deterministic (CoV = 0%)

---

# Quality & Compliance Integration (Scrutiny Fix — A15)

### Safety Validation Gates (every G-code output from F360-2+)

1. **Spindle limit**: RPM within machine rated range (MachineRegistry)
2. **Feed limit**: Feed rate within machine axis limits
3. **Power check**: Cutting power < 80% of spindle power curve at RPM
4. **Deflection check**: < 0.05mm (or part tolerance, whichever tighter)
5. **Chatter check**: RPM not in instability lobes (ChatterStabilityLobeEngine)
6. **Collision clearance**: Rapids > 2mm clearance from stock/fixture

### Quality Integration Points

| Phase | Quality Engine | Integration |
|-------|---------------|-------------|
| F360-2 | Physics gauges | Deflection/chatter/power real-time display |
| F360-3 | `prism_quality:spc_calculate` | SPC tracking on pushed parameters |
| F360-5 | `prism_safety:check_toolpath_collision` | Collision check before G-code export |
| F360-5 | `prism_quality:fai_generate` | First Article Inspection report |
| F360-6 | `prism_quality:setup_sheet_validate` | Setup sheet completeness check |

### Canonical Physics Constants (MUST import from src/physics/constants.ts)

- Kienzle kc1.1: P=1800, M=2100, K=1100, N=700, S=2800, H=3200 MPa
- Kienzle mc: P=0.25, M=0.25, K=0.25, N=0.25, S=0.25, H=0.25
- Taylor C/n: from canonical material-tool database, never hardcoded
- Deflection moduli: E_carbide = 580 GPa, E_HSS = 210 GPa

---

# Unified Test Plan (Scrutiny Fix — A19)

### Test Progression: Mock -> Integration -> Live -> Production

| Level | Phase | Type | Pass Criteria |
|-------|-------|------|---------------|
| L0 | Pre-F360-1 | Mock (existing tests) | 100% pass, 0 regressions |
| L1 | F360-1-S1 | Smoke (install + health) | Health 200, status valid JSON |
| L2 | F360-1-S1 | Endpoint (all 17+) | 100% pass after fixes |
| L3 | F360-1-S2 | Integration (L-bracket E2E) | Geometry within 5%, STEP exportable |
| L4 | F360-2-S2 | Pipeline (Material -> Optimize -> Generate) | Valid G-code program |
| L5 | F360-3 | Round-trip (push -> read -> verify) | 100% parameter match |
| L6 | Every gate | Regression (L0-L5 suite) | 0 regressions from baseline |
| L7 | F360-5-GATE | Production (3-part validation, cycle times) | Average improvement >= 5% |

### Test Files

| File | Level | Created By |
|------|-------|------------|
| `fusion360-bridge.test.ts` | L0 | Existing |
| `fusion360-code-generator.test.ts` | L0 | Existing |
| `fusion360-bridge-live.test.ts` | L3 | U-F360-05 |
| `fusion360-panel-ui.test.ts` | L4 | U-F360-11 |
| `fusion360-cam-roundtrip.test.ts` | L5 | U-F360-14 |
| `fusion360-pipeline-e2e.test.ts` | L7 | U-F360-19 |

### Required Edge Case Tests Per Phase

- Empty state (no document, no setup, no tools)
- Error recovery (mid-operation failure, connection drop, timeout)
- Concurrent access (panel open + F360 operation running)
- Boundary values (max RPM, 0mm depth, 500+ tool library)
- Regression guard (all previous phase tests still pass)

---

# Missing SESSION Blocks (Scrutiny Fix — A3)

### SESSION F360-3-S1: Tool Library and CAM Read
```yaml
role: R6 (Integrator)
model: sonnet
effort: 85
context_budget: medium
compact_after: 2 units
```
KNOWLEDGE SOURCES: FusionToolExportEngine, FusionToolSyncEngine, Fusion 360 CAM API
INTENT: PRISM tools appear in F360 library, CAM workspace state fully readable.

### SESSION F360-3-S2: Parameter Push and Post-Processor
```yaml
role: R3 (TS Implementer)
model: sonnet
effort: 85
context_budget: medium
compact_after: 2 units
```
KNOWLEDGE SOURCES: Fusion360LiveBridgeEngine, FusionCPSParserEngine, PostProcessorPipelineEngine
INTENT: PRISM-optimized parameters flow into F360 operations with correct post-processor.

### SESSION F360-4-S1: Desktop Control Setup
```yaml
role: R1 (Systems Architect)
model: opus
effort: 80
context_budget: high
compact_after: 3 units
```
KNOWLEDGE SOURCES: Windows-MCP (`github.com/CursorTouch/Windows-MCP` README), Terminator (`github.com/mediar-ai/terminator` README), MCPControl (`github.com/claude-did-this/MCPControl` README), Fusion 360 UI Automation tree structure
INTENT: Claude Code can see and interact with Fusion 360 via desktop automation.

### SESSION F360-5-S1: Pipeline Integration
```yaml
role: R1 (Systems Architect)
model: opus
effort: 95
context_budget: high
compact_after: 3 units
```
KNOWLEDGE SOURCES: PrintToProgramPipelineEngine, PostProcessorPipelineEngine, SpeedFeedOrchestratorEngine
INTENT: Engineering drawing -> physics-optimized G-code through Fusion 360.

### SESSION F360-6-S1: Advanced Manufacturing
```yaml
role: R1 (Systems Architect)
model: opus
effort: 85
context_budget: high
compact_after: 3 units
```
KNOWLEDGE SOURCES: `src/engines/ToolRouterEngine.ts`, `src/engines/JobLifecycleEngine.ts`, `src/engines/ShopFloorCheckInEngine.ts`, `src/engines/KienzleForceModelEngine.ts`, `src/data/fusion360-cam-tips.ts`
INTENT: Complete manufacturing intelligence chain from CAD through shop floor.

---

# Additional /compact Checkpoints (Scrutiny Fix — A7)

| After Unit | Carry Forward | Drop |
|------------|---------------|------|
| U-F360-03 | Compatibility matrix, fixes, pass/fail | Individual endpoint test details |
| U-F360-06 | Heartbeat, integration test, action coverage | Installation steps |
| U-F360-09 | Panel registration, API client, material UI | F360-1 details |
| U-F360-11 | Panel UI state, physics dashboard, G-code gen | Material selection iteration |
| U-F360-13 | Tool sync, CAM read endpoints | Panel implementation details |
| U-F360-15 | Full CAM integration, post-processor selection | CAM endpoint details |
| U-F360-18 | Desktop control capabilities, fallback coverage | Tool evaluation details |
| U-F360-21 | Full pipeline state, cycle time results | Desktop control setup |
| U-F360-24 | Complete F360 integration state | All phase details |

---

# Rollback Procedures (Per-Unit — Scrutiny Fix A14)

Every unit MUST have rollback capability. Units U-F360-01 through U-F360-06 have inline ROLLBACK blocks. Below covers U-F360-12 through U-F360-24.

| Unit | Files Created | Files Modified | Abort Criteria | Rollback Procedure |
|------|-------------|----------------|----------------|-------------------|
| U-F360-12 | `scripts/fusion360-addin/tool_library_sync.py` | `~/.prism/fusion360/sync-state.json` | Tool import fails for > 50% of batch | Delete `tool_library_sync.py`. Remove synced libraries from F360. Delete sync-state.json |
| U-F360-13 | None | `scripts/fusion360-addin/fusion360_api_server.py` (4 new endpoints), `src/engines/Fusion360LiveBridgeEngine.ts`, `src/tools/dispatchers/cadDispatcher.ts` | > 2 of 4 CAM endpoints return invalid data | `git checkout -- src/engines/Fusion360LiveBridgeEngine.ts src/tools/dispatchers/cadDispatcher.ts`. Revert Python add-in endpoint additions |
| U-F360-14 | None | `scripts/fusion360-addin/fusion360_api_server.py` (set-params endpoint), `src/engines/Fusion360LiveBridgeEngine.ts` | Round-trip delta > 10x tolerance for any parameter | `git checkout -- <modified files>`. POST /undo in F360 to revert pushed params |
| U-F360-15 | None | `src/engines/Fusion360LiveBridgeEngine.ts` (post-processor methods) | Post-processor recommendation incorrect for > 1 of 3 test machines | `git checkout -- <modified files>`. Reset F360 post-processor to default fanuc.cps |
| U-F360-16 | `.claude/settings.json` (MCP config) | None | Desktop control MCP server fails health check after 3 attempts | Remove MCP server entry from settings.json. Uninstall MCP server package |
| U-F360-17 | `src/engines/DesktopControlAdapterEngine.ts`, `src/tools/dispatchers/desktopDispatcher.ts` | `src/engines/index.ts` | F360 navigation fails for > 2 of 3 test paths | `git checkout -- <created files>`. Remove from index.ts |
| U-F360-18 | None | `src/engines/Fusion360LiveBridgeEngine.ts` (router logic) | Router misroutes > 1 of 5 test operations | `git checkout -- src/engines/Fusion360LiveBridgeEngine.ts` |
| U-F360-19 | `src/__tests__/fusion360-pipeline-e2e.test.ts` | `src/engines/PrintToProgramPipelineEngine.ts` (F360 wiring) | Pipeline fails at > 1 of 6 stages | `git checkout -- <modified engines>`. Delete test file |
| U-F360-20 | None | Post-processor block-level output | Per-block S/F produces > 5% values outside Kienzle bounds | `git checkout -- <modified files>`. Revert F360 operations to pre-push state via /undo |
| U-F360-21 | None | None (read-only optimization suggestions) | Cycle time increases after optimization | Discard optimization suggestions. Revert pushed params via /undo |
| U-F360-22 | None | None (read + recommend only) | Setup sequencing recommendation illogical (verified by R5 Opus) | Discard recommendation. No code changes to revert |
| U-F360-23 | None | F360 document (fixture sketch added) | Clamping force < F_cutting (insufficient, safety risk) | Delete fixture sketch from F360 via /undo. Discard force calculation |
| U-F360-24 | G-code file on network share, setup sheet PDF | PRISM job tracker state | G-code file corrupt or setup sheet missing critical fields | Delete exported files. Remove job from tracker. Re-run from U-F360-19 output |

---

# Watch-Status Gap Baseline (Scrutiny Fix A18)

"Watch-status gaps" are code paths where PRISM's output state is unverifiable — the system produces a result but cannot confirm correctness. Each gap is a source of variability (Psi reduction opportunity).

### Gap Inventory (22 gaps closed by F360 roadmap)

**F360-1 (5 gaps)**:
1. `bridge.sketch()` response shape never validated against real F360 → U-F360-02 validates
2. `bridge.extrude()` mm-to-cm conversion untested → U-F360-02 measures
3. `bridge.export()` STEP file validity unknown → U-F360-05 verifies openable
4. Connection state unknown after F360 restart → U-F360-04 adds heartbeat
5. Action sequence execution result untested → U-F360-06 validates

**F360-2 (3 gaps)**:
6. Material physics badge values unverified against canonical kc1.1 → U-F360-09 compares
7. Physics dashboard gauge accuracy unverified → U-F360-10 validates against SpeedFeedOrchestrator
8. Generated G-code never validated against expected controller dialect → U-F360-11 checks header/M-codes

**F360-3 (4 gaps)**:
9. Tool geometry (holder/shaft) render fidelity in F360 unknown → U-F360-12 verifies 3D preview
10. CAM workspace operation parameters readable but accuracy unmeasured → U-F360-13 checks to 0.01mm
11. Pushed parameters persistence across F360 save/reopen unknown → U-F360-14 round-trips
12. Post-processor recommendation accuracy untested → U-F360-15 tests 3 machines

**F360-4 (1 gap)**:
13. API gap operations have no automation path → U-F360-18 provides desktop control fallback

**F360-5 (6 gaps)**:
14. PrintToProgram pipeline routing through F360 untested → U-F360-19 validates E2E
15. Per-block S/F variability in F360 operations never verified → U-F360-20 checks 50+ blocks
16. Chatter stability not checked for F360-pushed RPMs → U-F360-20 runs ChatterStabilityLobeEngine
17. Tool wear over program duration unmodeled → U-F360-20 runs ThermalWearCouplingEngine
18. Cycle time prediction accuracy vs F360 simulation unknown → U-F360-21 measures CoV
19. Post-optimization safety gate re-check not automated → U-F360-21 re-verifies

**F360-6 (3 gaps)**:
20. Multi-setup tool sharing optimization untested → U-F360-22 reduces tool count
21. Fixture clamping force vs cutting force ratio unvalidated → U-F360-23 computes F_clamp >= 2x
22. Shop floor integration (G-code → machine → job tracker) never end-to-ended → U-F360-24 connects

---

# Enforcement Hook Implementation Patterns (Scrutiny Fix A17)

Hooks are implemented as bash scripts in `.claude/hooks/` triggered by the session lifecycle.

### Implementation Template

```bash
#!/bin/bash
# Hook: verify_[name]
# Trigger: [pre_unit | post_unit]
# Blocks: [next phase | GAP FILL | TIE UP]

RESULT=$(curl -s http://localhost:18360/health 2>/dev/null)
if [ $? -ne 0 ] || [ "$(echo $RESULT | jq -r '.status')" != "ok" ]; then
  echo "BLOCKED: Fusion 360 add-in not responding on port 18360"
  exit 1
fi
exit 0
```

### Hook Registry (10 hooks, implementation location)

| Hook | Script | Trigger | Blocks If |
|------|--------|---------|-----------|
| verify_fusion360_installed | `.claude/hooks/f360-installed.sh` | pre_unit (F360-1+) | %APPDATA%/Autodesk/...AddIns/PRISMBridge/ missing |
| log_endpoint_compatibility_matrix | `.claude/hooks/f360-compat-log.sh` | post_unit (U-F360-02) | Writes to `state/f360-compatibility.json` |
| verify_heartbeat_operational | `.claude/hooks/f360-heartbeat.sh` | post_unit (U-F360-04) | No 200 response from /health within 10s |
| verify_physics_dashboard_renders | `.claude/hooks/f360-dashboard.sh` | post_unit (U-F360-10) | Panel command throws Python exception |
| verify_gcode_output_valid | `.claude/hooks/f360-gcode-valid.sh` | post_unit (U-F360-11, U-F360-19) | G-code file empty or missing header |
| verify_tool_library_sync_count | `.claude/hooks/f360-tool-sync.sh` | post_unit (U-F360-12) | Synced count < expected from sync-state.json |
| verify_cam_read_endpoints | `.claude/hooks/f360-cam-read.sh` | post_unit (U-F360-13) | Any of 4 CAM endpoints returns non-200 |
| verify_cam_param_push | `.claude/hooks/f360-cam-push.sh` | post_unit (U-F360-14) | Round-trip delta > tolerance matrix values |
| verify_machine_limits_respected | `.claude/hooks/f360-limits.sh` | post_unit (U-F360-20) | Any block RPM > max or feed > max from MachineRegistry |
| verify_canonical_constants_used | `.claude/hooks/f360-constants.sh` | post_unit (all physics units) | grep finds inline kc1.1 values not imported from constants.ts |
