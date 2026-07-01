---
name: reference_obsidian_tokensavings_premise_falsified_2026_06_09
description: "R12 verification finding: the 2 discovery-queue token-savings items (#8 widen local-llm-task-router, #7 session-end-goal LLM) are BOTH non-viable on live verification. #8 — the offloader correctly keeps orchestration (not false-keeps); #7 — dormant hook reading month-stale data. The ollama task-offloader works as designed; the low 6.4% rate is an orchestration-heavy session, not a bug. Do NOT build either."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.666Z
aliases: reference_obsidian_tokensavings_premise_falsified_2026_06_09
---


# Token-savings discovery items #8/#7 falsified on live verification (2026-06-09, slot:alpha)

The 4-surface discovery ([[reference_obsidian_multisurface_discovery_2026_06_09]])
queued two token-savings items. Live verification (R8/R12, before building) shows
BOTH are non-viable — building either would be a fake savings change (R12 violation).

## #8 — widen local-llm-task-router WORK_CLASS_PATTERNS — FALSE PREMISE
Discovery claimed "offloader keeps 43, classifier maps unknown->keep; widen the
pattern table to recover orchestration false-keeps toward 30% offload." Live
`ollama-offload-dashboard.mjs`: offloader fired=53, offload=3, keep=44. Keep
breakdown the dashboard marks **"✓ correct-keep"**: orchestration 34, operator_directive
5, safety 1, deep_reasoning 1 — these SHOULD stay on Claude (R5: orchestration/
directives are judgment, not mechanical). Only `unknown`=3, and inspecting the 3
event snippets (`ollama-offload-stats.json` events): "make sure fleet reaper... is
running please", "do everything in loops until... validated", "you ran calculations
for every combination..." — all are operator-directives/deep-reasoning, all CORRECTLY
KEPT (just labeled unknown vs operator_directive). **Routing is correct; widening to
offload orchestration would be a REGRESSION** (judgment tasks → local model). The
6.4% rate is an orchestration-heavy session, not a misrouting bug.

## #7 — session-end-goal-synthesis LLM pass — DORMANT + STALE DATA
`session-end-goal-synthesis.mjs` (U-AI04) is **NOT wired** in either settings.json
(grep=0) → dormant, never fires → adding an LLM pass saves zero tokens. Worse, its
data sources are dead: `WORLD_SIM_PREDICTIONS.jsonl` mtime 2026-05-10 (a month stale),
`CAUSAL_GRAPH.json` 204 B / 2026-04-19, `SYNTHESIZED_GOALS.json` 574 B / 2026-04-19.
The whole U-AI04 autonomous-goal-synthesis subsystem stopped flowing predictions ~a
month ago. Wiring it would synthesize next-goals from month-old garbage. Non-viable
without first reviving the prediction feed (a separate, larger, uncertain-value effort).

## Lesson (compounds the discovery-verification doctrine)
Discovery-agent premises MUST be re-verified live before building (R8/R12). 2 of this
queue's token-savings items did NOT survive verification — exactly why the queue says
"premises agent-verified, re-verify before building." The genuine token-savings reality:
the offloader is healthy; the real lever is BEHAVIORAL (the model/fleet taking the
existing `ollama-route-pretooluse` [923 fires] / `grep-index-first` [331 fires, 49
suggests] suggestions), not a classifier code-fix. A raw-savings code-win is NOT
available in these surfaces. Next viable token/retention items: #4 (recall-counter RMW
race — recall-signal integrity, M), #6 (posttool-error-explain LLM tail — VERIFY wired +
that unmatched errors emit nothing, before building). Pairs with this session's shipped
vault-value/fully-wired work [[reference_obsidian_wikilink_dangling_fix_2026_06_09]].
