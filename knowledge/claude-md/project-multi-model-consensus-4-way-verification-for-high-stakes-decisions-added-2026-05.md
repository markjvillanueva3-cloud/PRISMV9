---
schema_version: 1.0.0
source: project
section: MULTI-MODEL CONSENSUS (4-way verification for high-stakes decisions — added 2026-05-04)
slug: multi-model-consensus-4-way-verification-for-high-stakes-decisions-added-2026-05
start_line: 167
end_line: 183
indexed_at: 2026-05-05T13:49:55.475Z
content_hash: 9dd557f543b0245bde983772b6a2cc289b2bacaff74b9d79462d89c80c8be8de
mirror_engine: ClaudeMdChunkerEngine
---
## MULTI-MODEL CONSENSUS (4-way verification for high-stakes decisions — added 2026-05-04)
Engines: `MultiModelConsensusEngine` + `ConsensusCoordinatorEngine` + `TaskClassifierEngine` (in `H:/prism-iooms0/mcp-server/src/engines/`). Classifier decides when consensus is warranted (high blast-radius, ambiguous spec, divergent priors).

**Providers (vote + agreement signal):**
- **Codex** (gpt-5.5 xhigh) — ChatGPT subscription via `codex exec`
- **Ollama** (`deepseek-r1:14b` / `qwen2.5-coder:7b`) — local, free, fast
- **Gemini** (`gemini-3-pro-preview`) — Google subscription via `gemini -p` CLI (NOT REST API — REST is free-tier `limit:0` for preview models)
- **Grok** (`grok-4`) — xAI API key (subscription does NOT grant API access; key is separate billing)

Provider clients: `CodexClientEngine`, `OllamaClientEngine`, `GeminiClientEngine`, `GrokClientEngine` — all in `H:/prism-iooms0/mcp-server/src/engines/`.

**Agreement threshold:** ≥3/4 ⇒ pipeline-verified. ≥2/4 with semantic equivalence ⇒ tentative-pass. Divergent ⇒ surface gap signal, escalate to human. Comparator extracts last integer / first canonical token (not all-digits-concatenated).

**Demo:** `H:/prism-xproc-neural/scripts/test-consensus-3way.mjs` — parallel call to Codex+Ollama+Gemini, declares consensus.

**When to invoke:** any architectural decision touching ≥10 files; any new dispatcher schema; any safety-tier-up review (Ω≥0.95 path); any production-release sign-off.
