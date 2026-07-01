# JM-DIE-LATHE-UPGRADE-MS0/U-OUTCOME-CAPTURE-DISABLE-KNOB — [MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-OUTCOME-CAPTURE-DISABLE-KNOB (slot:whiskey iter12): PRISM_OUTCOME_CAPTURE_DISABLE=1 short-circuits recordOutcome to no-op success. [BOOTSTRAP-SLOT-ENFORCE] mid-/loop. Closes 52x throughput bottleneck for high-volume batch jobs (V2 lathe corpus regen 918k variants) where peer-chat contention on per-domain .jsonl rename-into-place atomic-append causes serial EPERM stalls. Honors 'never block, never throw' bus contract. Re-enable per-session by unsetting env.

**Commit:** `5775f3686733` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T12:48:42-05:00
**Tags:** jm-die-lathe-upgrade-ms0, u-outcome-capture-disable-knob, auto-distilled

## Subject
[MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-OUTCOME-CAPTURE-DISABLE-KNOB (slot:whiskey iter12): PRISM_OUTCOME_CAPTURE_DISABLE=1 short-circuits recordOutcome to no-op success. [BOOTSTRAP-SLOT-ENFORCE] mid-/loop. Closes 52x throughput bottleneck for high-volume batch jobs (V2 lathe corpus regen 918k variants) where peer-chat contention on per-domain .jsonl rename-into-place atomic-append causes serial EPERM stalls. Honors 'never block, never throw' bus contract. Re-enable per-session by unsetting env.

## Body
```
[MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-OUTCOME-CAPTURE-DISABLE-KNOB (slot:whiskey iter12): PRISM_OUTCOME_CAPTURE_DISABLE=1 short-circuits recordOutcome to no-op success. [BOOTSTRAP-SLOT-ENFORCE] mid-/loop. Closes 52x throughput bottleneck for high-volume batch jobs (V2 lathe corpus regen 918k variants) where peer-chat contention on per-domain .jsonl rename-into-place atomic-append causes serial EPERM stalls. Honors 'never block, never throw' bus contract. Re-enable per-session by unsetting env.
```

## Files touched (2)
- mcp-server/src/engines/OutcomeCaptureBusEngine.ts | 22 ++++++++++++++++++++++
- 1 file changed, 22 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5775f3686733`
- Milestone envelope: `mcp-server/data/milestones/JM-DIE-LATHE-UPGRADE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._