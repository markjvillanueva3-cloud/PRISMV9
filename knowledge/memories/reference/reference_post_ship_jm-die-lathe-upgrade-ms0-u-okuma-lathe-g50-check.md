---
name: reference_post_ship_jm-die-lathe-upgrade-ms0-u-okuma-lathe-g50-check
description: Auto-distilled learnings from shipping JM-DIE-LATHE-UPGRADE-MS0/U-OKUMA-LATHE-G50-CHECK (commit 375c0c9ff). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.912Z
aliases: reference_post_ship_jm-die-lathe-upgrade-ms0-u-okuma-lathe-g50-check
---


# JM-DIE-LATHE-UPGRADE-MS0/U-OKUMA-LATHE-G50-CHECK

[MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-OKUMA-LATHE-G50-CHECK (slot:whiskey iter18): HIGH-19 — Okuma lathe G50 S<rpm> max-spindle-clamp check. [BOOTSTRAP-SLOT-ENFORCE]. Fires when controller=okuma + first 20 non-comment lines lack 'G50 + S-address' pair. Without G50, small-diameter cut in CSS (G96) mode can drive spindle past mechanical limits — catastrophic failure mode. Verified: 5 of 50 JM Die sample programs missing G50 → 10% of corpus is missing this critical safety clamp. Surfaces previously-invisible safety hazard.

**Shipped:** 2026-05-24T18:02:00-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[jm-die-lathe-upgrade-ms0-u-okuma-lathe-g50-check]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._