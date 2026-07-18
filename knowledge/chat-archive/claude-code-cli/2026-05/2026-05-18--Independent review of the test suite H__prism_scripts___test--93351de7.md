---
type: "chat-session"
source: "claude-code-cli"
session_id: "93351de7-9846-43b7-a9a7-d6bd1f9b2abc"
title: "Independent review of the test suite H:/prism/scripts/__tests__/task-freshness.t"
date: "2026-05-18"
first_ts: "2026-05-18T00:53:33.326Z"
last_ts: "2026-05-18T00:54:27.670Z"
cwd: "H:\\prism"
messages: 16
user_msgs: 7
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/93351de7-9846-43b7-a9a7-d6bd1f9b2abc/subagents/agent-a20f8fac38ca94cce.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Independent review of the test suite H:/prism/scripts/__tests__/task-freshness.t

> **claude-code-cli** | 2026-05-18 | 16 msgs (7 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/93351de7-9846-43b7-a9a7-d6bd1f9b2abc/subagents/agent-a20f8fac38ca94cce.jsonl`

## Transcript

### User | 2026-05-18T00:53:33.326Z

Independent review of the test suite H:/prism/scripts/__tests__/task-freshness.test.mjs (read the WHOLE file) against the helper it tests H:/prism/.claude/helpers/task-freshness.mjs (read it too). 36/36 currently pass. The other reviewer's verdict was self-contradictory; do a clean independent pass weighted on what a coverage-counter misses.

Focus:

1. **R9 — can each test FAIL when business logic breaks?** For 4 specific tests, mentally apply a plausible regression to the helper and confirm the test would catch it:
   - "decide boundary: exactly staleHrs (24h) is NOT stale" — if helper changed `ageHrs > staleHrs` to `>=`, does this test flip to fail?
   - "decide (d) ... freshness-unprovable (P0)" — if helper dropped the `a.unprovable` branch, does this fail (not get masked by another branch)?
   - "real-data E2E: known-completed unit → already-shipped" — if helper's unitStatus regex `/^(completed|done|shipped|closed)$/i` were deleted, does this fail? Trace the find() in the test — it picks `completed|done|shipped`; the helper regex also has `closed`. Edge: if the ONLY completed-ish unit in the live envelope had status `"closed"`, the test's find() (which omits `closed`) wouldn't pick it → test could spuriously pass-by-skip. Is that a real integrity hole? Check the live FEATURE-GAP-AUDIT-MS0.json — does it have a `completed` unit so the oracle is currently load-bearing? Is the test robust if the envelope's unit statuses change later?
   - "evaluate: trusted in-file anchor DOES spawn --since (control)" — is this tautological or does it genuinely pin the fork-storm guard's two-sidedness?

2. **Real-data E2E honesty**: does it FAIL LOUD (assert.fail) on missing precondition rather than skip? Could it silently pass if the live envelope changed such that no unit is completed? Is that acceptable or should it be hardened?

3. **Hidden coupling**: tests import the helper at module top. `ackPath` test uses hardcoded `/tmp/x` and `os.tmpdir()` — cross-platform safe on win32
... [+599 chars truncated]

### Assistant | 2026-05-18T00:53:37.036Z

[tool_use: Read]

### Assistant | 2026-05-18T00:53:37.411Z

[tool_use: Read]

### User | 2026-05-18T00:53:38.083Z

[tool_result] read-once-guard: 'H:\prism\scripts\__tests__\task-freshness.test.mjs' was already read 56s ago in this session and is unchanged (mtime 1779065526652). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-18T00:53:38.240Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\task-freshness.mjs' was already read 15m ago in this session and is unchanged (mtime 1779064659067). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-18T00:53:40.993Z

Both files are already in my context from earlier reads. Let me verify the live envelope precondition for the real-data E2E.

### Assistant | 2026-05-18T00:53:45.632Z

[tool_use: Bash]

### Assistant | 2026-05-18T00:53:46.437Z

[tool_use: Bash]

### User | 2026-05-18T00:53:52.279Z

[tool_result] total 64
completed|done|shipped 10 [{"id":"U-GAP-MILL-FFT-CHATTER","s":"completed"},{"id":"U-GAP-LATHE-NOSE-RADIUS-COMP","s":"completed"},{"id":"U-GAP-CAD-GEODESIC","s":"completed"}]
closed-only 0 []
status dist {"completed":10,"not_started":54}

### User | 2026-05-18T00:53:56.963Z

[tool_result] claude-93351de7__FEATURE-GAP-AUDIT-MS0__U-GAP-MILL-FFT-CHATTER.json  466B
claude-zzz__FEATURE-GAP-AUDIT-MS0__U-GAP-MILL-FFT-CHATTER.json  461B
---
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'task-freshness-acks\|os.tmpdir\|/tmp/x\|assert.fail\|rmSync\|unlinkSync\|after(\|afterEach'

### Assistant | 2026-05-18T00:54:00.420Z

The grep found 0 matches (rg fallback issue, pattern had escaped pipes). Let me re-check with the Grep tool and inspect the ack-dir pollution finding — there ARE files in the real repo `state/shared/task-freshness-acks/`.

### Assistant | 2026-05-18T00:54:02.577Z

[tool_use: Grep]

### User | 2026-05-18T00:54:03.879Z

[tool_result] 20:  ackPath,
21:  acknowledgmentValid,
22:  writeAcknowledgment,
367:test("ackPath: :: sanitized to __ and stays in stampDir (no traversal)", () => {
368:  const dir = path.join(os.tmpdir(), "tfg-acktest");
369:  const p = ackPath("claude-x", "MS0::../../evil", dir);
376:  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tfg-ack-"));
377:  const written = writeAcknowledgment("claude-a", "M-MS0:
... [+806 chars truncated]

### Assistant | 2026-05-18T00:54:03.894Z

[tool_use: Grep]

### User | 2026-05-18T00:54:05.134Z

[tool_result] 41:const ACK_DIR_DEFAULT = path.join(PRISM_ROOT, "state/shared/task-freshness-acks");
479:export function ackPath(chatId, unitId, stampDir = ACK_DIR_DEFAULT) {
485:  const stampDir = opts.stampDir || ACK_DIR_DEFAULT;
496:  const stampDir = opts.stampDir || ACK_DIR_DEFAULT;

### Assistant | 2026-05-18T00:54:27.670Z

I have everything I need. The ack tests all use `os.tmpdir()` and `fs.rmSync` cleanup — no real-repo pollution from the test. The two files in `state/shared/task-freshness-acks/` (`claude-zzz__...`, `claude-93351de7__...`) were written by something else (the helper in production / a prior manual run), not this test suite.

---

## Independent Review: task-freshness.test.mjs

**GRADE: PASS** (with one P2 hardening note)

### 1. R9 — regression-catch verification (4 tests)

- **"decide boundary: exactly staleHrs (24h) is NOT stale"** (line ~) — Helper uses `ageHrs > staleHrs` (strict). Test asserts `ageHrs:24, staleHrs:24 → stale:false`. Flip helper to `>=` → 24>=24 is true → `stale:true` → assertion `assert.equal(d.stale, false)` fails. **CATCHES IT.** Genuinely two-sided (a separate `25h → stale:true` test pins the other side).

- **"decide (d) freshness-unprovable (P0)"** (line ~) — Inputs give `unprovable:true` with no age/missing signal. Drop `a.unprovable` branch in `decideFreshness` → falls through to the "fresh" allow path → `stale:false`, severity changes → test asserts `stale:true, severity:'freshness-unprovable', p0:true`. Not masked by `missing`/`by-age` branches (those require different inputs). **CATCHES IT.**

- **"real-data E2E: known-completed unit → already-shipped"** (line 463+) — Delete helper regex `/^(completed|done|shipped|closed)$/i` → `alreadyShipped` never set → result is not `already-shipped` → assertion fails. **CATCHES IT.** The `closed` edge: I verified the live envelope — **10 `completed`, 0 `closed`, 54 `not_started`**. The test's `find()` (omits `closed`) currently lands on a real `completed` unit (`U-GAP-MILL-FFT-CHATTER`), so the oracle **is load-bearing today**. **P2 hole confirmed**: if the envelope's only shipped-ish units ever become `closed`-only, `find()` returns undefined and the test silently no-ops past the assertion (no `assert.fail` guard on a null find — only the file-missing precondition at line 463 fails loud). Recommen
... [+1526 chars truncated]
