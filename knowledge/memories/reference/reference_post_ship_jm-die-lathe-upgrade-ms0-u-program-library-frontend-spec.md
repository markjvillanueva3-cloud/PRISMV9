---
name: reference_post_ship_jm-die-lathe-upgrade-ms0-u-program-library-frontend-spec
description: Auto-distilled learnings from shipping JM-DIE-LATHE-UPGRADE-MS0/U-PROGRAM-LIBRARY-FRONTEND-SPEC (commit 23e4cadb2). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.912Z
aliases: reference_post_ship_jm-die-lathe-upgrade-ms0-u-program-library-frontend-spec
---


# JM-DIE-LATHE-UPGRADE-MS0/U-PROGRAM-LIBRARY-FRONTEND-SPEC

[MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-PROGRAM-LIBRARY-FRONTEND-SPEC (slot:whiskey iter22): turnkey frontend wiring spec for jm_die_lathe_program_library across 5 frontend nodes (lathe-wizard + lathe-studio + shop-mgmt + biz-mgmt + employee-portal) + camera-recognition bridge contract. [BOOTSTRAP-SLOT-ENFORCE]. Backend shipped this session (engine + tests + schema + dispatcher case in HEAD); spec gives the next 5 frontend slots a turnkey hand-off — exact zod query shape, complete result-binding contract, 5x frontend-matrix mapping each UI affordance to a result field, partNumber recognition entry point, USB-export wiring via variant.downloadPath, build-order recommendation. Forward-compat hook documented for mike's MIKE-LATHE-CAPABILITY-MS0 merge once golf integrates slot/mike (b3a0d1ea76) — surfaces per-machine spindleRpmMax/hasLiveTool/hasSubSpindle on dispatchableMachines[].

**Shipped:** 2026-05-25T01:26:48-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[jm-die-lathe-upgrade-ms0-u-program-library-frontend-spec]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._