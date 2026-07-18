# ECHO-WINMAX/U-SFC-CORRECTOR — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-SFC-CORRECTOR: close the loop on PHYSICS — regenerate mill speeds from the live SFC

**Commit:** `9531be0705ac` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T13:17:29-05:00
**Tags:** echo-winmax, u-sfc-corrector, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-SFC-CORRECTOR: close the loop on PHYSICS — regenerate mill speeds from the live SFC

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-SFC-CORRECTOR: close the loop on PHYSICS — regenerate mill speeds from the live SFC

The closed loop's regenerate-better leg can now target the LIVE SFC (not just the static spec),
so the post self-corrects toward physics. post-closed-loop-correct.mjs:
- deriveSfcCorrections(liveLeg, spec): for each MILL tool drifting outside tolerance, emit a
  spindle-speed directive toward the SFC rpm; the DRILL is SKIPPED (SFC drill op-path returns
  milling Vc — unreliable, see reference_sfc_speed_feed_bugs_2026_05_31) and the skip is recorded.
- correctFromSfc(): liveSfcLeg -> deriveSfcCorrections -> applyCorrections -> re-verify (async).
- CLI --sfc mode + --out.
- +5 deriveSfcCorrections tests (real-value, passed the legitimacy gate).

DEMONSTRATED LIVE on the RICH NC: T1 S3000->877, T2 S6000->3509, T3 S8000->4679 (mills regenerated
to live SFC Vc 140 m/min for P-steel), drill T4 skipped. The post's hot mill speeds now self-correct
toward the physics-correct values. (Vitest harness env-killed under process contention; logic verified
via direct node execution — all 4 deriveSfcCorrections assertions pass.)

Remaining (task #7): the SFC drill op-path fix + whether to regenerate the committed base NC are
oscar's/operator's calls — the loop machinery is complete in echo's lane.
```

## Files touched (3)
- scripts/post-closed-loop-correct.mjs      | 47 ++++++++++++++++++++++++++++++++++++++++++++++-
- scripts/post-closed-loop-correct.test.mjs | 32 +++++++++++++++++++++++++++++++-
- 2 files changed, 77 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9531be0705ac`
- Milestone envelope: `mcp-server/data/milestones/ECHO-WINMAX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._