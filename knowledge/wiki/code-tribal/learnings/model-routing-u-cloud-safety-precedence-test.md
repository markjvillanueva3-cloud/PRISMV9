# MODEL-ROUTING/U-CLOUD-SAFETY-PRECEDENCE-TEST — [MAIN-FORCE] [MODEL-ROUTING]/U-CLOUD-SAFETY-PRECEDENCE-TEST (slot:alpha): pin safety-precedes-cloud-route invariant now that the $0 OpenRouter lane is live

**Commit:** `80724f747083` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T11:54:52-05:00
**Tags:** model-routing, u-cloud-safety-precedence-test, auto-distilled

## Subject
[MAIN-FORCE] [MODEL-ROUTING]/U-CLOUD-SAFETY-PRECEDENCE-TEST (slot:alpha): pin safety-precedes-cloud-route invariant now that the $0 OpenRouter lane is live

## Body
```
[MAIN-FORCE] [MODEL-ROUTING]/U-CLOUD-SAFETY-PRECEDENCE-TEST (slot:alpha): pin safety-precedes-cloud-route invariant now that the $0 OpenRouter lane is live

R9 regression guard: a prompt that is BOTH safety-critical AND carries deep-research/long-context phrasing must route to frontier Claude, NEVER the cloud model. routePrompt checks safety_critical before routeCloudLongContext; existing SAFETY test has no cloud words + cloud tests have no safety words, so neither catches a future reorder that would silently offload safety to a cloud LLM. New test asserts the fixture independently triggers the cloud route (load-bearing precondition) then proves routePrompt returns engine=claude/taskClass=safety_critical. 25/25 pass.
```

## Files touched (2)
- scripts/lib/model-routing-policy.test.mjs | 18 ++++++++++++++++++
- 1 file changed, 18 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 80724f747083`
- Milestone envelope: `mcp-server/data/milestones/MODEL-ROUTING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._