# ECHO-WINMAX/U-POST-TRAINING-HARNESS — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-POST-TRAINING-HARNESS: corpus-driven multi-machine post-training loop + restore lost --structural (P1-d)

**Commit:** `5d7cb7ac71eb` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T20:50:19-05:00
**Tags:** echo-winmax, u-post-training-harness, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-POST-TRAINING-HARNESS: corpus-driven multi-machine post-training loop + restore lost --structural (P1-d)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-POST-TRAINING-HARNESS: corpus-driven multi-machine post-training loop + restore lost --structural (P1-d)

Training substrate to perfect both Hurco posts + generalize to Haas/Okuma (incl. LB3000/Multus +
WinMax Lathe). Generalizes single-job post-closed-loop into a CORPUS- and POST-parameterized scored
loop. MCP-independent score-existing mode works NOW; live-generate plugs in when :3100 is up.

- post-training-harness.mjs: scoreJob/buildScorecard (pure) + lintFile/structuralFile (compose the
  existing dialect-lint[14 dialects] + conformance --structural via injectable child runner) +
  scoreExisting. Per-post scorecard (jobs pass / lint E+W / structural score + deviation punch-list)
  + per-post ledger. A post is PERFECT = every job structural-100% + 0 lint ERRORs.
- post-training-corpus.json: 7 posts (hurco-v11-standalone, hurco-v11-agi, haas-vf2, okuma-genos-osp,
  hurco-winmax-lathe, okuma-lb3000-lathe, okuma-multus-millturn) + 3 jobs. action names verified vs
  camDispatcher; unverified flagged. Lathe posts route cut-physics/safety to whiskey.
- RESTORED checkStructural + --structural (P1-d) — LOST in a prior tangled multi-edit turn (was 0 in
  HEAD AND working file; the hars 0/7-empty bug surfaced it). +6 structural conformance tests.
- Harness parser bugs fixed (R12, caught by 0/7-empty result): parse WHOLE pretty-printed stdout (not
  last line = "}"); read lint counts from results[0].counts.{ERROR,WARN}.

FIRST TRAINING SCORECARD: hurco-v11-standalone = 97/97 jobs PERFECT (structural 100%, 0 lint ERRORs;
97 feed-no-feedmode WARNs = advisory P2-a). The known-good Hurco mill post is confirmed perfect.
39 tests (harness + conformance). WinMax Lathe = best lathe live-test target (operator: on-site;
copy-modify the mill winmax-bridge driver — driver attaches by process name).
```

## Files touched (6)
- scripts/post-nc-conformance.mjs                      |  45 +++++++++++++++++++++++++++++++
- scripts/post-nc-conformance.test.mjs                 |  40 ++++++++++++++++++++++++++-
- scripts/post-training-harness.mjs                    | 186 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/post-training-harness.test.mjs               |  93 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/post-training/post-training-corpus.json | 119 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 5 files changed, 482 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5d7cb7ac71eb`
- Milestone envelope: `mcp-server/data/milestones/ECHO-WINMAX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._