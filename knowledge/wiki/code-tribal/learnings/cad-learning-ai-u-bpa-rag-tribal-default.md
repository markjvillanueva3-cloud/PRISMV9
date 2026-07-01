# CAD-LEARNING-AI/U-BPA-RAG-TRIBAL-DEFAULT — [MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-RAG-TRIBAL-DEFAULT (slot:india): inject blueprint-EXTRACTION tribal corpus by default into blueprint_rag_extract

**Commit:** `466f47d76959` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T15:10:22-05:00
**Tags:** cad-learning-ai, u-bpa-rag-tribal-default, auto-distilled

## Subject
[MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-RAG-TRIBAL-DEFAULT (slot:india): inject blueprint-EXTRACTION tribal corpus by default into blueprint_rag_extract

## Body
```
[MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-RAG-TRIBAL-DEFAULT (slot:india): inject blueprint-EXTRACTION tribal corpus by default into blueprint_rag_extract

blueprint_rag_extract's retrieveTribal (cadDispatcher) fed tribal sources ONLY
from params.precomputedSources.tribal -- no default. So an MCP caller that omits
tribal got ZERO shop priors, even though a domain-correct corpus exists
(state/shared/blueprint-vision-tribal-corpus.jsonl: verify-engine-names /
split-multi-print-before-OCR / per-field 0.70 floor -- xray's EXTRACTION doctrine).
This replicates the tribal-injection pattern (text->CAD got it via
U-CAD-TEXT-TRIBAL-INJECT) onto the blueprint RAG surface -- using the EXTRACTION
corpus, deliberately NOT the CAD-draw GENERATION corpus (CAD_DRAW_TRIBAL_TIPS),
which is the wrong domain for dimension reading.

NEW scripts/lib/blueprint-tribal-source-loader.mjs: loads the corpus jsonl + adapts
each tip to the engine's RetrievedSource shape ({kind:"tribal",id,title,score});
fail-soft ([] on missing/malformed/empty); topK cap; PRISM_BPV_TRIBAL_CORPUS env
override. WIRE: cadDispatcher retrieveTribal now defaults to this loader (CWD-
independent repo-root dynamic import, same idiom as recordOutcome) ONLY when the
caller supplies no tribal -- explicit precomputedSources.tribal still wins.

TEST: loader 6/6 (fixture adapt + malformed-skip + empty/null + topK + fail-soft +
LIVE-corpus smoke) + new round-trip cadDispatcher.blueprint-rag-tribal-default 3/3
THROUGH prism_cad (default injects 3 fixture tips into extraction.sources; caller
override wins; valid RetrievedSource shape). Fixed a regression my default caused
in cadDispatcher.blueprint-rag-recordoutcome (its sourceless low_no_prior case) by
neutralizing the default there via PRISM_BPV_TRIBAL_CORPUS -> 6/6 again. tsc clean.

Cross-domain: the corpus is xray's (blueprint-vision) -- coordinating; the wiring +
loader are india's (RAG surface).
```

## Files touched (6)
- mcp-server/src/__tests__/cadDispatcher.blueprint-rag-recordoutcome.test.ts  |  4 ++++
- mcp-server/src/__tests__/cadDispatcher.blueprint-rag-tribal-default.test.ts | 91 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/cadDispatcher.ts                           | 26 +++++++++++++++++++++++++-
- scripts/lib/blueprint-tribal-source-loader.mjs                              | 71 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/blueprint-tribal-source-loader.test.mjs                         | 83 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 5 files changed, 274 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- wrong domain for dimension reading.
- till wins.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 466f47d76959`
- Milestone envelope: `mcp-server/data/milestones/CAD-LEARNING-AI.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._