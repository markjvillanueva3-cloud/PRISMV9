---
name: prism-caching-patterns
description: Three caching strategies for PRISM engines — memoization for pure functions, LRU for repeated lookups, TTL for time-sensitive data — with decision tree for which to use
---
# Caching Patterns

## When To Use
- Building a new engine or dispatcher that makes repeated lookups (materials, machines, tools)
- "This calculation is called 50 times with the same inputs" → memoize it
- "Material lookups are slow and we keep requesting the same ones" → LRU cache
- "Machine capabilities change but we cache them" → TTL cache with expiry
- NOT for: MCP-level batching and token budget (use prism-batch-efficiency)
- NOT for: database query optimization (that's schema/index design, not caching)

## How To Use
**DECISION TREE — which cache pattern:**
  Pure function (same inputs → same output, no side effects)? → MEMOIZE
  Repeated lookups with limited working set? → LRU CACHE
  Data that changes over time but is expensive to fetch? → TTL CACHE
  One-off computation, never repeated? → DON'T CACHE (overhead > benefit)

**PATTERN 1: MEMOIZATION** — cache pure function results by input key
  Use for: cutting force calculations, unit conversions, geometry computations
  Implementation: wrap function with memoize(), provide key generator
  ```typescript
  const calcForceMemo = memoize(
    (kc1_1: number, mc: number, h: number) => kc1_1 * Math.pow(h, -mc),
    (kc1_1, mc, h) => `${kc1_1}-${mc}-${h.toFixed(4)}`
  );
  ```
  Key generator converts args to unique string key. Cache is Map<string, result>.
  Memory: grows unbounded — use for functions with bounded input domain.
  Invalidation: none needed (pure functions never change).

**PATTERN 2: LRU CACHE** — bounded size, evicts least-recently-used
  Use for: material lookups, machine specs, tool catalog entries
  Implementation: LRUCache<K,V> with configurable maxSize
  ```typescript
  const materialCache = new LRUCache<string, Material>(500);
  // Check cache → miss → fetch from DB → store in cache → return
  const cached = materialCache.get(id);
  if (cached) return cached;
  const material = await materialRepo.findById(id);
  materialCache.set(id, material);
  ```
  maxSize: 500 for materials (each ~1KB = 500KB total), 100 for machines (~2KB each)
  Eviction: when full, oldest unused entry is dropped automatically.
  Invalidation: call cache.clear() if underlying data changes (e.g., after registry update).

**PATTERN 3: TTL CACHE** — time-based expiry for changing data
  Use for: machine status, spindle thermal state, real-time sensor data
  Implementation: store {value, expiresAt} with each entry
  ```typescript
  const ttlCache = new TTLCache<string, MachineStatus>(300_000); // 5 min TTL
  // Returns undefined if expired, forcing a fresh fetch
  ```
  TTL values: 5 min for machine status, 1 hour for capability matrices, 24h for static specs
  Eviction: entries auto-expire. Stale reads return undefined → triggers fresh fetch.

**CACHE SIZING GUIDE:**
  Material properties: LRU(500), ~500KB total memory
  Machine specs: LRU(100), ~200KB total memory
  Tool catalog: LRU(200), ~400KB total memory
  Calculation results: Memoize with bounded domain, ~100KB typical
  Real-time data: TTL with short expiry, ~50KB at any time

## What It Returns
- Memoize: cached function that returns instantly on repeated inputs (0ms vs computation time)
- LRU: bounded cache with automatic eviction, O(1) get/set, configurable size
- TTL: time-aware cache that forces re-fetch after expiry, prevents stale data
- Decision: which pattern fits the current use case based on data characteristics
- Performance: typical 10-100x speedup on repeated lookups depending on underlying cost

## Examples
- Input: "Cutting force calculation called 200 times during multi-pass optimization"
  Pattern: MEMOIZE — same kc1_1/mc/h combinations repeat across passes
  Result: first call computes (1ms), subsequent identical calls return from cache (0.01ms)
  200 calls with 30 unique combos: 30 computations + 170 cache hits = 95% cache hit rate

- Input: "Material registry has 3518 entries but typical session uses 5-10 materials"
  Pattern: LRU(500) — working set is tiny vs total, same materials re-requested
  Result: first lookup fetches from JSON (5ms), subsequent lookups return from cache (0.01ms)
  Over 50 lookups across 8 unique materials: 8 fetches + 42 cache hits = 84% hit rate

- Edge case: "Machine spindle thermal state changes every few minutes during operation"
  Pattern: TTL(300000) — 5 minute expiry. State changes but not every call.
  Result: first fetch gets real-time state. Next 20 calls within 5 min use cached.
  After 5 min: cache expires, next call fetches fresh thermal data.
  Why not LRU: LRU never expires — would serve stale thermal data indefinitely.
SOURCE: Split from prism-performance-patterns (30.6KB)
RELATED: prism-async-patterns, prism-batch-efficiency
