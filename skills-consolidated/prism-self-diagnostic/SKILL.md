---
name: prism-self-diagnostic
description: |
  PRISM's immune system. Monitors system health, detects degradation,
  learns from failures, and triggers self-healing. Orchestrates 6 diagnostic
  dispatchers that are individually powerful but currently uncoordinated:
  prism_telemetry, prism_pfp, prism_guard, prism_memory, prism_hook, prism_knowledge.
  Use when: Session boot (auto), periodic health checks, after errors,
  before major operations, when performance degrades.
  Key insight: These 6 dispatchers have 56 diagnostic actions between them
  but zero coordination. This skill is the diagnostic brain.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "self", "diagnostic", "immune", "system", "monitors", "health", "detects"
- Session lifecycle event — startup, checkpoint, recovery, handoff, or context pressure management.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-self-diagnostic")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_session→[relevant_action] for session operations
   - prism_skill_script→skill_content(id="prism-self-diagnostic") for procedure reference
   - prism_context→todo_update for state tracking

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Session state data, recovery instructions, or checkpoint confirmation
- **Failure**: State corruption → trigger L3 compaction recovery

### Examples
**Example 1**: User asks about self
→ Load skill: skill_content("prism-self-diagnostic") → Apply relevant knowledge → Provide structured response

**Example 2**: Task requires diagnostic guidance
→ Load skill → Extract applicable section → Cross-reference with related skills → Deliver recommendation

# PRISM Self-Diagnostic Intelligence
## The System's Immune System | 6 Dispatchers, 56 Actions, 1 Brain

## WHY THIS EXISTS

PRISM has diagnostic capabilities scattered across 6 dispatchers:
- prism_telemetry: 7 actions (dashboard, anomalies, optimization)
- prism_pfp: 6 actions (risk assessment, pattern detection, failure prediction)
- prism_guard: 14 actions (pattern learning, error capture, LKG tracking)
- prism_memory: 6 actions (cross-session graphs, integrity checks)
- prism_hook: 18 actions (coverage, gaps, performance, failures)
- prism_knowledge: 5 actions (registry stats, cross-query)

That's 56 diagnostic actions. Currently used: ~5 of them, ad hoc.
This skill coordinates all 56 into a coherent diagnostic engine.

## DIAGNOSTIC PROTOCOLS

### Protocol 1: BOOT HEALTH CHECK (Run at session start)
**Cost:** 6 tool calls | **Value:** Catch problems before they compound

```
Call 1: prism_knowledge→stats
  → Check: materials > 0, machines > 0, alarms > 0
  → Flag: Any registry at 0 = CRITICAL gap
  
Call 2: prism_telemetry→get_dashboard
  → Check: Dispatcher health, error rates, latency
  → Flag: Any dispatcher >5% error rate = WARNING
  
Call 3: prism_hook→coverage
  → Check: All categories have enabled hooks
  → Flag: Coverage < 100% = hooks may have been disabled
  
Call 4: prism_hook→gaps
  → Check: No critical event types are unhooked
  → Flag: Safety events without hooks = CRITICAL
  
Call 5: prism_pfp→get_dashboard
  → Check: Risk levels for current phase
  → Flag: Any HIGH risk = address before proceeding
  
Call 6: prism_memory→run_integrity
  → Check: Memory graph consistency
  → Flag: Orphaned nodes or broken edges = data loss risk
```

**Output:** Health scorecard with GREEN/YELLOW/RED per subsystem.
If any RED: prioritize fix before development work.

### Protocol 2: ERROR AUTOPSY (Run after any failure)
**Cost:** 4-6 calls | **Value:** Turn every error into prevention

```
Call 1: prism_guard→error_capture(error_details)
  → Records: error type, dispatcher, action, params, stack trace
  
Call 2: prism_guard→pattern_scan(scope="errors")
  → Detects: Is this a recurring pattern?
  → If pattern found: surface prevention rule
  
Call 3: prism_pfp→assess_risk(dispatcher, action, context)
  → Assesses: Should this error have been predicted?
  → If predictable: add to PFP pattern library
  
Call 4: prism_guard→learning_save(pattern, prevention)
  → Persists: New prevention rule for future sessions
  
Call 5: prism_telemetry→get_detail(dispatcher)
  → Context: Is this dispatcher generally healthy?
  → If unhealthy: flag for maintenance
```

**Output:** Error autopsy report with:
- Root cause
- Whether it was predictable
- Prevention rule (now saved)
- Whether the dispatcher needs maintenance

### Protocol 3: PERFORMANCE AUDIT (Run when things feel slow)
**Cost:** 5 calls | **Value:** Find bottlenecks, optimize throughput

```
Call 1: prism_telemetry→get_dashboard
  → Baseline: Overall system performance metrics

Call 2: prism_telemetry→get_anomalies
  → Detect: Abnormal latency, unusual patterns

Call 3: prism_telemetry→get_optimization
  → Suggest: Weight adjustments, routing improvements

Call 4: prism_hook→performance
  → Measure: Hook execution times (blocking hooks = slow)

Call 5: prism_context→context_monitor_check
  → Check: Context pressure, token usage efficiency
```

**Output:** Performance report with specific optimization actions.

### Protocol 4: REGISTRY HEALTH (Run weekly or after data changes)
**Cost:** 3-4 calls | **Value:** Data quality = intelligence quality

```
Call 1: prism_knowledge→stats
  → Inventory: Entry counts per registry
  → Expected: materials>500, machines>50, alarms>1000, formulas>100
  
Call 2: prism_knowledge→cross_query(query="coverage analysis")
  → Check: Cross-registry relationships
  → Flag: Isolated entries with no cross-references

Call 3: prism_data→material_search(query="*", limit=5)
  → Verify: Data layer can actually LOAD what knowledge indexes
  → Compare: knowledge→stats vs data→search results
  → Gap = W5 registry loading issue (KNOWN BUG)
```

**Output:** Registry health matrix showing indexed vs. loadable data.

### Protocol 5: LEARNING SYSTEM HEALTH
**Cost:** 4 calls | **Value:** Ensure the system actually learns

```
Call 1: prism_guard→pattern_scan(scope="all")
  → Check: How many patterns has the system learned?
  → If 0: Learning system is not being fed

Call 2: prism_guard→learning_query(type="prevention")
  → Check: Are prevention rules being applied?
  
Call 3: prism_memory→get_health
  → Check: Cross-session memory graph size and connectivity

Call 4: prism_pfp→get_patterns
  → Check: Predictive failure patterns count and accuracy
```

**Output:** Learning scorecard. If patterns = 0, the system isn't learning
from its mistakes. Recommendation: enable error autopsy after every failure.

## HEALTH SCORECARD FORMAT

```
╔═══════════════════════════════════════════╗
║ PRISM SYSTEM HEALTH - Session [N]        ║
╠═══════════════════════════════════════════╣
║ Registries     [GREEN/YELLOW/RED]        ║
║   Materials: [N] | Machines: [N]         ║
║   Alarms: [N]   | Formulas: [N]         ║
║ Dispatchers    [GREEN/YELLOW/RED]        ║
║   Error rate: [N]% | Latency: [N]ms     ║
║ Hooks          [GREEN/YELLOW/RED]        ║
║   Coverage: [N]% | Gaps: [N]            ║
║ Learning       [GREEN/YELLOW/RED]        ║
║   Patterns: [N] | Prevention rules: [N] ║
║ Memory         [GREEN/YELLOW/RED]        ║
║   Nodes: [N] | Integrity: [OK/WARN]     ║
╠═══════════════════════════════════════════╣
║ OVERALL: [GREEN/YELLOW/RED]              ║
║ Action Required: [None / List]           ║
╚═══════════════════════════════════════════╝
```

## SELF-HEALING TRIGGERS

| Condition | Auto-Response |
|-----------|--------------|
| Registry at 0 entries | Log warning, add to todo |
| Dispatcher error >10% | prism_telemetry→acknowledge + investigate |
| Hook coverage <100% | prism_hook→enable(disabled_hooks) |
| Pattern count = 0 | Enable error autopsy protocol |
| Memory integrity WARN | prism_memory→run_integrity(repair=true) |
| Context pressure >60% | prism_context→context_compress |

## INTEGRATION

- **Boot:** Run Protocol 1 as part of session_boot extended check
- **Error hook:** Protocol 2 fires on any `error:*` hook event
- **Cadence:** Protocol 3 at every 15th call (piggyback on existing cadence)
- **Weekly:** Protocol 4 on first session of each week
- **Learning:** Protocol 5 at session end
