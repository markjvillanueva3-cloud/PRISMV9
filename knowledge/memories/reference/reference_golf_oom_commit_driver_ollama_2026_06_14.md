---
name: golf-oom-commit-driver-ollama-2026-06-14
description: "OOM/memory-pressure monitoring finding (golf, 2026-06-14, operator directive 'monitor oom and memory pressure'): on this PC the OOM risk is NOT physical RAM (always ~35-42% of 130GB, 75GB+ free) -- it is COMMIT CHARGE, and commit is dominated by Ollama's llama-server which commits ~103GB (PrivateMemorySize) while only ~8GB resident (working set). llama-server = ~77% of total commit. Commit oscillates 49% (model idle-unloaded) <-> 89% WATCH (model loaded); the swing IS the Ollama keep_alive load/unload. commit LIMIT is only ~148GB (130GB RAM + ~18GB pagefile), so a loaded model leaves only ~21GB headroom. The genuine OOM scenario = a heavy workflow burst (12 claude + node + git-fanout) stacking commit on top of a loaded model toward the 148GB limit. Mitigation: Ollama idle-unload + Memory Pressure Auto-Relief. DO NOT kill llama-server (local-LLM offload substrate; golf refuses auto-restarting/killing serving daemons). Monitor commit% not RAM% for OOM."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.598Z
aliases: reference_golf_oom_commit_driver_ollama_2026_06_14
---


**Finding (2026-06-14, slot golf, session 02a2de10 -- operator directive mid-/goal: "monitor oom and memory pressure").** Added commit-charge to the golf census. The OOM-risk metric on THIS Windows box is **commit charge**, NOT physical RAM.

## Numbers (DESKTOP-N7MI1VB, 130GB RAM)
- **Physical RAM: always healthy** -- observed 35-42% used, 74-79GB free. Never a pressure source. Monitoring RAM% alone would MISS the real risk.
- **Commit charge: the real OOM metric.** commit LIMIT = `Win32_OperatingSystem.TotalVirtualMemorySize` ~= 148.9GB (= ~130GB RAM + only ~18GB pagefile). commit USED = limit - FreeVirtualMemory.
- **Observed commit oscillation: 48.7% (free 74.6GB) <-> 89-89.7% WATCH (free 15-21GB)** within minutes. The swing magnitude (~60GB) and timing match Ollama model load/unload.
- **Driver = `llama-server` (Ollama):** PrivateMemorySize(commit) = **103.3GB** while WorkingSet = only 8.3GB. It is **~77% of all committed memory** (next: vmmemWSL 4.3GB, then claude.exe ~1.6GB each x12). llama.cpp reserves the full model + KV-cache as COMMITTED virtual memory upfront, but pages in little to RAM (rest is mmap'd model file + GPU/VRAM-resident on the Blackwell). So a huge commit, tiny resident.

## Thresholds folded into the census
`commit% >=95 = CRITICAL-OOM · >=90 = HIGH · >=80 = WATCH · else OK`. Report `MEM: ram=X% | commit=Y% (free=ZGB)` every census tick.

## OOM scenario + disposition
- **Risk:** model LOADED (commit ~89%, ~21GB headroom) + a heavy concurrent-workflow burst (the recurring 600-790 proc / 100-150 bash episodes this session each reserve commit) -> commit approaches the 148GB limit -> allocation failures -> OOM/crashes.
- **Natural mitigation (observed working):** Ollama `keep_alive` idle-unloads the model -> commit drops to ~49% (frees ~60GB). `PRISM Memory Pressure Auto-Relief` fires rc=0x0 (working-set trim -- NOTE: trim reduces RESIDENT, not COMMIT; the real commit relief is the model unload or a chat /compact). `critical-memory-compact-nudge` names the largest tree to /compact under CRITICAL pressure.
- **Memory-monitor reaper note:** `PRISM Fleet Memory Monitor` (the advisor that names which chat to /compact) was observed rc=0x1 (failed last run) while `PRISM Memory Pressure Auto-Relief` + `PRISM WSL Memory Guard` were rc=0x0. One failed advisor run is not critical (relief mechanism succeeds) but watch for repeats.
- **DO NOT kill llama-server.** It is the local-LLM offload substrate (Ollama->Sonnet->Opus ladder leg #1). Golf soul refuses auto-restarting/killing serving daemons (sibling of the docker-daemon refuse). Reaping it would break fleet-wide Ollama offload and it would just respawn via `PRISM Ollama Serve`.
- **Structural note for OPERATOR (not golf hygiene -- needs admin + reboot):** commit headroom is thin because pagefile is only ~18GB on top of 130GB RAM while Ollama commits 103GB. Raising the pagefile would raise the commit limit and the OOM headroom. Operator/system-config decision.

**Monitoring rule: track commit%, not RAM%, for OOM on this box.** RAM stays green while commit can hit WATCH. Siblings: [[reference_fleet_memory_monitor_2026_05_16]], [[reference_fleet_task_health_ms0_2026_05_17]], [[feedback_golf_owns_reaper]], [[reference_golf_fsmonitor_daemon_count_2026_06_14]] (the other process-resource finding this session).
