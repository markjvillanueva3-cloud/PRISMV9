# academy session e8bb7bd7 (2026-05-18, 6.6MB, spine 42KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- Activated the `HTML-COMPANION-MS0` ghost milestone: 130 spec‑html twins, `CLAUDE.html`, `MEMORY.html`, and 12 dashboard‑patch htmls emitted; drift guard green (0 stale).  
- Removed dead `rtk hook claude` entry from settings.json; added Windows caveat to `rtk‑setup.md`.  
- Wired `rtk-prefix-reminder.mjs` into `bash-bundle.mjs`, disabled legacy `rtk-auto-suggest.mjs`; ported rate‑limiting (`PRISM_RTK_REMINDER_RATE_MS`).  
- Re‑activated orphan `rtk-archive-and-index` hook, added dashboard consumer `scripts/rtk-archive-dashboard.mjs`, and 36 unit tests.  
- Injected `<meta name="prism-source-hash">` into `md-to-html.mjs`; ensured idempotent rendering of `CLAUDE.html`.  
- Restored `C:/Users/.../.claude/settings.json` after ENOSPC; freed 5 GB from stale pre‑junction backup.  
- Two slot‑kilo commits: `1f371c41ce` (RTK & HTML fixes) and `f7a3b10818` (archive activation, dashboard, tests).  

**DECISIONS**  
- Use slot‑binding wrapper (`/checkin-kilo`) to isolate work in the `kilo-work` topic; keeps main repo clean while enabling parallel dev.  
- Treat the ghost milestone as a single atomic unit: activate all four units together to avoid partial drift states.  
- Extend `html-companion-guard.mjs`’s `SPEC_FILE_RE` to include root docs (`CLAUDE.md`, `MEMORY.md`) and dashboard patches for comprehensive drift detection.  
- Replace legacy rtk reminder with the newer prefix‑reminder, but keep rate‑limiting to avoid noise; disable auto‑suggest entirely.  
- Enable Playwright MCP server in `settings.json` to satisfy online‑source preference for future audits.  

**OPERATOR DIRECTIVES**  
- Commit all staged files (~93) when peer git contention subsides (slot‑kilo worktree).  
- Run `/compact` after the handoff is written; Stop hook will block until completed.  
- Verify that `C:/Users/.../.claude/settings.json` remains valid before any new session starts.  

**FINDINGS / BUGS**  
- Dead `rtk hook claude` entry caused ~80‑token noise per Bash call on Windows.  
- Legacy rtk auto‑suggest lacked rate‑limiting; replaced by prefix‑reminder with proper throttle.  
- Missing `<meta prism-source-hash>` in md-to-html led to non‑idempotent `CLAUDE.html`; fixed injection.  
- Playwright not installed → fallback to WebFetch, causing auth wall for X article.  
- C: drive full; settings.json truncated to 0 bytes during an edit; restored from H: mirror after deleting stale pre‑junction backup.  

**DOMAIN SPECIFICS**  
- **Slot binding & checkin pipeline** (`chat-slots.mjs`, `checkin.md` steps).  
- **HTML companion engine** (`emit-all-spec-html.ts`, `html-report-render.mjs`, `md-to-html.mjs`).  
- **Drift guard** (`html-companion-guard.mjs`) with source‑hash meta.  
- **RTK hooks**: `rtk-prefix-reminder.mjs`, `rtk-auto-suggest.mjs`, `rtk-archive-and-index.mjs`.  
- **Bash bundle orchestration** (`bash-bundle.mjs`).  
- **Precompact guard** (`precompact-pending-guard.mjs`) and per‑agent handoff.  

**TOOLS USED**  
- PRISM helpers: `chat-slots.mjs`, `milestone-tracker.mjs`.  
- Pipeline scripts: `checkin.md`, `emit-all-spec-html.ts`, `md-to-html.mjs`.  
- Guard & hook modules: `html-companion-guard.mjs`, `rtk-prefix-reminder.mjs`, `rtk-auto-suggest.mjs`, `rtk-archive-and-index.mjs`.  
- Testing harnesses: Jest unit tests (`*.test.mjs`).  
- Git utilities: `git` commands, index‑lock sweeper.  

**OPEN THREADS**  
- Commit the ~93 staged files when peer git contention clears (slot‑kilo worktree).  
- Finalize dedup of rtk auto‑suggest vs prefix‑reminder; ensure only one reminder is active with proper rate‑limit.  
- Extend `html-companion-guard.mjs`’s `SPEC_FILE_RE` to root docs and dashboard patches; add source‑hash injection in all html emitters.  
- Enable Playwright MCP server for future online‑source audits.  
- Consider migrating the kilo slot to a dedicated worktree to eliminate index‑lock contention.
