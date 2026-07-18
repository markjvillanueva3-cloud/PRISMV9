---
name: prism-process-quality-score
description: P(x) process quality formula — geometric mean of 11 session metrics with quality gates and improvement targeting
---
# Process Quality Score P(x)

## When To Use
- At session end to score how well the development process was followed
- "How good was my process this session?" / "Am I following the workflow correctly?"
- When prism_omega→compute flags low process scores and you need to diagnose why
- To identify which process metric is dragging quality down and target improvement
- NOT for: Omega quality score (that's the output quality, this is the process quality)
- NOT for: individual metric definitions (this skill HAS the formulas, use them here)

## How To Use
**CALCULATE P(x)** — geometric mean of 11 metrics, each scored 0.0-1.0:

```
P(x) = (M1 * M2 * M3 * M4 * M5 * M6 * M7 * M8 * M9 * M10 * M11) ^ (1/11)
```

**THE 11 METRICS:**
  M1: skill_use = skills_activated / skills_relevant_to_task
    Count skills that keyword-matched AND loaded vs skills that SHOULD have matched.
  M2: agent_use = agents_deployed / agents_optimal_for_task
    Balance: overuse wastes cost, underuse loses quality.
  M3: workflow = SP1_phases_followed / SP1_phases_required
    Did you brainstorm→plan→execute→review→verify→handoff? Each phase = 1/8.
  M4: checkpoint = (checkpoints_made / checkpoints_required) * quality_factor
    quality_factor = avg(state_completeness, resumability, accuracy).
  M5: recovery = successful_recoveries / total_interruptions
    If no interruptions this session: M5 = 1.0 (perfect).
  M6: efficiency = useful_output / total_tool_calls
    Higher = more output per tool call. Penalizes wasted calls.
  M7: verification = evidence_level_achieved / evidence_level_required
    L3 required = 0.60. L4 achieved = 0.80. M7 = 0.80/0.60 = 1.0 (capped at 1.0).
  M8: safety = safety_checks_passed / safety_checks_required
    Any safety violation → M8 = 0.0 (instant fail).
  M9: throughput = tasks_completed / tasks_planned
    0.8 = completed 4 of 5 planned tasks.
  M10: completeness = required_fields_present / total_required_fields
    Check output artifacts against spec requirements.
  M11: learning = learnings_captured / learnings_available
    Did you extract patterns, log decisions, update calibration data?

**QUALITY GATES:**
  P(x) >= 0.90: EXCELLENT — process fully optimized
  P(x) >= 0.80: GOOD — minor improvements possible
  P(x) >= 0.70: ACCEPTABLE — functional but gaps exist
  P(x) < 0.70: PROCESS FAILURE — must review and improve before continuing

**DIAGNOSING LOW P(x):**
  Because P(x) is a geometric mean, ANY single metric near 0 drags everything down.
  To find the bottleneck: sort all 11 metrics ascending. The lowest is your target.
  Common culprits: M3 (workflow — skipped brainstorm/plan), M4 (checkpoint — saved late),
  M11 (learning — forgot to capture learnings at session end).

**IMPROVING P(x):**
  Target the lowest metric first (biggest geometric mean impact).
  Moving M_worst from 0.5 to 0.8 improves P(x) more than moving M_best from 0.9 to 1.0.

## What It Returns
- Single P(x) score (0.0-1.0) summarizing overall process quality
- Quality gate classification (EXCELLENT/GOOD/ACCEPTABLE/FAILURE)
- 11 individual metric scores identifying strengths and weaknesses
- Bottleneck identification (lowest metric = improvement target)
- Session-over-session trend if previous P(x) values are logged

## Examples
- Input: Session that followed full workflow, saved 3 checkpoints, used 4/5 relevant skills
  M1=0.80, M2=0.90, M3=1.0, M4=0.85, M5=1.0, M6=0.75, M7=0.90, M8=1.0, M9=0.80, M10=0.95, M11=0.70
  P(x) = (product)^(1/11) = 0.87 → GOOD
  Bottleneck: M11=0.70 (learning) — forgot to extract patterns at session end.

- Input: Session that skipped brainstorm and plan, jumped straight to coding
  M3 = 2/8 = 0.25 (only executed + reviewed, skipped brainstorm/plan/verify/handoff)
  Even if all others are 0.90: P(x) = (0.90^10 * 0.25)^(1/11) = 0.71 → barely ACCEPTABLE
  Shows how one skipped process step tanks the entire score.

- Edge case: Safety violation occurred during session
  M8 = 0.0. P(x) = (anything * 0)^(1/11) = 0.0 → PROCESS FAILURE.
  Geometric mean means ANY zero metric = zero total. Safety violations are absolute.
SOURCE: Split from prism-process-optimizer (25.2KB)
RELATED: prism-skill-activation
