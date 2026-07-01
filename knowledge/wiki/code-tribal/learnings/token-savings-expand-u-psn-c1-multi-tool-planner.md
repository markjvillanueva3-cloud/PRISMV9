# TOKEN-SAVINGS-EXPAND/U-PSN-C1-MULTI-TOOL-PLANNER — [MAIN] [TOKEN-SAVINGS-EXPAND]/U-PSN-C1-MULTI-TOOL-PLANNER (slot:alpha): UserPromptSubmit nudge for multi-tool prompts. Detects 'audit the entire X', 'for each Y', 'ship all remaining Z', numeric magnitude (50 files, dozens of engines) → suggests Agent dispatch with isolation:worktree instead of N inline tool calls. Saves per-tool hook-stack overhead × N. 13/13 tests. Knob: PRISM_MULTI_TOOL_PLANNER_DISABLE=1.

**Commit:** `b16372c4d56b` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T19:48:48-05:00
**Tags:** token-savings-expand, u-psn-c1-multi-tool-planner, auto-distilled

## Subject
[MAIN] [TOKEN-SAVINGS-EXPAND]/U-PSN-C1-MULTI-TOOL-PLANNER (slot:alpha): UserPromptSubmit nudge for multi-tool prompts. Detects 'audit the entire X', 'for each Y', 'ship all remaining Z', numeric magnitude (50 files, dozens of engines) → suggests Agent dispatch with isolation:worktree instead of N inline tool calls. Saves per-tool hook-stack overhead × N. 13/13 tests. Knob: PRISM_MULTI_TOOL_PLANNER_DISABLE=1.

## Body
```
[MAIN] [TOKEN-SAVINGS-EXPAND]/U-PSN-C1-MULTI-TOOL-PLANNER (slot:alpha): UserPromptSubmit nudge for multi-tool prompts. Detects 'audit the entire X', 'for each Y', 'ship all remaining Z', numeric magnitude (50 files, dozens of engines) → suggests Agent dispatch with isolation:worktree instead of N inline tool calls. Saves per-tool hook-stack overhead × N. 13/13 tests. Knob: PRISM_MULTI_TOOL_PLANNER_DISABLE=1.
```

## Files touched (3)
- .../userprompt-multi-tool-planner-nudge.test.mjs   | 72 +++++++++++++++++
- .../hooks/userprompt-multi-tool-planner-nudge.mjs  | 90 ++++++++++++++++++++++
- 2 files changed, 162 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b16372c4d56b`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-EXPAND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._