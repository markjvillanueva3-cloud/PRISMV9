# PRISM GSD v10.0 - Full Enhancement Edition
## Get Shit Done - With Auto-Orchestration & Cognitive Hooks

---

## SESSION START PROTOCOL (MANDATORY)
```
1. prism_gsd_core                         → Load instructions
2. py C:\PRISM\claude-dev\bootstrap.py    → Load enhancement package
3. Read ACTION_TRACKER.md                 → What did I do last?
4. Read CURRENT_STATE.json                → Quick resume
5. prism_todo_update                      → Anchor attention
```

## 5 LAWS (HARD REQUIREMENTS)
1. **S(x)≥0.70** - Safety score HARD BLOCK
2. **No placeholders** - 100% complete
3. **New≥Old** - Never lose data
4. **MCP First** - 277 tools before files
5. **TRACK EVERYTHING** - ACTION_TRACKER every response

## CLAUDE DEV PACKAGE (NEW!)
```
Location: C:\PRISM\claude-dev\
├── swarms/          → 8 pattern templates
├── hooks/           → Cognitive + Context (13 hooks)
├── orchestration/   → Auto-orchestrator
├── context/         → Pressure + Memory
├── bootstrap.py     → Session initializer
└── CLAUDE_DEV_SKILL.md → Master docs
```

## AUTO-ORCHESTRATION
**Intent → Tools → Agents → Swarm**
```python
from orchestration.auto_orchestrator import orchestrate
plan = orchestrate("Calculate cutting force for titanium")
# Returns: tools to use, agents to invoke, hooks to fire
```

| Task Type | Auto-Selected |
|-----------|---------------|
| calculation | calc_cutting_force, calc_tool_life |
| data_query | material_search, alarm_search |
| code | sp_brainstorm → sp_plan → sp_execute |
| analysis | cognitive_check, agent swarm |
| orchestration | swarm_parallel, plan_create |

## COGNITIVE HOOKS (Fire Automatically)
| Hook | When | Purpose |
|------|------|---------|
| BAYES-001 | Session start | Initialize priors |
| BAYES-002 | Data changes | Detect anomalies |
| BAYES-003 | Task complete | Extract patterns |
| RL-001 | Context switch | Maintain continuity |
| RL-002 | Action done | Record outcome |
| RL-003 | Session end | Update policy |
| OPT-001 | Resource select | Optimize choice |

## MANUS 6 LAWS (Integrated)
1. **KV-Cache** - Sorted JSON, stable prefixes
2. **Tool Masking** - State-based availability
3. **External Memory** - Hot/Warm/Cold tiers
4. **Attention Anchor** - todo.md every 5 ops
5. **Error Preserve** - NEVER clean errors
6. **Response Vary** - Prevent mimicry

## CONTEXT PRESSURE (Auto-Monitor)
```
🟢 GREEN  (0-60%)  → Normal operation
🟡 YELLOW (60-75%) → Start batching
🟠 ORANGE (75-85%) → CREATE CHECKPOINT
🔴 RED    (85-92%) → URGENT handoff
⚫ CRITICAL (>92%) → STOP ALL WORK
```

## SWARM PATTERNS (8 Ready)
| Pattern | Use Case |
|---------|----------|
| PARALLEL | Independent extraction |
| PIPELINE | Sequential processing |
| CONSENSUS | Multi-agent voting |
| HIERARCHICAL | Tiered review |
| COMPETITIVE | Best solution wins |
| MAP_REDUCE | Split & merge |
| ENSEMBLE | Expert collaboration |
| COOPERATIVE | Shared learning |

## WORKFLOW (Hook-Enabled)
```
BRAINSTORM → PLAN → EXECUTE → REVIEW
     ↓         ↓       ↓         ↓
  CALC-001  BATCH-001 AGENT-001 FORMULA-001
     ↓         ↓       ↓         ↓
  BAYES-001 OPT-001  RL-002    BAYES-003
```

## MEMORY HIERARCHY
```
HOT  (50 items)  → In-memory, <1ms
WARM (recent)    → Disk, <100ms
COLD (archive)   → Disk, <1s
Auto-promote on 3+ accesses
```

## BUFFER ZONES
🟢 0-8: Normal
🟡 9-14: Checkpoint + todo_update
🔴 15-18: URGENT checkpoint
⚫ 19+: STOP - externalize to memory

## KEY FILES
| File | Purpose |
|------|---------|
| PRIORITY_ROADMAP.json | Current phase |
| CURRENT_STATE.json | Session state |
| ACTION_TRACKER.md | Recent actions |
| CLAUDE_DEV_SKILL.md | Full docs |

## MASTER EQUATION
Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L
- ≥0.85: Excellent | ≥0.70: Release | <0.70: Block

## SESSION END PROTOCOL
```
1. Fire RL-003 (policy update)
2. Fire BAYES-003 (pattern extract)
3. Update ACTION_TRACKER.md
4. Update CURRENT_STATE.json
5. prism_cognitive_check → Final Ω
```

## QUICK COMMANDS
```python
# Auto-orchestrate any task
orchestrate("your task description")

# Check context pressure
check_pressure()  # or status_bar()

# Store/retrieve from memory
store("key", value, tags=["tag1"])
retrieve("key")

# Fire cognitive hook
cog_fire("BAYES-002", {"change": "detected"})
```

## NEVER
- Skip bootstrap.py at session start
- Ignore context pressure warnings
- Clean errors (they're learning signals)
- Use tools without orchestrator check
- Forget to fire session-end hooks
