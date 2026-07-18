---
type: "chat-session"
source: "claude-code-cli"
session_id: "3c54f3f4-6786-4c39-84d6-62b0a0db8cad"
title: "Review a NEW pure-JS library and its test for the PRISM blueprint-vision OCR pip"
date: "2026-06-22"
first_ts: "2026-06-22T14:48:51.705Z"
last_ts: "2026-06-22T14:49:54.730Z"
cwd: "H:\\prism"
messages: 15
user_msgs: 6
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/3c54f3f4-6786-4c39-84d6-62b0a0db8cad/subagents/agent-a70e29b3842443e87.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Review a NEW pure-JS library and its test for the PRISM blueprint-vision OCR pip

> **claude-code-cli** | 2026-06-22 | 15 msgs (6 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/3c54f3f4-6786-4c39-84d6-62b0a0db8cad/subagents/agent-a70e29b3842443e87.jsonl`

## Transcript

### User | 2026-06-22T14:48:51.705Z

Review a NEW pure-JS library and its test for the PRISM blueprint-vision OCR pipeline. Read BOTH files end-to-end:
- H:/prism/scripts/lib/vision-tiling-lib.mjs (the library)
- H:/prism/scripts/lib/vision-tiling-lib.test.mjs (its test, 19 tests, all passing)

CONTEXT: This implements the GPU-free pure core of "P0.2 region tiling for dense pages" from knowledge/wiki/architecture/blueprint-reading-improvement-backlog-2026-06-19.md. Tiling splits a blueprint page PNG into overlapping quadrants (+ a center tile spanning the seam cross), each gets OCR'd by a VLM ensemble (a SEPARATE follow-up unit does the image crop + OCR), then `mergeTiledDimensions` recombines the per-tile dimension lists into one de-duplicated set. The VLM dims carry NO numeric bbox (only a free-text location_hint), so the merge is overlap-topology + (type,value,raw)-keyed and RECALL-FIRST: a dim in the overlap seam (seen in OVERLAPPING tiles) collapses to one; two distinct same-valued features in NON-overlapping tiles are kept separate; when topology is unknown it must NOT cross-merge.

Grade PASS or FAIL. Focus on SILENT BREAKAGE and edge/regression risk:
1. Is the union-find component-merge in mergeTiledDimensions correct? Can it ever (a) over-merge two genuinely-distinct features (recall-safe is the priority — over-merge is the dangerous direction), or (b) under-merge a true seam duplicate?
2. computeTileGrid geometry: are tiles guaranteed in-bounds? Is the overlapFrac/rows/cols clamping correct? Any off-by-one in the overlap rectangles? Does the center tile actually cover the seam cross? Is the 1x1 passthrough correct?
3. dimKey value bucketing (Math.round(mm/tol)): any case where two dims that should merge get different keys, or vice-versa? The raw-text fallback for callouts with no nominal_mm?
4. Edge cases: empty/null input, dims with null tileId (must passthrough never drop), NaN/missing nominal_mm, a tile id not present in the grid map.
5. Any unreachable code, logic error, or a test that wo
... [+208 chars truncated]

### Assistant | 2026-06-22T14:48:55.204Z

I'll read both files end-to-end and trace the logic adversarially.

### Assistant | 2026-06-22T14:48:55.675Z

[tool_use: Read]

### Assistant | 2026-06-22T14:48:56.079Z

[tool_use: Read]

### User | 2026-06-22T14:48:57.015Z

[tool_result] 1	/**
2	 * vision-tiling-lib.mjs -- P0.2 dense-page region tiling: PURE tile-grid geometry + cross-tile dimension
3	 * merge. No image I/O and no GPU live here. The image-crop + ensemble-OCR step (a follow-up unit)
4	 * consumes `computeTileGrid()` to produce N overlapping sub-image extractions, then feeds the per-tile
5	 * results to `mergeTiledDimensions()` to recombine them into one de-duplicat
... [+11254 chars truncated]

### User | 2026-06-22T14:48:57.866Z

[tool_result] 1	// Tests for vision-tiling-lib.mjs -- P0.2 dense-page region tiling (grid geometry + cross-tile merge).
2	// Real reference values; happy path + >=3 failure modes + >=2 adversarial inputs per function.
3	// Run: node scripts/lib/vision-tiling-lib.test.mjs
4	import { test } from "node:test";
5	import assert from "node:assert/strict";
6	import {
7	  computeTileGrid,
8	  tilesOverlap,
9	  mergeTile
... [+10679 chars truncated]

### Assistant | 2026-06-22T14:49:00.354Z

Let me verify the key claim about the dim contract (location_hint vs bbox) against the referenced source, and trace the union-find transitivity concern in the merge.

### Assistant | 2026-06-22T14:49:02.256Z

[tool_use: Grep]

### Assistant | 2026-06-22T14:49:02.892Z

[tool_use: Grep]

### User | 2026-06-22T14:49:03.774Z

[tool_result] 10:// contract to a bare {confidence, dimensions} — material/title-block/GD&T/
91:    '      "location_hint": "where on the part this dimension is",',
92:    '      "raw_text": "the exact text shown on the drawing", "confidence": 0.95 }',
98:    '      "raw_text": "the feature control frame text", "confidence": 0.9 }',
101:    '  "profiles": [ { "name": "descriptive name", "type": "external|intern
... [+2276 chars truncated]

### User | 2026-06-22T14:49:08.084Z

[tool_result] Found 5 files
state\shared\dashboards\injection-dedup-cache.json
mcp-server\data\state\session-file-ownership.json
state\shared\ATOMIC_CLAIMS.json
scripts\lib\vision-tiling-lib.test.mjs
scripts\lib\vision-tiling-lib.mjs

### Assistant | 2026-06-22T14:49:18.166Z

The contract claim is verified: `ollama-vision-extract-lib.mjs:489-512` emits `{type, nominal_mm, location_hint, raw_text, confidence}` with no numeric bbox. The new lib has no consumers yet (only itself + its test) — this is the pure core ahead of the crop+OCR follow-up unit, as documented.

Now let me trace the critical adversarial concern: union-find transitivity in a NON-transitive overlap relation, the dominating concern for over-merge (the dangerous direction).

Let me examine the union-find logic carefully at lines 189-213, especially the find/union ordering.

### Assistant | 2026-06-22T14:49:18.946Z

[tool_use: Read]

### User | 2026-06-22T14:49:20.542Z

[tool_result] 189	  for (const bucket of byKey.values()) {
190	    // Union-find over the bucket's instances on the `connected` relation.
191	    const parent = bucket.map((_, idx) => idx);
192	    const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
193	    for (let a = 0; a < bucket.length; a++) {
194	      for (let b = a + 1; b < bucket.length; b++) {
1
... [+947 chars truncated]

### Assistant | 2026-06-22T14:49:54.730Z

I have everything I need. Let me reason through the critical findings precisely.

## The central concern: union-find over a NON-transitive overlap relation (the over-merge direction)

This is the load-bearing finding. The merge clusters instances within a `dimKey` bucket by transitively closing the `connected` relation via union-find. But `tilesOverlap` is **geometrically non-transitive**: A overlaps B, B overlaps C, but A may NOT overlap C. Union-find transitively merges A-B-C into one component anyway.

Concretely, with the DEFAULT 2x2 grid + center (`computeTileGrid(1000,1000)`): `r0c0` overlaps `center`, and `center` overlaps `r1c1`, but `r0c0` and `r1c1` (diagonal quadrants) do NOT overlap. The seam-cross dim landing in `center` is the intended bridge — that is by-design and recall-correct for ONE physical feature. The problem is the OPPOSITE case the spec explicitly demands stay separate: **two genuinely-distinct same-valued features**, one in `r0c0`, one in `r1c1`. If the VLM also reports either of those values in the `center` tile (entirely plausible — center spans the page midpoint and overlaps all four quadrants), the chain `r0c0—center—r1c1` collapses all three into ONE component. Two distinct Ø.500 holes in opposite corners would silently merge into one — the exact recall-destroying over-merge the module's own docstring (lines 15-18) says must never happen.

The test at line 197-210 ("3-tile seam chain A-B-center → agreement 3") actually *validates* transitive bridging as correct — but it only tests the case where that is desired (one feature). There is **no test for the adversarial case**: distinct non-overlapping features bridged by a common center tile. So R9 is violated for this path — the test suite would stay green even though the spec's core invariant ("two distinct same-valued features in NON-overlapping tiles are kept SEPARATE") is breakable in the default geometry. This is a P1.

Now the remaining findings.

---

VERDICT: FAIL

summary: The lib
... [+3954 chars truncated]
