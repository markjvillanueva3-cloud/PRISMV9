---
name: system-viz-upgrades-audit-2026-05-16
description: /forge-audit-v2 of the system-viz subsystem — 11 findings across performance, functionality, wiring; 2 reviewer-added (M1, M2); 1 demoted to open question (P5)
kind: audit
date: 2026-05-16
auditor: claude-1a624844 (slot juliett)
related:
  - [[system-viz]]
  - [[system-viz-fs-coverage-ms1]]
  - [[system-viz-dsl-ms0]]
---

# system-viz Upgrades Audit — 2026-05-16

Pointer-only wiki entry. Full audit + verification matrix + META artifact reference is at:

- **Markdown:** `state/shared/specs/SYSTEM-VIZ-UPGRADES-AUDIT-2026-05-16.md`
- **HTML (Thariq pattern):** `state/shared/specs/SYSTEM-VIZ-UPGRADES-AUDIT-2026-05-16.html`
- **META artifact (re-runnable measurement):** `scripts/system-viz-health.mjs`

## What this audit established

11 findings ranked by leverage, each with a verification channel. Two-round peer review (reviewer A first round returned **FAIL** with three load-bearing defects; reviewer B confirmed all fixes landed → **PASS**). 3 corruption-risk regressions back-flowed to `H:/prism/CLAUDE.md`.

## TL;DR — top 5 actionable upgrades

1. **M1** — `loadGraph` is reimplemented or inline-parsed across **18 scripts**; mandatory prereq before any caching work.
2. **P1** — Shared `scripts/lib/system-viz-graph.mjs:loadGraph()` has no module-scope cache → 261-833 ms cost on every UserPromptSubmit + SubagentStart that queries the graph.
3. **P4** — `expand-system-viz-l12-files.mjs` does a full H: drive re-walk on every `--full` regen (2-5 min); needs per-directory mtime skip cache.
4. **W1** — `FOLD_NEWLY_BUILT=0` default in `system-viz-on-commit.mjs` creates a 1-commit blind spot for newly-built nodes across the 6-12 chat fleet.
5. **F2** — D4 action-traces (`reference_d4_action_traces_2026_05_16`) are being written; no `action-trace` query verb consumes them. Highest-leverage functionality add.

## Findings demoted in review

- **P5 (web viewer 24 MB monolith load)** — demoted from finding to open question. Was inferred without Playwright-MCP measurement. Promotion path: measure transferred bytes + DCL + LCP via `mcp__playwright__browser_navigate /system-viz`; promote only if transferred > 5 MB and TTI > 2 s.
- **F3 (search-act composite verb)** — the "↓ 30% Grep count" target was unbacked; rewritten to require a 1-week observation-window baseline before any reduction target is claimed.

## Findings corrected in review

- **W4** — prior draft claimed "DRIFT_REPORT.json is written, never consumed" (FALSE). `.claude/hooks/stop-system-viz-drift.mjs` IS wired and reads the report. The real, narrower finding: consumer is Stop-advisory only (60-min throttle, non-blocking); `regen-viz.mjs` does NOT hard-fail on `truncated|root-missing`. Auto-remediation loop is the gap.

## Recommended next milestone — `SYSTEM-VIZ-UPGRADES-MS0`

5-unit sequence:
1. **U-LIB-CONSOLIDATE** (M1, S-M) — route 18 scripts through `lib/system-viz-graph.mjs:loadGraph()` only.
2. **U-CACHE-LIB** (P1, S) — module-scope `{ mtimeMs, graph }` cache in the lib.
3. **U-FOLD-DEFAULT** (W1, S) — flip `FOLD_NEWLY_BUILT` default or move cost out-of-band.
4. **U-DRIFT-HARD-FAIL** (W4, S) — post-detect short-circuit in `regen-viz.mjs` on `truncated|root-missing`.
5. **U-MERGE-INVARIANT** (M2, S) — end-of-merge assertion + ESLint rule banning raw `G.nodes.push` in `merge-augmentations.mjs`.

Per-file scrutiny gate per project CLAUDE.md applies (every file gets 2 parallel reviewers before the next).

## Re-run cadence

Audit is self-scheduled for re-run in 7 days via `/loop --interval 7d --max 4`. After 4 re-runs (~28 days), operator re-evaluates relevance.

## Cross-refs

- [[system-viz]] — canonical permanent reference
- [[system-viz-fs-coverage-ms1]] — peer milestone (cron re-walker + drift detector — complementary to P4)
- [[system-viz-dsl-ms0]] — shortcode index extension
- `H:/prism/scripts/system-viz-health.mjs` — META artifact (re-runnable baseline)
- `H:/prism/CLAUDE.md ## Recent regressions` — 3 entries flowed from this audit
