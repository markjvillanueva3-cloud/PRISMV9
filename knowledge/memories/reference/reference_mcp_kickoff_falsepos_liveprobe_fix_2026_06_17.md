---
name: reference_mcp_kickoff_falsepos_liveprobe_fix_2026_06_17
description: "Operator's recurring \"chats STILL getting kicked off the MCP server\" was (again) a FALSE fleet broadcast on a healthy server -- NOT an OOM. My first-pass OOM/concurrency diagnosis was WRONG; fixed the residual stale-cache false-positive by gating the broadcast on a LIVE :3100 probe."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.652Z
aliases: reference_mcp_kickoff_falsepos_liveprobe_fix_2026_06_17
---


# MCP "still getting kicked" -- live-probe broadcast gate + my OOM-misdiagnosis correction (2026-06-17, slot:bravo)

Commit `U-MCP-FALSEPOS-LIVEPROBE` on `slot/bravo` (cad-fusion-live-ms0). 3-of-3 PASS (session claude-d6db4d0e). lib 28/28 + hook 20/20; live-validated against the real :3100.

## R12 SELF-CORRECTION (the important part)
My **first-pass diagnosis was WRONG**. I claimed the daemon "OOM-dies under a 64-wide concurrency spike" and shipped `PRISM_MCP_MAX_CONCURRENCY=16` (.env) + `PRISM_MCP_REQUEST_RETRY_MS=90000` (.mcp.json). The evidence did NOT support an OOM:
- `supervisor.log` had ONE child-exit: code `4294967295` (0xFFFFFFFF) / signal `null` -- the Windows `TerminateProcess`/`Stop-Process -Force` signature, i.e. **my OWN earlier kill of PID 17008**, NOT a V8 abort.
- **No `FATAL ERROR`/`heap out of memory` marker anywhere** in the logs. index.ts's uncaughtException handler exits `1`, not 0xFFFFFFFF.
- Multiple same-day golf soaks: **peak_inflight 1-6 over 6h** (never near the 64 cap); 32 concurrent inits all HTTP 200; `:3100` answered /health in **5ms**. A 64-wide spike never happens.
- 64/512 is the **contract-tested** capacity (`mcp-capacity-contract.test.ts`); lowering it (the silent 6->3 before) was a guarded-against regression. My cap=16 lowered a deliberately-headroomed value on a false premise (R7 violation). **Both my changes were REVERTED.**

## THE REAL ROOT CAUSE (verified live)
The "kicked" pain is a **FALSE fleet `/mcp reconnect -- every chat disconnected` broadcast** on a HEALTHY server. `mcp-bridge-enforce-pretool.mjs::maybeWriteBroadcast` writes `state/shared/mcp-reconnect-signal.json` when `countBridges()===0` (the **NORMAL idle resting state** -- bridges are transient spawn/serve/exit shims) AND the cached serverUp isn't fresh-healthy. The golf fix `80ce407d2c` (`cachedServerUpVerdict`) only suppresses within a **900s last-known-healthy window**; the UserPromptSubmit health cache refreshes only at turn-start, so during an idle gap it ages past 900s -> `serverUp` undefined -> `decideEnforcement` falls back to broadcast-on-fleet-0 -> false alarm fleet-wide (+ a likely self-inflicting reconnect-churn loop). CONFIRMED LIVE: a false signal written `2026-06-17T15:25:12` while :3100 was 5ms-healthy.

## THE FIX
Require **positive DOWN evidence** at the broadcast WRITE site. New pure `liveBroadcastVerdict(liveProbe)` (`scripts/lib/mcp-bridge-enforce.mjs`): broadcast IFF `ok===false`; healthy/indeterminate -> suppress (symmetric inverse of `cachedServerUpVerdict`). `maybeWriteBroadcast` is now async: after `shouldWriteBroadcast` (TTL dedup) passes, it does ONE live `probeUrl(:3100/health)` and writes ONLY on confirmed DOWN; a healthy probe refreshes the connectivity cache (closing the stale window). Probe runs only in the rare about-to-broadcast path (<=1/900s fleet-wide). Per-chat HARD-BLOCK path UNCHANGED; fail-open preserved. Probe timeout single-sourced to `getConfig().timeoutMs` (3000ms) so it can't re-open a 2-3s false-DOWN band (3-of-3 arm-C P2, fixed pre-merge).

## Why / How to apply
**Why:** the same lesson as [[reference_mcp_falsepos_idle_broadcast_fix_2026_06_17]] + [[reference_token_awareness_stale_zone_fix_2026_06_11]] (R7 family): a stale-prone PROXY (cache age) must NOT actuate a fleet-wide alarm -- distinguish "no positive UP evidence" (suppress) from "positive DOWN evidence" (broadcast). And (R12): when a "X is crashing/broken" report contradicts the metrics, **prove the failure mode from the actual logs first** -- an ambiguous exit code (0xFFFFFFFF) is NOT an OOM without a FATAL marker; don't ship a capacity band-aid for a crash that isn't happening.
**How to apply:** before alarming the fleet (or any expensive irreversible fleet action) off a transient/cached signal, do ONE authoritative live probe at decision time and require a CONFIRMED-down result. 0 transient bridges is the resting state, not an outage. See [[reference_mcp_false_disconnect_and_capacity_guard_2026_06_17]], [[reference_golf_mcp_bridge_count_false_positive_2026_06_17]], [[reference_mcp_enforce_gate_staging_harm_2026_06_16]].
