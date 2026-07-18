---
type: "chat-session"
source: "claude-code-cli"
session_id: "fee91401-5f86-4444-8674-45a388dac493"
title: "Independent operational review of `H:\\prism\\.claude\\hooks\\docker-intel-autostart"
date: "2026-05-23"
first_ts: "2026-05-23T15:28:08.788Z"
last_ts: "2026-05-23T15:36:07.348Z"
cwd: "H:\\prism"
messages: 26
user_msgs: 11
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/fee91401-5f86-4444-8674-45a388dac493/subagents/agent-a8d50ec8dad61ea42.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# Independent operational review of `H:\prism\.claude\hooks\docker-intel-autostart

> **claude-code-cli** | 2026-05-23 | 26 msgs (11 user / 15 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/fee91401-5f86-4444-8674-45a388dac493/subagents/agent-a8d50ec8dad61ea42.jsonl`

## Transcript

### User | 2026-05-23T15:28:08.788Z

Independent operational review of `H:\prism\.claude\hooks\docker-intel-autostart.mjs` (just written) for PRISM milestone INTEL-OLLAMA-OBSIDIAN-MS0 / P13-U02.

**Read end-to-end:** `H:\prism\.claude\hooks\docker-intel-autostart.mjs`

**Reference companion files (already shipped this session):**
- `H:\prism\docker-compose.intel.yml`
- `H:\prism\docker\qdrant.Dockerfile`

**Reference sibling hook patterns:**
- `H:\prism\.claude\hooks\session-start-terminal-pin.mjs`
- `H:\prism\.claude\hooks\session-id-pin.mjs`

Reviewer A is covering hook-contract correctness + spawn semantics. YOU focus on:

1. **Fleet contention (12-chat fleet, expanded to 26):**
   - When 12 PowerShell windows open near-simultaneously, all 12 fire SessionStart and try to run this hook. The throttle prevents work after first success, but the first 12 invocations race. What happens?
     - All 12 read sentinel: all see "no recent run" → all proceed.
     - All 12 call `docker info`: 12 simultaneous probes (acceptable, docker info is cheap).
     - All 12 call `docker ps`: same.
     - All 12 detach-spawn `docker compose up`: 12 simultaneous compose-up invocations. Docker compose IS idempotent (`up -d` against running containers is a no-op or reattach), but is 12-way race actually safe?
     - All 12 write sentinel: last write wins. Not a corruption hazard, but the sentinel `lastStatus` may reflect the wrong attempt.
   - Recommended pattern: file-lock the sentinel write. Or accept the race because compose is idempotent.

2. **Sentinel reliability:**
   - The sentinel records `lastStatus: "up"` if `spawn()` succeeded — but does NOT verify the compose-up itself succeeded. Reviewer A is hammering this; you cross-check.
   - What if the compose file is malformed? `docker compose -f docker-compose.intel.yml config` would catch it pre-up. The hook doesn't validate. Is the cost of a `compose config` probe worth the latency tax (it parses but doesn't pull)?

3. **State directory creation:**
   - `state/.docke
... [+3070 chars truncated]

### Assistant | 2026-05-23T15:28:50.593Z

I'll perform an independent operational review of the docker-intel-autostart hook, focusing on the operational concerns outlined.

### Assistant | 2026-05-23T15:28:51.118Z

[tool_use: Read]

### User | 2026-05-23T15:30:07.955Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * docker-intel-autostart.mjs — Auto-start the PRISM intel-stack containers
5	 * (Qdrant + Ollama + nomic-embed-text preload) on every SessionStart.
6	 *
7	 * The intel stack is the embedder+vector backbone for PRISM's RAG +
8	 * tribal-search + memory-recall surface. When it's down, those surfaces
9	 * silently fall back to BM25-only / no-recall — degra
... [+9004 chars truncated]

### Assistant | 2026-05-23T15:30:12.457Z

Now let me check the companion files and the sibling hook patterns:

### Assistant | 2026-05-23T15:30:12.996Z

[tool_use: Read]

### Assistant | 2026-05-23T15:30:13.533Z

[tool_use: Read]

### Assistant | 2026-05-23T15:30:14.070Z

[tool_use: Read]

### User | 2026-05-23T15:31:00.437Z

[tool_result] 1	# INTEL-OLLAMA-OBSIDIAN-MS0 / P13-U02 (slot:kilo) — Qdrant config wrapper.
2	#
3	# Thin Dockerfile that wraps the upstream qdrant/qdrant:v1.17.0 image with
4	# PRISM-specific config baked in. The base docker-compose.yml uses the
5	# upstream `image:` directive directly; docker-compose.intel.yml `build:`s
6	# against this Dockerfile so the intel-stack invocation gets:
7	#
8	#   - Telemetry disabl
... [+2151 chars truncated]

### User | 2026-05-23T15:31:00.455Z

[tool_result] 1	# INTEL-OLLAMA-OBSIDIAN-MS0 / P13-U02 (slot:kilo) — Intel stack orchestration.
2	#
3	# Additive compose override. Does NOT modify the shared docker-compose.yml
4	# (same convention as docker-compose.ollama-preload.yml + ollama-bridge.yml).
5	# Brings up the embeddings/vector intel stack together as a coherent unit:
6	#
7	#   docker compose \
8	#     -f docker-compose.yml \
9	#     -f docker-comp
... [+5152 chars truncated]

### User | 2026-05-23T15:31:00.483Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * session-start-terminal-pin.mjs — Auto-claim the slot owned by THIS terminal
5	 * window on every SessionStart (startup | resume | compact | clear).
6	 *
7	 * Solves: a PowerShell window that ran chat A in slot alpha now spawns chat B
8	 * (via /clear, /compact, or fresh `claude` invocation). Without this hook, B
9	 * runs slotless until the operator m
... [+29180 chars truncated]

### Assistant | 2026-05-23T15:31:06.980Z

Now let me check the session-id-pin sibling pattern and look at settings.json to understand wiring conventions:

### Assistant | 2026-05-23T15:31:08.121Z

[tool_use: Read]

### Assistant | 2026-05-23T15:31:09.171Z

[tool_use: Bash]

### Assistant | 2026-05-23T15:31:09.630Z

[tool_use: Bash]

### User | 2026-05-23T15:31:58.032Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * session-id-pin.mjs — Pins THIS chat's session_id to every PID in the
5	 * hook process's ancestry chain, so later Bash-spawned stable-session-id
6	 * invocations can find the shared Claude-Code ancestor.
7	 *
8	 * FIRES ON: UserPromptSubmit, SessionStart
9	 *
10	 * Performance: single WMIC call returns (PID,PPID) for every process;
11	 * we then walk 
... [+5236 chars truncated]

### User | 2026-05-23T15:32:08.080Z

[tool_result] EXISTS

### User | 2026-05-23T15:33:09.138Z

[tool_result] AUDIT/
EXPANSION_CACHE/
QA-MS0/
QA-MS1/
QA-MS10/
QA-MS11/
QA-MS12/
QA-MS13/
QA-MS14/
QA-MS2/
QA-MS3/
QA-MS4/
QA-MS5/
QA-MS6/
QA-MS7/
QA-MS8/
QA-MS9/
REM-MS0/
REM-MS1/
S0-MS1/

### Assistant | 2026-05-23T15:33:13.103Z

Let me verify a few more operational details, then complete the review.

### Assistant | 2026-05-23T15:33:14.788Z

[tool_use: Bash]

### Assistant | 2026-05-23T15:33:16.876Z

[tool_use: Bash]

### Assistant | 2026-05-23T15:33:18.491Z

[tool_use: Bash]

### User | 2026-05-23T15:34:12.906Z

[tool_result] VOLUMES-DIR-EXISTS
YAML-EXISTS

### User | 2026-05-23T15:34:15.226Z

[tool_result] 7
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
6 matches in 6 files:

1112:0:"\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/session-id-pin.mjs",
303:0:"\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/session-start-auto-r...
313:0:"\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/session-start-auto-r...
323:0:"\"H:/.claude
... [+236 chars truncated]

### User | 2026-05-23T15:34:21.152Z

[tool_result] PRELOAD-EXISTS
    image: postgres:16-alpine
    container_name: prism-postgres
    container_name: prism-mcp-server
    image: prom/prometheus:latest
    container_name: prism-prometheus
    image: qdrant/qdrant:v1.17.0
    container_name: prism-qdrant
    container_name: prism-hook-broker
    image: ollama/ollama:latest
    container_name: prism-ollama
    image: grafana/grafana:latest
    conta
... [+24 chars truncated]

### Assistant | 2026-05-23T15:36:07.348Z

I have enough context. Confirmed: `prism-qdrant` + `prism-ollama` container_names match the hook's filter; `data/docker-volumes/` already exists; settings.json invokes hooks via `H:/.claude/bin/portable-node` (so the shebang is decorative); existing T1 SessionStart hooks land in chain entries near positions 67-72 / 303-323 / 1112.

Operational review verdict below.

---

# VERDICT: PASS with P1 doctrine remediation required pre-merge

The hook is operationally sound — fail-soft at every step, idempotent against fleet contention, correctly detached, and the spawn semantics are right. But it ships unwired against `feedback_ollama_docker_pipeline_dead_code_2026_05_16` doctrine which is a known PRISM trap. Fix the doctrine alignment in this same commit or land a follow-up unit IDed in the envelope before close-out.

---

## Findings

### P0 — none

### P1.A (doctrine alignment, BLOCKS close-out) — Unwired hook is dead code by current PRISM doctrine

**Location:** entire file + `state/shared/specs/...` envelope.

**Issue:** `feedback_ollama_docker_pipeline_dead_code_2026_05_16` recorded that 88% of Ollama-related hooks shipped unwired and became silent dead code. This hook acknowledges the requirement in its docstring (lines 51-55) but ships unwired anyway. **Acknowledgment is not wiring** — exactly the failure mode the feedback memo names. The envelope's exit condition #4 ("Auto-start on Docker Desktop launch") is FALSE while the hook is unwired; the docker-compose.intel.yml docstring at lines 30-34 even hedges this ("If you read this file at a commit that does NOT contain that hook yet, auto-start is a manual ... away").

**Fix (pick one before close-out):**

1. **Wire it in this commit.** Add the entry to `C:/Users/wompu/.claude/settings.json` SessionStart chain immediately after the existing `session-start-terminal-pin.mjs` entry (line ~72). The `c-to-h-mirror` hook auto-replicates to `H:/.claude/settings.json`. The entry shape:
   ```json
   { "type": "command", "co
... [+14222 chars truncated]
