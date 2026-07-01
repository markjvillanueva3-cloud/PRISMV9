---
name: reference_ollama_llm_judge_metric_2026_06_25
description: "LLM-judge (32b) semantic metric for the generative Ollama stress battery + the clean idle-GPU findings (commits 014cfefb46 + 056d0710bc). Easy/med generative -> cheap models suffice (routable); hard -> 14b floor, n=1 (needs n>=3). Judge is tri-state (PASS/FAIL/ABSTAIN) to avoid a judge-layer false-0."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.678Z
aliases: reference_ollama_llm_judge_metric_2026_06_25
---


**OLLAMA-GEN-JUDGE** (slot:alpha, 2026-06-25, commits `014cfefb46` + scrutiny-P2 `056d0710bc`). Built
after the operator confirmed "you're the only one operating" -> ran the deferred idle-GPU work.

**The build (harness-upgrade (b) from [[reference_ollama_generative_stratified_harness_2026_06_25]]):**
keyword-overlap (coversFacts) is a fine EASY/MEDIUM gate but BRITTLE on the HARD tier -- a strong
model's correct PARAPHRASE scores a false 0% under substring matching. The LLM-judge fixes it:
- `scripts/lib/stress-judge.mjs` -- `judgeFactCapture` (32b reads output + required facts, returns
  PASS/FAIL on SEMANTIC capture) + pure `parseJudgeVerdict` (LAST PASS/FAIL token wins; word-boundary
  so 'passport' isn't a verdict) + `renderFacts`/`buildJudgePrompt`.
- `scripts/lib/stress-battery-generative-judged.mjs` -- clones the generative cases, swaps the SYNC
  keyword verify for the ASYNC judge. Enabler: `ollama-stress-test.mjs runTaskOnModel` now
  `await`s verify (sync bool unchanged; async Promise<bool|null> awaited). Registered `generative-judged`.

**TRI-STATE (scrutiny P2 -- the false-0 one layer up):** a judge timeout/error/no-verdict returns
`null` ABSTAIN, NOT false; the runner maps abstain -> noSignal, so a JUDGE failure is never charged to
the SUBJECT as a measured FAIL. (Run 2 was idle-GPU so no abstains; this protects future contended runs.)

**CLEAN idle-GPU findings (qwen2.5-coder 1.5b/7b/14b/32b, both metrics):**
- EASY + MEDIUM summarize/explain: cheap models (1.5b/7b) = 100% under BOTH metrics, n=2 -> **ROUTABLE:
  route easy/medium generative offloads to the cheapest warm model.**
- HARD: discriminates at 14b (14b=100%, others 0%). The 32b=0% is a REAL incomplete summary (it dropped
  the subtle "Vc independent of deflection" insight; judge FAIL FAIL at temp 0, direct-probe validated --
  the judge is CORRECT). BUT n=1/hard-task -> single-sample, NOT yet routable. NEXT: n>=3 hard cases.

**The actual utilization payoff is NOW UNBLOCKED but NOT yet built:** wiring the easy/medium "cheap
suffices" result into `ask-ollama`'s loaded-first executor (route easy/med generative to the cheapest
WARM model) -- the architecture memory's cheapest-warm lever. Still needs prewarming the cheap tier so
cost-appropriate AND warm coincide (32b is always the warm pick today). That executor change is the
clear next unit; do NOT rush it (the memory warns against a hasty loaded-first reorder).

**Also this session:** U2 octopus multi-model went LIVE via dist (`npm run build:incremental` +
production-path ledger validation: `["xai:grok-4.3","xai:grok-4.20-0309-reasoning","ollama:qwen2.5-coder:32b","ollama:gpt-oss:20b"]`).
Tests: judge 14/14, runner+abstain 6/6, regression 23/23, generative 10/10, judged 10/10. 2-arm PASS.
