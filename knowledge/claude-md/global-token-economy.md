---
source: global
section: TOKEN ECONOMY
slug: token-economy
indexed_at: 2026-04-29T04:59:43.025Z
---

## TOKEN ECONOMY

- **RTK prefix on bash** — `rtk vitest run` (99%), `rtk git/gh/npm/tsc/docker` (60-90% savings). Use in `&&` chains. Skip only if output <500 chars. `/rtk-setup` to install.
- **Ollama offload** — code explain/summarize/docstring/classify/lint/diff-summary/error-triage routed to local qwen2.5-coder:7b via `/ollama-*` skills (9 of them) and `OllamaHookBridgeEngine`. Reserve Claude for deep reasoning + safety. See `feedback_ollama_token_routing.md`.
- **Tool selection** — Glob/Grep over Bash find/grep · `Read offset=X limit=Y` for partial · Parallel independent tool calls in one message · Don't re-read after Edit/Write (hooks track).
- **Context extension** — per-agent `HANDOFF-<id>-<topic>.md` (6 chats), `MEMORY.md` index (<200 lines), digests over exploration, load-on-demand skills, keyword-gated hook injections.

---
