---
name: reference_sierra_graph_oom_classes
description: The 548MB system-graph OOM family (exit 134) — JSON.parse and JSON.stringify(null,2) both blow V8 limits.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.938Z
aliases: reference_sierra_graph_oom_classes
---


**system-graph.json OOM failure family (exit 134).** The merged graph is 370-575MB. Two distinct OOM classes:
1. **Read-side:** `JSON.parse(readFileSync(...))` of the 548MB graph exceeds V8 heap → crash. Use `scripts/lib/system-viz-graph.mjs` (mtime-cached, `MAX_GRAPH_BYTES`-capped reader) or a streaming line-reader instead.
2. **Write-side:** `JSON.stringify(g, null, 2)` (pretty-print) blows the V8 ~512MB max-string-length cap → `RangeError: Invalid string length` / `ReportExternalAllocationLimitReached` → exit 134. Compact `JSON.stringify(g)` only. This is the documented `merge-augmentations.mjs` / `seed-ghost-from-unwired.mjs` regression class.

Observed live 2026-05-29T01:47 (`.last-regen-failure.json` stage="merge augmentations" exitCode=134) — though the 13:00 regen then succeeded. Orphaned scratch after a crash: `.tmp.system-graph.json.<pid>` + `_node-embeddings.jsonl.partial` (golf reaps).

**Why:** V8 has hard heap + max-string-length ceilings the 548MB graph routinely hits.

**How to apply:** `regen-viz` runs with `--max-old-space-size=16384`; never pretty-print or naive-parse the merged graph; honor `regen-viz-merge-guard` fail-loud. See [[reference_u_regen_viz_merge_faillod_2026_05_17]] · [[reference_sierra_one_writer_per_path]].
