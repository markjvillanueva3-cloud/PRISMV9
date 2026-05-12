---
name: PRISM wiki — query before re-deriving from digests
description: 722-entry markdown wiki at H:\prism\knowledge\wiki\ holds engine summaries, decisions, lessons, patterns
type: reference
originSessionId: cee63f1f-130d-4ed3-baf2-1d8812d9acb2
---
PRISM has a Karpathy LLM-Wiki at `H:\prism\knowledge\wiki\` (full protocol in `H:\prism\WIKI_SCHEMA.md`):

- `wiki/index.md` — 722-entry catalog (575 engines + 90 dispatchers + 57 memories)
- `wiki/log.md` — chronological audit (`grep '^## \[' wiki/log.md | tail -10`)
- Subdirs: `concepts/`, `entities/`, `decisions/`, `patterns/`, `trajectories/`, `lessons/`, `code-tribal/`, `architecture/`, `software-engineering/`, `ux-design/`

**Ownership split:**
- Ollama: ≥70% of maintenance (summarize, suggest cross-refs, lint candidates, embed)
- Claude: synthesis, contradiction resolution, schema evolution

**Multi-chat:** all wiki writes acquire `prism_context:claim_file` lock; log entries carry `by:claude-{id}` attribution.

**Skills:** `/wiki-query` `/wiki-ingest` `/wiki-lint` `/wiki-morning` `/wiki-bootstrap` `/wiki-page` `/wiki-harvest` `/wiki-sync`

**How to apply:**
- For "what does engine X do": query `wiki/index.md` BEFORE grepping `ENGINE_DIGEST.md` or reading source. Saves Glob/Grep round-trips.
- For "why was decision Y made": check `wiki/decisions/`.
- For pattern reuse: check `wiki/patterns/` before designing new abstraction.
- Wiki query is also injected by UserPromptSubmit hook `wiki-precheck-inject.mjs` on keyword match (top-3 entries).
- Multi-chat: never bypass wiki locks; conflicts go to merge-staging worktree.
- If wiki/index.md is stale (>7 days since last entry), run `/wiki-morning` or `/wiki-bootstrap` to refresh.
