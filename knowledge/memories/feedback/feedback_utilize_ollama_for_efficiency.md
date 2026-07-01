---
name: feedback_utilize_ollama_for_efficiency
description: "Operator standing directive (2026-06-09) - utilize Ollama (local LLM) for better task efficiency whenever viable. Route offloadable work (summarize, classify, lint, explain, diff-summary, lightweight code review, draft) to local models instead of burning Claude tokens. Claude reserved for deep reasoning, safety, and gate-required scrutiny."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.449Z
aliases: feedback_utilize_ollama_for_efficiency
---


**Operator directive (2026-06-09, slot golf): "utilize ollama for better task efficiency when viable."**

**Why:** Claude tokens are the scarce resource; the local stack is fast + free. This session's own Ollama audit confirmed the roster is correct for the Blackwell hw - `gpt-oss:120b` is the best-tier local brain (fits the 96GB VRAM), `gpt-oss:20b` strong (185 tok/s), `qwen2.5-coder` ladder + vision ensemble. `routeModelForTask` resolves every category to an installed model. So the stack is READY (see [[reference_local_compute_synergy_state_2026_06_09]]).

**How to apply:**
- **Offload to Ollama (viable):** summarize/explain/docstring/classify/lint/diff-summary/error-triage, drafting boilerplate, lightweight first-pass code review, extraction from unstructured text, large-doc reading (`/route-to-obsidian`). Surfaces: `scripts/ask-ollama.mjs` (modes viz/summarize/explain/triage/ask), `/ollama-*` skills, `ollama-cost-router.mjs routeModelForTask`, the `ollama-pipeline-injector` hook.
- **Keep on Claude (NOT viable to offload):** deep reasoning, safety/physics gates, multi-step orchestration decisions, and the **3-of-3 scrutiny gate** (which REQUIRES Claude reviewer agents - using Ollama there would soften the gate, a golf refuse-list item; never do that).
- **Honest self-critique that prompted this:** the offload take-rate is 5-9% vs the 30% target - the models are tuned and ready, the fleet just under-routes. The gap is adoption, not capability. Default to checking "can Ollama do this first pass?" before spending Claude tokens on mechanical/text work.

Pairs with [[feedback_ollama_token_routing]], [[feedback_prioritize_devtools_backend]]. CLAUDE.md S TOKEN ECONOMY + AI SYSTEM ROUTING.
