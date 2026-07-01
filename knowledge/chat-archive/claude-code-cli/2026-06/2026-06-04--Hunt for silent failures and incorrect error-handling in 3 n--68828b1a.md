---
type: "chat-session"
source: "claude-code-cli"
session_id: "68828b1a-52ea-4665-adc2-3915276169b4"
title: "Hunt for silent failures and incorrect error-handling in 3 new files that route "
date: "2026-06-04"
first_ts: "2026-06-04T20:27:10.766Z"
last_ts: "2026-06-04T20:32:26.705Z"
cwd: "H:\\prism"
messages: 33
user_msgs: 12
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/68828b1a-52ea-4665-adc2-3915276169b4/subagents/agent-a60ccfb66832d014d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Hunt for silent failures and incorrect error-handling in 3 new files that route 

> **claude-code-cli** | 2026-06-04 | 33 msgs (12 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/68828b1a-52ea-4665-adc2-3915276169b4/subagents/agent-a60ccfb66832d014d.jsonl`

## Transcript

### User | 2026-06-04T20:27:10.766Z

Hunt for silent failures and incorrect error-handling in 3 new files that route the mechanical LLM step of high-ROI slash commands to a LOCAL Ollama model (free) instead of Claude, via scripts/ask-ollama.mjs.

Files (read each fully):
1. H:\prism\scripts\lib\command-ollama-routes.mjs — frozen registry + pure lookups.
2. H:\prism\scripts\trigger-command-pipeline.mjs — runner: planPipeline/buildStepArgv/resolveStepInput (pure) + runStep (shells out to ask-ollama via injected execFile) + main().
3. H:\prism\scripts\trigger-command-pipeline.test.mjs — node:test (28 tests passing).

Contract facts:
- ask-ollama.mjs real modes: viz/ask/summarize/explain/triage. It emits --json: file modes → {answer}; viz → {hits:[...]}; viz --synth failure → {ollamaError, hits}. Non-zero exit → stderr carries the reason.
- runStep MUST NEVER throw on a failed step — it must surface the reason and the caller returns a non-zero exit.

Specifically check for silent failures:
- runStep result-shape branching (scripts/trigger-command-pipeline.mjs): does EVERY ask-ollama JSON shape map to the right ok/fail? Look hard at: {answer} present, non-empty {hits}, empty {hits} with no error, {ollamaError} with empty hits, {ollamaError} with real hits, non-JSON stdout, and a thrown exec error with/without .stderr. Any path that returns ok:true when it should fail, or swallows an error?
- main(): if ANY step fails, does the process exit non-zero (3)? Is the --json path's exit code correct?
- planPipeline: a cli-arg step with no arg returns a per-step {error}; does main() refuse to execute a plan that has any step error (rather than running a broken subset)?
- Any place a malformed registry entry would cause a silent wrong result instead of a loud failure.

Report P0/P1/P2 with file:line. Grade PASS or FAIL. State explicitly if no P0/P1 found.

### Assistant | 2026-06-04T20:27:34.042Z

I'll audit these 3 files for silent failures and incorrect error handling. Let me read each one fully.

### Assistant | 2026-06-04T20:27:34.657Z

[tool_use: Read]

### Assistant | 2026-06-04T20:27:36.590Z

[tool_use: Read]

### Assistant | 2026-06-04T20:27:36.596Z

[tool_use: Read]

### User | 2026-06-04T20:27:42.742Z

[tool_result] 1	// scripts/lib/command-ollama-routes.mjs
2	//
3	// COMMAND → OLLAMA ROUTE REGISTRY (BLACKWELL-TOKEN-SYNERGY-MS0 / U-CMD-OLLAMA-ROUTE,
4	// slot:bravo, 2026-06-04).
5	//
6	// THE PROBLEM this closes: `ollama-pipeline-injector.mjs` (UserPromptSubmit hook)
7	// only *suggests* Ollama routes as advisory prose in the prompt context. The live
8	// telemetry says that approach does not work — take-rate
... [+12561 chars truncated]

### User | 2026-06-04T20:27:43.701Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/trigger-command-pipeline.mjs
3	//
4	// TRIGGER A HIGH-ROI COMMAND PIPELINE + OFFLOAD ITS MECHANICAL LLM STEP TO OLLAMA
5	// (BLACKWELL-TOKEN-SYNERGY-MS0 / U-CMD-OLLAMA-ROUTE, slot:bravo, 2026-06-04).
6	//
7	// Consumes the command→Ollama route registry (scripts/lib/command-ollama-routes.mjs)
8	// and turns the previously-advisory Ollama nudge into a single determ
... [+13855 chars truncated]

### User | 2026-06-04T20:27:43.704Z

[tool_result] 1	// scripts/trigger-command-pipeline.test.mjs
2	//
3	// Tests for the command→Ollama route registry (scripts/lib/command-ollama-routes.mjs)
4	// AND the trigger runner (scripts/trigger-command-pipeline.mjs). node:test.
5	//
6	// Covers: the anti-drift contract (registry modes == ask-ollama's real modes),
7	// every cited backing script existing on disk (R12 real-data check), the pure
8	// plan bu
... [+12382 chars truncated]

### Assistant | 2026-06-04T20:27:54.400Z

I have all three files. Now let me verify the actual contract by reading `ask-ollama.mjs` — the critical question is what JSON shapes it actually emits, because the entire `runStep` branching correctness depends on it. I must verify the contract rather than trust the comments (CLAUDE.md "verify actual contract" doctrine).

### Assistant | 2026-06-04T20:27:54.908Z

[tool_use: Read]

### User | 2026-06-04T20:28:01.857Z

[tool_result] read-once-guard: 'H:\prism\scripts\ask-ollama.mjs' was already read 18m ago in this session and is unchanged (mtime 1780587272687). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-04T20:28:08.957Z

The guard says it's already in context, but I don't actually have its content in this conversation. Let me grep for the exact JSON emission shapes to verify the contract.

### Assistant | 2026-06-04T20:28:10.283Z

[tool_use: Grep]

### User | 2026-06-04T20:28:20.842Z

[tool_result] 7: * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
13: *                      Default: returns compact hits (fast, no model).
14: *                      --synth: also adds an Ollama-synthesized answer.
21: *   --synth            viz: add an Ollama-synthesized answer on top of hits
24: *   --max-hits <n>     viz: graph hits to keep (default 12, cap 50)
32: *      WITH --s
... [+2707 chars truncated]

### Assistant | 2026-06-04T20:28:25.657Z

Now I have the real ask-ollama contract. Let me verify the critical exit-code path and the `callOllama`/file-mode error shape, since runStep's `{answer}` branch depends on whether a file-mode failure throws (non-zero exit) or emits JSON.

### Assistant | 2026-06-04T20:28:26.453Z

[tool_use: Read]

### User | 2026-06-04T20:28:37.084Z

[tool_result] 340	  }
341	  if (tooLarge.length) {
342	    return {
343	      ok: false,
344	      error:
345	        `system-viz graph too large to parse safely: ${tooLarge.join(", ")} ` +
346	        `exceed the ${Math.round(MAX_GRAPH_BYTES / BYTES_PER_MB)} MB cap — regenerate the ` +
347	        `compact architecture graph with: node scripts/generate-system-viz.mjs`,
348	    };
349	  }
350	  return { ok: fal
... [+5340 chars truncated]

### Assistant | 2026-06-04T20:28:48.392Z

Now let me see the critical part: what happens in file modes (summarize/explain/triage) when `callOllama` fails — does it emit JSON or exit non-zero? This determines whether runStep's `{answer}` branch is the only success path for file modes, and whether a file-mode failure correctly reaches the catch. Let me read lines 595-636.

### Assistant | 2026-06-04T20:28:49.184Z

[tool_use: Read]

### User | 2026-06-04T20:29:11.348Z

[tool_result] 544	/**
545	 * Execute one request. All I/O goes through injected deps so the whole
546	 * function is unit-testable. Returns { exitCode, output }; the caller
547	 * prints + exits.
548	 */
549	export async function runRequest(parsed, deps = {}) {
550	  const { mode, input, flags } = parsed;
551	  // Host-aware model selection (BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-SYNTH-CONSUMERS).
552	  // An explici
... [+4521 chars truncated]

### Assistant | 2026-06-04T20:29:24.646Z

Now I have the complete, verified contract. This is the critical finding. Let me trace the exact failure paths carefully.

**The full ask-ollama output contract (verified from source):**

| Scenario | exitCode | stdout/stderr | JSON shape |
|----------|----------|---------------|------------|
| viz no-synth, hits found | 0 | stdout | `{mode, synth:false, scanned, hits:[...]}` |
| viz no-synth, no hits | 0 | stdout | `{mode, synth:false, scanned, hits:[]}` |
| viz --synth fail | 0 | **stdout** | `{mode, synth:true, model, ollamaError, scanned, hits:[...]}` |
| viz --synth ok | 0 | stdout | `{mode, synth:true, model, answer, scanned, hitCount}` |
| ask ok | 0 | stdout | `{mode, model, answer}` |
| ask fail (`!gen.ok`) | **3** | **stderr** | `[ask-ollama] <error>` (NOT JSON) |
| file mode read-fail | **2** | **stderr** | `[ask-ollama] <error>` (NOT JSON) |
| file mode gen-fail | **3** | **stderr** | `[ask-ollama] <error>` (NOT JSON) |
| usage error | 2 | stderr | `[ask-ollama] <error>` (NOT JSON) |

The key insight: **on any non-zero exit, ask-ollama prints a plain-text `[ask-ollama] ...` banner to stderr — NEVER JSON.** `execFile` rejects on non-zero exit, so runStep's `catch` fires with `e.stderr` = that banner. That path is handled correctly (line 224).

Now let me trace the one path the task explicitly flags. Let me examine the `viz --synth` failure (`ollamaError` with non-empty hits) against runStep's branch order.

### Assistant | 2026-06-04T20:29:25.057Z

[tool_use: Read]

### User | 2026-06-04T20:29:38.058Z

[tool_result] 191	export async function runStep(argv, deps = {}) {
192	  const {
193	    execFileImpl = execFileAsync,
194	    nodeBin = process.execPath,
195	    askOllamaPath = ASK_OLLAMA,
196	  } = deps;
197	  try {
198	    const { stdout } = await execFileImpl(nodeBin, [askOllamaPath, ...argv], {
199	      timeout: STEP_TIMEOUT_MS,
200	      maxBuffer: STEP_MAX_BUFFER,
201	    });
202	    const text = Strin
... [+1511 chars truncated]

### Assistant | 2026-06-04T20:29:55.162Z

Now I have everything needed to trace every branch precisely. Let me do the exhaustive shape-by-shape analysis.

**runStep branch-order trace against the verified contract:**

1. **`{answer}` present** (file ok, ask ok, viz --synth ok) → line 210 `ok:true`. ✓ Correct.
2. **viz no-synth, non-empty hits** `{hits:[...]}` → line 213 `ok:true`. ✓ Correct.
3. **viz --synth FAIL** `{ollamaError, hits:[...]}` (exit 0, stdout) → line 213 matches first (hits non-empty) → `ok:true` rendering the hits, ollamaError ignored. ✓ This is the documented intended behavior — hits are the value, synth was a bonus. Correct per contract.
4. **viz --synth FAIL with empty hits** `{ollamaError, hits:[]}` → line 213 skipped (empty), line 217 `ollamaError` → `ok:false`. ✓ Correct (matches test line 224-229).
5. **viz no-synth, empty hits** `{hits:[], synth:false}` no ollamaError → line 217 skipped, line 219 `ok:true` "(no matching graph nodes)". ✓ Correct — search ran, found nothing, not an error.
6. **non-JSON stdout** → JSON.parse throws → line 208 `ok:true` raw. This only happens on exit 0; ask-ollama always emits JSON with `--json`, so this is a defensive fallback. ✓ Acceptable.
7. **thrown exec error (non-zero exit)** with `.stderr` → line 224 surfaces stderr. ✓ Correct. All ask-ollama non-zero exits write the `[ask-ollama]` banner to stderr.
8. **thrown exec error without `.stderr`** → falls back to `e.message` then `String(e)`. ✓ Correct.

Now the subtle ones the task wants me to look hard at. Let me check edge cases that the branch order could mishandle.

**Edge A — `parsed.answer` could be an empty string.** ask-ollama guarantees non-empty answer (`callOllama` returns `ok:false` on empty response, so `gen.text` is always non-empty when it reaches the `{answer}` emission). So `answer:""` never occurs from real ask-ollama. But `parsed.answer != null` would treat `answer:""` as success if it ever appeared. Not reachable via real contract. Minor robustness note, not a bug.

**Edge B — viz
... [+291 chars truncated]

### Assistant | 2026-06-04T20:29:55.717Z

[tool_use: Read]

### User | 2026-06-04T20:30:13.173Z

[tool_result] 262	async function main() {
263	  const opts = parseArgs(process.argv.slice(2));
264	
265	  if (opts.list) {
266	    console.log(renderList());
267	    return 0;
268	  }
269	  if (!opts.command) {
270	    console.error(USAGE);
271	    return 2;
272	  }
273	
274	  const plan = planPipeline(opts.command, opts.arg);
275	  if (!plan.ok) {
276	    console.error(renderPlan(plan));
277	    return 2;
278	
... [+1576 chars truncated]

### Assistant | 2026-06-04T20:30:36.562Z

Now I have the complete picture. Let me verify the `main()` and `planPipeline` analysis against the task's specific questions:

**Q: main() — if ANY step fails, does the process exit non-zero (3)?**
- Line 297-301: `anyFail` flips true on any `!r.ok`.
- JSON path: line 305 `return anyFail ? 3 : 0`. ✓
- Text path: line 316 `return anyFail ? 3 : 0`. ✓
- Top-level `void main().then(code => process.exit(code))` (line 322-323). ✓ Exit code 3 propagates.

**Q: --json path exit code correct?** Yes — line 305 returns 3 on any failure even in JSON mode. ✓

**Q: planPipeline — does main() refuse to run a plan with any step error?**
- Line 285-289: `plan.steps.find(s => s.error)` → if any step has a resolve error, returns 2 BEFORE the execution loop. Refuses to run a broken subset. ✓ Correct.
- One subtlety: it returns exit **2** (usage error) here, not 3. That's defensible — a missing CLI arg is a usage error, distinct from an infra failure. The header comment documents `2 usage error · 3 Ollama step failed`. Consistent. ✓

**Q: malformed registry entry causing silent wrong result?**
Let me trace registry-corruption paths:
- `resolveStepInput`: path-input with no value → `ok:false` loud (line 71). cli-arg missing → loud (line 76). unknown kind → loud (line 80). ✓
- `buildStepArgv`: if `step.mode` were `undefined`/missing, argv would be `[undefined, input, "--json"]`. ask-ollama would then reject with `unknown mode: undefined` → exit 2 → caught loud. Not silent. ✓ But the registry test (`every route step uses a real ask-ollama mode`) guards this at test time anyway.

Now, the one path I want to stress-test for a genuine silent-failure risk. Let me look very carefully at the **non-JSON-stdout-on-success** path and the **`{ollamaError}` with hits** path one more time, because these are where an error could be swallowed.

**Critical re-examination — could a real ask-ollama FAILURE ever land in the `ok:true` raw fallback (line 208 or 220)?**

- Line 208 (JSON.parse throws): only r
... [+1267 chars truncated]

### Assistant | 2026-06-04T20:30:37.300Z

[tool_use: Grep]

### User | 2026-06-04T20:31:02.926Z

[tool_result] 55:/** ask-ollama stdout cap (bytes) — a synthesized answer is small; this is headroom. */
212:    // value even if a (bonus) --synth pass errored alongside them.

### Assistant | 2026-06-04T20:31:12.491Z

Confirmed: this runner never passes `--synth` (buildStepArgv only emits `mode, input, --json [, --model X]`). So in practice ask-ollama's viz steps always run no-synth (exit 0, `{hits}`), and the `{ollamaError}`-with-hits shape is only reachable if a future caller adds `--synth`. The runStep handling for it is correct anyway (defensive forward-compat), so this is fine — not a defect, just a note that the `ollamaError`-with-non-empty-hits branch is currently exercised only by the test, not by main().

One last check — `maxBuffer` overflow. If ask-ollama stdout exceeds 16MB, `execFile` rejects with an error whose `.message` includes "maxBuffer length exceeded" but no `.stderr` (or partial). Line 224 handles it via `e.message` → `ok:false` loud. A summarized answer is tiny, so this is pure headroom. ✓ No silent truncation-to-success risk.

Let me confirm the test file actually passes and there's no skipped/disabled test masking a gap.

### Assistant | 2026-06-04T20:31:13.083Z

[tool_use: Bash]

### User | 2026-06-04T20:31:55.191Z

[tool_result]   ...
# Subtest: parseArgs: flags + command + multi-word arg
ok 27 - parseArgs: flags + command + multi-word arg
  ---
  duration_ms: 0.2797
  ...
# Subtest: FILE_MODES matches ask-ollama's file-path modes
ok 28 - FILE_MODES matches ask-ollama's file-path modes
  ---
  duration_ms: 0.182
  ...
1..28
# tests 28
# suites 0
# pass 28
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 298.3052

### Assistant | 2026-06-04T20:32:26.705Z

28/28 pass, 0 skipped, 0 todo. No disabled tests masking gaps.

I have completed the full audit with the actual ask-ollama contract verified from source (not from comments). Here is my report.

---

# Error-Handling Audit: command→Ollama routing (3 files)

## Verdict: PASS — no P0/P1 found.

I verified the runner's branching against the **actual** `ask-ollama.mjs` output contract read from source (`scripts/ask-ollama.mjs:564-617`), not the comments. The single fact that makes the error handling correct: **every non-zero-exit path in ask-ollama prints a plain-text `[ask-ollama] <reason>` banner to stderr and never JSON** (`ask-ollama.mjs:600, 607, 611, 622-626`). Because `execFile` rejects on non-zero exit, every genuine infra/usage failure deterministically lands in `runStep`'s `catch` (`trigger-command-pipeline.mjs:221-226`) and surfaces `e.stderr`. The JSON-shape branches only ever see exit-0 output, which is always valid JSON.

### Exhaustive shape-to-verdict trace (all correct)

| ask-ollama emission (verified) | exit | runStep line | result | correct? |
|---|---|---|---|---|
| `{answer}` (file/ask/viz-synth ok) | 0 | 210 | ok:true | yes |
| `{hits:[...]}` non-empty | 0 | 213 | ok:true | yes |
| `{ollamaError, hits:[...]}` (synth fail, hits present) | 0 | 213 (hits win) | ok:true, error ignored | yes — hits are the value; documented intent |
| `{ollamaError, hits:[]}` | 0 | 217 | ok:false | yes |
| `{hits:[], synth:false}` no error | 0 | 219 | ok:true "(no matching graph nodes)" | yes — empty search ≠ error |
| non-JSON stdout | 0 | 208 | ok:true raw | yes — only reachable on exit 0; `--json` always set |
| thrown exec error w/ `.stderr` | ≠0 | 224 | ok:false | yes |
| thrown exec error w/o `.stderr` | ≠0 | 224 (msg fallback) | ok:false | yes |

`runStep` never throws (the whole body is wrapped) and never returns `ok:true` on a known failure shape. The task's specific worry — `{ollamaError}` with real hits returning ok:true — is **intended and correct**: that is
... [+3240 chars truncated]
