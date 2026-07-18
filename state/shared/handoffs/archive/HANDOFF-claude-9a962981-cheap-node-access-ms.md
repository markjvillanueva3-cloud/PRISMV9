---
session: claude-9a962981
topic: cheap-node-access-ms0
slot: sierra
written_at: 2026-06-04T13:57:17.399Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-9a962981
status: active
---

# HANDOFF: claude-9a962981
Updated: 2026-06-04T13:57:17.399Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-9a962981

## STATE
CHEAP-NODE-ACCESS-MS0 — slot:sierra 2026-06-04

SHIPPED: U-NODECARD-CORE (commit ce8d69bb3f). Token-cheap node read-by-id: Read 644MB graph (~186K tok) -> node_card (~200 tok, 98.7% cut), all 302K nodes / every galaxy.
- scripts/lib/node-card-schema.mjs (+test) — pure NodeCard projection, both sidecar shapes, DOC_CAP=8.
- scripts/lib/node-card-read.mjs (+test) — freshness-preferring: fresh system-graph-index.json (193MB, knowledge:{wikiEntries,memoryEntries}) -> find-cache (55MB). STAT-only graph freshness + 2KB head-stamp. NEVER loads the 644MB graph (poison-pill test). THROWS if no sidecar (R12).
- scripts/system-viz-query.mjs node-card <id> [<id>..] CLI (short-circuit before loadGraph). /node-card skill (gitignored, mirror-managed). Importable readCard/readCards.
- 14/14 tests. 2-reviewer per-file scrutiny PASS 0 P0/P1. Fixed P1: dropped dead node-capability-index enrichment (0/302481 match). Doc-reflect x4 (CLAUDE.md + wiki cheap-node-access-ms0 + memory + skill).

WORKFLOW: 5-agent map + synthesis (cheap-node-access-map) found the gap: find existed, read-by-id did not. system-graph-index.json was FRESH but ORPHANED (built today, wired to nothing) -> now the node_card source.

NEXT (priority): 1) U-NODECARD-OFFSET-INDEX (build-graph-index.mjs emit JSONL+offsets, sub-10ms seek). 2) U-NODECARD-PREFETCH-HOOK (auto-inject card on named node id, zero tool call = biggest win; needs #1). 3) prism_session:node_card action. 4) GPU --near (Qdrant + nomic on Blackwell; partial _node-embeddings.jsonl 223K/302K). 5) P2 verified-fresh vs unverifiable sidecar.

ZULU F0 BRIEF (separate, not done): fix merge-augmentations exit-134 OOM. Graph currently GREEN (regen 0.4h, pending=0) so not blocking; revisit if it recurs.

## RESUME
Next CHEAP-NODE-ACCESS unit: U-NODECARD-OFFSET-INDEX — extend scripts/build-graph-index.mjs to ALSO emit a JSONL card index + node-card-offsets.json (id->{byteOffset,length}) so a reader seeks ONE record (sub-10ms, no 55/193MB load). THEN U-NODECARD-PREFETCH-HOOK (UserPromptSubmit: prompt names eng.*/ghost.*/disp.* -> auto-inject its card, zero tool call). Then prism_session:node_card dispatcher action + GPU semantic --near (partial _node-embeddings.jsonl -> Qdrant system-viz-nodes, nomic on Blackwell). P2: distinguish verified-fresh vs unverifiable sidecar so a stampless preferred source cannot outrank a verified-fresh fallback (node-card-read.mjs buildIndex).

## CONTEXT

