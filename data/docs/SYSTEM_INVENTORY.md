# PRISM SYSTEM INVENTORY
## Last Updated: 2026-03-15T23:00 | Updated by wiring audit

> **Purpose**: Single source of truth for what exists in the PRISM system.
> All chats should read this file FIRST to avoid duplicating work.
> Location: `C:/PRISM/mcp-server/data/docs/SYSTEM_INVENTORY.md`

---

## QUICK COUNTS

| Category | Count | Location |
|----------|-------|----------|
| **Engines** | 1068 files | `src/engines/` |
| **Algorithms** | 51 (18 physics, 18 ML/optimization, 14 mfg-specific, 1 index) | `src/algorithms/` |
| **Dispatchers** | 67 files | `src/tools/dispatchers/` |
| **Actions** | 2625+ total across all dispatchers | dispatchers |
| **MCP Tools** | 53 registered (47 explicit + 6 F-feature) | `src/tools/` |
| **Hooks** | 213 hookify rules + 22 hook files | `src/hooks/` |
| **Cadences** | 12 (6 core + 6 specialty) | `src/hooks/CadenceDefinitions.ts` |
| **Formulas** | 499 (109 built-in + 390 JSON) across 20 domains | `FormulaRegistry` |
| **Registries** | 23 TypeScript files | `src/registries/` |
| **Tests (Backend)** | 15700+ passing, 734 files | `src/__tests__/` |
| **Tests (Web)** | 85 tests, 7 files | `web/src/__tests__/` |
| **Tests (CAD-Engine)** | 2085 tests, 87 files | `cad-engine/tests/` |
| **Tests (E2E)** | 11 E2E test files | `cad-engine/tests/e2e/` |
| **Web Components** | 53 .tsx files, 11 pages | `web/src/` |
| **Python Modules** | 93 source files, 308 classes | `cad-engine/src/` |
| **Slash Commands** | 134 commands | `~/.claude/commands/` |
| **Skills** | 257 indexed, 14 superpowers | `TRIGGER_MAP.json` |
| **Tribal Knowledge** | 3700+ tips | `TribalKnowledgeEngine` |
| **Data/Catalogs** | 68 files | `src/data/` |
| **Schemas** | 80 files | `src/schemas/` |
| **Code System Index** | 1,850 file mappings | `data/docs/CODE_SYSTEM_INDEX.json` |
| **CLI Commands** | 21 | `src/cli/` |
| **ToolRouter** | 123 patterns / 46 targets | `ToolRouterEngine.ts` |
| **Milestones** | 144/151 COMPLETE | `data/milestones/` |

---

## ENGINES BY CATEGORY (1068 total)

### All engines in `src/engines/` — exported via `index.ts`
- **Calculation** (33): ManufacturingCalculations, AdvancedCalculations, ToolpathCalculations, CuttingPowerBudget, BoreFinishing, ChipFormationPrediction, CoolantStrategy, CycleToControl, DOEAnalysis, DrillBreakthrough, DrillCycleOptimization, FinishingPassOptimization, GrindingForce, GrindingSurfaceFinish, SpecificCuttingEnergy, TappingTorque, ThermalGrowthCompensation, ToolCoatingSelection, ToolDeflectionPrediction, ToolWearProgression, TurningForce, PhysicsPrediction, ChipThinningCompensation, EngagementGeometry, CollisionEngine, WorkholdingEngine, ToolBreakageEngine, SpindleProtection, CoolantValidation, +4 more
- **Safety** (7): SafetyEngine, SafetyQualityHooks, EnforcementHooks, HyperMillSafetyHooks, SafetyValidator, +2 more
- **Manufacturing Process** (16): ThreadCalculation, GCodeTemplate, PostProcessor, ToolpathGeneration, CAMKernel, +11 more
- **Workholding** (6): WorkholdingEngine, ChuckJawForce, SoftJawProfile, FixtureDesign, +2 more
- **CAD/CAM** (13): HyperMillStrategy, HyperMillSafety, HyperMillCycleCatalog, HyperMillControllerCatalog, MultiCamStrategy, FeatureRecognition, CadBridge, +6 more
- **Intelligence & Knowledge** (14): TribalKnowledge, ApprenticeEngine, KnowledgeGraph, IntelligenceEngine, +10 more
- **Infrastructure** (21): NLHookEngine, HookEngine, SessionManager, ContextManager, +17 more
- **Monitoring** (7): TelemetryEngine, AnomalyDetection, PredictiveMaintenance, +4 more
- **Execution** (11): AutoPilot, AutoPilotV2, Orchestration, +8 more
- **Reporting** (5): ReportGenerator, ExportEngine, +3 more
- **Business** (4): QuoteEngine, CostEstimator, +2 more
- **Industry** (10): AerospaceCompliance, MedicalDevice, +8 more
- **Multi-Axis** (6): FiveAxisKinematics, RTCP, +4 more
- **Specialty** (4): EDM, SheetMetal, Additive, InjectionMold

### Unwired (1) — on disk but not exported
Reserved for future wiring. Includes experimental, specialty, and recently-created engines awaiting dispatcher integration.

---

## DISPATCHERS — TOP 15 BY ACTION COUNT

| # | Dispatcher | Actions | Domain |
|---|-----------|---------|--------|
| 1 | calcDispatcher | 1130+ | Physics, math, optimization, manufacturing calculations |
| 2 | businessDispatcher | 230 | ERP, quoting, scheduling, inventory, HR |
| 3 | l2EngineDispatcher | 73 | AI/ML, CAD geometry, simulation |
| 4 | camDispatcher | 65 | Toolpath, post-processing, collision, hyperMILL |
| 5 | intelligenceDispatcher | 61 | Job planning, recommendations, diagnostics |
| 6 | cadDispatcher | 58 | Geometry creation, mesh, DFM, sketching |
| 7 | integrationDispatcher | 47 | CAM, DNC, ERP, mobile, measurement |
| 8 | dataDispatcher | 47 | Material/machine/tool DB queries, formulas |
| 9 | knowledgeExtDispatcher | 44 | Apprentice, genome, knowledge graph |
| 10 | productDispatcher | 44 | SFC calculator, PPG translator |
| 11 | diagnosisDispatcher | 42 | Forensics, inverse problems, sustainability |
| 12 | machineLiveDispatcher | 36 | Connectivity, adaptive control, digital twin |
| 13 | sessionDispatcher | 32 | State, checkpoints, memory, context |
| 14 | contextDispatcher | 30 | Key-value, events, decisions, team coordination |
| 15 | safetyDispatcher | 30 | Collision, coolant, spindle, tool breakage, workholding |

---

## REGISTRIES — ENTRY COUNTS

| Registry | Entries | Notes |
|----------|---------|-------|
| ToolRegistry | 15,912+ | 85 parameters per tool, geometry-enriched |
| MaterialRegistry | 6,346+ | 127 parameters, Kienzle-enriched |
| MachineRegistry | 2,107+ | 43 manufacturers, spindle-enriched |
| AlarmRegistry | 2,500+ | 12 controller families |
| FormulaRegistry | 499 | 20 domains |
| HookRegistry | 220+ | 9 categories |
| ScriptRegistry | 163+ | 10 categories |
| SkillRegistry | 135+ | 14 categories |
| AgentRegistry | 64+ | 8 categories |
| AlgorithmRegistry | 52+ | 14 types |
| CoatingRegistry | 20 | 5 categories |
| CoolantRegistry | 22 | 7 categories |

---

## CAD-ENGINE PYTHON MODULES (93 source files)

| Pipeline | Modules | Classes | Purpose |
|----------|---------|---------|---------|
| Core CAD/CAM | 7 | 29 | CadQuery kernel, bridge, validation, export |
| Video Ingest | 7 | 20 | YouTube/video → frames → OCR → analysis |
| Knowledge Extract | 8 | 19 | Orchestrator, bridge, offline, generator, writer |
| PDF/Manual Extract | 9 | 41 | PDF ingestion, tables, params, catalogs, physics validation |
| Feedback Learning | 8 | 41 | Operator feedback, physics validation, consensus, conflict resolution |
| Sensor Learning | 7 | 29 | MTConnect/OPC-UA, signal processing, anomaly detection, wear prediction |
| Quality Feedback | 5 | 26 | CMM/DMIS import, tolerance correlation, surface finish, dimensional accuracy |
| Cross-Source Synthesis | 4 | 28 | Aggregation, confidence scoring, conflict resolution, knowledge graph |
| Shop Practice | 5 | 16 | Practice aggregation, troubleshooting trees, material tips, safety validation |
| CAM Learning | 4 | 14 | Strategy aggregation, recommendation, tool selection, op sequencing |
| Document Learning | 3 | 7 | Document ingest/classify/extract |
| Memory/Learning | 6 | 11 | Memory boot/read/write/compact/index |
| Prompts | 4 | — | CAD/CAM/SHOP/document system prompts |
| Validators | 4 | 4 | CAD/CAM/SHOP/common validators |
| Code Generation | 6 | 12 | Code gen, validator, primitives, feature analysis, translation |
| Query/Guidance | 3 | 14 | NL query, teach-me, platform guidance |
| Feature/Mfg | 3 | 14 | Feature analysis, manufacturability, CAM safety overlay |

---

## WEB UI (53 components, 11 pages)

| Module | Components | Purpose |
|--------|-----------|---------|
| UI Base | 11 | Button, Input, Select, Card, Badge, Spinner, Modal, Tabs, Toast, ThemeToggle, Table |
| SFC Calculator | 12 | Material/Operation/Parameter selectors, Results, Charts, Presets, Comparison |
| PPG (Post-Processing) | 9 | Controller, G-code diff/preview/editor, Template browser, Validation, Optimizer |
| Learning | 8 | Assessment, 3 Wizards, Digital Twin, Knowledge Search, Progress, Path |
| ERP | 8 | Job Planner/Tracker, Capacity, Schedule, Inventory, Reports, Quotes, Maintenance |
| Support | 5 | ErrorBoundary, OfflineBanner, Charts, Layout, AppShell |

**Pages**: SfcCalculator, PPG, Learning, ERP, CAM Strategy, Data Management, Safety Dashboard, Quality, Cost Estimator, Login, Settings

---

## DATA MODULES (src/data/)

| File | Content |
|------|---------|
| threadDataISO.ts | ISO metric thread specifications |
| threadDataUnified.ts | ANSI Unified (UNC/UNF) thread data |
| threadDataAcme.ts | ACME & trapezoidal thread specs |
| threadDataPipe.ts | NPT/BSP/BSPP pipe thread specs |
| machine-profiles-catalog.ts | 52 machines from 7 brands (Haas, DMG MORI, Mazak, Makino, Okuma, Hermle, Doosan) |
| sgs-tool-catalog.ts | SGS v26.1: 18 series, 9 coatings, 36 speed/feed records |
| big-daishowa-holders.ts | 120+ holder specs, 10 families, 14 taper types |
| workholding-catalog.ts | Orange Vise: 44 entries (vises, zero-point, tombstones, jaws) |
| catalog-inventory.json | Catalog metadata index |
| tungaloy-holders-raw.json | Tungaloy holder raw data |

---

## QUALITY AUDIT FINDINGS

### CRITICAL (7)
- `new Function()` code injection in calcDispatcher.ts (4), FormulaRegistry.ts (1), NLHookEngine.ts (2)
- **Action**: Replace with sandboxed evaluators or Worker threads

### MAJOR (58)
- Empty catch blocks: 2 (AutoPilot.ts, AutoPilotV2.ts)
- Placeholder implementations: 1 (SketchEngine.ts:595)
- TODO/FIXME comments: 15 (mostly intentional system markers)
- console.log in production: 5 non-startup instances

### MINOR (137+)
- `as any` across 137 files (expected for large heterogeneous system)
- Large files: calcDispatcher (3.5K lines), ToolpathStrategyRegistry (4.5K), cadenceExecutor (5K)

### QUALITY SCORE: 82/100
Formula: 100 - (CRITICAL×10 + MAJOR×3 + MINOR×1) scaled

---

## DSL COMPLIANCE

- **AtomicValue returns**: 25+ engines confirmed (BoreFinishing, ChipFormation, CoolantStrategy, etc.)
- **Raw value returns**: 3 major engines (ManufacturingCalculations, AdvancedCalculations, ToolpathCalculations)
- **Param normalization**: 20+/53 dispatchers (explicit); others rely on middleware
- **Safety chain**: S(x) ≥ 0.70 hard block, Ω(x) ≥ 0.70 hard block, no bypass patterns found
- **Exported engines**: 150/218 (68 unwired reserved for future)

---

## SAFETY CHAIN STATUS

| Component | Count | Status |
|-----------|-------|--------|
| Safety hooks (blocking) | 20+ | ACTIVE — preCalculateSafety, postCalculateSafety, enforcement gates |
| S(x) threshold | 0.70 | HARD BLOCK — cannot bypass |
| Ω(x) threshold | 0.70 | HARD BLOCK — cannot bypass |
| Engines producing safety scores | 15+ | PhysicsPrediction, BoreFinishing, CoolantStrategy, etc. |
| Bypass patterns | 0 | NONE found — safety enforced via hooks, not flags |
| Validation gates | 3 | validateKienzle, validateTaylor, validateJohnsonCook |

---

## MILESTONES (144/151 COMPLETE)

| Track | Count | Status |
|-------|-------|--------|
| SYS (System) | 8/8 | COMPLETE |
| CC (CAM Collection) | 8/8 | COMPLETE |
| CC-EXT (Extensions) | 6/6 | COMPLETE |
| L8 (Web UI) | PPG+Learning+WebGL+ERP | COMPLETE |
| QA (Quality) | 15/15 | COMPLETE |
| REM (Remediation) | 6/6 | COMPLETE |
| RX-MS0 (Resource Extraction) | COMPLETE | All phases done (P3-U02 deferred) |
| PP (Post-Processor) | 9/9 | COMPLETE (PP-MS0 to PP-MS8) |
| MF (Machining Feasibility) | 6/6 | COMPLETE (MF-MS0 to MF-MS5) |
| USF (Ultimate Speed/Feed) | 1/1 | COMPLETE (USF-MS0) |
| VAR (Stochastic Physics) | 2/2 | COMPLETE (VAR-MS0, VAR-MS1) |
| SIM (CNC Simulation) | 1/1 | COMPLETE (SIM-MS0) |
| CK (CAM Kernel) | 7/8 | MS0-MS6, MS8 done; MS7 remaining |
| PIPE (Pipeline) | 1/1 | COMPLETE (PIPE-MS1) |
| QS (Quality-Synergy) | 7/7 | COMPLETE (QS-MS0 to QS-MS6) |
| CLI | 1/1 | COMPLETE (CLI-MS0 P0+P1) |
| SCI (Scientific Validation) | 4/4 | COMPLETE (SCI-MS0 to SCI-MS3) |
| Remaining | 7 | CK-MS7, CK-MS9 to MS13, WIRE-MS0 |

---

## DIRECTORY STRUCTURE OVERVIEW

```
C:\PRISM\                        [~11 GB active + 8 GB resources]
├── mcp-server/                  [~1.2 GB] TypeScript MCP server
│   ├── src/engines/             [1068 files] Core engines
│   ├── src/algorithms/          [52 files] Physics/math algorithms
│   ├── src/tools/dispatchers/   [67 files] Action dispatchers
│   ├── src/hooks/               [22 files] 213 hookify rules
│   ├── src/registries/          [23 files] Data registries
│   ├── src/data/                [68 files] Thread/catalog data
│   ├── src/__tests__/           [734 files] 15700+ tests
│   ├── data/registries/         Registry JSON data
│   ├── data/milestones/         [144 files] Milestones
│   ├── data/docs/               Documentation + this file
│   └── web/                     React frontend (53 components)
├── cad-engine/                  [~600 MB] Python CAD/ML pipeline
│   ├── src/                     [93 modules] 308 classes
│   └── tests/                   [87 files] 2085 tests
├── data/                        [~500 MB] External registries
│   ├── machines/                [47 files] Machine databases
│   ├── tool_holders/            Holder specs (BT40/50, CAT40, HSK)
│   ├── controllers/             Alarm database, schema definitions
│   └── agents/                  [30+ files] Agent definitions
├── state/                       [~150 MB] Session state
├── registries/                  [54 files] System registries
├── scripts/                     [~50 MB] Python automation
├── docs/                        [~150 MB] 80+ doc files
└── resources/                   [~8 GB] PDFs, training, CAM files
```

---

## KEY FILE PATHS

| Purpose | Path |
|---------|------|
| This inventory | `C:/PRISM/mcp-server/data/docs/SYSTEM_INVENTORY.md` |
| Path index (all paths) | `C:/PRISM/mcp-server/data/docs/PATH_INDEX.md` |
| Master index (engines) | `C:/PRISM/mcp-server/data/docs/MASTER_INDEX.md` |
| Roadmap | `C:/PRISM/mcp-server/data/roadmap-index.json` |
| Engine exports | `C:/PRISM/mcp-server/src/engines/index.ts` |
| Main CLAUDE.md | `C:/PRISM/CLAUDE.md` |
| MCP CLAUDE.md | `C:/PRISM/mcp-server/CLAUDE.md` |
| Session memory | `~/.claude/projects/C--Windows-System32/memory/MEMORY.md` |

---

## HOW TO USE THIS FILE

1. **New chat session**: Read this file first to understand what exists
2. **Before building**: Check engine/dispatcher/algorithm counts to avoid duplicates
3. **Before extracting data**: Check data modules and registry entries
4. **Before creating tests**: Check test count and coverage map
5. **After building**: Update counts in this file via `/forge-audit`
