---
name: prism-mathplan-creation
description: Procedure for creating a MATHPLAN that passes the mandatory gate — scope quantification, decomposition proof, effort estimation with uncertainty, and verification criteria
---
# MATHPLAN Creation

## When To Use
- Before starting any task that involves multiple steps or tool calls
- When SYS-MATHPLAN-GATE hook blocks with "No valid MATHPLAN"
- "How many microsessions will this take?" / "How do I scope this work?"
- Any task where you need to prove completeness C(T) = 1.0 before executing
- Trigger words: plan, scope, estimate, decompose, brainstorm, design
- NOT for: context pressure monitoring during execution (use prism-context-pressure)
- NOT for: session start/end protocols (use prism-session-lifecycle)

## How To Use
Fill in ALL 7 fields. If ANY is unchecked, SYS-MATHPLAN-GATE blocks execution.

**1. SCOPE QUANTIFIED:**
  Count the work items mathematically: S = [count1] x [count2] x ... = [EXACT TOTAL]
  Example: S = 49 oversized skills x 3 splits avg = 147 atomic skills

**2. COMPLETENESS EQUATION:**
  C(T) = items_done / total_items = 1.0 required
  No partial credit. Define what "done" means for each item.

**3. DECOMPOSITION PROOF:**
  Break S into chunks: d1 + d2 + ... + dk = S (must sum to EXACT total)
  Each chunk must be independently verifiable.
  Example: d1(anti-regression=3) + d2(error-handling=2) + d3(session=3) + ... = 147

**4. EFFORT WITH UNCERTAINTY:**
  Base calls = items x operations_per_item
  Complexity multiplier = 1.0 + factors (file I/O: +0.5, validation: +0.5, cross-ref: +1.0, calc: +2.0)
  EFFORT = base x complexity = N +/- uncertainty calls (95% CI)
  Microsessions: MS_COUNT = ceil(EFFORT / 15)
  Time: TIME = EFFORT x 3s x 1.5 buffer = M +/- uncertainty minutes

  Complexity factors: File I/O +0.5, Validation +0.5, Cross-reference +1.0,
  Dependencies +1.0, Physics calculations +2.0, First of type +0.5

**5. CONSTRAINTS FORMALIZED:**
  C1: [mathematical constraint, e.g., every skill <= 5KB]
  C2: [mathematical constraint, e.g., all 4 sections present]
  Define hard boundaries that must hold for every item.

**6. NO-SKIP ORDER:**
  Execution sequence: [1, 2, 3, ...] with rationale for ordering
  Checkpoints: after every [N items or groups]

**7. VERIFICATION CRITERIA:**
  Success = C(T) = total_done / total_items = 1.0
  Plus: all constraints satisfied, all checkpoints passed

After filling all 7: MATHPLAN GATE PASSED. Log prediction to tracker. Begin execution.

## What It Returns
- A complete MATHPLAN document with all 7 fields filled
- Scope number S (exact total work items)
- Effort estimate with uncertainty bounds (calls, microsessions, minutes)
- Decomposition that provably sums to S
- Go/no-go verdict: all 7 checked = proceed, any unchecked = stop and complete
- Prediction logged for later calibration (compare estimate vs actual)

## Examples
- Input: "Task: Split 5 oversized dev skills into atomic skills"
  1. SCOPE: S = 5 skills x 2.5 splits avg = 13 atomic skills (rounded up)
  2. COMPLETENESS: C(T) = skills_created / 13 = 1.0 required
  3. DECOMPOSITION: d1(anti-regression=3) + d2(error=2) + d3(session=3) + d4(hooks=2) + d5(wiring=3) = 13
  4. EFFORT: Base=13x5ops=65, Complexity=1.0+0.5(fileIO)+0.5(validation)=2.0, EFFORT=130+/-25 calls
     MS_COUNT=ceil(130/15)=9 microsessions, TIME=130x3x1.5=9.75+/-2 minutes
  5. CONSTRAINTS: C1: each skill <=5KB, C2: 4 sections, C3: 3+ examples, C4: swap test pass
  6. ORDER: 1→2→3→4→5 by dev impact. Checkpoint after each source skill.
  7. SUCCESS: C(T)=13/13=1.0, all C1-C4 satisfied, index updated
  GATE: PASSED

- Input: "Task: Build 3 cadence functions for DA-MS11"
  1. SCOPE: S = 3 functions (skill_auto_loader, context_matcher, nl_hook_evaluator)
  2. COMPLETENESS: C(T) = functions_passing_tests / 3 = 1.0
  3. DECOMPOSITION: d1(auto_loader) + d2(context_matcher) + d3(nl_hook_eval) = 3
  4. EFFORT: Base=3x15ops=45, Complexity=1.0+1.0(deps)+2.0(calc)=4.0, EFFORT=180+/-40 calls
     MS_COUNT=12, TIME=13.5+/-3 minutes
  5. CONSTRAINTS: C1: each function fires automatically, C2: zero runtime errors, C3: build passes
  6. ORDER: 1→2→3 (auto_loader first, others depend on skill index). Checkpoint after each.
  7. SUCCESS: C(T)=3/3=1.0, build passes, test:critical passes

- Edge case: "Task seems simple — just fix one line"
  If truly 1 edit: skip MATHPLAN. MATHPLAN is for multi-step tasks.
  But if "fix one line" actually requires reading 3 files, testing, and verifying: make a MATHPLAN.
  Rule of thumb: if you expect >5 tool calls, create a MATHPLAN.
SOURCE: Split from prism-mathematical-planning (11.8KB)
RELATED: prism-context-pressure, prism-session-lifecycle
