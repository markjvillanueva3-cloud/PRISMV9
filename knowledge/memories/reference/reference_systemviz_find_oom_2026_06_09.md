---
name: reference_systemviz_find_oom_2026_06_09
description: "system-viz-query find OOM root-caused + immediate-fixed (slot:alpha, post-compact 2026-06-09). find was OOMing NOT in its own path but because the find-cache sidecar was STALE -> loadFindCache falls back to the full 674MB loadGraph -> V8-heap OOM. Fix: ran regen-find-cache.mjs (self-bumps heap + streaming fallback, 8.2s) -> find-cache FRESH (302,542 nodes/57.6MB) -> find works (mill->30 hits, verified). Durable fix (sierra): auto-regen on stale instead of OOM-fallback + post-commit wiring. node-card WORKS (offset-index); headline + heavy commands still OOM via eager loadGraph."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.214Z
aliases: reference_systemviz_find_oom_2026_06_09
---


# system-viz-query find OOM -- root cause + fix (2026-06-09, slot:alpha)

The directive's core "navigating the codebase / cheap reads" depends on
`system-viz-query find`. It was OOMing. Root-caused + fixed it this fire.

## Root cause (NOT what it looked like)
`find` does NOT load the 674MB graph directly -- its handler calls
`loadFindCache()` (the 55-57MB sidecar) then `findInGraph()`. The OOM is a
FALLBACK: `loadFindCache` is documented "if [sidecar] is stale or absent we fall
through to loadGraph()" -- and `loadGraph` -> `readGraphStreaming` MATERIALIZES
the 674MB graph -> V8-heap OOM. cache-status showed `find-cache: STALE
(mtime/size != live graph)`. So: stale sidecar -> full-graph fallback -> OOM.
(Correcting an earlier wrong claim: **node-card WORKS** -- it reads the
offset-index via readCards, returned real eng.mill docs+memories. Only `find`
and the eager-loadGraph heavy commands OOM.)

## The fix (immediate, zero-risk)
`node scripts/regen-find-cache.mjs` -- it self-re-execs with a bumped heap +
uses loadGraph's streaming fallback, rebuilt the sidecar in 8.2s (302,542 nodes,
57.6MB). After: cache-status `find-cache: FRESH`; `find "mill"` -> 30 hits,
`find "ollama"` -> the model nodes, `find "dark wiki"` -> 2. find works fleet-wide.
NO code change -- a data refresh ("missing/stale file -> regenerate it").

## Why it went stale (the durable gap -> sierra)
`regen-find-cache` is referenced only by `regen-viz.mjs` (the canonical graph
pipeline). The `.git/hooks/post-commit` does NOT refresh find-cache. So when the
graph (674MB) is rebuilt out-of-band (not via a full regen-viz), the find-cache
is left stale -> find silently falls back to the OOM. DURABLE FIXES (sierra's
regen-viz / system-viz-graph lane, routed via AGENT_CHAT):
1. Make `loadFindCache` stale-path AUTO-REGEN (spawn regen-find-cache, 8s
   self-heal) instead of falling back to the OOM-ing full `loadGraph`.
2. Wire find-cache freshness into post-commit or a cron.
3. The eager `loadGraph()` (system-viz-query.mjs:249) used by headline /
   roadmap-candidates / blast-radius / coverage-by-domain / dispatcher-summary
   STILL OOMs -- adopt `graph-stream-degree.mjs` streamGraphElements (stream +
   aggregate per command). See [[streaming-graph-degree-oom-fix]],
   [[reference_goal_crosssurface_queue_2026_06_09]].

## Lesson
A "find OOM" is not always in the find path -- a STALE compact-sidecar that
silently falls back to a full materializing graph load is the trap. Check
`system-viz-query cache-status` FIRST; `regen-find-cache.mjs` self-heals in ~8s.
