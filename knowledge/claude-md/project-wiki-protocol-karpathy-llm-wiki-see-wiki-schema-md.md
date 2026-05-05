---
schema_version: 1.0.0
source: project
section: WIKI PROTOCOL (Karpathy LLM-Wiki — see `WIKI_SCHEMA.md`)
slug: wiki-protocol-karpathy-llm-wiki-see-wiki-schema-md
start_line: 148
end_line: 157
indexed_at: 2026-05-05T13:49:55.473Z
content_hash: 803053439e06ce2ab8236c6add117996baf31e32ea31067dc3ced4688d35289e
mirror_engine: ClaudeMdChunkerEngine
---
## WIKI PROTOCOL (Karpathy LLM-Wiki — see `WIKI_SCHEMA.md`)
PRISM has a compounding markdown wiki at `H:/prism/knowledge/wiki/`. **Query it before re-deriving.**
- `wiki/index.md` — 722-entry catalog (575 engines + 90 dispatchers + 57 memories), maintained by `WikiIndexMaintainerEngine`
- `wiki/log.md` — chronological audit (`grep '^## \[' wiki/log.md | tail -10`)
- `wiki/{concepts,entities,decisions,patterns,trajectories,lessons,code-tribal,architecture,software-engineering,ux-design}/`
- **Ollama owns ≥70% of wiki maintenance** (summarize, suggest cross-refs, lint candidates, embed)
- **Claude owns synthesis, contradiction resolution, schema evolution**
- Multi-chat: all wiki writes acquire `prism_context:claim_file` lock; log entries carry `by:claude-{id}` attribution
- Full protocol: `H:/prism/WIKI_SCHEMA.md` (3 layers · 3 ops · 2 index files · frontmatter spec · multi-chat rules · deprecation path)
