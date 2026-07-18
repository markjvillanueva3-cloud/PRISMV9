---
name: ollama-wedged-orphan-runner-recovery-2026-06-13
description: 2026-06-13 (slot:bravo) — fleet-wide Ollama /api/generate outage was NOT memory pressure (RAM 66GB free, VRAM 94.9GB free, GPU 1% idle). Root cause = a wedged ORPHAN llama-server.exe runner (dead parent, 11.5h old) + a stuck daemon load-path. Recovery: reap orphan + restart "PRISM Ollama Serve" → load recovered to 2.2s. Corrects an earlier wrong "99.9% memory pressure" diagnosis (R12).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.683Z
aliases: reference_ollama_wedged_orphan_runner_recovery_2026_06_13
---


2026-06-13 (slot:bravo, session 17b9f42e) — while validating the U-BRIDGE-KEEPALIVE fix, hit a **fleet-wide Ollama `/api/generate` outage**: the daemon answered `/api/ps` + `/api/tags` (metadata) but loading ANY model for generation hung past 60-70s — even the 1.0GB `qwen2.5-coder:1.5b`. ALL local AI reasoning (every PSN leg, all 34 galaxies) was dead, silently degrading to Claude.

## WRONG first diagnosis, then corrected (R12)
I initially attributed it to the session's recurring "99.9% memory pressure." **That was wrong.** Live probes:
- `os.freemem()` = **66 GB free of 136 GB** (51.7% used) — system RAM fine.
- `nvidia-smi` = **VRAM 94,904 MiB FREE of 97,887 (1,696 used), GPU util 1%** — GPU essentially empty/idle.
So neither system RAM nor VRAM was the blocker. **Lesson: do not blame "memory pressure" for an Ollama hang without checking BOTH `os.freemem()` AND `nvidia-smi` — a wedged daemon presents identically to resource starvation but the fix is totally different.**

## Real root cause
`Get-CimInstance Win32_Process -Filter "Name='llama-server.exe'"` showed TWO runners:
- PID 26264, parent = live daemon 5240 (legit embed runner).
- **PID 47396, parent = 11360 (DEAD), started 690 min (11.5h) ago** — an ORPHANED llama-server from a long-dead Ollama daemon instance. A zombie runner.
Plus the live daemon's own load-path was stuck (reaping the orphan alone did NOT restore generate).

## Recovery (operator-sanctioned: CLAUDE.md "if :11434 is DOWN ... restart 'PRISM Ollama Serve'")
1. **Reap orphan ONLY behind a safety gate** — confirmed parent PID 11360 was truly dead (`Get-Process -Id 11360` = none) BEFORE `Stop-Process 47396`. (Gate added because of the earlier-this-session peer-kill mistake — never kill a process whose parent might be a live peer.)
2. Orphan-reap alone = still wedged → full service restart: `Stop-ScheduledTask 'PRISM Ollama Serve'` → `Stop-Process ollama,llama-server -Force` (Ollama-only blast radius; chats degrade to Claude gracefully meanwhile) → `Start-ScheduledTask 'PRISM Ollama Serve'`. (NOTE: PS 5.1 has NO `Restart-ScheduledTask` — use Stop + Start.)
3. Fresh daemon came up (pid 50972). **Recovery proof: a 1GB load went from >70s-hang → load_s=2.2 total_s=2.3, response "READY".**

## Downstream win (each-pass-feeds-next)
Recovery unblocked the R15 VALIDATE of U-BRIDGE-KEEPALIVE that was previously blocked: the bridge end-to-end now returns `ok=true degraded=false` with a real grounded answer, and `/api/ps` shows the model held RESIDENT after the call = keep_alive registered. See [[reference_bridge_keepalive_fix_2026_06_13]].

## RECURRENCE (2nd recovery this session) + the per-model mitigation shipped
The wedge RECURRED ~30 idle turns later (generate hung again; RAM+VRAM still free) — recovered a 2nd time via the same reap-orphan + restart "PRISM Ollama Serve" procedure. **This is a RECURRING failure** the fleet-reaper (golf) does not yet auto-fix → the orphan-llama-server-with-dead-parent reap rule (recommended below) is genuinely needed; until then any chat validating Ollama mid-session must expect to recover it. **Per-model mitigation SHIPPED** (`U-BRIDGE-FALLBACK`, slot:bravo, 3-of-3 PASS): `buildFallbackLadder` in galaxy-reasoning-bridge — on a model load/generate failure the bridge descends to a smaller installed reasoner before degrading to Claude (resilience half of "robust leg #10"; keep_alive = warmth half). Live-proven: requested `bogus-model:999b` → descended to `qwen2.5-coder:1.5b`, degraded:false. NOTE the ladder helps the per-MODEL failure case; it does NOT fix the FULL-daemon wedge (all models fail) — that still needs the reaper rule + the recovery procedure here. **P2 follow-up (3-of-3 flagged, non-blocking):** the CAG cache stores a fallback-produced answer under the requested-model key and reports `model`=requested (not `usedModel`) on a cache HIT — persist `usedModel` in the cache entry for hit-path transparency. → [[reference_bridge_keepalive_fix_2026_06_13]]

## AUTO-GUARD SHIPPED (wedged a 3RD time -> codified the detect+recover)
The wedge recurred a **3rd time** this session (caught live by the new guard's own probe). Shipped `scripts/ollama-wedge-guard.mjs` (+ 8/8 tests, 3-of-3 PASS, `U-OLLAMA-WEDGE-GUARD`): PURE `classifyOllamaHealth` -> down|healthy|wedged|resource-starved (the load-bearing distinction: a WEDGE has generate-fail + resources FREE -> recoverable; resource-starved = RAM/VRAM low -> do NOT thrash-restart/evict peers' models); live `/api/generate` micro-probe (the gap the tags-only `ollama-docker-health.mjs` + Docker-only `fleet-services-watchdog.mjs` both miss); recovery = reap-orphan(dead-parent gated) + restart "PRISM Ollama Serve", double-gated (`--recover` AND `shouldRecover('wedged')`). **recover() LIVE-VALIDATED end-to-end:** `--recover` on the 3rd wedge -> `recovered=true afterHealth=healthy`. **WIRING (deferred to golf, governance):** auto-killing on a schedule is golf's reaper/scheduled-task domain (soul refuse unsafe-fleet-control-before-governance) -> RECOMMEND golf register `node scripts/ollama-wedge-guard.mjs --recover` as a ~5-10min task / Tier-3 rule so the substrate self-heals unattended.
**P1 follow-up (3-of-3 arm C, non-blocking):** (1) reuse the SAFER tested `scripts/system-health/reap-llama-server-orphans.mjs` heuristic (same-model-blob + 300s-age + dry-run-default + MAX_KILLS) instead of the broader dead-parent gate (which is anyway INERT for the real wedge -- arm A: the wedged runner has a LIVE parent, so the kill-all phase does the recovery); (2) import multi-GPU-safe `readGpuVram` from `scripts/lib/gpu-vram-guard.mjs` instead of the inline single-GPU `freeVramGB()`. **P2:** the generate probe should discriminate HTTP 404 (probe-model missing -> NOT a wedge) from a timeout (the real wedge) so an uninstalled probe model can't false-trigger a recovery. → [[reference_llama_server_orphan_reap_2026_06_09]]

## P1 follow-up RESOLVED as WON'T-DO (2026-06-13, slot:bravo) — with reasoning
The "reuse `selectLlamaOrphans` instead of the dead-parent gate" P1 was analyzed and **deliberately not done** — it would be a cosmetic/regressive change to a working safety-sensitive auto-kill path:
- The two heuristics catch DIFFERENT orphan classes: dead-parent (any model, dead parent) vs `selectLlamaOrphans` (same-model-blob dup, any parent). The 1st-recovery 11.5h orphan was dead-parent-non-dup -> `selectLlamaOrphans` would MISS it. Swapping would LOSE coverage, not gain it.
- The wedge-guard's ACTUAL job is the generate-WEDGE (live-parent runner + stuck daemon load-path). Live-documented: "orphan-reap alone = still wedged -> full service restart." The kill-all+restart HAMMER fixes it (3× validated); a gentle pre-reap adds latency without avoiding the restart in this case.
- Pure dup-orphan leaks (no generate-hang) are `reap-llama-server-orphans.mjs`'s own job (golf's reaper / its own scheduled task), NOT the wedge-guard's.
Conclusion: the wedge-guard works; changing its reap heuristic is make-work for its purpose. Genuine in-lane AI-substrate queue for this /goal is now EXHAUSTED (keep_alive, wiki, fallback, wedge-guard+harden, CAG-usedModel all shipped); only the india-GPU GNN full-coverage residual remains.

## Lane note
Ollama/GPU substrate recovery is fleet-reaper Tier-3 (golf) territory, but it was blocking the whole fleet's AI substrate + my own on-goal work, the operator directive explicitly sanctions restarting "PRISM Ollama Serve" when :11434 is down, and the action is targeted service recovery (NOT unsafe fleet-control / chat commandeering — distinct from the bravo soul's `unsafe-fleet-control-before-governance` refuse). Recommend golf's fleet-reaper Tier-3 add an "orphan llama-server.exe (dead parent)" reap rule — this zombie class is invisible to a RAM/VRAM check. → [[reference_bg_task_hook_transient_shell_attribution_2026_06_13]] · [[feedback_golf_owns_reaper]]
