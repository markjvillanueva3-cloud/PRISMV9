# PRISM Multi-Model Ollama Stack

**Milestone:** INTEL-OLLAMA-OBSIDIAN-MS0 / P20-U01
**Last verified:** 2026-05-04
**Pull script:** `scripts/pull-multi-model-stack.mjs`
**Router:** `mcp-server/src/engines/ModelRouterEngine.ts` (P20-U03)

PRISM uses a tiered local-LLM stack so every task runs on the smallest competent model. The router selects the tier from task kind + signal flags; Claude is reserved for tier-5 deep reasoning + safety polish.

| Tier | Kind         | Model                  | ~Size  | When to use                                                         |
|-----:|:-------------|:-----------------------|-------:|:--------------------------------------------------------------------|
| 0    | embed        | `nomic-embed-text`     | 0.27GB | Vector backbone for Qdrant + RAG (768-dim)                           |
| 1    | code-simple  | `qwen2.5-coder:7b`     | 4.7GB  | Boilerplate, docstrings, classification, lint, diff summary         |
| 2    | code-medium  | `qwen2.5-coder:14b`    | 9.0GB  | Multi-file edits, mid-complexity refactors, error triage            |
| 3    | reason       | `deepseek-r1:14b`      | 9.0GB  | Chain-of-thought, pre-Claude review drafts, debugging hypotheses    |
| 4    | vision       | `llama3.2-vision:11b`  | 7.9GB  | PDF blueprint extraction, diagram OCR, image-bearing manuals        |
| 5    | deep         | Claude (escalate)      | —      | Safety, physics, manufacturing-domain synthesis, novel architecture |

Total local disk: ~31 GB (excluding optional flagships). All models live under `H:/Tools/Ollama/models/`.

## Optional flagships (disk-conditional)

| Model              | ~Size | Status   | Trigger                                                  |
|:-------------------|------:|:---------|:---------------------------------------------------------|
| `llama3.3:70b`     | 43GB  | deferred | Pull only if H: has >100GB free; competitor to tier-3    |
| `qwen2.5-coder:32b`| 19.9GB | already pulled | Acts as fallback for tier-3 if deepseek-r1 unavailable |

## Smoke-test contract

Every pulled model must respond:
- **embed**: `/api/embeddings` returns vector of length ≥ 32
- **chat**: `/api/generate` returns non-empty `response` string for prompt "Reply with the single word: OK."
- **vision**: same as chat (true image round-trip lives in `VisionExtractionEngine` tests, P21-U01)

Smoke failures block the script with exit code 1.

## Tier override flags

Callers can force a tier via `TaskInput.forceTier`:
- Useful for benchmarking adaptive-routing decisions (P23)
- Useful when a known-tier-2 task wants to A/B against tier-3 quality

## Ollama daemon discovery

Resolution order (first hit wins):
1. `OLLAMA_HOST` env var
2. `http://127.0.0.1:11434` (default)

Binary path for `ollama pull` (script-only, not engine):
1. `OLLAMA_BIN` env var
2. `H:/Tools/Ollama/ollama.exe` (default Windows install)

The engine itself talks pure HTTP — no binary dependency. Only the pull script shells out, and only for the rare initial-install path.

## Rollback

Each model is independently removable:
```
H:/Tools/Ollama/ollama.exe rm <model-name>
```
The router gracefully degrades: if a tier-N model is missing, tasks at that tier escalate to tier-N+1 (eventually Claude). Adaptive routing (P23) records this and may auto-promote a fallback to primary if the original is offline for >24h.

## Wiring

- **Engine**: `ModelRouterEngine` (P20-U03) — `routeForTask(input) → RoutingDecision`
- **Dispatcher**: `prism_ai:model_route` action (P20-U03)
- **Hooks** (P20-U04 — refactor existing 4 ollama hooks to consume router):
  - `.claude/hooks/ollama-unified-semantic-router.mjs`
  - `.claude/hooks/ollama-context-aggregator.mjs`
  - `.claude/hooks/ollama-session-continuity.mjs`
  - `.claude/hooks/claudemd-ollama-enforcer.mjs`
- **Pre-review pattern**: `PreReviewOrchestratorEngine` (P22) drafts via tier-3, hands off to Claude
- **Telemetry**: `ModelTelemetryEngine` (P23) logs per-model latency/quality/tokens

## Maintenance

Re-run `node scripts/pull-multi-model-stack.mjs` whenever:
- A new model is added to `MODELS` array in the script
- An existing model has a published upgrade (`ollama pull <name>` is idempotent + auto-updates)
- After a fresh worktree on a new machine
- After Ollama upgrades the model storage format
