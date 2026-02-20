# PRISM MCP SERVER & SKILLS ROADMAP
## Comprehensive Micro-Session Plan with Parallel Execution
### Version 1.0 | January 30, 2026

---

# 📊 EXECUTIVE SUMMARY

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    PRISM MCP + SKILLS BUILD ROADMAP                           ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   TOTAL MICRO-SESSIONS: 47 sessions                                           ║
║   ESTIMATED DURATION: 3-4 weeks (2-3 sessions/day)                            ║
║   PARALLEL TRACKS: 3 concurrent tracks possible                               ║
║                                                                               ║
║   ┌─────────────────────────────────────────────────────────────────────┐     ║
║   │  PHASE 1: Architecture & Contracts    →   4 sessions (SEQUENTIAL)   │     ║
║   │  PHASE 2: MCP Server Core             →   6 sessions (SEQUENTIAL)   │     ║
║   │  PHASE 3: Data Registries             →  12 sessions (PARALLEL x3)  │     ║
║   │  PHASE 4: Skills Creation             →  16 sessions (PARALLEL x4)  │     ║
║   │  PHASE 5: Integration & Wiring        →   5 sessions (SEQUENTIAL)   │     ║
║   │  PHASE 6: Validation & Testing        →   4 sessions (RALPH LOOP)   │     ║
║   └─────────────────────────────────────────────────────────────────────┘     ║
║                                                                               ║
║   RESOURCES UTILIZED:                                                         ║
║   • 140 existing skills                                                       ║
║   • 950 extracted modules (154 MB)                                            ║
║   • 56 API agents available                                                   ║
║   • 160 Python scripts                                                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

# 🎯 PHASE 1: ARCHITECTURE & CONTRACTS
## Status: NOT STARTED | Sessions: 4 | Dependency: None

**Purpose**: Establish the foundation before building anything. Define clear boundaries between skills and MCP tools.

### Session 1.1: Skill vs Tool Classification
| Item | Type | Details |
|------|------|---------|
| **Input** | 56 proposed items from audit | |
| **Process** | Classify each as SKILL, TOOL, or BOTH | |
| **Output** | SKILL_TOOL_CLASSIFICATION.json | |

**Classification Criteria:**
- SKILL = Knowledge/documentation/algorithms (Claude reads to understand)
- TOOL = Runtime action/query/calculation (Claude calls to do)
- BOTH = Knowledge + API endpoint

**Deliverables:**
- [ ] Classification matrix for all 56 items
- [ ] Updated skill count (expected: ~35 pure skills)
- [ ] Updated tool count (expected: ~55 MCP tools)

---

### Session 1.2: Data Schema Definitions
| Item | Type | Details |
|------|------|---------|
| **Input** | Existing extracted modules | |
| **Process** | Define JSON schemas for each data type | |
| **Output** | /schemas/*.json (8 files) | |

**Schemas to Define:**
```
□ material_schema.json      (127 parameters)
□ machine_schema.json       (85 parameters)
□ tool_schema.json          (60 parameters)
□ alarm_schema.json         (15 parameters)
□ fixture_schema.json       (40 parameters)
□ formula_schema.json       (20 parameters)
□ skill_schema.json         (metadata format)
□ module_schema.json        (extracted module format)
```

---

### Session 1.3: MCP Tool Contract Definitions
| Item | Type | Details |
|------|------|---------|
| **Input** | Classification from 1.1 | |
| **Process** | Define input/output contracts for each tool | |
| **Output** | MCP_TOOL_CONTRACTS.json | |

**Contract Format:**
```json
{
  "tool_name": "prism_material_query",
  "category": "data",
  "inputs": {...},
  "outputs": {...},
  "validation": [...],
  "examples": [...]
}
```

**Tool Categories to Define:**
- Data Access (9 tools)
- Calculations (9 tools)
- AI/ML (4 tools)
- Knowledge (4 tools)
- Geometry (4 tools)
- Enhancement (12 tools)
- Learning (3 tools)
- Session (3 tools)

---

### Session 1.4: Folder Structure & Skeleton
| Item | Type | Details |
|------|------|---------|
| **Input** | Schemas + Contracts | |
| **Process** | Create complete folder structure | |
| **Output** | C:\PRISM\mcp-server\ skeleton | |

**Structure to Create:**
```
C:\PRISM\mcp-server\
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts (entry point skeleton)
│   ├── registries/ (8 empty files)
│   ├── tools/ (6 category files)
│   └── utils/ (4 utility files)
├── data/
│   ├── materials/ (with _schema.json)
│   ├── machines/
│   ├── tools/
│   ├── alarms/
│   ├── fixtures/
│   ├── formulas/
│   └── gcodes/
├── schemas/
└── tests/
```

---

# 🔧 PHASE 2: MCP SERVER CORE
## Status: BLOCKED by Phase 1 | Sessions: 6 | Dependency: Phase 1

**Purpose**: Build the foundational server infrastructure that all registries and tools depend on.

### Session 2.1: Base Registry Class
| Item | Type | Details |
|------|------|---------|
| **Input** | Schema definitions | |
| **Process** | Implement BaseRegistry<T> abstract class | |
| **Output** | src/registries/base-registry.ts | |

**Features:**
- [ ] Generic type support
- [ ] File watching (chokidar)
- [ ] Hot reload on changes
- [ ] Index building
- [ ] Query interface
- [ ] Search interface

---

### Session 2.2: Schema Validator
| Item | Type | Details |
|------|------|---------|
| **Input** | JSON schemas from 1.2 | |
| **Process** | Build validation system | |
| **Output** | src/utils/schema-validator.ts | |

**Features:**
- [ ] Validate against JSON schema
- [ ] Custom validation rules (physics checks)
- [ ] Error reporting with line numbers
- [ ] Suggestion for fixes

---

### Session 2.3: Index Builder
| Item | Type | Details |
|------|------|---------|
| **Input** | Registry data | |
| **Process** | Build fast lookup indexes | |
| **Output** | src/utils/index-builder.ts | |

**Index Types:**
- [ ] By primary key (ID)
- [ ] By name (tokenized)
- [ ] By category
- [ ] By numeric range
- [ ] Full-text search

---

### Session 2.4: File Watcher System
| Item | Type | Details |
|------|------|---------|
| **Input** | Data directories | |
| **Process** | Implement hot reload system | |
| **Output** | src/utils/file-watcher.ts | |

**Features:**
- [ ] Watch multiple directories
- [ ] Debounce rapid changes
- [ ] Notify registries on change
- [ ] Error handling for invalid files

---

### Session 2.5: Layer Resolution System
| Item | Type | Details |
|------|------|---------|
| **Input** | 4-layer architecture design | |
| **Process** | Implement CORE→ENHANCED→USER→LEARNED resolution | |
| **Output** | src/utils/layer-resolver.ts | |

**Features:**
- [ ] Layer priority ordering
- [ ] Parameter merging
- [ ] Conflict detection
- [ ] Source tracking

---

### Session 2.6: MCP Server Entry Point
| Item | Type | Details |
|------|------|---------|
| **Input** | All Phase 2 components | |
| **Process** | Wire together into MCP server | |
| **Output** | src/index.ts (functional) | |

**Features:**
- [ ] MCP protocol implementation
- [ ] Tool registration
- [ ] Registry initialization
- [ ] Health check endpoint

---

# 📦 PHASE 3: DATA REGISTRIES
## Status: BLOCKED by Phase 2 | Sessions: 12 | Dependency: Phase 2
## ⚡ PARALLELIZABLE: 3 tracks

**Purpose**: Implement all 8 registries with full CRUD operations. Can run 3 tracks in parallel.

```
PARALLEL EXECUTION PLAN:
────────────────────────────────────────────────────────────────
TRACK A (Primary):     Materials → Machines → Tools
TRACK B (Secondary):   Alarms → Fixtures → Formulas  
TRACK C (Tertiary):    Skills → Modules
────────────────────────────────────────────────────────────────
Session:  3.1   3.2   3.3   3.4   3.5   3.6   3.7   3.8
Track A:  MAT   MAT   MCH   MCH   TOL   TOL   ---   ---
Track B:  ALM   ALM   FIX   FIX   FOR   FOR   ---   ---
Track C:  SKL   SKL   MOD   MOD   ---   ---   ---   ---
────────────────────────────────────────────────────────────────
```

### TRACK A: Materials → Machines → Tools

#### Session 3.A1: Material Registry (Part 1)
- [ ] MaterialRegistry class extending BaseRegistry
- [ ] Material-specific indexes (ISO, hardness, name)
- [ ] Query methods (getByISO, getByHardness, search)

#### Session 3.A2: Material Registry (Part 2) + Tools
- [ ] Material enhancement tools (add, enhance, correct)
- [ ] Material validation (physics consistency)
- [ ] Material estimation (fill missing params)
- [ ] MCP tool wiring (prism_material_*)

#### Session 3.A3: Machine Registry (Part 1)
- [ ] MachineRegistry class
- [ ] Machine-specific indexes (manufacturer, type, size)
- [ ] Query methods

#### Session 3.A4: Machine Registry (Part 2) + Tools
- [ ] Machine enhancement tools
- [ ] Post processor compatibility
- [ ] MCP tool wiring (prism_machine_*)

#### Session 3.A5: Tool Registry (Part 1)
- [ ] ToolRegistry class (cutting tools)
- [ ] Tool-specific indexes (type, size, coating)

#### Session 3.A6: Tool Registry (Part 2) + Tools
- [ ] Tool enhancement
- [ ] 3D model generation hooks
- [ ] MCP tool wiring (prism_tool_*)

---

### TRACK B: Alarms → Fixtures → Formulas

#### Session 3.B1: Alarm Registry (Part 1)
- [ ] AlarmRegistry class
- [ ] Controller-specific indexes
- [ ] Code lookup methods

#### Session 3.B2: Alarm Registry (Part 2) + Tools
- [ ] Alarm decode logic
- [ ] Fix procedure storage
- [ ] MCP tool wiring (prism_alarm_*)

#### Session 3.B3: Fixture Registry (Part 1)
- [ ] FixtureRegistry class
- [ ] Workholding categories

#### Session 3.B4: Fixture Registry (Part 2) + Tools
- [ ] Fixture selection logic
- [ ] MCP tool wiring (prism_fixture_*)

#### Session 3.B5: Formula Registry (Part 1)
- [ ] FormulaRegistry class
- [ ] Formula execution engine

#### Session 3.B6: Formula Registry (Part 2) + Tools
- [ ] All 109 formulas loaded
- [ ] Parameter validation
- [ ] MCP tool wiring (prism_formula_*)

---

### TRACK C: Skills → Modules

#### Session 3.C1: Skill Registry (Part 1)
- [ ] SkillRegistry class
- [ ] Skill discovery from directories
- [ ] Metadata extraction

#### Session 3.C2: Skill Registry (Part 2) + Tools
- [ ] Dynamic skill loading
- [ ] Skill search
- [ ] MCP tool wiring (prism_skill_*)

#### Session 3.C3: Module Registry (Part 1)
- [ ] ModuleRegistry class
- [ ] 950 module indexing

#### Session 3.C4: Module Registry (Part 2) + Tools
- [ ] Module search (full-text)
- [ ] Code extraction
- [ ] MCP tool wiring (prism_module_*)

---

# 📚 PHASE 4: SKILLS CREATION
## Status: BLOCKED by Phase 1.1 | Sessions: 16 | Dependency: Classification
## ⚡ PARALLELIZABLE: 4 tracks (after classification)

**Purpose**: Create all pure skills (not MCP tools). Can run 4 tracks in parallel.

```
PARALLEL EXECUTION PLAN (4 SWARM AGENTS):
────────────────────────────────────────────────────────────────
TRACK A: Tier 1 High-Value Skills (11 skills)
TRACK B: Tier 2 Medium-Value Skills (15 skills)
TRACK C: Tier 3 Lower-Value Skills (16 skills)
TRACK D: Special Mega-Module Skills (14 skills)
────────────────────────────────────────────────────────────────
Each track: 4 sessions × ~4 skills per session = 16 skills max
────────────────────────────────────────────────────────────────
```

### TRACK A: Tier 1 High-Value Skills (11 skills)

#### Session 4.A1: CAD & Geometry Skills
- [ ] prism-cad-kernel (from 48 modules, 10.6 MB)
- [ ] prism-curves-surfaces (from 26 modules, 3.1 MB)
- [ ] prism-geometry-core (from 11 modules, 1.2 MB)

#### Session 4.A2: Physics & Engineering Skills
- [ ] prism-kalman-filter (from 4 modules, 5.7 MB)
- [ ] prism-collision (from 10 modules, 2.5 MB)
- [ ] prism-fluid-dynamics (from 7 modules, 2.7 MB)

#### Session 4.A3: Integration Skills
- [ ] prism-bridge (from 22 modules, 14.5 MB)
- [ ] prism-nlp (from 4 modules, 1.4 MB)

#### Session 4.A4: Domain Skills
- [ ] prism-fixture (from 10 modules, 3.2 MB)
- [ ] prism-customer (from 2 modules, 3.3 MB)
- [ ] prism-logging (from 15 modules, 2.9 MB)

---

### TRACK B: Tier 2 Medium-Value Skills (15 skills)

#### Session 4.B1: AI/ML Skills
- [ ] prism-xai (809 KB)
- [ ] prism-bayesian-prob (102 KB)
- [ ] prism-reinforcement (85 KB)
- [ ] prism-ensemble (21 KB)

#### Session 4.B2: System Skills
- [ ] prism-gateway-api (563 KB)
- [ ] prism-event-system (190 KB)
- [ ] prism-workflow (95 KB)
- [ ] prism-state-mgmt (28 KB)

#### Session 4.B3: Geometry/CAD Skills
- [ ] prism-mesh (215 KB)
- [ ] prism-sdf-csg (192 KB)
- [ ] prism-additive (410 KB)

#### Session 4.B4: Manufacturing Skills
- [ ] prism-machine-db (398 KB)
- [ ] prism-machining (196 KB)
- [ ] prism-thermal (106 KB)
- [ ] prism-stress-strain (300 KB)

---

### TRACK C: Tier 3 Lower-Value Skills (16 skills)

#### Session 4.C1: Analysis Skills
- [ ] prism-statistics (52 KB)
- [ ] prism-numerical (27 KB)
- [ ] prism-interpolation (13 KB)
- [ ] prism-validation (10 KB)

#### Session 4.C2: Manufacturing Skills
- [ ] prism-lathe (62 KB)
- [ ] prism-simulation (59 KB)
- [ ] prism-cycle-time (65 KB)
- [ ] prism-cost (26 KB)

#### Session 4.C3: Quality Skills
- [ ] prism-quality (39 KB)
- [ ] prism-dimension (34 KB)
- [ ] prism-computer-vision (21 KB)
- [ ] prism-point-cloud (16 KB)

#### Session 4.C4: UI/Visualization Skills
- [ ] prism-visualization (154 KB)
- [ ] prism-ui (136 KB)
- [ ] prism-graph (198 KB)
- [ ] prism-scheduling (126 KB)

---

### TRACK D: Special Mega-Module Skills (14 skills)

#### Session 4.D1: Core System Skills
- [ ] prism-subscription-system (8.7 MB)
- [ ] prism-units-conversion (5.5 MB)
- [ ] prism-precision-math (5.5 MB)

#### Session 4.D2: Algorithm Skills
- [ ] prism-comparison-engine (5.4 MB)
- [ ] prism-pattern-recognition (2.2 MB)
- [ ] prism-algorithm-strategies (806 KB)
- [ ] prism-core-algorithms (663 KB)

#### Session 4.D3: Data Skills
- [ ] prism-parts-database (4.2 MB)
- [ ] prism-parameter-engine (2.3 MB)
- [ ] prism-ml-core (2.0 MB)

#### Session 4.D4: Engineering Skills
- [ ] prism-structural-mechanics (1.5 MB)
- [ ] prism-control-systems (1.2 MB)
- [ ] prism-ai-wrapper (935 KB)
- [ ] prism-smoothing-algorithms (902 KB)

---

# 🔌 PHASE 5: INTEGRATION & WIRING
## Status: BLOCKED by Phases 3 & 4 | Sessions: 5 | Dependency: All registries + skills

**Purpose**: Connect everything together into a unified system.

### Session 5.1: Skill-MCP Integration
- [ ] Wire SkillRegistry to skill loader tool
- [ ] Implement dynamic skill resolution
- [ ] Add skill caching

### Session 5.2: Cross-Reference System
- [ ] Material ↔ Tool recommendations
- [ ] Machine ↔ Post processor mapping
- [ ] Alarm ↔ Controller linking

### Session 5.3: Learning System Integration
- [ ] Feedback collection tools
- [ ] Usage tracking
- [ ] LEARNED layer population

### Session 5.4: Enhancement Pipeline
- [ ] Auto-estimation for missing params
- [ ] Cascade update triggers
- [ ] Validation hooks

### Session 5.5: Final Wiring
- [ ] All 55 MCP tools registered
- [ ] All registries connected
- [ ] Health check comprehensive

---

# ✅ PHASE 6: VALIDATION & TESTING
## Status: BLOCKED by Phase 5 | Sessions: 4 | Dependency: Integration complete
## 🔄 RALPH LOOP: 3 iterations

**Purpose**: Validate everything works correctly using Ralph verification loops.

```
RALPH LOOP PATTERN:
────────────────────────────────────────────────────────────────
Iteration 1: VALIDATOR agent checks all components
Iteration 2: COMPLETENESS_AUDITOR verifies coverage
Iteration 3: REGRESSION_CHECKER ensures nothing broken
────────────────────────────────────────────────────────────────
```

### Session 6.1: Ralph Loop - Data Validation
**Agent**: validator, completeness_auditor

- [ ] All schemas validate
- [ ] All registries load without error
- [ ] All indexes build correctly
- [ ] Sample queries return correct results

### Session 6.2: Ralph Loop - Tool Validation
**Agent**: test_generator, regression_checker

- [ ] All 55 MCP tools callable
- [ ] Input validation works
- [ ] Output format correct
- [ ] Error handling graceful

### Session 6.3: Ralph Loop - Skill Validation
**Agent**: quality_gate, verification_chain

- [ ] All 56 new skills load
- [ ] Skill metadata correct
- [ ] No duplicate content
- [ ] Cross-references valid

### Session 6.4: Ralph Loop - Integration Validation
**Agent**: meta_analyst, synthesizer

- [ ] End-to-end queries work
- [ ] Enhancement pipeline functions
- [ ] Learning system captures feedback
- [ ] Performance acceptable (<100ms queries)

---

# 📊 SESSION DEPENDENCY GRAPH

```
PHASE 1 (Sequential)
═══════════════════
1.1 ──► 1.2 ──► 1.3 ──► 1.4
 │
 │ (Classification needed for Phase 4)
 ▼
PHASE 2 (Sequential)
═══════════════════
2.1 ──► 2.2 ──► 2.3 ──► 2.4 ──► 2.5 ──► 2.6
                                         │
                                         ▼
PHASE 3 (Parallel x3)           PHASE 4 (Parallel x4)
═════════════════════           ═════════════════════
Track A: 3.A1→3.A2→...          Track A: 4.A1→4.A2→...
Track B: 3.B1→3.B2→...    ◄──►  Track B: 4.B1→4.B2→...
Track C: 3.C1→3.C2→...          Track C: 4.C1→4.C2→...
         │                      Track D: 4.D1→4.D2→...
         │                               │
         └───────────┬───────────────────┘
                     ▼
PHASE 5 (Sequential)
═══════════════════
5.1 ──► 5.2 ──► 5.3 ──► 5.4 ──► 5.5
                                 │
                                 ▼
PHASE 6 (Ralph Loop x3)
═══════════════════════
6.1 ──► 6.2 ──► 6.3 ──► 6.4
 ▲                       │
 └───────────────────────┘ (iterate if failures)
```

---

# ⏱️ TIME ESTIMATES

| Phase | Sessions | Sequential | With Parallelism |
|-------|----------|------------|------------------|
| Phase 1 | 4 | 4 sessions | 4 sessions |
| Phase 2 | 6 | 6 sessions | 6 sessions |
| Phase 3 | 12 | 12 sessions | **4 sessions** (3 tracks) |
| Phase 4 | 16 | 16 sessions | **4 sessions** (4 tracks) |
| Phase 5 | 5 | 5 sessions | 5 sessions |
| Phase 6 | 4 | 4 sessions | 4 sessions |
| **TOTAL** | **47** | **47 sessions** | **27 sessions** |

**With aggressive parallelism: ~27 sessions = 9-14 days**

---

# 🚀 EXECUTION COMMANDS

## Phase 3 Parallel Execution (Swarm)
```powershell
# Run 3 registry tracks in parallel
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --swarm parallel_tracks "
  TRACK_A: Build MaterialRegistry, MachineRegistry, ToolRegistry
  TRACK_B: Build AlarmRegistry, FixtureRegistry, FormulaRegistry
  TRACK_C: Build SkillRegistry, ModuleRegistry
"
```

## Phase 4 Parallel Execution (Swarm)
```powershell
# Run 4 skill creation tracks in parallel
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --swarm skill_creation "
  TRACK_A: Create Tier 1 skills (11)
  TRACK_B: Create Tier 2 skills (15)
  TRACK_C: Create Tier 3 skills (16)
  TRACK_D: Create Special skills (14)
"
```

## Phase 6 Ralph Loop
```powershell
# Run validation with 3 iterations
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --ralph validator "
  Validate all MCP components, registries, skills, and integrations
" 3
```

---

# 📋 QUICK RESUME

```
MCP + Skills Roadmap v1.0
47 total sessions, 27 with parallelism
6 phases: Architecture → Core → Registries → Skills → Integration → Validation

Current: NOT STARTED
Next: Session 1.1 - Skill vs Tool Classification

Parallelizable:
  - Phase 3: 3 tracks (registries)
  - Phase 4: 4 tracks (skills)

Ralph Loops:
  - Phase 6: 3 iterations for validation
```

---

# 📁 FILES TO CREATE

| Session | Files Created |
|---------|---------------|
| 1.1 | SKILL_TOOL_CLASSIFICATION.json |
| 1.2 | schemas/*.json (8 files) |
| 1.3 | MCP_TOOL_CONTRACTS.json |
| 1.4 | mcp-server/ folder structure |
| 2.1-2.6 | src/*.ts (core files) |
| 3.* | src/registries/*.ts, src/tools/*.ts |
| 4.* | skills-consolidated/prism-*/ (56 skills) |
| 5.* | Integration updates |
| 6.* | Test reports, validation logs |

---

**READY TO BEGIN: Session 1.1 - Skill vs Tool Classification**

---

*Roadmap Version: 1.0 | Created: 2026-01-30 | Author: Claude + MARK*
