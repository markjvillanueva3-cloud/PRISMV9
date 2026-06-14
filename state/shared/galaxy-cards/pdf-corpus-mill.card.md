## pdf-corpus-mill — pdf-corpus-mill .md
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="pdf corpus mill" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:pdf-corpus-mill]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- **pdf-corpus** (`engines/pdf-corpus/`) — PARENT extractor; this galaxy is its mill-filtered subset (`./CLAUDE.md` §Cross-galaxy edges).
- **post-processor** (`engines/post-processor/`, echo) — Haas Mill / Mazak Matrix controller-dialect mining from the same manual corpus (`./CLAUDE.md`).
- > Open threads / risk areas distilled from this galaxy's memories (advisory):
- `scripts/generate-milling-extracted-pdf-bridge.mjs` — mill PDF → extracte
…[card truncated]
