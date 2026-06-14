---
name: reference_alpha_ollama_chat_hang_host_saturation_2026_05_30
description: Ollama /api/chat hang on this PC is usually HOST H: I/O saturation + RAM exhaustion, NOT NIM/GPU contention or a daemon bug. Restart daemon, but the real fix is host relief. Diagnostic + restart recipe inside.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.018Z
aliases: reference_alpha_ollama_chat_hang_host_saturation_2026_05_30
---


**Symptom (recurring):** the `prompt-rewriter-ollama is silently broken` banner fires —
`/api/tags` + embeddings work but `/api/chat`/`/api/generate` HANG (100% skipped, reason
`ollama-offline`). The banner GUESSES "GPU contention from NIM endpoints." **On DESKTOP-N7MI1VB
(2026-05-30) that guess was WRONG.**

**Actual root cause (measured):** the **host is resource-saturated**, blocking model-blob loads off
the H: drive where ollama models live (`H:\Tools\ollama\models`):
- **H: PhysicalDisk: queue length 22–32 (healthy <2), `% Disk Time` ≈ 1942%** — sustained choke.
  C: was fine (16%). The 2 GB+ chat-model blob read off H: can't complete in the rewriter's timeout.
- **"Memory Compression" process RSS ≈ 20 GB** — physical RAM exhausted, heavy paging.
- **GPU was FINE** — RTX 4080 SUPER, ~6.5 GB free / 16 GB, ~28% util; **zero python/NIM GPU procs.**
  So NOT GPU/NIM contention.
- Embeddings work because `nomic-embed-text` is VRAM-resident (no H: read); chat models must LOAD
  a fresh blob off the choked H: → hang. `/api/ps` stays stuck showing only nomic, never the chat model.

**Fast diagnostic (do this BEFORE believing the NIM banner):**
1. `curl -s --max-time 6 http://localhost:11434/api/ps` — only nomic + chat never appears → load-blocked.
2. `nvidia-smi --query-gpu=memory.used,memory.total,utilization.gpu --format=csv,noheader` — if GB free, GPU is NOT the issue.
3. PowerShell `Get-Counter '\PhysicalDisk(5 h:)\Current Disk Queue Length','\PhysicalDisk(5 h:)\% Disk Time'` — **the real signal.** queue»2 / %time»100 = H: choke.
4. `Get-Process 'Memory Compression'` RSS — tens of GB = RAM exhaustion.

**Clean daemon restart (it runs as a USER process, NO Windows service; relaunch needs the H: models env):**
```powershell
taskkill /F /T /IM ollama.exe          # kills serve + runner(s)
$env:OLLAMA_MODELS = "H:\Tools\ollama\models"   # else fresh serve defaults to C:\Users\..\.ollama and loses all 9 models
Start-Process "C:\Users\wompu\AppData\Local\Programs\Ollama\ollama.exe" -ArgumentList "serve" -WindowStyle Hidden
```
Verify: `Invoke-RestMethod http://localhost:11434/api/version`. **A restart fixes a truly-wedged serve
but does NOT fix host saturation** — if H: is still choked, chat loads still hang post-restart (observed).

**Real recovery = HOST RELIEF, not a daemon fix:** reduce concurrent fleet H: I/O / free RAM
(fewer live chats, `/compact` the heaviest — golf's [[reference_fleet_memory_monitor_2026_05_16|fleet-memory-monitor]] names the target tree), OR
relocate ollama models to the healthy C: drive (`OLLAMA_MODELS=C:\...` + copy blobs — heavy, ~30 GB,
do it when H: is NOT choked), OR just wait for fleet I/O to subside (the daemon is primed; the next
chat call warms once H: gives a window). [[reference_fleet_reaper|fleet-reaper]] `--once` only freed ~41 MB here — the heavy
users are LIVE chats + Docker/WSL, not reapable orphans.

**Concrete H: hogs found (2026-05-31 follow-up, per-process I/O diff — the all-process Get-Counter
overflows; use a 2-snapshot `Get-CimInstance Win32_Process` ReadTransferCount+WriteTransferCount
delta instead):** the choke (H: still 3607% disk-time / queue 32 even with only 1 peer chat online)
was NOT PRISM node procs (all 0.4–2.3 MB/3s) — it was **(1) recursive `grep.exe -rn` ×3 (top 121
MB/3s — raw bash recursive grep over the tree, the anti-pattern the soul's route-before-grep
forbids; transient), (2) `MSPCManagerCore.exe` (Microsoft PC Manager background scan, 60 MB/3s,
third-party overhead), (3) `SearchIndexer.exe` (Windows Search indexing the 38K-file H: tree, 27
MB/3s).** Likely H: is a slow/spinning drive (modest MB/s → full saturation). **Operator recovery
levers** (system-config / their environment — recommend, don't unilaterally kill): close MS PC
Manager; exclude `H:\` from Windows Search indexing; consider moving ollama models (and the hot
working set) to the SSD (C: was healthy at 16%). The recursive-grep load is fleet-wide hygiene
(make chats/hooks use ripgrep/Glob, not `grep -rn`).

**RTK grep-runaway BUG (actionable, alpha rtk-domain — 2026-05-31):** the single worst H: hog was a
`grep.exe` running **24 HOURS** (parent `rtk`, grandparent dead = orphan). Origin cmd:
`rtk grep -n "\"units\"|unitSystem|inch.*mm|mm.*inch|auto-detect" <one-file>` — the `|` alternation
chars got mangled (shell/RTK interaction) into a bare **`grep -rn "units"` recursing the WHOLE H:
tree** (node_modules ×26 worktrees, .git, 548MB graph, PDF corpus). A 2nd orphan grep ran **28.5 h**.
Reaping the orphans dropped H: queue 31→5 momentarily. **Two systemic findings:** (1) RTK wrapping a
`grep` whose pattern contains `|` can spawn a runaway recursive whole-tree `grep -rn` — RTK should
quote/escape the pattern + never inject `-r` when a file arg is given (fix in alpha's rtk lane).
(2) the fleet spawns many long-running raw `grep -rln`/`grep -rl` (hours-old) that hammer the slow
H: — fleet hygiene = ripgrep/Glob, NOT raw recursive bash grep (the soul's route-before-grep).
**RESOLVED 2026-05-31 — the dominant chronic hog was WINDOWS SEARCH INDEXING the giant H: dev tree.**
The fix sequence that worked (no model-copy — see below): (1) reap the orphan runaway greps (24h + 28.5h);
(2) kill MS PC Manager AND set its auto-start service `PCManager Service Store` to Manual+Stopped (a
plain kill respawns — the SERVICE is the respawn source); (3) **`Stop-Service WSearch` + `Set-Service
WSearch -StartupType Manual`** (indexing 38K+ H: files on a slow drive was the steady killer). Result:
H: 2869%/queue31 → **queue 1**, and qwen2.5-coder:3b loaded in **6.7s** + /api/chat returned `"ok"`.
Then **prewarmed qwen2.5-coder:7b (the offload model) with `keep_alive:-1`** so it stays VRAM-resident
and survives any future H: contention (a warm model serves chat with NO H: read — the cold LOAD was
the only thing H: blocked). **The SSD-move was BOTH infeasible AND unnecessary:** C: had only 43.9 GB
free vs **56.1 GB** of models, and once H: is uncontended the models load fine in-place. Reversal:
`Set-Service WSearch -StartupType Automatic; Start-Service WSearch` (but then exclude H:\ from Indexing
Options first, or it re-chokes) + re-enable PCManager service. Durable host-relief benefits the WHOLE
fleet (git/builds/viz), not just Ollama.

Domain: alpha (ollama/efficiency). Sister: [[feedback_golf_owns_reaper]] (host-relief is golf's lane),
[[reference_fleet_memory_monitor_2026_05_16]] (names the chat to /compact). Standing: [[feedback_always_fill_gaps]].
