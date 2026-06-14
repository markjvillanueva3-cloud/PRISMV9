## wiring — ROMEO slot cross-session learnings
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="wiring" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:wiring]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- [[../discovery/MEMORY.md]] — tango's orphan-rescue history is romeo's lookahead
- [[../bug-hunting/MEMORY.md]] — uniform's silent-failure findings tell romeo which prior wires regressed
- [[../backend-helper/MEMORY.md]] — papa's TSC-fix campaigns inform what NOT to wire mid-fix
- **Table-driven ACTION_MAP is canonical** — `audit-unwired-engines.mjs` reads each dispatcher's action enum directly (fixed 2026-05-18 `9e27d9d42`). Don't reinvent the scanner;
…[card truncated]
