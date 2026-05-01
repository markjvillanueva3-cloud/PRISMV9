---
name: prism-self-evolution-engine
description: |
  Auto-improvement from usage patterns. Tracks which skills/dispatchers are used,
  which fail, which get repeated, and evolves recommendations and defaults.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "self", "evolution", "engine", "auto", "improvement", "usage", "patterns", "tracks"
- Code architecture decision, pattern selection, or development workflow guidance.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-self-evolution-engine")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_dev→[relevant_action] for development tasks
   - prism_sp→[relevant_action] for superpowers workflow
   - prism_skill_script→skill_content(id="prism-self-evolution-engine") for pattern reference

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Reference knowledge applicable to current task
- **Failure**: Content not found → verify skill exists in index

### Examples
**Example 1**: User asks about self
→ Load skill: skill_content("prism-self-evolution-engine") → Apply relevant knowledge → Provide structured response

**Example 2**: Task requires evolution guidance
→ Load skill → Extract applicable section → Cross-reference with related skills → Deliver recommendation

# PRISM Self-Evolution Engine
## Learn from Usage, Improve Automatically

## Core Concept
Track every interaction pattern → identify inefficiencies → auto-optimize.

## Usage Telemetry Signals

| Signal | What It Reveals | Auto-Action |
|--------|----------------|-------------|
| Dispatcher called repeatedly with same params | Missing default/cache | Add to frequently-used cache |
| Skill loaded but never referenced in output | Skill not useful for task type | Adjust skill_find_for_task weights |
| Error → retry → success pattern | Recoverable error not handled | Add to error-handling-patterns |
| User corrects Claude's output | Wrong default/assumption | Update learned preferences |
| Long reasoning chains for simple tasks | Over-thinking, missing shortcut | Create quick-path rule |
| Same 3-skill chain used repeatedly | Implicit workflow not codified | Generate composite skill |

## Evolution Loops

### Loop 1: Parameter Defaults (Fastest)
```
Observe: material_get("4140") called 47 times this month
Learn: 4140 is the most common material for this user
Evolve: Pre-load 4140 defaults, suggest it first in ambiguous queries
```

### Loop 2: Skill Relevance (Medium)
```
Observe: prism-cam-strategies loaded for 80% of toolpath tasks
Learn: High correlation between toolpath queries and CAM strategies
Evolve: Auto-bundle cam-strategies with toolpath dispatcher calls
```

### Loop 3: Workflow Patterns (Slowest, Highest Value)
```
Observe: User always does material_get → tool_recommend → speed_feed → safety_check
Learn: This is a "parameter setup" workflow
Evolve: Create one-shot "setup_cutting_params" that chains all four
```

## Implementation

### Data Collection
- `prism_telemetry→get_dashboard` for call patterns
- `prism_guard→pattern_scan` for error patterns
- `prism_memory→find_similar` for cross-session patterns

### Evolution Storage
- Learned defaults: `C:\PRISM\state\learned_defaults.json`
- Workflow patterns: `C:\PRISM\state\learned_workflows.json`
- Skill weights: `C:\PRISM\state\skill_relevance.json`

### Safety Constraints
- Never auto-modify safety-critical calculations
- Evolution suggestions require human approval for first 10 instances
- Rollback: keep last 5 versions of any evolved parameter
- Log all evolutions to audit trail
