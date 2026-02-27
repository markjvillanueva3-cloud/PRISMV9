---
name: prism-dev-utilities
description: |
  Unified development utilities. 8 tools consolidated.
---

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
