---
name: reference_ollama_wedged_running_unreachable_2026_06_11
description: Ollama daemon can be wedged in scheduled-task State=Running while :11434 is unreachable; Start-ScheduledTask "PRISM Ollama Serve" re-kicks it. Fixes the silent Claude/Opus fallback.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.683Z
aliases: reference_ollama_wedged_running_unreachable_2026_06_11
---


# Ollama "Running but unreachable" -- the silent token-economy leak + its fix (2026-06-11, slot:sierra)

## Symptom
Stop hooks repeatedly warn: `Ollama daemon (:11434) UNREACHABLE -- Local-LLM offload / embeddings / octopus consensus are silently falling back to Claude -- token-economy degraded.` This is a REAL efficiency bug: every offloadable task (explain/summarize/classify/lint/embed/consensus + per-domain LoRA corpus generation) silently routes to Claude/Opus instead of the local 96GB Blackwell stack -- the exact opposite of the offload doctrine.

## Root state (verified)
The `PRISM Ollama Serve` scheduled task can report `State=Running` while `curl http://127.0.0.1:11434/api/tags` still fails -- the task process is alive but the daemon isn't serving the port (wedged child / crashed inner `ollama serve`).

## Fix (no elevation needed -- STARTING an existing task is unprivileged)
```powershell
Start-ScheduledTask -TaskName "PRISM Ollama Serve"
Start-Sleep -Seconds 6
Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 8   # expect: 12 models
```
Re-issuing Start-ScheduledTask on the already-"Running" task re-kicks the daemon. 2026-06-11: after the kick, `/api/tags` returned 12 models (gpt-oss:120b, qwen2.5-coder:32b, gpt-oss:20b, qwen3-coder:30b, deepseek-r1:32b, qwen2.5-coder:1.5b, ...). Offload economy restored.

## Why this matters for the efficiency goal
A wedged Ollama is the single biggest LIVE efficiency degradation when it happens -- it silently breaks the whole local-offload lever the fleet relies on. The fallback is SILENT (the Stop-hook warning is the only signal). Restarting it is the highest-ROI single action when offload-rate craters. Verify with `node scripts/ollama-docker-health.mjs` or the curl above. Pairs with the fallback-ladder doctrine [[feedback_ollama_fallback_sonnet_agents]] (when Ollama IS down, route mechanical work to a SONNET subagent, never silently to session Opus -- the U-EFF-04 `resolveExecutor` 0-call-sites gap is the code-level version of this leak).
