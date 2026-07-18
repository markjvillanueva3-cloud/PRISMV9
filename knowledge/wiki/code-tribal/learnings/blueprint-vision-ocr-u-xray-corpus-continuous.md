# BLUEPRINT-VISION-OCR/U-XRAY-CORPUS-CONTINUOUS — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-CORPUS-CONTINUOUS (slot:xray): OCR corpus-train nightly -> do-it-all-until-complete

**Commit:** `8cfd4da1301a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T10:08:05-05:00
**Tags:** blueprint-vision-ocr, u-xray-corpus-continuous, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-CORPUS-CONTINUOUS (slot:xray): OCR corpus-train nightly -> do-it-all-until-complete

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-CORPUS-CONTINUOUS (slot:xray): OCR corpus-train nightly -> do-it-all-until-complete

Operator: "change from nightly to do it all until its complete."

ROOT: the WEAK-LABEL loop in blueprint-ocr-training-loop.mjs has NO internal
time budget -- one launch already drains the ENTIRE remaining worklist. What
capped it at ~700/night was the task's 12h ExecutionTimeLimit + a daily-only
trigger, NOT the runner. So this is mostly an installer change.

CHANGES (5 files, shared-tree SYSTEM-task runtime -> MAIN-FORCE):
- install-ocr-training-loop-task.ps1: new -Continuous mode -> ExecutionTimeLimit
  = PT0S (unlimited, one run grinds for days) + a 30-min backstop repetition
  (P3650D) starting now+2min + MultipleInstances=IgnoreNew (death auto-resumes
  from processed-cursor.jsonl within 30min; never two grinders on one cursor).
- run-ocr-training-loop-overnight.ps1: pass --until-complete.
- blueprint-ocr-training-loop.mjs: --until-complete fast-exit -- a backstop
  relaunch on an ALREADY-DRAINED corpus exits 0 BEFORE the 24-print calibration
  (no wasted GPU once done). Reuses the pure partition core. No behavior change
  when the flag is absent.
- ocr-training-loop-lib.mjs: pure isCorpusDrained(worklist, done) helper.
- ocr-training-loop-lib.test.mjs: +2 tests (drained TRUE only when worklist
  non-empty AND all distinct prints cursored; empty/blank worklist never
  'drained'; adversarial nulls). 23/23 pass.

LIVE-VALIDATED: task State=Running, ExecTimeLimit=PT0S, Repetition=PT30M/P3650D,
MultipleInstances=IgnoreNew; cursor advancing 1157->1168 on real JM prints.
Full 7,419-print drawing corpus now grinds to completion (~2-3 days) instead of
~11 nights; backstop hands off when the current 12h-limit instance ends.
```

## Files touched (6)
- .claude/helpers/install-ocr-training-loop-task.ps1 | 32 +++++++++++++++++++++++++-------
- scripts/blueprint-ocr-training-loop.mjs            | 29 +++++++++++++++++++++++++++++
- scripts/lib/ocr-training-loop-lib.mjs              | 16 ++++++++++++++++
- scripts/lib/ocr-training-loop-lib.test.mjs         | 24 ++++++++++++++++++++++++
- scripts/run-ocr-training-loop-overnight.ps1        | 18 ++++++++++++------
- 5 files changed, 106 insertions(+), 13 deletions(-)

## Lessons surfaced in commit body
- til-complete
- til its complete."
- til-complete.
- til-complete fast-exit -- a backstop

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8cfd4da1301a`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._