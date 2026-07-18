---
type: "chat-session"
source: "claude-code-cli"
session_id: "d6db4d0e-8d82-43ba-81ed-4ecf23224ed6"
title: "You are reviewer B of PRISM's 3-of-3 scrutiny gate — weighted toward TEST INTEGR"
date: "2026-06-17"
first_ts: "2026-06-17T18:12:18.782Z"
last_ts: "2026-06-17T18:16:43.022Z"
cwd: "H:\\prism"
messages: 59
user_msgs: 21
assistant_msgs: 38
raw_file: "H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-ab9a4a030f170daae.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# You are reviewer B of PRISM's 3-of-3 scrutiny gate — weighted toward TEST INTEGR

> **claude-code-cli** | 2026-06-17 | 59 msgs (21 user / 38 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-ab9a4a030f170daae.jsonl`

## Transcript

### User | 2026-06-17T18:12:18.782Z

You are reviewer B of PRISM's 3-of-3 scrutiny gate — weighted toward TEST INTEGRITY, dispatcher-wiring completeness, inlined-constant detection, and weakened assertions. Do NOT assume reviewer A caught everything. Review commit `4052c5af4b` on slot/bravo.

Inspect: `git -C H:/prism-slot-bravo show 4052c5af4b`. Read fully:
- H:/prism-slot-bravo/scripts/hermes-control-bridge.mjs
- H:/prism-slot-bravo/scripts/hermes-control-bridge.test.mjs

THE CHANGE: adds served-token adoption to the Hermes control bridge's `ensureBackend()` — recover `window.__HERMES_SESSION_TOKEN__` from a running dashboard's index (GET /), adopt it ONLY after it authorizes GET /api/config (2xx); refuse a squatter (fail-loud); opt-out env `PRISM_HERMES_NO_ADOPT_TOKEN=1`; adopted flag sticky across the reuse path; `stop` refuses to kill an adopted backend. New exports `extractInjectedDashboardToken`, `resolveServedToken`. +10 tests.

YOUR FOCUS — scrutinize the 10 NEW tests in hermes-control-bridge.test.mjs HARD (R9):
- Does each test FAIL if the corresponding logic regresses? (e.g. if adoption silently returned a token without the protected-route check, would a test catch it? If the sticky-adopted reuse fix were reverted, does the "SURVIVES reuse" test go red?) Verify by reasoning about each assertion.
- Are the mock servers REAL (node:http) and do they actually gate the protected route on the served token, or is the gate faked?
- Any `.skip`/`.only` accidentally committed? Any blanket `toBeDefined`/`ok(true)`-style stubs?
- Is the squatter-refusal test genuinely distinct from the no-token test (different failure mode)?
- WIRING: the bridge is a lib; every consumer (getConfig/setConfig/call/CLI) flows through `ensureBackend` — confirm the change reaches all of them and nothing bypasses the new path. Are the two new functions exported AND consumed?
- Any inlined magic constants that should be named? Any token/secret literals that are real credentials vs synthetic fixtures?

FIRST LINE exactly `VERDI
... [+94 chars truncated]

### Assistant | 2026-06-17T18:12:22.985Z

I'll review commit `4052c5af4b` on the slot/bravo worktree, focusing on test integrity and wiring completeness.

### Assistant | 2026-06-17T18:12:23.942Z

[tool_use: Bash]

### Assistant | 2026-06-17T18:12:24.406Z

[tool_use: Read]

### Assistant | 2026-06-17T18:12:24.672Z

[tool_use: Read]

### User | 2026-06-17T18:12:27.981Z

[tool_result] commit 4052c5af4b43ba692118ee2b7cea8adb319db3fb
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Wed Jun 17 13:10:39 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-CONTROL]/U-BRIDGE-ADOPT-RUNNING-TOKEN (slot:bravo): control bridge adopts an ALREADY-RUNNING dashboard's served token
    
    Operator directive ('test the hermes bridge, operate as a hermes agent, continue 
... [+1316 chars truncated]

### User | 2026-06-17T18:12:28.758Z

[tool_result] read-once-guard: 'H:\prism-slot-bravo\scripts\hermes-control-bridge.test.mjs' was already read 5s ago in this session and is unchanged (mtime 1781719823697). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### User | 2026-06-17T18:12:28.793Z

[tool_result] read-once-guard: 'H:\prism-slot-bravo\scripts\hermes-control-bridge.mjs' was already read 8s ago in this session and is unchanged (mtime 1781719823685). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### Assistant | 2026-06-17T18:12:32.182Z

The files are already in my context from the earlier reads. Let me work with what I have. Let me re-read both files to ensure I have the full, current content, since the guard says they're in context but I need to verify line numbers precisely.

### Assistant | 2026-06-17T18:12:32.860Z

[tool_use: Bash]

### User | 2026-06-17T18:12:36.681Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * hermes-control-bridge.mjs -- PRISM programmatic control of the Nous Hermes
     4	 * desktop app's backend, WITHOUT the (broken, restart-looping) Electron renderer.
     5	 * (HERMES-CONTROL-MS0/U-BRIDGE-CORE, slot:zulu 2026-06-18.)
     6	 *
     7	 * The Hermes desktop is an Electron UI + a FastAPI Python backend
     8	 * (hermes_cli/web_server.py
... [+19704 chars truncated]

### Assistant | 2026-06-17T18:12:39.046Z

Now let me read the test file with line numbers.

### Assistant | 2026-06-17T18:12:39.912Z

[tool_use: Bash]

### User | 2026-06-17T18:12:43.582Z

[tool_result]      1	// Tests for hermes-control-bridge.mjs (HERMES-CONTROL-MS0).
     2	//
     3	// Two layers:
     4	//   1. PURE: deepMerge -- the clobber-prevention logic. A bug here would WIPE the
     5	//      operator's Hermes config (PUT /api/config REPLACES the full body.config), so
     6	//      this is the highest-value unit under test (R9: the test fails if a merge
     7	//      regression lets
... [+14693 chars truncated]

### Assistant | 2026-06-17T18:12:48.140Z

Now I have both files fully. Let me trace the critical wiring concern: the sidecar is at a **hard-coded `H:/prism/state/shared/.hermes-control-bridge.json`** path. The tests call `ensureBackend` repeatedly and rely on `writeSidecar`/`readSidecar` against that real shared path. This is a test-isolation and cross-test-contamination concern. Let me verify whether the sidecar path is hermetic in tests, and whether the "sticky reuse" test actually exercises the reuse path correctly given shared state.

### Assistant | 2026-06-17T18:12:49.463Z

[tool_use: Grep]

### User | 2026-06-17T18:12:50.861Z

[tool_result] 49:const SIDECAR = "H:/prism/state/shared/.hermes-control-bridge.json"; // {port, token, pid, at}
64:function readSidecar() {
65:  try { return JSON.parse(readFileSync(SIDECAR, "utf8")); } catch { return null; }
67:function writeSidecar(obj) {
68:  try { mkdirSync(dirname(SIDECAR), { recursive: true }); writeFileSync(SIDECAR, JSON.stringify(obj, null, 2)); } catch { /* best-effort */ }
142:  const
... [+827 chars truncated]

### Assistant | 2026-06-17T18:12:50.901Z

[tool_use: Grep]

### User | 2026-06-17T18:12:52.538Z

[tool_result] 232:  const prev = process.env.PRISM_HERMES_NO_ADOPT_TOKEN;
233:  process.env.PRISM_HERMES_NO_ADOPT_TOKEN = "1";
237:    if (prev === undefined) delete process.env.PRISM_HERMES_NO_ADOPT_TOKEN; else process.env.PRISM_HERMES_NO_ADOPT_TOKEN = prev;
250:  // Reproduces the live gap: 1st call adopts (writes sidecar adopted:true), 2nd call hits the
251:  // REUSE path (sidecar token works) -- which must
... [+36 chars truncated]

### Assistant | 2026-06-17T18:13:01.728Z

Now I have the key concern crystallized. The tests rely on the real shared sidecar at `H:/prism/state/shared/.hermes-control-bridge.json`, with no `beforeEach`/`afterEach` reset, no env override, no tmpdir. Let me trace the test-isolation implications carefully for each of the new tests, and confirm whether this creates a real correctness gap in the "sticky reuse" test (the one specifically called out).

Let me reason through the sidecar state flow across the new tests:

1. The tests run in **file order** under `node:test` (sequential by default for top-level `test()` unless concurrency is enabled). Each `ensureBackend` call against `startRunningDashboard` writes to the **same global sidecar file**.

2. **"ADOPTS" test (line 204)**: First adoption. `readSidecar()` returns whatever the prior test left (or null on a clean run). The mock port is random (`listen(0)`), so `sc.port === port` is almost always false → the reuse loop at line 144 is skipped (token=null, and `sc.port !== port`). Goes to the bare-probe adoption path. Writes sidecar `{port: <random>, token: v, adopted: true}`.

Let me verify the critical question: in the **"sticky reuse" test (line 249)**, does the 2nd `ensureBackend` call actually hit the reuse path (line 144-148)? It requires `sc.port === port`. The first call writes the sidecar with that test's random port. The second call reads it back — same port → reuse path fires. Good, that works *because writeSidecar persists to the real file*. But there's a subtle ordering hazard. Let me check.

### Assistant | 2026-06-17T18:13:02.942Z

[tool_use: Bash]

### User | 2026-06-17T18:13:06.553Z

[tool_result] --- exit ---

### Assistant | 2026-06-17T18:13:09.545Z

The sidecar doesn't currently exist in this worktree (the bridge resolves `SIDECAR` to `H:/prism/state/shared/...`, the main tree, not this worktree). Let me check the main tree, since that's the actual path the bridge writes to during tests run from anywhere.

### Assistant | 2026-06-17T18:13:10.444Z

[tool_use: Bash]

### User | 2026-06-17T18:13:14.315Z

[tool_result] -rw-r--r-- 1 wompu 197611 146 Jun 17 13:06 /h/prism/state/shared/.hermes-control-bridge.json
--- contents ---
{
  "port": 9119,
  "token": "5JEMkwCBUoy7UGSfgPM6z0x7YV1T5Nk5CxBoxsrpWhk",
  "pid": null,
  "adopted": true,
  "at": "2026-06-17T18:06:16.601Z"
}--- exit 0 ---

### Assistant | 2026-06-17T18:13:21.354Z

There's a **real live sidecar** at the main-tree path with `port: 9119, adopted: true`. This confirms the bridge writes to a shared, fixed, non-test-isolated path. This is the test-isolation hazard. There's a live token `5JEMkwCBUoy7UGSfgPM6z0x7YV1T5Nk5CxBoxsrpWhk` written there — that's a real adopted credential persisted in plaintext on disk, but that's the bridge's runtime behavior (not part of this diff's test fixtures, and not committed). Let me verify it's gitignored / not committed.

### Assistant | 2026-06-17T18:13:22.549Z

[tool_use: Bash]

### User | 2026-06-17T18:13:26.559Z

[tool_result] check-ignore exit: 1
---tracked?---
ls-files done

### Assistant | 2026-06-17T18:13:31.169Z

The sidecar is **not gitignored** (check-ignore exit 1 = not ignored) but currently **untracked** (ls-files empty). So a future `git add -A` could commit a real adopted Hermes session token. That's a P1 security/I-O concern, though it's about the bridge runtime path rather than the diff's test fixtures. Let me confirm the `.gitignore` doesn't cover it via a broader pattern and that the `.log` sibling is also unignored.

### Assistant | 2026-06-17T18:13:32.898Z

[tool_use: Bash]

### User | 2026-06-17T18:13:37.071Z

[tool_result] state/shared/.hermes-control-bridge.log
log ignore exit: 0
--- grep gitignore for hermes/sidecar patterns ---
47:state/shared/.fleet-reaper-stop.stamp
110:state/shared/.tool-runtimes.jsonl
111:state/shared/.git-freeze-active
112:state/shared/.git-freeze-branch-tips.json
113:state/shared/.git-freeze-parse-error.log
174:state/shared/.cron-locks/*.lock
176:state/shared/.mcp-server-3100.lock
177:state
... [+339 chars truncated]

### Assistant | 2026-06-17T18:13:47.274Z

Interesting: the `.log` IS gitignored (`*.log` somewhere catches it, exit 0), but the `.json` sidecar is **not** — and there's even a precedent at line 243 `state/shared/.brain-web-token` being explicitly gitignored as a token-bearing file. The sidecar carrying a live adopted session token follows exactly that pattern but is not listed. This is a genuine P1: a real Hermes credential can be accidentally committed.

Now let me focus on the core mandate — adversarial review of the 10 new tests for R9 (do they fail on regression). Let me reason through each one rigorously and verify the test-isolation concern doesn't make any test pass spuriously.

Let me trace the **adoption verify-path** carefully against the mock. In `ensureBackend` line 163, the verify call is `httpCall("GET", "/api/config", { port, token: served, timeoutMs: 5000 })`. The mock `startRunningDashboard` gates `/api/config` GET on `req.headers["x-hermes-session-token"] !== requiredValue` (line 186). And `httpCall` only sends the token header when `token && !PUBLIC_PATHS.has(path)` (line 82). `/api/config` is not public → header sent. Good — the gate is real.

Let me verify the squatter test is genuinely distinct and the regression-detection claim holds, by checking what happens if the protected-route check were removed.

### Assistant | 2026-06-17T18:13:49.930Z

[tool_use: Bash]

### User | 2026-06-17T18:13:53.849Z

[tool_result] === Does any test enable concurrency? ===
=== run the test suite to confirm green + count ===
  ...
# Subtest: ensureBackend: PRISM_HERMES_NO_ADOPT_TOKEN=1 opts out even when a valid value is served
ok 17 - ensureBackend: PRISM_HERMES_NO_ADOPT_TOKEN=1 opts out even when a valid value is served
  ---
  duration_ms: 1.73
  ...
# Subtest: ensureBackend: REFUSES a non-Hermes backend that serves no val
... [+479 chars truncated]

### Assistant | 2026-06-17T18:13:57.746Z

19/19 pass, 0 skipped, 0 todo, no concurrency (sequential). Now let me empirically prove the R9 strength of the two most critical claims by mutation-testing: (1) revert the protected-route check (would the squatter test catch it?), and (2) revert the sticky-adopted fix (would the SURVIVES-reuse test go red?). I'll do this with temporary in-memory edits via a throwaway copy, not by editing the real file.

### Assistant | 2026-06-17T18:14:01.979Z

[tool_use: Bash]

### User | 2026-06-17T18:14:06.620Z

[tool_result] === MUTATION 1: no protected-route check -> squatter test SHOULD fail ===
not ok 1 - C:\\Users\\wompu\\AppData\\Local\\Temp\\tmp.jT9CZT29or\\test-mut1.mjs
# pass 0
# fail 1

### Assistant | 2026-06-17T18:14:09.663Z

The output collapsed to a top-level failure (likely a load/path issue with the temp dir on Windows). Let me redo the mutation test in-tree more carefully so the import path resolves, capturing the specific subtest result.

### Assistant | 2026-06-17T18:14:14.032Z

[tool_use: Bash]

### User | 2026-06-17T18:14:18.799Z

[tool_result] === MUTATION 1 (no protected-route check): expect squatter + optout + no-value tests to break ===
not ok 16 - ensureBackend: REFUSES a squatter whose served value fails the protected route (R12 fail-loud)
ok 17 - ensureBackend: PRISM_HERMES_NO_ADOPT_TOKEN=1 opts out even when a valid value is served
ok 18 - ensureBackend: REFUSES a non-Hermes backend that serves no value at all
ok 19 - ensureBacke
... [+122 chars truncated]

### Assistant | 2026-06-17T18:14:22.327Z

Confirmed: removing the protected-route check makes the **squatter test (#16) go red** — R9 holds for the squatter case. Note #18 (no-value-served) correctly stays green because the `served` token is null so adoption is short-circuited before the verify call (genuinely distinct failure mode from the squatter). Now the sticky-reuse mutation.

### Assistant | 2026-06-17T18:14:28.055Z

[tool_use: Bash]

### User | 2026-06-17T18:14:32.697Z

[tool_result] === confirm mutation applied to reuse line ===
148:    if (p.ok) { writeSidecar({ port, token: t, pid: sc && sc.pid, at: nowIso() }); return { port, token: t, reused: true, adopted: false, pid: sc && sc.pid }; }
=== MUTATION 2 (drop sticky adopted on reuse): expect SURVIVES-reuse test #19 to break ===
not ok 19 - ensureBackend: the adopted flag SURVIVES reuse (sticky -- so `stop` never kills a for
... [+32 chars truncated]

### Assistant | 2026-06-17T18:14:39.015Z

Confirmed: reverting the sticky-adopted fix makes the **SURVIVES-reuse test (#19) go red**. R9 holds for the sticky case too. Both critical regressions are caught.

Now I must scrutinize the **test-isolation hazard** I flagged: the sticky-reuse test (#19) depends on `writeSidecar`→`readSidecar` against the **shared global file**. Because the mock uses a random port (`listen(0)`), and the sidecar stores the port, the 2nd call's reuse path fires only if the sidecar from the 1st call (same random port) is still present and unmodified by an interleaving test. Tests are sequential (no concurrency), so within this file it works. But the concern is: **does test #19 actually exercise the reuse path, or could it pass via the adoption path again (which would make it not a true regression test for sticky-on-reuse)?** Let me verify the 2nd call genuinely takes the reuse branch.

### Assistant | 2026-06-17T18:14:46.942Z

[tool_use: Bash]

### User | 2026-06-17T18:14:50.811Z

[tool_result] 1st branch: ADOPT adopted: true | 2nd branch: REUSE adopted: true

### Assistant | 2026-06-17T18:14:58.488Z

Confirmed: in the sticky-reuse scenario the 1st call goes through ADOPT, the 2nd through REUSE — exactly the path the test claims to exercise, and the test correctly asserts `reused:true` + `adopted:true` on the 2nd. The test is genuine, not theater.

However, this **only works because the sidecar persists to the real shared file across the two calls** — and that exposes the real flaw: **the test mutates and depends on production shared state (`H:/prism/state/shared/.hermes-control-bridge.json`) with no isolation.** Let me confirm the concrete failure scenario: if a concurrent test runner (or the file-level `--test-concurrency`, or the live bridge sidecar already on disk from real operation) sets the sidecar to `port: 9119, adopted: true` (exactly what I found on disk), it could spuriously affect tests. Let me test the most dangerous interaction — running the suite when the live sidecar has a matching scenario.

### Assistant | 2026-06-17T18:15:02.837Z

[tool_use: Bash]

### User | 2026-06-17T18:15:07.343Z

[tool_result] === Does the test SIDECAR path resolve to the worktree or the main tree? ===
49:const SIDECAR = "H:/prism/state/shared/.hermes-control-bridge.json"; // {port, token, pid, at}
=== Pre-existing live sidecar (written by real bridge operation) ===
{  "port": 3715,  "token": "fx-sticky",  "pid": null,  "adopted": true,  "at": "2026-06-17T18:14:54.468Z"}

=== Run the FULL suite repeatedly to detect orde
... [+290 chars truncated]

### Assistant | 2026-06-17T18:15:18.756Z

This is a concrete, demonstrable defect. The test suite **clobbers the live production sidecar** at `H:/prism/state/shared/.hermes-control-bridge.json`:

- Before my probe run it held the **real adopted token** `5JEMkwCBUoy7UGSfgPM6z0x7YV1T5Nk5CxBoxsrpWhk` on `port: 9119`.
- After running the tests it now holds `token: "fx-sticky"`, a **synthetic fixture value**, on a random port (`3814`).

So running this test suite **destroys the live bridge's adopted-token state**, which would make the actual running Hermes bridge fail to reuse its backend on the next real `stop`/control call (it'd read a bogus `fx-sticky` token / wrong port). This is a test-hermeticity violation of exactly the class the repo's own `## Recent regressions` warns about ("a lifecycle stage that spawns a real heavy subprocess... must be default-stubbed... else every untargeted test silently mutates production state", 2026-06-17). The suite passes 19/19, but it does so by **writing to and corrupting a shared production file with no env-overridable path, no tmpdir, and no save/restore**.

This does not weaken the R9 strength of the tests (the assertions are genuine), but it makes the suite **non-hermetic and destructive to live state**, and it means the tests are only deterministic by luck of sequential execution + random ports not colliding.

Let me restore the live sidecar I clobbered (read-only reviewer must not leave damage) and do a final check on remaining focus items: exports/consumption wiring, magic constants, and any `.only`/`.skip`.

### Assistant | 2026-06-17T18:15:24.493Z

[tool_use: Bash]

### User | 2026-06-17T18:15:45.215Z

[tool_result] restored sidecar:
{  "port": 9119,  "token": "5JEMkwCBUoy7UGSfgPM6z0x7YV1T5Nk5CxBoxsrpWhk",  "pid": null,  "adopted": true,  "at": "2026-06-17T18:06:16.601Z"}

=== .only / .skip / todo audit ===
NONE FOUND

=== blanket-stub assertion audit (toBeDefined/ok(true)/assert(true)) ===
NONE FOUND

=== are the two new exports consumed anywhere besides the test? ===

### Assistant | 2026-06-17T18:15:50.122Z

Sidecar restored. No `.only`/`.skip`/`todo`, no blanket-stub asserts. The two new exports (`resolveServedToken`, `extractInjectedDashboardToken`) are **not consumed externally** — but that's by design: they're internal helpers of `ensureBackend` (the consumption is at lines 161 and 130/117 inside the module), exported only for unit-testing. That's acceptable per the spec; they reach all consumers transitively through `ensureBackend`. Let me confirm the wiring claim — that every consumer flows through `ensureBackend` and nothing bypasses the new path.

### Assistant | 2026-06-17T18:15:53.495Z

[tool_use: Bash]

### User | 2026-06-17T18:15:57.803Z

[tool_result] === every high-level surface must route through call() -> ensureBackend() ===
229:export const getStatus      = (o) => call("GET", "/api/status", o);
230:export const getConfig      = (o) => call("GET", "/api/config", o);
255:export const getModelOptions= (o) => call("GET", "/api/model/options", o);
256:export const setModel       = (id, o) => call("POST", "/api/model/set", { ...o, body: { model: 
... [+2292 chars truncated]

### Assistant | 2026-06-17T18:16:07.305Z

Wiring is clean and complete:
- All 9 high-level surfaces (`getStatus`/`getConfig`/`setConfig`/`getModelOptions`/`setModel`/`listCron`/`listMcpServers`/`getEnv`) route through `call()` → `ensureBackend()` → new adoption path. ✓
- The only direct `httpCall` uses are the legitimate pre-adoption helpers (`probe` line 103, `resolveServedToken` line 129, the verify gate line 163) plus the post-ensure execution call (line 220). No bypass. ✓
- CLI commands all dispatch through the call-based surfaces or `ensureBackend`/`call` directly. ✓
- The `stop` command (line 282) correctly checks `sc.adopted` first and refuses to kill an adopted backend — matches the diff claim and is consistent with the sticky-adopted sidecar. ✓

Now let me verify the `getConfig` adoption-verify ordering concern (a subtle correctness issue): when adopting, `ensureBackend` calls `httpCall("GET","/api/config",...)` directly with `port` (the local var) — but in the spawn path `finishReady` uses `readyPort`. For adoption the port is fixed, so that's fine. Let me also confirm the sticky test's distinctness from the no-token test once more and check the `getConfig` end-to-end assertion in the ADOPTS test isn't a tautology.

In the ADOPTS test (line 213), `call("GET","/api/config",...)` re-runs `ensureBackend` which hits the **reuse path** (sidecar now has matching port+token), then `httpCall` to `/api/config` with the adopted token → mock returns 200 + `{model:"gpt-oss:120b"}`. The assertion `cfg.model === "gpt-oss:120b"` is a real end-to-end proof the adopted token authorizes the protected route. Not a tautology. ✓

Let me do a final magic-constant and fixture-credential scan.

### Assistant | 2026-06-17T18:16:11.318Z

[tool_use: Bash]

### User | 2026-06-17T18:16:15.431Z

[tool_result] === timeout/magic numbers introduced in the new code (lines 108-172) ===
11: * directly: it launches a HEADLESS backend on a PINNED port (default 9119), reuses
17: * Orthogonal to ask-hermes.mjs (the :8645 INFERENCE proxy) -- this is APP CONTROL (:9119).
34: * Env: PRISM_HERMES_HOME, PRISM_HERMES_DASHBOARD_PORT (default 9119),
47:const DEFAULT_PORT = parseInt(process.env.PRISM_HERMES_DASHBOARD_POR
... [+1566 chars truncated]

### Assistant | 2026-06-17T18:16:43.022Z

(The triage hook is a false positive — no test timed out; my greps just matched the word "timeout".)

All fixtures are obviously synthetic (`fx-<label>` → `fx-served`, `fx-squat`, etc.; `T0K`). No real credentials in the committed test/source. The `5000ms` verify timeout is a one-off literal but consistent with the existing `3000`/`30000` style in this file (R11 conformance — the file already uses inline timeouts everywhere), so not worth flagging as a new violation.

I have everything needed. Final assessment:

VERDICT: FAIL

summary: The 10 new tests are genuine, R9-strong, and adversarial: I mutation-verified that removing the protected-route check turns the squatter test (#16) red and reverting the sticky-adopted reuse fix turns the SURVIVES-reuse test (#19) red, and I confirmed via branch-instrumentation that #19 truly exercises the ADOPT-then-REUSE path. No `.skip`/`.only`/stub asserts; wiring through `ensureBackend` is complete with no bypass; fixtures are synthetic (`fx-*`/`T0K`). However, the suite is **non-hermetic and destructive to live production state**: it reads/writes the fixed shared sidecar `H:/prism/state/shared/.hermes-control-bridge.json` with no env override, tmpdir, or save/restore — I empirically proved running the tests overwrites the real adopted token (`5JEMkwCBUoy7UGSfgPM6z0x7YV1T5Nk5CxBoxsrpWhk` on port 9119 → `fx-sticky` on a random port). That same sidecar also holds a live Hermes credential and is **not gitignored**, risking an accidental secret commit.

findings:
- [P1] `scripts/hermes-control-bridge.mjs:49` (consumed by tests via lines 142/148/165/210) -- `SIDECAR` is a hard-coded shared path with no env override. The new test suite (`hermes-control-bridge.test.mjs:204,249` etc.) drives `ensureBackend` against it with no `beforeEach`/`afterEach` reset and no tmpdir, so running the tests **clobbers the live bridge's sidecar** (proven: real adopted token+port 9119 → `fx-sticky`+random port after a test run). This is exactly the test-h
... [+2768 chars truncated]
