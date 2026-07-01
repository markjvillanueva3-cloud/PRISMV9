---
name: reference_post_ship_hurco-vm30i-full-psn-ms0-u-hurco-roundtrip-tsx-sidecar
description: Auto-distilled learnings from shipping HURCO-VM30I-FULL-PSN-MS0/U-HURCO-ROUNDTRIP-TSX-SIDECAR (commit ed8fedb2c). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.906Z
aliases: reference_post_ship_hurco-vm30i-full-psn-ms0-u-hurco-roundtrip-tsx-sidecar
---


# HURCO-VM30I-FULL-PSN-MS0/U-HURCO-ROUNDTRIP-TSX-SIDECAR

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HURCO-VM30I-FULL-PSN-MS0]/U-HURCO-ROUNDTRIP-TSX-SIDECAR (slot:echo iter11 2026-05-24): UNBLOCK roundtrip end-to-end. Sidecar scripts/hurco-jmdie-roundtrip.ts is the actual TS payload; wrapper .mjs just spawns 'npx tsx <ts-file>' with shell:true (no inline -e payload, no quoting trap). FIRST SUCCESSFUL JM-DIE ROUNDTRIP: 1001.hnc parsed 4 ops via new inline-G-code path → V11 re-emit 218 lines (5.6K) with full UltiMotion smoothing (G05.3 P35) + tool length comp + spindle ramp + WCS. Re-emit at state/shared/hurco-jmdie-roundtrip-tsx/reemit/1001.reemit.hnc - OPERATOR CAN LOAD THIS IN WINMAX RIGHT NOW. Other 2 files (0520396.hnc, SACMA CUTOFF.hnc) still no_ops - their annotation patterns differ from 1001.hnc; tunes-as-discovered in HURCO-PARSER-MS1.

**Shipped:** 2026-05-24T22:42:45-05:00 by markjvillanueva3-cloud
**Files:** 6 touched

Full distillation: [[hurco-vm30i-full-psn-ms0-u-hurco-roundtrip-tsx-sidecar]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._