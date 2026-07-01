---
name: ollama-generation-hang-2026-05-30
description: "Ollama /api/tags works instantly but /api/chat + embeddings HANG indefinitely (>90s) even after a clean restart with 11GB GPU free — deeper runner/CUDA issue, NOT the localhost bug"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.677Z
aliases: reference_ollama_generation_hang_2026_05_30
---


**The finding (2026-05-30 slot golf, ~18:00).** Distinct from + downstream of [[ollama-hooks-localhost-ipv6-bug-2026-05-30]]. Ollama's HTTP server is UP but **generation is wedged**:
```
/api/tags     127.0.0.1 → 200 in 0.002s    (localhost → 200 in 0.216s via IPv6 fallback)
/api/chat     127.0.0.1 → HANGS  (>90s cold, >60s after fresh restart, qwen2.5-coder:3b)
/api/ps       → no resident models (generation never completes a load)
ollama list   → all 7 models present + correct sizes (NOT corrupt manifests)
nvidia-smi    → 11140 MiB FREE, util 7%  (NOT GPU-starved at test time)
server.log    → no error lines logged
```
It **worked earlier the same session** (rewriter produced a real 7b rewrite, conf 0.80, 7391ms) then degraded — so it's a runtime wedge, not a config/install problem.

**What does NOT fix it (ruled out this session):**
- `localhost`→`127.0.0.1` (that's a separate, real bug — fixes the *fast-fail*, not the *hang*).
- Killing all `*ollama*` procs + bare `ollama serve` relaunch → tags binds 200, chat STILL hangs.
- Relaunching the desktop `ollama app.exe` → app process up but did NOT bind 11434 (worse — left it `000`; bare `ollama serve` is the reliable bind).
- GPU is NOT the constraint at test time (11GB free). The reaper's earlier "GPU free 1240MB" was a transient (a NIM endpoint that later released).

**This is the single root cause of a cascade of red fleet telemetry** (all gated on Ollama generation/embeddings):
1. prompt-rewriter-ollama **100% skip** (`ollama-offline` / WALL_TIMEOUT).
2. Ollama offload **~10%** vs 30% target.
3. wiki↔tribal coverage stuck **31.5%** (26,051 files unembedded — `tribal-embed-index --add` hangs on the embed endpoint).
4. **Continuous orphan churn** golf keeps reaping — `tribal-embed-index` + `obsidian-memory-sync` spawn, block forever on the dead endpoint, parent exits → orphan. (Reaped ~15 this session.)

**Likely real cause (hand to operator + alpha — token-optimization owner):** CUDA-runner / model-runner subprocess wedge that the HTTP server can't recover. **Operator next steps (need the local GUI/driver, golf can't from headless):** (a) check the Ollama tray app + its logs in the GUI; (b) `nvidia-smi` for a stuck context / try a GPU driver reset; (c) a **reboot** is the highest-probability clear for a wedged CUDA context; (d) after recovery, prefer `qwen2.5-coder:3b` (~2GB, fits with NIM) for per-prompt rewrites and confirm warm `/api/chat` latency < the 8s rewriter WALL_TIMEOUT. **Until fixed, every Ollama-routed hook silently no-ops** — the offload + tribal-embed + rewriter telemetry stays red and is NOT a code regression.

State left by golf: Ollama restored to bare `ollama serve` (tags serving 200). Generation still wedged — operator action required.
