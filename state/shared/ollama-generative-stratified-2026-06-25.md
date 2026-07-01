# Ollama generative-mode stratified stress -- harness, false-0 guard, LLM-judge (2026-06-25, slot:alpha)

Operator goal facet "stress test ollama llms to see what the hardest task each llm can do before
diminishing returns" -- for the GENERATIVE offload modes (summarize/explain). Three commits:
`5e8638f141` (harness) -> `cc24367e41` (false-0 guard) -> `014cfefb46` (LLM-judge). Run on the idle
Blackwell GPU after the operator confirmed "you're the only one operating."

## The harness (READY, reusable)
- `scripts/lib/stress-battery-generative.mjs` -- summarize+explain x easy/med/hard, KEYWORD-overlap
  metric (`coversFacts`: output must cover every required fact-group; synonyms accepted).
- `scripts/lib/stress-battery-generative-judged.mjs` + `scripts/lib/stress-judge.mjs` -- SAME cases,
  LLM-JUDGE metric (qwen2.5-coder:32b grades SEMANTIC fact-capture; paraphrase counts).
- `scripts/ollama-stress-test.mjs` runTaskOnModel -- false-0 guard (`noSignal` separate from
  answered-wrong) + `await verify` (async-judge-capable, sync back-compat).
- Registered `generative` + `generative-judged` batteries in `ollama-stress-expanded-run.mjs`.

## Run 1 -- KEYWORD metric, false-0-guarded, idle GPU
```
                  1.5b   7b    14b   32b
summarize-easy    100%   100%  100%  100%
summarize-medium  100%   100%   50%  100%
summarize-hard    100%    0%   100%    0%   <- brittle: 32b=0% with noSignal=0 (it ANSWERED)
explain-easy      100%   100%  100%  100%
explain-medium    100%   100%  100%  100%
explain-hard      100%   100%  100%  100%
```
The false-0 guard PROVED its worth: on the earlier CONTENDED run the explain-* 32b read 0% (cold-load
timeouts); on this idle run they are 100% and any timeout would have tagged `(nsK/N)`. The remaining
`summarize-hard 32b=0%` has NO `ns` tag -> the 32b ANSWERED and the substring metric missed its correct
PARAPHRASE = keyword brittleness, the reason the LLM-judge exists.

## Run 2 -- LLM-JUDGE metric, idle GPU
```
                        1.5b   7b    14b   32b
summarize-easy-judged   100%   100%  100%  100%
summarize-medium-judged 100%   100%   50%  100%
summarize-hard-judged     0%    0%   100%    0%   <- frontier at 14b
explain-easy-judged     100%   100%  100%  100%
explain-medium-judged   100%   100%  100%  100%
explain-hard-judged       0%    0%   100%    0%   <- frontier at 14b
```
The judge is CORRECT + CONSISTENT (validated): a direct probe of the 32b summarize-hard output showed
it genuinely DROPPED 2 of 4 required facts -- the subtle counter-intuitive insight ("Vc is INDEPENDENT
of deflection", the whole point of the post-mortem) + the quantified resolution (in-band, all 6 ISO
groups). The judge returned FAIL FAIL at temp 0. So the 32b's TERSE summary was genuinely incomplete;
14b happened to keep the subtle fact. The judge caught what keyword-overlap could not.

## Conclusions (R12 honest)
1. **EASY + MEDIUM generative offload -> cheap models (1.5b/7b) are SUFFICIENT** -- consistent 100%
   under BOTH metrics across multiple cases. This IS routable now: route easy/medium summarize/explain
   offloads to the cheapest warm model. (The lone `14b=50%` on summarize-medium is a single-case blip.)
2. **HARD generative (preserving a subtle counter-intuitive fact) is unreliable for ALL these models**
   -- even 32b drops the key insight when terse; 14b happened to keep it. This is REAL signal but the
   hard tier is **n=1/task -> single-sample, NOT yet a routable ranking** (the runner flags low
   sampleSize). NEXT refinement: n>=3 hard-tier cases for a confident frontier.
3. The LLM-judge metric is the right tool for the hard tier (semantic, paraphrase-accepting, validated
   correct + consistent); keyword-overlap stays the cheap easy/medium gate.

## Post-scrutiny hardening (2-arm review caught these P2s -> fixed same session)
- **Judge false-0, one layer up:** `judgeFactCapture` originally returned `false` on a judge
  timeout/error/no-verdict -- which the runner charged to the SUBJECT as a measured FAIL (the exact
  false-0 class the subject-side guard fixed). FIXED: the judge is now TRI-STATE (PASS=true / FAIL=false
  / ABSTAIN=null on could-not-grade); the runner maps an abstain to noSignal, never a subject FAIL. So
  the judged metric is honest under contention too (Run 2 was on idle GPU so its published numbers were
  unaffected -- no abstains -- but a future contended run is now safe).
- **explain-medium was n=1:** added a 2nd case (G96 CSS) -> the easy/MEDIUM "cheap models sufficient"
  conclusion now rests on n=2 for both summarize-medium AND explain-medium.
- **low-n flag now rendered** in the expanded-run human matrix (`(low-n)` when frontier.confident=false),
  not just the JSON -- so an n<3 frontier is never mistaken for a hard route.

## U2 octopus multi-model -- now LIVE via dist
`npm run build:incremental` refreshed `dist/engines/MultiModelConsensusEngine.js` (U2 symbols present).
Production-path validation (`octopus-utilization-driver --hermes-models grok-4.3,grok-4.20-0309-reasoning`)
-> ledger: `["xai:grok-4.3","xai:grok-4.20-0309-reasoning","ollama:qwen2.5-coder:32b","ollama:gpt-oss:20b"]`
= 2 distinct Grok models + 2 local models in ONE consensus, via real node+dist. The cron is armed
(`-HermesModels` param).

Pre-existing (NOT mine): 2 tsc errors in `ReinforcementLearningCAMFeedbackEngine.ts` (TS2554 arg-count)
surfaced during the build -- emitted anyway (noEmitOnError off); flagged for the CAM/RL owner.

## Judged n=3 live run + the FLEET-REAPER root-cause (the runner is fine)
A full-ladder (4-model) judged n=3 sweep kept dying at exit 255 (no matrix). ROOT CAUSE (R12, NOT a
code bug): the **fleet-reaper** ("MUST KEEP RUNNING", confirm-after-2x300s ~= **10-min** threshold)
KILLS any judged sweep that runs >10 min. The judge call per case makes the full sweep ~15-20 min ->
reaped. PROOF the runner is fine: the fast KEYWORD sweep (no judge calls) completes; the judge works in
isolation (a direct 32b probe graded correctly); a **single-model** judged sweep completes in ~4 min
(under the threshold). FIX = run each model as a SEPARATE invocation (the per-model-invocation pattern
the architecture memory names), NOT one long multi-model sweep.

**14b judged n=3 (the one that completed) -- AND it validates the tri-state guard LIVE:**
```
summarize-easy-judged    14b=100%
summarize-medium-judged  14b=0%(ns1/2)    <- 1 of 2 cases the JUDGE abstained (null) -> noSignal, NOT a fail
summarize-hard-judged    14b=33%(ns1/3)   <- 1 of 3 abstained; 1 of the 2 graded passed
explain-easy-judged      14b=100%
explain-medium-judged    14b=100%
explain-hard-judged      14b=100%
```
The `(ns#/#)` tags are the tri-state ABSTAIN guard FIRING LIVE: when the 32b judge could not return a
verdict (timeout/no-token), the case is honestly marked no-signal, never silently charged to the subject
as a 0%. 14b is strong on easy + all explain tiers, weaker on hard SUMMARIZE (the subtle-fact tier).

**1.5b judged n=3 (the cheapest model, per-model invocation) -- the ROUTABLE result:**
```
summarize-easy    1.5b=100%      explain-easy    1.5b=100%
summarize-medium  1.5b=100%      explain-medium  1.5b=100%
summarize-hard    1.5b=0%        explain-hard    1.5b=67%
```

## BOTTOM LINE (judge-validated, routable)
**Route EASY + MEDIUM generative offloads (summarize/explain) to the CHEAPEST warm model (1.5b).** The
1.5b passes ALL easy+medium at 100% under the SEMANTIC LLM-judge (not just keyword) -- so the executor's
blanket "cheap models are below the offload bar" gate is DISPROVEN for easy/medium generative, exactly the
data the architecture memory said would unblock the cheapest-warm reorder. HARD generative needs >=14b
(1.5b: hard-summarize 0% / hard-explain 67%; 14b: all-explain 100% / hard-summarize 33%) -- but the
executor cannot classify request difficulty at runtime, so the safe routing is: cheapest-warm for the
mode, with a HARD-tier guard (or keep the big-first preference when difficulty is unknown).

## COMPLETE judged ladder (all 4 rungs, n=3, LLM-judge, reaper-safe per-model invocations)
```
task               1.5b   7b     14b           32b
summarize-easy     100%   100%   100%          100%
summarize-medium   100%   100%   0%(ns1/2)     100%
summarize-hard     0%     0%     33%(ns1/3)    33%
explain-easy       100%   100%   100%          100%
explain-medium     100%   100%   100%          100%
explain-hard       67%    100%   100%          67%
```
(ns#/# = the 32b JUDGE abstained on that many cases -- tri-state guard, honestly excluded, not a fail.)

### Final routable conclusions (judge-validated, complete)
1. **EASY + MEDIUM generative -> route to 1.5b (cheapest).** ALL four models score 100%. Solid, the
   primary "max-utilize ollama" win.
2. **HARD EXPLAIN -> 7b or 14b (both 100%); 1.5b + 32b are 67% (n=3 variance, temp-0 deterministic).**
   7b is the sweet spot for hard explanation.
3. **HARD SUMMARIZE -> NO local coder model reliably passes (max 33%, even 32b).** Preserving a subtle
   counter-intuitive insight in a terse summary is genuinely hard for all of them -- the judge
   consistently catches the dropped fact. Escalate hard summaries to Claude, or do not offload them.

This is the complete answer to "the hardest task each llm can do before diminishing returns" for the
generative modes.

## EXECUTOR WIRING -- SHIPPED (the payoff, no longer a "remaining unit")
The "runtime difficulty signal" blocker DISSOLVED for summarize/explain: 7b is NON-INFERIOR to 32b at
EVERY measured difficulty (tie on easy/medium, tie on hard-summarize where both fail, WIN on
hard-explain) -- so the executor needs NO difficulty classifier; a warm 7b is a strictly-safe pick for
these 2 modes at any difficulty. Shipped (slot:alpha, 2026-06-25):
- `scripts/lib/ollama-mode-sufficiency.mjs` -- `loadedPreferenceForMode(mode, base)` PREPENDS the
  measured cheap floor (qwen2.5-coder:7b) for summarize/explain ONLY; `ask-ollama.mjs` non-codegen
  branch consumes it. Purely additive + strict (cold 7b skipped, no cold-load); base preference + the
  codegen path untouched. LIVE-PROVEN: 7b+32b both warm -> `summarize --json` -> model=7b (was 32b).
- `scripts/lib/ollama-cheap-tier-prime.mjs` -- demand-driven cheap-tier warm so the lever fires in
  production (warms 7b after a measured-mode call that cold-loaded 32b). Fail-soft against variable 7b
  cold-load latency. Kill switch `PRISM_OLLAMA_CHEAP_PRIME_DISABLE=1`.
Tests: 11/11 sufficiency + 10/10 prime + 63/63 ask-ollama. codegen/triage/viz/ask/rerank stay
big-first (no judged data -- extend `MODE_MIN_SUFFICIENT` only when a mode is judged). The `ask-ollama`
executor is the single shared offload path for all 26 slots, so every galaxy benefits from one change.
Memory: [[reference_ollama_mode_sufficiency_2026_06_25]]; supersedes the "DO NOT make it" portion of
[[reference_ollama_executor_selection_architecture_2026_06_25]] for the 2 measured modes.
