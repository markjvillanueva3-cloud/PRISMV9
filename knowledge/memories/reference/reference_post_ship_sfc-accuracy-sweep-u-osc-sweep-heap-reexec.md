---
name: reference_post_ship_sfc-accuracy-sweep-u-osc-sweep-heap-reexec
description: Auto-distilled learnings from shipping SFC-ACCURACY-SWEEP/U-OSC-SWEEP-HEAP-REEXEC (commit a9d69a1a7). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.029Z
aliases: reference_post_ship_sfc-accuracy-sweep-u-osc-sweep-heap-reexec
---


# SFC-ACCURACY-SWEEP/U-OSC-SWEEP-HEAP-REEXEC

[MAIN-FORCE] [SFC-ACCURACY-SWEEP]/U-OSC-SWEEP-HEAP-REEXEC (slot:oscar): bake 32GB heap headroom into the full-mode sweep so a bare/tsx launch no longer OOMs. Full mode = 69,120 cells x 4 materials = 276,480 comparisons; the default ~2GB heap FATAL-OOMs mid-stream at ~165,656 rows (verified this session). New shared scripts/lib/sweep-heap-reexec.mjs mirrors tsx-reexec-guard but keys on the HEAP flag, so it fires under npx-tsx too (where the tsx guard no-ops and cannot add heap). 9/9 unit tests + wired before the tsx re-exec (NODE_OPTIONS inheritance). prod-mode no-op (smoke: 576 rows, 0 errors). Knob PRISM_SFC_SWEEP_HEAP_MB (default 32768), breaker PRISM_SFC_SWEEP_HEAP_REEXEC, opt-out PRISM_SFC_SWEEP_NO_HEAP_REEXEC. Sibling sweeps (sfc-all-axis/parallel-combo) can adopt (R15).

**Shipped:** 2026-06-25T04:39:36-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[sfc-accuracy-sweep-u-osc-sweep-heap-reexec]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._