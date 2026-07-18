---
type: "chat-session"
source: "claude-code-cli"
session_id: "b2bcf85e-9d6a-49ed-8071-1d2fba3122aa"
title: "Independent second-pass review of the milestone envelope at `H:\\prism\\mcp-server"
date: "2026-05-22"
first_ts: "2026-05-22T22:18:24.973Z"
last_ts: "2026-05-22T22:20:56.857Z"
cwd: "H:\\prism"
messages: 14
user_msgs: 6
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/b2bcf85e-9d6a-49ed-8071-1d2fba3122aa/subagents/agent-aaf1fcce38dd2e5b2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Independent second-pass review of the milestone envelope at `H:\prism\mcp-server

> **claude-code-cli** | 2026-05-22 | 14 msgs (6 user / 8 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b2bcf85e-9d6a-49ed-8071-1d2fba3122aa/subagents/agent-aaf1fcce38dd2e5b2.jsonl`

## Transcript

### User | 2026-05-22T22:18:24.973Z

Independent second-pass review of the milestone envelope at `H:\prism\mcp-server\data\milestones\GPU-OFFLOAD-MAXIMIZE-MS0.json`. Do NOT assume any other reviewer caught everything — look for what they're likely to miss.

**Your weighted focus** (these are what another reviewer is most likely to ignore):
1. **Hidden coupling** — the envelope proposes activating `PRISM_OLLAMA_ROUTE_AUTO=1` via a repo-scoped config file (`mcp-server/data/state/ollama-route-config.json`) that `ollama-route-pretooluse.mjs` would read. Open the hook at `H:\prism\.claude\hooks\ollama-route-pretooluse.mjs` (lines 1-202). Are there OTHER hooks or scripts that ALSO read PRISM_OLLAMA_ROUTE_AUTO from env? Run `command grep -rln "PRISM_OLLAMA_ROUTE_AUTO" H:/prism/.claude/ H:/prism/scripts/ H:/prism/mcp-server/src/` to find them. If yes, will the config-file fallback split behavior across consumers (one reads env, one reads config)?
2. **Security: config-file write surface** — `mcp-server/data/state/` is written by 20+ slot/hook processes. Any of them could write a malicious `ollama-route-config.json` to DENY all reads of state files (DoS-by-route). The R2 risk mitigation says "fail-OPEN on corrupt." But what if the corruption is VALID JSON with an absurd `minKb` (e.g., 0) that denies every read? Is the schema validated post-parse, or just shape-tolerantly read?
3. **R12 fail-loud completeness** — when the hook runs in auto mode, it can deny a Read and substitute a summary. If the summary contains LIES (Ollama hallucinated), Claude proceeds silently. Where is the fail-loud signal that an offload happened? Currently the substitute message says "📄 Ollama pre-read summary" — is that visible enough that Claude/operator notices?
4. **The "32 unknown keeps" claim** — the milestone says 32 unknown-category keeps are the offload leakage. But what if those 32 unknowns are user prompts to Claude (which the offloader shouldn't route anyway — Claude IS the response generator)? Read 5-10 of the `snippet` fiel
... [+863 chars truncated]

### Assistant | 2026-05-22T22:18:41.275Z

I'll execute the review systematically.

### Assistant | 2026-05-22T22:18:41.868Z

[tool_use: Read]

### User | 2026-05-22T22:18:49.477Z

[tool_result] 1	{
2	  "id": "GPU-OFFLOAD-MAXIMIZE-MS0",
3	  "version": "1.0.0",
4	  "title": "Activate PRISM_OLLAMA_ROUTE_AUTO + perf-tune the offload path — drive rate 6.9% → ≥30%",
5	  "brief": "Closes the gap that OLLAMA-EXPAND-MS0 left open: the passive PreToolUse:Read offload surface (ollama-route-pretooluse.mjs) ships in `suggest` mode by default and is NEVER flipped to `auto` anywhere in the repo. The ho
... [+12587 chars truncated]

### Assistant | 2026-05-22T22:18:53.414Z

[tool_use: Read]

### User | 2026-05-22T22:19:21.921Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * ollama-route-pretooluse.mjs — PreToolUse:Read — route trivial bulk reads at the local LLM.
5	 *
6	 * U-HKA04 of HOOKS-AUTOMATION-V2-MS0. Tool-level complement to the prompt-level
7	 * offloaders (ollama-auto-router.mjs / ollama-task-offloader.mjs) and to
8	 * mcp-server/src/engines/OllamaHookBridgeEngine.ts.
9	 *
10	 * WHY: a 50 KB .log / .jsonl / gen
... [+11832 chars truncated]

### Assistant | 2026-05-22T22:19:35.196Z

[tool_use: Grep]

### Assistant | 2026-05-22T22:19:35.792Z

[tool_use: Read]

### User | 2026-05-22T22:19:43.686Z

[tool_result] 1	{
2	  "schemaVersion": "2.0.0",
3	  "lastUpdated": "2026-05-22T22:08:25.981Z",
4	  "lastReset": "2026-04-28T00:11:42.432Z",
5	  "offloaded": 17,
6	  "keptOnClaude": 230,
7	  "estimatedTokensSaved": 8279,
8	  "silentSuggestions": 136,
9	  "injectedSuggestions": 15,
10	  "byCategory": {
11	    "cache-hit": 2,
12	    "summary": 15
13	  },
14	  "byHook": {
15	    "ollama-task-offloader": {
16	      
... [+2512 chars truncated]

### User | 2026-05-22T22:19:58.451Z

[tool_result] Found 1 file
.claude\hooks\__tests__\ollama-route-pretooluse.test.mjs

### Assistant | 2026-05-22T22:20:03.571Z

I have enough evidence. Sampling more events to verify the "unknown keeps" claim.

### Assistant | 2026-05-22T22:20:05.740Z

[tool_use: Bash]

### User | 2026-05-22T22:20:29.905Z

[tool_result] unknown-keeps: 32
- "finish last task before we pivot to wiki + tribal knowledge high roi generation "
- "finish last task before we pivot to wiki + tribal knowledge high roi generation "
- "finish last task before we pivot to wiki + tribal knowledge high roi generation "
- "finish last task before we pivot to wiki + tribal knowledge high roi generation "
- "finish last task before we pivot to wik
... [+637 chars truncated]

### Assistant | 2026-05-22T22:20:56.857Z

**FAIL**

**P0 — The "32 unknown keeps" claim collapses (envelope §real_state_snapshot lines 27-28 + acceptance §U1).** All 32 unknown-category keeps are the IDENTICAL user prompt `"finish last task before we pivot to wiki + tribal knowledge high roi generation "` — a conversational directive to Claude, NOT bulk data the `ollama-task-offloader` should ever route. U1 activates `PRISM_OLLAMA_ROUTE_AUTO` on the **PreToolUse:Read** hook, which is an entirely different surface (file reads, not prompts). The two leakage sources are unrelated. U1 cannot move the 32 → 0; the envelope's regression narrative (10.9% → 6.9%) conflates prompt-router leakage with read-router leakage. Acceptance criterion "Dashboard adjusted offload rate ≥20% within 48h" is therefore not causally tied to U1.

**P0 — Hidden coupling check: ZERO other consumers.** `grep -rln PRISM_OLLAMA_ROUTE_AUTO` returns only the hook itself + its test file. No split-brain risk from the env-vs-config fallback (R2 mitigation holds for THIS variable). But R4 is real: telemetry writes go to `.claude/cache/hook-telemetry.jsonl` while `ollama-offload-stats.json` is written by `ollama-task-offloader` — U5 unification is required for U1's acceptance criterion to even be **measurable**. U1 should be `blocked_by: U5`, not the inverse.

**P1 — R2 schema-validation gap.** Envelope lines 138-139 promise "schema validated: only `mode`, `minKb`, `model` accepted." A malicious slot writing `{"mode":"auto","minKb":0,"model":"…"}` is **valid shape** but routes EVERY Read ≥0 bytes through Ollama — denial-of-Claude-context attack. Deliverable must add post-parse range check (`minKb >= 1`, enum on `mode`, allowlist on `model`).

**P1 — R12 fail-loud weakness.** Substituted summary leads with `📄 Ollama pre-read summary` (line 199) — a passive emoji header buried in `additionalContext`. If qwen hallucinates a fact, Claude silently consumes it as ground truth. Add a fail-loud marker: explicit `[OLLAMA-SUBSTITUTE, NOT RAW FILE]` prefix 
... [+843 chars truncated]
