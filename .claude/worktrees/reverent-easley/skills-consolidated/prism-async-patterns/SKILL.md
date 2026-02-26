---
name: prism-async-patterns
description: Three async execution patterns for PRISM engines — parallel with Promise.all, controlled concurrency limiter, and debounce/throttle for rate-sensitive operations
---
# Async Execution Patterns

## When To Use
- Loading multiple independent resources (materials + machines + tools simultaneously)
- Processing a batch of items where each requires an async operation
- Calling external APIs that need rate limiting or concurrency control
- Event handlers firing too frequently (UI updates, monitoring checks)
- NOT for: MCP tool call batching (use prism-batch-efficiency — that's MCP-level)
- NOT for: caching repeated results (use prism-caching-patterns)

## How To Use
**DECISION TREE — which async pattern:**
  Multiple independent async calls? → PROMISE.ALL (parallel)
  Large batch with resource limits? → CONTROLLED CONCURRENCY
  Rapid-fire event that only needs latest? → DEBOUNCE
  Rate-limited API or periodic action? → THROTTLE

**PATTERN 1: PARALLEL EXECUTION** — Promise.all for independent operations
  Use when: 2+ async calls that don't depend on each other's results
  ```typescript
  // Sequential: 330ms (100+150+80)
  const materials = await loadMaterials();
  const machines = await loadMachines();
  const tools = await loadTools();
  
  // Parallel: 150ms (max of all three)
  const [materials, machines, tools] = await Promise.all([
    loadMaterials(), loadMachines(), loadTools()
  ]);
  ```
  Speedup: total time = slowest operation (not sum of all)
  Error handling: if ANY promise rejects, entire Promise.all rejects.
  Use Promise.allSettled() if you want partial results on failure.
  Rule: never await sequentially when operations are independent.

**PATTERN 2: CONTROLLED CONCURRENCY** — process N items, max K at a time
  Use when: batch of 50+ items but can only run 5-10 concurrently (API limits, memory)
  Implementation: mapWithConcurrency(items, asyncFn, concurrencyLimit)
  Internally: tracks executing promises, awaits Promise.race when at limit, refills slot
  Concurrency values: 5 for API calls, 10 for local I/O, 3 for heavy computations
  Why not Promise.all: 500 simultaneous items = resource exhaustion
  Why not sequential: 500 * latency = way too slow

**PATTERN 3: DEBOUNCE** — wait for pause before executing
  Use when: input changes rapidly but you only need the final state
  Behavior: resets timer on every call. Executes after delayMs of silence.
  ```typescript
  const debouncedSave = debounce(saveState, 1000);
  // Called 10 times in 500ms → executes ONCE, 1000ms after last call
  ```
  Use for: auto-save after edits, search-as-you-type, resize handlers
  Delay values: 300ms for search, 1000ms for auto-save, 100ms for UI updates

**PATTERN 4: THROTTLE** — execute at most once per interval
  Use when: action should fire periodically regardless of call frequency
  Behavior: first call executes immediately. Subsequent calls ignored until interval passes.
  ```typescript
  const throttledCheck = throttle(checkPressure, 5000);
  // Called 100 times in 5s → executes TWICE (at 0ms and 5000ms)
  ```
  Use for: progress reporting, rate-limited APIs, monitoring heartbeats
  Interval values: 5s for pressure checks, 1s for progress bars, 60s for telemetry

## What It Returns
- Parallel: all results in array, total time = max(individual times), not sum
- Concurrency: all results with bounded resource usage, predictable throughput
- Debounce: single execution after rapid-fire calls settle, saves wasted computation
- Throttle: regular-interval execution regardless of call frequency, prevents flooding
- Combined: robust async pipeline that's fast, bounded, and rate-aware

## Examples
- Input: "Need material + machine + tool data for a speed_feed calculation"
  Pattern: PARALLEL — three independent lookups
  Implementation: Promise.all([getMaterial(id), getMachine(id), getTool(id)])
  Result: 3 lookups in ~150ms instead of ~330ms sequential. 2.2x speedup.

- Input: "Validate 200 materials against physics constraints"
  Pattern: CONTROLLED CONCURRENCY — batch too large for Promise.all
  Implementation: mapWithConcurrency(materials, validateMaterial, 10)
  Result: 10 validations running at any time. ~20 rounds of 10 = 200 done in 20x single time.
  Without concurrency limit: 200 simultaneous validations could exhaust memory.

- Edge case: "User edits cutting parameters rapidly, each change triggers recalculation"
  Pattern: DEBOUNCE — only recalculate after user stops editing
  Implementation: debounce(recalculate, 500) — wait 500ms of no changes
  Result: user makes 15 rapid edits → 1 recalculation (not 15). Saves 93% compute.
SOURCE: Split from prism-performance-patterns (30.6KB)
RELATED: prism-caching-patterns, prism-batch-efficiency
