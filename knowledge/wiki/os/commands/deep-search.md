---
kind: command
slug: deep-search
status: stub
generated_at: 2026-05-23T00:34:38.924Z
generator: scripts/backfill-wiki-os-commands-entities.mjs
source: .claude/commands/deep-search.md
description: "Search-first then deep-reason fallback. Runs master_index_query first; if top hits all score below the confidence floor, escalates to model deep-reasoning with the master-index hits pre-loaded as context. Cuts token waste on shallow lookups while keeping neural-grade answers for ambiguous queries."
---

# /deep-search

Search-first then deep-reason fallback. Runs master_index_query first; if top hits all score below the confidence floor, escalates to model deep-reasoning with the master-index hits pre-loaded as context. Cuts token waste on shallow lookups while keeping neural-grade answers for ambiguous queries.

## Source command

See `.claude/commands/deep-search.md` for the live executable surface.

## Status

This entity is a U-CK11 Phase 2 backfill stub. Richer content (purpose,
composes_with chain, invocation examples, related skills) lands in a
later phase per the U-CK11 verdicts doc remediation queue.
