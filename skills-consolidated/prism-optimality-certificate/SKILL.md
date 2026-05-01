---
name: prism-optimality-certificate
description: F-PROOF-001 executable procedure — calculates optimality gap from ILP solver output, assigns certificate level, generates proof record with bounds and constraints
---
# Optimality Certificate Generation (F-PROOF-001)

## When To Use
- After ILP solver returns a resource combination result (Step 6 of combination workflow)
- "Is this solution optimal?" / "How close to optimal is this combination?"
- When you need to log proof that the selected resources are the best available
- Before presenting a resource plan to the user — the certificate validates the recommendation
- NOT for: running the ILP solver itself (use prism-resource-combination for the full workflow)
- NOT for: the PSI scoring formula (use prism-psi-equation)

## How To Use
**INPUT REQUIRED:**
  ilpResult: { objective_value, gap, upperBound, constraints[], rejected_alternatives[], solveTime }
  warmStartResult: { value } (the greedy/heuristic baseline from Step 4)

**STEP 1 — CALCULATE GAP:**
  gap = ilpResult.gap (relative gap between best found solution and theoretical upper bound)
  gap = (upperBound - objective_value) / upperBound
  If solver timed out: gap = null, use warm-start solution as fallback

**STEP 2 — ASSIGN CERTIFICATE LEVEL:**
  gap = 0%      → OPTIMAL (provably best solution, no better combination exists)
  gap <= 2%     → NEAR_OPTIMAL (within 2% of theoretical maximum, acceptable for production)
  gap <= 5%     → GOOD (within 5%, acceptable for most tasks, flag for complex/safety tasks)
  gap > 5% or null → HEURISTIC (ILP timed out or gap too large, using warm-start greedy solution)

**STEP 3 — GENERATE PROOF RECORD:**
  Record must contain ALL of these fields:
  - solution_value: the PSI score of the selected combination
  - lower_bound: warm-start greedy baseline (what you'd get without optimization)
  - upper_bound: theoretical maximum from LP relaxation
  - gap_percent: formatted as "X.XX%"
  - certificate: one of OPTIMAL | NEAR_OPTIMAL | GOOD | HEURISTIC
  - constraints_satisfied: list of all constraints that passed (safety, coverage, budget)
  - alternatives_rejected: how many alternative combinations were evaluated and beaten
  - solver_time_ms: how long the solver took (timeout threshold: 500ms)
  - proof_timestamp: ISO 8601 timestamp

**STEP 4 — VALIDATE PROOF:**
  Hard constraint check: if safety S(R) < 0.70 in the solution → REJECT regardless of certificate
  Consistency check: solution_value must be >= lower_bound and <= upper_bound
  If inconsistent: flag as INVALID_PROOF, fall back to warm-start with HEURISTIC certificate

**STEP 5 — LOG AND RETURN:**
  Log proof to audit trail (feeds into SYS-PREDICTION-LOG hook)
  Return certificate + proof record to caller
  If HEURISTIC: add warning that solution may not be optimal, suggest re-running with relaxed constraints

## What It Returns
- Certificate level: OPTIMAL, NEAR_OPTIMAL, GOOD, or HEURISTIC
- Full proof record with bounds, gap, constraints, and timing
- If OPTIMAL/NEAR_OPTIMAL: high confidence recommendation, present to user
- If GOOD: acceptable recommendation with gap warning
- If HEURISTIC: fallback recommendation, explicitly flagged as non-proven
- The proof record is the EVIDENCE that the resource plan was computed, not guessed

## Examples
- Input: ILP returns objective=0.847, upperBound=0.847, gap=0, solveTime=120ms
  Step 1: gap = 0%
  Step 2: certificate = OPTIMAL
  Step 3: proof = { solution: 0.847, lower: 0.72, upper: 0.847, gap: "0.00%", cert: OPTIMAL, rejected: 45, time: 120ms }
  Step 4: S(R) = 0.82 >= 0.70 PASS, bounds consistent PASS
  Result: present to user with full confidence — this IS the best combination

- Input: ILP returns objective=0.81, upperBound=0.83, gap=0.024, solveTime=340ms
  Step 1: gap = 2.4%
  Step 2: certificate = GOOD (between 2% and 5%)
  Step 3: proof recorded with gap "2.40%"
  Step 4: safety passes, bounds consistent
  Result: present with note — "Solution is within 2.4% of theoretical optimum"

- Edge case: ILP times out at 500ms, no solution returned
  Step 1: gap = null (solver didn't converge)
  Step 2: certificate = HEURISTIC (timeout fallback)
  Step 3: use warm-start greedy solution (lower_bound becomes the solution)
  Step 4: safety check on warm-start solution — if S(R) < 0.70, REJECT entirely
  Result: present with explicit warning — "Using greedy solution, optimality not proven"
  Action: suggest re-running with fewer constraints or larger timeout if task is safety-critical
SOURCE: Split from prism-combination-engine (17.2KB)
RELATED: prism-psi-equation, prism-resource-combination
