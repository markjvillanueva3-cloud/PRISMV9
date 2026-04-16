# PHASE R15: MCP SYSTEM ENHANCEMENT + MONOLITH INTEGRATION + PRISM APP WIRING
### RECOMMENDED_SKILLS: prism-app-integration, prism-registry-operations, prism-cadence-tuning, prism-hook-architecture, prism-telemetry-guide, prism-wiring-procedure
### HOOKS_EXPECTED: ALL
### DATA_PATHS: C:\PRISM\mcp-server\src, C:\PRISM\extracted, C:\PRISM\mcp-server\web\src, C:\PRISM\mcp-server\data

<!-- ANCHOR: r15_enhance_integrate_wire_full_manufacturing_intelligence_to_app -->
## Enhance MCP Subsystems, Integrate ALL Monolith Extractions, Wire PRISM Application
<!-- ANCHOR: r15_v22_0_prerequisites_r12_r13_r14_infrastructure -->
## v22.0 | Prerequisites: R11 complete (32 dispatchers live), R12-R14 planned or in-progress
# DEPENDS ON: R11 complete. R12/R13/R14 can run in parallel with R15 non-overlapping milestones.
# PRIORITY: Closes the 536→73 extraction gap, hardens all MCP subsystems, builds production app bridge

---

<!-- ANCHOR: r15_quick_reference -->
## QUICK REFERENCE (standalone after compaction — no other doc needed)
```
BUILD:      npm run build (NEVER standalone tsc — OOM at current scale)
SAFETY:     S(x) >= 0.70 is HARD BLOCK
POSITION:   Update CURRENT_POSITION.md every 3 calls
FLUSH:      Write results to disk after each logical unit of work
ERROR:      Fix ONE build error, rebuild, repeat. >5 from one edit → git revert
IDEMPOTENT: Read-only = safe to re-run. Write = check if already done first.
STUCK:      3 same-approach fails → try different approach. 6 total → skip if non-blocking.
TRANSITION: Update CURRENT_POSITION first, ROADMAP_TRACKER second.
RECOVERY:   Read PRISM_RECOVERY_CARD.md for full recovery steps.
ENV:        R15 = MCP 50% + CC 30% + APP 20%. Systems Architect → Safety Engineer → App Engineer.
```

---

<!-- ANCHOR: r15_extraction_inventory -->
## MONOLITH EXTRACTION INVENTORY (536 files → 73 wired — 86% GAP)

### Current State
```
╔══════════════════════════════════════════════════════════════════════╗
║                    EXTRACTED → WIRED AUDIT                          ║
╠══════════════════════════════════════════════════════════════════════╣
║  EXTRACTED (C:\PRISM\extracted\):                                   ║
║    Total JS files:           536                                    ║
║    Engines:                  255 (across 14 subdirectories)         ║
║    Algorithms:                52                                    ║
║    Formulas:                  12                                    ║
║    Knowledge Bases:           12                                    ║
║    Business:                   7                                    ║
║    Catalogs:                   6                                    ║
║    Learning:                   6                                    ║
║    Integration:               14                                    ║
║    Core:                      11                                    ║
║    Infrastructure:             5                                    ║
║    Systems/UI:                 7                                    ║
║    Units:                      3                                    ║
║    Workholding:                3                                    ║
║    Materials (engine):         2                                    ║
║    Machines (engine):          4                                    ║
║    Tools (engine):             9                                    ║
║    Controllers/Alarms:     100+ (JSON databases)                    ║
║    MIT/University:             5                                    ║
║                                                                     ║
║  WIRED IN MCP (C:\PRISM\mcp-server\src\engines\):                  ║
║    TypeScript engines:        73                                    ║
║    Dispatchers:               32                                    ║
║    Actions:                  382                                    ║
║                                                                     ║
║  GAP: ~463 extracted modules NOT indexed/wired in MCP               ║
║  TARGET: 100% indexed, 80%+ wired or classified                    ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Extraction Categories by Priority

| Category | Files | Lines (est.) | MCP Wired | Gap | Priority |
|----------|------:|-------------|-----------|-----|----------|
| **Physics/Thermal** | 23 | ~8,500 | 6 partial | 17 | CRITICAL |
| **Post Processor** | 12 | ~12,000 | 0 | 12 | CRITICAL |
| **CAD/CAM** | 52 | ~25,000 | 3 partial | 49 | HIGH |
| **Optimization** | 24 | ~12,000 | 1 partial | 23 | HIGH |
| **AI/ML** | 78 | ~35,000 | 2 partial | 76 | MEDIUM |
| **Business** | 18 | ~10,000 | 2 partial | 16 | HIGH |
| **Algorithms** | 52 | ~25,000 | 1 partial | 51 | MEDIUM |
| **Simulation/Collision** | 7 | ~4,000 | 1 partial | 6 | HIGH |
| **Knowledge Bases** | 12 | ~8,000 | 1 partial | 11 | MEDIUM |
| **Quality/Inspection** | 3 | ~2,000 | 0 | 3 | HIGH |
| **Learning** | 6 | ~4,000 | 1 partial | 5 | MEDIUM |
| **Formulas** | 12 | ~6,000 | 3 partial | 9 | HIGH |
| **Vibration/Chatter** | 5 | ~3,000 | 0 | 5 | CRITICAL |
| **Tools/Holders** | 9 | ~5,000 | 2 partial | 7 | HIGH |
| **Core/Infrastructure** | 16 | ~6,000 | majority | 5 | LOW |
| **Materials (engine)** | 2 | ~2,000 | 1 partial | 1 | MEDIUM |
| **Machines (engine)** | 4 | ~3,000 | 1 partial | 3 | MEDIUM |
| **Workholding** | 3 | ~2,000 | 2 partial | 1 | LOW |
| **Units** | 3 | ~1,500 | 0 | 3 | MEDIUM |
| **Integration/Systems** | 21 | ~8,000 | partial | 12 | LOW |
| **Catalogs** | 6 | ~4,000 | 0 | 6 | MEDIUM |
| **MIT/University** | 5 | ~3,000 | 0 | 5 | LOW |
| **TOTAL** | **~536** | **~189,000** | **73** | **~463** | — |

---

<!-- ANCHOR: r15_knowledge_contributions -->
## KNOWLEDGE CONTRIBUTIONS
```
BRANCH 1 (Execution Chain): ALL extracted modules classified, indexed, and routed.
  MASTER_EXTRACTION_INDEX.json expanded from 78→536 entries with status fields.
  New dispatcher actions for every indexed module category.
  AppBridgeEngine wires MCP intelligence to React frontend.
BRANCH 2 (Data Taxonomy): Complete extraction taxonomy across 22 categories.
  Every module tagged: category, safety_class, wired_status, dispatcher_route, dependencies.
  Registry expansion from 10 to 14+ (add Algorithm, Formula, KnowledgeBase, PostProcessor).
BRANCH 3 (Relationships): Dependency graph between extracted modules.
  Engine→Algorithm edges, Formula→Engine edges, KnowledgeBase→Troubleshooting edges.
  App→API→Dispatcher→Engine→Registry chain documented end-to-end.
BRANCH 4 (Session Knowledge): Integration patterns, safety validation sequences,
  app architecture decisions, WebSocket protocol design, REST API expansion patterns.
AT PHASE GATE: 536/536 modules indexed. App running with live data. Ω ≥ 0.75 target.
```

---

<!-- ANCHOR: r15_execution_model -->
### EXECUTION MODEL
```
Environment: MCP 50% / Claude Code 30% / PRISM App 20%
Model: Haiku (scanning, classification) → Sonnet (implementation, wiring) → Opus (safety, gate)

MCP TASKS: MS0 (full inventory), MS1-MS3 (indexing + wiring), MS5 (cadence/hook/telemetry),
  MS6-MS7 (GSD/memory/token), MS9 (gate)
CC TASKS: MS1 (bulk file scanning), MS4 (new engines/skills/scripts/hooks),
  MS8 (app bridge + REST + WebSocket)
APP TASKS: MS8 (React pages, API client, WebSocket integration)

PARALLEL EXECUTION:
  MS1 + MS2 can run in parallel (different extraction categories)
  MS3 can start after MS1 (physics modules classified)
  MS4 + MS5 are independent of each other
  MS6 + MS7 are independent of each other
  MS8 needs MS1-MS3 complete (app needs endpoints to call)
  MS9 is final gate

SAFETY CLASSIFICATION:
  CRITICAL: MS3 (physics/thermal/vibration — lives at stake)
  HIGH: MS2 (post processor, optimization — machine damage possible)
  STANDARD: MS1 (classification), MS4-MS8 (development infrastructure)
```

---

## PHASE OBJECTIVE

R15 addresses three interconnected gaps:

**Gap 1: Monolith Integration (86% unwired)**
536 extracted JavaScript modules contain decades of manufacturing intelligence. Only 73 are
TypeScript engines in the MCP server. The remaining 463 need to be classified, indexed, and
either wired as new engines/actions or documented as archived. Every formula, algorithm,
knowledge base, and engine must be accounted for in MASTER_EXTRACTION_INDEX.json.

**Gap 2: MCP Subsystem Enhancement**
Audit identified 7 new cadence functions, 10 new hooks, 6 GSD improvements, 5 new engines,
13 new skills, 10 new scripts, and significant token optimization opportunities (~25K+ tokens
per session savings). These improvements compound across every future session.

**Gap 3: PRISM App Wiring**
The React app at mcp-server/web/ has 8 pages but only 5 API endpoints. Need to expand to 20+
REST endpoints, add WebSocket for real-time updates, wire telemetry dashboard, safety monitor,
and all calculator pages to live MCP data. Build the AppBridgeEngine that connects MCP
dispatchers to the frontend.

**Integration Principle:** Every extracted module must be either:
1. **WIRED** — Converted to TypeScript engine and routed via dispatcher action
2. **INDEXED** — Classified in MASTER_EXTRACTION_INDEX.json with status + category
3. **ABSORBED** — Logic merged into existing engine (no separate file)
4. **ARCHIVED** — Documented as superseded/duplicate with reasoning

No module left unaccounted for. 100% coverage is the target.

---

## DEPENDENCY MAP
```
[R11: ALL SYSTEMS LIVE] ────────────────────────→ [R15]
                                                     │
[R12: Infrastructure] ──(clean codebase)───────────→ │ (parallel, non-overlapping MSes)
[R13: Intelligence Extraction] ──(new engines)─────→ │ (R13 outputs feed R15-MS3)
[R14: Product Features] ──(app-facing products)────→ │ (R14 outputs feed R15-MS8)
                                                     │
                                                     ├──→ [R16: Production Deployment]
                                                     └──→ [R17: Advanced Analytics]
```

---

## CONTEXT BRIDGE

WHAT CAME BEFORE: P0→R11 built the complete 32-dispatcher, 382-action MCP system. Monolith
extraction produced 536 JS files across 22 categories. Web app scaffold exists with 8 pages
and 5 API endpoints. GSD v22.0 provides protocol. 130 hooks, 40 cadences, 73 engines operational.

WHAT THIS PHASE DOES: Index ALL 536 extracted modules. Wire critical physics/thermal/vibration
modules. Enhance cadences, hooks, telemetry, GSD, memory, and token systems. Build AppBridgeEngine.
Expand REST API to 20+ endpoints. Wire app pages to live MCP data. Create 13 new skills,
10 scripts, 5 engines. Achieve ~25K token savings per session.

WHAT COMES AFTER: R16 (Production Deployment) — containerization, monitoring, multi-instance.
R17 (Advanced Analytics) — ML pipeline, predictive models, cross-shop learning.

TEST LEVELS: L1-L5 required for physics. L1-L4 for all else.

---

## FAULT INJECTION TEST (XA-13)

R15 FAULT TEST: Kill WebSocket connection mid-calculation → verify REST fallback.
  WHEN: After MS8 (AppBridgeEngine wired).
  HOW: Start speed_feed calculation via WebSocket, disconnect at 50%, reconnect.
  EXPECTED: Client detects disconnect, retries via REST, gets complete result.
  PASS: Seamless fallback, complete result, accurate telemetry.
  FAIL: Lost calculation, crash, or silent data corruption.
  EFFORT: ~4 calls.

---

## R15 Ralph Validator Map
```
MS0-*     -> data_integrity    (full extraction inventory)
MS1-*     -> data_integrity    (classification accuracy)
MS2-*     -> physics + safety  (post processor, optimization)
MS3-*     -> physics + safety  (physics/thermal/vibration — CRITICAL)
MS4-*     -> code_quality      (new skills, scripts, hooks)
MS5-*     -> infrastructure    (cadence, hook, telemetry)
MS6-*     -> infrastructure    (GSD sections)
MS7-*     -> infrastructure    (memory, context, token)
MS8-*     -> integration       (app bridge, REST, WebSocket)
MS9-*     -> [full panel]      (phase gate)
```

---

## R15 Task DAG
```
[MS0: Full Inventory] ──→ [MS1: Classify+Index] ──→ [MS3: Physics Wire] ──→ [MS9: GATE]
                      └──→ [MS2: PostProc+Opt]  ───→ ───────────────────────→ ↑
                                                                               │
[MS4: New Skills/Scripts/Hooks] ──────────────────────────────────────────────→ │
[MS5: Cadence+Hook+Telemetry] ───────────────────────────────────────────────→ │
[MS6: GSD Enhancement] ──────────────────────────────────────────────────────→ │
[MS7: Memory+Context+Token] ─────────────────────────────────────────────────→ │
                                                                               │
[MS8: App Bridge+REST+WebSocket] ──(needs MS1-MS3 complete)──────────────────→ │
```

---

## MS0: FULL EXTRACTION INVENTORY + GAP MATRIX
### Role: Intelligence Architect | Model: Haiku → Sonnet | Effort: L (~25 calls) | Sessions: 1-2

### Objective
Scan ALL 536 extracted JS files. Build complete MASTER_EXTRACTION_INDEX.json with every module
classified by category, safety_class, wired_status, line_count, dependencies, and target_dispatcher.

### MS0 Task DAG
```
[T1: Scan Engines] ──→ [T4: Cross-Reference] ──→ [T5: Gap Matrix] ──→ [T6: Verify]
[T2: Scan Algorithms] ──→ ↗
[T3: Scan All Other] ────→ ↗
```

### Steps

#### MS0-T1: Scan All 255 Extracted Engines (~8 calls)
SCOPE: C:\PRISM\extracted\engines\** (14 subdirectories)
Scan each subdirectory: ai_complete (13), ai_ml (78), business (11), cad_cam (52), cad_complete (4),
core (5), infrastructure (2), machines (4), materials (2), optimization (24), physics (9),
post_processor (12), quality (3), simulation (7), tools (9), vibration (2), root engines (18).
For each: name, lines, key functions, formulas, safety_class (CRITICAL/HIGH/STANDARD/LOW).

#### MS0-T2: Scan All 52 Algorithms + 12 Formulas (~4 calls)
Classify by: Numerical, Optimization, Graph, ML, Manufacturing-specific.
Formulas by: Force, Thermal, Wear, Material physics. Map algorithm→engine dependencies.

#### MS0-T3: Scan All Remaining Categories (~6 calls)
SCOPE: knowledge_bases/, business/, catalogs/, learning/, integration/, core/, infrastructure/,
systems/, units/, workholding/, materials/, machines/, tools/, mit/, controllers/ (100+ JSON).

#### MS0-T4: Cross-Reference with MCP Engines (~3 calls)
Map every extracted module to status: WIRED/PARTIAL/ABSORBED/UNWIRED/ARCHIVED.
Cross-reference 73 TypeScript engines vs 536 extracted JS modules.

#### MS0-T5: Generate Gap Matrix + Priority Ranking (~2 calls)
Integration waves: Wave 1 (CRITICAL: physics/thermal/vibration/post), Wave 2 (HIGH: optimization/
business/collision/quality/formulas), Wave 3 (MEDIUM: CAD/algorithms/KB/learning),
Wave 4 (LOW: AI/ML/integration/MIT/UI). Write INTEGRATION_PRIORITY_MATRIX.md.

#### MS0-T6: Update MASTER_EXTRACTION_INDEX.json (~2 calls)
Expand from 78 → 536 entries. Schema: name, path, category, subcategory, lines, size_kb,
safety_class, mcp_status, mcp_engine, mcp_dispatcher, mcp_actions, key_functions, key_formulas,
dependencies, integration_wave, integration_priority, notes.

**Exit:** 536-entry MASTER_EXTRACTION_INDEX.json. Gap matrix complete. Integration waves defined.

---

## MS1: WAVE 3+4 CLASSIFICATION + REGISTRY EXPANSION
### Role: Data Architect → Context Engineer | Model: Haiku → Sonnet | Effort: XL (~35 calls) | Sessions: 2-3

### Objective
Classify Wave 3+4 modules. Create 4 new registries: AlgorithmRegistry, FormulaRegistry,
KnowledgeBaseRegistry, PostProcessorRegistry.

#### MS1-T1: CAD/CAM Module Classification (~6 calls)
52 cad_cam + 4 cad_complete files. Classify feature type, geometry kernel, integration path.

#### MS1-T2: Algorithm Module Classification (~4 calls)
52 algorithms by type, complexity, MCP coverage. Flag for AlgorithmGatewayEngine.

#### MS1-T3: AI/ML Module Classification (~6 calls)
91 files (78 ai_ml + 13 ai_complete). Identify ~30 unique, ~61 duplicates/wrappers.
Flag: Bayesian tool life, PIML chatter, ML feature recognition, XAI.

#### MS1-T4: KB + Learning + Integration Classification (~4 calls)
44 modules across 5 directories. Most integration modules → ARCHIVE.

#### MS1-T5: Create/Expand 4 Registries (~6 calls)
- AlgorithmRegistry — 52 algorithms indexed, query/search/benchmark actions
- FormulaRegistry — 12 formula modules, equation/inputs/outputs/units/validity
- KnowledgeBaseRegistry — 12 KBs indexed, query/search/related actions
- PostProcessorRegistry — 12 post processor modules, get/search/validate
Target: 14 registries loading at startup (was 10).

#### MS1-T6: Index Validation (~3 calls)
Verify 536/536 indexed. 0 uncategorized. Registry counts match.

#### MS1-T7: Wire New Registry Actions to Dispatchers (~6 calls)
~15 new dispatcher actions: algorithm_get/search/list, formula_get/search/validate,
kb_query/search/related, post_get/search/validate. Update GSD decision tree.

**Exit:** 14 registries. ~400 dispatcher actions. GSD updated.

---

## MS2: WAVE 2 — POST PROCESSOR + OPTIMIZATION + BUSINESS WIRING
### Role: Intelligence Architect → Safety Engineer | Model: Sonnet → Opus | Effort: XL (~30 calls) | Sessions: 2-3

#### MS2-T1: Post Processor Engine Wiring (~8 calls)
SAFETY: CRITICAL — generates machine instructions.
Extract from 12 post_processor files: block formatting, modal tracking, cycle generation, safety interlocks.
Create PostProcessorEngine.ts: generateBlock, generateProgram, validateSyntax, translateDialect.
MANDATORY: S(x) ≥ 0.70. Spindle/feed/rapid/coolant validation.

#### MS2-T2: Optimization Engine Consolidation (~8 calls)
SAFETY: HIGH. Consolidate 24 optimization files into OptimizationSuiteEngine.ts.
6 solver families: SingleObjective, MultiObjective, Constrained, Manufacturing-Specific,
Combinatorial, Robust. All results bounded by machine/tool limits.

#### MS2-T3: Safety Validation for Wave 2 (~4 calls)
Opus safety review. S(x) ≥ 0.70 HARD BLOCK on both engines.

#### MS2-T4: Business Module Wiring (~6 calls)
18 business files → ~6 unique engines: JobCostingEngine, QuotingEngine, SchedulingEngine,
ShopAnalytics, InventoryEngine. REST: /api/v1/quote, /schedule, /cost.

#### MS2-T5: Integration Test (~4 calls)
Build + test. No regressions in 382 existing actions.

**Exit:** Wave 2 complete. Post processor, optimization, business wired.

---

## MS3: WAVE 1 — PHYSICS + THERMAL + VIBRATION CRITICAL WIRING
### Role: Safety Engineer → Physics Validator | Model: Opus | Effort: XL (~30 calls) | Sessions: 2-3
### SAFETY: CRITICAL — these modules protect human life. Mathematical correctness non-negotiable.

#### MS3-T1: Physics Engine Wiring (~8 calls)
12+ physics files: kinematics (FK/IK, Jacobian), dynamics (rigid body, contact), cutting
mechanics (Kienzle, Merchant). Create KinematicsEngine.ts, DynamicsEngine.ts.
Every formula verified against known test vectors. Force > tool capacity → HARD BLOCK.

#### MS3-T2: Thermal Engine Wiring (~6 calls)
7+ thermal files: cutting temperature (Johnson-Cook + Kienzle), heat transfer (conduction/
convection/radiation), thermal expansion compensation, thermal derating.
Create ThermalAnalysisEngine.ts. Add THERMAL_DERATING hook.

#### MS3-T3: Vibration + Collision Wiring (~6 calls)
12+ files: stability lobe diagrams, FFT chatter prediction, surface finish from vibration,
BVH/octree collision. Create VibrationAnalysisEngine.ts, expand CollisionEngine.ts.

#### MS3-T4: Physics Plausibility Validation (~4 calls)
Test vectors: force ±5%, temperature ±10%, stability prediction correct, collision detected.
S(x) ≥ 0.70 on ALL engines. Record in R15_PHYSICS_VALIDATION.json.

#### MS3-T5: Quality + Inspection Wiring (~4 calls)
3 quality files + stress formulas: inspection planning, SPC/Cpk, tolerance analysis.

#### MS3-T6: Integration Test (~2 calls)

**Exit:** Wave 1 CRITICAL modules integrated. All physics engines S(x) ≥ 0.70.

---

## MS4: NEW SKILLS + SCRIPTS + HOOKS + ENGINES
### Role: Platform Engineer | Model: Sonnet | Effort: L (~25 calls) | Sessions: 2

#### MS4-T1: 7 Manufacturing Skills (~8 calls)
Skills per Gate v2.0: prism-tapping-mastery, prism-boring-operations, prism-5axis-strategies,
prism-micro-machining, prism-cryogenic-machining, prism-high-feed-milling, prism-plunge-milling.

#### MS4-T2: 6 Development Skills (~6 calls)
prism-mcp-debugging, prism-registry-operations, prism-audit-procedures, prism-app-integration,
prism-performance-profiling, prism-data-migration.

#### MS4-T3: 10 Automation Scripts (~5 calls)
telemetry_analyzer.py, skill_quality_scanner.py, registry_health_check.js, transcript_miner.py,
hook_coverage_report.js, gsd_section_generator.py, cadence_profiler.js, build_metrics.js,
app_api_generator.js, data_export.js.

#### MS4-T4: Skill Quality Gate (~2 calls)

#### MS4-T5: 10 New Hooks + 5 New Engines (~6 calls)
Hooks: REST_PRE_AUTH, REST_POST_LOG, REGISTRY_WRITE_VALIDATE, SKILL_BUNDLE_INTEGRITY,
THERMAL_DERATING, MAZAK_ALARM_VALIDATE, OKUMA_ALARM_VALIDATE, COMPACTION_PREDICTED,
TOKEN_BUDGET_EXCEEDED, DECISION_QUALITY_LOW.
Engines: ContextBudgetEngine, PatternExtractionEngine, AppBridgeEngine, DataExportEngine,
UserPreferenceEngine.

**Exit:** 140 hooks (was 130). 78 engines (was 73). 243 skills. All wired.

---

## MS5: CADENCE + HOOK SYSTEM + TELEMETRY ENHANCEMENT
### Role: Systems Engineer | Model: Sonnet | Effort: L (~20 calls) | Sessions: 1-2

#### MS5-T1: 7 New Cadence Functions (~6 calls)
autoMemoryGraphPrune (@20), autoSLOCheck (@15), autoRegistryIntegrity (@25),
autoDecisionSummarize (@30), autoSessionQuality (@20), autoCompactionPredict (@12),
autoSkillBundleRefresh (@session_boot). Total: 47 cadences.

#### MS5-T2: Telemetry Enhancement (~6 calls)
Per-action tracking, route optimization for non-safety dispatchers, SLO alerts wired,
notification channels (file + webhook-ready), REST /api/v1/telemetry/dashboard,
cross-session baseline persistence (30 sessions).

#### MS5-T3: Hook System Enhancement (~4 calls)
RestApiHooks category, MAZAK/OKUMA controller hooks, hook priority inheritance,
hook coverage report generation.

#### MS5-T4: Verify + Build (~4 calls)

**Exit:** 47 cadences. 140+ hooks. Enhanced telemetry.

---

## MS6: GSD PROTOCOL ENHANCEMENT → v23.0
### Role: Protocol Engineer | Model: Sonnet | Effort: M (~15 calls) | Sessions: 1

#### MS6-T1: GSD Modular Sections (~4 calls)
6 section files: DECISION_TREE.md (~800 tokens), CADENCES.md (~400), QUALITY_GATES.md (~300),
COMPACTION.md (~500), SAFETY.md (~400), SKILL_GATE.md (~300).

#### MS6-T2: Dynamic GSD Serving (~4 calls)
Pressure-based: <50% → full, 50-70% → core, 70%+ → minimal (decision tree only).

#### MS6-T3: GSD Decision Tree Update (~4 calls)
Add new dispatchers/actions from MS1-MS4. Update counts.

#### MS6-T4: Version Bump + Verify (~3 calls)
GSD v23.0. Archive v22.0. ~2K token savings at boot.

---

## MS7: MEMORY + CONTEXT + TOKEN OPTIMIZATION
### Role: Performance Engineer | Model: Sonnet | Effort: M (~15 calls) | Sessions: 1

#### MS7-T1: Token Optimization Suite (~6 calls)
material_search_lite (~10K savings), alarm tiered response (~2K), skill section injection (~3K),
hookResultSlim (~500 per chain). Total: ~25K tokens/session.

#### MS7-T2: Memory Graph Enhancement (~4 calls)
Query caching, semantic deduplication, priority-based eviction, Mermaid export.

#### MS7-T3: Context Budget System (~3 calls)
ContextBudgetEngine: 40% manufacturing, 20% development, 20% context, 20% reserve.
TOKEN_BUDGET_EXCEEDED hook. Wire to autoContextPressure.

#### MS7-T4: Predictive Context Loading (~2 calls)
MemoryGraph patterns → pre-load skills/data. Wire SkillAutoLoader (currently orphaned).

**Exit:** ~25K token savings/session. Budget system active. SkillAutoLoader wired.

---

## MS8: PRISM APP — BRIDGE + REST + WEBSOCKET + PAGES
### Role: App Engineer → Integration Engineer | Model: Sonnet | Effort: XXL (~45 calls) | Sessions: 3-4

#### MS8-T1: AppBridgeEngine (~6 calls)
Complete AppBridgeEngine.ts: Express HTTP + WebSocketServer + SSE fallback.
Channels: telemetry (5s push), safety-alerts (on-fire), calculation-stream, session-state,
hook-events, registry-updates. Start WS on port 3001 (HTTP 3000).

#### MS8-T2: WebSocket Protocol (~4 calls)
Messages: subscribe, unsubscribe, request, response, push.
Heartbeat (30s), reconnection (exponential backoff), telemetry tracking.

#### MS8-T3: REST API Expansion (~8 calls)
11 new endpoints → 20 total:
POST /api/v1/cutting-force, /tool-life, /surface-finish, /thread-calculate, /what-if/simulate
POST /api/v1/material/search, /machine/search
GET /api/v1/telemetry/dashboard, /telemetry/slos, /health, /registries/status
OpenAPI spec generation.

#### MS8-T4: API Client Update (~4 calls)
web/src/api/client.ts: methods for 20 endpoints. websocket.ts: WS client with channels. types.ts.

#### MS8-T5: App Page Wiring (~10 calls)
- Dashboard: Live registry counts, telemetry charts, SLO status, hook fire log
- Calculator: All 21 calc actions, comparison mode, result history
- Alarm: Search by code/controller, fix suggestions, severity indicators
- SafetyMonitor: Real-time S(x), hook log, violation history, WebSocket push
- Reports: Setup sheets, job reports, material certificates, PDF export
- ToolpathAdvisor: 680 strategies searchable, parameter recommendations
- WhatIf: Parameter sweep, multi-variable optimization, Pareto charts
- JobPlanner: Multi-operation sequencing, constraint validation, cost rollup

#### MS8-T6: Authentication + CORS (~4 calls)
CORS middleware. MultiTenantEngine auth. API key management. Role-based: Operator/Engineer/Admin.

#### MS8-T7: Real-Time Channels (~4 calls)
telemetry (5s push), safety-alerts (WARNING+), session-state, calculation-stream.

#### MS8-T8: End-to-End Test (~5 calls)
Calculator → speed_feed → result. WS connect → subscribe → data received.
Disconnect → reconnect → no data loss. Auth valid/invalid. Fault injection test.

**Exit:** App fully functional with live MCP data. 8/8 pages wired.

---

## MS9: PHASE GATE
### Role: Full Panel | Model: Opus | Effort: M (~15 calls) | Sessions: 1

### Gate Criteria
```
╔═══════════════════════════════════════════════════════════════════╗
║                     R15 PHASE GATE CRITERIA                       ║
╠═══════════════════════════════════════════════════════════════════╣
║  □ MASTER_EXTRACTION_INDEX.json: 536/536 modules indexed          ║
║  □ MCP Status: 0 UNCATEGORIZED modules remaining                  ║
║  □ Registries: 14/14 loading (was 10)                            ║
║  □ Engines: 78+ (was 73) — all building clean                    ║
║  □ Hooks: 140+ (was 130) — all in allHooks[]                    ║
║  □ Cadences: 47 (was 40) — all firing per schedule               ║
║  □ Skills: 243+ (was 230) — all passing checklist v2.0           ║
║  □ REST Endpoints: 20+ (was 9) — all documented with OpenAPI     ║
║  □ WebSocket: 4 channels live with reconnection                   ║
║  □ App Pages: 8/8 wired to live data                             ║
║  □ GSD: v23.0 with modular sections                              ║
║  □ Token Savings: ≥20K tokens/session verified                   ║
║  □ Safety: S(x) ≥ 0.70 on all CRITICAL engines                  ║
║  □ Ω Score: ≥ 0.75                                              ║
║  □ Build: Clean, no regressions                                   ║
║  □ Tests: All passing                                             ║
║  □ Anti-Regression: New ≥ Old on all metrics                     ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## EFFORT SUMMARY

| Milestone | Calls | Sessions | Safety | Focus |
|-----------|------:|:--------:|--------|-------|
| MS0: Full Inventory | ~25 | 1-2 | — | Scan + classify 536 modules |
| MS1: Classification + Registry | ~35 | 2-3 | — | Index + 4 registries + actions |
| MS2: Post Proc + Optimization | ~30 | 2-3 | HIGH→CRITICAL | Wire Wave 2 modules |
| MS3: Physics + Thermal + Vibration | ~30 | 2-3 | CRITICAL | Wire Wave 1 modules |
| MS4: Skills + Scripts + Hooks | ~25 | 2 | — | 13 skills, 10 scripts, 10 hooks, 5 engines |
| MS5: Cadence + Telemetry | ~20 | 1-2 | — | 7 cadences, telemetry, hook enhance |
| MS6: GSD Enhancement | ~15 | 1 | — | v23.0, modular sections |
| MS7: Memory + Context + Token | ~15 | 1 | — | ~25K token savings, budget |
| MS8: App Bridge + REST + WS | ~45 | 3-4 | — | 20 endpoints, WS, 8 pages |
| MS9: Phase Gate | ~15 | 1 | CRITICAL | Full validation |
| **TOTAL** | **~255** | **~18-24** | | |

### Parallel Execution Plan
```
WEEK 1-2:  MS0 (inventory)
WEEK 2-4:  MS1 + MS2 (parallel — different categories)
WEEK 3-5:  MS3 (physics — sequential after MS0, CRITICAL)
WEEK 4-6:  MS4 + MS5 + MS6 + MS7 (all parallel — independent)
WEEK 6-9:  MS8 (app — needs MS1-MS3 complete)
WEEK 9-10: MS9 (gate)
TOTAL ELAPSED: ~10 weeks with parallelism
```

---

## SUCCESS METRICS

| Metric | Before R15 | After R15 | Delta |
|--------|-----------|-----------|-------|
| Modules indexed | 78 | 536 | +587% |
| Modules wired/classified | 73 | 536 | +634% |
| Engines | 73 | 78+ | +7% |
| Hooks | 130 | 140+ | +8% |
| Cadences | 40 | 47 | +18% |
| Skills | 230 | 243+ | +6% |
| REST endpoints | 9 | 20+ | +122% |
| Registries | 10 | 14 | +40% |
| App pages functional | 3/8 | 8/8 | +167% |
| Token savings/session | 0 | ~25K | NEW |
| GSD sections | 1 | 7 (modular) | NEW |
| WebSocket channels | 0 | 4 | NEW |
| Dispatcher actions | 382 | ~400+ | +5% |
| Ω Score | 0.77 | ≥0.75 target | maintained |

---

## Changelog
- 2026-02-23: v1.0 — Initial R15 roadmap created from comprehensive audit
