---
name: prism-capability-scoring
description: F-RESOURCE-001 capability scoring formula — compute Cap(r,T) from domain match (Jaccard), operation coverage, and complexity alignment with uncertainty propagation
---
# Capability Scoring (F-RESOURCE-001)

## When To Use
- Selecting which agent, model, or resource is best suited for a task
- "Which model should handle this?" / "Score Opus vs Sonnet for this task"
- During prism_orchestrate agent_parallel to rank candidate agents
- When prism_autopilot needs to decide Haiku vs Sonnet vs Opus for a step
- NOT for: routing by problem type (use prism-algorithm-decision-tree)
- NOT for: token budget allocation (use prism-token-budget)

## How To Use
**THE FORMULA:**
  Cap(r,T) = w_d x DomainMatch(r,T) + w_o x OperationMatch(r,T) + w_c x ComplexityMatch(r,T)

**WEIGHTS (calibratable coefficients):**
  w_d = 0.40 +/- 0.05 (domain relevance matters most)
  w_o = 0.35 +/- 0.05 (operation coverage second)
  w_c = 0.25 +/- 0.03 (complexity alignment third)

**MATCH FUNCTION 1: DomainMatch — Jaccard Similarity**
  Input: resource's domain tags, task's required domains
  Formula: |intersection| / |union|
  Example: resource has {materials, cutting, safety}, task needs {materials, cutting, thermal}
  Intersection: {materials, cutting} = 2. Union: {materials, cutting, safety, thermal} = 4.
  DomainMatch = 2/4 = 0.50

**MATCH FUNCTION 2: OperationMatch — Coverage Ratio**
  Input: resource's supported operations, task's required operations
  Formula: count(task ops covered by resource) / count(all task ops)
  Example: task needs {validate, calculate, format}. Resource supports {validate, calculate, persist}.
  Covered: 2 of 3. OperationMatch = 2/3 = 0.667

**MATCH FUNCTION 3: ComplexityMatch — Linear Penalty**
  Input: resource's complexity rating (0-1), task's complexity requirement (0-1)
  Formula: 1.0 - |resource_complexity - task_complexity|
  Example: resource rated 0.8 complexity, task needs 0.6. Gap = 0.2.
  ComplexityMatch = 1.0 - 0.2 = 0.80
  Overqualified (resource > task) still penalized — wastes tokens/cost.

**COMPUTE WITH UNCERTAINTY:**
  Central: Cap = 0.40 x D + 0.35 x O + 0.25 x C
  Error (quadrature): Cap_err = sqrt((D x 0.05)^2 + (O x 0.05)^2 + (C x 0.03)^2)
  Report as: "Cap = 0.72 +/- 0.03 (95% CI)"

**THRESHOLD:**
  Cap >= 0.80: STRONG MATCH — assign this resource
  Cap 0.60-0.79: ACCEPTABLE — use if no better option
  Cap < 0.60: POOR MATCH — find alternative resource

## What It Returns
- Cap(r,T) score in [0, 1] with uncertainty bounds
- Breakdown: DomainMatch, OperationMatch, ComplexityMatch individually
- Threshold classification: STRONG / ACCEPTABLE / POOR
- For multiple candidates: ranked list by Cap score, best first
- Feeds into: prism_orchestrate agent_parallel for agent selection

## Examples
- Input: "Score Opus for a safety-critical physics calculation task"
  Task domains: {physics, safety, materials}. Opus domains: {all}. DomainMatch = 1.0.
  Task ops: {calculate, validate_safety, propagate_uncertainty}. Opus ops: {all}. OpMatch = 1.0.
  Task complexity: 0.9. Opus complexity: 1.0. ComplexityMatch = 1.0 - 0.1 = 0.90.
  Cap = 0.40(1.0) + 0.35(1.0) + 0.25(0.90) = 0.975 +/- 0.03. STRONG MATCH.

- Input: "Score Haiku for the same safety-critical task"
  DomainMatch = 0.67 (Haiku handles materials but not deep physics/safety).
  OpMatch = 0.33 (can calculate but not validate_safety or propagate_uncertainty).
  ComplexityMatch = 1.0 - |0.3 - 0.9| = 0.40.
  Cap = 0.40(0.67) + 0.35(0.33) + 0.25(0.40) = 0.484 +/- 0.03. POOR MATCH.
  Decision: Do not assign Haiku to safety-critical tasks.

- Edge case: "Two resources score Cap = 0.78 and 0.76 — within each other's uncertainty"
  Cap_err is ~0.03 for both. Difference 0.02 < overlap range.
  Decision: statistically equivalent. Pick by secondary criteria: cost, latency, availability.
  Do not claim one is "better" when scores are within uncertainty bounds.
SOURCE: Split from prism-resource-optimizer (11.8KB)
RELATED: prism-algorithm-decision-tree, prism-token-budget
