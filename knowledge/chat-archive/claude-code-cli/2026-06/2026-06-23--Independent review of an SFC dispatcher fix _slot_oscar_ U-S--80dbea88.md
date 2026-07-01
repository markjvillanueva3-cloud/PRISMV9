---
type: "chat-session"
source: "claude-code-cli"
session_id: "80dbea88-707c-48cb-a53f-5d1a7c809fad"
title: "Independent review of an SFC dispatcher fix (slot:oscar, U-SFC-MACHINE-HOOK-SHAP"
date: "2026-06-23"
first_ts: "2026-06-23T03:10:33.709Z"
last_ts: "2026-06-23T03:14:38.675Z"
cwd: "H:\\prism\\mcp-server"
messages: 68
user_msgs: 26
assistant_msgs: 42
raw_file: "H:/.claude/projects/H--prism/80dbea88-707c-48cb-a53f-5d1a7c809fad/subagents/agent-a85f9bc9020b35531.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# Independent review of an SFC dispatcher fix (slot:oscar, U-SFC-MACHINE-HOOK-SHAP

> **claude-code-cli** | 2026-06-23 | 68 msgs (26 user / 42 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/80dbea88-707c-48cb-a53f-5d1a7c809fad/subagents/agent-a85f9bc9020b35531.jsonl`

## Transcript

### User | 2026-06-23T03:10:33.709Z

Independent review of an SFC dispatcher fix (slot:oscar, U-SFC-MACHINE-HOOK-SHAPE). Grade PASS/FAIL with P0/P1/P2 + file:line. Weight toward blast radius, silent breakage, and test integrity (do NOT assume the safety reviewer caught everything).

THE CHANGE (3 files): builds a nested `{ spindle: { max_rpm, power_kw, power_continuous_kw } }` machine package from the SFC's flat `machine_max_rpm`/`machine_power_kw` params and sets `params.machine` before the pre-calculation hooks run, so the machine-validation hooks (which read nested `machine.spindle.*`) stop false-blocking/skipping the SFC's flat payload.
- NEW `mcp-server/src/utils/sfcMachineBridge.ts` (pure `buildSfcMachinePackage`)
- `mcp-server/src/tools/dispatchers/calcDispatcher.ts` (wire, sf_orchestrate/sf_quick only, before `const hookCtx`)
- NEW `mcp-server/src/utils/sfcMachineBridge.test.ts` (7 tests)
Diff: `git -C H:/prism --no-pager diff -- mcp-server/src/tools/dispatchers/calcDispatcher.ts` + read the two new util files.

VERIFY:
1. BLAST RADIUS: `params.machine` is now set for sf_orchestrate/sf_quick. Does ANYTHING downstream read `params.machine` and behave differently (the SpeedFeedOrchestratorEngine.compute, other hooks, the result assembly)? The orchestrator reads FLAT machine_max_rpm (not nested machine.spindle) -- confirm adding a nested `params.machine` object does not collide with or override anything the orchestrator/other code reads. Grep for `.machine` / `params.machine` / `input.machine` usage in the orchestrate path.
2. NO-OVERWRITE: the wire guards `!params.machine` -- confirm a caller that already passes a nested machine is untouched.
3. SCOPING: only sf_orchestrate/sf_quick; confirm no other calc action is affected.
4. TYPE/lazy-import: the lazy `await import("../../utils/sfcMachineBridge.js")` matches the dispatcher's import convention; the `as Record<string, unknown>` casts are consistent with the surrounding loose-param style.
5. TEST INTEGRITY (R9): the 7 tests assert real behavior a
... [+626 chars truncated]

### Assistant | 2026-06-23T03:10:38.367Z

I'll review this SFC dispatcher fix systematically. Let me start by reading the changed files and understanding the blast radius.

### Assistant | 2026-06-23T03:10:39.313Z

[tool_use: Bash]

### Assistant | 2026-06-23T03:10:40.235Z

[tool_use: Read]

### Assistant | 2026-06-23T03:10:40.312Z

[tool_use: Read]

### User | 2026-06-23T03:10:43.436Z

[tool_result] diff --git a/mcp-server/src/tools/dispatchers/calcDispatcher.ts b/mcp-server/src/tools/dispatchers/calcDispatcher.ts
index acdd3d6098..d1b4f471a3 100644
--- a/mcp-server/src/tools/dispatchers/calcDispatcher.ts
+++ b/mcp-server/src/tools/dispatchers/calcDispatcher.ts
@@ -1379,6 +1379,19 @@ export function registerCalcDispatcher(server: any): void {
           );
         }
 
+        // SFC machine
... [+1336 chars truncated]

### User | 2026-06-23T03:10:44.010Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\utils\sfcMachineBridge.ts' was already read 14s ago in this session and is unchanged (mtime 1782183952171). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-23T03:10:44.018Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\utils\sfcMachineBridge.test.ts' was already read 14s ago in this session and is unchanged (mtime 1782184079448). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### Assistant | 2026-06-23T03:10:46.888Z

The read-once guard says these files are already in my context, but I don't actually have them. Let me re-read with the cache disabled.

### Assistant | 2026-06-23T03:10:47.799Z

[tool_use: Bash]

### Assistant | 2026-06-23T03:10:48.726Z

[tool_use: Bash]

### User | 2026-06-23T03:10:52.369Z

[tool_result]      1	/**
     2	 * sfcMachineBridge.ts (U-SFC-MACHINE-HOOK-SHAPE, slot:oscar, 2026-06-22)
     3	 *
     4	 * The machine-validation hooks (src/hooks/MachineValidationHooks.ts) read the NESTED machine shape
     5	 * `machine.spindle.{max_rpm, power_kw}`. But the SFC orchestrate path sends FLAT top-level fields
     6	 * `machine_max_rpm` / `machine_power_kw` (the SpeedFeedOrchestratorEngine / O
... [+2240 chars truncated]

### User | 2026-06-23T03:10:56.693Z

[tool_result]      1	/**
     2	 * sfcMachineBridge.test.ts (U-SFC-MACHINE-HOOK-SHAPE, slot:oscar, 2026-06-22)
     3	 *
     4	 * Proves the flat->nested machine bridge + its contract against the REAL pre-machine-completeness-gate:
     5	 * the bug (flat SFC payload false-blocks), the fix (bridged spec passes), and NO WEAKENING (a genuinely
     6	 * incomplete payload still blocks). Found via the live e2e vi
... [+3109 chars truncated]

### Assistant | 2026-06-23T03:11:00.141Z

Now let me look at the surrounding dispatcher context and the MachineValidationHooks to verify the gate behavior and how `params.machine` flows.

### Assistant | 2026-06-23T03:11:01.544Z

[tool_use: Read]

### Assistant | 2026-06-23T03:11:01.967Z

[tool_use: Read]

### User | 2026-06-23T03:11:02.628Z

[tool_result] 1340	      // Mirror tool_diameter → tool_diameter_mm so the material-aware Vc lookup also yields a
1341	      // diameter-correct rpm. Convention: the dispatcher's tool_diameter is MM (engine is mm-native).
1342	      if (params.tool_diameter !== undefined && params.tool_diameter_mm === undefined) params.tool_diameter_mm = params.tool_diameter;
1343	      if (params.feedPerTooth !== undefined && 
... [+6969 chars truncated]

### User | 2026-06-23T03:11:03.158Z

[tool_result] 1	/**
2	 * MCAT-MS0 U-MCAT08: Machine Validation Safety Hooks
3	 *
4	 * 5 BLOCKING hooks that prevent dangerous cutting operations when
5	 * machine data is incomplete, incompatible, or exceeded:
6	 *
7	 * 1. pre-machine-spindle-limits — blocks if RPM exceeds machine spindle max
8	 * 2. pre-machine-envelope-check — blocks if part exceeds work envelope
9	 * 3. pre-machine-power-budget — blocks if p
... [+21644 chars truncated]

### Assistant | 2026-06-23T03:11:08.730Z

I have the gate logic and the wire. Now let me verify the key blast-radius concerns: how the orchestrator reads machine data, whether `params.machine` collides with anything downstream, and whether the other machine hooks behave differently now that `params.machine.spindle` is populated.

### Assistant | 2026-06-23T03:11:10.713Z

[tool_use: Bash]

### User | 2026-06-23T03:11:15.247Z

[tool_result] 1384:        // path sends FLAT machine_max_rpm/machine_power_kw -- so pre-machine-completeness-gate FALSE-BLOCKS
5237:                max_rpm: params.machine_max_rpm || 12000,
7635:              params.machine,
8485:            result = fce.checkSequence(params.machine, params.operations);
8589:                type: params.machine_type ?? params.machine?.type ?? "vmc",
8590:                spindl
... [+719 chars truncated]

### Assistant | 2026-06-23T03:11:19.850Z

Now let me see what action lines 7635, 8485, 8589-8594, 10040 belong to, to confirm none of them are `sf_orchestrate`/`sf_quick` (which would mean my bridge collides). Let me find the case boundaries around those lines.

### Assistant | 2026-06-23T03:11:20.805Z

[tool_use: Bash]

### Assistant | 2026-06-23T03:11:21.839Z

[tool_use: Bash]

### User | 2026-06-23T03:11:24.763Z

[tool_result] 429:    case "sf_orchestrate": case "sf_quick":
6877:          case "sf_orchestrate": {
6882:          case "sf_quick": {
6887:          case "sf_resolve_machine": {
6892:          case "sf_resolve_tool": {
6897:          case "sf_resolve_material": {
6902:          case "sf_stochastic": {
6907:          case "sf_compare": {
6912:          case "sf_optimize": {
6917:          case "sf_auto_adjust"
... [+3 chars truncated]

### User | 2026-06-23T03:11:28.705Z

[tool_result] 7505:          case "variance_reduction_antithetic": case "variance_reduction_control":
7506:          case "variance_reduction_importance": case "variance_reduction_stratified":
7507:          case "variance_reduction_adaptive_mc": {
7522:          case "cut_to_learn": {
7527:          case "digital_twin_sync": {
7532:          case "strategy_ranking": {
7537:          case "anomaly_relearn": {
7
... [+2463 chars truncated]

### Assistant | 2026-06-23T03:11:33.980Z

The machine-read lines (7635, 8485, 8589, 10040) are in entirely different action cases (`force_capability_analyze`, `machine_aware_constrain`, etc.), not `sf_orchestrate`/`sf_quick`. The bridge wire is gated by `action === "sf_orchestrate" || action === "sf_quick"`, so those reads are unaffected. Let me now look at the actual `sf_orchestrate`/`sf_quick` case bodies to confirm what the orchestrator does with params, and whether it reads `params.machine`.

### Assistant | 2026-06-23T03:11:34.721Z

[tool_use: Read]

### User | 2026-06-23T03:11:35.988Z

[tool_result] 6877	          case "sf_orchestrate": {
6878	            const { speedFeedOrchestratorEngine } = await import("../../engines/SpeedFeedOrchestratorEngine.js");
6879	            result = speedFeedOrchestratorEngine.compute(params as ValidatedParams);
6880	            break;
6881	          }
6882	          case "sf_quick": {
6883	            const { speedFeedOrchestratorEngine } = await import("../..
... [+2333 chars truncated]

### Assistant | 2026-06-23T03:11:43.375Z

The orchestrator's `compute(params)` receives the WHOLE params object including the new `params.machine`. I need to confirm the orchestrator does not read `params.machine` in a way that the new nested object would change behavior (it reads flat `machine_max_rpm` per the task, but I must verify). Let me check the orchestrator engine's `compute` and how it consumes machine fields.

### Assistant | 2026-06-23T03:11:43.904Z

[tool_use: Bash]

### User | 2026-06-23T03:11:48.509Z

[tool_result] 149:  machine_max_rpm?: number;
1164:    if (input.machine_name) {
1165:      const key = input.machine_name.toLowerCase().trim();
1176:            const regMachine = machineRegistry.getByIdOrModel(input.machine_name);
1177:            if (regMachine?.spindle) {
1180:                power_kw: regMachine.spindle.power_continuous ?? 15,
1181:                max_rpm: regMachine.spindle.max_rpm ?? 120
... [+3806 chars truncated]

### Assistant | 2026-06-23T03:11:53.144Z

The orchestrator reads only FLAT `input.machine_*` fields (`machine_max_rpm`, `machine_power_kw`, `machine_name`, `machine_type`, etc.). It never reads `input.machine` (the nested object) anywhere in the grep. Let me confirm there is no bare `input.machine` (without underscore suffix) reference that the new nested object could collide with, and check the `OrchestratorInput` interface for a `machine` field.

### Assistant | 2026-06-23T03:11:55.507Z

[tool_use: Bash]

### Assistant | 2026-06-23T03:11:55.958Z

[tool_use: Bash]

### User | 2026-06-23T03:12:00.382Z

[tool_result] (Bash completed with no output)

### User | 2026-06-23T03:12:04.907Z

[tool_result]   material?: string;                     // free-text name (fuzzy matched)
  iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  hardness_hb?: number;
  hardness_hrc?: number;
  sigma_y_MPa?: number;                 // yield strength override

  // ── Machine (9) ──
  machine_name?: string;                // catalog lookup key
  machine_power_kw?: number;
  machine_max_rpm?: number;
  machine_max_tor
... [+496 chars truncated]

### Assistant | 2026-06-23T03:12:12.768Z

Confirmed: the `OrchestratorInput` interface has NO bare `machine` field (only the 9 flat `machine_*` fields), and there is zero bare `input.machine` reference in the engine. The nested `params.machine` object the bridge adds is simply ignored by the orchestrator's `compute()` (extra property on a loose object). No collision.

Now let me verify the no-overwrite guard, the scoping, and run the tests myself to confirm R9 integrity. Let me also check whether the other 4 machine hooks (spindle-limits, power-budget) now activate with the bridged data and whether that could over-block a legitimate SFC calc (a safety-direction concern, but I should flag if it changes behavior).

### Assistant | 2026-06-23T03:12:14.085Z

[tool_use: Bash]

### User | 2026-06-23T03:12:19.588Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/utils/sfcMachineBridge.test.ts (7 tests) 3ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  22:12:18
   Duration  143ms (transform 37ms, setup 0ms, import 49ms, tests 3ms, environment 0ms)

### Assistant | 2026-06-23T03:12:28.076Z

7/7 pass. Now I need to verify the R9 integrity claim — that the FIX test would actually fail if the bridge regressed. Let me confirm the gate logic: the FIX test calls `preMachineCompletenessGate.handler` with `machine: buildSfcMachinePackage(flat)`. If the bridge returned `undefined` (regression) or the wrong shape, the gate would block. Let me verify by mutating the bridge to return undefined and confirming the test fails — but since I'm read-only, I'll trace the gate logic instead.

The gate reads `pkg = d.machinePackage ?? d.machine ?? {}` then `spindle = pkg.spindle ?? {}`, checks `spindle.max_rpm` and `spindle.power_kw/power_continuous_kw/power`. With the bridged `{ spindle: { max_rpm: 8100, power_kw: 22.4, power_continuous_kw: 22.4 } }`, both critical fields present → no `criticalMissing` → not blocked. If the bridge regressed to `undefined`, `d.machine` would be `undefined`, `pkg = {}`, `spindle = {}`, both critical fields missing → blocked → test `expect(r.blocked).toBe(false)` fails. The test is a real R9 oracle.

Let me now check the other machine hooks for the over-block concern, and verify the SFC schema doesn't reject an unexpected `machine` param (which the bridge sets BEFORE schema validation runs... wait, let me check ordering).

### Assistant | 2026-06-23T03:12:29.046Z

[tool_use: Read]

### User | 2026-06-23T03:12:30.430Z

[tool_result] 1371	
1372	        // SYS-MS6: Validate params against per-action Zod schema
1373	        const validation = validateActionParams(action, params, ACTION_CALC_SCHEMAS);
1374	        if (!validation.valid) {
1375	          return dispatcherError(
1376	            `Invalid params for '${action}': ${validation.errorMessage}`,
1377	            action,
1378	            "prism_calc"
1379	          );
138
... [+1376 chars truncated]

### Assistant | 2026-06-23T03:12:38.506Z

Good — the bridge runs AFTER schema validation (line 1373 before line 1389), so the bridge cannot trip the Zod schema, and a pre-existing nested `machine` param (if a caller passed one) would be validated by the schema first and then preserved by the `!params.machine` guard. The ordering is correct.

Now the important blast-radius check: the bridge now activates the OTHER machine hooks (spindle-limits and power-budget) for SFC calcs that were previously silently skipping. This is the intended fix direction, but I need to verify these hooks don't now over-block a legitimate SFC calc. Let me trace `preMachineSpindleLimits` and `preMachinePowerBudget` with the bridged data and a typical SFC params payload.

For `preMachineSpindleLimits`: it reads `requestedRpm = d.spindleRpm ?? d.rpm ?? d.calculatedRpm ?? d.n`. In the SFC pre-calc phase, the RPM hasn't been computed yet (the orchestrator computes it). So `requestedRpm` is whatever flat `rpm` the caller passed (usually undefined for sf_orchestrate, which computes RPM). If undefined, no block. Let me verify the SFC params don't carry a pre-set `rpm` that could exceed `machine_max_rpm`.

### Assistant | 2026-06-23T03:12:40.862Z

[tool_use: Bash]

### Assistant | 2026-06-23T03:12:41.552Z

[tool_use: Bash]

### User | 2026-06-23T03:12:46.096Z

[tool_result] ---ACTION_CALC_SCHEMAS sf---

### User | 2026-06-23T03:12:46.937Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-23T03:12:51.728Z

No dedicated schema for `sf_orchestrate`/`sf_quick` was found, which means they likely fall through to a permissive/passthrough schema (the bridge runs after validation regardless). Let me check how `validateActionParams` handles an action with no registered schema and whether `rpm` is a typical SFC input. Let me also check the spindle-limits hook's `requestedRpm` against an actual SFC payload to confirm no new over-block.

### Assistant | 2026-06-23T03:12:53.557Z

[tool_use: Bash]

### Assistant | 2026-06-23T03:12:54.508Z

[tool_use: Bash]

### User | 2026-06-23T03:12:58.878Z

[tool_result] 1254:    const maxRpm = input.machine_max_rpm ?? capMaxRpm ?? catalogMatch?.max_rpm ?? profile.max_rpm;
1264:    const rpmSource = input.machine_max_rpm !== undefined ? "user_input"
1267:    const rpmConf = input.machine_max_rpm !== undefined ? userConf
3015:      parameter: "spindle_rpm",
3141:        } else if (lf.parameter === "spindle_rpm") {
3294:              else if (lf.parameter === "spind
... [+543 chars truncated]

### User | 2026-06-23T03:13:00.740Z

[tool_result] mcp-server/src/tools/dispatchers/calcDispatcher.ts:20:/** Zod-validated params — dispatcher validates via ACTION_CALC_SCHEMAS before engine calls.
mcp-server/src/tools/dispatchers/calcDispatcher.ts:1373:        const validation = validateActionParams(action, params, ACTION_CALC_SCHEMAS);
mcp-server/src/__tests__/MinimumZoneFitEngine.test.ts:207:  it("ACTION_CALC_SCHEMAS exposes a usable minimum_zo
... [+1080 chars truncated]

### Assistant | 2026-06-23T03:13:10.060Z

The orchestrator computes RPM internally (`spindle_rpm` is a computed limiting factor, and line 4062 derives rpm from Vc, clamped to `machine_max_rpm`). The pre-calc hooks run BEFORE the engine computes anything, so `requestedRpm` in `preMachineSpindleLimits` reads only a caller-supplied flat `rpm`/`spindleRpm` — which for sf_orchestrate is normally absent (the whole point is to compute it). So the spindle-limits hook will not over-block in the normal SFC path; it will just have `machineMaxRpm` populated now and `requestedRpm` undefined → success. The power-budget hook similarly reads `requiredPower`/`requiredTorque` which are absent pre-compute → no block. The bridge does not introduce a new over-block in the normal path.

There is one residual behavior change worth noting: if a caller passes a flat `rpm` that genuinely exceeds `machine_max_rpm`, the spindle-limits hook will now correctly block (previously it silently skipped due to missing `machineMaxRpm`). That is the intended safety-positive direction, not a regression.

Let me do the final checks: confirm scoping doesn't touch other actions, verify the git status of the three files, and check the lazy-import convention matches.

### Assistant | 2026-06-23T03:13:11.783Z

[tool_use: Bash]

### Assistant | 2026-06-23T03:13:12.763Z

[tool_use: Bash]

### User | 2026-06-23T03:13:15.975Z

[tool_result]  mcp-server/src/tools/dispatchers/calcDispatcher.ts | 13 +++++++++++++
 1 file changed, 13 insertions(+)
---new files status---
?? mcp-server/src/utils/sfcMachineBridge.test.ts
?? mcp-server/src/utils/sfcMachineBridge.ts
---lazy import convention sample---
2

### User | 2026-06-23T03:13:20.631Z

[tool_result] mcp-server/src/utils/sfcMachineBridge.ts:1:/**
mcp-server/src/utils/sfcMachineBridge.ts:2: * sfcMachineBridge.ts (U-SFC-MACHINE-HOOK-SHAPE, slot:oscar, 2026-06-22)
mcp-server/src/utils/sfcMachineBridge.ts:3: *
mcp-server/src/utils/sfcMachineBridge.ts:4: * The machine-validation hooks (src/hooks/MachineValidationHooks.ts) read the NESTED machine shape
mcp-server/src/utils/sfcMachineBridge.ts:5: * `
... [+727 chars truncated]

### Assistant | 2026-06-23T03:13:25.942Z

The non-ASCII grep matched only `--` (em-dash-like? let me verify those are ASCII hyphens). The matches are on comment lines but the actual flagged content needs verification — the pattern `[^\x00-\x7F]` matched whole lines which is odd. Let me confirm whether those are real non-ASCII chars (smart-quotes/em-dashes) which the repo convention forbids in code.

### Assistant | 2026-06-23T03:13:26.960Z

[tool_use: Bash]

### User | 2026-06-23T03:13:32.482Z

[tool_result] grep: -P supports only unibyte and UTF-8 locales
exit=2

### Assistant | 2026-06-23T03:13:37.755Z

The `-P` flag isn't supported in this locale. The earlier `-E '[^\x00-\x7F]'` matched almost every line, which means `\x` ranges aren't being interpreted as bytes by this grep either (it matched literal lines). Let me use a reliable byte-level check.

### Assistant | 2026-06-23T03:13:39.101Z

[tool_use: Bash]

### User | 2026-06-23T03:13:43.937Z

[tool_result] mcp-server/src/utils/sfcMachineBridge.ts: non-ASCII lines=0
mcp-server/src/utils/sfcMachineBridge.test.ts: non-ASCII lines=0

### Assistant | 2026-06-23T03:13:47.899Z

Both new files are clean ASCII (the earlier match was a grep-locale artifact). The `--` in comments are plain ASCII double-hyphens, matching the repo's convention. The diff also uses ASCII `--` in the inline comment.

Let me do a final verification of the two remaining task points: (1) confirm tsc is clean for these files, and (2) check whether the lazy-import path resolves (`sfcMachineBridge.js` extension on a `.ts` source — ESM convention).

### Assistant | 2026-06-23T03:13:49.125Z

[tool_use: Bash]

### User | 2026-06-23T03:14:14.210Z

[tool_result] exit-check-done

### Assistant | 2026-06-23T03:14:38.675Z

No tsc errors for either changed file (the `.js` extension on the `await import("../../utils/sfcMachineBridge.js")` is the correct ESM/NodeNext convention matching the 2 other `await import("../../utils/...")` calls in the dispatcher). 

I have everything needed. Let me compile the final verdict.

## Review Complete

**VERDICT: PASS**

summary: The SFC machine-data shape bridge is correctly scoped, non-destructive, and verified against the real gate. The new nested `params.machine` object is read by the machine-validation hooks (its target) but is invisible to `SpeedFeedOrchestratorEngine.compute()`, which consumes only the flat `machine_*` fields — so there is no downstream collision or override. The 7 tests are genuine R9 oracles against the real `preMachineCompletenessGate`, not presence stubs. No P0/P1/P2 found.

findings: none

What I verified (so the PASS is auditable):

1. **BLAST RADIUS (clean).** Grepped every `.machine` / `params.machine` / `input.machine` use in `calcDispatcher.ts` (lines 5237, 7635, 8485, 8589-8594, 10040) — all belong to *other* action cases (`force_capability_analyze`, `machine_aware_constrain`, etc.), never `sf_orchestrate`/`sf_quick`, so the action-gated bridge cannot touch them. In `SpeedFeedOrchestratorEngine.ts` the orchestrator reads **only flat** `input.machine_max_rpm` / `machine_power_kw` / `machine_name` / `machine_type` (lines 1164-1333, 3208, 3382-3383, 4062); the `OrchestratorInput` interface (lines ~146-156) has **no bare `machine` field** and there is **zero** bare `input.machine` reference. The nested object the bridge adds is an ignored extra property on the loose param object — `mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts:146` + `:6879`.

2. **Sibling-hook activation is safety-positive, not an over-block.** With the bridge populated, `preMachineSpindleLimits` and `preMachinePowerBudget` now actually run instead of silently skipping. In the normal SFC pre-calc path `requestedRpm`/`requiredPower`/`requiredTorq
... [+2417 chars truncated]
