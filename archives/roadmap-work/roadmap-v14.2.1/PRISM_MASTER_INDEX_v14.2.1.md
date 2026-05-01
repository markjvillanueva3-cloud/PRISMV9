# PRISM MODULAR ROADMAP — MASTER INDEX v14.2
# Safety-Critical CNC Manufacturing Intelligence | Lives Depend on Correctness
# THIS FILE REPLACES v14.1. Load THIS first, then load only what you need.
#
# v14.2: Comprehensive Merge — 77 legacy roadmaps audited, 12 gaps closed, optimal build order.
#
#   STRUCTURAL CHANGES from v14.1:
#     - NEW PHASE DA: Development Acceleration — FIRST PRIORITY before R1 continues.
#       Context engineering, session continuity, compaction recovery, optimal tool utilization,
#       skills/scripts/hooks/superpowers/manus/ralph/swarms/agents optimization.
#       This phase directly speeds up every subsequent phase.
#     - NEW PHASE R11: Product Packaging (SFC, PPG, Shop Manager, ACNC) — Gap 1
#     - R1 EXPANDED: Data validation pipeline (MS4.5), 85-param tool holder upgrade (MS5), 
#       formula registry wiring (MS8) — Gaps 7, 12
#     - R2 EXPANDED: Calc regression suite (MS1.5) — locks golden dataset
#     - R3 EXPANDED: Unit/tolerance intelligence (MS0), formula registry integration (MS0.5),
#       controller intelligence expansion (MS3) — Gaps 4, 5, 9
#     - R4 EXPANDED: API consumption layer (MS3) — Gap 8
#     - R7 EXPANDED: Coupled physics models (MS0), sustainability metrics (MS1) — Gaps 3, 6
#     - R8 EXPANDED: 22 application-facing user skills (MS3, MS4) — Gap 2
#     - COMPANION RULE: Every phase ends with skills/scripts/hooks built AFTER features.
#     - ROLE PER PHASE: Dynamic role switching for optimal execution depth.
#     - WIRING PROTOCOL: Consult D2F/F2E/E2S before every implementation.
#     - HSS/F1-F8 STATE: Updated counts (53 hooks, 6 chains, 6 templates) — Gaps 10, 11
#
#   SOURCE: ROADMAP_v14_2_GAP_ANALYSIS.md (77 files audited, 150K+ lines reviewed)
#   All v14.1 governance hardening retained unchanged.
#   All v13.5-v13.9 audit findings retained unchanged.

---

## HOW TO USE THIS INDEX

```
1. EVERY session starts by loading THIS document (costs ~4K tokens)
2. Read CURRENT POSITION from CURRENT_POSITION.md
3. Load PRISM_PROTOCOLS_CORE.md (boot/opus config/laws/standards — ~5K tokens)
4. Load ONLY the active phase document (5-12K tokens each)
5. Execute. Never load more than 1 phase doc unless crossing a phase boundary.
6. Total typical session cost: ~14-21K tokens

NEVER load the full monolith. It exists as archive only.
NEVER load PRISM_PROTOCOLS_REFERENCE.md in full — load only the section you need.
NEVER load a phase doc without checking its dependencies below.
NEVER load more than 2 phase docs in a single session.
```

---

## SESSION WORKFLOW (execute every session, no exceptions)

```
STEP 1: LOAD     → This index (already done if you're reading this)
STEP 2: POSITION → prism_doc action=read name=CURRENT_POSITION.md
                    If missing → prism_doc action=read name=ROADMAP_TRACKER.md (last 5 entries)
                    If both missing → you are at DA-MS0 (first pending milestone in v14.2)
STEP 3: PROTOCOLS → Load PRISM_PROTOCOLS_CORE.md
STEP 4: BOOT     → Execute Boot Protocol from PRISM_PROTOCOLS_CORE.md
STEP 5: PHASE    → Load the ONE phase doc matching your current position
                    IF phase has completed milestones: skip to CURRENT_MS marker.
                    Phase docs with completed work have <!-- LOADER: SKIP --> markers.
                    Load from that line forward. Do NOT read completed MS detail.
STEP 6: EXECUTE  → Follow the MS steps in the loaded phase doc
                    Check for ⚡ CLAUDE CODE markers — delegate parallelizable tasks
STEP 7: RECORD   → prism_doc action=append name=ROADMAP_TRACKER.md content="[MS-ID] COMPLETE [date]"
                    prism_doc action=write name=CURRENT_POSITION.md content="CURRENT: [next-MS] | ..."
STEP 8: SHED     → prism_context action=context_compress (between MS transitions)
STEP 9: SAVE     → prism_session action=state_save | prism_context action=todo_update
```

---

## CURRENT SYSTEM STATE (audited 2026-02-15, updated for v14.2)

```
COMPLETED WORK:
  P0 (Full System Activation): ✅ COMPLETE
    31 dispatchers, 368 actions, 37 engines wired
    Opus 4.6 configured | Ω=0.77 | Build: clean 3.9MB

  F1-F8 Features: ✅ ALL COMPLETE (grades A-/A, all Ω≥0.89)
    F1 PFP           → used by R7 for risk scoring
    F2 Memory Graph   → used by R7 for learning, DA for session continuity
    F3 Telemetry      → used by R7 for measurement, DA for context monitoring
    F4 Certificates   → used by R4 for trust chain
    F5 Multi-Tenant   → used by R4 for isolation
    F6 NL Hooks       → used by R8 for intent matching, DA for hook authoring
    F7 Protocol Bridge → used by R9 for MTConnect, R4 for API layer
    F8 Compliance      → used by R4 for regulatory
    Synergy: synergyIntegration.ts (276 lines) wires cross-feature capabilities

  W1-W7 Wiring: ✅ COMPLETE
  W2.5 HSS Optimization: ✅ ALL 7 PHASES COMPLETE (2026-02-10)
    Hooks: 53 (was 48 — 5 new blocking hooks)
    Skill descriptions: 117/117 enriched
    Skill chains: 6 predefined DAGs
    Response templates: 6 via ResponseTemplateEngine.ts (670 lines)
    Auto-injection: pressure-adaptive sizing active

  R1-MS0 through R1-MS4: ✅ COMPLETE

CURRENT REGISTRIES:
  Materials:   3,392 loaded (96.4% of 3,518) | 5% enriched
  Machines:    1,016 (44 manufacturers) | 0% power specs, 0% work envelope
  Tools:       5,238 on disk (1,944 active) | no index, no schema consistency
  Alarms:      10,033 (100%)
  Formulas:    500 (100%) | 105 INVENTION/NOVEL, 162 with zero roadmap coverage
  Strategies:  697 toolpath strategies | only 8 exposed
  Skills: 126 | Scripts: 161 | Agents: 75 | Hooks: 53 (62 registered)
  Skill Chains: 6 predefined | Response Templates: 6
  TOTAL: 16,895+ entries across 9 registries

DATA ON DISK: ~235 MB | ACTIVELY USED: ~52 MB (22%)
TARGET: 65% after R1 → 90%+ after R3+R7

WIRING REGISTRIES (consult BEFORE every implementation):
  PRECISE_WIRING_D2F.json  — Dispatchers → Formulas
  PRECISE_WIRING_F2E.json  — Formulas → Engines
  PRECISE_WIRING_E2S.json  — Engines → Services
  WIRING_EXHAUSTIVE_FINAL.json — Complete system map
```

---

## ACTIVE POSITION

```
CURRENT: DA-MS0 | LAST_COMPLETE: R1-MS4 2026-02-15 | PHASE: DA (new in v14.2)
```

---

## PHASE REGISTRY

| ID | Title | Doc | Status | Depends On | Sessions | Role |
|----|-------|-----|--------|------------|----------|------|
| P0 | Full System Activation | PHASE_P0_ACTIVATION.md | **complete** | none | — | — |
| DA | Development Acceleration | PHASE_DA_DEV_ACCELERATION.md | **not-started** | P0 complete | 2-3 | Context Engineer |
| R1 | Registry + Data Foundation | PHASE_R1_REGISTRY.md | **in-progress** (MS0-4 ✅) | P0 complete | 2-3 more | Data Architect |
| R2 | Safety + Engine Validation | PHASE_R2_SAFETY.md | not-started | R1 complete | 2-3 | Safety Systems Eng |
| R3 | Intelligence + Data Campaigns | PHASE_R3_CAMPAIGNS.md | not-started | R2 complete | 4-6 | Principal Architect |
| R4 | Enterprise + API Layer | PHASE_R4_ENTERPRISE.md | not-started | R2 complete | 3-4 | Platform Engineer |
| R5a | Visual Components | PHASE_R5_VISUAL.md §A | not-started | R3 complete | 3-4 | Product Designer |
| R5b | Visual Production | PHASE_R5_VISUAL.md §B | not-started | R4+R5a complete | 1-2 | Product Designer |
| R7 | Intelligence Evolution | PHASE_R7_INTELLIGENCE.md | not-started | R1+R3 complete | 5-7 | Applied Research Eng |
| R8 | User Experience + App Skills | PHASE_R8_EXPERIENCE.md | not-started | R3+R7 complete | 7-9 | Product Architect |
| R6 | Production Hardening | PHASE_R6_PRODUCTION.md | not-started | R3+R4+R5+R7+R8 | 2-3 | SRE |
| R9 | Real-World Integration | PHASE_R9_INTEGRATION.md | not-started | R7+R8 complete | 10-14 | Integration Architect |
| R10 | Manufacturing Revolution | PHASE_R10_REVOLUTION.md | vision-phase | R7+R8+R9 | 12-24mo | CTO / Visionary |
| R11 | Product Packaging | PHASE_R11_PRODUCT.md | not-started | R8+R9 complete | 6-10 | Product Manager |

```
STATUS VALUES: not-started | in-progress | complete | blocked | vision-phase
  vision-phase: Long-horizon research/innovation. Not on critical path.
  Expand via Brainstorm-to-Ship when all prerequisites complete + strategic timing is right.
UPDATE: Change status HERE when a phase gate passes. This index is truth for phase status.
Session estimates include companion asset creation (skills/scripts/hooks after features).
Total estimated sessions: DA(2-3) + R1(2-3) + R2(2-3) + R3(4-6) + R4(3-4) + R5a(3-4)
  + R5b(1-2) + R7(5-7) + R8(7-9) + R6(2-3) + R9(10-14) + R11(6-10) = 46-68 + R10
Claude Code parallel agents reduce estimated sessions by ~15-25% where applicable.
```

---

## BUILD SEQUENCE (optimal order — DA first, then data→safety→intelligence)

```
DA (Dev Acceleration) ← DO THIS FIRST — speeds up every session after
  │  Context engineering, session continuity, compaction recovery,
  │  skill/script/hook optimization, manus/ralph/swarm/agent tuning,
  │  Claude Code setup + CLAUDE.md + parallel readiness
  ↓
R1-MS4.5..MS9 (Registry completion — data foundation)
  │  Data validation, tool schema, material enrichment, machine population,
  │  formula registry wiring, 85-param tool holders
  │  ⚡ CLAUDE CODE: MS5/MS6/MS7 run as parallel agents (3 worktrees)
  ↓
R2 (Safety validation — prove calcs correct)
  │  50-calc benchmark matrix, 29 safety engine tests, regression suite,
  │  AI edge cases, manual verification
  │  ⚡ CLAUDE CODE: 50-calc matrix batch execution
  ↓
R3 (Intelligence features — the action layer)
  │  Job planner + units/tolerance, formula registry integration,
  │  advanced calcs, toolpath intelligence, controller intelligence,
  │  cross-system queries, data campaigns
  │  ⚡ CLAUDE CODE: Data campaigns are inherently parallelizable
  ↓
  ├──→ R4 (Enterprise + API layer)  ←── can run PARALLEL with R7
  │       Multi-tenant, compliance, REST/GraphQL API endpoints
  │       ⚡ CLAUDE CODE: API endpoint implementation
  │
  ├──→ R5a (Visual components)  ←── can run PARALLEL with R4
  │       17 UI components built against R3 actions
  │
  └──→ R7 (Intelligence evolution)  ←── can run PARALLEL with R4
         Coupled physics, optimization + sustainability,
         knowledge expansion, learning pipeline
         ⚡ CLAUDE CODE: 495+ JS module wiring
  ↓
R5b (Visual production — auth, API versioning, dual build)
  ↓
R8 (User experience — intent engine + 22 application skills)
  ↓
R6 (Production hardening — stress test COMPLETE system, security, runbooks)
  │  ← NOW hardens the FULL system including R8 UX layer
  ↓
R9 (Real-world integration — MTConnect, CAM, DNC, ERP, AR)
  ↓
R10 (Manufacturing revolution — paradigm shifts) [vision-phase]
  ↓
R11 (Product packaging — SFC, PPG, Shop Manager, ACNC)

ZERO-FLOAT PATH (updated v14.2.1):
  DA → R1-MS9 → R2-MS4 → R3-MS5 → R7 → R8 → R6 → R9 → R11

COMPANION ASSET RULE:
  Every phase ends with a "Companion Assets" section.
  Skills, scripts, and hooks are built AFTER the features they support.
  Each new action ships with: 1 skill, 1+ hooks, 1 script minimum.

CLAUDE CODE ACCELERATION:
  Phases marked with ⚡ have tasks suitable for Claude Code parallel agents.
  See CLAUDE_CODE_INTEGRATION.md for task allocation and setup.
  Conservative estimate: 15-25% total session reduction.
```

---

## DEPENDENCY RESOLUTION

```
BEFORE loading any phase doc:
  1. Check its "Depends On" column in Phase Registry above
  2. Verify ALL dependencies show status=complete in this index
  3. If a dependency is NOT complete → STOP. Execute the dependency phase first.
  4. If a dependency is blocked → Read ROADMAP_TRACKER.md for the block reason. Fix it.

CROSS-PHASE DATA FLOW:
  P0 → DA: P0 fixes WIRING + Opus 4.6 config. DA optimizes HOW we use the tools.
  DA → R1: DA provides optimized session protocols. R1 loads DATA efficiently.
  R1 → R2: R1 loads + validates + enriches registries. R2 tests calculations.
  R2 → R3: R2 validates calc accuracy. R3 builds intelligence on proven foundations.
  R3 → R4/R7: R3 provides action layer. R4 wraps for enterprise. R7 deepens physics.
  R4+R5 → R6: Enterprise + Visual feed into production hardening.
  R3+R7 → R8: Intelligence + evolution feed into user experience + 22 app skills.
  R8+R9 → R11: Experience + integration feed into deliverable products.

CROSS-FEATURE LEVERAGE (F1-F8 into R7-R11):
  R7 uses: F1 (PFP risk scoring), F2 (Memory Graph learning), F3 (Telemetry measurement)
  R8 uses: F6 (NL Hooks intent matching), F2 (Memory Graph personalization)
  R9 uses: F7 (Bridge MTConnect/OPC-UA), F3 (Telemetry real-time)
  R4 uses: F5 (Multi-Tenant isolation), F8 (Compliance regulatory), F4 (Certificates trust)
  DA uses: F2 (Memory Graph continuity), F3 (Telemetry context), F6 (NL Hooks authoring)

ARTIFACT VALIDATION (at phase entry — Boot Step 2.5):
  Check ALL REQUIRES artifacts exist + are non-empty.
  If ANY missing → STOP. Prior phase did not complete correctly.
  See SYSTEM_CONTRACT.md §Artifact Dependency Table for full mapping.
```

---

## DOCUMENT MANIFEST

| Document | Purpose | When to Load | v14.2 Change |
|----------|---------|--------------|---------:|
| **PRISM_MASTER_INDEX.md** | This file — workflow + budget + dependencies | Every session | **v14.2** |
| **PRISM_PROTOCOLS_CORE.md** | Boot, Opus 4.6 config, 8 laws, code standards | Every session | Role per phase added |
| **SYSTEM_CONTRACT.md** | Safety/correctness/operational invariants | At phase gates | Unchanged |
| **PRISM_PROTOCOLS_REFERENCE.md** | Quality tiers, roles, rollback, guides, chains | On demand | Unchanged |
| **PHASE_P0_ACTIVATION.md** | 9 MS: wire all subsystems + Opus 4.6 config | During P0 (✅) | Unchanged |
| **PHASE_DA_DEV_ACCELERATION.md** | 5 MS: context, continuity, tools, automation | During DA | **NEW** |
| **PHASE_R1_REGISTRY.md** | 11 MS: load + validate + enrich + index + wire | During R1 | **Expanded** |
| **PHASE_R2_SAFETY.md** | 6 MS: 50-calc matrix + regression + safety | During R2 | **Expanded** |
| **PHASE_R3_CAMPAIGNS.md** | 7 MS: intelligence + units + formulas + campaigns | During R3 | **Expanded** |
| **PHASE_R3_IMPLEMENTATION_DETAIL.md** | TypeScript interfaces for R3 | During R3 (ref) | Unchanged |
| **PHASE_R4_ENTERPRISE.md** | 4 MS: enterprise + API consumption layer | During R4 | **Expanded** |
| **PHASE_R5_VISUAL.md** | Stub → expand at R5 start | During R5 | Unchanged |
| **PHASE_R6_PRODUCTION.md** | Stub → expand at R6 start | During R6 | Unchanged |
| **PHASE_R7_INTELLIGENCE.md** | 7 MS: coupled physics + optimization + learning | During R7 | **Expanded** |
| **PHASE_R8_EXPERIENCE.md** | 6 MS: intent engine + 22 app skills | During R8 | **Expanded** |
| **PHASE_R9_INTEGRATION.md** | MTConnect, CAM, DNC, mobile, ERP, AR | During R9 | Unchanged |
| **PHASE_R10_REVOLUTION.md** | 10 manufacturing paradigm shifts | During R10 | Unchanged |
| **PHASE_R11_PRODUCT.md** | 4 MS: SFC, PPG, Shop Manager, ACNC | During R11 | **NEW** |
| **SKILLS_SCRIPTS_HOOKS_PLAN.md** | All companion assets mapped to phases | Reference | **Expanded** |
| **CLAUDE_CODE_INTEGRATION.md** | Claude Code setup, task allocation, parallel agents | Reference | **NEW v14.2.1** |
| **CURRENT_POSITION.md** | Single-line position (overwritten each MS) | Every session | **Updated** |
| **PHASE_TEMPLATE.md** | Template for expanding stubs | At stub phase start | Unchanged |
| **ROADMAP_INSTRUCTIONS.md** | How to read/maintain the roadmap | Reference | Wiring protocol added |
| **SYSTEMS_ARCHITECTURE_AUDIT.md** | 12 systemic gaps — now integrated into phases | Reference | Gaps resolved |
| **ROADMAP_v14_2_GAP_ANALYSIS.md** | 77-file audit results | Reference | Source for v14.2 |

```
STRATEGIC DOCUMENTS (load on demand, not per-session):
  COMPETITIVE_POSITIONING.md        — Market analysis, 7 moats, pricing, GTM
  DATA_FLYWHEEL_STRATEGY.md         — Learning network, critical mass, data quality
  ASSET_INVENTORY.md                — Full utilization map of all 2,143+ PRISM assets
  PRISM_ASSET_AUDIT_v14_1.md        — Extracted IP vs live system gap analysis
  PRISM_Cross_Audit_Assessment.md   — Cross-audit governance findings
  PRISM_INFRASTRUCTURE_AUDIT_v13_7_IA3.md — Third infrastructure audit
  TOOL_UTILIZATION_AUDIT_v13_2.md   — Tool usage patterns and optimization
  DEPLOYMENT_GUIDE.md               — Deployment procedures

REFERENCE DOCUMENTS (load during specific MS only):
  SUPERPOWER_ROADMAP.md             — Test params for R2-MS1 safety engines
  TOOL_EXPANSION_ROADMAP.md         — Tool schema spec for R1-MS5
  PRISM_DATABASE_AUDIT_AND_ROADMAP.md — Registry gaps for R1-MS6/MS7
  TOOL_HOLDER_DATABASE_ROADMAP_v4.md  — 85-param schema for R1-MS5
  PRISM_SUPERPOWERS_COMPLETE_ROADMAP.md — 22 app skill specs for R8-MS3/MS4

LEGACY ROADMAPS (ARCHIVED — content fully absorbed into v14.2):
  50+ files across C:\PRISM\docs\, mcp-server\, data\docs\, skills\, scripts\
  See ROADMAP_v14_2_GAP_ANALYSIS.md §Legacy Roadmaps Disposition for full list.
  DO NOT load these. Their content is in the phase docs.

HISTORICAL REFERENCE (reference/ subdirectory — DO NOT LOAD per-session):
  COMPACTION_PROTOCOL_ASSESSMENT.md  — v12 compaction analysis (superseded by DA)
  TOKEN_OPTIMIZATION_AUDIT_v12.md    — v12 token audit (superseded by DA-MS0)
  MONOLITH_vs_MODULAR_COMPARISON.md  — Why modular beats monolith (decision archived)
  ROADMAP_MODULES_AUDIT.md           — v13 module audit (superseded by v14.2 gap analysis)
  These files exist for audit trail only. Their content is absorbed into active documents.
```

---

## CONTEXT BUDGET MODEL

```
STANDARD WINDOW (default):
  TOTAL WINDOW:        200K tokens (~600KB)
  SYSTEM OVERHEAD:     ~37K tokens
  USABLE PER SESSION:  ~163K tokens (~490KB)
  COMPACTION RESERVE:  0% — Compaction API handles automatically
  WORKING BUDGET:      ~163K tokens

1M CONTEXT BETA (optional — requires Usage Tier 4+):
  TOTAL WINDOW: 1M tokens (~3MB) | USABLE: ~960K tokens

TYPICAL SESSION LOAD (v14.2):
  Master Index:         ~4.0K tokens (this file — grew ~1K from v14.1)
  Protocols CORE:       ~5.0K tokens
  1 Phase Doc:          ~5-12K tokens (DA and expanded phases are larger)
  Boot overhead:        ~0.7K tokens
  Phase skills:         ~1-2K tokens
  TOTAL FRAMEWORK:      ~16-24K tokens (~70KB)
  REMAINING FOR WORK:   ~139-147K tokens (~420KB)

GROWTH PROJECTION:
  v14.0: ~15-21K | v14.2: ~16-24K (+1-3K from DA phase + gap content)
  Projected by R6: ~22-28K (acceptable within 200K budget)
  IF framework exceeds 28K: Split PROTOCOLS_CORE per existing plan.
```

---

## DEVELOPMENT PROTOCOLS (apply to ALL phases)

```
BEFORE EVERY IMPLEMENTATION:
  1. Consult PRECISE_WIRING_D2F.json for formula dependencies
  2. Consult PRECISE_WIRING_F2E.json for engine implementations
  3. Check SYSTEM_CONTRACT.md for invariants
  4. S(x) ≥ 0.70 is a HARD BLOCK — never skip safety validation

ROLE PER PHASE (switches at phase boundary):
  DA → Context Engineer          R1 → Data Architect
  R2 → Safety Systems Engineer   R3 → Principal Architect
  R4 → Platform Engineer         R5 → Product Designer
  R6 → Site Reliability Engineer  R7 → Applied Research Engineer
  R8 → Product Architect         R9 → Integration Architect
  R10 → CTO / Visionary          R11 → Product Manager

COMPANION ASSET RULE:
  Every new action ships with: 1 skill (teaches Claude how to use it),
  1+ hooks (guards usage), 1 script (automates common scenario).
  Built AFTER the feature, not before. Listed at end of each phase doc.

WIRING REGISTRY PROTOCOL:
  Before writing code for any new action:
    1. Query D2F for formula dependencies
    2. Query F2E for engine implementations
    3. Wire accordingly. Don't re-discover what's already mapped.

METHODOLOGY (Superpowers):
  Brainstorm → Plan → Execute → Review(spec) → Review(quality) → Verify
  Debugging: Evidence → Root Cause → Hypothesis → Fix+Prevention (all 4 mandatory)
  Completion: Evidence-based proof required, not claims
```

---

## DEFINITION OF DONE (entire roadmap)

```
The roadmap is COMPLETE when ALL of these are true:
  1. All phases through R11 show status=complete
  2. All integration chains pass under load (R6 stress test)
  3. Omega >= 0.85 at R6 gate
  4. Safety: S(x) >= 0.75 across all scenarios
  5. npm test passes with full regression suite
  6. Security audit findings from R6-MS2 resolved
  7. Runbooks exist for: boot, restart, recovery, backup, monitoring, rollback
  8. PRISM serves safe cutting parameters for >90% of 3,518+ materials
  9. Job planner produces complete plans from single-sentence input
  10. Toolpath advisor recommends from 697-strategy registry
  11. Cross-registry intelligence spans materials+machines+tools+formulas
  12. Data utilization exceeds 90% of on-disk assets
  13. 22 application skills operational for Dave/Sarah/Alex personas
  14. API layer serves REST/GraphQL endpoints externally
  15. At least 1 product vertical (SFC) packaged and deliverable
```

## DATA MAINTENANCE STRATEGY (post-R6 ongoing)

```
REGISTRY UPDATE PROTOCOL:
  New cutting data (Sandvik, Walter, Kennametal catalogs):
    1. Stage new data in STAGING/ directory (not live registry)
    2. Run DataValidationEngine (R1-MS4.5) against staged data
    3. If validation passes → merge into live registry
    4. Run calc_regression_gate against goldenBenchmarks.json
    5. If regression detected → quarantine new data, investigate
    6. If clean → update registry counts in MASTER_INDEX.md

  Property corrections:
    1. Document correction with source citation
    2. Check if material is in goldenBenchmarks.json
    3. If yes → correction requires golden dataset version bump + regression revalidation
    4. If no → apply correction, run validation, merge

  New manufacturer catalogs:
    1. Parse catalog into PRISM schema (R1-MS5 ToolIndex format)
    2. Run tool_schema_completeness hook
    3. Merge into ToolIndex
    4. Update tool counts in MASTER_INDEX.md

  Schedule: Monthly review of manufacturer catalog updates.
  Owner: Data Architect role (or automated via R9 manufacturer data feeds).
  ⚡ CLAUDE CODE: Catalog parsing and staging are ideal batch tasks for Claude Code.
```

## OMEGA MONOTONIC FLOOR RULE

```
Once a phase gate achieves Ω >= X, all subsequent phase gates must achieve Ω >= X.
The Omega floor only goes up, never down.

Phase Omega Floors (minimum at gate exit):
  DA:  0.70  (baseline — proving dev acceleration works)
  R1:  0.70  (data foundation — registries loaded correctly)
  R2:  0.72  (safety validated — calcs proven correct)
  R3:  0.74  (intelligence actions operational)
  R4:  0.76  (enterprise layer solid)
  R5a: 0.76  (visual components — maintains R4 floor)
  R5b: 0.78  (visual production — full UI stack)
  R7:  0.78  (intelligence evolution — coupled physics)
  R8:  0.80  (user experience — intent engine + personas)
  R6:  0.85  (production hardening — FULL system validated)
  R9:  0.82  (integrations — note: can be < R6 for new integration scope)
  R11: 0.85  (product packaging — ships at production quality)

If a phase cannot meet its floor → the phase has a quality problem. Fix before proceeding.
Exception: R9 floor (0.82) is lower than R6 (0.85) because R9 introduces entirely new
integration scope (MTConnect, CAM, ERP). The R6 floor applies to the PRE-R9 system.
```

---

## WHAT IS PRISM (for new sessions)

PRISM is a safety-critical CNC manufacturing intelligence MCP server (31 dispatchers, 368 actions,
37 engines). It recommends cutting parameters, predicts tool life, validates safety limits, decodes
machine alarms, plans complete machining jobs, and advises on toolpath strategies. Mathematical
errors cause tool explosions and operator injuries. S(x)>=0.70 and Omega>=0.70 are hard blocks.

The system manages 3,518+ materials (127 params each), 1,016+ machines (44 manufacturers), 5,238+
tools, 10,033+ alarm codes, 500 formulas, 697 toolpath strategies, and 126 domain knowledge skills.

DATA UTILIZATION PROBLEM: 235 MB of manufacturing data on disk but only 22% feeds engines. Tools
lack indexing, materials lack enrichment, machines lack specs. The roadmap builds data foundation
(R1), intelligence features (R3), physics depth (R7), user experience (R8), and product delivery
(R11) so the full data pipeline works end-to-end.

---

## OPUS 4.6 CAPABILITIES IN USE

```
CAPABILITY                  WHERE USED                     STATUS
Compaction API              All API calls via MCP server   Active
Adaptive Thinking           All API calls, effort-tiered   Active
  effort=max                Safety calcs, ralph, omega     Deepest reasoning
  effort=high               Data retrieval, code search    Default
  effort=medium             Build, swarm, operational      Balanced
  effort=low                Health, list, stats, state     Fastest
Structured Outputs          Safety-critical calc returns   Active
1M Context Beta             Heavy sessions optional        Available (Tier 4+)
128K Max Output             Report generation              Available
Agent Teams                 P0-MS8, R2-MS0, R3 batches    Active
Fast Mode                   Diagnostic/admin operations    Available
Context Editing             Tool result clearing           Active
Interleaved Thinking        Automatic with adaptive        Active
```

---

## SEQUENCING GUIDES & WIRING CHAINS

```
Load from PRISM_PROTOCOLS_REFERENCE.md ONLY when needed:
  → P0-MS4: AutoPilot wiring (S3.5, S3.8 guide sequences)
  → P0-MS8: Integration gate (all 14 wiring chains)
  → R1-MS8: Dispatcher wiring (S3.6 thread chain, S3.X toolpath)
  → R6: Final chain check (all 14 wiring chains)
Do NOT load these into every session — ~500 tokens used in only 3-4 sessions.
```
