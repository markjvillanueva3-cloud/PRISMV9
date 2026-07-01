# HANDOFF — claude-006d0532 — LOCAL-LLM-MS0 / NIM stack rollout

**Updated:** 2026-05-05T17:58:00Z (continuation of claude-060a3b35)
**Branch:** work/cam-exhaust-ms0
**Topic:** local-llm-ms0
**Predecessor handoffs:**
- `HANDOFF-claude-9a46c167-multi-model-setup.md` (CLI install + 3-way consensus baseline)
- `HANDOFF-claude-c9e10f4c-*` (NIM scaffolding — start.ps1, compose, hooks)

---

## What landed this session — all on H:

### NIM/vLLM/Ollama bridge stack (`H:/prism/.claude/hooks/lib/`)
| File | Purpose |
|---|---|
| `vllm-hook-bridge.mjs` (new) | vLLM HTTP client (OpenAI-compat, port 8020). 30s timeout for cold start. |
| `nim-embed-bridge.mjs` (new) | NeMo Retriever embedding client (port 8010). Single + batch, query/passage modes. |
| `local-llm-bridge.mjs` (rewrote, 2-backend → 3-backend) | NIM/vLLM/Ollama dispatcher with capability routing (`reasoning`/`code`/`errortriage` → vLLM, others → NIM, fallback Ollama). New `localLLMHealth()` API. |
| `nim-hook-bridge.mjs` (untouched, was scaffolded by claude-c9e10f4c) | NIM HTTP client for completions. |

### Compose files (`H:/Tools/nim/compose/`)
| File | Profile |
|---|---|
| `rtx3080.yml` (rewrote) | llama-3.2-3b + llama-3.1-8b + nv-embedqa-e5 — H: bind mounts |
| `rtx4080.yml` (rewrote) | adds llama-3.2-vision-11b — H: bind mounts |
| `vllm-rtx3080.yml` (new) | DeepSeek-R1-Distill-Qwen-14B default, port 8020 |
| `vllm-rtx4080.yml` (new) | DeepSeek-R1-Distill-Qwen-32B-AWQ default, port 8020 |

### Cloud-API consensus voices (`H:/prism-iooms0/mcp-server/src/engines/`)
| Engine | API | Use |
|---|---|---|
| `DeepSeekClientEngine.ts` (new) | api.deepseek.com (OpenAI-compat) | DeepSeek-V3.2 (685B MoE — too big for local GPU). Consensus voice #5. |
| `MoonshotClientEngine.ts` (new) | api.moonshot.ai (OpenAI-compat) | Kimi-K2 (~1T MoE — too big for local). Consensus voice #6. |

### Helper scripts (`H:/Tools/nim/`)
- `login-ngc.ps1` (new) — reads `compose/ngc.env`, runs `docker login nvcr.io`
- `test-bridge.ps1` (new) — end-to-end smoke test of NIM/vLLM/Ollama + embed
- `RUNBOOK.md` (new) — full operator guide for both PCs
- `installers/DockerDesktopInstaller-latest.exe` — saved 617 MB v4.71.0 installer for next-time use

### settings.json (already mirrored C:→H: by hook)
Added env vars: `NIM_URL`, `NIM_EMBED_URL`, `VLLM_URL`, `LOCAL_LLM_BACKEND=auto`, `NIM_FALLBACK_TO_OLLAMA=1`. Added `nim-autostart.mjs` to SessionStart hook chain. Prepended Docker bin to PATH.

---

## What worked ✅

1. **Docker Desktop reinstall on this PC** (prior install was corrupted) — v4.71.0 fresh, daemon healthy.
2. **Docker storage on H:** — `H:/Docker/DockerDesktopWSL/disk/docker_data.vhdx` lives there. The `DataFolder` setting + System32 PATH fix made Docker's GUI migration finally succeed.
3. **GPU containers verified** — modern Docker Desktop ships NVIDIA Container Toolkit, no manual install needed. RTX 3080 detected inside `nvidia/cuda` container.
4. **NGC login** — `nvcr.io` cached in `~/.docker/config.json`.
5. **NIM image pulled** — `nvcr.io/nim/meta/llama-3.2-3b-instruct:latest` (30.9 GB) sits on H: vhdx, ready for next attempt.
6. **All bridges + engines + compose files** — built, reviewer-approved (PASS-WITH-NOTES), scrutiny gate cleared on prior session.

---

## What didn't work ❌

**`nim-llama32-3b` runtime model download wedged silently** at ~10.6 GB downloaded.
- Image pull: ✅ (30.9 GB, ~5 min)
- Container start: ✅ (vllm-bf16-tp1-pp1 profile selected)
- Runtime weight download to `/opt/nim/.cache` (= `H:/Tools/nim/cache/llama32-3b`): partial. 13 files / 10.6 GB after 12 min, then **stalled** for 8+ min while NetIO continued growing internally.
- GPU never loaded model (945 MiB / 2% util held flat the entire time).
- Logs locked at 17:25:27 — no progress emitted, no error.
- Daemon eventually got stressed enough that `docker logs`/`stats`/`exec` all hung. Required Docker Desktop restart to recover.

**Symptom matches**: known NIM 1.10.1 quirk on slow NGC throughput — the NGC client retries fetches silently without surfacing to docker logs. ~7 MB/s observed download speed suggests rate limiting or shared-tenancy congestion at NGC's edge.

---

## Root-cause discovery (most valuable artifact of this session)

Today's earlier 3 Docker storage relocation failures (DataFolder hang, vhdx delete recovery, daemon.json ignore) ALL traced back to **one root cause**:

> Docker Desktop's "Disk image location" GUI subprocess shells out to `robocopy` (Windows utility at `C:\Windows\System32\robocopy.exe`). When Docker Desktop is launched from a shell with a stripped PATH (Claude Code's harness PATH override doesn't expand `%PATH%` correctly), the migration helper can't find robocopy and silently fails.

Fix: launch Docker Desktop with explicit `PATH=System32;System32\Wbem;Docker\bin`. After that, the GUI Settings → Resources → Advanced → Disk image location → Browse to H: → Apply & Restart works correctly.

**This is documented in RUNBOOK.md** for the home PC rollout.

---

## Recommended next steps for next session (likely on home PC's RTX 4080)

1. **Read RUNBOOK.md** at `H:/Tools/nim/RUNBOOK.md` — full operator guide
2. **If on home PC (4080):**
   - All scaffolding portable on H: (already there)
   - Phase A check: `pwsh H:\Tools\nim\check-prereqs.ps1` (Docker + NGC + GPU)
   - **Move Docker storage to H:** via Settings → Resources → Advanced → Disk image location (use `H:\Docker`). PATH fix may not be needed if home PC's shell PATH is clean — try first, only apply PATH workaround if move hangs
   - `pwsh H:\Tools\nim\login-ngc.ps1`
   - Pull `nim-llama31-8b` first (better fit for 16GB VRAM than 3b on the 3080)
   - If retry of 3b on home PC still wedges, suspect NGC client v1.10.1 bug — try newer NIM image tag if available
3. **Wire DeepSeek + Moonshot client engines** into `MultiModelConsensusEngine` voice list — listed in INFRA-CONSENSUS-WIRE-MS0 / U02 as the next milestone
4. **Migrate the 9 Ollama-using hooks** to `local-llm-bridge.mjs` — one-line import swap each (see RUNBOOK.md SETUP §"Migrate the 9 Ollama-using hooks")

## ⭐ Late-session finding — Claude Code → local NIM is OFFICIALLY supported

User pointed at https://docs.nvidia.com/nim/large-language-models/latest/ai-assistant-integrations/claude-code.html

NVIDIA documents an `ANTHROPIC_BASE_URL` override that redirects ALL Claude
Code API calls to a local NIM endpoint. NIM exposes Anthropic-compatible
`/v1/messages` so it's a drop-in. This contradicts my earlier "no GPU for
Claude reasoning" claim — turns out there IS a path.

**Quality trade-off**: brain becomes Llama-3.1-8b (or whatever NIM model
loaded), not Opus. Real `claude` keeps hitting Anthropic; local-NIM-Claude
is for bulk/batch/privacy-sensitive work only.

**Wired**: `H:\Tools\nim\claude-local.ps1` — process-scoped launcher with
endpoint probe, model verification, and dry-run mode. Won't pollute the
normal `claude` shell. Updated RUNBOOK.md §"Claude Code → local NIM" with
full env-var spec and Ollama-proxy caveat.

**Requires NIM running** with `/v1/messages` — Ollama-only doesn't work
without an Anthropic↔OpenAI translation proxy (not yet built).

## What's still working on this PC (no changes needed)

- **Ollama on H:** 39.85 GB at `H:\Tools\ollama\models` (deepseek-r1:14b, qwen2.5-coder:{7b,14b,32b}, llama3.2-vision:11b, nomic-embed-text)
- **`local-llm-bridge.mjs` in `auto` mode** routes to Ollama when NIM/vLLM aren't reachable — all PRISM hooks + 3 CLIs (Claude/Gemini/Codex) keep working

---

## Disk state at session end

| | C: free | H: free | H: vhdx |
|---|---|---|---|
| Session start | 9.4 GB | 3249 GB | 0 (on C:) |
| End | 18.7 GB | ~3109 GB | 30.6 GB on H: |

**Net win**: 9.3 GB freed on C:, ~30 GB used on H: (Docker WSL2 vhdx + cached image). The session's primary infra goal (Docker storage on H:) is achieved.

---

## Files claimed by other chats during this session

(No conflicts — this work was outside the prism main tree where the lane traffic was happening. Bridge files in `.claude/hooks/lib/` and Tools/nim are uncontested.)

---

## Scrutiny gate

Cleared on prior chat (claude-060a3b35) — reviewer agent: PASS-WITH-NOTES. 3 acknowledged TODOs in RUNBOOK (consensus voice wiring, hook migration, integration tests deferred until NIM live).
