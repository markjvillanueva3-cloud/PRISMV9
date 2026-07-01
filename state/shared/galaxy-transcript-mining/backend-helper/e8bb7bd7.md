# backend-helper session e8bb7bd7 (2026-05-18, 6.6MB, spine 42KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- Commit `1f371c41ce` (slot kilo): RTK dead‑hook removal, rate‑limit port to `rtk-prefix-reminder`, rtk‑auto‑suggest disabled, HTML source‑hash injection in `md-to-html.mjs`, idempotent CLAUDE.html rendering, guard `SPEC_FILE_RE` extended to dashboards/patches.  
- Commit `f7a3b10818` (slot kilo): re‑wired orphan `rtk-archive-and-index`, added dashboard consumer (`scripts/rtk-archive-dashboard.mjs`) and tests, closed zero‑coverage gaps in companion guard and archive dashboard.

**DECISIONS**  
- Activate the ghost milestone **HTML‑COMPANION‑MS0** (4 units) to backfill 130 spec HTMLs.  
- Use a dedicated slot worktree (`H:/prism-slot-kilo`) for commits to avoid peer‑git contention.  
- Mirror `C:/Users/.../.claude/settings.json` → `H:/.claude/` after truncation; keep mirror one‑way.  
- Enable Playwright MCP server in `settings.json` to satisfy online‑source preference.  
- Extend `html-companion-guard.mjs`’s `SPEC_FILE_RE` to include root docs (`CLAUDE.md`, `MEMORY.md`) and dashboard patches.  
- Deduplicate rtk hooks: keep newer `rtk-prefix-reminder` (with rate‑limit), drop older `rtk-auto-suggest`.  

**OPERATOR DIRECTIVES**  
- Commit the two slot/kilo changes when peer git contention subsides.  
- Enable Playwright MCP server and verify online‑source fetching works.  
- Add missing tests for `isCompanionTarget()` guard and archive dashboard helpers.  
- Monitor disk usage on C:; keep pre‑junction backups pruned.

**FINDINGS/BUGS**  
- Dead hook `"rtk hook claude"` in settings.json caused ~80‑token noise per Bash call.  
- Missing rate‑limit on `rtk-prefix-reminder` led to excessive nags.  
- `md-to-html.mjs` omitted `<meta name="prism-source-hash">`, causing non‑idempotent CLAUDE.html.  
- C: drive full → settings.json truncated to 0 bytes; restored from H:.  
- Orphan `rtk-archive-and-index` hook not wired, leaving archive log write‑only.  

**DOMAIN SPECIFICS**  
- **HTML Companion Engine**: `emit-all-spec-html.ts`, `md-to-html.mjs`, `html-companion-guard.mjs`.  
- **RTK Hooks & Bundles**: `bash-bundle.mjs` (PreToolUse:Bash), `rtk-prefix-reminder.mjs`, `rtk-auto-suggest.mjs`, `rtk-archive-and-index.mjs`.  
- **Slot Worktree**: `H:/prism-slot-kilo` for isolated commits.  
- **Settings Mirror**: `C:/Users/.../.claude/settings.json` ↔ `H:/.claude/`.  

**TOOLS USED**  
- PRISM helpers: `chat-slots.mjs`, `per-agent-handoff.mjs`, `stable-session-id.mjs`, `precompact-pending-guard.mjs`.  
- Build tools: `tsx` (via `mcp-server/node_modules/.bin/tsx`), Jest for tests.  
- External: Playwright MCP server (to be enabled), ripgrep for path resolution, Git for version control.

**OPEN THREADS**  
- Commit the two slot/kilo changes once peer git contention clears.  
- Finalize and test `SPEC_FILE_RE` extension to root docs (`CLAUDE.md`, `MEMORY.md`).  
- Enable Playwright MCP server; verify online‑source fetching works.  
- Ensure archive dashboard fully functional with live data; monitor for new entries.  
- Continue monitoring disk space on C: and prune stale pre‑junction backups.
