---
source: project
section: OLLAMA CONTEXT FLOOR (canonical PRISM brief on every local-LLM call — added 2026-05-04)
slug: ollama-context-floor-canonical-prism-brief-on-every-local-ll
indexed_at: 2026-05-04T20:05:40.031Z
---

## OLLAMA CONTEXT FLOOR (canonical PRISM brief on every local-LLM call — added 2026-05-04)

`OllamaContextFloorEngine` prepends the canonical PRISM brief (`mcp-server/data/state/CLAUDE-BRIEF.md`) as a system prompt to every Ollama API call routed through `OllamaHookBridgeEngine`. This gives `deepseek-r1:14b` and `qwen2.5-coder:7b` the same baseline awareness as Claude/Gemini/Codex without per-call repetition.

**Brief lifecycle:** auto-regenerated on SessionStart by `mcp-server/scripts/generate-claude-brief.mjs`. Stale-detection: >12h triggers full re-inject; >24h triggers full regenerate.

**Skip-list:** tasks tagged `bare-ollama` in the offloader (raw text formatting, deterministic stringification, embedding-only pipelines) — no PRISM context needed; saves ~2K tokens per call.

**API:** `ollamaContextFloorEngine.wrap({ prompt, model, taskTag, mode })` returns `{ system, prompt, modeUsed, fromBundle }` ready for `/api/generate`. Engine reads `state/shared/CLAUDE-BRIEF.md` once per process and caches with 12h TTL. **Mode** field: `brief` (default, ~13KB CLAUDE-BRIEF only), `standard` (+memory +claims +position, ~22KB), `full` (+master-index +GSD-quick, ~26KB) — standard/full invoke `prism-awareness-bundle.mjs` and cache per-mode.
