# POST-PROCESSOR/U-PP-JMDIE-LEARN-UNDARK — [MAIN-FORCE] [POST-PROCESSOR]/U-PP-JMDIE-LEARN-UNDARK (slot:echo): un-dark 2 lying JMDie-learn dispatcher actions (phantom method names -> real static methods)

**Commit:** `199f04a14a0b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T20:29:46-05:00
**Tags:** post-processor, u-pp-jmdie-learn-undark, auto-distilled

## Subject
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-JMDIE-LEARN-UNDARK (slot:echo): un-dark 2 lying JMDie-learn dispatcher actions (phantom method names -> real static methods)

## Body
```
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-JMDIE-LEARN-UNDARK (slot:echo): un-dark 2 lying JMDie-learn dispatcher actions (phantom method names -> real static methods)

R12 fix found by crossroad-hunt of the lathe-learner backlog.

BUG (shipped 2026-05-25 dark-engine-closure): camDispatcher actions
jmdie_post_enhancement_ranking + jmdie_post_recommendations called
(Engine as any).getEnhancementRanking?.() / .getRecommendations?.() -- methods
that DO NOT EXIST on JMDiePostProcessorLearningEngine -- so both ALWAYS hit the
silent `?? {note:"... not callable"}` fallback and returned {success:true, ...lie}.

FIX: re-point to the REAL static methods (verified by reading the engine):
- jmdie_post_enhancement_ranking -> getEnhancementCatalog() (distinct enhancements
  ranked by descending frequency + carrying posts) -> data:{ranking}.
- jmdie_post_recommendations -> gapReport().recommendations (ranked rollout/per-post
  gap fixes, string[]) -> data:{recommendations}.
Typed static calls (no `as any`, no silent fallback) -> fail-loud via outer handler.

TEST: +3 dispatcher-contract-lock tests (engine unit tests alone could not catch a
dispatcher name-mismatch): assert getEnhancementCatalog returns a descending-ranked
{enhancement,count,posts}[], gapReport().recommendations is a non-empty string[], and
[regression] the phantom names getEnhancementRanking/getRecommendations stay absent.
42/42 green; build:fast clean.

VERIFIED FALSE POSITIVES this hunt (no action -- already real+tested+wired): the other
two lathe learners -- LathePostGeneratorActiveLearningEngine (real, 39-test, 7 actions)
and LathePostProcessorAIEngine (real, now 69-test) -- the "un-dark lathe learners"
backlog item was largely stale.
```

## Files touched (3)
- mcp-server/src/__tests__/JMDiePostProcessorLearningEngine.test.ts | 44 ++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/camDispatcher.ts                 | 11 +++++++++--
- 2 files changed, 53 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 199f04a14a0b`
- Milestone envelope: `mcp-server/data/milestones/POST-PROCESSOR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._