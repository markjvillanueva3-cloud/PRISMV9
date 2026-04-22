# PRISM v9 CAM Integration Review -- CAM Programmer Perspective

## Review Scope
Reviewed 6 primary files + supporting data/types/API files for completeness of CAM integration from a working CAM programmer's perspective (Mastercam/Fusion 360 daily user).

---

## FINDINGS

---

### 1. CAM Software Options -- Incomplete Coverage

**SEVERITY: HIGH**

**File:** `web/src/data/camSoftware.ts` (lines 25-80)

Present (5): Mastercam, Fusion 360, SolidCAM, HSMWorks, GibbsCAM

**Missing major CAM systems:**

| Missing System | Market Share / Relevance | Priority |
|----------------|--------------------------|----------|
| **NX CAM (Siemens)** | Dominant in aerospace/auto OEM shops. If someone is running NX, they have different post conventions and aggressive HSM strategies. | CRITICAL |
| **CATIA / Delmia (Dassault)** | Standard in aerospace primes (Boeing, Airbus). Different machining philosophy entirely. | CRITICAL |
| **Edgecam (Hexagon)** | Very popular in UK/EU job shops, strong turning integration. | HIGH |
| **ESPRIT (Hexagon)** | Major player in multi-axis and Swiss turning. Has its own knowledge-based machining. | HIGH |
| **PowerMill (Autodesk)** | The go-to for 5-axis mold & die. Separate from Fusion 360's CAM. Different strategies. | HIGH |
| **hyperMILL (OPEN MIND)** | Leading 5-axis CAM, huge in mold/die/aerospace. | HIGH |
| **BobCAD-CAM** | Very popular in small shops, especially in the US. Budget entry. | MEDIUM |
| **CAMWorks** | SOLIDWORKS-integrated, knowledge-based machining. Direct Mastercam competitor. | MEDIUM |
| **Cimatron** | Mold & die specific. Different approach to electrode and core/cavity work. | MEDIUM |
| **VERICUT** | Not CAM per se, but any serious shop runs VERICUT for NC verification. Should be a companion entry. | MEDIUM |

**Mastercam levels are wrong.** Mastercam no longer sells "Mill 2D" / "Mill 3D" as separate SKUs. Since Mastercam 2024, it is a unified product with "Mastercam" (base) and "Mastercam with Multiaxis" add-on. The levels should be:
- `standard` -- "Mastercam" (includes 2D+3D)
- `multiaxis` -- "Mastercam + Multiaxis"
- `mill_turn` -- "Mastercam Mill-Turn" (for live tooling lathes)

**Fusion 360 levels are partially wrong.** "Personal" no longer has manufacturing (since late 2024). It should be:
- `standard` -- "Fusion Manufacturing" (2.5D + turning)
- `mfg_ext` -- "Machining Extension" (3+2, 5-axis, probing)

**SolidCAM is underselling itself.** iMachining is one module. SolidCAM also has: HSR/HSM, Sim 5X, Swiss-Type, Mill-Turn. Presenting it as a single "iMachining" level misrepresents the product.

---

### 2. Feed Multiplier System -- Directionally Correct but Oversimplified

**SEVERITY: MEDIUM**

**File:** `web/src/data/camSoftware.ts` (feedMultiplier arrays)

The concept of adjusting feeds based on CAM software is sound -- different CAM packages do produce different toolpath engagement patterns. However:

**Problem A: Single scalar is too blunt.** A multiplier of 1.15 for SolidCAM iMachining is way too conservative. iMachining regularly runs 2-3x the conventional feed rate because it controls chip thickness via dynamic stepover. The multiplier should be context-dependent: roughing with iMachining might warrant 2.0-2.5x feed increase combined with 3-4x DOC increase and 8-12% WOC. The current system applies the same 1.15x to finishing passes where iMachining is not even used.

**Problem B: HSMWorks at 1.05 is arbitrary.** HSMWorks and Fusion 360 Manufacturing Extension use the same Autodesk HSM kernel. They should have identical multipliers.

**Problem C: No strategy-software cross-reference.** The feed multiplier does not vary by toolpath strategy. Adaptive Clearing in Fusion 360 vs a standard 2D Pocket in Fusion 360 should not share the same CAM multiplier. The toolpath strategy multiplier in `toolpathStrategies.ts` partially covers this, but the two systems don't cross-reference.

**Recommendation:** Replace the single `feedMultiplier: number[]` with a per-strategy multiplier map:
```ts
strategyMultipliers: Record<string, { feed: number; speed: number; doc: number; woc: number }>
```

---

### 3. Toolpath Strategies -- Good Foundation, Missing Key Strategies

**SEVERITY: HIGH**

**File:** `web/src/data/toolpathStrategies.ts` (lines 26-248)

**What is correct:**
- Adaptive Clearing multipliers (DOC 2.5x, WOC 0.15, Feed 1.3x) are realistic for a conservative starting point
- Trochoidal milling parameters (DOC 3.0x, WOC 0.1) are in the right ballpark
- Separation into roughing/finishing/holemaking/secondary is sound
- Turning strategies (rough OD, finish OD, rough ID, finish ID, grooving) cover basics

**Missing strategies that any CAM programmer would expect:**

| Missing Strategy | Category | Why It Matters |
|-----------------|----------|----------------|
| **Rest Machining / Remachining** | roughing | Every 3D part needs it. You rough with a big tool, then rest-machine with a smaller tool. This is CAM 101. |
| **Parallel / Raster Finishing** | finishing | The most common 3D finishing strategy. Missing entirely. |
| **Flowline Finishing** | finishing | Critical for blade/impeller work. |
| **Spiral / Morph Spiral** | finishing | Common for circular features. |
| **High-Feed Milling** | roughing | Different from adaptive -- uses special high-feed cutters at very shallow DOC but extreme feed rates. |
| **Thread Milling** | holemaking | Listed in machine modes but not in toolpath strategies. |
| **Tapping** | holemaking | Same -- present in machine modes, missing from strategies. |
| **Helical Bore / Helical Interpolation** | holemaking | Critical for oversized holes without a boring bar. |
| **Circular Pocket** | roughing | Different from rectangular pocket -- round boss/pocket machining. |
| **Slot Milling** | roughing | Listed as a machine mode sub-operation but not as a toolpath strategy. |

**Multiplier concern -- Trochoidal milling feedMultiplier: 1.4 and speedMultiplier: 1.15:**
The feed multiplier is fine (table feed increases due to circular path), but the speed multiplier of 1.15 is too aggressive for many materials. In stainless steel or titanium, trochoidal milling typically runs at the same SFM as conventional -- the advantage is all in the chip thinning and reduced radial engagement. Pushing SFM 15% higher in these work-hardening materials will kill tool life.

**Plunge roughing feedMultiplier: 0.5 is wrong for this context.** Plunge roughing feed rate refers to the Z-axis plunge feed, which is typically 50-75% of the radial feed. But the multiplier system here is applying 0.5 to the calculated table feed rate, which is conceptually different. In plunge roughing, you need to track plunge feed per revolution, not table feed.

---

### 4. CamStrategyPage -- Disconnected from the SFC Calculator

**SEVERITY: CRITICAL**

**File:** `web/src/pages/CamStrategyPage.tsx`

This page has a fundamental UX problem: **it is a completely separate page from the SFC Calculator, with its own material/operation selectors, its own API call, and it dumps raw JSON.**

From a CAM programmer's workflow perspective, this is backwards. My workflow is:
1. I have a part (material, features, tolerances)
2. I pick operations and toolpath strategies
3. I get speeds and feeds for those strategies
4. I generate or validate G-code via post-processor

The CamStrategyPage (lines 7-17) has hardcoded `OPERATIONS` and `MATERIALS` arrays that are **completely separate** from the rich data in `data/materials.ts` and `data/operations.ts` that the SFC Calculator uses. A user could get different results on two different pages for the same job.

**The results display (line 111-113) is raw JSON dump.** No CAM programmer wants to read `JSON.stringify(result, null, 2)`. I want to see:
- Recommended RPM and feed rate clearly displayed
- Chip load per tooth
- Metal removal rate (MRR) in cubic inches/min or cm3/min
- Estimated cycle time
- Power requirement so I know if my machine can handle it
- Surface finish prediction (Ra)

**The Simulation tab (lines 119-129) is a plain textarea.** There is no actual simulation engine. No toolpath visualization. No stock material removal. This is a placeholder that will mislead users.

**The Collision Detection tab (lines 131-136) is entirely empty.** Just a button that says "Upload Toolpath" with no backend.

**Recommendation:** Merge CamStrategyPage functionality into the SFC Calculator flow as a "Strategy Advisor" panel, or remove it and redirect users to the SFC Calculator which already handles toolpath strategy selection properly.

---

### 5. Post Processor Generator Page -- Genuinely Impressive

**SEVERITY: LOW (mostly praise with some gaps)**

**File:** `web/src/pages/PpgPage.tsx` + supporting components

This is the strongest piece of the CAM integration. The architecture is solid:
- Controller selector with real controller brands (Fanuc, Siemens, Haas, Mazak, Okuma, Heidenhain, Mitsubishi, etc.)
- Template-based G-code generation
- Live G-code editor with syntax awareness
- Preview and validation panels
- Diff comparison between controllers
- Advanced enhancer for optimization
- Keyboard shortcuts (Ctrl+S, Ctrl+Shift+G, Ctrl+D)
- Responsive 3-column layout

**Gaps:**

A. **No machine-specific cycle support selection.** Different controllers support different canned cycles. Fanuc uses G73/G83 for peck drilling; Siemens uses CYCLE83; Haas uses G73/G83 with different Q word formats; Mazak conversational uses DRILL with sub-params. The PPG should let me choose which canned cycles to use and how to format them.

B. **No safe-start / end-of-program block customization.** Every shop has a specific program start block (G90 G80 G40 G49 G21 M05 etc.) and program end block. This should be configurable per controller and saveable as a shop standard.

C. **No tool change macro support.** Many shops need custom M-code sequences around tool changes (probe tool length, check coolant, etc.). The PPG should have a "tool change template" section.

D. **No subprogram / macro support.** No way to generate parametric programs or use subprogram calls (M98/M99, G65 macro calls).

---

### 6. Part-to-Feeds Pipeline -- Almost There, Missing Connective Tissue

**SEVERITY: HIGH**

**Question: Can I easily go from "I have this part" to "here are my speeds and feeds for this toolpath"?**

The SFC Calculator page (`SfcCalculatorPage.tsx`) actually has a remarkably complete pipeline:
1. Machine mode selection (13 modes!)
2. Material selection with hardness
3. Sub-operation selection
4. CAM software selection with feed adjustment
5. Cutting priority (runtime/finish/balanced/AI)
6. Toolpath strategy with DOC/WOC/feed/speed multipliers
7. Tool selection
8. Tool holder + insert configuration
9. Fixture selection
10. Machine selection with RPM/power validation
11. Calculate with composite multipliers
12. Results display, comparison, history, charts, PDF export

**This is a genuinely strong pipeline.** The composite multiplier calculation at line 251-252 correctly chains: `priorityMult * camMult * strategyMult`.

**What is missing from the pipeline:**

A. **No feature-based input.** I cannot say "I have a 2" deep pocket, 4" x 6", with 0.010" corner radii." Instead I manually set DOC/WOC. A real CAM integration would let me define the feature geometry and derive the optimal number of passes, step-downs, and tool selection automatically.

B. **No multi-operation sequence.** Real parts need multiple operations in sequence: face, rough pocket, semi-finish, finish, drill holes, chamfer edges. There is no way to plan an operation sequence and get aggregate cycle time. The comparison view (max 4 entries) is a workaround but not a proper operation sheet.

C. **No roughing-to-finishing transition.** When I select "Adaptive Clearing" for roughing, the system should automatically suggest a finishing strategy and calculate the remaining stock for the finish pass.

D. **No stock-to-finish allowance chain.** The stock dimensions panel exists but is not connected to the strategy calculation. If I have 6" of material and need to remove 5.5" to net shape, the system should calculate how many roughing passes and what the finish allowance should be.

---

### 7. Missing CAM Integration Features

**SEVERITY: HIGH to CRITICAL (depending on feature)**

| Feature | Severity | Description |
|---------|----------|-------------|
| **Tool Library Sync** | CRITICAL | No import/export of tool libraries. Every CAM programmer has hundreds of tools defined in Mastercam/Fusion. I need to import my `.mcam-tooldb` or Fusion tool library JSON and get feeds calculated for MY actual tools, not generic catalog entries. |
| **Operation Sheet / Setup Sheet Generation** | CRITICAL | The PDF export is single-calculation only. I need a multi-operation setup sheet showing: all ops in sequence, tool list, total cycle time, stock removals per op, fixture callouts. This is what the machine operator actually reads. |
| **NC Verify / Material Removal Simulation** | HIGH | The Simulation tab on CamStrategyPage is empty. Even a basic 2.5D stock removal visualization (like what Fusion 360 shows) would be valuable. Full VERICUT-level simulation is out of scope, but basic gouge/collision detection is expected. |
| **G-code Viewer / Backplot** | HIGH | **Should absolutely exist.** The PPG has a "GcodePreview" component but it appears to be text-based. A proper backplot should show XY/XZ/YZ orthographic views of the toolpath with rapid moves in red and cutting moves in blue. This is standard in every CAM package and many free G-code viewers (e.g., NC Viewer). |
| **Tool Change Time Estimation** | MEDIUM | ATC data exists (`controllers.ts` line 59-76) but is not used in cycle time calculation. Tool-to-tool time for a side mount arm is ~3-4 sec; a carousel is ~6-8 sec. This matters for multi-tool jobs. |
| **Coolant Strategy per Operation** | MEDIUM | Coolant is a single dropdown. Should support: through-spindle high pressure (with bar pressure), flood, mist, air blast, MQL (minimum quantity lubrication) with specific settings. MQL is increasingly required in aerospace and affects cutting speed recommendations. |
| **Work Coordinate System (WCS) Setup** | MEDIUM | No concept of G54/G55/G56 work offsets. Multi-setup parts need WCS management. |
| **Probing Integration** | LOW | Modern shops use on-machine probing (Renishaw, Blum) for part setup and in-process measurement. No mention of probing cycles. |
| **DXF/STEP Import for Feature Recognition** | LOW | Nice-to-have: import a STEP file and auto-detect pockets, holes, profiles for automatic operation planning. |

---

### 8. Toolpath Strategy Selector UX -- Good but Needs Tooltips

**SEVERITY: LOW**

**File:** `web/src/components/sfc/ToolpathStrategySelector.tsx`

The UI is clean. Strategies grouped by category with color coding is good. The multiplier display (`DOC x2.5 WOC x0.15 F x1.3`) is exactly what a CAM programmer wants to see at a glance.

**Minor issues:**
- No tooltip explaining what the multipliers mean for someone new to the concept
- No visual indication of which strategies require specific CAM software levels (the `minCamLevel` field exists in the data but the UI does not check or display it)
- The `minCamLevel` values reference Mastercam-specific levels (`mill_3d`). If I select Fusion 360, these gates don't apply correctly -- Fusion's "Manufacturing Extension" is the equivalent, but the string matching won't work.

---

### 9. Controller Data -- Solid but Missing Important Details

**SEVERITY: MEDIUM**

**File:** `web/src/data/controllers.ts`

Good coverage of major controller brands. Spindle presets are realistic (11.2kW belt drive, 30kW gearhead, etc.). ATC presets cover the common configurations.

**Missing:**
- **No rapid traverse rate per controller.** Fanuc machines typically rapid at 30m/min on X/Y, Haas at 25.4m/min. This directly affects cycle time estimates for rapid moves.
- **No work envelope / axis travel.** Without knowing the machine's XYZ travel limits, you cannot validate that the part fits.
- **No axis count.** The machine selector uses `requiredAxes` but the controller data doesn't specify axis count. A 5-axis machine with a Fanuc 31i-B5 is very different from a 3-axis VMC with the same controller.
- **No feed rate limits.** Controllers have maximum programmable feed rates. Haas limits IPM on certain axes.

---

### 10. Turning-Specific Gaps

**SEVERITY: MEDIUM**

The turning strategies are minimal compared to milling. Missing:
- **Constant Surface Speed (CSS / G96) vs constant RPM (G97):** This is fundamental to turning. The system should recommend CSS for most turning operations and automatically calculate the speed range based on OD min/max.
- **No nose radius compensation (G41/G42 equivalent for turning: G41/G42 or TNRC):** This affects the actual toolpath and finish.
- **No threading cycles.** G76 (Fanuc) threading cycle is missing from strategies, despite "threading" being a machine mode.
- **No chip breaking strategy for ID boring.** Deep ID work needs peck boring or oscillation.
- **Live tooling operations.** Mill-turn is listed but no strategies for cross-drilling, off-center milling, or C-axis contouring.

---

## SUMMARY SCORECARD

| Area | Score | Notes |
|------|-------|-------|
| CAM Software Coverage | 4/10 | Only 5 packages, missing major players, stale license tiers |
| Toolpath Strategy Data | 6/10 | Good foundation, missing ~10 important strategies, some incorrect multipliers |
| Feed Multiplier Realism | 5/10 | Correct concept, too simplistic, needs per-strategy granularity |
| Post Processor Generator | 8/10 | Best component. Real controllers, live editor, validation, diff view |
| Part-to-Feeds Pipeline | 7/10 | SFC Calculator flow is strong, but no multi-op sequencing |
| CAM Strategy Page | 3/10 | Disconnected, raw JSON output, placeholder tabs |
| Missing Integrations | 3/10 | No tool library sync, no operation sheets, no backplot, no NC verify |
| Turning Support | 4/10 | Bare minimum, no CSS, no threading cycles, no live tooling |

**Overall CAM Integration Maturity: 5/10 -- "Promising foundation, not yet usable for production CAM programming"**

---

## TOP 5 PRIORITY RECOMMENDATIONS

1. **CRITICAL -- Merge or retire CamStrategyPage.** It duplicates SFC Calculator functionality with weaker data, dumps raw JSON, and has empty placeholder tabs. Either absorb its unique features (simulation, collision check) into SFC Calculator or delete it.

2. **CRITICAL -- Add tool library import/export.** Without this, no CAM programmer will switch from their existing workflow. Support Mastercam `.mcam-tooldb`, Fusion 360 tool library JSON, and a generic CSV format at minimum.

3. **HIGH -- Add a G-code backplot viewer.** Parse G-code into XYZ segments and render with a canvas/WebGL viewer. Show rapids in red, cutting moves per-tool in distinct colors. This is table stakes for any tool that touches G-code.

4. **HIGH -- Add multi-operation sequence planning.** Let users define a sequence of operations (face -> rough pocket -> finish pocket -> drill holes -> chamfer) and generate an aggregate setup sheet with total cycle time, tool list, and per-op parameters.

5. **HIGH -- Expand CAM software list to at least 12 packages and fix the licensing tiers.** NX, CATIA, PowerMill, hyperMILL, Edgecam, ESPRIT, CAMWorks are all required for credibility with professional CAM programmers.
