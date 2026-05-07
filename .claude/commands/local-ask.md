---
name: local-ask
description: Local Ask — Route Prompt Through Local LLM Stack First
---

# Local Ask — Route Prompt Through Local LLM Stack First

Route a prompt through PRISM's local LLM orchestration so Ollama models (with optional LoRA adapter) handle it before any cloud call. Cloud fallback only fires if the local stack can't meet hard requirements (tool use, safety, context window).

## Args: $ARGUMENTS
- `<prompt>`: the question or instruction to run
- `--kind=<taskKind>`: optional task kind (code-gen / reasoning / embed / tool-use). Default: reasoning.
- `--safety`: require safety-rated model (forces route.canServe gate)
- `--tools`: require tool-calling capable model
- `--local-only`: reject if no local model qualifies (no cloud fallback)
- `--budget=<ms>`: latency budget in ms
- `--dry-run`: return the routing decision without invoking the model

## Pipeline
1. **ModelRoutingEngine.route()** — scores catalog entries against request (quality − log cost − latency)
2. **LocalModelOrchestratorEngine.orchestrate()** — walks fallbacks, records per-hop attempts
3. **OllamaClientEngine** or **LLMEngine** — executes chosen model
4. Response attached with `attempts: [{ modelId, ok, latencyMs, tokens }]`

## Engines
- `LocalModelOrchestratorEngine` (U-LLM2) — glue between routing + execution
- `ModelRoutingEngine` (U-LLM7) — pure scoring, 11-entry default catalog
- `OllamaIntegrationEngine` (U-LLM10) — health cache, warm-up, candidate URL selection

## Dispatcher Call (once wired)
```json
{
  "tool": "prism_local_llm",
  "action": "orchestrate",
  "params": {
    "taskKind": "reasoning",
    "prompt": "<user prompt>",
    "requireSafety": false,
    "needsTools": false,
    "latencyBudgetMs": 30000
  }
}
```

## Why This Over Direct Cloud
- Keeps proprietary JM Die program data on local hardware
- Trains LoRA adapters (U-LLM3) on shop outcomes — local models get sharper over time
- Cloud stays for reasoning that genuinely needs Claude/Codex scale
