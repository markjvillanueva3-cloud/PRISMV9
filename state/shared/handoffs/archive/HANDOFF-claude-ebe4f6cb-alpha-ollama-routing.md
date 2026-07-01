---
session: claude-ebe4f6cb
topic: alpha-ollama-routing
slot: alpha
written_at: 2026-06-25T15:09:59.122Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-ebe4f6cb
status: active
---

# HANDOFF: claude-ebe4f6cb
Updated: 2026-06-25T15:09:59.122Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-ebe4f6cb

## STATE
## Shipped this turn (post-compact, slot alpha, 2 commits + 1 finding memo, 3-of-3 PASS, loop iter 2)
- c243f01414 U-ALPHA-OLLAMA-CHEAPEST-MODEL-SELECT: ollamaSafeClassModels picks CHEAPEST matrix-proven model (new pure modelCostRank) vs first-in-roster-order. 34/34.
- 2d4b7f4e72 ...-MOE-HARDEN: closed 3 P2s (NxMb MoE multiplier, load-bearing slice-guard test, docstring). 36/36 + 26/26 effort-tier.
- reference_ollama_executor_selection_architecture_2026_06_25.md: traced the 3-layer selection arch; verdict = executor cheapest-warm unit R13-blocked behind GPU stress-test; auto-offloader path correct-as-is; do NOT reverse loaded-first on a guess.

## Chain status: roster(9 measured)->matrix->policy(cheapest) DONE. Executor(cheapest-warm) BLOCKED behind stress-test (R13).

## Env-blocked (need fleet-idle GPU -- fleet reloads 32b within seconds, confirmed): clean-box num_ctx VRAM measure; per-mode stress battery (the prerequisite for the executor unit); qwen3-coder:30b vs 32b codegen winner.

## Other goal facets (fresh focused sessions): hermes cli/agent, obsidian vault, /system-viz, octopus utilization.

## RESUME
/startup-alpha /loop [10m] /goal. CORRECTED next-unit framing (this turn's trace supersedes the prior 'GPU-free core' note -> see [[reference_ollama_executor_selection_architecture_2026_06_25]]): the ollama offload selection has 3 disconnected layers -- (1) routePrompt MATRIX-AWARE (advisory only, model-tier-advisor) now picks cheapest-proven [shipped this session]; (2) routeModelForTask STATIC/tier (ollama-task-offloader); (3) ask-ollama LOADED-FIRST warmth-aware [the real executor]. The auto-offloader path is CORRECT-AS-IS (it intentionally omits --model so ask-ollama's warmth-aware loaded-first picks at exec time -- do NOT force --model, that reintroduces cold-load thrash). The ONLY real lever (ask-ollama loaded-first preferring cheapest-SUFFICIENT warm model over biggest) is R13-BLOCKED: ask-ollama modes (explain/summarize/triage) are GENERATIVE, NOT the matrix's deterministic classify/extract/format classes, so 'sufficient' needs the GPU-blocked per-mode stress-test data -- building it now = guessing quality thresholds. CORRECT ORDER (fleet-idle GPU): stress-battery -> measured mode->min-model table -> prewarm cheap tier co-resident -> loaded-first prefers cheapest warm clearing the measured threshold (reuse modelCostRank). Do NOT build on guessed thresholds (R7/R8/R13).

## CONTEXT

