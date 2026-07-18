---
type: "chat-session"
source: "claude-code-cli"
session_id: "ec0368b3-d2e4-4416-b9bd-e0bd521ec632"
title: "Independent rigorous review of a PRISM SFC page-engine fix. Do NOT assume the ph"
date: "2026-06-23"
first_ts: "2026-06-23T16:48:10.702Z"
last_ts: "2026-06-23T16:53:00.963Z"
cwd: "H:\\prism\\mcp-server"
messages: 62
user_msgs: 22
assistant_msgs: 40
raw_file: "H:/.claude/projects/H--prism/ec0368b3-d2e4-4416-b9bd-e0bd521ec632/subagents/agent-a64351c239886522a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Independent rigorous review of a PRISM SFC page-engine fix. Do NOT assume the ph

> **claude-code-cli** | 2026-06-23 | 62 msgs (22 user / 40 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/ec0368b3-d2e4-4416-b9bd-e0bd521ec632/subagents/agent-a64351c239886522a.jsonl`

## Transcript

### User | 2026-06-23T16:48:10.702Z

Independent rigorous review of a PRISM SFC page-engine fix. Do NOT assume the physics reviewer caught everything -- weight your review toward test integrity, edge cases, silent breakage, convention conformance, and the things a physics reviewer would miss. Grade PASS/FAIL with P0/P1 findings + file:line. Read the ACTUAL files.

FILES CHANGED:
- `H:/prism/mcp-server/src/engines/ManufacturingCalculations.ts` (calculateSpeedFeed ~line 788: new optional `iso_group` -> canonical-table path; legacy fallback preserved).
- `H:/prism/mcp-server/src/engines/ProductEngine.ts` (new `groupToISO`, `MATERIAL_CATEGORY_ALIASES`, `iso_group` threaded into 7 calculateSpeedFeed calls, rpm clamp+rescale in sfcCalculate).
- `H:/prism/mcp-server/src/__tests__/sfc-jm-fleet-page-closed-loop.test.ts` (added 6 tests in a "material-aware speed/feed" describe block).
- `H:/prism/scripts/sfc-engine-parity-probe.mjs` (diagnostic probe, not shipped).

REVIEW FOCUS (find P0/P1):
1. TEST INTEGRITY (R9): open the new tests. Do they actually FAIL if the fix regresses (e.g. if iso_group were dropped or the inversion returned)? Are the assertions real numeric comparisons (not toBeTruthy/toBeDefined stubs)? Is the band-membership meaningful? Would the "category resolves same as grade" test catch a broken alias?
2. EDGE CASES: negative/zero material_hardness (hardnessAdj pow of negative?), missing machine_max_rpm (clamp skipped -> still ok?), tool_diameter very small/large (sqrt clamp bounds), an iso_group value not in CANONICAL_MILLING_SPEEDS (can groupToISO ever return something not in the table? it returns ISOGroup P/M/K/N/S/H -- are all 6 keys present in both canonical tables?).
3. SILENT BREAKAGE: does the rpm clamp run BEFORE the downstream force/safety calcs so they see the clamped vc? Does the now-dead old rpm-warning block still make sense (it was replaced with an rpmClamped flag -- verify the flag logic)? Did threading iso_group into the 6 sibling calls (sfcCompare/Optimize/Safety/cycle-time/ACN
... [+537 chars truncated]

### Assistant | 2026-06-23T16:48:14.366Z

I'll review this SFC page-engine fix rigorously. Let me start by reading the changed files end to end.

### Assistant | 2026-06-23T16:48:14.958Z

[tool_use: Bash]

### Assistant | 2026-06-23T16:48:15.288Z

[tool_use: Read]

### User | 2026-06-23T16:48:20.136Z

[tool_result] <persisted-output>
Output too large (247.5KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\ec0368b3-d2e4-4416-b9bd-e0bd521ec632\tool-results\bssy400y8.txt

Preview (first 2KB):
warning: in the working copy of 'knowledge/wiki/architecture/skills/project/checkin.md', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of 'knowledge/wiki/architectu
... [+1757 chars truncated]

### User | 2026-06-23T16:48:21.417Z

[tool_result] 1	/**
2	 * SFC web-page PATH closed-loop calc-correctness test (JM Die fleet FIRST).
3	 *
4	 * Operator directive (2026-06-22): "run full closed-loop testing of the entire
5	 * SFC app page suite to check that calculations are correct, JM Die fleet
6	 * machines FIRST."
7	 *
8	 * This drives the EXACT engine the web page displays. Verified runtime chain:
9	 *   web page (sfcApi.calculate) -> POST 
... [+15599 chars truncated]

### Assistant | 2026-06-23T16:48:25.438Z

I've read the test file. Now let me read the two engine files end to end, focusing on the changed regions. Let me get the actual diffs first for the two engine files.

### Assistant | 2026-06-23T16:48:26.443Z

[tool_use: Bash]

### User | 2026-06-23T16:48:30.413Z

[tool_result] warning: in the working copy of 'mcp-server/src/engines/ProductEngine.ts', CRLF will be replaced by LF the next time Git touches it
diff --git a/mcp-server/src/engines/ManufacturingCalculations.ts b/mcp-server/src/engines/ManufacturingCalculations.ts
index 891aca0142..b2da336025 100644
--- a/mcp-server/src/engines/ManufacturingCalculations.ts
+++ b/mcp-server/src/engines/ManufacturingCalculations.
... [+13099 chars truncated]

### Assistant | 2026-06-23T16:48:35.328Z

Good, I have the diff. Now let me verify the canonical constants exist with all 6 ISO keys, and examine the surrounding context in both engine files. Let me read the constants and the key context regions.

### Assistant | 2026-06-23T16:48:36.694Z

[tool_use: Bash]

### User | 2026-06-23T16:48:42.571Z

[tool_result] 18:export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";
1216:export const CANONICAL_MILLING_SPEEDS: Record<ISOGroup, { rough: number; finish: number }> = {
1225:export const CANONICAL_MILLING_FEEDS: Record<ISOGroup, { rough: number; finish: number }> = {

### Assistant | 2026-06-23T16:48:46.727Z

[tool_use: Read]

### User | 2026-06-23T16:48:47.573Z

[tool_result] 1205	};
1206	
1207	export const CANONICAL_TURNING_FEEDS: Record<ISOGroup, { rough: number; finish: number }> = {
1208	  P: { rough: 0.30, finish: 0.12 },
1209	  M: { rough: 0.25, finish: 0.10 },
1210	  K: { rough: 0.35, finish: 0.15 },
1211	  N: { rough: 0.30, finish: 0.12 },
1212	  S: { rough: 0.18, finish: 0.08 },
1213	  H: { rough: 0.15, finish: 0.06 },
1214	};
1215	
1216	export const CANONICAL
... [+1256 chars truncated]

### Assistant | 2026-06-23T16:48:51.962Z

All 6 ISO keys (P/M/K/N/S/H) are present in both `CANONICAL_MILLING_SPEEDS` and `CANONICAL_MILLING_FEEDS`. Now let me verify the test bands against the actual canonical values, and check the rest of `sfcCalculate` for the downstream force/safety ordering. Let me read the full `sfcCalculate` function and the surrounding `resolveMaterial`/`MATERIAL_HARDNESS` context.

### Assistant | 2026-06-23T16:48:52.643Z

[tool_use: Read]

### User | 2026-06-23T16:48:53.493Z

[tool_result] 440	    surface_roughness: number;
441	    score: number;
442	  }>;
443	  recommended: string;
444	  comparison_notes: string[];
445	}
446	
447	/** S F C Optimize Result configuration/data structure.
448	 */
449	export interface SFCOptimizeResult {
450	  objective: string;
451	  original: { vc: number; fz: number; ap: number; ae: number };
452	  optimized: { vc: number; fz: number; ap: number; ae:
... [+6022 chars truncated]

### Assistant | 2026-06-23T16:49:07.387Z

Now let me verify the critical band math. Let me compute the actual Vc values the tests assert against, to confirm the band-membership assertions are meaningful (not vacuously passing). For steel (P): baseVc=200 (rough, since milling op maps to roughing default), toolFactor=150/150=1.0, hardnessAdj for HB200 = (200/200)^0.2 = 1.0. So steel Vc = 200. Band is [110,230] — 200 is inside. For stainless (M): grade 316 HB180, baseVc=130, hardnessAdj=(200/180)^0.2=clamp(1.021)=1.021, Vc=132.8. Band [90,160]. For Al (N): 6061 HB95, baseVc=500, hardnessAdj=(200/95)^0.2=clamp(1.16)=1.16, Vc=580. Band [300,900]. Let me verify the `mapOperation` default and read the rest of `sfcCalculate` for downstream ordering.

### Assistant | 2026-06-23T16:49:07.952Z

[tool_use: Read]

### User | 2026-06-23T16:49:09.045Z

[tool_result] 620	  const status = score >= 0.7 ? "safe" : score >= 0.4 ? "warning" : "danger";
621	  return { score: Math.round(score * 100) / 100, status, warnings };
622	}
623	
624	function mapOperation(op: string): "roughing" | "finishing" | "semi-finishing" {
625	  if (op.includes("finish")) return "finishing";
626	  if (op.includes("semi")) return "semi-finishing";
627	  return "roughing"; // milling, dri
... [+6215 chars truncated]

### Assistant | 2026-06-23T16:49:13.859Z

The clamp runs at lines 666-672 (BEFORE the force/Taylor/safety calcs at 674-715), so downstream consumers see the clamped `vc`/`fz`/`rpm` — correct, no silent breakage. Now let me check a critical issue: the `safety.status` derivation. The test asserts severe over-power grades `"danger"`, but `calculateSafetyScore` thresholds are score-based. Let me read the full `calculateSafetyScore` body to verify the over-power path.

### Assistant | 2026-06-23T16:49:19.450Z

[tool_use: Read]

### User | 2026-06-23T16:49:20.311Z

[tool_result] 569	  }
570	
571	  // Feed range check
572	  if (fz > SAFETY_LIMITS.MAX_FEED_PER_TOOTH) {
573	    score -= 0.3;
574	    warnings.push(`Feed per tooth ${fz.toFixed(3)} mm exceeds safe limit`);
575	  }
576	
577	  // Depth of cut check
578	  if (ap > toolDiam * 2) {
579	    score -= 0.2;
580	    warnings.push(`Depth of cut ${ap.toFixed(1)} mm > 2× tool diameter — high deflection risk`);
581	  }
582	 
... [+2226 chars truncated]

### Assistant | 2026-06-23T16:49:25.147Z

The severe over-power path (`> machinePower * 1.5`) deducts 0.8 from a 1.0 base → 0.2 < 0.4 threshold → `"danger"`. But note the severe-over-power test (line 180-202) and the new power-grading logic in `calculateSafetyScore` appear to be part of this same change. Let me verify whether `calculateSafetyScore`'s power block was modified in this diff or is pre-existing, since the test at 180-202 depends on it. Let me check the full diff scope and whether these are pre-existing.

### Assistant | 2026-06-23T16:49:26.422Z

[tool_use: Bash]

### User | 2026-06-23T16:49:30.160Z

[tool_result] warning: in the working copy of 'mcp-server/src/engines/ProductEngine.ts', CRLF will be replaced by LF the next time Git touches it
64: function calculateSafetyScore(

### Assistant | 2026-06-23T16:49:37.750Z

The `calculateSafetyScore` power-grading block (severe over-power → danger) is NOT in this diff — it's pre-existing. So the severe-over-power test at lines 180-202 and the over-power assertion in `assertMachineCompliant` were validating pre-existing behavior. The 6 NEW tests are in the "material-aware speed/feed" describe block (lines 213-290). Good — that focuses my R9 review.

Now let me verify the test bands are non-vacuous and would actually fail on a regression. Let me trace the exact computed values with a quick numerical check, and also check the `tier:"pro"` vs `tier` handling and whether `machine_max_rpm` being absent in `gradeCalc` (ROOMY supplies it) matters. Let me also check the legacy-path byte-identity claim by examining the old vs new fallback carefully.

### Assistant | 2026-06-23T16:49:50.713Z

[tool_use: Bash]

### User | 2026-06-23T16:49:54.094Z

[tool_result] steel(P,HB200): { vc: 200, fz: 0.15, rpm: 5305.164769729845, vcRounded: 200 }
ss(M,HB180):    {
  vc: 132.76843938801755,
  fz: 0.12,
  rpm: 3521.7922358666146,
  vcRounded: 133
}
alu(N,HB95):    {
  vc: 580.2715556765835,
  fz: 0.2,
  rpm: 15392.181070258703,
  vcRounded: 580
}
--- band checks ---
steel vc in [110,230]: true = 200
ss vc in [90,160]:     true = 133
alu vc in [300,900]:   true = 58
... [+219 chars truncated]

### Assistant | 2026-06-23T16:49:58.053Z

All bands pass with real margins, and the ordering/chip-load assertions are non-vacuous. Now the critical R9 question: would these tests actually FAIL if the fix regressed? Let me verify by computing what the LEGACY path (iso_group dropped) would produce — if the legacy values still pass the bands, the tests are not regression-sensitive.

### Assistant | 2026-06-23T16:50:07.543Z

[tool_use: Bash]

### User | 2026-06-23T16:50:11.341Z

[tool_result] LEGACY steel(HB200): { vc: 120, vcR: 120, fz: 0.288 }
LEGACY ss(HB180):    { vc: 123.8535596913828, vcR: 124, fz: 0.288 }
LEGACY alu(HB95):    { vc: 150.02829134317076, vcR: 150, fz: 0.288 }
--- would the NEW tests FAIL on legacy? (we WANT fail=true) ---
inversion test (ss<steel)?  false <- old bug: ss OUT-RUNS steel so this is FALSE => test FAILS. good
alu>steel? true
steel band [110,230]: true =
... [+258 chars truncated]

### Assistant | 2026-06-23T16:50:16.521Z

This confirms the tests are genuinely regression-sensitive (R9 PASS): if `iso_group` were dropped, the inversion test, the alu band test, both chip-load tests, and the steel-fz-bound test would all fail. The tests encode WHY the behavior matters and would break if the logic broke.

Now let me check the remaining concerns: the legacy byte-identity (backward compat), the sibling-call variable correctness (`mat.group` vs `matPhysics.group`), and the ASCII/import conventions. Let me read the legacy path carefully against the original and check the sibling call contexts.

### Assistant | 2026-06-23T16:50:17.778Z

[tool_use: Read]

### User | 2026-06-23T16:50:19.762Z

[tool_result] 795	 */
796	export function calculateSpeedFeed(input: SpeedFeedInput): SpeedFeedResult {
797	  const warnings: string[] = [];
798	  const recommendations: string[] = [];
799	  
800	  const { material_hardness = 200, tool_material, operation, tool_diameter, number_of_teeth, iso_group } = input;
801	
802	  const base_speeds: Record<string, number> = {
803	    "HSS": 30, "Carbide": 150, "Ceramic": 30
... [+3749 chars truncated]

### Assistant | 2026-06-23T16:50:26.863Z

The legacy fallback (lines 842-852) is byte-for-byte identical to the original logic (cutting_speed = toolBaseSpeed, Brinell pow 0.3, operation_factors, fz = D*0.02 with clamp then op-multipliers). The only refactor is `toolBaseSpeed` was extracted as a named const (line 810), which is mathematically identical to the original `let cutting_speed = lowerSpeeds[normalizedTool] || 100`. Backward compat is preserved — existing non-ProductEngine callers that don't pass `iso_group` get identical output. (R12 backward-compat PASS.)

Now let me verify the sibling-call variable correctness. The diff shows `groupToISO(mat.group)` in some calls and `groupToISO(matPhysics.group)` in others. Let me confirm each uses the in-scope variable correctly.

### Assistant | 2026-06-23T16:50:28.151Z

[tool_use: Bash]

### User | 2026-06-23T16:50:31.834Z

[tool_result] 654:    iso_group: groupToISO(mat.group),
825:      iso_group: groupToISO(mat.group),
910:    iso_group: groupToISO(mat.group),
1082:    iso_group: groupToISO(mat.group),
1674:    iso_group: groupToISO(matPhysics.group),
2251:    iso_group: groupToISO(matPhysics.group),
2591:        iso_group: groupToISO(matPhysics.group),

### Assistant | 2026-06-23T16:50:35.426Z

Let me verify each call site's in-scope variable. The 4 `mat.group` sites (654, 825, 910, 1082) are in sfcCalculate/Compare/Optimize/Safety, and the 3 `matPhysics.group` sites (1674, 2251, 2591) are in shopEstimateOpCycleTime/acncParameterCalc/productACNC. Let me confirm the variable names match what's actually declared in each scope.

### Assistant | 2026-06-23T16:50:37.414Z

[tool_use: Bash]

### User | 2026-06-23T16:50:43.528Z

[tool_result] === call at line 654 ===
37:function sfcCalculate(params: SFCInput): { result: SFCResult } | { error: string } {
42:  const mat = resolveMaterial(params.material, params.material_hardness, params.material_group);
=== call at line 825 ===
44:function sfcCompare(params: SFCInput): { result: SFCCompareResult } | { error: string } {
45:  const mat = resolveMaterial(params.material, params.material_har
... [+1073 chars truncated]

### Assistant | 2026-06-23T16:50:55.396Z

Each call site uses the correct in-scope variable: the 4 sfc* functions declare `const mat = resolveMaterial(...)` and call `groupToISO(mat.group)`; the 3 shop/acnc functions declare `const matPhysics = MATERIAL_HARDNESS[...]` and call `groupToISO(matPhysics.group)`. No wrong-scope variable. (R8 PASS.)

One subtle point: in the shop/acnc paths, `matPhysics` comes from `MATERIAL_HARDNESS[material]` — a `.group` field that always exists in that table (e.g. `"steel_medium_carbon"`, `"stainless_austenitic"`). `groupToISO` handles all those. Let me verify `MATERIAL_DB` `.group` values won't appear — they use `matPhysics.group` not `mat.group` so that's fine. Now let me check the remaining items: convention conformance (ASCII, .js imports), and edge cases. Let me scan for non-ASCII in the changed regions and check the import suffix.

### Assistant | 2026-06-23T16:50:58.723Z

[tool_use: Bash]

### User | 2026-06-23T16:51:04.931Z

[tool_result] === non-ASCII in new test file ===
205:  // ── MATERIAL-AWARE FIX (ISO-group Vc + chip load + rpm clamp) ──────────────
=== non-ASCII in changed ProductEngine regions (new code lines) ===
warning: in the working copy of 'mcp-server/src/engines/ProductEngine.ts', CRLF will be replaced by LF the next time Git touches it
none in added lines
=== .js import suffix check ===
mcp-server/src/engines/Manuf
... [+234 chars truncated]

### Assistant | 2026-06-23T16:51:11.486Z

Imports correctly use the `.js` NodeNext suffix. There's a non-ASCII finding: line 205 of the test file uses box-drawing characters (`──`) in a section banner comment. Let me check whether this matters — the repo's prior commit history shows `U-XRAY-GDT-GOLD-VERIFY-ASCII` specifically fixed an "ASCII the new test section banner (3-of-3 P2)". But I also note the existing ProductEngine.ts already uses `─` box-drawing in its own section headers (e.g. line 458 `// ─── Material Hardness Lookup ───`), so this matches surrounding convention. Let me check whether the test file already had box-drawing chars before this change (i.e., is it pre-existing convention or newly introduced).

### Assistant | 2026-06-23T16:51:14.769Z

[tool_use: Bash]

### User | 2026-06-23T16:51:18.670Z

[tool_result] === was line 205 banner ADDED in this diff? ===
10:+  // ── MATERIAL-AWARE FIX (ISO-group Vc + chip load + rpm clamp) ──────────────
=== is the test file tracked/new? ===
 M mcp-server/src/__tests__/sfc-jm-fleet-page-closed-loop.test.ts
=== other box-drawing already in this test file (pre-existing convention)? ===
1

### Assistant | 2026-06-23T16:51:25.210Z

The box-drawing banner at line 205 was newly ADDED in this diff (it's the only such occurrence in the test file — the file otherwise uses ASCII `──` only in this new block). This is exactly the same P2 issue the prior commit `cc8e800d00 [U-XRAY-GDT-GOLD-VERIFY-ASCII]` fixed ("ASCII the new test section banner (3-of-3 P2)"). The repo has a demonstrated convention of ASCII-only test banners. This is a P2 (non-blocking deferrable) — it doesn't affect correctness, and the surrounding engine files DO use box-drawing in section headers, but test files in this repo were explicitly held to ASCII-only by a prior scrutiny gate.

Now let me check the remaining edge cases the focus asked about: negative/zero hardness, missing machine_max_rpm, and verify the `unknown grade` test path actually exercises the fallback. Let me trace what happens with an unknown grade and a zero/negative hardness.

### Assistant | 2026-06-23T16:51:36.970Z

[tool_use: Bash]

### User | 2026-06-23T16:51:41.279Z

[tool_result] === hardnessAdj edge cases ===
HB=0  -> pow(200/0,0.2)=pow(Inf,0.2)=Inf -> clamp 1.2: 1.2
HB=-50-> pow(200/-50,0.2)=pow(-4,0.2)=NaN -> Math.max(0.8,NaN)=NaN -> Math.min(1.2,NaN)=NaN: NaN
  => with NaN adj, vc = baseVc*toolFactor*NaN = NaN. spindle=NaN. assertComputed would FAIL (not >0).

=== unknown grade fallback ===
resolveMaterial('ZZ-..'): no key, no alias -> returns group='steel_medium_carbo
... [+490 chars truncated]

### Assistant | 2026-06-23T16:51:51.874Z

Important edge-case finding confirmed: a **negative** `material_hardness` produces `Math.pow(200/negative, 0.2)` = `Math.pow(negative, 0.2)` = `NaN`, and `Math.min(1.2, Math.max(0.8, NaN))` = `NaN`, propagating `NaN` through `cutting_speed` → `spindle_speed` → entire result. The legacy path has the same `Math.pow(200/material_hardness, 0.3)` behavior (also NaN on negative), so this is NOT a regression — it's a pre-existing latent issue equally present in the old code. The prior `oscar` regression note in CLAUDE.md even logs this as a known P2 follow-up ("negative explicit radial_depth_mm -> engine NaN"). The new tests never pass negative hardness on the iso path (grades supply their own positive HB; `MILL_MATERIALS` are all positive). So this is a P2 latent edge case, not introduced or worsened by this change, and not test-covered — worth noting but not blocking.

Zero hardness clamps safely to 1.2 (no NaN). Unknown grade falls back to P/steel and produces a finite positive result (test 268 passes). Missing `machine_max_rpm` skips the clamp safely. sqrt clamp bounds tiny/huge tools correctly.

Now let me verify one thing the focus raised about the alias resolution test: "would the 'category resolves same as grade' test catch a broken alias?" Let me trace the `stainless` alias → 316 path precisely, and check a subtle bug: `resolveMaterial` uses `material?.replace(/\s+/g,"")` for `key` — so `"stainless"` → key=`"stainless"`, which is NOT in MATERIAL_HARDNESS, then falls to aliasKey. But does the alias lookup use the right normalization?

### Assistant | 2026-06-23T16:51:58.485Z

[tool_use: Bash]

### User | 2026-06-23T16:52:02.870Z

[tool_result] {"material":"stainless","key":"stainless","aliasKey":"316","hitGroup":"stainless_austenitic"}
{"material":"Stainless","key":"Stainless","aliasKey":"316","hitGroup":"stainless_austenitic"}
{"material":"STAINLESS","key":"STAINLESS","aliasKey":"316","hitGroup":"stainless_austenitic"}
{"material":"stainless steel","key":"stainlesssteel","aliasKey":"316","hitGroup":"stainless_austenitic"}
{"material":"
... [+476 chars truncated]

### Assistant | 2026-06-23T16:52:10.100Z

The alias resolution is robust: the alias map includes both space-stripped (`"stainlesssteel"`) and spaced (`"stainless steel"`) variants, and lookup uses lowercased+trimmed. The test at line 260-266 (`category "stainless" resolves to SAME ISO-M physics as grade 316`) would indeed catch a broken alias — if `MATERIAL_CATEGORY_ALIASES["stainless"]` were removed or pointed to a steel grade, `cat.cutting_speed_m_min` would equal steel's (not less than it) and the `< steel` assertion plus the `within rounding of 316` assertion would both fail. (R9 PASS for the alias test.)

Now let me double-check the one place that could break the alias test silently: the `assertVcIdentity`/rounding tolerance. The test asserts `Math.abs(cat.vc - stainless.vc) <= 2`. Both resolve to 316 → identical inputs → identical output, so delta is 0. Solid.

Let me do a final check — run the actual test file to confirm it passes as claimed, and confirm no `.skip`/`.only` slipped in.

### Assistant | 2026-06-23T16:52:12.298Z

[tool_use: Bash]

### User | 2026-06-23T16:52:18.986Z

[tool_result] === .skip / .only / toBeDefined / toBeTruthy stub check in new test ===
NONE - clean

### Assistant | 2026-06-23T16:52:22.186Z

[tool_use: Bash]

### User | 2026-06-23T16:52:28.364Z

[tool_result] [DEBUG] [Taylor] Vc=134, T=4.2 min

stderr | src/__tests__/sfc-jm-fleet-page-closed-loop.test.ts > SFC web-page PATH closed-loop calc correctness (productSFC; JM machines FIRST) > severe over-power escalates to 'danger' (not merely 'warning') > Haas OM-2 (5.6 kW) heavy cut in steel -> power >150% -> danger
[DEBUG] [Kienzle] h=0.0955, kc=3238, Fc=11131N
[DEBUG] [Taylor] Vc=200, T=1.7 min

stderr | 
... [+1405 chars truncated]

### Assistant | 2026-06-23T16:52:35.664Z

All 22 tests pass. Let me make one final verification of a potential silent-breakage concern: the `tier:"pro"` results include sustainability/MRR, but I want to confirm the `MILL_MATERIALS` legacy tests (which pass category names like `"steel"`/`"aluminum"`/`"stainless"` through the alias path now) still hit the bands the `assertVcIdentity`/`assertFeedIdentity` enforce — since those existing tests now route through the NEW alias+iso path, not the old one. The test run above shows all 22 pass including those, so the alias change didn't break the pre-existing machine-compliance tests. Let me confirm the clamp ordering didn't break the `assertVcIdentity` for clamped machines (e.g. Roku-Roku 40000 vs a clamped case).

The test output confirms everything passes. Let me clean up my temp files.

### Assistant | 2026-06-23T16:52:36.548Z

[tool_use: Bash]

### User | 2026-06-23T16:52:40.442Z

[tool_result] cleaned

### Assistant | 2026-06-23T16:53:00.963Z

I have completed a rigorous independent review, reading all changed files end to end, verifying the canonical tables, numerically reproducing the engine math, confirming regression-sensitivity against the legacy path, and running the test suite live.

## VERDICT: PASS

**summary:** The material-aware ISO-group fix is correct, well-isolated, and backward-compatible. The 6 new tests are genuinely regression-sensitive (R9 PASS) — I reproduced the legacy/regressed path numerically and confirmed the inversion test, the aluminium band test, both chip-load tests, and the steel-fz-bound test all FAIL if `iso_group` is dropped. All 22 tests pass live. The only finding is a P2 non-blocking ASCII convention nit; no P0/P1 issues.

**findings:**
- **[P2]** `mcp-server/src/__tests__/sfc-jm-fleet-page-closed-loop.test.ts:205` — newly-added section banner `// ── MATERIAL-AWARE FIX ...──` uses non-ASCII box-drawing characters (`U+2500`). This is the identical issue a prior commit (`cc8e800d00 U-XRAY-GDT-GOLD-VERIFY-ASCII`) fixed as a "3-of-3 P2" on a test banner; the repo holds test files to ASCII-only. Fix: replace with ASCII dashes (e.g. `// --- MATERIAL-AWARE FIX ... ---`). Non-blocking; the engine source files themselves already use box-drawing in section headers, so this is a test-file convention nit only.
- **[P2 / informational, NOT introduced by this change]** `mcp-server/src/engines/ManufacturingCalculations.ts:835` (and the legacy sibling `:846`) — a **negative** `material_hardness` yields `Math.pow(200/negative, 0.2)` = `NaN`, which `Math.min/Math.max` does not sanitize, propagating `NaN` through `cutting_speed`/`spindle_speed`. This is pre-existing (the original code had the same `Math.pow(200/hardness, 0.3)`), equally present in the preserved legacy path, and not reachable by any current test (grades supply positive HB; clamp inputs are positive). Zero hardness is safe (clamps to 1.2). Worth a future input-validation guard but not a regression and not a blocker for this
... [+1433 chars truncated]
