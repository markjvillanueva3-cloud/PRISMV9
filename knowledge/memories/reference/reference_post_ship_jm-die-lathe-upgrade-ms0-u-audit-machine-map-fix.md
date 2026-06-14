---
name: reference_post_ship_jm-die-lathe-upgrade-ms0-u-audit-machine-map-fix
description: Auto-distilled learnings from shipping JM-DIE-LATHE-UPGRADE-MS0/U-AUDIT-MACHINE-MAP-FIX (commit 77f10972a). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.517Z
aliases: reference_post_ship_jm-die-lathe-upgrade-ms0-u-audit-machine-map-fix
---


# JM-DIE-LATHE-UPGRADE-MS0/U-AUDIT-MACHINE-MAP-FIX

[MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-AUDIT-MACHINE-MAP-FIX (slot:whiskey iter13): align audit-runner LATHE_ENVELOPES keys with canonical JM_DIE_LATHES machine names. [BOOTSTRAP-SLOT-ENFORCE]. Prior keys mismatched (LB-3000EX_BigBore vs LB-3000EX-BigBore, missing LNC8/L300-M/B250II/etc), silently dropping 5 of 7 machine subdirs (28.6% coverage). New map matches engine inventory exactly — full 7-machine coverage. Audit PID 59824 launched detached.

**Shipped:** 2026-05-24T17:29:32-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[jm-die-lathe-upgrade-ms0-u-audit-machine-map-fix]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._