# Model Status — Local LLM Stack Health Snapshot

Report health of the local LLM stack: Ollama daemon reachability, installed models, warm-up state, active LoRA adapters, and cloud fallback availability.

## Args: $ARGUMENTS
- Empty: full status dump
- `--json`: emit machine-readable JSON only
- `--ping`: just ping each candidate URL (localhost, 127.0.0.1, LAN)
- `--warm`: force warm-up of the active model
- `--catalog`: list ModelRoutingEngine catalog + which entries pass `canServe` for a generic reasoning task
- `--adapters`: list registered LoRA adapters and active pointers

## What It Checks
1. **Ollama daemon**: `OllamaIntegrationEngine.ensureConnected()` against default candidates (localhost:11434, 127.0.0.1:11434)
2. **Installed models**: `discoverModels()` — names, sizes, quantization
3. **Health streaks**: `okStreak`, `failStreak`, `avgLatencyMs` from health cache
4. **Active adapter**: `PRISMLoRAAdapterEngine.activeMap()` — which LoRA each base model points to
5. **Routing catalog**: `ModelRoutingEngine` — 11 default entries, hardware gating applied

## Engines
- `OllamaIntegrationEngine` (U-LLM10) — daemon health + discovery
- `ModelRoutingEngine` (U-LLM7) — policy / catalog view
- `PRISMLoRAAdapterEngine` (U-LLM3) — adapter registry

## Dispatcher Call (once wired)
```json
{
  "tool": "prism_local_llm",
  "action": "status",
  "params": { "warmUp": false }
}
```

## Expected Healthy Output
```
Ollama: connected @ http://localhost:11434 (12 models, avg 47ms)
Active models:
  qwen2.5-coder:7b  → adapter: nightly-2026-04-16  (okStreak=12, 0 failures)
  nomic-embed-text  → no adapter
Routing catalog: 11 entries, 8 local, 3 cloud
```

## Red Flags
- `failStreak > 3` — daemon flapping; restart `ollama serve`
- `avgLatencyMs > 2000` for small prompt — GPU contention or wrong device
- `adapter trainedAt > 30 days old` — consider triggering `/train-lora`
