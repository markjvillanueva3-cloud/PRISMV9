---
name: reference_ollama_rewriter_failure_recovery_2026_05_27
description: "Diagnose + recover prompt-rewriter-ollama from the 100% silent-skip / ollama-offline failure mode. Suppressing the banner hides the symptom; this memo captures the root-cause probe + fix path so the token-saving feature gets reactivated, not silenced."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.681Z
aliases: reference_ollama_rewriter_failure_recovery_2026_05_27
---


# Ollama rewriter failure-recovery — 2026-05-27 (slot:alpha observation)

**Symptom seen every prompt this session:**

```
## ⚠ prompt-rewriter-ollama is silently broken
Last 50 calls: **50 skipped (100%)**. Top reason: `ollama-offline` (50/50).
```

**Surface impact:** the prompt-rewriter is a 100% dormant token-saving feature — every UserPromptSubmit pays the warning overhead AND foregoes the rewrite savings. Suppressing via `PRISM_REWRITER_HEALTH_WARN_DISABLE=1` hides the symptom; root cause is the daemon, not the banner.

## Root-cause probe (2-call diagnostic)

```bash
# 1. Probe Ollama tag endpoint (usually works even when chat is hung)
curl -s --max-time 3 http://localhost:11434/api/tags && echo "[tags OK]" || echo "[tags FAIL]"

# 2. Probe chat endpoint — the one the rewriter actually uses
curl -s --max-time 5 -X POST http://localhost:11434/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"model":"qwen2.5-coder:3b","messages":[{"role":"user","content":"hi"}],"stream":false}' \
  | head -c 200 && echo "[chat OK]" || echo "[chat HANG]"
```

**Interpretation:**

| `/api/tags` | `/api/chat` | Diagnosis | Fix |
|---|---|---|---|
| OK | OK | rewriter wiring bug (not Ollama) | check `.claude/hooks/prompt-rewriter-ollama.mjs` model name vs `ollama list` |
| OK | HANG | GPU contention (NIM endpoints / model load loop) OR runaway request in queue | `ollama ps` to see active models, `ollama stop <model>` to free GPU, or `Restart-Service ollama` (Windows) |
| FAIL | FAIL | daemon dead | start with `ollama serve` or `Start-Service ollama` |

## Common causes specific to this PC (DESKTOP-N7MI1VB)

1. **NIM endpoint contention** — when the NIM-style inference endpoint is loaded, qwen2.5-coder:3b waits behind it. `ollama ps` shows multiple `expires` timestamps on the same GPU.
2. **Stuck inference loop** — a prior cancelled `/api/chat` request can leave Ollama mid-decode; `ollama stop <model>` + retry usually clears it.
3. **GPU memory pressure** — [[reference_fleet_memory_monitor_2026_05_16|fleet-memory-monitor]] doesn't track GPU VRAM. Check `nvidia-smi` if available; if VRAM is pinned, restart the offending process (often a stale jupyter kernel or VS Code copilot).

## Why this matters

`ollama-offload-stats.json` shows the rewriter is one of the highest-volume offload hooks — every prompt has rewrite potential. 100% skip means ~9.6K tokens/session of pre-condensation savings are forfeited (per the bare-node banner that fires elsewhere).

Per `[[feedback_ollama_token_routing]]`: Ollama owns code-explain/summarize/docstring/classify/lint/diff-summary — the rewriter is the highest-frequency consumer. Keep it healthy.

## Anti-pattern

Setting `PRISM_REWRITER_HEALTH_WARN_DISABLE=1` to silence the banner. The banner is the warning; silencing it means the next session won't notice the regression, the offload-rate metric drops, and `dashboards/ollama-offload-stats.json` becomes meaningless. Fix the daemon, don't suppress the warning.

## Related

- `[[feedback_ollama_token_routing]]` — what Ollama should be doing
- `[[reference_ollama_pipeline_ms0_2026_05_15]]` — pipeline architecture
- `[[reference_ollama_expand_ms0]]` — local-LLM offload surface
- `H:/prism/.claude/hooks/prompt-rewriter-ollama.mjs` — the hook itself
- `H:/prism/mcp-server/data/state/ollama-offload-stats.json` — health metrics
- `H:/prism/scripts/ollama-docker-health.mjs` — CLI probe (preferred over hand-crafted curl)
