# PRISM MANUFACTURING INTELLIGENCE
# HYBRID REBUILD DEVELOPMENT PROMPT v1.0
## Strategy: EXTRACT EVERYTHING → ARCHITECT → MIGRATE WITH 100% UTILIZATION

**Created:** January 19, 2026
**Supersedes:** v12.0, v14.0 (Monolith Development Prompts)
**Source Build:** v8.89.002 (986,621 lines, 831 modules, ~48MB)

---

# ⚠️ THE FUNDAMENTAL CHANGE

```
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                          ║
║   OLD APPROACH (v12-v14):                                                                ║
║   "Add modules to monolith, then wire them together later"                               ║
║   RESULT: 831 modules at ~25% utilization                                                ║
║                                                                                          ║
║   NEW APPROACH (Hybrid v1.0):                                                            ║
║   "Extract everything → Design architecture → Import ONLY with 100% wiring"              ║
║   RESULT: Same capabilities, 100% utilization by design                                  ║
║                                                                                          ║
║   KEY PRINCIPLE: NO MODULE EXISTS WITHOUT ALL CONSUMERS DEFINED AND CONNECTED            ║
║                                                                                          ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝
```

---

# PART 1: COMPLETE EXTRACTION MANIFEST

## 1.1 What We're Extracting (831 Modules Total)

### CATEGORY A: DATABASES (62 Total)
```
MATERIALS DATABASES (6):
├── PRISM_MATERIAL_KC_DATABASE          - Kienzle cutting coefficients
├── PRISM_ENHANCED_MATERIAL_DATABASE    - Enhanced material properties
├── PRISM_EXTENDED_MATERIAL_CUTTING_DB  - Extended cutting data
├── PRISM_JOHNSON_COOK_DATABASE         - Johnson-Cook parameters
├── PRISM_MATERIALS_MASTER              - Master material registry (618 materials)
└── PRISM_CONSOLIDATED_MATERIALS        - Consolidated material data

MACHINE DATABASES (7):
├── PRISM_POST_MACHINE_DATABASE         - Post processor machine configs
├── PRISM_LATHE_MACHINE_DB              - Lathe specifications
├── PRISM_LATHE_V2_MACHINE_DATABASE_V2  - Lathe V2 specifications
├── PRISM_MACHINE_3D_DATABASE           - 3D machine models
├── PRISM_MACHINE_3D_MODEL_DATABASE_V2  - 3D models V2
├── PRISM_MACHINE_3D_MODEL_DATABASE_V3  - 3D models V3
└── PRISM_OKUMA_MACHINE_CAD_DATABASE    - Okuma-specific CAD models

TOOL DATABASES (7):
├── PRISM_TOOL_DATABASE_V7              - Master tool database
├── PRISM_CUTTING_TOOL_DATABASE_V2      - Cutting tool specs
├── PRISM_STEEL_ENDMILL_DB_V2           - Steel end mill data
├── PRISM_TOOL_PROPERTIES_DATABASE      - Tool properties
├── PRISM_TOOL_HOLDER_3D_DATABASE       - Tool holder 3D models
├── PRISM_AI_TOOLPATH_DATABASE          - AI toolpath data
└── PRISM_TDM_TOOL_MANAGEMENT_DATABASE  - Tool management

WORKHOLDING DATABASES (10):
├── PRISM_WORKHOLDING_DATABASE          - Master workholding
├── PRISM_FIXTURE_DATABASE              - Fixture data
├── PRISM_HYPERMILL_FIXTURE_DATABASE    - HyperMill fixtures
├── PRISM_KURT_VISE_DATABASE            - Kurt vise specs
├── PRISM_CHUCK_DATABASE_V2             - Chuck specifications
├── PRISM_SCHUNK_DATABASE               - Schunk workholding
├── PRISM_SCHUNK_TOOLHOLDER_DATABASE    - Schunk tool holders
├── PRISM_LANG_DATABASE                 - Lang workholding
├── PRISM_JERGENS_DATABASE              - Jergens fixtures
└── PRISM_BIG_DAISHOWA_HOLDER_DATABASE  - Big Daishowa holders

POST PROCESSOR DATABASES (7):
├── PRISM_CONTROLLER_DATABASE           - CNC controller definitions
├── PRISM_POST_PROCESSOR_DATABASE_V2    - Post processor configs
├── PRISM_ENHANCED_POST_DATABASE_V2     - Enhanced posts
├── PRISM_VERIFIED_POST_DATABASE_V2     - Verified posts
├── PRISM_FUSION_POST_DATABASE          - Fusion 360 posts
├── PRISM_OKUMA_LATHE_GCODE_DATABASE    - Okuma G-codes
└── PRISM_OKUMA_LATHE_MCODE_DATABASE    - Okuma M-codes

PROCESS/MANUFACTURING DATABASES (6):
├── PRISM_MACHINING_PROCESS_DATABASE    - Machining processes
├── PRISM_OPERATION_PARAM_DATABASE      - Operation parameters
├── PRISM_SURFACE_FINISH_DATABASE       - Surface finish data
├── PRISM_THREAD_STANDARD_DATABASE      - Thread standards
├── PRISM_CNC_SAFETY_DATABASE           - CNC safety data
└── PRISM_STOCK_POSITIONS_DATABASE      - Stock positions

BUSINESS/COST DATABASES (4):
├── PRISM_COST_DATABASE                 - Cost data
├── PRISM_COMPOUND_JOB_PROPERTIES_DATABASE - Job properties
├── PRISM_REPORT_TEMPLATES_DATABASE     - Report templates
└── PRISM_CAPABILITY_ASSESSMENT_DATABASE - Capability data

AI/ML DATABASES (3):
├── PRISM_ML_TRAINING_PATTERNS_DATABASE - ML training patterns
├── PRISM_AI_TOOLPATH_DATABASE          - AI toolpath data
└── PRISM_AI_100_DATABASE_REGISTRY      - AI database registry

CAD/CAM DATABASES (3):
├── PRISM_MASTER_CAD_CAM_DATABASE       - Master CAD/CAM
├── PRISM_AUTOMATION_VARIANTS_DATABASE  - Automation variants
└── PRISM_EMBEDDED_PARTS_DATABASE       - Embedded parts

MANUFACTURER DATABASES (3):
├── PRISM_MANUFACTURER_CATALOG_DB       - Manufacturer catalogs
├── PRISM_UNIFIED_MANUFACTURER_DATABASE - Unified manufacturer
└── PRISM_MAJOR_MANUFACTURERS_CATALOG   - Major manufacturers

INFRASTRUCTURE DATABASES (6):
├── PRISM_MASTER_DB                     - Master database
├── PRISM_DATABASE_HUB                  - Database hub
├── PRISM_DATABASE_MANAGER              - Database manager
├── PRISM_DATABASE_RETROFIT             - Database retrofit
├── PRISM_DATABASE_STATE                - Database state
└── PRISM_MACRO_DATABASE_SCHEMA         - Macro schemas
```

### CATEGORY B: ENGINES (213 Total)

```
CAD ENGINES (25):
├── PRISM_BREP_TESSELLATOR, PRISM_CSG_ENGINE, PRISM_CSG_BOOLEAN_ENGINE
├── PRISM_BSPLINE_ENGINE, PRISM_NURBS_ADVANCED_ENGINE
├── PRISM_BEZIER_INTERSECTION_ENGINE, PRISM_SKETCH_ENGINE
├── PRISM_SOLID_EDITING_ENGINE, PRISM_FILLETING_ENGINE
├── PRISM_VARIABLE_RADIUS_FILLET_ENGINE, PRISM_OFFSET_SURFACE_ENGINE
├── PRISM_SURFACE_INTERSECTION_ENGINE, PRISM_SURFACE_RECONSTRUCTION_ENGINE
├── PRISM_CURVATURE_ANALYSIS_ENGINE, PRISM_MESH_REPAIR_ENGINE
├── PRISM_MESH_DECIMATION_ENGINE, PRISM_MESH_BOOLEAN_ADVANCED_ENGINE
├── PRISM_MESH_SEGMENTATION_ENGINE, PRISM_MESH_DEFORMATION_ENGINE
├── PRISM_ADAPTIVE_TESSELLATION_ENGINE_V2, PRISM_BOSS_DETECTION_ENGINE
├── PRISM_COMPLETE_FEATURE_ENGINE, PRISM_FEATURE_CURVES_ENGINE
├── PRISM_CONSTRUCTION_GEOMETRY_ENGINE, PRISM_CAD_QUALITY_ASSURANCE_ENGINE
└── + More...

CAM/TOOLPATH ENGINES (20):
├── PRISM_2D_TOOLPATH_ENGINE, PRISM_3D_TOOLPATH_STRATEGY_ENGINE
├── PRISM_MULTIAXIS_TOOLPATH_ENGINE, PRISM_ADAPTIVE_CLEARING_ENGINE
├── PRISM_ADAPTIVE_HSM_ENGINE, PRISM_REST_MACHINING_ENGINE
├── PRISM_INTELLIGENT_REST_MACHINING, PRISM_DEEP_HOLE_DRILLING_ENGINE
├── PRISM_HELICAL_DRILLING_ENGINE, PRISM_THREAD_MILLING_ENGINE
├── PRISM_LATHE_TOOLPATH_ENGINE, PRISM_ENTRY_EXIT_STRATEGIES
├── PRISM_AIRCUT_ELIMINATION_ENGINE, PRISM_RAPIDS_OPTIMIZER
├── PRISM_HYBRID_TOOLPATH_SYNTHESIZER, PRISM_REAL_TOOLPATH_ENGINE
└── + More...

PHYSICS/DYNAMICS ENGINES (42):
├── PRISM_CUTTING_MECHANICS_ENGINE, PRISM_CUTTING_THERMAL_ENGINE
├── PRISM_HEAT_TRANSFER_ENGINE, PRISM_THERMAL_EXPANSION_ENGINE
├── PRISM_CHATTER_PREDICTION_ENGINE, PRISM_VIBRATION_ANALYSIS_ENGINE
├── PRISM_TOOL_LIFE_ENGINE, PRISM_TOOL_WEAR_MODELS
├── PRISM_SURFACE_FINISH_ENGINE, PRISM_RIGID_BODY_DYNAMICS_ENGINE
├── PRISM_MATERIAL_SIMULATION_ENGINE, PRISM_STRESS_ANALYSIS
├── PRISM_FATIGUE, PRISM_FRACTURE
└── + More...

AI/ML ENGINES (74):
├── PRISM_PSO_OPTIMIZER, PRISM_ACO_SEQUENCER
├── PRISM_BAYESIAN_SYSTEM, PRISM_BAYESIAN_LEARNING
├── PRISM_MONTE_CARLO, PRISM_MONTE_CARLO_ENGINE
├── PRISM_KALMAN_FILTER, PRISM_EKF_ENGINE
├── PRISM_NEURAL_NETWORK, PRISM_NEURAL_ENGINE_ENHANCED
├── PRISM_DQN_ENGINE, PRISM_ADVANCED_DQN
├── PRISM_TRANSFORMER_ENGINE, PRISM_ATTENTION_ENGINE
├── PRISM_GNN, PRISM_GNN_COMPLETE
├── PRISM_CLUSTERING_ENGINE, PRISM_DECISION_TREE_ENGINE
├── PRISM_ENSEMBLE_ENGINE, PRISM_XAI_ENGINE
└── + More...

OPTIMIZATION ENGINES (44):
├── PRISM_MULTI_OBJECTIVE_OPTIMIZER, PRISM_CONSTRAINED_OPTIMIZER
├── PRISM_INTERIOR_POINT_ENGINE, PRISM_TRUST_REGION_OPTIMIZER
├── PRISM_METAHEURISTIC_OPTIMIZATION, PRISM_EVOLUTIONARY_ENHANCED_ENGINE
├── PRISM_COMBINATORIAL_OPTIMIZER, PRISM_LOCAL_SEARCH
├── PRISM_ROBUST_OPTIMIZATION, PRISM_HYPEROPT
└── + More...

SIGNAL PROCESSING ENGINES (14):
├── PRISM_FFT_PREDICTIVE_CHATTER, PRISM_WAVELET_CHATTER
├── PRISM_SIGNAL_PROCESSING, PRISM_SIGNAL_ENHANCED
└── + More...

POST PROCESSOR ENGINES (25):
├── PRISM_POST_PROCESSOR_GENERATOR, PRISM_INTERNAL_POST_ENGINE
├── PRISM_UNIVERSAL_POST_GENERATOR_V, PRISM_GUARANTEED_POST_PROCESSOR
├── PRISM_GCODE_PROGRAMMING_ENGINE, PRISM_GCODE_BACKPLOT_ENGINE
└── + More...

COLLISION/SIMULATION ENGINES (15):
├── PRISM_COLLISION_ENGINE, PRISM_ADVANCED_COLLISION_ENGINE
├── PRISM_INTELLIGENT_COLLISION_SYSTEM, PRISM_PROBABILISTIC_COLLISION
├── PRISM_MACHINE_SIMULATION_ENGINE, PRISM_VERICUT_STYLE_SIMULATION
└── + More...
```

### CATEGORY C: KNOWLEDGE BASES (14 Total)
```
├── PRISM_KNOWLEDGE_BASE                - Core knowledge base
├── PRISM_KNOWLEDGE_GRAPH               - Knowledge graph
├── PRISM_KNOWLEDGE_FUSION              - Knowledge fusion
├── PRISM_AI_KNOWLEDGE_INTEGRATION      - AI knowledge integration
├── PRISM_ALGORITHMS_KB                 - Algorithms knowledge base
├── PRISM_DATA_STRUCTURES_KB            - Data structures KB
├── PRISM_MFG_STRUCTURES_KB             - Manufacturing structures KB
├── PRISM_AI_STRUCTURES_KB              - AI structures KB
├── PRISM_SYSTEMS_KB                    - Systems KB
├── PRISM_AI_100_KB_CONNECTOR           - AI 100% KB connector
├── PRISM_KNOWLEDGE_AI_CONNECTOR        - Knowledge AI connector
├── PRISM_KNOWLEDGE_INTEGRATION_ROUTES  - Knowledge routes
├── PRISM_KNOWLEDGE_INTEGRATION_TESTS   - Knowledge tests
└── PRISM_PHASE7_KNOWLEDGE              - Phase 7 knowledge
```

### CATEGORY D: SYSTEMS & CORES (31 Total)
```
├── PRISM_GATEWAY                       - Central routing (500+ routes)
├── PRISM_GATEWAY_ENHANCED              - Enhanced gateway
├── PRISM_EVENT_BUS                     - Pub/sub events
├── PRISM_STATE_STORE                   - Centralized state
├── PRISM_ERROR_BOUNDARY                - Error handling
├── PRISM_VALIDATOR                     - Input validation
├── PRISM_COMPARE                       - Float-safe comparisons
├── PRISM_UNITS                         - Unit conversion
├── PRISM_UNITS_ENHANCED                - Enhanced units
├── PRISM_CONSTANTS                     - Immutable constants
├── PRISM_UI_ADAPTER                    - UI abstraction
├── PRISM_CAPABILITY_REGISTRY           - Module capabilities
├── PRISM_INIT_ORCHESTRATOR             - Initialization
├── PRISM_MASTER_ORCHESTRATOR           - Master orchestration
└── + More...
```

### CATEGORY E: LEARNING MODULES (30 Total)
```
├── PRISM_AI_LEARNING_PIPELINE          - Learning pipeline
├── PRISM_LEARNING_ENGINE               - Core learning
├── PRISM_LEARNING_PERSISTENCE_ENGINE   - Learning persistence
├── PRISM_LEARNING_FEEDBACK_CONNECTOR   - Feedback connector
├── PRISM_CAD_LEARNING_BRIDGE           - CAD learning
├── PRISM_CAM_LEARNING_ENGINE           - CAM learning
├── PRISM_QUOTING_LEARNING              - Quote learning
├── PRISM_SHOP_LEARNING_ENGINE          - Shop learning
├── PRISM_ONLINE_LEARNING               - Online learning
├── PRISM_CONTINUAL_LEARNING            - Continual learning
├── PRISM_ACTIVE_LEARNING               - Active learning
└── + More...
```

### CATEGORY F: BUSINESS/QUOTING (22 Total)
```
├── PRISM_QUOTING_ENGINE                - Quote generation
├── PRISM_JOB_COSTING_ENGINE            - Job costing
├── PRISM_COST_ESTIMATION               - Cost estimation
├── PRISM_SCHEDULING_ENGINE             - Scheduling
├── PRISM_JOB_SHOP_SCHEDULING_ENGINE    - Job shop scheduling
├── PRISM_PRODUCTION_SCHEDULER          - Production scheduling
├── PRISM_INVENTORY_ENGINE              - Inventory
├── PRISM_PURCHASING_SYSTEM             - Purchasing
├── PRISM_CUSTOMER_MANAGER              - Customer management
├── PRISM_ORDER_MANAGER                 - Order management
├── PRISM_FINANCIAL_ENGINE              - Financial calculations
└── + More...
```

### CATEGORY G: UI COMPONENTS (16 Total)
```
├── PRISM_UI_SYSTEM                     - Main UI system
├── PRISM_UI_SYSTEM_COMPLETE            - Complete UI
├── PRISM_MODAL_MANAGER                 - Modal management
├── PRISM_DROPDOWN_SYSTEM               - Dropdowns
├── PRISM_SLIDER_SYSTEM                 - Sliders
├── PRISM_TOAST_SYSTEM                  - Notifications
├── PRISM_CHARTS                        - Chart visualization
├── PRISM_FORMS                         - Form handling
├── PRISM_DESIGN_TOKENS                 - Design system
└── + More...
```

### CATEGORY H: LOOKUPS & CONSTANTS (20 Total)
```
├── PRISM_COATING_LOOKUP                - Coating data
├── PRISM_COOLANT_LOOKUP                - Coolant data
├── PRISM_MANUFACTURER_LOOKUP           - Manufacturer data
├── PRISM_TAYLOR_LOOKUP                 - Taylor coefficients
├── PRISM_FORCE_LOOKUP                  - Force constants
├── PRISM_DRILLING_LOOKUP               - Drilling parameters
├── PRISM_TOOL_GEOMETRY_LOOKUP          - Tool geometry
├── PRISM_SURFACE_FINISH_LOOKUP         - Surface finish
├── PRISM_WORK_HOLDING_LOOKUP           - Workholding
├── PRISM_THERMAL_LOOKUP                - Thermal data
├── PRISM_STABILITY_LOOKUP              - Stability data
├── PRISM_WEAR_LOOKUP                   - Wear data
├── PRISM_THREADING_LOOKUP              - Threading data
└── + More...
```

### CATEGORY I: MANUFACTURER-SPECIFIC (44+ Catalogs/Modules)
```
├── PRISM_ZENI_COMPLETE_CATALOG         - Zeni tools
├── PRISM_MAJOR_MANUFACTURERS_CATALOG   - Major manufacturers
├── PRISM_MANUFACTURERS_CATALOG_BATCH2  - Batch 2 catalogs
├── PRISM_OKUMA_LATHE_INTEGRATION       - Okuma integration
├── PRISM_SIEMENS_*                     - Siemens modules
└── + All manufacturer-specific data...
```

### CATEGORY J: PHASE MODULES (46 Total)
```
PRISM_PHASE1_* through PRISM_PHASE4_* modules
└── Algorithm integration, coordinators, self-tests
```

---

# PART 2: THE FOUR STAGES

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         HYBRID REBUILD - FOUR STAGES                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  STAGE 0: PREPARATION                    ← WE ARE HERE                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                                       │
│  • Create this development prompt ✓                                                     │
│  • Define complete data flow architecture                                               │
│  • Create utilization enforcement specification                                         │
│  • Define micro-session templates                                                       │
│  Duration: 1-2 sessions                                                                 │
│                                                                                         │
│  STAGE 1: EXTRACTION                                                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━                                                              │
│  • Extract ALL 831 modules into categorized files                                       │
│  • Audit each module for completeness                                                   │
│  • Document dependencies (what each module NEEDS)                                       │
│  • Document outputs (what each module PRODUCES)                                         │
│  Duration: 15-25 micro-sessions                                                         │
│                                                                                         │
│  STAGE 2: ARCHITECTURE                                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━                                                             │
│  • Build PRISM_CORE with enforcement mechanisms                                         │
│  • Create PRISM_DATA_BUS for mandatory wiring                                           │
│  • Implement utilization verification that BLOCKS incomplete modules                    │
│  • Design the UI shell                                                                  │
│  Duration: 3-5 micro-sessions                                                           │
│                                                                                         │
│  STAGE 3: MIGRATION WITH 100% WIRING                                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                                 │
│  • Import databases ONE AT A TIME with ALL consumers                                    │
│  • Import engines with ALL use cases                                                    │
│  • Verify utilization after each import                                                 │
│  • NO module enters without 100% wiring proof                                           │
│  Duration: 50-100 micro-sessions                                                        │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# PART 3: MICRO-SESSION STRUCTURE

## 3.1 Session Boundaries

**CRITICAL: Each micro-session must be:**
- Completable in ONE Claude conversation (~10-15 exchanges)
- Self-contained (doesn't require previous session context in memory)
- Verifiable (clear success criteria)
- Documented (produces handoff artifact)

**Maximum session scope:**
- 500-1000 lines of extracted/new code
- OR 20-30 database entries with full consumer wiring
- OR 1-3 complete module extractions with documentation

## 3.2 Session Naming Convention

```
STAGE.CATEGORY.NUMBER - DESCRIPTION

STAGE 0: Preparation
  0.0.1 - Create Development Prompt (this document)
  0.0.2 - Create Data Flow Architecture
  0.0.3 - Create Utilization Enforcement Spec

STAGE 1: Extraction
  1.A.1 - Extract Materials Databases (6 databases)
  1.A.2 - Extract Machine Databases (7 databases)
  1.A.3 - Extract Tool Databases (7 databases)
  1.A.4 - Extract Workholding Databases (10 databases)
  1.A.5 - Extract Post Processor Databases (7 databases)
  1.A.6 - Extract Process Databases (6 databases)
  1.A.7 - Extract Business Databases (4 databases)
  1.A.8 - Extract AI/ML Databases (3 databases)
  1.A.9 - Extract CAD/CAM Databases (3 databases)
  1.A.10 - Extract Manufacturer Databases (3 databases)
  1.A.11 - Extract Infrastructure Databases (6 databases)
  
  1.B.1 - Extract CAD Engines (25 engines)
  1.B.2 - Extract CAM Engines (20 engines)
  1.B.3 - Extract Physics Engines Part 1 (21 engines)
  1.B.4 - Extract Physics Engines Part 2 (21 engines)
  1.B.5 - Extract AI/ML Engines Part 1 (25 engines)
  1.B.6 - Extract AI/ML Engines Part 2 (25 engines)
  1.B.7 - Extract AI/ML Engines Part 3 (24 engines)
  1.B.8 - Extract Optimization Engines (44 engines)
  1.B.9 - Extract Signal Processing Engines (14 engines)
  1.B.10 - Extract Post Processor Engines (25 engines)
  1.B.11 - Extract Collision/Simulation Engines (15 engines)
  
  1.C.1 - Extract Knowledge Bases (14 KBs)
  1.D.1 - Extract Systems & Cores (31 modules)
  1.E.1 - Extract Learning Modules (30 modules)
  1.F.1 - Extract Business Modules (22 modules)
  1.G.1 - Extract UI Components (16 modules)
  1.H.1 - Extract Lookups & Constants (20 modules)
  1.I.1 - Extract Manufacturer Catalogs Part 1 (22 catalogs)
  1.I.2 - Extract Manufacturer Catalogs Part 2 (22 catalogs)
  1.J.1 - Extract Phase Modules (46 modules)

STAGE 2: Architecture
  2.1.1 - Build PRISM_CORE Framework
  2.1.2 - Build PRISM_DATA_BUS
  2.1.3 - Build Utilization Enforcer
  2.1.4 - Build UI Shell
  2.1.5 - Build Test Framework

STAGE 3: Migration
  3.1.1 - Migrate PRISM_CONSTANTS + All Consumers
  3.1.2 - Migrate PRISM_UNITS + All Consumers
  3.1.3 - Migrate PRISM_VALIDATOR + All Consumers
  3.1.4 - Migrate PRISM_GATEWAY + All Consumers
  ...
  3.2.1 - Migrate PRISM_MATERIALS_MASTER + All Consumers (15+ consumers)
  3.2.2 - Migrate PRISM_MACHINES_DATABASE + All Consumers (12+ consumers)
  ...
```

## 3.3 Session Templates

### EXTRACTION SESSION TEMPLATE
```markdown
# SESSION [1.X.Y]: Extract [CATEGORY]
## Status: [NOT STARTED | IN PROGRESS | COMPLETE]

### Scope
- Modules to extract: [LIST]
- Expected lines: [NUMBER]
- Output files: [LIST]

### Pre-Session Checklist
☐ Previous session handoff reviewed
☐ Source file accessible (PRISM_v8_89_002_TRUE_100_PERCENT.html)
☐ Output directory ready

### Extraction Tasks
☐ Extract module 1: [NAME]
  - Lines: [START]-[END]
  - Output: /extracted/[category]/[name].js
☐ Extract module 2: [NAME]
  ...

### Post-Extraction Audit
For each module:
☐ All functions present
☐ All data present
☐ Dependencies documented
☐ Outputs documented

### Session Handoff
- Modules extracted: [COUNT]
- Lines extracted: [COUNT]
- Issues found: [LIST]
- Next session: [ID]
```

### MIGRATION SESSION TEMPLATE
```markdown
# SESSION [3.X.Y]: Migrate [MODULE] + All Consumers
## Status: [NOT STARTED | IN PROGRESS | COMPLETE]

### Module Being Migrated
- Name: [PRISM_MODULE_NAME]
- Category: [DATABASE | ENGINE | SYSTEM | etc.]
- Source file: /extracted/[category]/[name].js

### Required Consumers (MUST ALL BE WIRED)
| # | Consumer | Uses These Fields | Gateway Route |
|---|----------|-------------------|---------------|
| 1 | [Consumer 1] | [fields] | [route] |
| 2 | [Consumer 2] | [fields] | [route] |
...
| 15+ | [Consumer N] | [fields] | [route] |

### Pre-Migration Checklist
☐ Module extracted and audited
☐ All consumers identified
☐ Gateway routes designed
☐ Test cases defined

### Migration Tasks
☐ Import module to new architecture
☐ Wire consumer 1: [NAME]
☐ Wire consumer 2: [NAME]
...
☐ Wire consumer N: [NAME]
☐ Register all gateway routes
☐ Run utilization verification

### Utilization Verification (MUST PASS)
```javascript
PRISM_UTILIZATION_VERIFIER.verify('[MODULE_NAME]')
// Expected: { utilization: 100%, consumers: 15+, allWired: true }
```

### Session Handoff
- Module migrated: [NAME]
- Consumers wired: [COUNT]
- Utilization: [100%]
- Tests passing: [COUNT]
- Next session: [ID]
```

---

# PART 4: DATA FLOW ARCHITECTURE

## 4.1 The Utilization Matrix

Every database MUST have defined consumers. Here's the target matrix:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    DATABASE → CONSUMER UTILIZATION MATRIX                                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  PRISM_MATERIALS_MASTER (618 materials) → MINIMUM 15 CONSUMERS                          │
│  ════════════════════════════════════════════════════════════════════════════           │
│  │                                                                                      │
│  ├─► PRISM_SPEED_FEED_CALCULATOR      uses: base_speed, machinability, hardness        │
│  ├─► PRISM_FORCE_CALCULATOR           uses: kc1_1, mc, yield_strength                  │
│  ├─► PRISM_THERMAL_ENGINE             uses: conductivity, specific_heat, melting_point │
│  ├─► PRISM_TOOL_LIFE_ENGINE           uses: taylor_n, taylor_C, abrasiveness           │
│  ├─► PRISM_SURFACE_FINISH_ENGINE      uses: elasticity, built_up_edge_tendency         │
│  ├─► PRISM_CHATTER_PREDICTION         uses: damping_ratio, elastic_modulus             │
│  ├─► PRISM_CHIP_FORMATION_ENGINE      uses: strain_hardening, chip_type                │
│  ├─► PRISM_COOLANT_SELECTOR           uses: reactivity, coolant_compatibility          │
│  ├─► PRISM_COATING_OPTIMIZER          uses: chemical_affinity, temperature_limit       │
│  ├─► PRISM_COST_ESTIMATOR             uses: material_cost, density                     │
│  ├─► PRISM_CYCLE_TIME_PREDICTOR       uses: all cutting parameters                     │
│  ├─► PRISM_QUOTING_ENGINE             uses: material_cost, machinability               │
│  ├─► PRISM_AI_LEARNING_PIPELINE       uses: ALL fields for ML training                 │
│  ├─► PRISM_BAYESIAN_OPTIMIZER         uses: uncertainty in parameters                  │
│  └─► PRISM_EXPLAINABLE_AI             uses: ALL for recommendation explanation         │
│                                                                                         │
│  PRISM_MACHINES_DATABASE → MINIMUM 12 CONSUMERS                                         │
│  ════════════════════════════════════════════════════════════════════════════           │
│  │                                                                                      │
│  ├─► PRISM_SPEED_FEED_CALCULATOR      uses: rpm_max, feed_max, power                   │
│  ├─► PRISM_COLLISION_ENGINE           uses: work_envelope, axis_limits                 │
│  ├─► PRISM_POST_PROCESSOR_GENERATOR   uses: controller, capabilities                   │
│  ├─► PRISM_CHATTER_PREDICTION         uses: spindle_stiffness, natural_freq            │
│  ├─► PRISM_CYCLE_TIME_PREDICTOR       uses: rapid_rates, accel/decel                   │
│  ├─► PRISM_COST_ESTIMATOR             uses: hourly_rate, efficiency                    │
│  ├─► PRISM_SCHEDULING_ENGINE          uses: availability, capabilities                 │
│  ├─► PRISM_QUOTING_ENGINE             uses: hourly_rate, setup_time                    │
│  ├─► PRISM_CAPABILITY_MATCHER         uses: ALL capability fields                      │
│  ├─► PRISM_3D_VISUALIZATION           uses: kinematics, geometry                       │
│  ├─► PRISM_AI_LEARNING_PIPELINE       uses: ALL for ML training                        │
│  └─► PRISM_EXPLAINABLE_AI             uses: ALL for explanation                        │
│                                                                                         │
│  [Continue for ALL 62 databases...]                                                     │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 4.2 The AI Integration Requirements

Every calculation MUST combine multiple sources:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│              CALCULATION = 6+ SOURCES × AI × PHYSICS × LEARNING                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  EXAMPLE: calculateOptimalSpeed(material, tool, machine, operation)                     │
│  ═══════════════════════════════════════════════════════════════════════                │
│                                                                                         │
│  SOURCE 1: Material Database                                                            │
│  ├── base_speed = PRISM_MATERIALS_MASTER.get(material).base_speed                       │
│  └── Contribution: 40% of initial estimate                                              │
│                                                                                         │
│  SOURCE 2: Tool Database                                                                │
│  ├── tool_factor = PRISM_TOOLS_DATABASE.get(tool).speed_factor                          │
│  └── Contribution: Modifier based on geometry, coating                                  │
│                                                                                         │
│  SOURCE 3: Machine Database                                                             │
│  ├── machine_limit = PRISM_MACHINES_DATABASE.get(machine).rpm_max                       │
│  └── Contribution: Hard constraint                                                      │
│                                                                                         │
│  SOURCE 4: Physics Engine                                                               │
│  ├── stability_limit = PRISM_CHATTER_ENGINE.calculateStableLimit(params)                │
│  └── Contribution: Physics-based constraint                                             │
│                                                                                         │
│  SOURCE 5: Historical Data                                                              │
│  ├── historical = PRISM_LEARNING_ENGINE.getBestResult(similar_params)                   │
│  └── Contribution: What actually worked before                                          │
│                                                                                         │
│  SOURCE 6: AI Recommendation                                                            │
│  ├── ai_adjust = PRISM_BAYESIAN_OPTIMIZER.recommend(all_inputs)                         │
│  └── Contribution: Learned adjustment with uncertainty                                  │
│                                                                                         │
│  FINAL CALCULATION:                                                                     │
│  optimal_speed = PRISM_FUSION_ENGINE.combine({                                          │
│      material: base_speed,                                                              │
│      tool: tool_factor,                                                                 │
│      machine: machine_limit,                                                            │
│      physics: stability_limit,                                                          │
│      historical: historical.speed,                                                      │
│      ai: ai_adjust                                                                      │
│  }, weights, constraints)                                                               │
│                                                                                         │
│  OUTPUT MUST INCLUDE:                                                                   │
│  {                                                                                      │
│      value: optimal_speed,                                                              │
│      confidence: 0.87,                                                                  │
│      range_95: [min, max],                                                              │
│      sources: ['material', 'tool', 'machine', 'physics', 'historical', 'ai'],           │
│      explanation: PRISM_XAI.explain(calculation_trace)                                  │
│  }                                                                                      │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# PART 5: ENFORCEMENT MECHANISMS

## 5.1 The Utilization Verifier

```javascript
const PRISM_UTILIZATION_VERIFIER = {
    
    // BLOCKS module import if not fully wired
    verifyBeforeImport: function(moduleName, consumerList) {
        const requirements = this.getRequirements(moduleName);
        
        if (consumerList.length < requirements.minConsumers) {
            throw new Error(
                `BLOCKED: ${moduleName} requires ${requirements.minConsumers} consumers, ` +
                `only ${consumerList.length} provided. Module cannot be imported.`
            );
        }
        
        // Verify each consumer is actually wired
        for (const consumer of requirements.requiredConsumers) {
            if (!consumerList.includes(consumer)) {
                throw new Error(
                    `BLOCKED: ${moduleName} MUST be consumed by ${consumer}. ` +
                    `Add this consumer before importing.`
                );
            }
        }
        
        return { approved: true, utilization: 100 };
    },
    
    // Database requirements
    requirements: {
        'PRISM_MATERIALS_MASTER': {
            minConsumers: 15,
            requiredConsumers: [
                'PRISM_SPEED_FEED_CALCULATOR',
                'PRISM_FORCE_CALCULATOR',
                'PRISM_THERMAL_ENGINE',
                'PRISM_TOOL_LIFE_ENGINE',
                'PRISM_SURFACE_FINISH_ENGINE',
                'PRISM_CHATTER_PREDICTION',
                'PRISM_CHIP_FORMATION_ENGINE',
                'PRISM_COOLANT_SELECTOR',
                'PRISM_COATING_OPTIMIZER',
                'PRISM_COST_ESTIMATOR',
                'PRISM_CYCLE_TIME_PREDICTOR',
                'PRISM_QUOTING_ENGINE',
                'PRISM_AI_LEARNING_PIPELINE',
                'PRISM_BAYESIAN_OPTIMIZER',
                'PRISM_EXPLAINABLE_AI'
            ]
        },
        // ... defined for ALL databases
    }
};
```

## 5.2 The Calculation Source Enforcer

```javascript
const PRISM_CALCULATION_ENFORCER = {
    
    // BLOCKS calculations that don't use enough sources
    enforceMultiSource: function(calculationType, sources) {
        const MIN_SOURCES = 6;
        
        if (sources.length < MIN_SOURCES) {
            throw new Error(
                `BLOCKED: ${calculationType} uses only ${sources.length} sources. ` +
                `Minimum ${MIN_SOURCES} required. Add more data sources.`
            );
        }
        
        // Verify required source types
        const requiredTypes = ['database', 'physics', 'ai', 'historical'];
        for (const type of requiredTypes) {
            if (!sources.some(s => s.type === type)) {
                throw new Error(
                    `BLOCKED: ${calculationType} missing ${type} source. ` +
                    `All calculations must include physics, AI, and historical data.`
                );
            }
        }
        
        return { approved: true };
    }
};
```

---

# PART 6: SESSION EXECUTION RULES

## 6.1 Rules for ALL Sessions

```
MANDATORY FOR EVERY SESSION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. START with session ID and scope confirmation
2. NEVER exceed session scope (split if needed)
3. ALWAYS produce handoff document at end
4. ALWAYS verify work before ending
5. NEVER leave partial work uncommitted

SESSION START RITUAL:
━━━━━━━━━━━━━━━━━━━━━━
"Starting Session [X.Y.Z]: [DESCRIPTION]
Scope: [WHAT WE'RE DOING]
Expected output: [FILES/ARTIFACTS]
Previous session: [X.Y.Z-1] status: [COMPLETE]"

SESSION END RITUAL:
━━━━━━━━━━━━━━━━━━━
"Completing Session [X.Y.Z]
✓ Completed: [LIST]
✓ Output files: [LIST]
✓ Verification: [PASSED/ISSUES]
→ Next session: [X.Y.Z+1]
→ Handoff notes: [NOTES]"
```

## 6.2 Rules for EXTRACTION Sessions (Stage 1)

```
EXTRACTION SESSION RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Extract COMPLETE modules (no partial extractions)
2. Preserve ALL comments and documentation
3. Document dependencies at top of each extracted file
4. Document outputs at top of each extracted file
5. Create index file for each category
6. Verify extraction by checking function count
```

## 6.3 Rules for MIGRATION Sessions (Stage 3)

```
MIGRATION SESSION RULES:
━━━━━━━━━━━━━━━━━━━━━━━━

1. NO module imports without ALL consumers wired
2. Run PRISM_UTILIZATION_VERIFIER before import
3. Run PRISM_UTILIZATION_VERIFIER after import
4. Test EVERY gateway route
5. Verify EVERY consumer actually uses the data
6. Document any issues for immediate resolution
```

---

# PART 7: FILE STRUCTURE

## 7.1 Extraction Output Structure

```
/prism-extracted/
├── databases/
│   ├── materials/
│   │   ├── PRISM_MATERIALS_MASTER.js
│   │   ├── PRISM_MATERIAL_KC_DATABASE.js
│   │   └── index.js
│   ├── machines/
│   ├── tools/
│   ├── workholding/
│   ├── post-processors/
│   ├── process/
│   ├── business/
│   ├── ai-ml/
│   └── infrastructure/
├── engines/
│   ├── cad/
│   ├── cam/
│   ├── physics/
│   ├── ai-ml/
│   ├── optimization/
│   ├── signal/
│   ├── post-processor/
│   └── collision/
├── knowledge-bases/
├── systems/
├── learning/
├── business/
├── ui/
├── lookups/
├── manufacturers/
└── phase-modules/
```

## 7.2 New Architecture Structure

```
/prism-v2/
├── core/
│   ├── PRISM_CORE.js           - Main framework
│   ├── PRISM_DATA_BUS.js       - Data routing with enforcement
│   ├── PRISM_GATEWAY.js        - Gateway (rebuilt)
│   ├── PRISM_UTILIZATION.js    - Utilization enforcement
│   └── PRISM_CONSTANTS.js      - Constants
├── databases/                   - Migrated databases (100% wired)
├── engines/                     - Migrated engines (100% used)
├── products/
│   ├── speed-feed-calculator/
│   ├── post-processor-generator/
│   ├── shop-manager/
│   └── auto-programmer/
├── ui/
└── tests/
```

---

# PART 8: IMMEDIATE NEXT STEPS

## This Session (0.0.1) Deliverables:
✓ Created this development prompt

## Next Session (0.0.2) Deliverables:
- Create complete data flow architecture document
- Map ALL database → consumer relationships
- Define minimum consumer counts for each database

## Following Sessions:
- 0.0.3: Create utilization enforcement specification
- 1.A.1: Begin extraction (Materials Databases)

---

# APPENDIX: QUICK REFERENCE

## Session ID Format
```
STAGE.CATEGORY.NUMBER
│      │        │
│      │        └── Sequential number within category
│      └────────── Category letter (A=Databases, B=Engines, etc.)
└─────────────────── Stage number (0=Prep, 1=Extract, 2=Arch, 3=Migrate)
```

## Key Metrics
```
Total modules to extract: 831
Total databases: 62
Total engines: 213
Total knowledge bases: 14
Minimum consumers per database: 10-15
Minimum sources per calculation: 6
Target utilization: 100%
```

## Critical Rules
```
1. NO module without consumers
2. NO calculation with <6 sources
3. NO session without handoff
4. NO partial extractions
5. VERIFY before and after EVERY operation
```

---

**END OF HYBRID DEVELOPMENT PROMPT v1.0**

```
═══════════════════════════════════════════════════════════════════════════════
"EXTRACT EVERYTHING → ARCHITECT FOR 100% → MIGRATE WITH ENFORCEMENT"
═══════════════════════════════════════════════════════════════════════════════
```
