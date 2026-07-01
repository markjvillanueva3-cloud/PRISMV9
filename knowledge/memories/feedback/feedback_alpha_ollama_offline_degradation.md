---
name: feedback_alpha_ollama_offline_degradation
description: Ollama offload hooks silently skip when /api/chat is dead — check both endpoints before relying on offload
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.397Z
aliases: feedback_alpha_ollama_offline_degradation
---


`prompt-rewriter-ollama` + `ollama-pipeline-injector` + `ollama-task-offloader` silently SKIP when the Ollama daemon's `/api/chat` is dead (observed 2026-05-29: 86% skip, reason `ollama-offline`; `/api/chat` timed out at 8021ms). The trap: `/api/tags` can still answer (so naive health checks pass) while `/api/chat` hangs under GPU contention from NIM endpoints.

**Why:** "offload is wired" ≠ "offload is happening." A green `/api/tags` masks a dead `/api/chat`.

**How to apply:** before trusting offload, probe BOTH `curl -s http://localhost:11434/api/tags` AND `/api/chat`; confirm actual offload via `node scripts/ollama-offload-dashboard.mjs --json` (healthy = offload rate ≥ 30%; `offloaded=0,keptOnClaude>0` = unreachable). Fix = restart Ollama / free GPU. Probe disable: `PRISM_OLLAMA_CHAT_PROBE_DISABLE=1`.
