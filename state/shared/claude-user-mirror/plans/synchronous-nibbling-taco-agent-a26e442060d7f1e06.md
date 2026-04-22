# PRISM Fusion 360 Full-Capability Add-In: 3-Tier Licensing Roadmap

## Executive Summary

This roadmap transforms PRISM's existing Fusion 360 integration (1,177 LOC bridge + 2,578 LOC Python add-in + 992 LOC orchestrator) into a full-featured, license-gated add-in delivering all PRISM capabilities inside Fusion 360. The plan is organized into 7 milestones across 4 phases, with clear dependencies and deliverables.

---

## Current State Assessment

### What Works Today
- **Fusion360LiveBridgeEngine** (1,177 LOC): HTTP client on `localhost:18360` with typed methods for 25+ endpoints including CAD ops, CAM setup/operation/toolpath/post, tool import, and cloud data access
- **fusion360_api_server.py** (2,578 LOC): Python add-in with thread-safe CustomEvent dispatch, 25+ endpoints, `/batch` for sequential multi-op, async toolpath generation with polling
- **FusionToolExportEngine** (541 LOC): Exports tools with geometry (DC, SFDM, LCF, OAL, NOF, RE, HA), holder segments (17 taper types), shaft segments, multi-material presets
- **FusionToolSyncEngine** (251 LOC): Library partitioning (500 tools/lib max), sync state tracking in `~/.prism/fusion360/sync-state.json`
- **FusionCPSParserEngine** (537 LOC): Post-processor metadata extraction from 180 .cps files
- **AutoProgramOrchestratorEngine** (992 LOC): 10-stage pipeline (model intake through output package)
- **CAM_PARAM_MAP**: Only 9 parameters mapped (spindle_speed, feed_cutting, feed_ramp, feed_plunge, max_stepdown, max_stepover, tolerance, stock_to_leave, stock_to_leave_axial)
- **OPERATION_TYPE_MAP**: 22 operation types mapped (face through multiaxis_contour)

### Critical Gaps
1. **CAM parameter surface**: 9 of ~200+ Fusion operation parameters mapped. Missing: optimal load, smoothing tolerance, ramp angle, entry type, entry radius, multiple depths, lead-in/out, containment, pass extension, climb/conventional, and all geometry/heights/linking tab params
2. **Tool export geometry**: Missing taper angle, point angle (drills), rake angle, relief angle, edge radius, chip breaker, bearing length, bore range, runout specs, 3D model URLs
3. **No read-back of user operations**: Cannot read an existing operation's current parameters to suggest improvements
4. **No per-block S/F injection**: PostProcessorPipelineEngine exists (38 stages) but not wired to Fusion post-processing output
5. **No feedback/learning loop**: SelfLearningCAMEngine exists but is not connected to Fusion user overrides
6. **No license/tier gating**: OptimizationTierEngine has 4-tier concept but is not license-aware
7. **No internal toolpath generation**: NovelToolpathEngine has 6 algorithms (TGAR, HRAF, MTHZD, CFSF, PTDC, VCER) but no G-code emitter or Fusion operation replacement path
8. **No setup read/modify**: Can create setups but cannot read or modify existing ones in detail

---

## Phase 1: Foundation + Free Tier (Milestones 1-2)

### Milestone 1: License Infrastructure + Tier Gating
**Duration**: 2 weeks
**Dependencies**: None (foundation layer)

#### Deliverables

**1.1 LicenseTierGateEngine (new engine, ~400 LOC)**
- File: `H:/PRISM/mcp-server/src/engines/LicenseTierGateEngine.ts`
- Three tiers: `free` | `pro` | `ultimate` with feature flag map
- License token validation (JWT or simple API key check against a license server endpoint)
- Per-tier endpoint whitelist for the Python add-in
- Per-tier engine access control for TypeScript side
- Feature flag schema:
  - Free: `basic_speed_feed`, `simple_tool_lookup`, `basic_ui_panel`
  - Pro: `full_physics`, `full_database`, `param_injection_all_tabs`, `post_processor_advanced`, `setup_read_suggest`, `preference_learning`
  - Ultimate: `internal_toolpaths`, `setup_create_modify`, `per_block_sf`, `multi_setup_orchestration`, `cloud_cam_history`, `shop_optimization`

**1.2 Python add-in tier enforcement (~200 LOC additions to fusion360_api_server.py)**
- New `/license/validate` endpoint that checks stored license key
- Tier-based UI element visibility (tabs shown/hidden per tier)
- Endpoint-level gating: wrap `_dispatch_post`/`_dispatch_get` with tier check
- License key stored in `%APPDATA%/Autodesk/Autodesk Fusion 360/API/AddIns/PRISMBridge/license.json`

**1.3 TypeScript bridge tier enforcement (~150 LOC additions to Fusion360LiveBridgeEngine.ts)**
- `setTier(tier: Tier)` method that filters available bridge methods
- Tier passed as header on every request to Python add-in
- Graceful degradation: Pro methods return `{ error: "Upgrade to Pro for this feature", upgrade_url: "..." }` on Free tier

#### Key Design Decisions
- License validation: Start with offline JWT validation (no server dependency for basic check). JWT contains tier, expiry, machine fingerprint. Online validation for initial activation only.
- Tier enforcement happens at BOTH layers: Python (UI visibility + endpoint blocking) and TypeScript (method availability). Belt-and-suspenders, since the Python add-in runs in the user's process.

---

### Milestone 2: Free Tier — PRISM Lite Panel
**Duration**: 2 weeks
**Dependencies**: Milestone 1

#### Deliverables

**2.1 Fusion 360 UI Panel — Free Tier (new Python files)**
- Files to create in `H:/PRISM/mcp-server/scripts/fusion360-addin/`:
  - `prism_panel.py` — Main UI panel (Fusion Palette with HTML/JS)
  - `prism_api_client.py` — HTTP client to PRISM MCP server on `:18361`
  - `prism_ui_state.py` — Panel state management
- Panel features (Free):
  - Material selector (ISO P/M/K/N/S/H groups with common materials dropdown)
  - Basic speed/feed calculator: Vc, fz, RPM, feed rate for selected material + tool diameter + flute count
  - Simple tool lookup from the 95,608-tool catalog (search by diameter/type/manufacturer)
  - Connection status indicator (green/red for PRISM MCP server and Fusion bridge)
  - "Upgrade to Pro" CTAs on locked features

**2.2 Basic SpeedFeed action for Free tier**
- Wire `SpeedFeedOrchestratorEngine` at Tier 1 (single-pass, no convergence) for Free users
- Returns: RPM, feed_mm_min, basic DOC/WOC recommendations
- No Monte Carlo UQ, no convergence, no chatter analysis — just Kienzle defaults with chip thinning

**2.3 Simple tool search endpoint**
- New `/tools/search` GET endpoint in Python add-in proxying to PRISM MCP `cam_smart_tool` action
- Returns top 5 tool recommendations with basic geometry
- Free tier: no holder geometry, no collision data, no physics scores

---

## Phase 2: Pro Tier — Full Physics + Full Parameter Injection (Milestones 3-5)

### Milestone 3: Comprehensive CAM Parameter Mapping
**Duration**: 4 weeks (hardest single milestone)
**Dependencies**: Milestone 2

This is the most technically challenging milestone. Fusion 360's `adsk.cam.Operation.parameters` exposes hundreds of parameters, and each strategy type has a different subset.

#### Deliverables

**3.1 Fusion CAM Parameter Surface Catalog (new data file)**
- File: `H:/PRISM/mcp-server/src/data/fusion360-cam-params.ts`
- Comprehensive mapping of ALL Fusion 360 CAM parameters organized by:
  - Tab: Tool, Geometry, Heights, Passes, Linking
  - Strategy type: adaptive, contour2d, pocket2d, drill, face, parallel, scallop, etc.
- For each parameter: Fusion internal name, PRISM equivalent name, type, unit, conversion factor, valid range
- Estimated ~400 unique parameters across all strategy types
- Discovery method: Use `/execute` endpoint to enumerate `operation.parameters` for each strategy type in a live Fusion instance, capture all parameter names and types

**3.2 Extended CAM_PARAM_MAP in fusion360_api_server.py (~800 LOC additions)**
Current `CAM_PARAM_MAP` has 9 entries. Expand to cover ALL tabs:

*Tool Tab* (already partially covered):
- spindle_speed, feed_cutting, feed_ramp, feed_plunge (existing)
- Add: feed_retract, feed_transition, feed_per_revolution, feed_lead_in, feed_lead_out

*Geometry Tab* (NEW — zero coverage today):
- machining_boundary, tool_containment, boundary_offset
- additional_offset, stock_contours
- contact_point_boundary

*Heights Tab* (NEW — zero coverage today):
- clearance_height_mode, clearance_height_offset
- retract_height_mode, retract_height_offset
- feed_height_mode, feed_height_offset
- top_height_mode, top_height_offset
- bottom_height_mode, bottom_height_offset

*Passes Tab* (partially covered via stepdown/stepover):
- Add: optimal_load (ae for adaptive), both_ways, finishing_overlap
- smoothing, smoothing_tolerance, direction (climb/conventional)
- multiple_depths, use_flat_area_recovery
- ramp_type, ramp_angle, helical_ramp_diameter
- lead_in_radius, lead_out_radius, entry_type

*Linking Tab* (NEW — zero coverage today):
- transition_type, keep_tool_down, stay_inside_pocket
- minimum_retract, lift_height, retract_feed
- high_feedrate, reduced_feedrate

**3.3 Operation parameter read-back (new Python endpoint)**
- New `GET /cam/operation/params` endpoint: reads ALL current parameters from an existing operation
- Returns: `{ param_name: { value, expression, unit, is_default } }` for every parameter
- Critical for the "read user setup, suggest improvements" Pro feature
- New `GET /cam/operations` endpoint: lists all operations in a setup with their types and parameter summaries

**3.4 FusionCAMParameterInjectionEngine (new engine, ~600 LOC)**
- File: `H:/PRISM/mcp-server/src/engines/FusionCAMParameterInjectionEngine.ts`
- Maps PRISM's 762 strategy parameters to Fusion's parameter surface
- Strategy-aware: knows which parameters exist for which operation types
- Validates parameter values against Fusion's constraints before injection
- Generates a `/batch` payload that sets ALL parameters for an operation in one call

---

### Milestone 4: Full Tool Library + Collision Geometry
**Duration**: 3 weeks
**Dependencies**: Milestone 3

#### Deliverables

**4.1 Extended FusionToolExportEngine (~300 LOC additions)**
Current export is missing critical geometry for collision detection. Add:

- **Drill geometry**: point_angle (deg), web_thickness_mm, margin_width_mm, coolant_through (bool)
- **Taper geometry**: taper_angle (deg, for tapered end mills), taper_length_mm
- **Edge geometry**: rake_angle (deg), relief_angle (deg), edge_radius_mm (hone radius), chip_breaker_type
- **Insert geometry**: insert_IC_mm, insert_thickness_mm, lead_angle (deg), approach_angle (deg)
- **Holder bore**: min_bore_mm, max_bore_mm, runout_tir_mm (from holder registry data that already exists)
- **3D model references**: URL to STL/STEP files for accurate collision visualization
- **Bearing length**: for drills and reamers (guides the tool in the hole)

All source data already exists in PRISM's ToolRegistry and holder sub-registries. The gap is purely in the export mapping.

**4.2 Holder assembly model (new Python endpoint)**
- New `POST /tool-import-assembly` endpoint: imports tool + holder + shaft as a complete assembly
- Fusion's collision detection needs the full assembly, not just the cutting tool
- Build multi-segment holder profiles matching real catalog data (currently only 3 simplified segments)

**4.3 CollisionEngine integration for pre-verification**
- Wire `CollisionEngine` (2,526 LOC, SAT + swept volume) into the Pro pipeline
- Before toolpath generation: verify tool+holder assembly clears stock, fixtures, clamps
- Report collision zones with mm clearance values
- Add `POST /cam/collision-check` endpoint that takes tool assembly + stock + fixture geometry

---

### Milestone 5: Setup Intelligence + Post-Processor Integration
**Duration**: 3 weeks
**Dependencies**: Milestones 3, 4

#### Deliverables

**5.1 Setup read-back and analysis (new Python endpoints)**
- `GET /cam/setup/full` — Returns complete setup details: WCS origin, stock definition, all bodies (model + fixture), machine selection, all operations with parameter summaries
- `GET /cam/setup/analysis` — PRISM analyzes the setup and returns:
  - Optimization suggestions (e.g., "operation 3 could use adaptive clearing instead of pocket")
  - Warnings (e.g., "tool 4 stickout exceeds 4xD — deflection risk")
  - Physics scores per operation (0-100 based on converged multi-model physics)
  - Missing operations (e.g., "no finishing pass detected for surface with Ra 1.6 requirement")

**5.2 PhysicsFusionOrchestrator wired for Pro tier**
- Route Pro users through Tier 2+ convergence (FTW/FES/FDT nested loops)
- Full Kienzle + Taylor + deflection + thermal + chatter SLD
- Returns `FusionDetail` with per-plugin results, convergence history, and warnings
- Machine limit validation against the matched machine from MachineRegistry (910 machines)

**5.3 Post-processor output enhancement**
- Wire `PostProcessorPipelineEngine` (38 stages) to post-process Fusion's G-code output
- Flow: Fusion generates G-code via `/cam/post` -> PRISM reads the output file -> runs P0-P6 pipeline -> writes optimized file alongside original
- Pro-level post features: safety start/end blocks, optimized retract heights, coolant control per operation, purchase option codes
- New endpoint: `POST /cam/post-optimize` that takes Fusion's G-code output path and returns the optimized version

**5.4 User preference learning system (new engine + endpoints)**
- File: `H:/PRISM/mcp-server/src/engines/FusionUserPreferenceLearningEngine.ts` (~500 LOC)
- When user modifies PRISM-suggested parameters, detect the delta
- Flow: PRISM injects params -> user modifies in Fusion -> PRISM reads back via `/cam/operation/params` -> calculates diff -> stores override with context
- Override storage: `~/.prism/fusion360/user-overrides.json` keyed by `{material_iso}_{operation_type}_{tool_type}`
- Future suggestions incorporate learned overrides with decay weight (recent overrides weighted more)
- Wire to existing `SelfLearningCAMEngine` for Bayesian prior updating
- "Why did you change this?" prompt in the UI panel — stores free-text reason alongside the numerical override
- This becomes tribal knowledge: federated across the shop via the TribalKnowledge pipeline

---

## Phase 3: Ultimate Tier — Internal Toolpaths + Per-Block S/F (Milestones 6-7)

### Milestone 6: Per-Block Variable Speed/Feed
**Duration**: 3 weeks
**Dependencies**: Milestone 5

#### Deliverables

**6.1 Post-processor per-block S/F injection**
- This is the viable path (not one-operation-per-block in Fusion)
- Flow: Fusion generates G-code with constant S/F -> PostProcessorPipelineEngine Phase 2 (block-by-block) re-computes optimal S/F per block based on engagement geometry -> writes new G-code with variable S/F
- Per-block physics: Kienzle force recalculated per block using actual ae/ap from toolpath geometry
- Chatter avoidance: per-block RPM adjustment to stay off stability lobe peaks
- Thermal compensation: reduce feed in thermally critical zones (deep pockets, thin walls)
- The `ToolpathBlock` type in PostProcessorPipelineEngine already has `engagement`, `forces`, and `thermal` fields — this is about wiring them to actual engagement data extracted from Fusion's toolpath

**6.2 Toolpath engagement extraction (new Python endpoint)**
- `GET /cam/toolpath/engagement` — For a generated toolpath, extract per-move engagement data
- Uses Fusion's toolpath viewer API to get ae/ap per move
- Returns array of `{ move_index, x, y, z, ae_mm, ap_mm, arc_length_mm }`
- This is the data source for per-block Kienzle recalculation

**6.3 G-code merge pipeline**
- New endpoint: `POST /cam/post-perblock` that:
  1. Post-processes from Fusion (standard S/F)
  2. Extracts engagement data from toolpath
  3. Runs PostProcessorPipelineEngine with per-block mode
  4. Validates against machine limits (max RPM delta per block, max accel)
  5. Writes final G-code with variable S/F
  6. Generates diff report showing before/after per block

---

### Milestone 7: Internal Toolpath Generation + Multi-Setup Orchestration
**Duration**: 6 weeks (most complex milestone)
**Dependencies**: Milestone 6

#### Deliverables

**7.1 PRISM Toolpath Kernel integration**
- Wire `NovelToolpathEngine` (6 algorithms: TGAR, HRAF, MTHZD, CFSF, PTDC, VCER) to produce actual toolpath coordinates
- Currently NovelToolpathEngine computes parameters but does not emit G-code blocks
- Add G-code emitter: `ToolpathBlock[]` -> G-code via PostProcessorPipelineEngine
- For each algorithm, implement the coordinate generation loop:
  - TGAR: thermal-gradient adaptive roughing — spiral with variable ae based on temperature model
  - HRAF: harmonic-resonance avoidant finishing — RPM varies to avoid SLD peaks
  - CFSF: constant-force spiral finishing — ae varies to maintain constant Fc
  - PTDC: predictive tool deflection compensation — offset toolpath by predicted deflection
  - VCER: vortex chip evacuation roughing — trochoidal with optimized chip ejection angle

**7.2 Toolpath comparison engine (new engine, ~400 LOC)**
- File: `H:/PRISM/mcp-server/src/engines/ToolpathComparisonEngine.ts`
- Compares PRISM-generated toolpath against Fusion's toolpath for the same feature
- Metrics: cycle time, peak force, average force, max deflection, surface finish, tool wear
- Decision logic: only replace Fusion's toolpath if PRISM's is measurably better on the optimization target (balanced/speed/life/cost/quality)
- User always sees the comparison and explicitly approves the replacement

**7.3 Fusion toolpath replacement mechanism**
- When PRISM toolpath wins comparison:
  1. Delete the Fusion operation
  2. Create a new "trace" operation in Fusion that follows PRISM's coordinates
  3. OR: Bypass Fusion entirely and emit G-code directly (no Fusion operation at all)
- Option 3 is more practical for initial release — PRISM generates the G-code for that feature, Fusion handles the rest
- Hybrid approach: Fusion handles setup/fixture/WCS, PRISM handles toolpath + S/F for selected operations

**7.4 Multi-setup orchestration**
- File: `H:/PRISM/mcp-server/src/engines/MultiSetupOrchestratorEngine.ts` (~600 LOC)
- Coordinates across multiple setups in a single part:
  - Thermal sequencing (rough all sides first, then finish after thermal relaxation)
  - Fixture planning (which features accessible in which setup)
  - Datum transfer (carry WCS between setups with probing)
  - Tool sharing optimization (minimize tool changes across setups)
- Wire to Fusion: create/modify multiple setups with operation ordering

**7.5 Cloud CAM history indexing**
- Store every CAM session: material, machine, tools, strategies, parameters, cycle time, user overrides
- Index by part feature signature (hash of feature types + dimensions)
- When a similar part appears, recall the best previous solution
- Storage: PostgreSQL (existing db schema in `H:/PRISM/mcp-server/src/db/`)
- Search: fuzzy geometry matching using bounding box + face type histogram

**7.6 Full setup control endpoints**
- `POST /cam/setup/modify` — Modify existing setup (WCS origin, stock, bodies)
- `POST /cam/operation/modify` — Modify existing operation parameters
- `POST /cam/operation/reorder` — Reorder operations within a setup
- `DELETE /cam/operation` — Remove an operation
- All with user approval gate (never auto-modify without explicit consent, per OptimizationTierEngine design principle)

---

## Phase 4: Polish + Launch (Milestone 8)

### Milestone 8: Integration Testing + Launch
**Duration**: 3 weeks
**Dependencies**: All previous milestones

#### Deliverables

**8.1 End-to-end integration tests**
- Test matrix: 3 tiers x 5 material groups x 4 strategy types x 3 machine types = 180 test cases
- Live Fusion 360 integration tests (requires Fusion running)
- Mock-based unit tests for all new engines
- Physics validation: compare PRISM suggestions against manufacturer data sheets

**8.2 UI polish**
- Panel visual design: match Fusion 360's dark theme
- Progress indicators for long operations (toolpath gen, physics convergence)
- Error messages: clear, actionable, with "fix it" buttons where possible
- Keyboard shortcuts for common actions

**8.3 Documentation + installer**
- Auto-installer script (copies add-in, validates Fusion version, runs health check)
- User guide per tier (what you get, how to use it)
- API reference for the Python add-in endpoints
- Upgrade flow: one-click upgrade from Free to Pro to Ultimate

---

## Dependency Graph

```
M1 (License/Tier Gate)
  |
  v
M2 (Free Tier Panel) ─────────────────────────┐
  |                                             |
  v                                             |
M3 (CAM Parameter Mapping) ───────┐             |
  |                               |             |
  v                               v             |
M4 (Tool Library + Collision)   M5 (Setup Intel + Post)
  |                               |             |
  └───────────┬───────────────────┘             |
              v                                 |
M6 (Per-Block S/F)                              |
  |                                             |
  v                                             |
M7 (Internal Toolpaths + Multi-Setup)           |
  |                                             |
  └─────────────────────────────────────────────┘
              |
              v
M8 (Integration + Launch)
```

---

## Estimated Total Effort

| Milestone | Duration | New LOC (est.) | Modified LOC (est.) |
|-----------|----------|----------------|---------------------|
| M1: License/Tier | 2 wk | ~750 | ~350 |
| M2: Free Panel | 2 wk | ~800 | ~200 |
| M3: CAM Params | 4 wk | ~1,800 | ~800 |
| M4: Tool Library | 3 wk | ~600 | ~400 |
| M5: Setup Intel + Post | 3 wk | ~1,200 | ~500 |
| M6: Per-Block S/F | 3 wk | ~800 | ~600 |
| M7: Internal Toolpaths | 6 wk | ~2,500 | ~800 |
| M8: Integration + Launch | 3 wk | ~1,000 | ~500 |
| **Total** | **26 wk** | **~9,450** | **~4,150** |

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Fusion CAM parameter API is read-only for some params | High | Discovery via `/execute` with `operation.parameters.itemByName()` enumeration. Fallback: use raw Python code injection for inaccessible params |
| Toolpath engagement data not extractable from Fusion API | High | Alternative: parse G-code to reconstruct engagement from XYZ moves + stock model. More work but independent of Fusion API |
| Fusion's operation creation API rejects PRISM-generated parameters | Medium | Validate all parameter values against documented Fusion ranges before injection. Use try/catch per parameter, report partial success |
| License cracking (Python is readable) | Medium | Obfuscate critical paths, server-side feature validation for high-value operations, watermark output G-code with license ID |
| Performance: 86,400 plugin evaluations in Tier 4 convergence | Low | Already handled by PhysicsFusionConvergenceEngine with adaptive relaxation, Anderson acceleration, and spectral radius estimation. Timeout guard at 30s |

---

## Files Critical to Every Milestone

These are the integration points that nearly every milestone touches:

1. `H:/PRISM/mcp-server/scripts/fusion360-addin/fusion360_api_server.py` — Python add-in (every milestone adds endpoints)
2. `H:/PRISM/mcp-server/src/engines/Fusion360LiveBridgeEngine.ts` — TypeScript bridge (every milestone adds methods)
3. `H:/PRISM/mcp-server/src/engines/FusionToolExportEngine.ts` — Tool export (M4 extends, M3 validates)
4. `H:/PRISM/mcp-server/src/engines/AutoProgramOrchestratorEngine.ts` — Main pipeline (M3-M7 wire into stages)
5. `H:/PRISM/mcp-server/src/engines/PostProcessorPipelineEngine.ts` — Post-processor (M5 wires, M6 extends for per-block)
