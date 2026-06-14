## bug-hunting — UNIFORM slot cross-session learnings
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="bug hunting" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:bug-hunting]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- [[../wiring/MEMORY.md]] — romeo's wirings are uniform's verification target
- | R12 fail-loud violation | 2026-05-12 (Mnilax R12 doctrine adopt) | Engine returns `{ok:true, fallback:...}` on real failure | Inject failing dep, assert `ok=false` or throw |
- | Silent clobber | 2026-05-23 (viz streaming IO) | Two writers to same path, partial JSON read | Write-while-read race repro |
- | Wired-silent hook | 2026-05-18 (`e467a4ca0`) | Hook on dis
…[card truncated]
