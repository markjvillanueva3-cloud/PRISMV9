# BLACKWELL-AI-MS0/U-CALIB-GATE-SOURCE — [MAIN] [BLACKWELL-AI-MS0]/U-CALIB-GATE-SOURCE (slot:india): single-source the calibration-study gate constants from GATE_THRESHOLDS (close Arm-B P2 drift risk)

**Commit:** `cd8fcd615939` · **By:** markjvillanueva3-cloud · **At:** 2026-06-06T01:17:49-05:00
**Tags:** blackwell-ai-ms0, u-calib-gate-source, auto-distilled

## Subject
[MAIN] [BLACKWELL-AI-MS0]/U-CALIB-GATE-SOURCE (slot:india): single-source the calibration-study gate constants from GATE_THRESHOLDS (close Arm-B P2 drift risk)

## Body
```
[MAIN] [BLACKWELL-AI-MS0]/U-CALIB-GATE-SOURCE (slot:india): single-source the calibration-study gate constants from GATE_THRESHOLDS (close Arm-B P2 drift risk)

scripts/nn-graph-calibration-analysis.mjs re-inlined the deploy gate constants (Brier 0.15, macro-F1 0.55) instead of importing them from the canonical GATE_THRESHOLDS in nn-graph-eval.mjs — a drift risk if the gates ever change (Arm-B 3-of-3 P2). Now imports GATE_THRESHOLDS and defaults both gates from it (analyzeCalibration + the FINDING-2 verdict string). Explicit caller-supplied gates still override. Output is byte-identical today (the constants equal the prior literals — transparent dedup). +1 test locks the sourcing (out.gate === GATE_THRESHOLDS.brier). 13 calibration tests green.
```

## Files touched (3)
- scripts/nn-graph-calibration-analysis.mjs      | 14 ++++++++------
- scripts/nn-graph-calibration-analysis.test.mjs | 11 +++++++++++
- 2 files changed, 19 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- till override. Output is byte-identical today (the constants equal the prior literals — transparent dedup). +1 test locks the sourcing (out.gate === GATE_THRESHOLDS.brier). 13 calibration tests green.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cd8fcd615939`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-AI-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._