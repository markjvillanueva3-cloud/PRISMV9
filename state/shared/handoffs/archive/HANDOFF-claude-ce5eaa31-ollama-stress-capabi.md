---
session: claude-ce5eaa31
topic: ollama-stress-capability
slot: alpha
written_at: 2026-06-25T01:29:17.027Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-ce5eaa31
status: active
---

# HANDOFF: claude-ce5eaa31
Updated: 2026-06-25T01:29:17.027Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-ce5eaa31

## STATE
U-ALPHA-OLLAMA-STRESS shipped+hardened+honesty-passed. 7b=mechanical sweet spot; knee c=2 (c=8 wedges); large models (32b/120b) wedge multi-model sweeps -> clean band <=14b co-resident. Battery=mechanical NOT code-gen (caveat). Ollama left healthy. 22/22 tests. wiki ollama-stress-capability-frontier.

## RESUME
Ollama stress-test deliverable COMPLETE (d79f06d849 harness, 52bbd7bedb wedge-guard, f190542258 honesty). OPERATOR-GATED next: apply OLLAMA_NUM_PARALLEL=4 + OLLAMA_MAX_LOADED_MODELS=4 + restart Ollama, then re-run concurrency + clean 32b tier (both wedge under default config). Parked: U-ALPHA-OCTOPUS-ALLGALAXIES.

## CONTEXT

