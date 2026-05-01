---
name: prism-resource-combination
description: 8-step procedure for executing F-PSI-001 — from parsing task requirements through ILP solving to handoff
---
# Resource Combination Workflow

## When To Use
- After deciding to use F-PSI-001 (prism-psi-equation) for resource selection
- "How do I actually run the combination engine end-to-end?"
- When prism_autopilot_d needs to orchestrate skill+agent selection for a complex task
- When manually running the combination pipeline step by step
- NOT for: the math behind F-PSI-001 (use prism-psi-equation)
- NOT for: interpreting the optimality proof (use prism-optimality-certificate)

## How To Use
Execute 8 steps in order. Each step has an input, an action, and an output.

**Step 1: PARSE** task requirements from user request
  Input: raw user message. Output: structured task vector.
  Extract: domains[] (e.g. materials, physics), operations[] (e.g. calculate, validate),
  taskType (e.g. speed_feed_calculation), complexity (0-1), safetyRequired (bool),
  rigorRequired (bool), constraints[] (e.g. controller=Fanuc, material=titanium).
  Tool: natural language parsing, no MCP call needed.

**Step 2: LOAD** resource data from coordination files
  Input: nothing (reads from disk). Output: 3 data structures.
  Load RESOURCE_REGISTRY.json (all skills+agents+modes with metadata),
  CAPABILITY_MATRIX.json (precomputed Cap scores), SYNERGY_MATRIX.json (pair synergies).
  Validate: registry must have 600+ resources. If fewer → data corruption, abort.

**Step 3: COMPUTE** capability scores via F-RESOURCE-001
  Input: resources + task vector. Output: scored resource list.
  For each resource: Cap = 0.40*domain_match + 0.35*operation_match + 0.25*complexity_match.
  domain_match uses Jaccard similarity. Filter out resources with Cap < 0.1 (irrelevant).
  Tool: prism_calc or direct computation.

**Step 4: WARM START** with greedy heuristic
  Input: scored resources. Output: initial feasible solution.
  Sort by Cap/Cost ratio (best value first). Greedily add resources until all requirements
  covered or limits hit. This gives a lower bound and feasible starting point for ILP.

**Step 5: SOLVE** ILP for optimal combination
  Input: warm start + all constraints. Output: optimal resource set.
  Formulate as integer linear program. Solve with PuLP CBC solver, 500ms timeout.
  Constraints: max 8 skills, max 8 agents, exactly 1 mode, S(R)>=0.70, Coverage=1.0.
  Tool: prism_calc→combination_ilp or prism_sp→combination_ilp.

**Step 6: GENERATE** optimality proof via F-PROOF-001
  Input: ILP result + warm start. Output: certificate + gap analysis.
  Compare ILP objective to warm start bound. Gap=0 → OPTIMAL. Gap<=2% → NEAR_OPTIMAL.
  Record: solution_value, lower_bound, upper_bound, gap_percent, certificate level.

**Step 7: PRESENT** plan for user approval
  Input: optimal resources + proof. Output: human-readable plan.
  Display: skills selected (count + names), agents (count + names), execution mode,
  optimality certificate, safety score, estimated cost. Ask user to approve.

**Step 8: HAND OFF** to execution
  Input: approved plan. Output: loaded/initialized resources, execution started.
  Load selected skills via skill_load. Initialize agents. Configure execution mode.
  Update CURRENT_STATE with resource plan. Begin task execution.

If user rejects at Step 7: go back to Step 1 with modified constraints.

## What It Returns
- Steps 1-3: task vector + scored candidates (diagnostic — what's available)
- Steps 4-5: optimal resource set satisfying all constraints
- Step 6: mathematical proof of solution quality
- Steps 7-8: approved plan → execution begins
- End-to-end: a mathematically-backed resource allocation executing the task

## Examples
- Input: "Analyze tool life for carbide inserts in Inconel 718 at various speeds"
  Step 1: domains=[materials,physics], ops=[calculate,analyze], complexity=0.7, safety=true
  Step 3: top Cap scores: taylor-tool-life=0.95, material-physics=0.88, safety=0.82
  Step 5: ILP selects 3 skills + 1 agent (sonnet for analysis). Cost=$0.03.
  Step 6: gap=0% → OPTIMAL certificate.
  Step 7: present plan, user approves.
  Step 8: load skills, init agent, execute analysis.

- Input: "Quick lookup — what's the tap drill for 1/4-20?"
  Step 1: domains=[threading], ops=[lookup], complexity=0.1, safety=false
  Step 3: prism-thread-tap-drill Cap=0.99. Nothing else needed.
  Step 4: greedy selects 1 skill. Coverage=1.0. No ILP needed (trivial case).
  Skip steps 5-6-7 (single-resource, no optimization needed). Direct to step 8.

- Edge case: "ILP times out at 500ms — no optimal solution found"
  Warm start from Step 4 is still feasible. Use it with HEURISTIC certificate.
  Log timeout for calibration. Next time, increase timeout or reduce candidate pool.
SOURCE: Split from prism-combination-engine (17.2KB)
RELATED: prism-psi-equation, prism-optimality-certificate
