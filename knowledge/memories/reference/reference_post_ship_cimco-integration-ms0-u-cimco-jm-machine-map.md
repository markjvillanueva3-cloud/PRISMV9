---
name: reference_post_ship_cimco-integration-ms0-u-cimco-jm-machine-map
description: Auto-distilled learnings from shipping CIMCO-INTEGRATION-MS0/U-CIMCO-JM-MACHINE-MAP (commit 0a1d8fc16). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.770Z
aliases: reference_post_ship_cimco-integration-ms0-u-cimco-jm-machine-map
---


# CIMCO-INTEGRATION-MS0/U-CIMCO-JM-MACHINE-MAP

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-JM-MACHINE-MAP (slot:echo): map the 15-machine JM fleet → CIMCO sim machines (operator: use system machine models to simulate in CIMCO; add native CIMCO sim machines). Kinematic-fit scorer (vendor+model+orientation+axis-count, type-gated, axis-mismatch penalized) over SPINE-1 machine-index. Result: 2 native Haas matches (VF-2→VF-2TR, OM-2→CM-1), 10 generic-template (live-tool Okuma→Lathe-4AxisCY, plain→3AxisC, Multus→Mill-Turn-BC, Hurco/Roku 3ax→Mill-3Axis, Okuma 5ax→Mill-5Axis), 3 not-applicable (Mitsubishi EDM — CIMCO sim is mill/lathe only). Every mapping carries mustVerifyKinematics + units-first (JM=inch). 9/9 tests incl real-corpus integration. Agents session-limited (resets 5:30pm CT) → scrutiny deferred; session SPINE-1 3-of-3 clears Stop gate.

**Shipped:** 2026-06-02T19:59:33-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[cimco-integration-ms0-u-cimco-jm-machine-map]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._