# PRISM Directory Digest

**Purpose**: Token-efficient reference for the entire mcp-server file system.
Load this file (~800 tokens) instead of running Glob/Grep to find things.

**Generated**: 2026-03-13 | **Directories**: 215 | **Files**: 3691

## Quick Lookup

| What you need | Where to look | Shortcode |
|--------------|---------------|-----------|
| Engine code | `src/engines/` | E0001-E0860 |
| Action routing | `src/tools/dispatchers/` | D01-D58 |
| Algorithms | `src/algorithms/` | A01-A51 |
| Tests | `src/__tests__/` | T0001-T0534 |
| Tool catalogs | `src/data/` | C01-C67 |
| Action schemas | `src/schemas/` | — |
| API routes | `src/routes/` | — |
| Type definitions | `src/types/` | — |
| Milestones | `data/milestones/` | M001-M110 |
| Documentation | `data/docs/` | DOC01-DOC36 |
| Hooks | `src/hooks/` | H01-H21 |
| Registries | `src/registries/` | RG01-RG22 |
| Utils | `src/utils/` | U01-U16 |
| Web pages | `web/src/pages/` | — |
| Material data | `data/materials/` | — |
| Roadmap | `data/docs/roadmap/` | — |

## Domain Routing

When a query mentions these topics, look here:

- **cutting/machining/force/speed/feed** -> `src/engines/ (E*), src/algorithms/, src/data/`
- **tool selection/catalog/holder** -> `src/data/ (tool catalogs), src/registries/ToolCatalogRegistry`
- **G-code/post-processor/CAM** -> `src/engines/*GCode*, *Cam*, *PostProcess*, *Toolpath*`
- **machine profiles/kinematics** -> `src/data/machine-*-catalog*.ts`
- **material properties/database** -> `src/registries/MaterialDatabase*, data/materials/`
- **quoting/costing/economics** -> `src/engines/*Cost*, *Quote*, *Economic*, *Price*`
- **quality/SPC/capability** -> `src/engines/*Quality*, *Statistical*, *Process*, *Capability*`
- **safety/risk/OSHA** -> `src/engines/*Safety*, src/hooks/SafetyChain*`
- **welding/joining** -> `src/engines/*Weld*, *Solder*, *Braz*, *FSW*`
- **casting/molding** -> `src/engines/*Cast*, *Mold*, *Injection*, *Rotational*`
- **coating/plating/surface** -> `src/engines/*Coat*, *Plat*, *Spray*, *PVD*, *CVD*`
- **forming/stamping/bending** -> `src/engines/*Form*, *Stamp*, *Bend*, *Roll*, *Press*`
- **thermal/heat treatment** -> `src/engines/*Thermal*, *Heat*, *Quench*, *Anneal*`
- **monitoring/sensor/vibration** -> `src/engines/*Monitor*, *Sensor*, *Vibrat*, *Acoustic*`
- **statistics/Monte Carlo/DOE** -> `src/engines/*Statistic*, *MonteCarlo*, *DOE*, *Bayesian*`
- **token optimization** -> `src/engines/*Token*, *Context*, *Session*, *Compact*, *Output*`
- **playbook/best practices** -> `src/engines/MachiningPlaybookEngine.ts`
- **tribal knowledge/tips** -> `src/registries/TribalKnowledgeEngine*, data/*.json (tips)`
- **formulas/physics models** -> `src/registries/FormulaRegistry*, src/algorithms/`
- **roadmap/milestones/planning** -> `data/milestones/, data/docs/roadmap/, data/roadmap-index.json`
- **web UI/dashboard** -> `web/src/pages/, web/src/components/`
- **API endpoints** -> `src/routes/`
- **action schemas/validation** -> `src/schemas/`
- **ergonomics/workstation** -> `src/engines/ErgonomicWorkstationEngine.ts`
- **magazine/tool change/ATC** -> `src/engines/ToolMagazineOptimizationEngine.ts`
- **VAM/ultrasonic machining** -> `src/engines/VibrationAssistedMachiningEngine.ts`

## Directory Tree

- **audits/** (38 files)
  - **R0-P0/** (11 files)
- **backups/** (3 files)
- **data/** (6 files) — Non-code data root — roadmap, milestones, docs, materials, schemas
  Key: roadmap-index.json, fanuc-controller-tips.json, tool-catalog-inventory.json
  - **chats/** (2 files) — Chat persistence
    Key: index.json, README.md
    - **sessions/** (1 files)
    - **summaries/** (1 files)
  - **claims/** (2 files) — Task claim locks — atomic claim system for parallel work
    Key: ACTIVE_CLAIM.json, .gitkeep
      - **P0-U01/** (1 files)
      - **P0-U02/** (1 files)
      - **P0-U01/** (1 files)
      - **P0-U02/** (1 files)
      - **P0-U08/** (1 files)
      - **P0-U01/** (1 files)
      - **P0-U01/** (1 files)
      - **CC-MS10-P0-U01/** (1 files)
      - **P0-U01/** (1 files)
      - **P0-U01/** (1 files)
    - **CC-MS2-P0-U01/** (1 files)
      - **P0-U01/** (1 files)
      - **P0-U01/** (1 files)
      - **P0-U01/** (1 files)
      - **P0-U01/** (1 files)
      - **P0-U01/** (1 files)
      - **P0-U01/** (1 files)
      - **P0-U01/** (1 files)
      - **P0-U01/** (1 files)
      - **P0-U03/** (1 files)
      - **P0-U12/** (1 files)
      - **P0-U01/** (1 files)
      - **P0-U02/** (1 files)
      - **P0-U03/** (1 files)
      - **P0-U04/** (1 files)
      - **P0-U05/** (1 files)
      - **P0-U06/** (1 files)
      - **P0-U07/** (1 files)
      - **P0-U08/** (1 files)
      - **P0-U09/** (1 files)
      - **P0-U10/** (1 files)
      - **P0-U11/** (1 files)
      - **P0-U12/** (1 files)
      - **P0-U13/** (1 files)
      - **P0-U14/** (1 files)
      - **P0-U15/** (1 files)
      - **P0-U01/** (1 files)
      - **P0-U02/** (1 files)
    - **PROD-MS0-U01/** (1 files)
      - **SYS-MS1-U00/** (1 files)
      - **SYS-MS1-U01/** (1 files)
      - **SYS-MS1-U02/** (1 files)
    - **SYS-MS2-U00/** (1 files)
    - **SYS-MS2-U01/** (1 files)
      - **SYS-MS2-U00/** (1 files)
      - **SYS-MS2-U04/** (1 files)
      - **SYS-MS2-U05/** (1 files)
      - **SYS-MS4-U02/** (1 files)
      - **SYS-MS6-U00/** (1 files)
      - **SYS-MS6-U01/** (1 files)
      - **SYS-MS6-U02/** (1 files)
    - **TC-MS0-P0-U01/** (1 files)
    - **TC-MS0-P0-U02/** (1 files)
    - **TC-MS0-P1-U01/** (1 files)
    - **TC-MS0-P1-U02/** (1 files)
    - **TC-MS0-P1-U03/** (1 files)
    - **TC-MS0-P2-U01/** (1 files)
    - **TC-MS0-P2-U02/** (1 files)
    - **TC-MS0-P2-U03/** (1 files)
    - **TC-MS0-P2-U04/** (1 files)
    - **TC-MS0-P3-U01/** (1 files)
    - **TC-MS0-P3-U02/** (1 files)
    - **TC-MS0-P4-U01/** (1 files)
    - **TC-MS0-P4-U02/** (1 files)
    - **TC-MS0-P4-U03/** (1 files)
  - **coordination/** (1 files) — Multi-session coordination files
    Key: .gitkeep
  - **decision-trees/** (1 files) — Decision tree definitions for routing
    Key: material_selection.json
  - **docs/** (33 files) — 33 documentation files — MASTER_INDEX, SYSTEM_INVENTORY, PATH_INDEX, CODE_SYSTEM_INDEX
    Key: CODE_SYSTEM_INDEX.json, MASTER_INDEX.md, VIDEO_WATCHLIST.md
    - **archive/** (11 files) — Historical documentation snapshots
      Key: GSD_v19.md, GSD_v18.md, GSD_v12.md
    - **gsd/** (3 files) — Getting Started Documentation
      Key: GSD_QUICK.md, DEV_PROTOCOL.md, GSD_MICRO.md
      - **sections/** (14 files) — GSD section files
    - **roadmap/** (25 files) — 25 roadmap files — current plans and trackers
      Key: .roadmap-index-baseline.json, ROADMAP_SECTION_INDEX.md, PHASE_R7_INTELLIGENCE.md
      - **archive/** (31 files) — Completed/superseded roadmap items
        - **audits-trackers/** (12 files)
        - **completed-phases/** (9 files)
        - **old-monolithic/** (3 files)
        - **superseded/** (17 files)
      - **reference/** (4 files) — Roadmap reference materials
  - **materials/** (3 files) — Material database JSON files
    Key: M_STAINLESS_R3.json, S_SUPERALLOYS_R3.json, K_CAST_IRON_verified.json
  - **milestones/** (111 files) — 111 milestone envelope JSON files
    Key: S1-MS2.json, CC-MS0.json, L2-P4-MS1.json
  - **schemas/** (5 files) — 5 JSON schemas — validation definitions
    Key: milestone-envelope.schema.json, material-registry.schema.json, validate-all.mjs
  - **state/** (2 files) — Runtime state files — session, progress tracking
    Key: HEALTH_CHECK_REPORT.json, BASELINE_INVENTORY.json
    - **RGS/** (2 files)
    - **S1-MS1/** (2 files)
    - **TEST-health-check/** (2 files)
  - **templates/** (2 files) — Template files for RGS and reports
    Key: roadmap-exemplar.json, roadmap-exemplar.md
    - **rgs-prompts/** (8 files) — 8 RGS prompt templates for milestone generation
      Key: master-generator.md, stage5-unit-population.md, stage2-codebase-audit.md
  - **video-learned/** (1 files) — Video learning output cache
    Key: learning-registry.json
- **deploy/** (3 files)
  - **grafana-dashboards/** (2 files)
  - **grafana-datasources/** (1 files)
  - **plans/** (1 files)
- **logs/** (2 files)
- **schemas/** (13 files)
- **scripts/** (69 files)
  - **_completed_utilities/** (34 files)
  - **audit/** (1 files)
  - **hooks/** (5 files)
  - **roadmap/** (9 files)
  - **skills/** (5 files)
  - **atcs/** (1 files)
- **src/** (5 files) — TypeScript source root — all production code
  Key: index.ts, types.ts, manus_integration.py
  - **__tests__/** (545 files) — 545 test files — vitest, unit, integration, benchmark
    Key: ultimate-speed-feed-gauntlet.test.ts, exhaustive-science-batch3.test.ts, camk-ms0-gauntlet.test.ts
    - **engines/** (10 files) — Engine-specific test suites
      Key: ContinuousImprovementEngine.test.ts, UncertaintyQuantificationEngine.test.ts, PredictionValidationEngine.test.ts
    - **helpers/** (2 files) — Test helper utilities
      Key: engineTestHarness.ts, engine-test-harness.ts
    - **unit/** (4 files) — Focused unit tests
      Key: getEffort.test.ts, envParsing.test.ts, apiTimeout.test.ts
  - **algorithms/** (52 files) — 52 reusable algorithms — physics, ML, optimization, manufacturing
    Key: AdaptiveControllerModel.ts, CSPSetupPlan.ts, index.ts
  - **config/** (5 files) — Configuration files — server config, feature flags, environment
    Key: dslAbbreviations.ts, apiWrapper.ts, effortTiers.ts
  - **data/** (75 files) — 42+ catalog/data files — tool catalogs (46K+ tools), machine profiles (910), holders, grades
    Key: collision-avoidance-data.json, osg-tools-extracted.json, additional-tool-catalog.ts
  - **db/** (2 files) — Database connection and schema
    Key: schema.sql, connection.ts
  - **engines/** (880 files) — 860+ calculation engines — core physics, manufacturing, CNC, costing, token optimization
    Key: TribalKnowledgeEngine.ts, MachiningPlaybookEngine.ts, UltimateSpeedFeedEngine.ts
  - **errors/** (1 files) — Custom error classes
    Key: PrismError.ts
  - **generators/** (3 files) — 3 generator modules — code gen, report gen, template gen
    Key: HookGenerator.ts, ExtendedDomainTemplates.ts, index.ts
  - **hooks/** (22 files) — 22 hook files — safety chains, cadences, domain hooks, event handlers
    Key: AdvancedManufacturingHooks.ts, EnforcementHooks.ts, CrossReferenceHooks.ts
  - **middleware/** (7 files) — 7 middleware modules — auth, logging, error handling, rate limiting
    Key: auth.ts, auditLog.ts, rateLimit.ts
  - **orchestration/** (3 files) — 3 orchestration modules — multi-engine pipeline coordination
    Key: HookEngine.ts, AutoPilot.ts, AutoPilotV2.ts
  - **registries/** (23 files) — 23 registries — tool catalog, material DB, formula, strategy, knowledge base
    Key: ToolpathStrategyRegistry.ts, ScriptRegistry.ts, MaterialRegistry.ts
  - **routes/** (33 files) — 33 Express API routes — REST endpoints for web frontend
    Key: openapi.ts, orchestration.ts, session.ts
  - **schemas/** (72 files) — 72 Zod action schemas — parameter validation for dispatcher actions
    Key: calcActionSchemas.ts, businessActionSchemas.ts, roadmapSchema.ts
  - **scripts/** (3 files) — 3 utility scripts — maintenance, migration, data processing
    Key: scrutinize-roadmap.ts, generate-roadmap.ts, index-roadmap-outputs.ts
  - **services/** (4 files) — 4 service modules — external integrations, background tasks
    Key: dataLoader.ts, TaskClaimService.ts, RoadmapLoader.ts
  - **shared/** (3 files) — 3 shared modules — cross-cutting constants and utilities
    Key: progressive-response.ts, response-level.ts, index.ts
  - **tests/** (1 files)
  - **tools/** (13 files) — MCP tool definitions and dispatcher routing
    Key: cadenceExecutor.ts, autoHookWrapper.ts, dev_tools.py
    - **dispatchers/** (67 files) — 66 action dispatchers — route MCP actions to engines
      Key: calcDispatcher.ts, businessDispatcher.ts, atcsDispatcher.ts
  - **types/** (12 files) — 12 TypeScript type definitions — shared interfaces, enums, constants
    Key: prism-schema.ts, pfp-types.ts, compliance-types.ts
  - **utils/** (17 files) — 17 utility modules — helpers, formatters, parsers, converters
    Key: validators.ts, responseSlimmer.ts, formatters.ts
  - **validation/** (3 files) — 3 validation modules — input validation, safety checks
    Key: actionParamValidator.ts, crossFieldPhysics.ts, materialSanity.ts
- **state/** (3 files)
  - **QA-MS1/** (7 files)
  - **QA-MS10/** (6 files)
  - **QA-MS11/** (6 files)
  - **QA-MS12/** (5 files)
  - **QA-MS13/** (6 files)
  - **QA-MS14/** (4 files)
  - **QA-MS2/** (6 files)
  - **QA-MS3/** (7 files)
  - **QA-MS4/** (6 files)
  - **QA-MS5/** (8 files)
  - **QA-MS6/** (8 files)
  - **QA-MS7/** (7 files)
  - **QA-MS8/** (5 files)
  - **QA-MS9/** (7 files)
  - **SYS-MS3/** (3 files)
  - **SYS-MS5/** (2 files)
  - **bridge/** (3 files)
    - **certs/** (233 files)
    - **keys/** (2 files)
  - **compliance/** (3 files)
  - **logs/** (2 files)
  - **memory_graph/** (5 files)
  - **nl_hooks/** (1 files)
  - **results/** (1 files)
  - **telemetry/** (2 files)
  - **tenants/** (3 files)
  - **engines/** (5 files)
  - **r10/** (10 files)
  - **r11/** (4 files)
  - **r2/** (9 files)
  - **r3/** (11 files)
    - **campaign-results/** (635 files)
  - **r4/** (1 files)
  - **r5/** (5 files)
  - **r7/** (6 files)
  - **r8/** (8 files)
  - **r9/** (6 files)
- **web/** (8 files)
  - **src/** (5 files) — Web frontend source — React/TypeScript SPA
    Key: formulas.ts, App.tsx, main.tsx
    - **__tests__/** (15 files) — 15 web test files
      Key: remaining-pages.test.tsx, erp-pages-batch2.test.tsx, erp-pages.test.tsx
    - **api/** (4 files) — 4 API client modules — frontend-to-backend communication
      Key: client.ts, types.ts, viewer.ts
    - **components/** (9 files) — 9 shared UI components
      Key: NotificationCenter.tsx, CommandPalette.tsx, FormulaCard.tsx
      - **charts/** (5 files) — 5 chart components — D3/Recharts visualizations
      - **learning/** (9 files) — 9 learning UI components — video, PDF, knowledge viewers
      - **viewer/** (6 files) — 6 viewer components — 3D, G-code, tool path visualization
    - **contexts/** (1 files) — React context providers
      Key: LearningContext.tsx
    - **hooks/** (5 files) — 5 React hooks — data fetching, state management
      Key: useLearning.ts, useWebSocket.ts, useKeyboardShortcuts.ts
    - **pages/** (42 files) — 42 page components — dashboard, calculators, viewers
      Key: HRCompliancePage.tsx, QualityManagementPage.tsx, CustomersPage.tsx
    - **types/** (2 files) — 2 TypeScript type files for web
      Key: learning.ts, viewer.ts
    - **utils/** (2 files) — 2 web utility modules
      Key: sceneParser.ts, crossLinks.ts

## File Counts

| Directory | .ts | .json | .md | Total |
|-----------|-----|-------|-----|-------|
| src/engines | 879 | 0 | 1 | 880 |
| src/tools/dispatchers | 66 | 0 | 1 | 67 |
| src/algorithms | 52 | 0 | 0 | 52 |
| src/__tests__ | 545 | 0 | 0 | 545 |
| src/data | 42 | 33 | 0 | 75 |
| src/schemas | 72 | 0 | 0 | 72 |
| src/hooks | 22 | 0 | 0 | 22 |
| src/registries | 23 | 0 | 0 | 23 |
| src/routes | 33 | 0 | 0 | 33 |
| src/utils | 17 | 0 | 0 | 17 |
| src/types | 12 | 0 | 0 | 12 |
| data/docs | 0 | 5 | 23 | 33 |
| data/milestones | 0 | 111 | 0 | 111 |
| web/src/pages | 42 | 0 | 0 | 42 |

## Cross-References

- Engine -> Dispatcher: check `src/tools/dispatchers/` for action wiring
- Engine -> Test: check `src/__tests__/` for `*engine-name*.test.ts`
- Engine -> Schema: check `src/schemas/` for action parameter validation
- Dispatcher -> Schema: each dispatcher has matching schema file in `src/schemas/`
- Registry -> Data: registries load from `src/data/` catalog files
- Route -> Dispatcher: routes call dispatchers for action execution
- Hook -> Engine: hooks reference engines for validation/calculation

## Code System Index (DSL)

Use shortcodes instead of full paths:
- `E0001`-`E0860`: engines | `D01`-`D58`: dispatchers | `A01`-`A51`: algorithms
- `T0001`-`T0534`: tests | `C01`-`C67`: catalogs | `H01`-`H21`: hooks
- `RG01`-`RG22`: registries | `U01`-`U16`: utils | `M001`-`M110`: milestones
- Resolve: `CodeSystemIndexEngine.resolve('E0001')` or `/code-index E0001`
