---
type: "chat-session"
source: "claude-code-cli"
session_id: "732a6b5a-50ee-4199-990c-589ff5ab0df0"
title: "Independent second-pass review of WIKI-INJECT-MS0/U-WIM02. Do NOT assume other r"
date: "2026-05-18"
first_ts: "2026-05-18T03:35:53.689Z"
last_ts: "2026-05-18T03:37:45.356Z"
cwd: "H:\\prism"
messages: 20
user_msgs: 8
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/732a6b5a-50ee-4199-990c-589ff5ab0df0/subagents/agent-a481aefdcbb00107b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Independent second-pass review of WIKI-INJECT-MS0/U-WIM02. Do NOT assume other r

> **claude-code-cli** | 2026-05-18 | 20 msgs (8 user / 12 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/732a6b5a-50ee-4199-990c-589ff5ab0df0/subagents/agent-a481aefdcbb00107b.jsonl`

## Transcript

### User | 2026-05-18T03:35:53.689Z

Independent second-pass review of WIKI-INJECT-MS0/U-WIM02. Do NOT assume other reviewers caught everything. Grade PASS or FAIL.

FILES (read both end-to-end):
- H:/prism/.claude/hooks/wiki-precheck-inject.mjs (MODIFIED — live UserPromptSubmit hook, every prompt fleet-wide)
- H:/prism/.claude/hooks/wiki-precheck-inject.test.mjs (test suite, 22 tests)

CHANGE: `prewarmEmbedModel()` — on every UserPromptSubmit (throttled ~20min host-wide via a stamp file), spawns a DETACHED `node -e` child that POSTs to Ollama to keep `nomic-embed-text` resident. Plus `keep_alive:"30m"` on the real semantic query. Goal: fix the measured 95%-`ollama_down` semantic-fallback failure (cold-model timeout races).

WEIGHT YOUR REVIEW ON what code/test reviewers miss:
- PROCESS HYGIENE: this hook spawns detached node processes. PRISM has a fleet-reaper that kills orphan node processes. Will the detached warm-up child (parent = the short-lived hook process, which exits in <100ms → child orphaned) get classified as a reap candidate? It self-terminates in <=60s; the reaper's confirm window is ~10min — is that margin actually safe? Could a burst of prewarms (13 chats) accumulate processes?
- HOST COST: keeping nomic-embed-text resident 24/7 on a memory-pressured host (runs near commit ceiling). nomic-embed-text is ~270MB. Is a 30m keep_alive + 20m re-warm throttle reasonable, or does it worsen the documented memory pressure? Is there a knob to disable it? (PRISM_WIKI_PREWARM_DISABLE)
- SECURITY: the spawned child runs `node -e "<string>"`. The string is built by interpolating `OLLAMA_URL` (derived from $OLLAMA_HOST) and a JSON body via JSON.stringify. Is code-injection into the `-e` payload genuinely impossible for any $OLLAMA_HOST value?
- INTEGRATION: does this duplicate/conflict with the existing `ollama-prewarm-on-pipeline.mjs` hook (which prewarms models on pipeline keywords)? Is owning nomic-warmth inside wiki-precheck-inject (the sole nomic consumer in the hook layer) the right call, or sho
... [+504 chars truncated]

### Assistant | 2026-05-18T03:36:02.749Z

I'll review both files end-to-end.

### Assistant | 2026-05-18T03:36:03.581Z

[tool_use: Read]

### Assistant | 2026-05-18T03:36:03.638Z

[tool_use: Read]

### User | 2026-05-18T03:36:07.175Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * wiki-precheck-inject.test.mjs — node:test suite for wiki-precheck-inject.mjs.
4	 *
5	 * Primary coverage: the WIKI-INJECT-MS0 embeddings-staleness guard
6	 * (embeddingStaleness / staleFooterNote / the embStale wiring through
7	 * semanticFallback → main → logMiss). Also pins the BM25/boost matched path so
8	 * the guard edits can't silently break the happy path.
9
... [+13269 chars truncated]

### User | 2026-05-18T03:36:07.208Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * wiki-precheck-inject.mjs — UserPromptSubmit hook.
5	 *
6	 * Karpathy LLM-Wiki integration: when the user's prompt mentions a concept
7	 * already in knowledge/wiki/index.md, inject the top-3 matching entries as
8	 * additionalContext so Claude doesn't re-derive what the wiki already knows.
9	 *
10	 * Scoring: BM25-lite over [[Name]] + description toke
... [+29314 chars truncated]

### Assistant | 2026-05-18T03:36:17.134Z

[tool_use: Bash]

### Assistant | 2026-05-18T03:36:16.199Z

[tool_use: Bash]

### Assistant | 2026-05-18T03:36:14.227Z

Both files are now read end-to-end. Let me investigate the specific concerns raised — process hygiene against the fleet-reaper, the existing prewarm hook, and the security of the `node -e` payload.

### User | 2026-05-18T03:36:23.495Z

[tool_result] #!/usr/bin/env node
// tier: T3
/**
 * ollama-prewarm-on-pipeline.mjs — UserPromptSubmit hook
 *
 * When a pipeline trigger fires (/forge*, /rgs, /scrutinize, /dedup,
 * /deep-search, /pdf-learn, /close-out-audit, /precompact) AND the
 * required Ollama model is NOT yet warm in VRAM, fire a tiny
 * background /api/generate request to pre-load it. Returns instantly;
 * the model warms while Claude 
... [+3755 chars truncated]

### User | 2026-05-18T03:36:24.518Z

[tool_result] 27 matches in 6 files:

.claude/helpers/process-slot-map.mjs:127:*               map. FLEET-REAPER-MS1's `leftover-bash-task` classifier reads
.claude/helpers/process-slot-map.mjs:201:* Process names eligible for the FLEET-REAPER-MS1 "leftover-bash-task" classi...
.claude/helpers/process-slot-map.mjs:223:*     fire. `matchesLeftoverTaskPattern` additionally truncates the haystack to
.claude/helper
... [+2266 chars truncated]

### Assistant | 2026-05-18T03:36:28.658Z

Let me check the leftover-bash-task pattern matcher to determine whether the detached `node -e` warm-up child would be classified as a reap candidate.

### Assistant | 2026-05-18T03:36:29.517Z

[tool_use: Read]

### Assistant | 2026-05-18T03:36:31.488Z

[tool_use: Bash]

### User | 2026-05-18T03:36:31.546Z

[tool_result] 250	/** Cmdline scan cap for `matchesLeftoverTaskPattern` — a leftover-task
251	 *  signature is always near the front; capping the haystack keeps regex cost
252	 *  bounded regardless of how long an adversarial `proc.cmd` is. */
253	const LEFTOVER_CMD_SCAN_MAX = 4096;
254	
255	/**
256	 * Minimum age before a leftover-pattern shell is considered for reap. 15 min.
257	 *
258	 * Calibration:
259	 * 
... [+4525 chars truncated]

### User | 2026-05-18T03:36:38.031Z

[tool_result] 861:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/ollama-prewarm-on-pipeline.mjs",
===C-settings===
861:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/ollama-prewarm-on-pipeline.mjs",

### Assistant | 2026-05-18T03:36:43.605Z

Now I have what I need. Let me verify the `node -e` payload injection surface and the leftover-bash-task name set.

### Assistant | 2026-05-18T03:36:44.685Z

[tool_use: Read]

### User | 2026-05-18T03:36:45.553Z

[tool_result] 195	  "powershell",
196	  "windowsterminal",
197	  "conhost",
198	]);
199	
200	/**
201	 * Process names eligible for the FLEET-REAPER-MS1 "leftover-bash-task" classifier.
202	 * Subset of TARGET_NAMES restricted to shells — the leftover-task pattern is a
203	 * shell idiom (`while true; do … sleep N; done`, `tail -f`, etc.). A leftover
204	 * node.exe would be a hung helper / orphaned MCP and is t
... [+2752 chars truncated]

### Assistant | 2026-05-18T03:37:45.356Z

I have everything I need. Independent second-pass review complete.

---

## Independent Second-Pass Review — WIKI-INJECT-MS0/U-WIM02

### PROCESS HYGIENE — SAFE (verified, not assumed)

The detached `node -e` warm-up child is **NOT** a fleet-reaper candidate. I verified the actual reaper classifier (`process-slot-map.mjs:207`): `LEFTOVER_TASK_NAMES = new Set(["bash", "sh"])`. The docstring at lines 200-206 is explicit — the leftover-bash-task classifier deliberately excludes node: *"A leftover node.exe would be a hung helper / orphaned MCP and is the existing reapers' concern (`owned-by-crashed` / `unowned`), not this one."*

- The `node -e` child is named `node.exe`, so the `leftover-bash-task` path cannot touch it.
- The `owned-by-crashed`/`unowned` paths require a *genuinely dead PID ancestor*. The warm-up child's parent (the hook `portable-node`) exits in <100ms → child reparents to `wininit/services` ancestry, not a dead chat PID. Worst case it classifies `indeterminate` (the safe verdict by design). It also self-terminates in ≤60s (`setTimeout(()=>c.abort(),60000)` + `process.exit(0)`), well inside the ~10min confirm window. No P0/P1 here. The reviewer-prompt's worry is unfounded once you read the actual classifier.

**Burst accumulation**: 13 chats × the 20-min host-wide stamp throttle = at most 1 process per ~20min, ≤60s lifetime. Steady state is 0-1 concurrent warm-up children. Not a leak.

### P1 — HOST COST: keep_alive vs. documented memory pressure (no knob gap, but a cost-balance concern)

`PRISM_WIKI_PREWARM_DISABLE` exists (line 367) — so the reviewer-prompt's stated requirement is met. But the **substantive** concern stands: this hook pins ~270MB resident **fleet-wide, indefinitely**. The stamp throttle is 20min and `keep_alive` is 30m — re-warm interval *strictly shorter* than residency window means once warmed, nomic-embed-text effectively **never** unloads as long as any chat submits a prompt every 20min. On a host the codebase itself repeatedly d
... [+7362 chars truncated]
