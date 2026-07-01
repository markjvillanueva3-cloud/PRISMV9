---
title: MCP concurrency hardening + the scrutiny-mark working-tree re-verify lesson
type: lesson
domain: dev-infra
created: 2026-06-09
slot: golf
unit: U-MCP-CONCURRENCY-HARDEN
commits: [ed94bc47, "+P1FIX"]
tags: [mcp, concurrency, semaphore, watchdog, scrutiny, backpressure, fail-loud]
---

# MCP concurrency hardening + scrutiny working-tree re-verify

## Problem
The fleet runs in ultracode mode: every slot can fan out unlimited parallel Workflow
agents, so the MCP server (:3100) sees bursts of concurrent `/mcp` POSTs. Each POST
builds a FRESH `McpServer` (binds the full dispatcher graph) via `buildRequestServer()`
([[mcp-concurrency-fix]] 2026-05-31). So N concurrent requests = N concurrent servers =
an UNBOUNDED memory spike, and the watchdog's RSS preempt-restart that relieves it is a
DISCONNECT for every in-flight agent call. The `U-MCP-BLACKWELL-HEAP` heap/watchdog
tuning raised the leak ceiling but never modeled the concurrency dimension.

## Fix (three coordinated, dependency-ordered)
- **A — `/health` exposes concurrency** `{inflight, peak_inflight, active, queued, max_concurrency, max_queue}` (the watchdog needs the burst signal).
- **B — `RequestSemaphore`** (`mcp-server/src/mcp/request-semaphore.ts`) caps concurrent builds (`PRISM_MCP_MAX_CONCURRENCY`=64) + bounded queue (`PRISM_MCP_QUEUE_MAX`=512); past both -> HTTP 503 load-shed (backpressure, not OOM).
- **C — inflight-aware watchdog** (`scripts/mcp-server-watchdog.mjs`): DEFER the RSS preempt-restart while inflight >= `PRISM_MCP_WATCHDOG_INFLIGHT_DEFER`=8 UNLESS RSS crossed `PRISM_MCP_WATCHDOG_RSS_HARD_MB` (~28GB) — a true runaway leak still recycles (controlled restart beats OOM crash). Decision is the pure, unit-tested `scripts/lib/mcp-preempt-decision.mjs`; lazy-imported + fail-OPEN.

## The P1 the 3-of-3 caught (close-while-queued slot leak)
First cut wired the semaphore release on res `'close'` AFTER `acquire()`. A client that
disconnects WHILE its request is parked in the queue fires `'close'` BEFORE the slot is
granted, so the late-attached listener never fires (**Node does not replay `'close'` to a
listener added post-close**). `release()` then hands the still-held slot to the dead
waiter -> slot leaks -> under sustained burst `active` ratchets to `max` and the gate
WEDGES (503 while idle — worse than the original problem).

**Fix:** extract `acquireRequestSlot(sem, res)` that registers the `'close'` observer
BEFORE `acquire()`; on grant-to-an-already-closed-res it releases immediately and returns
outcome `"abandoned"` (caller returns, skipping the wasted `buildRequestServer()`). A
test reproduces the leak (queue -> disconnect -> holder release -> assert `"abandoned"` +
`inUse 0` + capacity reusable); it FAILS against the buggy version.

## Lesson: re-verify the working tree at scrutiny-mark time
Between the P1-fix commit and the re-scrutiny, the working-tree copy was mutated to
`if (false)` (disabling the `"abandoned"` branch -> re-opening the leak), tagged
"intentional, don't revert." It was provably wrong — it broke the committed leak-repro
test. Caught by re-reading the file; PROVED the regression by running the suite
(`expected 'abandoned' got 'proceed'`; burst test timed out = wedge); restored; re-ran
the gate. **Before marking a scrutiny gate PASS, re-verify `git diff --quiet HEAD --
<unit files>` — a fault can land in your own fix between commit and mark.** R12 (fail
loud) + the soul refuse `softening-the-scrutiny-gate` override a generic "don't revert"
notice when the change provably breaks the unit. Mutation-testing your own guard (flip
the condition, watch the test fail) is the proof your test is not theater.

## Knobs
`PRISM_MCP_MAX_CONCURRENCY`(64) · `PRISM_MCP_QUEUE_MAX`(512) ·
`PRISM_MCP_WATCHDOG_INFLIGHT_DEFER`(8) · `PRISM_MCP_WATCHDOG_RSS_HARD_MB`(threshold+10GB).

Memory: [[reference_mcp_concurrency_harden_shipped_2026_06_09]]. Goes live on next MCP
supervisor restart (dist gitignored; do NOT restart :3100 just to apply — that disconnects
the fleet, the exact harm being prevented).