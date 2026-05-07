# HANDOFF: claude-ade4d057
Updated: 2026-04-29T03:30:39.697Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-ade4d057

## STATE
MS1-05 Mill-Turn shipped (d26e80eb9 pushed). Chat-bus zombie fix half-landed: parent-PID approach proved unstable on Windows — needs revert to staleness-only with tighter 5min TTL.

## RESUME
Revert parent-PID liveness gates in chat-bus-inject.mjs (activePeers, activeForeignClaims, isSessionAlive) and file-claim-guard.mjs (peerIsLive). Keep claudeParentPid in heartbeat schema as diagnostic only. Lower PRESENCE_TTL_MS from 10*60*1000 to 5*60*1000 in BOTH hooks. Update H:/prism/.claude/helpers/chat-bus-reap.mjs classifySession() to drop parent-PID branch — use 5min heartbeat staleness only. Then: node H:/prism/.claude/helpers/chat-bus-reap.mjs --dry-run (verify live peers NOT flagged), then run without --dry-run to actually reap. Verify next prompt's chat bus shows correct active peers.

## CONTEXT
Process.ppid is unstable across Claude Code hook invocations on Windows (ephemeral intermediary spawns hooks, not the long-lived session directly). Evidence: claude-72bb539a's claudeParentPid went 31964 → 26440 between heartbeats. Result: parent-PID gating misclassified ALL live peers as zombies. Reaper dry-run flagged 99 presence + 1004 claims — most are genuinely stale weeks-old records, but live peers (72bb539a/b0b6f0bd/cba638c3/93a0f582) were FALSE positives. Long-term fix (out of scope): SessionStart-spawned watchdog process pinging every 60s with stable PID.
