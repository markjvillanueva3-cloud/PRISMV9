---
name: reference-regen-viz-string-length-2026-05-23
description: "regen-viz.mjs crashes fleet-wide on JSON.stringify(G) — 495MB system-graph.json exceeds V8 max-string-length. Heap size won't help; needs streaming JSON write."
aliases: reference_regen_viz_string_length_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.145Z
---


# regen-viz crash — V8 max-string-length on 495MB graph

**Discovered:** 2026-05-23 papa /loop attempting `U-PSN-VIZ-REGEN` (BLUEPRINT-OCR-TRAINING-MS1 follow-up).

## Symptom

```
$ node H:/prism/scripts/regen-viz.mjs --fast
...
RangeError: Invalid string length
    at JSON.stringify (<anonymous>)
    at file:///H:/prism/scripts/merge-augmentations.mjs:1922:34
    at ModuleJob.run (node:internal/modules/esm/module_job:271:25)

Node.js v22.12.0
[regen-viz] ✗ merge subprocess failed (exit=1); post-merge stages would corrupt downstream artifacts by running against the stale pre-merge graph
[regen-viz] ABORTING — running post-merge stages against a stale graph would corrupt...
```

## Root cause

`scripts/merge-augmentations.mjs:1922` does a single `JSON.stringify(G)` on the entire graph object before writing to disk. The graph is 495MB on disk; serialized string would be similar size. **V8's max string length on 64-bit Node is ~512MB** (precisely `(2³⁰ - 25) * 2` bytes = ~1 GiB for UTF-16 internal but 2¹⁹ - 1 chars in older versions, ~512MB in Node 22). The serialized graph hits that ceiling.

## Why heap size doesn't help

The script's own diagnostic suggests `node --max-old-space-size=16384 --stack-size=8192`, but **this won't fix the underlying issue** — the limit is on the string PRIMITIVE, not on the heap. The string allocation fails inside V8's string allocator regardless of how much heap is available.

## Required fix

Rewrite `merge-augmentations.mjs:1922` to stream the JSON write:

```js
// CURRENT (broken on >512MB graphs):
fs.writeFileSync(graphPath, JSON.stringify(G));

// REPLACEMENT (streaming, no string-length ceiling):
import { Writable } from "node:stream";
import { createWriteStream } from "node:fs";
import JSONStream from "JSONStream"; // or write a custom streaming serializer
// ... or manually chunk-write the JSON structure:
const stream = createWriteStream(graphPath);
stream.write("{\n");
stream.write(`"schemaVersion": ${JSON.stringify(G.schemaVersion)},\n`);
stream.write(`"meta": ${JSON.stringify(G.meta)},\n`);
stream.write('"nodes": [\n');
for (let i = 0; i < G.nodes.length; i++) {
  stream.write(JSON.stringify(G.nodes[i]));
  if (i < G.nodes.length - 1) stream.write(",");
  stream.write("\n");
}
stream.write("],\n");
stream.write('"edges": [\n');
// ... similar streaming write
stream.write("]\n}\n");
stream.end();
```

Each node/edge object remains <1MB on its own, so per-element `JSON.stringify` is safe.

## Impact on PSN synergy

Blocks the natural pipeline:
- New engine ships → engine-scan adds it to system-graph → `generate-engine-wiki.mjs` produces its wiki page → `/master-index` surfaces it.

Until the streaming write is in, new engines need MANUAL wiki pages with `AUTO-START/AUTO-END` markers (the next successful regen will overwrite cleanly). See `[[reference_psn_docu_ocr_wiring_2026_05_23]]` iter3 for the pattern.

## How to apply

- If you attempt `node H:/prism/scripts/regen-viz.mjs` (any flags) AND the graph is >450MB, expect this crash.
- Operator should treat the streaming-write fix as its own unit (forge-grade): test on a known-good graph snapshot first, verify schemaVersion + node count + edge count match round-trip.
- Don't deferral-cascade — until this is fixed, ALL graph-dependent regens stall, but most consumers tolerate stale graph data (just lower freshness, not broken).

## Related

[[reference_psn_docu_ocr_wiring_2026_05_23]] · CLAUDE.md §Recent regressions (entry added 2026-05-23)
