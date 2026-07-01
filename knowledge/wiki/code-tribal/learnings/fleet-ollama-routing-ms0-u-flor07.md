# FLEET-OLLAMA-ROUTING-MS0/U-FLOR07 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-OLLAMA-ROUTING-MS0]/U-FLOR07 (slot:tango): wire executor-routing into checkin/startup/goal (52 wrappers inherit)

**Commit:** `4c0b87c315c5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T20:34:29-05:00
**Tags:** fleet-ollama-routing-ms0, u-flor07, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-OLLAMA-ROUTING-MS0]/U-FLOR07 (slot:tango): wire executor-routing into checkin/startup/goal (52 wrappers inherit)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-OLLAMA-ROUTING-MS0]/U-FLOR07 (slot:tango): wire executor-routing into checkin/startup/goal (52 wrappers inherit)

Wires the U-FLOR01 resolveExecutor contract into the canonical command bodies + the
/goal hook so lane-routing reaches the whole fleet from a few edits (R15 apply-to-all):

- checkin.md + startup.md (CANONICAL -- the 52 NATO wrappers /checkin-* and /startup-*
  delegate to these, so one edit each propagates fleet-wide): add an "Executor routing
  (token economy)" pointer in the work-order block -- route mechanical text/code ops to
  local Ollama (ask-ollama.mjs, $0), reserve Claude for judgment + safety (R5), isolate
  COMPLEX multi-file in worktree subagents, fail-loud + keep-on-Claude when :11434 down.
- goal-prereq-inject.mjs: augment GOAL_DISCIPLINE item 2 (decompose) with the same
  executor-routing line so every /goal carries it. node --check clean.

Consumes U-FLOR01 + U-FLOR05. No new files; edits to already-tracked canonical surfaces.
Next: U8 (forge7/forge-audit-v2 offload), U9-U10 (28 souls + 34 galaxies + wikis + memories).
```

## Files touched (4)
- .claude/commands/checkin.md          | 2 ++
- .claude/commands/startup.md          | 2 ++
- .claude/hooks/goal-prereq-inject.mjs | 2 +-
- 3 files changed, 5 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4c0b87c315c5`
- Milestone envelope: `mcp-server/data/milestones/FLEET-OLLAMA-ROUTING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._