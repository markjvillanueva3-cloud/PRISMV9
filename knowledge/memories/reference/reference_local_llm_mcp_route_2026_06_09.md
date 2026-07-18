---
name: reference_local_llm_mcp_route_2026_06_09
description: "prism_local dispatcher ALREADY routes local LLMs (Ollama/DeepSeek) through MCP (LOCAL-LLM-MS0). Dedup correction + precise scope for the one missing piece: a general local_generate action."
type: reference
galaxy: ai-training
source: prism-memory
synced: 2026-06-27T20:30:46.646Z
aliases: reference_local_llm_mcp_route_2026_06_09
---


# Local-LLM-through-MCP is ALREADY built (prism_local) — only `local_generate` is missing (slot:india 2026-06-09)

**Directive:** "make sure the local llms route through the prism mcp server and can freely sandbox within the h drive." Investigated before building (R8/dedup) and found the surface is **already built** — my earlier task framing ("no prism_ai:local_llm action exists") was WRONG (R12 self-correction). The canonical surface is a **dedicated `prism_local` dispatcher**, not a `prism_ai` action.

**What EXISTS (verified, do NOT rebuild):**
- `mcp-server/src/tools/dispatchers/localDispatcher.ts` (`prism_local`, milestone LOCAL-LLM-MS0) — routes to Ollama/DeepSeek through MCP. Actions: `validate_code`, `local_health`, `offload_classify`, `learn_pattern`, `search_patterns`, `trajectory_{start,step,end}`, `learning_stats`, `enforce_rules`, `aggregate_hooks`, `awareness_route`, `suggest_commit`, `execute_deepseek`, `deepseek_health`, `backend_route`, `backend_config`, `routing_stats`.
- Engines behind it: `OllamaTaskOffloaderEngine` (calls `http://localhost:11434/api/chat` at line 302), `LocalValidationEngine`, `LocalLearningEngine`, `LocalHookAggregatorEngine`, `LocalAwarenessRouterEngine`, `LocalCommitMessageEngine`, `DeepSeekInferenceEngine`, `BackendRouterEngine`.
- Schemas: `mcp-server/src/schemas/localActionSchemas.ts` (LOCAL_ACTIONS enum + per-action Input/Output + ACTION_LOCAL_SCHEMAS map).

**SHIPPED 2026-06-09 (LOCAL-LLM-MS1 / U-LOCAL-GENERATE, slot:india):** added the `local_generate` action to `prism_local` -- general-purpose `{prompt, model, system, temperature, maxTokens, timeoutMs}` -> Ollama text, so the miner / ask-ollama / any caller can route an arbitrary local-LLM generation THROUGH MCP. Wrapped the engine's existing `executeOffloaded` (extended with an optional `opts` 4th param + `model` in its return; 3-arg `mlDispatcher` caller unaffected). 10/10 tests (wiring + schema defaults + hermetic fetch-stub proving opts plumb to the request body + failure-mode). 2-reviewer PASS (fixed 2 P1: failure cause now in a dedicated `error` field not `content`; `ollamaUsed` semantics clarified). LIVE round-trip validated: gpt-oss:20b returned real text ("A CNC end mill is a rotating cutting tool...", 2270ms warm) through the dispatcher.

**REGRESSION FOUND + FIXED during live-validate (the R15 payoff):** the engine hardcoded `http://localhost:11434` for BOTH its `/api/tags` install-probe AND the `/api/chat` call. On this Windows host Node's `fetch` (undici) resolves `localhost` -> IPv6 `::1` first, where Ollama (IPv4-only) ECONNREFUSEDs in ~120ms -- so `local_generate` (and the pre-existing `mlDispatcher` `offload_execute` path + the install-probe that fills `installedModels`) silently could not reach Ollama. `curl localhost` works (dual-stack) which masks it; `node fetch('localhost')` does not. Fix: both URLs -> `127.0.0.1:11434` (matches the miner's convention, R11). Live re-validate confirmed. Lesson: on Windows, ALWAYS use `127.0.0.1` not `localhost` for Node-fetch to a loopback IPv4 service. See [[reference_ollama_localhost_ipv6_fetch_fail_2026_06_09]].

**The gap that was closed:** every prior action was task-specific (validate / classify / deepseek / route). There was **no general "run an arbitrary prompt through a local Ollama model" action**. The miner + ask-ollama still call :11434 directly -- R15 follow-up = point them at `prism_local local_generate` to prove the consumer path (deferred; the action itself is shipped + live-validated).

**BUILD PLAN for `local_generate` (a fresh context, NOT a deeply-compacted one — heavy tsc + fleet-shared dirty tree; a half-built z.enum/case mismatch breaks the build fleet-wide):**
1. `OllamaTaskOffloaderEngine`: add a public `async generate({prompt, model, system?, temperature?, maxTokens?})` that wraps the existing `/api/chat` call (reuse the line-302 fetch path; do NOT add a 2nd Ollama client). Return `{content, model, latencyMs, ollamaUsed, tokensApprox}`.
2. `localActionSchemas.ts`: add `"local_generate"` to `LOCAL_ACTIONS` (snake_case) + `LocalGenerateInputSchema` (prompt min(1), model default e.g. "qwen2.5-coder:32b" or read from env, system optional, temperature 0..2 default 0.3, maxTokens int) + `LocalGenerateOutputSchema` + entry in `ACTION_LOCAL_SCHEMAS` + `INPUT_SCHEMAS` (dispatcher).
3. `localDispatcher.ts`: add `case "local_generate"` (validateActionParams -> getEngine("offloader") -> engine.generate -> slimResponse with metadata.tokensSaved/ollamaUsed) + mention it in `registerLocalDispatcher` description.
4. TEST: round-trip THROUGH the dispatcher against LIVE Ollama (R15 — not the singleton). Assert real content returned + ollamaUsed true + a known short prompt's shape. Anti-regression: action count strictly increases.
5. VALIDATE: live `prism_local local_generate` returns text; then (optional follow-up) point `ask-ollama.mjs` / the miner at the MCP route to prove the consumer path.

**H-drive sandbox:** the miner already reads/writes freely within H: (OUT_DIR + VAULT on H:); `ollama-prism-bridge.mjs` is the read-only L2 agent. Sandbox part of the directive is satisfied; the MCP-route part is this `local_generate` unit.

Related: [[reference_india_transcript_mine_2026_06_09]], [[reference_ollama_prism_bridge_l2]], [[reference_ollama_expand_ms0]], [[feedback_build_for_blackwell_hardware]].
