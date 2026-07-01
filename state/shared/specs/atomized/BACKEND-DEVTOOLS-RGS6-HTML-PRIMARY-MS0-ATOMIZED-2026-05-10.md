---
milestone: HTML-PRIMARY-MS0
parent_roadmap: BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md
research_source: state/shared/research/2026-05-10-pass2-html-as-spec.md
total_units: 7
critical_path_role: extends HTML-COMPANION-MS0 to make HTML the primary surface for strategic specs
loop_registrations: 2 (regen cron 1h, drift guard per-commit)
date: 2026-05-10
---

# HTML-PRIMARY-MS0 — atomized

> Reconcile Thariq's "HTML is the new markdown" (2026-05-08, ~5M views) with Karpathy's "docs should be one text file" — **MD = report, HTML = interface**. Surfaces driven by human interaction go HTML-primary; LLM-consumed surfaces (CLAUDE.md, skills, hooks, digests, handoffs) stay MD-only.

---

## U-HPS01 — Build `SpecHTMLCompanionEngine` (master renderer)

- pillar: html-primary
- tier: T1
- ai_priority_score: 75
- leverage_score: 13
- why: every strategic spec needs a render path; one engine, many spec types
- depends_on: [HTML-COMPANION-MS0 HC-0]
- blocks: [U-HPS02, U-HPS03, U-HPS04, U-HPS05, U-HPS06, U-HPS07]
- parallel_with: [U-VAULT01, U-OCN01]
- viz_node_id: `eng.system.spechtmlcompanionengine` (TBD-create)
- closes_synergy_edge: docs × system (currently manual)
- loop_schedule: none

verifies_via:
  channel: render
  tool: `node scripts/emit-spec-html.mjs state/shared/specs/BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md`
  expected_signal: HTML file produced, validates W3C
  re_run_cost: 3s
  baseline: only revenue roadmap has HTML

micro_steps:
  - step-1:
      tool: Read
      path: `scripts/emit-revenue-roadmap-html.mjs`
      action: pattern reference (peer chat shipped this earlier)
      verify: file readable, exports HTML emit function
  - step-2:
      tool: Write
      path: `mcp-server/src/engines/SpecHTMLCompanionEngine.ts`
      action: generalize — MD parse (marked.js) + frontmatter + Mermaid + SVG + Octicons embed + theme; pure function `render(md, opts) → html`
      verify: file exists, exports singleton
  - step-3:
      tool: Write
      path: `scripts/emit-spec-html.mjs`
      action: CLI wrapper — `<md-path>` → write `<md-path>.html` (same dir)
      verify: script runs on test MD
  - step-4:
      tool: Write
      path: `mcp-server/src/__tests__/SpecHTMLCompanionEngine.test.ts`
      action: 7 tests — happy (research card), happy (roadmap), happy (audit), oversized (1MB MD), XSS in MD, malformed frontmatter, broken anchor
      verify: 7 passed
  - step-5:
      tool: Bash
      path: `H:/prism/`
      action: render this very milestone file as smoke test
      verify: `node scripts/emit-spec-html.mjs state/shared/specs/atomized/BACKEND-DEVTOOLS-RGS6-HTML-PRIMARY-MS0-ATOMIZED-2026-05-10.md` produces `.html`

adversarial_cases:
  - `<script>` injection in MD code-fence
  - 100MB MD input (memory)
  - circular anchor reference

variability_axis:
  - research card / roadmap / audit / dossier (4 spec types)
  - dark / light theme

failure_modes:
  - marked.js parse error → emit error.html with diff
  - oversized → stream + paginate
  - theme assets missing → bundle CSS inline

---

## U-HPS02 — Generation pipeline + cron registration

- pillar: html-primary
- tier: T1
- ai_priority_score: 70
- leverage_score: 12
- why: manual `emit-spec-html.mjs` per file doesn't scale to 16+ specs; cron auto-twins all MDs
- depends_on: [U-HPS01]
- blocks: [U-HPS06]
- parallel_with: [U-HPS03, U-HPS04, U-HPS05, U-HPS07]
- viz_node_id: `core.script.emitallspechtml` (TBD-create)
- closes_synergy_edge: docs × cron (currently none)
- loop_schedule: 1h

verifies_via:
  channel: metric
  tool: count `state/shared/specs/*.html` vs `state/shared/specs/*.md`
  expected_signal: ratio ≥ 0.95 (every recent MD has HTML twin)
  re_run_cost: 1s
  baseline: <0.1 ratio

micro_steps:
  - step-1:
      tool: Write
      path: `scripts/emit-all-spec-html.mjs`
      action: walk `state/shared/specs/**/*.md` + `state/shared/research/**/*.md`, regen if HTML stale (mtime check)
      verify: script runs, processes ≥10 files
  - step-2:
      tool: Bash
      path: `H:/prism/`
      action: register cron — `CronCreate "17 * * * *"` (off-minute)
      verify: cron entry persists
  - step-3:
      tool: Bash
      path: `H:/prism/`
      action: run pipeline once → confirm 16 HTML files emitted
      verify: `ls state/shared/specs/*.html state/shared/research/*.html | wc -l` ≥ 15

adversarial_cases:
  - 1000 MDs to process (cost)
  - one file corrupts mid-batch (does the rest continue?)

variability_axis:
  - 1 / 10 / 100 MDs to regen
  - stale-only / force-all modes

failure_modes:
  - one file fails → log + continue with rest (no batch fail)
  - cron oversubscribe (next fires before prev done) → lock file
  - mtime equal but content drifted → hash check secondary

---

## U-HPS03 — Theme engine (dark/light, prefers-color-scheme)

- pillar: html-primary
- tier: T1
- ai_priority_score: 65
- leverage_score: 11
- why: HTML for humans needs reader-respect; accessibility lift
- depends_on: [U-HPS01]
- blocks: []
- parallel_with: [U-HPS02, U-HPS04, U-HPS05]
- viz_node_id: `core.css.thememodule` (TBD-create)
- closes_synergy_edge: html × accessibility (currently none)
- loop_schedule: none

verifies_via:
  channel: render
  tool: render with `--theme=dark` then `--theme=light`
  expected_signal: both pass axe-cli with 0 contrast errors
  re_run_cost: 5s
  baseline: no theme support

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/web/assets/spec-theme.css`
      action: CSS vars + `@media (prefers-color-scheme: dark)` block
      verify: file exists
  - step-2:
      tool: Edit
      path: `mcp-server/src/engines/SpecHTMLCompanionEngine.ts`
      action: inject `<link>` to theme.css + `data-theme` attribute
      verify: rendered HTML includes theme link
  - step-3:
      tool: Bash
      path: `H:/prism/`
      action: axe-cli check
      verify: `npx @axe-core/cli state/shared/specs/*.html 2>&1 | tail -3` → 0 violations

adversarial_cases:
  - user OS theme switches mid-session
  - custom CSS in MD code-block overrides theme

variability_axis:
  - dark / light / system / forced (4 modes)

failure_modes:
  - CSS load fail → inline fallback styles
  - browser doesn't support color-scheme → light default
  - high-contrast OS mode → respect OS

---

## U-HPS04 — Navigation engine (sticky TOC, anchor links, search)

- pillar: html-primary
- tier: T1
- ai_priority_score: 62
- leverage_score: 11
- why: 600-line specs need navigation; HTML's structural advantage over MD
- depends_on: [U-HPS01]
- blocks: []
- parallel_with: [U-HPS02, U-HPS03, U-HPS05, U-HPS07]
- viz_node_id: `core.js.navmodule` (TBD-create)
- closes_synergy_edge: html × navigation (currently none)
- loop_schedule: none

verifies_via:
  channel: render
  tool: manual smoke — click sticky TOC entry, search "U-HPS01"
  expected_signal: anchor jumps, search highlights match
  re_run_cost: 30s
  baseline: no navigation

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/web/assets/spec-nav.js`
      action: vanilla JS — IntersectionObserver for TOC highlight + `mark.js` for search
      verify: file exists, < 5KB
  - step-2:
      tool: Edit
      path: `mcp-server/src/engines/SpecHTMLCompanionEngine.ts`
      action: emit TOC from H2/H3 + include nav.js
      verify: rendered HTML has sticky `<nav>`
  - step-3:
      tool: Write
      path: `mcp-server/src/__tests__/spec-html-nav.test.ts`
      action: parse rendered HTML, assert TOC structure
      verify: passes

adversarial_cases:
  - 1000 H2 entries (TOC overflow)
  - duplicate header text (anchor collision)

variability_axis:
  - 5 / 50 / 500 sections in TOC
  - happy / collision / nested

failure_modes:
  - duplicate anchors → suffix with index
  - search query empty → reset highlights
  - JS disabled → graceful TOC without smooth-scroll

---

## U-HPS05 — Accessibility hook (WAI-ARIA, axe-cli gate)

- pillar: html-primary
- tier: T1
- ai_priority_score: 60
- leverage_score: 10
- why: WebAim reports 41% of HTML rendering tools regress accessibility; pre-commit hook prevents
- depends_on: [U-HPS01]
- blocks: []
- parallel_with: [U-HPS02, U-HPS03, U-HPS04]
- viz_node_id: `core.hooks.htmla11yguard` (TBD-create)
- closes_synergy_edge: html × hooks (currently none)
- loop_schedule: none

verifies_via:
  channel: test
  tool: `node .claude/hooks/html-a11y-guard.mjs <<< '{"files":["state/shared/specs/foo.html"]}'`
  expected_signal: exit 0 if axe-cli passes, else exit 2 with violations listed
  re_run_cost: 10s per HTML
  baseline: no guard

micro_steps:
  - step-1:
      tool: Write
      path: `.claude/hooks/html-a11y-guard.mjs`
      action: pre-commit hook — run `npx @axe-core/cli` on changed HTML files; block if ≥1 contrast / aria-label violation
      verify: hook runs
  - step-2:
      tool: Edit
      path: `.claude/settings.json`
      action: register hook on `git-commit-prepare` matcher
      verify: parse clean
  - step-3:
      tool: Bash
      path: `H:/prism/`
      action: smoke test on existing HTML
      verify: `node .claude/hooks/html-a11y-guard.mjs <<< '{"files":["state/shared/specs/REVENUE-ROADMAP-2026-05-10.html"]}'` produces clean or actionable output

adversarial_cases:
  - HTML with embedded SVG that has nested ARIA violations
  - oversized HTML (10MB+)

variability_axis:
  - 0 / 5 / 50 violations per file

failure_modes:
  - axe-cli unavailable → skip with warning (don't hard-fail dev loop)
  - false positives → maintainer override list
  - hook timeout → split per-file

---

## U-HPS06 — Drift guard (MD↔HTML hash on regen)

- pillar: html-primary
- tier: T1
- ai_priority_score: 55
- leverage_score: 9
- why: if someone hand-edits HTML, subsequent MD regen silently loses changes; hash detects
- depends_on: [U-HPS02]
- blocks: []
- parallel_with: [U-HPS07]
- viz_node_id: `core.hooks.htmldriftguard` (TBD-create)
- closes_synergy_edge: html × drift (currently none)
- loop_schedule: per-commit

verifies_via:
  channel: test
  tool: hand-edit HTML → attempt commit
  expected_signal: hook blocks, asks to reconcile MD
  re_run_cost: 1s
  baseline: silent loss

micro_steps:
  - step-1:
      tool: Write
      path: `.claude/hooks/html-drift-guard.mjs`
      action: pre-commit — compute hash from MD render, compare to `<filename>.html.hash`; if mismatch and HTML newer → block
      verify: hook runs
  - step-2:
      tool: Edit
      path: `scripts/emit-all-spec-html.mjs`
      action: on regen, write hash sidecar
      verify: `.html.hash` file produced
  - step-3:
      tool: Edit
      path: `.claude/settings.json`
      action: register hook
      verify: parse clean

adversarial_cases:
  - hash file corrupt
  - both MD and HTML edited in same commit (race)

variability_axis:
  - 0 / 1 / 10 drifted files
  - HTML-edit-only / MD-edit-only / both-edit

failure_modes:
  - hash missing → assume first run, write hash + warn
  - both edited → require explicit `--accept-md-wins` flag
  - hash collision (impossible) → manual reconcile mode

---

## U-HPS07 — Dispatcher actions: `prism_dev:emit_spec_html` + `prism_session:doc_render`

- pillar: html-primary
- tier: T1
- ai_priority_score: 50
- leverage_score: 9
- why: MCP-callable rendering enables on-demand companion generation from any chat
- depends_on: [U-HPS01]
- blocks: []
- parallel_with: [U-HPS04, U-HPS06]
- viz_node_id: `disp.devdispatcher` + `disp.sessiondispatcher` (already exist, extend)
- closes_synergy_edge: dispatchers × docs
- loop_schedule: none

verifies_via:
  channel: integration
  tool: round-trip MCP `prism_dev:emit_spec_html {path:"..."}`
  expected_signal: 200 OK + path to generated HTML
  re_run_cost: 5s
  baseline: nonexistent

micro_steps:
  - step-1:
      tool: Edit
      path: `mcp-server/src/schemas/devActionSchemas.ts`
      action: add `emit_spec_html` schema
      verify: TS compiles
  - step-2:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/devDispatcher.ts`
      action: wire action with lazy SpecHTMLCompanionEngine import
      verify: round-trip MCP
  - step-3:
      tool: Edit
      path: `mcp-server/src/schemas/sessionActionSchemas.ts`
      action: add `doc_render` schema (general rendering pipeline)
      verify: TS compiles
  - step-4:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/sessionDispatcher.ts`
      action: wire `doc_render`
      verify: round-trip MCP
  - step-5:
      tool: Write
      path: `mcp-server/src/__tests__/devDispatcher.html.test.ts`
      action: 4 tests — happy, missing path, oversized MD, render error
      verify: 4 passed

adversarial_cases:
  - path traversal `../etc/passwd`
  - render of LLM-injected content

variability_axis:
  - dev / session dispatchers
  - markdown / dossier / roadmap inputs

failure_modes:
  - file not found → 404 with helpful message
  - render fail → emit error.html + return path
  - rate limit → defer with retry-after

---

## §X — Closing notes

**Critical-path:** U-HPS01 unblocks everything. Build first.

**Cron:** `17 * * * *` (off-minute) for U-HPS02 auto-twin regen.

**Synergy edges closed:** 6 (docs × system, docs × cron, html × accessibility, html × navigation, html × hooks, dispatchers × docs).
