---
type: "chat-session"
source: "claude-code-cli"
session_id: "2bb2ef8a-06f5-4b6f-8801-35a9db88efb7"
title: "3-of-3 scrutiny gate, ARM C (analyst -- do NOT assume arms A or B caught everyth"
date: "2026-06-17"
first_ts: "2026-06-17T19:40:08.742Z"
last_ts: "2026-06-17T19:44:42.937Z"
cwd: "H:\\prism"
messages: 79
user_msgs: 28
assistant_msgs: 51
raw_file: "H:/.claude/projects/H--prism/2bb2ef8a-06f5-4b6f-8801-35a9db88efb7/subagents/agent-a7bbf24ee80d0352e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# 3-of-3 scrutiny gate, ARM C (analyst -- do NOT assume arms A or B caught everyth

> **claude-code-cli** | 2026-06-17 | 79 msgs (28 user / 51 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2bb2ef8a-06f5-4b6f-8801-35a9db88efb7/subagents/agent-a7bbf24ee80d0352e.jsonl`

## Transcript

### User | 2026-06-17T19:40:08.742Z

3-of-3 scrutiny gate, ARM C (analyst -- do NOT assume arms A or B caught everything). Weighted toward SILENT BREAKAGE, regression risk, I/O security, error-budget completeness, and integration coupling. Review the latest commit on H:/prism. Run `git -C H:/prism show HEAD` and read the changed files end-to-end. Grade PASS or FAIL with P0/P1/P2 + file:line.

Commit `[ZULU-ACCOUNT-CYCLE]/U-5H-LIMIT-TRACKER`: scripts/five-hour-limit-tracker.mjs (new, mines 429 session-limit events -> observed 5h ceiling) + test + arm-account-switch.mjs (--auto edit) + test + state/shared/five-hour-ceiling-observed.json.

VERIFY SPECIFICALLY:
1. SILENT BREAKAGE in arm-account-switch.mjs: the --auto EDIT added a new top-level import of ./five-hour-limit-tracker.mjs. Could this break the EXISTING arm/disarm/status paths (e.g. an import error, a parse failure, a name collision)? Confirm the existing composeEnvPlan/parseArmArgs behavior is byte-unchanged for non-auto actions.
2. MEMORY SAFETY: scanTranscript must stream multi-hundred-MB transcripts via readline (createReadStream), NEVER readFileSync the whole file (V8 512MB string cap -- this exact class of bug clobbered the tribal index before). Confirm.
3. I/O SECURITY: the tracker reads ~/.claude/projects transcripts and writes a sidecar via atomic tmp+rename. Any path-traversal, unsanitized write, or fail-open clobber risk? Does a corrupt/missing sidecar fail SAFE (composeAutoPlan throws, never silently arms)?
4. ERROR-BUDGET: fail-loud where it matters (nowMs required; no observed ceiling -> refuse to arm), fail-soft where appropriate (bad transcript line skipped, missing file -> empty). Is the boundary correct?
5. REGRESSION: does calibrateCeiling correctly use a BOTH-ENDS bounded window [T-5h, T] for past events (the sibling fiveHourTokenSum has NO upper bound and would over-count for a past 429)? Is the partial-coverage exclusion sound?
6. INTEGRATION COUPLING: arm --auto now depends on the tracker's sidecar SCHEMA (observedCeiling, 
... [+177 chars truncated]

### Assistant | 2026-06-17T19:40:11.804Z

I'll start by examining the latest commit and reading the changed files end-to-end.

### Assistant | 2026-06-17T19:40:12.658Z

[tool_use: Bash]

### User | 2026-06-17T19:40:13.232Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-06-17T19:40:15.183Z

Let me read the changed files directly rather than dumping the diff.

### Assistant | 2026-06-17T19:40:16.096Z

[tool_use: Bash]

### User | 2026-06-17T19:40:19.972Z

[tool_result] 2ebc822cfc [MAIN-FORCE] [ZULU-ACCOUNT-CYCLE]/U-5H-LIMIT-TRACKER (slot:zulu): mine 429 session-limit events -> OBSERVED 5h ceiling (replaces guessed 88M) + arm --auto
 scripts/arm-account-switch.mjs               | 215 ++++++++++
 scripts/arm-account-switch.test.mjs          | 126 ++++++
 scripts/five-hour-limit-tracker.mjs          | 608 +++++++++++++++++++++++++++
 scripts/five-hour-limit-tracker
... [+144 chars truncated]

### Assistant | 2026-06-17T19:40:22.851Z

The commit shows all 5 files are new (1728 insertions, 0 deletions). Interesting - the prompt says arm-account-switch.mjs was a "--auto EDIT" but the stat shows it as fully new (215 ++++ with no deletions). Let me read all the files end-to-end.

### Assistant | 2026-06-17T19:40:23.903Z

[tool_use: Read]

### Assistant | 2026-06-17T19:40:23.952Z

[tool_use: Read]

### User | 2026-06-17T19:40:24.513Z

[tool_result] read-once-guard: 'H:\prism\scripts\five-hour-limit-tracker.mjs' was already read 25s ago in this session and is unchanged (mtime 1781723218289). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-17T19:40:24.561Z

[tool_result] read-once-guard: 'H:\prism\scripts\arm-account-switch.mjs' was already read 25s ago in this session and is unchanged (mtime 1781723718116). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-17T19:40:27.573Z

The guard claims these files were read 25s ago, but they are not actually in my context (this is a fresh session). The cache is stale/incorrect. Let me disable the cache to force a real read.

### Assistant | 2026-06-17T19:40:29.008Z

[tool_use: Bash]

### User | 2026-06-17T19:40:33.461Z

[tool_result]   608 H:/prism/scripts/five-hour-limit-tracker.mjs
  215 H:/prism/scripts/arm-account-switch.mjs
  126 H:/prism/scripts/arm-account-switch.test.mjs
  385 H:/prism/scripts/five-hour-limit-tracker.test.mjs
 1334 total

### Assistant | 2026-06-17T19:40:36.380Z

The files exist. The read-once-guard is giving false positives in this fresh session. Let me read with explicit offset to bypass the guard, since it suggests using offset/limit for "a different part of the file."

### Assistant | 2026-06-17T19:40:37.005Z

[tool_use: Read]

### User | 2026-06-17T19:40:38.509Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * five-hour-limit-tracker.mjs -- ZULU-ACCOUNT-CYCLE-MS0 / U-5H-LIMIT-TRACKER
4	 * (slot:zulu, 2026-06-18). The CALIBRATION keystone the chain was missing.
5	 *
6	 * THE DISCOVERY (verified against 2 live transcripts 2026-06-18): Claude Code
7	 * DOES record the 5h-ceiling event in its own transcript JSONL. When the account
8	 * hits its rolling 5h session limit, a re
... [+30941 chars truncated]

### Assistant | 2026-06-17T19:40:43.562Z

Now let me read the arm-account-switch.mjs file (the --auto edit) and the dependency it imports.

### Assistant | 2026-06-17T19:40:44.106Z

[tool_use: Read]

### User | 2026-06-17T19:40:44.985Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * arm-account-switch.mjs -- one-command arm/disarm for the auto account-switch
4	 * watchdog (ZULU-ACCOUNT-CYCLE). The watchdog (the "PRISM Account Switch Monitor"
5	 * scheduled task running account-switch-monitor.mjs every 10 min) stays in DRY-RUN
6	 * until armed. Arming = set USER-scope env vars that the NEXT monitor tick reads:
7	 *   PRISM_5H_WEIGHTED_BUDGET   
... [+11282 chars truncated]

### Assistant | 2026-06-17T19:40:48.385Z

Now I have both main files. The commit shows arm-account-switch.mjs is fully new (215 insertions, 0 deletions), so the "--auto EDIT" was actually a fresh file in this commit. Let me verify by checking if it existed before this commit, and read the dependency `five-hour-token-sum.mjs` to confirm the imports are real.

### Assistant | 2026-06-17T19:40:49.940Z

[tool_use: Bash]

### User | 2026-06-17T19:40:55.754Z

[tool_result] 2ebc822cfc [MAIN-FORCE] [ZULU-ACCOUNT-CYCLE]/U-5H-LIMIT-TRACKER (slot:zulu): mine 429 session-limit events -> OBSERVED 5h ceiling (replaces guessed 88M) + arm --auto
---PREV-EXISTS---
fatal: path 'scripts/arm-account-switch.mjs' exists on disk, but not in 'HEAD~1'
NEW IN HEAD

### Assistant | 2026-06-17T19:41:00.560Z

Confirmed: `arm-account-switch.mjs` is entirely NEW in this commit (not an edit to a pre-existing file). So the prompt's framing of a "--auto EDIT" to existing arm/disarm/status paths is inaccurate — the whole file ships together. This means the "byte-unchanged" concern for VERIFY #1 is moot; I'll instead verify the import doesn't break the file at load time and that non-auto paths work. Let me read the dependency library to confirm the imported symbols exist.

### Assistant | 2026-06-17T19:41:00.836Z

[tool_use: Read]

### User | 2026-06-17T19:41:01.767Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\five-hour-token-sum.mjs' was already read 55s ago in this session and is unchanged (mtime 1781235190217). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-17T19:41:04.086Z

The guard is falsely caching. Let me read with offset to bypass.

### Assistant | 2026-06-17T19:41:04.462Z

[tool_use: Read]

### User | 2026-06-17T19:41:05.846Z

[tool_result] 1	// ZULU-ACCOUNT-CYCLE-MS0 / U-5H-TOKEN-SUM (slot:bravo, 2026-06-11) -- the KEYSTONE core.
2	//
3	// Rolling 5-hour token SUM across ALL of this host's Claude Code session
4	// transcripts. This is the verifiable foundation the account-switch coordinator
5	// needs: it reads quota.fiveHour.pct from token-budget-<slot>.json, but on this
6	// host Claude Code never emits rate_limits.five_hour, so t
... [+13158 chars truncated]

### Assistant | 2026-06-17T19:41:12.383Z

All imported symbols are confirmed exported by the dependency: `extractUsageTsFromBlock`, `dedupKeepMaxTs`, `parseTsMs`, `listTranscripts`, `fiveHourTokenSum`, `defaultProjectsRoot`, `CACHE_WRITE_MULT`, `CACHE_READ_MULT`, `FIVE_HOURS_MS`. The import will not break at load.

Now I noticed a critical detail in `five-hour-token-sum.mjs`: `readInWindowRecords` only reads the **last 32MB tail** of each transcript (`FULL_TAIL_BYTES`). This has implications for the tracker's calibration that I need to investigate. Let me also read the test files and the sidecar JSON to validate the schema coupling.

### Assistant | 2026-06-17T19:41:12.855Z

[tool_use: Read]

### User | 2026-06-17T19:41:13.726Z

[tool_result] 1	// Tests for arm-account-switch.mjs -- the one-command arm/disarm helper for the
2	// auto account-switch watchdog. The critical invariant: NEVER arm blind -- arming
3	// requires exactly one positive calibration value (budget XOR trigger), so a
4	// fat-finger `arm` with no ceiling cannot silently enable autonomous fleet-restart.
5	import { test } from "node:test";
6	import assert from "node:as
... [+7195 chars truncated]

### Assistant | 2026-06-17T19:41:16.436Z

Now the tracker test file and the sidecar JSON.

### Assistant | 2026-06-17T19:41:16.929Z

[tool_use: Read]

### User | 2026-06-17T19:41:17.785Z

[tool_result] 1	// Tests for five-hour-limit-tracker.mjs -- the 429 session-limit calibration that
2	// turns Claude Code's own transcript rate-limit events into the OBSERVED 5h ceiling
3	// (replacing the guessed 88M). Real verified record shapes (pulled from 2 live
4	// transcripts 2026-06-18); exact reference values (R9: a test must fail if the
5	// business logic changes). Fixtures are ASCII-only (the live 
... [+22318 chars truncated]

### Assistant | 2026-06-17T19:41:22.158Z

Now let me read the sidecar JSON to validate the schema coupling between the tracker and arm --auto, and run the tests to confirm they pass.

### Assistant | 2026-06-17T19:41:23.016Z

[tool_use: Read]

### User | 2026-06-17T19:41:23.861Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "source": "five-hour-limit-tracker:429-session-limit-calibration",
4	  "computedAt": "2026-06-17T19:16:52.227Z",
5	  "sinceDays": 45,
6	  "windowMs": 18000000,
7	  "transcriptsScanned": 1071,
8	  "usageRecords": 531894,
9	  "sessionLimitEvents": 2089,
10	  "observedCeiling": 71873712,
11	  "hardCeilingEstimate": 144961202.46998623,
12	  "minObservedCrossing": 
... [+1703 chars truncated]

### Assistant | 2026-06-17T19:41:30.665Z

Now I have a key observation. The live sidecar shows `partialCrossings: 0` and all observations `coverage: "full"` — but this is calibrated using `scanTranscript` which reads the **entire** file via readline. However, `liveStatus` reuses `fiveHourTokenSum`, which only reads the last 32MB tail. There's a subtle units inconsistency I need to investigate.

But more importantly — let me focus on the **calibration partial-coverage logic**. The `partial` flag in `calibrateFromEvidence` (line 238) checks `prefixData.earliestMs > start`. But `scanTranscript` filters records to `tsMs >= sinceMs` (line 366). So `earliestMs` is bounded below by `sinceMs`, which is `now - 45 days`. For a crossing event near the `sinceMs` boundary, the earliest record could be after the window start purely because of the `sinceMs` cutoff. Let me check this scenario and run the tests.

### Assistant | 2026-06-17T19:41:33.714Z

[tool_use: Bash]

### User | 2026-06-17T19:41:37.549Z

[tool_result]   ...
# Subtest: liveStatus: falls back to arm(p25) ceiling when no hard estimate; explicit + env precedence
ok 36 - liveStatus: falls back to arm(p25) ceiling when no hard estimate; explicit + env precedence
  ---
  duration_ms: 0.1401
  ...
# Subtest: liveStatus: no ceiling anywhere -> pct null, source null
ok 37 - liveStatus: no ceiling anywhere -> pct null, source null
  ---
  duration_ms: 0.0
... [+285 chars truncated]

### Assistant | 2026-06-17T19:41:39.570Z

38/38 tracker tests pass. Now the arm tests.

### Assistant | 2026-06-17T19:41:40.293Z

[tool_use: Bash]

### User | 2026-06-17T19:41:43.787Z

[tool_result] # tests 23
# suites 0
# pass 23
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 11.9567

### Assistant | 2026-06-17T19:41:49.424Z

Both suites pass (38 + 23 = 61). Now let me dig into the specific verification points with adversarial scenarios.

**VERIFY #1 — Silent breakage from the import.** The import is `import { readObservedCeiling, DEFAULT_OBSERVED_CEILING_PATH } from "./five-hour-limit-tracker.mjs"`. This is a top-level import in `arm-account-switch.mjs`. Critically: when `arm-account-switch.mjs` imports the tracker module, the tracker's **module-level code runs**, including the `__direct` IIFE (line 603-607). Let me verify that importing the tracker does NOT trigger `main()` (which would call `Date.now()` and scan transcripts on every arm/disarm/status). And verify the non-auto paths don't touch the tracker.

### Assistant | 2026-06-17T19:41:52.384Z

[tool_use: Bash]

### User | 2026-06-17T19:41:56.744Z

[tool_result] disarm: {"PRISM_ACCT_SWITCH_AUTO_APPLY":"0"}
arm budget: {"PRISM_ACCT_SWITCH_AUTO_APPLY":"1","PRISM_ACCT_SWITCH_PCT":"0.92","PRISM_5H_WEIGHTED_BUDGET":"250000000"}
import OK, no side effects fired

### Assistant | 2026-06-17T19:42:05.221Z

The import is clean: the tracker's `__direct` guard correctly compares `import.meta.url` to `process.argv[1]`, so importing it does NOT trigger `main()`/`Date.now()`/transcript scan. Non-auto paths (`composeEnvPlan` arm/disarm) are completely independent of the tracker. VERIFY #1 is clean.

**VERIFY #2 — Memory safety.** Confirmed at lines 340-372: `scanTranscript` uses `_fs.createReadStream(file, {encoding:"utf8"})` + `readline.createInterface`, never `readFileSync`. Line-by-line. The whole file is never held as a string. Good. But note: `readObservedCeiling` (line 376) uses `readFileSync` on the **sidecar** — that's a small JSON file (~394 lines / a few hundred KB), not a transcript, so the 512MB cap is not a concern there.

**VERIFY #3 — I/O security: fail-open clobber on corrupt sidecar.** Let me trace the actuation path. `arm --auto` calls `readObservedCeiling` (returns null on corrupt/missing via fail-soft catch), then `composeAutoPlan(doc, ...)`. If `doc` is null, `composeAutoPlan` throws (line 81-83). Let me verify the corrupt-sidecar path fails SAFE — and also check the CLI `auto` block at line 184-198, which reads `doc.observedCeiling` etc. AFTER `composeAutoPlan` already validated `doc`. Let me test the corrupt sidecar end-to-end.

### Assistant | 2026-06-17T19:42:11.151Z

[tool_use: Bash]

### User | 2026-06-17T19:42:16.301Z

[tool_result] null doc threw (SAFE): true
empty doc threw (SAFE): true
garbage ceiling threw (SAFE)
negative ceiling threw (SAFE)

### Assistant | 2026-06-17T19:42:25.634Z

Corrupt/missing/garbage sidecar all fail SAFE (throw, never arm). The CLI catch block (line 211-214) prints the error and `process.exit(1)`. No silent arming.

**Path traversal**: The sidecar path is `DEFAULT_OBSERVED_CEILING_PATH` (a fixed constant joined from `ROOT`), and the write path is the same. The `sessionId` from transcripts flows into the sidecar `observations[].sessionId` but is never used in a filesystem path. The tmp filename uses `process.pid`, not untrusted input. No path traversal.

**VERIFY #4 — Error budget boundary.** `nowMs` required → fail-loud (line 415, 480). No observed ceiling → `observedCeiling: null`, `write && observedCeiling != null` is false so no write (line 459), and CLI prints "NONE" and returns. arm --auto throws on null observedCeiling. Bad transcript line skipped (line 359), missing file → empty (line 347-350). The boundary is correct.

**VERIFY #5 — Regression: bounded BOTH-ENDS window.** `calibrateFromEvidence` uses `weightedInWindow(prefixData, start, e.tsMs)` with `start = e.tsMs - windowMs` (lines 235-236), an exact `[T-5h, T]` window via `lowerBound`/`upperBound` binary search. The test at line 136-151 confirms the after-event record (9M) is excluded and the before-window record (5M) is excluded. This is the documented fix vs. the sibling `fiveHourTokenSum` which has no upper bound. Correct.

Now let me probe the **partial-coverage interaction with `sinceMs`** that I flagged. This is a real regression-risk subtlety.

### Assistant | 2026-06-17T19:42:32.349Z

[tool_use: Bash]

### User | 2026-06-17T19:42:38.929Z

[tool_result] coverage: partial (expect partial -- earliest record is evMs-2h > start evMs-5h)
ceiling (undercount): 60000000 vs the real but unknowable full-window sum
usedCoverage: partial-fallback partialCount: 1

### Assistant | 2026-06-17T19:42:46.757Z

The partial-coverage detection correctly catches the `sinceMs`-truncation case: an event near the `sinceMs` boundary is flagged `partial` (because `earliestMs > start`), and partial observations are excluded from min/p25/median when full observations exist. The fallback to partial only happens when there are zero full observations. This is sound — the `sinceMs` filter does not silently produce undercounted "full" observations.

Now let me examine a subtler real-world concern. There's a **units-coupling inconsistency** between calibration and live status that could cause a real mis-arm. Calibration's `scanTranscript` reads the **entire** transcript via readline. But `liveStatus` (and the monitor that actually fires the switch) use `fiveHourTokenSum`, which only reads the **last 32MB tail** (`FULL_TAIL_BYTES`) per file and reports `cappedTranscripts`. Let me check whether this asymmetry can cause the live weighted sum to undercount relative to the calibrated ceiling. Let me also check whether the monitor that consumes these env vars exists and what it does.

### Assistant | 2026-06-17T19:42:47.229Z

[tool_use: Glob]

### Assistant | 2026-06-17T19:42:48.485Z

[tool_use: Grep]

### User | 2026-06-17T19:42:56.293Z

[tool_result] Found 27 files
knowledge\memories\reference\reference_account_switch_armable_2026_06_18.md
knowledge\memories\reference\reference_5h_keystone_2026_06_11.md
scripts\arm-account-switch.mjs
scripts\five-hour-limit-tracker.test.mjs
scripts\five-hour-limit-tracker.mjs
state\shared\galaxy-transcript-mining\mit-curriculum\7efaddb4.md
state\shared\handoffs\archive\HANDOFF-claude-7efaddb4-knowledge-accreti
... [+1164 chars truncated]

### User | 2026-06-17T19:43:08.232Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-17T19:43:11.620Z

The monitor (`account-switch-monitor.mjs`) and the gate (`five-hour-switch-gate.mjs`) exist and consume these env vars. The integration coupling question is whether the live weighted sum the monitor compares against the armed budget is computed in the **same units / same coverage** as the calibrated ceiling. Let me read the switch gate to confirm it uses `fiveHourTokenSum` (32MB tail) while calibration used full readline scan.

### Assistant | 2026-06-17T19:43:12.170Z

[tool_use: Read]

### User | 2026-06-17T19:43:12.695Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\five-hour-switch-gate.mjs' was already read 3m ago in this session and is unchanged (mtime 1781187700114). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-17T19:43:15.803Z

[tool_use: Bash]

### User | 2026-06-17T19:43:24.800Z

[tool_result] // ZULU-ACCOUNT-CYCLE-MS0 / U-5H-SWITCH-GATE (slot:bravo, 2026-06-11) -- keystone #3.
//
// The denominator-FREE decision gate for the account-switch coordinator. The
// coordinator's original gate was pct >= 0.90 and it FAILED LOUD when pct was
// null. But the Max-plan 5h token DENOMINATOR is not locally derivable (it is
// dynamic; verified 2026-06-11), so pct is null unless the operator suppli
... [+3594 chars truncated]

### Assistant | 2026-06-17T19:43:29.672Z

Now I understand the full chain. The gate computes `pct = weightedTokens / budget`. Let me check how the monitor computes `pct` — specifically which weighted-token source it uses and whether it matches the calibration source. The key integration-coupling concern: calibration measured crossings via full-file readline scan; if the monitor's live `weightedTokens` comes from `fiveHourTokenSum`'s 32MB-tail read, a heavy session that exceeds 32MB would undercount the live figure relative to the calibrated ceiling, delaying the switch. Let me check the monitor.

### Assistant | 2026-06-17T19:43:30.805Z

[tool_use: Bash]

### User | 2026-06-17T19:43:36.321Z

[tool_result] 37:import { appendFileSync } from "fs";
38:import path from "path";
39:import { fileURLToPath } from "url";
111:  const { runCoordinator } = await import(

### Assistant | 2026-06-17T19:43:48.101Z

The monitor delegates to `runCoordinator`. The live weighted-token source is in the coordinator, which is pre-existing code not changed by this commit. Since the commit only changes the *calibration* (how the budget number is derived) and the *arming* (setting the env var), the consuming side (coordinator's live measurement) is unchanged. The units-coupling concern I noted (32MB-tail live read vs full-file calibration) is a **pre-existing property of the keystone**, not introduced by this commit — calibration over-/under-counting relative to the live read is a property the `caveat` field and the conservative p25 partly absorb. It's worth noting as P2 context but is not a regression introduced here.

**VERIFY #6 — Integration coupling: schema drift.** `composeAutoPlan` reads `ceilingDoc.observedCeiling`, `.lowConfidence`, `.computedAt`, `.recommend.pct`, `.crossings`. Let me trace what happens if each field is renamed/missing in a future tracker version — does arm fail safe?

- `observedCeiling` renamed/missing → `Number(undefined)` = NaN → `!Number.isFinite` → **throws** (line 85-87). SAFE.
- `lowConfidence` renamed/missing → `ceilingDoc.lowConfidence` is undefined (falsy) → the low-confidence guard is skipped. This means a future tracker that drops `lowConfidence` would let a low-confidence ceiling arm silently. But the tracker writes it, and a missing field defaulting to "not low confidence" is a **fail-toward-arming** direction. Let me assess severity.
- `computedAt` renamed/missing → freshness guard skipped (line 90 requires `typeof === "string"`). A future tracker dropping `computedAt` → stale ceilings would arm. Also fail-toward-arming.
- `recommend.pct` missing → `resolvedPct` falls to null → `composeEnvPlan` uses `DEFAULT_PCT` (0.92). Safe default.

Let me verify the `lowConfidence`/`computedAt` missing-field behavior concretely.

### Assistant | 2026-06-17T19:43:53.890Z

[tool_use: Bash]

### User | 2026-06-17T19:44:00.720Z

[tool_result] ARMED at: 12000000 <-- field-absent low-confidence doc armed WITHOUT refusal
no-computedAt -> staleness check SKIPPED, armed: 67000000

### Assistant | 2026-06-17T19:44:13.227Z

Confirmed the schema-drift behavior. The two safety guards (`lowConfidence` refusal and `computedAt` staleness refusal) are **fail-open if their field is absent**: a doc that lacks `lowConfidence` bypasses the low-confidence refusal, and a doc lacking `computedAt` bypasses the staleness refusal. However, I must weigh severity carefully:

1. The tracker and arm ship in the **same commit** as a producer-consumer pair, both at `schemaVersion: "1.0.0"`. The tracker **always** writes both fields (lines 438, 454). The doc has no `schemaVersion` check in `composeAutoPlan`, so a future tracker that bumps the schema and drops a field would not be caught — but that's a future-coupling risk, not a current break.
2. The critical guard — `observedCeiling` being unusable → throw — is fail-SAFE. Only the *secondary* protective guards fail-open on field-absence.

This is a real but P2-level integration-coupling finding: the guards key off truthiness of optional fields rather than asserting the producer's schema contract. Given both files ship together at v1.0.0 and the tracker unconditionally writes both fields, the live risk is low; the exposure is to a future schema change. The `caveat`/`lowConfidence`/`computedAt` are all present and correct in the live sidecar.

Now let me check one more real concern: the **actuation ordering** in the CLI `auto` block. Line 187 calls `composeAutoPlan(doc, ...)` which validates, but then line 194-195 reads `doc.observedCeiling`, `doc.crossings`, `doc.lowConfidence` for the output JSON. Since `composeAutoPlan` already threw on a bad doc, `doc` is guaranteed non-null and usable at that point. No NPE risk. Let me also verify the `--auto` actuation actually loops the plan into `defaultSetUserEnv` correctly and that a partial failure (one of the 3 env vars fails to set) is surfaced.

### Assistant | 2026-06-17T19:44:14.070Z

[tool_use: Read]

### User | 2026-06-17T19:44:15.365Z

[tool_result] 184	    } else if (args.action === "auto") {
185	      // Arm at the OBSERVED ceiling from the tracker sidecar -- no operator guessing.
186	      const doc = readObservedCeiling(DEFAULT_OBSERVED_CEILING_PATH);
187	      const plan = composeAutoPlan(doc, { pct: args.pct, acceptLowConfidence: args.acceptLowConfidence, acceptStale: args.acceptStale, nowMs: Date.now() });
188	      for (const [name, v
... [+561 chars truncated]

### Assistant | 2026-06-17T19:44:25.064Z

There's a **partial-write atomicity** concern in the actuation loop (line 188): `defaultSetUserEnv` is called sequentially for each of the 3 env vars. If `defaultSetUserEnv` throws on the 2nd var (e.g. PowerShell fails), the 1st var (`PRISM_ACCT_SWITCH_AUTO_APPLY=1`) is already set in USER scope, but `PRISM_5H_WEIGHTED_BUDGET` may not be. The next monitor tick would then read `AUTO_APPLY=1` with no budget → the gate would be `undecidable` (fails loud, no switch) per `decideSwitch`. So a partial arm fails SAFE on the consuming side — it does not arm-without-a-budget into an unsafe switch. The plan ordering happens to put `AUTO_APPLY` first (line 126), but the gate's undecidable path catches the missing budget. This is acceptable; worth noting that the ordering would be safer with the budget set first, but it does not produce an unsafe actuation. P2 at most.

Let me verify one final adversarial path on `classifyRateLimitText` — the regex ordering for server-throttle vs session-limit, since misclassifying a server-throttle as a session-limit would inject a spurious low crossing (rejected by p25, but could pollute the distribution). The test at line 71-74 covers "not your usage limit" winning. Let me confirm a real edge: a session-limit text that also contains the word "server".

### Assistant | 2026-06-17T19:44:29.903Z

[tool_use: Bash]

### User | 2026-06-17T19:44:35.159Z

[tool_result] throttle: server-throttle
session : session-limit
both    : server-throttle
empty content kind: unknown (unknown -> excluded from calibration)

### Assistant | 2026-06-17T19:44:39.511Z

Classification is robust: server-throttle disclaimer wins (conservative — excludes from calibration), empty content → unknown (excluded). A 429 with no parseable text won't pollute the crossing distribution. Only a genuine session-limit text produces a crossing.

I have now traced every verification point with live execution. Let me confirm the full test suite count and that no consumers of these new files exist elsewhere that I'm missing (blast radius).

### Assistant | 2026-06-17T19:44:40.181Z

[tool_use: Grep]

### User | 2026-06-17T19:44:42.937Z

[tool_result] Found 4 files
scripts\arm-account-switch.test.mjs
scripts\arm-account-switch.mjs
scripts\five-hour-limit-tracker.test.mjs
scripts\five-hour-limit-tracker.mjs
