---
name: prism-resource-scoring
description: Parse task requirements and compute capability scores for skills/agents/modes — steps 1-3 of the combination engine producing a ranked resource list
---
# Resource Scoring

## When To Use
- Starting a new task that needs the right combination of skills + agents + execution mode
- "Which skills should I load?" / "What agents do I need?" / "MCP or Claude Code?"
- Before calling prism-ilp-optimization — this produces the scored inputs it needs
- When prism_autopilot or cross_query needs to select optimal resources for a task
- NOT for: the actual ILP solving and proof generation (use prism-ilp-optimization)
- NOT for: manually picking a single agent (use prism-agent-selection for quick picks)

## How To Use
**STEP 1: PARSE task into a requirements vector:**
  Extract from the user's request:
  - domains: which knowledge areas? ["materials", "physics", "safety", "machining"]
  - operations: what actions? ["calculate", "validate", "search", "compare"]
  - taskType: classified type — "speed_feed_calculation", "material_lookup", "alarm_decode", etc.
  - complexity: 0.0-1.0 estimate. Simple lookup=0.2, multi-step calc=0.6, cross-domain synthesis=0.9
  - safetyRequired: boolean — does this produce values that affect machine operation?
  - constraints: max token budget, max API calls, time limit

**STEP 2: LOAD resource data:**
  Load RESOURCE_REGISTRY.json — contains all 143 skills, 64 agents, execution modes
  Each resource has: id, type, domains[], operations[], complexity_range, cost, safety_score
  Validate: registry must have 600+ resources. If fewer, data is incomplete.

**STEP 3: COMPUTE capability scores using F-RESOURCE-001:**
  For each resource r against task vector t:
  ```
  capability(r, t) = 0.40 * domain_match + 0.35 * operation_match + 0.25 * complexity_match
  ```
  domain_match = Jaccard similarity: |r.domains INTERSECT t.domains| / |r.domains UNION t.domains|
  operation_match = same Jaccard on operations
  complexity_match = 1 - |r.complexity_center - t.complexity| (closer = better)

  Sort by capability descending. Top resources are the best candidates.
  Filter: remove any with capability < 0.3 (irrelevant resources)

**OUTPUT:** Ranked list of resources with capability scores, ready for ILP optimization.

## What It Returns
- Parsed task vector: domains, operations, complexity, safety flag, constraints
- Ranked resource list: each resource scored 0.0-1.0 for this specific task
- Filtered candidates: only resources scoring above 0.3 threshold
- Metadata: which domains matched, which operations covered, uncovered requirements
- This feeds directly into prism-ilp-optimization step 4 (warm start)

## Examples
- Input: "Calculate speed and feed for 4140 steel roughing on Okuma B250II"
  Parsed: domains=["materials","physics","machining"], operations=["calculate","validate"]
  taskType="speed_feed_calculation", complexity=0.6, safetyRequired=true
  Top scored: prism-speed-feed-engine (0.92), prism-cutting-mechanics (0.87),
  prism-material-physics (0.85), prism-safety-framework (0.81)
  Filtered out: prism-gcode-reference (0.12 — wrong domain for calculation)

- Input: "Search for alarm code 2035 on FANUC 31i"
  Parsed: domains=["machining"], operations=["search","decode"]
  taskType="alarm_decode", complexity=0.2, safetyRequired=false
  Top scored: prism-fanuc-programming (0.91), prism-controller-quick-ref (0.78)
  Low complexity + no safety = simple agent, no ILP needed

- Edge case: "Compare material properties of Ti-6Al-4V across 3 heat treatments"
  Parsed: domains=["materials","physics"], operations=["compare","validate"]
  complexity=0.7, safetyRequired=false (comparison, not cutting parameters)
  Multiple resources score high in materials — ILP needed to pick optimal subset
SOURCE: Split from prism-combination-engine (17.2KB)
RELATED: prism-ilp-optimization, prism-agent-selection
