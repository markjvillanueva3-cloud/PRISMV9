# AI-SYSTEMS-NEURAL/U-MIT-KNOWLEDGE-QUERY-WIRE — [MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-MIT-KNOWLEDGE-QUERY-WIRE (slot:india): fix dark mit_course_knowledge_query -> searchAlgorithms/searchCourses scope router

**Commit:** `9c4e94ff943d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T20:19:30-05:00
**Tags:** ai-systems-neural, u-mit-knowledge-query-wire, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-MIT-KNOWLEDGE-QUERY-WIRE (slot:india): fix dark mit_course_knowledge_query -> searchAlgorithms/searchCourses scope router

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-MIT-KNOWLEDGE-QUERY-WIRE (slot:india): fix dark mit_course_knowledge_query -> searchAlgorithms/searchCourses scope router

mit_course_knowledge_query was facade-wired to query/search/getCourse (none exist on
MITCourseKnowledgeEngine) -> "method not callable". Real searches: searchAlgorithms +
searchCourses (2 candidates -> verify-tiered "ambiguous").

Sound-logic resolution: a `scope` discriminator (default "both" -- both ARE MIT
course-knowledge, nothing dropped); scope=algorithms|courses narrows. The searches do
query.toLowerCase() with NO guard -> added a non-empty-query crash-guard (fail loud).
Explicit deterministic assignment (excluded arm = []) instead of conditional spread.

- rewire: scope router + query guard; mitCourseKnowledgeEngine is the getInstance singleton.
- test (3): default both -> real ranked results (relevanceScore present, slimResponse strips
  empty arms so assert content not empty-arm keys); scope routing honored (algorithms vs
  courses); empty/missing query rejected.

tsc 0 my files (16GB heap); 3/3. india dark CLEAN+ROUTER queue now EXHAUSTED -- 7 fixed
(cross_domain/foresight/wet_run/uncertainty/smart_tool/sampling_plan/mit) + roadmap_dag
reverted (needs-design). Remaining india dark = 4 NEEDS-BUILD (new engine methods, a
separate milestone -- NOT dark wires). 72 cross-domain dark -> owning slots.
```

## Files touched (3)
- mcp-server/src/__tests__/aiReasoningDispatcher.mit-knowledge-wire.test.ts | 47 +++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts                 | 16 +++++++++++--
- 2 files changed, 61 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9c4e94ff943d`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-NEURAL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._