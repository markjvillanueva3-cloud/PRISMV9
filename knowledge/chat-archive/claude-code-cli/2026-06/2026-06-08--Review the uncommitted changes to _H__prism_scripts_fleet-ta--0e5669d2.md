---
type: "chat-session"
source: "claude-code-cli"
session_id: "0e5669d2-0f99-48ce-941d-0eac73b5624f"
title: "Review the uncommitted changes to `H:/prism/scripts/fleet-task-health-watch.mjs`"
date: "2026-06-08"
first_ts: "2026-06-08T20:22:54.099Z"
last_ts: "2026-06-08T20:25:52.763Z"
cwd: "H:\\prism"
messages: 39
user_msgs: 15
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/agent-a857c1092a5c4d413.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# Review the uncommitted changes to `H:/prism/scripts/fleet-task-health-watch.mjs`

> **claude-code-cli** | 2026-06-08 | 39 msgs (15 user / 24 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/agent-a857c1092a5c4d413.jsonl`

## Transcript

### User | 2026-06-08T20:22:54.099Z

Review the uncommitted changes to `H:/prism/scripts/fleet-task-health-watch.mjs` (slot:sierra, MCP-FLEET-CAPACITY-MS0 follow-up). Read the WHOLE file end-to-end.

CONTEXT / what the change does:
- Adds an exported `EXPECTED_UNREGISTERED_TASKS` array (the 2 vault crons: "PRISM Vault Memory Promotion Cron", "PRISM Vault Rot Sentinel Cron") — installers shipped but deliberately NOT registered under a 47-task migration freeze.
- `aggregateHealth(classified, cfg)` now partitions absent known tasks into `missing` (real safety-net gap → escalates to warn) vs `expectedUnregistered` (deliberate deferral → surfaced informationally only, NEVER escalates), mirroring the existing benign `pressure` pattern. New `cfg.expectedUnregistered` field; new `expectedUnregistered` array on the return.
- Threads `EXPECTED_UNREGISTERED_TASKS` into the call site cfg; surfaces `expectedUnregistered` in `row` + `fmtSummary` (`deferred(N): ...`).
- Adds "PRISM WSL Memory Guard" to BOTH `KNOWN_PRISM_TASKS` and `CRASH_CRITICAL_TASKS` (a peer's commit-pressure relief task the live E2E drift test caught unwatched).

VERIFY (flag P0/P1, grade PASS/FAIL):
1. The partition is correct: `missing` and `expectedUnregistered` are disjoint and together equal `absent`. A name in `expectedUnregistered` must NEVER appear in `missing`, and `isHardDown`/`isDegraded` must NOT treat an expectedUnregistered task as down (so a deferred MUST_EXIST task can't false-critical).
2. R12 honesty preserved: the deferral is STILL surfaced (in reasons + row + summary), just not as an alarm. A genuinely-missing (non-deferred) task STILL escalates to warn and a degraded MUST_EXIST still criticals.
3. No regression to the existing `pressure` benign path or the `crashCritical`/`mustExist` severity logic.
4. Adding "PRISM WSL Memory Guard" to CRASH_CRITICAL_TASKS is sound — confirm the ≥2-degraded rule means it can't false-critical alone, and that it's also in KNOWN_PRISM_TASKS (alphabetical placement).
5. Any silent-failure, off-b
... [+186 chars truncated]

### Assistant | 2026-06-08T20:23:08.842Z

I'll review the uncommitted changes to the fleet-task-health-watch.mjs file. Let me read the whole file end-to-end first.

### Assistant | 2026-06-08T20:23:12.372Z

[tool_use: Read]

### User | 2026-06-08T20:23:15.153Z

[tool_result] 1	/**
2	 * fleet-task-health-watch.mjs — durable health watchdog over PRISM's
3	 * Windows scheduled-task safety net.
4	 *
5	 * THE GAP THIS CLOSES. PRISM's crash-prevention safety net is a set of
6	 * Windows scheduled tasks — `PRISM Fleet Reaper` (orphan-process reaper),
7	 * `PRISM Fleet Memory Monitor` (per-chat RSS attribution + /compact advisory),
8	 * `PRISM Cleanup Orchestrator`, `PRISM No
... [+57706 chars truncated]

### Assistant | 2026-06-08T20:23:37.871Z

I've read the whole file. Now let me verify the diff against the prior committed version to confirm exactly what changed, and check the test file to confirm the partition logic is exercised.

### Assistant | 2026-06-08T20:23:37.872Z

[tool_use: Bash]

### Assistant | 2026-06-08T20:23:37.877Z

[tool_use: Bash]

### User | 2026-06-08T20:23:42.196Z

[tool_result] scripts/fleet-task-health-watch.mjs | 66 +++++++++++++++++++++++++++++++++----
 1 file changed, 60 insertions(+), 6 deletions(-)

--- Changes ---

scripts/fleet-task-health-watch.mjs
  @@ -125,8 +125,17 @@ export const CRASH_CRITICAL_TASKS = [
  +  "PRISM WSL Memory Guard",
     "PRISM Zombie Reaper v2",
     "PRISM Zulu Orchestrator",
  +  // 2026-06-08 MCP-FLEET-CAPACITY-MS0 (slot:sierra): added
... [+7073 chars truncated]

### User | 2026-06-08T20:23:45.490Z

[tool_result] Exit code 2
-rw-r--r-- 1 wompu 197611  4297 Jun  8 11:31 .claude/helpers/install-vault-crons.test.mjs
-rw-r--r-- 1 wompu 197611  5363 Jun  8 11:25 .claude/helpers/install-vault-promotion-cron.ps1
-rw-r--r-- 1 wompu 197611  4527 Jun  8 11:26 .claude/helpers/install-vault-rot-sentinel-cron.ps1
-rw-r--r-- 1 wompu 197611 54888 Jun  8 15:13 scripts/fleet-task-health-watch.mjs
---TEST FILES---

### Assistant | 2026-06-08T20:23:51.649Z

The diff confirms exactly what was described. Now let me find the test file for this watch script and verify the partition logic is exercised, and check the installer comment claim (`install-vault-{promotion,rot-sentinel}-cron.ps1` matches the actual filenames).

### Assistant | 2026-06-08T20:23:52.283Z

[tool_use: Glob]

### Assistant | 2026-06-08T20:23:54.128Z

[tool_use: Bash]

### User | 2026-06-08T20:23:58.599Z

[tool_result] knowledge\wiki\architecture\fleet-task-health-ms0.md
.claude\hooks\fleet-task-health-stop.mjs
knowledge\wiki\code-tribal\learnings\fleet-task-health-ms0-u-fth-followup-self-disc.md
knowledge\wiki\lessons\fleet-task-health-recovery.md
knowledge\wiki\lessons\fleet-task-health-discovery-drift.md
knowledge\claude-md\project-fleet-task-health-watchdog-over-watchdogs-critical-pressure-.md
knowledge\wiki
... [+396 chars truncated]

### User | 2026-06-08T20:24:03.861Z

[tool_result] scripts/__tests__/fleet-task-health-watch.test.mjs
.claude/helpers/install-vault-crons.test.mjs

### Assistant | 2026-06-08T20:24:08.491Z

There's a test file. Let me read it to confirm the partition logic is tested with real assertions (R9), and verify the installer filename claim.

### Assistant | 2026-06-08T20:24:08.492Z

[tool_use: Read]

### User | 2026-06-08T20:24:09.457Z

[tool_result] read-once-guard: 'H:\prism\scripts\__tests__\fleet-task-health-watch.test.mjs' was already read 29s ago in this session and is unchanged (mtime 1780949518669). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_
... [+8 chars truncated]

### Assistant | 2026-06-08T20:24:14.385Z

The read-once guard says the file was already read, but it isn't in my context (the guard's tracking is mistaken, or it cached a sibling read). Let me grep for the relevant assertions instead.

### Assistant | 2026-06-08T20:24:15.943Z

[tool_use: Grep]

### User | 2026-06-08T20:24:17.283Z

[tool_result] 16: *   - aggregateHealth must classify an EMPTY task set as `critical` (the whole
32:  aggregateHealth,
41:// Synthetic task-name sets for aggregateHealth — deliberately NOT the real
65:  assert.equal(parseIso8601Duration("5M"), null, "missing the P prefix");
217:// ─── aggregateHealth ────────────────────────────────────────────────────────
222:test("aggregateHealth: every task healthy → clean",
... [+3327 chars truncated]

### Assistant | 2026-06-08T20:24:22.833Z

The test file has dedicated coverage for the new partition logic. Let me read the critical test cases (lines 286-330) in full to verify they assert real behavior (R9), and confirm the `expectedUnregistered` MUST_EXIST case asserts the level is NOT critical.

### Assistant | 2026-06-08T20:24:24.420Z

[tool_use: Read]

### Assistant | 2026-06-08T20:24:24.758Z

[tool_use: Read]

### User | 2026-06-08T20:24:25.649Z

[tool_result] 286	test("aggregateHealth: a known task missing (non-must-exist) → warn", () => {
287	  const r = aggregateHealth(
288	    [healthy("TaskA"), healthy("TaskB"), healthy("TaskC")], // TaskD absent
289	    AGG_CFG,
290	  );
291	  assert.equal(r.level, "warn");
292	  assert.deepEqual(r.missing, ["TaskD"]);
293	});
294	
295	test("aggregateHealth: an expected-unregistered absent task → clean (deferred, 
... [+1910 chars truncated]

### User | 2026-06-08T20:24:26.572Z

[tool_result] 41	// Synthetic task-name sets for aggregateHealth — deliberately NOT the real
42	// 8-task list, so these tests stay correct if the real list changes.
43	const AGG_CFG = {
44	  mustExist: ["TaskA", "TaskB"],
45	  crashCritical: ["TaskA", "TaskB", "TaskC"],
46	  knownTasks: ["TaskA", "TaskB", "TaskC", "TaskD"],
47	};
48	const CLASSIFY_CFG = { staleMultiplier: 3 };
49	const FIVE_MIN_MS = 5 * 60 * 1
... [+783 chars truncated]

### Assistant | 2026-06-08T20:24:35.402Z

Excellent — the tests are real-assertion (R9 compliant) and cover the partition invariants precisely. Now let me run the test suite to confirm it's actually green, and verify the installer filename claim in the JSDoc.

### Assistant | 2026-06-08T20:24:36.835Z

[tool_use: Bash]

### Assistant | 2026-06-08T20:24:37.937Z

[tool_use: Bash]

### User | 2026-06-08T20:24:41.897Z

[tool_result]   ...
# Subtest: classifyTask: a REAL launch HRESULT still classifies 'failing'
ok 59 - classifyTask: a REAL launch HRESULT still classifies 'failing'
  ---
  duration_ms: 0.0385
  ...
# Subtest: aggregateHealth: a 'pressure' task does NOT escalate fleet level (benign finding)
ok 60 - aggregateHealth: a 'pressure' task does NOT escalate fleet level (benign finding)
  ---
  duration_ms: 0.0695
  ..
... [+294 chars truncated]

### User | 2026-06-08T20:24:46.282Z

[tool_result] -rw-r--r-- 1 wompu 197611 5363 Jun  8 11:25 .claude/helpers/install-vault-promotion-cron.ps1
-rw-r--r-- 1 wompu 197611 4527 Jun  8 11:26 .claude/helpers/install-vault-rot-sentinel-cron.ps1
--- JSDoc says: install-vault-{promotion,rot-sentinel}-cron.ps1 ---

### Assistant | 2026-06-08T20:24:52.205Z

All 61 tests pass. The installer filenames match the JSDoc claim exactly. Now let me verify the two specific points I cannot confirm purely from the code: (1) that the vault cron installers actually register the task names listed in `EXPECTED_UNREGISTERED_TASKS` (so they'll be discovered and won't trip `installerDrift` falsely), and (2) the alphabetical placement of "PRISM WSL Memory Guard" in `KNOWN_PRISM_TASKS`.

### Assistant | 2026-06-08T20:24:54.325Z

[tool_use: Grep]

### Assistant | 2026-06-08T20:24:55.139Z

[tool_use: Grep]

### User | 2026-06-08T20:24:55.829Z

[tool_result] 15:# hardware/drive migration — DO NOT run this installer (or run it with -Disabled)
16:# until the operator confirms the migration is complete. Registering with -Disabled
22:#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-vault-promotion-cron.ps1 -Disabled
34:  [string]$TaskName = "PRISM Vault Memory Promotion Cron",
42:  $existing = Get-ScheduledTask -Tas
... [+886 chars truncated]

### User | 2026-06-08T20:24:56.570Z

[tool_result] 14:# migration — DO NOT run this installer (or run it with -Disabled) until the
19:#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-vault-rot-sentinel-cron.ps1 -Disabled
29:  [string]$TaskName = "PRISM Vault Rot Sentinel Cron",
37:  $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
39:    Unregister-ScheduledTask -TaskName $Task
... [+704 chars truncated]

### Assistant | 2026-06-08T20:25:05.604Z

This confirms a subtle but important interaction worth flagging. Both installers:
- Declare `$TaskName = "PRISM Vault Memory Promotion Cron"` / `"PRISM Vault Rot Sentinel Cron"` (matching `EXPECTED_UNREGISTERED_TASKS` exactly).
- Call `Register-ScheduledTask -TaskName $TaskName`.

So `discoverInstallerTasks` will discover both names (typed `$TaskName` var assignment, content-gated by `Register-ScheduledTask`). They are in `KNOWN_PRISM_TASKS`, so `detectInstallerDrift` shows no drift. Good — the drift detector and the expectedUnregistered partition are consistent.

There is one important nuance: the installers register the tasks as **`-Disabled`** under the freeze. This means there are actually **two** distinct "deferred" states, and I need to verify the partition handles the registered-but-disabled case. Let me check the alphabetical placement and reason about the disabled-state interaction.

### Assistant | 2026-06-08T20:25:06.433Z

[tool_use: Read]

### User | 2026-06-08T20:25:07.468Z

[tool_result] 183	  "PRISM MCP Priority Guardian",           // MCP-FLEET-CAPACITY-MS0 2026-06-08 drift-sync (peer installer)
184	  "PRISM MCP Server",                      // U-HERMES-FTH-DRIFT-SYNC 2026-06-01
185	  "PRISM MCP Server Watchdog",             // U-HERMES-FTH-DRIFT-SYNC 2026-06-01
186	  "PRISM Memory Pressure Auto-Relief",     // U-FTH-FOLLOWUP-SELF-DISC adds
187	  "PRISM NN-Graph Retrain",       
... [+2937 chars truncated]

### Assistant | 2026-06-08T20:25:52.763Z

I have everything I need. Let me reason through the full verdict.

**Alphabetical placement of "PRISM WSL Memory Guard" (line 210):** The list sorts by ASCII. `"PRISM W"` < `"PRISM Z"`. Within W: `"PRISM Wiki-Tribal Audit Regen"` (line 209) vs `"PRISM WSL Memory Guard"` (line 210). ASCII char after `"PRISM W"`: `i` (0x69) vs `S` (0x53). Uppercase `S` sorts before lowercase `i`, so `"PRISM WSL..."` should come BEFORE `"PRISM Wiki..."` in pure ASCII order. The file places it AFTER. This is a **cosmetic ordering inconsistency** — but the list is a plain membership array (consumed via `.filter`/`.has`), so ordering has zero functional effect (and the existing list already mixes case-folded human ordering — "Wiki Link Healer" before "Wiki-Tribal"). Not a P0/P1; noting it as P3 only.

Now the substantive verification points:

**1. Partition correctness (disjoint + union = absent).** `absent = knownTasks.filter(!byName.has)`; `missing = absent.filter(!expectedSet.has)`; `expectedUnregistered = absent.filter(expectedSet.has)`. These are complementary filters over the same `absent` array with a boolean predicate and its negation → provably disjoint and union = absent. A name in `expectedUnregistered` can never be in `missing`. Correct.

**2. `isHardDown`/`isDegraded` cannot treat a deferred task as down.** Both predicates check `missing.includes(name)` (now excludes expectedUnregistered) then `byName.get(name)` — a deferred task is absent, so `byName.get` returns `undefined`, and `!!t` is false → returns false. A deferred MUST_EXIST task therefore stays off `mustExistHardDown`. Test at line 319 confirms `level: "clean"`, `mustExistHardDown: []`. Correct.

**3. R12 honesty.** The deferral is surfaced in `reasons` (line 733-735), in `row.expectedUnregistered` (line 895), and in `fmtSummary` as `deferred(N)`. A genuinely-missing non-deferred task still hits `missing` → `level: "warn"` (test line 309 confirms co-occurring real-missing still warns). A degraded MUST_EXIST still cr
... [+6242 chars truncated]
