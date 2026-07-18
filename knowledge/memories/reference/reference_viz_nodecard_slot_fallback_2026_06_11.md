---
name: reference_viz_nodecard_slot_fallback_2026_06_11
description: node-card (the token-cheap system-viz read-by-id) was DEAD (ENOENT) from every slot worktree because node-card-read.mjs pinned the graph sidecars to the local tree, but they're gitignored per-tree artifacts only the canonical regen produces. Fixed with resolveVizDir() local-then-canonical fallback. Pure-read so no cross-tree-writer risk; the write-bearing find-cache path in system-viz-graph.mjs is a separate, deferred follow-on.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.252Z
aliases: reference_viz_nodecard_slot_fallback_2026_06_11
---


# node-card slot-worktree fallback -- U-VIZ-NODECARD-SLOT-FALLBACK (2026-06-11, slot:sierra, commit e107dc3b23)

## The bug (live-reproduced)
The fleet is explicitly directed (substrate-routing inject + the sierra soul) to "query the graph
before grep" via `node scripts/system-viz-query.mjs find <q>` / `node-card <id>` as the MCP-down
fallback. But `node-card` was **ENOENT from every slot worktree**: `node-card-read.mjs` resolved
its sidecars to `path.resolve(__dirname,'../..')/state/shared/system-viz/...` = the LOCAL tree.
The graph + its sidecars (system-graph-index.json, find-cache.json, node-card-offsets.json,
node-cards.jsonl) are **gitignored per-tree artifacts produced ONLY by the canonical scheduled
regen** -- a slot worktree (H:/prism-slot-<nato>) has none. So the whole cheap read-by-id surface
was dead from slots even though canonical was GREEN (717MB, fresh). Same multi-tree-resolution bug
CLASS as the corpus-index-query fix [[reference_corpus_query_substrate_resolution_fix_2026_06_11]].

## The fix
`resolveVizDir({_fs,local,canonical})` -- picks the viz data dir = LOCAL tree if it has any of the
3 probe sidecars, else CANONICAL (H:/prism). `DEFAULT_PATHS` derives ALL 5 paths from that ONE dir
so the offsets<->jsonl pair can never split across trees. Exported + injectable `_fs` for tests.
20/20 tests (16 existing untouched -- they inject `opts.paths`, default-safe -- + 4 resolveVizDir,
separator-agnostic token-dir stubs). LIVE eval gate: `node-card eng.mill` from the slot tree now
returns `source: node-card-offsets` (canonical), was ENOENT.

## Write-safety scoping (the load-bearing decision)
Fixed **only** `node-card-read.mjs` because it is **PURE READ** (no fs writes) -- a canonical
fallback there cannot create a cross-tree writer, so the one-writer-per-path invariant on
system-graph.json (sierra soul refuse #7) is preserved. The sibling `find` path in
`system-viz-graph.mjs` (`findCachePath`/`graphPath`) is NOT touched: `loadGraph` lazily WRITES the
find-cache via `writeSidecarAtomic`, and `regenFindCache` writes too -- a naive canonical fallback
there would let a slot WRITE the canonical sidecar (one-writer violation). Making `find` work from
slots needs a careful read/write path split (read resolves canonical, write stays local) +
freshness-sentinel review -- a deferred follow-on, NOT a naive change.

## PAIR CLOSED: U-VIZ-FIND-SLOT-READONLY (2026-06-12, commit 9dd49e92be)
The deferred follow-on shipped: `find`/`cache-status` (system-viz-graph.mjs) now resolve canonical
from a slot via `resolveVizDataDir()` (env overrides still absolute), with the WRITE side guarded:
`writesAllowedFor({envOverride,isFallback})` -- writeSidecarAtomic silently skips + regenFindCache
fails LOUD (`reason:"fallback-readonly"`) in canonical-fallback mode. One-writer PROVEN live:
canonical graph+find-cache mtimes/sizes byte-identical before/after a slot `find` (zero writes);
`find mill` from slot -> 30 hits (was ENOENT). 12/12 tests. The ENTIRE system-viz cheap-read
surface (find + node-card + cache-status) now works from every slot worktree.

## Test stub gotcha (caught the 1 fail)
A `_fs.existsSync(p)=>p.startsWith('/canon')` stub silently never matches on Windows because
`path.join('/canon','x')` yields `\canon\x` (backslash) -- the "passing" tests passed via the
fallback by coincidence. Fix: token dir names (LOCALDIR/CANONDIR) + `.includes()`, separator-agnostic.
Lesson: path-resolution test stubs must be separator-agnostic. Pairs with
[[reference_cheap_node_access_ms0_2026_06_04]] (the CHEAP-NODE-ACCESS-MS0 this extends to slots).
