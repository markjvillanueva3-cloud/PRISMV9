---
name: reference_sierra_graph_writers_history
description: The 3-writer race on system-graph.json and how each was resolved (split-out, lock, single-canonical).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.192Z
aliases: reference_sierra_graph_writers_history
---


**system-graph.json writer history (system-viz).** Three scripts historically wrote the same path → silent clobber:
- `generate-system-viz.mjs` — architecture-only graph. **Resolved:** U-VIZ-SPLIT-OUT-FILE (commits dd735c1871 + 4ad4bb334a) renamed its OUT_FILE → `architecture-graph.json`. No longer touches the merged graph.
- `regen-viz.mjs` — the merged graph. **Resolved as:** the ONE canonical writer.
- `system-viz-add-node.mjs` — single-node additive append. **Resolved:** respects `scripts/lib/system-graph-write-lock.mjs` PID lock + atomic rename.

Earlier audits also flagged `roadmap-index.json` having 5 writers (3 non-atomic) — a sibling race class. The general fix pattern: designate ONE canonical writer per path; others become reader-only or lock-respecting atomic appenders.

**Why:** a reader hitting a mid-write or a stale generator overwriting the merged product degrades master-index search fleet-wide.

**How to apply:** before adding any writer to a shared state JSON, grep for existing `writeFileSync.*<filename>` writers; if >1, consolidate to one canonical + atomic. See [[reference_sierra_one_writer_per_path]] · [[reference_sierra_split_out_file]].
