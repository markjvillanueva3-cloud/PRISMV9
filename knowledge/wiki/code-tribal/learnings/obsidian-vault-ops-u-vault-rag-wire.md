# OBSIDIAN-VAULT-OPS/U-VAULT-RAG-WIRE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-RAG-WIRE (slot:sierra): restore fleet-wide keyword memory-recall

**Commit:** `9e4376b3b21f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T10:39:12-05:00
**Tags:** obsidian-vault-ops, u-vault-rag-wire, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-RAG-WIRE (slot:sierra): restore fleet-wide keyword memory-recall

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-RAG-WIRE (slot:sierra): restore fleet-wide keyword memory-recall

Gap-A/P0 from the 2026-06-08 vault audit. Keyword recall (remember/recall/last time/
context from) fired NOTHING fleet-wide: memory-index-precheck-inject disabled by
PRISM_MEMORY_INDEX_INJECT=0, AND its keyword-fallback memory-rag-inject was wired in
ZERO settings (0/0/0) despite a false 'I am wired' header (R12 stale-claim).

Fix: wired memory-rag-inject.mjs into global settings (C: + H: mirror) UserPromptSubmit
after node-card-prefetch-inject. With precheck OFF, precheckCoversPrompt()=false so the
rag hook FIRES (no duplicate block). Verified live: recall-keyword prompt now returns a
'Memory recall (top 3 vault hits)' injection. NOT added to repo .claude/settings.json
(global layer is the active runtime; repo file had an unrelated peer modification).

This memory documents the fix; the wiring itself lives in global settings (not repo-tracked).
Follow-on (separate): embeddings/BM25 sidecars stale -> dense recall misses new memories
until re-embed (U-VAULT-MAINT-CRON / index-freshness).
```

## Files touched (2)
- knowledge/memories/reference/reference_vault_rag_wire_fix_2026_06_08.md | 35 +++++++++++++++++++++++++++++++++++
- 1 file changed, 35 insertions(+)

## Lessons surfaced in commit body
- til re-embed (U-VAULT-MAINT-CRON / index-freshness).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9e4376b3b21f`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._