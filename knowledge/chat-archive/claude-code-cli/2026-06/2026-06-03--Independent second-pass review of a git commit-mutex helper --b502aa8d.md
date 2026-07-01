---
type: "chat-session"
source: "claude-code-cli"
session_id: "b502aa8d-3a90-4735-9eed-98f2a773f4e2"
title: "Independent second-pass review of a git commit-mutex helper (fleet infra). Focus"
date: "2026-06-03"
first_ts: "2026-06-03T19:54:59.873Z"
last_ts: "2026-06-03T20:02:35.866Z"
cwd: "H:\\prism"
messages: 34
user_msgs: 12
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/b502aa8d-3a90-4735-9eed-98f2a773f4e2/subagents/agent-a357cc7b77f777b64.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Independent second-pass review of a git commit-mutex helper (fleet infra). Focus

> **claude-code-cli** | 2026-06-03 | 34 msgs (12 user / 22 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b502aa8d-3a90-4735-9eed-98f2a773f4e2/subagents/agent-a357cc7b77f777b64.jsonl`

## Transcript

### User | 2026-06-03T19:54:59.873Z

Independent second-pass review of a git commit-mutex helper (fleet infra). Focus on EDGE CASES, the foreign-staged-file guard, CLI correctness, and fail-safety — do not assume the other reviewer caught everything. Read END-TO-END:

1. H:\prism\.claude\helpers\git-commit-mutex.mjs
2. H:\prism\.claude\helpers\git-commit-mutex.test.mjs

CONTEXT: ~26 chats share one git working tree/index/HEAD. This wraps `git commit <pathspec> -m <msg>` under a file-lock with transient-race retry. It will be dogfooded to commit ITSELF through live fleet contention.

VERIFY (flag P0/P1):
1. PEER-ABSORPTION SAFETY (the whole point): commitLocked must commit ONLY the requested paths even if a peer's files are staged in the shared index. Confirm `git commit <paths> -m <msg>` (pathspec form) is what's run, and that the foreign-staged check is informational (warn), not a blocker that would wedge. Confirm the test "commits ONLY the pathspec" actually asserts the git args carry only the requested path.
2. FAIL-SAFE: every failure mode returns a structured {ok:false,error} rather than throwing across the boundary, EXCEPT acquire-timeout (which throws — confirm that's caught/handled by callers; the CLI sets exitCode). Empty message / empty paths → refused with clear error. A corrupt/unreadable lock body → treated as stale (reclaim), never a crash.
3. CLI parseArgv: `commit --message "x" -- a.ts b.ts` → message="x", paths=[a.ts,b.ts]. `-m` alias works. Args after `--` are all paths. `status` reports holder. Unknown cmd → usage + exit 2. Confirm no off-by-one in the `argv[++i]` message capture.
4. The WORKTREE-ROUTE / SLOT-COMMIT-ENFORCE hooks do STATIC analysis of the bash command string and need `[MAIN]` literal in it. When this helper runs `execFileSync("git",["commit",...,"-m",message])`, those PreToolUse-Bash hooks do NOT see it (it's not a `git` bash command, it's a child_process from node). Is that a problem (bypasses the enforce hooks) or fine (the helper is the sanctioned commit path)? No
... [+376 chars truncated]

### Assistant | 2026-06-03T19:55:20.663Z

I'll review the git commit-mutex helper end-to-end. Let me read both files.

### Assistant | 2026-06-03T19:55:21.675Z

[tool_use: Read]

### Assistant | 2026-06-03T19:55:21.556Z

[tool_use: Read]

### User | 2026-06-03T19:55:52.833Z

[tool_result] 1	// Tests for git-commit-mutex.mjs (FLEET-GIT-CONTENTION-MS0/U-FGC-1).
2	// node:test (vite-config in this repo only globs src/__tests__/*.ts). Hermetic:
3	// pure fns tested directly; the lock uses a temp path; commitLocked uses an
4	// injected gitFn so NO real git/commit runs.
5	//
6	// Run: node --test H:/prism/.claude/helpers/git-commit-mutex.test.mjs
7	
8	import { test } from "node:test";
9
... [+7471 chars truncated]

### User | 2026-06-03T19:55:52.835Z

[tool_result] 1	// git-commit-mutex.mjs — FLEET-GIT-CONTENTION-MS0/U-FGC-1 (slot:alpha)
2	//
3	// Cross-process serialization + ref-race retry for git commits on the SHARED
4	// `H:/prism` tree, where ~26 NATO chats share one working tree / index / HEAD.
5	// Without this, concurrent committers collide on `index.lock` and lose the
6	// `cannot lock ref 'HEAD'` ref-update race (observed: HEAD moved 4× during one
... [+10479 chars truncated]

### Assistant | 2026-06-03T19:55:57.163Z

Both files read end-to-end. Let me verify a few specific edge concerns before writing the verdict: the CLI acquire-timeout throw path (point 2 — does the CLI catch it?), and the `parseArgv` off-by-one at end-of-array.

### Assistant | 2026-06-03T19:55:58.713Z

[tool_use: Bash]

### User | 2026-06-03T19:56:17.529Z

[tool_result]   ...
# Subtest: commitLocked: refuses empty message
ok 16 - commitLocked: refuses empty message
  ---
  duration_ms: 0.3694
  ...
# Subtest: commitLocked: commits ONLY the pathspec even when foreign files are staged (no absorption)
ok 17 - commitLocked: commits ONLY the pathspec even when foreign files are staged (no absorption)
  ---
  duration_ms: 3.1607
  ...
1..17
# tests 17
# suites 0
# pass
... [+71 chars truncated]

### Assistant | 2026-06-03T19:56:25.843Z

All 17 tests pass. Now let me trace the two correctness concerns the prompt flagged: the CLI handling of the acquire-timeout throw (point 2), and `parseArgv` off-by-one when `-m` is the last token.

The acquire-timeout throw in `commitLocked` happens inside `withCommitLock` → `acquireCommitLock`, which throws *before* the try/finally wraps `fn`. In `main()`'s `commit` branch, `commitLocked(...)` is called with no try/catch — so an acquire-timeout would throw out of `main()` uncaught, crashing the CLI with a stack trace and a non-zero exit (Node default exit code 1 for an uncaught exception). Let me confirm that's the actual behavior and trace whether `commitLocked` itself ever catches it.

Looking at the code: `commitLocked` calls `withCommitLock(fn, opts.lock)`. `withCommitLock` calls `acquireCommitLock(opts)` *outside* its try block, so an acquire failure propagates up through `commitLocked` (which has no try/catch around `withCommitLock`) out to `main()` (no try/catch) → uncaught.

Let me verify the off-by-one concern empirically and the timeout-from-CLI behavior.

### Assistant | 2026-06-03T19:56:27.674Z

[tool_use: Bash]

### User | 2026-06-03T19:56:41.336Z

[tool_result] module loaded ok, exports: DEFAULT_LOCK_REL,DEFAULT_RETRIES,DEFAULT_STALE_MS,DEFAULT_TIMEOUT_MS,acquireCommitLock,commitLocked,isStaleLock,isTransientGitFailure,withCommitLock

### Assistant | 2026-06-03T19:56:45.661Z

`parseArgv` and `main` are not exported (so not unit-tested). Let me exercise the CLI directly for the timeout-throw and the `-m` off-by-one cases. I'll create a real temp git repo to drive `commit` and a held-lock scenario.

### Assistant | 2026-06-03T19:56:50.697Z

[tool_use: Bash]

### User | 2026-06-03T19:57:09.397Z

[tool_result] === CLI commit with held lock, tiny timeout (expect throw escapes main) ===
{"ok":false,"attempts":1,"error":"non-transient git failure: error: pathspec 'a.ts' did not match any file(s) known to git"}
EXIT=1

### Assistant | 2026-06-03T19:57:18.078Z

The lock written by that `node -e` used the *child* process pid which died immediately, so `pidAlive` returned false and the lock was reclaimed as stale — that's why it proceeded to the commit (which then failed on pathspec because `a.ts` wasn't added/the cwd resolved oddly). I need a lock held by a process that stays alive. Let me hold the lock with a backgrounded sleeper whose pid I write into the lock.

### Assistant | 2026-06-03T19:57:19.288Z

[tool_use: Bash]

### User | 2026-06-03T19:57:40.766Z

[tool_result] === held by live pid 465953; tiny timeout, huge stale → must time out ===
{"ok":false,"attempts":1,"error":"non-transient git failure: error: pathspec 'a.ts' did not match any file(s) known to git"}
EXIT=1
--- stderr ---

### Assistant | 2026-06-03T19:58:06.358Z

The sleeper process did not actually keep the lock held — the lock got reclaimed again. The issue: my backgrounded `command node` sleeper's pid (`465953`) — `process.kill(pid, 0)` from a different node process under this Windows/MSYS environment may report it differently, OR the cwd for the CLI commit isn't the temp repo (the CLI uses `process.cwd()`, which is the temp dir, but the lock path is relative `.git/prism-commit.lock` so cwd matters). The recurring `pathspec 'a.ts' did not match` tells me the commit is being *attempted* — meaning the lock was treated as stale/acquired each time.

The most likely cause: the `host` in the lock matches, the pid is "live", so `isStaleLock` should return false... unless `pidAlive` cross-process probe behaves unexpectedly. Rather than fight the environment, let me test the throw-propagation directly via the exported `acquireCommitLock` (deterministic) and confirm `commitLocked` propagates it — that's the real question for point 2.

### Assistant | 2026-06-03T19:58:11.373Z

[tool_use: Bash]

### User | 2026-06-03T19:58:46.485Z

[tool_result]     at #createModuleJob (node:internal/modules/esm/loader:507:36)
    at #getJobFromResolveResult (node:internal/modules/esm/loader:275:34)
    at ModuleLoader.getModuleJobForImport (node:internal/modules/esm/loader:243:41)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:546:25) {
  code: 'ERR_UNSUPPORTED_ESM_URL_SCHEME'
}

Node.js v22.12.0

### Assistant | 2026-06-03T19:58:51.270Z

ESM URL scheme issue with the Windows path. Let me use a file:// URL.

### Assistant | 2026-06-03T19:58:54.717Z

[tool_use: Bash]

### User | 2026-06-03T19:59:07.019Z

[tool_result] THREW: commit-mutex: lock held by DESKTOP-N7MI1VB:28204 for 0s — acquire timed out after 150ms

### Assistant | 2026-06-03T19:59:13.373Z

Confirmed: **`commitLocked` THROWS on acquire-timeout** (it does not return a structured `{ok:false}`). This propagates out through `withCommitLock` (acquire is outside its try) → `commitLocked` (no try/catch) → and in the CLI, `main()`'s `commit` branch calls `commitLocked(...)` **with no try/catch**, so the throw escapes `main()` uncaught.

The prompt's point 2 says "acquire-timeout (which throws — confirm that's caught/handled by callers; the CLI sets exitCode)." Let me verify what the CLI actually does on that uncaught throw — does it produce a clean structured error + the intended exit code, or a raw stack trace? Let me drive the real CLI with a self-held lock so it can't be reclaimed.

### Assistant | 2026-06-03T19:59:20.869Z

[tool_use: Bash]

### User | 2026-06-03T19:59:51.781Z

[tool_result] lock pid=472052(ppid of node) host=DESKTOP-N7MI1VB; bash pid=472052
=== CLI commit, tiny timeout, huge stale (lock held by live bash pid) ===
EXIT=1
--- stdout ---
{"ok":false,"attempts":1,"error":"non-transient git failure: error: pathspec 'a.ts' did not match any file(s) known to git"}
--- stderr ---

### Assistant | 2026-06-03T20:00:00.364Z

The lock used `process.ppid` of the short-lived `node -e` (which is bash 472052, alive) — but the lock got reclaimed again and the commit proceeded. The reason: `pidAlive(472052)` from the CLI's node process — `process.kill(472052, 0)` against the bash/MSYS parent pid likely throws ESRCH under this Windows-node/MSYS pid namespace mismatch (MSYS bash pids are not Win32 pids that Node's `process.kill` can probe), so it's read as "dead" → reclaimed. That's actually an interesting Windows-specific finding but it's an artifact of my test harness using a bash pid, not a real node committer pid.

I've already *definitively* proven the core point 2 concern via the exported-API test: `commitLocked` throws on acquire-timeout and the CLI's `commit` branch has no try/catch. The direct-API test is authoritative. Let me do one final clean confirmation that the CLI emits a raw stack trace (not structured JSON) on the uncaught throw, by holding the default lock with a real, long-lived **node** process whose own pid is in the lock.

### Assistant | 2026-06-03T20:00:10.787Z

[tool_use: Bash]

### User | 2026-06-03T20:01:10.079Z

[tool_result] holder node pid=476947
=== CLI commit against live node-held default lock ===
EXIT=1
--- stdout ---
--- stderr (first 6 lines) ---
file:///H:/prism/.claude/helpers/git-commit-mutex.mjs:129
        throw new Error(`commit-mutex: lock held by ${lock?.host ?? "?"}:${lock?.pid ?? "?"} for ${Math.round(ageMs / 1000)}s — acquire timed out after ${timeoutMs}ms`);
              ^

Error: commit-mutex:
... [+163 chars truncated]

### Assistant | 2026-06-03T20:01:14.706Z

Definitively confirmed. With a live node-held lock, the CLI **dumps a raw stack trace to stderr, emits nothing on stdout, and exits 1** (Node's default uncaught-exception code). This contradicts the documented contract in point 2 ("the CLI sets exitCode") which implies a clean structured failure. Let me clean up and write the verdict.

### Assistant | 2026-06-03T20:01:15.500Z

[tool_use: Bash]

### User | 2026-06-03T20:01:42.026Z

[tool_result] cleaned

### Assistant | 2026-06-03T20:02:35.866Z

Independent second-pass review complete. I read both files end-to-end, ran the 17-test suite (all green), and empirically drove the CLI + exported API to verify the throw paths rather than trust the docstrings.

## Findings

### P1 — CLI does NOT catch the acquire-timeout throw (`commit` branch, main:217-230)
`H:\prism\.claude\helpers\git-commit-mutex.mjs:218` calls `commitLocked(...)` with **no try/catch**. I proved (exported-API + live CLI tests) that on acquire-timeout, `acquireCommitLock` throws at `:129`, and because `withCommitLock` calls `acquireCommitLock` *outside* its try block (`:140`), the throw propagates through `commitLocked` (no try/catch around `withCommitLock`) straight out of `main()`.

Observed live-CLI behavior when the default lock is held by a live node pid:
- **stdout: empty** (no `{"ok":false,...}` JSON — breaks the contract that the CLI emits a structured result line)
- **stderr: raw Node stack trace** (`Error: commit-mutex: lock held by ... acquire timed out`)
- **exit code 1** (Node default for an uncaught exception, *not* a deliberately-set `process.exitCode`)

This contradicts the prompt's stated contract ("acquire-timeout throws — confirm that's caught/handled by callers; the CLI sets exitCode"). It is NOT caught. The exit code is *coincidentally* 1, but it's the uncaught-exception default, not a controlled one, and a consumer parsing stdout JSON gets an empty line + a stderr stack trace instead of `{ok:false,error:"...acquire timed out..."}`. Under live 26-chat contention, hitting the 60s timeout is the exact scenario this tool exists for, so this is the realistic failure path — and it surfaces as an ugly crash rather than the structured refusal the rest of the module is so careful to provide.

This does **not** wedge the lock (acquire never succeeded, so nothing to release — the fail-safe `finally` invariant holds), and it doesn't corrupt the index. It's a fail-*ugly*, not fail-*unsafe*. Fix: wrap the `commit` branch body in try/catc
... [+5001 chars truncated]
