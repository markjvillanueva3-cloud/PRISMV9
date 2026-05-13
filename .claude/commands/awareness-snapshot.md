---
description: One-shot PRISM awareness snapshot — built/wired/utilized/drifted in 60 lines. Regenerates state/shared/AWARENESS-SNAPSHOT.md by orchestrating BUILD_STATE + MILESTONE_PROGRESS + system-graph utilization classifier. Cron-able session warmup.
allowed-tools: Bash, Read
---

# /awareness-snapshot — Session warmup digest

Generates `state/shared/AWARENESS-SNAPSHOT.md` — a human-readable + agent-readable digest answering:

> What's built? What's wired? What's not being used? What's drifted?

In 60 lines. Designed to be the first thing a fresh chat reads (cheaper than re-deriving from raw inputs every session).

## What it shows

- **Headline** from `BUILD_STATE.json`: built engines, needs-wiring count, pending units, frontend merges, drift cases.
- **Graph utilization** (filtered to L0..L8 + L10): hub / sink / source / orphan / ghost / normal counts.
- **Top 10 hubs** — most-connected central infrastructure.
- **Top 10 orphans** — built + documented + unwired (the audit punch list).
- **Ghost density per layer** — dead-code candidates broken down by layer.
- **Top 5 drifted milestones** — envelope claims vs git reality.

## How to run

```
/awareness-snapshot          # writes state/shared/AWARENESS-SNAPSHOT.md
```

Under the hood:

```bash
node H:/prism/scripts/awareness-snapshot.mjs            # human-readable, writes md
node H:/prism/scripts/awareness-snapshot.mjs --json     # machine-readable, no write
```

## Inputs (all pre-existing — script does NOT regenerate them)

- `state/shared/system-viz/system-graph.json` — needs to be fresh (regenerated on commit by the system-viz pipeline)
- `state/shared/BUILD_STATE.json` — regenerated via `node scripts/build-state-snapshot.mjs`
- `state/shared/MILESTONE_PROGRESS.json` — regenerated via `node scripts/build-milestone-progress.mjs`

If any are stale, run their regen scripts first. The snapshot script is read-only against them.

## Output

`state/shared/AWARENESS-SNAPSHOT.md` is overwritten on each run. ~60 lines. Suitable for SessionStart injection or chat-bus posting.

## Why it exists

User goal (2026-05-12): *"prism awareness system so we know exactly what is built, still needs building, what is wired and needs wiring and how to determine whether a node is being fully utilized."*

This skill is the **one-glance answer** for that question. Where `/master-index <query>` and `/utilization-dashboard` give per-node detail, `/awareness-snapshot` gives the system-wide rollup.

Companion to `/master-index` (search-first), `/utilization-dashboard` (per-node classification), `/build-state` (raw BUILD_STATE), `/system-viz` (3D viewer).

Shipped 2026-05-13 OBSIDIAN-PRISM-OS-MS0/U-AWARENESS-SNAPSHOT (slot alpha, loop iter 3).

## Cron candidate

Add to your scheduled tasks for hourly/daily regen so a fresh snapshot is always ready for the next session:

```bash
# Cron / Task Scheduler example (every hour):
node H:/prism/scripts/awareness-snapshot.mjs
```
