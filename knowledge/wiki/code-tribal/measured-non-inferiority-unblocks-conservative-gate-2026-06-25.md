---
title: A measured non-inferiority result unblocks a conservatively-blocked optimization -- prepend, don't append
type: code-tribal
tags: [ollama, model-routing, offload, measurement, quality-gate, vram]
created: 2026-06-25
slot: alpha
commits: [U-ALPHA-OLLAMA-MODE-SUFFICIENCY, U-ALPHA-OLLAMA-CHEAP-PRIME]
---

# A measured non-inferiority result unblocks a conservatively-blocked optimization

## The pattern

A prior session had CORRECTLY refused to downshift `ask-ollama`'s offload model to a cheaper coder:
the quality gate ("only a tiny warm coder -> cold-load the better one") was DELIBERATE, and the
available data (easy-only, single-difficulty) gave no proof the cheap model matched the big one on a
HARD task. The verdict was emphatic ("DO NOT make it ... a measured DECISION") -- but it also named the
EXACT precondition that would unblock it: *difficulty-stratified quality data within each mode + a
generative-quality metric (LLM-judge)*.

The lesson is two-fold:

1. **A "do not change" verdict that names its own unblock condition is an INVITATION, not a wall.**
   Building that precondition (here: the judged stress ladder -- LLM-judge grading semantic
   fact-capture, n=3 hard tier) and then making the change is the verdict HONORED, not reversed (R7).
   The conflict is surfaced and resolved by the newer, more-tested data -- not averaged or ignored.

2. **Frame the change as NON-INFERIORITY, not superiority.** The judged ladder showed 7b TIES 32b on
   easy/medium summarize+explain, TIES on hard-summarize (both fail -- the big model buys nothing
   there), and WINS hard-explain (100% vs 67%). The claim wired was the conservative one: "7b is
   non-inferior to 32b for these 2 modes at every measured difficulty." That claim is robust to the
   n=3 variance (treat the hard-explain win as a tie and it still holds) -- so it survives the
   small-sample objection the superiority claim would not. Non-inferiority ALSO dissolves the
   "runtime can't classify difficulty" blocker: if the cheap model is non-inferior at EVERY
   difficulty, the executor needs no difficulty classifier.

## The PREPEND-vs-APPEND insight (why the lever was "dead" before)

The same prior verdict noted a cheap-model add would be "DEAD anyway -- 32b is always the warm pick."
That was true for an APPEND (cheap model as last-resort, after the big-first list) -- a warm 32b always
matches an earlier preference entry first. A **PREPEND** (cheap floor ranked FIRST for the measured
modes) inverts it: a warm 7b now wins even when 32b is ALSO warm. Live-proven: with both resident,
`summarize --json` selected 7b. Where you insert into an ordered preference list decides whether an
optimization fires or is dead-on-arrival.

## Corollaries

- **Scope the downshift to exactly what was measured.** Only summarize+explain were in the judged
  battery, so only they got the cheap floor. codegen/triage/viz/ask/rerank keep the big-first
  preference -- extend the table only when a mode gets the same judged treatment (R13: never a
  consumer atop an unproven dependency).
- **Keep the change ADDITIVE + STRICT.** Prepend to a NEW per-mode list (never mutate the base
  constant a test pins); keep strict warm-pick semantics so a COLD cheap model is skipped (no
  cold-load) and the proven big-first path is the unchanged fallback. The optimization can then ONLY
  improve a warm-cheap case, never regress anything.
- **The activation is separate from the mechanism.** Preferring a warm cheap model does nothing if the
  cheap model is never warm. A demand-driven prime (warm it after a call that missed it) is
  self-limiting; it is best-effort against variable cold-load latency and must be fail-soft.

Related: [[reference_ollama_mode_sufficiency_2026_06_25]] ·
[[reference_ollama_executor_selection_architecture_2026_06_25]] ·
[[reference_ollama_llm_judge_metric_2026_06_25]] ·
[[stress-harness-false0-and-llm-judge-2026-06-25]].
