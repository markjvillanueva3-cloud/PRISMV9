## database-expansion — per-domain working brain
- **UP (pull from master):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md`
- **DOWN (push to master):** write `<type>_juliett_<topic>.md` →
- `C:/Users/wompu/.claude/projects/H--prism/memory/` → fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries `[galaxy:database-expansion] …` back-pointer (verify it exists)
- **Last master-sync:** 2026-05-29   ← bump on every PULL reconcile; older than the galaxy dir mtime ⇒ re-pull before work
- > 2026-05-29 PULL was **keyword-based** (MCP server DOWN this session — `prism_memory:semantic_search` unavailable). Re-run the live recall query next session when MCP is up and reconcile new hits into `## High-ROI memories`.
- `engines/discovery/` (tango) — `cross-session-asset-registry.json` + `extraction-log.json` are juliett-owned, tango-CONSUMED (duplication guard reads them).
- **Schema-read-blindness in META
…[card truncated]
