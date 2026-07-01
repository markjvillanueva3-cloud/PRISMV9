---
source: project
section: OLLAMA OFFLOAD DASHBOARD
slug: ollama-offload-dashboard
indexed_at: 2026-04-30T16:36:31.218Z
---

## OLLAMA OFFLOAD DASHBOARD

Telemetry: `mcp-server/data/state/ollama-offload-stats.json`. Dashboard: `node scripts/ollama-offload-dashboard.mjs [--json|--window=48h|--reset]`. Healthy ≥30% offload rate; `offloaded=0, keptOnClaude>0` means Ollama unreachable — check `http://127.0.0.1:11434/api/tags` and `.claude/cache/ollama-rate-limit.json`.
