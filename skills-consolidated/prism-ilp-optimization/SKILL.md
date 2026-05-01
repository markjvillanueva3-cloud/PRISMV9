---
name: prism-ilp-optimization
description: Solve the resource combination ILP — warm start, integer linear programming, optimality proof, and plan presentation for approval before execution
---
# ILP Resource Optimization

## When To Use
- After prism-resource-scoring produces a ranked candidate list with 10+ viable resources
- When you need the OPTIMAL subset (not just top-N) respecting constraints
- "Pick the best combination of skills + agents that covers all requirements"
- When safety constraints, cost limits, or resource caps must be formally satisfied
- NOT for: scoring individual resources (use prism-resource-scoring first)
- NOT for: simple tasks where top-1 resource is obvious (just use it)
- NOT needed when: complexity < 0.4 AND resources < 5 — just pick greedily

## How To Use
**STEP 4: WARM START with greedy heuristic:**
  Sort scored resources by capability/cost ratio (best bang-per-buck first).
  Greedily select up to 8 resources, stopping when all requirements are covered.
  This gives a feasible starting solution that the ILP solver improves upon.
  Greedy value = lower bound on optimal — if ILP can't improve, greedy is good enough.

**STEP 5: SOLVE ILP (via prism_calc→combination_ilp or PuLP):**
  Objective: maximize total capability of selected resources
  Decision variables: x[r] = 0 or 1 for each resource r (binary: selected or not)
  Constraints (all must be satisfied):
  - Max 8 skills selected: sum(x[r] for skills) <= 8
  - Max 8 agents selected: sum(x[r] for agents) <= 8
  - Exactly 1 execution mode: sum(x[r] for modes) == 1
  - Safety HARD: if safetyRequired, at least 1 resource with safety_score >= 0.70
  - Full coverage: for each requirement, at least 1 selected resource covers it
  Solver timeout: 500ms. If timeout, use best-found (warm start guarantees feasibility).

**STEP 6: GENERATE optimality proof (F-PROOF-001):**
  Compare ILP value to greedy value:
  gap = (ILP_upper_bound - ILP_value) / ILP_upper_bound
  Certificate: gap=0 → OPTIMAL. gap<=0.02 → NEAR_OPTIMAL. gap<=0.05 → GOOD. else → HEURISTIC.
  Record: solution value, bounds, gap%, constraints satisfied, solver time, alternatives rejected.

**STEP 7: PRESENT plan for user approval:**
  Display: selected skills (names), selected agents (names), execution mode
  Show: optimality certificate, safety score S(R), estimated cost
  Ask user to approve before execution. Never auto-execute without approval.

**STEP 8: HAND OFF to execution:**
  Load selected skills via skill_load. Initialize selected agents.
  Configure execution mode. Record plan in CURRENT_POSITION.md.
  Execute via orchestrator with the approved resource combination.

## What It Returns
- Optimal resource combination: skills[], agents[], execution_mode
- Optimality proof: certificate (OPTIMAL/NEAR_OPTIMAL/GOOD/HEURISTIC), gap%, bounds
- Safety verification: S(R) score confirming >= 0.70 if safety was required
- Cost estimate: total token/API cost of the selected combination
- Approval gate: plan presented to user, not executed until approved

## Examples
- Input: scored list of 47 resources for "speed/feed calculation for Ti-6Al-4V"
  Greedy picks: 5 skills + 2 agents, value=4.2, covers all requirements
  ILP improves: 4 skills + 3 agents, value=4.7 (synergy between agents), gap=0%
  Certificate: OPTIMAL. S(R)=0.85 (safety constraint satisfied).
  Presented to user: "4 skills, 3 agents, ILP optimal. Approve?" → Yes → execute

- Input: scored list of 12 resources for "alarm decode on Siemens 840D"
  Greedy picks: 2 skills + 1 agent, value=2.1, covers everything
  ILP: same solution (small problem, greedy was already optimal), gap=0%
  Certificate: OPTIMAL. No safety required. Fast path.

- Edge case: "ILP solver timed out at 500ms on 200 resources"
  Warm start ensures feasible solution exists. Solver returns best-found.
  Gap may be 3-5% — certificate GOOD, not OPTIMAL.
  Action: present with caveat "GOOD (3.2% gap) — near-optimal but not proven optimal"
  User can accept or request re-solve with longer timeout.
SOURCE: Split from prism-combination-engine (17.2KB)
RELATED: prism-resource-scoring
