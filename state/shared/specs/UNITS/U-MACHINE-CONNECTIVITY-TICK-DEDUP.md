# U-MACHINE-CONNECTIVITY-TICK-DEDUP

**Status:** queued (follow-up from U-BRIDGE-SHOPFLOOR-LEARN, 2026-05-20 lima)
**Tier:** dev-tools / observability hygiene
**Blast radius:** local (single engine + its alert-state map)

## Problem

`mcp-server/src/engines/MachineConnectivityEngine.ts:analyzeData()` emits two
of its three alert types on **every tick** the threshold is met, not on **state
transition**:

| Alert type | Trigger | Tick gated? |
|------------|---------|-------------|
| `overload_trending` | `spindle_load_pct > 85` (line 269) | ❌ every tick |
| `feed_override_low` | `feed_override_pct < 50 && state === "running"` (line 285) | ❌ every tick |
| `alarm_active` | `state === "alarm" && prev?.state !== "alarm"` (line 299) | ✅ transition |

At JM Die's nominal 21 machines polling at `poll_interval_ms=100`, a sustained
60s overload on ONE machine produces ~600 redundant alerts; sustained across
the fleet under load this scales to ~12,600 alerts/min — which the
U-BRIDGE-SHOPFLOOR-LEARN bridge faithfully mirrors to the universal outcome bus
(amplifying the existing engine-side noise, not introducing new noise).

The bridge intentionally does NOT dedup (R3 — surgical, faithful mirror); the
fix belongs at the alert-generation source so both the engine's per-machine
`alerts` history AND the bus stream are cleaned up in one place.

## Goal

State-transition-gate `overload_trending` and `feed_override_low` in
`analyzeData()` so each fires **only on entry** to its condition (or on
severity-tier change for overload), matching the pattern already used for
`alarm_active`.

## Acceptance criteria

1. `overload_trending` emits at most once per `(machineId, tier)` transition,
   where `tier ∈ {ok, warn (>85), critical (>95)}`. A sustained event in the
   same tier emits zero new alerts after the entry tick.
2. `feed_override_low` emits once per `prev.feed_override_pct >= 50` →
   `current < 50` transition. A sustained low-override state emits zero new
   alerts.
3. Existing `alarm_active` behaviour unchanged.
4. The per-machine alerts buffer (`alerts.get(machineId)`) shrinks
   proportionally during sustained events; downstream consumers see a clean
   transition stream.
5. Companion test file `src/__tests__/MachineConnectivityEngine.test.ts`
   (creating if absent) covers the three transition shapes — entry, sustained,
   exit-then-re-entry.

## Out of scope

* Bridge-side dedup (the bridge is a faithful mirror by contract).
* Generic alert-deduplication framework (this unit is a 2-alert-type fix).

## Reference

* Bridge unit: U-BRIDGE-SHOPFLOOR-LEARN (this milestone) — ships the producer-
  to-bus wiring with the limitation documented inline at the emit site.
* Reviewer B P1-A (2026-05-20 per-file scrutiny gate) — surfaced this gap.
