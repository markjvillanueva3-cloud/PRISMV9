---
name: reference_u_oe_bridge_l2b_2026_05_18
description: "U-OE-BRIDGE-L2B — live MCP-dispatcher tools shipped (foxtrot, OLLAMA-EXPAND-MS0)"
aliases: reference_u_oe_bridge_l2b_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.006Z
---


2026-05-18 slot foxtrot (claude-3c737257) — commit `2518aa3514`. Closes the
L2b blocker named in [[spec-ollama-prism-mcp-bridge-design]]: empirically
verified that prism-mcp-server v2.10.0 at `http://127.0.0.1:3100/mcp` speaks
MCP Streamable HTTP (Accept: application/json + text/event-stream both
required, JSON-RPC 2.0 envelope). Adds 7th read-only tool `mcp_call` to
`scripts/ollama-prism-bridge.mjs` exposing 14 curated live actions:
prism_calc (cutting_force, tool_life, speed_feed, surface_finish, power,
torque, mrr, chip_load, chip_thinning, cycle_time) + prism_session
(master_index_query, dispatcher_map_compact, action_search, action_find).

**Defense-in-depth**: frozen MCP_ALLOWLIST (outer + inner arrays) + explicit
MCP_DENYLIST regression guard (8 known-write dispatchers) + validateMcpCall
upstream + impl-boundary re-validation in buildToolImpls (caller cannot
bypass via injected client) + frozen TOOL_NAMES + params 4096-char cap +
result 8192-char cap.

**Per-file scrutiny**: Arm A (code-analyzer) PASS 0 P0/P1; Arm B
(independent reviewer) PASS with 2 P1 BOTH FIXED in-session:
- P1.1 allowlist over-claimed → fixed via REAL-DATA per-action probe test
  (14/14 OK against live :3100, 0 failures) + honest-scope docstring +
  MCP_DENYLIST regression guard
- P1.2 graphCache shared closure-local `let` → moved to root-keyed Map
  matching _leafCache/_obsidianCache/_embeddingsCache pattern

**Tests**: 199 (+42), 198 pass / 1 skip / 0 fail. The per-action live probe
is the load-bearing integration oracle.

**Lessons**:
1. The L2b "blocker" was never actually blocked — a direct
   `curl POST http://127.0.0.1:3100/mcp` returned the exact 406 error
   string naming the required Accept header. Verify-empirically beats
   accepted-wisdom: always probe before queuing as blocked. See
   [[reference_ollama_prism_bridge_l2]] for the L2 ship.
2. The hermetic "1 dispatcher × 1 action" E2E test from L2 was not enough
   to honest-scope a 14-action allowlist (Reviewer B P1.1). The per-action
   probe over the FULL allowlist is the regression oracle the spec
   actually required. Same class as
   [[reference_juliett_devtools_synergy_map_2026_05_17]] §"hermetic fakes
   don't prove production wiring".
3. Cache uniformity (P1.2): when 3 of 4 caches in a file are root-keyed
   Maps and 1 is a closure-local `let`, that 1 is the bug. Match the
   pattern.

Wiki: [[u-oe-bridge-l2b]]. Sibling: [[reference_ollama_prism_bridge_l2]] ·
[[spec-ollama-prism-mcp-bridge-design]].
