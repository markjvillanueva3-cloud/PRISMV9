---
name: reference_wsl_commit_pressure_relief_2026_06_08
description: "Critical commit-pressure (98%+) on this 127GB-RAM PC is usually idle WSL/Docker reserving ~94GB commit, NOT physical RAM — `wsl --shutdown` is the fast reversible fix."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.064Z
aliases: reference_wsl_commit_pressure_relief_2026_06_08
---


# WSL commit-pressure relief (golf, 2026-06-08)

The Stop-hook PRESSURE GATE blocked session end at **commit 223.4/227.1 GB (98.4%)**, naming tsserver-kill + aggressive-killer + /compact as remedies. None were the root cause.

**Real diagnosis (R12 — measure before killing):**
- Physical RAM was **127 GB total, 61 GB FREE (only 52% used)** — NO physical memory crisis.
- The bottleneck was **commit charge** (reserved address space + page file), 216.5/227.1 GB (95%).
- Top consumer: `vmmemWSL` = 24 GB resident + a huge commit reservation. **Two WSL distros running** (Ubuntu + docker-desktop) though the Docker daemon itself was down (per reaper sweeps `docker down but ollama reachable`).
- Total WorkingSet across ALL processes was only 55.5 GB — proof the 223 GB commit was mostly reserved-not-resident (WSL + V8 heaps reserve large address space).

**Fix (fully reversible — WSL restarts on demand):**
```powershell
wsl.exe --shutdown
```
Commit dropped **216.5 GB → 122.1 GB instantly** (freed ~94 GB); reaper went `critical 95.8%` → `normal 57.6%`. `vmmemWSL` tears down over ~30s (24GB → 6.7GB → 0).

**Why the named remedies missed:** `02-kill-zombie-tsservers.ps1` found no zombies (>60min filter; the load was active chats). Killing live chats / tsservers would have hurt working sessions for little commit relief — the WSL reservation was 94GB of the problem.

**Standing rule for golf at critical commit-pressure on this PC:**
1. Check `Get-CimInstance Win32_OperatingSystem` FreePhysicalMemory FIRST — if physical RAM is fine, it's a commit/page-file issue, not RAM.
2. Check `Get-Process vmmemWSL` + `wsl -l -v`. If WSL is up and Docker is idle → `wsl --shutdown` is the highest-yield reversible fix.
3. Only then consider tsserver-kill / aggressive-killer / killing idle chats.

Second-order: the **commit limit (227 GB) is tight for a 127 GB-RAM box** — a larger page file would raise the ceiling. WSL `.wslconfig` `memory=` cap would bound its reservation. Both are operator-config changes, not golf's to make unprompted. See [[feedback_golf_owns_reaper]].
