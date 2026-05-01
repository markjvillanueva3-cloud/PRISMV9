---
name: prism-dev-utilities
version: 1.0.0
description: |
  UNIFIED development utilities for PRISM v9.0 rebuild.
  Consolidates 8 small utility skills into one reference.
  
  Consolidated Skills:
  - prism-development (170 lines) - Session protocols
  - prism-extractor (~400 lines) - Extraction patterns
  - prism-auditor (102 lines) - Module auditing
  - prism-utilization (83 lines) - Utilization checks
  - prism-consumer-mapper (99 lines) - Consumer mapping
  - prism-hierarchy-manager (97 lines) - Layer management
  - prism-swarm-orchestrator (99 lines) - Multi-agent patterns
  - prism-python-tools (346 lines) - Python automation
  
  Total: ~1,496 lines → ~550 lines (63% efficiency)
triggers:
  - "development"
  - "extraction"
  - "utilization"
  - "consumer"
  - "hierarchy"
  - "swarm"
  - "python"
---

# PRISM DEVELOPMENT UTILITIES
## Unified Development Tools Reference
### Version 1.0 | SP.10 | 8 Utilities Consolidated

---

## TABLE OF CONTENTS

1. [Session Protocol](#1-session-protocol)
2. [Module Extraction](#2-module-extraction)
3. [Utilization Enforcement](#3-utilization-enforcement)
4. [Consumer Mapping](#4-consumer-mapping)
5. [Hierarchy Management](#5-hierarchy-management)
6. [Python Automation](#6-python-automation)
7. [Multi-Agent Orchestration](#7-multi-agent-orchestration)
8. [Quick Reference](#8-quick-reference)

---

# 1. SESSION PROTOCOL

## Claude's Role
Claude is the **PRIMARY DEVELOPER** of PRISM v9.0 rebuild with full architectural authority.

## Session Start (MANDATORY)

```
1. READ:   C:\PRISM REBUILD...\CURRENT_STATE.json
2. CHECK:  Is currentTask IN_PROGRESS? Resume, don't restart
3. VERIFY: Folder access confirmed
4. UPDATE: status = "IN_PROGRESS"
5. ANNOUNCE: Starting session header
```

## Session End (MANDATORY)

```
1. UPDATE:   CURRENT_STATE.json completely
2. WRITE:    Session log to SESSION_LOGS/
3. ANNOUNCE: Completion summary
4. REMIND:   Box sync for backup
```

## Critical Storage Rules

| Location | Use | Persistence |
|----------|-----|-------------|
| `C:\PRISM REBUILD...\` | PRIMARY | ✅ Persistent |
| `/home/claude/` | NEVER | ❌ Resets |
| Box folder | Reference | ✅ Persistent |

## The 10 Commandments (Summary)

1. **USE EVERYWHERE** - 100% DB/engine utilization
2. **FUSE** - Cross-domain concepts
3. **VERIFY** - Physics + empirical + historical
4. **LEARN** - Every interaction → ML pipeline
5. **UNCERTAINTY** - Confidence intervals
6. **EXPLAIN** - XAI for all
7. **GRACEFUL** - Fallbacks
8. **PROTECT** - Validate, sanitize, backup
9. **PERFORM** - <2s load, <500ms calc
10. **USER-OBSESS** - 3-click rule

---

# 2. MODULE EXTRACTION

## Extraction Workflow

### Phase 1: Pre-Analysis
```
MODULE: [NAME]
LOCATION: Line [START]-[END], ~[SIZE] lines
DIFFICULTY: [EASY|MEDIUM|HARD|COMPLEX]
DEPENDENCIES: [LIST]
TIME ESTIMATE: [X] minutes
```

### Phase 2: Extract
```javascript
Desktop Commander:read_file({
  path: "...PRISM_v8_89_002.html",
  offset: LINE_NUMBER,
  length: SIZE + 500  // Buffer
})
```

### Phase 3: Post-Analysis
```
QUALITY SCORE: [0-100]
├─ Documentation: [0-25]
├─ Error Handling: [0-25]
├─ Naming: [0-25]
└─ Complexity: [0-25]

VERIFIED DEPENDENCIES: [LIST]
CONSUMERS: [LIST]
PATTERNS: [Factory, Observer, etc.]
```

## Difficulty Ratings

| Rating | Size | Dependencies | Time |
|--------|------|--------------|------|
| EASY | <500 | <3 | 5-10 min |
| MEDIUM | 500-2000 | 3-6 | 15-30 min |
| HARD | 2000-5000 | 6-10 | 30-60 min |
| COMPLEX | >5000 | >10 | 60+ min |

## Output Template Header

```javascript
/**
 * PRISM MODULE: [NAME]
 * @extracted   [DATE]
 * @source      Lines [START]-[END]
 * @quality     [SCORE]/100
 * 
 * DEPENDENCIES: [LIST with types]
 * OUTPUTS: [Function signatures]
 * CONSUMERS: [LIST]
 */
```

---

# 3. UTILIZATION ENFORCEMENT

## Core Principle

**NO MODULE WITHOUT CONSUMERS. NO CALCULATION WITH <6 SOURCES.**

## Database Consumer Requirements

| Database | Min Consumers |
|----------|---------------|
| PRISM_MATERIALS_MASTER | 15 |
| PRISM_MACHINES_DATABASE | 12 |
| PRISM_TOOLS_DATABASE | 10 |
| All others | 8 |

## 6-Source Calculation Requirement

Every calculation MUST include:
1. **Database** - Material/tool/machine properties
2. **Physics** - Force, thermal, dynamics models
3. **AI/ML** - Bayesian, neural, ensemble
4. **Historical** - Past successful runs
5. **Manufacturer** - Catalog specifications
6. **Empirical** - Validated against real cuts

## Output Format

```javascript
{
  value: optimal_speed,
  confidence: 0.87,
  range_95: [min, max],
  sources: ['material', 'tool', 'machine', 'physics', 'historical', 'ai'],
  explanation: PRISM_XAI.explain(trace)
}
```

## Verification Scripts

```bash
# Verify before import
python verify_before_import.py --module NAME --consumers 15

# Verify calculation sources
python verify_calculation.py --calc NAME --sources 6

# Generate utilization report
python utilization_report.py --output report.md
```

---

# 4. CONSUMER MAPPING

## PRISM_MATERIALS_MASTER Consumers (15)

| Consumer | Fields Used |
|----------|-------------|
| SPEED_FEED_CALCULATOR | base_speed, machinability, hardness |
| FORCE_CALCULATOR | kc1_1, mc, yield_strength |
| THERMAL_ENGINE | conductivity, specific_heat |
| TOOL_LIFE_ENGINE | taylor_n, taylor_C |
| SURFACE_FINISH_ENGINE | elasticity, BUE_tendency |
| CHATTER_PREDICTION | damping_ratio, E_modulus |
| CHIP_FORMATION_ENGINE | strain_hardening |
| COOLANT_SELECTOR | reactivity, compatibility |
| COATING_OPTIMIZER | chemical_affinity |
| COST_ESTIMATOR | material_cost, density |
| CYCLE_TIME_PREDICTOR | all cutting params |
| QUOTING_ENGINE | material_cost |
| AI_LEARNING_PIPELINE | ALL fields |
| BAYESIAN_OPTIMIZER | uncertainties |
| EXPLAINABLE_AI | ALL for explanation |

## Wiring Template

```javascript
const MODULE_WIRING = {
  module: 'PRISM_MATERIALS_MASTER',
  consumers: [
    {
      name: 'PRISM_SPEED_FEED_CALCULATOR',
      fields: ['base_speed', 'machinability'],
      gateway_route: '/api/speed-feed/calculate',
      priority: 'CRITICAL'
    }
    // ... more consumers
  ]
};
```

---

# 5. HIERARCHY MANAGEMENT

## 4-Layer Architecture

```
┌─────────────────────────────────────┐
│ LAYER 4: LEARNED (AI-generated)    │ ← Highest (confidence > 0.8)
├─────────────────────────────────────┤
│ LAYER 3: USER (Shop-specific)      │
├─────────────────────────────────────┤
│ LAYER 2: ENHANCED (Manufacturer)   │ ← 33 manufacturers
├─────────────────────────────────────┤
│ LAYER 1: CORE (Infrastructure)     │ ← Foundation
└─────────────────────────────────────┘
```

## Resolution Order

```javascript
function getData(id, property) {
  if (LEARNED[id]?.[property] && confidence > 0.8)
    return { value: LEARNED[...], source: 'LEARNED' };
  if (USER[id]?.[property])
    return { value: USER[...], source: 'USER' };
  if (ENHANCED[id]?.[property])
    return { value: ENHANCED[...], source: 'ENHANCED' };
  return { value: CORE[...], source: 'CORE' };
}
```

## Propagation Rules

| Change In | Propagates To |
|-----------|---------------|
| CORE | ENHANCED → USER → LEARNED |
| ENHANCED | USER → LEARNED |
| USER | LEARNED |
| LEARNED | Nothing (top) |

## Validation Rules

1. CORE cannot be overridden, only extended
2. Lower layers can override but not delete
3. LEARNED requires confidence ≥ 0.8
4. Schema must match across layers

---

# 6. PYTHON AUTOMATION

## Script Categories

| Category | Location | Purpose |
|----------|----------|---------|
| Core | `core/` | Config, logging, utils |
| State | `state/` | State management |
| Validation | `validation/` | Schema, physics checks |
| Extraction | `extraction/` | Module extraction |
| Batch | `batch/` | Batch operations |
| Audit | `audit/` | Consumer tracking, gaps |

## Most Used Commands

```bash
# Session management
python session_manager.py start 1.A.5
python session_manager.py end

# Quick state updates
python update_state.py complete "Task done"
python update_state.py next "1.A.2" "Extract Machines"

# Material validation
python -m validation.material_validator file.js
python -m validation.physics_consistency file.js

# Extraction
python extract_module.py monolith.html 136163 138500 output.js

# Audit
python -m audit.gap_finder
python -m audit.utilization_report
```

## Path Constants

```python
LOCAL_ROOT = r"C:\\PRISM"
STATE_FILE = os.path.join(LOCAL_ROOT, "CURRENT_STATE.json")
EXTRACTED = os.path.join(LOCAL_ROOT, "EXTRACTED")
SCRIPTS = os.path.join(LOCAL_ROOT, "SCRIPTS")
```

## Dependencies

```bash
pip install pdfplumber json5 tqdm colorama --break-system-packages
```

---

# 7. MULTI-AGENT ORCHESTRATION

## ROI

| Mode | Sessions | Speedup |
|------|----------|---------|
| Sequential | 15-25 | 1x |
| Swarm | 3-5 | 5x |

## Agent Roles

| Role | Count | Task |
|------|-------|------|
| Queen | 1 | Coordinate, merge |
| Extractor | 4-6 | Extract modules |
| Auditor | 1 | Validate |
| Documenter | 1 | Generate docs |
| Validator | 1 | Run tests |

## Coordination Protocol

```
1. QUEEN reads state, creates assignments
2. AGENTS work in parallel on temp directories
3. AGENTS signal completion
4. QUEEN merges results, resolves conflicts
5. QUEEN updates final state
```

## Conflict Resolution

1. Queen detects via file hashes
2. Semantic merge if different functions
3. Timestamp-based arbitration if true conflict

---

# 8. QUICK REFERENCE

## Tool Selection

| Task | Tool |
|------|------|
| Read C: file | `Filesystem:read_file` |
| Write C: file | `Filesystem:write_file` |
| Read LARGE file | `Desktop Commander:read_file` |
| Append to file | `Desktop Commander:write_file mode:'append'` |
| Search content | `Desktop Commander:start_search` |
| Run Python | `Desktop Commander:start_process` |

## Key Paths

```
STATE:      C:\PRISM REBUILD...\CURRENT_STATE.json
MONOLITH:   C:\..._BUILD\PRISM_v8_89_002...\*.html
EXTRACTED:  C:\PRISM REBUILD...\EXTRACTED\
SCRIPTS:    C:\PRISM REBUILD...\SCRIPTS\
LOGS:       C:\PRISM REBUILD...\SESSION_LOGS\
```

## Checklist: Before Extraction

- [ ] Read CURRENT_STATE.json
- [ ] Check prism-monolith-index for line numbers
- [ ] Identify dependencies
- [ ] Estimate size and difficulty

## Checklist: After Extraction

- [ ] All functions present
- [ ] Dependencies documented
- [ ] Quality score calculated
- [ ] Consumers identified
- [ ] Added to MODULE_INDEX.json

## Checklist: Before Migration (Stage 3)

- [ ] Run gap_finder
- [ ] Verify 100% utilization
- [ ] All consumers wired
- [ ] Physics validation passed

---

## SOURCE SKILLS CONSOLIDATED

| Skill | Lines | Content |
|-------|-------|---------|
| prism-development | 170 | Session protocols |
| prism-extractor | ~400 | Extraction patterns |
| prism-auditor | 102 | Module auditing |
| prism-utilization | 83 | Utilization checks |
| prism-consumer-mapper | 99 | Consumer mapping |
| prism-hierarchy-manager | 97 | Layer management |
| prism-swarm-orchestrator | 99 | Multi-agent |
| prism-python-tools | 346 | Python automation |
| **Total Source** | **~1,496** | |
| **Consolidated** | **~550** | **63% efficiency** |

---

**END OF PRISM DEV UTILITIES SKILL**
