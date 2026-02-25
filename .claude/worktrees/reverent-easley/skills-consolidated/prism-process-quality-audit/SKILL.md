---
name: prism-process-quality-audit
description: Compute process quality P(x) from 12 metrics at session end — geometric mean of skill utilization, workflow compliance, checkpoint quality, efficiency, and 8 more operational scores
---
# Process Quality Audit

## When To Use
- At session end to score how well the development process was followed
- "How did this session go?" / "Was my process good?" / "What should I improve?"
- When reviewing completed milestones for quality of execution (not just output quality)
- When P(x) is required as evidence for phase gate completion
- NOT for: output quality scoring (use prism_omega for Omega equation)
- NOT for: safety validation (use prism_validate for S(x))
- NOT for: mid-session pressure checks (use prism-context-pressure)

## How To Use
**Score each metric 0.0-1.0, then compute P(x) as geometric mean:**

1. **SKILL_USE** = skills_activated / skills_relevant
   Count skills that triggered vs skills that SHOULD have triggered for this task type.
   1.0 = all relevant skills loaded. 0.5 = missed half the applicable skills.

2. **AGENT_USE** = agents_deployed / agents_optimal
   Did you use API agents when they would have improved quality? Overuse wastes cost.
   1.0 = optimal agent selection. 0.5 = used Haiku where Opus was needed (or vice versa).

3. **WORKFLOW** = phases_followed / phases_required
   SP.1 has 8 phases: brainstorm, plan, execute, review-spec, review-quality, debug, verify, handoff.
   Count how many you actually did. 1.0 = all required phases followed.

4. **CHECKPOINT** = (checkpoints_made / checkpoints_required) * quality_factor
   Did you checkpoint at zone transitions, before destructive ops, at unit completion?
   quality_factor: 1.0 if checkpoints have full state, 0.7 if just position updates.

5. **RECOVERY** = successful_recoveries / recovery_attempts
   When compaction or errors occurred, did recovery succeed? 1.0 = all recoveries clean.
   N/A (no recovery needed) = score as 1.0.

6. **EFFICIENCY** = useful_output / total_tool_calls
   How much productive output per tool call? High = focused work. Low = thrashing.
   Benchmark: 5+ lines of quality content per tool call = 1.0.

7. **VERIFICATION** = evidence_level_achieved / evidence_level_required
   Did you provide adequate proof for claims? L3 evidence for safety, L2 for general.
   1.0 = all claims backed by appropriate evidence level.

8. **SAFETY** = safety_checks_passed / safety_checks_required
   Were all S(x) checks run when needed? Any safety bypass = 0.0 (hard fail).

9. **THROUGHPUT** = items_completed / items_planned
   Did you finish what you set out to do? 1.0 = completed planned scope.

10. **COMPLETENESS** = items verified complete / items marked complete
    Did you actually verify completion or just mark it? 1.0 = all verified.

11. **LEARNING** = patterns_extracted / opportunities_for_learning
    Did you capture what worked/failed? 1.0 = all learnings documented.

**COMPUTE P(x):**
```
P(x) = (M1 * M2 * M3 * M4 * M5 * M6 * M7 * M8 * M9 * M10 * M11) ^ (1/11)
```
Geometric mean — one zero tanks the whole score. Every metric matters.

**QUALITY GATES:**
  P(x) >= 0.90: EXCELLENT process — document and replicate
  P(x) >= 0.80: GOOD — minor improvements possible
  P(x) >= 0.70: ACCEPTABLE — review weak metrics
  P(x) < 0.70: PROCESS FAILURE — identify root cause before next session

## What It Returns
- 11 individual metric scores (0.0-1.0 each)
- P(x) composite score (geometric mean)
- Quality gate classification (excellent/good/acceptable/failure)
- Weakest metrics identified for targeted improvement
- Session-over-session trend if previous P(x) scores are available

## Examples
- Input: "Session completed 5 atomic skills, used 18 tool calls, no errors"
  Scores: skill_use=0.9, agent_use=1.0, workflow=0.8 (skipped brainstorm),
  checkpoint=1.0, recovery=1.0(N/A), efficiency=0.9, verification=0.8,
  safety=1.0(N/A), throughput=1.0, completeness=0.9, learning=0.7
  P(x) = (0.9*1.0*0.8*1.0*1.0*0.9*0.8*1.0*1.0*0.9*0.7)^(1/11) = 0.90
  Gate: EXCELLENT. Weakest: learning (0.7) — add tracker entry.

- Input: "Session had 2 compaction events, recovered once, lost work once"
  recovery=0.5 (1 of 2 recoveries successful)
  This single metric drags P(x) down significantly via geometric mean.
  P(x) ≈ 0.72. Gate: ACCEPTABLE. Action: improve checkpoint frequency.

- Edge case: "Safety check was required but not run (rushed to finish)"
  safety=0.0. P(x) = 0.0 (geometric mean with a zero = zero).
  Gate: PROCESS FAILURE. One skipped safety check = total failure. Non-negotiable.
SOURCE: Split from prism-process-optimizer (25.2KB)
RELATED: prism-session-lifecycle, prism-context-pressure
