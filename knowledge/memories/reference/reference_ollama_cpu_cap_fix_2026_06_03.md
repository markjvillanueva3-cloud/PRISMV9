---
name: reference-ollama-cpu-cap-fix-2026-06-03
description: "Durable fix for Ollama pinning host CPU at 100% (golf 2026-06-03). On the 16GB-VRAM box NIM owns ~15.8GB VRAM, so Ollama can't fit on GPU and falls back to CPU inference — a resident model then grinds all 16 logical cores (was AboveNormal, preempting MCP boot + Fusion360). Per-tick `ollama stop` only treats the symptom (cached hooks in running chats keep reloading the model). REAL FIX = User-scope env caps that make Ollama physically incapable of grinding: OLLAMA_KEEP_ALIVE=0 (unload immediately after each call, no resident grind), OLLAMA_NUM_THREAD=4 (cannot saturate 16 cores), OLLAMA_MAX_LOADED_MODELS=1, OLLAMA_NUM_PARALLEL=1 + BelowNormal priority. Result: 100% -> 5-6% CPU, ollama still up (tags 200, position A honored)."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.237Z
aliases: reference_ollama_cpu_cap_fix_2026_06_03
---


# Ollama CPU-grind durable fix (User-scope env caps)

**Symptom:** host CPU pinned ~100%, run queue ~128 (8x oversubscribed on 16 threads). Operator: "fix ollama, it is killing my cpu." NOT thermal throttling (clock 102% of base) — it is Ollama CPU **inference**.

**Root cause:** NIM (`nim-llama32-3b` + `nim-embed-e5`) holds ~15.8 GB of the 16 GB VRAM, so Ollama cannot fit a model on the GPU and loads it into ~12 GB system RAM, grinding all 16 logical cores. At one point Ollama ran at **AboveNormal**, preempting MCP-server boot and Fusion360. Proven: unloading models drops CPU 100% -> 0-8%; but the 8 ollama hooks (deactivated in settings.json earlier this session) are still **cached** in already-running chats, which keep re-calling `/api/generate`|`/api/chat` -> model reloads -> resident 5-min grind. Per-tick `ollama stop` only chases the symptom.

**Durable fix (applied 2026-06-03, verified):** set CPU-safe caps at **User scope** (PowerShell `[Environment]::SetEnvironmentVariable(...,'User')`) so **every** future Ollama launch — autostart hook, `ollama app.exe` tray, supervisor — inherits them with no further action:
- `OLLAMA_KEEP_ALIVE=0` — model unloads **immediately** after each call (kills the resident-grind mechanism; a cached-hook call now costs a brief burst, not a 5-min pin)
- `OLLAMA_NUM_THREAD=1` — **CRITICAL: this box has 8 PHYSICAL / 16 logical cores. Ollama's NUM_THREAD counts PHYSICAL cores, so `=4` mapped to 4/8 physical = ~50% host load (measured 49.7% on a re-pulled model) — NOT the ~25% naively expected from 4/16 logical. `=1` is required to get ~6% worst-case.** Do not set NUM_THREAD by logical-core math.
- `OLLAMA_MAX_LOADED_MODELS=1`, `OLLAMA_NUM_PARALLEL=1`
- `PRISM_LOCAL_COMPUTE_AUTOSTART=0` (User scope) — the `local-compute-autostart` hook fired a launcher (`ollama-docker-launcher.mjs`) **every prompt** that kept re-launching + warming ollama-on-CPU (the continuous re-pull that defeated KEEP_ALIVE=0). Disabling it stops the revival; reversible (delete the var). Docker stack is unaffected — it is already up via its own scheduled task, this only stops the per-prompt relaunch nag.
- relaunch `ollama serve` once with caps in-proc + `PriorityClass=BelowNormal`

**Result:** CPU 100%/99% -> 2% (ollama idle -0.3%), single ollama proc, no resident model, `/api/tags`=200 (Ollama still **up** = operator position A + tick-contract "ollama up" both honored). Position A reconciled: Ollama stays available but is now CPU-harmless, so no conflict with "keep NIM+Ollama up."

**Three-stage history (do not regress):** stage 1 set `NUM_THREAD=4` + KEEP_ALIVE=0 → dropped 100%→5%, but a later tick caught 99% again: a cached-hook chat had re-pulled the model and the 4-physical-thread cap let it hit 49.7%, while the autostart hook kept re-warming it each prompt. Stage 2 (`NUM_THREAD=1` + `PRISM_LOCAL_COMPUTE_AUTOSTART=0`) dropped it to 2% — but a THIRD recurrence hit 36.7% on a *new* serve (pid 9644): **User-scope env vars only reach processes whose PARENT re-read the env after the var was set. An ollama serve spawned by a long-running parent (the `ollama app.exe` tray, or a chat session started before the fix) inherits the parent's STALE env → no NUM_THREAD cap.** The env approach cannot beat already-running launchers.

**Stage 3 = the LOAD-BEARING, launcher-independent fix: CPU AFFINITY.** Pin every ollama process to a 2-logical-core subset — `(.ProcessorAffinity=[IntPtr]::new(3))` (mask 0x3 = cores 0,1 of 16) — which physically caps host impact at ~12% **regardless of who launched it, what env it has, or how many threads it requests**. Affinity resets to all-cores on each ollama restart, so it must be **re-applied every cycle** — fold it into the recurring 5-min self-heal tick alongside the model-unload + BelowNormal demotion. Result: ollama 36.7%→0% (idle, capped), host 100%→34%. **Lesson: for a process spawned by launchers you don't control, env-var caps are advisory but PROCESSOR AFFINITY is the enforceable cap — apply affinity, not just env.** Standing tick block: `ollama stop` all models → `Get-Process ollama | %{ $_.ProcessorAffinity=[IntPtr]::new(3); $_.PriorityClass='BelowNormal' }`.

**Recurring-tick note:** the golf [[feedback_golf_owns_reaper|fleet-hygiene]] tick still unloads any loaded model + demotes priority each cycle as belt-and-suspenders, but the User-scope caps + autostart-off are the load-bearing fix — they survive ollama restarts and session restarts. The 8 deactivated hooks finalize when the 2 cached-hook chats restart; until then the caps neutralize any reload. Pairs with [[reference_mcp_multi_instance_leak_3100_2026_06_02]] (same session, MCP boot was being starved by this same CPU pin). When the 96GB-VRAM card lands, Ollama fits on GPU alongside NIM and the caps can be relaxed (raise NUM_THREAD, KEEP_ALIVE back to a positive idle, re-enable autostart).
