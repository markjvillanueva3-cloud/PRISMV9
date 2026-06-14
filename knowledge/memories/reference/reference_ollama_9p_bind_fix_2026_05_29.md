---
name: ollama-9p-bind-fix-2026-05-29
description: "Ollama /api/chat fix — host-native ollama (fast C: store) is the answer; the prism-ollama CONTAINER (H: 9p bind) was the slow shadow"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.237Z
aliases: reference_ollama_9p_bind_fix_2026_05_29
---


## ⭐ CORRECTION / OPERATIVE FIX (2026-05-30, slot golf) — READ THIS FIRST

The 9p analysis below is real but was chasing the WRONG ollama. **There are TWO Ollamas on this box:**
1. **Host-native `ollama.exe`** (the tray "ollama app" + `ollama serve`) — model store at **`C:\Users\wompu\.ollama\models` (~40GB, fast local NVMe)**. Has qwen2.5-coder:7b/14b/32b, deepseek-r1:14b, llama3.2-vision:11b, qwen2.5vl:7b, nomic-embed, etc. **`/api/chat` qwen2.5-coder:7b = `http=200` in ~1s (load 103ms).** This is the GOOD one.
2. **`prism-ollama` Docker container** — model store on the **H: 9p bind** (slow, the saga below). Redundant with #1.

Only ONE can bind `:11434`. When Docker Desktop is UP, the container grabs `:11434` and the fleet hits the SLOW 9p ollama → `/api/chat` hangs → the whole "ollama dead" symptom. When Docker is DOWN, the host-native ollama binds `:11434` → fleet hits the FAST one → works in 1s.

**THE FIX: standardize on the host-native ollama; never let the slow container shadow `:11434`.**
- `docker update --restart=no prism-ollama && docker stop prism-ollama` (disable, don't delete — [[feedback_never_delete_only_disable]]). Host-native ollama then owns `:11434`.
- Host-native ollama auto-starts via the tray app on login; its C: store needs no migration.
- The named-volume migration below is now MOOT (only relevant if you insist on a containerized ollama). Don't bother — use host-native.
- `OLLAMA_MODELS` for host-native = `C:\Users\wompu\.ollama\models`. Confirm the rewriter/offload hooks point at `:11434` (they do) and request a model host-native HAS (qwen2.5-coder:7b ✓).

---

**Symptom (recurring, whole-fleet):** Ollama `/api/tags` + `/api/ps` + the 0.6GB `nomic-embed-text` worked, but `/api/chat` / `/api/generate` for `qwen2.5-coder:7b` hung — 8s health probe timed out, prompt-rewriter 100% `no-model` skip, offload rate stuck ~10%. Banner "Ollama /api/chat is dead" fired every turn.

**NOT the cause:** GPU was fine (RTX 4080 SUPER, 9–10 GB free, container HAD GPU access — `docker exec prism-ollama nvidia-smi -L` showed the card; load offloaded 29/29 layers). Not CPU-only. Not VRAM-starved.

**Root cause:** the `prism-ollama` container's model store was a **Windows-path bind mount on the slow H: drive** — `H:/prism/data/docker-volumes/ollama -> /root/.ollama`. Docker Desktop reaches Windows bind mounts through the **WSL2 9p/virtiofs** layer. Ollama's default `mmap=true` lazily page-faults the GGUF: a 4.6GB model = ~1.2M 4KB random reads, each a 9p round-trip → effectively never completes. The 0.6GB embed model has ~8× fewer pages so it limps through (masking the problem). Sequential read (`use_mmap:false`) loads in ~160s — but the busy fleet (7 peers firing rewriter hooks) issues concurrent qwen requests that **thrash** the slow load so it never finishes. 9p slowness is the root of BOTH the slow load and the thrash.

**Proven on 2026-05-29 (slot golf):**
- `mmap=true` over 9p: `http=000 elapsed=302s` (never loaded).
- `use_mmap:false` (sequential) over 9p: `http=200 elapsed=160s` (loaded + replied) — but re-load thrashed by fleet at 272s+.
- Load-request log confirmed `UseMmap:false` honored after the Modelfile bake, AND showed repeated load requests every ~10-30s (the thrash).

**The fix (robust): move the model store off 9p onto a Docker named volume (WSL2-native ext4).** Native block I/O, not 9p → loads drop to ~10-15s, mmap works normally.
```
docker volume create prism-ollama-models
docker run --rm -v H:/prism/data/docker-volumes/ollama:/src:ro -v prism-ollama-models:/dst alpine sh -c 'cp -a /src/. /dst/'
docker stop prism-ollama && docker rm prism-ollama
docker run -d --name prism-ollama --network prism_prism-net --gpus all -p 11434:11434 \
  -v prism-ollama-models:/root/.ollama \
  -e OLLAMA_HOST=0.0.0.0:11434 -e OLLAMA_KEEP_ALIVE=-1 -e OLLAMA_NUM_PARALLEL=1 \
  -e OLLAMA_FLASH_ATTENTION=1 -e OLLAMA_KV_CACHE_TYPE=q8_0 \
  --restart unless-stopped ollama/ollama:latest
```
The named volume's VHDX may physically sit on H:, but the container accesses it via the hypervisor's native ext4 block path — NOT 9p — so it's fast regardless.

**Belt-and-suspenders (kept):** baked `PARAMETER use_mmap false` into `qwen2.5-coder:7b` + `mistral:7b` + `codellama:7b` via `ollama create <tag> -f Modelfile` (reuses existing blobs, no re-download). Harmless on ext4; protects any residual slow-path. **Caveat:** a future `ollama pull <model>` REWRITES the manifest and DROPS the baked param — re-bake after any pull.

**`OLLAMA_NO_MMAP=1` env does NOT work** on current Ollama — the runner still logged `UseMmap:true`. mmap is controlled per-request (`options.use_mmap:false`) or per-model (Modelfile `PARAMETER use_mmap false`), not by that env var.

**`prism-ollama` has no compose source** (empty compose labels) — it's a long-lived `docker run` with `--restart unless-stopped` (survives reboots via Docker Desktop). The launcher `mcp-server/scripts/ollama-docker-launcher.mjs` only `exec`s into it (list/pull), never creates it. So the recreate command above is the canonical record.

**GPU budget reality (16GB shared w/ Fusion360):** qwen-7b resident (~5GB, keep_alive=-1) + embed-NIM (~3GB) + Fusion360 leaves too little for NIM-llama-3.2-3b (~7GB) → it OOM-exits (137). On this box you cannot have Ollama-7B + NIM-3B both VRAM-resident with Fusion360 open. Priority: Ollama (fleet token-offload, the actual pain) resident; NIM-3b on-demand. See [[reference_nvidia_nim_local_setup_2026_05_18]] and [[reference_golf_ollama_coldload_stall]] (prior, less-precise diagnosis — this supersedes the root-cause detail).
