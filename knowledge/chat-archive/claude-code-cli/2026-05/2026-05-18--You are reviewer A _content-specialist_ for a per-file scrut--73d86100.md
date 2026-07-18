---
type: "chat-session"
source: "claude-code-cli"
session_id: "73d86100-2d03-42b1-a8cd-0b1e6c5c4977"
title: "You are reviewer A (content-specialist) for a per-file scrutiny gate on PRISM un"
date: "2026-05-18"
first_ts: "2026-05-18T00:49:37.977Z"
last_ts: "2026-05-18T00:57:59.945Z"
cwd: "H:\\prism\\mcp-server"
messages: 105
user_msgs: 38
assistant_msgs: 67
raw_file: "H:/.claude/projects/H--prism/73d86100-2d03-42b1-a8cd-0b1e6c5c4977/subagents/agent-afc722d0c13f536e9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# You are reviewer A (content-specialist) for a per-file scrutiny gate on PRISM un

> **claude-code-cli** | 2026-05-18 | 105 msgs (38 user / 67 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/73d86100-2d03-42b1-a8cd-0b1e6c5c4977/subagents/agent-afc722d0c13f536e9.jsonl`

## Transcript

### User | 2026-05-18T00:49:37.977Z

You are reviewer A (content-specialist) for a per-file scrutiny gate on PRISM unit COMMAND-KERNEL-MS0/U-CK09.

THE CHANGE TO REVIEW (the load-bearing one): `H:\prism\.claude\kernel\psk.mjs` — function `runNode` (around lines 176-225). Read the WHOLE function end-to-end plus its callers (`grep -n "runNode(" H:\prism\.claude\kernel\psk.mjs`).

CONTEXT / what the fix claims to do:
- BUG: `runNode` is `const execFileAsync = promisify(execFile)` then `await execFileAsync(node,[script,...args],{...,input})`. The `input` option is an execFileSync/spawnSync-ONLY option — promisified async execFile SILENTLY IGNORES it, leaving the child's stdin pipe OPEN. `per-agent-handoff.mjs` reads fd 0 (`fs.readFileSync(0)`) → blocks until the 10s timeout kills it → `psk handoff read` deterministically returned ok:false "Command failed" (null exitCode) after ~10.2s on EVERY call.
- FIX: when `opts.input !== undefined`, spawn via the callback form of `execFile` and explicitly `child.stdin.end(String(opts.input))`. The no-input path is supposed to be byte-unchanged (still `execFileAsync`).
- Live-verified post-fix: `psk handoff read` → ok=true 237ms; `psk whoami`/`position` (no-input path) → still ok=true.

YOUR JOB — flag P0/P1 issues and grade PASS/FAIL. Scrutinize specifically:
1. Is the no-input path TRULY byte-unchanged behaviorally? (whoami/position/pick/checkin/record syscalls depend on runNode without input — a regression here breaks the whole kernel.)
2. The new Promise+callback path: error propagation — does the catch block still receive `err.stdout/err.stderr/err.code` correctly so the existing `{ok:false, exitCode, error, stderr}` shape is preserved? execFile's callback gives `(err, stdout, stderr)` and on error `err.code` may be a number (nonzero exit) or undefined (timeout/signal). Does the downstream `exitCode: (err && typeof err.code === "number") ? err.code : null` still hold?
3. `child.stdin.end()` edge cases: child.stdin could be null/undefined if spawn failed; the try/c
... [+1060 chars truncated]

### Assistant | 2026-05-18T00:49:55.721Z

I'll review the load-bearing change to `runNode` in psk.mjs and the regression test.

### Assistant | 2026-05-18T00:49:56.760Z

[tool_use: Bash]

### Assistant | 2026-05-18T00:49:57.198Z

[tool_use: Read]

### User | 2026-05-18T00:49:59.416Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * psk — PRISM Syscall Kernel (CLI dispatch shell)
4	 *
5	 * COMMAND-KERNEL-MS0 / U-CK01 — thin dispatch shell only. Declares the
6	 * 10-syscall surface every PRISM slash-command, hook, and MCP caller can
7	 * resolve live state through. The actual per-syscall semantics ship in
8	 * follow-on units:
9	 *   - U-CK02 fills whoami / manifest / position
10	 *   - U-CK03 
... [+2758 chars truncated]

### User | 2026-05-18T00:50:01.775Z

[tool_result] Exit code 2
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
/usr/bin/grep: H:prism.claudekernelpsk.mjs: No such file or directory
0 matches for 'runNode('

### Assistant | 2026-05-18T00:50:04.990Z

The grep had a path-escaping issue. Let me use the proper tools.

### Assistant | 2026-05-18T00:50:05.826Z

[tool_use: Grep]

### Assistant | 2026-05-18T00:50:06.461Z

[tool_use: Read]

### User | 2026-05-18T00:50:06.499Z

[tool_result] 175:async function runNode(scriptPath, args = [], opts = {}) {
345:  const r = await runNode(driftScript, [], { timeoutMs: TIMEOUT_DEFAULT_MS });
743:  const r = await runNode(pickScript, args, { timeoutMs: TIMEOUT_PICK_MS });
790:    const reclaimR = await runNode(slotsScript, ["reclaim"], { timeoutMs: TIMEOUT_DEFAULT_MS });
802:    const claimR = await runNode(slotsScript, claimArgs, { timeoutMs
... [+162 chars truncated]

### User | 2026-05-18T00:50:07.407Z

[tool_result] 160	// Used by syscalls that wrap an existing CLI helper.
161	// --------------------------------------------------------------------------
162	/**
163	 * Spawn a node helper with PRISM-consistent options. Always returns a
164	 * structured {ok, stdout, stderr, exitCode?, error?} so callers preserve
165	 * stderr/exit info even on failure (Agent A P2 fix — runNode preserves
166	 * stderr on error 
... [+3758 chars truncated]

### Assistant | 2026-05-18T00:50:10.882Z

Now let me look at the handoff caller (line 928) which is the one passing input, and examine the no-input callers more closely.

### Assistant | 2026-05-18T00:50:11.901Z

[tool_use: Read]

### User | 2026-05-18T00:50:14.128Z

[tool_result] 900	    const block = formatTasksBlock(params.tasks);
901	    if (block) {
902	      const existing = String(stateOut || "");
903	      stateOut = existing.includes(TODOWRITE_SNAPSHOT_MARKER)
904	        ? existing
905	        : (existing ? `${block}\n${existing}` : block);
906	    }
907	  }
908	  if (sub === "write") {
909	    args.push("--source", String(params.source || "live-chat"));
910	    i
... [+2342 chars truncated]

### Assistant | 2026-05-18T00:50:17.058Z

Now the regression test. Let me find it.

### Assistant | 2026-05-18T00:50:18.442Z

[tool_use: Grep]

### User | 2026-05-18T00:50:19.735Z

[tool_result] 229-    expect(r.error).toMatch(/expected read\|write/);
230-  });
231-
232:  it("dispatch('handoff',read) does NOT hang on the runNode stdin bug (U-CK09 regression)", async () => {
233-    // FAIL-ON-REVERT ORACLE. Pre-U-CK09, runNode passed `input:""` to a
234-    // promisified execFile — an execFileSync-ONLY option that async execFile
235-    // SILENTLY IGNORES, leaving the child's stdin pipe
... [+17 chars truncated]

### Assistant | 2026-05-18T00:50:30.400Z

[tool_use: Read]

### User | 2026-05-18T00:50:31.358Z

[tool_result] 232	  it("dispatch('handoff',read) does NOT hang on the runNode stdin bug (U-CK09 regression)", async () => {
233	    // FAIL-ON-REVERT ORACLE. Pre-U-CK09, runNode passed `input:""` to a
234	    // promisified execFile — an execFileSync-ONLY option that async execFile
235	    // SILENTLY IGNORES, leaving the child's stdin pipe open. per-agent-
236	    // handoff.mjs reads fd 0 and blocked until TI
... [+2722 chars truncated]

### Assistant | 2026-05-18T00:50:36.349Z

Now let me verify the timeout behavior on the callback form and check whether `execFile`'s timeout actually kills the child when we manually manage stdin. Let me check the Node behavior for `execFile` callback + timeout, and confirm `child.stdin.end()` doesn't interfere.

Let me also check the `syscall_handoff` read path and how the test's terminal flows to confirm the test exercises the input path.

### Assistant | 2026-05-18T00:50:36.951Z

[tool_use: Read]

### User | 2026-05-18T00:50:38.208Z

[tool_result] 855	    note: "use subcommand='composite' for reclaim+claim+drift+commit-hygiene in one call",
856	    result: maybeJson(r.stdout),
857	    warnings: r.stderr ? r.stderr : undefined,
858	  };
859	}
860	
861	async function syscall_handoff(params) {
862	  // Delegate to per-agent-handoff.mjs read/write. U-CK03 absorbs the
863	  // U-TODOWRITE-HANDOFF-BRIDGE behavior on top.
864	  const handoffScript
... [+1829 chars truncated]

### Assistant | 2026-05-18T00:50:43.812Z

Now I have a full picture. Let me verify one critical Node.js semantics question: does `execFile` (callback form) still enforce `timeout` when the caller holds a reference to `child` and calls `child.stdin.end()`? And does the timeout-kill produce an `err` with `err.killed === true` / `err.code === null`?

Let me check Node's documented behavior by examining how the no-input path's `execFileAsync` rejection compares.

### Assistant | 2026-05-18T00:50:47.258Z

[tool_use: Bash]

### User | 2026-05-18T00:50:53.961Z

[tool_result] err? true
err.killed= true err.signal= SIGTERM err.code= null typeof code= object
msg= Command failed: H:\Tools\nodejs\node.exe -e setTimeout(()=>{

### Assistant | 2026-05-18T00:51:03.391Z

This confirms the critical behaviors:

1. **Timeout still works** on the callback form even after `child.stdin.end()` — the child was killed via SIGTERM at 400ms.
2. **Timeout-kill error shape**: `err.killed=true`, `err.signal=SIGTERM`, `err.code=null` (typeof `object`, i.e. `null` is not `"number"`). So `exitCode: (err && typeof err.code === "number") ? err.code : null` → correctly yields `null` on timeout. The downstream `{ok:false, exitCode:null, error}` shape is preserved.
3. **`err.message` is `"Command failed: ..."`** — so the test's `/Command failed/` regex would match a *genuine* timeout-kill (the bug signature), and a fast success won't produce that error at all.

Now let me verify the no-input path is byte-unchanged. The pre-fix code (per the bug description) was `await execFileAsync(node, [script,...args], {...execOpts, input})`. Let me check git to see the actual diff.

### Assistant | 2026-05-18T00:51:04.498Z

[tool_use: Bash]

### User | 2026-05-18T00:51:12.209Z

[tool_result] 6d01e9c7db [MAIN] [COMMAND-KERNEL-MS0]/U-CK02: psk whoami + manifest + position syscalls
d1c72f0e8e [MAIN] [COMMAND-KERNEL-MS0]/U-CK01: psk CLI dispatch shell + prism_session:psk MCP wire
---DIFF---
.claude/kernel/psk.mjs | 305 ++++++++++++++++++++++++++++++++++++++++++++++---
 1 file changed, 288 insertions(+), 17 deletions(-)

--- Changes ---

.claude/kernel/psk.mjs
  @@ -77,6 +77,17 @@ const RE
... [+5342 chars truncated]

### Assistant | 2026-05-18T00:51:19.134Z

The diff confirms the precise change. Key observations from the diff:

- **No-input path**: pre-fix it was `await execFileAsync(node, [script,...args], {timeout, maxBuffer, cwd, ...(input?{input}:{})})`. Post-fix, when no input, it is `await execFileAsync(node, [script,...args], {timeout, maxBuffer, cwd})`. The previous code had `...(opts.input !== undefined ? { input: opts.input } : {})` — so on the **no-input** path, `opts.input` was `undefined`, the spread added nothing, so `execOpts` was already `{timeout, maxBuffer, cwd}`. The new no-input branch passes exactly `{timeout, maxBuffer, cwd}`. **Behaviorally byte-identical** for the no-input path. ✔

Now let me verify the `whoami`/`position` no-input callers actually go through `runNode` without input, and double-check there's no double-resolve risk.

### Assistant | 2026-05-18T00:51:19.841Z

[tool_use: Read]

### User | 2026-05-18T00:51:21.548Z

[tool_result] 335	
336	/**
337	 * Run the drift audit script via runNode; fail-soft.
338	 * @returns {Promise<{ok:boolean, result?:any, error?:string, stderr?:string}>}
339	 */
340	async function runDriftCheck() {
341	  const driftScript = path.join(REPO_ROOT, DRIFT_SCRIPT_REL);
342	  if (!fs.existsSync(driftScript)) {
343	    return { ok: false, error: `drift script missing at ${driftScript}` };
344	  }
345	  
... [+196 chars truncated]

### Assistant | 2026-05-18T00:51:26.241Z

All other callers (lines 345, 743, 790, 802, 842) pass options **without** `input`, so they all take the `execFileAsync` branch — unchanged. Only the handoff caller (928) passes `input` (always a string, possibly `""`).

Let me run the regression test plus the broader psk suite to confirm fail-on-revert behavior and no regressions.

### Assistant | 2026-05-18T00:51:27.391Z

[tool_use: Bash]

### User | 2026-05-18T00:51:33.412Z

[tool_result] timeout: failed to run command 'npx': No such file or directory

### Assistant | 2026-05-18T00:51:37.116Z

[tool_use: Bash]

### User | 2026-05-18T00:51:44.008Z

[tool_result] timeout: failed to run command 'npx': No such file or directory

### Assistant | 2026-05-18T00:51:50.012Z

`cd` does not persist for the Bash tool. Let me use a compound command.

### Assistant | 2026-05-18T00:51:50.664Z

[tool_use: Bash]

### User | 2026-05-18T00:51:54.463Z

[tool_result] timeout: failed to run command 'npx': No such file or directory

### Assistant | 2026-05-18T00:51:57.521Z

The Bash tool's working dir resets and `npx` isn't on PATH from the reset root. Let me use PowerShell which respects the project cwd.

### system

... [25 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-18T00:53:39.177Z

[tool_use: Bash]

### User | 2026-05-18T00:53:43.087Z

[tool_result] .claude/kernel/psk.mjs clean
mcp-server/src/__tests__/psk.test.ts clean

### Assistant | 2026-05-18T00:53:49.149Z

Both files are free of raw control chars. So the `SyntaxError` is not a control-char issue. Let me have vitest/esbuild print the actual error with stack by running the file directly through esbuild, and also confirm whether HEAD's test file loads (to isolate whether U-CK09 introduced it).

### Assistant | 2026-05-18T00:53:50.478Z

[tool_use: PowerShell]

### User | 2026-05-18T00:53:53.286Z

[tool_result] [31;1m▲ [WARNING] "import.meta" is not available with the "cjs" output format and will be empty [empty-import-meta][0m
[31;1m[0m
[31;1m    src/engines/SessionReplayEngine.ts:18:23:[0m
[31;1m      18 │ const REPO_ROOT = join(import.meta.dirname, "../..");[0m
[31;1m         ╵                        ~~~~~~~~~~~[0m
[31;1m[0m
[31;1m  You need to set the output format to "esm" for "im
... [+503 chars truncated]

### Assistant | 2026-05-18T00:54:00.226Z

esbuild bundles the whole import graph (warnings only). The test file itself transforms. The vitest `SyntaxError` happens at runtime during module evaluation, not transform. Let me check whether this is a pre-existing failure by running the suite against the HEAD versions of both files (clean checkout state). I'll use git worktree to avoid touching the shared tree.

Actually, the fastest definitive check: does the `SyntaxError` reproduce when only the `psk.mjs` import is the source-under-test? Let me run a minimal node import of the built psk.mjs and check the dispatcher path the test uses.

### Assistant | 2026-05-18T00:54:01.934Z

[tool_use: Bash]

### User | 2026-05-18T00:54:12.568Z

[tool_result] psk.mjs imported OK; keys: UNRESOLVED_SENTINEL,describeSyscalls,dispatch,formatTasksBlock,listSyscalls,slugForRepo

### Assistant | 2026-05-18T00:54:20.607Z

`psk.mjs` imports cleanly — **the U-CK09 change to `psk.mjs` has no syntax error**. The `SyntaxError` is somewhere in the test file's transitive imports (the test imports the MCP dispatcher too). Let me confirm whether this suite-load failure is **pre-existing at HEAD** (not introduced by U-CK09). I'll run vitest against a temp copy that reverts only the test file's added block.

Better: check if the failure exists at HEAD by running git stash-free comparison. Let me run the suite while temporarily reverting the test file via `git show HEAD:` into a sibling test name.

### Assistant | 2026-05-18T00:54:22.253Z

[tool_use: Bash]

### User | 2026-05-18T00:54:29.255Z

[tool_result] mcp-server/src/__tests__/psk_head_probe.test.ts  18.7K

### Assistant | 2026-05-18T00:54:32.626Z

The probe file imports `./psk.mjs` paths relative to `__tests__`. But the HEAD test imports the *current* psk.mjs (with U-CK09). That's fine — it tests if HEAD's test code (no U-CK09 test) loads. Let me run it.

### Assistant | 2026-05-18T00:54:33.903Z

[tool_use: PowerShell]

### User | 2026-05-18T00:54:37.995Z

[tool_result] Exit code 1
     ↓ action:'psk' with NESTED params wins on collision with FLAT params
     ↓ action:'psk' with missing 'syscall' field fails-soft via the dispatcher
     ↓ action:'psk' with unknown syscall surfaces UNKNOWN_SYSCALL through the wire
     ↓ action:'psk' with 'delta' round-trips the shell placeholder
     ↓ ANTI-REGRESSION: 'psk' is in the dispatcher's available-actions list
[31
... [+443 chars truncated]

### Assistant | 2026-05-18T00:54:43.500Z

**Definitive: the `SyntaxError: Invalid or unexpected token` is PRE-EXISTING.** The HEAD version of the test file (with zero U-CK09 changes) ALSO fails to load with the identical error and skips all 24 tests. This is **not introduced by U-CK09** — it's a pre-existing broken-suite condition (likely in a transitive import, probably the MCP dispatcher chain the test imports for the `prism_session:psk` round-trip block).

Let me clean up the probe file and confirm the root cause is in a transitive import, not psk.mjs.

### Assistant | 2026-05-18T00:54:44.315Z

[tool_use: Bash]

### User | 2026-05-18T00:54:51.128Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for '^import\|require('

### Assistant | 2026-05-18T00:54:55.064Z

[tool_use: Read]

### User | 2026-05-18T00:54:57.034Z

[tool_result] 1	/**
2	 * psk.test.ts — COMMAND-KERNEL-MS0/U-CK01 acceptance tests.
3	 *
4	 * Covers the U-CK01 exit conditions:
5	 *   1. `node .claude/kernel/psk.mjs --help` enumerates every declared syscall
6	 *      (count DERIVED from psk's own table, NOT a hardcoded literal).
7	 *   2. `prism_session:psk` MCP action round-trips a syscall via the dispatcher.
8	 *   3. ≥8 cases incl. fail-soft on every sysca
... [+1084 chars truncated]

### Assistant | 2026-05-18T00:55:04.240Z

The test imports `registerSessionDispatcher` from `../tools/dispatchers/sessionDispatcher.js` — a very large dispatcher with a deep transitive import graph. The `SyntaxError: Invalid or unexpected token` is somewhere in that graph (pre-existing, unrelated to U-CK09). 

This matches a known PRISM condition documented in CLAUDE.md (the fleet-reaper note): *"vitest harness currently blocked by a pre-existing vite-transform bug — code verified via `node --check` + esbuild + plain-import + a live production sweep."* The U-CK09 fix verification path (live `psk handoff read` → 237ms) is the correct fallback given this pre-existing harness blockage.

Let me independently reproduce the U-CK09 fix behavior live to confirm the fix actually works and the test logic *would* pass if the suite loaded.

### Assistant | 2026-05-18T00:55:09.144Z

[tool_use: Bash]

### User | 2026-05-18T00:55:20.025Z

[tool_result] INPUT-PATH  elapsed=111ms  ok=true  timeoutKillSig=false  err=
NOINPUT(whoami) ok=true  syscall=whoami
NOINPUT(position) ok=true  syscall=position

### Assistant | 2026-05-18T00:55:25.610Z

Live verification confirms the fix is correct and complete:

- **Input path** (the bug): `psk handoff read` with valid terminal → **111ms** (was ~10,200ms), `ok=true`, `timeoutKillSig=false`. The test's two assertions (`elapsedMs < 9000` and `isTimeoutKillSignature === false`) **both pass against the fixed code**.
- **No-input path**: `whoami` and `position` → `ok=true`, unchanged. No regression.

Now let me verify the fail-on-revert property: would the test FAIL against the OLD buggy `runNode`? Let me reconstruct the old behavior and test it directly.

### Assistant | 2026-05-18T00:55:29.981Z

[tool_use: Bash]

### User | 2026-05-18T00:55:37.993Z

[tool_result] OLD-BUGGY elapsed=4ms  killed=undefined  exitCode=null  timeoutKillSig=false

### Assistant | 2026-05-18T00:55:43.409Z

Interesting — the old buggy path returned in **4ms**, not ~10,200ms, in this isolated reproduction. This is a critical finding for the fail-on-revert property. Let me investigate why — the helper may exit fast here because there is no actual stdin TTY in this `node -e` context (stdin is already closed/inherited differently). Let me reproduce the OLD path exactly as `runNode`/`dispatch` would invoke it, and check what `per-agent-handoff.mjs` does with fd 0.

### Assistant | 2026-05-18T00:55:44.490Z

[tool_use: Bash]

### User | 2026-05-18T00:55:49.883Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
5 matches in 1 files:

.claude/helpers/per-agent-handoff.mjs:889:function readStdinSessionId() {
.claude/helpers/per-agent-handoff.mjs:892:// isatty(0) — NOT process.stdin.isTTY. Touching the `process.stdin` getter
.claude/helpers/per-agent-handoff.mjs:893:// lazily constructs a Stream over fd 0; when 
... [+193 chars truncated]

### Assistant | 2026-05-18T00:55:56.455Z

[tool_use: Read]

### User | 2026-05-18T00:55:57.342Z

[tool_result] 885	 *
886	 * Rollback: set PRISM_HANDOFF_STDIN_AUTH=0 to fall back to legacy
887	 * --terminal-first resolution.
888	 */
889	function readStdinSessionId() {
890	  if (process.env.PRISM_HANDOFF_STDIN_AUTH === "0") return null;
891	  try {
892	    // isatty(0) — NOT process.stdin.isTTY. Touching the `process.stdin` getter
893	    // lazily constructs a Stream over fd 0; when fd 0 is a pipe (a Claud
... [+1132 chars truncated]

### Assistant | 2026-05-18T00:56:06.337Z

Now I understand the exact mechanism, and this reveals a **subtle but critical caveat for the fail-on-revert oracle**:

`readStdinSessionId()` calls `fs.readFileSync(0, "utf-8")` ONLY when `isatty(0)` is false. `fs.readFileSync(0)` on a **pipe** blocks until EOF. The hang occurs because:

- **OLD buggy `runNode`**: `promisify(execFile)` ignores `input`. The child's stdin is a **pipe** (execFile default `stdio: 'pipe'`), `isatty(0)` is false → `readFileSync(0)` blocks waiting for EOF that never comes (parent never writes/closes it) → 10s timeout kill.
- **My isolated repro returned in 4ms** because in that `node -e` context the inherited fd-0 environment differed (the parent's stdin was likely already at EOF / not a live pipe held open), so `readFileSync(0)` returned immediately. **This means the bug's ~10,200ms timing is environment-dependent, not deterministic in all invocation contexts.**

This is important. Let me verify the bug actually reproduces (the ~10s hang) when invoked through the *actual old runNode code path* via `execFile` with a held-open pipe — the real production scenario. Let me reconstruct it faithfully.

### Assistant | 2026-05-18T00:56:11.257Z

[tool_use: Bash]

### User | 2026-05-18T00:56:18.364Z

[tool_result] OLD faithful: elapsed=4ms killed=undefined signal=undefined exitCode=null

### Assistant | 2026-05-18T00:56:31.127Z

**Critical finding.** Even with the faithful old `runNode` invocation (execFileAsync, no input, child stdin pipe held open by the parent), the helper returns in **4ms** — it does **NOT** block on fd 0 in this Bash-tool execution context.

The reason: `readStdinSessionId()` only does `readFileSync(0)` when `isatty(0)` is false. But when the child process is spawned by `execFile` whose parent's own fd-0 environment is non-blocking/at-EOF (as in the Bash tool / vitest worker, where stdin is `/dev/null`-like or already-closed), the child's inherited pipe behavior differs, OR the helper's resolution falls through fast for `claude-00000000` (a terminal with no handoff file) before ever blocking.

This raises a **P1 concern about the regression test's fail-on-revert property**: the test claims *"Reverting the fix flips BOTH assertions"* — but I have just empirically demonstrated that the OLD buggy code does **NOT** hang (returns in ~4ms) in at least one common execution context (the Bash-tool / non-TTY-non-pipe stdin environment, which is essentially what a CI/vitest worker also presents). If the bug only manifests when fd 0 is a genuinely-blocking live pipe (real Claude hook invocation), then **in the vitest harness the OLD code would also return fast** → `elapsedMs < 9000` would be TRUE and `isTimeoutKillSignature` would be FALSE against the OLD code too → **the test would PASS against the buggy code = NOT a true fail-on-revert oracle.**

Let me verify what the OLD code actually returns for this exact dispatch (does it error or succeed fast?) to assess whether ANY assertion flips on revert.

### Assistant | 2026-05-18T00:56:35.162Z

[tool_use: Bash]

### User | 2026-05-18T00:56:42.888Z

[tool_result] OLD errored. elapsed=4 exitCode=null msg=spawn H:\Tools\nodejs\node.exe ENOENT stdout=""

### Assistant | 2026-05-18T00:56:51.627Z

There's the explanation for the 4ms returns: in the **Bash tool environment** `process.execPath` resolves to `H:\Tools\nodejs\node.exe` which gets `spawn ... ENOENT` — the child never even launches here, so my Bash-tool reproductions are **invalid for assessing the bug timing** (the Bash tool uses a different node than the one available to spawned children). The `4ms` was a spawn failure, not a fast helper return.

My earlier **PowerShell live verification** is the trustworthy one (it ran in the project environment): `psk handoff read` → 111ms post-fix, and the task brief states the pre-fix behavior was deterministically ~10.2s in the real psk environment. The Bash-tool spawn-ENOENT means I cannot reproduce the OLD hang here, but I also cannot *disprove* the fail-on-revert property from the Bash tool. Let me verify the fail-on-revert and the bug timing properly through PowerShell, which uses the correct node.

### Assistant | 2026-05-18T00:56:55.723Z

[tool_use: PowerShell]

### User | 2026-05-18T00:57:16.914Z

[tool_result] OLD-PATH errored elapsed=9012ms killed=true signal=SIGTERM exitCode=null msg=Command failed: H:\Tools\nodejs\node.exe H:\PRISM\.claude\helpers\per-

### Assistant | 2026-05-18T00:57:59.945Z

**This is the definitive proof of the fail-on-revert property.** In the correct node environment (PowerShell, same as vitest worker), the OLD buggy `runNode` path:

- **Hangs for 9012ms** (the full timeout, here capped at 9000ms; in production with `TIMEOUT_DEFAULT_MS`=10000 it's ~10,200ms)
- `killed=true`, `signal=SIGTERM`, `exitCode=null`
- `err.message` = `"Command failed: H:\Tools\nodejs\node.exe H:\PRISM\.claude\helpers\per-..."`

Mapping to the test's assertions against the OLD code:
- `elapsedMs` ≈ 10,200ms in production → `expect(elapsedMs).toBeLessThan(9_000)` → **FAILS** (flips ✔)
- `r.error` matches `/Command failed/`, `r.fallback.exitCode === null` (from `exitCode: (typeof err.code === "number") ? err.code : null` → null since err.code is undefined on SIGTERM) → `isTimeoutKillSignature === true` → `expect(isTimeoutKillSignature).toBe(false)` → **FAILS** (flips ✔)

**Both assertions flip on revert. The test IS a sound fail-on-revert oracle, and the 9000ms discriminator is correct** (bug ≈ 10,200ms > 9000; fix ≈ 111-237ms < 9000). The earlier Bash-tool 4ms results were spawn-ENOENT artifacts (wrong node path), not evidence against the oracle. My PowerShell live test ran in the same node environment vitest uses, so this is authoritative.

Now I have everything. Let me compile the findings.

## Review Findings — U-CK09 (`psk.mjs` `runNode` + regression test)

### Verified correct (no findings)

1. **No-input path byte-unchanged** — Confirmed via `git diff`. Pre-fix the no-input case already produced `execOpts = {timeout, maxBuffer, cwd}` (the `...(opts.input !== undefined ? {input} : {})` spread added nothing when input was undefined), and the post-fix `else` branch passes exactly `{timeout, maxBuffer, cwd}` to the same `execFileAsync`. All five no-input callers (lines 345, 743, 790, 802, 842) are behaviorally identical. Live-verified `whoami`/`position` → `ok:true`, unchanged.

2. **Error propagation preserved** — Empirically confirmed (Node repro): `execFi
... [+5975 chars truncated]
