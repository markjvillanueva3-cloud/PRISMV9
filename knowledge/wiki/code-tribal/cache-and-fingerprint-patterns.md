---
name: cache-and-fingerprint-patterns
category: code-tribal
domain: backend-dev
tags: [cache, ttl, fingerprint, mtime, invalidation, idempotency, regeneration-gate, per-process-cache, cross-session-cache]
last_updated: 2026-05-18
slot-attribution: alpha
---

# Cache + Fingerprint Patterns in PRISM

PRISM regenerates a lot — 21-stage wiki regen, the 244K-node system-viz graph, the 14,738-vector semantic index, the 23,981-leaf wiki tree. Naive regeneration on every change would dominate the development clock. The escape: **caches keyed on fingerprints** that only invalidate when the inputs actually change.

This wiki captures the four cache regimes PRISM uses and the failure modes each addresses.

## The four cache regimes

| Regime | Lifetime | Storage | Example |
|--------|----------|---------|---------|
| **In-process** | This process | Map / WeakMap | leafCache, obsidianCache in bridge.mjs |
| **Per-session** | This Claude session | JSON in `.cache/` | session-budget-state |
| **Cross-session sidecar** | Until input changes | sibling `.json` + fingerprint | `state/shared/system-viz/system-graph.json` |
| **Computed-vs-input gate** | Forever | input fingerprint vs output fingerprint | regen-wiki-from-viz fingerprint check |

The choice depends on TWO questions:
1. How expensive is the computation? (cheap → no cache; expensive → cache)
2. How frequently does the input change? (rarely → long TTL; often → fingerprint-only, no TTL)

## Pattern 1 — In-process TTL cache (per-call memoization)

For tools that fire repeatedly within one process (an Ollama agent loop hitting `wiki_lookup` 5 times in a turn), a per-process TTL cache is enough:

```js
const _leafCache = new Map();  // root → { at, leaves }

function getCachedLeaves(root) {
  const now = Date.now();
  const hit = _leafCache.get(root);
  if (hit && now - hit.at < WIKI_LEAVES_CACHE_TTL_MS) return hit.leaves;
  const leaves = listWikiLeafFiles({ root });
  _leafCache.set(root, { at: now, leaves });
  return leaves;
}
```

Three disciplines:
- **Keyed on `root`**, not bare — a future multi-root test never cross-contaminates.
- **NOT exported** — internal mutable state; tests reach `listWikiLeafFiles` directly to avoid cache contamination.
- **TTL chosen relative to producer cadence** — leaves regenerate on post-commit + hourly cron; 5min is well below the change frequency.

When NOT to use it: stateless one-shot scripts. The cache lives in process memory and dies on exit — for a one-shot CLI, the cache is born and dies in the same invocation.

## Pattern 2 — Fingerprint gate (recompute IFF inputs changed)

The canonical PRISM regen pattern. Compute a fingerprint of all inputs; compare to the stored fingerprint; skip if equal.

```js
function shouldRegenWiki() {
  const inputs = [
    'state/shared/system-viz/system-graph.json',
    'mcp-server/data/docs/DISPATCHER_DIGEST.md',
    'mcp-server/data/docs/ENGINE_DIGEST.md',
  ];
  const fp = inputs.map(p => {
    try { return statSync(p).mtimeMs; } catch { return 0; }
  }).join(':');
  const stored = readFileSync('knowledge/wiki/.fingerprint', 'utf-8').trim();
  if (fp === stored) return { skip: true };
  return { skip: false, fp };
}
```

After successful regen:
```js
fs.writeFileSync('knowledge/wiki/.fingerprint', fp);
```

The 2026-05-16 wiki regen orchestrator (`scripts/regen-wiki-from-viz.mjs`) uses this gate: commits that don't touch the graph/inputs skip the ~8min chain entirely.

**Mtime IS a fingerprint** when:
- The file is only modified by trusted writers (not the OS clock).
- Editors don't `touch` the file without changing content.
- Filesystem mtime resolution is sufficient (NTFS = 100ns, ext4 = 1ns).

When mtime is insufficient — use **content hash** (SHA256 of bytes). Slower to compute but bulletproof.

## Pattern 3 — Sidecar cache with explicit invalidation

For caches that must survive process restart but invalidate on a known event, write a sidecar JSON next to the input:

```js
// state/shared/system-viz/system-graph.json — the data
// state/shared/system-viz/system-graph.cache.json — the sidecar
{
  "schemaVersion": "1.0.0",
  "inputFingerprint": "abc123...",
  "computedAt": "2026-05-18T15:00:00Z",
  "computedHost": "MarkV",
  "computedNodes": 244020,
  "expensive_derived_value": { ... }
}
```

A reader:
```js
function getComputed(inputPath, cachePath) {
  const inFp = computeFingerprint(inputPath);
  try {
    const cache = JSON.parse(readFileSync(cachePath));
    if (cache.inputFingerprint === inFp) return cache.expensive_derived_value;
  } catch { /* cache missing or stale */ }
  // recompute, then write the new sidecar
  const value = expensiveCompute(inputPath);
  atomicWriteJson(cachePath, {
    schemaVersion: '1.0.0',
    inputFingerprint: inFp,
    computedAt: new Date().toISOString(),
    computedHost: os.hostname(),
    expensive_derived_value: value,
  });
  return value;
}
```

Multi-host: include `computedHost` so PC-A and PC-B can disagree about staleness without overwriting each other. See [[concurrency-and-locking-patterns]] Pattern 6.

## Pattern 4 — The 80MB OOM cap on file loads

A subtle cache failure: reading a too-large file into memory + then trying to JSON.parse it overflows V8's max-string-length (~512MB) and crashes silently. PRISM has hit this several times.

**Pattern**: defensive size cap at the reader boundary:

```js
const MAX_GRAPH_BYTES = 80 * 1024 * 1024;  // 80 MB

function loadGraph({ root } = {}) {
  const file = join(root, 'state/shared/system-viz/system-graph.json');
  let stat;
  try { stat = statSync(file); } catch (e) {
    return { ok: false, error: `cannot stat ${file}: ${e.message}` };
  }
  if (stat.size > MAX_GRAPH_BYTES) {
    return { ok: false, error: `graph oversize (${stat.size} > ${MAX_GRAPH_BYTES})` };
  }
  // safe to readFileSync + JSON.parse
}
```

The 2026-05-18 `ask-ollama.mjs` had a fallback to `system-graph.json` (~370 MB) → OOM. Fix: 80 MB cap surfaces the failure as a clean Result-error instead of a silent crash.

The fingerprint AND the cap are both needed:
- Cap protects against OOM-on-load.
- Fingerprint protects against re-load on unchanged input.

## Pattern 5 — Cache stampede prevention

When N processes hit a cache miss simultaneously, all N compute the value. The stampede:

```
T+0: Process A: cache miss → start computing (45s expensive op)
T+0.1: Process B: cache miss → start computing (the same 45s op)
T+0.2: Process C: cache miss → start computing (the same 45s op)
T+45: All three writes finish — winner takes the cache
```

The stampede multiplies CPU/IO load. **Pattern**: use a lockfile to serialize the compute, but let waiters READ the result when the leader finishes:

```js
function getOrCompute(cachePath, computeFn) {
  // Fast path: cache hit
  const hit = tryReadCache(cachePath);
  if (hit) return hit;

  // Slow path: acquire lock OR wait
  const lock = acquirePidLock(`${cachePath}.lock`);
  if (!lock.ok) {
    // Another process is computing — wait then re-read
    waitFor(`${cachePath}.lock`, { gone: true, timeoutMs: 60_000 });
    return tryReadCache(cachePath);  // leader wrote it
  }

  try {
    const value = computeFn();
    atomicWriteJson(cachePath, value);
    return value;
  } finally {
    lock.release();
  }
}
```

The 21-stage `regen-wiki-from-viz.mjs` uses exactly this pattern at its outer level — only one regen runs at a time across the fleet.

## Pattern 6 — Cache key includes the schema version

When the producer's output shape changes, every reader needs to invalidate its cache. **Include schemaVersion in the cache key**:

```js
const cacheKey = `${root}/v${SCHEMA_VERSION}/${inputFingerprint}`;
```

Now a schema bump invalidates EVERY cache entry automatically — readers built for v1 don't accidentally consume a v2-shaped cache miss-key.

The 2026-05-16 `chat-slots.json` v1→v2 bump worked because every consumer keyed cache on `schemaVersion` — old reads never collided with new ones.

## Pattern 7 — Reset-on-startup for short-cycle caches

For session-scoped state (per-/loop counters, per-startup advisories), reset on startup rather than chasing invalidation:

```js
// SessionStart hook
if (isSessionStart) {
  fs.unlinkSync('mcp-server/data/state/this-session-counters.json');
  // ... rest of init
}
```

Simpler than tracking "is this entry from a prior session?" — the startup tick is the invalidation event.

## Pattern 8 — Compact the cache before it bloats

Append-only caches grow forever. For aging caches (telemetry, error-memory), compact on a schedule:

```js
// Daily cron: rotate everything older than 30d into archive
function compactErrorMemory() {
  const cur = JSON.parse(readFileSync('error-memory.json'));
  const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
  const fresh = cur.entries.filter(e => Date.parse(e.ts) > cutoff);
  if (fresh.length === cur.entries.length) return; // no-op
  const archive = cur.entries.filter(e => Date.parse(e.ts) <= cutoff);
  fs.writeFileSync(`error-memory-archive-${dateStamp()}.json`, JSON.stringify(archive));
  atomicWriteJson('error-memory.json', { entries: fresh });
}
```

The 2026-05-15 MEMORY-ARCHIVE.md pattern: the live `MEMORY.md` index keeps the most recent entries; older entries archive to `MEMORY-ARCHIVE.md` (still discoverable, just not loaded by default).

## Anti-patterns observed in PRISM

- **Cache without a fingerprint** — `cached = computed()` with no input check. Cache stays stale forever after the first hit.
- **Mtime fingerprint on a file modified by the OS** — `touch` operations invalidate without content change.
- **TTL that's longer than the producer cadence** — wiki cache TTL > regen interval = serving stale data.
- **In-process cache exposed to consumers** — see Pattern 1 anti — tests reach the internal cache and contaminate.
- **Reading a too-large file without size cap** — OOM-on-load (Pattern 4).
- **Cache key omits schemaVersion** — schema bump silently corrupts.
- **No stampede prevention on expensive computes** — N-way redundant work.

## Bug-class taxonomy

| Bug class | Pattern that prevents it | Example |
|-----------|--------------------------|---------|
| OOM on file load | Pattern 4 (80MB cap) | ask-ollama 2026-05-18 |
| Stale cache served | Pattern 2 (fingerprint gate) | wiki regen fingerprint 2026-05-16 |
| Cache stampede | Pattern 5 (lockfile-serialized) | regen-wiki-from-viz |
| Schema-bumped cache poison | Pattern 6 (schemaVersion in key) | chat-slots v2 |
| Unbounded cache growth | Pattern 8 (compact-on-schedule) | MEMORY.md archive |
| Cross-test contamination | Pattern 1 (don't export cache) | bridge.mjs leafCache |

## When to break the rules

For Read-Only-Per-Run scripts (the `audit-*` family), no cache is needed — they read inputs, compute output, exit. Adding a cache adds invalidation complexity for zero benefit.

For one-shot migrations, no fingerprint is needed — they run once and never again.

The general rule: **add a cache when (compute cost × call frequency) > cache infrastructure cost**. For most scripts the LHS is small; for hot-path tools (`wiki_lookup`, `viz_search` in the Ollama bridge) it's large.

## See also

- [[concurrency-and-locking-patterns]] — stampede prevention overlaps Pattern 5
- [[schema-migration-patterns]] — schemaVersion in cache key (Pattern 6)
- [[observability-patterns]] — telemetry caches use Pattern 8 compaction
- [[atomic-write-idempotency-patterns]] — sidecar cache atomic-rename
