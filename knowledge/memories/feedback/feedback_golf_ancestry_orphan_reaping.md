---
name: feedback-golf-ancestry-orphan-reaping
description: Reap ONLY ancestry-confirmed orphans — a node.exe whose immediate parent is the node launcher wrapper is a live chat's MCP server, not an orphan.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.428Z
aliases: feedback_golf_ancestry_orphan_reaping
---


**Rule (slot:golf, [[reference_fleet_reaper|fleet-reaper]]):** A process is reapable ONLY if NO live `claude.exe` exists anywhere in its **full ancestor chain** (not just the immediate parent), AND age > 45s, AND it survived ≥ 2×300s confirm.

**Why:** Claude Code on Windows spawns the MCP server under a node *launcher wrapper*, not directly under `claude.exe`. So a single-level parent check classifies live chats' MCP servers as `non-claude-parent` orphans. The mcp-zombie hunter reports them as candidates and REFUSES to kill them (kill-failure) — that refusal is **correct**, not a bug. (2026-05-29: 22 live chats → ~37 MCP node procs @ ~700MB; only ancestry-dead ones are safe.)

**How to apply:** Trust the sweep's ancestry walk. NEVER bulk-kill the "16GB of MCP zombies" the hunter reports — that kills live chats, the opposite of fleet hygiene. Soft-relief (priority/working-set) before kills; kills are confirm-gated + last-resort. See galaxy `mcp-server/src/engines/fleet-hygiene/MEMORY.md`.
