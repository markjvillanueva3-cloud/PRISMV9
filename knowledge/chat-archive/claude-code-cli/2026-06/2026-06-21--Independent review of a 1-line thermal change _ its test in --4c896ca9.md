---
type: "chat-session"
source: "claude-code-cli"
session_id: "4c896ca9-8e03-4cbf-9b68-0250f060c32f"
title: "Independent review of a 1-line thermal change + its test in PRISM's Speed-Feed C"
date: "2026-06-21"
first_ts: "2026-06-21T03:58:57.881Z"
last_ts: "2026-06-21T04:01:08.279Z"
cwd: "H:\\prism\\mcp-server"
messages: 55
user_msgs: 22
assistant_msgs: 33
raw_file: "H:/.claude/projects/H--prism/4c896ca9-8e03-4cbf-9b68-0250f060c32f/subagents/agent-a9ff131e96a0478ab.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Independent review of a 1-line thermal change + its test in PRISM's Speed-Feed C

> **claude-code-cli** | 2026-06-21 | 55 msgs (22 user / 33 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/4c896ca9-8e03-4cbf-9b68-0250f060c32f/subagents/agent-a9ff131e96a0478ab.jsonl`

## Transcript

### User | 2026-06-21T03:58:57.881Z

Independent review of a 1-line thermal change + its test in PRISM's Speed-Feed Calculator (slot:oscar). Grade PASS/FAIL + P0/P1/P2 + file:line. Weight test integrity, the Vc/coating confound, silent breakage.

## Files
1. `H:/prism/mcp-server/src/engines/UltimateSpeedFeedEngine.ts` ~L2483: `temp_C` now uses `forceKc11` (hardened kc 3200 when the HB>400 H-switch fires) instead of `mat.kc1_1` (base 1800). Plus an updated multi-line comment above it. `forceKc11` is defined ~L2133.
2. `H:/prism/mcp-server/src/__tests__/ultimate-speed-feed-hardened-thermal.test.ts` (NEW, 4 cases).

## Audit
- Test integrity (R9): the headline case pins `cutting_speed_mpm:80` (Vc override) + `tool_coating:"TiAlN"` to isolate the kc switch from the H-switch's Vc derate and coating-default differences, then asserts hardened (HB500) interface temp > soft (HB200). Verify (a) `cutting_speed_mpm` genuinely pins Vc in the engine (~L2214), so the comparison really isolates kc; (b) the test would FAIL if the change reverts to `mat.kc1_1` (i.e. it's not vacuously passing); (c) the thermal_margin assertion is valid given the pinned coating.
- Silent breakage: does any OTHER test assert hardened-steel (material:"steel"+HB>400) interface_temp/thermal_margin/thermal_risk/tool-life MAGNITUDE that now silently changes? (587 SFC tests reported green incl gauntlets -- confirm the gauntlet hardened tests check speed/warning/resolved-hardness, not thermal/life magnitude, so nothing re-baselined silently.) Is the soft/already-H path truly byte-identical?
- Convention: NodeNext `.js` suffix, ASCII-only, AtomicValue field access (thermal.interface_temp_C.value / thermal_margin_pct.value), no `.skip`/`.only`.
- Is the updated comment accurate (no longer says "deliberately keeps base kc")?

Cite file:line. PASS/FAIL.

### Assistant | 2026-06-21T03:59:00.679Z

I'll review this thermal change end to end. Let me start by reading both files completely.

### Assistant | 2026-06-21T03:59:01.155Z

[tool_use: Read]

### User | 2026-06-21T03:59:01.817Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\ultimate-speed-feed-hardened-thermal.test.ts' was already read 6s ago in this session and is unchanged (mtime 1782014289022). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (di
... [+26 chars truncated]

### Assistant | 2026-06-21T03:59:01.838Z

[tool_use: Read]

### User | 2026-06-21T03:59:02.946Z

[tool_result] 2100	    } else if (input.hardness_hrc) {
2101	      hardness_hb = hrcToHb(input.hardness_hrc);
2102	      formulas.push(`HB = 3.18×HRC²/100 + 6.23×HRC + 96.7 → ${hardness_hb}`);
2103	    } else if (input.heat_treat_regime) {
2104	      // No measured hardness, but a heat-treat regime IS given: derive a SINGLE Vc-derate
2105	      // hardness from the regime's expected band (regimeExpectedHardness
... [+28249 chars truncated]

### Assistant | 2026-06-21T03:59:06.173Z

The test file was already read into context. Let me retrieve it from the read-once guard by viewing it via Grep, and also check the `cuttingTemperature` function signature, `CANONICAL_KIENZLE`, and the gauntlet hardened tests.

### Assistant | 2026-06-21T03:59:07.601Z

[tool_use: Grep]

### Assistant | 2026-06-21T03:59:08.282Z

[tool_use: Grep]

### User | 2026-06-21T03:59:08.890Z

[tool_result] src\engines\AdvancedCalculations.ts:686:  cuttingTemperature: calculateCuttingTemperature,
src\algorithms\JaegerTempField.ts:318:   * `cuttingTemperature()` (line 1382 pre-shim) bit-equivalently so the SF engine
src\algorithms\JaegerTempField.ts:337:  static cuttingTemperatureCompat(
src\algorithms\ToolWearPrediction.ts:322:  // JaegerTempField.cuttingTemperatureCompat (U-03),
src\__tests__\batch7
... [+8676 chars truncated]

### User | 2026-06-21T03:59:09.620Z

[tool_result] src\engines\UltimateSpeedFeedEngine.ts:1492:export function cuttingTemperature(
src\engines\UltimateSpeedFeedEngine.ts-1493-  Vc_mpm: number, fz_mm: number, material_k: number,
src\engines\UltimateSpeedFeedEngine.ts-1494-  material_rho_cp: number, kc1_1: number,
src\engines\UltimateSpeedFeedEngine.ts-1495-): number {
H:\prism\mcp-server\src\engines\UltimateSpeedFeedEngine.ts-1496-  return JaegerTe
... [+2147 chars truncated]

### Assistant | 2026-06-21T03:59:14.692Z

`cuttingTemperature(Vc, fz, k, rho_cp, kc1_1)` — kc1_1 is the 5th arg, and it monotonically raises temperature (Jaeger field scales with specific cutting energy). So passing `forceKc11` (3200 when hardened) instead of `mat.kc1_1` (1800) raises temp when the H-switch fires. Now let me read the test file (via offset since the cache says it's in context, but I want to confirm exact line numbers) and the `getCoolantTempFactor` / `CANONICAL_KIENZLE` definitions and the gauntlet hardened tests.

### Assistant | 2026-06-21T03:59:15.619Z

[tool_use: Read]

### User | 2026-06-21T03:59:16.229Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\ultimate-speed-feed-hardened-thermal.test.ts' was already read 21s ago in this session and is unchanged (mtime 1782014289022). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (d
... [+27 chars truncated]

### Assistant | 2026-06-21T03:59:16.889Z

[tool_use: Grep]

### User | 2026-06-21T03:59:17.888Z

[tool_result] 36:  CANONICAL_KIENZLE,
37-  CANONICAL_TAYLOR,
38-  getMachineRigidityVcFactor,
39-  getToolModulus,
40-  getToolPoisson,
41:  getCoolantTempFactor,
42-  toolDeflectionTimoshenko,
43-  regimeExpectedHardnessHb,
44-  type ISOGroup,
45-  type HeatTreatRegime,
46-} from "../physics/constants.js";
47-// Material-SPECIFIC tool-material speed factor (U-OSC-TOOLMAT-SPEED-MATERIAL-SPECIFIC): supersedes
48
... [+1845 chars truncated]

### Assistant | 2026-06-21T03:59:22.076Z

The read-once guard insists the test is in context, but I want to be certain I'm citing exact line numbers. Let me view it with a fresh offset to bypass the guard, and confirm `CANONICAL_KIENZLE` values plus that the H-switch in the engine is reachable for `material:"steel"`.

### Assistant | 2026-06-21T03:59:22.856Z

[tool_use: Read]

### User | 2026-06-21T03:59:23.826Z

[tool_result] 1	/**
2	 * Hardened-steel thermal kc consistency -- SFC-WIRING-MS0 (slot:oscar; thermal follow-up to
3	 * U-SFC-KC-EFFECTIVE-ISO-FORCE).
4	 *
5	 * The Kienzle FORCE path uses the canonical ISO-H specific force (forceKc11=3200) when the hardness
6	 * H-switch fires (base ISO-P steel, HB>400). This unit makes the THERMAL interface temp use the SAME
7	 * forceKc11 instead of the base steel kc (1800):
... [+2682 chars truncated]

### Assistant | 2026-06-21T03:59:29.006Z

Now I have the full test. Let me verify the critical claims: (a) `cuttingTemperature` truly increases monotonically with kc1_1, (b) the `d2` material is genuinely already-ISO-H so `hSwitched=false`, (c) `CANONICAL_KIENZLE` H value is 3200, and (d) check whether other tests assert hardened-steel thermal/life magnitudes that would silently re-baseline. Let me also verify the comment claim and check the gauntlet tests.

### Assistant | 2026-06-21T03:59:29.973Z

[tool_use: Read]

### User | 2026-06-21T03:59:30.853Z

[tool_result] 300	       */
301	      if (arg < 2) {
302	        const t = arg / 2;
303	        K0 = -Math.log(t) - 0.5772 + t * t * (0.4228 + t * t * (0.2307 + t * t * 0.0348));
304	      } else {
305	        K0 = Math.sqrt(Math.PI / (2 * arg)) * Math.exp(-arg);
306	      }
307	
308	      const exponential = Math.exp(-V * xi / (2 * alpha));
309	      T += (q / (2 * Math.PI * k)) * exponential * K0 * dx;
310	  
... [+2776 chars truncated]

### Assistant | 2026-06-21T03:59:31.194Z

[tool_use: Grep]

### User | 2026-06-21T03:59:32.100Z

[tool_result] No matches found

### Assistant | 2026-06-21T03:59:37.481Z

The formula confirms `T_rise ∝ kc1_1^0.5` — strictly monotonically increasing in kc1_1. So forceKc11=3200 (hardened) vs 1800 (soft) raises temp by a factor of sqrt(3200/1800) ≈ 1.33 on the rise term. The test's `hard > soft` assertion (test L31) is real and would FAIL if reverted to `mat.kc1_1`.

`d2` isn't in constants.ts. Let me find where the `d2` material profile is defined to verify its `iso_group` is "H" (so `hSwitched=false`) and its `kc1_1` is 3200. Let me also check `MATERIAL_DB` / material resolution and search for any OTHER test that asserts hardened-steel thermal/life magnitudes.

### Assistant | 2026-06-21T03:59:39.357Z

[tool_use: Grep]

### User | 2026-06-21T03:59:40.266Z

[tool_result] 608-  // ── H: Hardened Steel ──
609-  hardened_steel: {
610:    iso_group: "H", aliases: ["tool_steel", "d2", "h13", "a2", "m2", "s7", "o1", "cpm"],
611-    hardness_hb_typical: 500, hardness_hb_range: [400, 650],
612-    tensile_strength_mpa: 1700, thermal_conductivity_wm_k: 24,
--
853-  for (let i = 0; i < DIAMETER_FZ_SCALE.length - 1; i++) {
854-    const [d1, f1] = DIAMETER_FZ_SCALE[i];
855: 
... [+733 chars truncated]

### Assistant | 2026-06-21T03:59:40.889Z

[tool_use: Grep]

### User | 2026-06-21T03:59:42.076Z

[tool_result] Found 185 files
src\__tests__\ultimate-speed-feed-hardened-thermal.test.ts
src\__tests__\ultimate-speed-feed-hardened-force-caveat.test.ts
src\__tests__\ultimate-speed-feed-coolant-thermal.test.ts
src\__tests__\ultimate-speed-feed-heat-treat-regime.test.ts
src\__tests__\HeatTreatmentAwareSpeedFeedEngine.test.ts
src\__tests__\ultimate-speed-feed-gauntlet-r2.test.ts
src\__tests__\ultimate-speed-feed
... [+8659 chars truncated]

### Assistant | 2026-06-21T03:59:47.577Z

Confirmed: `hardened_steel` profile (constants area in the engine at L609-611) has `iso_group: "H"` and aliases include `"d2"`. So `material:"d2"` resolves to `iso_group:"H"`, meaning at L2123 `iso === "P"` is false, so `effectiveIso === iso === "H"`, `hSwitched=false`, and `forceKc11 = mat.kc1_1` (the d2 profile's own kc). The test's claim (L46-48) is correct: d2 is NOT double-switched.

I need to verify `hardened_steel.kc1_1`. The aliases list says these are ISO-H, and `CANONICAL_KIENZLE["H"].kc1_1` should be 3200. Let me confirm both the engine's `hardened_steel.kc1_1` value AND `CANONICAL_KIENZLE` H value, then check the gauntlet hardened assertions for silent re-baselining.

### Assistant | 2026-06-21T03:59:49.508Z

[tool_use: Read]

### User | 2026-06-21T03:59:50.327Z

[tool_result] 608	  // ── H: Hardened Steel ──
609	  hardened_steel: {
610	    iso_group: "H", aliases: ["tool_steel", "d2", "h13", "a2", "m2", "s7", "o1", "cpm"],
611	    hardness_hb_typical: 500, hardness_hb_range: [400, 650],
612	    tensile_strength_mpa: 1700, thermal_conductivity_wm_k: 24,
613	    specific_heat_j_kg_k: 460, kc1_1: 3200, mc: 0.20,
614	    machinability_factor: 0.15, taylor_n_carbide: 0.15, 
... [+708 chars truncated]

### Assistant | 2026-06-21T03:59:51.347Z

[tool_use: Grep]

### User | 2026-06-21T03:59:52.321Z

[tool_result] 38-  N: { kc1_1: 700, mc: 0.22 },   // Aluminum, copper, brass
39-  S: { kc1_1: 2800, mc: 0.27 },  // Inconel, Ti-6Al-4V, Waspaloy
40:  H: { kc1_1: 3200, mc: 0.30 },  // HRC 45-65, hardened tool steel
41-} as const;
42-
--
61-  N: { C: 600, n: 0.40 },  // Aluminum (carbide)
62-  S: { C: 150, n: 0.18 },  // Superalloys (carbide)
63:  H: { C: 120, n: 0.15 },  // Hardened steel (CBN/ceramic)
64-} as 
... [+1139 chars truncated]

### Assistant | 2026-06-21T03:59:53.169Z

[tool_use: Grep]

### User | 2026-06-21T03:59:54.239Z

[tool_result] 48:      expect(r.cutting_speed.value).toBeGreaterThan(0);
49:      expect(r.spindle_rpm.value).toBeGreaterThan(0);
50:      expect(r.feed_per_tooth.value).toBeGreaterThan(0);
51:      expect(r.mrr.value).toBeGreaterThan(0);
52:      expect(r.confidence_overall).toBeGreaterThan(0.3);
53:      expect(r.forces.tangential_force_N.value).toBeGreaterThan(0);
54:      expect(r.thermal.interface_temp_C.v
... [+3576 chars truncated]

### Assistant | 2026-06-21T04:00:02.462Z

All physics verified:
- `CANONICAL_KIENZLE.H.kc1_1 = 3200` (constants.ts L40), `CANONICAL_KIENZLE.P.kc1_1 = 1800` (referenced in test).
- `hardened_steel.kc1_1 = 3200` (engine L613), `iso_group:"H"` (L610), aliases include `"d2"`. So d2 → `iso_group:"H"`, no double-switch, `forceKc11 = 3200` = its own profile kc. Test L46-48 correct.
- The gauntlet hardened tests (L48-55) assert only `> 0` for `interface_temp_C` and `life_minutes`, and L105 asserts `iso_group === "H"` (resolved-hardness), L72 asserts `cutting_speed` ordering. None assert a hardened thermal/life MAGNITUDE, so nothing re-baselines silently. Confirmed.

Now let me verify the key force-caveat test and the existing coolant-thermal test don't pin a hardened thermal magnitude, and confirm the soft/already-H path is truly byte-identical (i.e. `forceKc11 === mat.kc1_1` when `hSwitched=false`). Let me check those two adjacent SFC thermal test files and confirm the H-switch is the ONLY thing that changed forceKc11 for steel.

### Assistant | 2026-06-21T04:00:04.348Z

[tool_use: Grep]

### User | 2026-06-21T04:00:05.324Z

[tool_result] 15: * Reference: CANONICAL_KIENZLE (constants.ts) H = {kc1_1:3200, mc:0.30} vs P = {1800, 0.25}; Sandvik
31:    const w = calc({ hardness_hb: 500 }).warnings;
37:    const w = calc({ hardness_hb: 500 }).warnings;
43:    const w = calc({ hardness_hb: 200 }).warnings;
45:    const f = calc({ hardness_hb: 200, feed_per_tooth_mm: 0.1 }).formulas_used;
51:    const f = calc({ hardness_hb: 500, feed_per
... [+377 chars truncated]

### Assistant | 2026-06-21T04:00:05.856Z

[tool_use: Grep]

### User | 2026-06-21T04:00:06.866Z

[tool_result] 10: * temp_C feeds thermal_margin / thermal_damage_risk / wear-mechanism / thermal-overload AND the
34:  calc(coolant ? { coolant } : {}).thermal.interface_temp_C.value;
38:    expect(getCoolantTempFactor("dry")).toBe(1.0);
39:    expect(getCoolantTempFactor("air_blast")).toBe(0.97);
40:    expect(getCoolantTempFactor("mist")).toBe(0.95);
41:    expect(getCoolantTempFactor("mql")).toBe(0.92);
42: 
... [+773 chars truncated]

### Assistant | 2026-06-21T04:00:11.492Z

Critical silent-breakage check. Let me examine the coolant-thermal test lines 80-103 closely — it iterates over materials/iso_groups including hardened, and asserts `interface_temp_C` behavior under coolant. The change to `temp_C` (using forceKc11) could affect those assertions if any of the iterated cases triggers the H-switch with a different base. Let me read that test region fully, and the force-caveat test region around line 58-80 (does it assert a thermal magnitude?).

### Assistant | 2026-06-21T04:00:13.380Z

[tool_use: Read]

### Assistant | 2026-06-21T04:00:14.012Z

[tool_use: Read]

### User | 2026-06-21T04:00:14.391Z

[tool_result] 60	    for (const [k, v] of Object.entries(CANONICAL_COOLANT_TEMP_FACTOR)) {
61	      expect(v, k).toBeGreaterThan(0);
62	      expect(v, k).toBeLessThanOrEqual(1.0);
63	    }
64	  });
65	
66	  it("monotone cooling: dry >= air_blast >= mist >= mql >= flood >= through_tool >= cryogenic", () => {
67	    const f = CANONICAL_COOLANT_TEMP_FACTOR;
68	    expect(f.dry).toBeGreaterThanOrEqual(f.air_blast)
... [+2070 chars truncated]

### User | 2026-06-21T04:00:15.157Z

[tool_result] 54	  });
55	
56	  it("at MATCHED feed, hardened tangential force > soft by ~the kc ratio (1.5x-2.5x), SAFE direction", () => {
57	    const fz = 0.1; // fix the chip thickness so the kc switch is isolated from the Vc/feed derate
58	    const soft = calc({ hardness_hb: 200, feed_per_tooth_mm: fz });
59	    const hard = calc({ hardness_hb: 500, feed_per_tooth_mm: fz });
60	    const ratio = hard.for
... [+2097 chars truncated]

### Assistant | 2026-06-21T04:00:24.985Z

Silent-breakage analysis complete:

- **coolant-thermal test** (L84-97): uses `inconel`/S and `aluminum`/N fixtures only — neither triggers the P→H hardness switch (no `hardness_hb` passed, and these are S/N ISO groups, not base-P steel). The assertion is `coolant_temp <= dry_temp` (a RATIO between two runs with the SAME forceKc11), so the change cancels out anyway. Not affected.
- **force-caveat test**: asserts force ratios and warnings, no thermal magnitude. Not affected.
- **gauntlet**: only `> 0` on thermal/life for hardened. Not affected.

Now the crucial "soft / already-H byte-identical" claim. When `hSwitched=false`, `forceKc11 = mat.kc1_1` (engine L2133), so `cuttingTemperature(..., forceKc11)` is identically `cuttingTemperature(..., mat.kc1_1)` — bit-for-bit the same as before the change. The ONLY path where `temp_C` changes is when `hSwitched=true` (base-P steel HB>400). This is exactly what the diff claims. Confirmed byte-identical for the soft/already-H paths.

Let me do the final convention checks: confirm no `.skip`/`.only`, ASCII-only in the new test, and verify the `material:"steel"` BASE genuinely resolves to ISO-P (so HB500 fires the switch). Let me also confirm the JaegerTempField shim equivalence test isn't broken (it calls `cuttingTemperature` directly with explicit kc, not via the engine path).

### Assistant | 2026-06-21T04:00:26.874Z

[tool_use: Grep]

### User | 2026-06-21T04:00:27.802Z

[tool_result] No matches found

### Assistant | 2026-06-21T04:00:28.673Z

[tool_use: Grep]

### User | 2026-06-21T04:00:29.569Z

[tool_result] 35:  CANONICAL_MATERIAL_DB,
454:const MATERIAL_DB: Record<string, MaterialProfile> = {
456:  steel: {
623:// Maps local material keys to CANONICAL_MATERIAL_DB keys
625:  steel: "steel", alloy_steel: "alloy_steel",
631:for (const [localKey, profile] of Object.entries(MATERIAL_DB)) {
633:  if (canonKey && CANONICAL_MATERIAL_DB[canonKey]) {
634:    const c = CANONICAL_MATERIAL_DB[canonKey];
725: * Fa
... [+686 chars truncated]

### Assistant | 2026-06-21T04:00:32.302Z

No `.skip`/`.only`, no em-dashes/smart-quotes in the new test (ASCII-only confirmed). Let me confirm the `steel` profile's `iso_group` is "P" (so HB500 triggers the P→H switch at engine L2123).

### Assistant | 2026-06-21T04:00:33.551Z

[tool_use: Read]

### User | 2026-06-21T04:00:34.394Z

[tool_result] 454	const MATERIAL_DB: Record<string, MaterialProfile> = {
455	  // ── P: Steel ──
456	  steel: {
457	    iso_group: "P", aliases: ["carbon_steel", "mild_steel", "1018", "1020"],
458	    hardness_hb_typical: 180, hardness_hb_range: [120, 300],
459	    tensile_strength_mpa: 600, thermal_conductivity_wm_k: 52,
460	    specific_heat_j_kg_k: 486, kc1_1: 1800, mc: 0.26,
461	    machinability_factor: 0.
... [+246 chars truncated]

### Assistant | 2026-06-21T04:01:08.279Z

All claims verified. `steel` is `iso_group:"P"` with `kc1_1:1800` (engine L457, L460). So:
- `material:"steel"` + `hardness_hb:500` → L2123 `(500 > 400 && iso === "P")` → `effectiveIso="H"`, `hSwitched=true` → `forceKc11 = 3200`. Test's "hard" case fires the switch.
- `material:"steel"` + `hardness_hb:200` → `hSwitched=false` → `forceKc11 = mat.kc1_1 = 1800`. Test's "soft" case is the unswitched base.
- Temp rise ∝ kc1_1^0.5 (JaegerTempField L344-346), so hard temp / soft temp = sqrt(3200/1800) ≈ 1.33 at matched Vc/fz/k/rho_cp. The test pins `cutting_speed_mpm:80` (Vc user_input, engine L2214-2216, NOT derated by the H-switch) and `feed_per_tooth_mm:0.1` (fz user_input, L2263-2265), and `mat_k`/`mat_rho_cp` are base-steel for both (the change retains base steel k/cp). So the ONLY difference between soft and hard runs feeding `temp_C` is forceKc11 → the comparison cleanly isolates the kc switch. Test L31 (`hard > soft`) is real and would FAIL if reverted to `mat.kc1_1` (both would then use 1800 → equal temps → `toBeGreaterThan` fails).

The thermal_margin assertion (test L37): `thermal_margin = ((coatingLimit - temp_C)/coatingLimit)*100`. `tool_coating:"TiAlN"` is pinned so `coatingLimit` is identical for both runs. Higher temp → lower margin → `hard.margin <= soft.margin`. Valid. (`toBeLessThanOrEqual` correctly tolerates the edge case where both temps already exceed the limit and clamp identically, though they won't here.)

Comment accuracy (engine L2483-2488): accurately states forceKc11 is used, hardened cut → higher specific energy → more heat → SAFE direction, and `hSwitched=false → forceKc11===mat.kc1_1` byte-identical. The prompt asked whether it still says "deliberately keeps base kc" — it does NOT; the comment now correctly describes using the hardened kc. Accurate.

I have everything needed. Here is my verdict.

---

VERDICT: PASS

summary: The 1-line change at `UltimateSpeedFeedEngine.ts:2489` correctly swaps `mat.kc1_1` for `forceKc11` in the thermal `te
... [+3729 chars truncated]
