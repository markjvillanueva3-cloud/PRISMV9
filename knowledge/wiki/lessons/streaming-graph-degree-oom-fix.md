---
title: Streaming graph reads -- the off-heap Buffer fix for 643MB-graph OOM
type: lesson
tags: [lesson, system-viz, graph-io, oom, token-efficiency, performance]
last_verified: 2026-06-09
source_commits: [317e7d3d31, 5e990a3ac6]
related_memory: reference_goal_crosssurface_queue_2026_06_09
slot: alpha
---

# Streaming graph reads -- the off-heap Buffer fix for the 643MB-graph OOM

## The recurring failure
`state/shared/system-viz/system-graph.json` is now **~643MB / ~302K nodes**. Any
consumer that does the obvious `JSON.parse(readFileSync(...))` OR uses
`graph-io.readGraphStreaming` **OOMs the V8 heap** (process abort ~380-512MB).
This is the single ROOT cause behind THREE separate breakages observed 2026-06-09:
- `system-viz-query.mjs` find + node-card (the cheap-node-read promise -- broken)
- `lint-wiki-orphans.mjs --graph` (the `_disconnected-graph-nodes` regen)
- any future big-graph consumer

## The crucial distinction (why the obvious fixes fail)
There are THREE different ceilings -- do not confuse them:
1. **V8 string-cap (`0x1fffffe8`, ~512MB)** -- `JSON.parse` of one >512MB string
   throws `RangeError: Invalid string length`. `graph-io.readGraphStreaming`
   already dodges THIS by parsing per-element byte sub-strings.
2. **Node Buffer size** -- a `readFileSync` Buffer of 643MB is fine: **Node Buffers
   are allocated OFF the V8 heap** (C++ side), so they do NOT count against
   `--max-old-space-size`.
3. **V8 heap (materialized objects)** -- THIS is the OOM. `readGraphStreaming`
   still `arr.push(JSON.parse(elem))` + `result.nodes = arr` -- it MATERIALIZES
   302K node objects + edges as live JS objects in the V8 heap. That is what blows up.

So: bumping `--max-old-space-size` is a band-aid; the real fix is to **never
materialize** the node/edge arrays.

## The fix pattern: stream the elements, hold only a tiny digest
`scripts/lib/graph-stream-degree.mjs` (commit `317e7d3d31`) reuses
`readGraphStreaming`'s exact escape-aware/depth-tracked byte-walk, but invokes a
**callback per large-array element and DISCARDS it** instead of pushing. On-heap
state is only what the consumer accumulates -- e.g. for degree-0 detection: an
edge-endpoint `Set` (~110K ids) + minimal node records (`{id,layer,kind,parent}`),
tens of MB. The 643MB Buffer stays off-heap. Result: **degree-0 over the full
643MB graph at the DEFAULT heap, exit 0 in ~2.8s** (was an OOM-abort).

```js
import { streamGraphElements } from "./lib/graph-stream-degree.mjs";
const edgeEndpoints = new Set(); const nodeRecs = [];
streamGraphElements(buf, { onLargeElement(key, el) {
  if (key === "edges") { edgeEndpoints.add(el.from); edgeEndpoints.add(el.to); }
  else if (key === "nodes") nodeRecs.push({ id: el.id, layer: el.layer }); // minimal!
}});
// then post-filter / score -- never held the full arrays
```

## How to apply it to a new consumer
- **find / search:** score each node inside `onLargeElement`, keep a bounded top-K
  heap (not the whole scored array).
- **read-by-id (node-card):** match the target id in `onLargeElement`, emit, discard
  the rest.
- **degree / graph-health:** the `degreeZeroFromBuffer` helper is ready to import.

## Guard
`streamGraphElements` requires a real `Buffer` (`Buffer.isBuffer` -- a string has
`.length` but byte-indexes to CHARS and mis-walks multibyte UTF-8). Fail loud.

## Owner note
The shared `graph-io.mjs` materializing reader is sierra's (system-viz). The
streaming variant lives as a standalone helper so consumers adopt it without an
in-place edit of the risky shared lib. Routed to sierra to fold into
system-viz-query. See [[reference_goal_crosssurface_queue_2026_06_09]],
[[cheap-node-access-ms0]], [[reference_tribal_index_v8_string_cap_2026_06_08]]
(the sibling V8-string-cap lesson -- same "corpus outgrew the tool" class).
