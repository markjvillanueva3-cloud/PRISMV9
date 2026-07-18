---
kind: command
slug: knowledge-query
status: stub
generated_at: 2026-05-23T00:34:38.924Z
generator: scripts/backfill-wiki-os-commands-entities.mjs
source: .claude/commands/knowledge-query.md
description: "Unified knowledge query — ONE MCP call replaces N Grep/Glob/Agent searches. Hits prism_session:master_index_query (system-viz graph + Obsidian vault wikiEntries + memoryEntries + capability index + BUILD_STATE classification + utilization scoring, all pre-joined per node). Use this BEFORE Grep/Glob/Agent whenever the question is \"where is X / does Y exist / what's wired to Z / what's unused\" — it costs ~1 round-trip vs 5-20 for filesystem searches."
---

# /knowledge-query

Unified knowledge query — ONE MCP call replaces N Grep/Glob/Agent searches. Hits prism_session:master_index_query (system-viz graph + Obsidian vault wikiEntries + memoryEntries + capability index + BUILD_STATE classification + utilization scoring, all pre-joined per node). Use this BEFORE Grep/Glob/Agent whenever the question is "where is X / does Y exist / what's wired to Z / what's unused" — it costs ~1 round-trip vs 5-20 for filesystem searches.

## Source command

See `.claude/commands/knowledge-query.md` for the live executable surface.

## Status

This entity is a U-CK11 Phase 2 backfill stub. Richer content (purpose,
composes_with chain, invocation examples, related skills) lands in a
later phase per the U-CK11 verdicts doc remediation queue.
