# RGS-TOOL-AUTOINVOKE-MS1/U-LIMA-A7 — [MAIN] [RGS-TOOL-AUTOINVOKE-MS1]/U-LIMA-A7 close-out (slot:lima): queue flip + wiki entry

**Commit:** `368581904f0f` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T20:07:40-05:00
**Tags:** rgs-tool-autoinvoke-ms1, u-lima-a7, auto-distilled

## Subject
[MAIN] [RGS-TOOL-AUTOINVOKE-MS1]/U-LIMA-A7 close-out (slot:lima): queue flip + wiki entry

## Body
```
[MAIN] [RGS-TOOL-AUTOINVOKE-MS1]/U-LIMA-A7 close-out (slot:lima): queue flip + wiki entry

A7 build shipped 1e82525ee3 (RGS confidence calibration adapter — 32 tests
incl. 3 real-data E2E, 27/27 planner regression, 9/9 signal-fusion). This
commit closes the unit administratively:

  - state/shared/slot-task-queues.json: U-LIMA-A7-CALIBRATION
    status pending -> completed, completed_at + closed_by + shipped_note.
  - knowledge/wiki/architecture/rgs-calibration-adapter.md NEW: architecture
    wiki covering mechanism, >=50 join-sample gate, the calibrate-on-
    calibrated feedback-loop fix (planner stamps plan.rawConfidence;
    joinConfidences prefers rawConfidence over confidence so fit-domain ==
    apply-domain == raw, run over run), graceful degradation, verification.

The "persist the raw pre-correction input separately" pattern is the
generalizable lesson — any calibration/correction that writes its output back
to the same store it later reads as training data fits on its own output
without it.

7/8 LIMA-ROSTER units done. Remaining: A8 U-TRANSFER-PRIORS (xproc_transfer_*
cross-milestone priors).
```

## Files touched (4)
- .../wiki/architecture/rgs-calibration-adapter.md   | 68 ++++++++++++++++++++++
- knowledge/wiki/os/pipelines/program-perfect.md     |  2 +-
- state/shared/slot-task-queues.json                 |  7 ++-
- 3 files changed, 74 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- lesson — any calibration/correction that writes its output back

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 368581904f0f`
- Milestone envelope: `mcp-server/data/milestones/RGS-TOOL-AUTOINVOKE-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._