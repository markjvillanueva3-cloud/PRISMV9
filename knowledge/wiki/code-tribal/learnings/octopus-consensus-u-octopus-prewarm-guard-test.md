# OCTOPUS-CONSENSUS/U-OCTOPUS-PREWARM-GUARD-TEST — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OCTOPUS-CONSENSUS]/U-OCTOPUS-PREWARM-GUARD-TEST (slot:bravo): make runLive prewarm wiring directly testable + cover it

**Commit:** `bb3503a5b875` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T05:23:10-05:00
**Tags:** octopus-consensus, u-octopus-prewarm-guard-test, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OCTOPUS-CONSENSUS]/U-OCTOPUS-PREWARM-GUARD-TEST (slot:bravo): make runLive prewarm wiring directly testable + cover it

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OCTOPUS-CONSENSUS]/U-OCTOPUS-PREWARM-GUARD-TEST (slot:bravo): make runLive prewarm wiring directly testable + cover it

Closes the P2 reviewer B flagged on U-OCTOPUS-2VOICE-PREWARM: the runLive prewarm
integration (the guard branch) had no direct test, and the old guard coupled
prewarm-skip to dispatch-injection (typeof args.dispatch !== function) which made
the called-on-live case untestable.

REFACTOR (R7 surgical): the dispatch-injection check moves from the GUARD to the
prewarm DEFAULT selection -- default is the real prewarmPanel on a live run, a no-op
when a test injects its own dispatch (so every existing hermetic test stays
network-free without each injecting a prewarm). An explicit args.prewarm overrides
both, so a test can assert prewarm IS called. Guard is now just !dry + diverse panel.

TEST: +2 -- prewarm fired with the co-resident panel STRICTLY before dispatch
(order asserted), and dry-mode skips prewarm. The no-op default is proven by all 20
pre-existing runner tests staying green (they inject dispatch, no prewarm, no network).
22/22 runner. No engine/dist change.
```

## Files touched (3)
- scripts/octopus-first-live-record.mjs      | 20 +++++++++++++-------
- scripts/octopus-first-live-record.test.mjs | 34 ++++++++++++++++++++++++++++++++++
- 2 files changed, 47 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bb3503a5b875`
- Milestone envelope: `mcp-server/data/milestones/OCTOPUS-CONSENSUS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._