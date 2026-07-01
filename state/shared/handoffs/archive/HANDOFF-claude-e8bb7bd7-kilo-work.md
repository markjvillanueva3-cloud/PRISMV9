---
session: claude-e8bb7bd7
topic: kilo-work
slot: kilo
written_at: 2026-05-18T19:22:06.246Z
machine: MARKV
family: Claude
session_key: claude-e8bb7bd7
status: active
---

# HANDOFF: claude-e8bb7bd7
Updated: 2026-05-18T19:22:06.246Z
Family: Claude | Machine: MARKV | Session: claude-e8bb7bd7

## STATE
Slot kilo, /checkin-kilo /loop session. Shipped: HTML-COMPANION-MS0 (130 spec HTMLs + CLAUDE.html + MEMORY.html + 10 patch HTMLs via emit-all-spec-html.ts + md-to-html.mjs; drift gate green); rtk dead-hook removal (settings.json 'command:rtk hook claude' was firing on every Bash call, errored, printed ~80 tokens of noise — fix verified empirically); rtk-reminder→rtk-prefix-reminder swap in bash-bundle.mjs (R7 surface-conflict cleanup); emit-all-spec-html.ts docstring update (line 19-20 swap to canonical mcp-server tsx path).

## RESUME
Continue HTML-COMPANION-MS0 + rtk improvements. PENDING: (1) apply docstring fix to H:/prism/scripts/emit-all-spec-html.ts lines 19-20 — swap stale 'node H:/prism/node_modules/tsx/dist/cli.mjs' (path doesn't exist at HEAD) for canonical 'H:/prism/mcp-server/node_modules/.bin/tsx scripts/emit-all-spec-html.ts' (Windows-functional). Read lines 15-29 already done pre-crash. (2) syntax-check H:/prism/.claude/hooks/bundles/bash-bundle.mjs after the rtk-reminder→rtk-prefix-reminder swap (committed in this session via Edit; node --check the file). (3) OPERATOR ACTION: commit ~93 file changes (130 HTML companions + CLAUDE.html + MEMORY.html + 12 patches + 2 memory files + bash-bundle.mjs edit + settings.json rtk-hook removal) blocked all session by 5+ peer git processes thrashing .git/index.lock — defer until peer activity quiets, then 'git add' the file lists in state/shared/dashboards/patches/CLAUDE-MD-PATCH-{html-companion-activation,rtk-dead-hook-fix}-2026-05-18.md. NEXT: dedup hooks/rtk-auto-suggest vs rtk-prefix-reminder + extend html-companion-guard.mjs SPEC_FILE_RE to cover root CLAUDE.md/MEMORY.md/patches + investigate rg-not-found warning.

## CONTEXT
Critical discoveries this session: (a) cron-documented tsx path H:/prism/node_modules/tsx is BROKEN at HEAD — only mcp-server-vendored tsx (H:/prism/mcp-server/node_modules/.bin/tsx) works on Windows. (b) rtk init -g on Windows says 'Hook-based mode requires Unix' + falls back to --claude-md mode — DO NOT manually re-add 'rtk hook claude' to settings.json (rtk 0.34.3 has no 'hook' subcommand). (c) Peer git contention in shared H:/prism tree (5+ concurrent git processes) makes atomic stage+commit racy — slot-worktree migration is the structural fix. (d) The X article that prompted this work (https://x.com/trq212/status/2052811606032269638 'HTML is the new Markdown') was paywalled WebFetch 402; playwright preference per [[feedback_playwright_for_online_sources]] needs Playwright MCP server enabled in settings.json. (e) /rtk-setup skill now carries Windows caveat in Step 3 — operator should not manually re-add rtk hook entry.
