---
name: Obsidian permanent memory routing chain
description: Source → mirror → vault → RAG read path for the auto-memory system
type: reference
originSessionId: cee63f1f-130d-4ed3-baf2-1d8812d9acb2
---
**Source:** `C:\Users\wompu\.claude\projects\H--prism\memory\` (76 .md files; `MEMORY.md` is index, target <200 lines)

**PostToolUse mirror:** `H:/prism/.claude/hooks/memory-mirror-to-vault.mjs` fires on every Edit/Write touching the source dir. Copies to vault under `H:/prism/knowledge/memories/{category}/` and embeds via `prism_memory:remember`.

**Vault:** `H:\prism\knowledge\memories\` (160 .md files; superset of source — includes consolidated/embedded entries from prior runs). `.obsidian/` config present → real Obsidian vault.

**Read path:** UserPromptSubmit hook `memory-rag-inject.mjs` ← `ObsidianMemoryRagEngine` (read-only scan, no LLM/Qdrant calls). Fires on memory-recall keywords. Cache: `.claude/cache/obsidian-rag-last.json`.

**Stop sync:** `stop-obsidian-memory-extract.mjs` spawns detached `H:\prism\scripts\obsidian-memory-sync.mjs` (INTEL-OLLAMA-OBSIDIAN-MS0/P1-U01). Logs to `.claude/cache/obsidian-memory-sync.log` after Stop fires.

**Persistence engine:** `ConsensusObsidianPersistenceEngine` wired to `guardDispatcher.ts`.

**Session consolidate:** Stop hook `session-consolidate-graph.mjs` (INTEL-OLLAMA-OBSIDIAN-MS0/P1-U02).

**How to apply:**
- Write new memories to source dir; the mirror hook handles vault propagation.
- Every memory needs frontmatter (`name`, `description`, `type` ∈ user|feedback|project|reference). Body structure for feedback/project: rule, then **Why:**, then **How to apply:**.
- Add a one-line index entry to `MEMORY.md`.
- Source/vault delta should always be 0 missing (verified 2026-05-06: 76 source files, 160 vault, 0 missing).
- Activity logs (`obsidian-memory-sync.log`, `obsidian-extract-last.json`) appear in `.claude/cache/` only after Stop fires — missing mid-session is normal.

**Disable escape:** `PRISM_MEMORY_RAG_DISABLED=1` env var skips the read-side inject.
