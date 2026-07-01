# SFC-ACCURACY/U-OSC-TSX-GUARD-VITEST-NOOP — [MAIN-FORCE] [SFC-ACCURACY]/U-OSC-TSX-GUARD-VITEST-NOOP (slot:oscar): tsx-reexec guard must no-op under vitest -- a guarded sweep .mjs imported from a *.test.ts killed the suite

**Commit:** `0d95de42866a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T17:02:20-05:00
**Tags:** sfc-accuracy, u-osc-tsx-guard-vitest-noop, auto-distilled

## Subject
[MAIN-FORCE] [SFC-ACCURACY]/U-OSC-TSX-GUARD-VITEST-NOOP (slot:oscar): tsx-reexec guard must no-op under vitest -- a guarded sweep .mjs imported from a *.test.ts killed the suite

## Body
```
[MAIN-FORCE] [SFC-ACCURACY]/U-OSC-TSX-GUARD-VITEST-NOOP (slot:oscar): tsx-reexec guard must no-op under vitest -- a guarded sweep .mjs imported from a *.test.ts killed the suite

src/__tests__/sfcAllAxisSweep.test.ts (13 real it() blocks -- the SFC material-blindness regression guard +
axis-liveness spreads) failed under vitest with "no tests" + "process.exit unexpectedly called with 0". Root
cause: it imports runOAT/AXES from scripts/sfc-all-axis-sweep.mjs, whose module-load reexecUnderTsxIfNeeded()
runs BEFORE the INVOKED_DIRECTLY guard. Under vitest the process is not under tsx, so planTsxReexec returned
reexec:true -> the guard spawned a child and terminated the worker mid-collection (child status 0 -> the
"exit 0" symptom). vitest already provides a TS-aware (esbuild) loader, so relaunching under tsx is both
unnecessary and harmful there.

FIX (shared, one place -- R7/R8): planTsxReexec short-circuits to {reexec:false, reason:"under-vitest"} when
env.VITEST || env.VITEST_WORKER_ID is set. CLI bare-node usage is UNCHANGED (VITEST unset there -> still
relaunches under tsx as before); only the in-test import path is fixed. Covers every sibling sweep imported
from a *.test.ts (sfc-all-axis-sweep, sfc-full-sweep-compare, ...) in the single shared guard.

VALIDATION: sfcAllAxisSweep.test.ts 0->12 passing (was "no tests"); VITEST env signal confirmed empirically by
the collection succeeding. No test asserts the guard's under-vitest behavior (grepped -- none exists), so no
regression. The guard's real purpose (relaunch a bare-node .mjs->.ts under tsx) is untouched for CLI runs.
```

## Files touched (2)
- mcp-server/scripts/lib/tsx-reexec-guard.mjs | 6 ++++++
- 1 file changed, 6 insertions(+)

## Lessons surfaced in commit body
- till

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0d95de42866a`
- Milestone envelope: `mcp-server/data/milestones/SFC-ACCURACY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._