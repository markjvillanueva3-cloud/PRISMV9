---
name: reference_sierra_viz_first_search
description: Use system-viz-query (or master_index_query) before Grep/Glob — recursive Glob TIMES OUT on the huge tree.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.203Z
aliases: reference_sierra_viz_first_search
---


**Viz-first search for the H:/prism tree.** A recursive `**` Glob over `H:/prism` TIMES OUT (verified 2026-05-29 — the 548MB graph + 555MB `_node-embeddings.jsonl.partial` + 13K uncommitted files make ripgrep's traversal exceed the 20s limit). Always prefer:
- `node scripts/system-viz-query.mjs find <noun>` — ranked graph hits, ~0 Claude tokens (the `audit-viz-first` hook auto-fires this on audit/missing intents).
- `prism_session:master_index_query keyword="<x>"` when MCP :3100 is up.
- Targeted single-dir `ls H:/prism/scripts/ | grep -iE 'viz|graph'` for file discovery (non-recursive).

**Why:** the tree is too big for recursive Glob; the graph already pre-indexes most "where is X / what wires to Y".

**How to apply:** check the auto-injected `audit-viz-first` block first; fall back to targeted single-dir ls; reserve Grep for confidence <0.5 misses. Doctrine: [[feedback_system_viz_first_audit]].
