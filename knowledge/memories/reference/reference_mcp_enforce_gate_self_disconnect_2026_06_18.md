---
name: reference_mcp_enforce_gate_self_disconnect_2026_06_18
description: "THE real cause of 'MCP disconnects every chat after a few minutes' (recurring 2026-06): the mcp-bridge-enforce-pretool.mjs PreToolUse HARD GATE (built 2026-06-16) DENIES prism tool calls on a fragile liveness heuristic -- a gate that can only BLOCK (never reconnect) IS the disconnect. Disabled via PRISM_MCP_ENFORCE_DISABLE=1 + PRISM_MCP_BROADCAST_INJECT_DISABLE=1. Server itself was healthy the whole time."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.651Z
aliases: reference_mcp_enforce_gate_self_disconnect_2026_06_18
---


**The recurring "MCP server fails / every chat disconnects after a few minutes" is SELF-INFLICTED by the enforcement gate (2026-06-18, slot:golf).**

## The real root cause (after multiple band-aids failed)
Operator: "mcp server still failing and disconnected chats after just a few minutes for every chat... we never used
to have this many problems." Live diagnosis PROVED the server is NOT the problem:
- :3100 healthy + STABLE: uptime 12225s (3.4h), heap 686/777MB, `inflight:0 peak:2`, only 6 lifetime restarts. Not
  crash-looping, not OOM, not overloaded. Supervisor (pid 7372) + server (pid 29796) both 3.4h old.
- The orphan reaper (`stop_close_prism_nodes_v2.mjs` / "Zombie Reaper v2") is NOT killing MCP: `orphan-reaper.log`
  shows it only reaps benign orphaned git-fsmonitor + cron/build bash procs. ZERO kills of supervisor/server/bridge.

**THE CAUSE: `.claude/hooks/mcp-bridge-enforce-pretool.mjs`** -- a tier-T0 PreToolUse "*" HARD GATE (built 2026-06-16,
bravo, MCP-CLIENT-ENFORCE-MS1) that **DENIES a prism tool call** when it deems the chat "confidently disconnected"
(per-chat liveness SENTINEL heartbeat stale, OR the fleet bridge-enum-cache shows 0 bridges -- which is the NORMAL
idle resting state: transient stdio->HTTP bridges spawn/serve/exit). The hook ITSELF admits "A hook cannot reconnect
the harness client" -- so all it can do is BLOCK. When its heuristic false-positives (routine: a stale heartbeat after
a few idle minutes / a long turn, or countBridges()===0 at rest), it DENIES prism tool calls = the chat "loses MCP."
That is the operator's exact symptom: "after a few minutes" (heartbeat staleMs / 3min throttle), "every chat"
(fleet-0 + per-chat sentinel), "we never used to have this" (the gate is 2 days old -- it IS the regression). The cure
is worse than the disease: a gate built to STOP disconnects became the disconnect. Bravo's two same-session fixes
(U-MCP-FALSEPOS-LIVEPROBE live-probe gate + debounce) only patched the BROADCAST path; the per-chat HARD-BLOCK path
was left UNCHANGED, so it kept false-firing.

## The fix (real, not a band-aid)
`PRISM_MCP_ENFORCE_DISABLE=1` (settings.json env) -> the gate goes advisory-only, NEVER blocks a tool call (verified
live: hook returns `{"continue":true}` with the knob). `PRISM_MCP_BROADCAST_INJECT_DISABLE=1` -> stops the fleet
reconnect-nudge churn (consumer of `mcp-reconnect-signal.json`). Both mirrored C:->H:. This restores the pre-2026-06-16
behavior that worked: a healthy server + Claude Code's NATIVE reconnect + the advisory sentinel banner (non-blocking)
handle the rare real disconnect. **Takes effect on hook spawn from reloaded settings -> RESTART chats (or new chats)
for immediate fleet-wide effect; currently-running chats may keep the old env until restarted.**

## Doctrine (why this kept recurring)
A PreToolUse hook CANNOT reconnect the MCP client -- it can only block. So an "enforcement gate that denies tool calls
on a disconnect heuristic" is architecturally net-negative: on a false-positive it bricks a healthy chat; on a true
positive it still can't fix anything (the model was already going to fail the call). The liveness heuristic (per-chat
sentinel heartbeat + bridge enum-cache) CANNOT be made reliable enough -- idle/long-turn staleness and the
countBridges()===0 resting state are normal. Do NOT re-enable this gate. If MCP disconnects recur AFTER this fix +
a chat restart, the issue is genuine client<->:3100 transport (HTTP/SSE idle timeout), a SEPARATE diagnosis -- not the
gate. Sibling: [[reference_mcp_durable_tasks_disabled_orphan_supervisor_2026_06_17]] (an earlier, different MCP red
herring this same week) + the CLAUDE.md regression entry `mcp-reliability-u-mcp-falsepos-idle-broadcast` (the broadcast
half). The proliferation of MCP-babysitting machinery (enforce gate + broadcast-reconnect + route-takeup +
posttool-tracker + connectivity-monitor + autoreconnect) is itself the "we never used to have this" -- prefer the
stable server + native reconnect over fragile auto-enforcement.
