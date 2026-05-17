---
title: PRISM runqueue — priority-queue.mjs (master pickup source)
slug: priority-queue
kind: runqueue
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK04-extension
author: claude-41db1b82 (slot india)
source: priority-queue
filter: roadmap_priority + tier + slot-claim filter
---

# Priority Queue — Master Pickup Source

The runtime API and JSON sidecar that surfaces "what's the next-best
unit to ship" across the entire 5826-item PRISM roadmap. Both
`/pick-unit` (operator skill) and `psk pick` (kernel syscall) read from
this queue; the system-viz `ghost.priority_queue` roost renders it
visually.

## Data sources (composed)

```
priority-queue (state)
├─ atomic-roadmap.json (advisory unit set, 4404 units)
├─ MILESTONE_PROGRESS.json (shipped-work subtraction)
├─ envelopes/* (~696 milestone JSONs — status / dependencies)
├─ MISC-TASKS-INVENTORY.json (318 orphaned tasks)
├─ ROADMAP-CONSOLIDATED.json (5826-item master = 849 milestones × units)
└─ slot-task-claims.json (per-slot peer-claim filter, PER-SLOT-CLAIM-MS0)
```

The queue is **derived**, not authoritative — re-built deterministically
from upstream state files. No hand-edits.

## CLI

```bash
# Pick top-N candidates for THIS slot (slot-claim filter active):
node H:/prism/.claude/helpers/priority-queue.mjs --pick --slot india --top 10

# Without slot filter (returns top-N across whole fleet):
node H:/prism/.claude/helpers/priority-queue.mjs --pick --top 10

# JSON output:
node H:/prism/.claude/helpers/priority-queue.mjs --pick --slot india --top 10 --json
```

Output format (string-per-line):

```
U-CK04 [backend-dev p0] COMMAND-KERNEL-MS0 — knowledge/wiki/os/ namespace + entity frontmatter schema
U-CK05 [backend-dev p0] COMMAND-KERNEL-MS0 — Generated-mirror generators (...)
```

Format breakdown: `<unitId> [<roadmap-category> <priority>] <MILESTONE> — <title>`

## Sort order

| Sort key | Direction | Notes |
|----------|-----------|-------|
| 1. `roadmap_priority` | ascending (p0 first) | backend-dev p0 ranks higher than revenue p1 |
| 2. `tier` floor | ascending (T0 first) | T0 = critical infrastructure |
| 3. Dependency-readiness | unblocked first | units whose deps all `shipped` rank above units with `pending` deps |
| 4. Milestone wave | older milestone first | finishes existing work before starting new |
| 5. Effort | ascending | smaller units first when other keys tie |

## Slot-claim filter (PER-SLOT-CLAIM-MS0)

When `--slot <nato>` is provided AND a chatId is known, the picker
filters out units currently claimed by another slot's chatId. The
filter respects the slot-task-claims forward-only state machine
(claimed → building → testing → committing → released-on-commit).

Without `--slot`, no per-slot filter — returns the global top-N.

## Identified noise + drift handling

The queue is known to surface already-shipped units when:

1. Envelope `status` is stale (real ship not reflected in
   MILESTONE_PROGRESS). Same class as the U-CK02/CK03/CK04/CK10
   silent-close-out triages from this session's iter 6-15.
2. Deliverable shape mismatch (drift detector reads `d.path` as
   undefined). Documented in
   `state/shared/specs/ENVELOPE-DRIFT-DETECTOR-FALSE-POSITIVE-AUDIT-2026-05-17.md`.

Operator recourse:
- Triage via close-out audit → `CLOSE-OUT-DEFERRED.md` (downstream
  /goal Stop hook clears) OR explicit envelope-status flip.
- Don't re-build noise; the priority-queue mistake-mode is
  surface-only, not ground-truth.

## Capacity / staleness

- Re-generation cadence: deterministic, on-demand per CLI invocation
  (no cron). Fast (subseconds) when upstream JSONs haven't changed.
- Stale-handling: reads upstream files at invocation time; no caching.
- Concurrency: read-only against upstream sidecars; safe in parallel.

## ghost.priority_queue roost (system-viz)

The 3D system-viz renders the queue as the `ghost.priority_queue`
roost with 3588 color-coded children (PRIORITY-QUEUE-MS0):

- **blue** = backend-dev priority (e.g. CK02, CK04, CK10)
- **amber** = bridge / wiring (e.g. unwired-engine forge)
- **green** = app-functionality (e.g. revenue features)

Generator: `scripts/generate-priority-queue-features.mjs` (registered
in `regen-viz.mjs` FAST[] + `merge-augmentations.mjs` splice).

## Doctrine pins

- **Backend-dev first** — per the `/pick-dev` doctrine, backend tooling
  units (roadmap_priority=0) rank above revenue. The `/pick-unit`
  skill respects this; the `/pick-dev` skill locks it.
- **Slot-aware** — `--slot <nato>` is the canonical per-chat filter.
- **Advisory not authoritative** — queue is a ranking; ground truth
  lives in the envelopes + git history. Triage shipped-but-listed
  units rather than re-building.

## Related

- [[pick]] (syscall) — kernel pickup primitive that reads this queue
- [[checkin]] (command) — composes pick during dev-pipeline phase
- [[loop]] (pipeline) — autonomous iteration picks from this queue
- [[slot-lifecycle]] (process) — slot identity feeds the filter

## See also

- `.claude/helpers/priority-queue.mjs` — the actual queue CLI
- `scripts/pick-unit.mjs` — operator-facing pickup
- `state/shared/atomic-roadmap.json` — upstream unit catalog
- `state/shared/ROADMAP-CONSOLIDATED.{json,md,html}` — 5826-item master
- `state/shared/slot-task-claims.json` — per-slot claim store
- `state/shared/MISC-TASKS-INVENTORY.json` — 318 orphan tasks
