---
name: reference_india_domain_awareness_2026_05_28
description: india custom domain-awareness surface — ai-training-awareness.mjs + slot-gated india-awareness-inject.mjs hook
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.152Z
aliases: reference_india_domain_awareness_2026_05_28
---


slot:india custom domain-awareness (U-PSGB-INDIA-AUDIT, 2026-05-28). `scripts/ai-training-awareness.mjs` renders LIVE ai-training domain state: NN-GRAPH deploy-gate verdict (from `state/shared/nn-graph/NN-EVAL.json`), checkpoint promotion state (live + `.candidate.json`), retrain-lifecycle status (`retrain-lifecycle.jsonl`), outcome-bus closed-loop depth. Pure `renderBlock(state)` + fail-soft `gatherState(prism)` + CLI (`--json`|human).

`.claude/hooks/india-awareness-inject.mjs` is a slot-gated UserPromptSubmit hook: NO-OP `{continue:true}` for 25/26 slots; for india it imports the renderer (resolved via `../../scripts/` relative to the hook's own tree, so it travels through merge) and injects the block as `additionalContext` so india ALWAYS has live domain context. Wired in worktree settings.json after `prompt-context-inject`; hook+script also placed in main-tree fleet dirs (`H:/prism/.claude/hooks` + `scripts/`) for live-now (golf merges the worktree-tracked source).

Tested hermetically: india-bound chat-slots -> injects additionalContext; non-india -> bare `{continue:true}`; node --check + JSON-parse pass. Knob: `PRISM_INDIA_AWARENESS_DISABLE=1`. Gate currently DEFERRED (pool=0, checkpoint AUROC 0.096 — see [[feedback_india_deploy_gate_hard]]). [[reference_india_ai_training_galaxy_2026_05_28]]
