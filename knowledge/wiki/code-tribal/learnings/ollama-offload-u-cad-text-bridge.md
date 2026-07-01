# OLLAMA-OFFLOAD/U-CAD-TEXT-BRIDGE — [MAIN-FORCE] [OLLAMA-OFFLOAD]/U-CAD-TEXT-BRIDGE (slot:zulu): the Ollama text->CAD LLM caller that CadQueryCodeGeneratorEngine documented but never had -- LIVE generation proven (operator 2nd re-ask: wire Ollama CAD generation)

**Commit:** `a0bf66dcd36e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T15:03:59-05:00
**Tags:** ollama-offload, u-cad-text-bridge, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-CAD-TEXT-BRIDGE (slot:zulu): the Ollama text->CAD LLM caller that CadQueryCodeGeneratorEngine documented but never had -- LIVE generation proven (operator 2nd re-ask: wire Ollama CAD generation)

## Body
```
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-CAD-TEXT-BRIDGE (slot:zulu): the Ollama text->CAD LLM caller that CadQueryCodeGeneratorEngine documented but never had -- LIVE generation proven (operator 2nd re-ask: wire Ollama CAD generation)

R8 finding: CadQueryCodeGeneratorEngine (562 lines, dispatcher actions
cadquery_generate_script/validate_syntax/execute_script/codegen_prompt)
ships the prompt+validate+execute half of 'NL -> LLM -> CadQuery' -- its
own header documents the LLM step, but NO code ever called a model. This
bridge is that missing half:

scripts/cad-text-to-cadquery.mjs: text request -> engine's canonical
getCodeGenPrompt() (dist import via pathToFileURL -- same-day U-YT lesson)
PREPENDED to hard-coded JM doctrine (inch units 25.4, spark-gap rule,
periodic-B-spline ban, parametrize-everything) + feature-template names
(RAG-lite, fail-soft) -> qwen2.5-coder:32b /api/generate -> python fence
extracted -> structural gates (CAD import + STEP export + inch-conversion
evidence; prose never stages) -> staged to state/shared/cad-text-gen/
<slug>-<ts>/ with request+status metadata. Execution branch probes
build123d/cadquery in portable Python at runtime and SELF-ACTIVATES when
the env lands (today: executed:false naming U-QUEBEC-MCP-CADQUERY-MERGE
as the unblock); engine's cadquery-executor.py is the alternate lane.

LIVE PROOF: '1 inch cube, 0.25in center through hole' -> 646 chars of
VALID parametric CadQuery (IN=25.4 explicit, named dims, OUTPUT_STEP
contract honored) staged on the first run. Observation for delta: model
over-applied the electrode spark-gap to a non-electrode hole -- canonical
prompt precision item, flagged on the bus. 6/6 tests (doctrine-in-every-
prompt pin, engine-prompt prepend + fail-soft, prose-rejection gates).
```

## Files touched (3)
- scripts/cad-text-to-cadquery.mjs      | 206 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/cad-text-to-cadquery.test.mjs |  75 ++++++++++++++++++++++++++++++++++
- 2 files changed, 281 insertions(+)

## Lessons surfaced in commit body
- lesson)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a0bf66dcd36e`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._