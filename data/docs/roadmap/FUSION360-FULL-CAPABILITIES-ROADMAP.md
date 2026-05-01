# FUSION 360 FULL PRISM CAPABILITIES ROADMAP
## Track ID: F360-FULL | 8 Milestones | 36 Units | ~17 Sessions
## Generated: 2026-04-03 by RGS Pipeline (10-stage)

**MISSION:** Make PRISM a 3-tier product inside Fusion 360 — from free S/F calculator to full autonomous CNC programming with internal toolpaths — where every field is accurate to tooling specs and the user's stock/fixture inputs drive every calculation.

**3-TIER MODEL:**
- **Free (Lite):** Basic S/F calculator (limited engines)
- **Pro:** Full physics, full DB access (95K tools, 910 machines), optimized params in ALL Fusion CAM tabs, optimized post output, setup suggestions + warnings, user preference learning
- **Ultimate:** Internal PRISM toolpaths when mathematically better, per-block variable S/F, full setup control + multi-setup, fleet learning, cloud CAM indexing

**DEPENDENCIES:** F360-AP-MS0 through MS5 (COMPLETE)

**ENFORCEMENT HOOKS ACTIVE:**
- PRE: knowledge-consult, context-retention, constants-checker
- POST: stub-detector, test-quality, physics-agent, wiring-agent
- COMPACT: review-gate, forge-triple-gate, session-audit-agent
- POST-COMPACT: Feature Cascade (SESSION_ARTIFACTS.json)

**MCP SESSION PROTOCOL (MANDATORY EVERY SESSION):**
- START: `prism_session:context_boot` → `prism_session:dispatcher_map` → `prism_session:memory_recall` → `prism_session:system_snapshot` → `prism_session:action_search "<goal>"`
- DURING (every 5-10 calls): `prism_session:auto_checkpoint` → `prism_session:action_search "<need>"`
- END: `prism_session:memory_save` → `prism_session:system_snapshot` → `prism_session:checkpoint_enhanced`
- PLUGINS: Vitest MCP (`mcp__vitest__run_tests`), ESLint MCP (`mcp__eslint__lint-files`)

**SECURITY ARCHITECTURE:**
- License JWT: **RS256 (asymmetric)** — public key embedded in client, private key server-only. NOT HMAC-SHA256.
- License revocation: online check every 7 days (offline grace period: 14 days for air-gapped facilities)
- localhost:18360 API: per-session bearer token generated on Fusion startup
- Python add-in: code-signed .pyd compiled module for tier enforcement (not raw .py)

**PYTHON ADD-IN MODULARIZATION:**
- `fusion360_api_server.py` → split into modules: `cam_endpoints.py`, `tool_endpoints.py`, `license_endpoints.py`, `setup_endpoints.py`, `learning_endpoints.py`
- Centralized `unit_converter.py` — ALL mm↔cm conversions in one place (1 cm = 10 mm for Fusion internal API)
- Max ~800 LOC per module file

**PERFORMANCE BUDGETS:**
- Per-block physics (Kienzle + SLD + deflection + thermal): <2ms per block, max 10s for 5,000-block program
- Collision pre-check: <5s for 3-axis, <15s for 5-axis (convex decomposition for non-convex swept volumes)
- Tip retrieval: <500ms
- Override detection: <1s
- Cloud history query: <2s
- Tool catalog search: indexed in-memory (lazy-loaded ~48MB, LRU cache for frequent queries)
- Memory budget: <500MB additional to Fusion's baseline
- Fallback: if per-block physics exceeds 10s, fall back to operation-level S/F with warning

**LEARNING SYSTEM DESIGN:**
- Cold-start priors: physics-informed (Kienzle defaults per ISO group as initial Bayesian priors, NOT flat priors)
- Override key hierarchy: `{iso_group}` → `{iso_group}_{op_type}` → `{iso_group}_{op_type}_{tool_type}` → `{iso_group}_{op_type}_{tool_type}_{machine}` (hierarchical pooling — specific keys inherit from general when data is sparse)
- Decay: exponential decay with half-life = 60 days (not step function)
- "Why did you change?" dialog: max 1 per session, deferred to session-end review panel (not mid-operation)
- Quality feedback loop: if a learned override causes tool alarm/crash within 7 days, auto-revert and flag
- Shop-wide vs per-user: overrides stored per-operator but aggregated at shop level with confidence weighting
- Privacy: fleet learning uses differential privacy (ε=1.0) — no raw S/F values leave the shop

**COLLISION DETECTION ARCHITECTURE:**
- 3-axis: SAT (Separating Axis Theorem) — adequate for convex tool+holder assemblies
- 5-axis: convex decomposition of swept volumes using V-HACD, then per-convex SAT
- False negative test corpus: 25 known collision scenarios from manufacturing incident database
- HARD BLOCK override: user can acknowledge + proceed with documented risk acceptance (logged + timestamped)
- Fusion native collision vs PRISM collision: PRISM runs first (pre-CAM), Fusion runs second (post-toolpath). If disagreement, show both results and let user decide

---

## MILESTONE F360-FULL-MS1: License Infrastructure + Tier Gating
**Track:** F360-FULL | **Status:** not_started | **Units:** 3 | **Sessions:** 1
**Dependencies:** F360-AP-MS5

### SESSION S1: License Tier System (U-FLIC01..U-FLIC03)
**SMART CONFIG:** Role=SystemArchitect + SecurityEngineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
**KNOWLEDGE:**
  - ENGINES: AlgorithmGatewayEngine (1,712 LOC — tier filtering pattern), PhysicsFusionOrchestratorEngine (992 LOC — tier routing)
  - REFERENCE: Fusion 360 Add-In manifest spec, JWT RFC 7519
  - FORMULAS: None (infrastructure milestone)
**INTENT:** After installing PRISM, the user sees only features matching their subscription. Free users get a clean S/F panel. Pro users see optimization controls across all CAM tabs. Upgrade is one click. No confusion about what's available at their tier.
**SKILLS:** /forge-engines, /forge-wiring, /test

**WORK:**

**U-FLIC01: LicenseTierGateEngine (~400 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Tier enum: `free | pro | ultimate`
  - Feature flag map: maps each PRISM capability to minimum tier
  - JWT validation: offline verification with RS256 (asymmetric — public key in client, private key server-only), fields: tier, expiry, machine_fingerprint, shop_id
  - Online activation endpoint for initial setup + periodic refresh
  - `canAccess(feature: string, tier: Tier): boolean`
  - `getAvailableFeatures(tier: Tier): string[]`
  - FILES_CREATED: src/engines/LicenseTierGateEngine.ts, src/__tests__/license-tier-gate.test.ts
  - ABORT_CRITERIA: >=3 — JWT validation fails on valid tokens, tier gating allows unauthorized access, tests <90% coverage
  - ROLLBACK: git checkout -- src/engines/LicenseTierGateEngine.ts src/__tests__/license-tier-gate.test.ts

**U-FLIC02: Python Add-In Tier Gating (~200 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Depends on: U-FLIC01
  - New `/license/validate` endpoint in fusion360_api_server.py
  - `_check_tier(required_tier)` decorator on ALL existing endpoints
  - Tier-based endpoint whitelist wrapping `_dispatch_post`/`_dispatch_get`
  - License file: `%APPDATA%/Autodesk/Autodesk Fusion 360/API/AddIns/PRISMBridge/license.json`
  - UI panel element visibility per tier (hide pro/ultimate features from free users)
  - FILES_MODIFIED: scripts/fusion360-addin/fusion360_api_server.py
  - ABORT_CRITERIA: >=3 — free user sees pro UI elements, endpoint responds without tier check, license file unencrypted
  - ROLLBACK: git checkout -- scripts/fusion360-addin/fusion360_api_server.py

**U-FLIC03: TypeScript Bridge Tier Enforcement (~150 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Depends on: U-FLIC01
  - `setTier(tier)` method on Fusion360LiveBridgeEngine
  - Per-method tier checks (belt-and-suspenders with Python gating)
  - Tier propagation to downstream engines (SpeedFeedOrchestrator, CollisionEngine, etc.)
  - FILES_MODIFIED: src/engines/Fusion360LiveBridgeEngine.ts
  - FILES_CREATED: src/__tests__/fusion-tier-enforcement.test.ts
  - ABORT_CRITERIA: >=3 — method callable without tier set, tier bypass possible, no logging of denied access
  - ROLLBACK: git checkout -- src/engines/Fusion360LiveBridgeEngine.ts

**FORGE-TRIPLE:**
  - HOOK: `license-gate-hook` — blocks any Fusion endpoint call without valid tier
  - ACTION: prism_cam:license_validate — validate license and return tier + features
  - SKILL: /fusion-license — manage Fusion 360 license tier

**FEATURE CASCADE:**
  - NEW_HOOKS: license-gate-hook → blocks unlicensed Fusion API calls
  - NEW_ACTIONS: prism_cam:license_validate → tier + feature list
  - NEW_SKILLS: /fusion-license → manage license
  - AVAILABLE_TO: MS2, MS3, MS4, MS5, MS6, MS7, MS8 (all downstream milestones import tier gating)
  - SESSION_ARTIFACTS: LicenseTierGateEngine.ts, license_validate endpoint, tier enforcement decorators

**EXIT GATE:** ✓ JWT RS256 validation passes for all 3 tiers | ✓ Free user blocked from pro endpoints | ✓ Python + TS both enforce | ✓ 12+ tests pass | omega_floor >= 1.0

---

## MILESTONE F360-FULL-MS2: Free Tier Panel (PRISM Lite)
**Track:** F360-FULL | **Status:** not_started | **Units:** 3 | **Sessions:** 1
**Dependencies:** F360-FULL-MS1

### SESSION S2: Free Panel Implementation (U-FLIT01..U-FLIT03)
**SMART CONFIG:** Role=FrontendEngineer + MachinistUX | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
**KNOWLEDGE:**
  - ENGINES: SpeedFeedOrchestratorEngine (3,139 LOC), UltimateSpeedFeedEngine (3,005 LOC)
  - TRIBAL: fusion360-cam-tips.ts (39 tips), fusion360-cam-tips-ext.ts (161 tips)
  - CONSTANTS: CANONICAL_KIENZLE (6 ISO groups), CANONICAL_TAYLOR (6 ISO groups)
  - REFERENCE: Fusion 360 Add-In Panel API (adsk.core.Palette), MaterialRegistry (2,544 materials)
**INTENT:** A machinist installs PRISM Lite, sees a clean panel in Fusion, picks material + operation, gets physics-backed S/F recommendation instantly.
**SKILLS:** /forge-engines, /test

**WORK:**

**U-FLIT01: Panel UI Framework (~300 LOC Python)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Create prism_panel.py: Fusion 360 Palette with HTML/JS panel
  - Material selector dropdown: ISO groups (P/M/K/N/S/H) → common materials per group
  - Operation type selector: face, pocket, adaptive, contour, drill, bore, thread
  - Input fields: tool diameter, flute count, DOC, WOC, material hardness
  - Output display: RPM, feed (mm/min), feed/tooth, Vc (m/min), power (kW)
  - Fusion dark theme CSS
  - FILES_CREATED: scripts/fusion360-addin/prism_panel.py, scripts/fusion360-addin/prism_panel.html
  - ABORT_CRITERIA: >=3 — panel crashes Fusion, dark theme mismatch, dropdown missing ISO groups
  - ROLLBACK: git checkout -- scripts/fusion360-addin/prism_panel.*

**U-FLIT02: Basic S/F Calculator Wiring (~200 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Depends on: U-FLIT01
  - Wire panel inputs → `/calc/speed-feed` endpoint (new, free-tier)
  - SpeedFeedOrchestratorEngine at Tier 1 only: single-pass Kienzle, chip thinning correction, no convergence
  - Return: RPM, feed/tooth, table feed, Vc, est. power, est. Ra
  - Canonical constants from constants.ts — NEVER inline
  - FILES_MODIFIED: scripts/fusion360-addin/fusion360_api_server.py
  - ABORT_CRITERIA: >=3 — S/F values off by >15% vs HSMAdvisor baseline, wrong ISO group mapping, inline constants
  - ROLLBACK: git checkout -- scripts/fusion360-addin/fusion360_api_server.py

**U-FLIT03: Tool Search + Connection Status (~150 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Depends on: U-FLIT01
  - Tool search from 95,608-tool catalog (view only — no export at free tier)
  - Connection status indicator: bridge health check to localhost:18360
  - Auto-reconnect with exponential backoff
  - FILES_MODIFIED: scripts/fusion360-addin/prism_panel.py, scripts/fusion360-addin/prism_panel.html
  - ABORT_CRITERIA: >=3 — tool search returns wrong results, health check false positive, >2s latency
  - ROLLBACK: git checkout -- scripts/fusion360-addin/prism_panel.*

**FORGE-TRIPLE:**
  - HOOK: `free-tier-limit-hook` — blocks pro features from free panel
  - ACTION: prism_cam:free_speed_feed — free-tier S/F calculation
  - SKILL: /fusion-lite — launch PRISM Lite panel

**EXIT GATE:** ✓ Panel renders in Fusion dark theme | ✓ S/F matches HSMAdvisor ±10% for 6 ISO groups | ✓ Free user cannot access pro features | ✓ 10+ tests | omega_floor >= 1.0

---

## MILESTONE F360-FULL-MS3: Comprehensive CAM Parameter Mapping
**Track:** F360-FULL | **Status:** not_started | **Units:** 6 | **Sessions:** 3
**Dependencies:** F360-FULL-MS1

### SESSION S3: Parameter Discovery + Tool/Geometry Tabs (U-FCAM01..U-FCAM02)
**SMART CONFIG:** Role=CAMEngineer + FusionAPIExpert | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=50%
**KNOWLEDGE:**
  - ENGINES: AutoProgramOrchestratorEngine (992 LOC — 10-stage pipeline), ContextualStrategyOverrideEngine (675 LOC)
  - TRIBAL: fusion360-cam-tips.ts (39 tips), fusion360-cam-tips-ext.ts (161 tips)
  - REFERENCE: Fusion 360 adsk.cam.Operation parameter model, ToolpathStrategyRegistry (762 strategies)
  - CONSTANTS: canonical Kienzle/Taylor per ISO group
**INTENT:** When a machinist creates an Adaptive Clearing operation, PRISM auto-fills the Tool and Geometry tabs with physics-optimal values — they see the right spindle speed, feed, and boundary settings without manual calculation.
**SKILLS:** /forge-engines, /test, /action-search

**WORK:**

**U-FCAM01: Runtime Parameter Discovery (~400 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - New endpoint: `GET /cam/operation/discover-params` — uses `/execute` to enumerate `operation.parameters` for each operation type
  - Discover all params across 25 operation types × 5 tabs = ~400+ unique params
  - Cache discovered params in `fusion360-cam-params.ts` with metadata: name, type, range, default, tab, operation_types
  - Parameter categorization: feed params, geometry params, height params, pass params, link params
  - FILES_CREATED: src/data/fusion360-cam-params.ts, scripts/fusion360-addin endpoints
  - ABORT_CRITERIA: >=3 — <300 params discovered, missing entire tab category, stale cache not detected
  - ROLLBACK: git checkout -- src/data/fusion360-cam-params.ts

**U-FCAM02: Tool + Geometry Tab Mapping (~300 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Depends on: U-FCAM01
  - Tool tab params: spindle_speed, surface_speed, feed_per_tooth, feed_per_rev, ramp_feed, plunge_feed, lead_in_feed, lead_out_feed, retract_feed, coolant_mode
  - Geometry tab params: machining_boundary, tool_containment, contact_point_boundary, stock_contours, rest_machining_source, additional_offset, tolerance
  - Extend CAM_PARAM_MAP in Python add-in for these 2 tabs
  - FILES_MODIFIED: scripts/fusion360-addin/fusion360_api_server.py
  - ABORT_CRITERIA: >=3 — param name mismatch with Fusion API, wrong unit conversion (mm↔cm), missing coolant modes
  - ROLLBACK: git checkout -- scripts/fusion360-addin/fusion360_api_server.py

/compact checkpoint

### SESSION S4: Heights + Passes + Linking Tabs (U-FCAM03..U-FCAM04)
**SMART CONFIG:** Role=CAMEngineer + PhysicsSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=45%
**KNOWLEDGE:** Same as S3 + MachiningPlaybookEngine (4,465 LOC — 305 rules for pass strategy)
**INTENT:** The machinist opens any CAM operation and sees ALL tabs pre-filled: clearance heights, optimal stepdown/stepover, ramp angles, lead-in arcs — every value backed by physics for their specific material and tool. They can accept or override any value.

**WORK:**

**U-FCAM03: Heights + Passes Tab Mapping (~400 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Heights: clearance_height, retract_height, feed_height, top_height, bottom_height, offset modes
  - Passes: optimal_load, maximum_stepdown, stepover, smoothing, direction (climb/conventional), number_of_stepovers, ramp_type, ramp_angle, ramp_clearance, multiple_depths, finishing_passes, stock_to_leave_axial, stock_to_leave_radial, tolerance, smoothing_tolerance, use_reduced_feedrate_for_finishing
  - Strategy-specific pass params: adaptive (optimal_load, both_ways), contour (compensation_type), pocket (direction)
  - FILES_MODIFIED: scripts/fusion360-addin/fusion360_api_server.py
  - ABORT_CRITERIA: >=3 — stepdown exceeds tool flute length, stock-to-leave negative, ramp angle > helix angle of tool
  - ROLLBACK: git checkout -- scripts/fusion360-addin/fusion360_api_server.py

**U-FCAM04: Linking Tab + Strategy-Specific Params (~300 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Depends on: U-FCAM03
  - Linking: retract_policy, transition_type, lead_in_radius, lead_in_angle, lead_out_radius, lead_out_angle, entry_method, keepdown_enabled, stay_down_distance, ramp_entry_feed
  - Strategy-specific overrides: adaptive (look_ahead_depth, engagement_angle), contour (lead_in_type, compensation), drill (peck_depth, dwell_time, retract_amount)
  - FILES_MODIFIED: scripts/fusion360-addin/fusion360_api_server.py
  - ABORT_CRITERIA: >=3 — lead-in arc radius < tool radius, missing drill peck params, linking causes rapid-into-stock
  - ROLLBACK: git checkout -- scripts/fusion360-addin/fusion360_api_server.py

/compact checkpoint

### SESSION S5: Injection Engine + Read-Back Endpoints (U-FCAM05..U-FCAM06)
**SMART CONFIG:** Role=IntegrationArchitect + MachinistValidator | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=45%
**KNOWLEDGE:**
  - ENGINES: ToolpathStrategyRegistry (762 strategies), SmartDefaultsEngine, InverseSolverEngine
  - TRIBAL: All 200 Fusion 360 tips
**INTENT:** A machinist with an existing Fusion setup clicks "Optimize" and PRISM shows before/after: "Your feed was 800mm/min, PRISM recommends 650mm/min because deflection would exceed tolerance at your current depth. Accept?" They understand why and decide.

**WORK:**

**U-FCAM05: FusionCAMParameterInjectionEngine (~600 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Maps PRISM 762 strategy records → Fusion parameter payloads
  - Strategy-aware: adaptive params differ from contour differ from drill
  - Validates against Fusion constraints (ranges, types, dependencies)
  - Batch mode: `inject(operations: FusionOperation[], strategy: PRISMStrategy): ParameterPayload[]`
  - Per-tab granularity: can inject Tool only, Passes only, or ALL tabs
  - FILES_CREATED: src/engines/FusionCAMParameterInjectionEngine.ts, src/__tests__/fusion-cam-param-injection.test.ts
  - ABORT_CRITERIA: >=3 — strategy→param mapping produces invalid Fusion values, batch injection fails on 2nd operation, constraint violation not caught
  - ROLLBACK: git checkout -- src/engines/FusionCAMParameterInjectionEngine.ts

**U-FCAM06: Operation Read-Back + Optimize Endpoints (~300 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Depends on: U-FCAM05
  - `GET /cam/operation/params` — read ALL current params from existing operation (for "what did user set?")
  - `GET /cam/operations` — list all operations with type + param summaries
  - `POST /cam/operation/optimize` — inject PRISM-optimized params into existing operation, respecting user's stock/fixture
  - Return before/after comparison showing what PRISM changed and why
  - FILES_MODIFIED: scripts/fusion360-addin/fusion360_api_server.py
  - FILES_CREATED: src/__tests__/fusion-cam-readback.test.ts
  - ABORT_CRITERIA: >=3 — read-back misses params, optimize overwrites user's stock settings, before/after diff incorrect
  - ROLLBACK: git checkout -- scripts/fusion360-addin/fusion360_api_server.py

**FORGE-TRIPLE:**
  - HOOK: `cam-param-validation-hook` — blocks injection of physically impossible params
  - ACTION: prism_cam:fusion_inject_params — inject PRISM params into Fusion operations
  - SKILL: /fusion-optimize — optimize existing Fusion CAM operations with PRISM physics

**EXIT GATE:** ✓ 400+ Fusion params mapped | ✓ All 5 tabs populated for adaptive, contour, pocket, drill | ✓ Read-back matches Fusion UI values | ✓ 20+ tests | omega_floor >= 1.0

---

## MILESTONE F360-FULL-MS4: Full Tool Library with Collision Geometry
**Track:** F360-FULL | **Status:** not_started | **Units:** 4 | **Sessions:** 2
**Dependencies:** F360-FULL-MS1

### SESSION S6: Extended Tool + Holder Geometry Export (U-FTCL01..U-FTCL02)
**SMART CONFIG:** Role=ToolingEngineer + CollisionSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=45%
**KNOWLEDGE:**
  - ENGINES: FusionToolExportEngine (541 LOC), ToolAssemblyModelEngine, CollisionEngine (2,526 LOC)
  - REFERENCE: ToolRegistry (95,608 tools), HolderRegistry (512 holders), Fusion .tools JSON schema
  - TRIBAL: Tool geometry requirements for collision detection
**INTENT:** When a machinist loads PRISM's tool library into Fusion, every tool looks exactly like the physical cutter — correct point angle, holder profile, gauge length. Fusion's simulation shows the real collision envelope, not a simplified cylinder. No surprises on the machine.

**WORK:**

**U-FTCL01: Extended Tool Geometry Export (~200 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Add missing fields to FusionToolExportEngine:
    - Drills: point_angle, web_thickness, margin_width, coolant_through_diameter
    - Inserts: IC (inscribed_circle), insert_thickness, lead_angle, approach_angle, chipbreaker_code
    - All tools: taper_angle, rake_angle_axial, rake_angle_radial, relief_angle, edge_radius, bearing_length
  - Source data from ToolRegistry (fields exist in catalog data — audit each catalog for completeness)
  - Validate: every exported field matches manufacturer datasheet within ±0.01mm for geometry, ±0.5° for angles
  - FILES_MODIFIED: src/engines/FusionToolExportEngine.ts
  - FILES_CREATED: src/__tests__/fusion-tool-export-geometry.test.ts
  - ABORT_CRITERIA: >=3 — geometry field off by >0.01mm vs catalog, missing field for any tool type, NaN in exported JSON
  - ROLLBACK: git checkout -- src/engines/FusionToolExportEngine.ts

**U-FTCL02: Holder + Insert Geometry Export (~200 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Depends on: U-FTCL01
  - Add to FusionToolExportEngine:
    - Holder: bore_range_min/max, runout_tir_at_4xd, balance_grade, max_rpm, pull_stud_type, clamping_torque_nm
    - Shaft segments: detailed multi-diameter profile (not simplified conical)
    - Assembly gauge_length: computed from holder_length + tool_projection
  - Source data: Guhring (23 holders), Haimer (489 holders) registries
  - Validate: holder OD matches catalog spec, gauge length within ±0.5mm
  - FILES_MODIFIED: src/engines/FusionToolExportEngine.ts
  - ABORT_CRITERIA: >=3 — holder OD wrong, gauge length >0.5mm off, missing holders for common taper types
  - ROLLBACK: git checkout -- src/engines/FusionToolExportEngine.ts

/compact checkpoint

### SESSION S7: Assembly Import + Collision Pre-Check (U-FTCL03..U-FTCL04)
**SMART CONFIG:** Role=CollisionEngineer + SafetyValidator | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=45%
**KNOWLEDGE:**
  - ENGINES: CollisionEngine (2,526 LOC), SweptVolumeEngine (265 LOC), IntegratedVerificationEngine, ToolAssemblyModelEngine
  - REFERENCE: Fusion 360 tool import API
**INTENT:** Before the machinist generates a toolpath, PRISM checks "will this tool+holder fit without hitting the part, fixture, or vise?" If not, the machinist sees exactly where the collision would happen and which holder is too large — before any metal moves.

**WORK:**

**U-FTCL03: Tool Assembly Import Endpoint (~200 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - New `POST /tool-import-assembly`: imports tool + holder + shaft as complete collision assembly
  - Tool + holder pairing validation: bore range vs shank diameter, taper compatibility
  - Correct gauge length computation: holder_gauge + tool_stickout
  - Batch import: up to 50 assemblies per request
  - FILES_MODIFIED: scripts/fusion360-addin/fusion360_api_server.py
  - FILES_CREATED: src/__tests__/fusion-tool-assembly-import.test.ts
  - ABORT_CRITERIA: >=3 — shank/bore mismatch not caught, gauge length wrong, Fusion import fails
  - ROLLBACK: git checkout -- scripts/fusion360-addin/fusion360_api_server.py

**U-FTCL04: Collision Pre-Check Endpoint (~300 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Depends on: U-FTCL03
  - New `POST /cam/collision-precheck`: takes tool assembly + stock + fixture geometry → clearance report
  - Wire CollisionEngine (SAT + swept volume) for pre-verification BEFORE toolpath generation
  - Returns: collision_free boolean, min_clearance_mm, collision_points[], risk_zones[]
  - HARD BLOCK: if collision detected, refuse to generate toolpath until user resolves
  - FILES_MODIFIED: scripts/fusion360-addin/fusion360_api_server.py, src/engines/Fusion360LiveBridgeEngine.ts
  - FILES_CREATED: src/__tests__/fusion-collision-precheck.test.ts
  - ABORT_CRITERIA: >=3 — false negative (missed collision), pre-check >5s latency, hard block bypassable
  - ROLLBACK: git checkout -- scripts/fusion360-addin/fusion360_api_server.py src/engines/Fusion360LiveBridgeEngine.ts

**FORGE-TRIPLE:**
  - HOOK: `collision-precheck-hook` — blocks toolpath generation when collision pre-check fails
  - ACTION: prism_cam:fusion_collision_precheck — pre-CAM collision verification
  - SKILL: /fusion-collision — check tool assembly clearance

**EXIT GATE:** ✓ All tool geometry fields match manufacturer spec ±0.01mm | ✓ Holder geometry complete for 17 taper types | ✓ Collision pre-check catches known collision scenarios | ✓ HARD BLOCK works | ✓ 15+ tests | omega_floor >= 1.0

---

## MILESTONE F360-FULL-MS5: Setup Intelligence + Post-Processor + Learning
**Track:** F360-FULL | **Status:** not_started | **Units:** 6 | **Sessions:** 3
**Dependencies:** F360-FULL-MS3, F360-FULL-MS4

### SESSION S8: Setup Read-Back + Physics Analysis (U-FSIL01..U-FSIL02)
**SMART CONFIG:** Role=ProcessEngineer + PhysicsValidator | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=50%
**KNOWLEDGE:**
  - ENGINES: WorkholdingVerificationEngine (466 LOC), WorkholdingForceEngine (267 LOC), KienzleForceModelEngine (819 LOC), ToolDeflectionPredictionEngine (348 LOC), SurfaceFinishPredictorEngine (445 LOC), ChatterStabilityLobeEngine (707 LOC)
  - TRIBAL: MachiningPlaybookEngine (305 rules), fusion360-cam-tips (200 tips)
  - CONSTANTS: canonical Kienzle/Taylor/deflection per ISO group
**INTENT:** PRISM reads a user's complete Fusion setup, analyzes every operation with full physics, and suggests improvements + warnings.

**WORK:**

**U-FSIL01: Setup Read-Back Endpoints (~300 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - `GET /cam/setup/full` — reads: stock dimensions, WCS origin, fixture bodies, model bodies, all operations with params
  - `GET /cam/setups` — list all setups in document with summary
  - Parse Fusion setup object: stock type (relative/fixed/from-body), WCS (model origin/selected point), fixture type
  - FILES_MODIFIED: scripts/fusion360-addin/fusion360_api_server.py
  - ABORT_CRITERIA: >=3 — stock dimensions wrong, WCS origin offset, missing operations in readback
  - ROLLBACK: git checkout -- scripts/fusion360-addin/fusion360_api_server.py

**U-FSIL02: Physics Analysis Per Operation (~400 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Depends on: U-FSIL01
  - `GET /cam/setup/analysis` — analyzes setup and returns per-operation:
    - Force ratio: Fc_actual / spindle_max_force (warn if >0.8)
    - Deflection: predicted δ vs tolerance/3 (warn if exceeded)
    - Thermal risk: T_cutting vs material safe temp (warn if >80%)
    - Tool life estimate: Taylor hours remaining
    - Surface finish: predicted Ra vs target (warn if Ra > target)
    - Stability: is RPM on SLD peak? (warn + suggest shift)
  - Setup-level warnings: "radial force exceeds clamping at op 3", "no finishing pass after roughing"
  - Suggestions: "reduce stepdown from 3mm to 2.1mm to stay under deflection limit"
  - FILES_CREATED: src/engines/FusionSetupAnalysisEngine.ts, src/__tests__/fusion-setup-analysis.test.ts
  - ABORT_CRITERIA: >=3 — physics values off by >20% vs known reference, false warnings, missing critical safety warning
  - ROLLBACK: git checkout -- src/engines/FusionSetupAnalysisEngine.ts

/compact checkpoint

### SESSION S9: Post-Processor Wiring (U-FSIL03..U-FSIL04)
**SMART CONFIG:** Role=PostProcessorEngineer + MachinistValidator | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=45%
**KNOWLEDGE:**
  - ENGINES: PostProcessorPipelineEngine (3,601 LOC — 38 stages, 20 dialects), FusionCPSParserEngine (537 LOC)
  - REFERENCE: 121 controller-specific tips, fusion-post-strategies.json
**INTENT:** Fusion's G-code output is post-processed by PRISM's 38-stage pipeline for optimized output.

**WORK:**

**U-FSIL03: Post-Processor Wiring (~300 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - `POST /cam/post-optimize`: Fusion generates G-code via `/cam/post`, PRISM reads output, runs PostProcessorPipelineEngine, writes optimized version
  - Operation-level S/F optimization (constant per operation — per-block is Ultimate tier)
  - Safe move validation, arc optimization, redundant code removal
  - Side-by-side: original.nc + prism_optimized.nc in same output folder
  - FILES_MODIFIED: scripts/fusion360-addin/fusion360_api_server.py, src/engines/Fusion360LiveBridgeEngine.ts
  - ABORT_CRITERIA: >=3 — optimized G-code has syntax error, wrong controller dialect, safety moves removed
  - ROLLBACK: git checkout -- scripts/fusion360-addin/fusion360_api_server.py src/engines/Fusion360LiveBridgeEngine.ts

**U-FSIL04: User Preference Detection (~200 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Depends on: U-FCAM06 (read-back endpoints)
  - Snapshot operation params before PRISM injection → track params after user modification
  - Detect delta: what did user change from PRISM's suggestion?
  - Categorize overrides: speed change, feed change, DOC change, strategy change, tool change
  - Store raw override events for learning engine
  - FILES_CREATED: src/engines/FusionUserPreferenceDetectorEngine.ts
  - ABORT_CRITERIA: >=3 — delta detection misses changes, false positive overrides, >1s detection latency
  - ROLLBACK: git checkout -- src/engines/FusionUserPreferenceDetectorEngine.ts

/compact checkpoint

### SESSION S10: Learning Engine + Tribal Knowledge Integration (U-FSIL05..U-FSIL06)
**SMART CONFIG:** Role=MLEngineer + MachinistValidator | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=50%
**KNOWLEDGE:**
  - ENGINES: SelfLearningCAMEngine (1,740 LOC), StrategyRankingUpdateEngine, BayesianAdaptiveEngine, TransferLearningEngine, TribalKnowledgeEngine (835 LOC)
  - TRIBAL: 3,819 tips across 21 CAM systems
**INTENT:** PRISM politely asks "what makes your setup better?", stores the answer, and adjusts future suggestions. Knowledge propagates across the shop.

**WORK:**

**U-FSIL05: Override Learning Engine (~500 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Depends on: U-FSIL04
  - FusionUserPreferenceLearningEngine:
    - Receives override events from detector
    - Asks user: "I noticed you changed stepdown from 2.1mm to 2.5mm — what makes this better for your setup?" (panel dialog)
    - Stores override keyed by `{material}_{operation_type}_{tool_type}_{machine}`
    - Wire to SelfLearningCAMEngine Bayesian prior updating
    - Decay weighting: recent overrides weighted 2x, >30 days weighted 0.5x
    - Feed confirmed overrides into tribal knowledge (new tips with source: "shop floor learning")
  - FILES_CREATED: src/engines/FusionUserPreferenceLearningEngine.ts, src/__tests__/fusion-user-learning.test.ts
  - ABORT_CRITERIA: >=3 — learning corrupts Bayesian priors, override decay inverted, tip generation fails
  - ROLLBACK: git checkout -- src/engines/FusionUserPreferenceLearningEngine.ts

**U-FSIL06: Tribal Knowledge Integration (~200 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Depends on: U-FSIL05
  - Wire TribalKnowledgeEngine into Fusion panel: show relevant tips during operation creation
  - Context-aware tip selection: material + operation + tool → top 3 tips
  - Display in panel sidebar: "PRISM TIP: For Inconel adaptive clearing, use 5% stepover max (source: shop floor 2026-03)"
  - FILES_MODIFIED: scripts/fusion360-addin/prism_panel.py, src/engines/Fusion360LiveBridgeEngine.ts
  - ABORT_CRITERIA: >=3 — irrelevant tips shown, tips contradict physics, >500ms tip retrieval
  - ROLLBACK: git checkout -- scripts/fusion360-addin/prism_panel.py src/engines/Fusion360LiveBridgeEngine.ts

**FORGE-TRIPLE:**
  - HOOK: `learning-quality-hook` — validates learned overrides don't violate physics constraints
  - ACTION: prism_cam:fusion_learn_preference — store and apply user preference
  - SKILL: /fusion-learn — manage Fusion 360 learning preferences

**EXIT GATE:** ✓ Setup read-back matches Fusion UI | ✓ Physics analysis catches 5 known unsafe scenarios | ✓ Post-optimizer produces valid G-code for 3 controller dialects | ✓ Learning stores and recalls overrides | ✓ 25+ tests | omega_floor >= 1.0

---

## MILESTONE F360-FULL-MS6: Per-Block Variable Speed/Feed
**Track:** F360-FULL | **Status:** not_started | **Units:** 4 | **Sessions:** 2
**Dependencies:** F360-FULL-MS5

### SESSION S11: Engagement Extraction + Per-Block Physics (U-FBLK01..U-FBLK02)
**SMART CONFIG:** Role=PhysicsEngineer + PostProcessorSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=50%
**KNOWLEDGE:**
  - ENGINES: PostProcessorPipelineEngine (3,601 LOC — Phase 2 block-by-block), KienzleForceModelEngine (819 LOC), SpeedFeedOrchestratorEngine (3,139 LOC), ChatterStabilityLobeEngine (707 LOC), CuttingTemperatureEngine (235 LOC)
  - CONSTANTS: CANONICAL_KIENZLE, CANONICAL_TAYLOR per ISO group
  - FORMULAS: F-KIENZLE-001, F-TAYLOR-001, F-CHIPTHK-001, F-CHATTER-001
**INTENT:** A machinist loads the optimized G-code and sees variable S/F that matches cutting conditions block-by-block — heavier cuts get slower feeds, light passes get aggressive feeds, and RPM never sits on a chatter peak. The operator trusts the output because every value has physics justification.

**CANONICAL PHYSICS (import from src/physics/constants.ts — NEVER inline):**
  - Kienzle: `Fc = kc1.1 × h^(1-mc) × b` where kc1.1 and mc from CANONICAL_KIENZLE[iso_group]
  - Taylor: `T = (C / Vc)^(1/n)` where C and n from CANONICAL_TAYLOR[iso_group]
  - Deflection: `δ = (F × L³) / (3 × E × I)` — cantilever beam model for tool assembly
  - Chip thinning: `fz_adj = fz / sqrt(1 - (1 - 2×ae/D)²)` — for ae < D/2
  - Chatter stability: `a_lim = -1 / (2 × Ks × Re[G(jω)])` — stability lobe diagram
  - Safety factors: Fc < 0.8 × spindle_max_force, δ < tolerance/3, T_cutting < 0.8 × T_material_safe

**WORK:**

**U-FBLK01: Toolpath Engagement Extraction (~300 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - `GET /cam/toolpath/engagement` — extract per-move ae/ap from Fusion toolpath geometry
  - Parse Fusion toolpath: linear moves (G1), arcs (G2/G3), rapids (G0) — extract start/end coords + tool engagement
  - Compute per-block: actual ae (width of cut), actual ap (depth of cut), chip thickness
  - Return: array of {block_number, x, y, z, ae_mm, ap_mm, h_avg_mm, engagement_angle_deg}
  - FILES_MODIFIED: scripts/fusion360-addin/fusion360_api_server.py
  - ABORT_CRITERIA: >=3 — ae/ap extraction off by >10%, arcs not handled, rapid moves classified as cutting
  - ROLLBACK: git checkout -- scripts/fusion360-addin/fusion360_api_server.py

**U-FBLK02: Per-Block Kienzle Recalculation (~400 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Depends on: U-FBLK01
  - For each cutting block: recompute Fc using actual ae/ap via Kienzle (Fc = kc1.1 × h^(1-mc) × b)
  - Compute optimal RPM: maximize MRR while Fc < spindle_max × safety_factor (0.8)
  - Compute optimal feed: fz = target_h / sin(engagement_angle), capped by deflection + surface finish
  - Wire PostProcessorPipelineEngine Phase 2 (block-by-block) with actual engagement data
  - FILES_CREATED: src/engines/FusionPerBlockPhysicsEngine.ts, src/__tests__/fusion-per-block-physics.test.ts
  - ABORT_CRITERIA: >=3 — force calculation off by >15% vs reference, RPM exceeds machine max, feed causes chatter
  - ROLLBACK: git checkout -- src/engines/FusionPerBlockPhysicsEngine.ts

/compact checkpoint

### SESSION S12: Chatter Avoidance + Thermal Comp + Final Pipeline (U-FBLK03..U-FBLK04)
**SMART CONFIG:** Role=DynamicsSpecialist + ThermalEngineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=45%
**KNOWLEDGE:**
  - ENGINES: ChatterStabilityLobeEngine (707 LOC), StochasticChatterEngine (553 LOC), CuttingTemperatureEngine (235 LOC), ThermalWearCouplingEngine (397 LOC)
**INTENT:** Per-block RPM avoids chatter peaks, feed compensates for thermal buildup in deep pockets, final G-code has variable S/F throughout.

**WORK:**

**U-FBLK03: Chatter Avoidance Per Block (~250 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Depends on: U-FBLK02
  - For each block's RPM: check against SLD (stability lobe diagram)
  - If RPM sits on unstable peak: shift to nearest stable valley (±5% preferred, up to ±15% max)
  - Encode shifted RPM as S-word override in G-code
  - Log: "Block 47: RPM shifted from 8000 to 7650 (chatter avoidance, SLD valley at 7650)"
  - FILES_MODIFIED: src/engines/FusionPerBlockPhysicsEngine.ts
  - ABORT_CRITERIA: >=3 — RPM shift moves INTO unstable zone, shift >15%, surface finish degraded by shift
  - ROLLBACK: git checkout -- src/engines/FusionPerBlockPhysicsEngine.ts

**U-FBLK04: Thermal Compensation + Final Pipeline (~300 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Depends on: U-FBLK03
  - Thin wall detection: if remaining stock < 2mm, reduce feed by 30% (thermal sensitivity)
  - Deep pocket detection: if Z depth > 3×tool_diameter, reduce feed by 15% (chip evacuation)
  - Corner slowdown: at direction changes >45°, ramp feed 50% over 2mm approach distance
  - `POST /cam/post-perblock`: orchestrates full flow → writes final G-code with variable S/F
  - Side-by-side comparison: cycle time, peak Fc, min tool life, worst-case Ra
  - FILES_MODIFIED: scripts/fusion360-addin/fusion360_api_server.py, src/engines/FusionPerBlockPhysicsEngine.ts
  - ABORT_CRITERIA: >=3 — thermal comp causes <50% feed (too aggressive), corner slowdown misses corners, cycle time >20% worse
  - ROLLBACK: git checkout -- scripts/fusion360-addin/fusion360_api_server.py src/engines/FusionPerBlockPhysicsEngine.ts

**FORGE-TRIPLE:**
  - HOOK: `per-block-physics-hook` — validates per-block S/F stays within machine limits
  - ACTION: prism_cam:fusion_per_block_optimize — per-block variable S/F optimization
  - SKILL: /fusion-perblock — optimize G-code with per-block variable S/F

**EXIT GATE:** ✓ Per-block S/F varies with engagement | ✓ Chatter peaks avoided | ✓ Thermal comp active in thin walls/deep pockets | ✓ Cycle time within ±20% of constant S/F | ✓ 15+ tests | omega_floor >= 1.0

---

## MILESTONE F360-FULL-MS7: Internal Toolpath Generation + Multi-Setup
**Track:** F360-FULL | **Status:** not_started | **Units:** 6 | **Sessions:** 3
**Dependencies:** F360-FULL-MS6

### SESSION S13: Toolpath Coordinate Generation (U-FITG01..U-FITG02)
**SMART CONFIG:** Role=CAMKernelEngineer + PhysicsValidator | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=55%
**KNOWLEDGE:**
  - ENGINES: NovelToolpathEngine (1,288 LOC — 6 algorithms), NovelToolpathAlgorithmsExt (1,460 LOC), NovelToolpathSimulatorEngine (584 LOC), SegmentInterpolatorEngine, StrategyComparisonEngine (625 LOC), StrategyBenchmarkEngine
  - FORMULAS: F-KIENZLE-001, F-TAYLOR-001, F-DEFLECT-001, F-CHATTER-001, F-SURFACE-001
  - CONSTANTS: canonical Kienzle/Taylor per ISO group
**INTENT:** PRISM generates actual toolpath coordinates from its 6 novel algorithms, producing G-code that's measurably better than Fusion's default toolpaths.

**WORK:**

**U-FITG01: Coordinate Generation for Novel Algorithms (~600 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Wire NovelToolpathEngine's 6 algorithms to produce actual XYZ coordinate sequences:
    - TGAR: variable-ae spiral from temperature model → spiral coordinates with varying ae
    - HRAF: SLD-aware RPM variation → coordinates with per-segment RPM tags
    - CFSF: ae variation for constant Fc → coordinates with varying stepover
    - PTDC: toolpath offset by predicted deflection → compensated coordinates
    - VCER: optimized trochoidal → trochoidal arc coordinates with chip ejection optimization
    - MTHZD: multi-tool zone decomposition → zone boundaries + per-zone coordinates
  - Output: ToolpathSegment[] with {x, y, z, feed_mm_min, rpm, ae_mm, ap_mm, move_type}
  - Emit G-code via SegmentInterpolatorEngine → PostProcessorPipelineEngine (20 dialects)
  - FILES_CREATED: src/engines/PRISMToolpathKernelEngine.ts, src/__tests__/prism-toolpath-kernel.test.ts
  - ABORT_CRITERIA: >=3 — coordinates produce gouging, rapid-into-stock, or exceed machine travel limits
  - ROLLBACK: git checkout -- src/engines/PRISMToolpathKernelEngine.ts

**U-FITG02: Toolpath Comparison Engine (~400 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Depends on: U-FITG01
  - Compare PRISM-generated vs Fusion's toolpath on 5 metrics:
    - Cycle time (total cutting + rapid + linking time)
    - Peak cutting force (Kienzle per block)
    - Maximum deflection (beam model per block)
    - Predicted surface finish (Ra per block)
    - Estimated tool life (Taylor at per-block conditions)
  - Decision logic: replace only when PRISM is measurably better:
    - >5% cycle time reduction OR
    - >15% tool life improvement OR
    - tighter tolerance compliance (deflection < tolerance/3)
  - User ALWAYS sees comparison table and explicitly approves
  - FILES_CREATED: src/engines/ToolpathComparisonEngine.ts, src/__tests__/toolpath-comparison.test.ts
  - ABORT_CRITERIA: >=3 — comparison metrics disagree with NovelToolpathSimulator, false "PRISM better" recommendation, user bypass possible
  - ROLLBACK: git checkout -- src/engines/ToolpathComparisonEngine.ts

/compact checkpoint

### SESSION S14: Hybrid Execution + Multi-Setup Planning (U-FITG03..U-FITG04)
**SMART CONFIG:** Role=IntegrationArchitect + ProcessPlanner | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=50%
**KNOWLEDGE:**
  - ENGINES: MultiSetupFeasibilityChainEngine (954 LOC), AutoProgramOrchestratorEngine (992 LOC)
  - REFERENCE: MachineRegistry (910 machines — kinematic data for multi-setup)
**INTENT:** PRISM replaces selected Fusion operations with its own toolpaths (hybrid mode) and orchestrates multi-setup parts automatically.

**WORK:**

**U-FITG03: Hybrid Execution Model (~400 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Depends on: U-FITG02
  - Fusion handles: setup context, fixture, WCS, stock definition, simulation
  - PRISM handles: toolpath coordinates + per-block S/F for SELECTED operations
  - Flow: user approves comparison → PRISM emits G-code directly (bypasses Fusion's toolpath for that operation)
  - Remaining operations use Fusion toolpaths with PRISM-optimized params (Pro tier behavior)
  - Output: merged G-code file with PRISM blocks + Fusion blocks + transition moves
  - FILES_MODIFIED: src/engines/AutoProgramOrchestratorEngine.ts, scripts/fusion360-addin/fusion360_api_server.py
  - ABORT_CRITERIA: >=3 — transition between PRISM/Fusion blocks causes collision, WCS mismatch, tool change errors
  - ROLLBACK: git checkout -- src/engines/AutoProgramOrchestratorEngine.ts scripts/fusion360-addin/fusion360_api_server.py

**U-FITG04: Multi-Setup Datum Chain Planning (~300 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Depends on: U-FITG03
  - Wire MultiSetupFeasibilityChainEngine for automated multi-setup:
    - Datum chain planning: Monte Carlo tolerance stack across setups (>10K samples)
    - Setup ordering: minimize datum error accumulation
    - WCS management: G54-G59 assignment + rotation computation
  - `POST /cam/multi-setup/plan` — returns: setup sequence, WCS per setup, datum features, tolerance budget per setup
  - FILES_MODIFIED: src/engines/Fusion360LiveBridgeEngine.ts, scripts/fusion360-addin/fusion360_api_server.py
  - ABORT_CRITERIA: >=3 — tolerance stack exceeds part tolerance, datum feature inaccessible, WCS computation wrong
  - ROLLBACK: git checkout -- src/engines/Fusion360LiveBridgeEngine.ts scripts/fusion360-addin/fusion360_api_server.py

/compact checkpoint

### SESSION S15: Thermal Sequencing + Cloud Indexing (U-FITG05..U-FITG06)
**SMART CONFIG:** Role=ProcessOptimizer + DataEngineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=45%
**KNOWLEDGE:**
  - ENGINES: CuttingTemperatureEngine, ThermalWearCouplingEngine, SelfLearningCAMEngine (1,740 LOC)
**INTENT:** Multi-setup thermal sequencing prevents heat-induced distortion; cloud CAM history enables shop-wide learning.

**WORK:**

**U-FITG05: Thermal Sequencing + Tool Sharing (~300 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Depends on: U-FITG04
  - Thermal sequencing: roughing ops across ALL setups first, then finishing (prevents heat distortion)
  - Tool sharing optimization: minimize tool changes across setups (same tool used in multiple setups grouped)
  - Fixture planning: tombstone/pallet layout suggestions based on part geometry + machine table size
  - FILES_CREATED: src/engines/FusionMultiSetupSchedulerEngine.ts
  - ABORT_CRITERIA: >=3 — thermal sequence causes re-clamping on hot part, tool sharing exceeds magazine capacity, fixture layout collides
  - ROLLBACK: git checkout -- src/engines/FusionMultiSetupSchedulerEngine.ts

**U-FITG06: Cloud CAM History Indexing (~400 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Index every CAM session: part features, tools used, strategies, S/F values, cycle time, quality results
  - Feature signature matching: when similar part appears, recall best previous solution
  - Store in PostgreSQL (existing infra) keyed by feature_hash + material + machine
  - `GET /cam/history/similar` — find historically similar parts and their CAM solutions
  - FILES_CREATED: src/engines/FusionCloudCAMIndexerEngine.ts, src/__tests__/fusion-cloud-cam-indexer.test.ts
  - ABORT_CRITERIA: >=3 — feature hash collisions >5%, retrieval >2s, stale data not expired
  - ROLLBACK: git checkout -- src/engines/FusionCloudCAMIndexerEngine.ts

**FORGE-TRIPLE:**
  - HOOK: `toolpath-replacement-safety-hook` — blocks PRISM toolpath replacement without user approval
  - ACTION: prism_cam:fusion_internal_toolpath — generate and compare internal PRISM toolpaths
  - SKILL: /fusion-ultimate — full autonomous CNC programming with internal toolpaths

**EXIT GATE:** ✓ 6 novel algorithms generate valid coordinates | ✓ Comparison engine correctly identifies better toolpath | ✓ Hybrid execution produces valid merged G-code | ✓ Multi-setup tolerance stack verified | ✓ Cloud indexing stores and retrieves | ✓ 25+ tests | omega_floor >= 1.0

---

## MILESTONE F360-FULL-MS8: Integration Testing + Launch
**Track:** F360-FULL | **Status:** not_started | **Units:** 4 | **Sessions:** 2
**Dependencies:** F360-FULL-MS1 through MS7

### SESSION S16: Test Matrix + Golden Comparison (U-FINT01..U-FINT02)
**SMART CONFIG:** Role=QAEngineer + ValidationSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=50%
**KNOWLEDGE:**
  - ENGINES: BenchmarkSuiteEngine, BenchmarkReportGeneratorEngine (15 canonical parts), PredictionValidationEngine
  - REFERENCE: HSMAdvisor baseline data, GWizard reference values
**INTENT:** Every feature validated across 180+ test cases; PRISM S/F matches or exceeds reference tools.

**WORK:**

**U-FINT01: Test Matrix (216 cases) (~500 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Matrix: 3 tiers × 6 ISO groups (P/M/K/N/S/H) × 4 strategy types × 3 machine types = 216 cases
  - Per case: create Fusion setup → inject PRISM params → generate toolpath → post-process → validate G-code
  - Automated via Fusion360LiveBridgeEngine + test fixtures
  - FILES_CREATED: src/__tests__/fusion-integration-matrix.test.ts
  - ABORT_CRITERIA: >=3 — <150 cases pass, any tier leaks features, any ISO group fails completely
  - ROLLBACK: git checkout -- src/__tests__/fusion-integration-matrix.test.ts

**U-FINT02: Golden Comparison Validation (~300 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Depends on: U-FINT01
  - Compare PRISM output vs HSMAdvisor/GWizard baselines:
    - S/F within ±10% of reference tools
    - Cycle time within ±15% of reference
    - No physics violations (force > spindle max, deflection > tolerance)
  - Per-controller dialect validation: Fanuc, Haas, Siemens, Mazak, Okuma
  - FILES_CREATED: src/__tests__/fusion-golden-comparison.test.ts
  - ABORT_CRITERIA: >=3 — S/F off by >10% for any ISO group, cycle time >15% worse, physics violation in output
  - ROLLBACK: git checkout -- src/__tests__/fusion-golden-comparison.test.ts

/compact checkpoint

### SESSION S17: Installer + Documentation + Onboarding (U-FINT03..U-FINT04)
**SMART CONFIG:** Role=DevOpsEngineer + TechnicalWriter | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
**KNOWLEDGE:**
  - REFERENCE: Fusion 360 Add-In packaging spec, Autodesk App Store submission guidelines
**INTENT:** User downloads installer, installs in 2 clicks, sees tier-appropriate panel, and is productive in <5 minutes.

**WORK:**

**U-FINT03: Auto-Installer (~200 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Package add-in as .msi (Windows) with:
    - Python files → Fusion Add-In directory
    - Auto-register in Fusion's add-in manifest
    - First-launch: license activation dialog
    - Connection test to PRISM MCP server
  - FILES_CREATED: scripts/fusion360-addin/installer/, scripts/fusion360-addin/setup.py
  - ABORT_CRITERIA: >=3 — installer fails on clean Windows, Fusion doesn't detect add-in, first-launch crashes
  - ROLLBACK: git checkout -- scripts/fusion360-addin/installer/

**U-FINT04: Per-Tier Documentation + Onboarding (~300 LOC)**
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Free tier: "Getting started with PRISM Lite" (material selection, basic S/F)
  - Pro tier: "Optimizing your CAM with PRISM Pro" (full param injection, setup analysis, post-processing)
  - Ultimate tier: "Autonomous CNC with PRISM Ultimate" (internal toolpaths, per-block S/F, multi-setup)
  - In-app tooltips: hover any PRISM-modified param to see physics justification
  - FILES_CREATED: docs/fusion360-user-guide/, scripts/fusion360-addin/tooltips.json
  - ABORT_CRITERIA: >=3 — docs reference non-existent features, tooltips have wrong physics explanation, onboarding >5 minutes
  - ROLLBACK: git checkout -- docs/fusion360-user-guide/

**FORGE-TRIPLE:**
  - HOOK: `fusion-release-gate-hook` — blocks release if test matrix <90% pass rate
  - ACTION: prism_cam:fusion_integration_test — run full integration test matrix
  - SKILL: /fusion-test — run Fusion 360 integration test suite

**EXIT GATE:** ✓ 216/216 test cases pass | ✓ Golden comparison within tolerances | ✓ Installer works on clean Windows | ✓ Onboarding <5 minutes | ✓ All 3 tiers documented | omega_floor >= 1.0

---

## DEPENDENCY GRAPH
```
F360-FULL-MS1 (License) ──────────────────────────────┐
F360-FULL-MS2 (Free Panel) ← MS1                       │
F360-FULL-MS3 (CAM Params) ← MS1                       │
F360-FULL-MS4 (Tool Collision) ← MS1                    ├─→ F360-FULL-MS8 (Launch)
F360-FULL-MS5 (Setup+Learning) ← MS3, MS4              │
F360-FULL-MS6 (Per-Block S/F) ← MS5                    │
F360-FULL-MS7 (Internal Toolpaths) ← MS6               │
```

## TOTAL SCOPE
- **36 units** across **17 sessions** in **8 milestones**
- **~6,300 LOC new TypeScript** (engines + tests)
- **~2,800 LOC Python** (add-in additions)
- **~600 LOC data/config** files
- **Modifies** 5 existing engines
- **216+ integration test cases**
- **8 forge-triple outputs** (8 hooks + 8 MCP actions + 8 skills)
