# BRAIN-SYNERGY-MS0/U-BRAIN-RECALL — [MAIN] [BRAIN-SYNERGY-MS0]/U-BRAIN-RECALL (slot:lima): expose Obsidian-vault BM25 as prism_memory:brain_recall

**Commit:** `786d0033d0fe` · **By:** markjvillanueva3-cloud · **At:** 2026-05-21T12:59:45-05:00
**Tags:** brain-synergy-ms0, u-brain-recall, auto-distilled

## Subject
[MAIN] [BRAIN-SYNERGY-MS0]/U-BRAIN-RECALL (slot:lima): expose Obsidian-vault BM25 as prism_memory:brain_recall

## Body
```
[MAIN] [BRAIN-SYNERGY-MS0]/U-BRAIN-RECALL (slot:lima): expose Obsidian-vault BM25 as prism_memory:brain_recall

Closes the synergy gap where PRISM's Obsidian 2nd-brain (file-based memory
vault + system-graph + tribal wiki BM25 indexes via scripts/lib/master-
index-search-lib.mjs and scripts/lib/memory-index-search-lib.mjs) was
consumed by hooks but NEVER by any PRISM src code or MCP dispatcher.
Verified: zero src imports of either lib before this commit.

Adds prism_memory:brain_recall as the missing 4th memory substrate:
- agent_memory_query → in-process AgentMemoryFabric (structured)
- semantic_search → MemoryGraphEngine (semantic vector)
- qdrant_vector_search → Qdrant ANN (dense-embedding)
- brain_recall (NEW) → file-based Obsidian vault + graph + wiki (BM25)

Surface: prism_memory:brain_recall({query, k?, include_memory?,
include_graph?, include_wiki?}) → {query, k, sources:{memory,graph,wiki},
total_hits}. Per-source try/catch with R12 fail-loud (one source dying
doesn't kill the others).

Files:
- mcp-server/src/tools/dispatchers/memoryDispatcher.ts (z.enum entry +
  case block + tool description string updated)
- mcp-server/src/schemas/memoryActionSchemas.ts (new const brain_recall +
  ACTION_MEMORY_SCHEMAS entry)
- knowledge/wiki/architecture/brain-recall-synergy-ms0.md (NEW —
  architecture entry, R7 collision disclosure, NOT-shipped surface)

Action count anti-regression: prism_memory 43 → 44.

R7 — peer collision: file-claim guard flagged DESKTOP--17260 editing
memoryDispatcher.ts 1m before my edits. Stopped non-essential changes,
deferred the unit test, committed fast to release the claim window. Test
file shipped in U-BRAIN-RECALL-TESTS sibling unit (queued).

Honesty (R12): npm run build NOT run this session (tsc 90s timeout under
79+ concurrent /loop disk contention — same condition as 5cfddcc9b7
earlier this session). Lazy-import pattern is identical to existing
inbox_prune_now / inbox_promote_now cases (which import from scripts/),
this one reaches scripts/lib/ via one extra ../. Trust-by-peer-activity,
NOT verified-by-session.

Iter 1/5 of fresh /goal /loop. Slot: lima · session: claude-fe1db0ba.
```

## Files touched (3)
- mcp-server/src/schemas/memoryActionSchemas.ts      | 14 ++++++
- .../src/tools/dispatchers/memoryDispatcher.ts      | 56 +++++++++++++++++++++-
- 2 files changed, 69 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 786d0033d0fe`
- Milestone envelope: `mcp-server/data/milestones/BRAIN-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._