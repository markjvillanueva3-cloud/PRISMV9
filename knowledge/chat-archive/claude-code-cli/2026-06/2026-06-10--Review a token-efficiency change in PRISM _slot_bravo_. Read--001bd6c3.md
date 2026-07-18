---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "Review a token-efficiency change in PRISM (slot:bravo). Read end-to-end: - H:/pr"
date: "2026-06-10"
first_ts: "2026-06-10T17:25:37.032Z"
last_ts: "2026-06-10T17:29:28.782Z"
cwd: "H:\\prism"
messages: 41
user_msgs: 17
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/agent-a0016916bc2dfddc6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:02"
---

# Review a token-efficiency change in PRISM (slot:bravo). Read end-to-end: - H:/pr

> **claude-code-cli** | 2026-06-10 | 41 msgs (17 user / 24 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/agent-a0016916bc2dfddc6.jsonl`

## Transcript

### User | 2026-06-10T17:25:37.032Z

Review a token-efficiency change in PRISM (slot:bravo). Read end-to-end:
- H:/prism/.claude/hooks/tribal-by-domain-inject.mjs (changed)
- H:/prism/.claude/hooks/tribal-by-domain-inject.test.mjs (test)
Context (already proven this session on a sibling commit): H:/prism/scripts/lib/inject-throttle.mjs and H:/prism/.claude/hooks/master-index-precheck-inject.mjs (which got the identical throttle wiring + a full 2-arm review).

CHANGE: tribal-by-domain-inject is a UserPromptSubmit advisory injector that, on every prompt, spawns the tribal-rerank subprocess + an Ollama embed (~3-4s, ~2KB) and injects top-K tribal hits. It had NO same-prompt throttle, so a /loop (identical prompt every tick) re-ran that work each tick. The change wires `shouldThrottleInject` from inject-throttle.mjs: adds the import, a THROTTLE_MS knob parsed via an IIFE (NOT `parseInt||default`, so env "0" stays 0=off), a header-doc knob line, and a check inside `main()` placed AFTER `sessionId` is resolved but BEFORE the CAG `shouldSkip` and the `runRerank` subprocess, that does `tele("skip_throttled",{...}); approve(); return;` when throttled.

VERIFY, grading PASS/FAIL with P0/P1/P2 + file:line:
1. Placement: is the throttle check after `sessionId` (line ~315) and before BOTH `shouldSkip` (CAG) and `runRerank`? Does a throttled tick do ZERO work (no CAG read, no subprocess spawn, no Ollama embed, no incrementFeature, no emit)?
2. The `0=off` knob: confirm the THROTTLE_MS IIFE returns 0 when env is "0" (so ttl=0 disables) and 60000 when unset/blank/non-numeric. Confirm shouldThrottleInject treats ttl<=0 as "never throttle" (inject-throttle.mjs line ~107).
3. Fail-open: missing sessionId / I/O error => proceeds to inject (never silently suppresses)?
4. Idiom: does it correctly use this hook's own `approve()` (bare = continue/no-emit) and `tele(event,obj)` rather than the master-index `process.exit(0)` pattern? Is `approve()`+`return` the right "emit nothing" for this hook?
5. Test integrity (R9): the 2 n
... [+631 chars truncated]

### Assistant | 2026-06-10T17:26:55.531Z

I'll review this change end-to-end. Let me read the changed hook, its test, and the reference implementations that already passed review.

### Assistant | 2026-06-10T17:26:55.738Z

[tool_use: Read]

### Assistant | 2026-06-10T17:26:56.693Z

[tool_use: Read]

### User | 2026-06-10T17:26:57.319Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\tribal-by-domain-inject.mjs' was already read 57s ago in this session and is unchanged (mtime 1781112060151). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-10T17:26:59.250Z

[tool_use: Read]

### Assistant | 2026-06-10T17:26:59.254Z

[tool_use: Read]

### User | 2026-06-10T17:26:59.337Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\tribal-by-domain-inject.test.mjs' was already read 58s ago in this session and is unchanged (mtime 1781112216463). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### User | 2026-06-10T17:27:01.386Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\inject-throttle.mjs' was already read 29m ago in this session and is unchanged (mtime 1780324216599). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-10T17:27:02.677Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * master-index-precheck-inject.mjs — UserPromptSubmit injector
5	 *
6	 * Cuts Grep/Glob/Agent token waste by surfacing the top-K master-index hits
7	 * BEFORE the model decides which search tool to fire. Reads system-graph.json
8	 * directly (mtime-cached on disk) + the wiki/memory entries pre-joined to
9	 * each node. Sister hook to wiki-precheck-injec
... [+16091 chars truncated]

### Assistant | 2026-06-10T17:27:24.388Z

The three target files are already in my context from earlier reads this session. Let me retrieve the cached content of the changed hook, its test, and the throttle lib. The read-once-guard confirms they're unchanged. Let me re-read them since I need their exact content for line-level review (the guard blocked re-read, so I'll use Grep to surface the specific changed regions and confirm exact line numbers).

### Assistant | 2026-06-10T17:27:26.399Z

[tool_use: Grep]

### Assistant | 2026-06-10T17:27:28.031Z

[tool_use: Grep]

### User | 2026-06-10T17:27:29.216Z

[tool_result] 36://   PRISM_TRIBAL_DOMAIN_INJECT_THROTTLE_MS=N same-prompt re-inject throttle for
51:import { shouldSkip, skipAdvisory } from "../helpers/cag-consume.mjs";
56:import { shouldThrottleInject } from "../../scripts/lib/inject-throttle.mjs";
72:const THROTTLE_MS = (() => {
73:  const n = parseInt(process.env.PRISM_TRIBAL_DOMAIN_INJECT_THROTTLE_MS ?? "", 10);
148:function tele(decision, extra) {
159:f
... [+1228 chars truncated]

### User | 2026-06-10T17:27:30.893Z

[tool_result] 1:// scripts/lib/inject-throttle.mjs
2:// MEMORY-RECALL-THROTTLE (2026-06-01 slot:golf): per-session same-prompt throttle
4:// promised a "per-session prompt-hash throttle (60s) to avoid context-burn on
10://   • PER-SESSION state files (state/inject-throttle/<sid>.json), NOT one shared
13://   • FAIL-OPEN: any missing session id / I/O error => NOT throttled (inject). A
14://     throttle that fai
... [+1207 chars truncated]

### Assistant | 2026-06-10T17:27:36.535Z

Now let me read the exact changed regions of the hook (header doc + THROTTLE_MS IIFE + the placement region in main) and the full test file with line numbers, plus the relevant part of inject-throttle.

### Assistant | 2026-06-10T17:27:37.599Z

[tool_use: Read]

### Assistant | 2026-06-10T17:27:38.434Z

[tool_use: Read]

### Assistant | 2026-06-10T17:27:39.285Z

[tool_use: Read]

### User | 2026-06-10T17:27:39.351Z

[tool_result] 28	// Advisory only — never blocks. Subprocess timeout caps latency. If Ollama
29	// is down or the index is missing, returns {continue:true} silently.
30	//
31	// Knobs:
32	//   PRISM_TRIBAL_DOMAIN_INJECT_DISABLE=1     no-op
33	//   PRISM_TRIBAL_DOMAIN_INJECT_K=N           top-K to inject (default 3)
34	//   PRISM_TRIBAL_DOMAIN_INJECT_TIMEOUT_MS=N  subprocess timeout (default 4000)
35	//   PRISM_
... [+3727 chars truncated]

### User | 2026-06-10T17:27:40.334Z

[tool_result] 140	  india: "backend-dev", // ai-training
141	  juliett: "backend-dev", // database = backend infra
142	  hotel: "general",     // business: no mfg-tribal corpus
143	  alpha: "backend-dev", bravo: "backend-dev", golf: "backend-dev", papa: "backend-dev",
144	  romeo: "backend-dev", sierra: "backend-dev", tango: "backend-dev", zebra: "backend-dev",
145	  charlie: "general", lima: "general", quebec:
... [+3079 chars truncated]

### User | 2026-06-10T17:27:41.033Z

[tool_result] 300	}
301	
302	function buildOutput(additionalContext) {
303	  return {
304	    hookSpecificOutput: {
305	      hookEventName: "UserPromptSubmit",
306	      additionalContext,
307	    },
308	  };
309	}
310	
311	async function main(injected) {
312	  if (DISABLE) { tele("skip_disabled"); approve(); return; }
313	  const input = injected !== undefined ? injected : readStdin();
314	  const prompt = ex
... [+3347 chars truncated]

### Assistant | 2026-06-10T17:27:47.519Z

I have the changed hook regions and the throttle lib. Now let me read the full inject-throttle lib (lines 100-130, the `shouldThrottleInject` body and ttl<=0 check) and the full test file with line numbers to verify the new tests.

### Assistant | 2026-06-10T17:27:48.754Z

[tool_use: Read]

### Assistant | 2026-06-10T17:27:48.842Z

[tool_use: Read]

### User | 2026-06-10T17:27:50.612Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\tribal-by-domain-inject.test.mjs' was already read 2m ago in this session and is unchanged (mtime 1781112216463). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### User | 2026-06-10T17:27:51.837Z

[tool_result] 100	// persistent same-prompt loop re-injects at most once per ttl window (the ts anchors
101	// to the LAST real injection, not to every suppressed tick).
102	export function shouldThrottleInject({
103	  sessionId, prompt, nowMs, ttlMs = DEFAULT_THROTTLE_MS, stateDir = DEFAULT_STATE_DIR, fs = {},
104	}) {
105	  const path = statePathFor(sessionId, { stateDir });
106	  if (!path) return false;    
... [+503 chars truncated]

### Assistant | 2026-06-10T17:27:58.446Z

The test file was read earlier this session but blocked from re-read. Let me grep the test file to surface the two new throttle tests with line numbers and exact assertions.

### Assistant | 2026-06-10T17:28:00.343Z

[tool_use: Grep]

### User | 2026-06-10T17:28:03.128Z

[tool_result] 2:// tribal-by-domain-inject.test.mjs — hermetic node:test suite
5:// parseRerankOutput / formatInjection. No Ollama / no subprocess.
13:import { existsSync, readFileSync, unlinkSync } from "node:fs";
20:  formatInjection,
23:import { DEFAULT_STATE_DIR, safeSessionId, promptHash } from "../../scripts/lib/inject-throttle.mjs";
25:// --- U-TRIBAL-DOMAIN-THROTTLE (2026-06-10 slot:bravo) ---
27:// thi
... [+6034 chars truncated]

### Assistant | 2026-06-10T17:28:10.891Z

I need the exact body of the two new subprocess tests (lines 25-81) to verify determinism, the spawn mechanics, and the `safeSessionId`/`statePathFor` path used to locate state files. Let me read that range and confirm `safeSessionId` is the right path-builder.

### Assistant | 2026-06-10T17:28:12.433Z

[tool_use: Read]

### Assistant | 2026-06-10T17:28:14.460Z

[tool_use: Grep]

### User | 2026-06-10T17:28:14.660Z

[tool_result] 1	#!/usr/bin/env node
2	// tribal-by-domain-inject.test.mjs — hermetic node:test suite
3	//
4	// Pure-function tests for extractPrompt / inferTribalDomain /
5	// parseRerankOutput / formatInjection. No Ollama / no subprocess.
6	//
7	// Run: node --test H:/prism/.claude/hooks/tribal-by-domain-inject.test.mjs
8	
9	import { describe, it } from "node:test";
10	import assert from "node:assert/strict";

... [+3771 chars truncated]

### User | 2026-06-10T17:28:16.707Z

[tool_result] 34:export function safeSessionId(sessionId) {
35-  const s = String(sessionId ?? "").replace(/[^a-zA-Z0-9._-]/g, "");
36-  return s.length ? s.slice(0, 120) : null;
37-}
38-
39-// PURE. prev = { hash, ts } | null. Returns { skip, next }.
40-// skip === true only when the SAME prompt was injected within ttlMs.
41-export function decideThrottle({ prev, hash, nowMs, ttlMs = DEFAULT_THROTTLE_MS }) {
4
... [+1007 chars truncated]

### Assistant | 2026-06-10T17:28:28.799Z

I have everything I need. Let me verify the test actually passes (it's a self-contained subprocess test, independent of Ollama by design) and check for ASCII-guard violations in the added code.

### Assistant | 2026-06-10T17:28:29.626Z

[tool_use: Bash]

### Assistant | 2026-06-10T17:28:31.572Z

[tool_use: Bash]

### User | 2026-06-10T17:28:37.466Z

[tool_result]     # Subtest: every mapped domain is a VALID tribal-rerank domain (no fail-loud regression)
    ok 1 - every mapped domain is a VALID tribal-rerank domain (no fail-loud regression)
      ---
      duration_ms: 0.2667
      ...
    # Subtest: maps the 11 operator-named priority slots to their canonical domains
    ok 2 - maps the 11 operator-named priority slots to their canonical domains
      --
... [+226 chars truncated]

### User | 2026-06-10T17:28:42.770Z

[tool_result] NO non-ASCII in throttle-related lines

### Assistant | 2026-06-10T17:29:28.782Z

Tests pass 51/51 (including the 2 new subprocess throttle tests), and the ASCII scan confirms no non-ASCII characters in any throttle-related line. I have full verification across all 6 review axes.

## Code Quality Analysis Report

### Summary
- Overall Quality Score: 9.5/10
- Files Analyzed: 2 (hook + test); 2 reference files cross-checked (`inject-throttle.mjs`, `master-index-precheck-inject.mjs`)
- Issues Found: 0 P0, 0 P1, 1 P2
- Verdict: **PASS**

The change wires `shouldThrottleInject` into `tribal-by-domain-inject.mjs` exactly as specified. All six verification axes confirmed against live code, and the test suite runs green (51/51) independent of Ollama.

### Axis-by-axis verification

**1. Placement / zero-work-on-throttle — PASS**
The throttle check is at `H:/prism/.claude/hooks/tribal-by-domain-inject.mjs:335`, after `sessionId` resolution (`:326-330`) and before BOTH the CAG `shouldSkip` (`:340`) and `runRerank` (`:353`). A throttled tick (`:336-338`) does `tele("skip_throttled",{...}); approve(); return;` — it never reaches `shouldSkip` (no CAG sidecar read), `runRerank` (no subprocess/Ollama spawn at `:208-209`), `incrementFeature` (`:356`), or any `formatInjection`/emit. Confirmed zero downstream work.

**2. The `0=off` knob — PASS**
The IIFE at `:72-75` reads `parseInt(env ?? "", 10)` and returns `Number.isFinite(n) ? clamp(0,3600000,n) : 60000`. So env `"0"` → `parseInt("0")=0` → finite → `Math.max(0, ...)` = **0** (not coerced to default — the explicit reason `parseInt||default` was avoided). Unset → `parseInt("")=NaN` → not finite → **60000**. Blank/non-numeric (`"abc"`) → NaN → **60000**. The `?? ""` correctly handles unset env. Downstream, `shouldThrottleInject` treats `ttlMs<=0` as never-throttle via `if (!(ttlMs > 0)) return false;` at `inject-throttle.mjs:107` — the `!(x>0)` form also correctly handles negative and NaN. Correct.

**3. Fail-open — PASS**
Missing sessionId: `statePathFor("")` → `safeSessionId` returns `null` (`:34-37`) → `shoul
... [+4962 chars truncated]
