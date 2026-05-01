---
name: prism-psi-equation
description: F-PSI-001 master combination equation — the argmax optimization that selects optimal skill+agent+mode combinations for any task
---
# F-PSI-001 Master Combination Equation

## When To Use
- "What's the optimal combination of skills, agents, and execution mode for this task?"
- Before any complex task that could use multiple resources (skills+agents)
- When prism_autopilot_d or cross_query needs to decide resource allocation
- When manually planning a multi-resource approach and need mathematical backing
- NOT for: executing the 8-step combination workflow (use prism-resource-combination)
- NOT for: proving the solution is optimal (use prism-optimality-certificate)
- NOT for: individual capability scoring (use prism-capability-scoring)

## How To Use
The equation selects the resource set R that maximizes value per cost:

**F-PSI-001:**
```
PSI(T,R) = argmax [ SUM_i Cap(r_i, T) * Syn(R) * OMEGA(R) / Cost(R) ]
           R subset ALL
```

**Variables:**
  Cap(r_i, T) = capability score of resource r_i for task T (from F-RESOURCE-001)
    Computed as: 0.40*domain_match + 0.35*operation_match + 0.25*complexity_match
    domain_match = Jaccard similarity of resource domains vs task domains
    operation_match = fraction of task operations the resource can perform
    complexity_match = 1 - |resource_complexity - task_complexity|

  Syn(R) = synergy multiplier for resource set R (from SYNERGY_MATRIX.json)
    Range: 0.8 (conflicting resources) to 1.5 (highly synergistic)
    Example: prism-safety-framework + prism-calc → Syn = 1.3 (safety validates calc)

  OMEGA(R) = quality score of resource set (from prism_omega compute)
    OMEGA = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L

  Cost(R) = sum of all resource costs (API tokens for agents, load time for skills)

**HARD CONSTRAINTS (cannot be relaxed):**
  |R_skills| <= 8 — max 8 skills loaded simultaneously
  |R_agents| <= 8 — max 8 agents in a swarm
  |R_execution| = 1 — exactly one execution mode (MCP, CC, or hybrid)
  S(R) >= 0.70 — safety score hard block
  M(R) >= 0.60 — mathematical rigor minimum
  Coverage(R, T) = 1.0 — every task requirement must be covered by at least one resource

**To evaluate:** compute Cap for each candidate, multiply by Syn and OMEGA, divide by Cost, then select the set that maximizes this while satisfying all constraints.

## What It Returns
- The optimal resource set: which skills to load, which agents to call, which execution mode
- Total objective value (higher = better value per cost)
- Constraint satisfaction report (which constraints bind, which have slack)
- If no feasible solution exists: reports which constraint is infeasible (usually coverage)

## Examples
- Input: Task = "Calculate speed/feed for 4140 steel roughing on Okuma Multus"
  Domains: [materials, physics, machining]. Operations: [calculate, validate].
  Cap scores: prism-speed-feed-engine=0.92, prism-material-physics=0.85, prism-safety-framework=0.78
  Syn: speed-feed + material-physics = 1.3 (strong synergy)
  OMEGA: 0.87. Cost: 0 (all MCP, no API calls).
  PSI = (0.92+0.85+0.78) * 1.3 * 0.87 / 0.001 = very high. S(R)=0.78 >= 0.70. FEASIBLE.

- Input: Task = "Write a new dispatcher with Ralph validation"
  Domains: [development, quality]. Operations: [code, validate, test].
  Cap: prism-wiring-procedure=0.88, prism-hook-authoring=0.75, agent:ralph=0.90
  Syn: wiring + hooks = 1.2. Agent cost: ~$0.05.
  Coverage check: code covered by wiring, validate by ralph, test by... nothing. INFEASIBLE.
  Fix: add prism-code-review-checklist → Coverage = 1.0 → re-solve.

- Edge case: Two resource sets have equal PSI value
  Tiebreaker: prefer the set with fewer resources (Occam's razor).
  If still tied: prefer the set with higher S(R) safety score.
SOURCE: Split from prism-combination-engine (17.2KB)
RELATED: prism-resource-combination, prism-optimality-certificate, prism-capability-scoring
