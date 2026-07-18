---
name: feedback_mcp_autoreconnect_each_turn
description: "Standing rule — if the MCP daemon is disconnected, the fleet auto-reconnects each turn (single-flight), never advisory-only. Enforced by the per-turn connectivity hook calling maybeReconnect()."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.433Z
aliases: feedback_mcp_autoreconnect_each_turn
---


**Standing rule (operator directive, 2026-05-31):** *"if any chat slot is disconnected they
automatically connect and check each turn to ensure you guys are always connected. enforce it somehow."*

**Why:** the shared MCP daemon (`127.0.0.1:3100`) backs every `mcp__prism__*` call across the
fleet. When it dropped mid-session, the per-turn `mcp-connectivity-check.mjs` hook only printed the
"🛑 MCP SERVER DISCONNECTED" banner — detection without action. Chats wasted turns on failing tool
calls until an operator manually restarted it. Detection ran every turn; reconnect ran only at
SessionStart (`mcp-daemon-autostart.mjs`). The mid-session per-turn ACTION was the gap.

**How to apply (MCP-AUTORECONNECT-MS0):**
1. **Never ship detect-without-act for a connectivity gate.** If a hook can tell a critical local
   service is down, it should *also* try to bring it back (single-flight, fail-soft), not just warn.
2. The shipped mechanism: `scripts/lib/mcp-reconnect-action.mjs` `maybeReconnect()` — single-flights
   a DETACHED daemon restart across the up-to-26-chat fleet via an O_EXCL lockfile
   (`state/shared/.mcp-reconnect.lock`) whose 60s TTL doubles as the throttle (≤1 spawn/window
   fleet-wide). Wired into the already-per-turn `mcp-connectivity-check.mjs` (golf patch-sibling
   `HOOK-PATCH-MCP-AUTORECONNECT.md`) — reuses its probe, no double-probe, no settings change.
3. **Manual lever:** `node H:/prism/scripts/mcp-reconnect.mjs` (any chat, scheduled task).
4. **Integration seam to remember:** the connectivity hook's probe field is **`.ok`**, not `.up`;
   `maybeReconnect` accepts both, but call it `{ ok: result.ok }` and ONLY in the down branch.
5. Knobs: `PRISM_MCP_AUTORECONNECT_DISABLE=1`, `PRISM_MCP_AUTORECONNECT_TTL_MS=N`.

R8 lesson: before building, I read all 4 mcp-*reconnect/autostart neighbors — the detection +
SessionStart-spawn already existed; the only net-new code was the fleet single-flight lock. Don't
rebuild what exists; wire the gap.

Wiki: [[mcp-autoreconnect]]. Sister: [[reference_fleet_task_health_ms0_2026_05_17]] (watchdog over
scheduled tasks), [[feedback_golf_owns_reaper]] (fleet hygiene). PSN [[feedback_psn_definition]].
