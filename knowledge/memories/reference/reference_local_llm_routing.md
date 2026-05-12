---
name: Local LLM routing — Ollama models loaded on this machine
description: Updates older 7b claim. Current stack is qwen2.5-coder:14b + deepseek-r1:14b. Skill auto-discovery suppressed; hooks fire automatically.
type: reference
originSessionId: cee63f1f-130d-4ed3-baf2-1d8812d9acb2
---
**Supersedes the model claim in `feedback_ollama_token_routing.md`** (which referenced qwen2.5-coder:7b). Current stack as of 2026-05-06:

**Loaded models on this machine** (`http://127.0.0.1:11434/api/tags`, install at `H:\Tools\ollama\`):
- **qwen2.5-coder:14b** (8.99 GB, Q4_K_M) — code-focused tasks
- **deepseek-r1:14b** (8.99 GB, Q4_K_M) — reasoning + diff/error analysis

Daemon auto-started by SessionStart hook `ollama-autostart.mjs`. Telemetry at `mcp-server/data/state/ollama-offload-stats.json` (read with `node scripts/ollama-offload-dashboard.mjs`).

**Owned task types** (route here, NOT to Claude):
- code-explain, summarize, docstring-generate, classify, lint, diff-summary, error-triage, extract, test-stub, boilerplate, prompt-rewrite, hook-relevance-gate

**Routing surfaces:**
- **Hooks (automatic, always fire):** `ollama-auto-router.mjs`, `ollama-task-offloader.mjs`, `ollama-skill-suggester.mjs`, `prompt-rewriter-ollama.mjs`, `ollama-terminal-watcher.mjs`, `local-compute-intent.mjs`, `claudemd-ollama-enforcer.mjs`
- **Skills (`/ollama-*`):** marked `user-invocable-only` per `reference_active_settings_2026_05_06.md` — model auto-discovery suppressed. User invokes directly: `/ollama-explain`, `/ollama-summarize`, `/ollama-docstring`, `/ollama-classify`, `/ollama-diff-summary`, `/ollama-error-triage`, `/ollama-extract`, `/ollama-test-stub`, `/ollama-boilerplate`
- **Engines:** `OllamaHookBridgeEngine`, `OllamaAutoRouterEngine`, `OllamaContextAggregatorEngine`, `OllamaPRISMIntelligenceEngine`, `OllamaSemanticRouterEngine`, `OllamaSessionContinuityEngine`, `ObsidianMemoryRagEngine`

**NIM/VLLM fallback:** env vars `NIM_URL=http://127.0.0.1:8000/v1`, `VLLM_URL=http://127.0.0.1:8020/v1`, `LOCAL_LLM_BACKEND=auto`, `NIM_FALLBACK_TO_OLLAMA=1`. Auto-started by `nim-autostart.mjs` SessionStart hook.

**Reserved for Claude (do NOT offload):**
- Deep reasoning, safety gates, physics validation, cross-domain synthesis, dispatcher routing decisions, code edits to safety-critical paths, scrutiny review consensus arm

**How to apply:**
- For code-explain / docstring / lint / error-triage requests: hooks already auto-route. Don't burn Claude tokens by re-doing it.
- Suggest `/ollama-*` slash commands when user wants explicit local-LLM call.
- Healthy offload rate ≥30%; if `offloaded=0, keptOnClaude>0`, daemon may be down — check :11434 and rate-limit cache `H:\prism\.claude\cache\ollama-rate-limit.json`.
- For `/ollama-architecture-plan`: deepseek-r1:14b is the recommended model for the task.
- Anti-pattern: sending an Ollama-routable task to Claude "to be safe." Cost compounds across every session.
