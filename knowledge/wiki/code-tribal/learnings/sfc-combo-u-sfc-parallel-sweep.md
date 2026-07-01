# SFC-COMBO/U-SFC-PARALLEL-SWEEP — [MAIN-FORCE] [SFC-COMBO]/U-SFC-PARALLEL-SWEEP (slot:oscar): 32-thread parallel SFC combination sweep on the new hardware (server-boot-free)

**Commit:** `4f8085f5c12a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T15:24:51-05:00
**Tags:** sfc-combo, u-sfc-parallel-sweep, auto-distilled

## Subject
[MAIN-FORCE] [SFC-COMBO]/U-SFC-PARALLEL-SWEEP (slot:oscar): 32-thread parallel SFC combination sweep on the new hardware (server-boot-free)

## Body
```
[MAIN-FORCE] [SFC-COMBO]/U-SFC-PARALLEL-SWEEP (slot:oscar): 32-thread parallel SFC combination sweep on the new hardware (server-boot-free)

Genuinely USE the 9950X3D 32-thread host for the operator's combination tests.
The orchestrator batch-run is blocked (importing SpeedFeedOrchestratorEngine
boots the MCP server). This harness drives the LIGHT, server-free
UltimateSpeedFeedEngine (proven clean by sfc-combination-sweep.ts) across N
child processes, each computing every Nth combination of the 850,500-combo
cartesian product (iso x dia x flutes x tool_material x coolant x rigidity x
operation x strategy x optimize_for). Reports per-worker + aggregate throughput.

LIVE: --workers 24 ran the FULL 850,500 combos, 100% OK (0 err), 87.6s wall,
global Vc 1.3..1660 m/min (1277x variability). Per-worker heap bump + tsx-worker
NODE_OPTIONS inheritance (same fix class as U-SFC-SWEEP-WORKER-HEAP). Read-only
(no engine change). Follow-up: tune worker count (405 cells/s/thread at 24 vs
1933 at 4 = memory/cache contention); persist JSONL + feed GPU/LoRA training.
```

## Files touched (2)
- mcp-server/scripts/sfc-parallel-combo-sweep.mjs | 141 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 141 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4f8085f5c12a`
- Milestone envelope: `mcp-server/data/milestones/SFC-COMBO.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._