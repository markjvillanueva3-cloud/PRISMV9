# ECHO-WINMAX/U-CLOSED-LOOP-CORRECT — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-CLOSED-LOOP-CORRECT: close the loop — deviation-driven regenerate-better leg

**Commit:** `87d426f86e01` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T01:58:52-05:00
**Tags:** echo-winmax, u-closed-loop-correct, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-CLOSED-LOOP-CORRECT: close the loop — deviation-driven regenerate-better leg

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-CLOSED-LOOP-CORRECT: close the loop — deviation-driven regenerate-better leg

Completes the self-improving closed loop. post-closed-loop-tick.mjs does verify->score->learn;
THIS is the regenerate-better leg that makes it self-improving: it consumes the conformance
deviation training-signal and produces a CORRECTED NC, then re-verifies to prove the score rose.

- post-closed-loop-correct.mjs: deriveCorrections (deviation -> {units|work-offset|spindle-speed}
  directive) + applyCorrections (block-scoped S edits, G21->G20, WCS fix) + correctOnce
  (verify -> correct -> re-verify, returns before/after/improved). Records BOTH iterations to the
  ledger so the improvement curve is durable.
- post-closed-loop-correct.test.mjs: 9 real-value tests (broken->100%, multi-deviation single pass,
  block-scoped speed fix, no-op on conforming).

DEMONSTRATED LIVE (injected post bugs into the RICH NC): T3 S8000->S5000 + G20->G21 ->
verify 87% (2 deviations: units, spindle-speed-T3) -> regenerate-better applies units->G20 +
T3 S5000->S8000 -> re-verify 100% IMPROVED. Ledger curve: 87% -> 100%.

This is the self-improving loop, not a one-shot check: a generation that drifts from the SFC/spec
math is detected, corrected from the exact (expected,actual) signal, and re-scored higher. Honest
scope: corrections apply the verified-correct spec value (= the post's job); MCP cam_speedfeed_compute
supplies the 'expected' live when up (task #6) — mechanism unchanged.
```

## Files touched (3)
- scripts/post-closed-loop-correct.mjs      | 140 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/post-closed-loop-correct.test.mjs |  84 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 224 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 87d426f86e01`
- Milestone envelope: `mcp-server/data/milestones/ECHO-WINMAX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._