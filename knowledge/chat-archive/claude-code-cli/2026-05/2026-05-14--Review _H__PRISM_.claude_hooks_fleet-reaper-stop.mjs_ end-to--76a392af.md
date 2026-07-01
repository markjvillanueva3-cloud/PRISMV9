---
type: "chat-session"
source: "claude-code-cli"
session_id: "76a392af-6ede-4688-ba7e-5ef9ec1099cd"
title: "Review `H:\\PRISM\\.claude\\hooks\\fleet-reaper-stop.mjs` end-to-end (read the WHOLE"
date: "2026-05-14"
first_ts: "2026-05-14T14:20:23.802Z"
last_ts: "2026-05-14T14:24:21.389Z"
cwd: "H:\\PRISM"
messages: 32
user_msgs: 12
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/76a392af-6ede-4688-ba7e-5ef9ec1099cd/subagents/agent-a52d7a8ca60893805.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Review `H:\PRISM\.claude\hooks\fleet-reaper-stop.mjs` end-to-end (read the WHOLE

> **claude-code-cli** | 2026-05-14 | 32 msgs (12 user / 20 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/76a392af-6ede-4688-ba7e-5ef9ec1099cd/subagents/agent-a52d7a8ca60893805.jsonl`

## Transcript

### User | 2026-05-14T14:20:23.802Z

Review `H:\PRISM\.claude\hooks\fleet-reaper-stop.mjs` end-to-end (read the WHOLE file). It is a new PRISM Stop-hook: when any of 7 concurrent Claude chats ends, it launches a slot-aware orphan-process reaper sweep.

CONTRACT it must satisfy:
- ADVISORY ONLY: must ALWAYS emit `{continue:true}` to stdout and exit 0 — it must NEVER block Stop, never throw, never hang.
- It launches `scripts/fleet-reaper-sweep.mjs --once --stop-event` DETACHED (`spawn(..., {detached:true}).unref()`) so the hook returns in ~ms even though a sweep can take 1-30s.
- Honors `PRISM_FLEET_REAPER_DISABLE=1` → silent no-op (`{continue:true}`, no spawn).
- The sweep is launched WITHOUT `--detach` (the hook detaches it itself; `--detach` would be a redundant second hop).

Reference pattern: `H:\PRISM\.claude\hooks\git-lock-sweeper.mjs` is a sibling Stop hook — compare conventions (the `#!/usr/bin/env node` + `// tier:` header, the `{continue:true}` emit shape, the `main().catch()` safety net, stdin handling).

Verify rigorously:
1. NO path can throw, hang, or fail to emit `{continue:true}`. Trace: stdin drain (`readFileSync(0)` — can it hang if the harness doesn't close stdin? git-lock-sweeper uses an async 200ms-bounded read instead — is the synchronous `readFileSync(0)` safe here, or should it be bounded?), the `existsSync` check, the `spawn` in try/catch, the disabled-env path. Does `main()` need a top-level `.catch()` / try-wrap like git-lock-sweeper has? `main()` is synchronous here — confirm a synchronous throw anywhere still results in `{continue:true}` OR assess whether it can crash without emitting.
2. `spawn` with `{detached:true, stdio:"ignore"}` + `child.unref()` — is this the correct, complete recipe for "hook exits immediately, child lives on" on Windows? Any handle that would keep the hook's event loop alive?
3. The `SWEEP_SCRIPT` path resolution via `fileURLToPath(import.meta.url)` + `join(__dirname, "..", "..", "scripts", ...)` — does that correctly resolve `H:/prism/.claude/hook
... [+733 chars truncated]

### Assistant | 2026-05-14T14:20:30.987Z

I'll review the file end-to-end, comparing against the sibling reference hook.

### Assistant | 2026-05-14T14:20:31.638Z

[tool_use: Read]

### Assistant | 2026-05-14T14:20:32.035Z

[tool_use: Read]

### User | 2026-05-14T14:20:33.691Z

[tool_result] read-once-guard: 'H:\PRISM\.claude\hooks\git-lock-sweeper.mjs' was already read 3m ago in this session and is unchanged (mtime 1778643486267). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-14T14:20:35.710Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * fleet-reaper-stop.mjs — Stop-hook arm of the slot-aware orphan reaper.
5	 *
6	 * When any of the 7 concurrent chats ends, kick a slot-aware sweep so the
7	 * just-ended chat's orphan node/git/bash processes get noticed promptly instead
8	 * of waiting up to ~5 min for the next scheduled-task / Monitor tick. A chat
9	 * that crashes or is closed withou
... [+3389 chars truncated]

### Assistant | 2026-05-14T14:20:39.583Z

The reference hook wasn't re-read (cache guard), but its content is in my context from earlier this session. Let me retrieve the relevant parts to compare conventions precisely.

### Assistant | 2026-05-14T14:20:41.954Z

[tool_use: Grep]

### Assistant | 2026-05-14T14:20:42.808Z

[tool_use: Read]

### User | 2026-05-14T14:20:45.220Z

[tool_result] 2:// tier: T2
120:// U-C2: read stdin synchronously to detect PreToolUse mode + git command match.
128:    process.stdin.on("data", (c) => { buf += c; });
129:    process.stdin.on("end", fin);
130:    setTimeout(fin, 200);
134:async function main() {
158:      continue: true,
165:    process.stdout.write(JSON.stringify({ continue: true }));
169:main().catch(() => {
170:  process.stdout.write(JSON.
... [+31 chars truncated]

### User | 2026-05-14T14:20:46.069Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * git-lock-sweeper.mjs — HS-02 mid-session stale-lock cleanup.
5	 *
6	 * Phase 1 (HS-02, 2026-05-12): Stop/UserPromptSubmit sweep with 5/60 min ages.
7	 * Phase 2 (DEV-VELOCITY-AUTOTRIGGER-MS0/U-C2, 2026-05-12): + PreToolUse:Bash
8	 * arm with retry-with-backoff and a shorter 30s min-age when fired immediately
9	 * before a git command. Rationale: a 30-
... [+2428 chars truncated]

### Assistant | 2026-05-14T14:20:49.478Z

Let me see the stdin-handling section of git-lock-sweeper (lines 115-170) to compare the stdin-read strategy precisely.

### Assistant | 2026-05-14T14:20:50.297Z

[tool_use: Read]

### User | 2026-05-14T14:20:52.826Z

[tool_result] 115	    walk(refsHeads);
116	  } catch { /* ignore */ }
117	  return removed;
118	}
119	
120	// U-C2: read stdin synchronously to detect PreToolUse mode + git command match.
121	// Falls back to whole-buffer collection only — same as the readStdin pattern in
122	// edit-bundle.mjs / posttool-edit-bundle.mjs. Bounded to ~200ms then proceeds.
123	function readStdinPayload() {
124	  return new Promis
... [+2043 chars truncated]

### Assistant | 2026-05-14T14:20:56.034Z

I now have both files fully in context. Let me also confirm the sweep script exists and check the directory layout for the worktree-safety question.

### Assistant | 2026-05-14T14:20:57.400Z

[tool_use: Bash]

### Assistant | 2026-05-14T14:20:58.762Z

[tool_use: Grep]

### User | 2026-05-14T14:21:02.603Z

[tool_result] No matches found

### User | 2026-05-14T14:21:16.020Z

[tool_result] -rwxr-xr-x 1 Mark V 197608 36076 May 14 08:22 H:/PRISM/scripts/fleet-reaper-sweep.mjs*
---hooks dir---
H:/PRISM/.claude/hooks/fleet-reaper-stop.mjs*
---node version---
v22.12.0

### Assistant | 2026-05-14T14:21:19.058Z

I have everything needed. The sweep script exists, node is v22.12.0, and the hook is not yet wired into settings.json (expected — that's task #7). Let me verify the one critical behavioral question: whether `readFileSync(0)` can hang.

### Assistant | 2026-05-14T14:21:22.749Z

[tool_use: Bash]

### User | 2026-05-14T14:21:43.111Z

[tool_result] test1: piped stdin (hook mode)
read ok, len=14
test2: no stdin redirect (CLI mode, inherits terminal-ish)
read ok, len=0
test3: closed stdin
read ok, len=0

### Assistant | 2026-05-14T14:21:45.841Z

Now let me test the one genuinely dangerous case — an **open pipe that is never closed** (the harness writes the payload but keeps the pipe handle open, or a TTY):

### Assistant | 2026-05-14T14:21:48.932Z

[tool_use: Bash]

### User | 2026-05-14T14:22:15.051Z

[tool_result] test4: open pipe, writer sleeps then writes WITHOUT closing (simulates harness holding pipe open)
read ok after 2616ms len=0
exit=124 (124 = timed out = HANG confirmed)

### Assistant | 2026-05-14T14:22:19.198Z

Confirmed. `readFileSync(0)` **blocks until EOF** on an open pipe. When the writer keeps the pipe open without closing it, `readFileSync(0)` hangs indefinitely (the test timed out at 3s; it would have waited the full 5s, and forever if the writer never closed). This is the central finding.

Let me also check how other PRISM Stop hooks that the harness fires handle stdin, to establish whether the harness reliably closes the pipe.

### Assistant | 2026-05-14T14:22:21.338Z

[tool_use: Bash]

### User | 2026-05-14T14:22:46.391Z

[tool_result] _envelope.mjs
agent-pid-tracker.mjs
agent-rules-inject.mjs
agent-vs-direct.mjs
aggressive-killer-stop.mjs
ai-feature-recommend.mjs
ai-system-router-inject.mjs
anti-pattern-detector.mjs
api-contract-enforcer.mjs
archived-skill-suggest.mjs
asset-deletion-block.mjs
async-pattern-checker.mjs
auto-bug-hunt-after-build.mjs
auto-consensus-critical-edit.mjs
auto-consensus-userprompt.mjs
auto-fork-executor
... [+213 chars truncated]

### Assistant | 2026-05-14T14:22:51.526Z

234 hooks use the synchronous `readFileSync(0)` pattern and the fleet runs fine, so empirically the harness *does* close the stdin pipe after writing the payload. But that's an undocumented harness behavior the contract explicitly flagged as a risk — and git-lock-sweeper (the designated reference sibling) deliberately uses the bounded async pattern. Let me check one more thing: how `node-process-janitor.mjs` (cited in the hook's own comment as the pattern it mirrors) actually does it.

### Assistant | 2026-05-14T14:22:53.146Z

[tool_use: Grep]

### User | 2026-05-14T14:22:55.215Z

[tool_result] 82-}
83-
84:// Drain stdin (hook input) — we don't need it. Only when invoked as a hook;
85:// a scheduled-task / CLI invocation has no stdin pipe and reading fd 0 there
86-// can block waiting for an EOF that never comes.
87-if (!FULL) {
88:  try { readFileSync(0, "utf-8"); } catch {}
89-}
90-

### Assistant | 2026-05-14T14:24:21.389Z

Key finding: `node-process-janitor.mjs` — the very file `fleet-reaper-stop.mjs` says it mirrors — **explicitly guards the `readFileSync(0)` call behind `if (!FULL)`** because (its own comment) "a scheduled-task / CLI invocation has no stdin pipe and reading fd 0 there can block waiting for an EOF that never comes." `fleet-reaper-stop.mjs` claims to mirror this pattern but **dropped the guard** — it calls `readFileSync(0)` unconditionally with only a comment saying "no stdin pipe (CLI invocation) — fine," which my test4 disproves for the open-pipe case.

I have everything. Here's the review.

---

## Code Quality Analysis Report — `fleet-reaper-stop.mjs`

### Summary
- **Overall Quality Score: 7.5/10**
- **Files Analyzed:** 1 (`H:\PRISM\.claude\hooks\fleet-reaper-stop.mjs`, 83 lines) + 2 reference siblings
- **Issues Found:** 5 (0 P0, 1 P1, 2 P2, 2 P3)
- **Grade: FAIL** — one P1 (unbounded synchronous stdin read can hang the hook) must be fixed before this satisfies the "NEVER hang" contract clause. Everything else in the contract is satisfied cleanly.

The hook is well-structured, well-documented, and the spawn/detach/emit logic is correct. The single blocking issue is the stdin drain strategy, which contradicts both the contract and the hook's own cited reference patterns.

---

### P1 — Unbounded synchronous `readFileSync(0)` can hang the hook indefinitely
**File:** `H:\PRISM\.claude\hooks\fleet-reaper-stop.mjs:55`

```js
try { readFileSync(0, "utf-8"); } catch { /* no stdin pipe (CLI invocation) — fine */ }
```

`readFileSync(0)` blocks until **EOF**, not until "data available." I verified this empirically (test4 above): when a writer holds the pipe open without closing it, `readFileSync(0)` waits the full duration the pipe stays open — and **forever** if it's never closed. The `try/catch` does not help: a hang is not a throw.

The contract explicitly calls this out: *"can it hang if the harness doesn't close stdin? git-lock-sweeper uses an async 200ms-bounded re
... [+12531 chars truncated]
