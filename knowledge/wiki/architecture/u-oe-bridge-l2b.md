---
title: U-OE-BRIDGE-L2B — live MCP-dispatcher tools
type: architecture
milestone: OLLAMA-EXPAND-MS0
unit: U-OE-BRIDGE-L2B
slot: foxtrot
shipped: 2026-05-18
commit: 2518aa3514
authors:
  - claude-3c737257
links:
  - "[[ollama-prism-bridge]]"
  - "[[spec-ollama-prism-mcp-bridge-design]]"
  - "[[ollama-bridge]]"
  - "[[reference_ollama_prism_bridge_l2]]"
---

# U-OE-BRIDGE-L2B — live MCP-dispatcher tools

**Commit:** `2518aa3514` · slot foxtrot, 2026-05-18 · OLLAMA-EXPAND-MS0

Layer 2b of the Ollama→PRISM-MCP bridge ladder. Adds a 7th read-only tool
`mcp_call(dispatcher, action, params)` to `scripts/ollama-prism-bridge.mjs`
that invokes a curated, frozen allowlist of LIVE PRISM MCP dispatcher actions
over JSON-RPC 2.0 + the MCP Streamable HTTP transport at
`http://127.0.0.1:3100/mcp`. This closes the explicit blocker from the
[[spec-ollama-prism-mcp-bridge-design]] §L2b ("blocked on resolving the MCP
server's HTTP protocol surface").

## What unblocked it

A direct probe of the running `prism-mcp-server` v2.10.0 confirmed it speaks
MCP Streamable HTTP. The probe's `tools/list` returned all ~97 dispatchers as
function-tools. The required client behavior:

- POST `http://127.0.0.1:3100/mcp`
- Header `Accept: application/json, text/event-stream` (both required —
  server rejects with "Not Acceptable" if either is missing)
- JSON-RPC 2.0 envelope: `{ jsonrpc:"2.0", id, method:"tools/call",
  params:{ name:<dispatcher>, arguments:{ action, ...params } } }`
- Response may be a single JSON envelope or an SSE stream of `data:` lines

The transport was never actually blocked — the previous design spec marked it
"queued, blocker unresolved" without an empirical probe.

## Surface (frozen read-only allowlist)

14 actions across 2 dispatchers:

- **`prism_calc`** (10 pure-physics actions): `cutting_force`, `tool_life`,
  `speed_feed`, `surface_finish`, `power`, `torque`, `mrr`, `chip_load`,
  `chip_thinning`, `cycle_time`
- **`prism_session`** (4 read-only queries): `master_index_query`,
  `dispatcher_map_compact`, `action_search`, `action_find`

## Defense-in-depth (proven by per-file 2-reviewer gate)

1. `Object.freeze` on outer `MCP_ALLOWLIST` AND each inner action array
2. Explicit `MCP_DENYLIST` (8 known-write dispatchers: `prism_dev`,
   `prism_atcs`, `prism_orchestrate`, `prism_cam`, `prism_safety`,
   `prism_memory`, `prism_export`, `prism_cad`) as regression guard against
   future merges that mistakenly add a mutating dispatcher
3. `validateMcpCall` at the upstream `validateToolCall` layer
4. **Impl-boundary re-validation** in `buildToolImpls` — a future caller
   invoking `buildToolImpls()` directly with an injected `mcpClient` cannot
   bypass; the impl re-validates the allowlist before consulting the client
5. Frozen `TOOL_NAMES` allowlist (7 tools)
6. `MCP_PARAMS_MAX_CHARS = 4096` defends against model-induced payload
   inflation
7. `MCP_RESULT_MAX_CHARS = 8192` caps tool-result feed-back into context

## Per-file scrutiny verdicts

- **Arm A (code-analyzer)**: PASS — 0 P0/P1, 2 P2 polish, 3 P3 nits
- **Arm B (independent reviewer)**: PASS with 2 P1 — BOTH addressed before
  commit:
  - **P1.1** — allowlist over-claimed verified coverage. Fixed by adding a
    REAL-DATA per-action live probe test (14/14 OK against the live :3100
    server, 0 failures), an honest-scope docstring (R12), and the
    `MCP_DENYLIST` negative regression guard.
  - **P1.2** — `graphCache` shared closure-local `let` (long-lived container
    leak). Fixed by moving to a root-keyed `Map` matching the existing
    `_leafCache` / `_obsidianCache` / `_embeddingsCache` pattern.

## Tests

199 (was 157) — **198 pass / 1 skip / 0 fail**. New coverage (+42):
- 8 cases on `validateMcpCall` (allowlist enforcement, params shape/size)
- 6 cases on `parseMcpResponse` (JSON / SSE / malformed / fallback)
- 4 cases on `renderMcpResult` (content[] / structuredContent / string / null)
- 6 cases on `mcpCallStreamable` (happy / SSE / HTTP error / JSON-RPC error /
  AbortError / network throw)
- 4 cases on `buildToolImpls.mcp_call` (injected client / fail / re-validate
  / thrown client)
- 4 cases on toolSpecs + system prompt + TOOL_NAMES wiring
- 1 agent-loop integration case
- 2 REAL-DATA E2E (single + per-action allowlist probe, both skip-loud)
- 1 MCP_DENYLIST regression guard
- 1 P1.2 graph-cache uniformity proof

The per-action live probe is the load-bearing oracle: 14 OK / 0 failures
against the running server means every allowlist entry routes end-to-end.

## Honest scope (R12)

- Action NAMES are confirmed present in each dispatcher's Zod action enum.
- LIVE routing is empirically verified for all 14 actions.
- Per-action PARAM CONTRACTS rely on each dispatcher's own Zod schema:
  invalid shapes return a fail-loud JSON-RPC error the agent loop surfaces
  to the model for recovery on the next turn — the bridge never silently
  corrupts malformed inputs.

## What L2b does NOT ship

- Layer 3 (full multi-step PRISM agent) remains queued as before; needs
  larger local model + L2b telemetry on tool-selection accuracy first.
- The 8 mutating dispatchers stay denied. Adding any of them is a separate
  decision requiring an explicit write-safety audit, not a same-day ship.

## Knobs

- `PRISM_MCP_URL` — override default `http://127.0.0.1:3100/mcp`

## Lineage

- L1 (`ask-ollama.mjs`, U-OE01, charlie 2026-05-18) — direct viz/file query
  with no tool-calling
- L2 (`ollama-prism-bridge.mjs`, U-OE-BRIDGE-L2, charlie 2026-05-18) — agent
  loop with 6 read-only KNOWLEDGE tools (viz_search, wiki_lookup,
  read_excerpt, obsidian_lookup, dispatcher_map, semantic_search)
- **L2b (this unit, U-OE-BRIDGE-L2B, foxtrot 2026-05-18) — adds the 7th
  tool: live MCP-dispatcher calls**
- L3 — queued
