---
title: Routing-hint TTL — why 5 minutes equals the sweep interval
type: code-tribal
status: shipped
shipped: 2026-05-14
tags: [fleet-reaper, ollama, routing-hint, ttl, cross-process]
milestone: FLEET-REAPER-MS1
---

# Routing-hint TTL — 300 s

## The number

`PRISM_FLEET_REAPER_HINT_TTL_SEC = 300`. The `state/shared/.ollama-routing-hint.json`
file the coordinator writes carries a `validUntil` stamped `now + 300s`. The
consumer (`ollama-task-offloader.mjs`) ignores any hint past `validUntil`.

## Why 300 s — it is exactly one sweep interval

The fleet-reaper sweep runs every `INTERVAL_SEC` (default 300 s). Setting the
hint TTL **equal to** the sweep interval makes two guarantees fall out for free:

1. **Every sweep is the canonical statement.** The producer rewrites the hint on
   *every* non-status sweep — `aggressive-offload` when the box wants more
   offloading, `auto` (neutral) when it doesn't. Because the TTL is one interval,
   the hint a consumer reads is always either the current sweep's verdict or the
   immediately-previous one. There is no window where a consumer acts on a hint
   that is two or more sweeps stale.
2. **A crashed sweep self-heals within one cycle.** If the sweep process dies
   mid-run and never writes the next hint, the last hint it *did* write expires
   exactly when the next sweep *would* have run. The fleet cannot get stuck in
   `aggressive-offload` mode beyond a single interval, even with zero further
   sweeps — the TTL is the dead-man's switch.

A TTL **shorter** than the interval would leave dead windows where no valid hint
exists (the consumer falls back to defaults — acceptable, but wasteful). A TTL
**longer** than the interval would let a crashed sweep strand the fleet in
aggressive mode for multiple cycles. Equal is the only value that gives both
properties with no tuning.

## The lesson

For a TTL'd file that is a cross-process contract between a periodic producer and
an on-demand consumer, default the TTL to the producer's period. It makes the
file self-correcting (every cycle restates it) and crash-bounded (a missed cycle
expires exactly on schedule) without a separate liveness mechanism. Don't pick a
TTL from "feels about right" — derive it from the producer's cadence.

Related: [[ollama-routing-hint]] · [[fleet-reaper]] · [[gpu-absorb-threshold]]
