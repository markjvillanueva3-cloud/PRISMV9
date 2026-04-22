# PRISM v9 Tool Selection System -- Cutting Tool Sales Rep Review

**Reviewer Perspective**: Senior Technical Sales Engineer, 15+ years in cutting tool applications (Sandvik Coromant / Kennametal / ISCAR background)

---

## Executive Summary

PRISM v9's tool selection and recommendation system demonstrates a **solid foundational understanding** of cutting tool technology. The ISO material group classification (P/M/K/N/S/H), the coating-material compatibility matrix, and the insert geometry library all reflect genuine machining knowledge rather than generic placeholder data. However, the system has significant gaps that would prevent me from recommending it to my customers in its current form. The tool database is too small and too generic to be useful for real applications, the grade system is oversimplified compared to how manufacturers actually classify inserts, and there is no tool life prediction, cost-per-part analysis, or manufacturer catalog integration -- all of which are table-stakes features for a tool selection system I would endorse.

---

## SECTION 1: Tool Database Realism

### What is correct

**Coating data is broadly accurate.** The `COATINGS` record in `tools.ts` (lines 26-36) captures real physical properties:

- TiAlN at 800C max temperature, 3300 HV hardness -- realistic (published range: 3200-3500 HV, oxidation onset ~800C)
- AlTiN at 900C, 3400 HV -- correct, the higher aluminum content raises oxidation resistance vs TiAlN
- DLC at 350C, 5000 HV, suited only for non-ferrous (N) -- absolutely correct; DLC graphitizes above ~350C and is exclusively used on aluminum, copper, composites
- PCD at 8000 HV, avoid ferrous -- correct; carbon diffuses into iron-group metals at cutting temperatures
- CBN at 1200C, 4500 HV, suited for H and K groups -- correct application mapping
- CVD (TiCN+Al2O3) at 1000C, suited for P/K, avoid N/S -- this is the standard Sandvik GC4325-type coating philosophy and it is correct

**ISO material group usage is correct throughout.** The `suitedFor`/`avoidFor` arrays on coatings and the `suitedMaterials`/`avoidMaterials` on tools properly use P/M/K/N/S/H classification per ISO 513. This is exactly how we categorize application areas in real catalogs.

**Insert geometry designations are real ISO codes.** The `INSERT_GEOMETRIES` array (lines 97-108 of `toolHolders.ts`) uses genuine ISO 1832 insert designations: CNMG, WNMG, DNMG, TNMG, VNMG, CCMT, DCMT. The included angle descriptions (80 deg rhombic for CNMG, 55 deg for DNMG, 35 deg for VNMG) are all correct. The rake angle designations (N = negative, C/D with positive) are correct.

**Nose radius values are realistic.** CNMG at 0.8mm, DNMG at 0.4mm, DCMT at 0.2mm -- these correspond to real ISO insert specifications (the 08/04/02 suffix in the designation).

### What is wrong or missing

**CRITICAL: The tool database has only 13 entries.** A real shop needs hundreds to thousands. Even a focused MVP should have 50-100 tools covering the most common size ranges per tool type. Currently:
- 5 endmills (6-16mm) -- no 1mm, 2mm, 3mm, 4mm, 20mm, 25mm sizes
- 2 face mills (50mm, 63mm) -- no 32mm, 40mm, 80mm, 100mm, 125mm options
- 2 drills (8mm, 10mm) -- no 3mm through 6mm, no 12mm through 25mm range
- 2 turning inserts -- two inserts cannot cover roughing + finishing across 6 ISO material groups
- 1 thread mill -- a single M10 thread mill is essentially useless as a "library"

**No indexable milling inserts tied to the face mills.** The 50mm and 63mm face mills list a coating (CVD, TiAlN) but real face mills use replaceable inserts. The face mill body does not have a coating -- the inserts do. The current model conflates solid tools with indexable tools.

**No boring bars, no reamers, no taps, no chamfer mills, no ball endmills, no bull-nose endmills, no U-drills, no gun drills.** These are all fundamental tool categories that any CNC programming system must support.

**Manufacturer names are used but no catalog numbers.** The tools reference "Sandvik", "Kennametal", "OSG", etc., but provide no real ordering codes (e.g., Sandvik R390-11T308M-PM 4340, or Kennametal KCPM15). Without ordering codes, a user cannot cross-reference or verify the recommendation against the actual manufacturer catalog.

**WNMG description is wrong.** Line 99: `WNMG` is described as "80 deg trigon, neg. rake -- finishing". WNMG is actually an 80-degree trigon (hexagonal with alternating 80/100-degree corners), which is correct geometrically, but calling it a "finishing" insert is misleading. WNMG is a general-purpose insert used for medium to roughing operations. The W-shape gives 6 cutting edges and is economical for roughing. Finishing is typically DNMG, VNMG, or DCMT with smaller nose radii.

**APKT description says "Square, pos. rake -- milling insert" but APKT is not square.** APKT is a parallelogram (85-degree included angle). SPMT is square. This is a factual error in the ISO 1832 decoding.

---

## SECTION 2: Insert Grades and Coatings

### What is correct

The `INSERT_GRADES` array (roughing, medium, finishing, super_finishing) captures the correct conceptual hierarchy that every insert manufacturer uses. Sandvik calls these -PR, -PM, -PF; Kennametal uses -RN, -MN, -FN; ISCAR uses SUMO-TEC designations. The concept is right.

The `COATING_TYPES` in toolHolders.ts lists 7 coatings with reasonable max temperatures. The color coding (TiN = gold, TiCN = purple/gray-violet, AlTiN = silver, diamond CVD = white, CBN = dark) matches the real visual appearance of these coatings.

### What is wrong or missing

**CRITICAL: No mapping between insert grade and material group.** This is the single most important piece of knowledge a cutting tool sales engineer brings to a customer. The grade IS the recommendation. For example:
- Sandvik GC4325 = first-choice grade for ISO P steel turning
- Sandvik GC1125 = first-choice for ISO M stainless finishing
- Kennametal KC5010 = first-choice for ISO K cast iron
- ISCAR IC8250 = universal grade for ISO P

The current system has four generic grades (roughing/medium/finishing/super_finishing) with NO material affinity. A user selecting "Roughing" gets no guidance on whether that grade works in 4140 steel vs. 316 stainless vs. Inconel 718. This is the equivalent of a pharmacy that lets you choose "strong", "medium", or "mild" pills with no indication of what disease they treat.

**No carbide grade classification (ISO P10/P20/P30/K10/K20 etc.).** The ISO application code system (e.g., P25 = medium turning in steel, K10 = finishing in cast iron) is universally used by all manufacturers and is missing entirely.

**The InsertSelector and SmartToolSelector are completely disconnected.** Looking at `SfcCalculatorPage.tsx` lines 490-508: `SmartToolSelector` selects a `CuttingToolEntry` from the tools database, while `InsertSelector` manages a separate `InsertConfig` (grade + coating + geometry). But `InsertConfig` is never used to filter or influence the tool selection, and the `CuttingToolEntry` does not reference the insert configuration. These two components operate in parallel with no cross-talk. A user could select a CNMG roughing insert in the InsertSelector and simultaneously pick a finishing endmill in SmartToolSelector, and the system would not flag the contradiction.

**Coating duplication across two files.** `tools.ts` defines `COATINGS` with 9 entries (TiAlN, AlTiN, TiN, AlCrN, DLC, Uncoated, CVD, PCD, CBN). `toolHolders.ts` defines `COATING_TYPES` with 7 entries (uncoated, TiN, TiCN, AlTiN, TiAlN, Diamond CVD, CBN). These two lists partially overlap but use different structures, different IDs, and different property sets. AlCrN and PCD exist only in the tools.ts version. TiCN exists only in the toolHolders.ts version. This will confuse users and create data integrity issues.

---

## SECTION 3: Tool Holders and Taper Systems

### What is correct

**Taper types are real and properly scoped.** CAT 40/50, BT 30/40/50, HSK-A63, HSK-E40 for milling; VDI 25/40/50, BMT 55/65 for lathe; Morse 2/3 for both. This is a realistic set of spindle interfaces.

**The mode-based filtering is correct.** `getTapersForMode()` properly restricts VDI/BMT to lathe and CAT/BT/HSK to mill. Morse tapers being available in both modes is correct.

**Holder types are realistic.** ER Collet Chuck, Milling Chuck, Shrink Fit, Hydraulic Chuck, Side Lock (Weldon), Shell Mill Arbor, Boring Head, Drill Chuck -- these are all real holder categories. The lathe holders (OD Turning, ID Boring Bar, Grooving/Parting, Threading) are also correct.

**Shank diameter ranges are realistic.** Metric: 6-32mm. Imperial: 1/4" through 1-1/4". These cover the common range.

**Overhang classification is industry-standard.** Short (2xD or less), Standard (3xD), Long (4-5xD), Extra Long (6xD+). This matches the Sandvik recommendation that deflection issues begin above 4xD overhang.

### What is wrong or missing

**No link between taper and holder compatibility.** You cannot put an ER32 collet chuck on a CAT40 taper -- you need a CAT40-ER32 adapter. The system lets the user select any taper and any holder independently, with no validation that the combination exists. For example, selecting HSK-E40 + Shell Mill Arbor is physically impossible (HSK-E40 is for small, precision grinding spindles, not face milling).

**HSK sub-types are incomplete.** HSK-A63 and HSK-E40 are listed, but HSK-A100 (common on large VMCs), HSK-F63 (common on European 5-axis machines), and HSK-T (for turning centers with driven tools) are missing. Capto C3/C4/C5/C6/C8 (the Sandvik modular system now adopted as ISO 26623) is absent entirely -- this is a significant omission given its growing market share.

**BMT is listed but not connected to live tooling.** BMT (Base Mount Tooling) turrets on lathes can hold both static and driven (live) tools. The system does not distinguish between static and live tool positions, which matters enormously for cycle time and capability.

**No holder balance grade (G2.5, G6.3).** At spindle speeds above 10,000 RPM, holder balance becomes critical. The system tracks maxRpm on tools but does not flag that a shrink-fit holder at G2.5 is required at those speeds while a side-lock holder is unsafe.

**No gauge length / projection length.** The overhang classes (2xD, 3xD, etc.) are relative, but the system never calculates the actual projection in millimeters, which is needed for collision checking, deflection calculation, and tool library export to CAM.

---

## SECTION 4: Does the Selector Help Users Find the RIGHT Tool?

### What works

**The compatibility filter is the strongest feature.** `getCompatibleTools()` in `tools.ts` (lines 58-85) performs three-way validation:
1. Operation suitability (tool.suitedOperations vs. selected operation)
2. Material avoidance (tool.avoidMaterials vs. selected material group)
3. Coating avoidance (coating.avoidFor vs. selected material group)

This means a user selecting Aluminum (N group) will never see a TiAlN-coated endmill recommended -- and it correctly tells them WHY ("TiAlN coating not recommended for ISO N"). This is genuinely useful and matches how I would advise a customer.

**Incompatible tools are shown with reasons, not hidden.** The `SmartToolSelector` (lines 68-92) shows incompatible tools in a collapsed details section with explanatory text. This is excellent UX for learning -- a novice can understand why certain tools are wrong.

**Tool selection auto-populates parameters.** When a user picks a tool, `handleToolChange` (page line 184-192) automatically updates diameter, flute count, and substrate in the calculation parameters. This prevents mismatches.

### What does NOT work

**No ranking or recommendation scoring.** All compatible tools are shown in a flat list with no ordering. The system does not say "this is the BEST tool for your application" -- it says "here are some tools that won't break". A real tool selection engine should rank by:
- First choice: Optimal coating + geometry for material/operation combination
- Second choice: Acceptable but suboptimal
- Third choice: Will work but there is a better option

**No cutting data recommendations.** When I hand a customer a CNMG 120408 insert, I also hand them a starting Vc (cutting speed), fn (feed per revolution), and ap (depth of cut) specific to that insert grade in that material. The system computes speeds and feeds, but the tool selection provides no starting-point data that feeds into the calculator. The insert grade, which determines the recommended cutting speed range, is selected in a completely separate panel (InsertSelector) that does not communicate with the calculation engine.

**No application-specific tool recommendations.** For example:
- 316L stainless (ISO M) + pocket milling should recommend high positive rake, sharp edges, AlTiN coating, 3 flutes for chip evacuation
- Inconel 718 (ISO S) + profile milling should recommend AlCrN or ceramic, rigid setup, reduced speed
- 6061-T6 aluminum (ISO N) should recommend DLC or uncoated, polished flutes, high helix (45 deg+), single or 3 flutes

The system filters by group compatibility but does not make nuanced per-alloy recommendations.

**No "why this tool" explanation on compatible tools.** The incompatible section has reasons, but the compatible section shows no explanation of why a tool IS suitable. Adding a suitability score or brief rationale ("TiAlN coating excellent for steel at this speed range") would dramatically improve trust.

---

## SECTION 5: Tool Life Data

**Completely absent from the tool database.** The `CuttingToolEntry` interface has no tool life field. There is a `ToolLifeRequest`/`ToolLifeResult` type in `sfc.ts` (lines 101-113) suggesting the backend can compute tool life, but:

- No tool-specific Taylor constants (C, n) in the database
- No expected tool life per material/speed combination
- No cost-per-edge data
- No cost-per-part calculation

Tool life is the #1 metric my customers use to evaluate and compare tools. A tool that costs 50% more but lasts 3x longer is always the better buy. Without tool life data and cost-per-part analysis, this system cannot help users make economically rational tool choices.

---

## SECTION 6: Tool Comparison Capability

The `ComparisonView` component exists and supports up to 4 snapshots side-by-side. Looking at the page (lines 265-278), comparison entries are calculation snapshots (speed, feed, spindle RPM, etc.), not tool-to-tool comparisons. This means you can compare "12mm endmill in 4140 steel at 200 m/min" vs. "10mm endmill in 4140 steel at 250 m/min", which is useful.

However, there is no dedicated tool comparison feature that would show:
- Tool A vs. Tool B: coating temperature limit, recommended speed range, expected tool life, cost per edge
- Side-by-side insert grade comparison for the same material
- "Why is Tool A better than Tool B for this application" narrative

---

## SECTION 7: Manufacturer Catalog Integration

**None.** No API connections, no catalog cross-references, no ordering codes, no links to manufacturer websites, no QR codes to product pages. The manufacturer field on tools is a plain string used only for display.

For a tool sales representative, catalog integration is the difference between "interesting prototype" and "tool I recommend to customers." At minimum, I would need:
- Real manufacturer part numbers
- Links to manufacturer product pages
- Recommended cutting data from the manufacturer's published tables
- Grade equivalence tables (Sandvik GC4325 equivalent to Kennametal KC9125 equivalent to ISCAR IC8250)
- Availability/lead time data (stretch goal)

---

## SECTION 8: Specific Technical Errors Found

1. **APKT geometry (toolHolders.ts line 105)**: Described as "Square, pos. rake" -- APKT is a parallelogram (85 deg), not square. SPMT (line 107) is correctly described as square.

2. **WNMG application (toolHolders.ts line 99)**: Labeled as "finishing" -- WNMG is a general/roughing insert (W = 80 deg trigon with 6 edges for economy). DNMG or VNMG are the finishing geometries.

3. **Face mill coating (tools.ts lines 46-47)**: The 50mm and 63mm face mills have coatings assigned to the body. Face mill bodies are steel; the coating belongs to the indexable inserts. The data model conflates solid and indexable tooling.

4. **RPMT nose radius = 3.0mm (toolHolders.ts line 106)**: RPMT is a round insert, so nose radius = inscribed circle radius. RPMT 1204 has a 6mm IC, giving a 3mm radius -- this checks out for that specific size, but the system should note that round insert "nose radius" is actually the full insert radius and scales with size.

5. **No distinction between positive and negative rake in the tool model.** CNMG (negative) and CCMT (positive) have completely different cutting force profiles, power requirements, and stability needs. The calculator receives no information about rake angle.

---

## SECTION 9: What Would Make This a Tool I Recommend to Customers

### Must-Have (blocking adoption)

1. **Expand the tool database to 100+ entries** covering the 20 most common sizes per tool type, with real manufacturer part numbers.

2. **Connect insert grades to material groups.** Each grade must have a P/M/K/N/S/H applicability rating (first choice, second choice, not recommended) -- this is how every manufacturer catalog is organized.

3. **Wire InsertSelector into the calculation pipeline.** The insert grade, coating, and geometry must influence the recommended cutting speed, feed, and depth of cut. Currently they are decorative.

4. **Add tool life estimation to tool entries.** Even a simple Taylor tool life model (VT^n = C) with per-grade constants would be transformative.

5. **Validate taper-to-holder compatibility.** Prevent physically impossible combinations.

6. **Separate solid tools from indexable tools in the data model.** A face mill body + insert system is fundamentally different from a solid carbide endmill.

### Should-Have (competitive differentiation)

7. **Rank compatible tools by suitability score.** First choice / second choice / will work but suboptimal.

8. **Add cost-per-part calculation.** Tool cost / edges per insert / parts per edge = cost per part. This is how purchasing decisions are made.

9. **Include manufacturer-published cutting data per grade/material combination.** This is the core intellectual property of every tool manufacturer's catalog.

10. **Add Capto (ISO 26623) and KM modular tooling systems** to the taper list.

11. **Include balance grade (G2.5/G6.3) on holders** with RPM-based warnings.

12. **Add chip-breaker geometry to insert model.** The chip breaker (e.g., Sandvik -PM, -PR, -PF) determines chip control and is as important as the grade for turning operations.

### Nice-to-Have (market leadership)

13. **Manufacturer catalog API integration** (Sandvik CoroPlus API, Kennametal NOVO, ISCAR ITA).
14. **Grade equivalence cross-reference tables.**
15. **Tool assembly visualization** (holder + insert + taper = complete assembly with gauge length).
16. **Worn-tool compensation guidance** (when to offset, when to replace).
17. **QR code generation for reordering** at the machine tool.

---

## Final Verdict

**Score: 5.5/10 -- Promising foundation, not yet customer-ready.**

The system demonstrates genuine machining knowledge in its coating data, ISO material classification, and insert geometry library. The compatibility filter with explanatory rejection reasons is a genuinely good feature that most commercial systems lack. However, the tool database is an order of magnitude too small, the insert grade system is disconnected from material recommendations, there is no tool life or cost data, and the InsertSelector operates in a silo. A cutting tool sales representative needs to be confident that the system will guide users to the RIGHT tool, not just a VALID tool. Today, PRISM v9 filters out bad choices but does not actively recommend good ones.

The path from 5.5 to 8+ is clear and achievable: wire the insert system into the calculator, add material-specific grade recommendations, expand the database with real part numbers, and add tool life estimation. Those four changes would make this a system I would actively demonstrate to customers.

---

## Key Files Reviewed

- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\components\sfc\SmartToolSelector.tsx` -- Main tool selection UI with compatibility filtering
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\components\sfc\InsertSelector.tsx` -- Insert grade/coating/geometry selector (disconnected from tool selection)
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\components\sfc\ToolHolderSelector.tsx` -- Taper and holder selection with mode filtering
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\data\tools.ts` -- Tool database (13 entries) and compatibility engine
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\data\toolHolders.ts` -- Taper types, holder types, insert grades, coatings, geometries
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\pages\SfcCalculatorPage.tsx` -- Page-level wiring showing InsertConfig is unused in calculations
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\types\sfc.ts` -- Type definitions showing ToolLifeRequest exists but is not connected to tool data
