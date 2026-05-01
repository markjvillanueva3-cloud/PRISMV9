# PRISM App Pipeline Schema
> Full wiring diagram: Engine → Dispatcher → Route → API Client → Hook → Page
> Generated: 2026-03-14 | 15 features | 941 engines | 66 dispatchers | 2069 actions

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 7: WEB UI (React 19 + Vite + TailwindCSS)               │
│  15 pages, 15 hooks, 16 API clients, 15 type files, 4 contexts │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 6: API GATEWAY (Express.js REST + WebSocket)             │
│  33 route modules, ~330 endpoints, JWT auth, rate limiting      │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 5: MCP TOOL SURFACE (prism_* tool groups)                │
│  66 dispatchers, 2069 actions, Zod schemas, auto-hook proxy     │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 4: ENGINE LAYER (941 TypeScript engines)                 │
│  Physics, ML, stochastic, optimization, knowledge, business     │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: DATA LAYER (catalogs, registries, databases)          │
│  2957 materials, 46590 tools, 910 machines, 2511 alarms         │
│  22 registries, 499 formulas, 52 algorithms                     │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: HOOK SYSTEM (251+ hooks, 213 hookify rules)           │
│  Safety chain, token efficiency, auto-routing, dedup            │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 1: INFRASTRUCTURE (auth, sessions, telemetry, config)    │
│  JWT tokens, WebSocket, localStorage, audit logging             │
└─────────────────────────────────────────────────────────────────┘
```

## Feature Pipeline Matrix

### Legend
- **Page**: React component (lazy-loaded)
- **Hook**: Custom React hook (useApiCall pattern)
- **API**: Fetch client (POST/GET with AbortController)
- **Route**: Express.js router (callTool bridge)
- **Dispatcher**: MCP tool handler (switch/case → engine)
- **Status**: COMPLETE | PARTIAL | INFRA

### Full Pipeline Per Feature

| # | Feature | Page | Hook | API | Route | Dispatcher | Key Engines | Status |
|---|---------|------|------|-----|-------|-----------|-------------|--------|
| 1 | **Speed/Feed Calculator** | SfcCalculatorPage @ /sfc | useSfc (7) | sfc.ts (7) | /api/v1/sfc (7) | calcDispatcher | UltimateSpeedFeedEngine, KienzleForce, Taylor | COMPLETE |
| 2 | **Speed/Feed Orchestrator** | SpeedFeedPage @ /speed-feed | useSpeedFeed (8) | speedfeed.ts (8) | /api/v1/speed-feed (8) | calcDispatcher | SpeedFeedOrchestratorEngine (MOPSO, stochastic) | COMPLETE |
| 3 | **Post Processor** | PpgPage @ /ppg | usePpg (8) | ppg.ts (8) | /api/v1/ppg (8) | camDispatcher | PostProcessorEngine, GCodeTemplate | COMPLETE |
| 4 | **Learning** | LearningDashboard @ /learning | useLearning (10) | learning.ts (10) | /api/v1/learning (10) | intelligenceDispatcher | LearningPath, TribalKnowledge, DigitalTwin | COMPLETE |
| 5 | **ERP** | ErpDashboard @ /erp | useErp (10) | erp.ts (10) | /api/v1/erp (10) | intelligenceDispatcher | Quoting, Scheduling, OEE, PredictiveMaint | COMPLETE |
| 6 | **CAM Toolpath** | CamStrategyPage @ /cam | useCam (4) | cam.ts (4) | /api/v1/cam (4) | camDispatcher | NovelToolpath, ToolpathSim, Collision | COMPLETE |
| 7 | **Data Lookup** | DataManagementPage @ /data | useData (7) | data.ts (7) | /api/v1/data (7) | dataDispatcher | MaterialCatalog, ToolCatalog, AlarmDecoder | COMPLETE |
| 8 | **Quality** | QualityPage @ /quality | useQuality (4) | quality.ts (4) | /api/v1/quality (4) | qualityDispatcher | SPC, Cpk, ToleranceStack | COMPLETE |
| 9 | **Safety** | SafetyDashboardPage @ /safety | useSafety (4) | safety.ts (4) | /api/v1/safety (4) | safetyDispatcher | Collision, Coolant, Spindle, ToolBreakage | COMPLETE |
| 10 | **Cost Estimation** | CostEstimatorPage @ /cost | useCost (4) | cost.ts (4) | /api/v1/cost (4) | intelligenceDispatcher | CostEstimation, Quoting | COMPLETE |
| 11 | **Auth** | LoginPage @ /login | useAuth (3) | auth.ts (6) | /api/v1/auth (6) | authDispatcher | AuthEngine, TokenMgmt | COMPLETE |
| 12 | **Telemetry** | TelemetryPage @ /telemetry | useTelemetry (5) | telemetry.ts (7) | /api/v1/telemetry (7) | telemetryDispatcher | TelemetryEngine, AnomalyDetection | COMPLETE |
| 13 | **Admin** | AdminPage @ /admin | useAdmin (6) | admin.ts (6) | /api/v1/admin (6) | devDispatcher | SystemStatus, CacheMgmt | COMPLETE |
| 14 | **Compliance** | CompliancePage @ /compliance | useCompliance (5) | compliance.ts (6) | /api/v1/compliance (8) | complianceDispatcher | ComplianceTemplate, GapAnalysis | COMPLETE |
| 15 | **Settings** | SettingsPage @ /settings | — (localStorage) | — | — | — | — | PARTIAL |

**Totals: 15 pages | 85 hook exports | 95 API endpoints | ~110 backend endpoints wired**

## Dispatcher → Feature Mapping

Which dispatchers feed which UI features:

| Dispatcher | Actions | UI Features Fed |
|-----------|---------|----------------|
| calcDispatcher | 588+ | SFC, SpeedFeed Orchestrator |
| intelligenceDispatcher | 49 | Learning, ERP, Cost |
| camDispatcher | 167 | PPG, CAM Toolpath |
| dataDispatcher | 54 | Data Lookup |
| qualityDispatcher | 13 | Quality |
| safetyDispatcher | 29 | Safety |
| authDispatcher | 8 | Auth |
| telemetryDispatcher | 7 | Telemetry |
| complianceDispatcher | 8 | Compliance |
| devDispatcher | 9 | Admin |
| businessDispatcher | 193 | (ERP backend, partially wired) |
| productDispatcher | 41 | (SFC backend alt path) |

## Engine Domain → Dispatcher → UI Feature Flow

```
CUTTING PHYSICS (76 engines)
  └→ calcDispatcher (sf_orchestrate, speed_feed, kienzle_force, taylor_life...)
      └→ /api/v1/sfc + /api/v1/speed-feed
          └→ SfcCalculatorPage + SpeedFeedPage

CAM & TOOLPATH (48 engines)
  └→ camDispatcher (toolpath_generate, post_process, collision_check...)
      └→ /api/v1/cam + /api/v1/ppg
          └→ CamStrategyPage + PpgPage

KNOWLEDGE & LEARNING (12 engines)
  └→ intelligenceDispatcher (learning_assess, learning_plan, tribal_search...)
  └→ knowledgeDispatcher (search, tribal_search)
      └→ /api/v1/learning
          └→ LearningDashboard (8 sub-pages)

ECONOMICS & COSTING (18 engines)
  └→ intelligenceDispatcher (quote_generate, cost_breakdown, job_plan...)
  └→ businessDispatcher (quote_*, job_*, schedule_*)
      └→ /api/v1/erp + /api/v1/cost
          └→ ErpDashboard (8 sub-pages) + CostEstimatorPage

STATISTICS & QUALITY (40 engines)
  └→ qualityDispatcher (spc_calculate, capability_analysis...)
      └→ /api/v1/quality
          └→ QualityPage

SAFETY & RISK (2 engines + 29 actions)
  └→ safetyDispatcher (check_toolpath_collision, validate_coolant_flow...)
      └→ /api/v1/safety
          └→ SafetyDashboardPage

MATERIAL HANDLING (43 engines)
  └→ dataDispatcher (material_get, material_search...)
  └→ fluidThermalDispatcher (35 actions)
  └→ materialProcessingDispatcher (11 actions)
      └→ /api/v1/data
          └→ DataManagementPage

MACHINE & CNC (35 engines)
  └→ cncOpsDispatcher (32 actions)
  └→ machineSetupDispatcher (25 actions)
  └→ machineLiveDispatcher (40 actions)
      └→ /api/v1/data (machine_get, machine_search)
          └→ DataManagementPage

MECHANICAL DESIGN (51 engines)
  └→ mechanicalDesignDispatcher (51 actions: gears, bearings, springs...)
      └→ NO UI PAGE (backend-only, available via MCP)

WELDING & JOINING (15 engines)
  └→ weldingJoiningDispatcher (6 actions)
      └→ NO UI PAGE (backend-only)

FORMING & CASTING (13+17 engines)
  └→ formingCastingDispatcher (16 actions)
      └→ NO UI PAGE (backend-only)

THERMAL & HEAT TREATMENT (20 engines)
  └→ fluidThermalDispatcher (35 actions)
      └→ NO UI PAGE (backend-only)

SURFACE & COATING (23 engines)
  └→ calcDispatcher (anodize, carburize, nitriding...)
      └→ NO UI PAGE (backend-only)

STOCHASTIC & UNCERTAINTY (9 engines)
  └→ calcDispatcher (via SpeedFeedOrchestratorEngine inline)
      └→ /api/v1/speed-feed/stochastic
          └→ SpeedFeedPage (Full Analysis mode)
```

## Unwired Engine Domains (Backend-Only, No UI)

These dispatchers have engines wired but NO dedicated UI page:

| Domain | Dispatcher | Actions | Engines | UI Priority |
|--------|-----------|---------|---------|-------------|
| Mechanical Design | mechanicalDesignDispatcher | 51 | 51 (gears, bearings, springs, brakes) | HIGH — calculator pages |
| Fluid & Thermal | fluidThermalDispatcher | 35 | 35 (heat exchangers, pumps, pipes) | MEDIUM — engineering tools |
| Integration | integrationDispatcher | 42 | CAM/DNC/ERP/mobile bridges | LOW — infrastructure |
| Knowledge Ext | knowledgeExtDispatcher | 40 | Apprentice, genome, federated learning | MEDIUM — advanced learning |
| Machine Live | machineLiveDispatcher | 40 | Real-time monitoring, adaptive control | HIGH — shop floor dashboard |
| Diagnosis | diagnosisDispatcher | 38 | Failure forensics, inverse solver | HIGH — troubleshooting |
| Session | sessionDispatcher | 48 | Session management | LOW — infrastructure |
| Orchestration | orchestrationDispatcher | 27 | Workflow chaining | MEDIUM — power user |
| CNC Ops | cncOpsDispatcher | 32 | G-code tools, program assembly | MEDIUM — programming tools |
| EDM | edmDispatcher | 16 | Wire/sinker EDM parameters | LOW — specialty |
| Grinding | grindingDispatcher | 6 | Grinding parameters | LOW — specialty |
| Turning | turningDispatcher | 8 | Turning-specific | LOW — specialty |
| Vibration | vibrationPhysicsDispatcher | 16 | Chatter, modal analysis | MEDIUM — diagnostics |

## Data Pipeline (Catalogs → Registries → Engines → Dispatchers)

```
RAW DATA SOURCES
├── machine-profiles-catalog.ts (910 machines, 48 mfrs)
├── machine-kinematics-catalog.ts (250 kinematic chains)
├── machine-kinematics-enriched.ts (660 inferred chains)
├── osg-tool-catalog.ts (11,550 tools)
├── additional-tool-catalog.ts (13,257 tools)
├── sandvik-tool-catalog.ts (2,418 tools)
├── [15+ more tool catalogs → 46,590 total]
├── haimer-holder-catalog.ts (489 holders)
├── big-daishowa-holders.ts (131 holders)
├── workholding-catalog.ts (44 entries)
├── collision-avoidance-data.json (41,085 tool envelopes)
├── multi-manufacturer-grades.ts (50 grades)
└── MASTER_ALARM_DATABASE.json (2,511 alarms)
    │
    ▼
REGISTRIES (22 total)
├── MaterialRegistry (2,957 materials)
├── ToolCatalogEngine (46,590 tools)
├── AlarmRegistry (2,511 alarms)
├── FormulaRegistry (499 formulas)
├── AlgorithmRegistry (52 algorithms)
├── MachineProfileRegistry
├── HookRegistry (251+ hooks)
├── TribalKnowledgeEngine (3,700+ tips)
└── [13 more registries]
    │
    ▼
ENGINES (941 across 23 domains)
├── SpeedFeedOrchestratorEngine (resolves from ALL catalogs)
├── UltimateSpeedFeedEngine (31 physics models)
├── MachiningPlaybookEngine (296 rules)
├── [938 more engines]
    │
    ▼
DISPATCHERS (66 dispatchers, 2069 actions)
    │
    ▼
ROUTES (33 modules, ~330 endpoints)
    │
    ▼
API CLIENTS (16 files, 95 functions)
    │
    ▼
HOOKS (15 files, 85 exports)
    │
    ▼
PAGES (15 routes, 27 sub-routes)
```

## Identified Gaps & Opportunities

### HIGH PRIORITY (user-visible features with backend ready)
1. **Mechanical Design Calculator** — 51 engines (gears, bearings, springs, brakes, couplings) wired to mechanicalDesignDispatcher but NO UI page
2. **Machine Live Dashboard** — 40 actions for real-time monitoring, adaptive control, predictive maintenance — NO UI page
3. **Diagnosis/Troubleshooting** — 38 actions for failure forensics, inverse solver — NO UI page
4. **Settings Backend Sync** — Settings page is localStorage-only, no server persistence

### MEDIUM PRIORITY
5. **CNC Operations Tools** — 32 actions for G-code, program assembly — could enhance PPG page
6. **Knowledge Extension** — 40 actions for apprentice mode, manufacturing genome — could enhance Learning page
7. **Vibration/Modal Analysis** — 16 actions — could be a diagnostic tab
8. **Fluid/Thermal Calculator** — 35 actions for pumps, heat exchangers — engineering tool page

### LOW PRIORITY (infrastructure/specialty)
9. **Orchestration Workflow UI** — 27 actions, power-user feature
10. **EDM/Grinding/Turning** — specialty calculator pages (30 combined actions)
11. **Forming/Casting** — 16 actions, specialty domain
