---
type: "chat-session"
source: "claude-code-cli"
session_id: "d545743f-8fad-47d7-a7de-1716a4be5839"
title: "You are finding every DOCTRINE/RULE (not hook) that instructs a chat to STOP wor"
date: "2026-06-11"
first_ts: "2026-06-11T13:43:47.717Z"
last_ts: "2026-06-11T13:48:12.505Z"
cwd: "H:\\prism-slot-hotel"
messages: 31
user_msgs: 14
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d545743f-8fad-47d7-a7de-1716a4be5839/subagents/workflows/wf_9f76de57-9ef/agent-a4dd080899f0bc883.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:52"
---

# You are finding every DOCTRINE/RULE (not hook) that instructs a chat to STOP wor

> **claude-code-cli** | 2026-06-11 | 31 msgs (14 user / 17 assistant) | cwd: H:\prism-slot-hotel
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d545743f-8fad-47d7-a7de-1716a4be5839/subagents/workflows/wf_9f76de57-9ef/agent-a4dd080899f0bc883.jsonl`

## Transcript

### User | 2026-06-11T13:43:47.717Z

You are finding every DOCTRINE/RULE (not hook) that instructs a chat to STOP working due to context/budget size. These are what made a chat repeatedly "park for /compact" instead of continuing autonomously.

Grep + read these files for budget/context STOP-pressure language:
- H:/prism/CLAUDE.md (root project doctrine)
- C:/Users/wompu/.claude/CLAUDE.md (global playbook -- the highest fleet-wide reach; loaded into EVERY session)
- H:/prism/mcp-server/src/engines/CLAUDE.md (engines baseline that cascades to all 34 galaxies)
- the galaxy CLAUDE.md files under H:/prism/mcp-server/src/engines/*/CLAUDE.md (token-budget posture sections)
- loop-state.mjs + any /loop or checkin skill that encodes "stop at YELLOW/RED" or "budget is a stop condition"

Search terms: "YELLOW", "RED", "budget is a stop condition", "don't start new units", "checkpoint at", "/precompact + commit", ">65%", "approaching budget", "token budget", "spiral", "stop condition".

For each hit report file:line + the exact current wording. Then propose the AMENDED wording that flips the posture from "stop/park when context grows" to "CONTINUE autonomously -- rely on auto-precompaction + compaction-survival + continuous re-injection; only /compact is a SEAMLESS context reset, never a reason to stop delivering units" -- WHILE keeping the genuine safety/quality gates intact.

Output structured markdown: a table of (file:line | current | proposed). End with the single highest-leverage doctrine edit for fleet-wide reach.

### Assistant | 2026-06-11T13:43:53.681Z

I'll search systematically across all the specified files for budget/context STOP-pressure language.

### Assistant | 2026-06-11T13:43:55.230Z

[tool_use: Bash]

### Assistant | 2026-06-11T13:43:56.356Z

[tool_use: Bash]

### User | 2026-06-11T13:44:06.625Z

[tool_result] 20:| `state/shared/PRISM_SHARED_INDEX_SURFACES.md` | Shared indexes for cross-agent search-first discipline. |
89:# WRITE (e.g. at /handoff or /compact):
99:Canonical storage: `state/shared/handoffs/HANDOFF-<instance>-<topic>.md` — one per chat, **topic suffix mandatory**. Precompact hook (`helpers/precompact-handoff.mjs`) writes automatically on `/compact`. `/startup` reads this chat's handoff vi
... [+26678 chars truncated]

### User | 2026-06-11T13:44:06.726Z

[tool_result] 56:- **R6 — Token budgets are not advisory.** Soft ceiling ~4k tokens/task, ~30k/session. Approaching budget → summarize state and start fresh; never push through a spiral. Surfacing the breach beats silently overrunning. → PRISM: `/compact` every 2-3 units, `/precompact` before context limit, `context-budget` skill.
111:**Dispatchers:** `prism_calc` (physics) · `prism_cam` (toolpath) · `prism_ai`
... [+675 chars truncated]

### Assistant | 2026-06-11T13:44:10.870Z

Now let me search the remaining files systematically.

### Assistant | 2026-06-11T13:44:14.790Z

[tool_use: Bash]

### Assistant | 2026-06-11T13:44:16.876Z

[tool_use: Bash]

### User | 2026-06-11T13:44:21.020Z

[tool_result] 44:- 🟡 YELLOW (25-65%) — batch tool calls, prefer local lib over agent, avoid speculative reads
45:- 🔴 RED (>65%) — `/precompact` + commit + handoff; don't start new units
92:- **Commit format:** `[SCOPE]/U-ID: title` — pre-commit hook validates. Multi-line commit messages via HEREDOC.

### User | 2026-06-11T13:44:22.373Z

[tool_result] (Bash completed with no output)

### User | 2026-06-11T13:45:23.096Z

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
   The user requested a systematic audit of every DOCTRINE/RULE (explicitly not hooks) that instructs a chat to STOP working due to context/budget size — the root cause of chats "parking for /compact" instead of continuing autonomously.

   Specific instructions:
   - Grep + read these files for budget/context STOP-pressure language:
     - `H:/prism/CLAUDE.md` (root project doctrine)
     - `C:/Users/wompu/.claude/CLAUDE.md` (global playbook — highest fleet-wide reach; loaded into EVERY session)
     - `H:/prism/mcp-server/src/engines/CLAUDE.md` (engines baseline, cascades to all 34 galaxies)
     - Galaxy CLAUDE.md files under `H:/prism/mcp-server/src/engines/*/CLAUDE.md` (token-budget posture sections)
     - `loop-state.mjs` + any `/loop` or checkin skill encoding "stop at YELLOW/RED" or "budget is a stop condition"
   - Search terms: "YELLOW", "RED", "budget is a stop condition", "don't start new units", "checkpoint at", "/precompact + commit", ">65%", "approaching budget", "token budget", "spiral", "stop condition"
   - For each hit: report `file:line` + exact current wording
   - Propose amended wording that flips posture from "stop/park when context grows" to "CONTINUE autonomously — rely on auto-precompaction + compaction-survival + continuous re-injection; only /compact is a SEAMLESS context reset, never a reason to stop delivering units" — while keeping genuine safety/quality gates intact
   - Output a structured markdown table: `(file:line | current | proposed)`
   - End with the single highest-leverage doctrine edit for fleet-wide reach

2. Key Technical Concepts:
   - PRISM doctrine files (CLAUDE.md hierarchy: global user > root project > slot worktree > engines baseline > galaxy-specific)
   - R6 rule ("Token budgets are not advisory") — the primary stop-pressur
... [+7283 chars truncated]

### Assistant | 2026-06-11T13:45:29.798Z

Now let me get the remaining search targets in parallel.

### Assistant | 2026-06-11T13:45:35.688Z

[tool_use: Bash]

### Assistant | 2026-06-11T13:45:37.187Z

[tool_use: Bash]

### User | 2026-06-11T13:45:42.044Z

[tool_result] H:/prism/mcp-server/src/engines/cad/CLAUDE.md:91:5. **GPU embedder migration is DEFERRED** (`reference_u_rag_6_gpu_embedder_deferred_2026_05_22`) — the 768-d CPU ONNX → `nv-embedqa-e5-v5` 1024-d move is out of current scope. CAD-RAG embeddings stay 768-d until that unit lands; do not assume 1024-d feature vectors.
H:/prism/mcp-server/src/engines/hermes-zulu/CLAUDE.md:50:- **R10** — Cross-slot orch
... [+91 chars truncated]

### User | 2026-06-11T13:45:44.992Z

[tool_result] 287:  // Roll: archive the finished loop's iter count, then start fresh on nextTask.

### Assistant | 2026-06-11T13:45:48.174Z

Good. Let me get the loop-state.mjs stop-condition block and the loop/checkin skill files.

### Assistant | 2026-06-11T13:45:50.626Z

[tool_use: Bash]

### Assistant | 2026-06-11T13:45:52.072Z

[tool_use: Bash]

### User | 2026-06-11T13:45:55.788Z

[tool_result] 21: * Karpathy R10: checkpoint after every significant step.
131:// any source) is the ONLY honest signal to stop the loop (R12 — don't fabricate
209: * "pick-unit-fleet" (fallback). Empty task on both-empty (the honest stop).
239:// end the current loop record and start a fresh one on the resolved task, so the
249:// cap the loop must hand back for a human checkpoint. Knob: PRISM_LOOP_MAX_ROLLS.

... [+273 chars truncated]

### User | 2026-06-11T13:45:57.406Z

[tool_result] H:/prism/.claude/commands/checkin-hotel.md
H:/prism/.claude/commands/checkin.md

### Assistant | 2026-06-11T13:46:01.043Z

Good. Now let me read the key sections of the skills and the exact engines/CLAUDE.md stop-pressure block.

### Assistant | 2026-06-11T13:46:01.573Z

[tool_use: Read]

### User | 2026-06-11T13:46:02.419Z

[tool_result] 38	| Skip route-nudges that don't apply (file-tree contention, shell-only ops) | nudge overhead |
39	| Glob timeout >5s = noise-filter the path per `state/shared/specs/PRISM-NOISE-PATHS-2026-05-26.md` | full re-scan |
40	| Per-galaxy CLAUDE.md auto-load | 5-8K tokens/SessionStart × 26 slots when root compresses |
41	
42	**Token-budget posture per zone:**
43	- 🟢 GREEN (<25%) — exploratory subagents
... [+933 chars truncated]

### Assistant | 2026-06-11T13:46:03.025Z

[tool_use: Bash]

### Assistant | 2026-06-11T13:46:03.888Z

[tool_use: Bash]

### User | 2026-06-11T13:46:07.186Z

[tool_result] 21:  - "/precompact"
25:  - "prism_context:chat_post"
37:stop after §Report.
60:durable `slot:` frontmatter field so it survives a full terminal restart (fresh

### User | 2026-06-11T13:46:08.145Z

[tool_result] 19:> hotel deterministically bound to claude-<id>` line is in context, use THAT
40:If the claim result carries `previousOwner`, surface it in the §Report — the evicted chat's id, topic, and last-heartbeat age are all useful context.
47:- **Dev pipeline phase (steps 8-14)** — fires only when args contain a task directive (`/loop`, `/goal`, `/pick-unit`, `unit`, `task`, `build`, or a verbatim filepa
... [+331 chars truncated]

### User | 2026-06-11T13:47:43.066Z

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
   Find every DOCTRINE/RULE (explicitly not hooks) that instructs a chat to STOP working due to context/budget size — the root cause of chats "parking for /compact" instead of continuing autonomously.

   Full instructions:
   - Grep + read these files for budget/context STOP-pressure language:
     - `C:/Users/wompu/.claude/CLAUDE.md` (global playbook — HIGHEST fleet-wide reach, loads into EVERY session)
     - `H:/prism/CLAUDE.md` (root project doctrine)
     - `H:/prism/mcp-server/src/engines/CLAUDE.md` (engines baseline, cascades to all 34 galaxies)
     - Galaxy CLAUDE.md files under `H:/prism/mcp-server/src/engines/*/CLAUDE.md`
     - `loop-state.mjs` (`.claude/helpers/loop-state.mjs`)
     - `/loop` and `/checkin` skill files
   - Search terms: YELLOW, RED, budget is a stop condition, don't start new units, checkpoint at, /precompact + commit, >65%, approaching budget, token budget, spiral, stop condition
   - For each hit: report `file:line` + exact current wording
   - Propose amended wording that flips posture from "stop/park when context grows" to "CONTINUE autonomously — rely on auto-precompaction + compaction-survival + continuous re-injection; only /compact is a SEAMLESS context reset, never a reason to stop delivering units" — while keeping genuine safety/quality gates intact
   - Output structured markdown table: `(file:line | current | proposed)`
   - End with the single highest-leverage doctrine edit for fleet-wide reach

2. Key Technical Concepts:
   - PRISM doctrine file hierarchy: global user CLAUDE.md > root project CLAUDE.md > slot worktree CLAUDE.md > engines baseline CLAUDE.md > galaxy-specific CLAUDE.md
   - R6 rule ("Token budgets are not advisory") — primary stop-pressure doctrine, lives in `C:/Users/wompu/.claude/CLAUDE.md` and cascades fleet-wide

... [+9355 chars truncated]

### Assistant | 2026-06-11T13:48:12.505Z

All data is in hand. The checkin skills have no additional budget-stop language beyond what's already catalogued. Producing the full amendment table now.

---

## Amendment Table: Budget/Context STOP-Pressure Doctrine

| # | file:line | Current wording | Proposed wording |
|---|-----------|-----------------|------------------|
| 1 | `C:/Users/wompu/.claude/CLAUDE.md:56` | `**R6 — Token budgets are not advisory.** Soft ceiling ~4k tokens/task, ~30k/session. Approaching budget → summarize state and start fresh; never push through a spiral. Surfacing the breach beats silently overrunning. → PRISM: /compact every 2-3 units, /precompact before context limit, context-budget skill.` | `**R6 — Context growth is NOT a stop signal.** Growing context alone is never a reason to park or wait for /compact — auto-precompaction + compaction-survival + continuous re-injection handle the reset seamlessly. CONTINUE delivering units. A SPIRAL (quality degradation, repeated tool failures, same wrong path looping) IS a stop signal; context size alone is NOT. → PRISM: trust auto-precompact at threshold; /compact is a seamless background reset; if a spiral is detected summarize state and start a fresh approach to the SAME goal — not a fresh session that abandons the goal.` |
| 2 | `C:/Users/wompu/.claude/CLAUDE.md:170` | `**Compact every 2-3 units** (don't wait for context limit)` | `Auto-compact fires at threshold — trust it and keep delivering; /compact is a seamless reset, not a delivery stop` |
| 3 | `H:/prism/CLAUDE.md:170` | `**Compact every 2-3 units** (don't wait for context limit)` | `Auto-compact fires at threshold — trust it and keep delivering; /compact is a seamless reset, not a delivery stop` |
| 4 | `H:/prism/mcp-server/src/engines/CLAUDE.md:45` | `🔴 RED (>65%) — /precompact + commit + handoff; don't start new units` | `🔴 RED (>65%) — commit current unit cleanly + write handoff; auto-precompact fires; CONTINUE with next unit after context reset — RED gates tool-call density,
... [+1609 chars truncated]
