---
name: reference-infra-nim-drop-ollama-2026-06-09
description: "Why NIM was dropped for Ollama-only on the Blackwell box, and the verified-safe Qdrant 768-dim match"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.623Z
aliases: reference_infra_nim_drop_ollama_2026_06_09
---


Infrastructure conflict resolved 2026-06-09 (DESKTOP-N7MI1VB, RTX PRO 6000 Blackwell 96GB).

**Root conflict:** `~/.wslconfig` caps Docker/WSL2 at **16GB** on purpose (protects the 26-chat fleet; documented fix `U-WSL-MEM-GUARD` commit 38af34077). NIM containers (llama-3.1-8b etc.) need 20-40GB → OOM-crash with **exit 137** the instant they load a model. NIM was originally sized for an RTX 4080 SUPER 16GB (slot golf 2026-05-18); the GPU was later swapped to the 96GB Blackwell but the WSL RAM cap stayed, so NIM never fit. Ollama (native, port 11434) serves everything fine on the 96GB GPU.

**Fix applied (operator decision "drop NIM, standardize on Ollama"):**
1. 4 `nim-*` containers + stale `prism-ollama` container → `docker update --restart=no` + stopped (kills the exit-137 crash loop).
2. `LOCAL_LLM_BACKEND` `auto`→`ollama` in `C:/Users/wompu/.claude/settings.json` (verified landed C: + mirrored H:). The `ollama` branch in `.claude/hooks/lib/local-llm-bridge.mjs:53` never calls NIM → removes the dead-NIM probe-timeout penalty on every embed/inference call.
3. `.claude/hooks/nim-autostart.mjs` — added early-return guard: skips when `LOCAL_LLM_BACKEND===ollama` (reversible; flip env back to reactivate). Sole purpose of that hook was to run `H:/Tools/nim/start.ps1` on SessionStart.

**Verified-safe — the silent-P0 that WASN'T:** worried the NIM→Ollama repoint would break Qdrant semantic search via embed-dim mismatch. Checked live: all 3 collections (`prism_engines` 3866pts, `prism_skills` 241, `prism_formulas` 32) are **768-dim**; Ollama `nomic-embed-text` produces **768-dim** → MATCH. Collections were nomic-embed (768d) all along, NOT NIM nv-embedqa-e5 (1024d). No re-embed needed.

**Reboot-hardening applied (all verified live, 2026-06-09):**
1. `.claude/hooks/docker-intel-autostart.mjs:90` `COMPOSE_SERVICES` `["qdrant","ollama","ollama-nomic-preload"]`→`["qdrant"]` — stops the SessionStart/reboot `docker compose up ollama` that collides with native Ollama on :11434.
2. `mcp-server/scripts/ollama-docker-launcher.mjs` `DEFAULT_SERVICES` dropped `ollama` + added a `--services=mcp` fail-fast guard (mcp is a native :3100 node daemon, NOT a compose service — the misuse that produced "no such service: mcp" + the stale DOCKER_RUNTIME_STATE status:fail).
3. `docker-compose.yml`: removed obsolete top-level `version:` key (warning gone); compose `ollama` env `KEEP_ALIVE -1→30m` + `MAX_LOADED_MODELS 6→4` (aligns CI/portable fallback to the native pinned-model-leak fix cebde4fd9). Cleared stale `DOCKER_RUNTIME_STATE.json`.

**Native Ollama autostart on boot = ALREADY HANDLED** (no new task — dedup): scheduled task `PRISM Ollama Serve` (trigger MSFT_TaskLogonTrigger, Enabled, `ollama.exe serve`) starts it at logon; `PRISM Ollama CPU Throttle` also present. Earlier "no service/Run-key" read missed it because it's a Scheduled Task. `restart=no` on the 5 stopped containers survives reboot. Singleton 3-daemon warning was transient — live read now `mcp: single daemon healthy`. See [[reference_mcp_daemon_pileup_port_conflict_2026_06_09]], [[reference_ollama_cpu_cap_fix_2026_06_03]], [[reference_critical_resource_roots_2026_05_30]].
