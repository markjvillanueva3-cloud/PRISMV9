---
name: ollama-blackwell-gpu-consolidation-2026-06-03
description: "Ollama on RTX PRO 6000 Blackwell ran on CPU after the GPU swap — a half-failed auto-upgrade left the engine stuck at v0.24.0; fix was a clean reinstall to v0.30.3 + single H: model store."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.671Z
aliases: reference_ollama_blackwell_gpu_consolidation_2026_06_03
---


On DESKTOP-N7MI1VB after the RTX 4080 SUPER 16GB → RTX PRO 6000 Blackwell 96GB (sm_120, CUDA CC 12.0, driver 596.59) swap, ollama ran EVERY model on CPU: `/api/ps` showed `size_vram:0`, ~1.3 tok/s, heavy CPU load (the symptom the operator noticed).

**Root cause — a half-failed ollama auto-upgrade.** The Inno installer (ran 10:37, `upgrade.log`) replaced `ollama app.exe` (tray → 0.30.2) but FAILED to replace `ollama.exe` (engine): `DeleteFile failed; code 5 — file in use` → rolled back. So the ENGINE was stuck at **0.24.0** while the tray reported 0.30.2. The 0.24.0 engine initializes a CUDA context (appears in `nvidia-smi` compute-apps) but offloads 0 layers to the new sm_120 card → silent CPU fallback. **Tell:** `ollama.exe --version` = 0.24.0 vs tray/app version 0.30.2; and the model store the running server used (`C:\.ollama`) differed from PRISM's configured `OLLAMA_MODELS=H:/Tools/ollama/models`.

Also had TWO installs (desktop `C:\Users\wompu\AppData\Local\Programs\Ollama` + portable `H:/Tools/ollama` v0.24.0) and TWO model stores (`C:\.ollama` 39.8GB + `H:/Tools/ollama/models` 67.5GB; H: was a strict superset).

**Fix (operator-chosen: fresh clean reinstall + H: store):** stop all ollama procs → uninstall desktop (`unins000.exe /VERYSILENT`) → remove the portable engine binary (KEEP H: models) → set USER env `OLLAMA_MODELS=H:/Tools/ollama/models` + Blackwell tuning (`OLLAMA_MAX_LOADED_MODELS=3`, `OLLAMA_NUM_PARALLEL=4`, `OLLAMA_KEEP_ALIVE=60m`, removed the `OLLAMA_NUM_THREAD=1` cap) → install **v0.30.3** (Authenticode-verified `CN=Ollama Inc.`, 1.39GB from github release) → restart via desktop app.

**Result:** `vram=8.7GB` (qwen2.5-coder:7b 100% on GPU), **220 tok/s warm**, GPU 99% util, 31°C. Cold-load from H: ≈ 40s for 8.7GB (H:-drive read speed; `keep_alive 60m` + 3 resident-model slots mitigate). Single install (desktop v0.30.3), single store (H:).

**Lesson:** after ANY GPU swap, do not trust that ollama "runs" — verify it actually OFFLOADS: `curl /api/ps` → `size_vram` must equal `size` (full residency), then a WARM `num_predict` benchmark for real tok/s (GPU 7B ≈ 200+ tok/s; CPU ≈ 1-15). A version mismatch between the tray app and `ollama.exe --version` = a stuck/locked-binary upgrade that needs all procs stopped before reinstall. Sibling discipline: [[feedback_check_units_first]] (verify the real thing, not a proxy).
