---
name: reference_postmerge_capsafe_2026_06_10
description: ROOT CAUSE of system-viz >630MB regen failure - 4 post-merge stages wrote via JSON.stringify(graph) which throws at >512MiB; fixed to writeGraphStreamingAtomic
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.729Z
aliases: reference_postmerge_capsafe_2026_06_10
---


# system-viz post-merge stages cap-unsafe write -> FIXED (2026-06-10, slot:sierra, U-VIZ-POSTMERGE-CAPSAFE, commit 80f8059cb1)

**THE root cause of golf's ">630MB regen failure" + the regen `failed=5` (4 of 5).** After `merge-augmentations` grows the graph past V8's 512 MiB string cap (live graph hit 660MB), the 4 post-merge cleanup stages threw `RangeError: Invalid string length` and were SKIPPED every regen:

- `repair-graph-engine-classification.mjs` (engine reclassification)
- `dedup-graph-nodes.mjs` (node dedup)
- `reparent-viz-categories.mjs` (category reparenting)
- `add-parent-contains-edges.mjs` (parent->child contains-edges)

All four READ cap-safe (`readGraphStreaming`, gated `statSync > 256MiB`) but WROTE via `fs.writeFileSync(GRAPH, JSON.stringify(G))` -- `JSON.stringify` of the >512MiB graph produces a single string over `0x1fffffe8` bytes and throws. (This is distinct from `merge-augmentations` itself, which was ALREADY cap-safe via `writeGraphStreamingAtomic` since 153887a519 -- so the merge passes; the failure was the NEXT 4 stages. golf's "merge exit-1 at 630MB" conflated the merge with these post-merge stages + the older truncation cascade.)

**Fix:** migrated all 4 writes to `writeGraphStreamingAtomic(GRAPH, G)` (per-element + atomic, the canonical cap-safe writer in `scripts/lib/graph-io.mjs`, already unit-tested + 3-of-3'd). One-line swap each + import. **LIVE-VALIDATED:** all 4 stages exit 0 on the real 660MB graph (was `repair` RangeError), integrity preserved 335,159 nodes / 685,850 edges, ALL top-level marker keys preserved (`engineReclassifyRepairedAt`, `dedupedAt`, `dedupStats`, `meta.parentContainsEdges`) -- 3-of-3 scrutiny confirmed `writeGraphStreaming` iterates `Object.keys(graph)` (every top-level key, not a hardcoded subset), so no data-loss regression.

**Combined with this session's other fixes, the ENTIRE system-viz regen pipeline is now cap-safe + green end-to-end at >512MiB:**
- augment-molecules (off-heap streamGraphArray, ae55cea3f7) [[reference_augment_molecules_stream_2026_06_09]]
- merge-augmentations loadOptional cap-guard (628aaa51f5)
- merge write atomic (153887a519) -- validated at 660MB (7a1f52061b)
- post-merge x4 (this fix, 80f8059cb1)

**Lesson (fleet pattern):** `fs.writeFileSync(path, JSON.stringify(bigObj))` is the WRITE-side twin of the read-side `JSON.parse(readFileSync(path,"utf8"))` cap bug -- BOTH throw at >512MiB. Any script that read-migrated to `readGraphStreaming` but kept `JSON.stringify` on write is a latent >512MiB failure. The graph crossed 512MiB this session (523 -> 660MB), so these only started failing now. Audit any remaining graph writers for `JSON.stringify(G)` / `JSON.stringify(graph)` -> migrate to `writeGraphStreamingAtomic`. Same V8-cap family as [[reference_viz_graph_truncation_atomic_fix_2026_06_09]], [[reference_regen_orchestrator_default_heap_oom_2026_06_09]], [[reference_tribal_index_v8_string_cap_2026_06_08]].

**5th regen failure (FIXED, commit 3e4df51d04):** FAST[] entry `generate-slot-queue-features.mjs` (regen-viz.mjs line 126) referenced a file that NEVER existed (never git-tracked; `generate-slot-queues.mjs` is a different roadmap-queue tool, NOT a viz generator) -> MODULE_NOT_FOUND exit 1 every regen since golf U-FD06 2026-05-25. Removed the orphan FAST[] entry (the merge `loadOptional("slot-queue-augmentation.json")` stays as a harmless null until a real generator is built). So all 5 regen `failed` are now addressed (4 post-merge cap-unsafe writes + this phantom).

**FLEET AUDIT (2026-06-10) -- WRITE side closed, READ side NOT (correction):** The WRITE side IS fully cap-safe (every `system-graph.json` writer uses `writeGraphStreamingAtomic`; no two-step stringify). BUT my first read-audit regex was too narrow (required `system-graph` literally inside the `readFileSync(...)` args), so I FALSELY claimed "all merged-graph I/O cap-safe fleet-wide." A broader audit (grep for `readFileSync(<any var bound to a graph path>)` without `readGraphStreaming`) found **9 cap-unsafe READERS of the merged 660MB graph**, all doing `JSON.parse(fs.readFileSync(graphPath,"utf8"))` -> they throw/`graph-parse-failed` at >512 MiB RIGHT NOW (live-observed: `generate-milestone-envelope-atomic` wrote a 0.00MB EMPTY augmentation during the integrated regen + logged `error: graph-parse-failed: Cannot create a string longer than 0x1fffffe8`):
1. ~~`scripts/generate-executive-briefing.mjs:150`~~ FIXED d03d8687a7 (-> readGraphStreaming)
2. ~~`scripts/generate-milestone-envelope-atomic.mjs:101`~~ FIXED d03d8687a7 (-> readGraphStreaming; live: 752 envelopes scanned vs prior graph-parse-failed; steady-state emits 0 = milestones already in graph)
3. ~~`scripts/leverage-ranked-wiring-queue.mjs:28`~~ FIXED 4dbd18c2e3 (try/catch->exit1 fail-loud preserved)
4. ~~`scripts/lib/master-index-search-lib.mjs:333`~~ FIXED 4dbd18c2e3 (CORE search lib; 200MB cap+sidecar+architecture-graph fallback UNTOUCHED -- swap is post-fallback defense-in-depth, NOT the hot path; retested live: 30 hits for "kienzle")
5. ~~`scripts/lib/namespace-churn-ranker.mjs:197`~~ FIXED 4dbd18c2e3 (try/catch->return[] preserved; reads g.meta.fsCoverage)
6. ~~`scripts/regen-wiki-from-viz.mjs:49`~~ FIXED 4dbd18c2e3 (head-slice special: `readFileSync(p).toString("utf8",0,4096)` -- Buffer off-heap, only 4KB stringified; hash changes ONCE -> one forced wiki-regen, no truncation corruption)
7. ~~`scripts/seed-ghost-nodes.mjs:473`~~ FIXED 4dbd18c2e3
8. ~~`scripts/system-viz-node-dispatch.mjs:304`~~ FIXED 4dbd18c2e3 (try/catch->typed GRAPH_PARSE preserved)
9. ~~`scripts/system-viz-type-backfill.mjs:110`~~ FIXED 4dbd18c2e3 (LIVE-VALIDATED: --dry-run read full 660MB graph in 4.8s, real coverage eng 5783/test 4472, 0 write)

**STATUS: 9/9 READERS CAP-SAFE (read-side sweep COMPLETE).** Fix applied: each `JSON.parse(fs.readFileSync(graphPath,"utf8"))` -> `readGraphStreaming(graphPath)` (+import: `./graph-io.mjs` from scripts/lib/, `./lib/graph-io.mjs` from scripts/) -- except regen-wiki head-slice. 3-of-3 scrutiny PASS (zero P0/P1) on 4dbd18c2e3: return-shape equivalence verified (readGraphStreaming materializes nodes/edges/meta identically to JSON.parse), 85/85 graph-io+master-index tests green, all error semantics preserved. Live-validated 2 of 7 (type-backfill heavy 660MB read + master-index search); other 5 are identical mechanical swaps, syntax+import-pair+error-flow verified statically. ALSO latent (NOT fixed, low risk): `generate-system-viz.mjs:1141` writes BASE `architecture-graph.json` pretty-printed (safe at ~60K nodes; cap risk only if base grows ~10x). **Lesson: audit BOTH read+write sides with a path-VARIABLE-aware grep, not just literal-filename -- the narrow regex gave a false all-clear.**
