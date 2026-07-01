---
name: reference-psn-hybrid-viz-roost-2026-05-25
description: 2026-05-25 sierra iter 21 — closes iter-18 follow-up U-PSN-HYBRID-VIZ-ROOST partially. Generator scripts/generate-hybrid-retrieval-features.mjs emits ghost.hybrid_retrieval L8 roost + 4 substrate child nodes (memory+master+episode+vector) + 4 fan-out edges with LIVE substrate counts (9328/547MB/7/3866). 4/4 substrates GREEN. R12: regen-viz + merge-augmentations splices blocked by peer chat-bus file-claim — wiring deferred to U-PSN-HYBRID-VIZ-ROOST-WIRE.
type: reference
slot: sierra
source: prism-memory
synced: 2026-06-27T20:30:47.127Z
aliases: reference_psn_hybrid_viz_roost_2026_05_25
---


## What shipped

| artifact | purpose |
|---|---|
| `scripts/generate-hybrid-retrieval-features.mjs` (~200 LOC) | Emits ghost.hybrid_retrieval L8 roost + 4 substrate L9 children with live probes. Pattern modeled on iter-12 `generate-episode-store-features.mjs`. 15 exports: 4 probes (`probeMemorySubstrate`, `probeMasterSubstrate`, `probeEpisodeSubstrate`, `probeQdrantSubstrate`), `generate()`, plus tunables (SCHEMA_VERSION, ROOST_ID, COLOR_*, layer constants). |
| `state/shared/system-viz/hybrid-retrieval-augmentation.json` | Live output. 5 nodes + 4 edges. Schema 1.0.0. |

## Live verification

```
$ node scripts/generate-hybrid-retrieval-features.mjs
wrote H:\PRISM\state\shared\system-viz\hybrid-retrieval-augmentation.json
  substrates-live:  4/4
  memory files:     9328
  master graph MB:  546.9
  episodes total:   7
  qdrant points:    3866
  nodes:            5
  edges:            4
```

All 4 PSN retrieval substrates probed live (GREEN). The roost's color reflects substrate health: 4 live → green, 2-3 → amber, ≤1 → red.

## Per-substrate node info

- **memory-index BM25** — "Obsidian vault BM25 over 9328 memory .md files (free-floating + pre-joined). Lib: memory-index-search-lib.mjs."
- **master-index graph BM25** — "system-graph.json BM25 (546.9MB graph · mtime …). Lib: master-index-search-lib.mjs."
- **graphiti-lite episode store** — "7 episodes (4 valid · 3 superseded · N tombstones). Lib: episode-store.mjs."
- **Qdrant dense cosine (nomic-embed-text 768d)** — "prism_engines collection: 3866 points · status green · vectors_count …. Populate: scripts/populate-qdrant.mjs."

## R12 disclosures

1. **Splices into regen-viz.mjs FAST[] + merge-augmentations.mjs blocked by peer file-claim.** Peer `claude-9f3a8e4f` held both files for ~10min with 7min remaining when sierra attempted the splice. Per `feedback_conflict_fork_rule`: don't fight, defer. Generator ships standalone + augmentation file is structurally valid; splices are 2 mechanical edits totaling ~4 lines that any subsequent chat (or sierra in a later iter) can apply once peer releases. Tracked as `U-PSN-HYBRID-VIZ-ROOST-WIRE`.

2. **Commit lock-contended.** Index.lock held by peer through 2 commit attempts. Files H:-durable; commit will land on next free window via my next iter or golf hygiene cycle.

3. **No test file.** Pattern precedent (iter-12 `generate-episode-store-features.mjs`) has no test file either — viz augmentation generators are live-verified rather than unit-tested. The pure libs they depend on (`episode-store.mjs`, etc.) carry the test coverage.

4. **Visual render gated by pre-existing regen-viz V8 max-string-length OOM** (`reference_regen_viz_string_length_2026_05_23`). The augmentation file lands either way; on the next successful regen-viz pass it materializes as 5 visible nodes in /system-viz.

## Compounding chain — sierra iters 17 → 21

| iter | unit | layer |
|---|---|---|
| 17 | `U-PSN-QDRANT-POPULATE` | data — 1,669 vectors in `prism_engines` (3,866 total, GREEN) |
| 18 | `U-PSN-HYBRID-RETRIEVAL-WIRE` | runtime — 4-substrate fan-out + RRF k=60 fusion via `hybridSearch()` |
| 19 | `U-PSN-QDRANT-PAYLOAD-DEBUG` | quality — vector hits surface canonical `engine:Foo` ids not FNV-1a hashes |
| 21 | `U-PSN-HYBRID-VIZ-ROOST` | observability — `/system-viz` ghost roost shows the 4-substrate architecture with live counts |

(iter 20 was the loop-target tick from iter 19; this is iter 21 of the same continuous batch.)

## Follow-ups flagged

- `U-PSN-HYBRID-VIZ-ROOST-WIRE` — splice into `regen-viz.mjs` FAST[] + `merge-augmentations.mjs` loader + merger (4 mechanical lines, blocked today by peer file-claim)
- `U-PSN-GRAPHITI-SEED-EXPANDED` — broader git ingest (`--all` cross-branch) — episode count would grow from 7 to hundreds
- `U-PSN-HYBRID-MCP-WIRE` — `prism_psn:hybrid_search` MCP action (needs mcp-server build cycle)
- `U-PSN-QDRANT-INGEST-OTHER-COLLECTIONS` — prism_formulas + prism_skills still empty

## Closes

`PSN-ENHANCE-MS0::U-PSN-HYBRID-VIZ-ROOST-2026-05-25` — closes iter-18 follow-up partially (generator + augmentation file shipped + structurally valid; render-side wiring waits for peer release).

## Cross-refs

- [[reference_psn_hybrid_retrieval_wire_2026_05_25]] — iter 18 (the runtime this augmentation observes)
- [[reference_psn_qdrant_payload_debug_2026_05_25]] — iter 19 (the canonical-id fix this roost benefits from)
- [[reference_psn_graphiti_wire_2026_05_24]] — iter 12 (the generator pattern this iter copies)
