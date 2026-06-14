---
name: reference-ollama-cpu-inference-host-thrash-2026-06-02
description: "Sustained 100% CPU + MCP-won't-boot + delta CAD thrash were ALL one root cause (golf 2026-06-02): Ollama doing CPU inference at AboveNormal priority, preempting everything incl. the MCP server's ~50s boot. Models (nomic-embed-text for embeddings + deepseek-r1:14b for scrutiny/consensus pre-flight) were forced onto CPU because NIM holds the 16GB VRAM. Fix: `ollama stop <model>` + demote ollama to BelowNormal -> CPU 99%->35%, run-queue 128->0, MCP 200 instantly. Diagnosis lesson: delta-sample INDIVIDUAL process CPU% (a grouped snapshot at a busy moment misled me into blaming 'fleet load')."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.237Z
aliases: reference_ollama_cpu_inference_host_thrash_2026_06_02
---


# Ollama CPU inference at AboveNormal = the real host-thrash cause

**Symptom cluster (looked like 3 problems, was 1):** (a) host CPU pinned at 100% for many minutes; (b) MCP :3100 stuck — couldn't finish its ~50s/700MB boot across multiple ticks (kept showing 2 instances, no listener); (c) delta's Fusion360 CAD session thrashing/unresponsive.

**Root cause (one):** the native Ollama daemon was running **CPU inference** of two models simultaneously — `nomic-embed-text:latest` (565MB, **100% CPU** — embeddings for qdrant/memory/tribal) + `deepseek-r1:14b` (13GB — the scrutiny advisory pre-flight + consensus-queue + ollama-pipeline routes) — **at AboveNormal priority**. Delta-sampled: the two `ollama.exe` procs were consuming ~all 16 logical cores (run-queue **128** threads waiting). Because Ollama was AboveNormal, it **preempted** the MCP server's boot (MCP at Normal could never win enough CPU to load its engines and bind :3100) and preempted Fusion360. Why CPU and not GPU: **NIM (vLLM, nim-llama32-3b + nim-embed-e5) holds the 16GB VRAM**, so Ollama models that don't fit fall back to CPU inference (12GB+ system-RAM working set is the tell).

**Fix (verified, instant):** `ollama stop nomic-embed-text:latest` + `ollama stop deepseek-r1:14b` (unload, daemon stays up = position A honored) + demote all `ollama` procs to **BelowNormal**. Result: **CPU 99%->35%, run-queue 128->0, MCP /health DOWN->200 within seconds, ollama /api/tags still 200.** All three symptoms cleared from the one fix.

**DIAGNOSIS LESSON (why I missed it for ~10 ticks):** I first read a **grouped, cumulative** CPU snapshot during a busy moment (`claude 29% + node 23%`) and concluded "legitimate fleet load — capacity wall, nothing reapable." WRONG. The correct method: **delta-sample CPU per INDIVIDUAL process** (`$s1=@{};Get-Process|%{$s1[$_.Id]=$_.CPU}; sleep 4; recompute delta/interval/cores`) — and do it when the fleet is quiet. That instantly showed 2 ollama procs = ~116% of capacity, everything else <4%. Also check **`ollama ps`** (PROCESSOR column = GPU vs CPU) and **process PriorityClass** — an AboveNormal background grinder is far worse than its raw % because it preempts critical/foreground work. `Win32_Processor` cumulative `.CPU` and grouped snapshots both mislead; the per-PID delta is ground truth.

**Recurrence + durable fix:** this WILL recur as long as NIM holds the GPU — every embeddings call (nomic-embed) and every scrutiny/consensus pre-flight (deepseek-r1:14b) reloads a model onto CPU. Mitigations, weakest->strongest: (1) golf hygiene cron re-demotes ollama to BelowNormal each tick so it can never preempt MCP/Fusion360 even while grinding (added 2026-06-02); (2) gate the CPU-bound ollama consumers (embeddings, scrutiny-preflight deepseek-r1:14b, consensus-queue drain) to skip when ollama has no GPU — same pattern as the prompt-rewriter circuit-breaker [[reference_mcp_multi_instance_leak_3100_2026_06_02]]; (3) the real fix — give Ollama a GPU (pause NIM, or the RTX PRO 6000 Blackwell 96GB upgrade eliminates the NIM/Ollama VRAM contention entirely). Pairs with the MCP slow-boot rule: MCP can't boot under CPU starvation, so killing the CPU hog is prerequisite to MCP recovery.
