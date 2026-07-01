---
name: reference_regen_orchestrator_default_heap_oom_2026_06_09
description: regen-viz orchestrator runs DEFAULT heap; any full-graph materialization in it OOMs -> use off-heap count
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.145Z
aliases: reference_regen_orchestrator_default_heap_oom_2026_06_09
---


# regen-viz orchestrator default-heap OOM (2026-06-09, slot:sierra, U-VIZ-MERGE-GUARD-OOM)

**Finding:** `regen-viz.mjs` spawns its STAGES with `--max-old-space-size=24576` (24GB) but the ORCHESTRATOR process itself runs with the **DEFAULT V8 heap**. So any code the orchestrator runs INLINE that materializes the full graph OOMs. `regen-viz-merge-guard.readGraphNodeCount` did `JSON.parse(fs.readFileSync(graph,"utf8"))` at the pre-merge (line 239) and post-merge (line 275) node-count checks -> on the ~236MB+ merged graph it OOM'd the orchestrator at ~546MB (GC: "Mark-Compact 546.0 -> 471.1 MB, allocation failure" -> FATAL heap limit). The `catch{return 0}` can NOT swallow a FATAL OOM (it's a process abort, not a JS throw) -> the regen DIED at the count, before the post-merge stages (engine-classification, dedup, build-graph-index/sidecar) ran. Net: even after the merge wrote a valid graph, the regen "failed" + the master-index sidecar went stale.

**Fix (commit 6884155fb6 + 757456eaae):** `countGraphArrayStreaming(filePath, key)` in `graph-io.mjs` — reads the file as a Node **Buffer (off the V8 heap)** and byte-walks ONLY the target array, counting top-level elements (string-escape + nesting aware). V8-heap use is O(1) regardless of graph size. `readGraphNodeCount` delegates to it. LIVE: counts the 237MB / 333,333-node graph in ~385ms under default heap (reviewer C confirmed it works even under `--max-old-space-size=256`, heapUsed delta -0.5MB). The `--full` regen now completes END-TO-END exit 0, no OOM; graph rebuilt to 333,333 nodes / 521MB.

**Lessons (generalize -- audit the fleet):**
- An orchestrator that spawns big-heap children but reads big files INLINE is a latent OOM. Either (a) give the orchestrator the heap too, or (b) make the inline read off-heap/streaming. Prefer (b) for a count/probe.
- `fs.readFileSync(path)` (Buffer, no encoding) is OFF the V8 heap; `fs.readFileSync(path,"utf8")` (string) is ON-heap AND hits the >512MB V8 string cap. For large canonical files, Buffer + byte-walk beats string + JSON.parse on BOTH axes.
- A `try/catch` does NOT protect against a heap-OOM FATAL -- only against JS throws. "returns 0 on error" is a lie if the error is OOM.
- Pairs with [[reference_viz_graph_truncation_atomic_fix_2026_06_09]] (atomic write stopped truncation; this stopped the post-merge orchestrator OOM -- together the full regen is crash-safe end-to-end). Same V8-cap/heap family as [[reference_v8_graph_read_mass_migration_2026_05_25]] + the lint-orphans U-LINT-ORPHAN-OOM regression.
- FOLLOW-UP (minor): `generate-slot-queue-features.mjs` errors (exit 1) as a FAST[] generator -- non-fatal (regen continues), one stale augmentation source; separate fix.
