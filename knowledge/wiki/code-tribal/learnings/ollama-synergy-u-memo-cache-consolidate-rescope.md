# OLLAMA-SYNERGY/U-MEMO-CACHE-CONSOLIDATE-RESCOPE — [MAIN] [OLLAMA-SYNERGY]/U-MEMO-CACHE-CONSOLIDATE-RESCOPE (slot:sierra): #6 premise refined -- the two memo embedding caches are DISTINCT purpose-built caches (MCP-independent hot-path JSONL recall vs search-lib int8 hybrid), NOT a safe dedup; 'retire the JSONL builder' would break MCP-independent recall. Re-scope to accept-both or share-embed-compute-only. See reference_memo_cache_consolidate_premise_verified_2026_06_09.

**Commit:** `0f14952601a6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T23:24:02-05:00
**Tags:** ollama-synergy, u-memo-cache-consolidate-rescope, auto-distilled

## Subject
[MAIN] [OLLAMA-SYNERGY]/U-MEMO-CACHE-CONSOLIDATE-RESCOPE (slot:sierra): #6 premise refined -- the two memo embedding caches are DISTINCT purpose-built caches (MCP-independent hot-path JSONL recall vs search-lib int8 hybrid), NOT a safe dedup; 'retire the JSONL builder' would break MCP-independent recall. Re-scope to accept-both or share-embed-compute-only. See reference_memo_cache_consolidate_premise_verified_2026_06_09.

## Body
```
[MAIN] [OLLAMA-SYNERGY]/U-MEMO-CACHE-CONSOLIDATE-RESCOPE (slot:sierra): #6 premise refined -- the two memo embedding caches are DISTINCT purpose-built caches (MCP-independent hot-path JSONL recall vs search-lib int8 hybrid), NOT a safe dedup; 'retire the JSONL builder' would break MCP-independent recall. Re-scope to accept-both or share-embed-compute-only. See reference_memo_cache_consolidate_premise_verified_2026_06_09.
```

## Files touched (2)
- state/shared/specs/OLLAMA-SYNERGY-AUDIT-2026-06-09.md | 2 +-
- 1 file changed, 1 insertion(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0f14952601a6`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._