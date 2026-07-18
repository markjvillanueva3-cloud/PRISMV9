---
title: CHEAP-NODE-ACCESS-MS0 — token-cheap node read-by-id
tags: [system-viz, token-economy, node-card, sierra]
slot: sierra
status: in_progress
created: 2026-06-04
---

# CHEAP-NODE-ACCESS-MS0 — `node_card` token-cheap read-by-id

## The problem

Reading one of the ~302K system-viz graph nodes the old way meant `Read`-ing the **644MB `system-graph.json`** to extract a single record ≈ **~186K tokens** per access. There was a cheap *search* (`system-viz-query find` over `find-cache.json`) but **no cheap read-by-id** — the missing half. (Workflow map 2026-06-04, 5 parallel agents + synthesis.)

## The primitive

`readCard(id)` returns a compact **NodeCard** (~200 tokens) for any node WITHOUT loading the 644MB graph — a **~98.7% token cut** (186K → ~2.5K). It sources the freshest compact projection sidecar, never the graph:

- **`system-graph-index.json`** (~193MB, regenerated each `regen-viz`) — preferred: `{id,label,layer,status,info, knowledge:{wikiEntries,memoryEntries}}`. The `knowledge` pointers are the documenting docs an agent reads next.
- **`find-cache.json`** (~55MB) — lighter fallback (the same sidecar `find` reads).

Freshness is checked by **STAT-ing the live graph** (never reading it) vs the sidecar's recorded `sourceMtimeMs`/`sourceSize(Bytes)` head stamps; the reader picks the freshest existing source and returns a `stale` flag rather than silently escalating to the 644MB load (R12). No compact sidecar present → it **throws** (refuses the expensive fallback).

## Surfaces (this milestone)

- `scripts/lib/node-card-schema.mjs` — pure `NodeCard` projection (`makeCard`/`assertCard`/`kindFromId`/`relDocPath`, `DOC_CAP=8`). + `.test.mjs` (6).
- `scripts/lib/node-card-read.mjs` — freshness-preferring multi-source reader (`readCard`/`readCards`/`cardCount`). + `.test.mjs` (8) incl. the **NO-GRAPH-LOAD poison-pill invariant**.
- `scripts/system-viz-query.mjs node-card <id> [<id>…]` — CLI short-circuit BEFORE the eager `loadGraph()` (like `find`/`cache-status`). `--json` + batch + miss/stale rendering.
- `/node-card` skill (`.claude/commands/node-card.md`).

## Usage

```bash
node scripts/system-viz-query.mjs node-card eng.mill          # one
node scripts/system-viz-query.mjs node-card eng.mill disp.calc # batch
node scripts/system-viz-query.mjs node-card eng.mill --json
```

`find <query>` → ids → `node-card <id>` → record + doc pointers, both index-only.

## Decisions / honesty

- **Dropped the `node-capability-index.json` enrichment** — its keys (`engine.*`/`algorithm.*`) don't match graph node ids (`eng.*`/`alg.*`): 0/302,481 matched (scrutiny B). It was dead I/O; doc pointers come from the index's own `knowledge`. Re-add only behind a verified id↔cap-key mapping.
- `opts.paths` is MERGED onto defaults — a partial override leaks real defaults (documented; tests pass complete fixture sets).

## Staged follow-ups

1. ~~**Offset-seek card index** (JSONL + byte-offset table) for sub-10ms per-call latency~~ — **SHIPPED 2026-06-04 (U-NODECARD-OFFSET-INDEX, a6f924a84c + 1cb4b44fb8).** `scripts/lib/node-card-offset-lib.mjs` emits `node-cards.jsonl` (159MB) + `node-card-offsets.json` (24MB, id→[byteOffset,length]); `readCard` SEEKS one record (parse 24MB offsets once → `fs.read` exact bytes) instead of the 193MB sidecar — transparent to all callers. 301,185 cards live, 8/8 all-galaxy seek hits, warm ~0.3ms/card (cold ~619ms = the one-time 24MB offsets parse). Wired into `build-graph-index` regen (fail-soft) + standalone `build-card-offset-index.mjs` backfill. Torn-pair (`jsonlBytes` verify) + integrity (id-match) guards; 24 tests; 2-reviewer PASS. → **enabled the per-prompt prefetch hook, ALSO SHIPPED 2026-06-04 (U-NODECARD-PREFETCH-HOOK, 158d364493):** `node-card-prefetch-inject.mjs` (UserPromptSubmit, after master-index, timeout 3000) detects node ids in a prompt (whitelisted distinctive prefixes; EXCLUDES noisy `fs/test/git/core/script`) and auto-injects each card + doc pointers with **zero tool call** via the hook-safe `seekCard()` (seek-only, never the 193MB parse, never throws). Cheap-when-irrelevant (regex-only ~0ms unless a candidate is present; offset index verifies each so `fs.readFileSync` injects nothing). Live: `eng.mill`+`ghost.galaxy.wedm` inject, `fs.*` silent. 10 hook tests incl budget-invariant + noisy-token-ignore. Knobs `PRISM_NODECARD_PREFETCH_{DISABLE,K}`.
2. **`prism_session:node_card` dispatcher action** (native MCP tool surface) backed by `readCards`.
3. **GPU/semantic `node_card --near "<text>"`** — finish the partial `_node-embeddings.jsonl` → Qdrant `system-viz-nodes` collection (offload nomic-embed to the Blackwell GPU).
4. **P2 hardening**: a stampless sidecar is currently treated as fresh and wins by preference order — distinguish "verified-fresh" from "unverifiable" so a verified-fresh fallback outranks an unverifiable preferred source.

Memory: [[reference_cheap_node_access_ms0_2026_06_04]]. Built on the [[cross-substrate-synergy-ms0]] node substrate.
