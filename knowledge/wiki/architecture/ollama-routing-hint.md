---
title: Ollama Routing Hint — the fleet-reaper → ollama-task-offloader contract
type: architecture
status: shipped
shipped: 2026-05-14
milestone: FLEET-REAPER-MS1
---

# Ollama Routing Hint — `state/shared/.ollama-routing-hint.json`

## What it is

A small, TTL'd JSON file that lets the **fleet-reaper sweep** (producer) tell the
**`ollama-task-offloader.mjs` UserPromptSubmit hook** (consumer) "the box is under
memory pressure and the GPU has headroom — offload MORE aggressively." It is the
cross-process channel of FLEET-REAPER-MS1's Layer 3 coordinator: idle GPU VRAM is
converted into Claude-CLI throughput by shifting hook-eligible work to a local
Ollama model instead of letting it compete for the commit-memory budget.

## Why it exists

`fleet-reaper-sweep.mjs` runs every ~5 min (Monitor + scheduled task + Stop hook).
On a sweep where commit memory is high AND `nvidia-smi` shows ≥ `GPU_FREE_MIN_MB`
free AND Ollama is reachable AND ≥ 1 chat slot is alive, the coordinator decides
to nudge more work toward Ollama. But the coordinator is a *batch* process — it
can't reach into a live chat's hook stack. The hint file is the hand-off: the
sweep writes it; the next UserPromptSubmit in any chat reads it.

## The contract

**Path** (a FIXED absolute literal — both sides hardcode it; deliberately NOT
worktree-relative, because the consumer hook is pinned to the main tree):

```
H:/prism/state/shared/.ollama-routing-hint.json
```

**Shape:**

```json
{
  "schemaVersion": 1,
  "mode": "aggressive-offload" | "auto" | "disabled",
  "thresholdDelta": -0.15,
  "validUntil": "2026-05-14T17:30:00.000Z",
  "writtenAt": "2026-05-14T17:25:00.000Z",
  "writtenBy": "fleet-reaper-sweep",
  "reason": "commit 97% · gpuFree 8549MB · 3 alive slot(s)"
}
```

| Field | Meaning |
|-------|---------|
| `schemaVersion` | `1`. The consumer fail-soft rejects a hint stamped with an unrecognised version (a versionless hint is accepted leniently). |
| `mode` | `aggressive-offload` = apply `thresholdDelta`. `auto` = no change (the producer writes `auto` to NEUTRALIZE a stale aggressive hint). `disabled` = no change. |
| `thresholdDelta` | A NEGATIVE number (or 0). Added to the consumer's `CONFIDENCE_THRESHOLD` (0.80) and `INJECT_THRESHOLD` (0.90), LOWERING the bar so more tasks clear it. Hard-clamped on BOTH sides to `±0.30` (`HINT_THRESHOLD_DELTA_CAP`). |
| `validUntil` | ISO-8601. A hint past this instant is ignored. TTL = `HINT_TTL_SEC` (default 300s = one sweep interval), so a crashed sweep cannot leave the fleet stuck in aggressive mode beyond one cycle. |
| `writtenAt` / `writtenBy` | Audit metadata. The consumer ignores them. |
| `reason` | Human-readable; surfaced in the consumer's `routing-hint-applied` telemetry. |

## Producer — `writeRoutingHint()` in `scripts/fleet-reaper-sweep.mjs`

- Atomic write (temp + `renameSync`) — a reader sees the old file or the new one,
  never a partial.
- Written on EVERY non-status / non-disabled / non-dry-run sweep where the
  coordinator evaluated — so a stale aggressive hint is **neutralized to `auto`**
  on the next sweep that doesn't warrant aggression. The file IS the canonical
  statement; every sweep restates it.
- `thresholdDelta` is hard-clamped to `±HINT_THRESHOLD_DELTA_CAP` (0.30) at write
  time — a bad coordinator decision can never push the consumer out of range.

## Consumer — `loadRoutingHint()` in `.claude/hooks/ollama-task-offloader.mjs`

- Best-effort + fail-soft: missing / unreadable / corrupt-JSON / expired / wrong
  `schemaVersion` / `mode !== "aggressive-offload"` / zero-or-NaN delta all return
  `null` → **no behaviour change**. A hook must never break on an advisory channel.
- On a valid aggressive hint: `effectiveThreshold = clamp(BASE + thresholdDelta, 0, 1)`
  for both the confidence and inject thresholds. `thresholdDelta` is re-clamped to
  `±0.30` consumer-side (defence-in-depth over the producer's clamp).
- When the hint is what tipped a task over the bar (cleared the lowered threshold
  but would have failed the un-hinted default), the consumer rides a
  `routingHint: true` annotation on the existing `offload` telemetry event — so
  `/ollama-offload-dashboard` can attribute extra-offload volume to the coordinator
  with zero double-counting.

## Neutralization — the no-stale-hint guarantee

The producer writes `mode: "auto", thresholdDelta: 0` whenever the coordinator's
decision is NOT `shouldHintOffload`. The consumer treats any `mode !== "aggressive-offload"`
as "no hint." Together: a prior aggressive hint cannot linger past one sweep, and
even if a sweep crashes mid-write, the `validUntil` TTL caps the blast radius at
one interval.

## Knobs

| Env var | Effect | Default |
|---------|--------|---------|
| `PRISM_FLEET_REAPER_HINT_TTL_SEC` | hint validity window (seconds) | `300` |
| `PRISM_FLEET_REAPER_HINT_THRESHOLD_DELTA` | magnitude of the offload-bar nudge (applied negatively, clamped ≤ 0.30) | `0.15` |
| `PRISM_FLEET_REAPER_GPU_FREE_MIN_MB` | GPU free-VRAM floor below which no hint is written | `2048` |
| `PRISM_FLEET_REAPER_OLLAMA_COORD_DISABLE=1` | disable the coordinator (no hint ever written) | (unset) |

## Verification

```bash
# Force a hint under simulated pressure, then inspect it:
PRISM_FLEET_REAPER_SOFT_RELIEF_PRESSURE_PCT=10 \
  node H:/prism/scripts/fleet-reaper-sweep.mjs --once --json
Get-Content H:/prism/state/shared/.ollama-routing-hint.json

# Confirm the consumer round-trips it (see fleet-reaper.test.mjs
# "coordinator — prewarmOllama / writeRoutingHint / loadRoutingHint round-trip").
```

## Related

- [[fleet-reaper]] — the parent pipeline (FLEET-REAPER-MS0 + the MS1 Phase 2 layers).
- Producer: `scripts/fleet-reaper-sweep.mjs` (`decideOllamaCoordination`, `writeRoutingHint`).
- Consumer: `.claude/hooks/ollama-task-offloader.mjs` (`loadRoutingHint`).
- Telemetry sink: `mcp-server/data/state/ollama-offload-stats.json` via `lib/ollama-stats.mjs`.
