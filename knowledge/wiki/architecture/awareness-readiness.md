---
title: AWARENESS-READINESS — "ready to use" in the PRISM Awareness snapshot
type: architecture
created: 2026-05-19
updated: 2026-05-19
tags: [awareness, build-state, sessionstart-hooks, wiring, readiness]
commit: 1694bec82f
by: claude-41794360 (slot delta)
---

# AWARENESS-READINESS

## Problem

`scripts/awareness-snapshot.mjs` generates `state/shared/AWARENESS-SNAPSHOT.md`,
auto-injected into every chat by `awareness-snapshot-inject.mjs` (SessionStart).
It reported **"engines built"** but never what is actually **invokable** — a
built engine with no dispatcher reference is on disk but *dark*. It also went
stale: the inject hook only regenerated the snapshot if it was >24h old, so it
lagged `BUILD_STATE.json` refreshes (e.g. it showed "2573 built" for ~17h after
BUILD_STATE moved to 2617).

## What "ready to use" means

`ready to use = built ∩ wired` — an engine that exists on disk **and** is
referenced by a dispatcher, so it can be invoked right now. The signal lives in
`BUILD_STATE.COVERAGE_BY_DOMAIN.rows[]` (`{domain,total,wired,unwired,coverage_pct}`).

## Fix

### `scripts/awareness-snapshot.mjs`

- **`computeReadiness(buildState)`** — exported pure fn. Sums `wired` /
  `unwired` / `total` across `COVERAGE_BY_DOMAIN.rows`; builds a
  `topUnwiredDomains` punch list (sorted by unwired desc, cap 8, excludes
  fully-wired domains). Fully fail-soft: `null` when `COVERAGE_BY_DOMAIN` is
  absent / not an array / empty; `Number(x) || 0` coercion so string-numbers
  and missing fields never produce `NaN`; `coveragePct` guards `total > 0`.
- **`renderMarkdown`** — new `## Ready to use (built AND wired — invokable
  now)` section between Headline and Graph utilization, plus the per-domain
  unwired backlog and a one-line note on the two denominators (see below).
- **`__isMain` guard** (fail-open) — so a test can import `computeReadiness` /
  `renderMarkdown` without running `buildSnapshot()` (which reads the ~370 MB
  system graph and writes the snapshot file).

### `.claude/hooks/awareness-snapshot-inject.mjs`

- `compact()` extracts the Ready-to-use section into the SessionStart digest
  (matched by `findSection("Ready to use (built AND wired — invokable now)")`
  — the heading literal is contract-pinned by a test).
- `isStale()` additionally returns true when `BUILD_STATE.json` mtime is newer
  than the snapshot — keeps the figures honest without waiting out the 24h
  window.
- **Regen is detached + debounced.** The generator is ~13 s cold; the prior
  `spawnSync(..., {timeout: 8000})` SIGTERM-killed it mid-run on a cold
  SessionStart (and the new BUILD_STATE-mtime trigger made that happen on
  every post-refresh start). Now `spawn(..., {detached:true}).unref()` +
  a 5-minute stamp (`state/shared/.awareness-regen.stamp`): this session reads
  whatever snapshot is on disk, the background regen refreshes it for the next,
  and a 13-chat SessionStart burst spawns at most one regen.

## Data-model nuance (R12 honesty)

`BUILD_STATE.headline.built_engines` (≈2617, a narrow whole-repo scan) ≠ the
sum of `COVERAGE_BY_DOMAIN.rows.total` (≈3288, every engine file bucketed by
domain). Both are correct in their own frame. Rather than hide the ~671-engine
gap, the snapshot's Ready-to-use section carries a one-line note explaining the
two denominators. Reconciling BUILD_STATE's two internal counts is a separate
BUILD_STATE-side concern, intentionally out of scope here.

## Live result (first run)

`2621` engines wired & ready to use · `667` built-but-unwired · **80 %**
dispatcher coverage. Largest unwired backlog: Other (126), Lathe (67),
Machine (13), Multi (10), Five (9), Shop (8), Outcome (8), Hyper (7).

## Knobs

- `PRISM_AWARENESS_INJECT=0` — disable the SessionStart inject.
- `PRISM_AWARENESS_INJECT_MODE=pointer|silent|summary` — digest verbosity.
- `PRISM_AWARENESS_INJECT_STALE_HOURS=<n>` — staleness window (default 24).
- `PRISM_AWARENESS_INJECT_FORCE_REGEN=1` — always regen.

## Tests

`scripts/__tests__/awareness-snapshot.test.mjs` — 18 cases: `computeReadiness`
(conservation invariant, sort, cap, exclude-fully-wired, null/malformed/
string-number/all-zero edge cases) + `renderMarkdown` (section present,
degraded notice, ordering, `findSection`-literal byte-stability contract).

## Notes

- Memory: [[reference_awareness_readiness_2026_05_19]].
- Sibling: [[reference_awareness_stack]] (the broader awareness/master-index
  surface), [[awareness-snapshot]] if present.
