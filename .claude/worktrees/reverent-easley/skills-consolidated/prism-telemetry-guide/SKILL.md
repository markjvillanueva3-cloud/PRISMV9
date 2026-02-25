---
name: prism-telemetry-guide
description: |
  Using prism_telemetry for self-optimization. Reading dashboards,
  interpreting anomalies, acting on optimization suggestions, weight management.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "telemetry", "guide", "using", "self", "optimization", "reading", "dashboards"
- Session lifecycle event — startup, checkpoint, recovery, handoff, or context pressure management.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-telemetry-guide")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_session→[relevant_action] for session operations
   - prism_skill_script→skill_content(id="prism-telemetry-guide") for procedure reference
   - prism_context→todo_update for state tracking

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Session state data, recovery instructions, or checkpoint confirmation
- **Failure**: State corruption → trigger L3 compaction recovery

### Examples
**Example 1**: User asks about telemetry
→ Load skill: skill_content("prism-telemetry-guide") → Apply relevant knowledge → Provide structured response

**Example 2**: Task requires guide guidance
→ Load skill → Extract applicable section → Cross-reference with related skills → Deliver recommendation

# PRISM Telemetry Guide
## All 7 prism_telemetry Actions

## Action Reference

| Action | Purpose | When |
|--------|---------|------|
| `get_dashboard` | Overview: call counts, latency, error rates | Session boot, periodic |
| `get_detail` | Deep metrics for specific dispatcher | Investigating performance |
| `get_anomalies` | Auto-detected unusual patterns | After unexpected behavior |
| `get_optimization` | AI-suggested improvements | Looking to improve efficiency |
| `acknowledge` | Mark anomaly as reviewed | After investigating |
| `freeze_weights` | Lock dispatcher routing weights | Stable configuration found |
| `unfreeze_weights` | Allow weight auto-adjustment | Experimenting with routing |

## Dashboard Interpretation

### Key Metrics
| Metric | Healthy | Warning | Action Needed |
|--------|---------|---------|---------------|
| Call success rate | >95% | 85-95% | <85%: check inputs |
| Avg latency | <2s | 2-5s | >5s: simplify queries |
| Error rate | <5% | 5-15% | >15%: systematic issue |
| Cache hit rate | >30% | 10-30% | <10%: review caching |

### Reading Anomalies
```
prism_telemetry→get_anomalies()
→ "prism_calc:speed_feed latency spike 3.2x normal"
→ Investigate: get_detail({dispatcher: "prism_calc"})
→ Root cause: complex material with many parameters
→ Fix: Pre-cache common materials, simplify input
```

## Weight Management
Dispatcher routing uses weighted scores. Telemetry auto-adjusts weights based on performance:
- High success + low latency → weight increases (preferred route)
- High error rate → weight decreases (avoided route)
- `freeze_weights` when current routing is optimal
- `unfreeze_weights` when experimenting with new dispatchers

## Optimization Loop
```
1. get_dashboard() → identify worst-performing area
2. get_detail(worst_dispatcher) → understand why
3. get_optimization() → get suggested improvements
4. Implement changes
5. Monitor: get_dashboard() after changes → verify improvement
6. If stable: freeze_weights()
```
