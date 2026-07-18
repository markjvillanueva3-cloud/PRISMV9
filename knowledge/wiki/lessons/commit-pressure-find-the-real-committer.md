---
title: Commit pressure — find the real committer before touching any heap cap
type: lesson
domain: dev-infra
created: 2026-06-08
slot: sierra
milestone: MCP-FLEET-CAPACITY-MS0
aliases:
  - commit-over-commit
  - vmmemWSL-balloon
  - node-heap-cap-scaling
  - PrivateMemorySize64-first
---

# Commit pressure — find the real committer before touching any heap cap

**The reflex to resist:** "the box is at 92% commit and the MCP server looks like it's failing → raise the heap cap." On Windows that is exactly backwards. `--max-old-space-size` is a **commit RESERVATION** (counted against the 227 GB ceiling even when unused, unlike Linux lazy mmap), so raising a per-proc heap *worsens* commit pressure, and lowering it is what lets a large fleet fit.

## The diagnostic discipline

When Windows commit charge spikes (and you see `0x800710E0` ERROR_NO_SYSTEM_RESOURCES spawn-refusals, false "MCP failing" alarms, or "API limit" errors):

```powershell
Get-Process | Sort-Object PrivateMemorySize64 -Descending | Select-Object -First 8 |
  ForEach-Object { "{0,-22} private={1}GB ws={2}GB" -f $_.ProcessName,
    [math]::Round($_.PrivateMemorySize64/1GB,2), [math]::Round($_.WorkingSet64/1GB,2) }
```

`PrivateMemorySize64` = committed bytes; `WorkingSet64` = resident bytes. The gap between them is reservation that isn't being used but still counts against the ceiling.

## What the 2026-06-08 incident actually was

The "MCP server failing / can we increase the cap?" investigation found the 90.8% commit was **NOT** the node hook fleet:

| Committer | Committed | Resident | Verdict |
|---|---|---|---|
| **vmmemWSL** | **95.4 GB** | 3.2 GB | 6× over its `.wslconfig memory=16GB` cap — cap set but never applied (`wsl --shutdown` never ran) |
| llama-server | 44.8 GB | 4.0 GB | GPU-resident 32b model — expected, leave it |
| 30–133 node procs | 13.2 GB | 13.6 GB | **perfectly tight — ZERO over-commit** |

The node fleet (the thing you'd be tempted to "fix" by raising its heap) was a rounding error. The real committers were WSL + Ollama.

## The two fixes, in order of leverage

1. **Reclaim WSL** — `wsl --shutdown` applies a `.wslconfig` cap that was edited but never activated (reclaimed ~79 GB; `autoMemoryReclaim=gradual` also bleeds it back on idle). Gated: kills Docker briefly. The durable watchdog is `scripts/system-health/27-wsl-memory-guard.mjs` (advise-only, gated on no active docker build) — registered as `PRISM WSL Memory Guard`.
2. **CAP the node hook heap, don't raise it** — `portable-node` sets `--max-old-space-size=${PRISM_HOOK_HEAP_MB:-384}`. Proof it's the scaling enabler: **133 node procs committed only 13 GB**. At the old 4 GB cap, 133 × 4 = 532 GB — impossible against the 227 GB ceiling. The 384 MB cap is *why* the fleet can scale; raising it re-breaks the box.

## The rule

On commit pressure: **sort by `PrivateMemorySize64` FIRST, find the real committer, then act.** Never raise a heap cap to relieve commit — that is the lever that causes the problem. A per-proc heap cap is a fleet-scaling enabler, not a bottleneck.

Related: `[[reference_mcp_fleet_capacity_ms0_2026_06_08]]` · `[[reference_ollama_cpu_inference_host_thrash_2026_06_02]]` · fleet-task-health `pressure`/`expectedUnregistered` partition (commit `3d796dcf5c`).
