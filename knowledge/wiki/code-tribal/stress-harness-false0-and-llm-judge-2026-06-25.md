---
title: A measurement harness must distinguish NO-SIGNAL from a measured FAIL -- at every layer
type: code-tribal
tags: [ollama, stress-test, llm-judge, false-0, measurement, metric-design]
created: 2026-06-25
slot: alpha
commits: [cc24367e41, 014cfefb46, 056d0710bc]
---

# A measurement harness must distinguish NO-SIGNAL from a measured FAIL -- at EVERY layer

## The generalizable lesson

When a harness grades something by calling a flaky resource (a model, a network service, a GPU),
**a "could not measure" outcome (timeout / empty / error / no-verdict) must be a THIRD state, never
folded into the FAIL bucket.** Conflating them is the **false-0**: a thing that never produced a
signal is scored identically to a thing that produced a bad signal. The two have opposite fixes
(retry/idle-the-resource vs improve-the-subject), so collapsing them corrupts every downstream
decision (routing, ranking, deploy-gating).

The trap recurs at **every layer** that grades. Fix it once and it reappears one layer up.

## PRISM instances (Ollama generative stress harness, 2026-06-25)

1. **Subject layer.** `ollama-stress-test.mjs runTaskOnModel` counted a model call that TIMED OUT
   (cold-load under VRAM contention -> `callOllama ""`) into the passRate denominator as a fail. A
   big model that never answered scored `0%`, identical to one that answered everything wrong. On a
   contended GPU this INVERTED the ranking -- a 1.5b "out-performed" a 32b. Fix (`cc24367e41`): track
   `noSignal` separately (call !ok OR ok-with-blank-text), keep `passRate = pass/total` byte-identical
   (a blank was never a pass), add `answered`/`answeredRate` (the honest rate among graded cases). The
   matrix printer tags a false-0 as `32b=0%(ns9/9)` so "never answered" is visibly distinct from a
   real `0%`. PROOF the guard mattered: on a later IDLE run the same 32b scored 100% -- the contended
   0%s were all timeouts.

2. **Grader (judge) layer -- the SAME bug one layer up.** The LLM-judge (`stress-judge.mjs`,
   `014cfefb46`) first returned `false` on a judge timeout/error/no-verdict. The runner then charged
   that judge failure to the SUBJECT as a measured FAIL (the subject HAD answered, so it was not
   subject-noSignal -- no `ns` tag). Caught by 2-arm scrutiny. Fix (`056d0710bc`): the judge is
   **TRI-STATE** -- `true`=PASS, `false`=FAIL, `null`=ABSTAIN (could-not-grade); the runner maps a
   null verdict to noSignal. So a judge-side failure is never silently blamed on the subject.

## Sibling lesson: keyword-overlap is a brittle GENERATIVE-quality metric

`coversFacts` (substring fact-coverage) is a fine cheap gate for EASY/MEDIUM generative tasks but
BRITTLE on the HARD tier: a strong model's correct PARAPHRASE misses the exact required synonyms and
scores a false 0%. The fix is an **LLM-as-judge** (a strong local model grades SEMANTIC fact-capture,
paraphrase-accepting, $0 on the Blackwell). Validated: a direct probe showed the judge correctly +
consistently (temp 0) FAILed a 32b summary that genuinely dropped a subtle required fact -- the judge
was right, not erring. Keep keyword-overlap as the cheap easy/medium gate; use the judge for the hard
tier. Parse the judge's verdict as the LAST `\b(PASS|FAIL)\b` token (the model's final conclusion);
no token -> ABSTAIN (null), never a vacuous pass.

## Corollaries

- **Never run a quality stress test on a CONTENDED GPU** -- big-model timeouts read as false-0s. Use
  a fleet-idle window (operator pause), or the `noSignal`/ABSTAIN guards make a contended run at least
  HONEST about what it could not measure.
- **A single suspicious 0% deserves a direct probe** before you believe it (is it timeout, or a real
  wrong answer? a direct one-call probe disambiguates in seconds).
- **n=1 per cell is not a ranking.** A frontier from one case per difficulty is single-sample; surface
  the low-confidence flag and grow to n>=3 before routing on it.

Related: [[reference_ollama_generative_stratified_harness_2026_06_25]] ·
[[reference_ollama_llm_judge_metric_2026_06_25]] ·
[[reference_ollama_executor_selection_architecture_2026_06_25]] ·
[[feedback_advisory_offload_telemetry_not_a_gap]] (the sibling "advisory 0 is not a gap" misread).
