---
type: "chat-session"
source: "claude-code-cli"
session_id: "a6304a93-9f8f-4616-b0a9-eaf94b272d80"
title: "Review `H:/prism/scripts/tmp-orphan-janitor.mjs` — a file-DELETING janitor (it j"
date: "2026-05-29"
first_ts: "2026-05-29T16:45:02.513Z"
last_ts: "2026-05-29T16:51:41.487Z"
cwd: "H:\\prism-slot-juliett"
messages: 56
user_msgs: 20
assistant_msgs: 36
raw_file: "H:/.claude/projects/H--prism-slot-juliett/a6304a93-9f8f-4616-b0a9-eaf94b272d80/subagents/agent-a0926d83335c64b9c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:58"
---

# Review `H:/prism/scripts/tmp-orphan-janitor.mjs` — a file-DELETING janitor (it j

> **claude-code-cli** | 2026-05-29 | 56 msgs (20 user / 36 assistant) | cwd: H:\prism-slot-juliett
> Raw: `H:/.claude/projects/H--prism-slot-juliett/a6304a93-9f8f-4616-b0a9-eaf94b272d80/subagents/agent-a0926d83335c64b9c.jsonl`

## Transcript

### User | 2026-05-29T16:45:02.513Z

Review `H:/prism/scripts/tmp-orphan-janitor.mjs` — a file-DELETING janitor (it just reclaimed 19.24GB / 3628 files with 0 errors, correctly keeping 80 alive-PID + 9 young). It will run repeatedly (scheduled), so find latent SAFETY bugs that could delete an in-flight write or a non-orphan. MCP down; Read/Bash only.

Focus on DELETE-safety:
1. **pidOf** (3 regex patterns) — can it mis-parse a filename and extract the WRONG pid (→ wrong alive/dead verdict)? Test edge cases: `<name>.tmp-<pid>`, `<name>.<pid>.<hash>.tmp`, `<name>.<pid>.tmp`, bare `.tmp`, a filename with multiple numeric segments (e.g. `foo.2026.05.29.12345.tmp`). Is the precedence order correct?
2. **isAlive** — EPERM=alive, ESRCH=dead. Correct? Any case where a dead pid reads as alive or vice versa? PID reuse risk acknowledged?
3. **classify** — verify NO path deletes an alive-PID tmp or a too-young dead-PID tmp. Verify the no-pid branch only reclaims >24h.
4. **TOCTOU re-check before unlink** (the `if (args.apply)` block) — it re-stats + re-checks pid before `unlinkSync`. Is the re-check actually sound, or is there a window where a write restarts between re-check and unlink? Is `lstatSync` (not statSync) correct for not following symlinks?
5. **Could it ever delete a NON-.tmp file or a directory?** (the `.endsWith('.tmp')` + `isFile()` guards).
6. The `import.meta.url === ...` CLI guard — does it correctly run as CLI but NOT during the test import? Verify the test (`scripts/tmp-orphan-janitor.test.mjs`) imports the module WITHOUT triggering main() (which would scan/delete during tests!). This is critical — confirm `node --test` does not run main().
7. Run the test yourself: `cd H:/prism && node --test scripts/tmp-orphan-janitor.test.mjs` — confirm 14 pass AND that running it did NOT delete anything (no side effects).

Return PASS/FAIL + P0/P1 (P0 = any way it deletes a live/non-orphan file, or main() runs during test). Terse.

### Assistant | 2026-05-29T16:45:13.946Z

I'll review this file-deleting janitor for DELETE-safety bugs. Let me start by reading the source and its test.

### Assistant | 2026-05-29T16:45:14.468Z

[tool_use: Read]

### Assistant | 2026-05-29T16:45:14.641Z

[tool_use: Read]

### User | 2026-05-29T16:45:20.569Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * tmp-orphan-janitor.mjs — safe sweep of orphaned atomic-write `*.tmp` siblings (slot:juliett).
4	 *
5	 * WHY: PRISM atomic writers use a tmp+rename pattern. Most writers self-clean (scripts/lib/atomic-json.mjs
6	 * uses `.tmp-<pid>` + finally-unlink), but some leave their tmp behind on crash/overlap — notably the
7	 * tribal-embed-index regen (`tribal-embed-index.js
... [+8210 chars truncated]

### User | 2026-05-29T16:45:21.856Z

[tool_result] 1	// node --test scripts/tmp-orphan-janitor.test.mjs
2	// Real-value assertions on the janitor's pure decision logic — the safety-critical core.
3	import { test } from "node:test";
4	import assert from "node:assert/strict";
5	import { pidOf, isAlive, classify } from "./tmp-orphan-janitor.mjs";
6	
7	const MIN = 30 * 60_000;       // 30 min
8	const NOPID = 24 * 3_600_000;  // 24 h
9	
10	test("pidOf 
... [+2795 chars truncated]

### Assistant | 2026-05-29T16:45:25.664Z

Now let me run the test and check for side effects. First I'll snapshot the state dirs so I can prove the test deleted nothing.

### Assistant | 2026-05-29T16:45:27.909Z

[tool_use: Bash]

### User | 2026-05-29T16:45:38.572Z

[tool_result] === tmp count BEFORE test ===
18
2
=== ledger mtime BEFORE ===
1780073046 1393

### Assistant | 2026-05-29T16:45:45.030Z

[tool_use: Bash]

### User | 2026-05-29T16:46:00.480Z

[tool_result]   ...
# Subtest: classify — no-pid: reclaim only when very old
ok 13 - classify — no-pid: reclaim only when very old
  ---
  duration_ms: 0.1328
  ...
# Subtest: classify — non-.tmp is never touched
ok 14 - classify — non-.tmp is never touched
  ---
  duration_ms: 0.1028
  ...
1..14
# tests 14
# suites 0
# pass 14
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 471.3608

### Assistant | 2026-05-29T16:46:04.725Z

14 pass. Now verify no side effects (the test import must NOT have run main()).

### Assistant | 2026-05-29T16:46:06.131Z

[tool_use: Bash]

### User | 2026-05-29T16:46:12.443Z

[tool_result] === tmp count AFTER test ===
18
2
=== ledger mtime AFTER ===
1780073046 1393

### Assistant | 2026-05-29T16:46:16.890Z

Counts unchanged (18 + 2), ledger mtime/size unchanged (1780073046 / 1393 bytes). The test ran with zero side effects — main() did NOT fire. Now let me probe the CLI guard and the pidOf edge cases the prompt called out.

### Assistant | 2026-05-29T16:46:20.758Z

[tool_use: Bash]

### User | 2026-05-29T16:46:29.809Z

[tool_result] Exit code 1
file:///H:/prism/scripts/tmp-orphan-janitor.mjs:146
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("tmp-orphan-janitor.mjs")) {
                                                  ^

TypeError: Cannot read properties of undefined (reading 'replace')
    at file:///H:/prism/scripts/tmp-orphan-janitor.mjs:146:51
    at ModuleJob.r
... [+234 chars truncated]

### Assistant | 2026-05-29T16:46:34.785Z

Important finding. When the module is imported via `node -e` with a `.then()` (i.e. `process.argv[1]` is undefined because the entry point is `[eval]`), line 146 crashes. But more importantly, let me check: the test imports work fine because `node --test` sets `process.argv[1]` to the test file path. Let me confirm the CLI guard logic precisely and re-probe pidOf via the test harness route (which works).

### Assistant | 2026-05-29T16:46:38.520Z

[tool_use: Bash]

### User | 2026-05-29T16:46:44.739Z

[tool_result] Exit code 1
node:internal/modules/esm/resolve:275
    throw new ERR_MODULE_NOT_FOUND(
          ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\h\prism\scripts\tmp-orphan-janitor.mjs' imported from C:\Users\wompu\AppData\Local\Temp\probe-pidof.mjs
    at finalizeResolution (node:internal/modules/esm/resolve:275:11)
    at moduleResolve (node:internal/modules/esm/resolve:932:10)
    
... [+555 chars truncated]

### Assistant | 2026-05-29T16:46:47.733Z

Path resolution issue with the temp dir on a different drive. Let me put the probe inside the repo.

### Assistant | 2026-05-29T16:46:51.071Z

[tool_use: Bash]

### User | 2026-05-29T16:46:56.832Z

[tool_result] "name.tmp-12345" => 12345
"name.12345.43c95520.tmp" => 12345
"name.12345.tmp" => 12345
"name.tmp" => null
"foo.2026.05.29.12345.tmp" => 29
"x.json.deadbeef.tmp" => null
"x.json.12345.deadbeef.tmp" => 12345
"x.tmp-0" => 0
"x.tmp-007" => 7
"a.123.456.tmp" => 123
"x.123abc.tmp" => null
"x.0x1f.tmp" => null
"ACTIVE_ROADMAP_CLAIMS.json.10256.43c95520.tmp" => 10256

### Assistant | 2026-05-29T16:47:05.989Z

Critical finding confirmed: **`foo.2026.05.29.12345.tmp` => 29**, not 12345.

This is a real DELETE-safety bug. The `/\.(\d+)\.tmp$/` pattern matched the `.29.tmp` segment (`05` then `.29.tmp`) — wait, let me trace: `29` is from `.05.29.tmp`? No. The string is `foo.2026.05.29.12345.tmp`. Pattern 3 `/\.(\d+)\.tmp$/` should anchor at end: `.12345.tmp`. But it returned `29`. Let me check why — pattern 2 `/\.(\d+)\.[0-9a-fA-F]+\.tmp$/` fires first: `.29.` then `12345` (all hex-valid digits) then `.tmp`. So pid=29.

Let me also note `a.123.456.tmp` => 123 (pattern 2: `.123.` + `456` hex + `.tmp`). And the important detail: `x.tmp-0` => 0, which `isAlive` rejects (pid<=0 → false → "dead"). Let me verify the precedence/alive interplay and the CLI guard crash impact.

### Assistant | 2026-05-29T16:47:13.033Z

[tool_use: Bash]

### User | 2026-05-29T16:47:23.070Z

[tool_result] isAlive(0)= false
isAlive('29' parsed wrong-pid scenario)
name=foo.2026.05.29.168704.tmp realPid=168704 pidOf=29
wrongPid alive? false
realPid alive? true
VERDICT: {"action":"reclaim","reason":"dead pid 29, age 30m"}

### Assistant | 2026-05-29T16:47:28.507Z

Confirmed P0. A live write `foo.2026.05.29.<livepid>.tmp` gets pidOf=29 (a stale/dead/likely-not-running low PID), is classified `alive:false`, and verdict is **reclaim**. The TOCTOU re-check re-runs the same buggy `pidOf` so it does not save it. Now let me assess real-world exposure: do any actual PRISM writers produce multi-numeric-segment tmp names? And confirm the CLI-guard crash and lstatSync behavior.

### Assistant | 2026-05-29T16:47:30.116Z

[tool_use: Bash]

### User | 2026-05-29T16:47:40.397Z

[tool_result] === actual .tmp names in target dirs (sample) ===
ollama-offload-stats.json.12188.1779743385775.tmp  155.0K
ollama-offload-stats.json.51460.1779656051620.tmp  69.4K
ACTIVE_ROADMAP_CLAIMS.json.10644.806f731f.tmp  84B
ACTIVE_ROADMAP_CLAIMS.json.141376.3e12523c.tmp  84B
ACTIVE_ROADMAP_CLAIMS.json.29312.bcc3f65f.tmp  84B
ACTIVE_ROADMAP_CLAIMS.json.30164.14cb288e.tmp  84B
ACTIVE_ROADMAP_CLAIMS.json.310
... [+681 chars truncated]

### Assistant | 2026-05-29T16:47:47.399Z

Now I see a **second real-world P0 right here in production data**: `ollama-offload-stats.json.12188.1779743385775.tmp`. The middle is `.12188.` (pid) and the suffix is `1779743385775` (a millisecond timestamp — all decimal digits, valid hex chars). Pattern 2 `/\.(\d+)\.[0-9a-fA-F]+\.tmp$/` matches: pid-group=`12188`, hash-group=`1779743385775`. That one happens to extract the correct pid. But it shows the `<name>.<pid>.<timestamp>.tmp` family is live in prod. Let me verify which segment pidOf grabs for that exact name and test a timestamp-first ambiguity.

### Assistant | 2026-05-29T16:47:50.134Z

[tool_use: Bash]

### User | 2026-05-29T16:47:55.237Z

[tool_result] 12188 <= ollama-offload-stats.json.12188.1779743385775.tmp
51460 <= ollama-offload-stats.json.51460.1779656051620.tmp
10644 <= ACTIVE_ROADMAP_CLAIMS.json.10644.806f731f.tmp
90612 <= tribal-embed-index.json.90612.tmp

### Assistant | 2026-05-29T16:48:00.890Z

Good — the production names happen to parse correctly because the leftmost numeric segment IS the pid in these `<name>.<pid>.<suffix>.tmp` formats. The bug bites only when there are numeric segments BEFORE the pid (e.g. a date-stamped basename like `foo.2026.05.29.<pid>.tmp`). Let me verify whether any real PRISM writer date-stamps basenames before the pid, to gauge real exposure, then finalize the other checks (CLI guard, lstat, classify completeness).

### Assistant | 2026-05-29T16:48:02.784Z

[tool_use: Grep]

### Assistant | 2026-05-29T16:48:05.046Z

[tool_use: Bash]

### User | 2026-05-29T16:48:07.182Z

[tool_result] 12: *    `${path}.tmp` suffix. Several of those scripts target the SAME
14: *    same `roadmap-index.json.tmp`, clobbering each other (wrong content can
62:  const tmp = `${filePath}.tmp-${process.pid}`;
101:  const tmp = `${filePath}.tmp-${process.pid}`;

### User | 2026-05-29T16:48:21.382Z

[tool_result] argv1 via -e = undefined
---
argv1 undefined under node -e? the CLI guard line 146 reads process.argv[1].replace — crashes if argv[1] is undefined

### Assistant | 2026-05-29T16:48:26.474Z

The canonical atomic writer uses `${filePath}.tmp-${process.pid}` (pattern 1, anchored `\.tmp-(\d+)$` — safe, unambiguous). The vulnerable multi-segment patterns (2 & 3) are for the OTHER writers. Let me find what produces those `.<pid>.<suffix>.tmp` names to assess whether a date-prefixed basename is plausible.

### Assistant | 2026-05-29T16:48:28.604Z

[tool_use: Grep]

### User | 2026-05-29T16:48:37.404Z

[tool_result] H:\prism\.claude\hooks\__tests__\error-fix-vault-bridge.test.mjs:29:  const p = path.join(os.tmpdir(), `efvb-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}-${name}`);
H:\prism\.claude\hooks\__tests__\error-fix-vault-bridge.test.mjs:294:  const f = path.join(os.tmpdir(), `efvb-guard-${process.pid}-${Date.now()}.md`);
H:\prism\.claude\helpers\chat-slots-slot-truth.smoke.mjs:35:f
... [+3233 chars truncated]

### Assistant | 2026-05-29T16:48:52.016Z

This is the decisive evidence. Several real PRISM writers produce tmp names where the **base filename can contain its own dot-numeric segments before the pid**, AND several use the `<file>.<pid>.<Date.now()>.tmp` form. Two concrete exposure paths:

1. `session-id-pin.mjs:33` uses `${filePath}.${process.pid}.${Date.now().toString(36)}.tmp` — the Date.now() is base36 (can be `[0-9a-z]`), so if it's all hex chars it matches pattern 2; if it contains `g-z` it falls through to... pattern 3 won't match either (suffix isn't all digits before `.tmp`), so pidOf returns the pid correctly OR null. Mostly safe.

2. The real killer: any writer whose **target filepath basename already contains `.<digits>.`** Examples on disk would be files like `data.2026.05.29.json` → tmp `data.2026.05.29.json.<pid>.tmp`. Let me check `token-awareness-sidecar.mjs:149` and `tool-watchdog.mjs:105` which use `${...}.${process.pid}.${Date.now()}.tmp` — `Date.now()` is pure decimal digits, so the name is `<base>.<pid>.<13-digit-ms>.tmp`. Pattern 2 grabs the FIRST `\.(\d+)\.<hex>\.tmp` — which is `<pid>.<ms>` IF base has no trailing numeric segment. But if base ends in digits (e.g. a versioned/dated file), the regex's leftmost match grabs the wrong segment.

Let me confirm the leftmost-match hazard precisely and whether `Date.now()` decimal-only suffix is matched by pattern-2's hex class.

### Assistant | 2026-05-29T16:48:59.373Z

[tool_use: Bash]

### User | 2026-05-29T16:49:09.740Z

[tool_result] pidOf=168704  expect=168704   <= offload-stats.json.168704.1779743385775.tmp
pidOf=168704  expect=168704   <= report.2026.168704.1779743385775.tmp
pidOf=168704  expect=168704   <= backup-2026.05.json.168704.1779743385775.tmp
pidOf=168704  expect=168704   <= snapshot.20260529.168704.1779743385775.tmp
pidOf=null  expect=N/A-not-.tmp-suffix   <= PENDING.json.tmp.168704.1779743385775

### Assistant | 2026-05-29T16:49:18.295Z

Interesting — with the `Date.now()` (13-digit) suffix, the regex actually finds the **correct** pid even with dated basenames. Why? Pattern 2 `/\.(\d+)\.[0-9a-fA-F]+\.tmp$/` is `$`-anchored and `\d+`/hex are greedy, but JS regex backtracks to find *a* match; with `.2026.168704.1779743385775.tmp`, can it match `.2026.` as pid + `168704.1779743385775`? No — because `[0-9a-fA-F]+` cannot contain the `.` between `168704` and `1779...`. So the only valid match is `.168704.` + `1779743385775` + `.tmp`. The intervening dot is what saves it.

The bug bites only when there's **no hash/timestamp suffix** — i.e. the `<name>.<pid>.tmp` (pattern 3) form, where a dated basename's trailing number gets grabbed. That's the `foo.2026.05.29.12345.tmp => 29` case. Let me confirm which production writers use the bare `<name>.<pid>.tmp` form (no hash) AND could have a dated/numeric basename.

### Assistant | 2026-05-29T16:49:27.960Z

[tool_use: Bash]

### User | 2026-05-29T16:49:42.098Z

[tool_result] pidOf=168704  (real pid 168704)   <= loop-state.168704.tmp
pidOf=168704  (real pid 168704)   <= loop-2026.168704.tmp
pidOf=20260529  (real pid 168704)   <= HANDOFF-claude-abc.20260529.168704.tmp
pidOf=168704  (real pid 168704)   <= roadmap-index.v2.168704.tmp
pidOf=123  (real pid 168704)   <= ledger.123.168704.tmp

### Assistant | 2026-05-29T16:49:52.479Z

Definitively confirmed. **`HANDOFF-claude-abc.20260529.168704.tmp` => pidOf=20260529** (wrong; real pid 168704) and **`ledger.123.168704.tmp` => 123** (wrong). When a basename ends in `.<digits>` and the tmp uses the bare `<name>.<pid>.tmp` form, **pidOf extracts the basename's trailing number, not the pid**. 

Why? Pattern 2 `/\.(\d+)\.[0-9a-fA-F]+\.tmp$/` matches FIRST: for `...20260529.168704.tmp` it binds group1=`20260529`, hex=`168704`, `.tmp`. Since `168704` is valid hex, pattern 2 wins and returns the date, never reaching pattern 3. **The precedence is wrong** — the more-specific bare-pid pattern is checked last, and the date-segment gets misclaimed as the pid by the looser hash pattern.

`20260529` as a PID: on Windows PIDs can exceed this, but it's very likely a dead/never-existed PID → `isAlive` false → if file age > 30m → **reclaim a live write**.

Now let me finish the remaining checks: lstat symlink correctness, the CLI guard crash, and confirm classify has no alive-delete path. Let me re-read the exact lines.

### Assistant | 2026-05-29T16:49:59.366Z

[tool_use: Bash]

### User | 2026-05-29T16:50:08.405Z

[tool_result] ALIVE-DELETE: { pid: null, alive: true, ageMs: 86400001 } { action: 'reclaim', reason: 'no pid, age 24h (stale)' }
alive-delete paths: 1
nopid age=NOPID exactly -> keep-nopid-young
pid dead age=MIN exactly -> keep-young

### Assistant | 2026-05-29T16:50:19.819Z

The `pid=null, alive=true` "ALIVE-DELETE" is a non-issue: in `main()`, `alive` is computed as `pid != null && isAlive(pid)`, so when `pid==null`, `alive` is always `false`. That combination can't occur in production — it's only reachable by hand-passing inconsistent inputs to the pure function. So `classify` itself is sound given the actual call contract; the boundary guards (`<=`) are correct (exactly-min and exactly-nopid both KEEP).

The real risk for no-pid files is the inverse: a no-pid in-flight write older than 24h. That's mitigated by the 24h floor + atomic writers being fast, but a stalled/hung large write (e.g. the 382MB tribal-embed regen that hangs >24h) named without a pid would be reclaimed mid-write. That's the documented residual risk the code comments acknowledge, so I'll flag it P1, not P0.

Let me verify the CLI-guard crash scenario severity and lstat symlink handling, then wrap up.

### Assistant | 2026-05-29T16:50:20.976Z

[tool_use: Bash]

### User | 2026-05-29T16:50:29.413Z

[tool_result] === CLI guard line 146 ===
// Run only as CLI (not when imported by the test).
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("tmp-orphan-janitor.mjs")) {
  main();
}

=== Does node --test set argv[1]? (proves test import does NOT crash on the guard) ===
# tests 14
# pass 14
# fail 0

### Assistant | 2026-05-29T16:50:37.282Z

Let me confirm the CLI-guard behavior under `node --test` precisely — does `process.argv[1]` end with the test filename (so the `.endsWith("tmp-orphan-janitor.mjs")` clause is false) and `import.meta.url` differs from the test path, so main() is correctly NOT invoked. The 14/14 pass with zero side effects already proves this empirically. Let me just confirm the guard's two-clause logic and the lstat symlink correctness, then finalize.

### Assistant | 2026-05-29T16:50:40.409Z

[tool_use: Bash]

### User | 2026-05-29T16:51:04.415Z

[tool_result] under node --test, argv[1] = <test file path>; endsWith(tmp-orphan-janitor.mjs)=false because it ends with .test.mjs
VERDICT: guard clause 1 (import.meta.url===argv1) false during test (argv1=test file); clause 2 endsWith(tmp-orphan-janitor.mjs) -> '...test.mjs'.endsWith('tmp-orphan-janitor.mjs')=false. main() NOT called. CONFIRMED by 0 side-effects.

### Assistant | 2026-05-29T16:51:41.487Z

I have everything needed. Final verdict.

---

## Code Quality Analysis Report — `tmp-orphan-janitor.mjs`

### VERDICT: **FAIL — 1 P0 (DELETE-safety), 1 P1, 2 P2**

Test run: **14/14 pass, ZERO side effects** (state/shared `.tmp` count 18→18, mcp-server 2→2, ledger mtime+size unchanged `1780073046/1393`). `main()` does NOT run during `node --test` — both CLI-guard clauses are false (argv[1] is the `.test.mjs` path; `import.meta.url` mismatches; `.endsWith("tmp-orphan-janitor.mjs")` is false because the path ends `.test.mjs`). Item 6 + 7 checks **PASS**.

---

### P0 — `pidOf` extracts the WRONG pid for `<name>.<pid>.tmp` when the basename ends in `.<digits>` → can reclaim a LIVE write

`scripts/tmp-orphan-janitor.mjs:33-38`. Pattern **precedence is inverted**: pattern 2 `/\.(\d+)\.[0-9a-fA-F]+\.tmp$/` is tested *before* pattern 3 `/\.(\d+)\.tmp$/`. Because a pid is valid hex, pattern 2 greedily claims a numeric basename segment as the pid and the real pid as the "hash". Proven against the real code:

```
"HANDOFF-claude-abc.20260529.168704.tmp"  => pidOf 20260529  (real live pid 168704)
"ledger.123.168704.tmp"                   => pidOf 123        (real live pid 168704)
"foo.2026.05.29.12345.tmp"                => pidOf 29         (prompt's case)
```

Blast radius: a live atomic write of the form `<dated-or-numeric-base>.<livepid>.tmp` → `pidOf` returns the basename's stale number (e.g. `20260529`, `29`, `123`) → `isAlive(stale)` returns `false` → if `age > 30m`, verdict = **reclaim** → `unlinkSync` deletes the in-flight file. **The TOCTOU re-check (line 114) re-runs the same buggy `pidOf`, so it does NOT save it** — it confirms the wrong verdict.

Production exposure is real, not hypothetical: grep shows live PRISM writers using the bare `<name>.<pid>.tmp` form — `stop-mark-completed-tasks.mjs:79`, `stop-force-loop-continue.mjs:159`, `task-created-claim-guard.mjs:158`, `skill-auto-trigger.mjs:384`. Any of these whose target basename contains a trailing `.<digits>` 
... [+3650 chars truncated]
