---
name: reference_memory_pressure_86_was_vram_2026_06_11
description: 2026-06-11 operator "memory pressure 86%, clean + raise limits" — the 86% was transient GPU VRAM (Ollama models loaded), NOT system RAM. System RAM was 38.9%. Cleaned (reaper found 0 safe-to-reap) + raised WSL cap 16->32GB. How to diagnose "pressure" correctly.
type: reference
galaxy: fleet-hygiene
source: prism-memory
synced: 2026-06-27T20:30:46.654Z
aliases: reference_memory_pressure_86_was_vram_2026_06_11
---


# "Memory pressure 86%" was GPU VRAM, not system RAM (2026-06-11, slot:golf)

Operator `/goal`: *"memory pressure is 86% please clean, raise limits further if possible."*

## What 86% actually was (R12 — diagnose before acting)
- **System RAM: 38.9%** (49.5GB / 127GB used, 77.6GB free) — never pressured.
- **GPU VRAM: 20.6%** at check time (20.2 / 97.9 GB) BUT earlier this session `qwen2.5-coder:32b` alone held **54.7GB** + other models → that is the 86% the operator saw. Relieved by Ollama `keep_alive` expiry + the (now-hardened) reaper.
- **Lesson:** on the Blackwell box, "memory pressure" almost always means **GPU VRAM** (96GB, easily 86% with a 32B/120B model loaded), not the 127GB system RAM. Check `nvidia-smi` + `curl /api/ps` FIRST, not just `Get-CimInstance Win32_OperatingSystem`.

## Clean (golf domain)
`fleet-reaper-sweep.mjs --once` (hardened) → **0 reaped, 0 freed, 0 soft-relief**. Correct: at 38.9% RAM soft-relief is below its trigger, and the hardened stale-node-hunter protects all legit nodes. Nothing safe to reap = system is healthy, NOT a failure. Do NOT force working-set trims at low pressure — it page-outs active chats for no benefit.
- To free VRAM on demand: unload Ollama models (`POST /api/generate {keep_alive:0}` per `/api/ps` model) — this is what `KILL-PRISM-TASKS.bat` (gaming mode) does. See [[reference_prism_task_launchers_fixed_2026_06_11]].

## Raise limits
- `.wslconfig` memory **16GB → 32GB**, processors **8 → 12** (slot:golf). The 16GB cap was sized for a 63GB host (its own header says so); the box is now 127GB/32-thread Blackwell, so 16GB starved WSL/Docker while ~95GB sat idle. 32GB leaves ~95GB + 20 threads for the fleet; `autoMemoryReclaim=gradual` keeps it a ceiling not a grab. Does NOT reintroduce the [[reference_api_ratelimit_wsl_commit_2026_06_08]] commit-pressure (that was the 88GB NIM container, dropped). **Applies on next `wsl --shutdown`** (not forced — disruptive to live containers).
- MCP / agent limits were already raised recently ([[reference_mcp_fleet_capacity_ms0_2026_06_08]], [[reference_agent_api_limits_commit_2026_06_10]]).

**Why:** prevents the next chat from force-reaping/trimming on a phantom RAM-pressure reading when the real signal is VRAM. **How to apply:** diagnose VRAM vs RAM first; clean only what's actually pressured; the WSL bump needs a `wsl --shutdown` to take effect.
