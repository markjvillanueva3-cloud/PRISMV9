---
title: Handoff Prune Cron
type: architecture
status: active
created: 2026-05-20
updated: 2026-05-20
tags: [handoff, cron, hygiene, fleet, reversible]
by: claude-88b0032d
---

# Handoff Prune Cron

`scripts/handoff-prune-cron.mjs` — a monthly cron that counters handoff-file
sprawl across the 26-slot fleet. ECHO-UNDONE item **H6** / `U-HANDOFF-PRUNE-CRON`.
Commits `84e0eb555f` (cron + test) + `7fcbe2f72` (Stop-hook wiring).

## Problem

`state/shared/handoffs/` accumulates one `HANDOFF-*.md` per chat per topic and
never self-cleans — 587+ live files. Nothing archives the inactive set.

## Behaviour

Archives every top-level `HANDOFF-*.md` untouched for >30 days into
`state/shared/handoffs/archive/<YYYY-MM>/`, grouped by the handoff's own month.

- **Archiving is a MOVE** (`fs.renameSync`), never a delete — fully reversible
  (the file still exists, one directory deeper). Aligns with the
  never-delete-only-disable reversibility rule.
- **Dry-run by default.** `--apply` is required to move files; `--force`
  bypasses the throttle; `--json` emits a machine-readable plan.
- **Self-throttles** to one apply-run per 30 days via
  `state/shared/handoffs/.prune-throttle.json` — safe to invoke from any
  frequently-running surface.

## Age source — `written_at`, not mtime

Filesystem mtime is unreliable here: a `git checkout` or a C:->H: mirror sync
rewrites every handoff's mtime to "now", which would make the prune never fire.
`parseWrittenAt()` extracts the handoff's frontmatter `written_at:` field as the
logical write time; mtime is only the fallback when the frontmatter is absent.

## Design

Pure core (clock-injected, exported, unit-tested) / I/O shell split:

| Pure function | Role |
|---|---|
| `archiveSubdir(mtimeMs)` | `YYYY-MM` subdir a handoff is grouped into |
| `parseWrittenAt(headText)` | extract frontmatter `written_at:` ms, else null |
| `planArchive(files, nowMs, staleDays)` | build the deterministic archive plan |
| `shouldRun(throttle, nowMs, throttleDays)` | throttle gate decision |

14 tests (`handoff-prune-cron.test.mjs`) cover the pure core incl. the exact
`STALE_DAYS` boundary and determinism.

## Wiring

The cron is self-throttling but inert until invoked. It is wired as a detached,
non-blocking piggyback inside `.claude/hooks/handoff-memory-seed-stop.mjs` — an
existing Stop hook on the same post-Stop handoff-hygiene charter. The 30-day
self-throttle makes the per-Stop spawn a fast no-op 29 days of 30. Knob:
`PRISM_HANDOFF_PRUNE_DISABLE=1` disables just this piggyback.

## Known P2 follow-ups

Surfaced by the end-of-task 3-of-3 scrutiny (graded PASS — these are deferrable):

- `writeThrottle()` is a bare `fs.writeFileSync` — not atomic. Switch to
  temp-file + `renameSync`; consider an O_EXCL lock around the apply block.
- The 30-day throttle de-conflicts apply-runs across months but **not** the
  first-of-month Stop burst — across the fleet, multiple chats can apply
  concurrently before any writes the throttle. Self-healing and harmless (the
  per-file `existsSync(dest)` collision skip + JSON-parse-fail-as-no-run), but
  the in-code TOCTOU comment overstates the "single-instance" guarantee.
- The throttle gate runs *after* the full directory scan + per-file
  `written_at` read — the 29/30-day no-op still scans all 587 files. Move the
  throttle-mtime check ahead of `readHandoffFiles()`.
- `main()` / the apply path has no unit tests (pure core is fully covered).

## Related

- [[obsidian-memory-feed-hook]] — sibling post-Stop handoff-hygiene surface
- [[session-continuity-stack]] — the handoff-writer producers this prunes
