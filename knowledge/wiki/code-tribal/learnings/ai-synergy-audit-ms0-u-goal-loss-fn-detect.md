# AI-SYNERGY-AUDIT-MS0/U-GOAL-LOSS-FN-DETECT — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-GOAL-LOSS-FN-DETECT (slot:tango): deterministic unbounded-/goal detector -> targeted loss-function nudge in /goal pre-flight

**Commit:** `7b8dbde2dd00` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T11:15:09-05:00
**Tags:** ai-synergy-audit-ms0, u-goal-loss-fn-detect, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-GOAL-LOSS-FN-DETECT (slot:tango): deterministic unbounded-/goal detector -> targeted loss-function nudge in /goal pre-flight

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-GOAL-LOSS-FN-DETECT (slot:tango): deterministic unbounded-/goal detector -> targeted loss-function nudge in /goal pre-flight

Applies the agent-loop-article learning (Elvis @elvissun '/goal + Loss Functions') the
operator asked to apply fleet-wide: a /goal needs a MEASURABLE acceptance criterion, not
unbounded prose. The /goal pre-flight already injected a STATIC 'bound the loop' reminder
on every /goal -- but a static always-on reminder becomes wallpaper (this session: it fired
~15x and the unbounded-prose spiral happened anyway).

NET-NEW (not a dup of the static block): scripts/lib/goal-loss-function-detect.mjs -- a pure
deterministic classifier (R5: code, not LLM re-judgment) that fires a TARGETED loss-function
nudge ONLY when the goal text is open-ended prose with NO measurable check. Conservative:
fires only when NO check signal AND an open-ended verb are present.

WIRE: consumed in goal-prereq-inject.mjs (fleet-wide UserPromptSubmit -> all 34 galaxies).
Knob PRISM_GOAL_LOSS_NUDGE_DISABLE=1. TEST: 15/15. VALIDATE: live stdin smoke -- unbounded=
nudge, bounded=0, bare resume=0, valid JSON. Operationalizes [[feedback_goal_needs_loss_function]].
```

## Files touched (3)
- scripts/lib/chat-token-watch.mjs      | 21 ++++++++++++++++++++-
- scripts/lib/chat-token-watch.test.mjs | 61 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++---
- 2 files changed, 78 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7b8dbde2dd00`
- Milestone envelope: `mcp-server/data/milestones/AI-SYNERGY-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._