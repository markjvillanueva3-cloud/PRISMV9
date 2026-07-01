## backend-helper — Backend Helper
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="backend helper" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:backend-helper]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- **Stub-Wired vs. Wired**: A single dispatcher case calling `engine.method?.()` and falling back to `"method not callable"` is considered dark, not wired [feedback/feedback_echo_stub_wired_is_dark].
- `engines/discovery/` (tango) — wiring backlog source (audit-unwired-engines.mjs)
2. **Build-state honesty** — `BUILD_STATE.json` "wired" requires actual dispatcher invocation in a test, not just disk presence. The "82% dispatcher coverage" headline must rec
…[card truncated]
