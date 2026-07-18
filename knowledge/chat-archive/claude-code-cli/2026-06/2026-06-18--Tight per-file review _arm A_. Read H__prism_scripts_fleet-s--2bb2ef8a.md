---
type: "chat-session"
source: "claude-code-cli"
session_id: "2bb2ef8a-06f5-4b6f-8801-35a9db88efb7"
title: "Tight per-file review (arm A). Read H:/prism/scripts/fleet-survival-status.mjs +"
date: "2026-06-18"
first_ts: "2026-06-18T03:13:10.626Z"
last_ts: "2026-06-18T03:14:08.682Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 8
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/2bb2ef8a-06f5-4b6f-8801-35a9db88efb7/subagents/agent-a42812416ff427bb9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Tight per-file review (arm A). Read H:/prism/scripts/fleet-survival-status.mjs +

> **claude-code-cli** | 2026-06-18 | 19 msgs (8 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2bb2ef8a-06f5-4b6f-8801-35a9db88efb7/subagents/agent-a42812416ff427bb9.jsonl`

## Transcript

### User | 2026-06-18T03:13:10.626Z

Tight per-file review (arm A). Read H:/prism/scripts/fleet-survival-status.mjs + its test fleet-survival-status.test.mjs end-to-end. This is a READ-ONLY orchestrator GO/NO-GO that decides "will the fleet survive the next 5h session limit without operator action?" It composes liveStatus() (5h proximity) + runPreflight() (account readiness) + the PRISM_ACCT_SWITCH_AUTO_APPLY env (armed?).

THE INVARIANT THAT MUST HOLD: survives === (armed AND preflight.safeToArm). A FALSE "SURVIVABLE" is the dangerous failure (gives the operator false safety that the fleet will auto-recover). Verify:
1. gradeSurvival returns survives=true ONLY when armed===true AND preflight.safeToArm===true. RED preflight or unarmed => survives=false. null preflight => survives=false (a blocker, never silently survivable).
2. Proximity (zone/pctUsed) is INFORMATIONAL only and never affects `survives` (a failed/null live must not flip survival).
3. Fail-soft: liveStatus throwing -> proximity unknown but verdict still produced; runPreflight throwing -> null -> blocker (not a crash).
4. The unblock `actions` are correct: RED+currentAccount===null -> re-capture; not-armed+preflightOk -> arm.
5. It never arms anything / never mutates (read-only); no token/secret handling.
6. Tests are real reference values (R9) and would fail if survives logic flipped; no .skip/.only; ASCII-only.

Run `node scripts/fleet-survival-status.test.mjs` (14 expected). Grade PASS/FAIL with P0/P1/P2 + file:line. Be concise.

### Assistant | 2026-06-18T03:13:14.343Z

I'll review the orchestrator and its test end-to-end. Let me read both files.

### Assistant | 2026-06-18T03:13:15.189Z

[tool_use: Read]

### Assistant | 2026-06-18T03:13:15.315Z

[tool_use: Read]

### User | 2026-06-18T03:13:16.225Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * fleet-survival-status.mjs -- ZULU-ACCOUNT-CYCLE / U-FLEET-SURVIVAL (slot:zulu,
4	 * 2026-06-18). The orchestrator's GO/NO-GO cockpit for the one question that decides
5	 * "run as long as possible before session limits hit again":
6	 *
7	 *     Will the fleet survive the next 5h session limit WITHOUT operator action?
8	 *
9	 * Composes three already-built signals i
... [+7786 chars truncated]

### User | 2026-06-18T03:13:17.168Z

[tool_result] 1	// Tests for fleet-survival-status.mjs -- the orchestrator GO/NO-GO that answers
2	// "will the fleet survive the next 5h limit without operator action?". Survival ==
3	// (armed AND account-set-not-RED). Proximity is informational and never gates survival.
4	// R9: each test fails if the survival logic changes.
5	//
6	// Run directly:  node scripts/fleet-survival-status.test.mjs   (node:test au
... [+6035 chars truncated]

### Assistant | 2026-06-18T03:13:20.092Z

Both files read end-to-end. Now let me verify the dependencies' contracts (the signals this orchestrator composes) to confirm no silent drift, and run the test.

### Assistant | 2026-06-18T03:13:21.984Z

[tool_use: Grep]

### User | 2026-06-18T03:13:23.328Z

[tool_result] 19: * a chain that silently degrades the live login (R12 fail-loud; "autonomous no
30: * account names + grades + ages + booleans -- never a token, never a fingerprint.
125: * @param {string|null} a.currentAccount    identified current (or null)
131: * @returns {{grade, reasons[], recommendations[], nextTarget, distinctAccounts,
134:export function gradePreflight({ currentAccount, identifyMethod, 
... [+1752 chars truncated]

### Assistant | 2026-06-18T03:13:23.868Z

[tool_use: Grep]

### Assistant | 2026-06-18T03:13:24.428Z

[tool_use: Bash]

### User | 2026-06-18T03:13:25.309Z

[tool_result] 67:export const DEFAULT_OBSERVED_CEILING_PATH = path.join(ROOT, "state", "shared", "five-hour-ceiling-observed.json");
308: * @param {number} currentWeighted  rolling 5h weighted sum (now)
313:export function computeStatus({ currentWeighted, ceiling, burnWeighted, burnWindowMs }) {
316:  const pctUsed = hasCeiling ? currentWeighted / ceiling : null;
317:  const remaining = hasCeiling ? Math.max(0,
... [+964 chars truncated]

### User | 2026-06-18T03:13:29.698Z

[tool_result]   ...
# Subtest: runSurvivalStatus: survivable end-to-end (injected armed + GREEN)
ok 11 - runSurvivalStatus: survivable end-to-end (injected armed + GREEN)
  ---
  duration_ms: 0.3568
  ...
# Subtest: runSurvivalStatus: will-block end-to-end (not armed + RED) with the live host shape
ok 12 - runSurvivalStatus: will-block end-to-end (not armed + RED) with the live host shape
  ---
  duration_ms: 0
... [+571 chars truncated]

### Assistant | 2026-06-18T03:13:34.335Z

All 14 tests pass. The dependency contracts confirm the orchestrator reads them correctly. Let me verify the two remaining items: the `runPreflight` signature (does it accept `{nowMs}` and not require other args that would make the injection-vs-live drift), and confirm the `safeToArm` derivation at the source.

### Assistant | 2026-06-18T03:13:35.754Z

[tool_use: Read]

### Assistant | 2026-06-18T03:13:36.284Z

[tool_use: Read]

### User | 2026-06-18T03:13:36.631Z

[tool_result] 222	export function runPreflight({
223	  accountsRoot = DEFAULT_ACCOUNTS_ROOT,
224	  home = homedir(),
225	  nowMs,
226	  fixActive = false,
227	  thresholds = {},
228	  _fs = fsDefault,
229	  _writeActive = writeActiveAccount,
230	} = {}) {
231	  if (!Number.isFinite(nowMs)) throw new Error("runPreflight: nowMs (finite epoch ms) is required");
232	
233	  const livePath = resolveLiveCredentialPath
... [+2693 chars truncated]

### User | 2026-06-18T03:13:37.223Z

[tool_result] 469	export function liveStatus({
470	  nowMs,
471	  ceiling = null,
472	  burnWindowMs = DEFAULT_BURN_WINDOW_MS,
473	  projectsRoot = defaultProjectsRoot(),
474	  ceilingPath = DEFAULT_OBSERVED_CEILING_PATH,
475	  env = process.env,
476	  _sum = fiveHourTokenSum,
477	  _readCeiling = readObservedCeiling,
478	  _fs = fsDefault,
479	} = {}) {
480	  if (!Number.isFinite(nowMs)) throw new Error("liveS
... [+2085 chars truncated]

### Assistant | 2026-06-18T03:14:08.682Z

Dependency contracts confirmed. Both source signals match exactly what `gradeSurvival` consumes:

- `runPreflight` returns `{grade, safeToArm: graded.grade !== "RED", currentAccount, nextTarget, reasons}` and takes `{nowMs}` — exactly the shape the orchestrator injects and reads. `safeToArm` is `false` iff RED, so `preflightOk` ⇔ not-RED.
- `liveStatus` returns `{zone, pctUsed, currentWeighted, ceiling, armTrigger, armWouldFire}` — all read defensively with `Number.isFinite`/typeof guards in `gradeSurvival`. A failed/null live cannot inject a non-null proximity field that would poison anything.

Now verifying each invariant against the code:

**Invariant 1 (survives only when armed AND safeToArm)** — Line 58: `const survives = armed && preflightOk;` where `preflightOk = !!(preflight && preflight.safeToArm)` (line 49). RED → `safeToArm:false` → `preflightOk:false` → `survives:false`. null preflight → `preflightOk:false` → `survives:false` AND a blocker is pushed (line 54-55, "could not run"). Unarmed → `survives:false`. Confirmed. There is no path where proximity, zone, or any `live` field enters the `survives` expression.

**Invariant 2 (proximity informational)** — `survives` (line 58) is computed purely from `armed` and `preflightOk`; `live` is only consumed in the `proximity` object (lines 73-82) and never feeds `survives` or `blockers`. The `live:null` test (line 65-70) and throwing-live test (line 114-123) both assert `survives` is unaffected. Confirmed.

**Invariant 3 (fail-soft)** — `runSurvivalStatus` wraps `_live` (line 113) and `_preflight` (line 115) in try/catch → null on throw. Live throw → null → unknown proximity, verdict still produced. Preflight throw → null → blocker, not a crash. The `nowMs` guard (line 111) is the only intentional fail-loud. Confirmed and test-covered (tests 13, 14).

**Invariant 4 (actions correct)** — RED + `currentAccount == null` → re-capture action (lines 62-63). `preflightOk && !armed` → arm action (lines 65-66). The `else 
... [+3499 chars truncated]
