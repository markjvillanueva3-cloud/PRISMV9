---
title: GPU-absorb threshold — when idle VRAM beats more kills
type: code-tribal
status: shipped
shipped: 2026-05-14
tags: [fleet-reaper, ollama, gpu, memory-pressure, coordinator]
milestone: FLEET-REAPER-MS1
---

# GPU-absorb threshold

## The observation

On the fork-storm-prone Windows box running 6-7 Claude chats, the binding
constraint is **commit memory** — it sits at 93-99 % chronically. Meanwhile the
GPU sits at **single-digit utilization** with 8-15 GB of VRAM free. The reaper's
MS0 instinct ("kill more orphans") has a floor: once the genuine orphans are
reaped, the surviving chats' own working set IS the pressure, and you can't kill
that.

## The threshold

> **⚠ Gating behavior UNVERIFIED at ship.** The threshold below is the *intended*
> design. `decideOllamaCoordination` gates on `mem.usedPct`, which `readHostMemory`
> computes as `max(physUsedPct, commitUsedPct)` — so commit pressure SHOULD count
> toward the trigger. Yet a live sweep observed it reporting "below pressure
> floor" at 98.7 % commit, which the `max()` logic alone does not explain. Root
> cause unverified — most likely the commit-% *denominator* (`TotalVirtualMemorySize`)
> computes differently from the operator's mental "commit used %", so
> `commitUsedPct` lands below 90 even when Task Manager shows ~98 %. Open
> follow-up #2 in [[reference_fleet_reaper_ms1]] — treat the "commit > 90 %"
> trigger below as design intent, not verified behavior, until the denominator
> is reconciled.

The **intended** trigger: when **commit > ~90 %** AND **GPU free ≥
`GPU_FREE_MIN_MB` (2048)** AND Ollama is reachable AND there is ≥ 1 alive chat
slot to route work to, the FLEET-REAPER-MS1 coordinator pre-warms a local model
into VRAM and writes a routing hint that lowers `ollama-task-offloader.mjs`'s
offload bar. This shifts hook-eligible work (code explain / summarize / classify
/ lint / diff-summary) off the Claude CLI and onto the GPU — relieving the
commit budget *without* killing anything.

Measured intent on the test box (97 % commit / 8.5 GB GPU free / 3 chats at
planning time; later observed RTX 4080 SUPER, 10-15 GB free, ~0-12 % util): an
Ollama pre-warm + hint relieves pressure faster and more safely than escalating
to additional kills, because the pre-warm is fire-and-forget and the hint is
TTL'd — neither can destabilize a surviving chat the way a mis-targeted kill can.

## The lesson

A "process reaper" framed purely as "kill more" has a hard floor. The reframe —
"use what's idle" — turns a *second* idle resource (GPU VRAM) into relief for the
*first* contended one (commit RAM). When one resource is pegged and another is
idle, look for the conversion path before escalating destructive action on the
pegged one. Soft-first, kill-last.

(See the ⚠ box at the top: whether the coordinator *actually* fires on commit
pressure is the open follow-up — the conversion-path *principle* holds
regardless; what's unverified is the gating metric that triggers it.)

Related: [[fleet-reaper]] · [[ollama-routing-hint]] · [[routing-hint-ttl]] · [[reference_fleet_reaper_ms1]]
