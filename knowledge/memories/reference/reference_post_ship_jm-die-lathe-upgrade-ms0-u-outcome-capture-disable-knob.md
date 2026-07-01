---
name: reference_post_ship_jm-die-lathe-upgrade-ms0-u-outcome-capture-disable-knob
description: Auto-distilled learnings from shipping JM-DIE-LATHE-UPGRADE-MS0/U-OUTCOME-CAPTURE-DISABLE-KNOB (commit 5775f3686). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.912Z
aliases: reference_post_ship_jm-die-lathe-upgrade-ms0-u-outcome-capture-disable-knob
---


# JM-DIE-LATHE-UPGRADE-MS0/U-OUTCOME-CAPTURE-DISABLE-KNOB

[MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-OUTCOME-CAPTURE-DISABLE-KNOB (slot:whiskey iter12): PRISM_OUTCOME_CAPTURE_DISABLE=1 short-circuits recordOutcome to no-op success. [BOOTSTRAP-SLOT-ENFORCE] mid-/loop. Closes 52x throughput bottleneck for high-volume batch jobs (V2 lathe corpus regen 918k variants) where peer-chat contention on per-domain .jsonl rename-into-place atomic-append causes serial EPERM stalls. Honors 'never block, never throw' bus contract. Re-enable per-session by unsetting env.

**Shipped:** 2026-05-24T12:48:42-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[jm-die-lathe-upgrade-ms0-u-outcome-capture-disable-knob]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._