# FLEET-REAPER-MS3/U-FR-MS3-D — [MAIN] [FLEET-REAPER-MS3]/U-FR-MS3-D: reaper-self CPU priority guard

**Commit:** `97d60775ece2` · **By:** markjvillanueva3-cloud · **At:** 2026-05-19T21:20:19-05:00
**Tags:** fleet-reaper-ms3, u-fr-ms3-d, auto-distilled

## Subject
[MAIN] [FLEET-REAPER-MS3]/U-FR-MS3-D: reaper-self CPU priority guard

## Body
```
[MAIN] [FLEET-REAPER-MS3]/U-FR-MS3-D: reaper-self CPU priority guard

Drops the reaper process's CPU priority for the duration of a sweep so its
file-I/O does not compete with claude.exe for the disk-queue on a memory-
pressured host. Reversible (try/finally + beforeExit hook) and idempotent.

Honest scope (R12): spec proposed PROCESS_MODE_BACKGROUND_BEGIN (drops CPU
+ memory + I/O priority) but that flag can only be set from within the
process on its own handle and Node has no native SetPriorityClass binding.
v1 ships os.setPriority(0, PRIORITY_BELOW_NORMAL) — Windows BELOW_NORMAL_
PRIORITY_CLASS (0x4000). CPU-only drop; documented limitation in helper
header. Future native-ffi v2 could close the I/O priority gap.

Files:
- scripts/lib/reaper-self-io-priority.mjs (new, pure-injected, ~190 LOC)
- scripts/__tests__/fleet-reaper-self-bg-io.test.mjs (new, 14 cases,
  incl. real-process oracle spawning child node to assert priority drop)
- scripts/fleet-reaper-sweep.mjs (+import, try/finally wrap of runSweep)

Knobs: PRISM_FR_SELF_BG_IO_DISABLE=1 (kill switch) +
PRISM_FLEET_REAPER_DISABLE=1 (master, already fleet-wide).

Tests: 77/77 PASS across 4 fleet-reaper test files (self-bg-io + tier +
ballast + hunt). Per-file scrutiny: 2 reviewers PASS/PASS, 0 P0/P1.

Spec: state/shared/specs/FLEET-REAPER-MS3-CHAT-CAPACITY-DESIGN.md §U-FR-MS3-D
```

## Files touched (4)
- scripts/__tests__/fleet-reaper-self-bg-io.test.mjs | 218 +++++++++++++++++++++
- scripts/fleet-reaper-sweep.mjs                     |  27 +++
- scripts/lib/reaper-self-io-priority.mjs            | 199 +++++++++++++++++++
- 3 files changed, 444 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 97d60775ece2`
- Milestone envelope: `mcp-server/data/milestones/FLEET-REAPER-MS3.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._