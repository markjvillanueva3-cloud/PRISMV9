---
name: reference_juliett_store_paths_2026_05_29
description: On-disk store paths + sizes for PRISM persistence (read-cost facts; what NOT to full-read)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.631Z
aliases: reference_juliett_store_paths_2026_05_29
---


**PRISM store paths + sizes (verified-on-disk 2026-05-29, slot:juliett).** Read-cost facts — the big ones must NOT be full-read; query/probe instead.

| Path | Size | Access rule |
|------|------|-------------|
| `state/shared/system-viz/system-graph.json` | 548.9 MB | NEVER full-read → `scripts/system-viz-query.mjs` |
| `knowledge/wiki/architecture/_embeddings.jsonl` | 103.5 MB | int8 nomic vectors; stream, don't read |
| `state/shared/tribal-embed-index.json` | ~382 MB | L1 vector index; query via tribal-rerank |
| `knowledge/wiki/architecture/_leaf-index.jsonl` | 17.3 MB | BM25+cosine recall index |
| `state/shared/MILESTONE_PROGRESS.json` | 2.1 MB | `node -e` field-probe, not Read |
| `mcp-server/data/state/cross-session-asset-registry.json` | 1.6 MB | tango-consumed dedup registry |
| `mcp-server/data/roadmap-index.json` | 378 KB | task queue; window-read or jq |
| `state/shared/BUILD_STATE.json` | 221 KB | regen via build-state-snapshot.mjs |
| `mcp-server/data/state/extraction-log.json` | 54 KB | mustNotReExtract source |

**NOT on disk yet:** `coordination.sqlite` (LedgerStoreEngine creates it on first write). **Leak alert:** 46× `tribal-embed-index.json.<pid>.tmp` (~16 GB) — see [[reference_juliett_tmp_orphan_leak_2026_05_29]]. Full atlas: `engines/database-expansion/PATHS.md`.
