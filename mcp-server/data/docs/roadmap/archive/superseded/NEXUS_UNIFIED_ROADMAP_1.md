# NEXUS MCP FRAMEWORK — UNIFIED MASTER ROADMAP v2.0
## PRISM Manufacturing Intelligence + Generalized Framework + Business Launch
### Four Tracks, One Timeline — From Audit to Shipped Product

---

# EXECUTIVE SUMMARY

This roadmap unifies four workstreams into a single execution plan:

| Track | Code | Scope | Sessions | Status |
|-------|------|-------|----------|--------|
| **Foundation** | F | Audit, index, reorg C:\PRISM, dependency map | 4-6 | Phase 0-1 DONE, Phase 2-5 remaining |
| **Product (PRISM)** | P | Wire 463 unwired modules, physics, app | 18-24 | Not started |
| **Technical (DX)** | T | 15 DX features for developer adoption | 32-42 | Not started |
| **Business (Launch)** | B | npm, docs, marketing, billing, cloud, legal | 21-30 | Not started |
| **TOTAL** | | | **75-102 sessions** | |

**Revenue Target:** $2,047,088 Year 1 ARR ($1,810,088 master + $237,000 DX features)

**The Key Insight:** PRISM's 31 dispatchers, 368 actions, and 37 engines ARE the Nexus framework — 85% transfers directly (27/31 dispatchers, ~320/368 actions, 12/37 engines are industry-agnostic). Track P builds the manufacturing proof-of-concept while Track T extracts generalizable DX features and Track B ships the product.

---

# ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     NEXUS MCP FRAMEWORK (Core)                           │
│  27 dispatchers │ ~320 actions │ 12 engines │ Hooks │ ATCS │ PFP       │
│  Session resilience │ Quality gates (Ω/S(x)) │ Compliance │ MemGraph   │
│  Telemetry │ Certificates │ Multi-Tenant │ NLHook │ Bridge             │
├────────────┬─────────────────┬─────────────────┬─────────────────────────┤
│  Track F   │  Track P        │  Track T (DX)   │  Track B (Business)    │
│  Audit     │  PRISM Mfg      │  Hot Reload     │  npm / Docker          │
│  Index     │  536→73 gap     │  Testing        │  Docs site             │
│  Reorg     │  Physics        │  Model Router   │  Marketing site        │
│  Dep Map   │  Thermal/G-code │  Semantic Cache │  Auth + Billing        │
│  Cleanup   │  App Bridge     │  HITL + Debug   │  Cloud + Legal         │
└────────────┴─────────────────┴─────────────────┴─────────────────────────┘
```

**Critical Dependencies:**
- F (Foundation) Phase 2-3 MUST finish before P starts wiring — clean dependency map needed
- T-DX0 can start immediately — only needs build pipeline (Phase 0 done)
- B0-B1 can start immediately — brand + package don't need code changes
- P-MS8 (App Bridge) benefits from T-DX0.1 (Hot Reload) for iteration speed

---

# LEGEND

| Symbol | Meaning |
|--------|---------|
| 🧠 Opus | Architecture, strategy, safety-critical physics |
| ⚡ Sonnet | Implementation, code generation, testing |
| 🪶 Haiku | Validation, scanning, repetitive transforms |
| 👤 Human | Mark — decisions, UX, strategy, legal |
| 💰 External | Paid service/vendor |
| F-# | Foundation phase | P-MS# | Product milestone |
| T-DX#.# | DX feature.unit | B#.# | Business unit |
| ⚠️ CRITICAL | Safety of life — S(x) ≥ 0.70 HARD BLOCK |
| 🧲 Adoption | 💵 Revenue |

---

# UNIFIED TIMELINE — 26 WEEKS

```
═══════════════════════════════════════════════════════════════════════════
WEEK  1-2:  F-2,3 (Dep Map+Gap)    T-DX0.1 (Hot Reload)🧲        B0 (Brand)
WEEK  2-3:  F-4 (Restructure Plan) T-DX0.2 (Testing)🧲           B1 (Package)
WEEK  3-4:  F-5 (Execute Reorg)    T-DX0.3 (Context Viz)🧲       B1 (cont.)
───── FOUNDATION COMPLETE ── v0.1 launch gate ──────────────────────────
WEEK  4-5:  P-MS0 (Inventory)      T-DX2.3 (Struct Output)       B2 (Docs)
WEEK  5-7:  P-MS1+MS2 (parallel)   T-DX1.1 (Model Router)💵      B2 (cont.)
WEEK  6-8:  P-MS3 (⚠️ Physics)     T-DX1.2 (Semantic Cache)💵    B3 (Marketing)
WEEK  8-10: P-MS4+5+6+7 (parallel) T-DX1.3 (Cost Estimator)💵    B3 (cont.)
───── v1.0 LAUNCH ── npm + Docker + docs + marketing live ──────────────
WEEK 10-12: P-MS8 (App Bridge)     T-DX2.1 (HITL)💵              B4 (Auth+Billing)
WEEK 12-14: P-MS9 (Gate)           T-DX2.2 (Time-Travel Debug)   B5 (Cloud)
───── v1.1 RETENTION ── cost intel + enterprise features ───────────────
WEEK 14-16:                         T-DX3.1 (Agent Blueprints)💵  B5 (cont.)
WEEK 16-18:                         T-DX3.2 (Cross-Server Comp)   B6 (Legal)
WEEK 18-20:                         T-DX3.3 (Schema Evolution)    B7 (Community)
───── v1.2 ENTERPRISE ── HITL + debugger + multi-provider ──────────────
WEEK 20-22:                         T-DX4.1 (Multi-Provider)💵
WEEK 22-24:                         T-DX4.2 (Dependency Inject)
WEEK 24-26:                         T-DX4.3 (Streaming Progress)
───── v2.0 PLATFORM ── marketplace + blueprints + full DX suite ────────
═══════════════════════════════════════════════════════════════════════════
```

---

# MODEL COST STRATEGY

| Tier | Cost | When |
|------|------|------|
| 🪶 Haiku (1x) | Cheapest | Scanning, grep, classification, templating, validation |
| ⚡ Sonnet (3x) | DEFAULT | Implementation, wiring, testing, scripts, content |
| 🧠 Opus (15x) | Premium | Safety review (MANDATORY), phase gates, architecture, physics |

| Track | Opus % | Sonnet % | Haiku % |
|-------|--------|----------|---------|
| F (Foundation) | 5 | 40 | 55 |
| P (PRISM) | 25 | 55 | 20 |
| T (DX Features) | 28 | 62 | 10 |
| B (Business) | 15 | 70 | 15 |

---

# SUBAGENT ARCHITECTURE (Claude Code)

| Agent | Model | Scope | Tools |
|-------|-------|-------|-------|
| `safety-physics` | 🧠 Opus | ALL safety + physics. S(x) ≥ 0.70 HARD BLOCK | Read, Grep, Glob, Bash |
| `implementer` | ⚡ Sonnet | Code, wiring, data processing | Full toolset |
| `verifier` | 🪶 Haiku | Tests, audits, regression. Reports only | Read, Bash |

**Team Parallelization:** For P-MS1-MS3, run 3 implementer agents by category (physics, CAD, algorithms). Safety-physics reviews all outputs serially.


---

# ═══════════════════════════════════════════════════════════════
# TRACK F: FOUNDATION — AUDIT, INDEX, REORGANIZE
# ═══════════════════════════════════════════════════════════════
**Total Sessions:** 4-6 | **Models:** 🪶 Haiku 55% / ⚡ Sonnet 40% / 🧠 Opus 5%

## STATUS: Phase 0-1 COMPLETE, Partial Phase 5

CC completed before restart:
- ✅ **F-0 (Load Existing Systems):** MASTER_INDEX.md, MASTER_FILE_INDEX.json, feature ID mapping loaded
- ✅ **F-1 (Gap Index):** Full C:\PRISM scan → GAP_INDEX_REPORT.md (2026-02-23)
- ✅ **F-5 partial:** 6 reorg batches committed:
  - `e588840` batch1: 165 root loose files archived + 54MB PDF moved
  - `39cf4fd` batch2: 300+ state temp files archived
  - `cf27c8b` batch3: 7 non-canonical material dirs (~184MB) archived
  - `48a7404` batch4: 4 non-canonical skill directories archived
  - `ba77484` batch5-6: extracted backups + legacy backups archived
- ✅ **Audits:** UNREALIZED_FEATURES_AUDIT.md, COMPREHENSIVE_WIRING_AUDIT.md, GAP_INDEX_REPORT.md

## F-2: DEPENDENCY MAP (~2 sessions)
**Role:** 🪶 Haiku → ⚡ Sonnet | **Gate:** Complete map generated

1. Trace ALL import/require/path references across entire codebase
2. Map dependencies using feature IDs (D##.A## format, e.g., D12.A03 → D05.E02)
3. Flag every cross-boundary reference (mcp-server pointing outside it)
4. Generate `DEPENDENCY_MAP.json` with edges: `{source_id, target_id, type, path}`
5. Visualize as Mermaid diagram for high-level architecture view
6. Identify circular dependencies and orphan modules

**Deliverables:** `C:\PRISM\state\DEPENDENCY_MAP.json`, `C:\PRISM\state\DEPENDENCY_GRAPH.mermaid`

## F-3: GAP ANALYSIS (~1 session)
**Role:** ⚡ Sonnet | **Gate:** Complete gap report

Flag: dead files, duplicates, outdated versions, registered-but-unused dispatchers/actions/engines/hooks, uncalled skills, unread data files, orphan feature IDs, unassigned files.

**Deliverable:** `C:\PRISM\state\GAP_ANALYSIS_REPORT.md` (DELETE/ARCHIVE/KEEP/WIRE/ASSIGN per item)

## F-4: PROPOSED RESTRUCTURE (~1 session)
**Role:** 🧠 Opus → ⚡ Sonnet | **Gate:** 👤 Mark approval BEFORE execution

Proposed directory tree, feature ID reassignment, DSL routing updates, migration script with rollback, impact assessment. NO execution without sign-off.

**Deliverable:** `C:\PRISM\state\RESTRUCTURE_PROPOSAL.md`

## F-5: EXECUTE RESTRUCTURE (~1-2 sessions)
**Role:** ⚡ Sonnet | **Gate:** `npm run build` clean + `gsd_sync` passes

Git snapshot → move files → update ALL path references → regenerate feature ID mapping → update MASTER_INDEX.md → `npm run build` → `gsd_sync` → verify zero broken references → commit.

**Deliverable:** Updated MASTER_INDEX.md, MASTER_FILE_INDEX.json, clean build


---

# ═══════════════════════════════════════════════════════════════
# TRACK P: PRODUCT — PRISM MANUFACTURING INTELLIGENCE (R15)
# ═══════════════════════════════════════════════════════════════
**Total Sessions:** 18-24 | **~255 calls** | **Models:** 🧠 Opus 25% / ⚡ Sonnet 55% / 🪶 Haiku 20%
**Depends on:** Track F complete (clean, indexed codebase)
**Safety:** S(x) ≥ 0.70 HARD BLOCK on ALL physics engines

## CONTEXT BRIDGE

**WHAT CAME BEFORE:** P0→R11 built 32 dispatchers, 382 actions, 73 engines. Monolith extraction produced 536 JS files across 22 categories. Web app scaffold: 8 pages, 5 API endpoints. GSD v22.0, 130 hooks, 40 cadences operational.

**WHAT THIS PHASE DOES:** Index ALL 536 extracted modules. Wire critical physics/thermal/vibration. Enhance cadences, hooks, telemetry, GSD, memory, token systems. Build AppBridgeEngine. Expand REST to 20+ endpoints. Wire 8 app pages. Create 13 skills, 10 scripts, 5 engines. Achieve ~25K token savings/session.

**WHAT COMES AFTER:** R16 (Production Deployment — containerization, monitoring, multi-instance). R17 (Advanced Analytics — ML pipeline, predictive models, cross-shop learning).

## EXECUTION MODEL

```
Environment: MCP 50% / Claude Code 30% / PRISM App 20%
Model: Haiku (scanning, classification) → Sonnet (implementation, wiring) → Opus (safety, gate)
Safety: CRITICAL=MS3 (physics — lives at stake), HIGH=MS2 (post proc — machine damage), STANDARD=rest
```

## KNOWLEDGE CONTRIBUTIONS

```
BRANCH 1 (Execution): ALL 536 modules classified, indexed, routed. MASTER_EXTRACTION_INDEX.json 78→536.
BRANCH 2 (Taxonomy): 22-category taxonomy. Every module tagged: category, safety_class, wired_status,
  dispatcher_route, dependencies. Registries 10→14 (add Algorithm, Formula, KnowledgeBase, PostProcessor).
BRANCH 3 (Relationships): Engine→Algorithm, Formula→Engine, KnowledgeBase→Troubleshooting edges.
  App→API→Dispatcher→Engine→Registry chain documented end-to-end.
BRANCH 4 (Session): Integration patterns, safety validation, app architecture, WebSocket protocol, REST.
AT PHASE GATE: 536/536 indexed. App running with live data. Ω ≥ 0.75 target.
```

## THREE GAPS TO CLOSE

**Gap 1 — Monolith Integration (86% unwired):** 536 extracted JS → 73 TS engines. 463 need classification, indexing, wiring or archiving.

**Gap 2 — MCP Subsystem Enhancement:** 7 cadences, 10 hooks, 5 engines, 13 skills, 10 scripts, GSD v23.0, ~25K token savings.

**Gap 3 — PRISM App Wiring:** 8 pages, 5→20+ REST endpoints, WebSocket, AppBridgeEngine.

## EXTRACTION INVENTORY

| Category | Files | Wired | Gap | Priority | Integration Wave |
|----------|------:|------:|----:|----------|:----------------:|
| Physics/Thermal | 23 | 6 | 17 | ⚠️ CRITICAL | 1 |
| Post Processor | 12 | 0 | 12 | ⚠️ CRITICAL | 1 |
| Vibration/Chatter | 5 | 0 | 5 | ⚠️ CRITICAL | 1 |
| Optimization | 24 | 1 | 23 | HIGH | 2 |
| Business | 18 | 2 | 16 | HIGH | 2 |
| Simulation/Collision | 7 | 1 | 6 | HIGH | 2 |
| Quality/Inspection | 3 | 0 | 3 | HIGH | 2 |
| Formulas | 12 | 3 | 9 | HIGH | 2 |
| Tools/Holders | 9 | 2 | 7 | HIGH | 2 |
| CAD/CAM | 52 | 3 | 49 | MEDIUM | 3 |
| Algorithms | 52 | 1 | 51 | MEDIUM | 3 |
| Knowledge Bases | 12 | 1 | 11 | MEDIUM | 3 |
| Learning | 6 | 1 | 5 | MEDIUM | 3 |
| Catalogs | 6 | 0 | 6 | MEDIUM | 3 |
| Materials (engine) | 2 | 1 | 1 | MEDIUM | 3 |
| Machines (engine) | 4 | 1 | 3 | MEDIUM | 3 |
| AI/ML | 78 | 2 | 76 | MEDIUM | 4 |
| Core/Infrastructure | 16 | majority | 5 | LOW | 4 |
| Integration/Systems | 21 | partial | 12 | LOW | 4 |
| Units | 3 | 0 | 3 | MEDIUM | 3 |
| Workholding | 3 | 2 | 1 | LOW | 4 |
| MIT/University | 5 | 0 | 5 | LOW | 4 |
| **TOTAL** | **~536** | **73** | **~463** | | |

## MILESTONE SUMMARY

| MS | Name | Calls | Sessions | Safety | Focus |
|----|------|------:|:--------:|--------|-------|
| MS0 | Full Inventory | ~25 | 1-2 | — | Scan + classify all 536 modules |
| MS1 | Classification + Registry | ~35 | 2-3 | — | Index Wave 3+4, create 4 registries |
| MS2 | Post Proc + Optimization | ~30 | 2-3 | HIGH | Wire Wave 2 modules |
| MS3 | Physics + Thermal + Vibration | ~30 | 2-3 | ⚠️ CRITICAL | Wire Wave 1 — lives at stake |
| MS4 | Skills + Scripts + Hooks | ~25 | 2 | — | 13 skills, 10 scripts, 10 hooks, 5 engines |
| MS5 | Cadence + Telemetry | ~20 | 1-2 | — | 7 cadences, telemetry, hook enhancement |
| MS6 | GSD Enhancement → v23.0 | ~15 | 1 | — | Modular sections, dynamic serving |
| MS7 | Memory + Context + Token | ~15 | 1 | — | ~25K token savings, budget system |
| MS8 | App Bridge + REST + WS | ~45 | 3-4 | — | 20 endpoints, WebSocket, 8 pages |
| MS9 | Phase Gate | ~15 | 1 | ⚠️ CRITICAL | Full Ω validation |

## TASK DAG

```
[MS0: Inventory] → [MS1: Classify] → [MS3: ⚠️ Physics] → [MS9: GATE]
                 └→ [MS2: PostProc]  ──────────────────────→ ↑
[MS4: Skills/Hooks] ────────────────────────────────────────→ │
[MS5: Cadence/Telemetry] ──────────────────────────────────→ │
[MS6: GSD v23.0] ──────────────────────────────────────────→ │
[MS7: Token Optimization] ─────────────────────────────────→ │
[MS8: App Bridge] ──(needs MS1-MS3)────────────────────────→ │
```

## RALPH VALIDATOR MAP

```
MS0-*  → data_integrity    (full extraction inventory)
MS1-*  → data_integrity    (classification accuracy, no miscategorized)
MS2-*  → physics + safety  (post processor, optimization — machine safety)
MS3-*  → physics + safety  (physics/thermal/vibration — CRITICAL, lives)
MS4-*  → code_quality      (skills, scripts, hooks — quality gate compliance)
MS5-*  → infrastructure    (cadence, hook, telemetry — system stability)
MS6-*  → infrastructure    (GSD sections — protocol correctness)
MS7-*  → infrastructure    (memory, context, token — optimization accuracy)
MS8-*  → integration       (app bridge, REST, WebSocket — E2E correctness)
MS9-*  → [full panel]      (phase gate)
```

## FAULT INJECTION TEST (XA-13)

```
WHEN:     After MS8 (AppBridgeEngine wired)
HOW:      Start speed_feed calc via WebSocket, disconnect at 50%, reconnect
EXPECTED: Client detects disconnect, retries via REST fallback, complete result
          No data loss. Telemetry records disconnect. App shows "reconnecting..."
PASS:     Seamless fallback, complete result, accurate telemetry
FAIL:     Lost calculation, crash, or silent data corruption
EFFORT:   ~4 calls
```

## MS0: FULL EXTRACTION INVENTORY (~25 calls, 1-2 sessions)

**Objective:** Scan ALL 536 JS files. Build MASTER_EXTRACTION_INDEX.json with every module classified.

| Task | Scope | Calls | Parallel |
|------|-------|------:|:--------:|
| MS0-T1: Scan 255 engines | `extracted/engines/**` (14 subdirs) | ~8 | ✅ |
| MS0-T2: Scan 52 algorithms + 12 formulas | `extracted/algorithms/`, `extracted/formulas/` | ~4 | ✅ |
| MS0-T3: Scan remaining (~145 files) | KB, business, catalogs, learning, integration, core, infra, MIT | ~6 | ✅ |
| MS0-T4: Cross-reference with 73 MCP engines | Status: WIRED/PARTIAL/ABSORBED/UNWIRED/ARCHIVED | ~3 | |
| MS0-T5: Generate gap matrix + priority ranking | 4-wave integration plan → INTEGRATION_PRIORITY_MATRIX.md | ~2 | |
| MS0-T6: Update MASTER_EXTRACTION_INDEX.json | 78→536 entries with full schema per entry | ~2 | |

**Deliverables:** MS0_ENGINES_SCAN.json, MS0_CROSS_REFERENCE.json, INTEGRATION_PRIORITY_MATRIX.md, MASTER_EXTRACTION_INDEX.json (536 entries)

## MS1: WAVE 3+4 CLASSIFICATION + REGISTRY (~35 calls, 2-3 sessions)

| Task | Scope | Calls | Parallel |
|------|-------|------:|:--------:|
| MS1-T1: CAD/CAM classification | 56 files → feature type, geometry kernel, integration path | ~6 | ✅ |
| MS1-T2: Algorithm classification | 52 files → type, O-notation, mfg relevance | ~4 | ✅ |
| MS1-T3: AI/ML classification | 91 files → deduplicate (~30 unique, ~61 dupes) | ~6 | ✅ |
| MS1-T4: KB + Learning + Integration | 44 files → knowledge, learning, bridge, MIT | ~4 | ✅ |
| MS1-T5: Create/expand 4 registries | AlgorithmRegistry, FormulaRegistry, KnowledgeBaseRegistry, PostProcessorRegistry | ~6 | |
| MS1-T6: Index validation | 536/536 verified, 0 uncategorized | ~3 | |
| MS1-T7: Wire to dispatchers | algorithmDispatcher or knowledgeDispatcher, calcDispatcher (formula), postProcessorDispatcher or generatorDispatcher | ~6 | |

**New dispatcher actions:** `algorithm_get`, `algorithm_search`, `algorithm_list`, `algorithm_benchmark`, `formula_get`, `formula_search`, `formula_validate`, `formula_compare`, `kb_query`, `kb_search`, `kb_get_related`, `kb_list_topics`, `post_get`, `post_search`, `post_validate`, `post_generate_config`

## MS2: WAVE 2 — POST PROC + OPTIMIZATION + BUSINESS (~30 calls, 2-3 sessions)

| Task | Scope | Calls | Safety |
|------|-------|------:|--------|
| MS2-T1: Post processor wiring | 12 files → PostProcessorEngine.ts (`generateBlock`, `generateProgram`, `validateSyntax`, `translateDialect`) | ~8 | ⚠️ CRITICAL |
| MS2-T2: Optimization consolidation | 24 files → OptimizationSuiteEngine.ts (6 solver types: SingleObj, MultiObj, Constrained, MfgSpecific, Combinatorial, Robust) | ~8 | HIGH |
| MS2-T3: Safety validation | Opus review: spindle limits, feed limits, rapid collision, coolant, work coord | ~4 | ⚠️ MANDATORY |
| MS2-T4: Business module wiring | 18 files → JobCostingEngine.ts, QuotingEngine.ts, expand ShopSchedulerEngine.ts, expand ProductEngine.ts, InventoryEngine.ts | ~6 | STANDARD |
| MS2-T5: Integration test | `npm run build`, verify no regression in 382 actions | ~4 | |

**New REST endpoints for business:** `/api/v1/quote`, `/api/v1/schedule`, `/api/v1/cost`

## MS3: WAVE 1 — ⚠️ PHYSICS + THERMAL + VIBRATION CRITICAL (~30 calls, 2-3 sessions)

**Mathematical correctness is non-negotiable. Lives depend on it. Opus MANDATORY.**

| Task | Scope | Calls | Safety |
|------|-------|------:|--------|
| MS3-T1: Physics engine wiring | 12+ files → KinematicsEngine.ts (FK/IK, Jacobian, workspace), DynamicsEngine.ts (cutting forces, rigid body, contact), expand ManufacturingCalculations.ts | ~8 | ⚠️ CRITICAL |
| MS3-T2: Thermal engine wiring | 7+ files → ThermalAnalysisEngine.ts (`predictCuttingTemperature`, `calculateExpansion`, `recommendDerating`). Wire THERMAL_DERATING hook. | ~6 | ⚠️ CRITICAL |
| MS3-T3: Vibration + collision wiring | 12+ files → VibrationAnalysisEngine.ts (stability lobes, chatter/FFT, surface finish). Expand CollisionEngine.ts (BVH, octree). Expand SpindleProtectionEngine.ts. | ~6 | ⚠️ CRITICAL |
| MS3-T4: Physics plausibility validation | Known test vectors ±5% force, ±10% temp, correct stability, collision detection | ~4 | ⚠️ MANDATORY |
| MS3-T5: Quality + inspection wiring | 3 files → prism_quality dispatcher (SPC, Cpk, tolerance, FEA-lite) | ~4 | HIGH |
| MS3-T6: Integration test | Build + test + safety S(x) ≥ 0.70 all CRITICAL engines | ~2 | |

**Deliverable:** `state/results/R15_PHYSICS_VALIDATION.json`

## MS4: NEW SKILLS + SCRIPTS + HOOKS + ENGINES (~25 calls, 2 sessions)

### 7 Manufacturing Skills (MS4-T1)
| Skill | Focus |
|-------|-------|
| `prism-tapping-mastery` | Tap selection, rigid vs floating, synchronization, peck cycles |
| `prism-boring-operations` | Boring bar selection, finish/back/line boring |
| `prism-5axis-strategies` | 3+2 vs simultaneous, tool axis control, lean angles, collision zones |
| `prism-micro-machining` | Sub-1mm features, HSM strategies, runout control, tool stickout |
| `prism-cryogenic-machining` | LN2/CO2 cooling, chip embrittlement, nozzle placement |
| `prism-high-feed-milling` | HFM geometry, chip thinning, shallow DOC, high-feed inserts |
| `prism-plunge-milling` | Axial force utilization, pocket entry, deep cavity, Z-level |

### 6 Development Skills (MS4-T2)
| Skill | Focus |
|-------|-------|
| `prism-mcp-debugging` | Log analysis, common failures, restart procedures, diagnostics |
| `prism-registry-operations` | CRUD for 14 registries, batch ops, integrity checks |
| `prism-audit-procedures` | Systematic audit methodology, anti-regression checklist |
| `prism-app-integration` | REST API patterns, WebSocket setup, auth, CORS config |
| `prism-performance-profiling` | Node.js profiling, memory leaks, bundle analysis, heap snapshots |
| `prism-data-migration` | Schema versioning, data transforms, rollback, backwards compat |

### 10 Automation Scripts (MS4-T3)
| Script | Purpose |
|--------|---------|
| `scripts/telemetry_analyzer.py` | Trend analysis from telemetry snapshots |
| `scripts/skill_quality_scanner.py` | Automated skill checklist validation |
| `scripts/registry_health_check.js` | Validate all 14 registries |
| `scripts/transcript_miner.py` | Extract patterns from conversation transcripts |
| `scripts/hook_coverage_report.js` | Map hooks to dispatchers, find gaps |
| `scripts/gsd_section_generator.py` | Auto-split GSD into modular sections |
| `scripts/cadence_profiler.js` | Profile cadence execution times |
| `scripts/build_metrics.js` | Track build times, bundle size history |
| `scripts/app_api_generator.js` | Generate OpenAPI spec from REST endpoints |
| `scripts/data_export.js` | Export registry data for PRISM app |

### 10 New Hooks (MS4-T5)
| Hook | Type | Severity |
|------|------|----------|
| `REST_PRE_AUTH` | blocking | critical — validate API key before REST handler |
| `REST_POST_LOG` | logging | normal — log request/response to audit trail |
| `REGISTRY_WRITE_VALIDATE` | blocking | high — validate data before registry write |
| `SKILL_BUNDLE_INTEGRITY` | warning | normal — verify skill bundle consistency |
| `THERMAL_DERATING` | blocking | critical — adjust limits at elevated temperatures |
| `MAZAK_ALARM_VALIDATE` | warning | high — Mazak-specific alarm validation |
| `OKUMA_ALARM_VALIDATE` | warning | high — Okuma-specific alarm validation |
| `COMPACTION_PREDICTED` | warning | high — early warning for context exhaustion |
| `TOKEN_BUDGET_EXCEEDED` | blocking | critical — enforce per-category token limits |
| `DECISION_QUALITY_LOW` | warning | normal — flag low-confidence decisions |

### 5 New Engines (MS4-T5)
| Engine | Purpose |
|--------|---------|
| `ContextBudgetEngine.ts` | Token budget allocation per category |
| `PatternExtractionEngine.ts` | Extract recurring patterns from MemoryGraph |
| `AppBridgeEngine.ts` | WebSocket + SSE bridge (scaffolded, completed in MS8) |
| `DataExportEngine.ts` | Standardized registry data export |
| `UserPreferenceEngine.ts` | Operator preferences (units, display) |

## MS5: CADENCE + HOOK + TELEMETRY (~20 calls, 1-2 sessions)

### 7 New Cadence Functions (MS5-T1)
| Cadence | Frequency | Action |
|---------|-----------|--------|
| `autoMemoryGraphPrune` | @20 calls | Evict old ContextNodes, cap at 500 |
| `autoSLOCheck` | @15 calls | Fire TelemetryEngine.checkSLOs() |
| `autoRegistryIntegrity` | @25 calls | Spot-check 3 random entries |
| `autoDecisionSummarize` | @30 calls | Compress DECISION_LOG.jsonl |
| `autoSessionQuality` | @20 calls | Fire getSessionQualityScore() |
| `autoCompactionPredict` | @12 calls | Use past pressure curves to predict |
| `autoSkillBundleRefresh` | @session_boot | Rescan skill bundles |

### Telemetry Enhancement (MS5-T2)
- Per-action telemetry (track individual actions, not just dispatchers)
- Route optimization for non-safety dispatchers (prism_doc, prism_context, prism_session)
- Notification channels: file-based (alerts.jsonl) + webhook-ready (HTTP POST)
- Telemetry REST endpoint: `/api/v1/telemetry/dashboard`
- Cross-session baseline persistence (last 30 sessions)

### Hook System Enhancement (MS5-T3)
- REST API hook category (`RestApiHooks.ts`)
- Controller hooks: add MAZAK, OKUMA patterns
- Hook priority inheritance for chain execution
- Hook coverage report generation

## MS6: GSD v23.0 (~15 calls, 1 session)

### Modular Sections (MS6-T1)
| Section | Tokens | Content |
|---------|--------|---------|
| `DECISION_TREE.md` | ~800 | Tool routing only |
| `CADENCES.md` | ~400 | Auto-fire schedule (47 cadences) |
| `QUALITY_GATES.md` | ~300 | Validation sequence |
| `COMPACTION.md` | ~500 | Recovery protocol |
| `SAFETY.md` | ~400 | S(x) rules + thresholds |
| `SKILL_GATE.md` | ~300 | Skill creation rules |

### Dynamic GSD Serving (MS6-T2)
- <50% pressure → Full GSD (all sections)
- 50-70% → Core only (decision tree + safety + cadences)
- 70%+ → Minimal (decision tree only)
- `gsd_section` action to load specific sections on-demand

## MS7: MEMORY + CONTEXT + TOKEN OPTIMIZATION (~15 calls, 1 session)

### Token Optimization Suite (MS7-T1) — ~25K savings/session
| Optimization | Savings | Mechanism |
|-------------|---------|-----------|
| `material_search_lite` | ~10K/session | New action: ID + name + 5 key props (vs 127 params) |
| Alarm tiered response | ~2K/query | Level 1/2/3 depth, default L1 for auto-queries |
| Skill section injection | ~3K/injection | Inject only When/How/Returns, not full SKILL.md |
| Hook result slimming | ~500/chain | `hookResultSlim()` returns pass/fail + blocking msgs only |

### MemoryGraph Enhancement (MS7-T2)
- Graph query caching via ComputationCache
- Semantic deduplication (Levenshtein < 3)
- Priority-based eviction (safety decisions 10x longer)
- Export to Mermaid format for app visualization

### Context Budget System (MS7-T3)
- ContextBudgetEngine.ts: 40% manufacturing, 20% dev, 20% context, 20% reserve
- TOKEN_BUDGET_EXCEEDED hook fires when category exceeds allocation
- Wire to autoContextPressure cadence

### Predictive Context Loading (MS7-T4)
- MemoryGraph patterns predict needed skills/data
- "speed_feed for titanium" → pre-load thermal skill + Ti data
- Wire SkillAutoLoader.ts (currently orphaned)

## MS8: APP BRIDGE + REST + WEBSOCKET + PAGES (~45 calls, 3-4 sessions)

### AppBridgeEngine (MS8-T1)
```
AppBridgeEngine {
  HTTP: Express on port 3000
  WebSocket: ws on port 3001
  SSE: fallback for non-WS clients
  Channels: telemetry (5s push), safety-alerts, calculation-stream,
            session-state, hook-events, registry-updates
}
```

### WebSocket Protocol (MS8-T2)
- Message types: subscribe, unsubscribe, request, response, push
- Heartbeat: 30s ping/pong
- Reconnection: exponential backoff
- Telemetry: connection tracking

### REST API — 20 Endpoints (MS8-T3)
| Endpoint | Method | Dispatcher Route |
|----------|--------|-----------------|
| `/api/v1/speed-feed` | POST | prism_calc:speed_feed |
| `/api/v1/cutting-force` | POST | prism_calc:cutting_force |
| `/api/v1/tool-life` | POST | prism_calc:tool_life |
| `/api/v1/surface-finish` | POST | prism_calc:surface_finish |
| `/api/v1/thread-calculate` | POST | prism_thread:thread_calc |
| `/api/v1/material/search` | POST | prism_data:material_search |
| `/api/v1/machine/search` | POST | prism_data:machine_search |
| `/api/v1/alarm/lookup` | POST | prism_alarm:alarm_lookup |
| `/api/v1/toolpath/recommend` | POST | prism_toolpath:recommend |
| `/api/v1/telemetry/dashboard` | GET | prism_telemetry:dashboard |
| `/api/v1/telemetry/slos` | GET | prism_telemetry:slo_check |
| `/api/v1/health` | GET | system health check |
| `/api/v1/registries/status` | GET | registry counts |
| `/api/v1/what-if/simulate` | POST | prism_calc:what_if_analysis |
| `/api/v1/quote` | POST | prism_business:quote |
| `/api/v1/schedule` | POST | prism_business:schedule |
| `/api/v1/cost` | POST | prism_business:cost |
| `/api/v1/safety/check` | POST | prism_safety:safety_check |
| `/api/v1/post-processor/generate` | POST | prism_gen:post_generate |
| `/api/v1/session/state` | GET | prism_session:state_load |

All endpoints: input validation, error handling, safety score in response, CORS headers. OpenAPI spec generated by `app_api_generator.js`.

### 8 App Pages (MS8-T5)
| Page | Data Source | Key Features |
|------|------------|--------------|
| **Dashboard** | telemetry, registries | Live registry counts, telemetry charts, SLO status, active sessions, hook fire log |
| **Calculator** | prism_calc (21 actions) | Form UI, comparison mode, result history |
| **Alarm** | prism_alarm | Search by code/controller/family, fix suggestions, severity indicators |
| **SafetyMonitor** | prism_safety | Real-time S(x) scores, hook fire log, violation history, WebSocket push |
| **Reports** | prism_doc | Setup sheets, job reports, material certificates, PDF export |
| **ToolpathAdvisor** | prism_toolpath (680 strategies) | Strategy search, parameter recommendations, visual comparison |
| **WhatIf** | prism_calc | Parameter sweep UI, multi-variable optimization, Pareto chart |
| **JobPlanner** | prism_business | Multi-operation sequencing, constraint validation, cost rollup, timeline |

### Auth + CORS (MS8-T6)
- CORS middleware (allow app origin)
- MultiTenantEngine for user auth
- API key management via ProtocolBridgeEngine
- Role-based access: **Operator** (read + calculate), **Engineer** (+ write), **Admin** (+ config)

### Real-Time Channels (MS8-T7)
| Channel | Trigger | Content |
|---------|---------|---------|
| `telemetry` | Every 5s | Dashboard metrics |
| `safety-alerts` | Hook severity ≥ WARNING | Alert payload |
| `session-state` | State change | Session state |
| `calculation-stream` | Long-running calc | Partial results |

## P-MS9: PHASE GATE

### Gate Criteria
```
□ MASTER_EXTRACTION_INDEX.json: 536/536 modules indexed
□ 0 UNCATEGORIZED modules remaining
□ Registries: 14/14 loading (was 10) — Algorithm, Formula, KnowledgeBase, PostProcessor added
□ Engines: 78+ (was 73) — all building clean
□ Hooks: 140+ (was 130) — all in allHooks[]
□ Cadences: 47 (was 40) — all firing per schedule
□ Skills: 243+ (was 230) — all passing checklist v2.0
□ REST Endpoints: 20+ (was 9) — documented with OpenAPI spec
□ WebSocket: 4 channels live with reconnection + SSE fallback
□ App Pages: 8/8 wired to live data (Dashboard, Calculator, Alarm, SafetyMonitor, Reports, ToolpathAdvisor, WhatIf, JobPlanner)
□ GSD: v23.0 with 6 modular sections
□ Token Savings: ≥20K tokens/session verified (material_search_lite, alarm tiered, skill section, hook slim)
□ Safety: S(x) ≥ 0.70 on ALL CRITICAL engines (Physics, Thermal, Vibration, PostProcessor)
□ Ω Score: ≥ 0.75
□ Build: Clean, no regressions
□ Anti-Regression: New ≥ Old on all metrics
□ R15_PHYSICS_VALIDATION.json: all test vectors passing
```

### Success Metrics
| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Modules indexed | 78 | 536 | +587% |
| Engines | 73 | 78+ | +7% |
| Hooks | 130 | 140+ | +8% |
| Cadences | 40 | 47 | +18% |
| REST endpoints | 9 | 20+ | +122% |
| Registries | 10 | 14 | +40% |
| App pages functional | 3/8 | 8/8 | +167% |
| Token savings/session | 0 | ~25K | NEW |
| WebSocket channels | 0 | 4 | NEW |
| Dispatcher actions | 382 | ~400+ | +5% |

**Full step-by-step task breakdowns:** See PHASE_R15_MCP_ENHANCEMENT_FULL.md (~1,500 lines).


---

# ═══════════════════════════════════════════════════════════════
# TRACK T: TECHNICAL — DEVELOPER EXPERIENCE (15 FEATURES)
# ═══════════════════════════════════════════════════════════════
**Total Sessions:** 32-42 | **Models:** 🧠 Opus 28% / ⚡ Sonnet 62% / 🪶 Haiku 10%
**Can start immediately** — only needs build pipeline (already working)

## PHASE OVERVIEW

| Phase | Name | Sessions | Gate | Revenue |
|-------|------|----------|------|---------|
| DX0 | Developer Magnetism 🧲 | 6-8 | `nexus dev` hot-reloads, `nexus test` passes, context viz renders | Adoption |
| DX1 | Cost Intelligence 💵 | 7-9 | Model routing saves 40%+, cache hit rate >60%, cost estimator ±10% | $99K ARR |
| DX2 | Production Confidence 💵 | 8-10 | HITL approvals, time-travel replays, structured output enforced | Enterprise |
| DX3 | Ecosystem Velocity 💵 | 6-8 | Blueprint marketplace live, cross-server composition works | $36K marketplace |
| DX4 | Operational Excellence | 5-7 | Multi-provider failover, DI profiles, streaming progress | Retention |

## DX REVENUE TABLE (Additive to Master)

| Feature | Pricing | Year 1 ARR | Tier Required |
|---------|---------|------------|---------------|
| Model Router (standalone add-on) | $49/mo or included in Pro | $29,400 | Pro+ |
| Semantic Cache Pro | $39/mo add-on | $23,400 | Pro+ |
| Cost Intelligence Dashboard | $79/mo or included in Team | $47,400 | Team+ |
| Human-in-the-Loop Pro | $99/mo or included in Team | $59,400 | Team+ |
| Agent Blueprints Marketplace | 30% GMV revenue share | $36,000 | All (marketplace) |
| Multi-Provider Failover | $69/mo add-on | $41,400 | Pro+ |
| **Total DX Revenue** | | **$237,000** | |

## DX0: DEVELOPER MAGNETISM 🧲 (6-8 sessions)

### Feature 1: Hot Reload Dev Server (`nexus dev`)
| Unit | Role | Task | Effort |
|------|------|------|--------|
| DX0.1.1 | ⚡ E3 | File watcher + incremental esbuild (<200ms rebuild) | M |
| DX0.1.2 | 🧠 E4→⚡ E3 | Hot module replacement — swap dispatchers without dropping MCP connection | L |
| DX0.1.3 | ⚡ E3 | State preservation across reloads (session, hooks, context, memory) | M |
| DX0.1.4 | 🧠 E3→⚡ E3 | Request inspector (DevTools for MCP) — color-coded log: `[time] 🔧 tool ← input → ✅ latency tokens $cost` | M |
| DX0.1.5 | ⚡ E2 | CLI entry point: `nexus dev --port --verbose --filter --no-inspector --profile`. ASCII banner, graceful Ctrl+C. | S |

### Feature 2: MCP Testing Framework (`nexus test`)
| Unit | Role | Task | Effort |
|------|------|------|--------|
| DX0.2.1 | 🧠 E4 | Test runner architecture + DSL — wrap Vitest, 6 test types (unit, integration, snapshot, contract, chaos, load) | L |
| DX0.2.2 | ⚡ E4 | Mock MCP client — in-process, deterministic, no API costs. `callTool`, `listTools`, `callToolRaw`, `simulateTimeout/Error` | L |
| DX0.2.3 | ⚡ E3 | Unit + integration helpers — `createTestServer`, `fixtures` (cleanState, populatedState, unsafeInput), custom matchers (`toBeBlocked`, `toMatchSchema`, `toHaveOmegaScore`, `toComplete`, `toTriggerHook`) | M |
| DX0.2.4 | ⚡ E3 | Snapshot testing — record/replay outputs, fuzzy matching (ignore timestamps/IDs/ordering), `--update-snapshots`, `--review-snapshots`, `--prune-snapshots` | M |
| DX0.2.5 | 🧠 E3→⚡ E3 | Contract testing — detect breaking schema changes (remove field, change type, rename, tighten enum). CI gate with `--allow-breaking`. Migration hints. | M |
| DX0.2.6 | ⚡ E3 | Chaos testing — fault injection (timeout, error, corruption, hook failure, state corruption). Configurable: low/medium/high/custom. Chaos seed for reproducibility. Resilience score. | M |
| DX0.2.7 | ⚡ E3 | Load testing — concurrent stress (1-1000 clients), ramp-up, p50/p95/p99/max, error rate, memory/CPU. Comparison mode with baseline. | M |
| DX0.2.8 | ⚡ E2 | Coverage reporting — per-dispatcher/action coverage, threshold in nexus.config.json, CI exit codes, JUnit XML, badge SVG | S |
| DX0.2.9 | ⚡ E2 | CLI: `nexus test [pattern] --watch --coverage --update-snapshots --contract --chaos medium --load --concurrency 100 --ci` | S |

### Feature 3: Context Budget Visualizer & Optimizer
| Unit | Role | Task | Effort |
|------|------|------|--------|
| DX0.3.1 | ⚡ E3 | Context telemetry collector — tiktoken-based token counting per model. Categories: tool_descriptions, system_prompt, state_data, conversation_history, tool_io, hook_overhead, available_budget. Store in `state/telemetry/context_budget.jsonl` | M |
| DX0.3.2 | 🧠 E3→⚡ E3 | Terminal dashboard — treemap of context budget consumption, real-time update | M |
| DX0.3.3 | ⚡ E3 | Lazy tool loading engine — only register tools when topic detected, unload unused | M |
| DX0.3.4 | ⚡ E3 | Auto-compression for tool outputs — compress verbose outputs, configurable thresholds | S |

## DX1: COST INTELLIGENCE 💵 (7-9 sessions)

### Feature 4: Intelligent Model Router
| Unit | Role | Task | Effort |
|------|------|------|--------|
| DX1.1.1 | 🧠 E4 | Task complexity classifier — score queries by required capability (simple→Haiku, medium→Sonnet, hard→Opus) | L |
| DX1.1.2 | ⚡ E4 | Router engine — multi-provider (OpenAI, Anthropic, local), fallback chains, quality monitoring | L |
| DX1.1.3 | ⚡ E3 | Fallback chains + quality monitoring — auto-escalate on low quality, circuit breaker per provider | M |
| DX1.1.4 | ⚡ E3 | Cost savings report — "$847 saved this month", per-tool breakdown, trend charts | M |

### Feature 5: Semantic Response Cache
| Unit | Role | Task | Effort |
|------|------|------|--------|
| DX1.2.1 | 🧠 E4 | Exact match cache layer — hash-based, instant lookup | L |
| DX1.2.2 | ⚡ E3 | Semantic similarity cache — embedding-based fuzzy match for near-identical queries | M |
| DX1.2.3 | ⚡ E3 | Cache policies + warming — TTL, schema-change invalidation, manual purge, pre-warm common queries | M |

### Feature 6: Cost Estimator & Budget Enforcement
| Unit | Role | Task | Effort |
|------|------|------|--------|
| DX1.3.1 | ⚡ E3 | Token cost calculator — tiktoken + model pricing tables, per-call cost | M |
| DX1.3.2 | ⚡ E3 | Pre-execution cost estimator — predict cost before execution, display to user | M |
| DX1.3.3 | ⚡ E3 | Budget enforcement engine — hard/soft limits per session, per tool, per time window | M |
| DX1.3.4 | ⚡ E2 | Cost anomaly detection — alert on 3σ deviation from baseline, per-tool anomaly tracking | S |

## DX2: PRODUCTION CONFIDENCE 💵 (8-10 sessions)

### Feature 7: Human-in-the-Loop Approval Gates
| Unit | Role | Task | Effort |
|------|------|------|--------|
| DX2.1.1 | 🧠 E4 | Approval gate engine — configurable rules (cost threshold, safety score, data sensitivity, custom) | L |
| DX2.1.2 | ⚡ E4 | Approval channels — Slack, email, dashboard, SMS, webhook | L |
| DX2.1.3 | ⚡ E3 | Timeout, escalation + bulk operations — auto-approve/reject/escalate, batch approve/reject | M |
| DX2.1.4 | ⚡ E3 | Declarative gate configuration — YAML/JSON config for approval rules per tool/context | M |

### Feature 8: Time-Travel Debugger
| Unit | Role | Task | Effort |
|------|------|------|--------|
| DX2.2.1 | 🧠 E4 | Execution recorder — capture every tool call, state change, hook event with timestamps | L |
| DX2.2.2 | ⚡ E4 | Terminal replay player — step through recorded sessions, pause/resume/speed control | L |
| DX2.2.3 | ⚡ E3 | Fork + re-execute — branch from any point with modified inputs, diff outcomes | M |
| DX2.2.4 | ⚡ E3 | Shareable replay links + auto-capture — export recordings, auto-capture on error/anomaly | M |

### Feature 9: Structured Output Enforcement
| Unit | Role | Task | Effort |
|------|------|------|--------|
| DX2.3.1 | ⚡ E3 | Output schema validator — Zod-based schemas per tool with coercion | M |
| DX2.3.2 | ⚡ E3 | Auto-retry with correction prompt — attempt to fix malformed output via LLM before failing | M |
| DX2.3.3 | ⚡ E2 | Schema coercion + defaults — `nexus schema generate` from TypeScript types, default values | S |

## DX3: ECOSYSTEM VELOCITY (6-8 sessions)

### Feature 10: Agent Blueprints Marketplace 💵
| Unit | Role | Task | Effort |
|------|------|------|--------|
| DX3.1.1 | 🧠 E4 | Blueprint schema + runtime — portable agent definitions (tools, prompts, config, state, lifecycle hooks) | L |
| DX3.1.2 | ⚡ E3 | Built-in starter blueprints — 10 blueprints (support bot, code reviewer, data analyst, research assistant, content writer, onboarding agent, QA tester, DevOps monitor, sales assistant, meeting summarizer) | M |
| DX3.1.3 | ⚡ E4 | Blueprint marketplace infrastructure — registry, search, install, rate, review, 70/30 revenue split (developer 70%, Nexus 30%) | L |

### Feature 11: Cross-Server Tool Composition
| Unit | Role | Task | Effort |
|------|------|------|--------|
| DX3.2.1 | 🧠 E4 | Pipeline DSL + executor — declarative multi-server workflows, conditional branching, parallel execution | L |
| DX3.2.2 | ⚡ E3 | Cross-server federation — server discovery, registration, unified error handling, auth propagation | M |

### Feature 12: Schema Evolution & Versioning
| Unit | Role | Task | Effort |
|------|------|------|--------|
| DX3.3.1 | 🧠 E3→⚡ E3 | Tool schema versioning system — semantic versioning, backward compatibility layer, deprecated fields, migration helpers, compatibility matrix | M |

## DX4: OPERATIONAL EXCELLENCE (5-7 sessions)

### Feature 13: Multi-Provider Failover 💵
| Unit | Role | Task | Effort |
|------|------|------|--------|
| DX4.1.1 | ⚡ E3 | Provider registry + health monitoring — circuit breaker, latency tracking, health scores | M |
| DX4.1.2 | ⚡ E3 | Quality equivalence testing — verify output quality across providers, auto-select best | M |

### Feature 14: Dependency Injection for Tools
| Unit | Role | Task | Effort |
|------|------|------|--------|
| DX4.2.1 | 🧠 E3→⚡ E3 | Profile-based service injection — dev/test/prod swappable. nexus.config.json profiles. | M |

### Feature 15: Streaming Progress for Long Tools
| Unit | Role | Task | Effort |
|------|------|------|--------|
| DX4.3.1 | ⚡ E3 | Progress streaming protocol — rate limiting, heartbeat, cancel support | M |
| DX4.3.2 | ⚡ E3 | Streaming output for large results — AsyncIterable chunks with backpressure | M |

## WHAT SHIPS WHEN

| Release | Must-Have Features |
|---------|-------------------|
| **v1.0** (Week 10) | Hot Reload (DX0.1), Testing (DX0.2), Context Viz (DX0.3), Structured Output (DX2.3), DI (DX4.2), Streaming basic (DX4.3) |
| **v1.1** (Week 14) | Model Router (DX1.1), Semantic Cache (DX1.2), Cost Estimator (DX1.3), Schema Evolution (DX3.3) |
| **v1.2** (Week 20) | HITL (DX2.1), Time-Travel Debugger (DX2.2), Cost Anomaly (DX1.3.4), Multi-Provider (DX4.1) |
| **v2.0** (Week 26) | Agent Blueprints + Marketplace (DX3.1), Cross-Server (DX3.2), Chaos+Load Testing (DX0.2.6+7) |

## TOTAL DX UNITS: 51

**Full implementation instructions per unit:** See NEXUS_DX_FEATURES_ROADMAP.md (~1,000 lines).


---

# ═══════════════════════════════════════════════════════════════
# TRACK B: BUSINESS — LAUNCH INFRASTRUCTURE
# ═══════════════════════════════════════════════════════════════
**Total Sessions:** 21-30 | **Models:** 🧠 Opus 15% / ⚡ Sonnet 70% / 🪶 Haiku 15%

## B0: DOMAIN & BRAND IDENTITY (1-2 days)
**Gate:** Domain registered, logo, brand guide, social accounts

| Unit | Role | Task |
|------|------|------|
| B0.1 | 👤 Human | Domain registration (nexusmcp.com recommended) + email setup |
| B0.2 | 👤+💰 | Logo design (Fiverr/99designs $200-500 or AI-generated). Logomark + wordmark + monochrome variants. |
| B0.3 | ⚡ E2 | Brand guide (colors, typography, voice), social accounts (GitHub org, Twitter/X, Discord, LinkedIn) |

## B1: PACKAGE & DISTRIBUTION (2-3 sessions)
**Gate:** `npm install @nexus-mcp/core` works, Docker runs

| Unit | Role | Task |
|------|------|------|
| B1.1 | ⚡ E3 | npm package structure — `@nexus-mcp/core` with ESM + CJS dual exports, TypeScript declarations, tree-shakeable. `@nexus-mcp/test` separate package. |
| B1.2 | ⚡ E3 | GitHub repo setup — monorepo (Turborepo), branch protection, CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md, issue/PR templates, CHANGELOG.md |
| B1.3 | ⚡ E3 | Docker distribution — `nexusmcp/core` on Docker Hub, multi-arch (amd64+arm64), Helm chart for K8s, docker-compose for local dev |
| B1.4 | ⚡ E2 | Release automation — semantic-release, GitHub Actions CI/CD (lint→test→build→publish npm+Docker), version bumping, release notes |

## B2: DOCUMENTATION SITE (3-4 sessions)
**Gate:** docs.nexusmcp.com live, quickstart works end-to-end

| Unit | Role | Task |
|------|------|------|
| B2.1 | ⚡ E3 | Documentation framework — Mintlify (recommended) or Docusaurus, custom theme matching brand |
| B2.2 | 🧠 E4→⚡ E3 | Quickstart guide — "Build your first MCP server in 5 minutes" (zero to working in 1 page) |
| B2.3 | ⚡ E3 | Core documentation — Architecture overview, configuration reference (nexus.config.json), dispatcher guide, hook system, session management, quality gates |
| B2.4 | ⚡ E3 | API reference — Auto-generated from TypeScript types, all dispatchers/actions documented with examples |
| B2.5 | ⚡ E3 | Tutorials — 6 vertical tutorials: Healthcare MCP (10 min), Legal AI (10 min), Finance Bot (10 min), DevOps Agent (10 min), Customer Support (10 min), Manufacturing (15 min) |
| B2.6 | ⚡ E3 | Migration guides — from raw MCP SDK, from LangChain, from CrewAI. Search (Algolia recommended). |

## B3: MARKETING SITE (3-4 sessions)
**Gate:** nexusmcp.com live, pricing converts, demo works

| Unit | Role | Task |
|------|------|------|
| B3.1 | ⚡ E3 | Marketing site framework — Next.js 14+ + Tailwind + Vercel. Pages: Home, Features, Pricing, Use Cases (×6), Blog, About, Security, Enterprise, Changelog, Contact |
| B3.2 | 🧠 E4→⚡ E3 | Landing page — Hero ("The OS for Intelligent MCP Servers") → Problem ("17,567 servers. Zero enterprise.") → Feature Grid → Architecture → Code Comparison (raw 30 lines vs Nexus 8) → Verticals → Academic → Social Proof → Pricing → CTA |
| B3.3 | 🧠 E3→⚡ E3 | Pricing page — Feature comparison matrix, usage add-ons, FAQ (15+ questions), enterprise contact, annual toggle (20% off) |
| B3.4 | 🧠 E4→⚡ E4 | Interactive demo/playground — Build Nexus server in browser via WebContainers (StackBlitz) or server-side sandbox. Guided tour, share button. |
| B3.5 | 🧠 E4→⚡ E3 | Blog + launch posts — "Why We Built Nexus" (🧠), "The MCP Security Crisis" (🧠), "Session Resilience" (🧠), "500 Algorithms, One npm Install" (⚡), "Healthcare MCP in 10 Min" (⚡) |
| B3.6 | ⚡ E2 | SEO + analytics — Meta tags, structured data, sitemap, Search Console, conversion tracking (PostHog) |

## B4: AUTHENTICATION & BILLING (3-4 sessions)
**Gate:** Sign up, subscribe, manage API keys, see usage

| Unit | Role | Task |
|------|------|------|
| B4.1 | ⚡ E3 | Authentication system — Clerk ($25/mo): sign up, sign in, org creation, team invites, OAuth, API key generation |
| B4.2 | ⚡ E4 | Stripe billing — Products (Free/Pro $99/Team $299/Enterprise custom), annual (20% off), checkout + customer portal, webhooks (subscription/invoice/payment failure), usage metering (Ralph credits, storage, API calls, tokens), dunning management, proration for upgrades |
| B4.3 | ⚡ E3 | License key system (self-hosted) — Ed25519-signed keys via CertificateEngine. Contains: org_id, tier, features, expiry, seat count. Startup validation, periodic revalidation, 30-day offline grace, feature flags per tier. |
| B4.4 | ⚡ E3 | Usage dashboard — Recharts visualization: plan + usage meters, usage trends, cost breakdown, billing history, team management, API keys, upgrade prompts |

## B5: CLOUD HOSTING PLATFORM (5-7 sessions)
**Gate:** Managed instances provision in <60s, auto-scale, bill correctly

| Unit | Role | Task |
|------|------|------|
| B5.1 | 🧠 E5 | Cloud architecture design — CloudFlare CDN/WAF → ALB → ECS Fargate (1 task/tenant) → RDS Postgres + ElastiCache Redis + S3 + CloudWatch + Stripe webhooks. AWS ECS recommended for MVP. |
| B5.2 | ⚡ E4 | Infrastructure as code — Terraform/Pulumi: VPC (2+ AZs), ECS cluster, RDS (Multi-AZ), ElastiCache, S3, ALB + SSL, CloudWatch, IAM, Secrets Manager, Route53, CloudFront. Environments: dev/staging/prod. |
| B5.3 | ⚡ E4 | Tenant provisioning API — <60s provisioning, isolated ECS task per tenant, auto-configure networking, DNS, TLS |
| B5.4 | ⚡ E3 | Auto-scaling + resource limits — Scale rules per tier (Community: 0.25 vCPU, Pro: 1 vCPU, Team: 2 vCPU, Enterprise: custom). Idle shutdown after 30min. Cross-region replication for Enterprise. |
| B5.5 | ⚡ E3 | Monitoring + alerting — CloudWatch dashboards, PagerDuty/BetterUptime for on-call, status page (public), synthetic monitoring (uptime checks every 60s), error tracking (Sentry) |
| B5.6 | ⚡ E3 | Backup + DR — Automated RDS snapshots, S3 versioning, cross-region backup. RPO: 1hr, RTO: 4hr. Disaster recovery runbook. |

## B6: LEGAL & COMPLIANCE (2-3 sessions + 👤 attorney)
**Gate:** All legal documents published, trademark filed

| Unit | Role | Task |
|------|------|------|
| B6.1 | 🧠 E3 + 👤 | Terms of Service — Usage policies, acceptable use, liability, SLA commitments per tier |
| B6.2 | 🧠 E3 + 👤 | Privacy Policy — GDPR/CCPA compliant, data handling, retention, deletion |
| B6.3 | 🧠 E3 + 👤 | EULA + Data Processing Agreement (DPA) — For enterprise, data processor obligations |
| B6.4 | 🧠 E3 + 👤 | HIPAA Business Associate Agreement (BAA) — For healthcare vertical, Enterprise tier only |
| B6.5 | 👤 + 💰 | Trademark filing — "NEXUS" + logo, ~$1-2K attorney. Search first for conflicts. |
| B6.6 | 🧠 E3 | Plugin Marketplace Agreement — Developer terms, revenue split (70/30), IP ownership, quality standards, takedown policy |

## B7: COMMUNITY & OPERATIONS (2-3 sessions)
**Gate:** Discord live, support system operational, runbooks, analytics

| Unit | Role | Task |
|------|------|------|
| B7.1 | ⚡ E2 | Discord setup — Channels: #general, #help, #showcase, #bugs, #feature-requests, industry channels (#healthcare, #finance, #devops, #manufacturing). Roles: community, contributor, pro, team, enterprise. Bot for support routing. |
| B7.2 | ⚡ E3 | Support system — Intercom for in-app. SLAs: Community (best-effort), Pro (24hr), Team (8hr), Enterprise (4hr + dedicated). Tiered routing. |
| B7.3 | ⚡ E3 | Runbooks — Incident response, deployment, rollback, scaling, security, on-call rotation |
| B7.4 | ⚡ E2 | Analytics — PostHog: funnel tracking (visit→signup→activate→pay), feature usage, retention. Monthly KPI dashboard. |
| B7.5 | 🧠 E3→⚡ E3 | Content pipeline — Monthly calendar: 2 blog posts, 1 tutorial, 1 YouTube video, 1 newsletter. Content templates. |
| B7.6 | ⚡ E2 | Launch operations — Product Hunt submission (Tuesday 12:01 AM PT), HN "Show HN", Twitter/X thread, email blast, monitoring plan |

## OPEN SOURCE LICENSE STRATEGY

| Component | License | Rationale |
|-----------|---------|-----------|
| Core framework + basic dispatchers | MIT | Adoption |
| Security dispatcher | Apache 2.0 | Patent protection |
| Ralph, Compliance, Multi-Tenant | Proprietary | Revenue |
| Academic skills (100 basic) | MIT | Ecosystem |
| Academic skills (400 advanced) | Proprietary | Revenue |
| Industry plugins + Ingestion | Proprietary | Revenue |

## LAUNCH COSTS

| Item | Monthly |
|------|---------|
| AWS (ECS + RDS + Redis + S3 + ALB) | $300-800 |
| Vercel (marketing + docs) | $20 |
| Clerk (auth) | $25 |
| Stripe | 2.9% + $0.30/tx |
| Sentry + PostHog + Intercom + BetterUptime | $120-150 |
| **Total pre-revenue** | **$465-1,015/mo** |
| **Break-even** | **~5 Pro or 2 Team subs** |

## KEY DECISIONS REQUIRING 👤 MARK

| Decision | Phase | Recommendation | Impact |
|----------|-------|----------------|--------|
| Domain name | B0 | nexusmcp.com | Brand identity |
| Logo direction | B0 | Professional/tech (Fiverr/99designs) | First impression |
| Doc platform | B2 | Mintlify | DX, maintenance |
| Auth provider | B4 | Clerk ($25/mo) | Cost, features |
| Cloud architecture | B5 | AWS ECS Fargate | Ops complexity |
| Open source license | B6 | MIT core + proprietary premium | Revenue vs adoption |
| Trademark filing | B6 | "NEXUS" + logo, ~$1-2K | IP protection |

## TOTAL BUSINESS UNITS: 36

**Full unit detail:** See NEXUS_BUSINESS_ROADMAP.md (~480 lines).


---

# ═══════════════════════════════════════════════════════════════
# INTEGRATION MATRIX
# ═══════════════════════════════════════════════════════════════

## Where DX Features Plug Into Product Track

| DX Feature | Depends On | Enhances (P Track) | Can Parallel With |
|-----------|------------|--------------------|--------------------|
| Hot Reload (T-DX0.1) | Build pipeline | All P development | P-MS0+ |
| Testing (T-DX0.2) | Build pipeline | All P dispatchers | P-MS0+ |
| Context Viz (T-DX0.3) | Session dispatcher | P-MS7 (token opt) | P-MS1+ |
| Model Router (T-DX1.1) | Quality gates | P-MS5 (telemetry) | P-MS2+ |
| Semantic Cache (T-DX1.2) | Session dispatcher | All P tool calls | P-MS1+ |
| Cost Estimator (T-DX1.3) | Model router | P-MS5 (orchestrate) | P-MS4+ |
| HITL (T-DX2.1) | Hook system | P-MS4 (hooks) | P-MS5+ |
| Time-Travel (T-DX2.2) | Orchestration | All P workflows | P-MS5+ |
| Structured Output (T-DX2.3) | Zod schemas | All P dispatchers | P-MS0+ |
| Agent Blueprints (T-DX3.1) | Orchestration | Plugin marketplace | P-MS8+ |
| Cross-Server (T-DX3.2) | Hook system | Bridge dispatcher | P-MS8+ |
| Schema Evolution (T-DX3.3) | Dispatchers | All P dispatchers | P-MS1+ |
| Multi-Provider (T-DX4.1) | Model router | All API calls | P-MS4+ |
| DI (T-DX4.2) | Build pipeline | All P services | P-MS0+ |
| Streaming (T-DX4.3) | Transport layer | P-MS8 (long calcs) | P-MS0+ |

## Cross-Track Synergies

| Synergy | Tracks | Benefit |
|---------|--------|---------|
| Hot reload speeds physics wiring | T→P | 10x faster iteration on MS3 |
| Testing framework validates safety | T→P | Automated S(x) verification in CI |
| Context viz informs token optimization | T→P | Data-driven MS7 decisions |
| PRISM app validates AppBridge | P→T | Real-world DX2.1 HITL testing |
| Manufacturing proof validates framework | P→B | "Built by machinists, not just devs" |
| Docs drive adoption → feedback | B→T | User-informed DX priorities |
| Cloud hosting proves multi-tenant | B→P | Validates PRISM cloud deployment |


---

# ═══════════════════════════════════════════════════════════════
# LAUNCH CHECKLIST
# ═══════════════════════════════════════════════════════════════

## Pre-Launch (T-2 weeks, ~Week 8)
- [ ] F complete: clean, indexed, self-contained MCP server
- [ ] T-DX0 complete: `nexus dev`, `nexus test`, context visualizer
- [ ] T-DX2.3 complete: structured output enforcement
- [ ] B1 complete: `npm install @nexus-mcp/core` works, Docker runs
- [ ] B2 complete: docs.nexusmcp.com live with quickstart, search (Algolia)
- [ ] B3 complete: nexusmcp.com with pricing, demo (WebContainers/StackBlitz), SEO (sitemap, structured data, Search Console)
- [ ] 5 blog posts scheduled (Why We Built, MCP Security Crisis, Session Resilience, 500 Algorithms, Healthcare 10 Min)
- [ ] Demo video recorded (3-5 min)
- [ ] Product Hunt + HN "Show HN" drafts ready
- [ ] GitHub repo: CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md, branch protection, CI/CD, CHANGELOG
- [ ] Error tracking (Sentry), analytics (PostHog conversion tracking)

## v1.0 Launch Day (~Week 10)
- [ ] v1.0.0 npm + Docker published (semantic-release, docker-compose)
- [ ] Product Hunt (Tuesday 12:01 AM PT)
- [ ] HN "Show HN" post
- [ ] Twitter/X thread + blog + email blast + Discord + Newsletter
- [ ] Monitor: uptime (BetterUptime, status page, synthetic monitoring), errors (Sentry), sign-ups, support

## v1.1 (Week 14 — Retention)
- [ ] T-DX1 complete: model router + semantic cache + cost estimator + cost anomaly (DX1.3.4)
- [ ] T-DX3.3 complete: schema evolution
- [ ] B4 complete: Clerk auth + Stripe billing (Free/Pro $99/Team $299/Enterprise, annual 20% off, dunning, proration, usage metering)
- [ ] License key system (Ed25519-signed via CertificateEngine, offline 30-day grace)
- [ ] Usage dashboard (Recharts: plan meters, trends, cost breakdown, billing history, team mgmt, API keys)
- [ ] First paying customers

## v1.2 (Week 20 — Enterprise)
- [ ] T-DX2 complete: HITL (DX2.1) + time-travel debugger (DX2.2) + multi-provider failover (DX4.1)
- [ ] B5 complete: Cloud hosting (ECS Fargate, Terraform/Pulumi, tenant provisioning <60s, auto-scaling per tier, idle shutdown 30min, cross-region Enterprise, backup DR RPO 1hr/RTO 4hr, CloudWatch + PagerDuty/BetterUptime, synthetic monitoring)
- [ ] B6 complete: ToS, Privacy (GDPR/CCPA), EULA, DPA, HIPAA BAA, trademark, Plugin Marketplace Agreement (70/30 developer/Nexus revenue split)
- [ ] P-MS9 complete: PRISM manufacturing vertical fully wired (Ω ≥ 0.75)

## v2.0 (Week 26 — Platform)
- [ ] T-DX3+DX4 complete: blueprints marketplace (DX3.1) + cross-server (DX3.2) + full DX suite
- [ ] B7 complete: Discord (industry channels), support (Intercom, SLAs per tier), runbooks (incident, deploy, rollback, scaling, security), analytics (PostHog funnels), content pipeline (monthly: 2 blogs, 1 tutorial, 1 YouTube video, 1 newsletter)
- [ ] Manufacturing vertical available as paid plugin
- [ ] Plugin marketplace accepting third-party submissions


---

# ═══════════════════════════════════════════════════════════════
# REVENUE PROJECTIONS
# ═══════════════════════════════════════════════════════════════

## Combined Year 1 ARR

| Source | Monthly | Annual |
|--------|---------|--------|
| Core tiers (Community→Enterprise) | $150,841 | $1,810,088 |
| Model Router (standalone $49/mo or Pro) | $2,450 | $29,400 |
| Semantic Cache Pro ($39/mo add-on) | $1,950 | $23,400 |
| Cost Intelligence Dashboard ($79/mo or Team) | $3,950 | $47,400 |
| Human-in-the-Loop Pro ($99/mo or Team) | $4,950 | $59,400 |
| Agent Blueprints Marketplace (30% GMV) | $3,000 | $36,000 |
| Multi-Provider Failover ($69/mo add-on) | $3,450 | $41,400 |
| **TOTAL** | **$170,591** | **$2,047,088** |

## Pricing Tiers

| Tier | Monthly | Annual (20% off) | Includes |
|------|---------|-------------------|----------|
| Community | Free | — | Core framework, 100 basic skills, community support |
| Pro | $99 | $79 | +Model router, +400 advanced skills, +24hr support, private repos |
| Team | $299 | $239 | +HITL, +time-travel, +compliance, +8hr SLA, team features |
| Enterprise | Custom | Custom | +Multi-tenant, +HIPAA/SOC2, +SLA, +dedicated, on-prem option |

## Launch Costs

| Item | Monthly |
|------|---------|
| AWS (ECS + RDS + Redis + S3 + ALB) | $300-800 |
| Vercel (marketing + docs) | $20 |
| Clerk (auth) | $25 |
| Stripe | 2.9% + $0.30/tx |
| Sentry + PostHog + Intercom + BetterUptime | $120-150 |
| **Total pre-revenue** | **$465-1,015/mo** |
| **Break-even** | **~5 Pro or 2 Team subs** |


---

# ═══════════════════════════════════════════════════════════════
# SESSION BUDGET SUMMARY
# ═══════════════════════════════════════════════════════════════

| Track | Sessions | Opus | Sonnet | Haiku |
|-------|----------|------|--------|-------|
| F (Foundation) | 4-6 | 5% | 40% | 55% |
| P (PRISM R15) | 18-24 | 25% | 55% | 20% |
| T (DX Features) | 32-42 | 28% | 62% | 10% |
| B (Business) | 21-30 | 15% | 70% | 15% |
| **TOTAL** | **75-102** | ~21% | ~59% | ~20% |


---

# ═══════════════════════════════════════════════════════════════
# DOCUMENT CROSS-REFERENCES
# ═══════════════════════════════════════════════════════════════

| Document | Location | Content |
|----------|----------|---------|
| PHASE_R15_MCP_ENHANCEMENT_FULL.md | Uploaded / C:\PRISM\mcp-server\data\docs\roadmap\ | Full P track: MS0-MS9 step-by-step tasks (~1,497 lines) |
| NEXUS_DX_FEATURES_ROADMAP.md | Uploaded | Full T track: 51 units with implementation instructions (~1,004 lines) |
| NEXUS_BUSINESS_ROADMAP.md | Uploaded | Full B track: 36 units with specs (~481 lines) |
| BRAINSTORM_R12_R14.md | C:\PRISM\mcp-server\data\docs\roadmap\ | 30+ IMP items, R12-R14 phases (1,720 lines) |
| SKILLS_SCRIPTS_HOOKS_PLAN.md | C:\PRISM\mcp-server\data\docs\roadmap\ | 28 hooks, 19 scripts, 21 skills (785 lines) |
| CLAUDE_CODE_INTEGRATION.md | C:\PRISM\mcp-server\data\docs\roadmap\ | Model routing, subagents, env matrix (326 lines) |
| PRISM_ROADMAP_v17.0.md | C:\PRISM\mcp-server\data\docs\roadmap\ | CC-maximized roadmap, 3 archetypes (2,038 lines) |
| GAP_INDEX_REPORT.md | C:\PRISM\state\ | F-1 gap index results (137 lines) |
| UNREALIZED_FEATURES_AUDIT.md | C:\PRISM\state\ | CC unrealized features audit (202 lines) |


---

# ═══════════════════════════════════════════════════════════════
# SAFETY INVARIANTS (NEVER VIOLATE)
# ═══════════════════════════════════════════════════════════════

These apply across ALL tracks:
1. **S(x) ≥ 0.70 HARD BLOCK** — safety score must pass before any release
2. **NO PLACEHOLDERS** — every value real, complete, verified
3. **NEW ≥ OLD** — never lose data, actions, hooks, knowledge, line counts
4. **MCP FIRST** — use prism: dispatchers before filesystem when available
5. **NO DUPLICATES** — check before creating, one source of truth
6. **100% UTILIZATION** — if it exists, use it everywhere
7. **EVIDENCE > "I THINK"** — all decisions backed by data, tests, or math

---

**END OF UNIFIED MASTER ROADMAP — NEXUS MCP FRAMEWORK v2.0**

*Four tracks, 75-102 sessions, 26 weeks. From manufacturing prototype to shipped enterprise product with 15 DX features nobody else has, $2M+ ARR target, and the world's first enterprise MCP framework.*

**Item Counts:**
- Track F: 5 phases (F-0 through F-5)
- Track P: 10 milestones (MS0-MS9), 5 new engines, 10 hooks, 7 cadences, 13 skills, 10 scripts, 20 REST endpoints, 4 WebSocket channels, 8 app pages
- Track T: 51 units across 15 features in 5 DX phases
- Track B: 36 units across 8 business phases
- **TOTAL DISCRETE ITEMS: 137+**
