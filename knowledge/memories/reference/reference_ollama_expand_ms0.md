---
name: reference-ollama-expand-ms0
description: "OLLAMA-EXPAND-MS0/U-OE01 — ask-ollama.mjs local query service; the Ollama→PRISM-MCP bridge is a layered build, not a config flag."
aliases: reference_ollama_expand_ms0
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.238Z
---


2026-05-18 slot charlie. Built `scripts/ask-ollama.mjs` (OLLAMA-EXPAND-MS0/U-OE01) — a local Ollama query service Claude invokes via Bash so token-heavy work never enters the Claude context. Modes: `viz` (ranked keyword search of the ~27MB system-viz graph — pure local code, no model, ~0 Claude tokens; `--synth` adds an Ollama answer), `summarize`/`explain`/`triage` (file→Ollama digest), `ask`. 55-case test incl. 2 real-data E2E. `/ask-local` skill documents the routing rule.

**Why:** Ollama offload rate measured 10.2% (target 30%); 536 offload *suggestions* ignored in 24h. Every Ollama hook is advisory — it suggests, it can't force. An explicit callable converts a suggestion into a real offload.

**How to apply:** before reading a large file / searching the graph / explaining unfamiliar code — run `node scripts/ask-ollama.mjs <mode>` instead. See [[ask-local]].

**Lessons (R12):**
- The live E2E caught two bugs the injected-dep tests could not: multi-word graph search returned nothing (delegating to `system-viz-query.mjs find` = single-token substring match — replaced with an in-process ranked scorer), and a 2-minute model cold-load (`load_ms:113573` — host at ~96% commit pressure). Always ship a real-data E2E for a pure-core+injected-deps design.
- Scrutiny arm B caught a real OOM: `loadGraph` had no size cap; the ~370MB `system-graph.json` fallback would OOM a 4GB heap. Fixed with an 80MB `MAX_GRAPH_BYTES` cap — over-cap files are stat-ed and skipped, never read.
- Host reality: this box is memory-pressured; one warm small model (`qwen2.5-coder:3b` + `keep_alive`) beats model-swapping. `viz` default is search-only so it never depends on Ollama being fast.

**Ollama→PRISM-MCP bridge:** Ollama is a model server, NOT an MCP client — it cannot "connect to MCP". A Node harness (MCP client + tool-call loop) is required. Layered: L1 = `ask-ollama` (shipped), L2 = read-only dispatcher bridge (queued `U-OE-BRIDGE-L2`), L3 = full agent loop (deferred — needs a bigger local model). Docker just networks the pieces; it is not the access mechanism. Spec: `state/shared/specs/OLLAMA-PRISM-MCP-BRIDGE-DESIGN.md`.

## Related
[[reference_ollama_pipeline_ms0_2026_05_15]] · [[token_saving_infrastructure]] · [[ask-local]]
