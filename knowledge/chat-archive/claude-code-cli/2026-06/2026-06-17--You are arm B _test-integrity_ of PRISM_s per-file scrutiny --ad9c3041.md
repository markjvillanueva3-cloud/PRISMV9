---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "You are arm B (test-integrity) of PRISM's per-file scrutiny gate. Review H:/pris"
date: "2026-06-17"
first_ts: "2026-06-17T18:43:23.685Z"
last_ts: "2026-06-17T18:44:52.757Z"
cwd: "H:\\prism"
messages: 28
user_msgs: 11
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-ace310a44f27ec2f2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# You are arm B (test-integrity) of PRISM's per-file scrutiny gate. Review H:/pris

> **claude-code-cli** | 2026-06-17 | 28 msgs (11 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-ace310a44f27ec2f2.jsonl`

## Transcript

### User | 2026-06-17T18:43:23.685Z

You are arm B (test-integrity) of PRISM's per-file scrutiny gate. Review H:/prism/scripts/ask-hermes.test.mjs END-TO-END, weighted toward test integrity (R9 — tests verify INTENT, not behavior). 17 new tests were added for L1a parity surfaces: parseArgs (--allow-unsafe / timeoutExplicit), shouldRefuseUnsafe, effectiveTimeout, resolveInput (via dependency injection). The suite shows 43/43 pass.

Verify, flagging P0/P1 with file:line:
1. SELF-VALIDATING FIXTURE: the NC_PROGRAM fixture has a test asserting `looksLikeNcProgram(NC_PROGRAM) === true` (and PLAIN_TEXT === false) so the guard tests can't pass for the wrong reason. Confirm this is real and that NC_PROGRAM is genuinely dense G-code. If the sanity assert were removed, would the guard tests still be meaningful?
2. NO STUB ASSERTS: every assertion is a reference-value/exact/algebraic check, never toBeDefined-style. The effectiveTimeout test asserts `=== scaleTimeoutForBytes(len, base)` (exactness) — confirm this is a real invariant, not a tautology.
3. COVERAGE FLOOR per new function: happy + ≥3 failure modes + ≥2 adversarial. Map which test covers which mode. Is the "text modes are NEVER guarded" case covered? The "real read error propagates vs file-not-found is lenient" distinction? The "pinned --timeout never scaled" case?
4. DI tests genuinely exercise branches: do the injected readFileCapped/readStdin fakes actually drive the truncated-flag propagation, lenient fallthrough, and error propagation paths — or could a test pass without the production logic running?
5. No accidental .skip/.only; no floating promises in async tests (each `await resolveInput(...)`).
6. MISSING failure modes you'd add.
Grade PASS or FAIL. Read-only — do not edit.

### Assistant | 2026-06-17T18:43:28.713Z

I'll review the test file end-to-end, then read the production code it tests to verify the assertions are real invariants.

### Assistant | 2026-06-17T18:43:28.736Z

[tool_use: Read]

### User | 2026-06-17T18:43:29.764Z

[tool_result] 1	#!/usr/bin/env node
2	// Tests for ask-hermes.mjs -- the PRISM->Hermes-proxy bridge pure functions.
3	// (HERMES-BRIDGE-MS0/U-ASK-HERMES). Pure functions only; importing the script
4	// is side-effect-free (isMain is false under the test runner, so main() never
5	// runs and no network call is made).
6	// Run: node --test scripts/ask-hermes.test.mjs
7	import { test } from "node:test";
8	import a
... [+17276 chars truncated]

### Assistant | 2026-06-17T18:43:33.006Z

Now let me read the production code to verify the test assertions are real invariants, not tautologies.

### Assistant | 2026-06-17T18:43:33.495Z

[tool_use: Read]

### User | 2026-06-17T18:43:33.935Z

[tool_result] read-once-guard: 'H:\prism\scripts\ask-hermes.mjs' was already read 13s ago in this session and is unchanged (mtime 1781721535143). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-17T18:43:37.358Z

The guard claims I already read it, but I have not — that was a different file. Let me grep the relevant functions directly to verify the production logic.

### Assistant | 2026-06-17T18:43:38.645Z

[tool_use: Grep]

### Assistant | 2026-06-17T18:43:39.881Z

[tool_use: Grep]

### User | 2026-06-17T18:43:43.253Z

[tool_result] 203:export function parseArgs(argv) {
263:export function shouldRefuseUnsafe({ mode, allowUnsafe, text } = {}) {
270:export function effectiveTimeout({ mode, timeoutExplicit, textLen, base } = {}) {

### User | 2026-06-17T18:43:45.047Z

[tool_result] 158:export function scaleTimeoutForBytes(bytes, base = DEFAULT_TIMEOUT_MS) {
365:export function looksLikeNcProgram(text) {

### Assistant | 2026-06-17T18:43:47.636Z

`resolveInput` wasn't matched by my regex (likely `async function`). Let me read the full bodies of the four new production functions plus the canonical helpers they reuse.

### Assistant | 2026-06-17T18:43:48.384Z

[tool_use: Read]

### User | 2026-06-17T18:43:51.135Z

[tool_result] 203	export function parseArgs(argv) {
204	  const out = {
205	    mode: null, rawInput: null, model: process.env.PRISM_HERMES_MODEL || null,
206	    json: false, timeout: 120000, maxTokens: 1024, fallback: true, url: DEFAULT_URL,
207	    allowUnsafe: false, timeoutExplicit: false,
208	    error: null,
209	  };
210	  const positional = [];
211	  for (let i = 0; i < argv.length; i++) {
212	    const
... [+6243 chars truncated]

### Assistant | 2026-06-17T18:43:54.157Z

I have the full bodies of all four new functions. Now let me verify the canonical helpers `scaleTimeoutForBytes` and `looksLikeNcProgram` to confirm the parity assertions, and check `FILE_MODES`/`MODES`/readers definitions.

### Assistant | 2026-06-17T18:43:55.123Z

[tool_use: Read]

### Assistant | 2026-06-17T18:43:56.043Z

[tool_use: Read]

### User | 2026-06-17T18:43:57.165Z

[tool_result] 365	export function looksLikeNcProgram(text) {
366	  const lines = String(text == null ? "" : text).split(/\r?\n/);
367	  let nonBlank = 0;
368	  let strong = 0;
369	  let cont = 0;
370	  for (const line of lines) {
371	    if (!line.trim()) continue;
372	    nonBlank += 1;
373	    if (NC_BLOCK_RE.test(line) || NC_HEIDENHAIN_RE.test(line)) strong += 1;
374	    else if (NC_COORD_CONT_RE.test(line))
... [+1695 chars truncated]

### User | 2026-06-17T18:43:57.644Z

[tool_result] 158	export function scaleTimeoutForBytes(bytes, base = DEFAULT_TIMEOUT_MS) {
159	  const tokens = Math.ceil(Math.max(0, Number(bytes) || 0) / CHARS_PER_TOKEN);
160	  const need = TIMEOUT_COLD_LOAD_MS + tokens * TIMEOUT_INPUT_MS_PER_TOKEN + TIMEOUT_OUTPUT_BUDGET_MS;
161	  return Math.min(MAX_SCALED_TIMEOUT_MS, Math.max(base, need));
162	}
163	
164	/** Resolve the model for this call: explicit overr
... [+859 chars truncated]

### Assistant | 2026-06-17T18:43:58.179Z

[tool_use: Grep]

### User | 2026-06-17T18:44:00.138Z

[tool_result] 57:import { looksLikeNcProgram, MAX_FILE_BYTES, scaleTimeoutForBytes, readFileCapped, readStdin } from "./ask-ollama.mjs";
66:const MODES = new Set(["ask", "summarize", "explain", "triage", "classify"]);
69:const FILE_MODES = new Set(["summarize", "explain", "triage"]);
233: *  File/stdin reads reuse ask-ollama's CANONICAL readFileCapped/readStdin (DRY -- ONE cap
238:  const _readFileCapped = deps
... [+169 chars truncated]

### Assistant | 2026-06-17T18:44:03.445Z

I now have everything needed to verify each function against its tests. Let me confirm the NC detection threshold constants to validate the fixture density claim, and run the suite to confirm 43/43.

### Assistant | 2026-06-17T18:44:05.284Z

[tool_use: Grep]

### Assistant | 2026-06-17T18:44:05.914Z

[tool_use: Bash]

### User | 2026-06-17T18:44:07.282Z

[tool_result] 325:export const NC_PROGRAM_MIN_LINES = 5;
327:const NC_PROGRAM_MIN_RATIO = 0.3;
332:const NC_STRONG_MIN = 2;
338:const NC_BLOCK_RE = /^\s*(?:[NO]\d+\s+)?[GM]\d{1,3}(?:[\s.]|$|[XYZABCUVWIJKRFSTHD])/i;
348: * Counted ONLY when strong NC context exists (>= NC_STRONG_MIN), so a coordinate data
351:const NC_COORD_CONT_RE = /^\s*(?:[NO]\d+\s+)?[XYZABCUVWIJK][-+]?\d*\.?\d+(?:\s+[XYZABCUVWIJKRF][-+]?\d*\
... [+526 chars truncated]

### User | 2026-06-17T18:44:13.058Z

[tool_result]   ...
# Subtest: resolveInput: a REAL read error (not 'file not found') propagates ok:false (fail loud)
ok 42 - resolveInput: a REAL read error (not 'file not found') propagates ok:false (fail loud)
  ---
  duration_ms: 0.079
  ...
# Subtest: resolveInput: a stdin read failure surfaces ok:false (does not silently empty)
ok 43 - resolveInput: a stdin read failure surfaces ok:false (does not silentl
... [+147 chars truncated]

### Assistant | 2026-06-17T18:44:52.757Z

43/43 pass, 0 skipped, 0 todo. Now I have everything to render a full verdict. Let me cross-check each concern.

**Verification of each test concern:**

1. **Self-validating fixture (lines 264-267):** Real. The sanity test asserts `looksLikeNcProgram(NC_PROGRAM) === true` and `looksLikeNcProgram(PLAIN_TEXT) === false` against the *actually-imported* `looksLikeNcProgram` from `ask-ollama.mjs` (line 22), not a local re-implementation. The fixture is genuinely dense: ~18 `N##`-prefixed modal G/M lines, all matching `NC_BLOCK_RE` (`^\s*(?:[NO]\d+\s+)?[GM]\d...`). Threshold is `NC_PROGRAM_MIN_LINES=5` and ratio `0.3`; this fixture is far above both. If the sanity assert were removed, the guard tests at 269-273 would still be *somewhat* meaningful but could silently degrade to passing-for-the-wrong-reason if a future edit weakened the fixture (e.g. `shouldRefuseUnsafe` would return `false` for `summarize`+sparse-text and the "REFUSED" test would fail loud — so actually it'd fail, not silently pass). The sanity assert's real value is the *inverse*: it pins that the detector itself still flags this exact shape, so a regression in `looksLikeNcProgram` is attributed to the detector, not mis-blamed on the guard wiring. Good defensive design.

2. **No stub asserts:** Confirmed. Every assertion is exact-value (`assert.equal`/`assert.deepEqual`) or regex (`assert.match`). No `toBeDefined`-style. The `effectiveTimeout` test (line 299) asserts `=== scaleTimeoutForBytes(big.length, 120000)`. This is **not** a tautology: the production `effectiveTimeout` (line 271) is `(FILE_MODES.has(mode) && !timeoutExplicit) ? scaleTimeoutForBytes(textLen, base) : base`. The test independently re-invokes the canonical scaler and asserts equality, which proves (a) the file-mode branch was taken, (b) the scaler — not the flat base — was used. The companion `assert.ok(got > 120000)` (line 300) is the anti-tautology guard: it proves the result is genuinely *different* from `base`, so even if both side
... [+4881 chars truncated]
