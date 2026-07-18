---
name: reference_llama_server_orphan_reap_2026_06_09
description: "Leaked llama-server orphan (dup model-blob, Ollama tracks only one) held ~22GB commit ~2h; fleet-reaper Tier-3 didn't catch it — gap for golf to wire."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.645Z
aliases: reference_llama_server_orphan_reap_2026_06_09
---


2026-06-09 (slot:india, DESKTOP-N7MI1VB Blackwell box). A critical-memory-pressure Stop gate fired at **97.4% commit (221/227GB)** — physical RAM was only ~49%, so the pressure was **commit charge**, dominated by **3 `llama-server.exe` processes reserving ~120GB** (one ~68GB = gpt-oss:120b).

**Root cause = a leaked llama-server orphan, NOT a keep-alive leak.** `GET http://127.0.0.1:11434/api/ps` showed only **2** models loaded (gpt-oss:120b exp 21:26, gpt-oss:20b exp 21:04 — both with bounded `expires_at`, so the prior `U-OLLAMA-KEEPALIVE-COMMIT-FIX` is working). But `Win32_Process Name='llama-server.exe'` showed **3** processes: two served the **identical model blob** `e7b273f9…` — PID 38920 (started 20:46:54, live) and **PID 129048 (started 18:44:58, ~133min stale, different port 46192)**. Ollama runs exactly one llama-server per loaded model, so the older duplicate-blob instance was an orphan from a prior model-load generation that Ollama no longer tracked. Reaping just PID 129048 (`Stop-Process -Id 129048 -Force`) dropped commit **85.6% → 75.9%** (~22GB freed); both tracked models stayed healthy (worst case would have been a one-time reload — fail-soft).

**Detection signature (for the fleet-reaper Tier-3 GPU/Ollama coordinator to wire):** enumerate `llama-server.exe`, parse each `--model <blob>` + `--port`; for any model blob with >1 live process, the one whose port is NOT the one Ollama currently routes to (cross-ref `/api/ps`, or simply the OLDER `CreationDate`) is the orphan — reap it. Commit-charge pressure (not physical RAM) is the trigger metric on this box (227GB commit limit = 136GB RAM + page file). The Stop gate's auto-relief + tsserver-zombie reaper both MISSED this because they target node/tsserver, not llama-server.

**Owner:** golf (fleet-reaper / Ollama coordinator). This was an operational reap by india under the standing auto-fix directive — the durable fix is a llama-server-dup-orphan detector in the reaper. Related: [[feedback_close_background_tasks_at_stop]] (R14 close-orphans), [[feedback_golf_owns_reaper]], `U-OLLAMA-KEEPALIVE-COMMIT-FIX` (cebde4fd9 — the bounded keep-alive, a different Ollama-commit fix).
