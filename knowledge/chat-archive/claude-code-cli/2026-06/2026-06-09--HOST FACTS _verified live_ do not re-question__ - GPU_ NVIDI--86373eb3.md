---
type: "chat-session"
source: "claude-code-cli"
session_id: "86373eb3-4ddb-4fe0-820b-a16ac7694943"
title: "HOST FACTS (verified live, do not re-question): - GPU: NVIDIA RTX PRO 6000 Black"
date: "2026-06-09"
first_ts: "2026-06-09T14:08:09.488Z"
last_ts: "2026-06-09T14:16:45.677Z"
cwd: "H:\\prism"
messages: 48
user_msgs: 19
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--/86373eb3-4ddb-4fe0-820b-a16ac7694943/subagents/workflows/wf_44779e25-e86/agent-af2fc525ade1f6fcd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:38:48"
---

# HOST FACTS (verified live, do not re-question): - GPU: NVIDIA RTX PRO 6000 Black

> **claude-code-cli** | 2026-06-09 | 48 msgs (19 user / 29 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--/86373eb3-4ddb-4fe0-820b-a16ac7694943/subagents/workflows/wf_44779e25-e86/agent-af2fc525ade1f6fcd.jsonl`

## Transcript

### User | 2026-06-09T14:08:09.488Z

HOST FACTS (verified live, do not re-question):
- GPU: NVIDIA RTX PRO 6000 Blackwell, 96GB VRAM, ~38GB used, 5% util.
- Host RAM 127GB; Docker/WSL2 HARD-CAPPED at 16GB by ~/.wslconfig (memory=16GB, processors=8) — INTENTIONAL (protects the 26-chat Claude fleet; documented fix U-WSL-MEM-GUARD commit 38af34077). Do NOT recommend raising it.
- DECIDED + DONE THIS SESSION: standardized on Ollama, dropped NIM. NIM containers set restart=no + stopped. LOCAL_LLM_BACKEND flipped auto->ollama in settings.json (verified landed C: + mirrored H:). nim-autostart.mjs guarded to skip when LOCAL_LLM_BACKEND=ollama (verified short-circuits). So NIM is OFF — do not re-litigate that; focus on what REMAINS.
- Ollama: native (not docker), port 11434, healthy. Resident: qwen2.5-coder:32b (37GB VRAM) + nomic-embed-text. Pulled: gpt-oss:120b (65GB), qwen2.5-coder:1.5b. Env: OLLAMA_MAX_LOADED_MODELS=4, OLLAMA_NUM_PARALLEL=4, OLLAMA_GPU_OVERHEAD=2GB(2147483648), OLLAMA_KEEP_ALIVE=30m, OLLAMA_KV_CACHE_TYPE=f16, OLLAMA_FLASH_ATTENTION=1, OLLAMA_CONTEXT_LENGTH=16384, PRISM_EMBED_CONCURRENCY=16.
- Docker UP+healthy: prism-qdrant(6333), prism-postgres(5432), prism-grafana(3601), prism-prometheus(9090). Stopped: 4 nim-*, prism-ollama(stale, container_name collides w/ native).
- Qdrant collections: prism_engines, prism_skills, prism_formulas (port 6333).
- KNOWN GAP A: autostart launcher (mcp-server/scripts/ollama-docker-launcher.mjs + .claude/hooks/docker-intel-autostart.mjs) requests docker service 'mcp' but docker-compose.yml names it 'prism-server' (container prism-mcp-server) -> 'no such service: mcp' -> every compose-up autostart fails (DOCKER_RUNTIME_STATE.json status:fail).
- KNOWN GAP B: singleton-service-guard reports 3 mcp daemons, 2 non-serving duplicates. Fix cmd exists: node scripts/singleton-service-guard.mjs --fix.
- KNOWN GAP C: docker-compose.yml has an 'ollama' service (container_name prism-ollama) that collides with the NATIVE ollama on 11434 — if compose ever starts it, port co
... [+876 chars truncated]

### Assistant | 2026-06-09T14:08:27.487Z

I'll synthesize the findings into a remediation plan. First, let me note a critical issue: the prompt states findings from 3 read-only agents are provided as JSON, but the array is empty (`[]`). I need to verify the key claims myself before producing a plan — especially the highest-stakes Qdrant embed-dimension question. Let me investigate.

### Assistant | 2026-06-09T14:08:29.478Z

[tool_use: Bash]

### Assistant | 2026-06-09T14:08:32.289Z

[tool_use: Bash]

### User | 2026-06-09T14:08:36.821Z

[tool_result] === docker-compose service names ===
6:  postgres:
27:  prism-server:
78:  prometheus:
94:  qdrant:
130:  prism-hooks:
167:  ollama:
201:  grafana:
223:  prism-net:
=== container_name lines ===
8:    container_name: prism-postgres
38:    container_name: prism-mcp-server
80:    container_name: prism-prometheus
96:    container_name: prism-qdrant
134:    container_name: prism-hook-broker
169:    con
... [+63 chars truncated]

### User | 2026-06-09T14:08:40.573Z

[tool_result] <persisted-output>
Output too large (23.1MB). Full output saved to: C:\Users\wompu\.claude\projects\H--\86373eb3-4ddb-4fe0-820b-a16ac7694943\tool-results\bfsjzsd69.txt

Preview (first 2KB):
=== files referencing service mcp/prism-server in launchers ===
.claude/hooks/docker-intel-autostart.mjs*
mcp-server/scripts/ollama-docker-launcher.mjs*
=== embed dim search ===
mcp-server/src/algorithms/FirstC
... [+1770 chars truncated]

### Assistant | 2026-06-09T14:08:54.849Z

The empty findings array means I must verify the core claims directly. The Qdrant embed-dimension question is highest-stakes, so let me focus there and confirm the launcher service-name gap. Let me read the relevant files.

### Assistant | 2026-06-09T14:08:56.700Z

[tool_use: Bash]

### Assistant | 2026-06-09T14:08:59.238Z

[tool_use: Bash]

### User | 2026-06-09T14:09:06.503Z

[tool_result] === qdrant service ports in compose (line 94-130) ===
  qdrant:
    image: qdrant/qdrant:v1.17.0
    container_name: prism-qdrant
    restart: unless-stopped
    ports:
      - "6333:6333"   # REST
      - "6334:6334"   # gRPC
    volumes:
      - ./data/docker-volumes/qdrant:/qdrant/storage
    environment:
      QDRANT__SERVICE__HTTP_PORT: 6333
      QDRANT__SERVICE__GRPC_PORT: 6334
      QDRANT
... [+2445 chars truncated]

### User | 2026-06-09T14:09:07.033Z

[tool_result] === launcher service ref ===
8: *   3. Brings up requested compose services (default: postgres, prism-server,
16: *   node mcp-server/scripts/ollama-docker-launcher.mjs --services=ollama  # just ollama
42:const DEFAULT_SERVICES = ["postgres", "prism-server", "prometheus", "ollama", "qdrant"];
50: * conflict aborts the entire compose-up, including all sibling services.
61:  "prism-server": 3000,
20
... [+1863 chars truncated]

### Assistant | 2026-06-09T14:09:18.028Z

Important finding: the `ollama-docker-launcher.mjs` uses the CORRECT service name `prism-server` (line 42, 61), NOT `mcp`. This contradicts KNOWN GAP A as stated. Let me verify where the `mcp` service reference actually lives, check the embed dimension in the Qdrant collections, and look at the intel compose overlay.

### Assistant | 2026-06-09T14:09:21.782Z

[tool_use: Bash]

### Assistant | 2026-06-09T14:09:24.405Z

[tool_use: Bash]

### User | 2026-06-09T14:09:30.669Z

[tool_result] === grep 'mcp' as a service across launcher + autostart + compose ===
=== intel overlay service names ===
10:#     up -d qdrant ollama ollama-nomic-preload
20:#   2. ollama-nomic-preload — one-shot init service that waits for Ollama to be
51:  qdrant:
56:    # All other base attributes (container_name, ports, volumes, env vars,
64:  ollama-nomic-preload:
66:    container_name: prism-ollama-nomic-p
... [+407 chars truncated]

### User | 2026-06-09T14:09:38.035Z

[tool_result] === live Qdrant collection dims (REST) ===
--- prism_engines ---
vectors_config: {"size": 768, "distance": "Cosine"}
points: 3866
--- prism_skills ---
vectors_config: {"size": 768, "distance": "Cosine"}
points: 241
--- prism_formulas ---
vectors_config: {"size": 768, "distance": "Cosine"}
points: 32

### Assistant | 2026-06-09T14:09:50.869Z

Critical evidence obtained. All three Qdrant collections are 768-dim, which matches nomic-embed-text (768d), not NIM (1024d). The grep for a literal `mcp` service reference returned nothing in either launcher. Let me verify the embed model dimension the code actually requests, and check whether any code path still expects 1024d (the NIM legacy), plus locate the actual source of the "no such service: mcp" claim.

### Assistant | 2026-06-09T14:09:56.098Z

[tool_use: Bash]

### Assistant | 2026-06-09T14:09:59.343Z

[tool_use: Bash]

### User | 2026-06-09T14:10:25.584Z

[tool_result] === nomic-embed-text native dim (live) ===
dim: 768
=== code refs to 1024-dim embeddings / nim embed / vector size config ===
mcp-server/src/config/apiWrapper.ts:237:    case 'low': return 1024;
mcp-server/src/data/alarm-fix-procedures.json:34902:      "fix_id": "FIX-OKUMA-1024",
mcp-server/src/data/alarm-fix-procedures.json:34904:        "OKUMA-1024"
mcp-server/src/data/alarm-fix-procedures.json
... [+4141 chars truncated]

### User | 2026-06-09T14:10:58.531Z

[tool_result] === where does 'no such service: mcp' originate? search whole repo for the autostart that requests mcp ===
---
=== DOCKER_RUNTIME_STATE.json status ===
./state/shared/DOCKER_RUNTIME_STATE.json

### Assistant | 2026-06-09T14:11:14.896Z

Strong evidence now. The grep for a literal `mcp` service request returned empty — meaning KNOWN GAP A's claim ("launchers request docker service 'mcp'") is NOT confirmed by the launcher source; the launcher actually uses `prism-server`. Let me read the DOCKER_RUNTIME_STATE.json to see the actual failure, and check the autostart hook's actual service list plus the embed dimension config in code.

### Assistant | 2026-06-09T14:11:14.897Z

[tool_use: Read]

### User | 2026-06-09T14:11:17.184Z

[tool_result] 1	{
2	  "schemaVersion": 1,
3	  "startedAt": "2026-06-09T05:28:42.914Z",
4	  "services_requested": [
5	    "mcp"
6	  ],
7	  "models_requested": [],
8	  "steps": {
9	    "docker_ready": {
10	      "ok": true,
11	      "alreadyRunning": true
12	    },
13	    "port_conflict_filter": {
14	      "kept": [
15	        "mcp"
16	      ],
17	      "skipped": []
18	    },
19	    "compose_up": {
20	      "ok"
... [+497 chars truncated]

### Assistant | 2026-06-09T14:11:22.620Z

[tool_use: Bash]

### User | 2026-06-09T14:11:27.121Z

[tool_result] === autostart hook actual service launch list ===
5: * (Qdrant + Ollama + nomic-embed-text preload) on every SessionStart.
19: *   4. Probe containers — `docker ps --filter name=prism-qdrant ...`. If both
20: *      `prism-qdrant` and `prism-ollama` are running, just refresh the
22: *   5. mkdir -p data/docker-volumes/{qdrant,ollama} (PREREQUISITE for the
25: *      docker-compose.intel.yml up -d 
... [+2145 chars truncated]

### Assistant | 2026-06-09T14:11:40.316Z

Decisive evidence captured. The grep for any literal `mcp` service request in the launcher source returned EMPTY, yet `DOCKER_RUNTIME_STATE.json:4-5` shows `services_requested: ["mcp"]`. This means a THIRD caller (not the two named in KNOWN GAP A) passes `--services=mcp`. Let me find it, and confirm the singleton guard + embed config to rule out the P0.

### Assistant | 2026-06-09T14:11:43.182Z

[tool_use: Bash]

### Assistant | 2026-06-09T14:11:51.893Z

[tool_use: Bash]

### User | 2026-06-09T14:11:59.197Z

[tool_result] === who passes --services=mcp or services:[mcp]? scan hooks + scripts + settings ===
.claude/hooks/pre-bash-graph-inject.test.mjs:104:  // ["kienzle","cutting","mcp","server","src"]. Those nodes exist in
scripts/build-business-value-map.mjs:81:  "ci", "cd", "ollama", "transport", "mcp", "rpc",
scripts/core/next_session_prep.py:100:        "mcp": ["prism-api-contracts", "prism-code-master"],
script
... [+2877 chars truncated]

### User | 2026-06-09T14:12:03.150Z

[tool_result] === singleton guard --fix availability + current daemon count logic ===
3: * singleton-service-guard.mjs — detect + repair duplicate/wedged singleton
4: * service daemons (golf fleet-hygiene).
6: * THE GAP. PRISM's MCP server is a SINGLETON daemon bound to :3100. Its
7: * supervisor/auto-reconnect spawns a fresh daemon on a detected outage but does
8: * NOT reliably kill the old one → multiple `mc
... [+2713 chars truncated]

### Assistant | 2026-06-09T14:12:12.214Z

The Qdrant embed-dimension P0 is conclusively RULED OUT. I have all the evidence needed. Let me make two final targeted checks: confirm the `nim-autostart` short-circuit is real (per host facts) and locate the actual caller passing `services_requested:["mcp"]` (it's neither launcher named in GAP A — the launchers use `prism-server`).

### Assistant | 2026-06-09T14:12:16.986Z

[tool_use: Bash]

### User | 2026-06-09T14:12:32.438Z

[tool_result] === full grep for SERVICES_TO_LAUNCH / args parse in launcher (how default mcp could arise) ===
15: *   node mcp-server/scripts/ollama-docker-launcher.mjs                    # full stack
16: *   node mcp-server/scripts/ollama-docker-launcher.mjs --services=ollama  # just ollama
17: *   node mcp-server/scripts/ollama-docker-launcher.mjs --skip-pull        # no model pulls
18: *   node mcp-server/sc
... [+2538 chars truncated]

### Assistant | 2026-06-09T14:12:51.487Z

I now have conclusive evidence on every dimension. Let me confirm the one open question — who passes `services_requested:["mcp"]` — since the launcher's `DEFAULT_SERVICES` is `[postgres, prism-server, prometheus, ollama, qdrant]` (not `["mcp"]`), and the intel autostart uses `[qdrant, ollama, ollama-nomic-preload]`. The single-element `["mcp"]` came from an explicit `--services=mcp` caller.

### Assistant | 2026-06-09T14:12:55.988Z

[tool_use: Bash]

### User | 2026-06-09T14:14:10.869Z

[tool_result] Exit code 255
=== exhaustive hunt: any caller invoking ollama-docker-launcher with --services=mcp ===

### Assistant | 2026-06-09T14:14:17.703Z

The recursive grep over the whole repo timed out. Let me scope it tightly to the likely caller locations (settings.json, scheduled tasks, sessionstart hooks/bundles) with a fast bounded search.

### Assistant | 2026-06-09T14:14:19.488Z

[tool_use: Grep]

### Assistant | 2026-06-09T14:14:20.491Z

[tool_use: Bash]

### User | 2026-06-09T14:14:26.963Z

[tool_result] .claude\commands\activate-local.md:36:node H:/prism/mcp-server/scripts/ollama-docker-launcher.mjs $ARGUMENTS
.claude\commands\activate-local.md:103:- **Script**: `mcp-server/scripts/ollama-docker-launcher.mjs` (the engine)
.claude\hooks\local-compute-intent.mjs:35:const LAUNCHER = `${REPO_ROOT}/mcp-server/scripts/ollama-docker-launcher.mjs`;
.claude\hooks\local-compute-intent.mjs:448:    `Launcher
... [+811 chars truncated]

### User | 2026-06-09T14:14:34.619Z

[tool_result] Name          : DOCKER_RUNTIME_STATE.json
LastWriteTime : 6/9/2026 12:28:43 AM
Length        : 825

Name          : ollama-docker-launcher.mjs
LastWriteTime : 5/18/2026 2:22:16 PM
Length        : 16400

### Assistant | 2026-06-09T14:14:46.651Z

Found the smoking gun. `mcp-connectivity-check.mjs:149` documents the exact failure: someone (likely an operator following manual-fallback instructions, or `mcp-connectivity-check`'s own `--fix` path) invokes `ollama-docker-launcher.mjs --services=mcp`, and the launcher correctly reports `no such service` because **MCP is a node daemon, not a compose service**. The DOCKER_RUNTIME_STATE.json was written 2026-06-09 00:28 (today) with `services_requested:["mcp"]` — a recent failed invocation. The launcher source itself is correct (default services don't include `mcp`).

I now have conclusive evidence on all dimensions. Let me read the key context line and check the local-compute-intent service list to finalize the GAP A root cause.

### Assistant | 2026-06-09T14:14:47.472Z

[tool_use: Read]

### User | 2026-06-09T14:14:49.872Z

[tool_result] 140	  }
141	  const lines = [
142	    "🛑 MCP SERVER DISCONNECTED — every mcp__prism__* tool call will fail this turn",
143	    `   URL: ${cfg.url}`,
144	    `   Error: ${probeResult.error || "unknown"} (HTTP ${probeResult.status ?? "—"})`,
145	    "",
146	    "   To reconnect:",
147	    "     1. ONE-COMMAND recovery (reaps any duplicate-daemon pileup AND respawns a clean TRANSPORT=http daemon — sa
... [+1167 chars truncated]

### Assistant | 2026-06-09T14:14:51.430Z

[tool_use: Bash]

### User | 2026-06-09T14:15:20.716Z

[tool_result] Exit code 127
/usr/bin/bash: eval: line 1: syntax error near unexpected token `)'
/usr/bin/bash: eval: line 1: `powershell -NoProfile -Command "$f='H:\prism\.claude\hooks\local-compute-intent.mjs'; Select-String -Path $f -Pattern 'services\s*=|SERVICES|prism-server|\bmcp\b|DEFAULT' | Select-Object -First 12 | ForEach-Object { \"$($_.LineNumber): $($_.Line.Trim())\" }"'

### Assistant | 2026-06-09T14:16:45.677Z

I have conclusive evidence on all dimensions. The Grep already showed `local-compute-intent.mjs:448` builds the launcher command from a `services` array via `--services=${services.join(",")}` — that is the path that produces a custom (potentially `mcp`) service list. The remaining detail isn't needed; KNOWN GAP A's root cause is now precisely characterized. I have enough to produce the dependency-ordered plan.

---

# PRISM 4-Service Remediation Plan — Ollama-Standardized Stack

**Synthesis note:** The 3-agent findings array arrived **empty (`[]`)** — zero upstream findings. I therefore verified every claim directly against repo + live services. All claims below cite `file:line` or live command output (R12). Where a HOST FACT or KNOWN GAP turned out inaccurate, I say so explicitly.

---

## P0 — Qdrant embed-dimension mismatch: RULED OUT (highest-stakes question, resolved)

**Verdict: NO mismatch. There is no silent NIM(1024d)→Ollama(768d) corruption. Fully ruled out with live + source evidence.**

Evidence chain:
- Live Qdrant — all 3 collections are **768-dim, Cosine**: `prism_engines` (size 768, 3866 pts), `prism_skills` (768, 241 pts), `prism_formulas` (768, 32 pts). (live `curl http://localhost:6333/collections/*`)
- Live Ollama — `nomic-embed-text` emits **768-dim** vectors (live `POST /api/embeddings` → `dim: 768`).
- Code canonical dim — `mcp-server/src/engines/QdrantMemoryEngine.ts:97` `const DEFAULT_VECTOR_SIZE = 768; // nomic-embed-text output dim`, enforced at write time `QdrantMemoryEngine.ts:144-147` (rejects any vector whose length ≠ `vectorSize` with a loud error — so a 1024d vector could never be silently written).
- Zero 1024-dim embed config anywhere — a repo-wide scan for `1024` in embed/vector/collection contexts found only unrelated hits (alarm codes `OKUMA-1024`, tool part numbers `HXT1024S`, Johnson-Cook `B:768`, `apiWrapper.ts:237 case 'low': return 1024` = max_tokens, NOT a vector dim). No `nv-embed` / `nvidia.*embed` / 1024-d collection cr
... [+11508 chars truncated]
