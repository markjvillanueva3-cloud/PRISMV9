# OLLAMA-GENERATIVE-STRATIFIED/U-ALPHA-OLLAMA-GEN-STRAT — [MAIN-FORCE] [OLLAMA-GENERATIVE-STRATIFIED]/U-ALPHA-OLLAMA-GEN-STRAT (slot:alpha): stratified generative-mode stress harness + first run root-causes big-model false-0s under GPU contention

**Commit:** `5e8638f1413f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T15:33:10-05:00
**Tags:** ollama-generative-stratified, u-alpha-ollama-gen-strat, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-GENERATIVE-STRATIFIED]/U-ALPHA-OLLAMA-GEN-STRAT (slot:alpha): stratified generative-mode stress harness + first run root-causes big-model false-0s under GPU contention

## Body
```
[MAIN-FORCE] [OLLAMA-GENERATIVE-STRATIFIED]/U-ALPHA-OLLAMA-GEN-STRAT (slot:alpha): stratified generative-mode stress harness + first run root-causes big-model false-0s under GPU contention

Operator goal facet: "stress test ollama llms to see what the hardest task each llm can do
before diminishing returns." The 6 existing batteries grade by EXACT-MATCH; ask-ollama's
production offload modes (summarize/explain) are GENERATIVE -- quality is a measurement, not
an exact match (reference_ollama_executor_selection_architecture_2026_06_25 named generative
quality data as THE unblocker for cheapest-warm routing). This adds that missing dimension.

SHIPPED (READY, reusable infrastructure):
- scripts/lib/stress-battery-generative.mjs: summarize + explain, stratified easy/medium/hard,
  graded by a reference-overlap metric (coversFacts -- output must COVER every required fact-group;
  each group = synonyms, >=1 satisfies; a dropped key fact fails the case). Deterministic, no
  LLM-judge dependency, no exact-match. Self-test 9/9 (good answer PASS / fact-dropping answer FAIL).
- scripts/lib/stress-battery-generative.test.mjs: 9 unit tests on the metric (coverage, fact-drop,
  synonym, case-insensitivity, empty/invalid -> false, per-task good/bad). Real asserts.
- Registered as the opt-in `generative` battery in ollama-stress-expanded-run.mjs (plugs into the
  proven runTierSweep, same task shape as the other batteries).

FIRST RUN (CONTENDED GPU -- NOT a clean ranking, root-caused; full doc + matrix in
state/shared/ollama-generative-stratified-2026-06-25.md):
- Matrix showed a 1.5b "out-explaining" 32b (impossible) -> confounded run, not a result.
- ROOT CAUSE (R12, proven): the 32b 0%s are FALSE-0 from cold-load timeout under VRAM contention,
  NOT incapability. A direct single 32b probe on the exact failing prompt returned a perfect answer
  ("...takes two arguments a and b and returns their sum") in 16.8s that DOES satisfy the metric;
  the batch timed the 32b calls out -> callOllama "" -> coversFacts("") false -> 0%. The stress-test
  runner conflates empty/timeout with wrong. This is the documented false-0 phenomenon (b2d527b126).
- EMPIRICALLY CONFIRMS the architecture memory's requirement: clean big-model generative numbers
  need a FLEET-IDLE GPU (the box was ~60GB/96GB resident with active peers).

NEXT (now evidence-backed, deferred -- harness is ready): (a) empty-response false-0 guard in
runTaskOnModel (record timeout/empty as no-signal, not 0%; mirror excludeNoSignalModels); (b) an
LLM-judge metric (warm 32b judges fact-capture) for the hard tier; (c) re-run on an idle GPU. Only
then is the mode x difficulty -> min-sufficient-model table a valid basis for cheapest-warm routing.
Do NOT route on this contended run.
```

## Files touched (5)
- scripts/lib/stress-battery-generative.mjs               | 224 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/stress-battery-generative.test.mjs          |  64 ++++++++++++++++
- scripts/ollama-stress-expanded-run.mjs                  |   1 +
- state/shared/ollama-generative-stratified-2026-06-25.md |  63 ++++++++++++++++
- 4 files changed, 352 insertions(+)

## Lessons surfaced in commit body
- wrong. This is the documented false-0 phenomenon (b2d527b126).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5e8638f1413f`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-GENERATIVE-STRATIFIED.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._