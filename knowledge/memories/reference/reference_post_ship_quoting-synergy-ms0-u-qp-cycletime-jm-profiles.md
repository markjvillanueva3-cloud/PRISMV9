---
name: reference_post_ship_quoting-synergy-ms0-u-qp-cycletime-jm-profiles
description: Auto-distilled learnings from shipping QUOTING-SYNERGY-MS0/U-QP-CYCLETIME-JM-PROFILES (commit 2e1386276). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.007Z
aliases: reference_post_ship_quoting-synergy-ms0-u-qp-cycletime-jm-profiles
---


# QUOTING-SYNERGY-MS0/U-QP-CYCLETIME-JM-PROFILES

[MAIN] [QUOTING-SYNERGY-MS0]/U-QP-CYCLETIME-JM-PROFILES (slot:charlie): add JM Die fleet machine profiles to CycleTimeEstimatorEngine (the real S-curve G-code time engine) so it accurately times programs for the machines JM runs. hurco_vm30i/hurco_vmx24/okuma_m460v profiles + 'hurco' ControllerType + CONTROLLER_DEFAULTS entry. rapid/accel/tool-change/block-proc VERIFIED from GCodeRuntimePredictorEngine.MACHINE_LIBRARY; jerk(~20x accel)/servo/lookahead/spindle DERIVED from peer CONTROLLER_DEFAULTS (R12: no fabricated specs; Roku-Roku deferred-no verified specs). 5/5 tests (profiles resolve + relative invariants: faster-rapid machine<slower, faster-ATC<slower), tsc clean. P0 #1/9 of QUOTING-COST-TIME-AUDIT plan

**Shipped:** 2026-06-12T12:18:13-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[quoting-synergy-ms0-u-qp-cycletime-jm-profiles]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._