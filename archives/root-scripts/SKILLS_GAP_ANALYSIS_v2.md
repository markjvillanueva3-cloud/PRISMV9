# PRISM Skills System — Deep Gap Analysis & Enhancement Proposals
## Post-Audit Brainstorm | 87 Skills, 31 Dispatchers, 368 Actions

---

## ANALYSIS METHODOLOGY

Cross-referenced:
1. All 7 brainstorm lenses (Challenge, Multiply, Invert, Fuse, 10x, Simplify, Future)
2. Current 87-skill inventory vs. 31 dispatchers / 368 actions
3. Hook coverage (100% - 62/62 hooks active)
4. Knowledge registries (11,830 entries across 9 registries)
5. Common failure patterns from prism_guard and session telemetry

---

## FINDING 1: DISPATCHER BLIND SPOTS (6 dispatchers with ZERO skill guidance)

These dispatchers exist, are functional, but have no skill teaching optimal usage:

| Dispatcher | Actions | What It Does | Skill Coverage |
|-----------|---------|-------------|----------------|
| `prism_thread` | 12 | Tap drill, thread milling, engagement, Go/No-Go, G-code gen | **ZERO** |
| `prism_toolpath` | 8 | Strategy selection, params, material strategies, novel strategies | Partial (cam-strategies) |
| `prism_compliance` | 8 | ISO 13485, AS9100, ITAR, SOC2, HIPAA, FDA templates | **ZERO** |
| `prism_pfp` | 6 | Predictive failure prevention, risk assessment, pattern detection | **ZERO** |
| `prism_memory` | 6 | Cross-session memory graph, decision tracing, similarity search | **ZERO** |
| `prism_telemetry` | 7 | Dashboard, anomalies, optimization, weight management | **ZERO** |

**Impact:** These are powerful tools that never get used because no skill teaches when/how to invoke them. Especially prism_thread (12 actions for a common manufacturing operation) and prism_compliance (6 regulatory frameworks) represent massive underutilization.

---

## FINDING 2: META-COGNITIVE GAPS (Cross-cutting skills that make everything better)

### Gap A: No Dispatcher Routing Decision Skill
**The single highest-impact gap.** When a user asks "what speed for 4140 steel?", the system must decide: `prism_calc:speed_feed` vs `prism_data:material_get` + manual calc vs `prism_toolpath:params_calculate`. There's no skill that teaches optimal routing logic.

Currently: Claude guesses based on prompt-engineering and cognitive-core patterns.
Needed: Explicit decision matrix mapping query patterns → dispatcher chains.

### Gap B: No Cross-Dispatcher Workflow Chains
Common manufacturing tasks require 3-5 dispatchers in sequence:
- "Set up a new job" → material_get → tool_recommend → speed_feed → safety checks
- "Troubleshoot chatter" → alarm_decode → stability calc → toolpath adjust
- "Thread this hole" → thread specs → tap drill → cutting params → G-code

No skill documents these multi-step chains. Each session reinvents them.

### Gap C: No Output Formatting Standard
Results go to different audiences (CNC operators, engineers, managers) but no skill defines formatting standards. A speed/feed recommendation for an operator needs different formatting than for a CAM programmer.

### Gap D: No "When Things Go Wrong" Recovery Patterns
Error-handling-patterns covers code errors. But what about:
- Calculation returns unreasonable values → what to check
- Dispatcher returns empty/null → fallback strategy
- Multi-step workflow fails at step 3 of 5 → partial recovery
- Context pressure forces truncation → what to preserve

---

## FINDING 3: MANUFACTURING DOMAIN GAPS

### Gap E: No Workholding Intelligence
prism_safety has `calculate_clamp_force_required`, `validate_workholding_setup`, `check_pullout_resistance`, `analyze_liftoff_moment`, `calculate_part_deflection`, `validate_vacuum_fixture` — but no skill teaches workholding strategy selection.

### Gap F: No Fixture/Setup Planning
Given a part, how to orient it, how many setups, which surfaces to machine first, how to datum — zero skill coverage for process planning fundamentals.

### Gap G: No Tool Life Management
prism_calc has tool_life calculations, but no skill covers:
- When to re-order tools based on predicted wear
- How to balance tool life vs productivity
- Cost-per-part optimization with tool changes
- Tool inventory management strategy

---

## PROPOSED ENHANCEMENTS (Ranked by Impact × Feasibility)

### TIER 1: TRANSFORMATIVE (would improve EVERY session)

**1. prism-dispatcher-router** (~8KB)
The master routing skill. Given ANY manufacturing query, maps to optimal dispatcher chain.
```
Query analysis → Entity extraction → Intent classification → Dispatcher selection → Action sequencing → Parameter mapping
```
Integrates: intent-disambiguator + every dispatcher's action catalog.
Why transformative: Eliminates wrong-tool usage, reduces wasted calls by 30-40%.

**2. prism-workflow-chains** (~10KB)
Documented multi-dispatcher workflows for the 20 most common manufacturing tasks.
Each chain: trigger condition → step sequence → data flow → error handling → output format.
Why transformative: Stops reinventing wheel every session. Ensures consistent quality.

**3. prism-output-standards** (~6KB)
Audience-aware formatting rules for all PRISM outputs.
Operator view: simple, units prominent, safety warnings bold.
Engineer view: full parameters, uncertainty ranges, formula references.
Manager view: summary, cost impact, time impact.
Why transformative: Same calculation, 3x more useful depending on audience.

**4. prism-recovery-playbook** (~7KB)
When calculations fail, dispatchers return errors, or workflows break mid-stream.
Decision tree: error type → diagnostic steps → recovery action → fallback strategy.
Why transformative: Prevents the "error → guess → worse error" cascade.

### TIER 2: HIGH-VALUE DISPATCHER SKILLS (unlock unused capabilities)

**5. prism-threading-mastery** (~8KB)
Complete threading skill covering all 12 prism_thread actions.
Tap vs thread mill decision. Engagement calculations. Go/No-Go gauge selection.
G-code generation patterns for FANUC/Siemens/HAAS.
Why high-value: Threading is ~15% of machining operations, currently zero guidance.

**6. prism-toolpath-strategy** (~8KB)
Deep guide to prism_toolpath's 8 actions.
Feature → strategy mapping. Material-specific strategies. Novel PRISM strategies.
Parameter calculation methodology. Integration with prism_calc for validation.
Why high-value: Toolpath selection is THE highest-impact decision in CAM.

**7. prism-compliance-guide** (~6KB)
How to use prism_compliance for ISO 13485, AS9100, ITAR, SOC2, HIPAA, FDA.
Template application workflow. Gap analysis methodology. Audit preparation.
Why high-value: Regulatory compliance is non-negotiable for medical/aerospace.

**8. prism-predictive-maintenance** (~6KB)
Using prism_pfp for failure prediction, risk assessment, pattern detection.
Setting up monitoring. Interpreting risk scores. Acting on predictions.
Why high-value: Preventing failures > fixing failures.

### TIER 3: DEVELOPMENT ACCELERATORS

**9. prism-memory-graph-guide** (~5KB)
Using prism_memory for cross-session continuity.
Decision tracing. Similar session finding. Integrity checking.
Why valuable: Memory graph exists but nobody knows how to use it effectively.

**10. prism-telemetry-guide** (~5KB)
Using prism_telemetry for self-optimization.
Reading dashboards. Interpreting anomalies. Acting on optimization suggestions.
Weight management for dispatcher routing.
Why valuable: Self-optimization loop sits idle without guidance.

**11. prism-workholding-strategy** (~7KB)
Fixture selection, clamping force, setup planning, datum strategy.
Leveraging prism_safety's 6 workholding actions.
Why valuable: Bad workholding = scrapped parts, crashed machines.

**12. prism-cost-optimizer** (~6KB)
Tool life vs productivity balancing. Cost-per-part calculations.
Tool change optimization. Batch size economics.
Uses prism_calc:cost_optimize and multi_optimize actions.
Why valuable: Shops care about cost above almost everything else.

---

## SUMMARY MATRIX

| # | Skill | Impact | Tokens | Dispatchers Unlocked |
|---|-------|--------|--------|---------------------|
| 1 | dispatcher-router | 🔴 Critical | ~8KB | ALL 31 |
| 2 | workflow-chains | 🔴 Critical | ~10KB | Multi-dispatcher |
| 3 | output-standards | 🟠 High | ~6KB | All output |
| 4 | recovery-playbook | 🟠 High | ~7KB | Error handling |
| 5 | threading-mastery | 🟠 High | ~8KB | prism_thread (12) |
| 6 | toolpath-strategy | 🟠 High | ~8KB | prism_toolpath (8) |
| 7 | compliance-guide | 🟡 Medium | ~6KB | prism_compliance (8) |
| 8 | predictive-maintenance | 🟡 Medium | ~6KB | prism_pfp (6) |
| 9 | memory-graph-guide | 🟡 Medium | ~5KB | prism_memory (6) |
| 10 | telemetry-guide | 🟡 Medium | ~5KB | prism_telemetry (7) |
| 11 | workholding-strategy | 🟡 Medium | ~7KB | prism_safety (6) |
| 12 | cost-optimizer | 🟡 Medium | ~6KB | prism_calc (2) |

**Total addition: 12 skills, ~82KB**
**Final system: 99 skills, ~1,142KB**
**Dispatcher action coverage: from ~60% to ~95%**