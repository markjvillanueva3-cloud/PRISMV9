---
type: "chat-session"
source: "claude-code-cli"
session_id: "d6db4d0e-8d82-43ba-81ed-4ecf23224ed6"
title: "Read-only settings inventory for a PRISM efficiency-tuning effort (report values"
date: "2026-06-16"
first_ts: "2026-06-16T20:30:23.037Z"
last_ts: "2026-06-16T20:36:53.281Z"
cwd: "H:\\prism"
messages: 65
user_msgs: 29
assistant_msgs: 36
raw_file: "H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-a2b8c4374220d7cc0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# Read-only settings inventory for a PRISM efficiency-tuning effort (report values

> **claude-code-cli** | 2026-06-16 | 65 msgs (29 user / 36 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-a2b8c4374220d7cc0.jsonl`

## Transcript

### User | 2026-06-16T20:30:23.037Z

Read-only settings inventory for a PRISM efficiency-tuning effort (report values, do NOT edit anything). PRISM Blackwell box: RTX PRO 6000 96GB VRAM, 9950X3D 32 threads, 127GB physical RAM, 227GB commit limit (RAM+pagefile), NVMe. First read H:/prism/state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md (it documents the live Ollama roster and says hardware specs are NOT drifted — do not re-recommend what it already says is done).

For EACH domain give a markdown table: SETTING | CURRENT-VALUE | RECOMMENDED-FOR-BLACKWELL | RATIONALE | FILE:LINE-or-source | SAFE-AUTO-or-NEEDS-OPERATOR. If a config file does not exist, SAY SO explicitly (never invent values). Use RTK-prefix on bash and SAFE read-only commands only.

1. OLLAMA env knobs: grep the repo + both settings.json (H:/.claude/settings.json + H:/prism/.claude/settings.json) env blocks + any .env + scripts/ollama-*.mjs + the scheduled task/service launching ollama, for: OLLAMA_NUM_PARALLEL, OLLAMA_MAX_LOADED_MODELS, OLLAMA_KEEP_ALIVE, OLLAMA_FLASH_ATTENTION, OLLAMA_GPU_OVERHEAD, OLLAMA_NUM_GPU, OLLAMA_SCHED_SPREAD, OLLAMA_HOST. 96GB VRAM holds gpt-oss:120b (65GB) resident + smaller models concurrently. Report each set-or-default + the Blackwell-optimal value + whether changing it is SAFE-AUTO (a settings env line) or NEEDS-OPERATOR (ollama service/env restart). Also probe live if reachable: `command node -e "fetch('http://127.0.0.1:11434/api/ps').then(r=>r.json()).then(j=>console.log(JSON.stringify(j))).catch(e=>console.log('ollama down:',e.code))"`.
2. OBSIDIAN: vault H:/prism/knowledge/. Find any .obsidian/ config (app.json etc). Report vault markdown file count (Glob count) + any indexing/cache settings. Note honestly if there is little to tune (it is a markdown vault).
3. HERMES app + CLI: there is a Hermes proxy on :8645 (scripts/ask-hermes.mjs), a Hermes app at C:/Users/wompu/AppData/Local/hermes/, and a Hermes CLI. Find their config/env/launch + concurrency/model/timeout knobs. grep "8645", hermes config, 
... [+1010 chars truncated]

### Assistant | 2026-06-16T20:30:30.482Z

I'll conduct a systematic read-only inventory. Let me run all the parallel reads first.

### Assistant | 2026-06-16T20:30:30.859Z

[tool_use: Read]

### Assistant | 2026-06-16T20:30:32.032Z

[tool_use: Bash]

### Assistant | 2026-06-16T20:30:32.422Z

[tool_use: Bash]

### User | 2026-06-16T20:30:32.665Z

[tool_result] 1	# Canonical Host Facts + Ollama Routing — DESKTOP-N7MI1VB (2026-06-09, slot:papa)
2	
3	> **Single source of truth** for this host's hardware + local-LLM roster. Verified LIVE 2026-06-09 (`os.cpus/totalmem/freemem`, `nvidia-smi`, `ollama /api/tags`). Every doc/skill/CLAUDE.md that cites specs or Ollama models should reference THIS file, not re-state numbers (that is how the drift this campaign ta
... [+4731 chars truncated]

### Assistant | 2026-06-16T20:30:33.051Z

[tool_use: Bash]

### User | 2026-06-16T20:30:44.619Z

[tool_result] {
  "models": [
    {
      "name": "nomic-embed-text:latest",
      "model": "nomic-embed-text:latest",
      "size": 323150151,
      "digest": "0a109f422b47e3a30ba2b10eca18548e944e8a23073ee3f3e947efcf3c45e59f",
      "details": {
        "parent_model": "",
        "format": "gguf",
        "family": "nomic-bert",
        "families": [
          "nomic-bert"
        ],
        "parameter_size":
... [+729 chars truncated]

### User | 2026-06-16T20:30:53.770Z

[tool_result] AllocatedBaseSize : 45625
CurrentUsage      : 1176
PeakUsage         : 16882

### User | 2026-06-16T20:31:02.068Z

[tool_result] Name        : c:\pagefile.sys
InitialSize : 16384
MaximumSize : 65536

Name        : h:\pagefile.sys
InitialSize : 131072
MaximumSize : 131072

### Assistant | 2026-06-16T20:31:05.126Z

Now let me gather the remaining data in parallel.

### Assistant | 2026-06-16T20:31:06.875Z

[tool_use: Bash]

### Assistant | 2026-06-16T20:31:07.861Z

[tool_use: Bash]

### Assistant | 2026-06-16T20:31:07.891Z

[tool_use: Glob]

### Assistant | 2026-06-16T20:31:08.269Z

[tool_use: Glob]

### User | 2026-06-16T20:31:22.269Z

[tool_result] totalGB 136 freeGB 89

### User | 2026-06-16T20:31:33.737Z

[tool_result] Exit code 1
Invalid Parameters -- try "/?" for help

### User | 2026-06-16T20:31:39.568Z

[tool_result] scripts\lib\ollama-bridge-telemetry.mjs
scripts\lib\ollama-bridge-telemetry.test.mjs
scripts\ollama-hook-fire-audit.test.mjs
scripts\ollama-hook-fire-audit.mjs
scripts\__tests__\ollama-prism-bridge.test.mjs
scripts\__tests__\ollama-bridge-compose.test.mjs
scripts\ollama-l3-agent.mjs
scripts\ollama-l3-agent.test.mjs
scripts\lib\ollama-state-check.mjs
scripts\__tests__\ollama-state-check.test.mjs
sc
... [+1376 chars truncated]

### User | 2026-06-16T20:32:00.307Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-16T20:32:04.809Z

Good — Ollama is live with 2 models resident. Now gather the remaining config files in parallel.

### Assistant | 2026-06-16T20:32:06.944Z

[tool_use: Grep]

### Assistant | 2026-06-16T20:32:07.754Z

[tool_use: Grep]

### Assistant | 2026-06-16T20:32:08.523Z

[tool_use: Read]

### Assistant | 2026-06-16T20:32:08.648Z

[tool_use: Read]

### User | 2026-06-16T20:32:30.032Z

[tool_result] .claude\helpers\fleet-reaper-host-presets.test.mjs:53:  assert.equal(BUILTIN_PRESETS.blackwell.PRISM_FLEET_REAPER_OLLAMA_KEEP_ALIVE, "60m");
.claude\helpers\fleet-reaper-host-presets.mjs:41:    PRISM_FLEET_REAPER_OLLAMA_KEEP_ALIVE: "10m",
.claude\helpers\fleet-reaper-host-presets.mjs:53:    PRISM_FLEET_REAPER_OLLAMA_KEEP_ALIVE: "60m",
.claude\helpers\fleet-reaper-host-presets.mjs:65:    PRISM_FLEE
... [+7279 chars truncated]

### User | 2026-06-16T20:32:30.345Z

[tool_result] H:\.claude\plans\brainstorm-and-generate-a-piped-sphinx.md:154:      - OLLAMA_NUM_PARALLEL=2
H:\.claude\plans\brainstorm-and-generate-a-piped-sphinx.md:155:      - OLLAMA_MAX_LOADED_MODELS=2
H:\.claude\plans\steady-kindling-tide.md:144:- Knobs: `PRISM_FLEET_REAPER_OLLAMA_PREWARM_MODEL` (default `qwen2.5-coder:7b`), `PRISM_FLEET_REAPER_OLLAMA_KEEP_ALIVE` (default `10m`), `PRISM_FLEET_REAPER_HINT_TT
... [+12078 chars truncated]

### User | 2026-06-16T20:32:30.603Z

[tool_result] 1	#!/usr/bin/env node
2	// ollama-embed-keepalive.mjs -- keep nomic-embed-text RESIDENT so the Obsidian
3	// memory-recall dense arm never goes dark on a cold-evicted embed model.
4	//
5	// THE PROBLEM (observed live 2026-06-10): the recall embed in
6	// scripts/lib/memory-index-search-lib.mjs has a hard ~2.5s cap (it runs inside the
7	// 5s UserPromptSubmit budget), but a COLD nomic-embed-text lo
... [+2641 chars truncated]

### User | 2026-06-16T20:32:30.948Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ollama-offload-dashboard.mjs — print last-24h Ollama offload stats
4	 *
5	 * INTEL-OLLAMA-OBSIDIAN-MS0/P0-U03.
6	 *
7	 * Reads mcp-server/data/state/ollama-offload-stats.json (schemaVersion 2.0.0)
8	 * and prints:
9	 *   1. Top-line totals (since last reset)
10	 *   2. Per-hook fire counts (which hooks are doing the routing)
11	 *   3. Last 24h activity from the ro
... [+2288 chars truncated]

### Assistant | 2026-06-16T20:32:36.603Z

Now grab the live Ollama service env, the settings.json env blocks, and the soft-config-tweaks script:

### Assistant | 2026-06-16T20:32:39.829Z

[tool_use: Bash]

### Assistant | 2026-06-16T20:32:40.979Z

[tool_use: Bash]

### Assistant | 2026-06-16T20:32:41.775Z

[tool_use: Glob]

### Assistant | 2026-06-16T20:32:41.863Z

[tool_use: Glob]

### User | 2026-06-16T20:32:54.588Z

[tool_result] Exit code 1
At line:1 char:314
+ ... 'OLLAMA*' } | Sort-Object Key | ForEach-Object { '{0}={1}' -f extglob ...
+                                                                  ~
You must provide a value expression following the '-f' operator.
At line:1 char:315
+ ... | Sort-Object Key | ForEach-Object { '{0}={1}' -f extglob.Key,extglob ...
+                                                 
... [+426 chars truncated]

### User | 2026-06-16T20:32:57.654Z

[tool_result] Exit code 1
At line:1 char:179
+ ...  } | Sort-Object Key | ForEach-Object { 'MACHINE: {0}={1}' -f extglob ...
+                                                                  ~
You must provide a value expression following the '-f' operator.
At line:1 char:180
+ ... ject Key | ForEach-Object { 'MACHINE: {0}={1}' -f extglob.Key,extglob ...
+                                                 
... [+1100 chars truncated]

### User | 2026-06-16T20:32:58.935Z

[tool_result] scripts\system-health\04-pre-launch-check.ps1
scripts\system-health\01-pagefile-relocate.ps1
scripts\system-health\04-prism-mcp-orphan-monitor.ps1
scripts\system-health\20-coord-db-vacuum.ps1
scripts\system-health\21-memory-garden.ps1
scripts\system-health\27-dispatcher-capacity.ps1
scripts\system-health\22-skill-utilization.ps1
scripts\system-health\23-hook-orphan-scan.ps1
scripts\system-health\2
... [+887 chars truncated]

### User | 2026-06-16T20:33:00.656Z

[tool_result] knowledge\.obsidian\plugins\obsidian-local-rest-api\main.js
knowledge\.obsidian\plugins\obsidian-local-rest-api\manifest.json
knowledge\.obsidian\plugins\obsidian-local-rest-api\styles.css
knowledge\.obsidian\plugins\obsidian-local-rest-api\data.json
knowledge\.obsidian\core-plugins.json
knowledge\.obsidian\community-plugins.json
knowledge\.obsidian\appearance.json
knowledge\.obsidian\graph.json
k
... [+62 chars truncated]

### Assistant | 2026-06-16T20:33:03.750Z

The PowerShell `-f` operator clashed with bash's extglob `$_`. Use pwsh here-string syntax to avoid it.

### Assistant | 2026-06-16T20:33:06.130Z

[tool_use: PowerShell]

### Assistant | 2026-06-16T20:33:06.573Z

[tool_use: Read]

### Assistant | 2026-06-16T20:33:07.077Z

[tool_use: Read]

### Assistant | 2026-06-16T20:33:07.314Z

[tool_use: Read]

### User | 2026-06-16T20:33:07.784Z

[tool_result] USER: OLLAMA_CONTEXT_LENGTH=131072
USER: OLLAMA_FLASH_ATTENTION=1
USER: OLLAMA_GPU_LAYERS=-1
USER: OLLAMA_GPU_OVERHEAD=2147483648
USER: OLLAMA_HOME=H:\Tools\ollama
USER: OLLAMA_KEEP_ALIVE=10m
USER: OLLAMA_KV_CACHE_TYPE=f16
USER: OLLAMA_MAX_LOADED_MODELS=4
USER: OLLAMA_MODELS=H:\Tools\ollama\models
USER: OLLAMA_NUM_BATCH=512
USER: OLLAMA_NUM_GPU=1
USER: OLLAMA_NUM_PARALLEL=8
USER: OLLAM
... [+56 chars truncated]

### User | 2026-06-16T20:33:13.038Z

[tool_result] 1	# =====================================================================
2	# PRISM System Health 05 - Soft config tweaks (no admin, no reboot)
3	# =====================================================================
4	# Tunes ollama + tsserver behaviour to the host's ACTUAL GPU class so it
5	# lowers idle commit pressure WITHOUT downgrading a large-VRAM card to
6	# 16GB-era caps. (Before 2026-06
... [+6496 chars truncated]

### User | 2026-06-16T20:33:13.151Z

[tool_result] 1	{
2	  "alwaysUpdateLinks": true,
3	  "newLinkFormat": "relative",
4	  "useMarkdownLinks": false,
5	  "showFrontmatter": true
6	}

### User | 2026-06-16T20:33:13.161Z

[tool_result] 1	[
2	  "obsidian-local-rest-api"
3	]

### Assistant | 2026-06-16T20:33:17.460Z

Now get the Hermes config and settings.json env blocks, plus the Obsidian vault file count:

### Assistant | 2026-06-16T20:33:20.133Z

[tool_use: Bash]

### Assistant | 2026-06-16T20:33:21.708Z

[tool_use: PowerShell]

### Assistant | 2026-06-16T20:33:22.887Z

[tool_use: PowerShell]

### Assistant | 2026-06-16T20:33:23.496Z

[tool_use: PowerShell]

### User | 2026-06-16T20:33:25.072Z

[tool_result]  *                      http://127.0.0.1:8645/v1)
 *   PRISM_HERMES_PROXY_URL   proxy base (default http://127.0.0.1:8645/v1)
const DEFAULT_URL = process.env.PRISM_HERMES_PROXY_URL || "http://127.0.0.1:8645/v1";
---
1 #!/usr/bin/env node
2 /**
3  * ask-hermes.mjs -- PRISM bridge to the local Hermes OpenAI-compatible proxy
4  * (HERMES-BRIDGE-MS0/U-ASK-HERMES).
5  *
6  * Hermes (Nous) exposes `herm
... [+3986 chars truncated]

### User | 2026-06-16T20:34:23.350Z

[tool_result] <persisted-output>
Output too large (24.4MB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\d6db4d0e-8d82-43ba-81ed-4ecf23224ed6\tool-results\b3duta370.txt

Preview (first 2KB):
[32;1mFullName[0m
[32;1m--------                                                                                                                                                                         
... [+1730 chars truncated]

### User | 2026-06-16T20:34:29.999Z

[tool_result] 68890

### User | 2026-06-16T20:34:49.702Z

[tool_result] Power Scheme GUID: 381b4222-f694-41f0-9685-ff5bb260df2e  (Balanced)

### Assistant | 2026-06-16T20:34:54.708Z

Read the Hermes config.yaml and the hermes-zulu engine settings, plus check what the live Ollama server actually sees for its env:

### Assistant | 2026-06-16T20:34:55.140Z

[tool_use: Read]

### Assistant | 2026-06-16T20:34:56.726Z

[tool_use: Grep]

### Assistant | 2026-06-16T20:35:02.632Z

[tool_use: PowerShell]

### Assistant | 2026-06-16T20:35:02.634Z

[tool_use: Bash]

### User | 2026-06-16T20:35:03.315Z

[tool_result] 1	_config_version: 28
2	agent:
3	  api_max_retries: 3
4	  clarify_timeout: 600
5	  disabled_toolsets: []
6	  environment_hint: ''
7	  environment_probe: true
8	  gateway_auto_continue_freshness: 3600
9	  gateway_notify_interval: 180
10	  gateway_timeout: 1800
11	  gateway_timeout_warning: 900
12	  image_input_mode: auto
13	  max_turns: 200
14	  personalities:
15	    catgirl: "You are Neko-chan, an
... [+16629 chars truncated]

### User | 2026-06-16T20:35:03.721Z

[tool_result] No matches found

### User | 2026-06-16T20:35:04.707Z

[tool_result] Exit code 1
Ollama PID: 137096
CmdLine: C:\Users\wompu\AppData\Local\Programs\Ollama\ollama.exe serve

### User | 2026-06-16T20:35:07.390Z

[tool_result] {"version":"0.30.8"}

### Assistant | 2026-06-16T20:36:53.281Z

I have all the data needed. Now I can produce the complete inventory.

---

## PRISM Blackwell Efficiency-Tuning Settings Inventory

### 1. OLLAMA Environment Knobs

**Live server state (verified):** Ollama v0.30.8, PID 137096, launched as `ollama.exe serve` (no service, user process). Two models currently resident: `nomic-embed-text` (308 MB VRAM) and `qwen2.5-coder:32b` (88.4 GB VRAM — **note: this exceeds the 96 GB VRAM by itself at Q4_K_M**; expires ~30 min from probe).

All values sourced from User-scope registry (PowerShell `[System.Environment]::GetEnvironmentVariables('User')`). No Machine-scope OLLAMA vars set. No `.env` file in repo root. The `05-soft-config-tweaks.ps1` Blackwell tier targets: `KEEP_ALIVE=30m`, `NUM_PARALLEL=4`, `MAX_LOADED=4` — but the live User env diverges from that on three knobs.

| SETTING | CURRENT VALUE (User env) | BLACKWELL-OPTIMAL | RATIONALE | SOURCE | SAFE-AUTO or NEEDS-OPERATOR |
|---|---|---|---|---|---|
| `OLLAMA_NUM_PARALLEL` | `8` | `4` | At Q4_K_M qwen2.5-coder:32b = 88 GB, 8 KV slots at f16 would exceed 96 GB entirely. `05-soft-config-tweaks.ps1` line 43 targets 4 for ≥48 GB VRAM. Memory ref `reference_blackwell_ollama_utilization_optimize_2026_06_03.md` line 22 confirmed 4→2 halved KV bloat on 32b. 4 is the validated sweet spot. | User env (live); script `scripts/system-health/05-soft-config-tweaks.ps1:43` | NEEDS-OPERATOR (Ollama restart to take effect) |
| `OLLAMA_MAX_LOADED_MODELS` | `4` | `4–6` | Current 4 matches `05-soft-config-tweaks.ps1:43`. Memory `reference_blackwell_ollama_utilization_optimize_2026_06_03.md` line 23 recommended 6; but `reference_ollama_keepalive_commit_leak_2026_06_08.md` line 23 rolled back to 4 after commit-pressure crash cascade. 4 is safe; 6 is valid only after pagefile expansion (see §4). | User env (live); script line 43 | NEEDS-OPERATOR if changed |
| `OLLAMA_KEEP_ALIVE` | `10m` | `30m` | `05-soft-config-tweaks.ps1:43` sets `30m` for Blackwell tier. Memory `reference_ollama_keepalive_
... [+13570 chars truncated]
