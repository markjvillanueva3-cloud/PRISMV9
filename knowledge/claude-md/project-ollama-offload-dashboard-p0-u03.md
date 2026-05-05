---
schema_version: 1.0.0
source: project
section: OLLAMA OFFLOAD DASHBOARD (P0-U03)
slug: ollama-offload-dashboard-p0-u03
start_line: 264
end_line: 281
indexed_at: 2026-05-05T13:49:55.486Z
content_hash: 0f5a63a5e73ae1baeefda4a6949c2e0a43c2489f15b0922af99374122702d987
mirror_engine: ClaudeMdChunkerEngine
---
## OLLAMA OFFLOAD DASHBOARD (P0-U03)
Local LLM offload telemetry lives in `mcp-server/data/state/ollama-offload-stats.json` (schemaVersion 2.0.0). Read it with:

```bash
node scripts/ollama-offload-dashboard.mjs           # human-readable
node scripts/ollama-offload-dashboard.mjs --json    # machine-readable
node scripts/ollama-offload-dashboard.mjs --window=48h  # custom window (max 168h)
node scripts/ollama-offload-dashboard.mjs --reset   # zero counters + clear events
```

Sections:
- **Totals (since reset)** — cumulative offloaded / kept-on-Claude / tokens saved.
- **Last 24h activity** — rolling event log filtered by --window.
- **Per-hook fire counts** — which hook fired, decision (offload/keep/suggest), tokensSaved.
- **Advisory** — actionable warnings (zero offloads, zero events, etc).

A healthy installation should show `offload rate ≥ 30%` after a session of mixed work. `offloaded=0, keptOnClaude>0` means the offloader is classifying tasks but Ollama is unreachable or rate-limited — check `http://127.0.0.1:11434/api/tags` and the rate-limit file at `.claude/cache/ollama-rate-limit.json`.
