---
type: "chat-session"
source: "claude-code-cli"
session_id: "b2bcf85e-9d6a-49ed-8071-1d2fba3122aa"
title: "Review the U1 bundle for GPU-OFFLOAD-MAXIMIZE-MS0. Three files just landed: 1. `"
date: "2026-05-22"
first_ts: "2026-05-22T22:54:43.382Z"
last_ts: "2026-05-22T22:56:51.387Z"
cwd: "H:\\prism"
messages: 16
user_msgs: 7
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/b2bcf85e-9d6a-49ed-8071-1d2fba3122aa/subagents/agent-a693dc52be89b383e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Review the U1 bundle for GPU-OFFLOAD-MAXIMIZE-MS0. Three files just landed: 1. `

> **claude-code-cli** | 2026-05-22 | 16 msgs (7 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b2bcf85e-9d6a-49ed-8071-1d2fba3122aa/subagents/agent-a693dc52be89b383e.jsonl`

## Transcript

### User | 2026-05-22T22:54:43.382Z

Review the U1 bundle for GPU-OFFLOAD-MAXIMIZE-MS0. Three files just landed:

1. `H:/prism/.claude/hooks/ollama-route-pretooluse.mjs` — the hook patch (rewrites the existing hook to add config-file fallback, post-parse schema validation, cascade short-circuit, fail-loud banner, telemetry unification).
2. `H:/prism/mcp-server/data/state/ollama-route-config.json` — activation config (`{mode:auto, minKb:24, model:qwen2.5-coder:7b}`).
3. `H:/prism/.claude/hooks/ollama-route-pretooluse.test.mjs` — 32 test cases, ALL PASSING when run via `node --test`.

The envelope at `H:/prism/mcp-server/data/milestones/GPU-OFFLOAD-MAXIMIZE-MS0.json` v1.0.1 specifies what U1 must do. The hook before this patch is at git HEAD~1 (or `git show HEAD:.claude/hooks/ollama-route-pretooluse.mjs` — actually it hasn't been committed yet, so just read the new file). Read all four files.

**Specific checks (grade PASS/FAIL):**

1. **Schema validation completeness** (envelope U1.deliverables[2]): does `loadRouteConfig` actually enforce `mode ∈ {auto, suggest}`, `minKb >= 8`, and the `model` regex `/^[\w./:-]{1,64}$/`? Cross-check the function against `MIN_KB_FLOOR`, `MODEL_NAME_RE` constants. Is a `{mode:'auto', minKb:0}` config genuinely safe (mode kept, minKb dropped)? Tests #4 should verify this — does it actually assert what it claims?

2. **Cascade short-circuit correctness** (envelope U1.deliverables[1] CASCADE-FAILURE CLARIFICATION): when `mode==='auto'` AND `ollamaReachable===false`, decideRoute MUST return `action:'pass'` (raw-Read pass-through), NOT `action:'suggest'` (which would write an advisory the caller could ignore) and NOT `action:'reroute'` (which would silently fall back to a broken substitute). Read decideRoute carefully. Tests #8 + #9 + #19 + #20 should cover this. Are the assertions strict enough?

3. **Telemetry unification atomicity** (envelope U1.deliverables[5]): `updateOffloadStats` does read → mutate → write-temp → rename. Race-tolerant per envelope ("rare concurrent fire
... [+1590 chars truncated]

### Assistant | 2026-05-22T22:55:05.060Z

I'll review the U1 bundle systematically.

### Assistant | 2026-05-22T22:55:06.643Z

[tool_use: Read]

### Assistant | 2026-05-22T22:55:07.138Z

[tool_use: Read]

### Assistant | 2026-05-22T22:55:07.717Z

[tool_use: Read]

### Assistant | 2026-05-22T22:55:07.939Z

[tool_use: Read]

### User | 2026-05-22T22:55:23.604Z

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
... [+21220 chars truncated]

### User | 2026-05-22T22:55:23.655Z

[tool_result] 1	{
2	  "id": "GPU-OFFLOAD-MAXIMIZE-MS0",
3	  "version": "1.0.1",
4	  "title": "Activate ollama-route-pretooluse auto-mode + unify telemetry so file-read offloads are measurable",
5	  "brief": "Targets a DIFFERENT pathway than OLLAMA-EXPAND-MS0/the existing offload dashboard. The dashboard's 6.9% lifetime / 5.9% last-48h-adjusted figures come from `ollama-task-offloader` (UserPromptSubmit hook) — 
... [+18536 chars truncated]

### User | 2026-05-22T22:55:23.660Z

[tool_result] 1	/**
2	 * ollama-route-pretooluse.test.mjs — tests for U1 of GPU-OFFLOAD-MAXIMIZE-MS0.
3	 *
4	 * Covers:
5	 *   - loadRouteConfig: absent, corrupt, valid, malicious minKb:0, invalid mode, invalid model.
6	 *   - decideRoute cascade short-circuit: auto + unreachable → pass; auto + model not in
7	 *     allowlist → pass; auto + reachable + model verified → reroute; suggest mode preserved;
8	 *     
... [+15410 chars truncated]

### User | 2026-05-22T22:55:23.665Z

[tool_result] 1	{
2	  "mode": "auto",
3	  "minKb": 24,
4	  "model": "qwen2.5-coder:7b"
5	}
6	

### Assistant | 2026-05-22T22:55:32.264Z

Now checking wiring and stats.json structure:

### Assistant | 2026-05-22T22:55:34.376Z

[tool_use: Bash]

### Assistant | 2026-05-22T22:55:35.578Z

[tool_use: Bash]

### User | 2026-05-22T22:56:23.253Z

[tool_result] {
  "schemaVersion": "2.0.0",
  "lastUpdated": "2026-05-22T22:56:08.636Z",
  "lastReset": "2026-04-28T00:11:42.432Z",
  "offloaded": 17,
  "keptOnClaude": 232,
  "estimatedTokensSaved": 8279,
  "silentSuggestions": 136,
  "injectedSuggestions": 15,
  "byCategory": {
    "cache-hit": 2,
    "summary": 15
  },
  "byHook": {
    "ollama-task-offloader": {
      "fired": 279,
      "offloaded": 15,
  
... [+327 chars truncated]

### User | 2026-05-22T22:56:23.418Z

[tool_result] H:/prism/.claude/hooks/bundles/read-bundle.mjs

### Assistant | 2026-05-22T22:56:51.387Z

**PASS** (with 1 P1 + 2 P2 — none blocking; envelope intent met).

### P1 findings

**P1-1: stats.json is corrupt on disk (not from this patch, but blocks acceptance criterion #3-4).** `head -50` of `mcp-server/data/state/ollama-offload-stats.json` shows ~700 lines of repeated `{` after byte ~440 (JSON.parse will throw). `updateOffloadStats` catches the parse error and silently `return`s (line 273-275: "skip unification rather than create a parallel state") — so the `byHook.ollama-route-pretooluse` row will never appear, defeating envelope acceptance criteria #3 + #4. Patch behavior is correct (safer than clobbering); the corrupt file is a separate pre-existing artifact that must be reset before U1 can be measured. Not U1's bug, but U1 is unmeasurable until fixed.

### P2 findings

**P2-1: contentSha covers first 48KB only; banner says `bytes=<full sizeBytes>`.** `defaultOllamaSummarize` (line 215-224) reads `READ_FOR_SUMMARY_CAP=48*KB` then hashes that buffer. Banner line 399 then prints `bytes=${sizeBytes}` (the full stat size). For files >48KB the sha hashes a strict prefix while `bytes=` advertises the whole. The sha+content sent to Ollama ARE the same bytes (envelope check #6 satisfied), but an auditor grepping `[OLLAMA-SUBSTITUTE]` may assume sha covers all `bytes=N`. Recommend banner clarify: `sha256_first48k=<hex>` OR `bytes_hashed=min(48k, total)`.

**P2-2: Stats.json `lastUpdated` clobbers peer hooks.** Line 291 sets `stats.lastUpdated` on every fire. `ollama-task-offloader.mjs` (peer writer) also touches this field — race during concurrent fires loses one update (envelope explicitly tolerates this, fine) but ALSO means dashboard `lastUpdated` no longer reflects the *task-offloader* event. Cosmetic only.

### Spot-checks PASSED

- **Schema validation (#1):** `loadRouteConfig` enforces mode-enum + `Number.isInteger(minKb) && minKb >= MIN_KB_FLOOR(8)` + `MODEL_NAME_RE.test(model)`. `{mode:'auto', minKb:0}` test (line 60-72) correctly asserts `r.minKb === und
... [+952 chars truncated]
