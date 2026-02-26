---
name: prism-hook-enforcement
description: 15 system hooks that cannot be disabled — what each enforces, HARD blocks vs SOFT auto-fixes, and the safety-critical hook chain
---
# Hook Enforcement Rules

## When To Use
- "Why did my operation get blocked?" — check which system hook fired
- "What happens automatically when I run a calculation/task/session?"
- When designing a new feature and need to know what system hooks will gate it
- Understanding the difference between HARD blocks (stop execution) and SOFT fixes (auto-inject)
- NOT for: how to create your own hooks (use prism-hook-authoring)
- NOT for: hook registration API or priority levels (use prism-hook-authoring)

## How To Use
**15 SYSTEM HOOKS (cannot be disabled, fire automatically):**

HARD BLOCKS — these stop execution entirely if violated:
  SYS-LAW1-SAFETY (priority 0): Blocks if S(x) < 0.70. Safety score below threshold.
    Fires on: any calculation that produces a safety score
    Recovery: fix the parameters until S(x) >= 0.70. No bypass. No override.

  SYS-LAW4-REGRESSION (priority 20): Blocks data loss during file replacement.
    Fires on: db:preWrite, any file replacement operation
    Recovery: run anti-regression check, restore missing content, re-attempt

  SYS-MATHPLAN-GATE (priority 5): Blocks tasks without a valid MATHPLAN.
    Fires on: task:prePlan
    Recovery: create MATHPLAN with required fields before starting task

  SYS-LAW3-COMPLETENESS (priority 33): Blocks if completeness C(T) < 1.0.
    Fires on: task:complete
    Recovery: complete all required subtasks before marking task done

  SYS-LAW8-MATH-EVOLUTION (priority 60): Blocks if M(x) < 0.60.
    Fires on: formula submissions, calculation upgrades
    Recovery: improve mathematical quality score above threshold

  SYS-BUFFER-ZONE (priority 0): Blocks at 19+ tool calls since checkpoint.
    Fires on: every tool call
    Recovery: checkpoint immediately, then continue

SOFT AUTO-FIXES — inject or capture automatically without blocking:
  SYS-CMD5-UNCERTAINTY (p60): Auto-injects uncertainty bounds on bare numbers
  SYS-PREDICTION-LOG (p200): Auto-logs predictions for calibration
  SYS-CALIBRATION-MONITOR (p220): Alerts on stale formula calibration
  SYS-LEARNING-EXTRACT (p170): Auto-extracts learnings from completed tasks
  SYS-LAW2-MICROSESSION (p32): Warns if no MATHPLAN for microsession
  SYS-LAW5-PREDICTIVE (p30): Checks for risk assessment before execution
  SYS-LAW6-CONTINUITY (p10): Enforces state loading at session start
  SYS-LAW7-VERIFICATION (p0): Requires 95% confidence for verification chain
  SYS-CMD1-WIRING (p110): Checks new data has 6-8 downstream consumers

**KEY AUTOMATIC TRIGGERS:**
  Session starts → session:preStart fires → state loading enforced
  Before any task → task:prePlan + mathPlanValidate fire → plan gate checked
  Any calculation → calc:uncertaintyInject fires → uncertainty auto-added
  DB changes → db:antiRegressionCheck fires → data loss blocked
  Task completes → verification:chainComplete fires → 95% confidence required
  Context compacts → session:postCompact fires → state preserved

## What It Returns
- HARD BLOCK: operation stops, abortReason explains which law was violated
- SOFT FIX: operation continues but data is auto-enriched (uncertainty, logs, learnings)
- SOFT WARN: operation continues but alert is logged (stale calibration, missing analysis)
- System hooks fire at priority 0-60, before any user hooks (300+), ensuring safety first

## Examples
- Input: "Speed/feed calculation returned S(x) = 0.65 for titanium roughing"
  System hook: SYS-LAW1-SAFETY fires at priority 0
  Result: HARD BLOCK. abortReason: "Safety score 0.65 below 0.70 threshold"
  The cutting parameters are NOT returned to the user. Must adjust until S(x) >= 0.70.

- Input: "Completed a tool life calculation with bare number output: 45 minutes"
  System hook: SYS-CMD5-UNCERTAINTY fires at priority 60
  Result: SOFT FIX. Auto-injects: "45 +/- 8 minutes (82% confidence)"
  Calculation proceeds, but uncertainty is added without blocking.

- Edge case: "Replacing materials.json. New file has 3400 records, old had 3518."
  System hook: SYS-LAW4-REGRESSION fires at priority 20
  Result: HARD BLOCK. abortReason: "Record count regression: 3400 < 3518 (118 records lost)"
  File replacement is prevented. Must account for all 118 missing records.
SOURCE: Split from prism-hook-system (18.9KB)
RELATED: prism-hook-authoring
