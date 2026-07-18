---
name: reference_ollama_generative_stratified_harness_2026_06_25
description: "Stratified GENERATIVE-mode Ollama stress harness (summarize/explain, easy/med/hard, reference-overlap metric; slot:alpha 2026-06-25 commit 5e8638f141). First run was false-0-contaminated under GPU contention -- clean numbers need an idle GPU + an LLM-judge metric."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.677Z
aliases: reference_ollama_generative_stratified_harness_2026_06_25
---


**OLLAMA-GENERATIVE-STRATIFIED** (slot:alpha, 2026-06-25, commit `5e8638f141`).

Closes the INFRASTRUCTURE half of the goal facet "stress test ollama llms... hardest task each llm
can do" for the GENERATIVE offload modes. The 6 existing batteries grade by EXACT-MATCH; ask-ollama's
summarize/explain are GENERATIVE -- quality is a measurement, the gap named in
[[reference_ollama_executor_selection_architecture_2026_06_25]] as THE unblocker for cheapest-warm routing.

**Shipped (READY, reusable):** `scripts/lib/stress-battery-generative.mjs` (summarize+explain x
easy/medium/hard, graded by `coversFacts` reference-overlap -- output must COVER every required
fact-group; a dropped key fact fails; deterministic, no LLM-judge dependency; self-test 9/9) +
`.test.mjs` (9 unit tests) + registered as the opt-in `generative` battery in
`ollama-stress-expanded-run.mjs` (plugs into the proven runTierSweep). Full doc + matrix:
`state/shared/ollama-generative-stratified-2026-06-25.md`.

**First run was CONFOUNDED, NOT a ranking (R12 root-caused):** the matrix showed a 1.5b
"out-explaining" 32b -- impossible. The 32b 0%s are **FALSE-0 from cold-load timeout under VRAM
contention**, not incapability: a direct single 32b probe on the exact failing prompt returned a
perfect answer ("...takes two arguments a and b and returns their sum") in 16.8s that DOES satisfy the
metric; the batch timed the 32b calls out -> `callOllama ""` -> `coversFacts("")` false -> 0%. The
stress-test runner (`ollama-stress-test.mjs::runTaskOnModel`) conflates empty/timeout with wrong (the
documented false-0 phenomenon, `b2d527b126`). 1.5b=100% everywhere = tiny-always-warm + verbose-echo.

**EMPIRICALLY CONFIRMS** the architecture memory's prediction: clean big-model generative numbers
need a **fleet-idle GPU** (box was ~60GB/96GB resident w/ active peers). The hypothesis is now evidence.

**NEXT (deferred -- harness ready):** (a) empty-response false-0 guard in `runTaskOnModel` (record a
timeout/empty as no-signal not 0%; mirror `excludeNoSignalModels`); (b) an LLM-judge metric (warm 32b
judges fact-capture) for the hard tier; (c) re-run on an idle GPU (operator can pause the fleet as for
the exact-match frontier). Only after (a)+(b)+(c) is the mode x difficulty -> min-sufficient-model table
a valid basis for the cheapest-warm executor; do NOT route on the contended run.

**Lesson:** a generative-quality stress run on a CONTENDED GPU is worse than no data -- the big-model
timeouts read as false-0 and invert the ranking. Prove a suspicious 0% with a direct single-model
probe before believing it. Sibling of [[reference_ollama_stress_frontier_2026_06_25]] (exact-match,
run on the operator-paused idle GPU).
