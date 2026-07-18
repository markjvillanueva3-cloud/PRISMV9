---
name: reference_post_ship_ollama-synergy-u-memo-cache-consolidate-rescope
description: Auto-distilled learnings from shipping OLLAMA-SYNERGY/U-MEMO-CACHE-CONSOLIDATE-RESCOPE (commit 0f1495260). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.961Z
aliases: reference_post_ship_ollama-synergy-u-memo-cache-consolidate-rescope
---


# OLLAMA-SYNERGY/U-MEMO-CACHE-CONSOLIDATE-RESCOPE

[MAIN] [OLLAMA-SYNERGY]/U-MEMO-CACHE-CONSOLIDATE-RESCOPE (slot:sierra): #6 premise refined -- the two memo embedding caches are DISTINCT purpose-built caches (MCP-independent hot-path JSONL recall vs search-lib int8 hybrid), NOT a safe dedup; 'retire the JSONL builder' would break MCP-independent recall. Re-scope to accept-both or share-embed-compute-only. See reference_memo_cache_consolidate_premise_verified_2026_06_09.

**Shipped:** 2026-06-09T23:24:02-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[ollama-synergy-u-memo-cache-consolidate-rescope]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._