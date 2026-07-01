# MEMORY-WIKI-OPTIMIZATION-MS0/U-MWO08 — [MAIN] [MEMORY-WIKI-OPTIMIZATION-MS0]/U-MWO08 (slot:bravo iter19): NEW scripts/measure-userpromptsubmit-budget.mjs + .test.mjs — per-prompt injection budget measurement (≤3 KB target per spec). Scans H:/.claude/settings.json hooks.UserPromptSubmit[].hooks for node-invoked .mjs/.cjs/.js scripts, probes each with stdin {prompt:PROBE}, measures hookSpecificOutput.additionalContext byte size (falls back to systemMessage). Reports total + over-by + top-5 consumers + per-script failure breakdown. Pure-fn separation: extractUserPromptHooks (regex tolerates quoted paths) + parseHookOutput (UTF-8 byte counting for emoji-aware) + buildBudgetReport (zero-byte exclusion from topConsumers) + renderReport + loadSettings as separately testable. 17/17 PASS hermetic (1 BUDGET_BYTES constant + 3 extractUserPromptHooks + 5 parseHookOutput + 4 buildBudgetReport + 2 renderReport + 2 loadSettings). Exit codes: 0 within budget, 1 over budget, 2 runtime error — usable as a CI gate in future. Measurement-only this ship; enforcement HARD cap left as follow-up so operators see the data first per Karpathy R12. Spec source: state/shared/specs/MEMORY-WIKI-OPTIMIZATION-2026-05-26.md U-MWO08.

**Commit:** `30edfae7aabb` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T20:13:06-05:00
**Tags:** memory-wiki-optimization-ms0, u-mwo08, auto-distilled

## Subject
[MAIN] [MEMORY-WIKI-OPTIMIZATION-MS0]/U-MWO08 (slot:bravo iter19): NEW scripts/measure-userpromptsubmit-budget.mjs + .test.mjs — per-prompt injection budget measurement (≤3 KB target per spec). Scans H:/.claude/settings.json hooks.UserPromptSubmit[].hooks for node-invoked .mjs/.cjs/.js scripts, probes each with stdin {prompt:PROBE}, measures hookSpecificOutput.additionalContext byte size (falls back to systemMessage). Reports total + over-by + top-5 consumers + per-script failure breakdown. Pure-fn separation: extractUserPromptHooks (regex tolerates quoted paths) + parseHookOutput (UTF-8 byte counting for emoji-aware) + buildBudgetReport (zero-byte exclusion from topConsumers) + renderReport + loadSettings as separately testable. 17/17 PASS hermetic (1 BUDGET_BYTES constant + 3 extractUserPromptHooks + 5 parseHookOutput + 4 buildBudgetReport + 2 renderReport + 2 loadSettings). Exit codes: 0 within budget, 1 over budget, 2 runtime error — usable as a CI gate in future. Measurement-only this ship; enforcement HARD cap left as follow-up so operators see the data first per Karpathy R12. Spec source: state/shared/specs/MEMORY-WIKI-OPTIMIZATION-2026-05-26.md U-MWO08.

## Body
```
[MAIN] [MEMORY-WIKI-OPTIMIZATION-MS0]/U-MWO08 (slot:bravo iter19): NEW scripts/measure-userpromptsubmit-budget.mjs + .test.mjs — per-prompt injection budget measurement (≤3 KB target per spec). Scans H:/.claude/settings.json hooks.UserPromptSubmit[].hooks for node-invoked .mjs/.cjs/.js scripts, probes each with stdin {prompt:PROBE}, measures hookSpecificOutput.additionalContext byte size (falls back to systemMessage). Reports total + over-by + top-5 consumers + per-script failure breakdown. Pure-fn separation: extractUserPromptHooks (regex tolerates quoted paths) + parseHookOutput (UTF-8 byte counting for emoji-aware) + buildBudgetReport (zero-byte exclusion from topConsumers) + renderReport + loadSettings as separately testable. 17/17 PASS hermetic (1 BUDGET_BYTES constant + 3 extractUserPromptHooks + 5 parseHookOutput + 4 buildBudgetReport + 2 renderReport + 2 loadSettings). Exit codes: 0 within budget, 1 over budget, 2 runtime error — usable as a CI gate in future. Measurement-only this ship; enforcement HARD cap left as follow-up so operators see the data first per Karpathy R12. Spec source: state/shared/specs/MEMORY-WIKI-OPTIMIZATION-2026-05-26.md U-MWO08.
```

## Files touched (3)
- scripts/measure-userpromptsubmit-budget.mjs      | 166 +++++++++++++++++++++
- scripts/measure-userpromptsubmit-budget.test.mjs | 182 +++++++++++++++++++++++
- 2 files changed, 348 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 30edfae7aabb`
- Milestone envelope: `mcp-server/data/milestones/MEMORY-WIKI-OPTIMIZATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._