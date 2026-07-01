---
type: "chat-session"
source: "claude-code-cli"
session_id: "885d585d-959c-404a-8eef-a5542d5006dd"
title: "Review a 4-file diff end-to-end. Grade PASS/FAIL with P0/P1/P2 + file:line. Read"
date: "2026-06-24"
first_ts: "2026-06-24T16:59:36.490Z"
last_ts: "2026-06-24T17:03:29.053Z"
cwd: "H:\\prism"
messages: 71
user_msgs: 27
assistant_msgs: 44
raw_file: "H:/.claude/projects/H--prism/885d585d-959c-404a-8eef-a5542d5006dd/subagents/agent-a686c8e442886e218.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# Review a 4-file diff end-to-end. Grade PASS/FAIL with P0/P1/P2 + file:line. Read

> **claude-code-cli** | 2026-06-24 | 71 msgs (27 user / 44 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/885d585d-959c-404a-8eef-a5542d5006dd/subagents/agent-a686c8e442886e218.jsonl`

## Transcript

### User | 2026-06-24T16:59:36.490Z

Review a 4-file diff end-to-end. Grade PASS/FAIL with P0/P1/P2 + file:line. Read each file fully.

This is alpha Unit B "wire the tiered verified-offload into the canonical offload CLI" + a live-validation fix to the Unit A lib.

FILES:
1. H:/prism/scripts/ollama-offload.mjs -- ADDED `offloadClassifyStrong` + `offloadDigestStrong` (route the existing classify/digest prompts through `verifiedTieredOffload` Hermes->Ollama->same-safe-fallback) + CLI modes `classify-strong`/`digest-strong` + an import of the tiered lib. The existing offloadClassify/offloadDigest/offloadFilesDigest + their CLI modes must be UNCHANGED.
2. H:/prism/scripts/ollama-offload.test.mjs -- ADDED 9 hermetic tests for the strong variants (injected hermesRunImpl/ollamaRunImpl/record). Existing tests unchanged. Full suite passes 24/24.
3. H:/prism/scripts/lib/verified-offload-tiered.mjs -- FIX: makeHermesRunner now defaults `model` to DEFAULT_HERMES_MODEL (env PRISM_HERMES_MODEL || PRISM_HERMES_FALLBACK_MODEL || "grok-4.3") + a null/"" guard. (Live validation found the CLI sent model:undefined -> Hermes proxy rejected -> strong tier silently descended. Now the strong tier fires.)
4. H:/prism/scripts/lib/verified-offload-tiered.test.mjs -- ADDED a regression test pinning "no model -> still sends a real model id". Suite 20/20.

VERIFY (cite file:line):
1. The strong functions build the SAME prompt as offloadClassify/offloadDigest and feed it to BOTH runners; the fallback is the SAME safe floor (classify->null or opts.fallback; digest->truncated raw). Confirm no behavior change to the non-strong paths.
2. The model-default fix is correct and cannot regress the explicit-model case (default param triggers only on undefined; the extra `if(!model)` guards null/""). Confirm an explicit model still flows through.
3. CLI arg parsing for classify-strong (text + allowed[]) and digest-strong (@file read) matches the existing classify/digest modes' parsing exactly; the usage string lists the new modes.
4. The 9 ne
... [+554 chars truncated]

### Assistant | 2026-06-24T16:59:39.628Z

I'll review this 4-file diff end-to-end. Let me start by reading all four files plus the dependencies they couple to.

### Assistant | 2026-06-24T16:59:40.082Z

[tool_use: Read]

### Assistant | 2026-06-24T16:59:40.272Z

[tool_use: Read]

### User | 2026-06-24T16:59:43.436Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/ollama-offload.mjs
3	// U-VERIFIED-OFFLOAD-CONSUMER (2026-06-09, slot:alpha): the FIRST live consumer of
4	// the verifiedOffload keystone (scripts/lib/ollama-verified-offload.mjs) -- a
5	// reusable, fleet-callable offload primitive that runs a task on LOCAL Ollama and
6	// returns the result ONLY when a code verifier passes, else a safe fallback. This
7	// is t
... [+12093 chars truncated]

### User | 2026-06-24T16:59:43.763Z

[tool_result] 1	// scripts/lib/verified-offload-tiered.mjs
2	// U-HERMES-VERIFIED-TIER (2026-06-24, slot:alpha): the TIERED form of the
3	// verified-offload keystone (./ollama-verified-offload.mjs). Closes the verified
4	// gap "the Hermes lane is BUILT + instrumented but DARK": ask-hermes.mjs records
5	// byHook["ask-hermes"] into the canonical offload-stats, yet NOTHING automated
6	// invokes the strong lane
... [+11253 chars truncated]

### Assistant | 2026-06-24T16:59:46.763Z

Now let me read the two test files and the dependencies (verifiedOffload, ask-hermes, ollama-fanout) to verify contracts.

### Assistant | 2026-06-24T16:59:47.272Z

[tool_use: Read]

### Assistant | 2026-06-24T16:59:47.813Z

[tool_use: Read]

### Assistant | 2026-06-24T16:59:48.033Z

[tool_use: Read]

### User | 2026-06-24T16:59:49.011Z

[tool_result] 1	// scripts/ollama-offload.test.mjs
2	// U-VERIFIED-OFFLOAD-CONSUMER (2026-06-09, slot:alpha): the offload primitives must
3	// (1) accept an Ollama classification ONLY if it's in the allowed enum, (2) fall
4	// back safely on a hallucinated label / empty result, (3) always hand the digest
5	// caller a usable string. Hermetic via injected runImpl -- NO network (R9).
6	import { test } from "node:
... [+10515 chars truncated]

### User | 2026-06-24T16:59:49.784Z

[tool_result] 1	// R9 coverage for the tiered verified-offload ladder (Hermes -> Ollama -> fallback).
2	// Pins the SAFETY + TIERING contract of verified-offload-tiered.mjs:
3	//   - the verifier gates EVERY tier (a hallucinated STRONG answer is rejected,
4	//     never trusted -- the load-bearing safety invariant);
5	//   - strong success short-circuits (Ollama never called);
6	//   - empty / throw / verify-fa
... [+11000 chars truncated]

### User | 2026-06-24T16:59:49.906Z

[tool_result] 1	// scripts/lib/ollama-verified-offload.mjs
2	// U-VERIFIED-OFFLOAD (2026-06-09, slot:alpha): the keystone that makes Ollama
3	// AUTO-offload safe at "100% accuracy". Spec: state/shared/specs/OLLAMA-VERIFIED-OFFLOAD.md
4	//
5	// THE INSIGHT: a local LLM is NOT 100% accurate generatively. You get 100% NET
6	// accuracy only by WRAPPING the offload in code that VERIFIES the output, with a
7	// fai
... [+5476 chars truncated]

### Assistant | 2026-06-24T16:59:53.715Z

Now let me verify the ask-hermes.mjs contract (`buildChatBody`, `parseChatResponse`, `tallyUsage`, `estimateHermesSaved`) and check the import cycle question. Let me also confirm the exact non-strong prompt strings match and check for any pre-existing offload-stats schema coupling.

### Assistant | 2026-06-24T16:59:53.816Z

[tool_use: Read]

### User | 2026-06-24T16:59:54.930Z

[tool_result] read-once-guard: 'H:\prism\scripts\ask-hermes.mjs' was already read 26m ago in this session and is unchanged (mtime 1782009963464). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-24T16:59:57.387Z

The guard says I read it 26m ago, but this is a fresh task. Let me grep the specific exported symbols to verify their signatures rather than re-reading the whole file.

### Assistant | 2026-06-24T16:59:58.686Z

[tool_use: Grep]

### User | 2026-06-24T17:00:01.250Z

[tool_result] 126:export function buildChatBody({ mode, input, model, maxTokens }) {
127-  const sys = systemPromptFor(mode);
128-  return {
129-    model,
130-    messages: [
131-      { role: "system", content: sys },
132-      { role: "user", content: String(input ?? "") },
133-    ],
134-    max_tokens: Number.isFinite(maxTokens) && maxTokens > 0 ? maxTokens : 1024,
135-    stream: false,
136-  };
137-}
138
... [+2669 chars truncated]

### Assistant | 2026-06-24T17:00:04.123Z

I notice something important on line 211. Let me look at that more closely — there appears to be a stray backslash that could be a syntax issue. Let me read that exact region.

### Assistant | 2026-06-24T17:00:04.941Z

[tool_use: Read]

### User | 2026-06-24T17:00:06.193Z

[tool_result] 203	export function tallyUsage(stats, { source, mode, now, tokensSaved } = {}) {
204	  if (!stats || typeof stats !== "object") stats = {};
205	  if (!stats.byHook || typeof stats.byHook !== "object") stats.byHook = {};
206	  const h = stats.byHook[HOOK_KEY] || { fired: 0, offloaded: 0, kept: 0, suggested: 0, tokensSaved: 0, bySource: {}, byMode: {} };
207	  h.fired = (h.fired | 0) + 1;
208	  cons
... [+2130 chars truncated]

### Assistant | 2026-06-24T17:00:11.404Z

Good — line 211 is correct (`// U-OLLAMA...`); the earlier `\` in the grep output was a rendering artifact of the grep tool, not a real character. The ask-hermes contract is confirmed: `buildChatBody({mode,input,model,maxTokens})`, `parseChatResponse` returns `{ok,content}`, `tallyUsage(stats, {source,mode,tokensSaved})`, `estimateHermesSaved(input,output)`.

Now let me verify the import cycle concern and confirm ollama-fanout exports `callOllamaOnce`, and check whether ask-hermes imports back into ollama-offload (cycle risk).

### Assistant | 2026-06-24T17:00:12.823Z

[tool_use: Grep]

### Assistant | 2026-06-24T17:00:14.063Z

[tool_use: Grep]

### User | 2026-06-24T17:00:18.151Z

[tool_result] 57:import { readFileSync, existsSync, writeFileSync, renameSync } from "node:fs";
58:import { fileURLToPath } from "node:url";
59:import { dirname, resolve } from "node:path";
60:import { execFile } from "node:child_process";
61:import { promisify } from "node:util";
65:import { looksLikeNcProgram, MAX_FILE_BYTES, scaleTimeoutForBytes, readFileCapped, readStdin, loadGraph, searchGraph, renderHits,
... [+197 chars truncated]

### User | 2026-06-24T17:00:19.400Z

[tool_result] No matches found

### Assistant | 2026-06-24T17:00:24.530Z

`callOllamaOnce` isn't matched by my pattern (likely `export const` or `export async function`). Let me confirm it exists and check ollama-fanout's imports for cycle risk, and verify ask-hermes does not import ollama-offload.mjs.

### Assistant | 2026-06-24T17:00:25.944Z

[tool_use: Grep]

### Assistant | 2026-06-24T17:00:26.892Z

[tool_use: Grep]

### Assistant | 2026-06-24T17:00:27.946Z

[tool_use: Grep]

### User | 2026-06-24T17:00:28.569Z

[tool_result] 39:export async function callOllamaOnce(prompt, opts = {}) {
97:        callOllamaOnce(task.prompt, opts).then((res) => {
132:// (and could loop). callOllamaOnce surfaces: raw exception messages (fetch failed / ECONNREFUSED
139:  /\bhttp-error\b/i,   // callOllamaOnce's no-status sentinel (treated as transport failure)
143: * Classify a callOllamaOnce error string. "connection" => Ollama is unreac
... [+12 chars truncated]

### User | 2026-06-24T17:00:29.621Z

[tool_result] Found 40 files
scripts\synergy-ask.test.mjs
scripts\lib\verified-offload-tiered.mjs
scripts\ollama-offload.test.mjs
scripts\ollama-offload.mjs
scripts\hermes-vault-digest.mjs
scripts\hermes-vault-digest.test.mjs
scripts\reconcile-zulu-ledger.mjs
scripts\seed-ghost-nodes.mjs
scripts\__tests__\ollama-offload-dashboard.test.mjs
scripts\ollama-offload-dashboard.mjs
scripts\ask-ollama.mjs
scripts\ask-h
... [+1050 chars truncated]

### User | 2026-06-24T17:00:30.751Z

[tool_result] No matches found

### Assistant | 2026-06-24T17:00:37.505Z

Cycle question resolved: `ask-hermes.mjs` imports `./ask-ollama.mjs` and `./lib/ollama-search-rerank.mjs` (lines 65, 68) but NOT `ollama-offload.mjs`. `ollama-fanout.mjs` has no `^import` matches (no static imports of offload). The 40-file grep for "ollama-offload" hits are mostly comment references / consumers; the only ones in the dependency chain of the changed files are the changed files themselves. No cycle back to `ollama-offload.mjs`.

Let me confirm `ollama-fanout.mjs` and `ask-ollama.mjs` don't transitively import `ollama-offload.mjs`, and check the offload-stats schema (`HOOK_KEY`) so I can verify the `digest`/`summarize` mode tag is consistent.

### Assistant | 2026-06-24T17:00:38.456Z

[tool_use: Grep]

### Assistant | 2026-06-24T17:00:39.430Z

[tool_use: Grep]

### User | 2026-06-24T17:00:41.548Z

[tool_result] No matches found

### User | 2026-06-24T17:00:42.479Z

[tool_result] 101:const HOOK_KEY = "ask-hermes";

### Assistant | 2026-06-24T17:00:46.762Z

No cycle (ask-ollama.mjs doesn't import either offload file). HOOK_KEY confirmed `"ask-hermes"`, matching the dashboard's `byHook["ask-hermes"]`.

Now let me run the two test suites to confirm the claimed 24/24 and 20/20, and that ASCII-only holds. Let me also do a precise diff of the strong-prompt vs non-strong prompt strings.

### Assistant | 2026-06-24T17:00:47.696Z

[tool_use: Bash]

### Assistant | 2026-06-24T17:00:48.611Z

[tool_use: Bash]

### User | 2026-06-24T17:00:53.273Z

[tool_result]   ...
# Subtest: offloadDigestStrong: Hermes non-empty summary -> source hermes, verified
ok 23 - offloadDigestStrong: Hermes non-empty summary -> source hermes, verified
  ---
  duration_ms: 0.1345
  ...
# Subtest: offloadDigestStrong: both tiers fail -> truncated raw fallback (caller always gets content)
ok 24 - offloadDigestStrong: both tiers fail -> truncated raw fallback (caller always gets c
... [+160 chars truncated]

### User | 2026-06-24T17:00:58.117Z

[tool_result]   ...
# Subtest: recordTieredUsage: MISSING stats file -> false (never creates a parallel store)
ok 19 - recordTieredUsage: MISSING stats file -> false (never creates a parallel store)
  ---
  duration_ms: 0.1352
  ...
# Subtest: recordTieredUsage: garbage (non-JSON) stats file -> false, never throws
ok 20 - recordTieredUsage: garbage (non-JSON) stats file -> false, never throws
  ---
  duration_m
... [+133 chars truncated]

### Assistant | 2026-06-24T17:01:02.576Z

Both suites pass: 24/24 and 20/20. Now let me verify the model-default regression test genuinely fails on revert, and confirm ASCII-only across all 4 changed files. Let me also verify the prompt strings are byte-identical between strong and non-strong.

### Assistant | 2026-06-24T17:01:10.447Z

[tool_use: Bash]

### Assistant | 2026-06-24T17:01:10.817Z

[tool_use: Bash]

### User | 2026-06-24T17:01:16.280Z

[tool_result] grep: -P supports only unibyte and UTF-8 locales
ASCII-OK: scripts/ollama-offload.mjs
grep: -P supports only unibyte and UTF-8 locales
ASCII-OK: scripts/ollama-offload.test.mjs
grep: -P supports only unibyte and UTF-8 locales
ASCII-OK: scripts/lib/verified-offload-tiered.mjs
grep: -P supports only unibyte and UTF-8 locales
ASCII-OK: scripts/lib/verified-offload-tiered.test.mjs

### User | 2026-06-24T17:01:28.589Z

[tool_result] --- classify prompts ---
51:    `Classify the following into EXACTLY ONE of these categories: ${allowed.join(", ")}.\n` +
95:    `Classify the following into EXACTLY ONE of these categories: ${allowed.join(", ")}.\n` +
--- digest/summarize prompts ---
72:    `Summarize the following in <= ${maxWords} words, plain prose, no preamble:\n\n---\n${src.slice(0, 16000)}\n---`;
120:    `Summarize the foll
... [+94 chars truncated]

### Assistant | 2026-06-24T17:01:31.892Z

The `-P` failed due to locale. Let me redo the ASCII check with a portable method and verify the regression test fails on revert of the model default.

### Assistant | 2026-06-24T17:01:33.987Z

[tool_use: Bash]

### User | 2026-06-24T17:01:40.873Z

[tool_result] ASCII-OK: scripts/ollama-offload.mjs
ASCII-OK: scripts/ollama-offload.test.mjs
ASCII-OK: scripts/lib/verified-offload-tiered.mjs
ASCII-OK: scripts/lib/verified-offload-tiered.test.mjs

### Assistant | 2026-06-24T17:01:44.627Z

All four files are ASCII-only. Now let me prove the regression test would FAIL if the model-default fix were reverted. I'll simulate the revert in an isolated copy and run just that test.

### Assistant | 2026-06-24T17:01:50.044Z

[tool_use: Bash]

### User | 2026-06-24T17:01:55.625Z

[tool_result] === verify the revert took (should show 'model, url' and NO if(!model) guard) ===
72:export function makeHermesRunner({ mode = "ask", input = "", model, url = DEFAULT_HERMES_URL, token = DEFAULT_HERMES_TOKEN, timeoutMs = DEFAULT_TIMEOUT_MS, maxTokens, fetchImpl } = {}) {
0
guard removed: 0
TMP=/tmp/tmp.JgQ8CJYwFN

### Assistant | 2026-06-24T17:01:59.129Z

The revert took (default param removed, guard line removed). Now let me run the specific regression test against the reverted lib. I'll write a tiny harness that imports the reverted lib and runs the same assertion.

### Assistant | 2026-06-24T17:02:06.409Z

[tool_use: Bash]

### User | 2026-06-24T17:02:07.314Z

[tool_result] 🛑 BLOCKED: rm -rf on absolute root path
  Command: cd /h/prism
# Build a minimal harness next to the real lib so its relative imports (./ollama-verified-offload.mjs, ./ollama-fanout.mjs, ../ask-hermes.mjs) resolve.
# Strategy: copy reverted lib OVER the real one temporarily? No -- non-destructive. Instead place the reverted copy in scripts/lib/ with a temp name and patch its imports are already re
... [+1184 chars truncated]

### Assistant | 2026-06-24T17:02:11.195Z

The `rm -rf /tmp/...` tripped the safety guard and blocked the whole command. Let me re-run without the `rm -rf`, using the env-var temp dir already cleaned by the harness, and clean up the probe files with plain `rm -f`.

### Assistant | 2026-06-24T17:02:18.494Z

[tool_use: Bash]

### User | 2026-06-24T17:02:26.849Z

[tool_result] signature after revert:
72:export function makeHermesRunner({ mode = "ask", input = "", model, url = DEFAULT_HERMES_URL, token = DEFAULT_HERMES_TOKEN, timeoutMs = DEFAULT_TIMEOUT_MS, maxTokens, fetchImpl } = {}) {
0
sentModel: undefined typeof: undefined
REGRESSION CAUGHT: reverted lib sends a non-string model -> test FAILS as required
=== EXIT 1 ===
cleaned up: none

### Assistant | 2026-06-24T17:02:33.254Z

Confirmed. With the model-default fix reverted, `makeHermesRunner` sends `model: undefined` (typeof `undefined`), which makes the regression test's `assert.equal(typeof sentModel, "string")` and `assert.ok(sentModel.length > 0)` FAIL. The regression test is genuine and load-bearing. Probe files cleaned up.

Now let me verify the two remaining contract points: (1) the explicit-model case still flows through unchanged (default param only fires on `undefined`, guard only on null/""), and (2) confirm the non-strong CLI parsing for classify-strong/digest-strong matches the originals exactly. Both are visible from the source I already read. Let me do a final check on one subtle item — the `digest`/`summarize` mode-tag asymmetry and whether `offloadFilesDigest` (an existing path) was truly left unchanged.

### Assistant | 2026-06-24T17:02:36.126Z

[tool_use: Bash]

### User | 2026-06-24T17:02:41.841Z

[tool_result] === git diff stat for the 4 files (vs HEAD) ===
 scripts/lib/verified-offload-tiered.mjs      |  9 ++-
 scripts/lib/verified-offload-tiered.test.mjs |  8 +++
 scripts/ollama-offload.mjs                   | 73 +++++++++++++++++++++-
 scripts/ollama-offload.test.mjs              | 91 +++++++++++++++++++++++++++-
 4 files changed, 178 insertions(+), 3 deletions(-)

=== Did the non-strong functions / 
... [+156 chars truncated]

### Assistant | 2026-06-24T17:02:45.262Z

The git diff confirms the changes are almost purely additive (178 insertions, 3 deletions). Let me see exactly what those 3 deletions are to confirm none touch non-strong behavior.

### Assistant | 2026-06-24T17:02:46.358Z

[tool_use: Bash]

### User | 2026-06-24T17:02:51.136Z

[tool_result] === All deletion (-) lines across the 4 files, with context ===
-export function makeHermesRunner({ mode = "ask", input = "", model, url = DEFAULT_HERMES_URL, token = DEFAULT_HERMES_TOKEN, timeoutMs = DEFAULT_TIMEOUT_MS, maxTokens, fetchImpl } = {}) {
-  process.stderr.write("modes: classify | digest | digest-files\n");

### Assistant | 2026-06-24T17:03:01.476Z

This confirms the full picture. The only two deletions are:
1. The `makeHermesRunner` signature change (`model` → `model = DEFAULT_HERMES_MODEL`) — the intended fix.
2. The CLI usage string (`modes: classify | digest | digest-files` → now includes `classify-strong | digest-strong`).

Both are exactly as described. No non-strong function body, no existing CLI mode parsing, and `offloadFilesDigest` were touched. Every other change is an insertion.

Let me do one final integration verification — confirm the strong-tier descend path correctly handles the `HERMES_FELLBACK` sentinel without it leaking into a verified value, and confirm `verifiedOffload`'s `value` extraction (line 79) can never return the sentinel as a result. This is the one subtle silent-breakage risk I want to rule out: if Hermes returns the sentinel value through the verifier.

The strong tier (verified-offload-tiered.mjs:175) passes `fallback: async () => HERMES_FELLBACK` to `verifiedOffload`. The sentinel is only ever returned via the fallback path (`fellBack: true`), and the code at line 176 checks `if (!h.fellBack)` before using `h.value` — so the sentinel can only be reached when `fellBack` is true, which routes to descend. The sentinel is a `Symbol`, never produced by `hermesRun` (which returns strings), so the verifier never sees it. This path is correct.

Let me verify there are no other callers of `makeHermesRunner` in the repo that relied on the old `model: undefined` default behavior (blast radius of the signature change).

### Assistant | 2026-06-24T17:03:02.243Z

[tool_use: Grep]

### User | 2026-06-24T17:03:04.783Z

[tool_result] scripts\ollama-offload.mjs:29:import { verifiedTieredOffload, makeHermesRunner, makeOllamaRunner } from "./lib/verified-offload-tiered.mjs";
scripts\ollama-offload.mjs:100:    hermesRun: opts.hermesRunImpl ? () => opts.hermesRunImpl(prompt) : makeHermesRunner({ mode: "classify", input: prompt, model: opts.hermesModel }),
scripts\ollama-offload.mjs:124:    hermesRun: opts.hermesRunImpl ? () => opts
... [+2316 chars truncated]

### Assistant | 2026-06-24T17:03:29.053Z

`makeHermesRunner` is exported and used only within these two changed files plus their tests — no external consumers. The signature change (adding a default for `model`) is backward-compatible: callers passing an explicit model are unaffected (default params only fire on `undefined`), and callers passing nothing/null now get the safe default. The blast radius is fully contained.

I've now completed all six verification points. Let me consolidate.

## Verification results

**1. Strong functions build the SAME prompt + SAME safe floor — confirmed.**
- Classify prompt is byte-identical (`ollama-offload.mjs:51` vs `:95`); digest/summarize prompt byte-identical (`:72` vs `:120`).
- Classify fallback floor identical: `offloadClassify:57` and `offloadClassifyStrong:99` both `opts.fallback() ?? null`; verifier `enumMember(allowed)` identical (`:56`/`:98`).
- Digest fallback floor identical: both `src.slice(0, opts.fallbackChars || 400)` (`:77`/`:123`); verifier `nonEmptyText(opts.minLen||12)` identical (`:76`/`:122`).
- Non-strong paths unchanged: git diff shows only 2 deletions in `ollama-offload.mjs` (the usage string at `:220`) and `verified-offload-tiered.mjs` (the `makeHermesRunner` signature). `offloadClassify`/`offloadDigest`/`offloadFilesDigest` bodies untouched.

**2. Model-default fix correct, cannot regress explicit-model — confirmed.** `verified-offload-tiered.mjs:72` default param fires only on `undefined`; `:73` `if(!model)` guards null/"". Test `verified-offload-tiered.test.mjs:170` proves an explicit `model:"grok-4.3"` still flows through. I empirically reverted the fix in an isolated copy: `makeHermesRunner` then sent `model: undefined` and the regression test FAILED (exit 1) as required.

**3. CLI parsing matches the originals exactly — confirmed.** `classify-strong` (`:206-211`) mirrors `classify` (`:184-189`) byte-for-byte (`[text, ...allowed]`, same empty guard). `digest-strong` (`:213-218`) mirrors `digest` (`:191-196`) including the `@file` read with 
... [+2567 chars truncated]
