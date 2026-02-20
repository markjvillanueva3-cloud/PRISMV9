---
name: prism-predictive-maintenance
description: |
  Using prism_pfp for failure prediction, risk assessment, pattern detection.
  Setting up monitoring, interpreting risk scores, acting on predictions.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "predictive", "maintenance", "using", "failure", "prediction", "risk", "assessment"
- Session lifecycle event — startup, checkpoint, recovery, handoff, or context pressure management.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-predictive-maintenance")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_session→[relevant_action] for session operations
   - prism_skill_script→skill_content(id="prism-predictive-maintenance") for procedure reference
   - prism_context→todo_update for state tracking

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Session state data, recovery instructions, or checkpoint confirmation
- **Failure**: State corruption → trigger L3 compaction recovery

### Examples
**Example 1**: User asks about predictive
→ Load skill: skill_content("prism-predictive-maintenance") → Apply relevant knowledge → Provide structured response

**Example 2**: Task requires maintenance guidance
→ Load skill → Extract applicable section → Cross-reference with related skills → Deliver recommendation

# PRISM Predictive Maintenance
## All 6 prism_pfp Actions

## Action Reference

| Action | Purpose | Frequency |
|--------|---------|-----------|
| `get_dashboard` | Overall system health + risk summary | Every session boot |
| `assess_risk` | Risk score for specific operation/component | Before critical operations |
| `get_patterns` | Detected failure patterns from history | Weekly review |
| `get_history` | Historical failure/near-miss events | Root cause analysis |
| `force_extract` | Force pattern extraction from recent data | After incidents |
| `update_config` | Adjust detection thresholds/sensitivity | Quarterly tuning |

## Risk Score Interpretation

| Score | Level | Action |
|-------|-------|--------|
| 0.0-0.3 | 🟢 Low | Normal operations, no action needed |
| 0.3-0.5 | 🟡 Watch | Monitor more closely, check at next opportunity |
| 0.5-0.7 | 🟠 Elevated | Schedule preventive maintenance, investigate root cause |
| 0.7-0.9 | 🔴 High | Immediate attention, reduce loads, plan repair |
| 0.9-1.0 | ⚫ Critical | Stop operation, mandatory intervention |

## Workflow: Proactive Monitoring
```
1. Session boot: pfp→get_dashboard() → overall health
2. Before critical op: pfp→assess_risk({component: "spindle", operation: "heavy_roughing"})
3. If risk > 0.5: Investigate → adjust parameters → reassess
4. Weekly: pfp→get_patterns() → review emerging patterns
5. After any failure: pfp→force_extract() → capture pattern for future prevention
```

## Common Failure Patterns
| Pattern | Early Signal | Prevention |
|---------|-------------|------------|
| Spindle bearing wear | Increasing vibration, thermal drift | Monitor temperature trend |
| Tool breakage cascade | Chip load spikes, force anomalies | Tighter chip load limits |
| Coolant degradation | Temperature rise, finish degradation | Schedule coolant checks |
| Axis backlash growth | Position errors trending up | Periodic compensation update |
