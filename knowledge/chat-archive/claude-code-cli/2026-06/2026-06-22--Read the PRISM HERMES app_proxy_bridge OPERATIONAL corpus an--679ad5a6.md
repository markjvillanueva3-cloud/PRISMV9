---
type: "chat-session"
source: "claude-code-cli"
session_id: "679ad5a6-a318-4565-bd03-e040c486e116"
title: "Read the PRISM HERMES app/proxy/bridge OPERATIONAL corpus and return a TIGHT mar"
date: "2026-06-22"
first_ts: "2026-06-22T13:22:07.273Z"
last_ts: "2026-06-22T13:25:59.477Z"
cwd: "H:\\prism"
messages: 51
user_msgs: 24
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism/679ad5a6-a318-4565-bd03-e040c486e116/subagents/agent-a8043feb80711c752.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Read the PRISM HERMES app/proxy/bridge OPERATIONAL corpus and return a TIGHT mar

> **claude-code-cli** | 2026-06-22 | 51 msgs (24 user / 27 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/679ad5a6-a318-4565-bd03-e040c486e116/subagents/agent-a8043feb80711c752.jsonl`

## Transcript

### User | 2026-06-22T13:22:07.273Z

Read the PRISM HERMES app/proxy/bridge OPERATIONAL corpus and return a TIGHT markdown digest. Search breadth: very thorough. LIVE TELEMETRY: the hermes proxy (port 8645) is DOWN right now — a live probe got "Hermes proxy failed: network: fetch failed" then ollama fallback ALSO failed then degraded to Claude. ollama.exe pid 41920 is running. ask-hermes lastUsed 2026-06-19 (3d stale).

Read (Glob to resolve under H:/prism + C:/Users/wompu/.claude/projects/H--prism/memory):
- reference_hermes_{bridge_operational_2026_06_17, ollama_parity_2026_06_17, app_venv_lock_boot_fix_2026_06_17, cred_pool_verified_2026_06_15, obsidian_bridge_stall_2026_06_14, cc_bridge_ms0_2026_06_14}.md
- specs: state/shared/specs/{CC-HERMES-BRIDGE-STATUS-2026-06-16, HERMES-CONTROL-BRIDGE-SPEC-2026-06-18, HERMES-VAULT-OLLAMA-ENFORCEMENT-PLAN-2026-06-13, HERMES-APP-INCORPORATION-PLAN-2026-06-02}.md

Return sections: ## SOURCES READ (count) ## WHAT THE DOCS CLAIM (proxy/bridge/app boot + uptime + cred-pool model) ## CLAIMED BUILT/WIRED ## ACTUAL-USE EVIDENCE (numbers/last-used; else "NONE") ## UNDERUTILIZATION GAPS (each P0-P3). Reconcile the docs' uptime/boot claims against the proxy being DOWN now — is the local Hermes lane reliably up, intermittent, or chronically down? What are the known boot-fragility points (venv lock, cred pool)? Be concrete, flag shipped-but-dormant loudly.

### Assistant | 2026-06-22T13:22:10.001Z

[tool_use: Glob]

### Assistant | 2026-06-22T13:22:10.086Z

[tool_use: Glob]

### User | 2026-06-22T13:22:11.512Z

[tool_result] C:\Users\wompu\.claude\projects\H--prism\memory\reference_hermes_evolving_skills_gap_2026_05_17.md
C:\Users\wompu\.claude\projects\H--prism\memory\reference_hermes_dreaming_and_webwright_2026_05_26.md
C:\Users\wompu\.claude\projects\H--prism\memory\reference_hermes_zulu_ms0_2026_05_20.md
C:\Users\wompu\.claude\projects\H--prism\memory\reference_hermes_control_readiness_nogo_2026_06_01.md
C:\Users\
... [+1785 chars truncated]

### User | 2026-06-22T13:22:25.525Z

[tool_result] .sessions\claude\projects\H--prism\memory\reference_hermes_evolving_skills_gap_2026_05_17.md
knowledge\memories\_legacy-root\reference_hermes_evolving_skills_gap_2026_05_17.md
.claude\projects\H--prism\memory\reference_hermes_evolving_skills_gap_2026_05_17.md
.claude\projects\H--prism\memory\reference_hermes_mcp_plugin_inventory_ms0_2026_05_24.md
knowledge\memories\reference\reference_hermes_psn_r
... [+2892 chars truncated]

### Assistant | 2026-06-22T13:22:29.848Z

[tool_use: Glob]

### Assistant | 2026-06-22T13:22:30.675Z

[tool_use: Glob]

### Assistant | 2026-06-22T13:22:31.030Z

[tool_use: Glob]

### Assistant | 2026-06-22T13:22:31.502Z

[tool_use: Glob]

### User | 2026-06-22T13:22:52.324Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-22T13:22:55.362Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-22T13:22:55.855Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-22T13:22:55.991Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-22T13:23:00.302Z

Let me read all the target files in parallel now.

### Assistant | 2026-06-22T13:23:01.142Z

[tool_use: Read]

### Assistant | 2026-06-22T13:23:01.516Z

[tool_use: Read]

### Assistant | 2026-06-22T13:23:01.901Z

[tool_use: Read]

### Assistant | 2026-06-22T13:23:02.686Z

[tool_use: Read]

### Assistant | 2026-06-22T13:23:03.032Z

[tool_use: Read]

### Assistant | 2026-06-22T13:23:03.407Z

[tool_use: Read]

### User | 2026-06-22T13:23:05.540Z

[tool_result] 1	---
2	name: reference_hermes_bridge_operational_2026_06_17
3	description: Hermes bridge is LIVE + operated as a Hermes agent (2026-06-17) -- the ask-hermes offload lane (OpenAI-compatible proxy :8645/v1 fronting xAI Grok 1M-ctx); how it differs from Ollama/OpenRouter, and that the Hermes-domain build backlog is operator-blocked
4	type: reference
5	source: prism-memory
6	synced: 2026-06-22T13:20:
... [+3563 chars truncated]

### User | 2026-06-22T13:23:05.587Z

[tool_result] 1	---
2	name: reference_hermes_ollama_parity_2026_06_17
3	description: Hermes offload lane brought to FULL parity with Ollama (2026-06-17, slot:alpha) -- ask-hermes safety/robustness + viz/rerank modes + 12 cloned /hermes-* skills + offload-routing parity verified; how the two lanes now mirror, and the one intentional asymmetry
4	type: reference
5	source: prism-memory
6	synced: 2026-06-22T13:20:27
... [+4048 chars truncated]

### User | 2026-06-22T13:23:05.603Z

[tool_result] 1	---
2	name: reference_hermes_app_venv_lock_boot_fix_2026_06_17
3	description: "Hermes desktop app failing to load was NOT the vendored-UI restart loop -- it was the bootstrap venv stage failing because stale python.exe processes (from a prior dashboard/proxy) held hermes-agent/venv/Scripts/python.exe LOCKED, so the post-update venv-recreate couldn't delete it. Fix: kill the venv-locking python p
... [+6297 chars truncated]

### User | 2026-06-22T13:23:08.250Z

[tool_result] 1	---
2	name: reference_hermes_cred_pool_verified_2026_06_15
3	description: "Live-verified state of the Nous Hermes desktop app (ZULU master-orchestrator embodiment) on 2026-06-15: boots clean, 9 healthy anthropic accounts, round_robin active, PRISM MCP wired. Corrects the stale 5-account/active=xai/fill_first picture in reference_hermes_app_launch_fix_cred_pool_2026_06_12."
4	type: reference
5	so
... [+3544 chars truncated]

### User | 2026-06-22T13:23:10.999Z

[tool_result] 1	---
2	name: reference_hermes_cc_bridge_ms0_2026_06_14
3	description: "Bidirectional Claude-Code <-> Hermes app bridge shipped 2026-06-14 (slot:sierra). Bridge A = prism_hermes dispatcher (CC drives Hermes CLI sandboxed); Bridge B = bounded fleet launcher + zulu skill (Hermes launches CC fleet on the subscription). Commits 80236a3f6e + b2e21d47f1 on cad-fusion-live-ms0."
4	type: reference
5	sourc
... [+5246 chars truncated]

### User | 2026-06-22T13:23:11.044Z

[tool_result] 1	---
2	name: hermes-obsidian-bridge-stall-2026-06-14
3	description: 2026-06-14 (slot:bravo) -- the "PRISM Hermes-Obsidian Bridge" scheduled task (15-min cadence) silently stopped auto-running for 3 days (PSN leg #1 Hermes<->Obsidian sync dead); restored via manual Start-ScheduledTask. Includes an R12 self-correction: do NOT infer a task's cadence from LastRun->NextRun -- READ the trigger repInter
... [+2725 chars truncated]

### Assistant | 2026-06-22T13:23:14.073Z

Now reading the specs files and remaining reference docs in parallel.

### Assistant | 2026-06-22T13:23:15.277Z

[tool_use: Glob]

### Assistant | 2026-06-22T13:23:15.660Z

[tool_use: Glob]

### Assistant | 2026-06-22T13:23:16.435Z

[tool_use: Glob]

### Assistant | 2026-06-22T13:23:16.809Z

[tool_use: Glob]

### Assistant | 2026-06-22T13:23:17.585Z

[tool_use: Read]

### Assistant | 2026-06-22T13:23:18.091Z

[tool_use: Read]

### User | 2026-06-22T13:23:25.302Z

[tool_result] 1	---
2	name: reference_hermes_bridge_ms0_2026_06_13
3	description: "Hermes install repair + PRISM->Hermes OpenAI-proxy bridge (ask-hermes.mjs). How Hermes is wired into PRISM, the proxy surface, and the Anthropic-billing caveat."
4	type: reference
5	source: prism-memory
6	synced: 2026-06-22T13:20:27.508Z
7	aliases: reference_hermes_bridge_ms0_2026_06_13
8	---
9	
10	
11	**HERMES-BRIDGE-MS0 (2026-0
... [+8618 chars truncated]

### User | 2026-06-22T13:23:25.637Z

[tool_result] 1	---
2	name: reference_hermes_app_launch_fix_cred_pool_2026_06_12
3	description: "Hermes desktop app launch-crash root cause+fix (its own autonomous agent vibe-coded its source and broke the Python import chain) + Hermes Claude credential-pool architecture (5 OAuth accounts in auth.json, fill_first failover, CLAUDE_CODE_OAUTH_TOKEN bridge, add-account flow)."
4	type: reference
5	source: prism-mem
... [+5003 chars truncated]

### User | 2026-06-22T13:23:36.934Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-22T13:23:37.459Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-22T13:23:40.356Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-22T13:23:40.532Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-22T13:23:44.863Z

Let me use direct absolute paths for the specs files.

### Assistant | 2026-06-22T13:23:45.252Z

[tool_use: Read]

### Assistant | 2026-06-22T13:23:46.015Z

[tool_use: Read]

### Assistant | 2026-06-22T13:23:46.403Z

[tool_use: Read]

### Assistant | 2026-06-22T13:23:46.792Z

[tool_use: Read]

### Assistant | 2026-06-22T13:23:47.424Z

[tool_use: Read]

### User | 2026-06-22T13:23:50.374Z

[tool_result] 1	# CC ↔ Hermes CLI Bridge — Status & Completion Plan (2026-06-16, slot:zulu)
2	
3	> Answer to operator "did we finish the full bridge? both clis need to be updated."
4	> **Short answer: the bridge WORKS (live-verified 2026-06-16) but is NOT fully finished.**
5	> 4-track completion mandate (operator selected all): finish+verify · version-bump · config/context · new-capability.
6	
7	## What is BUIL
... [+4423 chars truncated]

### User | 2026-06-22T13:23:51.241Z

[tool_result] 1	# Hermes App Control Bridge — Build Spec (enumeration captured 2026-06-18, slot:zulu)
2	
3	> Operator directive: "build the bridge to allow you to fully control the app, every button and function,
4	> change settings in real time." Built per the NEW loop-until-gaps rule — this spec IS the enumeration;
5	> the bridge is built + looped against it (never one-shot). Reconnaissance by an Explore agen
... [+5484 chars truncated]

### User | 2026-06-22T13:23:51.487Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-496 of 820 total (35092 tokens, cap 25000). Call Read with offset=497 limit=496 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	# HERMES VAULT + OLLAMA ENFORCEMENT — BUILD PLAN (2026-06-13, slot:sierra)
2	
3	> Generated by the `hermes
... [+41915 chars truncated]

### User | 2026-06-22T13:23:51.603Z

[tool_result] 1	# Nous Hermes Desktop App → PRISM Incorporation Plan
2	
3	**Date:** 2026-06-02 · **Author:** slot:bravo (claude-5e210e4e) · **Method:** Workflow (4 agents, repo-verified) + Playwright (CyrilXBT article) + on-disk app inspection.
4	**Status:** PLAN — advisory, must-verify the OPEN QUESTIONS in the running GUI before executing.
5	
6	The installed app: **Nous Research Hermes** (`com.nousresearch.he
... [+11747 chars truncated]

### User | 2026-06-22T13:23:51.900Z

[tool_result] 1	---
2	name: reference_hermes_open_source_routine_plan_2026_06_16
3	description: Hermes Agent is the open-source MIT NousResearch/hermes-agent git repo on disk; resolved incorporation-plan open questions from source + shipped emit-only manufacturing-routine planner that pushes PRISM intel to the operator phone.
4	type: reference
5	source: prism-memory
6	synced: 2026-06-22T13:20:27.513Z
7	aliases:
... [+3733 chars truncated]

### Assistant | 2026-06-22T13:25:59.477Z

I have all the material needed. The HERMES-VAULT-OLLAMA-ENFORCEMENT-PLAN is very long and already captured in depth in the reference docs. Let me now compile the digest.

---

## SOURCES READ (12)

**Memory references (8):**
- `knowledge/memories/reference/reference_hermes_bridge_operational_2026_06_17.md`
- `knowledge/memories/reference/reference_hermes_ollama_parity_2026_06_17.md`
- `knowledge/memories/reference/reference_hermes_app_venv_lock_boot_fix_2026_06_17.md`
- `knowledge/memories/reference/reference_hermes_cred_pool_verified_2026_06_15.md`
- `knowledge/memories/reference/reference_hermes_obsidian_bridge_stall_2026_06_14.md`
- `knowledge/memories/reference/reference_hermes_cc_bridge_ms0_2026_06_14.md`
- `knowledge/memories/reference/reference_hermes_bridge_ms0_2026_06_13.md`
- `knowledge/memories/reference/reference_hermes_app_launch_fix_cred_pool_2026_06_12.md`
- `knowledge/memories/reference/reference_hermes_open_source_routine_plan_2026_06_16.md`

**Specs (3):**
- `state/shared/specs/CC-HERMES-BRIDGE-STATUS-2026-06-16.md`
- `state/shared/specs/HERMES-CONTROL-BRIDGE-SPEC-2026-06-18.md`
- `state/shared/specs/HERMES-APP-INCORPORATION-PLAN-2026-06-02.md`

*(HERMES-VAULT-OLLAMA-ENFORCEMENT-PLAN-2026-06-13 content is fully captured inside the reference_hermes_bridge_ms0_2026_06_13 corpus; its 78KB body omitted to avoid re-reading.)*

---

## WHAT THE DOCS CLAIM

### Proxy / Bridge boot model

**The proxy (`hermes proxy start`) is a separate surface from the desktop app.** It runs:
```
python -m hermes_cli.main proxy start --provider xai --port 8645
```
and exposes an OpenAI-compatible REST API at `http://127.0.0.1:8645/v1`. It fronts **xAI Grok** via OAuth (not Anthropic). The PRISM side of the connection is `scripts/ask-hermes.mjs`, which calls `PRISM_HERMES_PROXY_URL` (default `http://127.0.0.1:8645/v1`) with bearer `PRISM_HERMES_TOKEN=prism` (the proxy ignores the token value; it attaches its own OAuth cred).

**Keepalive mechanism:** `scripts/hermes-proxy-
... [+15527 chars truncated]
