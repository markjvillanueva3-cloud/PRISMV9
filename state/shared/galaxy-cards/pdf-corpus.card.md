## pdf-corpus — pdf-corpus .md
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="pdf corpus" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:pdf-corpus]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- **Rule (user directive, 2026-05-26):** For all PDF→tribal-knowledge ingestion, use Lima's pypdf page-by-page extractor instead of pdf-parse-extract.mjs [feedback/feedback_use_lima_pypdf_page_extractor].
- **knowledge-conversion** (`engines/knowledge-conversion/`) — produces raw PDFs into the 6-node router; symmetric edge per CLAUDE.md.
- Canonical extractor script (this tree): `scripts/extract-jm-die-corpus-page-by-page.py` — pypdf, ease-first queue order, page-l
…[card truncated]
