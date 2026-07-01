# HERMES-VAULT-MS0/U-VAULT-RECALL-REVIVE — [MAIN] [HERMES-VAULT-MS0]/U-VAULT-RECALL-REVIVE (slot:sierra): revive dead MCP Obsidian-vault recall + 17 tsc dispatcher fixes

**Commit:** `9c0ab7885f9c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-13T09:25:57-05:00
**Tags:** hermes-vault-ms0, u-vault-recall-revive, auto-distilled

## Subject
[MAIN] [HERMES-VAULT-MS0]/U-VAULT-RECALL-REVIVE (slot:sierra): revive dead MCP Obsidian-vault recall + 17 tsc dispatcher fixes

## Body
```
[MAIN] [HERMES-VAULT-MS0]/U-VAULT-RECALL-REVIVE (slot:sierra): revive dead MCP Obsidian-vault recall + 17 tsc dispatcher fixes

Root cause: QdrantMemoryEngineSingleton never called store.connect(), so the
entire MCP memory surface (prism_memory:semantic_search / remember / bridge)
returned 'qdrant not connected' (the bug behind 'Hermes couldn't set up the
nodes with Qdrant'). Collections were populated out-of-band (curl +
SemanticAssetIndex) but the canonical MCP recall path could neither read nor
write them.

Fix:
- QdrantMemoryEngine: lazy auto-connect the default store (gated so injected-
  store tests are untouched) + readCollectionFor() maps canonical kinds to the
  populated prism_engines/skills/formulas/wiki/memories collections + payload-
  tolerant hitToItem renders all 3 schemas (node_id, name+description, text).
- QdrantMemoryEngineSingleton: embed timeout 15s to 30s + keep_alive 30m. A
  cold nomic-embed-text load exceeded 15s on first call => recall-wide 'embed failed'.
- qdrant-health.mjs: report points_count (authoritative) instead of
  indexed_vectors_count (0 below the HNSW indexing_threshold even though the
  points exist + are searchable); the false-empty that made the vault look un-setup.
- 17 pre-existing tsc errors fixed in memory/multi/session/safety/shop dispatchers.

Validated live vs Qdrant+Ollama: all 5 collections return real semantic hits.
36 tests green (21 engine + 15 health). NOTE: 634 OTHER pre-existing tsc errors
remain branch-wide; a separate GOAL-TSC-FIX campaign, NOT introduced here.
```

## Files touched (10)
- mcp-server/src/__tests__/QdrantMemoryEngine.test.ts   | 108 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/QdrantMemoryEngine.ts          |  96 ++++++++++++++++++++++++++++++++++++++++++++++----
- mcp-server/src/engines/QdrantMemoryEngineSingleton.ts |  12 +++++--
- mcp-server/src/tools/dispatchers/memoryDispatcher.ts  |  28 +++++++++++++--
- mcp-server/src/tools/dispatchers/multiDispatcher.ts   |  18 +++++-----
- mcp-server/src/tools/dispatchers/sessionDispatcher.ts |  10 ++++--
- mcp-server/src/tools/dispatchers/shopDispatcher.ts    |  30 +++++++++-------
- scripts/qdrant-health.mjs                             | 201 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/qdrant-health.test.mjs                        | 240 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 9 files changed, 709 insertions(+), 34 deletions(-)

## Lessons surfaced in commit body
- NOTE: 634 OTHER pre-existing tsc errors

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9c0ab7885f9c`
- Milestone envelope: `mcp-server/data/milestones/HERMES-VAULT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._