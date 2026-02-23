---
name: prism-swarm-orchestrator
description: Multi-agent swarm orchestration for parallel PRISM extraction and migration. Use when deploying multiple Claude agents to work on different modules simultaneously. Coordinates agent roles (Extractor, Auditor, Validator, Documenter), manages shared state, resolves conflicts, and merges results.
---

# PRISM Swarm Orchestrator

Orchestrates parallel multi-agent extraction using Claude Flow v3 patterns.

## ROI

- **Without swarm:** 15-25 extraction sessions
- **With swarm:** 3-5 extraction sessions (5x faster)
- **Token reduction:** 75-80% via smart routing

## Agent Roles

| Role | Count | Responsibility |
|------|-------|----------------|
| Queen | 1 | Coordinate, assign work, merge results |
| Extractor | 4-6 | Extract specific module categories |
| Auditor | 1 | Validate completeness |
| Documenter | 1 | Generate docs as modules extracted |
| Validator | 1 | Run tests, verify requirements |

## Swarm Deployment

```python
# Deploy extraction swarm
python scripts/spawn_extraction_swarm.py --category databases --agents 4

# Coordinate running agents
python scripts/coordinate_agents.py --plan MULTI_AGENT_PLAN.md

# Merge results from all agents
python scripts/merge_results.py --source agent_outputs/ --dest EXTRACTED/
```

## Coordination Protocol

### 1. Queen Reads State
```python
# Queen reads CURRENT_STATE.json and creates work assignments
assignments = {
    'agent_1': ['materials', 'tools'],
    'agent_2': ['machines', 'workholding'],
    'agent_3': ['post', 'process'],
    'agent_4': ['engines/cad', 'engines/cam']
}
```

### 2. Agents Work in Parallel
Each agent:
- Reads assigned categories from MULTI_AGENT_PLAN.md
- Extracts modules to temporary directory
- Updates progress in shared state
- Signals completion

### 3. Queen Merges
- Collects all agent outputs
- Resolves any conflicts
- Merges to final EXTRACTED/ directory
- Updates CURRENT_STATE.json

## Shared State (MULTI_AGENT_PLAN.md)

```markdown
# PRISM Multi-Agent Extraction Plan

## Assignments
| Agent | Categories | Status |
|-------|-----------|--------|
| agent_1 | materials, tools | IN_PROGRESS |
| agent_2 | machines | COMPLETE |

## Conflicts
- None

## Merge Queue
- machines/CORE/*.js - Ready
```

## Conflict Resolution

When two agents modify overlapping content:
1. Queen detects conflict via file hashes
2. Semantic merge attempted (if different functions)
3. If true conflict, Queen arbitrates based on timestamps

## Integration with Claude Flow v3

Compatible with:
- Hive-mind architecture (Queen + Workers)
- Shared SQLite memory
- Fork-join patterns
- Checkpoint/rollback recovery

See `references/claude_flow_integration.md` for setup.
