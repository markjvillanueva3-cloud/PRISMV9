---
title: MCP false-positive idle-fleet reconnect broadcast
type: lesson
tags: [mcp, reliability, fleet, false-positive, fail-loud, connectivity]
created: 2026-06-17
by: claude-golf
commit: 80ce407d2c
related: [session-continuity-stack, fleet-reaper]
---

# MCP false-positive idle-fleet "/mcp reconnect" broadcast

## Symptom (operator-reported)
"chats get disconnected right away" -- every chat shows a "/mcp reconnect -- every chat disconnected" banner.

## Diagnosis (confirmed LIVE 2026-06-17)
NOT a real disconnect. The PRISM MCP architecture is ONE shared stateless HTTP server on `:3100` (`mcp-server/dist/index.js`, RequestSemaphore 64-concurrency / 512-queue) plus per-chat TRANSIENT stdio->HTTP bridges (`mcp-http-bridge.mjs`) that spawn, serve one request, and exit. **0 live bridges is the NORMAL idle resting state, not an outage.**

Evidence the server was healthy while the banner fired:
- `:3100 /health` = HTTP 200; `peak_inflight=1` over 45min, 0 shed (capacity ~64x oversized for real load -- "16-chat saturation" is empirically false).
- The live `mcp-reconnect-signal.json` was written by a PEER chat while the server was provably up.
- The connectivity cache was 191s stale, past the 120s authoritative window.

## Root cause
`mcp-bridge-enforce-pretool.mjs` (T0 PreToolUse) `readCachedServerUp()` returned `undefined` when the UserPromptSubmit health cache aged past 120s (`HEALTH_CACHE_MAX_AGE_MS`). The cache only refreshes at turn-start (throttled 30s), so it goes stale MID-TURN on long turns / idle gaps. `decideEnforcement({serverUp: undefined})` then took the legacy broadcast-on-fleet-0 path and wrote the fleet signal.

## Fix (`80ce407d2c`)
Pure exported `cachedServerUpVerdict(lastStatus, ageMs, lastKnownMaxMs)`:
- Fresh (`<=120s`): `ok ? true : undefined` -- byte-equivalent to the old behavior.
- Stale but `ok` within 900s (broadcast TTL; knob `PRISM_MCP_HEALTH_LASTKNOWN_MAX_AGE_MS`, `Math.max`-floored to 120s): return `true` -> SUPPRESS the broadcast.
- Any down / >900s / malformed: `undefined` -> broadcast still fires.

Suppression is for the broadcast ONLY. The per-chat hard-block (`pid-dead`/`stale-heartbeat`) never reads `serverUp`. A real outage still broadcasts because the next live turn re-probes `:3100` and writes a fresh `ok:false`. Sibling of the fresh-cache suppress fix `9da42f74c6` -- closes its idle-fleet residual.

## Lesson
A connectivity proxy that degrades to "unknown" on staleness must NOT actuate a fleet-wide alarm. Distinguish **no positive UP evidence** (idle-safe: suppress) from **positive DOWN evidence** (broadcast). Trust the authoritative per-turn probe for the DOWN signal; trust last-known-healthy within the TTL for SUPPRESSION only. Same R7 family as the token-awareness stale-zone fix (`reference_token_awareness_stale_zone_fix_2026_06_11`): never overwrite a measured signal with a fabricated worse one just because it is old.

## Tests
`.claude/hooks/__tests__/mcp-bridge-enforce-pretool.test.mjs` 18/18 -- 7 pure verdict-matrix (exact 191s live value, both 900s boundary sides, env-tunable window, fail-safe) + 2 round-trip subprocess (191s-stale-healthy => no signal; >900s => signal written).
