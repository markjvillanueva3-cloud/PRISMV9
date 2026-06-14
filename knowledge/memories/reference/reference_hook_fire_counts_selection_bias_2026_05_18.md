---
name: hook-fire-counts-selection-bias
description: "hook-fire-counts.jsonl has selection bias — only telemetrized hooks appear; 513 'zero_fire' includes hundreds that DO fire but don't emit fire-count events. CANNOT use for unwire decisions."
aliases: reference_hook_fire_counts_selection_bias_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.143Z
---


# hook-fire-counts.jsonl has selection bias (2026-05-18, golf claude-b23a56ef)

`scripts/hook-fire-rank.mjs` reports **10 unique firing hooks vs 513 zero-fire**
across the observation window. That number is a **trap**: the ledger only
records events from hooks that explicitly emit to it. Critical hooks that
DEFINITELY fire on every session boot show up in `zero_fire`:

- `claude-brief-inject` — injects CLAUDE-BRIEF section on SessionStart
- `build-state-inject` — injects BUILD_STATE on SessionStart + UserPromptSubmit
- `awareness-snapshot-inject` — top-15 awareness digest on SessionStart
- `inventory-check-guard` — injects counts on UserPromptSubmit
- `session-id-pin`, `roadmap-resume`, `gsd-inject` — all firing per system-reminders

These are observably firing in any session that has system-reminders — the
ledger just doesn't see them because they don't `appendFileSync` to
`hook-fire-counts.jsonl`.

## Why the count is unsafe for unwire decisions

A wired-AND-zero-fire intersection of 136/151 hooks looks like a 90% prune
target. **Acting on it would unwire claude-brief-inject + build-state-inject +
~130 others**, breaking session boot fleet-wide.

## What the ledger IS good for

The **top-fire-rate** sub-list is reliable (those hooks ARE telemetrized AND
firing high). For latency-budget work — async-conversion / dedup-gating of the
top consumers — the data is trustworthy:

- `wiki-precheck-inject` @ 3588 fires
- `error-pattern-promote` @ 2742 fires
- `archived-skill-suggest` @ 2329 fires
- `skill-auto-trigger` @ 2296 fires
- `viz-first-redirect` @ 1728 fires

## What to do for a real unwire audit

Two paths:
1. **Universal hook telemetry** — wrap the harness dispatcher to log every
   fire to a separate `hook-dispatch-log.jsonl`, then re-run the audit. This is
   a real PRISM-EFFICIENCY-MS0 unit, not a one-shot.
2. **Settings-vs-tier-table cross-ref** — every hook should declare a tier in
   its frontmatter; tier-3-advisory hooks that haven't been *modified* in N
   days AND aren't referenced by any skill or wiki entry are safer to prune
   than zero-fire alone. Still operator-gated, never auto.

## R12 lesson

A telemetry source's coverage MUST be validated before its `0` values are
trusted as "did not fire." Selection-bias zero is not the same as
measured-and-absent zero.

Related:
- [[reference_dev_tools_audit_meta_scripts_2026_05_17]] — the audit that
  surfaced the original 500/510 figure
- [[feedback_verify_actual_contract_not_proxy]] — same class of "measure
  what you actually care about"
