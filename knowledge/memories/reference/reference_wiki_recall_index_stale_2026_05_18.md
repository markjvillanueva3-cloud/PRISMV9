---
name: wiki-recall-index-stale-2026-05-18
description: Wiki recall leaf-index runs hours stale under fleet load; build-wiki-leaf-index.mjs is correct but a direct full-tree run no-ops on the memory-pressured host.
aliases: reference_wiki_recall_index_stale_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.056Z
---


On 2026-05-18 (slot lima, `/loop` high-value-wiki), three new `software-engineering/` wikis were committed — `schema-read-discipline` (f5403a8274), `git-shared-index-hazards` (359245c7a0), `hook-authoring-discipline` (096afbc457) — but did NOT appear in the wiki recall index. `knowledge/wiki/architecture/_leaf-index.jsonl` (the BM25 source for `wiki-precheck-inject.mjs`) was ~1.5h stale and `_embeddings.jsonl` ~3.5h stale: the regen pipeline (`regen-wiki-from-viz.mjs`, post-commit + hourly cron) is running behind under fleet load.

`build-wiki-leaf-index.mjs` itself is CORRECT — verified: run against a 1-file tmp arch dir (`PRISM_WIKI_ARCH_DIR` override) it writes `_leaf-index.jsonl` + prints its summary in 2ms, exit 0. But TWO direct full-tree runs (`node scripts/build-wiki-leaf-index.mjs`, default ~28K-file `knowledge/wiki/architecture/`) each ran ~13 min, exited 0, printed NOTHING, and did NOT write `_leaf-index.jsonl` (mtime byte-frozen). Root cause not confirmed — suspected host memory pressure (the box runs near the Windows commit ceiling; [[reference_fleet_memory_monitor_2026_05_16|fleet-memory-monitor]] flagged ~96% commit) OOM- or reaper-killing the long walk in a way that still surfaces exit 0.

**Why:** a committed wiki `.md` only becomes recall-searchable once a regen actually rebuilds the leaf-index; the generator walks the filesystem, so any successful run picks up everything.

**How to apply:** don't hand-run `build-wiki-leaf-index.mjs` against the full tree on a loaded host expecting it to land — it silently no-ops. Let the orchestrator's scheduled regen catch up, or run the generator when host memory is free. If recall staleness recurs, treat the regen cadence as a dedicated unit, not a `/loop` tick. Related: [[git-shared-index-hazards]].
