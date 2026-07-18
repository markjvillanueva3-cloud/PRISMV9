---
title: wiki-propagation-watchdog Stop hook
type: architecture
domain: backend-dev
created: 2026-05-18
session: claude-cdfb103c slot lima
commit: pending
related:
  - wiki-propagation-watchdog (iter10 — the watchdog itself)
  - fleet-task-health-stop (sister Stop-hook arm of a sibling watchdog)
  - wiki-automation-discipline (the user doctrine this closes)
---

# wiki-propagation-watchdog-stop Stop-hook arm

**BACKEND-DEV-LOOP iter11 (2026-05-18, slot lima).** Wires iter10's
`scripts/wiki-propagation-watchdog.mjs` into the Stop chain so it actually runs
without depending on a separate scheduled task (which would itself be unwatched
— the watch-the-watchman recursion).

## The gap

iter10 (`dc8965beac`) shipped the 4-stage staleness detector (system-viz /
leaf-index / embeddings / obsidian-feed) and on first run flagged a CRITICAL
state — but the watchdog itself sat unwired. The user directive that bookended
iter10 was explicit:

> "make sure everything you're building is automated or it will sit stagnant"

A watchdog with no caller is exactly the orphaned-writer class the directive
forbids.

## Architecture

Mirrors the [[fleet-task-health-stop]] pattern exactly:

| layer | mechanism |
|---|---|
| heartbeat | Every fleet Stop event (13 chats × N turns/hour) |
| throttle | Stamp file `state/shared/.wiki-watchdog-stop.stamp` — 15 min default; 13 simultaneous Stops collapse to ONE watchdog run |
| surface | Stop verdict's `additionalContext` — operator sees stale stages immediately on next chat stop |
| spawn | `node scripts/wiki-propagation-watchdog.mjs --json --dry-run` detached; never waits |
| safety | ALWAYS `{continue:true}` — NEVER blocks Stop. Missing script → R12 surface, never throw. |

## Pure functions (testable)

- `repoPaths(here)` — resolves watchdog script + telemetry + stamp paths from the hook's own location (worktree-safe).
- `throttleDecision(stampMtimeMs, nowMs, throttleMs)` → `{throttled, reason}` — strict `<` window; future stamps (clock skew) throttle; NaN / null → not throttled.
- `buildAdvisory(row, nowMs)` → string OR null — converts a telemetry JSONL row into a Stop-verdict advisory. Returns null on: missing/non-object row, status not in `{warn,critical}`, malformed ts, telemetry >1h old.

## Tests

`.claude/hooks/wiki-propagation-watchdog-stop.test.mjs` — **22 cases via `node --test`**:
- `repoPaths` (4): script suffix, telemetry suffix, stamp suffix, worktree-portable.
- `throttleDecision` (6): no-stamp, NaN, recent, exact-boundary (strict `<`), older, future-stamp clock-skew.
- `buildAdvisory` (12): null, non-object, clean status, stale telemetry, malformed ts, warn-1-stage, critical-3-stages, dedup repeated stages, refresh-command guidance, non-array stages, missing staleCount, invalid status.

## Knobs

| env | effect |
|---|---|
| `PRISM_WIKI_WATCHDOG_DISABLE=1` | silent no-op (same knob the inner script honors) |
| `PRISM_WIKI_WATCHDOG_STOP_DRY=1` | read-and-surface only; don't spawn |
| `PRISM_WIKI_WATCHDOG_THROTTLE_MS=N` | override 15-min throttle |

## Wiring

`H:/.claude/settings.json` Stop[0].hooks[43] (after `fleet-task-health-stop`,
inside the T3-advisory cluster). Auto-mirrored from C:.

## R12 honesty (scope)

This hook makes the iter10 watchdog *fire*. It does NOT fix the 3 propagation
gaps the watchdog surfaces (system-viz 4.3h stale, embeddings 89.3h stale,
obsidian-feed never fired). Those need separate iters that either (a) hook the
refresh commands to the same Stop chain, or (b) run them via cron, or (c)
identify why `stop-obsidian-memory-feed.mjs` never wrote its stamp. iter12+
agenda.
