---
name: prism-batch-execution
description: Decision procedure for batching and parallelizing PRISM operations — when to batch, how to structure parallel calls, expected speedup
---
# Batch & Parallel Execution

## When To Use
- About to make 2+ similar tool calls in sequence (material lookups, validations, file reads)
- "Should I batch these?" / "Can these run in parallel?" / "How much faster?"
- During skill loading at session start (always batch multiple skill_load calls)
- When processing lists of items (materials, machines, alarm codes) one at a time
- NOT for: choosing cache strategy (use prism-cache-selection)
- NOT for: token budget management (use prism-token-budget)

## How To Use
DECISION RULE — apply before any sequence of 2+ similar operations:

**STEP 1: COUNT similar operations queued**
  If count < 2 → execute normally, no batching benefit
  If count >= 2 → proceed to step 2

**STEP 2: CHECK if operations are independent**
  Independent (no operation depends on another's result) → PARALLEL
    Use: prism_orchestrate action=agent_parallel with all operations
    Expected speedup: 3-5x for I/O-bound ops (database, file reads, API calls)
    Example: loading 5 skills → agent_parallel with 5 skill_load actions
    Example: validating 10 materials → agent_parallel with 10 material_validate actions

  Dependent (operation B needs result of A) → PIPELINE
    Use: prism_orchestrate action=agent_pipeline with ordered steps
    No speedup on individual steps, but cleaner error handling + checkpointing
    Example: material_get → speed_feed_calc → safety_validate (each needs prior result)

  Mixed (some independent, some dependent) → PARALLEL groups + PIPELINE between groups
    Group independent ops together → parallel within group → pipeline between groups
    Example: [material_get + machine_get] parallel → [speed_feed_calc] depends on both

**STEP 3: SIZE the batch**
  MCP tool calls: max 10 parallel (diminishing returns above 10, risk of timeout)
  File operations: max 5 parallel (filesystem contention above 5)
  API calls: max 3 parallel (rate limiting, especially Claude API)
  Database queries: max 10 parallel (registry is in-memory, fast)

**STEP 4: HANDLE failures**
  Batch with failover: if 1 of 10 fails, collect 9 results + 1 error. Don't retry whole batch.
  Pipeline with rollback: if step 3 of 5 fails, checkpoint at step 2, retry step 3 only.
  Parallel with timeout: set per-operation timeout (5s default), skip timed-out operations.

**COMMON BATCHING PATTERNS:**
  Session start skill loading: agent_parallel([skill_load(s1), skill_load(s2), ...])
  Multi-material comparison: agent_parallel([material_get(m1), material_get(m2), ...])
  Index rebuilding: agent_parallel([update_skill_index(s) for each new skill])
  Validation sweep: agent_parallel([validate(item) for item in items])

## What It Returns
- Decision: SEQUENTIAL (count < 2), PARALLEL (independent), PIPELINE (dependent), or MIXED
- Batch size recommendation based on operation type
- Expected speedup multiplier (typically 3-5x for parallel I/O)
- Error handling strategy for the chosen batch mode
- The actual orchestration call to use (agent_parallel, agent_pipeline, or combination)

## Examples
- Input: "Need to load 5 skills at session start: lifecycle, pressure, recovery, hooks, anti-regression"
  Step 1: count = 5 (>= 2). Step 2: all independent (no skill depends on another). → PARALLEL
  Step 3: 5 skill loads, under max 10. Step 4: if 1 fails, load other 4, retry failed one.
  Call: `prism_orchestrate action=agent_parallel params={tasks: [skill_load(s1)...skill_load(s5)]}`
  Speedup: ~4x (5 sequential calls → 1 parallel batch)

- Input: "Calculate optimal parameters: get material → get machine → compute speed/feed → validate safety"
  Step 1: count = 4. Step 2: each step needs prior result → PIPELINE
  Call: `prism_orchestrate action=agent_pipeline params={steps: [material_get, machine_get, speed_feed_calc, safety_validate]}`
  No speedup, but clean error handling: if speed_feed fails, material+machine results preserved.

- Edge case: "Process 50 materials for a comparison report"
  Step 1: count = 50 (>> 2). Step 2: all independent → PARALLEL.
  Step 3: 50 > max 10 → batch in groups of 10 (5 groups).
  Execute: 5 sequential agent_parallel calls, each with 10 material_gets.
  Total: 5 round trips instead of 50 → 10x speedup.
  Failure handling: if 3 of 50 fail, report 47 results + list 3 failures for retry.
SOURCE: Split from prism-performance-patterns (30.6KB) + prism-efficiency-controller (11.6KB)
RELATED: prism-cache-selection, prism-token-budget
