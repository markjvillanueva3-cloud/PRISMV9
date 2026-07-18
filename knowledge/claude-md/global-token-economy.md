---
source: global
section: TOKEN ECONOMY
slug: token-economy
indexed_at: 2026-06-21T04:20:36.239Z
---

## TOKEN ECONOMY

- **RTK prefix on bash** — `rtk vitest run` (99%), `rtk git/gh/npm/tsc/docker` (60-90% savings). Use in `&&` chains. Skip only if output <500 chars. `/rtk-setup` to install.
- **Ollama offload** — code explain/summarize/docstring/classify/lint/diff-summary/error-triage routed to local **qwen2.5-coder:32b** (heavy code / default) · **:1.5b** (trivial) · **gpt-oss:120b** (deep local reasoning, fits 96GB VRAM) · **gpt-oss:20b** (mid triage) via `/ollama-*` skills (9 of them) and `OllamaHookBridgeEngine`. The :3b/:7b/:14b tags were retired 2026-06-04 (Blackwell migration). Reserve Claude for deep reasoning + safety. See `feedback_ollama_token_routing.md` + `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md`.
- **Tool selection** — Glob/Grep over Bash find/grep · `Read offset=X limit=Y` for partial · Parallel independent tool calls in one message · Don't re-read after Edit/Write (hooks track).
- **Context extension** — per-agent `HANDOFF-<id>-<topic>.md` (6 chats), `MEMORY.md` index (<200 lines), digests over exploration, load-on-demand skills, keyword-gated hook injections.

---
