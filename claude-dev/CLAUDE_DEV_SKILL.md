# PRISM Claude Development Enhancement Skill

> **Version:** 1.0.0  
> **Purpose:** Maximize Claude's development capabilities through comprehensive tool utilization  
> **Location:** C:\PRISM\claude-dev\CLAUDE_DEV_SKILL.md

---

## 🎯 Overview

This skill provides Claude with a complete framework for self-enhancement, combining:
- **8 Swarm Patterns** for parallel multi-agent work
- **7 Cognitive Hooks** for learning and adaptation
- **6 Context Laws** (Manus Laws) for optimal context engineering
- **Auto-Orchestration** for 90% automation of tool selection
- **Hierarchical Memory** for unlimited context expansion

---

## 📦 Component Map

```
C:\PRISM\claude-dev\
├── swarms\                    # 8 swarm templates
│   ├── PARALLEL_TEMPLATE.json     # Independent parallel tasks
│   ├── PIPELINE_TEMPLATE.json     # Sequential processing
│   ├── CONSENSUS_TEMPLATE.json    # Multi-agent voting
│   ├── HIERARCHICAL_TEMPLATE.json # Tiered review
│   ├── COMPETITIVE_TEMPLATE.json  # Best solution competition
│   ├── MAP_REDUCE_TEMPLATE.json   # Split & merge
│   ├── ENSEMBLE_TEMPLATE.json     # Expert collaboration
│   └── COOPERATIVE_TEMPLATE.json  # Shared learning
├── hooks\                     # Cognitive wiring
│   ├── cognitive_wiring.py        # 7 cognitive hooks
│   └── context_hooks.py           # 6 Manus Laws
├── orchestration\             # Auto-routing
│   └── auto_orchestrator.py       # Intent → Tool → Execute
├── context\                   # Context management
│   ├── pressure_monitor.py        # Zone tracking
│   └── memory_manager.py          # Hot/Warm/Cold tiers
└── CLAUDE_DEV_SKILL.md        # This file
```

---

## 🔄 Swarm Patterns Reference

### When to Use Each Pattern

| Pattern | Use When | Agents | Time |
|---------|----------|--------|------|
| **PARALLEL** | Independent tasks, bulk extraction | 2-10 | Fast |
| **PIPELINE** | Sequential transformation, refinement | 2-10 | Medium |
| **CONSENSUS** | Ambiguous decisions, quality voting | 3-7 (odd) | Medium |
| **HIERARCHICAL** | Safety-critical review, approval chains | 2-4 layers | Slow |
| **COMPETITIVE** | Optimization, creative solutions | 2-6 | Medium |
| **MAP_REDUCE** | Large datasets, domain decomposition | 2-10 | Fast |
| **ENSEMBLE** | Multi-domain expertise needed | 2-8 | Medium |
| **COOPERATIVE** | Research, knowledge building | 2-6 | Slow |

### Quick Selection Guide

```
Task Type → Pattern
─────────────────────────────────────
Multiple independent extractions → PARALLEL
Generate → Review → Polish → PIPELINE  
"Which approach is best?" → CONSENSUS
Safety-critical code → HIERARCHICAL
Find optimal parameters → COMPETITIVE
Analyze huge codebase → MAP_REDUCE
Need materials + tooling + dynamics → ENSEMBLE
Explore best practices → COOPERATIVE
```

### MCP Tool Mapping

```python
# Parallel execution
prism:swarm_parallel(agents=[...], input={...}, name="...")

# Pipeline execution
prism:swarm_pipeline(agents=[...], input={...}, name="...")

# Consensus voting
prism:swarm_consensus(agents=[...], input={...}, name="...", threshold=0.66)

# Generic swarm with pattern
prism:swarm_execute(agents=[...], input={...}, pattern="hierarchical", name="...")
```

---

## 🧠 Cognitive Hooks Reference

### The 7 Cognitive Hooks

| Hook | Purpose | Auto-Trigger |
|------|---------|--------------|
| **BAYES-001** | Initialize prior beliefs | Session start, new domain |
| **BAYES-002** | Detect changes, update beliefs | Data update, unexpected result |
| **BAYES-003** | Test hypotheses, extract patterns | Task complete, multiple hypotheses |
| **RL-001** | State continuity | Session start, context switch |
| **RL-002** | Record outcomes | Action complete, error occurred |
| **RL-003** | Update policy | Batch complete, session end |
| **OPT-001** | Optimization trigger | Resource selection, optimization needed |

### Usage Examples

```python
from hooks.cognitive_wiring import fire, auto_fire, status

# Initialize priors for a domain
result = fire("BAYES-001", {"domain": "materials"})

# Record an outcome for learning
result = fire("RL-002", {
    "action": "calculate_cutting_force",
    "action_type": "physics_calc",
    "reward": 0.9,  # Success score
    "success": True
})

# Auto-fire all hooks for an event
results = auto_fire("task_complete", {"success": True, "outcome": {...}})

# Check system status
print(status())
```

### Integration with Workflow

```
SESSION START
  └── fire BAYES-001 (initialize priors)
  └── fire RL-001 (restore state)

EACH TASK
  └── fire BAYES-003 (test hypotheses if multiple approaches)
  └── fire OPT-001 (optimize selection if needed)
  └── [Execute task]
  └── fire RL-002 (record outcome)
  └── fire BAYES-002 (check for unexpected results)

SESSION END
  └── fire RL-003 (update policy from all outcomes)
  └── fire BAYES-003 (extract patterns from session)
```

---

## 📐 Manus 6 Laws Implementation

### Law 1: KV-Cache Stability
**Principle:** Deterministic serialization for cache hits

```python
from hooks.context_hooks import get_hooks

hooks = get_hooks()

# Sort JSON for stable serialization
sorted_data = hooks.sort_json(my_data, write_path="output.json")

# Check content stability
stability = hooks.check_stability(prompt_content)
if not stability["stable"]:
    print(f"Issues: {stability['issues']}")
```

### Law 2: Tool Masking by State
**Principle:** Only show relevant tools for current workflow state

```python
# Get available tools for current state
tools = hooks.get_tool_mask("EXECUTION")
# Returns: {"allowed": [...], "masked": [...]}

# Check if specific tool is allowed
if hooks.is_allowed("prism_sp_execute", "PLANNING"):
    # Proceed with tool
```

### Law 3: External Memory
**Principle:** Externalize to file system for unlimited expansion

```python
# Externalize content
result = hooks.externalize("session_context", large_data, memory_type="snapshot")
# Returns: {"restoration_key": "snapshot:session_context:20250204_123456", ...}

# Restore later
restored = hooks.restore("snapshot:session_context:20250204_123456")
```

### Law 4: Attention Anchoring
**Principle:** Keep goals in recent attention via todo.md

```python
# Update todo (call every 5-8 tool calls)
hooks.update_todo(
    task_name="P0: Tool Discovery",
    current_focus="Creating swarm templates",
    next_action="Create cognitive_wiring.py",
    steps=[
        {"description": "Swarm templates", "complete": True},
        {"description": "Hook wiring", "complete": False}
    ],
    quality_scores={"S": 0.85, "omega": 0.78}
)

# Read todo to refresh attention
todo = hooks.read_todo()
```

### Law 5: Error Preservation
**Principle:** Keep errors in context for learning - NEVER clean errors

```python
# Preserve error (ALWAYS do this on errors)
hooks.preserve_error(
    tool_name="prism_agent_swarm",
    error_message="Agent not found: AGT-SONNET-006",
    error_type="NOT_FOUND",
    parameters={"agents": ["AGT-SONNET-006"]},
    context_summary="Attempting parallel swarm deployment"
)

# Analyze patterns
patterns = hooks.analyze_errors(days=7)
```

### Law 6: Response Variation
**Principle:** Prevent few-shot mimicry with structured variation

```python
# Add variation to response
varied = hooks.vary_response("Got it. Moving on to the next task.", level="MEDIUM")
# Returns varied phrasing
```

---

## 🎮 Auto-Orchestrator Usage

### Quick Start

```python
from orchestration.auto_orchestrator import orchestrate

# Just describe your task - orchestrator handles the rest
result = orchestrate("Calculate the cutting force for Ti-6Al-4V with 10mm depth")

print(result)
# {
#   "task_id": "TASK-20250204123456",
#   "classification": {"type": "calculation", "mode": "single_tool"},
#   "plan": {
#     "tools": ["prism:calc_cutting_force"],
#     "agents": ["AGT-SONNET-MATERIALS"],
#     "estimated_calls": 1
#   },
#   "recommended_action": "Call prism:calc_cutting_force directly"
# }
```

### Task Type Detection

The orchestrator automatically detects task type from keywords:

| Keywords | Task Type | Mode |
|----------|-----------|------|
| calculate, formula, force, power | CALCULATION | single_tool |
| find, search, list, material | DATA_QUERY | single_tool |
| write, create, code, script | CODE_GENERATION | agent_single |
| analyze, compare, pattern | ANALYSIS | tool_chain |
| swarm, parallel, comprehensive | ORCHESTRATION | swarm_* |
| session, checkpoint, state | SESSION | single_tool |
| validate, verify, safety | VALIDATION | tool_chain |

### Manual Override

```python
from orchestration.auto_orchestrator import AutoOrchestrator

orch = AutoOrchestrator()

# Get full plan
plan = orch.plan("Deploy parallel swarm for material extraction")

# Override decisions if needed
plan.execution_mode = ExecutionMode.SWARM_PARALLEL
plan.agents = ["AGT-SONNET-MATERIALS", "AGT-SONNET-EXTRACTION", "AGT-HAIKU-FORMAT"]
```

---

## 📊 Context Pressure Monitoring

### Zone Definitions

| Zone | Range | Emoji | Action |
|------|-------|-------|--------|
| GREEN | 0-60% | 🟢 | Normal operation |
| YELLOW | 60-75% | 🟡 | Start batching, prepare checkpoint |
| ORANGE | 75-85% | 🟠 | CREATE CHECKPOINT NOW |
| RED | 85-92% | 🔴 | URGENT handoff |
| CRITICAL | >92% | ⚫ | STOP EVERYTHING |

### Usage

```python
from context.pressure_monitor import check_pressure, status_bar

# Check current pressure
status = check_pressure(tokens_used=150000, tool_calls=12)

print(status["emoji"], status["zone"])  # 🟠 ORANGE
print(status["recommendations"][0])      # 🔴 CREATE CHECKPOINT NOW

# Visual status bar
print(status_bar(150000))
# 🟠 [████████████████████████████████░░░░░░░░] 75.0% (ORANGE)
```

### Auto-Actions

When entering critical zones, auto-actions are recommended:

```python
if status["auto_actions"]:
    for action in status["auto_actions"]:
        print(f"Execute: {action['tool']} (Priority: {action['priority']})")
```

---

## 💾 Hierarchical Memory

### Three Tiers

| Tier | Location | Access Time | Capacity |
|------|----------|-------------|----------|
| HOT | In-memory | <1ms | 50 items |
| WARM | Disk (recent) | <100ms | Unlimited |
| COLD | Disk (archive) | <1s | Unlimited |

### Usage

```python
from context.memory_manager import store, retrieve, stats

# Store with auto-tiering (defaults to WARM)
store("session_30_context", {"focus": "Tool inventory"}, tags=["session"])

# Store in HOT for immediate access
store("current_task", {...}, tier=MemoryTier.HOT)

# Retrieve (auto-promotes if frequently accessed)
result = retrieve("session_30_context")
print(result["content"], result["tier"])

# Get stats
s = stats()
print(f"Hot: {s.hot_count}, Warm: {s.warm_count}, Cold: {s.cold_count}")
```

---

## 🚀 Quick Start Checklist

### Session Start
```
1. ☐ prism:prism_gsd_core - Load instructions
2. ☐ fire("BAYES-001", {"domain": "current_task"}) - Init priors
3. ☐ fire("RL-001", {}) - Restore state
4. ☐ check_pressure(tokens_used) - Check zone
5. ☐ read_todo() - Refresh attention
```

### Every 5-8 Tool Calls
```
1. ☐ update_todo(...) - Anchor attention
2. ☐ check_pressure(...) - Monitor zone
3. ☐ fire("RL-002", {...}) - Record outcome if task complete
```

### Session End
```
1. ☐ fire("RL-003", {...}) - Update policy
2. ☐ fire("BAYES-003", {...}) - Extract patterns
3. ☐ externalize("session_summary", {...}) - Save context
4. ☐ prism:prism_session_end_full - Full shutdown
```

---

## 📈 Metrics Targets

| Metric | Before | Target | How |
|--------|--------|--------|-----|
| Tool Utilization | 21% | 95% | Auto-orchestrator |
| Context Expansion | 1x | 3x | Hierarchical memory |
| Automation Index | 10% | 90% | Swarm patterns |
| Learning Rate | 0% | 50% | Cognitive hooks |
| Session Continuity | 60% | 99% | State management |

---

## 🔗 Related Resources

- **MCP Tools:** 277 available via `prism:*`
- **Scripts:** 322 in `C:\PRISM\scripts\`
- **Agents:** 75 registered (35 active)
- **Skills:** 153 in `/mnt/skills/user/prism-*/`
- **Hooks:** 25 in hook registry

---

*Last Updated: 2025-02-04*
*Author: PRISM Claude Development Enhancement System*
