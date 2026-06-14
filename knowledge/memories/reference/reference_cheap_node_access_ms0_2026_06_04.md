---
name: reference_cheap_node_access_ms0_2026_06_04
description: "CHEAP-NODE-ACCESS-MS0 (sierra) — token-cheap node_card read-by-id over the system-viz compact index, ~186K->2.5K tokens (98.7% cut), no 644MB graph load"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.058Z
aliases: reference_cheap_node_access_ms0_2026_06_04
---


CHEAP-NODE-ACCESS-MS0 (slot:sierra, 2026-06-04) — the token-cheap **read-by-id** primitive the fleet was missing. Reading a system-viz node the old way = `Read` the 644MB `system-graph.json` ≈ **186K tokens**; `node_card` returns a compact NodeCard ≈ **~2.5K tokens (98.7% cut)** with NO graph load. Scoped via a 5-agent + synthesis workflow (the `find` search existed; the read-by-id half did not).

**Shipped (verifiable core):**
- `scripts/lib/node-card-schema.mjs` (+`.test.mjs` 6) — pure NodeCard projection: `makeCard`/`assertCard`/`kindFromId`/`relDocPath`, `DOC_CAP=8`. Handles BOTH sidecar record shapes.
- `scripts/lib/node-card-read.mjs` (+`.test.mjs` 8) — freshness-preferring multi-source reader: prefers fresh `system-graph-index.json` (193MB, has `knowledge:{wikiEntries,memoryEntries}`) → `find-cache.json` (55MB) fallback. Freshness via STAT-of-graph + 2KB sidecar-head regex for `sourceMtimeMs`/`sourceSize(Bytes)`; returns `stale` flag, THROWS if no sidecar (never loads the 644MB graph — R12, proven by a poison-pill NO-GRAPH-LOAD test).
- `scripts/system-viz-query.mjs node-card <id> [<id>…]` — CLI short-circuit BEFORE the eager `loadGraph()` (mirrors `find`/`cache-status`). `--json` + batch + miss/stale.
- `/node-card` skill. Wiki [[cheap-node-access-ms0]].

**Key calls / honesty:** dropped `node-capability-index.json` enrichment — 0/302,481 nodes matched (cap keys `engine.*`/`algorithm.*` vs graph `eng.*`/`alg.*`) → dead I/O; doc pointers come from the index's own `knowledge`. Found via scrutiny B (P1, fixed in-session). 2-reviewer per-file scrutiny PASS, 0 P0/P1 after fixes. `opts.paths` merges onto defaults (partial override leaks defaults — documented; tests use complete fixture sets).

**Why:** the system-viz graph IS the fleet's search substrate, but reading any node cost ~186K tokens — the single biggest avoidable token sink. **How to apply:** any agent inspecting a node uses `node scripts/system-viz-query.mjs node-card <id>` (or imports `readCard`/`readCards`) instead of `Read`-ing the graph. Pair: `find <query>` → ids → `node-card <id>`.

**Staged follow-ups:** (1) ~~offset-seek JSONL index~~ **SHIPPED 2026-06-04 (U-NODECARD-OFFSET-INDEX, a6f924a84c + 1cb4b44fb8)** — `scripts/lib/node-card-offset-lib.mjs` emits `node-cards.jsonl` (159MB) + `node-card-offsets.json` (24MB, id→[off,len]); `readCard` seeks ONE record (24MB offsets parse once → `fs.read` exact bytes) not the 193MB sidecar; transparent to all callers; 301,185 cards live, 8/8 all-galaxy seek hits, warm ~0.3ms/card; wired into build-graph-index regen (fail-soft) + standalone `build-card-offset-index.mjs` backfill; torn-pair + integrity guards; 24 tests; 2-reviewer PASS. → enabled (2) the per-prompt **prefetch hook** — **ALSO SHIPPED 2026-06-04 (U-NODECARD-PREFETCH-HOOK, 158d364493)**: `node-card-prefetch-inject.mjs` UserPromptSubmit hook detects node ids (whitelisted distinctive prefixes, excludes noisy fs/test/git/core/script) → auto-injects card+doc-pointers with ZERO tool call via hook-safe `seekCard()` (seek-only, never the 193MB parse); cheap-when-irrelevant (regex-only unless candidate present; offset index verifies each); live eng.mill+ghost.galaxy.wedm inject, fs.* silent; 10 hook tests; knobs PRISM_NODECARD_PREFETCH_{DISABLE,K}. Remaining staged: (3) `prism_session:node_card` dispatcher action; (4) GPU semantic `--near` (partial `_node-embeddings.jsonl` → Qdrant, offload nomic-embed to Blackwell); (5) P2: distinguish "verified-fresh" vs "unverifiable" sidecar so a stampless preferred source can't outrank a verified-fresh fallback. Related: [[reference_cross_substrate_synergy_ms0_2026_06_03]].
