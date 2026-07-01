---
name: reference_hermes_claude_code_wiring_2026_06_23
description: Hermes wired into Claude Code (CLI + Desktop) 2026-06-23 (slot:zulu) — standalone hermes MCP server for the :8645 Grok chat lane; #1 already-live, #2 built+wired, #3 operator-gated
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.604Z
aliases: reference_hermes_claude_code_wiring_2026_06_23
---


# Hermes -> Claude Code wiring (2026-06-23, slot:zulu, session 61eaae00)

Operator: "wire Hermes into the Claude Code desktop app" -> do #1/#2/#3, #3 primary -> fallback #2 -> #1.
Full status + runbook: `state/shared/specs/HERMES-CLAUDE-CODE-WIRING-2026-06-23.md`.

**3 distinct Hermes surfaces (verified):** prism_hermes (Hermes CLI control, 8 actions) · :8645 proxy
(Grok-OAuth OpenAI-compatible CHAT) · Nous Hermes desktop app (external Electron agent).

**What shipped (commit ecad5b371b, U-HERMES-MCP-SERVER):**
- **#1 ALREADY LIVE** — `claude_desktop_config.json` loads `prism` -> `dist/index.js` (contains the 8
  `hermes_*` CLI actions). No work needed; keep dist built.
- **#2 NET-NEW** — `scripts/hermes-mcp-server.mjs` (MCP SDK 1.29.0 stdio) exposes the :8645 Grok CHAT lane
  as 3 MCP tools (`hermes_ask`/`hermes_status`/`hermes_models`) — the gap #1 leaves (CLI control != chat).
  Fail-soft (proxy-down/non-200 -> MCP isError, never crashes transport); deps-injectable; `main()`
  guarded so import is hermetic. 12/12 tests + LIVE round-trip (`hermes_ask 'reply WIRED'` -> grok-4.20 ->
  "WIRED"). WIRED into BOTH `.mcp.json` (CLI) + `claude_desktop_config.json` (Desktop, backed up to
  `.bak-hermes-wire.json`). 2-of-2 scrutiny PASS.
- **#3 (PRIMARY, Nous app)** — substrate already built (outputs lane + viz roost + :3100 up + app
  installed); ONLY the operator-present `config.yaml` edit remains (sits beside a 23KB `.env` of secrets ->
  not autonomous). ~2-min runbook in the spec.

**Use now:** restart the Claude Code CLI session / Desktop app -> `hermes_ask` (chat) + `prism_hermes`
(CLI control) tools appear. Prereq: :8645 proxy up (`scripts/hermes-proxy-ensure.mjs`).

**Operator-awareness (2-of-2 P2):** the `.mcp.json` wiring means every CLI session spawns an extra idle
`node` (hermes server) — up to ~26 fleet-wide. Idle+cheap+graceful-if-down, but a real footprint; remove
by deleting the `.mcp.json` `mcpServers.hermes` entry if undesired.

Related: [[reference_hermes_ollama_parity_2026_06_17]] · [[reference_hermes_cc_bridge_ms0_2026_06_14]] ·
[[reference_hermes_app_incorporation_plan_2026_06_02]]. Doctrine [[feedback_synergy_definition]].
