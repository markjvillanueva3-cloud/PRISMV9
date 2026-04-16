---
name: Web App Full Wiring Audit Complete
description: 50-page Playwright audit done 2026-03-30. 47 load, 3 broken, 0 live. 68-task fix roadmap at H:/prism/audits/web-wiring-roadmap.md
type: project
---

## Web App Wiring Audit (2026-03-30)

Full Playwright-powered audit of all 50 PRISM web routes completed.

**Results:**
- 47 of 50 pages load (94%)
- 3 BROKEN: `/secondary-ops` (ops.find not a function), `/quote-analytics` (Cannot read properties), `/parts-library` (Cannot read properties)
- 0 pages show LIVE backend data — every page uses fixture/demo fallback
- All pages hit billing API 401, WebSocket refuses connection
- The "Live + Fallback" architecture means frontend IS wired to call APIs, but auth isn't configured so it always falls back to fixtures

**Fixes applied this session:**
- 29 hook .sh files: `/c/PRISM` → `/h/prism` path migration
- 4 hook .mjs files: `C:/PRISM` → `H:/prism` path migration
- 32 engine/dispatcher .ts files: `__dirname` → `import.meta.dirname` (ESM fix)
- `constants.ts`: all 50+ `C:\PRISM` paths → `H:\prism`
- `per-agent-handoff.mjs`: `resume.trim` TypeError fix (non-string guard)
- User-level settings.json: 41 Python hook paths replaced with `python3` (space-in-path fix)

**Artifacts:**
- `H:/prism/audits/web-wiring-matrix.md` — Full status of every route
- `H:/prism/audits/web-wiring-roadmap.md` — 68 tasks across 9 sprints
- `H:/prism/audits/screenshots/` — 53 screenshots of every page

**Why:** Next step is Sprint 1 from the roadmap: fix 3 broken pages + wire billing auth + WebSocket. Then Sprint 2: wire calculator, dashboard, alarms, toolpath, threads, PPG to live MCP data.

**How to apply:** Read `H:/prism/audits/web-wiring-roadmap.md` and start at Tier 0 (3 broken pages).
