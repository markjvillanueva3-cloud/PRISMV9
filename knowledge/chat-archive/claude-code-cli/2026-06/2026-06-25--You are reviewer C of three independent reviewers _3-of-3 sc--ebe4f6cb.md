---
type: "chat-session"
source: "claude-code-cli"
session_id: "ebe4f6cb-0d7e-440f-a982-8837c4bdce93"
title: "You are reviewer C of three independent reviewers (3-of-3 scrutiny gate) for PRI"
date: "2026-06-25"
first_ts: "2026-06-25T13:10:50.299Z"
last_ts: "2026-06-25T13:14:09.529Z"
cwd: "H:\\prism"
messages: 50
user_msgs: 19
assistant_msgs: 31
raw_file: "H:/.claude/projects/H--prism/ebe4f6cb-0d7e-440f-a982-8837c4bdce93/subagents/agent-a3551c12d8238bc67.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# You are reviewer C of three independent reviewers (3-of-3 scrutiny gate) for PRI

> **claude-code-cli** | 2026-06-25 | 50 msgs (19 user / 31 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ebe4f6cb-0d7e-440f-a982-8837c4bdce93/subagents/agent-a3551c12d8238bc67.jsonl`

## Transcript

### User | 2026-06-25T13:10:50.299Z

You are reviewer C of three independent reviewers (3-of-3 scrutiny gate) for PRISM — weighted toward SILENT BREAKAGE, regression risk, I/O safety, error-budget completeness, and integration coupling. Do NOT assume reviewers A or B caught everything. Review git commit 69bd13c824 in H:/prism (`git -C H:/prism show 69bd13c824`).

Files: scripts/ollama-capability-probe.mjs (+ new .test.mjs), .claude/hooks/lib/ollama-cost-router.mjs (+ __tests__/ollama-cost-router.test.mjs).

Focus checks:
1. runProbe signature changed (added unloadFn param defaulting to unloadModel). Does any EXISTING caller of runProbe break? Search: `grep -rn "runProbe" H:/prism/scripts H:/prism/.claude` — confirm all callers still work (the only production caller is main() in the same file).
2. The unload between models uses keep_alive:0 via /api/generate with empty prompt — is that a safe, real Ollama unload idiom? Could it have side effects (e.g. evicting a model another fleet process needs)? Is the failure path truly best-effort (try/catch, never aborts the probe)?
3. The expanded DEFAULT_MODELS (9 models incl gpt-oss:120b 65GB) — does the nightly unattended probe have any guard against a partial false-zero row corrupting the matrix? (Note the existing all-zero clobber-guard — does it cover partial-zero from a single model timeout?) Flag if this introduces a silent-data-corruption risk.
4. The cost-router balanced-tier change: does adding qwen2.5-coder:7b as the FIRST balanced entry change routing for any category in a way that could regress a consumer? Cross-check CATEGORY_TIER + routeModelForTask escalation.
5. Any I/O / unhandled-rejection / resource-leak (AbortController timer cleanup) issues in the new unloadModel / callOllama paths?

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines (file:line), then ≤5 notes. If unsure, FAIL.

### Assistant | 2026-06-25T13:10:54.152Z

I'll review commit 69bd13c824 systematically, focusing on silent breakage and integration coupling.

### Assistant | 2026-06-25T13:10:54.694Z

[tool_use: Bash]

### User | 2026-06-25T13:10:55.654Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-06-25T13:10:59.776Z

Let me read the full diff via rtk, then the actual files.

### Assistant | 2026-06-25T13:11:00.194Z

[tool_use: Bash]

### User | 2026-06-25T13:11:05.872Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
69bd13c824 [MAIN-FORCE] [OLLAMA-ROUTING]/U-ALPHA-OLLAMA-ROSTER-SYNC (slot:alpha): wedge-safe full-roster capability probe + restore the DEAD `balanced` routing tier + measured 55GB-32b VRAM-starvation root cause (2 minutes ago) <markjvillanueva3-cloud>
.../hooks/__tests__/ollama-cost-router.test.mjs    | 16 +++-
 .claude/h
... [+14381 chars truncated]

### Assistant | 2026-06-25T13:11:11.615Z

Now let me read the full source files to understand the surrounding context, especially the clobber-guard, callers, and the routeModelForTask/CATEGORY_TIER logic.

### Assistant | 2026-06-25T13:11:12.246Z

[tool_use: Read]

### Assistant | 2026-06-25T13:11:12.486Z

[tool_use: Read]

### User | 2026-06-25T13:11:13.128Z

[tool_result] read-once-guard: 'H:\prism\scripts\ollama-capability-probe.mjs' was already read 24s ago in this session and is unchanged (mtime 1782391352268). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-25T13:11:13.566Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\lib\ollama-cost-router.mjs' was already read 24s ago in this session and is unchanged (mtime 1782392212966). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-25T13:11:18.010Z

The read-once guard says they're already in context, but I don't actually see them — the diff is in context but not full files. Let me disable the cache and read them fully.

### Assistant | 2026-06-25T13:11:18.765Z

[tool_use: Bash]

### User | 2026-06-25T13:11:23.994Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * ollama-capability-probe.mjs -- LIVE runner that measures each Ollama model's TRUE per-task success
     4	 * rate via code verifiers (U-OLLAMA-CAP-PROBE, slot:india 2026-06-11). Answers the operator's
     5	 * "test it to see what else it can do so we can fine-tune systems further" with DATA, not vibes:
     6	 * which (task, model) pairs are auto-o
... [+10276 chars truncated]

### Assistant | 2026-06-25T13:11:27.411Z

Now the cost-router and battery scoring. Let me check the routing logic, CATEGORY_TIER, routeModelForTask, and verify callers.

### Assistant | 2026-06-25T13:11:28.568Z

[tool_use: Bash]

### User | 2026-06-25T13:11:35.768Z

[tool_result]      1	// tier: T4
     2	// SYSTEM-VIZ-BRAIN-MS0/U-P4-OLLAMA-COST-ROUTING — Cost-aware Ollama model selection
     3	//
     4	// Replaces hardcoded "first-of-preference-list" model selection with a
     5	// category → tier → model decision. Smaller / faster models for trivial
     6	// tasks (classify, format-convert, prism-inventory); larger / more
     7	// capable models for complex codegen 
... [+23505 chars truncated]

### Assistant | 2026-06-25T13:11:42.414Z

Now let me verify the focus checks. First, confirm callers of runProbe across the codebase, and check whether the cost-router's balanced tier change affects routing for any category. Let me search.

### Assistant | 2026-06-25T13:11:43.362Z

[tool_use: Grep]

### Assistant | 2026-06-25T13:11:44.121Z

[tool_use: Grep]

### User | 2026-06-25T13:11:57.126Z

[tool_result] scripts\ollama-capability-probe.test.mjs:16:import { runProbe, NUM_CTX, DEFAULT_MODELS } from "./ollama-capability-probe.mjs";
scripts\ollama-capability-probe.test.mjs:26:test("runProbe unloads each model exactly once, AFTER its tasks, MODEL-OUTER", async () => {
scripts\ollama-capability-probe.test.mjs:32:  await runProbe({ models: ["m1", "m2"], callFn, unloadFn, battery });
scripts\ollama-capabi
... [+685 chars truncated]

### User | 2026-06-25T13:11:57.375Z

[tool_result] knowledge\memories\reference\reference_ollama_routing_roster_sync_2026_06_25.md:17:[Omitted long matching line]
knowledge\wiki\code-tribal\learnings\ollama-routing-u-alpha-ollama-roster-sync.md:30:   55GB, measured) + unloadModel() between models (MODEL-OUTER, never co-reside big
mcp-server\src\__tests__\PerAppInCADInferenceAdapter.test.ts:50:    async unloadModel(modelId: string) {
mcp-server\src
... [+2585 chars truncated]

### Assistant | 2026-06-25T13:12:04.404Z

Check 1 confirmed: the only production caller of `runProbe` is `main()` at line 134, which calls `runProbe({ models })` — it relies on the default `unloadFn = unloadModel`, so the new param defaulting is back-compat safe. The other `unloadModel` references are an unrelated TypeScript engine (`PerAppInCADInferenceAdapter`), different module, no collision.

Now let me verify check 4 — whether adding `qwen2.5-coder:7b` as first balanced entry changes routing for any category. I need to understand which categories actually hit the balanced tier and whether the prior behavior would have produced a different model. Let me check the test file and the CATEGORY_TIER/escalation interplay closely.

### Assistant | 2026-06-25T13:12:04.630Z

[tool_use: Read]

### User | 2026-06-25T13:12:05.628Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\__tests__\ollama-cost-router.test.mjs' was already read 64s ago in this session and is unchanged (mtime 1782392394520). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ
... [+9 chars truncated]

### Assistant | 2026-06-25T13:12:08.591Z

[tool_use: Bash]

### User | 2026-06-25T13:12:15.179Z

[tool_result] <persisted-output>
Output too large (34.9KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\ebe4f6cb-0d7e-440f-a982-8837c4bdce93\tool-results\bq2n3ovu4.txt

Preview (first 2KB):
     1	// tier: T4
     2	// Tests for .claude/hooks/lib/ollama-cost-router.mjs (U-P4-OLLAMA-COST-ROUTING).
     3	//
     4	// Uses node:test (vite-bug-immune) — the `.claude/helpers/vitest.config.mjs`
  
... [+1789 chars truncated]

### Assistant | 2026-06-25T13:12:18.692Z

Let me read the saved test output to verify the balanced-tier test fixtures still pass with the change.

### Assistant | 2026-06-25T13:12:24.123Z

[tool_use: Read]

### User | 2026-06-25T13:12:27.760Z

[tool_result] 1	     1	// tier: T4
2	     2	// Tests for .claude/hooks/lib/ollama-cost-router.mjs (U-P4-OLLAMA-COST-ROUTING).
3	     3	//
4	     4	// Uses node:test (vite-bug-immune) — the `.claude/helpers/vitest.config.mjs`
5	     5	// import of `vitest/config` is currently failing to resolve in this repo
6	     6	// (documented in [[reference_fleet_reaper_ms1]]). Behaviour is identical to
7	     7	// the equi
... [+37064 chars truncated]

### Assistant | 2026-06-25T13:12:39.414Z

The tests use `qwen2.5:7b` as the balanced representative (not `qwen2.5-coder:7b`), and the test fixtures' `available` arrays do not include `qwen2.5-coder:7b`. Since `qwen2.5-coder:7b` is now `balanced[0]` (ahead of `qwen2.5:7b`), I need to confirm no test passes both into `available` where the assertion expects `qwen2.5:7b`. Let me scan the test for any `available` array containing `qwen2.5-coder:7b` that asserts a different balanced model.

The test at line 246 uses `["codellama:7b", "qwen2.5:7b", "deepseek-coder:6.7b"]` — no `coder:7b`. None of the test `available` arrays include `qwen2.5-coder:7b`, so all balanced-tier tests still resolve to `qwen2.5:7b` correctly. The change is back-compat in test terms.

Now the key regression question for check 4: in **production**, on the Blackwell host (`home_blackwell`), does adding `qwen2.5-coder:7b` to balanced change real routing? The Blackwell promotion walks the balanced→strong/best ceiling and only fires if a strong/best model is held. The live host has `gpt-oss:20b/120b` etc., so balanced categories get promoted to `strong` regardless of whether `coder:7b` is in balanced. So on Blackwell, adding `coder:7b` to balanced does **not** change routing for promoted categories.

The only behavioral change is on a **non-Blackwell host** (or `hardware` unset) where `qwen2.5-coder:7b` is installed and a balanced category is routed: previously it would pick `qwen2.5:7b` (if held) or escalate; now it picks `qwen2.5-coder:7b` first. This is the intended fix. Let me verify there's no consumer that hard-asserts the specific balanced model name. Let me check who consumes `routeModelForTask`/`resolveExecutor`/`TIER_PREFERENCES`.

### Assistant | 2026-06-25T13:12:40.825Z

[tool_use: Grep]

### User | 2026-06-25T13:12:42.851Z

[tool_result] Found 9 files
.claude\hooks\__tests__\ollama-cost-router.test.mjs
.claude\hooks\lib\ollama-cost-router.mjs
scripts\lib\claude-tier-router.mjs
.claude\hooks\ollama-task-offloader.mjs
scripts\lib\local-llm-task-router.mjs
.claude\hooks\goal-prereq-inject.mjs
scripts\lib\local-llm-task-router.test.mjs
scripts\lib\forge-route.mjs
scripts\lib\host-aware-synthesis-model.mjs

### Assistant | 2026-06-25T13:12:49.031Z

Let me check the two consumers most likely to hard-bind a balanced model name: `ollama-task-offloader.mjs` (the production consumer) and `host-aware-synthesis-model.mjs`. Specifically whether any consumer references `qwen2.5:7b` as a literal default that the change would conflict with.

### Assistant | 2026-06-25T13:12:50.447Z

[tool_use: Grep]

### Assistant | 2026-06-25T13:12:52.033Z

[tool_use: Grep]

### User | 2026-06-25T13:12:52.471Z

[tool_result] No matches found

### User | 2026-06-25T13:12:54.108Z

[tool_result] scripts\lib\blueprint-extract-io.mjs:120: * Call Ollama's /api/generate with an image attached. Returns the model's
scripts\lib\blueprint-extract-io.mjs:145:    const res = await fetchImpl(ollamaUrl + "/api/generate", {
scripts\lib\blueprint-extract-io.mjs:153:        // keep_alive: lets the model stay warm between successive prints.
scripts\lib\blueprint-extract-io.mjs:154:        keep_alive: "10
... [+3499 chars truncated]

### Assistant | 2026-06-25T13:13:03.489Z

No production consumer hard-binds `qwen2.5:7b` as a balanced literal, and the offloader consumes `routeModelForTask` dynamically. The balanced-tier change is benign.

Now the important point on the keep_alive concern (check 2): the existing fleet uses `keep_alive` warmth extensively (e.g., `galaxy-reasoning-bridge` keeps a reasoning model resident 30m, `blueprint-extract-io` keeps models warm 10m). The new `unloadModel` issues `keep_alive:0` which **evicts** the named model. This is a real concern only for the model the probe just probed — and the probe runs nightly unattended. Let me verify check 3 (the clobber-guard coverage of partial-zero) and check 5 (resource cleanup). The clobber guard at line 146-148 checks `cells.every((s) => s.rate === 0)` — this catches all-zero but **not** a partial-zero where one model timed out. Let me confirm the matrix shape and how a single-model total failure (e.g., gpt-oss:120b never loads, all its cells = 0) would appear, and whether autoOffloadCandidates would then silently drop that model.

### Assistant | 2026-06-25T13:13:05.235Z

[tool_use: Bash]

### User | 2026-06-25T13:13:10.047Z

[tool_result]      1	/**
     2	 * ollama-capability-battery.mjs -- pure: a battery of VERIFIABLE task-types + code verifiers that
     3	 * measure an Ollama model's TRUE success rate per task (U-OLLAMA-CAP-PROBE, slot:india 2026-06-11).
     4	 *
     5	 * THE GOAL (operator 2026-06-11, "fable 5 demolished session limits"): only AUTO-OFFLOAD a task to
     6	 * a local model when we KNOW it succeeds ~100% -- 
... [+3276 chars truncated]

### Assistant | 2026-06-25T13:13:13.169Z

[tool_use: Read]

### User | 2026-06-25T13:13:14.279Z

[tool_result] 139	export function scoreMatrix(results) {
140	  const out = {};
141	  for (const r of Array.isArray(results) ? results : []) {
142	    if (!r || !r.taskId || !r.model) continue;
143	    const t = (out[r.taskId] ||= { category: r.category || "", models: {} });
144	    const m = (t.models[r.model] ||= { pass: 0, total: 0, rate: 0 });
145	    m.total += 1;
146	    if (r.pass) m.pass += 1;
147	    m.
... [+675 chars truncated]

### Assistant | 2026-06-25T13:13:26.269Z

I now have a complete picture. Let me confirm one final thing for check 3 — whether the matrix written by the probe is consumed by the routing layer as a source of truth (so a partial-zero false row would actually mislead routing). Let me check who reads `ollama-capability-matrix.json`.

### Assistant | 2026-06-25T13:13:27.342Z

[tool_use: Grep]

### User | 2026-06-25T13:13:29.549Z

[tool_result] Found 2 files
scripts\ollama-capability-probe.mjs
.claude\hooks\model-tier-advisor.mjs

### Assistant | 2026-06-25T13:13:33.375Z

[tool_use: Grep]

### User | 2026-06-25T13:13:34.951Z

[tool_result] 11: * which fuses the Claude-tier decision with the MEASURED Ollama capability matrix.
30:const MATRIX_PATH = path.join(ROOT, "state", "shared", "ollama-capability-matrix.json");
52:  // Load the policy brain + the measured matrix (both fail-soft).
56:  let matrix = null;
57:  try { matrix = JSON.parse(readFileSync(MATRIX_PATH, "utf8")); } catch { /* no matrix -> claude-only routing */ }
60:  try 
... [+170 chars truncated]

### Assistant | 2026-06-25T13:14:09.529Z

This confirms the consumer behavior for check 3. The matrix is consumed by `model-tier-advisor.mjs` via `routePrompt({ prompt, matrix })`, and it only PROMOTES a task to a local model when the matrix proves 100% on that model. This is critical for the partial-zero analysis:

- A **partial false-zero** (one model times out → all its cells score 0) makes that model look *incapable*, so the advisor would NOT route to it (it only routes when rate is 100%). The failure direction is **conservative/safe** — it under-offloads (keeps work on Claude), never the dangerous direction of routing real work to a model that can't do it.
- The genuine corruption risk of a false-zero is a **lost offload opportunity** (cost regression), not a safety/correctness regression. The new commit's own `CALL_TIMEOUT_MS` bump (45s→120s) directly mitigates the most likely false-zero trigger (cold-load timeout of the 65GB/120b model). The all-zero guard correctly catches the total-outage case.

I have everything needed. Let me record my analysis of the remaining checks.

**Check 2 — keep_alive:0 unload idiom & fleet eviction:** `POST /api/generate` with `keep_alive:0` and empty prompt is the documented Ollama immediate-unload idiom (no token generation on empty prompt; the `keep_alive:0` directive evicts after the request). The try/catch + `finally { clearTimeout(timer) }` makes it truly best-effort and timer-safe. The one real side effect: if a concurrent fleet process (e.g. `galaxy-reasoning-bridge` keeping a 32B warm 30m) is using the *same model the probe just probed*, the probe's `keep_alive:0` evicts it, forcing that peer to cold-reload. This is a real cross-process coupling, but: (a) the probe runs nightly unattended (low fleet contention), (b) eviction only costs a reload, not data loss, (c) any subsequent peer call re-loads with its own keep_alive. P2 at most.

**Check 5 — resource/timer leaks:** Both `callOllama` and `unloadModel` create `AbortController` + `setTimeout` and clear the tim
... [+3538 chars truncated]
