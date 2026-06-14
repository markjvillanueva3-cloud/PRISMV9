---
name: reference_post_ship_jm-die-lathe-upgrade-ms0-u-batch-v2-wire
description: Auto-distilled learnings from shipping JM-DIE-LATHE-UPGRADE-MS0/U-BATCH-V2-WIRE (commit 70291ce92). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.518Z
aliases: reference_post_ship_jm-die-lathe-upgrade-ms0-u-batch-v2-wire
---


# JM-DIE-LATHE-UPGRADE-MS0/U-BATCH-V2-WIRE

[MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-BATCH-V2-WIRE (slot:whiskey iter10): batch CLI V2 version-switching. [BOOTSTRAP-SLOT-ENFORCE] mid-/loop; prior whiskey commits this MS landed on shared tree (e66d99f2d0). PRISM_LATHE_UPGRADER_VERSION env routes V1 hardcoded vs V2 physics-driven; default V2. loadUpgrader env-read, async Promise wrap (V2 lazy-loads UltimateSpeedFeedEngine), header field normalization. Unblocks 115k variant re-run.

**Shipped:** 2026-05-23T22:59:59-05:00 by markjvillanueva3-cloud
**Files:** 6 touched

Full distillation: [[jm-die-lathe-upgrade-ms0-u-batch-v2-wire]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._