# SKILL-REFRESH/U-GOAL-DISCIPLINE-AUTOINVOKE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SKILL-REFRESH]/U-GOAL-DISCIPLINE-AUTOINVOKE (slot:alpha): /goal auto-invokes open-loop discipline from the agent-loop articles

**Commit:** `f83b035ea860` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T21:20:41-05:00
**Tags:** skill-refresh, u-goal-discipline-autoinvoke, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SKILL-REFRESH]/U-GOAL-DISCIPLINE-AUTOINVOKE (slot:alpha): /goal auto-invokes open-loop discipline from the agent-loop articles

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SKILL-REFRESH]/U-GOAL-DISCIPLINE-AUTOINVOKE (slot:alpha): /goal auto-invokes open-loop discipline from the agent-loop articles

/goal has no command file -- it is hook-driven. goal-prereq-inject.mjs (the
inject-on-/goal hook) is already rich (close-out gate, milestone progress, prereq
checks). Added a GOAL_DISCIPLINE block because a /goal is typically an OPEN /
exploratory loop -- the exact 'slop machine that burns insane tokens' failure the
agent-loop articles warn about. 4 rules, auto-injected on every /goal:
  1 CONVERT open->closed -- name GOAL + EVAL gate + STOP condition BEFORE building [shann]
  2 DECOMPOSE -- orchestrate goal->specialist->subagent, zero-token coordination [PawelHuryn]
  3 EACH PASS FEEDS NEXT + checkpoint at YELLOW (R6/R10) [shann/IBuzovskyi]
  4 BUILD across galaxy lines if a backend builder -- ownership gate is advisory [[feedback_primary_backend_builders_no_galaxy_gate_block]]
Knob PRISM_GOAL_RULES_DISABLE=1; rides the existing loop-inject-dedup. LIVE-tested:
parses, /goal emits all 4 rules + cites the builder rule, knob suppresses cleanly,
pre-flight preserved. Companion to U-LOOP-RULES-AUTOINVOKE; both cite wiki
[[agent-loop-design-rules]].

Also (if staged) U-SYSTEM-VIZ-CURRENT-BUILD: stale engine count 2763/593 ->
3697/89 of 3786 + cheap-node-access (node-card) + find-cache serve-stale build.
```

## Files touched (2)
- .claude/hooks/goal-prereq-inject.mjs | 15 +++++++++++++++
- 1 file changed, 15 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f83b035ea860`
- Milestone envelope: `mcp-server/data/milestones/SKILL-REFRESH.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._