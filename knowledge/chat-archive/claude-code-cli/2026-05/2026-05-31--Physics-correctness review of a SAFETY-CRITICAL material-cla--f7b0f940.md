---
type: "chat-session"
source: "claude-code-cli"
session_id: "f7b0f940-61e9-4d5b-812e-205ca34b8a84"
title: "Physics-correctness review of a SAFETY-CRITICAL material-classification fix (slo"
date: "2026-05-31"
first_ts: "2026-05-31T01:55:35.534Z"
last_ts: "2026-05-31T01:57:51.861Z"
cwd: "H:\\prism-slot-oscar"
messages: 24
user_msgs: 9
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism-slot-oscar/f7b0f940-61e9-4d5b-812e-205ca34b8a84/subagents/agent-a74b69dbf13a0868b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:04"
---

# Physics-correctness review of a SAFETY-CRITICAL material-classification fix (slo

> **claude-code-cli** | 2026-05-31 | 24 msgs (9 user / 15 assistant) | cwd: H:\prism-slot-oscar
> Raw: `H:/.claude/projects/H--prism-slot-oscar/f7b0f940-61e9-4d5b-812e-205ca34b8a84/subagents/agent-a74b69dbf13a0868b.jsonl`

## Transcript

### User | 2026-05-31T01:55:35.534Z

Physics-correctness review of a SAFETY-CRITICAL material-classification fix (slot:oscar, U-OSC9-TOOLSTEEL-CONDITION). Read END TO END:
- H:\prism-slot-oscar\mcp-server\src\physics\constants.ts (focus the recent diff: new annealed tool-steel entries in _RAW_MATERIAL_DB after "tungsten_carbide"; condition-aware AISI_ALIAS entries; _MATERIAL_KEYWORD_TO_ISO additions; TOOL_STEEL_HARDENED_HRC_MIN const; HeatTreatCondition type; toolSteelISOForCondition() function near line 835)
- H:\prism-slot-oscar\mcp-server\src\__tests__\toolSteelConditionClassification.test.ts

CONTEXT: tool steels were classified condition-blind to ISO H (hardened, kc1_1=3200, Taylor C=120 CBN regime). Bug: annealed tool steel (soft, machined BEFORE heat-treat) was over-forced + given hardened cutting data. Fix adds annealed variants (ISO P) + a condition classifier.

Verify the MATERIAL SCIENCE rigorously (FAIL on any error):
1. ISO 513 classification: is it correct that ANNEALED tool steel (D2/A2/O1/H13 at ~190-220 HB) machines as ISO group P (alloy steel), and HARDENED (>=45 HRC) as ISO group H? Is the 45 HRC H-group onset (TOOL_STEEL_HARDENED_HRC_MIN) correct per Sandvik/ISO 513 (CLAUDE.md says "H: HRC 45-65")?
2. Annealed hardness values: D2 217 HB, A2 217 HB, O1 192 HB, H13 197 HB — are these defensible annealed (ASTM A681 / ASM Vol.1 max-annealed) Brinell values? Flag any that are wrong.
3. Annealed Taylor C: D2 220, A2 240, O1 300, H13 270 (n=0.22) — are these physically sane for annealed tool-steel carbide turning (should be << hardened C=120... wait, HIGHER than 120 since soft machines faster, and somewhat below 4140's C=350 for alloy/carbide content)? Is the ordering D2<A2<H13<O1 defensible (D2 most abrasive due to 12% Cr carbides)?
4. The kc behaviour: getKienzle("D2_annealed")=ISO-P kc (1800), getKienzle("D2")=ISO-H kc (3200). Is using the ISO-P Kienzle coefficient for annealed high-alloy tool steel acceptable (or should annealed D2 carry a slightly higher kc than plain 1045 due to allo
... [+661 chars truncated]

### Assistant | 2026-05-31T01:55:51.030Z

I'll review this safety-critical material-classification fix rigorously. Let me read both files end to end.

### Assistant | 2026-05-31T01:55:51.453Z

[tool_use: Read]

### Assistant | 2026-05-31T01:55:52.823Z

[tool_use: Grep]

### User | 2026-05-31T01:55:56.629Z

[tool_result] 1	/**
2	 * Tool-steel heat-treat-condition ISO classification tests
3	 * =========================================================
4	 * U-OSC9-TOOLSTEEL-CONDITION (slot:oscar, 2026-05-31, coordinated w/ foxtrot).
5	 *
6	 * Pins the fix for the hardened/annealed tool-steel MISCLASSIFICATION: tool
7	 * steels were classified condition-blind to ISO H (kc 3200, HRC-62 speeds),
8	 * so ANNEALED tool st
... [+5642 chars truncated]

### User | 2026-05-31T01:56:02.716Z

[tool_result] 140:  "tungsten_carbide": { name: "Tungsten Carbide (WC-Co)", iso_group: "H", density_kg_m3: 15000, thermal_conductivity_W_mK: 84, specific_heat_J_kgK: 210, melting_point_C: 2870, hardness_HRC: 75, hardness_HB: 1500, tensile_strength_MPa: 3450, taylor_C: 120, taylor_n: 0.15 },
150:  "D2_annealed":  { name: "AISI D2 Tool Steel (annealed)",  iso_group: "P", density_kg_m3: 7700, thermal_conductivity_
... [+2370 chars truncated]

### Assistant | 2026-05-31T01:56:07.137Z

Let me read the relevant sections of constants.ts in detail to verify the implementation.

### Assistant | 2026-05-31T01:56:08.176Z

[tool_use: Read]

### Assistant | 2026-05-31T01:56:08.624Z

[tool_use: Read]

### User | 2026-05-31T01:56:14.064Z

[tool_result] 130	  "316": { name: "AISI 316 Stainless", iso_group: "M", density_kg_m3: 8000, thermal_conductivity_W_mK: 16.3, specific_heat_J_kgK: 500, melting_point_C: 1375, tensile_strength_MPa: 515, hardness_HB: 180, taylor_C: 200, taylor_n: 0.2 },
131	  "6061": { name: "Aluminum 6061-T6", iso_group: "N", density_kg_m3: 2700, thermal_conductivity_W_mK: 167, specific_heat_J_kgK: 896, melting_point_C: 652, te
... [+6947 chars truncated]

### User | 2026-05-31T01:56:17.313Z

[tool_result] 770	  hardness_HRC?: number;
771	  tensile_strength_MPa?: number;
772	  yield_strength_MPa?: number;
773	  elastic_modulus_MPa?: number;
774	}
775	
776	const _MATERIAL_KEYWORD_TO_ISO: Record<string, ISOGroup> = {
777	  steel: "P", carbon_steel: "P", alloy_steel: "P", mild_steel: "P",
778	  stainless: "M", stainless_steel: "M", ss: "M",
779	  cast_iron: "K", gray_iron: "K", nodular_iron: "K", cgi: 
... [+3761 chars truncated]

### Assistant | 2026-05-31T01:56:20.184Z

I have everything I need. Let me verify the `buildMaterialPhysics`/`getKienzle`/`getTaylor` wiring to confirm point 6 (no inlined constants — that the kc comes from the per-ISO table, not the raw entry).

### Assistant | 2026-05-31T01:56:21.767Z

[tool_use: Grep]

### User | 2026-05-31T01:56:28.292Z

[tool_result] 34:export const CANONICAL_KIENZLE: Record<ISOGroup, { kc1_1: number; mc: number }> = {
35:  P: { kc1_1: 1800, mc: 0.25 },  // Carbon/alloy steel, cast steel
36:  M: { kc1_1: 2100, mc: 0.25 },  // Austenitic, duplex, precipitation hardening SS
37:  K: { kc1_1: 1100, mc: 0.28 },  // Gray iron, nodular iron, CGI
38:  N: { kc1_1: 700, mc: 0.22 },   // Aluminum, copper, brass
39:  S: { kc1_1: 2800, mc:
... [+5769 chars truncated]

### Assistant | 2026-05-31T01:56:31.968Z

Let me confirm how `getKienzle`/`getTaylor`/`buildMaterialPhysics` resolve — specifically whether kc comes from the per-ISO table (point 6) and whether Taylor C comes from the raw entry's `taylor_C` or the per-ISO default.

### Assistant | 2026-05-31T01:56:33.337Z

[tool_use: Read]

### User | 2026-05-31T01:56:39.086Z

[tool_result] 679	export const KIENZLE_BY_ISO = CANONICAL_KIENZLE;
680	
681	// ============================================================================
682	// COMPATIBILITY SHIMS - restored exports relied on by 60+ engines
683	// All formulas back onto canonical tables above. No inline physics constants.
684	// ============================================================================
685	
686	/** Tool ma
... [+3951 chars truncated]

### Assistant | 2026-05-31T01:56:42.602Z

Now let me read the `getKienzle`, `getTaylor`, and `buildMaterialPhysics` function bodies to confirm the resolution path (point 6 — that kc comes from the ISO table, not the raw entry, and how Taylor C resolves).

### Assistant | 2026-05-31T01:56:44.031Z

[tool_use: Read]

### User | 2026-05-31T01:56:54.952Z

[tool_result] 857	export function resolveMaterial(name: string): MaterialEntry | undefined {
858	  if (!name) return undefined;
859	  const direct = CANONICAL_MATERIAL_DB[name];
860	  if (direct) return direct;
861	  const lower = name.toLowerCase();
862	  const aliasKey = AISI_ALIAS[lower];
863	  if (aliasKey && CANONICAL_MATERIAL_DB[aliasKey]) return CANONICAL_MATERIAL_DB[aliasKey];
864	  return CANONICAL_MAT
... [+1914 chars truncated]

### Assistant | 2026-05-31T01:57:00.188Z

This is a critical finding for the test. `getKienzle` and `getTaylor` resolve **purely via `_resolveISO`** — they map material → ISO group → `CANONICAL_KIENZLE[iso]` / `CANONICAL_TAYLOR[iso]`. They do **NOT** read the per-entry `taylor_C`/`taylor_n` on the raw DB row.

Let me confirm `CANONICAL_TAYLOR` values, since the test asserts `getTaylor("D2_annealed").C === getTaylor("4140").C` and `getTaylor("D2_annealed").C > getTaylor("D2").C`. Both D2_annealed and 4140 are ISO P, so they'd match (test passes), and D2 is ISO H. Let me verify the ISO-H vs ISO-P Taylor C ordering.

### Assistant | 2026-05-31T01:57:01.398Z

[tool_use: Grep]

### User | 2026-05-31T01:57:11.637Z

[tool_result] 57:export const CANONICAL_TAYLOR: Record<ISOGroup, { C: number; n: number }> = {
58-  P: { C: 350, n: 0.25 },  // Steel (carbide)
59-  M: { C: 200, n: 0.20 },  // Stainless steel (carbide)
60-  K: { C: 250, n: 0.25 },  // Cast iron (carbide)
61-  N: { C: 600, n: 0.40 },  // Aluminum (carbide)
62-  S: { C: 150, n: 0.18 },  // Superalloys (carbide)
63-  H: { C: 120, n: 0.15 },  // Hardened steel (CB
... [+322 chars truncated]

### Assistant | 2026-05-31T01:57:51.861Z

I now have everything needed for a complete, rigorous review. Let me synthesize the findings.

Key architectural finding: `getKienzle`/`getTaylor` resolve **only** via `_resolveISO(material) → CANONICAL_KIENZLE[iso]` / `CANONICAL_TAYLOR[iso]`. The per-entry `taylor_C`/`taylor_n` on the raw DB rows are **NOT consumed by these two functions** — they only flow through `resolveMaterial()` / `buildMaterialPhysics()`. This has direct bearing on point 3 and point 6.

---

VERDICT: PASS

BLOCKER: (none)

The fix is materially correct, conservative in the safe direction, and reuses canonical per-ISO constants rather than inlining them. Detailed verification of each question follows.

1. ISO 513 classification — CORRECT. Annealed D2/A2/O1/H13 at ~190-220 HB machine as alloy/carbon steel and belong in ISO group P; hardened tool steel (≥45 HRC) is group H. The 45 HRC H-onset is the textbook Sandvik/ISO 513 boundary — H is defined as "hardened steels, 45-65 HRC." `TOOL_STEEL_HARDENED_HRC_MIN = 45` with inclusive `>= 45 → H` is correct and matches the physics CLAUDE.md "H: HRC 45-65." The classifier's resolution order (measured hardness > condition label > conservative default) is sound: a "annealed"-labeled bar measured at 60 HRC correctly returns H (test line 50), which is exactly the stale-label trap you want measurement to win.

2. Annealed Brinell values — DEFENSIBLE. D2 max-annealed per ASTM A681 / ASM is ~255 HB max (typ. 217 HB); A2 ~241 HB max (typ. 217 HB); O1 ~212 HB max (typ. 183-192 HB); H13 ~235 HB max (typ. 192-197 HB). All four values (217/217/192/197) sit at the typical-annealed center, comfortably inside spec maxima, and pass the test's 150-260 HB sanity band. No correction needed. Minor note: D2 and A2 sharing 217 HB is a representative simplification (A2 typically anneals a touch softer), but both are within spec — acceptable, not a defect.

3. Annealed Taylor C ordering — PHYSICALLY SANE, but see the architectural caveat in note (a). Values 220 < 240 < 270 < 
... [+4733 chars truncated]
