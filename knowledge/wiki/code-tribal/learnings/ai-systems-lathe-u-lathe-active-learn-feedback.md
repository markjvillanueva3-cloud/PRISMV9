# AI-SYSTEMS-LATHE/U-LATHE-ACTIVE-LEARN-FEEDBACK — [MAIN-FORCE] [AI-SYSTEMS-LATHE]/U-LATHE-ACTIVE-LEARN-FEEDBACK (slot:india): close the lathe active-learning loop -- wire processOperatorFeedback + calibrateModelConfidence to prism_turning

**Commit:** `2e1cd3ac7d19` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T08:37:05-05:00
**Tags:** ai-systems-lathe, u-lathe-active-learn-feedback, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-LATHE]/U-LATHE-ACTIVE-LEARN-FEEDBACK (slot:india): close the lathe active-learning loop -- wire processOperatorFeedback + calibrateModelConfidence to prism_turning

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-LATHE]/U-LATHE-ACTIVE-LEARN-FEEDBACK (slot:india): close the lathe active-learning loop -- wire processOperatorFeedback + calibrateModelConfidence to prism_turning

The query-side (select/update/uncertainty/committee) was wired but the ACTUALS-side had no dispatcher surface, so the Platt/ECE calibration path was dead-letter. Adds 2 actions: lathe_active_learning_feedback (operator returns observed quality -> processOperatorFeedback) + lathe_active_learning_calibrate (calibrateModelConfidence). Mirrors the existing lathe_active_learning_* pattern; generic params + inline validation; {success,data/error} returns. Round-trip test 4/4 (routing proof == singleton direct call, fallback echoes operator values, missing-param rejected, calibrate deterministic). build:fast clean. First of the verified open-learning-loops backlog (reference_open_learning_loops_backlog_2026_06_22).
```

## Files touched (3)
- mcp-server/src/__tests__/dispatcher.latheActiveLearningFeedback.test.ts | 97 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/turningDispatcher.ts                   | 23 ++++++++++++++
- 2 files changed, 120 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2e1cd3ac7d19`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-LATHE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._