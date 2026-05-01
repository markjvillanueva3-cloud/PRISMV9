---
name: prism-memory-graph-guide
description: |
  Using prism_memory for cross-session continuity. Decision tracing, similar
  session finding, integrity checking. Makes PRISM remember across sessions.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "memory", "graph", "guide", "using", "cross", "session", "continuity", "decision"
- Session lifecycle event — startup, checkpoint, recovery, handoff, or context pressure management.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-memory-graph-guide")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_session→[relevant_action] for session operations
   - prism_skill_script→skill_content(id="prism-memory-graph-guide") for procedure reference
   - prism_context→todo_update for state tracking

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Session state data, recovery instructions, or checkpoint confirmation
- **Failure**: State corruption → trigger L3 compaction recovery

### Examples
**Example 1**: User asks about memory
→ Load skill: skill_content("prism-memory-graph-guide") → Apply relevant knowledge → Provide structured response

**Example 2**: Task requires graph guidance
→ Load skill → Extract applicable section → Cross-reference with related skills → Deliver recommendation

# PRISM Memory Graph Guide
## All 6 prism_memory Actions

## Action Reference

| Action | Purpose | When |
|--------|---------|------|
| `get_health` | Graph integrity and size stats | Session boot, diagnostics |
| `trace_decision` | Follow decision chain: why was X chosen? | Debugging, auditing |
| `find_similar` | Find sessions/decisions similar to current | Reusing past work |
| `get_session` | Retrieve specific session's memory nodes | Reviewing past work |
| `get_node` | Get specific memory node details | Deep inspection |
| `run_integrity` | Validate graph consistency | After errors, periodic |

## Key Use Cases

### 1. "We solved this before" — Reuse Past Decisions
```
prism_memory→find_similar({ query: "4140 steel roughing strategy" })
→ Returns: Session 47 had similar task, chose adaptive clearing at Vc=180
→ Reuse: Start from those parameters instead of recalculating from scratch
```

### 2. "Why did we choose this?" — Trace Decision Lineage
```
prism_memory→trace_decision({ decision_id: "tool_choice_session52" })
→ Returns: Chose carbide over ceramic because:
  - Material hardness <35 HRC (ceramic threshold is 45+)
  - Required thread milling after roughing (ceramic too brittle)
  - Cost constraint: carbide insert $12 vs ceramic $35
```

### 3. Session Recovery After Compaction
```
prism_memory→get_session({ session_id: "latest" })
→ Returns: Key decisions, state snapshots, todo items
→ Use to reconstruct context without re-reading full transcript
```

### 4. Health Monitoring
```
prism_memory→get_health()
→ node_count, edge_count, orphan_count, last_integrity_check
→ If orphans > 0: run_integrity() to clean up
```

## Integration with Session Workflow
- **Boot:** `get_health()` → verify graph OK
- **Mid-session:** `find_similar()` → avoid repeating past work
- **Decision points:** Auto-log via hooks → builds graph automatically
- **End:** State saved → graph updated with new decisions
