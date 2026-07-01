# OSCAR-SFC-9AXIS-MS0/U-OSC-OUTCOMEBUS-EPERM-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-OUTCOMEBUS-EPERM-FIX (slot:oscar): fix data-spine EPERM leak — appendFileSync over read-rewrite-rename

**Commit:** `5ae481f748fe` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T12:35:54-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-outcomebus-eperm-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-OUTCOMEBUS-EPERM-FIX (slot:oscar): fix data-spine EPERM leak — appendFileSync over read-rewrite-rename

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-OUTCOMEBUS-EPERM-FIX (slot:oscar): fix data-spine EPERM leak — appendFileSync over read-rewrite-rename

OutcomeCaptureBus.atomicAppend did read-whole-90MB -> write-tmp -> renameSync on
EVERY single-line append. renameSync raced concurrent fleet readers on Windows
(ERROR_SHARING_VIOLATION -> EPERM): (a) silently dropped the outcome capture,
(b) orphaned the tmp -> 11,995 dead .tmp files in state/outcomes. The
speed_feed.jsonl ledger the closed-loop SFC<->HSMAdvisor<->GWizard calibration
depends on was dropping writes.

Fix: common path (<64KB, every JSONL row) -> fs.appendFileSync O_APPEND
(kernel-atomic at line granularity across fleet) + bounded 2/4/8ms retry on
transient EPERM/EBUSY/EAGAIN/EMFILE. Oversize fallback keeps tmp+fsync+rename
but GUARANTEES tmp cleanup on every failure branch. Fail-loud preserved
(persistent fail -> {ok:false} -> enqueueRetry). O(file^2) -> O(line) perf win.
Swept the 11,995 orphans (dir 151MB -> clean).

28/28 tests (6 new incl. fault-injected fallback proving no-orphan + fail-loud +
retry when renameSync throws EPERM). Pre-fix suite spewed EPERM lines; post-fix
silent. Per-file 2-reviewer scrutiny PASS 0 P0/P1, all P2 closed.

Bootstrap one-shot: shared-tree commit, slot-worktree cutover pending.
```

## Files touched (3)
- mcp-server/src/__tests__/OutcomeCaptureBusEngine.test.ts | 136 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/OutcomeCaptureBusEngine.ts        | 135 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++--------------
- 2 files changed, 245 insertions(+), 26 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5ae481f748fe`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._