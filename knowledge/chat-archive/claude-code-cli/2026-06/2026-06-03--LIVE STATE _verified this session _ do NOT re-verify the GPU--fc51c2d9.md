---
type: "chat-session"
source: "claude-code-cli"
session_id: "fc51c2d9-4fcf-4e38-82b0-3a6b100a553c"
title: "LIVE STATE (verified this session — do NOT re-verify the GPU): - Host DESKTOP-N7"
date: "2026-06-03"
first_ts: "2026-06-03T16:26:28.843Z"
last_ts: "2026-06-03T16:27:52.260Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/fc51c2d9-4fcf-4e38-82b0-3a6b100a553c/subagents/workflows/wf_ea0e0a4b-f4c/agent-ac756ee06ab32ee55.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# LIVE STATE (verified this session — do NOT re-verify the GPU): - Host DESKTOP-N7

> **claude-code-cli** | 2026-06-03 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/fc51c2d9-4fcf-4e38-82b0-3a6b100a553c/subagents/workflows/wf_ea0e0a4b-f4c/agent-ac756ee06ab32ee55.jsonl`

## Transcript

### User | 2026-06-03T16:26:28.843Z

LIVE STATE (verified this session — do NOT re-verify the GPU):
- Host DESKTOP-N7MI1VB. GPU JUST SWAPPED: "NVIDIA RTX PRO 6000 Blackwell Workstation Edition", 97887 MiB (~96GB VRAM), driver 596.59, CUDA CC 12.0. PREVIOUS card = RTX 4080 SUPER 16GB. Every threshold / model-size / concurrency gate tuned for 16GB is now ~6x under-provisioned.
- Ollama: RUNNING at http://127.0.0.1:11434 (v0.24.0); the 'ollama' CLI is NOT on PATH — use the HTTP API (/api/tags, /api/ps, /api/pull). Installed models: qwen2.5-coder:7b, qwen2.5-coder:14b, qwen2.5-coder:32b, deepseek-r1:14b, nomic-embed-text:latest. NO kimi, NO qwen3.
- Docker: daemon DOWN (Docker Desktop not running).
- Network: github=200, registry.ollama.ai=000 (UNREACHABLE) — ollama model pulls may be blocked; verify and report.
- Env (H:/.claude/settings.json): OLLAMA_MODELS=H:/Tools/ollama/models; NIM_URL=http://127.0.0.1:8000/v1; NIM_EMBED_URL=http://127.0.0.1:8010/v1; NIM_FALLBACK_TO_OLLAMA=1.
- Repo root H:/prism. Settings mirror H:/.claude/settings.json (c-to-h-mirror replicates from C:/Users/wompu/.claude/settings.json).
OUTPUT RULES: plain text only (NO JSON, no StructuredOutput). For every proposed change give exact file path + line + current value -> proposed new value. Concise bullets, not prose. Flag any BLOCKER explicitly. Do NOT edit files — recon only.

You are the synthesis lead. Five domain mappers returned the findings below. Produce ONE dependency-ordered EXECUTION PLAN for the main agent to apply.

=== MODEL-ROUTING ===
Recon complete. Findings below.

---

**(1) IS THERE ONE SHARED SOURCE OF TRUTH?**

NO. There is no single canonical `HOOK_MODELS` map. The model-tag layer is FRAGMENTED across at least 4 independent definitions plus ~20 per-hook inline strings:

- `H:/prism/.claude/hooks/lib/ollama-hook-bridge.mjs` — `HOOK_MODELS` (L19-27) + `DEFAULT_MODEL` (L16). This is the closest thing to a SoT (queried via `prism_dev:ollama_hook_query`), but most standalone hooks do NOT import it.
- `H:/prism/.clau
... [+52653 chars truncated]

### Assistant | 2026-06-03T16:27:52.260Z

I have all five mappers' findings. Producing the synthesis now.

# EXECUTION PLAN — Blackwell 96GB GPU + new-models fleet synergy (DESKTOP-N7MI1VB)

## CONFLICT RESOLUTIONS (decided, not averaged)
- **Native vs container Ollama** (SERVICE-STACK): port :11434 collides. PICK: keep native Ollama (already up, 5 models, launcher short-circuits to it). Do NOT `up -d ollama` container. Justify: native is live now; container only adds compose-managed residency we can replicate via `OLLAMA_KEEP_ALIVE=-1` on native.
- **registry.ollama.ai reachable?** LIVE-STATE said 000; SERVICE-STACK proved `qwen3` manifest returns HTTP 200 (404 on bare `/v2/` root is correct). PICK: treat registry as REACHABLE for qwen3 pulls; treat kimi as NOT-in-library (404). Verify with a live pull before relying.
- **Code constant vs host preset** (GPU-COORDINATOR vs others): PICK host-keyed preset edits over fleet-wide code constants (`fleet-reaper-sweep.mjs:251/264`). Justify: only re-tunes this host; other hosts (work_3080) must not inherit 96GB floors.
- **Default model 7b vs 14b vs 32b**: PICK `qwen2.5-coder:32b` as resident/default (installed, ~20GB, fits trivially). Keep 7b as fast-triage. Justify: 32b is the single adoption lever and needs no pull.

---

## SAFE TO AUTO-APPLY NOW (config-only, no service/network dependency)

### STEP 1 — Activate live Obsidian brain (highest-leverage, single edit, unblocks 4 surfaces)
- File `C:/Users/wompu/.claude/settings.json` env block (mirrors to H: via c-to-h-mirror).
- ADD: `"PRISM_OBSIDIAN_API_KEY": "17618a35131fb454a54c89853ccc75ee618b9eeecd26e272a7b73b771a45dfd4"` and `"PRISM_OBSIDIAN_URL": "https://127.0.0.1:27123"`.
- Source of truth for key: `H:/prism/knowledge/.obsidian/plugins/obsidian-local-rest-api/data.json`.
- Verify: `prism_session:obsidian_status` returns `isLive:true` (not `reason:"no-key"`).
- Unblocks: ObsidianRestBridge + zulu-telegram + zulu-brain-web + octopus RAG.

### STEP 2 — Widen HardwareProfile enum + Zod (HARD PREREQ for all r
... [+9802 chars truncated]
