---
session: claude-ebe4f6cb
topic: alpha-ollama-stress
slot: alpha
written_at: 2026-06-25T16:56:59.972Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-ebe4f6cb
status: active
---

# HANDOFF: claude-ebe4f6cb
Updated: 2026-06-25T16:56:59.972Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-ebe4f6cb

## STATE
## Ollama-utilization goal: COMPREHENSIVELY DELIVERED this session (6 commits, all 3-of-3 PASS)
### Routing chain (pre-stress-test):
- c243f01414 CHEAPEST-MODEL-SELECT: ollamaSafeClassModels picks cheapest matrix-proven model (modelCostRank). 34/34.
- 2d4b7f4e72 MOE-HARDEN: NxMb multiplier + slice-guard test. 36/36.
### Stress test (operator paused fleet + ultracode + 'run it anyway'):
- 69b31cbfbf STRESS-FRONTIER: ran 6 graded batteries x 9 models on idle GPU. scripts/stress-frontier-report.mjs (merge tool, 8/8) + state/shared/ollama-stress-frontier.md (the capability frontier) + 9-model matrix regen + cost-router citation.
- b2d527b126 PROBE-NULL-NOT-ZERO: excludeNoSignalModels guard (false-0 fix, 6/9 models were generation-failed). 12/12.
- 81ad651188 P2: guard-symmetry defensive fix.

## MEASURED FRONTIER (the operator's ask answered with data):
- qwen3-coder:30b BEST mechanical 27/36 (> qwen2.5-coder:32b 26/36, AND cheaper) -- VERIFIES the prior unverified router claim.
- 7b = mechanical sweet spot (22/36); 1.5b(1GB) does all codegen+most JSON @100%.
- deepseek-r1 reasoners 0/36 mechanical (<think> breaks exact-match) -> never mechanical.
- gpt-oss:120b weak mechanical 7/36 -> synthesis only.
- NONE-local: iso-insert-grade, tap-drill-size, spindle-rpm-formula -> Claude+RAG.
- Routing verdict: SOUND (verification, not a fix).

## Memory: reference_ollama_stress_frontier_2026_06_25.md (+ _routing_roster_sync + _executor_selection_architecture).
## Still GPU-note: deepseek-r1:32b + gpt-oss:120b need a clean-VRAM run (resident 32b at 54.7GB persists even with chats paused -- a non-chat process holds it).

## RESUME
/startup-alpha /loop [10m] /goal. Ollama-utilization goal facet is COMPREHENSIVELY DELIVERED (6 commits this session, all 3-of-3 PASS): the roster->matrix->policy->frontier chain + the operator-authorized fleet-idle GPU stress test. OPEN follow-ups (NOT blocking): (1) the capability-PROBE's single-PROCESS 9-model run is unreliable for big models under contention (6/9 false-0) -- adopt the per-model-invocation pattern (ollama-stress-expanded-run already does) so a future clean-GPU probe carries valid big-model rows; (2) executor cheapest-warm (ask-ollama loaded-first) still R13-gated on per-MODE stress data -- but the per-mode frontier now EXISTS (state/shared/ollama-stress-frontier.md), so this is now buildable: make ask-ollama loaded-first prefer the cheapest warm model that clears the mode's measured frontier threshold; (3) RAG opportunity: iso-insert-grade/tap-drill-size are NONE-local but the facts ARE in PRISM's corpus -- a RAG inject would make local models pass them. Other named goal facets (hermes cli/agent, obsidian vault, /system-viz, octopus) = fresh focused sessions (octopus model-choice is a DELIBERATE diverse-strong design, NOT a cheapest-select target -- do not 'optimize' it).

## CONTEXT

