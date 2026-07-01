# CONTEXT-RETENTION/U-MEMO-SEMANTIC-RECALL — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CONTEXT-RETENTION]/U-MEMO-SEMANTIC-RECALL (slot:alpha): wire semantic recall into edit-time memory injection — the obsidian-fully-wired keystone

**Commit:** `636d36bf59bf` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T22:32:43-05:00
**Tags:** context-retention, u-memo-semantic-recall, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CONTEXT-RETENTION]/U-MEMO-SEMANTIC-RECALL (slot:alpha): wire semantic recall into edit-time memory injection — the obsidian-fully-wired keystone

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CONTEXT-RETENTION]/U-MEMO-SEMANTIC-RECALL (slot:alpha): wire semantic recall into edit-time memory injection — the obsidian-fully-wired keystone

memory-relevance-inject.mjs recall was LEXICAL-ONLY (term-freq indexOf over
~1490 memos) — a file whose DOMAIN has tribal knowledge but whose NAME matches
no memo got ZERO recall. Now an additive semantic stage surfaces meaning-similar
memos via nomic-embed-text (768-d) cosine over a standalone JSONL embedding cache.

R13 logical order: F3a (offline cache builder, zero hot-path risk) -> F3b (hook).
- scripts/lib/memo-embed-lib.mjs — shared lib (salientSlice/embedText/loadEmbedCache/
  cosine/semanticTopK), single-sourced so builder + hook can't drift. 12/12 tests.
- scripts/build-memo-embedding-cache.mjs — incremental (hash-reuse) atomic-write
  builder. Live: 1490 vectors/768-d in 36s.
- memory-relevance-inject.mjs — additive 'Semantically related' subsection,
  fail-OPEN (cache absent / Ollama down / timeout -> exact prior lexical behavior),
  runs even when lexical=0. Standalone cache = NO MCP dependency (daemon often down
  when this hot-path fires). Floor cosine 0.60 (PRISM_MEMORY_SEMANTIC_MIN), k=2.

LIVE-PROVEN this session: editing memo-embed-lib.test.mjs -> 0 lexical + 2 semantic
([[reference_embedding_ssot_ms0_2026_05_30]] cos 0.62, ollama-expand cos 0.60) —
recall that before F3 would have injected NOTHING. Fail-open verified: dead Ollama
-> lexical-only in 0.28s; absent cache -> lexical-only; PRISM_MEMORY_SEMANTIC=0 ->
byte-identical prior behavior.

Cache (22MB) gitignored — rebuild per-machine via the builder (incremental/cheap).
Tests: 12/12 lib + existing hook behavior preserved.
```

## Files touched (5)
- .claude/hooks/memory-relevance-inject.mjs |  83 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++------------
- scripts/build-memo-embedding-cache.mjs    | 108 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/memo-embed-lib.mjs            | 146 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/memo-embed-lib.test.mjs       | 143 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 468 insertions(+), 12 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 636d36bf59bf`
- Milestone envelope: `mcp-server/data/milestones/CONTEXT-RETENTION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._