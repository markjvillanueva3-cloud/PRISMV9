## agent-orchestration — agent-orchestration .md
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="agent orchestration" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:agent-orchestration]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- ↔ ALL galaxies — orchestrates everything (CLAUDE.md here §Scope)
- `AgentExecutor.ts` — multi-agent orchestration, task queue, and execution coordination
- **golf owns the fleet-reaper** — slot-aware orphan reaper for the fleet; doctrine moved alpha→golf 2026-05-16 (CLAUDE.md §GOLF SLOT, §FLEET-REAPER; `feedback_golf_owns_reaper.md`).
- **Per-task model routing / pre-search** — every spawned subagent gets master-index
…[card truncated]
