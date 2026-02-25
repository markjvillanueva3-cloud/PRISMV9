---
name: prism-session-intelligence
description: |
  Productivity analytics and session optimization. Tracks efficiency metrics,
  identifies bottlenecks, and recommends improvements to development workflow.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "session", "intelligence", "productivity", "analytics", "optimization", "tracks", "efficiency"
- Session lifecycle event — startup, checkpoint, recovery, handoff, or context pressure management.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-session-intelligence")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_session→[relevant_action] for session operations
   - prism_skill_script→skill_content(id="prism-session-intelligence") for procedure reference
   - prism_context→todo_update for state tracking

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Session state data, recovery instructions, or checkpoint confirmation
- **Failure**: State corruption → trigger L3 compaction recovery

### Examples
**Example 1**: User asks about session
→ Load skill: skill_content("prism-session-intelligence") → Apply relevant knowledge → Provide structured response

**Example 2**: Task requires intelligence guidance
→ Load skill → Extract applicable section → Cross-reference with related skills → Deliver recommendation

# PRISM Session Intelligence
## Productivity Analytics & Workflow Optimization

## Session Metrics

| Metric | Source | Target |
|--------|--------|--------|
| Useful output / total calls | prism_telemetry | >70% |
| Time to first useful output | Session timestamps | <3 calls |
| Compaction events per session | prism_context:context_pressure | 0-1 |
| Wasted calls (errors, retries) | prism_guard:failure_library | <10% |
| Task completion rate | prism_atcs:task_status | >90% |
| Context pressure at end | prism_context:context_pressure | <60% |

## Bottleneck Detection

### Pattern: Boot Overhead
- **Signal:** >5 calls before first productive work
- **Cause:** Excessive state loading, redundant checks
- **Fix:** Streamline boot sequence, lazy-load non-critical state

### Pattern: Thrashing
- **Signal:** Same dispatcher called 3+ times with slight variations
- **Cause:** Wrong parameters, unclear requirements, trial-and-error
- **Fix:** Better intent disambiguation, pre-validate parameters

### Pattern: Context Exhaustion
- **Signal:** Compaction at <50% through task
- **Cause:** Too many large skill loads, verbose tool outputs
- **Fix:** Load skills on-demand, compress tool outputs, use microsessions

### Pattern: Error Cascades
- **Signal:** Error → fix attempt → new error → fix attempt chain
- **Cause:** Root cause not identified, fixing symptoms
- **Fix:** Stop, diagnose root cause before attempting fixes

## Session Planning Recommendations

### Short Session (<20 calls budget)
- 1 focused task only
- Skip deep analysis, use quick-path
- Checkpoint at call 10

### Medium Session (20-40 calls)
- 2-3 related tasks
- Full analysis for primary task
- Checkpoint at 15 and 30

### Long Session (40+ calls)
- Use ATCS for task decomposition
- Mandatory microsessions for independent subtasks
- Checkpoint every 10 calls
- Watch context pressure from call 30+

## Integration
- `prism_telemetry→get_dashboard` for real-time metrics
- `prism_session→context_pressure` for capacity monitoring
- `prism_context→todo_read` for task tracking
- Auto-fires at session_end to log session report
