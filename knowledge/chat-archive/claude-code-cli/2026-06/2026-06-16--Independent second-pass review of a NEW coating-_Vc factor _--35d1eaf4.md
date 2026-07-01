---
type: "chat-session"
source: "claude-code-cli"
session_id: "35d1eaf4-6a6d-473d-bc4b-97c2e1c28152"
title: "Independent second-pass review of a NEW coating->Vc factor (slot:oscar SFC). Wei"
date: "2026-06-16"
first_ts: "2026-06-16T20:12:27.954Z"
last_ts: "2026-06-16T20:17:48.449Z"
cwd: "H:\\prism-slot-oscar\\mcp-server"
messages: 69
user_msgs: 28
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism-slot-oscar/35d1eaf4-6a6d-473d-bc4b-97c2e1c28152/subagents/agent-a5be945dd972ac2f1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:03"
---

# Independent second-pass review of a NEW coating->Vc factor (slot:oscar SFC). Wei

> **claude-code-cli** | 2026-06-16 | 69 msgs (28 user / 41 assistant) | cwd: H:\prism-slot-oscar\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-oscar/35d1eaf4-6a6d-473d-bc4b-97c2e1c28152/subagents/agent-a5be945dd972ac2f1.jsonl`

## Transcript

### User | 2026-06-16T20:12:27.954Z

Independent second-pass review of a NEW coating->Vc factor (slot:oscar SFC). Weight toward what a physics reviewer won't catch: type-correctness, integration coupling, dedup, byte-identical regression, convention conformance, test quality.

FILES:
1. NEW: `H:/prism-slot-oscar/mcp-server/src/algorithms/CoatingVcModifier.ts` -- exports `getMultipliers(input)` + `CoatingVcModifier` namespace. Cloned from `src/algorithms/CoolantVcModifier.ts` (compare structure).
2. NEW TEST: `H:/prism-slot-oscar/mcp-server/src/algorithms/CoatingVcModifier.test.ts` (vitest).
3. ENGINE: `H:/prism-slot-oscar/mcp-server/src/engines/UltimateSpeedFeedEngine.ts` -- new import `getMultipliers as getCoatingVcMultipliers`; a `coatingVcFactor`/`coatingNote` block after `baseParams` (search "U-PF-COATING"); applied to the STEP-4 lookup Vc and to `axisVcMult`. Current diff: `git -C H:/prism-slot-oscar diff src/engines/UltimateSpeedFeedEngine.ts src/algorithms/CoatingVcModifier.ts` (run from H:/prism-slot-oscar/mcp-server).

VERIFY (P0/P1/P2 with file:line, grade PASS or FAIL):
- DEDUP: there is an existing `CoatingSelectionEngine` (recommends WHICH coating, wired to prism_dev:coating_select) and `COATING_TEMP_LIMIT` in the engine (thermal limit). Confirm my CoatingVcModifier (computes a Vc *multiplier* for a GIVEN coating) is NOT a duplicate of either -- it is the speed-axis analogue of CoolantVcModifier. Confirm no other module already computes a coating Vc factor.
- TYPE-CORRECTNESS: `effectiveIso` passed as `iso_group` (same as the coolant call), `input.tool_coating` (string|undefined) -> `user_coating`, `baseParams.coatings[0]` (string) -> `baseline_coating`. Confirm the CoatingVcInput types accept these. Confirm no `any` leaks in the module (test `as any` on adversarial inputs is acceptable).
- BYTE-IDENTICAL REGRESSION (critical): when no `tool_coating` is supplied, `getMultipliers` returns EXACTLY 1.0 and `coatingVcFactor === 1.0`, so `Vc * 1.0` and `axisVcMult * 1.0` are byte-identical to t
... [+1365 chars truncated]

### Assistant | 2026-06-16T20:12:31.437Z

I'll review this coating Vc factor change. Let me start by reading all the relevant files end-to-end and capturing the diff.

### Assistant | 2026-06-16T20:12:32.404Z

[tool_use: Read]

### Assistant | 2026-06-16T20:12:32.853Z

[tool_use: Read]

### Assistant | 2026-06-16T20:12:33.150Z

[tool_use: Read]

### User | 2026-06-16T20:12:41.573Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\src\algorithms\CoatingVcModifier.ts' was already read 15s ago in this session and is unchanged (mtime 1781639041026). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRIS
... [+15 chars truncated]

### User | 2026-06-16T20:12:41.963Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\src\algorithms\CoolantVcModifier.ts' was already read 13s ago in this session and is unchanged (mtime 1781631882835). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRIS
... [+15 chars truncated]

### User | 2026-06-16T20:12:42.049Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\src\algorithms\CoatingVcModifier.test.ts' was already read 13s ago in this session and is unchanged (mtime 1781639095904). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable:
... [+20 chars truncated]

### Assistant | 2026-06-16T20:12:44.692Z

The read-once guard says these were already read in-session, but I don't actually have their content in my context (this is a fresh agent thread). Let me bypass the cache and read them.

### Assistant | 2026-06-16T20:12:46.116Z

[tool_use: Bash]

### Assistant | 2026-06-16T20:12:47.054Z

[tool_use: Bash]

### Assistant | 2026-06-16T20:12:47.518Z

[tool_use: Bash]

### User | 2026-06-16T20:13:06.881Z

[tool_result] /**
 * CoatingVcModifier -- Speed-Feed algorithm #8.6
 *
 * Tool coating changes effective surface speed: a harder / more heat-resistant coating
 * lets the edge run faster before thermal+crater wear dominates. The operator picks a
 * coating; this returns a Vc multiplier RELATIVE TO THE REGIME'S TABULATED BASELINE
 * coating -- NOT relative to uncoated.
 *
 * WHY relative-to-baseline (the double-
... [+7416 chars truncated]

### User | 2026-06-16T20:13:06.894Z

[tool_result] /**
 * CoolantVcModifier — Speed-Feed algorithm #8.5
 *
 * Coolant strategy changes both effective surface speed AND Taylor tool life.
 * Operator picks coolant from a 5-state set (dry / flood / mist / MQL / cryo)
 * and gets Vc + Taylor-C multipliers vs the standard-flood reference.
 *
 * COMPLEMENTARY to ExtendedTaylorModel's `coolant` temperature derating —
 * this returns the headline Vc adjus
... [+4138 chars truncated]

### User | 2026-06-16T20:13:07.047Z

[tool_result] /**
 * CoatingVcModifier tests (U-PF-COATING) -- reference-value + material-gate + fail-safe coverage.
 *
 * Reference values derive from coatings.json speedMult (rel-uncoated):
 *   uncoated 1.0, TiN 1.15, TiCN 1.2, TiAlN 1.3, AlTiN 1.4, AlCrN 1.35, DLC 1.25, diamond 1.5.
 * The factor is ALWAYS speedMult[user]/speedMult[regimeBaseline], clamped <= 1.0 by the material gate
 * when the user coatin
... [+5317 chars truncated]

### Assistant | 2026-06-16T20:13:09.604Z

I have all three algorithm files. Now let me capture the engine diff and read the engine integration points end-to-end.

### Assistant | 2026-06-16T20:13:10.526Z

[tool_use: Bash]

### User | 2026-06-16T20:13:25.136Z

[tool_result] diff --git a/mcp-server/src/engines/UltimateSpeedFeedEngine.ts b/mcp-server/src/engines/UltimateSpeedFeedEngine.ts
index ba0a927681..db687e7937 100644
--- a/mcp-server/src/engines/UltimateSpeedFeedEngine.ts
+++ b/mcp-server/src/engines/UltimateSpeedFeedEngine.ts
@@ -53,6 +53,7 @@ import { ExtendedTaylorModel } from "../algorithms/ExtendedTaylorModel.js";
 // Vc + Taylor-C multipliers, cited, teste
... [+3862 chars truncated]

### Assistant | 2026-06-16T20:13:27.852Z

Now let me read the engine context around both application points to verify scope, the user-pinned branches, and that `coatingVcFactor` reaches the `axisVcMult` line. Let me read the relevant sections.

### Assistant | 2026-06-16T20:13:28.838Z

[tool_use: Read]

### User | 2026-06-16T20:13:30.795Z

[tool_result] 2150	    const stratMod = STRATEGY_MODS[strategy] || STRATEGY_MODS.conventional;
2151	
2152	    // Axis Vc factors (OSCAR-SFC-9AXIS-MS0/U-OSC-ALTS-FACTOR) -- computed ONCE here, applied to
2153	    // BOTH the primary Vc (lookup branch below) AND the alternative parameter sets (STEP 17),
2154	    // so the 9-axis orchestrator's PRISM-optimized mode (which reads alternatives.balanced)
2155	    // r
... [+7626 chars truncated]

### Assistant | 2026-06-16T20:13:34.131Z

Now let me verify the `axisVcMult` line scope and the alternatives block, plus confirm `tool_coating` exists on the input type and `baseParams.coatings` typing. Let me read the axisVcMult region and check the input schema.

### Assistant | 2026-06-16T20:13:35.618Z

[tool_use: Read]

### Assistant | 2026-06-16T20:13:36.425Z

[tool_use: Grep]

### User | 2026-06-16T20:13:42.505Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\src\engines\UltimateSpeedFeedEngine.ts' (same offset/limit) was already read 10s ago in this session and is unchanged (mtime 1781640591690). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state 
... [+38 chars truncated]

### User | 2026-06-16T20:13:45.743Z

[tool_result] 121:  tool_coating?: string;
2194:      user_coating: input.tool_coating,
2198:    const coatingNote = input.tool_coating ? (coatingVc.notes[0] ?? "coating->1.0") : "coating-unspecified->1.0";
2199:    if (input.tool_coating && (coatingVcFactor !== 1.0 || coatingVc.notes.some((n) => /not advised/.test(n)))) {
2478:    const coating = input.tool_coating || baseParams.coatings[0] || "TiAlN";

### Assistant | 2026-06-16T20:13:49.141Z

The read-once guard collided on the offset I want (different agent already read 2790). Let me read a slightly different range to get the axisVcMult line and the alternatives block, and check the `coatings` field typing plus the input interface.

### Assistant | 2026-06-16T20:13:50.560Z

[tool_use: Bash]

### Assistant | 2026-06-16T20:13:51.503Z

[tool_use: Bash]

### Assistant | 2026-06-16T20:13:52.433Z

[tool_use: Bash]

### User | 2026-06-16T20:14:35.473Z

[tool_result] 790:  coatings: string[];
797:  P_milling_roughing:       { vc: [90, 140, 185], fz: [0.08, 0.13, 0.18], ap: [3, 8, 15], ae_pct: [25, 40, 65], coolant: "flood", coatings: ["AlTiN", "TiAlN"] },
798:  P_milling_semi_finishing: { vc: [110, 155, 200], fz: [0.06, 0.10, 0.15], ap: [1, 3, 5], ae_pct: [30, 50, 70], coolant: "flood", coatings: ["AlTiN", "TiAlN"] },
799:  P_milling_finishing:      { vc: [125
... [+6153 chars truncated]

### User | 2026-06-16T20:14:35.566Z

[tool_result]     // ──────────────────────────────────────────────────
    // STEP 17: Build alternative parameter sets
    // ──────────────────────────────────────────────────
    // U-OSC-ALTS-FACTOR: apply the SAME axis factors the primary Vc uses (tool material x
    // coolant x machine rigidity) to the alternative parameter sets, so the 9-axis
    // orchestrator's PRISM-optimized mode (which reads alte
... [+1833 chars truncated]

### User | 2026-06-16T20:14:36.206Z

[tool_result]   fast_bulk?: boolean;

  // Tool
  tool_diameter_mm?: number;
  flutes?: number;
  tool_material?: ToolMaterial;
  tool_coating?: string;
  helix_angle_deg?: number;
  corner_radius_mm?: number;
  flute_length_mm?: number;
  overall_length_mm?: number;
  tool_stickout_mm?: number;

  // Operation
  operation?: Operation;
  cut_type?: CutType;

### Assistant | 2026-06-16T20:14:42.492Z

I now have the full picture of the integration. Key observations:

1. `coatings: string[]` (line 790), so `baseParams.coatings[0]` is `string` (or `string | undefined` under `noUncheckedIndexedAccess`, but the input accepts `string | null | undefined`). Type-safe.
2. `tool_coating?: string` (line 121) maps to `user_coating?: string | null` — type-safe.
3. `coatingVcFactor`, `coatingNote`, `coatingVc` declared at 2192-2201 (after `baseParams` at 2181), in scope at both 2232 (lookup branch) and 2810 (`axisVcMult`).
4. Material gate buckets exist for the N (aluminum) case the test asserts.

Now let me verify the dedup claims: confirm `CoatingSelectionEngine` and `COATING_TEMP_LIMIT` exist and are distinct, and that no other module already computes a coating Vc multiplier. Let me also double-check the `effectiveIso` type matches `IsoGroupLabel` and the H/S material-gate mapping is sound.

### Assistant | 2026-06-16T20:14:44.360Z

[tool_use: Grep]

### Assistant | 2026-06-16T20:14:45.307Z

[tool_use: Grep]

### Assistant | 2026-06-16T20:14:46.393Z

[tool_use: Bash]

### User | 2026-06-16T20:14:59.439Z

[tool_result] Found 24 files
src\engines\UltimateSpeedFeedEngine.ts
src\algorithms\CoatingVcModifier.test.ts
src\algorithms\CoatingVcModifier.ts
src\tools\dispatchers\calcDispatcher.ts
src\engines\SpeedFeedOrchestratorEngine.ts
src\engines\SpeedFeedOrchestratorEng-1.archive.2026-06-08
src\engines\MastercamToolExportEngine.ts
src\engines\HyperMillToolExportEngine.ts
src\algorithms\JointSpeedFeedOptimizer.ts
src\
... [+634 chars truncated]

### User | 2026-06-16T20:14:59.440Z

[tool_result] Found 3 files
src\engines\UltimateSpeedFeedEngine.ts
src\engines\PostPhysicsFoundationEngine.ts
src\engines\CoatingSelectionEngine.ts

### User | 2026-06-16T20:15:08.180Z

[tool_result] 2119:    const effectiveIso = (hardness_hb > 400 && iso === "P") ? "H" as ISOGroup : iso;
2120:    if (effectiveIso !== iso) {
2140:    let z = input.flutes || inferFlutes(operation, Dc, effectiveIso);
2143:    const toolMat = input.tool_material || inferToolMaterial(effectiveIso, operation);
2161:      ? getMaterialSpecificToolSpeedFactor(toolMat, effectiveIso)

### Assistant | 2026-06-16T20:15:13.095Z

Let me verify `effectiveIso` is `ISOGroup` typed (line 2119: `iso === "P") ? "H" as ISOGroup : iso`), and confirm `ISOGroup` is compatible with `IsoGroupLabel` ("P"|"M"|"K"|"N"|"S"|"H"). I also need to check the dedup distinction in CoatingSelectionEngine, and verify no `.skip`/`.only` in the test, and check for ASCII-only compliance in new comments. Let me look at the grep results — the 24 files matching "coating multiplier" patterns are broad; the load-bearing question is whether any other module computes a **coating Vc factor** the way this one does.

### Assistant | 2026-06-16T20:15:15.531Z

[tool_use: Bash]

### Assistant | 2026-06-16T20:15:18.883Z

[tool_use: Bash]

### User | 2026-06-16T20:15:23.505Z

[tool_result] 38:  type ISOGroup,
---CoatingSelectionEngine signature---
2: * CoatingSelectionEngine (E1082) — ISO-group-based cutting tool coating selection
5: * intelligent coating selection driven by ISO material group, operation type,
52:/** Input for coating selection */
67:/** Output from coating selection */
203: * ISO-group-specific coating selection rules.
495: * When coolant = dry, override the primar
... [+563 chars truncated]

### User | 2026-06-16T20:15:25.348Z

[tool_result] === .skip/.only in test ===
NONE
=== non-ASCII in CoatingVcModifier.ts ===
grep: -P supports only unibyte and UTF-8 locales
NONE (ascii-clean)
=== non-ASCII in diff-added engine lines (2187-2201, 2230-2235) ===
grep: -P supports only unibyte and UTF-8 locales
NONE in new comment block (formula string may have unicode - check)

### Assistant | 2026-06-16T20:15:30.164Z

The `-P` flag is unsupported in this locale. Let me verify ISOGroup definition and check the imports of the engine file, plus confirm the `effectiveIso` widening (the `iso` variable from `iso === "P"`). And let me confirm ASCII-cleanliness with a different approach. The key correctness concern: `effectiveIso` is typed `ISOGroup`, but does `ISOGroup` include exactly P/M/K/N/S/H (matching `IsoGroupLabel`)?

### Assistant | 2026-06-16T20:15:32.526Z

[tool_use: Bash]

### User | 2026-06-16T20:15:34.251Z

[tool_result] PRISM MCP DISCONNECTED -- ENFORCED CHECK (your prism MCP tools are dead this session)
   THIS chat's bridge is stale-heartbeat (pid 117908 gone) | fleet-wide: 0 mcp-http-bridge processes running (enum-cache 41s old).
   The daemon (:3100) may be UP, but THIS session has no live MCP bridge -- every mcp__prism__* call will fail.
   This block fires ONCE per disconnect episode (~3min), then degraded-
... [+521 chars truncated]

### Assistant | 2026-06-16T20:15:35.140Z

[tool_use: Bash]

### User | 2026-06-16T20:15:45.693Z

[tool_result] grep: -P supports only unibyte and UTF-8 locales
ASCII-CLEAN-MODULE
=== engine new comment lines 2187-2201 ===
grep: -P supports only unibyte and UTF-8 locales
ASCII-CLEAN-COMMENT

### Assistant | 2026-06-16T20:15:48.414Z

The MCP block is a separate concern (not relevant to this review). The first command got swallowed. Let me retry resolving the ISOGroup type and do the ASCII check with a portable method.

### Assistant | 2026-06-16T20:15:49.865Z

[tool_use: Bash]

### Assistant | 2026-06-16T20:15:50.831Z

[tool_use: Grep]

### Assistant | 2026-06-16T20:15:52.987Z

[tool_use: Bash]

### User | 2026-06-16T20:15:57.542Z

[tool_result] src\physics\constants.ts:18:export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";
src\engines\AutoSpeedFeedEngine.ts:44:export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";
src\engines\BatchCAMMaterialBridgeEngines.ts:22:export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";
src\engines\CADPhysicsConsistencyGateEngine.ts:38:type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";
src\engines
... [+3331 chars truncated]

### User | 2026-06-16T20:16:01.990Z

[tool_result]   CANONICAL_TAYLOR,
  getMachineRigidityVcFactor,
  type ISOGroup,
} from "../physics/constants.js";
// Material-SPECIFIC tool-material speed factor (U-OSC-TOOLMAT-SPEED-MATERIAL-SPECIFIC): supersedes

### User | 2026-06-16T20:16:10.033Z

[tool_result] src/algorithms/CoatingVcModifier.ts NON-ASCII: CLEAN
src/algorithms/CoatingVcModifier.test.ts NON-ASCII: CLEAN

### Assistant | 2026-06-16T20:16:14.753Z

Confirmed: `ISOGroup` (imported from `physics/constants.ts:18`) = `"P" | "M" | "K" | "N" | "S" | "H"` — exactly matching `IsoGroupLabel`. So `iso_group: effectiveIso` is type-exact. Both new algorithm files are ASCII-clean, no `.skip`/`.only`.

Now let me verify the dedup distinction is real by reading the CoatingSelectionEngine output type and its dispatcher wiring, and confirm there is no OTHER coating-Vc-factor computation. Let me also check that the warnings-push only fires on a real advisory (the `notes[0]` content when factor !== 1.0).

### Assistant | 2026-06-16T20:16:16.693Z

[tool_use: Bash]

### Assistant | 2026-06-16T20:16:17.393Z

[tool_use: Bash]

### User | 2026-06-16T20:16:22.881Z

[tool_result] /** Input for coating selection */
export interface CoatingSelectionInput {
  iso_group: ISOGroup;
  operation: CoatingOperationType;
  speed_range: SpeedRange;
  coolant: CoolantType;
  substrate: ToolSubstrate;
}

/** Why an alternative coating was not chosen */
export interface CoatingAlternative {
  coating: CoatingName;
  why_not: string;
}

/** Output from coating selection */
export interfa
... [+874 chars truncated]

### User | 2026-06-16T20:16:31.202Z

[tool_result] 978:const COATING_TEMP_LIMIT: Record<string, number> = {
2479:    const coatingLimit = COATING_TEMP_LIMIT[coating] || 800;

### Assistant | 2026-06-16T20:16:38.040Z

Dedup confirmed clearly:

- **`CoatingSelectionEngine`** (`CoatingSelectionEngine.ts:595`) outputs `{ coating, reasoning, alternatives, temperature_limit_C, hardness_HV, friction_coefficient }` — it RECOMMENDS *which* coating to use. It does NOT compute a Vc multiplier. Distinct purpose.
- **`COATING_TEMP_LIMIT`** (`UltimateSpeedFeedEngine.ts:978`) is a thermal-limit lookup (`coatingLimit` at 2479) — a temperature ceiling, not a speed factor. Distinct.
- **`CoatingVcModifier`** computes a Vc *multiplier* for a GIVEN coating — the speed-axis analogue of `CoolantVcModifier`. No overlap.

Let me confirm there is genuinely no other coating-Vc-factor computation by inspecting the line 2478-2480 context (the existing `coating` usage) and verifying the warnings-push logic doesn't double-warn. Let me also verify the `notes[0]` fallback edge: when `factor === 1.0` due to baseline-identity, `notes` is empty, so `coatingVc.notes[0]` is `undefined` — does the warnings-push guard handle that?

### Assistant | 2026-06-16T20:16:38.781Z

[tool_use: Bash]

### User | 2026-06-16T20:16:45.393Z

[tool_result]       formulas.push(`Thermal: grade-specific ${gradeKey} k=${gradeThermal.k} W/m·K, cp=${gradeThermal.cp} J/kg·K`);
    }
    const temp_C = cuttingTemperature(Vc, fz, mat_k, mat_rho_cp, mat.kc1_1);

    const coating = input.tool_coating || baseParams.coatings[0] || "TiAlN";
    const coatingLimit = COATING_TEMP_LIMIT[coating] || 800;
    const thermalMargin = ((coatingLimit - temp_C) / coatingLi
... [+302 chars truncated]

### Assistant | 2026-06-16T20:16:57.992Z

That's the thermal-margin path — independent of and complementary to the new Vc factor (it reads the same `tool_coating` input but for temperature, not speed). No conflict.

Now let me carefully analyze the warnings-push guard logic for the edge cases. The guard at line 2199:

```js
if (input.tool_coating && (coatingVcFactor !== 1.0 || coatingVc.notes.some((n) => /not advised/.test(n)))) {
  warnings.push(coatingVc.notes[0]);
}
```

Let me trace every path where `input.tool_coating` is truthy:

1. **Unresolved coating** (CVD/CBN/etc): `emit(...,1,0.3)` returns `notes:[reason]`, factor `1.0`. Guard: `factor !== 1.0` is false; `notes.some(/not advised/)` is false → no push. **Correct** (no spurious warning on fail-safe).
2. **Material-gate clamp** (AlTiN on N): factor set to `1.0`, but `notes` contains "not advised". Guard: `factor !== 1.0` false, but `notes.some(/not advised/)` true → push `notes[0]` = the "not advised" note. **Correct.**
3. **Baseline identity** (factor 1.0, notes empty): `factor !== 1.0` false, `notes.some` false → no push. `notes[0]` never accessed. **Correct.**
4. **Real boost/derate** (factor ≠ 1.0): push `notes[0]` = the descriptive note. **Correct.**

But there's a subtle issue in case 2: when material-gate clamps, `factor` is `1.0` and the warning is the "not advised" note — but `coatingNote` (line 2198) is set to `coatingVc.notes[0]` which is the same "not advised" note. That's consistent and shows up in the formula string. Good.

Let me verify one potential P2: the `getCoatingVcMultipliers` call passes `user_coating: input.tool_coating` where `tool_coating?: string` (so `string | undefined`) — the input type accepts `string | null | undefined`. Fine. And `baseline_coating: baseParams.coatings[0]` — under `noUncheckedIndexedAccess` this is `string | undefined`. Accepted. Let me confirm whether the engine's calculate path could pass `effectiveIso` as a non-PMKNSH value — it's `ISOGroup`, so no. 

Let me do a final check on test coverage compl
... [+275 chars truncated]

### Assistant | 2026-06-16T20:16:59.904Z

[tool_use: Bash]

### User | 2026-06-16T20:17:11.407Z

[tool_result] 9267:                coating: typeof p.tool_coating === "string" ? p.tool_coating as "uncoated"|"TiN"|"TiAlN"|"AlTiN"|"DLC" : undefined,
=== does calc dispatcher reach UltimateSpeedFeedEngine? ===
1326:      // SFC plumbing fix (2026-05-31, slot echo): UltimateSpeedFeedEngine (+ peers) read
5362:            const { ultimateSpeedFeedEngine } = await import("../../engines/UltimateSpeedFeedEngine.js"
... [+301 chars truncated]

### Assistant | 2026-06-16T20:17:48.449Z

The dispatcher passes `tool_coating` through to `ultimateSpeedFeedEngine.calculate(params)` (line 5362-5363), and `tool_coating` is a recognized param. The integration is wired through the live dispatcher path. The new `CoatingVcModifier` is consumed by the engine which is dispatcher-reachable via `prism_calc` — no orphan.

Let me confirm one last thing: whether the `coatingVcFactor` correctly stays 1.0 in the two user-pinned branches. From the diff and lines 2215-2236:
- `input.cutting_speed_mpm` branch (2215-2217): `Vc = input.cutting_speed_mpm` — coating factor NOT applied. **Correct** (user pin respected).
- `input.spindle_rpm && Dc > 0` branch (2218-2225): `Vc = π·Dc·rpm/1000` — coating factor NOT applied. **Correct.**
- Only the `else` lookup branch (2232) and `axisVcMult` (2810) multiply by `coatingVcFactor`. **Correct.**

I have everything I need. Let me verify the test for the `taylor_C` absence isn't a problem (Coating only affects Vc, no Taylor field — correct, distinct from Coolant which has both) and that the version export test is real.

I have read all four files end-to-end and verified every claim. Here is my verdict.

---

VERDICT: PASS

summary: The new `CoatingVcModifier` is a clean, type-correct speed-axis analogue of `CoolantVcModifier`, not a duplicate of `CoatingSelectionEngine` (recommends-which-coating) or `COATING_TEMP_LIMIT` (thermal ceiling). It is byte-identical on default (no-coating) calls, applied only in the lookup Vc + `axisVcMult` (never the user-pinned branches), material-gated, fail-safe to 1.0, ASCII-clean, and backed by real reference-value tests with no `.skip`/`.only`. I found no P0/P1 issues — only minor P2 observations.

findings:
- [P2] `CoatingVcModifier.ts:48` (SPEED_MULT) / engine `UltimateSpeedFeedEngine.ts:2195` -- The module doc and CLAUDE.md SAFETY rail say `speedMult`/`goodCoatings` are "SOURCED FROM data/prism-reference-db/coatings.json ... single source, cited not re-derived," but the values are hard-coded as lit
... [+4523 chars truncated]
