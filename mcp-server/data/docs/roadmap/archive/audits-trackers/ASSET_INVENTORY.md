# PRISM Asset Inventory & Utilization Map
## v14.0 Gap Analysis — What We Have vs. What We Use
## Generated: 2026-02-15

---

## EXECUTIVE SUMMARY

PRISM has accumulated **2,143+ extractable assets** across 79MB of monolith extractions, 102 skills, 220 MIT courses, and 9.7GB of manufacturer catalogs. The live MCP server actively uses approximately **18-22%** of this intellectual property. The v14.0 roadmap (R1-R3) recovers registry data but does NOT address engine integration, algorithm deployment, or novel intelligence features that would differentiate PRISM from every other manufacturing tool on the market.

This document maps every asset category to its current utilization and planned roadmap coverage.

---

## 1. ALGORITHMS — 52 Files, 1.3MB, 210 Registered Algorithms

### Currently Used in MCP Server
| Algorithm | Engine | Status |
|-----------|--------|--------|
| Taylor Tool Life (extended) | ManufacturingCalculations.ts | ✅ ACTIVE |
| Speed/Feed calculations | ManufacturingCalculations.ts | ✅ ACTIVE |
| Thread calculations | ThreadCalculationEngine.ts | ✅ ACTIVE |
| Force calculations (Merchant/Kienzle) | ManufacturingCalculations.ts | ✅ ACTIVE |
| Toolpath strategy selection | ToolpathCalculations.ts | ✅ ACTIVE |
| Uncertainty propagation | ManufacturingCalculations.ts | ✅ ACTIVE |

### NOT Used — High Value
| File | Content | Lines | Roadmap Gap |
|------|---------|-------|-------------|
| PRISM_ODE_SOLVERS_MIT.js | 235KB — Runge-Kutta, Adams-Bashforth, BDF, stiff solvers | 4,928 | **R7**: Thermal transient simulation, chatter prediction |
| PRISM_ALGORITHM_REGISTRY.js | 150KB — 210 algorithms with gateway routing | 3,559 | **R3**: algorithm_select action should route through this |
| PRISM_SEARCH_ENHANCED.js | 78KB — Manufacturing-aware search across databases | ~1,800 | **R3**: Powers job_plan's material/tool lookup chain |
| PRISM_MATH_FOUNDATIONS.js | 67KB — Linear algebra, interpolation, root finding | ~1,500 | **R7**: Foundation for all numerical methods |
| PRISM_ACO_SEQUENCER.js | 197KB — Ant colony optimization for operation sequencing | ~4,500 | **R7**: Multi-operation job optimization |
| PRISM_FFT_PREDICTIVE_CHATTER.js | 12KB — FFT-based chatter frequency prediction | ~280 | **R7**: Real-time chatter prediction from spindle load |
| PRISM_PHASE7_KNOWLEDGE.js | 106KB — Knowledge graph integration | ~2,400 | **R3**: knowledge_query enhancement |
| PRISM_JOHNSON_COOK_DATABASE.js | 8KB — Strain-rate constitutive models, 40+ alloys | 150 | **R7**: Surface integrity prediction |
| PRISM_GRAPH_TOOLPATH.js | 6KB — Graph-based toolpath optimization | ~140 | **R7**: Novel toolpath strategies |
| PRISM_LOCAL_SEARCH.js | 13KB — Local search for parameter optimization | ~300 | **R7**: Cost optimization across solution space |
| PRISM_NURBS_MIT.js | 20.5KB — NURBS surface mathematics | ~480 | **R7**: Surface finish prediction |
| PRISM_BEZIER_MIT.js | 3.4KB — Bezier curve mathematics | ~80 | **R7**: Toolpath smoothing |
| PRISM_CONTROL_SYSTEMS_MIT.js | 3.9KB — Control theory for CNC servos | ~90 | **R7**: Adaptive feed override modeling |
| PRISM_SIGNAL_ALGORITHMS.js | 10.6KB — Signal processing for sensor data | ~250 | **R7**: Vibration analysis from accelerometer data |

**Utilization: ~6/52 files = 11.5%**

---

## 2. ENGINES — 257 Files, 6MB, 16 Subdirectories

### Currently Compiled in MCP Server (37 engines, 879KB)
ManufacturingCalculations, AdvancedCalculations, ThreadCalculation, Toolpath, Collision, Workholding, ToolBreakage, SpindleProtection, CoolantValidation, PredictiveFailure, PFP, MemoryGraph, Telemetry, Certificate, MultiTenant, NLHook, ProtocolBridge, Compliance, Knowledge, Skill, Script, Hook, Agent, Swarm, Session, ResponseTemplate, ComputationCache, EventBus, DiffEngine, TaskAgentClassifier, BatchProcessor, ManusATCSBridge, CalcHookMiddleware, SkillAutoLoader, SkillBundle

### NOT Compiled — Critical Manufacturing IP
| Subdirectory | Files | Size | Key Engines | Roadmap Gap |
|-------------|-------|------|-------------|-------------|
| ai_ml/ | 76 | 2.3MB | Regularization (507KB!), Aircut Elimination (308KB), Unified CAD Learning (193KB), Decision Tree (123KB), PSO Optimizer, RL Q-Learning, Deep Learning, Neural Hybrid | **R7**: AI-powered parameter optimization, learning from job history |
| cad_cam/ | 55 | 1.2MB | BVH (249KB), Geodesic Distance (161KB), Clipper2, BREP Generator, Feature Interaction, Multiaxis Toolpath, Rest Machining, Adaptive Clearing, Voxel Stock | **R7**: Feature recognition → automatic strategy selection |
| optimization/ | 25 | 557KB | Combinatorial (162KB), SQP Interior Point, MOEAD, Multi-Objective, Trust Region, Monte Carlo, Swarm | **R7**: Constrained optimization for cost/quality tradeoff |
| physics/ | 9 | 373KB | AI Physics Generator (164KB!), Physics Engine (101KB), Inverse Kinematics, Contact Constraint, Lathe Param, Unified Cutting | **R7**: Physics-informed parameter selection |
| post_processor/ | 12 | 302KB | Post Processor DB V2 (105KB), Internal Post, Post-100% Complete | **R3**: controller_optimize needs these |
| simulation/ | 7 | 98KB | Cutting Thermal (110KB), Thermal Expansion (66KB) | **R7**: Thermal compensation, surface integrity |
| tools/ | 9 | 139KB | Tool Performance (44KB), Tool 3D Generator | **R1**: Tool enrichment, **R7**: Tool wear prediction |
| quality/ | 3 | 34KB | Lean Six Sigma Kaizen (67KB) | **R7**: Quality prediction, SPC integration |
| business/ | 11 | 145KB | Intelligent Decision (59KB), PRISM_COST_DATABASE (288KB!) | **R7**: Full cost optimization |
| machines/ | 4 | 43KB | Machine 3D Model DB (71KB), Kinematics | **R1**: Machine enrichment |

**Utilization: 37/257 = 14.4%**

---

## 3. MIT COURSE INTEGRATION — 220 Courses, 850 Algorithms

### Course Database Structure
- `PRISM_220_COURSES_MASTER.js` — 220 courses across 12 universities
- `PRISM_UNIVERSITY_ALGORITHMS.js` — 201KB, 4,928 lines, 20 computational geometry algorithms with full implementations
- `PRISM_COURSE_GATEWAY_GENERATOR.js` — Route generation for algorithm access
- MIT-specific algorithm files: Bezier, Control Systems, DFM, Digital Control, Graphics, Linear Algebra, Numerical Methods, NURBS, ODE Solvers, Surface Geometry

### Key MIT Courses NOT Leveraged
| Course | Content | PRISM Application |
|--------|---------|-------------------|
| MIT 2.008 | Fundamentals of Manufacturing | Cutting force models, chip formation — **PARTIALLY USED** |
| MIT 2.158J | Computational Geometry | Mesh generation, Delaunay refinement — **IMPLEMENTED but not wired** |
| MIT 3.22 | Mechanical Behavior of Materials | Johnson-Cook constitutive models — **DATA EXISTS, not used** |
| MIT 6.241J | Dynamic Systems and Control | Kalman filter thermal compensation — **IMPLEMENTED but not wired** |
| MIT 2.810 | Manufacturing Processes | Process planning, DFM analysis — **R3 target** |
| MIT 15.084J | Nonlinear Programming | Interior point, SQP optimization — **ENGINE EXISTS, not used** |
| MIT 15.099 | Optimization Methods | PSO, GA, simulated annealing — **ENGINE EXISTS, not used** |
| MIT 18.086 | Numerical Methods | ODE solvers, FFT — **235KB ENGINE EXISTS, not used** |
| MIT 6.034 | AI Techniques | Decision trees, RL — **ENGINE EXISTS, not used** |
| MIT 2.080J | Structural Mechanics | Stress analysis, deflection — **FORMULAS EXIST, partially used** |

**Utilization: ~3/220 courses = 1.4% of available course knowledge actively deployed**

---

## 4. FORMULAS — 12 Files, 78KB

| Formula File | Size | Content | Status |
|-------------|------|---------|--------|
| PRISM_TOOL_WEAR_MODELS.js | 21KB | Extended Taylor, Usui, Takeyama-Murata, diffusion wear | ⚠️ Taylor used, advanced models NOT |
| PRISM_STRESS_ANALYSIS.js | 8.4KB | Von Mises, principal stress, fatigue life | ❌ NOT USED |
| PRISM_THERMAL_COMPENSATION.js | 7KB | Kalman filter thermal error prediction | ❌ NOT USED |
| PRISM_THERMAL_PROPERTIES.js | 5.5KB | Material thermal conductivity/diffusivity DB | ❌ NOT USED |
| PRISM_STRESS.js | 4.3KB | Basic stress calculations | ❌ NOT USED |
| PRISM_TOOL_LIFE_ESTIMATOR.js | 4.9KB | Simplified tool life estimation | ✅ USED (via ManufacturingCalc) |
| PRISM_MFG_PHYSICS.js | 6.8KB | Manufacturing physics calculations | ✅ PARTIALLY USED |
| PRISM_STANDALONE_CALCULATOR_API.js | 11.1KB | API wrapper for standalone calc access | ❌ NOT USED |
| PRISM_MATERIAL_PHYSICS.js | 2KB | Material physics properties | ⚠️ DATA EXISTS |
| PRISM_THERMAL_LOOKUP.js | 1.7KB | Thermal property lookup | ❌ NOT USED |
| PRISM_FORCE_LOOKUP.js | 2KB | Force calculation lookup tables | ✅ USED |
| PRISM_WEAR_LOOKUP.js | 3KB | Wear rate lookup | ❌ NOT USED |

**Utilization: 3/12 = 25%**

---

## 5. MATERIALS — 48+14+2+17 = 81 Files, 28MB

### Data Coverage
| Source | Files | Size | Records | Status |
|--------|-------|------|---------|--------|
| materials/ main | 48 | 10MB | 3,518 materials, 127 params | ⚠️ 14.8% loaded in registry (521/3,518) |
| materials_complete/ | 2 | 7.2MB | P_STEELS (5MB), M_STAINLESS (2.1MB) | ❌ NOT LOADED |
| materials_enhanced/ | 14 | 4.2MB | Tribology, composition, thermal data | ❌ NOT MERGED |
| materials_v9_complete/ | 17 | 431KB | v9 format materials | ⚠️ PARTIALLY LOADED |
| SCHEMA_127_PARAMETERS.js | 17KB | Full schema definition | ✅ SCHEMA EXISTS |

### What's Missing from Live Registry
- **Tribology data**: Friction coefficients, wear rates by material pair — exists in materials_enhanced/
- **Composition data**: Chemical composition for alloy identification — exists in materials_enhanced/
- **Thermal properties**: Conductivity, diffusivity, melting point — exists in PRISM_THERMAL_PROPERTIES.js
- **Johnson-Cook parameters**: Constitutive model data for 40+ alloys — exists in PRISM_JOHNSON_COOK_DATABASE.js
- **Machinability ratings**: Comparative machinability indices — exists but incomplete

**R1 covers this gap (MS5-MS9 registry loading). R7 leverages it for physics-based predictions.**

---

## 6. MACHINES — 109 Files, 5.3MB

| Category | Files | Status |
|----------|-------|--------|
| Machine specifications | ~80 | ⚠️ 48.8% loaded (402/824) |
| Machine 3D models | 3 | ❌ NOT USED (71KB) |
| Machine kinematics | 1 | ❌ NOT USED (14KB) |
| Controller expansion scripts | 25 | ✅ USED for alarm generation |

**R1-MS7 (Machine Deep Data) covers loading gap. R7 leverages kinematics for collision/motion planning.**

---

## 7. TOOLS — 2 Files, 61KB + 9 Engine Files, 139KB

| Source | Size | Content | Status |
|--------|------|---------|--------|
| PRISM_CUTTING_TOOL_DATABASE_V2.js | 54KB | 1,944 tool definitions | ❌ 0% LOADED |
| PRISM_TOOL_TYPES_COMPLETE.js | 6.3KB | Tool type taxonomy | ❌ NOT LOADED |
| PRISM_CUTTING_TOOL_EXPANSION_V3.js (ULTRA) | 2.6MB | Expanded tool database | ❌ NOT LOADED |
| PRISM_TOOL_HOLDER_INTERFACES_COMPLETE.js | 20KB | Tool holder specs | ❌ NOT USED |
| PRISM_TOOL_PERFORMANCE_ENGINE.js | 44KB | Tool wear/performance modeling | ❌ NOT USED |

**This is the single biggest gap. R1-MS5 (Tool Schema Normalization) is critical path.**

---

## 8. WORKHOLDING — 3 Extracted + 1 MCP Engine

| Source | Size | Content | Status |
|--------|------|---------|--------|
| PRISM_WORKHOLDING_ENGINE.js (extracted) | 4KB | Basic workholding calcs | ❌ SUPERSEDED |
| PRISM_WORKHOLDING_DATABASE.js | 8.8KB | Fixture types/specs | ❌ NOT LOADED |
| PRISM_FIXTURE_DATABASE.js | 12.8KB | Fixture specifications | ❌ NOT LOADED |
| WorkholdingEngine.ts (MCP, 45KB) | 45KB | Full physics engine | ✅ ACTIVE |
| PRISM_FIXTURE_DATABASE.js (ULTRA, 2.4MB) | 2.4MB | Comprehensive fixture DB | ❌ NOT LOADED |

**WorkholdingEngine.ts has the physics but no data to drive recommendations. R7-MS2 fixes this.**

---

## 9. CONTROLLERS & ALARMS — 119 Files, 22.9MB

| Category | Files | Size | Status |
|----------|-------|------|--------|
| Alarm databases (all variants) | 65 | 13.6MB | ✅ 9,200+ loaded |
| Controller expansion scripts | 25+ | ~500KB | ✅ USED for generation |
| Verified alarms | 12 | 801KB | ✅ QUALITY CHECKED |

**Best-utilized category. Alarms are 100% loaded. R3-MS3 (controller_optimize) adds G-code optimization.**

---

## 10. BUSINESS/COST — 7 Files, 336KB

| Source | Size | Content | Status |
|--------|------|---------|--------|
| PRISM_COST_DATABASE.js | 288KB | Machine rates, labor, overhead, tool costs | ❌ NOT LOADED |
| PRISM_SCHEDULING_ENGINE.js | 5.8KB | Job scheduling algorithms | ❌ NOT USED |
| PRISM_SHOP_OPTIMIZER.js | 11.3KB | Multi-machine shop optimization | ❌ NOT USED |
| PRISM_SHOP_ANALYTICS_ENGINE.js | 7.2KB | Production analytics | ❌ NOT USED |
| PRISM_SHOP_LEARNING_ENGINE.js | 8.4KB | Learning from production data | ❌ NOT USED |

**R3 process_cost uses basic cost calc. R7 elevates this to full cost optimization with shop-level scheduling.**

---

## 11. MANUFACTURER CATALOGS — 160 PDFs, 9.7GB

| Manufacturer | Catalog | Size |
|-------------|---------|------|
| Sandvik Coromant | Turning, Milling, Drilling, Tooling (6 catalogs) | ~245MB |
| Kennametal | Turning, Milling, Holemaking, Threading, Tooling (5) | ~190MB |
| ISCAR | Master Catalog Part 1 | 353MB |
| Walter | Master Catalog 2022 (Metric + Inch) | 412MB |
| OSG | Full Catalog | 109MB |
| Ingersoll | Cutting Tools | 104MB |
| Emuge | Threading/Clamping | 232MB |
| Guhring | Full Catalog + Tool Holders | 49MB |
| SGS | Global Catalog | 16MB |
| MA Ford | Product Catalog | 161MB |
| YG-1 | America Catalog | 386MB |
| Haimer | USA Master Catalog (Toolholding) | 352MB |
| REGO-FIX | Toolholding 2026 | 207MB |
| Korloy | Solid + Rotating + Turning | 191MB |
| BIG Daishowa | High Performance Tooling V5 | 24MB |
| Accupro | Full Catalog | 42MB |
| Orange Vise | Workholding | 3MB |
| Rapidkut | Catalog | 4MB |
| Zeni | Full Catalog | 182MB |
| + others | Various | ~1.5GB |

**Status: 0% extracted into structured data. These are raw PDFs. R7-MS5 (Catalog Intelligence) addresses this.**

---

## 12. SKILLS — 102 Consolidated Skills, 1.1MB

### Manufacturing-Critical Skills NOT Wired to MCP
| Skill | Size | Content | Why It Matters |
|-------|------|---------|----------------|
| prism-cutting-mechanics | 18.9KB | Merchant, Kienzle, milling forces, tool life | Core physics — partially wired |
| prism-material-physics | 37.5KB | Material behavior, constitutive models | R7 physics-based predictions |
| prism-combination-engine | 17KB | Multi-parameter optimization combinatorics | R7 solution space exploration |
| prism-process-optimizer | 23.9KB | 12 metrics, 39 skill formulas, P(x) component | R7 automated process optimization |
| prism-master-equation | 21.7KB | Ic(x) = RA-CA-PA-SA-L quality function | Could drive auto-validation |
| prism-signal-processing | 18.6KB | FFT, filtering, vibration analysis | R7 chatter prediction |
| prism-cam-strategies | 12.9KB | Strategy selection logic | R3 toolpath recommendation |
| prism-formula-evolution | 18.2KB | Formula versioning and evolution tracking | R2 safety validation |
| prism-fanuc-programming | 54.6KB | Fanuc G-code patterns and best practices | R3 controller_optimize |
| prism-heidenhain-programming | 53KB | Heidenhain conversational programming | R3 controller_optimize |
| prism-siemens-programming | 51.5KB | Sinumerik programming reference | R3 controller_optimize |
| prism-speed-feed-engine | 14.3KB | Speed/feed calculation methodology | Core — already wired |
| prism-gcode-reference | 62KB | Complete G-code reference across controllers | R3 controller_optimize |
| prism-workholding-strategy | 2.9KB | Workholding selection methodology | R7 fixture recommendation |
| prism-threading-mastery | 3.6KB | Advanced threading techniques | R3 thread chain enhancement |
| prism-uncertainty-propagation | 6.1KB | Uncertainty chain methodology | R3 uncertainty_chain |
| prism-synergy-calculator | 10.8KB | Cross-system synergy calculation | Meta-optimization |
| prism-expert-personas | 9.8KB | 57 manufacturing expert personas | R3 AI consultation chains |

---

## 13. UNLEVERAGED ASSET CATEGORIES

### A. Complete Extraction (831 files, 10.7MB)
Categories by filename prefix analysis:
- 26 AI-prefixed files (AI agents, connectors, orchestration)
- 15 UNIFIED files (unified engines consolidating multiple sources)
- 14 ENHANCED files (enhanced versions of base engines)
- 14 TOOL files (tool-related engines and databases)
- 13 ADVANCED files (advanced algorithm implementations)
- 13 PHASE3 files (Phase 3 deep learning implementations)
- 11 PHASE2 files (Phase 2 ML implementations)
- 10 PHASE1 files (Phase 1 base implementations)
- 10 MACHINE files (machine-specific engines)
- 8 LATHE files (lathe-specific calculations)
- 8 CAD files (CAD kernel components)
- 8 MIT files (MIT course implementations)
- 7 CATALOG files (catalog-related engines)
- 7 NURBS files (NURBS surface mathematics)
- 7 POST files (post-processor engines)
- 7 MESH files (mesh generation/processing)
- 7 CAM files (CAM kernel components)
- 7 CALCULATOR files (standalone calculators)
- 6 FEATURE files (feature recognition engines)

### B. GIANT Extractions (10 files, 63MB)
Monster files containing consolidated functionality:
- PRISM_SUBSCRIPTION_SYSTEM.js — 8.3MB (business model)
- PRISM_PSO_OPTIMIZER.js — 8MB (particle swarm optimization)
- PRISM_AI_100_KB_CONNECTOR.js — 6.9MB (AI knowledge base)
- PRISM_SIGNAL_ENHANCED.js — 6.7MB (signal processing)
- PRISM_POST_PROCESSOR_GENERATOR.js — 6.2MB (post-processor generation)
- PRISM_PRECISION.js — 5.2MB (precision calculations)

### C. ULTRA Extractions (17 files, 47MB)
Large consolidated engines:
- PRISM_PHASE6_DEEPLEARNING.js — 4.3MB
- PRISM_EXPANDED_CAD_CAM_LIBRARY.js — 4.1MB
- PRISM_EMBEDDED_PARTS_DATABASE.js — 4MB
- PRISM_CUSTOMER_MANAGER.js — 3.1MB
- PRISM_EKF.js — 3MB (Extended Kalman Filter)
- PRISM_CUTTING_TOOL_EXPANSION_V3.js — 2.6MB
- PRISM_TAYLOR_COMPLETE.js — 2MB
- PRISM_FIXTURE_DATABASE.js — 2.4MB
- PRISM_ROUGHING_LOGIC.js — 2.8MB

---

## 14. UTILIZATION SUMMARY

| Category | Total Assets | Active in MCP | Utilization | Roadmap Coverage |
|----------|-------------|---------------|-------------|------------------|
| Algorithms | 52 files, 210 algorithms | 6 | 11.5% | R3 partial, R7 needed |
| Engines | 257 files | 37 | 14.4% | R7 needed |
| Formulas | 12 files | 3 | 25% | R7 needed |
| Materials | 81 files, 3,518 materials | 521 loaded | 14.8% | R1 ✅ |
| Machines | 109 files, 824 machines | 402 loaded | 48.8% | R1 ✅ |
| Tools | 2+9 files, 1,944 tools | 0 loaded | 0% | R1 ✅ |
| Workholding | 4 files | 1 engine active | 25% | R7 needed |
| Alarms | 65 files, 9,200 codes | ~9,200 | ~100% | ✅ DONE |
| Business/Cost | 7 files | 1 basic calc | 14% | R7 needed |
| MIT Courses | 220 courses, 850 algorithms | ~3 | 1.4% | R7 needed |
| Skills | 102 skills | ~15 wired | 14.7% | R3/R7 needed |
| Manufacturer Catalogs | 160 PDFs, 9.7GB | 0 | 0% | R7 needed |

### Overall Weighted Utilization: ~18%

### With R1-R3 Complete: ~45%

### With R1-R3-R7 Complete: ~85%

---

## 15. CRITICAL PATH TO 85%+ UTILIZATION

1. **R1 (Registry Loading)** — Materials 14.8%→90%, Machines 48.8%→95%, Tools 0%→90%
2. **R3 (Campaign Actions)** — Wire algorithms to job_plan, what_if, uncertainty_chain
3. **R7-MS0** — Wire Johnson-Cook + thermal models to physics predictions
4. **R7-MS1** — Wire optimization engines to cost/quality tradeoff
5. **R7-MS2** — Wire workholding/fixture database to recommendation engine
6. **R7-MS3** — Wire AI/ML engines to learning-from-jobs pipeline
7. **R7-MS4** — Wire MIT course algorithms to advanced analysis
8. **R7-MS5** — Extract structured data from manufacturer catalogs (9.7GB)

---

*This inventory was generated by auditing every directory under C:\PRISM\ and cross-referencing against the live MCP server's compiled engines, registries, and dispatcher actions.*
