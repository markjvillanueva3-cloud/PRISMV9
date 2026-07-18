---
name: prism-cache-selection
description: Decision procedure for choosing cache strategy — memoize for pure functions, LRU for hot data with size limits, TTL for time-sensitive data
---
# Cache Strategy Selection

## When To Use
- Building a lookup that will be called repeatedly with same inputs
- "Should I cache this?" / "Which cache type?" / "What size limit?"
- When a function is called 3+ times with identical arguments in one session
- When profiling shows repeated database/registry lookups as a bottleneck
- NOT for: implementing the cache code itself (this selects strategy; see code in source skill)
- NOT for: context window management (use prism-token-budget for token-level allocation)

## How To Use
DECISION PROCEDURE — answer these 3 questions in order:

**Q1: Is the function PURE (same inputs always produce same outputs)?**
  YES + small input space (under 1000 unique keys) → MEMOIZE
    Implementation: wrap function with memoize(), Map-based, no eviction needed
    Key generator: stringify inputs or build custom key from params
    Example: cutting force calc with (kc1_1, mc, chipThickness) → always same result
    Invalidation: never needed for truly pure functions

  YES + large input space (1000+ unique keys) → LRU CACHE
    Implementation: LRU with maxSize based on available memory
    Sizing: start at 500 entries, measure hit rate, adjust
    Example: material lookups across 3518-material registry (frequently access ~200)
    Invalidation: automatic via LRU eviction of least-recently-used entries

  NO (result changes over time) → go to Q2

**Q2: Does the data have a known staleness interval?**
  YES + interval is predictable → TTL CACHE
    Implementation: TTL cache with expiration per entry
    TTL selection: set to 50% of acceptable staleness (30s data → 15s TTL)
    Example: API rate limits (refresh every 60s), health checks, session state
    Invalidation: automatic on expiry; optionally refresh-ahead at 80% TTL

  NO → go to Q3

**Q3: Is it worth caching at all?**
  Compute cost > 1ms AND called > 3 times → YES, use LRU with conservative size
  Compute cost < 1ms OR called < 3 times → NO CACHE, direct compute is fine
  Network call involved → ALWAYS CACHE (even TTL=5s beats repeated round trips)

**SIZING GUIDE:**
  Under 100 entries, data < 1KB each → memoize (no size limit needed)
  100-10,000 entries → LRU maxSize = 2x expected hot set
  Entries > 10KB each → LRU maxSize capped by memory (entries * avg_size < 50MB)

## What It Returns
- One of 4 decisions: MEMOIZE, LRU, TTL, or NO CACHE
- Configuration parameters: maxSize for LRU, ttlMs for TTL
- Sizing recommendation based on data characteristics
- Cache key strategy (stringify vs custom key generator)

## Examples
- Input: "Kienzle cutting force: kc(kc1_1, mc, h) = kc1_1 * h^(-mc)"
  Q1: Pure function? YES. Input space? 3 params, ~500 common combos → MEMOIZE
  Config: memoize with key = `${kc1_1}-${mc}-${h.toFixed(4)}`
  Why: exact same material+thickness gives exact same force, always

- Input: "Material lookup by ID across 3518-material database"
  Q1: Pure? YES (registry doesn't change mid-session). Input space? 3518 → LRU
  Config: LRU maxSize=500 (typical session accesses ~100-200 unique materials)
  Hit rate target: >80%. If below, increase maxSize.

- Edge case: "Checking if spindle is overloaded (reads current RPM from machine state)"
  Q1: Pure? NO (RPM changes constantly). Q2: Known staleness? YES, ~1s refresh.
  Config: TTL cache, ttlMs=500 (half of 1s acceptable staleness)
  Why not no-cache: spindle check called on every tool call, network round trip is 50ms
SOURCE: Split from prism-performance-patterns (30.6KB)
RELATED: prism-batch-execution, prism-token-budget
