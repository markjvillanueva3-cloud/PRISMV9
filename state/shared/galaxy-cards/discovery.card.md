## discovery — Algorithm, Engine & Pipeline Discovery (per-domain working brain)
- > Clones `state/shared/specs/MASTER-BRAIN-TEMPLATE.md` (alpha-owned canonical). Connection = PULL + PUSH + master-index back-pointer + recall.
- **UP (pull from master):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="discovery duplication-guard master-index orphan audit" topK=20` (MCP-down fallback: `node scripts/system-viz-query.mjs find <term>`)
- **DOWN (push to master):** write `<type>_tango_<topic>.md` → `C:/Users/wompu/.claude/projects/H--prism/memory/` → mirrored to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs` at Stop
- **MASTER-INDEX edge:** master `MEMORY.md` `### Galaxy brain back-pointers` carries the `[galaxy:discovery] …` row (added 2026-05-29 — verify it persists)
- **Last master-sync:** 2026-05-29   ← bump on every PULL reconcile; older than the galaxy dir mtime ⇒ re-pull before work
- <!-- GALAXY-
…[card truncated]
