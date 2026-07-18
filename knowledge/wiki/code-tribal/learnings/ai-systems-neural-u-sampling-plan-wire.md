# AI-SYSTEMS-NEURAL/U-SAMPLING-PLAN-WIRE — [MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-SAMPLING-PLAN-WIRE (slot:india): fix dark sampling_plan_generate -> mil1916/aoqlPlan standard router (sound-logic)

**Commit:** `d1a97a3a4c4a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T20:10:42-05:00
**Tags:** ai-systems-neural, u-sampling-plan-wire, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-SAMPLING-PLAN-WIRE (slot:india): fix dark sampling_plan_generate -> mil1916/aoqlPlan standard router (sound-logic)

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-SAMPLING-PLAN-WIRE (slot:india): fix dark sampling_plan_generate -> mil1916/aoqlPlan standard router (sound-logic)

sampling_plan_generate was facade-wired to generate/plan/calculate (none exist on
SamplingPlanEngine) -> always "method not callable". The engine has TWO static
self-validating generators (mil1916, aoqlPlan) -> the verify pass tiered it "ambiguous".

Sound-logic resolution (operator: "use sound logic to make the logical choices"): a
`standard` discriminator routes to the chosen sampling standard, default "mil1916" (the
common c=0 acceptance-sampling default); standard:"aoql" -> aoqlPlan. No capability lost,
sensible default -- a principled design, not a guess. Both engines self-validate via Zod
.parse (strip the routing key + throw on bad input -> dispatcher error), so no extra
crash-guard.

- rewire: standard-router over the two static generators.
- mock-server test (4): default -> real MIL-STD-1916 plan (c=0, sampleSize>0, codeLetter,
  verificationLevel echoed); standard=aoql -> real AOQL plan (targetAoql echoed); non-
  positive lotSize rejected; out-of-range aoql (>=0.5) rejected.

tsc 0 my files (16GB heap); 4/4. india dark progress: 6 clean fixed. iter12 was a SOUND-
LOGIC REVERT (roadmap_dag_build -> load() hangs/throws -- reclassified needs-design, not
shipped). Remaining india dark: mit_course_knowledge_query (last router: algorithms/courses
scope) + 4 needs-build (real new engine methods -- a separate milestone, not loop wires).
```

## Files touched (3)
- mcp-server/src/__tests__/orchestrationDispatcher.sampling-plan-wire.test.ts | 60 +++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/orchestrationDispatcher.ts                 | 14 +++++++--
- 2 files changed, 71 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d1a97a3a4c4a`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-NEURAL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._