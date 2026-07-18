# SFC-ACCURACY-SWEEP/U-OSC-SWEEP-HEAP-REEXEC — [MAIN-FORCE] [SFC-ACCURACY-SWEEP]/U-OSC-SWEEP-HEAP-REEXEC (slot:oscar): bake 32GB heap headroom into the full-mode sweep so a bare/tsx launch no longer OOMs. Full mode = 69,120 cells x 4 materials = 276,480 comparisons; the default ~2GB heap FATAL-OOMs mid-stream at ~165,656 rows (verified this session). New shared scripts/lib/sweep-heap-reexec.mjs mirrors tsx-reexec-guard but keys on the HEAP flag, so it fires under npx-tsx too (where the tsx guard no-ops and cannot add heap). 9/9 unit tests + wired before the tsx re-exec (NODE_OPTIONS inheritance). prod-mode no-op (smoke: 576 rows, 0 errors). Knob PRISM_SFC_SWEEP_HEAP_MB (default 32768), breaker PRISM_SFC_SWEEP_HEAP_REEXEC, opt-out PRISM_SFC_SWEEP_NO_HEAP_REEXEC. Sibling sweeps (sfc-all-axis/parallel-combo) can adopt (R15).

**Commit:** `a9d69a1a780d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T04:39:36-05:00
**Tags:** sfc-accuracy-sweep, u-osc-sweep-heap-reexec, auto-distilled

## Subject
[MAIN-FORCE] [SFC-ACCURACY-SWEEP]/U-OSC-SWEEP-HEAP-REEXEC (slot:oscar): bake 32GB heap headroom into the full-mode sweep so a bare/tsx launch no longer OOMs. Full mode = 69,120 cells x 4 materials = 276,480 comparisons; the default ~2GB heap FATAL-OOMs mid-stream at ~165,656 rows (verified this session). New shared scripts/lib/sweep-heap-reexec.mjs mirrors tsx-reexec-guard but keys on the HEAP flag, so it fires under npx-tsx too (where the tsx guard no-ops and cannot add heap). 9/9 unit tests + wired before the tsx re-exec (NODE_OPTIONS inheritance). prod-mode no-op (smoke: 576 rows, 0 errors). Knob PRISM_SFC_SWEEP_HEAP_MB (default 32768), breaker PRISM_SFC_SWEEP_HEAP_REEXEC, opt-out PRISM_SFC_SWEEP_NO_HEAP_REEXEC. Sibling sweeps (sfc-all-axis/parallel-combo) can adopt (R15).

## Body
```
[MAIN-FORCE] [SFC-ACCURACY-SWEEP]/U-OSC-SWEEP-HEAP-REEXEC (slot:oscar): bake 32GB heap headroom into the full-mode sweep so a bare/tsx launch no longer OOMs. Full mode = 69,120 cells x 4 materials = 276,480 comparisons; the default ~2GB heap FATAL-OOMs mid-stream at ~165,656 rows (verified this session). New shared scripts/lib/sweep-heap-reexec.mjs mirrors tsx-reexec-guard but keys on the HEAP flag, so it fires under npx-tsx too (where the tsx guard no-ops and cannot add heap). 9/9 unit tests + wired before the tsx re-exec (NODE_OPTIONS inheritance). prod-mode no-op (smoke: 576 rows, 0 errors). Knob PRISM_SFC_SWEEP_HEAP_MB (default 32768), breaker PRISM_SFC_SWEEP_HEAP_REEXEC, opt-out PRISM_SFC_SWEEP_NO_HEAP_REEXEC. Sibling sweeps (sfc-all-axis/parallel-combo) can adopt (R15).
```

## Files touched (4)
- mcp-server/scripts/lib/sweep-heap-reexec.mjs      | 120 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/scripts/lib/sweep-heap-reexec.test.mjs | 120 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/scripts/sfc-full-sweep-compare.mjs     |   9 +++++++++
- 3 files changed, 249 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a9d69a1a780d`
- Milestone envelope: `mcp-server/data/milestones/SFC-ACCURACY-SWEEP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._