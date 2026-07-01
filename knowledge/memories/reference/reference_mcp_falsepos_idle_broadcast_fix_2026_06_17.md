---
name: reference_mcp_falsepos_idle_broadcast_fix_2026_06_17
description: "Operator \"chats get disconnected right away\" was a FALSE fleet \"/mcp reconnect\" broadcast on a HEALTHY idle :3100 server, not a real disconnect. Fixed the idle-fleet residual in mcp-bridge-enforce-pretool."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.652Z
aliases: reference_mcp_falsepos_idle_broadcast_fix_2026_06_17
---


# MCP false-positive idle-fleet "/mcp reconnect" broadcast -- root cause + fix (2026-06-17, slot:golf)

Commit `80ce407d2c` ([MAIN-FORCE] [MCP-RELIABILITY]/U-MCP-FALSEPOS-IDLE-BROADCAST). 3-of-3 PASS, 18/18 tests. Session `04256fb3-d30b-4652-ab9b-142a096f1045`.

## The operator symptom
"fix and improve mcp server please, chats get disconnected right away." Re-issued twice with escalating emphasis.

## What it ACTUALLY was (confirmed LIVE, not inferred)
NOT a real disconnect. A FALSE fleet-wide broadcast on a provably-HEALTHY server:
- `:3100 /health` returned HTTP 200; `peak_inflight=1` over 45min, 0 shed (64-concurrency / 512-queue capacity ~64x oversized for actual load -- so the "16-chat saturation" hypothesis is empirically false).
- The live `state/shared/mcp-reconnect-signal.json` was written ~2min before diagnosis by a PEER chat (pid 43452), reason "fleet MCP bridge count=0 (every chat disconnected) -- /mcp reconnect prism", WHILE the server was up.
- The UserPromptSubmit connectivity cache was 191s stale (> the 120s `HEALTH_CACHE_MAX_AGE_MS` authoritative window).

## The chain
`mcp-bridge-enforce-pretool.mjs` (T0 PreToolUse) -> `readCachedServerUp()` returned `undefined` whenever the connectivity cache was >120s stale (NORMAL mid-turn on long turns / idle gaps -- the probe is turn-start-only, throttled 30s) -> `decideEnforcement({serverUp:undefined})` took the legacy broadcast-on-fleet-0 path -> wrote the signal -> every chat showed the false banner. 0 transient stdio bridges alive is the NORMAL idle resting state (bridges spawn/serve/exit per request), NOT an outage.

## The fix
New pure exported `cachedServerUpVerdict(lastStatus, ageMs, lastKnownMaxMs)`: a last-known-HEALTHY probe within a 900s window (== broadcast TTL `DEFAULT_BROADCAST_TTL_SEC`; knob `PRISM_MCP_HEALTH_LASTKNOWN_MAX_AGE_MS`, floored via `Math.max` to the 120s authoritative window) counts as "server up" for broadcast SUPPRESSION ONLY.
- Down direction is NEVER suppressed past 120s -- a fresh `ok:false` returns `undefined` at any age, so a REAL outage still broadcasts (the next live turn re-probes :3100, writes `ok:false` fresh, re-enabling the path).
- The per-chat hard-block path (pid-dead / stale-heartbeat) is UNTOUCHED -- `serverUp` only gates the `broadcast` field in `decideEnforcement` (`broadcastOut = fleetOut && a.serverUp !== true`), never `block`.
- All error/degenerate inputs fail open (allow + never suppress): NaN/negative/null -> `undefined`.

Sibling of the earlier fresh-cache suppress fix (`9da42f74c6`) -- this closes its documented idle-fleet residual.

## Tests (R9)
+9: 7 pure verdict-matrix (the exact 191s live-bug value + both 900s boundary sides + env-tunable window + fail-safe) + 2 round-trip subprocess (191s-stale-healthy => NO signal file written; >900s-stale => signal STILL written / no over-suppression). Reverting the window fails tests at BOTH the unit and round-trip layer.

## Lesson
A connectivity proxy (cache age) that aborts to "unknown" on staleness must not actuate a fleet-wide alarm: distinguish "no positive UP evidence" (suppress, idle-safe) from "positive DOWN evidence" (broadcast). 0 transient bridges is the resting state, not an outage. Trust the authoritative per-turn probe for the DOWN signal; trust last-known-healthy within the TTL for SUPPRESSION only.

See [[reference_token_awareness_stale_zone_fix_2026_06_11]] -- same R7 family (a freshness signal must not overwrite a measured signal with a fabricated worse one just because it is old).

## Session also confirmed
- Fleet Reaper + Fleet Memory Monitor scheduled tasks: State=Ready, LastResult=0 (active).
- Perf healthy: CPU 1%, RAM 24.5%, GPU 37C.
- `PRISM Fleet Task Health` scheduled task ABSENT (needs elevated PS re-registration -- operator action).
