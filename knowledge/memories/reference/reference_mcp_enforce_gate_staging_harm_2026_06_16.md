---
name: reference_mcp_enforce_gate_staging_harm_2026_06_16
description: A fleet-wide PreToolUse hard-block driven by a SHARED signal corrupts shared-tree git staging across all chats; block only on per-chat-isolated signals and never on git.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.652Z
aliases: reference_mcp_enforce_gate_staging_harm_2026_06_16
---


# MCP-enforce gate ate shared-tree git staging fleet-wide (2026-06-16, slot:bravo)

Built `mcp-bridge-enforce-pretool.mjs` (MCP-CLIENT-ENFORCE-MS1) — a PreToolUse hard-gate (matcher `.*`) that DENIES tool calls when the prism MCP bridge is confidently disconnected, to satisfy the operator's "automate and enforce connection checks" ask. It worked (live-blocked this chat's real bridge-down). **But it caused immediate fleet harm the operator reported: "mcp blocks keep eating stagings for other chats."**

**Root cause (two coupled defects):**
1. The gate hard-blocked on the **fleet-wide** `countBridges()` enum-cache reading 0. That cache is **shared + stale-prone** — it reads 0 in EVERY chat at once, so the hard block fired **fleet-wide simultaneously**. When a chat's `git add`/`git commit` Bash call is DENIED at PreToolUse mid-sequence, files left staged in the **shared `H:/prism` index** get absorbed by a peer chat's `git add -A`/commit → cross-chat staging corruption.
2. The gate did not exempt `git` — so denying a git command mid-sequence was itself a staging hazard.

**Fix (committed [MAIN] U-PRETOOL-GATE-SAFE):**
- Hard-block ONLY on a **per-chat confident sentinel** (`pid-dead`/`stale-heartbeat` from `mcp-bridge-liveness.readBridgeLiveness`) — precise + isolated to the ONE genuinely-dead chat. A fleet-wide count=0 now drives the **advisory `/mcp` broadcast ONLY** (`kind:"fleet-advisory"`, `block:false`).
- Exempt `git` commands (regex on `tool_input.command`) and orchestration tools (Agent/Task/Workflow — own subagent connectivity) from the gate.
- Broadcast moved before the allow-return so a fleet outage still nudges all chats without blocking. 30 tests.

**Why:** a SHARED/coarse signal must never drive a per-chat HARD block — it fires everywhere at once. Hard blocks belong only on signals ISOLATED to the affected unit. And a PreToolUse gate must never interrupt stateful shared-tree operations (git staging) — they corrupt across concurrent chats.

**How to apply:** before wiring any fleet-wide PreToolUse hard-block (matcher `.*`), ask: (1) is the trigger signal per-chat-isolated or shared? shared → advisory only, never block; (2) does it gate stateful/shared ops (git, locks)? exempt them. Live files at `H:/prism/.claude/hooks/mcp-bridge-enforce-pretool.mjs` + `scripts/lib/mcp-bridge-enforce.mjs`. Related: [[reference_mcp_client_enforce_ms0_2026_06_13]] (the MS0 detection half this enforces).
