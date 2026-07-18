---
session: claude-58e6d5d4
topic: html-primary-ms0
written_at: 2026-05-12T03:35:00Z
machine: MarkV
family: Claude
session_key: claude-58e6d5d4
status: active
source: live-chat
---

# HANDOFF: claude-58e6d5d4
Updated: 2026-05-12T03:35:00Z · Family: Claude · Machine: MarkV · slot was charlie→delta · branch: cad-fusion-live-ms0 · MAIN tree

## RESUME

**HTML-PRIMARY-MS0 is ~85% built but UNCOMMITTED — finish it, in this order:**
1. `node --import tsx scripts/emit-all-spec-html.ts --force` — re-render all 56 `.html` twins on the current engine.
2. `node scripts/check-spec-html-a11y.mjs state/shared/specs/*.html state/shared/specs/atomized/*.html state/shared/research/*.html` → expect **0 fails** (the `id="top"` page-title fix already resolved the earlier "1 heading without an id").
3. Add a `spec-html-twin-regen` cron entry (`"17 * * * *"`) to `mcp-server/data/state/cron-jobs.json` (it's a JSON array; entry shape `{id,milestone,command,cron,timezone,enabled,added,description}` — see CONTEXT for the exact entry; VERIFY the tsx CLI path first).
4. Tests (the comprehensive-build-enforce hook wants real ones — no `toBeDefined()` stubs): (a) extend `SpecHTMLCompanionEngine.test.ts` with nav assertions; (b) `prism_session:doc_render` round-trip e2e via a mock server capturing `registerSessionDispatcher`'s handler; (c) add a "run-as-main" guard to `check-spec-html-a11y.mjs` so `checkA11y` is importable, then a test for it. (`emit-all-spec-html.ts` is CLI-verified — ratio 1.0, `--check-drift` exits 0/1 correctly.)
5. Build/test — **USE THE POWERSHELL TOOL** (node/npm/npx/vitest are NOT on the bash-tool PATH; PowerShell has the Windows PATH with `H:\Tools\nodejs`): `cd mcp-server; npm run build:fast`, then `npx vitest run` on the SpecHTML + sessionDispatcher + new test files, then `npm run build` (full tsc — verify 0 NEW errors; ~1356 are pre-existing repo-wide and not mine; esbuild bundle clean).
6. Commit: `[MAIN] [HTML-PRIMARY-MS0]/U-HPS02,U-HPS04,U-HPS05,U-HPS07: …` — the `[MAIN]` prefix is required by the `worktree-commit-route` hook. `git add` ONLY the 2 new scripts + 3 modified src files + new test file(s) + (recommend) the 56 `.html` twins. Then optionally run the 3-way scrutiny (`node .claude/scripts/scrutiny-3way.mjs --target HEAD` + Opus reviewer agent + `--mark-opus pass`).

**Run `/checkin` first** to re-claim a fleet slot (it churned away during a long process-cleanup task).

HTML-COMPANION-MS0 (commit `fd6aaee44`) and the PowerShell orphan-reaper ("PRISM Orphan Process Reaper (PS)" scheduled task) are already SHIPPED + committed — see STATE.

## STATE

### SHIPPED + committed this session
- **HTML-COMPANION-MS0** — commit `fd6aaee44` `[MAIN] [HTML-COMPANION-MS0]/HC-0..HC-5`:
  - `mcp-server/src/engines/SpecHTMLCompanionEngine.ts` — self-contained Markdown→HTML renderer, **no new npm dep** (frontmatter→metadata panel, GFM tables w/ `:---` alignment, nested ordered+unordered lists, fenced code blocks, blockquotes, collision-safe heading slugs + permalink anchors, ` ```mermaid ` fences → `<div class="mermaid">` + mermaid@11 CDN init, dark/light/auto theme via inline CSS custom-property token sets + `prefers-color-scheme`, WAI-ARIA skip-link + `<main role="main" id="content">` + `<nav aria-label>`, XSS-safe escaping + link/img URL scheme-filter, oversize truncation, `<meta name="prism-source-hash">`). Pure `render(md, opts) → {html,title,headings,frontmatter,hasMermaid,sourceHash,warnings,bytes}` + `hashSource()` + `isDrifted()`.
  - `scripts/emit-spec-html.ts` — CLI (`node --import tsx scripts/emit-spec-html.ts <md> [--out --theme --no-toc --title --check-drift --quiet]`). Writes `<stem>.html` + `<stem>.html.hash`. `.ts`+tsx not `.mjs` because PRISM bundles its engines via esbuild (no per-file `dist/`).
  - `prism_dev:spec_html_render` action — `devDispatcher.ts` (+`spec_html_render` in ACTIONS enum, +case with `await import("../../engines/SpecHTMLCompanionEngine.js")`) + `devActionSchemas.ts` (+Zod schema). Additive, between `case "audit_harness_security"` and `case "dev_awareness_find_similar"`.
  - Tests: `SpecHTMLCompanionEngine.test.ts` (25) + `SpecHtmlRender.dispatcher.e2e.test.ts` (8, true mock-server round-trip via `registerDevDispatcher`) = **33/33 pass**. Plus 2 HTML twins committed (`state/shared/specs/BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.html`, `state/shared/specs/atomized/BACKEND-DEVTOOLS-RGS6-HTML-COMPANION-MS0-ATOMIZED-2026-05-10.html`).
- **PowerShell orphan-reaper** — committed `[MAIN] [HARNESS-STABILITY]/U-ORPHAN-REAPER-PS` (NOTE: distinct from `c47ec810c [HARNESS]/U-HANG-FORKSTORM-V2`, which another chat did):
  - `scripts/reap-orphan-procs.ps1` — pure PowerShell, no node dep, no child-process spawns (so it runs even when the box is too exhausted to spawn node). Kills: bash hook-wrappers (`.claude/hooks|helpers` in cmdline) >60s · orphaned (dead-parent) bash >60s (unless cmdline matches phase15/daemon-supervisor/emit-all-spec-html) · hook/helper node >120s · hung git >10min. NEVER touches: the MCP server (`dist/index.js`), Claude Code itself, language servers, Playwright MCP, vitest/tsx workers, anything below threshold, itself. Logs kills to `state/shared/orphan-reaper.log` (256 KB cap). `-SelfTest` (16/16 classification cases pass), `-DryRun`, `-Quiet`.
  - `scripts/install-orphan-reaper-task.ps1` — registers Windows Scheduled Task **"PRISM Orphan Process Reaper (PS)"** (every 5 min, RunLevel=Highest so it can kill stubborn limited-token-unkillable procs, 2-min ExecutionTimeLimit, MultipleInstances=IgnoreNew, executor `powershell.exe` by fixed system path). Self-tests the reaper before scheduling. `-Uninstall` / `-RunNow`. Supplements the existing node-based tasks ("PRISM Zombie Reaper v2", "PRISM Node Orphan Cleaner"). Verified registered, `lastResult=0x0`.

### UNCOMMITTED — HTML-PRIMARY-MS0, ~85% (the work to finish)
- **Modified:**
  - `mcp-server/src/engines/SpecHTMLCompanionEngine.ts` — U-HPS04 nav enhancement: `navScript()` (self-contained inline JS, no mark.js dep) does IntersectionObserver TOC-active-highlight + an in-page `<mark>`-wrapping search box + TOC filter; CSS added for `.toc li a.active`, `mark.search-hit`, `nav.toc input.toc-search`, `.toc-search-status`, `li.toc-hidden`; `renderToc()` now emits `<input type="search" class="toc-search">` + a `.toc-search-status` aria-live region; the nav `<script>` is added to the `scripts` array only when `tocHtml` is non-empty. **ALSO**: `id="top"` added to the page-title `<h1 class="page-title">` — confirmed applied via grep.
  - `mcp-server/src/tools/dispatchers/sessionDispatcher.ts` + `mcp-server/src/schemas/sessionActionSchemas.ts` — U-HPS07 new half: `prism_session:doc_render` action (mirrors `prism_dev:spec_html_render`; ADDITIVE — `"doc_render"` appended to the ACTIONS array, a `case "doc_render"` block with `await import("../../engines/SpecHTMLCompanionEngine.js")` returning via the dispatcher's `ok({success,...})` helper, a `doc_render` Zod `.passthrough()` schema with `md`/`markdown`/`path`/`theme`/`toc`/`title`/`write`/`include_html`).
- **New (untracked):**
  - `scripts/emit-all-spec-html.ts` — U-HPS02 batch pipeline. Walks `state/shared/specs/**` + `state/shared/research/**` for `*.md`; regenerates `<stem>.html` + `<stem>.html.hash` when missing OR mtime-stale OR `<meta prism-source-hash>` ≠ `sha256(md)`. Flags: `--force`, `--check-drift` (don't render; list stale; exit 1 if any), `--quiet`, `--dirs=csv`. Per-file error isolation (one bad file logs+continues). Lock-guard at `state/shared/.emit-all-spec-html.lock`. Run via `node --import tsx`. Already run once → **56 `.md` → 56 `.html` twins on disk; `--check-drift` round-trips clean**.
  - `scripts/check-spec-html-a11y.mjs` — U-HPS05 LOGIC. Dependency-free static WAI-ARIA checker (no @axe-core/cli, no browser): every `<img>` has non-empty `alt` · skip-link → `#content` · `<main role="main" id="content">` · `<html lang>` · non-empty `<title>` · every heading has an `id` · no heading-level skips · `<button>`/`<input>` have accessible names. `node scripts/check-spec-html-a11y.mjs <html…> [--quiet]`; exit 0=clean, 2=violations (listed), 1=bad invocation. (This `.mjs` doesn't import the engine, so plain `node` is fine.)
- **On disk (untracked, NOT committed):** 56 `.html` + 56 `.html.hash` twins across `state/shared/specs/**` + `state/shared/research/**` — one per `.md`. Generated by a prior run; re-render with `--force` before commit since the engine has changed since.

### TODO to land HTML-PRIMARY-MS0
See RESUME (ordered list). The exact `cron-jobs.json` entry to add:
```json
{ "id": "spec-html-twin-regen", "milestone": "HTML-PRIMARY-MS0/U-HPS02",
  "command": "node H:/prism/node_modules/tsx/dist/cli.mjs H:/prism/scripts/emit-all-spec-html.ts --quiet",
  "cron": "17 * * * *", "timezone": "local", "enabled": true, "added": "2026-05-12",
  "description": "Auto-regenerate stale HTML companions for state/shared/specs + research Markdown (mtime+hash check, per-file isolation, lock-guarded). HTML-PRIMARY-MS0/U-HPS02." }
```
(VERIFY `H:/prism/node_modules/tsx/dist/cli.mjs` exists; if not, use `"command": "node --import tsx H:/prism/scripts/emit-all-spec-html.ts --quiet"`.)

### Already covered — do NOT rebuild
- U-HPS01 (master renderer) = HC-0 `SpecHTMLCompanionEngine`.
- U-HPS03 (theme engine) = HC-2 (inline CSS token sets + `prefers-color-scheme` — deliberately inline-always rather than an external `<link href="…/web/assets/spec-theme.css">`, which wouldn't resolve when an `.html` is opened directly from `state/shared/specs/`).
- U-HPS06 (drift hash) = HC-5 (`engine.isDrifted()` + `.html.hash` sidecar + `emit-spec-html.ts --check-drift`).
- U-HPS07 prism_dev half = `prism_dev:spec_html_render` (named that, NOT the spec's `emit_spec_html` — capability equivalent, already committed+tested; not renaming).

### DEFERRED to the hooks lane (NOT this chat's lane — currently slot charlie = claude-49a09a3c on HOOKS-AUTOMATION-V2)
- U-HPS05's pre-commit hook `.claude/hooks/html-a11y-guard.mjs` + `.claude/settings.json` registration — the check LOGIC ships as `scripts/check-spec-html-a11y.mjs` (callable today).
- U-HPS06's pre-commit hook `.claude/hooks/html-drift-guard.mjs` + `.claude/settings.json` registration — the check LOGIC ships as `emit-spec-html.ts --check-drift` and `emit-all-spec-html.ts --check-drift` (callable today).
- HC-5's "drift guard per-commit" `loop_registration` is likewise hooks-lane wiring.

## CONTEXT — operational gotchas (these cost time this session; read them)

- **HARNESS HANG / fork-storm** (lost ~2 hrs this session): leaked bash hook-wrappers (3 wedged ~51 min) ate Windows handles → `ERROR_NO_SYSTEM_RESOURCES` (0x5AA) → new process spawns block → tool calls hang for hours. If it recurs: `powershell -NoProfile -ExecutionPolicy Bypass -File H:\prism\scripts\reap-orphan-procs.ps1 -DryRun` to see what's stuck, then drop `-DryRun`; check `state/shared/orphan-reaper.log` and `Get-ScheduledTaskInfo -TaskName 'PRISM Orphan Process Reaper (PS)'`. The new 5-min PS reaper should prevent it. **Be sparing with tool calls** — each fires ~24 hook subprocesses; batch operations.
- **Home PC hangs more than the better-specced work PC** (Mark asked why): it's handle / non-paged-pool / process-creation exhaustion — FIXED resources that don't scale with RAM/CPU/GPU. Likely causes on the home box: more concurrent Claude chats (each = more hook spawns), and/or slower `H:` access (every hook does file I/O on `H:`), and/or more background apps drawing from the same pools. Fix on the home PC: run `powershell -NoProfile -ExecutionPolicy Bypass -File H:\prism\scripts\install-orphan-reaper-task.ps1 -RunNow` once; keep concurrent chats lower.
- `scripts/emit-spec-html.ts` and `scripts/emit-all-spec-html.ts` are **`.ts`, not `.mjs`** — PRISM bundles its engines via esbuild (no per-file `dist/`), so a plain-node `.mjs` can't `import` the engine. Run with `node --import tsx <script>` (tsx is a repo-root dep). `scripts/check-spec-html-a11y.mjs` IS `.mjs` (it just parses HTML strings — no engine import).
- **node / npm / npx / vitest are NOT on the bash-tool PATH** — use the PowerShell tool for those (it has the Windows PATH with `H:\Tools\nodejs`). `rtk` and `git` ARE on the bash PATH. `tsx` resolves from the repo root (`H:/prism/node_modules/tsx`).
- **Commit subjects need a `[MAIN]` prefix** when not in a matching git worktree (`worktree-commit-route` hook). Recent commits all use `[MAIN] [SCOPE]/U-ID: …`.
- **Pre-existing test failures, not mine**: `dev-dispatcher-util-u-wire04.test.ts` has ~35 fails — its `util_*` actions aren't in the devDispatcher ACTIONS enum (someone's incomplete `U-UTL-WIRE04`). Unrelated.
- **Slot**: was charlie → delta (heartbeat went stale during the process-cleanup; charlie got reassigned to claude-49a09a3c, who's on HOOKS-AUTOMATION-V2). Re-run `/checkin` at session start.
- **Scrutiny gate**: neither this session's commits (`fd6aaee44`, the reaper) has a 3-of-3 scrutiny ledger entry — the gate auto-passes after 3 block attempts, but a clean finish would run `node .claude/scripts/scrutiny-3way.mjs` + the Opus reviewer.
