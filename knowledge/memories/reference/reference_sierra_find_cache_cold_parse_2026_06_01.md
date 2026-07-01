---
name: reference_sierra_find_cache_cold_parse_2026_06_01
description: "RESOLVED 2026-06-02 (U-SV-FINDCACHE-OFFLINE-REGEN c074220997): eager regenFindCache offline generator wired into regen-viz keeps find-cache fresh → no cold-parse-on-first-find. Warm parse measured 540ms (within budget); failure was the cold path, not warm size."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.191Z
aliases: reference_sierra_find_cache_cold_parse_2026_06_01
---


# system-viz find-cache cold-parse hazard (sierra, 2026-06-01)

> **RESOLVED 2026-06-02** — U-SV-FINDCACHE-OFFLINE-REGEN (commit `c074220997`, slot:sierra).
> New `regenFindCache()` export in `scripts/lib/system-viz-graph.mjs` + `scripts/regen-find-cache.mjs`
> CLI, wired into `regen-viz.mjs` as a post-merge stage after `build-viz-adjacency`. Reuses the SAME
> `writeSidecarAtomic` primitive as the lazy path → byte-identical sidecar (schemaVersion 1, a pure
> drop-in producer), so the sidecar is always FRESH after a regen and no hook ever pays the cold
> parse. 5 hermetic tests + 2-of-2 per-file scrutiny PASS.
> **Empirical correction (R12):** the cache is **56 MB / 302,447 nodes** (NOT the ~2 MB the docstring
> claims), but its **warm parse is ~540 ms — WITHIN** the 1500 ms hook budget. So the failure was
> never a slow warm parse; it was the **cold path** (stale/absent sidecar → 695 MB graph fallthrough,
> multi-second → timeout). Eager regen keeps every hook on the 540 ms warm path. The deferred
> compaction follow-up ("is 56 MB too big?") is therefore **downgraded — not urgent**. The template
> idea that prompted this (auto-generate node-routing skills/hooks) was assessed **LOW ROI** — the
> bottleneck is adoption, not capability; this substrate fix dominates (un-breaks all 4 existing
> node-direct surfaces). Non-dup seam vs alpha: sierra owns the node graph; alpha owns wiki/tribal
> CONTENT injection — `find-cache` `FIND_FIELDS` must NOT be expanded with wiki/memory content.

**Finding.** `scripts/lib/system-viz-graph.mjs` `loadFindCache()` reads
`state/shared/system-viz/find-cache.json` (~2 MB, 6 projected fields/node).
`readSidecarIfFresh()` gates it on `graph.mtimeMs`+`size`, so a stale cache
**self-heals**: the next `find` does a full 695 MB `loadGraph` parse (~25 s) and
rewrites the sidecar. Robust for correctness — but that self-heal reparse lands
in the **hottest hook path**: `viz-first-redirect`/`audit-viz-first` fire
`system-viz-query.mjs find` ~1060×/day from fresh node subprocesses with a 2-5 s
budget. So the FIRST `find` after every regen eats a 25 s cold parse → hook
timeout / OOM (the exit-255 spawn-kills seen under memory pressure) → that slot
silently falls back to Grep, defeating the viz-first discipline for whoever
hits it first. NOT a correctness bug (self-heals); a latency+reliability blip.

**Why not just warm it at regen (the obvious fix).** `regen-viz.mjs` already
runs TWO full-graph parses post-merge — `build-graph-index.mjs`
(system-graph-index.json) and `build-viz-adjacency.mjs` (node-adjacency.json,
wired this session, commit `24b46811a5`). A naive find-cache warmer would be a
THIRD sequential 695 MB parse — wasteful, and adding parse load to an
already-memory-strained host (12 live chats) that you can't verify without
itself loading the graph is the wrong trade.

**Ranked fix options (for a future healthy-host fire / another slot):**
1. **Consolidate (best).** One post-merge "sidecar builder" parses the graph
   ONCE and emits all three (system-graph-index + node-adjacency + find-cache).
   Needs a clean public export of `projectForFind`/`FIND_FIELDS` from
   system-viz-graph.mjs (currently only via the `__test` seam). Removes 2 of 3
   redundant parses from every regen.
2. **Piggyback onto build-graph-index.** It already parses + iterates every node
   to build the inverted index — emit find-cache.json in the same pass. Couples
   two concerns but no new parse; still needs the projection export.
3. **Warm-at-regen (lean but adds a 3rd parse).** New `warm-find-cache.mjs`
   (import `loadFindCache`, call `{fresh:true}`) as a regen-viz stage after
   build-viz-adjacency. Lowest-risk wiring, worst efficiency. Only if 1/2 are
   deferred.

Pattern kin: [[reference_sierra_git_lock_discriminator_2026_06_01]] (same
session's other recurring-hazard capture). Sidecar-staleness sibling: the
master-index `system-graph-index.json` (build-graph-index IS a regen stage) and
node-adjacency.json (now a regen stage). find-cache is the last search sidecar
NOT proactively built at regen.

**Verify the hazard:** `grep -c loadFindCache scripts/regen-viz.mjs` → 0 (no warm
stage); `loadFindCache` only built lazily by the consumer on cache-miss.
