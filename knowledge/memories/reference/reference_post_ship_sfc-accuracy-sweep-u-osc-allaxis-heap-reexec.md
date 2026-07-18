---
name: reference_post_ship_sfc-accuracy-sweep-u-osc-allaxis-heap-reexec
description: Auto-distilled learnings from shipping SFC-ACCURACY-SWEEP/U-OSC-ALLAXIS-HEAP-REEXEC (commit 8270b39ab). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.029Z
aliases: reference_post_ship_sfc-accuracy-sweep-u-osc-allaxis-heap-reexec
---


# SFC-ACCURACY-SWEEP/U-OSC-ALLAXIS-HEAP-REEXEC

[MAIN-FORCE] [SFC-ACCURACY-SWEEP]/U-OSC-ALLAXIS-HEAP-REEXEC (slot:oscar): R15 apply-to-siblings -- wire the shared sweep-heap-reexec guard into sfc-all-axis-sweep.mjs (--mode full = full-enum factorial, Blackwell scale = the SAME exhaustive-sweep OOM class). Completes R15 for U-OSC-SWEEP-HEAP-REEXEC: the build-once helper now serves both SFC exhaustive sweeps. no-op for core mode (smoke: 262 OAT + 3888 factorial, 0 errors). NOTE follow-up: sfc-parallel-combo-sweep.mjs has an inline 2GB heap (no real headroom) -- verify whether its per-worker model needs the shared guard too.

**Shipped:** 2026-06-25T04:54:08-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[sfc-accuracy-sweep-u-osc-allaxis-heap-reexec]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._