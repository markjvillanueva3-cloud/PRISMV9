# LOCAL-LLM-MS1 consumer wiring + fleet-doctrine enforcement (slot:india, 2026-06-09)

Shipped: `e32615c8e5` (U-LOCAL-GENERATE-CONSUMER), `d13604947f` (U-AUTOFIX-BLACKWELL-ENFORCE), `ef39d5a6c7` (scrutiny-fix). 3-of-3 PASS (A holistic + B mutation-tested + C analyst).

## Reusable patterns

1. **Fail-soft MCP consumer.** To honor "route local LLMs through the MCP server" without making MCP a hard dependency: gate the route behind an env flag (default OFF — byte-identical legacy path) and FALL SOFT to the direct path on ANY MCP failure (server down, stale bundle missing the action, timeout). `ask-ollama.mjs:callModel` routes via `prism_local:local_generate` first, falls back to `callOllama`, tags `source` (`mcp` / `ollama-fallback` / `ollama`). Enabling the route can only help; it never breaks a working offload. LIVE-validated: against a `:3100` bundle predating the action, the round-trip returned JSON-RPC `-32602 Tool prism_local not found` -> fell back -> real output.

2. **Cycle-free leaf-lib extraction.** `ollama-prism-bridge.mjs` imports `ask-ollama.mjs`, so ask-ollama could NOT import the bridge to reuse its `mcpCallStreamable` (ESM cycle). Fix: extract the shared MCP Streamable-HTTP client (`parseMcpResponse` + `mcpCallStreamable`) into a leaf lib `scripts/lib/mcp-streamable-client.mjs` that neither side depends back on; re-export from the bridge byte-identically so its tests (which import those names FROM the bridge) still resolve. When two modules both need a util and one already imports the other, the util belongs in a leaf lib, not in either module.

3. **MCP `tools/call` envelope (live-proven).** `{ jsonrpc:"2.0", id, method:"tools/call", params:{ name:<dispatcher>, arguments:{ action, ...params } } }` — action params are SPREAD into `arguments` alongside `action`, NOT nested under a `params` key. Header `Accept: application/json, text/event-stream` is REQUIRED (StreamableHTTPServerTransport). Default URL reads `$PRISM_MCP_URL` (NOT `MCP_HTTP_URL`).

4. **Fleet-wide doctrine enforcement = session-gated UserPromptSubmit hook.** To make a behavioral directive "auto-enforced fleet wide", a UserPromptSubmit injector fires for EVERY slot's prompt; session-gate it (once per session via a sentinel, same pattern as `mcp-route-suggest`'s doctrine gate) so it anchors the directive in context without re-burning tokens every turn. Wire in settings.json (C: -> mirror to H:), validate BOTH parse as JSON (a broken settings.json breaks the whole fleet). `auto-fix-blackwell-doctrine-inject.mjs` (knob `PRISM_AUTOFIX_DOCTRINE_DISABLE=1`).

## Bug-finding

**Stale test caught by the auto-fix-inline doctrine** (the doctrine fixing itself in the act of being built): `ask-ollama.test.mjs` `pickModel` asserted the retired `qwen2.5-coder:3b`; the BLACKWELL-MODEL-UPGRADE kept `qwen2.5-coder:32b` as the floor coder. The CODE was right, the TEST was stale to the hardware upgrade. Fix the wrong one (the test) — never weaken to pass. Lesson: when a hardware/model upgrade retires a tag, grep tests for the retired tag; stale assertions hide until run.

**MCP tool-level `isError` vs JSON payload.** `extractLocalGeneratePayload` must check `result.isError === true` and surface the error text BEFORE trying to JSON-parse `content[].text` — a stale bundle returns an `"MCP error ..."` text part, and parsing it as the output JSON gives a misleading "not valid JSON" instead of the real dispatcher error.

## Fleet-wide miner rollout (the apply-to-all, R15)

The consumer route (pattern 1) was then cloned onto EVERY live per-domain transcript miner so "route local LLMs through MCP" holds fleet-wide, not just for `ask-ollama`. Three live miners, three commits:
- `3cf36669e0` — india miner (`ollamaCall`, opts 3rd arg).
- `d99be7d62d` — galaxy miner (the 34-galaxy generalization; `ollamaCallOnce`, opts 4th arg because it threads a per-call `timeoutMs` — MAP 240s vs SYNTH 900s — so the MCP envelope gets the REAL per-call timeout, not a hardcoded default; an improvement over india).
- `2ae59c6aa0` — hotel miner (`ollama`, opts 3rd arg).

Each overlay is identical in shape: opt-in `PRISM_LOCAL_LLM_VIA_MCP` (default OFF = byte-identical legacy), forward `{ numCtx: NUM_CTX(32768), numPredict: MCP_NUM_PREDICT, timeoutMs }`, fail soft to the direct `/api/generate` path on ANY MCP failure (falsy result / `ok:false` / ok-but-empty-text), preserve the R12 empty-200-OK + non-2xx fail-loud guards on the direct path. Seam pattern for hermetic tests: `(prompt, model[, timeoutMs], opts={mcpEnabled, callViaMcpImpl, fetchImpl})`. 6 hermetic tests per miner (overlay routes w/ numCtx; MCP fail + ok-but-empty fall soft; gate-OFF cracks the request body to prove byte-identity; direct empty/non-2xx fail loud).

## Bug-finding (apply-to-all pass)

**Anti-truncation route must not re-introduce truncation (reviewer-B P2, fix `74ee070071`).** The MCP route exists to stop INPUT truncation (numCtx), but `prism_local local_generate` requires a `maxTokens` (the direct `/api/generate` path is uncapped), so the overlay caps OUTPUT at `MCP_NUM_PREDICT`. The original 8192 was fine for terse MAP slices but could silently truncate a dense-galaxy cross-session SYNTHESIS — the exact silent-data-loss class (R12) the route was built to kill. Fix: bump to 16384 (~64KB) in BOTH miners in lockstep (clone-don't-fork). Key insight: `num_predict` is a CEILING, not a target — the model emits EOS when done — so raising it costs nothing for short outputs and only protects long ones. When you cap output to satisfy a schema, the cap must exceed the LONGEST legitimate output, not the typical one.

**Hotel miner called `main()` UNCONDITIONALLY — no function importable without running the CLI (latent, fix `2ae59c6aa0`).** Its twins (india/galaxy) had an `__isMain` guard (`import.meta.url === pathToFileURL(process.argv[1]).href`); hotel diverged and ran `main().catch(...)` at module scope. This blocked the hermetic test (importing the module would launch the real mine) AND is a general hazard: any `import { x } from "./mine-hotel..."` triggers a network+disk mine. Lesson: a CLI script that defines reusable functions MUST guard its `main()` — the absence is invisible until someone (a test, a sibling script) tries to import it. When cloning a script family, diff the tails — a missing main-guard is a silent divergence.

Memory: [[reference_local_llm_mcp_route_2026_06_09]] · [[feedback_auto_fix_and_blackwell_fleet_enforced]] · [[reference_ollama_localhost_ipv6_fetch_fail_2026_06_09]].
