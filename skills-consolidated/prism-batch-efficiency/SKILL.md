---
name: prism-batch-efficiency
description: Token budget allocation, operation batching rules, and caching patterns — reduce tool call round trips by 3-5x through parallel batch execution
---
# Batch Efficiency

## When To Use
- About to make 2+ similar MCP tool calls in sequence (material lookups, validations, skill loads)
- "How should I allocate my context budget?" / "Can I batch these operations?"
- When context pressure is rising and you need to be more efficient with remaining budget
- When loading multiple resources and want to minimize round trips
- NOT for: context pressure zones and when to checkpoint (use prism-context-pressure)
- NOT for: session start/end protocols (use prism-session-lifecycle)

## How To Use
**TOKEN BUDGET ALLOCATION:**
  Working budget = Context Window - System Prompt - 15% Response Reserve
  Allocate the working budget as:
    40% — Current task context (files being edited, problem description, requirements)
    30% — Active skills and knowledge (loaded skills, reference data)
    20% — State and history (position, tracker, recent decisions)
    10% — Tool results buffer (MCP responses, search results, validation output)
  If any category exceeds its allocation, compress or defer the overflow.

**RULE 1: BATCH SIMILAR OPERATIONS**
  Trigger: 2+ similar tool calls queued (same dispatcher, same action type)
  Instead of N sequential calls, use prism_orchestrate→agent_parallel:
    Single call with array of operations → 1 round trip instead of N
    Expected speedup: 3-5x for 3+ operations
  Example: 3 material lookups → 1 agent_parallel call with 3 material_get params

**RULE 2: CHECK SIZE BEFORE LOADING**
  Before loading ANY resource into context:
    1. Check current pressure via prism_context→context_pressure or mental estimate
    2. Estimate resource size (skills ~2-5KB, materials ~1KB, state files ~2-5KB)
    3. If resource > remaining budget: compress existing context first, OR load incrementally
  Never blindly load a 20KB skill when you're at 70% pressure.

**RULE 3: CACHE REPEATED LOOKUPS**
  Track what's already loaded this session — don't reload:
    Skills: if skill_load was called, content is in context. Don't call again.
    Materials: after first material_get, cache the properties mentally. Don't re-query.
    State: use prism_session state data. Don't re-read CURRENT_POSITION.md mid-session.
  Exception: if you suspect data changed since loading (e.g., you just modified the file).

**RULE 4: PARALLELIZE INDEPENDENT OPERATIONS**
  If operations don't depend on each other's results:
    Use agent_parallel or swarm_parallel instead of sequential execution
    Material lookup + machine lookup + tool lookup = parallel (3→1 round trip)
    Material lookup THEN speed_feed_calc = sequential (calc needs material data)

**DECISION TREE:**
  Operations count >= 2 AND same type? → BATCH with agent_parallel
  Operations count >= 2 AND independent? → PARALLELIZE
  Operations count >= 2 AND dependent? → PIPELINE (sequential but plan ahead)
  Single operation? → Direct call, no batching needed

## What It Returns
- Token budget breakdown: how much context to allocate per category
- Batching decision: whether to batch, parallelize, or pipeline the current operations
- Round trip reduction: typically 3-5x fewer tool calls for batched operations
- Budget compliance: prevents context overflow from unplanned resource loading
- Caching guidance: which lookups can be skipped because data is already in context

## Examples
- Input: "Need material properties for AL-6061, AL-7075, and AL-2024 to compare"
  Decision: 3 similar operations (material_get) → BATCH
  Action: prism_orchestrate→agent_parallel with 3 material_get operations
  Result: 1 round trip instead of 3. All 3 materials loaded. ~3x faster.

- Input: "At 68% context pressure, need to load prism-safety-framework skill (26.2KB)"
  Decision: 68% pressure + 26.2KB skill → would push past 75% ORANGE threshold
  Action: Compress current context first (prism_context→context_compress), THEN load skill
  Alternative: Load only the specific section you need, not the full 26.2KB monolith

- Edge case: "Need material data, then use that data for speed_feed_calc"
  Decision: dependent operations (calc needs material) → PIPELINE, not parallel
  Action: material_get first → extract kc1_1 and mc → speed_feed_calc with those values
  Cannot parallelize because the second call depends on the first call's output
SOURCE: Split from prism-efficiency-controller (11.6KB)
RELATED: prism-context-pressure, prism-session-lifecycle
