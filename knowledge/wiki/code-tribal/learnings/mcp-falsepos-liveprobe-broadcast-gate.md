---
title: MCP false-positive "/mcp reconnect" broadcast — live-probe gate (root-cause permanent fix)
type: code-tribal
domain: mcp-reliability
created: 2026-06-17
slot: bravo
commit: U-MCP-FALSEPOS-LIVEPROBE
tags: [mcp, false-positive, fleet-broadcast, live-probe, regression, R12, R7]
---

# MCP "chats still getting kicked off the server" — live-probe broadcast gate

## Symptom (operator, recurring)
"chats are still getting kicked off the mcp server, find a permanent fix." The word **still** = prior "permanent fixes" (capacity tuning, heap-floor bump, cached-serverUp suppression) did not hold.

## What it actually was (verified, NOT an OOM)
A **FALSE** fleet-wide `/mcp reconnect — every chat disconnected` broadcast on a **provably healthy** `:3100`:
- One `supervisor.log` child-exit: code `4294967295`/signal `null` = Windows `TerminateProcess`/`Stop-Process -Force` (an external/manual kill), **not** a V8 OOM (which prints `FATAL ERROR: ... heap out of memory`; none in logs). index.ts uncaughtException exits `1`.
- Soaks: `peak_inflight` 1–6 over 6h (never near the 64 concurrency cap), 32 concurrent inits all 200, /health 5ms. The "64-wide concurrency spike / OOM" theory is empirically false.
- A live false signal was written `2026-06-17T15:25:12` while the server was 5ms-healthy.

## Root cause
`mcp-bridge-enforce-pretool.mjs::maybeWriteBroadcast` alarms the fleet when `countBridges()===0` — but **0 transient bridges is the NORMAL idle resting state** (the stdio→HTTP bridges spawn/serve/exit per request). The golf suppression `cachedServerUpVerdict` (`80ce407d2c`) only suppresses within a **900s last-known-healthy window**; the health cache refreshes only at turn-start, so during an idle gap it ages past 900s → `serverUp` undefined → `decideEnforcement` falls back to broadcast-on-fleet-0 → false fleet alarm (and a likely self-inflicting reconnect-churn loop). The window was narrowed (120s→900s) but the false-positive at the *source* was never closed.

## Fix — require positive DOWN evidence at the write site
- New pure `liveBroadcastVerdict(liveProbe)` (`scripts/lib/mcp-bridge-enforce.mjs`): broadcast **IFF `ok===false`**; healthy (`ok===true`) or indeterminate (null / no-`ok`) → **suppress**. The symmetric inverse of `cachedServerUpVerdict`.
- `maybeWriteBroadcast` is now async: after `shouldWriteBroadcast` (TTL dedup) passes, it does **one live `probeUrl(:3100/health)`** and writes the broadcast **only on a confirmed-down probe**. A healthy probe refreshes the connectivity cache (closing the stale window). The probe runs only in the rare about-to-broadcast path (≤1/900s fleet-wide → negligible cost). `main()` async; runner `main().catch(()=>allow())`. **Per-chat hard-block path UNCHANGED** (see [[mcp-enforce-gate-staging-harm]]); fail-open preserved. Probe timeout single-sourced to `getConfig().timeoutMs` (3000ms, the sibling's deliberately-widened value) so a healthy-but-slow server isn't misread as down.
- **Reverted** the misdiagnosed band-aids: `PRISM_MCP_MAX_CONCURRENCY=16` (.env → contract-tested default 64) + `PRISM_MCP_REQUEST_RETRY_MS=90000` (.mcp.json → baseline).

## Tests (R9) + validation
lib 28/28 (`liveBroadcastVerdict` matrix) + hook 20/20 (real ephemeral-server round-trips: live-UP → NO signal == the exact 15:25 bug; live-DOWN → signal still fires; neutering the gate FAILS the UP test). LIVE: the exact 15:25 condition (fleet-0 + >900s-stale cache) against the real up :3100 → `{continue:true}`, no false signal.

## Lessons
- **R12:** an ambiguous exit code (`0xFFFFFFFF`/signal-null) is NOT an OOM without a `FATAL`/heap marker — prove the failure mode from the actual logs before shipping a capacity band-aid for a crash that isn't happening. (My first-pass OOM diagnosis was wrong and reverted.)
- **R7 family** (cf. [[mcp-falsepos-idle-broadcast]], stale-zone token-awareness fix): a stale-prone proxy (cache age, transient count) must NOT actuate a fleet-wide alarm. Distinguish "no positive UP evidence" (suppress, idle-safe) from "positive DOWN evidence" (broadcast). Before any expensive/irreversible fleet action triggered off a cached/transient signal, do ONE authoritative live probe at decision time.
