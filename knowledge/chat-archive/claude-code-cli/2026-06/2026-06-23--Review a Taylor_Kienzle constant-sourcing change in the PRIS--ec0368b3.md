---
type: "chat-session"
source: "claude-code-cli"
session_id: "ec0368b3-d2e4-4416-b9bd-e0bd521ec632"
title: "Review a Taylor/Kienzle constant-sourcing change in the PRISM SFC (Speed & Feed "
date: "2026-06-23"
first_ts: "2026-06-23T19:28:25.227Z"
last_ts: "2026-06-23T19:30:33.345Z"
cwd: "H:\\prism\\.claude\\worktrees\\agent-ad9d72248af73784f"
messages: 32
user_msgs: 12
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/ec0368b3-d2e4-4416-b9bd-e0bd521ec632/subagents/agent-ad9d72248af73784f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Review a Taylor/Kienzle constant-sourcing change in the PRISM SFC (Speed & Feed 

> **claude-code-cli** | 2026-06-23 | 32 msgs (12 user / 20 assistant) | cwd: H:\prism\.claude\worktrees\agent-ad9d72248af73784f
> Raw: `H:/.claude/projects/H--prism/ec0368b3-d2e4-4416-b9bd-e0bd521ec632/subagents/agent-ad9d72248af73784f.jsonl`

## Transcript

### User | 2026-06-23T19:28:25.227Z

Review a Taylor/Kienzle constant-sourcing change in the PRISM SFC (Speed & Feed Calculator). Grade it PASS or FAIL with file:line citations.

CONTEXT: `mcp-server/src/engines/ProductEngine.ts` backs the customer-facing SFC web page (`/speed-feed-calc`). It previously carried an INLINE `MATERIAL_HARDNESS` table with per-grade kc1_1/mc/Taylor-C/n that DIVERGED from the canonical source of truth `mcp-server/src/physics/constants.ts`. Notably 1045 steel had inline Taylor C=250 -> tool life ~2.2 min, vs the canonical ISO-3685 value C=350 -> ~9.4 min (the page was publishing tool life ~4x too short). This change replaces the inline coefficients with canonical-sourced ones.

WHAT TO VERIFY (read the actual code, do not assume):
1. ProductEngine.ts ~line 458-545: the new `MATERIAL_IDENTITY` table (identity only), `GRADE_TO_AISI` map, `canonicalCoefficients(gradeKey, iso)` resolver, and the composed `MATERIAL_HARDNESS`. Confirm the resolver precedence (per-material AISI_CUTTING_COEFFICIENTS override -> per-ISO CANONICAL_KIENZLE/CANONICAL_TAYLOR fallback) is CORRECT and matches the documented precedence in `buildMaterialPhysics` (constants.ts ~line 1303-1325).
2. The temper/condition strip regex `gradeKey.replace(/[-\s]?T\d.*$/i, "").replace(/L$/, "")` -- does it correctly normalize "6061-T6"->"6061", "316L"->"316", "7075-T651"->"7075" WITHOUT corrupting "1045","4140","Ti-6Al-4V","Inconel 718","A2","D2","GG25"? Flag any false strip.
3. Is canonical Taylor C=350 / n=0.25 the correct ISO-3685 value for 1045-class steel with carbide tooling (vs the inline 250)? Cross-check constants.ts CANONICAL_TAYLOR (line ~57), AISI_CUTTING_COEFFICIENTS (line ~1258), and the physics module's own documented table. Confirm the direction (life increasing ~4x) is physically correct and the canonical value is the defensible one.
4. The `resolveMaterial` fallback branch (~line 516-530): unknown material now resolves canonical P-group (C=350) instead of inline 250. Correct?
5. Any sign/exponent/unit
... [+583 chars truncated]

### Assistant | 2026-06-23T19:28:31.581Z

I'll review this Taylor/Kienzle constant-sourcing change. Let me start by reading the canonical source of truth and the changed file.

### Assistant | 2026-06-23T19:28:32.054Z

[tool_use: Read]

### User | 2026-06-23T19:28:32.506Z

[tool_result] File does not exist. Note: your current working directory is H:\prism\.claude\worktrees\agent-ad9d72248af73784f.

### Assistant | 2026-06-23T19:28:32.934Z

[tool_use: Read]

### User | 2026-06-23T19:28:33.743Z

[tool_result] 420	
421	  // Sustainability (pro+enterprise only)
422	  sustainability?: {
423	    energy_kWh_per_part: number;
424	    co2_kg_per_part: number;
425	    coolant_liters_per_hour: number;
426	  };
427	
428	  // Model info
429	  formulas_used: string[];
430	  calculation_time_ms: number;
431	  tier: ProductTier;
432	  tier_limited: boolean;
433	}
434	
435	/** S F C Compare Result configuration/data 
... [+7735 chars truncated]

### Assistant | 2026-06-23T19:28:37.162Z

The constants.ts file at C:/ doesn't exist. Let me find the canonical constants file and read the relevant portions, plus the imports in ProductEngine.ts.

### Assistant | 2026-06-23T19:28:38.127Z

[tool_use: Bash]

### Assistant | 2026-06-23T19:28:40.094Z

[tool_use: Grep]

### User | 2026-06-23T19:28:41.007Z

[tool_result] 34:  CANONICAL_KIENZLE,
35:  CANONICAL_TAYLOR,
36:  AISI_CUTTING_COEFFICIENTS,
37:  type ISOGroup,
494:// Grade key -> AISI_CUTTING_COEFFICIENTS key for grades whose canonical catalog
499:// back to the per-ISO CANONICAL_KIENZLE/CANONICAL_TAYLOR bucket (sourced, coarser).
508: * AISI_CUTTING_COEFFICIENTS override (exact key -> named alias -> temper-stripped
509: * key) THEN per-ISO CANONICAL_KIENZ
... [+833 chars truncated]

### User | 2026-06-23T19:28:41.815Z

[tool_result] -rw-r--r-- 1 wompu 197611 67665 Jun 22 19:53 H:/prism/mcp-server/src/physics/constants.ts
---FOUND---

### Assistant | 2026-06-23T19:28:45.693Z

The file exists on H:. The imports confirm `CANONICAL_KIENZLE`, `CANONICAL_TAYLOR`, `AISI_CUTTING_COEFFICIENTS`, and `ISOGroup` are imported. Now let me read the relevant constants definitions and the import statement + groupToISO mapper.

### Assistant | 2026-06-23T19:28:46.642Z

[tool_use: Read]

### Assistant | 2026-06-23T19:28:47.049Z

[tool_use: Read]

### User | 2026-06-23T19:28:48.824Z

[tool_result] 25	  SAFETY_LIMITS,
26	  type SpeedFeedResult,
27	  type SpeedFeedInput,
28	  type CuttingForceResult,
29	  type ToolLifeResult,
30	  type SurfaceFinishResult,
31	  type MRRResult,
32	} from "./ManufacturingCalculations.js";
33	import {
34	  CANONICAL_KIENZLE,
35	  CANONICAL_TAYLOR,
36	  AISI_CUTTING_COEFFICIENTS,
37	  type ISOGroup,
38	} from "../physics/constants.js";
39	
40	import {
41	  calcul
... [+114 chars truncated]

### User | 2026-06-23T19:28:49.190Z

[tool_result] 600	}
601	
602	/**
603	 * Map a resolved material GROUP string (e.g. "stainless_austenitic",
604	 * "aluminum_wrought") to its ISO 513 machining group (P/M/K/N/S/H) so the
605	 * speed/feed model can anchor on the canonical per-group milling tables.
606	 * Order matters: the more specific groups (stainless, tool/hardened steel) are
607	 * tested before the generic "steel" catch-all. Defaults to P 
... [+1523 chars truncated]

### Assistant | 2026-06-23T19:28:54.542Z

The import is confirmed at lines 33-38. Now let me read the canonical constants definitions: `CANONICAL_TAYLOR` (~line 57), `AISI_CUTTING_COEFFICIENTS` (~line 1258), `CANONICAL_KIENZLE`, and the `buildMaterialPhysics` precedence (~line 1303-1325).

### Assistant | 2026-06-23T19:28:55.246Z

[tool_use: Read]

### User | 2026-06-23T19:28:56.728Z

[tool_result] 1	/**
2	 * PRISM Canonical Physics Constants
3	 *
4	 * ALL physics calculations MUST import from this file.
5	 * NEVER inline numeric values for Kienzle, Taylor, or material properties.
6	 *
7	 * Sources:
8	 * - Kienzle: Sandvik Coromant General Turning (2024), ISO 3685:1993
9	 * - Taylor: Taylor (1907), Modern: ISO 3685:1993
10	 * - EDM: Klocke "Fertigungsverfahren Band 3", DiBitonto et al. (1989
... [+5104 chars truncated]

### Assistant | 2026-06-23T19:29:00.930Z

This confirms point 3 immediately: **CANONICAL_TAYLOR P = { C: 350, n: 0.25 }** at line 58, documented "Steel (carbide)", sourced Taylor (1907) / ISO 3685:1993. The physics module CLAUDE.md table independently confirms Steel (carbide) C=350, n=0.25. Now let me verify the `AISI_CUTTING_COEFFICIENTS` table (~1258) and `buildMaterialPhysics` precedence (~1303-1325).

### Assistant | 2026-06-23T19:29:01.854Z

[tool_use: Read]

### User | 2026-06-23T19:29:02.720Z

[tool_result] 1240	export const WHITE_LAYER_THRESHOLDS: Record<string, WhiteLayerThreshold> = {
1241	  hardened_steel: { threshold_C: 700, source: "Klocke - austenitization onset" },
1242	  steel:          { threshold_C: 850, source: "Klocke" },
1243	  stainless:      { threshold_C: 650, source: "Klocke" },
1244	  titanium:       { threshold_C: 750, source: "Boothroyd 1963; Ti alpha/beta transition" },
1245	  n
... [+7156 chars truncated]

### Assistant | 2026-06-23T19:29:10.745Z

This is the complete picture for the precedence cross-check. Now I have everything I need to verify all 6 points. Let me confirm the key facts:

**Canonical `AISI_CUTTING_COEFFICIENTS["1045"]`** (line 1260): `{ iso_group: "P", kc1_1: 1800, mc: 0.25, taylor_C: 350, taylor_n: 0.25 }` — directly confirms C=350, n=0.25 for 1045.

**`buildMaterialPhysics` documented precedence** (lines 1290-1325): per-material `AISI_CUTTING_COEFFICIENTS` override THEN per-ISO `CANONICAL_KIENZLE`/`CANONICAL_TAYLOR` fallback. The resolver in ProductEngine.ts mirrors this exactly.

Now let me verify the AISI table keys to assess the temper-strip regex and the GRADE_TO_AISI map against the full grade list, and check that there's no entry collision. Let me also verify `Inconel 718` and the cast iron keys exist as I read them.

I have all keys from lines 1259-1276. Let me now trace each MATERIAL_IDENTITY grade through the resolver to verify correctness.

### Assistant | 2026-06-23T19:29:12.010Z

[tool_use: Read]

### User | 2026-06-23T19:29:12.866Z

[tool_result] 1359	    Vc_typical: vc_base_roughing,
1360	    Vc_max: vc_base_finishing,
1361	    machinability_factor,
1362	    k_thermal, cp_J_kgK, E_GPa,
1363	    sigma_y_MPa, hardness_HB,
1364	    density_kg_m3, melting_point_C,
1365	    // Legacy aliases retained for the 30+ EDM/ceramics/grinding consumers.
1366	    thermal_conductivity_W_mK: k_thermal,
1367	    specific_heat_J_kgK: cp_J_kgK,
1368	    tens
... [+922 chars truncated]

### Assistant | 2026-06-23T19:29:29.255Z

I have all the information needed. The reads were distinct (different offsets/files), not a loop. Let me now trace each grade through the resolver to verify the temper-strip and overall correctness.

Let me work through every `MATERIAL_IDENTITY` grade against `canonicalCoefficients(grade, groupToISO(group))`:

**Temper-strip regex trace:** `gradeKey.replace(/[-\s]?T\d.*$/i, "").replace(/L$/, "")`

- `"1045"` → `T\d` requires literal `T` + digit. No `T` → no strip. `L$`? No. → **"1045"** ✓
- `"4140"`, `"4340"` → no `T`+digit, no trailing L → unchanged ✓
- `"316"` → no T, no trailing L → **"316"** ✓
- `"316L"` → no `T\d`; `L$` → strips → **"316"** ✓
- `"304"` → unchanged ✓
- `"6061"` → unchanged ✓
- `"6061-T6"` → `-T6` matches `[-\s]?T\d.*$` → **"6061"** ✓
- `"7075"` → unchanged ✓
- `"7075-T6"` → → **"7075"** ✓ (and "7075-T651" → "7075" ✓)
- `"A356"` → no `T`+digit (the "3" is not preceded by T), no trailing L → **"A356"** ✓
- `"Ti-6Al-4V"` → contains `T` but `T` here is followed by `i`, not a digit. `T\d` needs T immediately followed by a digit → NO match → unchanged. Trailing `L$`? ends in "V" → no. → **"Ti-6Al-4V"** ✓ (no corruption)
- `"Inconel 718"` → any `T\d`? "Inconel 718" has no `T` at all (capital T). The regex is case-insensitive (`/i`)... let me check for lowercase `t` followed by digit. "Inconel 718" — no `t` adjacent to a digit. `718` is preceded by a space. → no match. Trailing L? ends in "8" → no. → **"Inconel 718"** ✓
- `"GG25"` → no `T`+digit, no trailing L → **"GG25"** ✓
- `"GGG50"` → no `T`+digit, no trailing L → **"GGG50"** ✓
- `"C360"` → no T+digit, no trailing L → **"C360"** ✓
- `"PEEK"` → no T+digit; trailing `L$`? ends in "K" → no. → **"PEEK"** ✓

Now let me verify the case-insensitive flag doesn't cause a false strip on any grade with a lowercase `t`+digit. The only grade containing `t`/`T` is `Ti-6Al-4V` (T not followed by digit) and `Titanium`-class — none have `t<digit>`. The `/i` flag is safe here.

**A2/D2 check** (mentioned in the promp
... [+424 chars truncated]

### Assistant | 2026-06-23T19:29:29.908Z

[tool_use: Read]

### User | 2026-06-23T19:29:30.769Z

[tool_result] 1	/**
2	 * PRISM Product Engine — R11 Product Packaging
3	 * =============================================
4	 * Composition layer that orchestrates existing physics engines into
5	 * unified product workflows. Each product (SFC, PPG, ShopManager, ACNC)
6	 * composes multiple engine calls into a single end-to-end pipeline.
7	 *
8	 * MS0: Speed & Feed Calculator (SFC) — 10 actions
9	 * MS1: Post Pro
... [+505 chars truncated]

### Assistant | 2026-06-23T19:29:56.848Z

Now I have full context. Let me complete the per-grade resolver trace verification.

**Resolver precedence:** `AISI_CUTTING_COEFFICIENTS[gradeKey]` → `AISI_CUTTING_COEFFICIENTS[GRADE_TO_AISI[gradeKey] ?? ""]` → `AISI_CUTTING_COEFFICIENTS[stripped]` → then per-field fallback to `CANONICAL_KIENZLE[iso]`/`CANONICAL_TAYLOR[iso]`. This mirrors `buildMaterialPhysics` (per-material AISI override THEN per-ISO fallback). ✓

Per-grade trace (grade → group → ISO → resolved coefficients):

| Grade | group | ISO | AISI hit | Resolved C/n | Resolved kc1_1/mc |
|---|---|---|---|---|---|
| 1045 | steel_medium_carbon | P | `["1045"]` direct | **350 / 0.25** ✓ | 1800 / 0.25 ✓ |
| 4140 | steel_alloy | P | `["4140"]` | 320 / 0.24 ✓ | 1950 / 0.26 ✓ |
| 4340 | steel_alloy | P | `["4340"]` | 310 / 0.23 ✓ | 2000 / 0.26 ✓ |
| 316 | stainless_austenitic | M | `["316"]` | 190 / 0.19 ✓ | 2150 / 0.25 ✓ |
| 316L | stainless_austenitic | M | strip→`["316"]` | 190 / 0.19 ✓ | 2150 / 0.25 ✓ |
| 304 | stainless_austenitic | M | `["304"]` | 200 / 0.20 ✓ | 2100 / 0.25 ✓ |
| 6061 | aluminum_wrought | N | `["6061"]` | 600 / 0.40 ✓ | 700 / 0.22 ✓ |
| 6061-T6 | aluminum_wrought | N | strip→`["6061"]` | 600 / 0.40 ✓ | 700 / 0.22 ✓ |
| 7075 | aluminum_wrought | N | `["7075"]` | 580 / 0.38 ✓ | 750 / 0.22 ✓ |
| 7075-T6 | aluminum_wrought | N | strip→`["7075"]` | 580 / 0.38 ✓ | 750 / 0.22 ✓ |
| A356 | aluminum_cast | N | none → fallback | 600 / 0.40 (N) ✓ | 700 / 0.22 (N) ✓ |
| Ti-6Al-4V | titanium | S | `["Ti-6Al-4V"]` | 150 / 0.18 ✓ | 2800 / 0.27 ✓ |
| Inconel 718 | superalloy | S | `["Inconel 718"]` | 120 / 0.15 ✓ | 3200 / 0.30 ✓ |
| GG25 | cast_iron_gray | K | `GRADE_TO_AISI→gray_iron` | 250 / 0.25 ✓ | 1100 / 0.28 ✓ |
| GGG50 | cast_iron_ductile | K | `GRADE_TO_AISI→ductile_iron` | 300 / 0.25 ✓ | 1300 / 0.28 ✓ |
| C360 | copper_brass | N | none → fallback | 600 / 0.40 (N) ✓ | 700 / 0.22 (N) ✓ |
| PEEK | plastic_engineering | N | none → fallback | 600 / 0.40 (N) ✓ | 700 / 0.22 (N) ✓ |

Every resolution is ca
... [+2406 chars truncated]

### Assistant | 2026-06-23T19:29:58.429Z

[tool_use: Grep]

### User | 2026-06-23T19:30:00.229Z

[tool_result] 469:// inline values that DIVERGED from canonical (e.g. 1045 Taylor C=250 vs the
587:  // per-ISO canonical bucket supplies them (e.g. Taylor C=350 for P, not 250).

### Assistant | 2026-06-23T19:30:33.345Z

The only `250` matches are in comments documenting the old divergence. No inline coefficient table remains — every `kc1_1`/`mc`/`C`/`n` value now traces to imported canonical constants. The two `250` hits are both explanatory comments (lines 469, 587), not live values.

Verification complete. Here is the report.

---

PHYSICS REVIEW REPORT
=====================
Files reviewed:
- `H:/prism/mcp-server/src/engines/ProductEngine.ts` (lines 33-38 imports, 463-547 identity+resolver+composition, 567-599 resolveMaterial, 602-619 groupToISO)
- `H:/prism/mcp-server/src/physics/constants.ts` (canonical cross-reference: 34-64 CANONICAL_KIENZLE/TAYLOR, 1249-1276 AISI_CUTTING_COEFFICIENTS, 1303-1325 buildMaterialPhysics precedence)

Formulas checked: 2 (Taylor T=(C/Vc)^(1/n), Kienzle Fc=kc1_1·ap·fz^(1-mc)) — both confirmed UNTOUCHED by this diff (they live in `ManufacturingCalculations.js`; this change only sources the constants they consume).

FINDINGS:

[INFO] ProductEngine.ts:33-38 — Canonical imports verified present: `CANONICAL_KIENZLE`, `CANONICAL_TAYLOR`, `AISI_CUTTING_COEFFICIENTS`, `type ISOGroup` from `../physics/constants.js`. Zero inline physics coefficients remain (grep of the file returns `250` only in two explanatory comments, lines 469 and 587).

[INFO] ProductEngine.ts:516-533 — Resolver precedence is CORRECT and matches `buildMaterialPhysics` (constants.ts:1290-1325): per-material `AISI_CUTTING_COEFFICIENTS` override (exact key → `GRADE_TO_AISI` named alias → temper-stripped key) THEN per-field fallback to per-ISO `CANONICAL_KIENZLE`/`CANONICAL_TAYLOR`. The `??` chain is order-preserving and each of the four output fields (kc1_1, mc, C, n) independently falls through to its per-ISO bucket — identical semantics to constants.ts:1322-1325.

[INFO] ProductEngine.ts:520 — Temper/condition strip regex `replace(/[-\s]?T\d.*$/i,"").replace(/L$/,"")` traced against all 17 `MATERIAL_IDENTITY` grades plus the prompt's adversarial set. Correct normalizations: `6061-T6`→`606
... [+3778 chars truncated]
