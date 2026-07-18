# Tooling Engineer Review -- PRISM v9 Tool Selection & Holder Systems

**Reviewer perspective**: Senior tooling application engineer (Sandvik/Kennametal-level)
**Files reviewed**: `tools.ts`, `toolHolders.ts`, `SmartToolSelector.tsx`, `ToolHolderSelector.tsx`, `InsertSelector.tsx`, plus `SfcCalculatorPage.tsx`, `sfc.ts`, `operations.ts`, `materials.ts`, `CompatibilityValidator.tsx`

---

## 1. COATINGS DATABASE (tools.ts lines 26-36)

### What is correct

- ISO material-group coding (P/M/K/N/S/H) is the right abstraction.
- TiAlN at 800C / HV3300, AlTiN at 900C / HV3400, TiN at 600C / HV2300 -- all within the ballpark of published catalog data.
- DLC suited only for N (non-ferrous) and avoided for ferrous -- correct.
- PCD avoided for ferrous -- correct (carbon diffusion into iron).
- CBN suited for H and K, avoided for N -- correct.

### Issues found

| Severity | Item | Detail |
|----------|------|--------|
| MEDIUM | **AlCrN maxTemp** | Listed 1100C. Real-world AlCrN coatings top out around 900-1000C. 1100C is closer to AlCrN+ nano-composite variants. Should be 1000C for generic AlCrN. |
| MEDIUM | **CVD label** | Listed as "CVD (TiCN+Al2O3)" -- this is a multi-layer CVD stack (Sandvik GC grades). Correct combination, but should note this is for turning inserts primarily, not general rotating tools. CVD coatings are thick (6-12um) and create tensile residual stress making them unsuitable for endmills. Currently no logic prevents a user from pairing a CVD coating with an endmill. |
| LOW | **PCD hardness** | Listed 8000 HV. PCD hardness is typically quoted as 5000-8000 HV depending on grain size. 8000 is the upper extreme -- 6000 HV would be more representative of general-purpose PCD grades. |
| LOW | **Missing coatings** | No TiCN standalone (common for drilling), no nACo (nano-composite AlTiN, critical for hardened steel high-speed finishing), no ZrN (common for non-ferrous). |
| LOW | **Uncoated hardness** | 1600 HV is reasonable for uncoated carbide but should distinguish from HSS (~800 HV). The substrate hardness is what matters for uncoated tools, not a coating hardness. |
| INFO | **No coating thickness** | Coating thickness matters for chip flow and edge sharpness. PVD is typically 2-5um, CVD is 6-15um. Thick CVD rounds the cutting edge, affecting minimum chip thickness. |

---

## 2. CUTTING TOOL DATABASE (tools.ts lines 38-56)

### What is correct

- ISO naming logic for endmills (diameter-flute-coating) is sensible.
- Sandvik, Kennametal, OSG, Walter, Mitsubishi, Guhring, Emuge, Sumitomo are all real, tier-1 tool manufacturers -- good.
- 3-flute DLC for aluminum (EM-C-8-3-DLC) is a correct pairing.
- 5-flute AlCrN for superalloys is a reasonable choice.
- CBN insert for hardened steel finish turning only -- correct.
- CNMG insert with CVD for rough+finish turning in P/K -- correct.

### Critical issues

| Severity | Item | Detail |
|----------|------|--------|
| **CRITICAL** | **Only 14 tools total** | A usable SFC calculator needs at minimum 50-80 tools to cover the operation/material matrix. Currently there are zero tools for: boring, reaming, tapping, chamfering, ball-nose endmills, bull-nose endmills, shell mills (only face mills), reamers, indexable shoulder mills, grooving/parting tools, single-point threading tools. Most operations in `operations.ts` have zero matching tools. |
| **CRITICAL** | **maxDoc semantics overloaded** | For endmills, `maxDoc: 36` (3xD for a 12mm) makes sense as max axial depth. For drills, `maxDoc: 50` (5xD for 10mm) makes sense as max hole depth. For turning inserts, `maxDoc: 4` is max depth of cut. For face mills, `maxDoc: 4` is max axial depth. These are three fundamentally different physical concepts sharing one field. The SFC engine cannot correctly interpret this without knowing which meaning applies. |
| **CRITICAL** | **No flute length / LOC** | There is no `fluteLength` or `cuttingLength` field. The `maxDoc` field is being used as a proxy, but for endmills the actual flute length (LOC) determines the maximum wall depth, not just the max recommended doc. A 12mm endmill with 3xD LOC can still plunge 36mm but the recommended axial depth per pass might only be 1xD. |
| HIGH | **No shank diameter** | Tools have no `shankDiameter` field. This is essential for holder compatibility -- a 12mm endmill could have a 12mm or 20mm shank. Without it, the holder selector cannot validate whether the selected collet/chuck will fit the tool. |
| HIGH | **No overall length** | No `oal` (overall length) field. Combined with holder gage line, this determines the effective stickout, which directly feeds into the deflection calculation (already defined in `sfc.ts` as `DeflectionRequest.stickout`). |
| HIGH | **maxRpm is wrong conceptually** | Tools do not have an absolute max RPM. The limiting factor is the tool's balance grade (G2.5, G6.3) at a given RPM, or the centrifugal force on indexable inserts. A solid carbide endmill at G2.5 could run 40,000+ RPM. The values listed (e.g., 20,000 for a 12mm endmill) are arbitrary -- Sandvik CoroMill Plura 12mm endmills are rated for significantly higher RPM on high-speed spindles. This field will produce false "exceeds max RPM" warnings on HSK-E40 high-speed setups. |
| HIGH | **No corner radius** | Endmills have no `cornerRadius` field. Sharp corner, 0.5mm radius, 1mm radius, full ball, or bull-nose all dramatically change feeds, surface finish, and programming. |
| HIGH | **Helix angle 0 for thread mills** | Thread mills do have a helix-like geometry (the thread pitch along the tool body), but they also have a cutting rake angle. The helix field is misleading for insert tools and thread mills -- should be nullable. |
| MEDIUM | **No HSS tools** | The database contains zero HSS tools. Operations like tapping (defaults to HSS), center drilling (defaults to HSS), broaching (defaults to HSS) have no matching tool. |
| MEDIUM | **No chip-breaker geometry** | For turning inserts, the chipbreaker designation (e.g., -PM, -MF, -GR for Sandvik) determines feed range and depth-of-cut range. CNMG 120408 without a chipbreaker spec is incomplete. |
| MEDIUM | **Insert IC size missing** | CNMG 120408 -- the "12" is the inscribed circle diameter (12.7mm for a C-style insert), "04" is thickness (4.76mm), "08" is nose radius (0.8mm). These dimensions should be parsed or stored explicitly since they affect tool holder selection. |
| LOW | **No tool life data** | The `ToolLifeRequest` in sfc.ts expects cutting speed, feed, depth, material, and tool_material but there's no Kc (specific cutting force) or Taylor tool life constants (n, C) associated with each tool. Without these, tool life calculation is generic at best. |

---

## 3. TAPER / SPINDLE INTERFACE (toolHolders.ts lines 1-22)

### What is correct

- CAT40, CAT50, BT30, BT40, BT50, HSK-A63, HSK-E40 -- these are the core milling tapers.
- VDI 25/40/50 and BMT 55/65 for lathes -- correct and represents the two dominant turret standards.
- Morse tapers as dual-mode (mill + lathe) -- correct.
- Mode-based filtering (mill vs lathe) is the right design.

### Issues found

| Severity | Item | Detail |
|----------|------|--------|
| HIGH | **Missing HSK variants** | Only HSK-A63 and HSK-E40 are listed. HSK-A100 (large CNC mills), HSK-A50 (compact mills), HSK-F63 (same as A63 but with drive keys -- mold/die shops), HSK-T (for lathes with driven tools) are all missing. HSK is dominant in European and high-speed shops. |
| HIGH | **Missing Capto** | Sandvik Coromant Capto (C3, C4, C5, C6, C8) is one of the most versatile modular tooling systems in the industry. It works on both lathes and mills. Its absence means no modular quick-change tooling can be represented. |
| HIGH | **Missing KM / PSC** | Kennametal KM and the ISO PSC (Polygon Shank Coupling) are common on multitasking machines (mill-turns). |
| MEDIUM | **Missing NMTB / R8** | NMTB 30/40/50 (National Machine Tool Builders, used on Bridgeport-type mills) and R8 taper are missing. These are common in job shops and educational settings. |
| MEDIUM | **No gage line length** | Each taper has a specific gage line-to-face dimension that determines the effective tool stickout. Without it, deflection calculations must guess. CAT40 gage line is ~101.6mm, HSK-A63 is ~88mm. |
| MEDIUM | **No max RPM per taper** | BT30 has a lower balance threshold than HSK-E40. At 30,000+ RPM, only HSK or Capto tapers maintain acceptable runout. This should influence tool selection warnings. |
| LOW | **No pull stud / retention type** | CAT40 uses pull studs (different standards: PS-331, PS-340), BT40 uses through-hole retention, HSK is dual-contact. This matters for machine compatibility. |
| LOW | **Morse tapers limited** | Only Morse #2 and #3. Morse #4 and #5 are common on larger drill presses and some lathes. |

---

## 4. HOLDER TYPES (toolHolders.ts lines 28-47)

### What is correct

- ER collet chuck, milling chuck, shrink fit, hydraulic chuck, side-lock -- these are the main milling holder types.
- Shell mill arbor, boring head, drill chuck for specialized use -- correct.
- Lathe OD/ID/grooving/threading holder categories -- correct separation.

### Issues found

| Severity | Item | Detail |
|----------|------|--------|
| HIGH | **No holder-tool compatibility matrix** | A shrink fit holder accepts only h6 tolerance shanks. An ER collet has a clamping range (ER32 accepts 3-20mm in different collets). A side-lock holder needs a Weldon flat. There is no validation that the selected holder can actually grip the selected tool. |
| HIGH | **No collet specification** | ER collet is listed but there's no sub-selection for ER16/ER20/ER25/ER32/ER40. Each has different clamping ranges, runout characteristics, and gripping force. ER32 is the most common but cannot hold a 25mm shank. |
| HIGH | **No TIR (runout) data** | Each holder type has a characteristic runout: shrink fit ~3um, hydraulic ~3um, ER collet ~10-15um, side-lock ~15-20um, drill chuck ~25-50um. This directly affects surface finish and tool life. The `SurfaceFinishRequest` in sfc.ts has no way to incorporate holder runout. |
| MEDIUM | **No holder balance grade** | For HSM (high speed machining) above 15,000 RPM, holder balance is critical. G2.5 at 25,000 RPM is the standard. Drill chucks and side-lock holders generally cannot achieve this. |
| MEDIUM | **No presetter compatibility** | No data about whether holders are compatible with offline presetters (Zoller, Speroni). |
| LOW | **Missing power milling chuck** | Kennametal/Schunk power milling chucks (e.g., TENDO) are distinct from standard milling chucks and offer higher gripping force for heavy milling. |

---

## 5. SHANK & OVERHANG (toolHolders.ts lines 49-58)

### What is correct

- Metric shank sizes (6, 8, 10, 12, 16, 20, 25, 32) cover standard Weldon/cylindrical shanks.
- Imperial sizes (1/4", 3/8", 1/2", 5/8", 3/4", 1", 1-1/4") cover US standard.
- Overhang ratios (2xD to 6xD+) are the correct way to classify stickout.

### Issues found

| Severity | Item | Detail |
|----------|------|--------|
| HIGH | **Overhang is not connected to deflection** | The overhang class is selected but never feeds into the `DeflectionRequest` in `sfc.ts`. The stickout value should be calculated as `overhang_ratio * tool_diameter` and passed to the deflection engine. Currently it is purely decorative. |
| MEDIUM | **Missing 3mm and 4mm shanks** | Common micro-endmill shank sizes (3mm, 4mm) are absent. These are critical for mold/die and medical machining. |
| MEDIUM | **No tolerance class** | Shank tolerance (h6 for shrink fit, h7 for collet) affects holder compatibility. |
| LOW | **Standard overhang should be 2.5xD** | The "standard" overhang ratio is listed as 3xD. Industry convention is 2.5xD for best rigidity-to-reach balance. 3xD is already in the "moderate reach" territory. |

---

## 6. INSERT SYSTEM (toolHolders.ts lines 60-108)

### What is correct

- Grade categories (roughing, medium, finishing, super-finishing) are a correct abstraction.
- Coating list is reasonable, including TiCN (which is missing from the main tools.ts coatings).
- Insert geometries follow ISO nomenclature correctly: CNMG (80deg neg.), DNMG (55deg neg.), TNMG (60deg triangle), VNMG (35deg neg.), CCMT/DCMT (positive rake), APKT/RPMT/SPMT (milling inserts).
- Nose radius values are realistic (0.2-3.0mm range).

### Issues found

| Severity | Item | Detail |
|----------|------|--------|
| **CRITICAL** | **Insert grade is not an ISO grade** | "Roughing/Medium/Finishing/Super-Finishing" are application categories, not grades. An ISO grade is like Sandvik GC4325 (P25 equivalent) or Kennametal KC730 (P30 equivalent). The ISO P01-P50, M01-M40, K01-K30 classification determines the carbide toughness/hardness balance. Without actual grade numbers, the SFC engine cannot look up the correct Kc (specific cutting force) or recommended speed ranges. |
| **CRITICAL** | **No feed/speed range per insert** | Each insert grade+geometry combination has a manufacturer-specified feed range (e.g., fn = 0.1-0.4 mm/rev for CNMG roughing) and speed range (e.g., Vc = 200-350 m/min for P20 in 4140). Without these, the calculator is just guessing. |
| HIGH | **WNMG description wrong** | Line 99: WNMG is described as "80deg trigon" -- WNMG is an 80-degree trigon (3 usable corners on a triangle-like shape), but the standard description should say "trigon" not "80 deg trigon". The included angle for W-style is 80 degrees, so the description is partially right, but the geometry is a modified triangle, not a rhombic. |
| HIGH | **No SNMG, RCMT** | SNMG (square, 4 cutting edges, very common for roughing) and RCMT (round positive, common for profiling) are missing. SNMG is one of the most economical roughing inserts. |
| HIGH | **No insert size designation** | The geometries are listed by shape letter only. A CNMG comes in many sizes: 120404, 120408, 120412, 160608, 190612. The size determines max depth of cut and feed range. |
| HIGH | **Milling inserts mixed with turning** | APKT, RPMT, SPMT are milling inserts but they are in the same flat list as turning inserts (CNMG, DNMG, etc.). The UI shows all of them regardless of whether the user is in mill or lathe mode. The `InsertSelector` component has no mode-awareness. |
| MEDIUM | **No chipbreaker designation** | Sandvik uses -PM (medium), -MF (light finishing), -GR (roughing). Kennametal uses -MP, -FP, -RP. The chipbreaker determines the feed/depth window. |
| MEDIUM | **Missing wiper inserts** | Wiper-geometry inserts (e.g., Sandvik -WMX, -WF) allow 2x feed at the same surface finish. They are extremely common and their absence means the surface finish calculator will underpredict achievable finish at high feeds. |

---

## 7. TOOL ASSEMBLY CONCEPT (MISSING)

### Critical architectural gap

There is **no tool assembly model**. In the real world, a complete cutting tool assembly is:

```
Spindle Taper (e.g., CAT40)
  -> Holder (e.g., ER32 Collet Chuck, BT40 shank)
    -> Collet/Adapter (e.g., ER32 collet, 12mm bore)
      -> Cutting Tool (e.g., 12mm 4-flute endmill)
```

**Why this matters for SFC accuracy:**

1. **Stickout**: The effective stickout = holder gage line to tool tip. This requires knowing the holder length, collet/adapter depth, and tool overall length. Currently, overhang is a vague ratio.

2. **Runout stack-up**: Total runout = taper runout + holder runout + collet runout. A CAT40 ER32 assembly has ~15um TIR. An HSK-A63 shrink fit has ~3um TIR. This 5x difference directly affects tool life by 30-50%.

3. **Assembly weight/balance**: At high RPM, the assembly mass determines centrifugal force on the spindle bearings. An HSK-A63 ER32 + 12mm endmill weighs ~1.2kg. This affects maximum safe RPM.

4. **Rigidity chain**: The weakest link in the rigidity chain determines the deflection limit. A 12mm endmill in a side-lock holder on a CAT40 has fundamentally different rigidity than the same endmill in a shrink-fit on HSK-A63.

**Currently the system treats the holder, insert, and tool as independent selections with no physical relationship.**

---

## 8. SmartToolSelector.tsx REVIEW

### What works well

- The compatible/incompatible split with reasons is excellent UX -- this is exactly how a real tool recommendation engine should work.
- The coating color badge gives quick visual feedback.
- Collapsing incompatible tools avoids clutter.
- Showing full tool details on selection (substrate, coating, diameter, flutes, helix, max doc, manufacturer, max RPM) is good.

### Issues found

| Severity | Item | Detail |
|----------|------|--------|
| HIGH | **No positive-compatibility check** | `getCompatibleTools()` only checks negative conditions (avoidMaterials, avoidFor). It does not verify that the tool's `suitedMaterials` includes the selected material group. A tool with empty `avoidMaterials` and `suitedMaterials: ["P"]` would show as compatible for ISO S (superalloys), which is wrong. |
| HIGH | **No tool-to-operation category mapping** | A turning insert should never appear when the user is in milling mode, and vice versa. Currently the filter is purely on `suitedOperations` string matching, which is fragile -- if a turning insert happened to list "finishing" and a milling operation used "finishing", it would appear as compatible. |
| MEDIUM | **No ranking** | Compatible tools are shown in array order. They should be ranked by suitability: exact coating match > substrate match > manufacturer recommendation. |
| LOW | **No diameter filtering** | If the user's operation defaults suggest a 50mm face mill, showing 6mm and 8mm endmills as "compatible" is misleading. There should be a diameter relevance filter. |

---

## 9. ToolHolderSelector.tsx REVIEW

### What works well

- Mode-aware taper filtering (mill vs lathe) is correct.
- Mode-aware holder filtering (lathe categories separated) is correct.
- Imperial/metric shank diameter switch is good.
- Overhang class buttons with ratio labels are clear.

### Issues found

| Severity | Item | Detail |
|----------|------|--------|
| **CRITICAL** | **Holder selection has no downstream effect** | The `ToolHolderConfig` is stored in state but never passed to the calculation request (`SfcCalculateRequest` in sfc.ts). The taper, holder type, shank diameter, and overhang have zero influence on the SFC output. This makes the entire holder panel decorative. |
| HIGH | **No holder-taper compatibility** | Not all holders are available in all tapers. A boring head is typically BT40/CAT40+, not BT30. Shell mill arbors have specific bore sizes that depend on the taper. No validation exists. |
| MEDIUM | **Shank diameter not linked to tool** | When a user selects a 12mm endmill and then picks a 6mm shank diameter in the holder panel, there is no warning. |

---

## 10. InsertSelector.tsx REVIEW

### What works well

- Grade selection with description is helpful.
- Coating temperature display and color dot are nice touches.
- Geometry dropdown with description text is informative.

### Issues found

| Severity | Item | Detail |
|----------|------|--------|
| **CRITICAL** | **InsertSelector is always shown for all modes** | Looking at `SfcCalculatorPage.tsx` line 496-509, the InsertSelector appears whenever `modeConfig.showToolHolder` is true. This means it shows for milling mode too, where the user might be using a solid carbide endmill (not an indexable tool). There should be a check: only show InsertSelector when the selected tool is of type "insert" or "face_mill". |
| HIGH | **Insert config has no downstream effect** | Like the holder, the `InsertConfig` is not passed to the calculation. The nose radius from the geometry (critical for surface finish via `SurfaceFinishRequest.nose_radius`) is not wired through. |
| HIGH | **No geometry-operation filtering** | CNMG/WNMG/DNMG are turning inserts. APKT/RPMT/SPMT are milling inserts. The selector shows all 10 regardless of machine mode. |
| MEDIUM | **Duplicate coating data** | `COATING_TYPES` in toolHolders.ts partially duplicates `COATINGS` in tools.ts with different structures and slightly different data. The diamond CVD maxTemp matches (700C) but there is no PCD or AlCrN in the toolHolders list. This will cause confusion if one is updated without the other. |

---

## 11. CompatibilityValidator.tsx REVIEW

### What works well

- Red/yellow/green severity levels are correct.
- Coating-material cross-check is good.
- Machine RPM and power checks against calculated requirements are exactly right.
- HSS vs hardened steel check is correct.
- Suggestion buttons with actionable fixes are excellent UX.

### Issues found

| Severity | Item | Detail |
|----------|------|--------|
| HIGH | **No holder/assembly validation** | The validator checks material-tool and machine-tool compatibility but ignores the holder entirely. A drill chuck at 25,000 RPM should be flagged. A side-lock holder for finishing operations (poor runout) should warn. |
| MEDIUM | **No ceramic tool check** | There is no check for ceramic tools (e.g., SiAlON for Inconel, Si3N4 for cast iron). Ceramic tools require no coolant (thermal shock risk) and specific speed ranges. |
| MEDIUM | **No coolant-coating check** | Through-tool coolant with PCD is critical. DLC with heavy flood coolant at high pressure can cause delamination. These interactions are not checked. |

---

## 12. SUMMARY OF PRIORITIES

### Must-fix (blocks SFC accuracy)

1. **Wire holder/insert config into the calculation** -- currently decorative.
2. **Add tool assembly model** (taper + holder + collet + tool = assembly with total stickout, runout, weight).
3. **Expand the tool database** from 14 to at least 60 tools covering all operation categories.
4. **Add proper insert grades** (ISO P01-P50 style) with feed/speed ranges.
5. **Add flute length, shank diameter, overall length, corner radius** to `CuttingToolEntry`.
6. **Fix getCompatibleTools** to check `suitedMaterials.includes(materialGroup)`, not just avoidMaterials.
7. **Mode-filter insert geometries** (turning vs milling inserts).

### Should-fix (affects reliability)

8. Add HSK-A100, HSK-F63, Capto C3-C8, KM/PSC tapers.
9. Add ER collet size sub-selection with clamping range validation.
10. Add TIR (runout) per holder type and feed it into surface finish calculation.
11. Add holder-tool compatibility validation (shank diameter, Weldon flat, shrink-fit tolerance).
12. Separate tool `maxRpm` concept or replace with balance grade.
13. Add chipbreaker designation for turning inserts.
14. Deduplicate coating data between tools.ts and toolHolders.ts.

### Nice-to-have (improves completeness)

15. Add nACo, ZrN, TiCN standalone coatings.
16. Add micro-endmill shank sizes (3mm, 4mm).
17. Add wiper insert geometries.
18. Add SNMG, RCMT insert shapes.
19. Add gage line dimensions per taper for precise stickout calculation.
20. Add pull stud / retention knob specification.
