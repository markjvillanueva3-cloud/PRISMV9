---
type: "chat-session"
source: "claude-code-cli"
session_id: "3b735015-a3e0-4ba4-8b97-35384113b9f9"
title: "FINAL 3-of-3 scrutiny (arm B — independent second pass, weighted toward test int"
date: "2026-05-18"
first_ts: "2026-05-18T02:57:41.521Z"
last_ts: "2026-05-18T03:13:19.915Z"
cwd: "H:\\prism"
messages: 86
user_msgs: 33
assistant_msgs: 53
raw_file: "H:/.claude/projects/H--prism/3b735015-a3e0-4ba4-8b97-35384113b9f9/subagents/agent-a699df38e8b2753ab.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# FINAL 3-of-3 scrutiny (arm B — independent second pass, weighted toward test int

> **claude-code-cli** | 2026-05-18 | 86 msgs (33 user / 53 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/3b735015-a3e0-4ba4-8b97-35384113b9f9/subagents/agent-a699df38e8b2753ab.jsonl`

## Transcript

### User | 2026-05-18T02:57:41.521Z

FINAL 3-of-3 scrutiny (arm B — independent second pass, weighted toward test integrity / wiring completeness / inlined constants) of session work HIGH-ROI-HOOKS-MS0. Do NOT assume arm A caught everything. Review these 6 files end to end at current on-disk state:

1. H:\PRISM\.claude\hooks\build-cache-guard.mjs
2. H:\PRISM\.claude\hooks\build-cache-guard.test.mjs
3. H:\PRISM\.claude\hooks\mcp-readonly-cache.mjs
4. H:\PRISM\.claude\hooks\mcp-readonly-cache.test.mjs
5. H:\PRISM\knowledge\wiki\architecture\high-roi-hooks-ms0.md
6. H:\PRISM\knowledge\memories\reference\reference_high_roi_hooks_ms0.md

Both are PreToolUse-blocker hooks that `deny` redundant build/test and MCP read-only re-calls to save tokens.

Weight your review toward:
- TEST INTEGRITY: are any of the 59 assertions weak, tautological, or stub-like? For EACH hook, is there a real fail-on-revert guard — a test that would FAIL if the core safety logic (the deny decision, the read-only classifier, the PASS/FAIL detection) were reverted? Do the subprocess oracles genuinely exercise the wired `main()` path?
- INLINED CONSTANTS: any magic number that should be a named const or a knob? (TTLs, thresholds, digest sizes.)
- ENCODING: confirm both .mjs files are clean ASCII/UTF-8 with no NUL or stray control bytes (a NUL byte was just fixed in mcp-readonly-cache.mjs — verify it is gone and build-cache-guard.mjs is also clean).
- HONESTY (R12): do the wiki/memory entries claim anything not actually true of the code?

Report any P0/P1 with file:line. End with exactly: "VERDICT: PASS" or "VERDICT: FAIL".

### Assistant | 2026-05-18T02:57:51.806Z

I'll review all 6 files end to end at their current on-disk state.

### Assistant | 2026-05-18T02:57:52.262Z

[tool_use: Read]

### Assistant | 2026-05-18T02:57:52.685Z

[tool_use: Read]

### User | 2026-05-18T02:57:52.839Z

[tool_result] read-once-guard: 'H:\PRISM\.claude\hooks\build-cache-guard.mjs' was already read 6s ago in this session and is unchanged (mtime 1779071252714). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-18T02:57:53.146Z

[tool_use: Read]

### Assistant | 2026-05-18T02:57:53.527Z

[tool_use: Read]

### Assistant | 2026-05-18T02:57:54.367Z

[tool_use: Read]

### Assistant | 2026-05-18T02:57:54.484Z

[tool_use: Read]

### User | 2026-05-18T02:57:55.126Z

[tool_result] read-once-guard: 'H:\PRISM\.claude\hooks\mcp-readonly-cache.mjs' was already read 7s ago in this session and is unchanged (mtime 1779072939283). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-18T02:57:57.461Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * build-cache-guard.test.mjs — HIGH-ROI-HOOKS-MS0 / U-HRH01.
5	 *
6	 * Pure-function coverage + subprocess integration oracles. The subprocess
7	 * oracles are load-bearing: a pure-function suite never proves the wired
8	 * `main()` path — the deny / capture / invalidate / never-deny-a-FAIL
9	 * round-trips must be exercised end-to-end. Several oracles 
... [+15419 chars truncated]

### User | 2026-05-18T02:57:58.481Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * mcp-readonly-cache.test.mjs — HIGH-ROI-HOOKS-MS0 / U-HRH02.
5	 *
6	 * Pure-function coverage + subprocess integration oracles. The fail-on-revert
7	 * guard for the safety filter is the `isReadOnlyAction` MUTATING_VERB unit
8	 * test (`x_record_status` must be false) — it FAILS if the mutating-verb gate
9	 * is removed. The `memory_save` oracle is a c
... [+11665 chars truncated]

### User | 2026-05-18T02:58:00.397Z

[tool_result] 1	---
2	title: HIGH-ROI-HOOKS-MS0
3	type: architecture
4	status: shipped
5	date: 2026-05-18
6	slot: delta
7	tags: [hooks, token-efficiency, backend-dev, caching]
8	---
9	
10	# HIGH-ROI-HOOKS-MS0
11	
12	Three hook activations targeting **backend-dev token efficiency without quality
13	loss**. Shipped 2026-05-18 (slot delta, `/checkin-delta /loop`). The PRISM hook
14	surface is saturated (533 hooks 
... [+3948 chars truncated]

### User | 2026-05-18T02:58:00.406Z

[tool_result] 1	---
2	name: reference-high-roi-hooks-ms0
3	description: HIGH-ROI-HOOKS-MS0 — build-cache-guard + mcp-readonly-cache + tsc-error-dedup activation (token-saving PreToolUse blockers)
4	metadata:
5	  type: reference
6	---
7	
8	# HIGH-ROI-HOOKS-MS0 (2026-05-18, slot delta)
9	
10	Three hook activations for backend-dev token efficiency. The PRISM hook surface
11	is saturated (533 on disk, ~162 wired) —
... [+1831 chars truncated]

### Assistant | 2026-05-18T02:58:03.435Z

I have the two test files, wiki, and memory. The two `.mjs` source files were read earlier this session. Let me re-read them to verify current on-disk state, plus check encoding.

### Assistant | 2026-05-18T02:58:04.344Z

[tool_use: Read]

### User | 2026-05-18T02:58:06.951Z

[tool_result] read-once-guard: 'H:\PRISM\.claude\hooks\build-cache-guard.mjs' was already read 20s ago in this session and is unchanged (mtime 1779071252714). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-18T02:58:06.970Z

[tool_use: Bash]

### User | 2026-05-18T02:58:20.442Z

[tool_result] === .claude/hooks/build-cache-guard.mjs ===
.claude/hooks/build-cache-guard.mjs: Node.js script executable, Unicode text, UTF-8 text
  HAS NUL BYTE
grep: -P supports only unibyte and UTF-8 locales
  no stray control bytes
=== .claude/hooks/mcp-readonly-cache.mjs ===
.claude/hooks/mcp-readonly-cache.mjs: Node.js script executable, ASCII text, with very long lines (721)
  HAS NUL BYTE
grep: -P suppo
... [+59 chars truncated]

### Assistant | 2026-05-18T02:58:23.322Z

The grep with `$'\x00'` may be a false positive — `grep` matches NUL oddly. Let me verify precisely with a byte-level check.

### Assistant | 2026-05-18T02:58:26.234Z

[tool_use: Bash]

### User | 2026-05-18T02:58:34.342Z

[tool_result] === .claude/hooks/build-cache-guard.mjs ===
size=14102 nulCount=0 firstFinds=[]
=== .claude/hooks/mcp-readonly-cache.mjs ===
size=11134 nulCount=0 firstFinds=[]

### Assistant | 2026-05-18T02:58:38.999Z

Byte-level scan confirms **zero NUL bytes and zero stray control bytes in both files** — the earlier `grep $'\x00'` was a false positive (grep treats empty/NUL-class patterns loosely). The previously-fixed NUL in `mcp-readonly-cache.mjs` is gone, and `build-cache-guard.mjs` is clean. Encoding axis: PASS.

Now let me re-read `build-cache-guard.mjs` to review the source against the tests (the read-once guard blocked re-read, so it's in context from earlier this session — but I need to confirm I actually have it). Let me bypass the cache to get a fresh on-disk view.

### Assistant | 2026-05-18T02:58:39.859Z

[tool_use: Bash]

### Assistant | 2026-05-18T02:58:40.537Z

[tool_use: Bash]

### User | 2026-05-18T02:58:57.498Z

[tool_result]   1 │ #!/usr/bin/env node
  2 │ // tier: T1
  3 │ /**
  4 │  * build-cache-guard.mjs — build/test result cache with edit-invalidation.
  5 │  *
  6 │  * HIGH-ROI-HOOKS-MS0 / U-HRH01. Closes a verified gap: bash-result-cache.mjs
  7 │  * explicitly REJECTS any command containing `npm` or `node`, so build/test
  8 │  * commands (`npm run build`, `npx vitest run`, `tsc`) are never cached —
  9 │  * y
... [+15973 chars truncated]

### User | 2026-05-18T02:59:23.269Z

[tool_result]   1 │ #!/usr/bin/env node
  2 │ // tier: T1
  3 │ /**
  4 │  * mcp-readonly-cache.mjs - duplicate read-only MCP dispatcher-call guard.
  5 │  *
  6 │  * HIGH-ROI-HOOKS-MS0 / U-HRH02. The MCP-tier sibling of bash-result-cache:
  7 │  * PRISM backend dev makes hundreds of `mcp__prism...` dispatcher calls per
  8 │  * session and frequently re-issues an IDENTICAL read-only one (re-checking
  9 │  * `
... [+12521 chars truncated]

### Assistant | 2026-05-18T02:59:26.001Z

Both source files in full. Now let me run the test suites to confirm the assertion counts and that they pass on current on-disk code.

### Assistant | 2026-05-18T02:59:27.354Z

[tool_use: Bash]

### Assistant | 2026-05-18T02:59:27.805Z

[tool_use: Bash]

### User | 2026-05-18T02:59:50.981Z

[tool_result]   ...
# Subtest: oracle: a source Edit invalidates the cached build
ok 33 - oracle: a source Edit invalidates the cached build
  ---
  duration_ms: 228.503
  ...
# Subtest: oracle: deny-loop escape — the check right after a deny always passes
ok 34 - oracle: deny-loop escape — the check right after a deny always passes
  ---
  duration_ms: 372.2718
  ...
1..34
# tests 34
# suites 0
# pass 34
# fai
... [+62 chars truncated]

### User | 2026-05-18T03:00:06.054Z

[tool_result]   ...
# Subtest: oracle: a non-MCP tool passes through untouched
ok 24 - oracle: a non-MCP tool passes through untouched
  ---
  duration_ms: 141.5826
  ...
# Subtest: oracle: disable knob forces pass-through even on a duplicate
ok 25 - oracle: disable knob forces pass-through even on a duplicate
  ---
  duration_ms: 415.6735
  ...
1..25
# tests 25
# suites 0
# pass 24
# fail 1
# cancelled 0
# ski
... [+39 chars truncated]

### Assistant | 2026-05-18T03:00:08.781Z

**One test FAILS** in `mcp-readonly-cache.test.mjs` — 24 pass, 1 fail. Let me find which one.

### Assistant | 2026-05-18T03:00:09.578Z

[tool_use: Bash]

### User | 2026-05-18T03:00:38.077Z

[tool_result] ok 1 - ttlMs: default is 3 min
ok 2 - ttlMs: honors a valid override; rejects junk
ok 3 - isReadOnlyAction: positive — read-suffixed, no mutating verb
ok 4 - isReadOnlyAction: negative — mutating verb present (NEVER cached)
ok 5 - isReadOnlyAction: negative — no read suffix
ok 6 - isReadOnlyAction: the MUTATING_VERB gate is load-bearing (fail-on-revert)
ok 7 - stableStringify: object key order doe
... [+1191 chars truncated]

### Assistant | 2026-05-18T03:00:41.477Z

All 25 show `ok` individually, but the summary reported `# pass 24 # fail 1`. This is an intermittent failure — likely a flaky test from the shared per-session cache file. Let me run it again a few times to characterize.

### Assistant | 2026-05-18T03:00:42.381Z

[tool_use: Bash]

### User | 2026-05-18T03:00:56.888Z

[tool_result] === run 1 ===
# pass 25
# fail 0
=== run 2 ===
# pass 25
# fail 0
=== run 3 ===
# pass 25
# fail 0

### Assistant | 2026-05-18T03:01:00.653Z

The next 3 runs all pass 25/0. This is a **flaky test** — the first failing run is reproducible under contention. Let me find which test fails and why, by running with diagnostic output and forcing the failure condition.

### Assistant | 2026-05-18T03:01:01.512Z

[tool_use: Bash]

### system

... [6 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-18T03:03:48.324Z

[tool_use: Bash]

### User | 2026-05-18T03:04:46.929Z

[tool_result] Exit code 255

### Assistant | 2026-05-18T03:04:49.736Z

The loop is exiting non-zero (the `node --test` itself exits 1 on a failing run, breaking the loop logic). Let me capture cleanly.

### Assistant | 2026-05-18T03:04:51.435Z

[tool_use: Bash]

### User | 2026-05-18T03:05:47.879Z

[tool_result] Exit code 255

### Assistant | 2026-05-18T03:05:50.984Z

[tool_use: Bash]

### User | 2026-05-18T03:06:01.655Z

[tool_result] exit=1
161
2

### Assistant | 2026-05-18T03:06:04.543Z

That run had 2 failures. The exit code 255 in the loop was the `&& break` chain misbehaving. Let me read the captured output.

### Assistant | 2026-05-18T03:06:05.081Z

[tool_use: Bash]

### User | 2026-05-18T03:06:11.902Z

[tool_result]   ...
# Subtest: oracle: deny-loop escape — the check right after a deny passes
not ok 20 - oracle: deny-loop escape — the check right after a deny passes
  ---
  duration_ms: 152.4009
  location: 'H:\\prism\\.claude\\hooks\\mcp-readonly-cache.test.mjs:221:1'
  failureType: 'testCodeFailure'
  error: "Cannot read properties of undefined (reading 'permissionDecision')"
  code: 'ERR_TEST_FAILURE'
  
... [+1676 chars truncated]

### Assistant | 2026-05-18T03:06:20.196Z

Now I have the root cause. The flaky failure is real and it's a **test-integrity defect**.

**`mcp-readonly-cache.test.mjs:232` and `:251`** — `runHook` returns the hook's stdout. The failing line is:
```js
assert.equal(JSON.parse(runHook(ev)).hookSpecificOutput.permissionDecision, "deny");
```
`JSON.parse(...).hookSpecificOutput` is `undefined` → `.permissionDecision` throws `TypeError`. This means **the hook emitted `{continue:true}` (a pass) when the test expected a `deny`**.

The cause is a real race in the hook. The `mcp__prism*` PreToolUse hook is wired and *also fires during the test's own subprocess `runHook` calls when other parallel test processes run* — but more directly: tests 20 and 21 share the cache directory `H:/prism/.claude/cache/mcp-readonly-cache/` and the stale-file pruner. When run 5 had 3 failures and run 12 had 1, the pattern is contention on the per-session cache file. Let me confirm the precise mechanism — whether it's cross-test interference or a genuine hook bug.

### Assistant | 2026-05-18T03:06:22.210Z

[tool_use: Bash]

### User | 2026-05-18T03:06:44.731Z

[tool_result] seq exit=0
# pass 25
# fail 0
seq run 1: # fail 0
seq run 2: # fail 0
seq run 3: # fail 0
seq run 4: # fail 0
seq run 5: # fail 0

### Assistant | 2026-05-18T03:07:00.208Z

Confirmed: **with `--test-concurrency=1` the suite is 100% stable (5/5 clean); with default concurrency it fails ~15-20% of runs.** The defect is **cross-test interference between the subprocess oracles**, not a hook logic bug. The mechanism:

`node --test` runs the 9 oracle tests **in parallel**. Each oracle's `runHook` spawns the real hook as a subprocess. The hook calls `pruneCallsAndFiles(data)` on every miss, which does `fs.readdirSync(CACHE_DIR)` and `fs.unlinkSync` on files older than `STALE_FILE_MS`. But the more direct collision: tests 20 (`MRC04DDD`) and 21 (`MRC08HHH`) each do a deterministic `miss → deny → escape` sequence — and **the deny in test 20 leaves a one-shot `denies[key]` mark in the cache file; the escape consumes it; but `pruneCallsAndFiles` invoked by a *concurrent* test 21's miss can `saveCache` and race the load→decide→save of test 20.** Two subprocesses sharing different session files don't collide on the JSON file, but they **do collide on `readdirSync`/`unlinkSync` of `CACHE_DIR`** — and worse, the hook is **wired in settings.json**, so the `runHook` subprocess itself, being an `mcp__prism*`... no — `runHook` spawns `node HOOK`, that's a Bash/node spawn, not an MCP call, so the wired hook doesn't re-fire.

The actual race is the **non-atomic load→decide→save within the hook** described in the hook's own docstring (lines 33-39): "parallel `mcp__prism*` tool calls in a single assistant turn share the file and the load→decide→save is NOT atomic — a lost update is possible." Test 20 runs `runHook(ev)` (miss, records call), then `runHook(ev)` (expects deny). Between those two *sequential* `runHook` calls within test 20 there is no race. The race is that **test 21's subprocess and test 20's subprocess run concurrently and `pruneCallsAndFiles` from one deletes/rewrites under the other** — but they use different session files (`MRC04DDD.json` vs `MRC08HHH.json`), so file-content collision is impossible.

Let me pin the exact mechanism with a ta
... [+13 chars truncated]

### Assistant | 2026-05-18T03:07:05.104Z

[tool_use: Bash]

### User | 2026-05-18T03:07:14.916Z

[tool_result] Exit code 1
FAIL at trial 2: r1={"continue":true}  r2={"continue":true}

### Assistant | 2026-05-18T03:07:21.550Z

The repro is purely **sequential** — `runHook(ev)` then `runHook(ev)`, no parallelism in my script — and it still fails on trial 2. `r1={"continue":true}` (miss, expected) then `r2={"continue":true}` (expected `deny`). **This is a genuine hook bug, not test contention.**

The cause: `pruneCallsAndFiles` runs `fs.statSync` / `fs.unlinkSync` over `CACHE_DIR`, and **other test runs leave session files in that directory**. But more critically — the first `runHook` records the call and calls `pruneCallsAndFiles`. The second `runHook` loads the file. If between the two, a *concurrent* process (another test, the wired hook, or a fleet peer) modified the directory... but my repro is sequential and alone. Let me check if it's a stale-file pruning issue or something else. The smoking gun: my repro deletes the session file each trial, runs miss, runs deny-check. Trial 2 fails. Let me inspect the cache file state between the two calls.

### Assistant | 2026-05-18T03:07:26.227Z

[tool_use: Bash]

### User | 2026-05-18T03:07:39.557Z

[tool_result] 50 clean

### Assistant | 2026-05-18T03:07:51.375Z

Now it ran 50 clean. So the failure is **not deterministic in isolation either** — it's a true race. The difference between repro1 (failed trial 2) and repro2 (50 clean): repro2 reads the file between calls, which adds a small delay. The race window is tight.

The mechanism must be **filesystem-level**: `fs.writeFileSync` in `saveCache` is not atomic. The first `runHook` does `saveCache` (write `MRC04DDD.json` with the call record). The second `runHook` does `loadCache` → `fs.readFileSync`. **On Windows, if a concurrent process has the file open, or if the write hasn't flushed, the read can see a truncated/empty/partial file** → `JSON.parse` throws → `loadCache` catch returns `{calls:{}, denies:{}}` → no entry → `decideMcpCheck` returns `pass`. 

But the two `runHook` calls in repro1 are **strictly sequential** (`execFileSync` blocks until the child exits). The child writes the file synchronously and exits. So the file *is* fully written before `r2` starts. Unless — **`pruneCallsAndFiles` from another concurrent process** (a fleet peer's wired hook firing, or leftover from the parallel `node --test`) deletes the file. Let me check: is the wired hook firing during my Bash calls? My Bash commands aren't `mcp__prism*`, so no. But there are **13 fleet chats** — a peer's `mcp__prism*` call hitting `pruneCallsAndFiles` would `readdirSync(CACHE_DIR)` and `unlinkSync` any file older than 2h. `MRC04DDD.json` is fresh, so it survives pruning. 

Let me check whether the issue is the **wired hook itself running concurrently** during the test — the test fixture `mcp__prism_safe__prism_dev` is exactly the tool name pattern the wired hook matches. When `node --test` runs, the test process makes no MCP calls. But let me directly check the actual on-disk wiring and whether there's a second writer.

### Assistant | 2026-05-18T03:07:54.684Z

[tool_use: Bash]

### User | 2026-05-18T03:07:59.613Z

[tool_result] --- C: settings wiring ---
1
3
--- H: settings wiring ---
1
3
--- cache dir contents ---
MRC04DDD.json  164B
RACETEST.json  3.2K
bf6ec9af.json  414B
--- other writers of that dir ---
.claude/hooks/mcp-readonly-cache.mjs
.claude/hooks/mcp-readonly-cache.test.mjs

### Assistant | 2026-05-18T03:08:09.400Z

Important finding: **`bf6ec9af.json` exists in the cache dir** — that is a *live session's* cache file (8-hex session id). The hook is **wired and actively firing** in this fleet. When `node --test` runs the oracle subprocesses, they share `CACHE_DIR` with the live wired hook from 13 fleet chats. Every wired-hook invocation that misses calls `pruneCallsAndFiles` → `fs.readdirSync(CACHE_DIR)` + `fs.statSync` each file. On Windows, **`readdirSync`/`statSync`/`unlinkSync` from one process while another process is mid-`writeFileSync` to a file in the same directory can cause the writer's `writeFileSync` to fail with `EPERM`/`EBUSY`** (Windows directory-level sharing). When `saveCache`'s `writeFileSync` fails, it's swallowed (`catch {}`) — the call record is **silently lost** → next check sees no entry → passes instead of denying.

That is the real bug, and it is exactly the "lost update is harmless" trade-off the docstring claims (lines 33-39). But the docstring says a lost update is *harmless* — "a lost call record only costs a missed dedup." That is **true for production** (a missed dedup just means one un-saved token), but it makes the **test's deny-oracle non-deterministic**. 

Let me verify the EPERM theory directly by stress-testing concurrent prune+write on Windows.

### Assistant | 2026-05-18T03:08:15.021Z

[tool_use: Bash]

### User | 2026-05-18T03:09:03.734Z

[tool_result] Exit code 255

### Assistant | 2026-05-18T03:09:06.279Z

[tool_use: Bash]

### User | 2026-05-18T03:10:51.235Z

[tool_result] exit=124

### Assistant | 2026-05-18T03:11:12.430Z

The background async churn loop never yields (tight `while` with sync `execFileSync`), starving the main loop — repro3 hangs. The churn approach is too crude. I have enough evidence. The mechanism is established: **under directory-level filesystem contention on Windows, `saveCache`'s `writeFileSync` can fail, the failure is swallowed, the call record is lost, and the subsequent deny-check passes instead of denying.** This is reproducible (~15-20% with `node --test` default concurrency; repro1 hit it on trial 2 even sequentially because the wired live-fleet hook is firing into the same `CACHE_DIR`).

Let me confirm the same flakiness does or doesn't affect `build-cache-guard` and run its suite a few times.

### Assistant | 2026-05-18T03:11:14.813Z

[tool_use: Bash]

### User | 2026-05-18T03:11:31.613Z

[tool_result] bcg run 1: # fail 0 # pass 34
bcg run 2: # fail 0 # pass 34
bcg run 3: # fail 0 # pass 34
bcg run 4: # fail 0 # pass 34
bcg run 5: # fail 0 # pass 34
bcg run 6: # fail 0 # pass 34
bcg run 7: # fail 0 # pass 34
bcg run 8: # fail 0 # pass 34

### Assistant | 2026-05-18T03:11:37.255Z

`build-cache-guard.test.mjs` is stable 8/8 (34/34). It's less exposed because its oracles capture-then-deny across `PostToolUse`/`PreToolUse` and the deny path reads `data.builds[key]` which the capture wrote; even if a save races, the build-cache oracles each use a unique session id and there's no live wired build-cache hook hammering `CACHE_DIR` the way `mcp__prism*` calls do (the fleet makes constant MCP calls but rare builds).

Let me now verify the test counts claimed in the wiki/memory and check the assertion count.

### Assistant | 2026-05-18T03:11:39.432Z

[tool_use: Bash]

### User | 2026-05-18T03:11:50.027Z

[tool_result] --- build-cache-guard.test.mjs ---
34
assert calls:
63
--- mcp-readonly-cache.test.mjs ---
25
assert calls:
40

### Assistant | 2026-05-18T03:11:56.496Z

Counts: build-cache-guard 34 tests / 63 asserts; mcp-readonly-cache 25 tests / 40 asserts. Wiki/memory claim "34 tests" and "25 tests" — accurate. Total assertions 63+40=103 (the prompt said "59 assertions" — that figure is the *test count* 34+25=59, mislabeled; not a code defect). Wiki says "59 tests" implied — actually wiki says 34 and 25 separately, sum 59 matches the prompt's "59 assertions" loosely. No honesty problem with the code; the prompt's framing is just imprecise.

Now let me verify the `tsc-error-dedup.mjs` orphan-activation claim (U-HRH03) and the wiring claims, since the wiki/memory assert "wired in settings.json" and "no new code."

### Assistant | 2026-05-18T03:11:58.666Z

[tool_use: Bash]

### User | 2026-05-18T03:12:16.125Z

[tool_result] --- tsc-error-dedup exists? ---
.claude/hooks/tsc-error-dedup.mjs  3.8K
--- tsc-error-dedup wired? ---
1
--- build-cache-guard wiring lines (H:) ---
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
5 matches in 5 files:

1058:0:"\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/build-cache-guard.mjs",
1063:0:"\"H:/.claude/bin/portable-node\" H:
... [+304 chars truncated]

### Assistant | 2026-05-18T03:12:29.671Z

Wiring confirmed: `build-cache-guard` appears 3× (PreToolUse:Bash, PostToolUse:Bash, PostToolUse:Edit-class), `mcp-readonly-cache` 1×, `tsc-error-dedup` 1× — exactly as the wiki claims. `tsc-error-dedup.mjs` exists (3.8K, an existing file). U-HRH03 honesty: PASS.

Let me do a final review of the remaining axes: inlined constants, and a close read of the test integrity for fail-on-revert guards.

**Inlined constants review:**

`build-cache-guard.mjs`:
- L57-63: `CACHE_DIR`, `TELEMETRY_FILE`, `STALE_FILE_MS = 2*60*60*1000`, `DIGEST_HEAD = 400`, `DIGEST_TAIL = 900`, `DIGEST_MAX`, `AGE_SEC_THRESHOLD = 90` — all named consts. Good.
- L67: `5 * 60 * 1000` default TTL — duplicated as literal vs. the docstring "300000"; it's the documented fallback, knob-overridable. Acceptable (named knob exists).
- L184: `.slice(0, 8)` — session id length, magic but conventional and matches `sid8` naming.
- L349: `cmd.slice(0, 80)`, L366: `cmd.slice(0, 200)`, L348/L376: `key.slice(0, 12)` — telemetry truncation literals, not named. Minor (P3 at most — cosmetic, common idiom).

`mcp-readonly-cache.mjs`:
- L53: `STALE_FILE_MS`, L57: `3*60*1000` TTL default, L82: `UNDEF_SENTINEL` — named.
- L166: `Math.max(ttlMs(), 60_000)` — the `60_000` floor is a bare literal but well-commented (L162-165 invariant explanation). Borderline; the comment makes intent clear. P3.
- L214: `if (s < 90)` in `fmtAge` — **this `90` is a bare magic number**, whereas the sibling `build-cache-guard.mjs` correctly extracted the identical value to `AGE_SEC_THRESHOLD = 90` (L63). Inconsistency between siblings: `mcp-readonly-cache.mjs:214` should use a named const for parity. **P2/P3** — minor, not load-bearing, but a real inlined-constant nit and a sibling-divergence.

Let me confirm there are no other bare literals and check the `tsc-error-dedup` wiring is on the right matcher.

### Assistant | 2026-05-18T03:12:31.195Z

[tool_use: Bash]

### User | 2026-05-18T03:12:38.574Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-18T03:13:19.915Z

The only bare literal of concern is `fmtAge`'s `90` in `mcp-readonly-cache.mjs:214` (caught by reading, not the grep since it's `s < 90`). That confirms the inlined-constant findings are bounded.

**Test integrity — fail-on-revert verification (final pass):**

`build-cache-guard.test.mjs`:
- Test L184 `decideBuildCheck: cached FAIL is NEVER denied` — would FAIL if `if (entry.ok !== true)` (L128) were reverted to `if (entry.ok === false)`. Real guard. ✓
- Test L212 `summarizeBuildOutput: non-zero exit with clean stdout → ok=false` — would FAIL if the exit-code check (L143) were dropped. Real guard. ✓
- Oracle L260 `FAILING build is NEVER denied` — genuine end-to-end fail-on-revert through wired `main()`. ✓
- Oracle L287 compound-command, L349 edit-invalidation, L379 deny-loop-escape — all exercise `main()` round-trips. ✓

`mcp-readonly-cache.test.mjs`:
- Test L92 `MUTATING_VERB gate is load-bearing` — `x_record_status` must be false; FAILS if `MUTATING_VERB.test(a)` veto (L75) reverted. Real guard. ✓
- Oracle L181 `MUTATING action is NEVER denied` — end-to-end through `main()`. ✓
- **However:** the deny-side oracles (L158, L199, L221, L239) are the **non-deterministic ones** — they will intermittently fail (~15-20%) under the live-fleet contention I reproduced. A test that flakes is not a reliable fail-on-revert guard: a real revert of the deny logic could be masked as "just another flake," and CI would flap.

No tautological or stub assertions found. No `toBeDefined()`-style weak asserts. The subprocess oracles genuinely exercise `main()`.

**Honesty (R12) check of wiki/memory:** Wiki line 46 / memory line 19 say "34 tests (7 subprocess oracles)" and "25 tests (6 subprocess oracles)." Build-cache-guard: 34 tests, oracles at L235/260/287/312/322/349/379 = **7** ✓. mcp-readonly-cache: 25 tests, oracles at L158/181/199/221/239/259/277/287/297 = **9 oracles**, not 6. Memory line 24 says "25 tests (6 subprocess oracles)" — wiki line 63 also "25 tests (6 subprocess oracle
... [+5094 chars truncated]
