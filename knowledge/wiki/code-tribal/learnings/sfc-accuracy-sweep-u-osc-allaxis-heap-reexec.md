# SFC-ACCURACY-SWEEP/U-OSC-ALLAXIS-HEAP-REEXEC — [MAIN-FORCE] [SFC-ACCURACY-SWEEP]/U-OSC-ALLAXIS-HEAP-REEXEC (slot:oscar): R15 apply-to-siblings -- wire the shared sweep-heap-reexec guard into sfc-all-axis-sweep.mjs (--mode full = full-enum factorial, Blackwell scale = the SAME exhaustive-sweep OOM class). Completes R15 for U-OSC-SWEEP-HEAP-REEXEC: the build-once helper now serves both SFC exhaustive sweeps. no-op for core mode (smoke: 262 OAT + 3888 factorial, 0 errors). NOTE follow-up: sfc-parallel-combo-sweep.mjs has an inline 2GB heap (no real headroom) -- verify whether its per-worker model needs the shared guard too.

**Commit:** `8270b39ab41d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T04:54:08-05:00
**Tags:** sfc-accuracy-sweep, u-osc-allaxis-heap-reexec, auto-distilled

## Subject
[MAIN-FORCE] [SFC-ACCURACY-SWEEP]/U-OSC-ALLAXIS-HEAP-REEXEC (slot:oscar): R15 apply-to-siblings -- wire the shared sweep-heap-reexec guard into sfc-all-axis-sweep.mjs (--mode full = full-enum factorial, Blackwell scale = the SAME exhaustive-sweep OOM class). Completes R15 for U-OSC-SWEEP-HEAP-REEXEC: the build-once helper now serves both SFC exhaustive sweeps. no-op for core mode (smoke: 262 OAT + 3888 factorial, 0 errors). NOTE follow-up: sfc-parallel-combo-sweep.mjs has an inline 2GB heap (no real headroom) -- verify whether its per-worker model needs the shared guard too.

## Body
```
[MAIN-FORCE] [SFC-ACCURACY-SWEEP]/U-OSC-ALLAXIS-HEAP-REEXEC (slot:oscar): R15 apply-to-siblings -- wire the shared sweep-heap-reexec guard into sfc-all-axis-sweep.mjs (--mode full = full-enum factorial, Blackwell scale = the SAME exhaustive-sweep OOM class). Completes R15 for U-OSC-SWEEP-HEAP-REEXEC: the build-once helper now serves both SFC exhaustive sweeps. no-op for core mode (smoke: 262 OAT + 3888 factorial, 0 errors). NOTE follow-up: sfc-parallel-combo-sweep.mjs has an inline 2GB heap (no real headroom) -- verify whether its per-worker model needs the shared guard too.
```

## Files touched (2)
- mcp-server/scripts/sfc-all-axis-sweep.mjs | 8 ++++++++
- 1 file changed, 8 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8270b39ab41d`
- Milestone envelope: `mcp-server/data/milestones/SFC-ACCURACY-SWEEP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._