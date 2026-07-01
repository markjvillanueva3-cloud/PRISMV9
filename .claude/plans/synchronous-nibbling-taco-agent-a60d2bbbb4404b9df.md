# hyperMILL Formula Registration Audit Plan
## PRISM Manufacturing Science Audit — FormulaRegistry + AlgorithmRegistry Coverage
**Date:** 2026-04-03
**Auditor:** Claude (Manufacturing Science Auditor mode)
**Scope:** 14 HYPERMILL_FORMULAS in hypermill-speed-feed-catalog.ts vs. FormulaRegistry (499 entries) + AlgorithmRegistry (51 entries)

---

## EVIDENCE BASE (Files Examined)

- `H:/prism/mcp-server/src/data/hypermill-speed-feed-catalog.ts` — source of HYPERMILL_FORMULAS array (IDs 1–14)
- `H:/prism/registries/FORMULA_REGISTRY.json` — 16,468 lines, main registry file
- `H:/prism/mcp-server/src/registries/FormulaRegistry.ts` — loads FORMULA_REGISTRY.json + BUILT_IN_FORMULAS
- `H:/prism/mcp-server/src/registries/AlgorithmRegistry.ts` — 51 algorithms
- `H:/prism/mcp-server/src/engines/HyperMillSafetyHooks.ts` — negative allowance validator
- `H:/prism/mcp-server/src/engines/HyperMillStrategyEngine.ts` — strategy selection
- `H:/prism/mcp-server/src/engines/StepoverOptimizationEngine.ts` — barrel/scallop formulas
- `H:/prism/mcp-server/src/engines/CrossCamNovelAlgorithms.ts` — MAXX + barrel cutter calculations
- `H:/prism/mcp-server/src/engines/AdvancedMillingStrategiesEngine.ts` — constant_scallop implementation
- `H:/prism/mcp-server/src/physics/constants.ts` — NO hyperMILL/HDC entries found

---

## THE 14 HYPERMILL_FORMULAS (canonical source)

| ID | Name | Formula |
|----|------|---------|
| 1  | fS | (Vc*1000)/(d*pi) — RPM from Vc |
| 2  | fSinch | (Vc*12)/(d*pi) — RPM imperial |
| 3  | fF | fz*z*n — standard feedrate |
| 4  | fFZustellung | fz*z*n/3 — plunge feedrate |
| 5  | fFreduziert | fz*z*n*0.7 — reduced feedrate |
| 6  | fFBohren | f*n — drilling feedrate |
| 7  | fS-Schlichten | ((Vc*1000)/(d*pi))*1.12 — finishing spindle boost |
| 8  | apMAXX | cl*0.85 — MAXX axial depth |
| 9  | aeMAXX0,15 | d*0.15 — MAXX radial depth at 15% |
| 10 | MAXX | fz*z*n*2.5 — MAXX feedrate multiplier |
| 11 | aeNormal | d*0.6 — normal radial depth |
| 12 | apNormal | d*0.25 — normal axial depth |
| 13 | VcHDC | 3.020905*VcRef*pow((ae/d)*100,-0.304) — HDC speed |
| 14 | fzHDC | 2.348095*fzRef*sqrt(aeRef/d)*pow(ae/d*100,-0.193)/sqrt(ae/d) — HDC feed |

---

## AUDIT FINDINGS BY CATEGORY

### 1. hyperMILL Formula Registration (0–100)
**SCORE: 14/100**

**Verdict: NONE of the 14 HYPERMILL_FORMULAS are registered in FormulaRegistry.**

Evidence:
- Grep of FORMULA_REGISTRY.json for "HDC", "MAXX", "VcHDC", "fzHDC", "hypermill", "fS-Schlichten", "fFZustellung", "apMAXX", "aeMAXX", "3.020905", "2.348095", "allowance_xy" → **0 matches**
- The `HYPERMILL_FORMULAS` array exists only in `hypermill-speed-feed-catalog.ts` as a data export
- **It is never imported by FormulaRegistry.ts** — no import of that file was found
- FORMULA_REGISTRY.json contains 0 entries with domain "hyperMILL" or category "hypermill"
- The AlgorithmRegistry has 0 hyperMILL-specific entries

The 14 formulas exist as raw typed data in the catalog file but are completely orphaned from the registry system that PRISM's engines and dispatchers query at runtime.

**Partial credit (14 pts):** The formulas DO exist in a TypeScript catalog with correct IDs, names, and formula strings — they just aren't bridged into the registry.

---

### 2. Scallop Height Coverage (0–100)
**SCORE: 35/100**

**Ball-end scallop: REGISTERED** — `F-SURF-003` in FORMULA_REGISTRY.json
- Equation: `hs = r - √(r² - (ae/2)²)` — correct
- Name: "Scallop Height (Ball End)"
- Domain: MANUFACTURING, category: SURFACE

**Barrel cutter scallop: NOT REGISTERED**
- The barrel formula `h = Rb - sqrt(Rb² - (ae/2)²)` where Rb >> R is referenced in:
  - `StepoverOptimizationEngine.ts` line 10: `ae = 2·sqrt(2·R_barrel·h)  [hyperMILL hm-104 barrel cutter]`
  - `CrossCamNovelAlgorithms.ts` line 511: `const barrelStepdown = 2 * Math.sqrt(2 * barrelR * targetScallop)`
  - `FeatureStrategyKnowledgeBaseEngine.ts`: multiple references to barrel cutter scallop advantage
- **But there is no registry entry** for the barrel scallop variant with Rb parameter or its distinction from the standard ball-end formula
- No F-SURF-xxx entry annotates the barrel radius parameter or the hyperMILL hm-104 provenance

**Additional gap:** The scallop-to-Ra approximation `Ra ≈ hs / 4` is registered as `F-SURF-004`, which is good. But no formula for **curvature-corrected effective radius** (`R_eff = 1/(1/R_tool - κ_cross)`) is registered despite being implemented in StepoverOptimizationEngine.

Score rationale: Ball-end scallop exists (+35), barrel variant missing (-65).

---

### 3. HDC Formula Integration (0–100)
**SCORE: 12/100**

**VcHDC and fzHDC are NOT used in any engine calculation.**

Evidence:
- Grep for `3.020905`, `2.348095`, `VcRef`, `fzHDC`, `VcHDC` across all engine files found **zero matches in any engine**
- The only matches are in:
  - `hypermill-speed-feed-catalog.ts` (source definition)
  - `hypermill-cutting-tech.json` (raw JSON data, same formulas)
  - `StochasticGrindingEngine.ts` uses `aeRef` for a different grinding power formula — completely unrelated
- **No engine queries FormulaRegistry for HDC formulas**
- **No engine imports HYPERMILL_FORMULAS from the catalog**
- The `SpeedFeedOrchestratorEngine` (central hub, 2,851 LOC) does not contain HDC adjustments
- The `CrossCamNovelAlgorithms.ts` MAXX implementation uses hardcoded `rpm * 1.5` / `fz * 2.5` multipliers rather than the canonical VcHDC formula

Score rationale: Formulas exist as data (+12), zero actual calculation usage in any engine path.

---

### 4. Safety Constraint Formulas (0–100)
**SCORE: 42/100**

**The negative allowance constraint IS implemented but NOT registered in FormulaRegistry.**

Evidence:
- `HyperMillSafetyHooks.ts::validateNegativeAllowance()` correctly implements:
  - Constraint 1: `allowance + toolCornerRadius >= 0`
  - Constraint 2: Flat endmills forbidden with negative allowance
  - Constraint 3: `|allowance + allowanceXY| < toolRadius - tolerance`
  - Constraint 4: Max gap = `2 * (toolRadius + allowance)`
- Source citations are present: `[hyperMILL Manual 4, p.757-758]`
- However, **none of these constraint formulas have a FormulaRegistry entry** — no F-HM-SAFETY-xxx IDs
- The implementation is correct and well-cited, but it is invisible to:
  - The `FormulaRegistry.getByCategory("safety")` query path
  - Any formula-browser tooling
  - Cross-reference from the 499-formula registry

Score rationale: Implementation exists and is correct (+42), registry entry completely absent (-58).

---

### 5. Cross-Reference with Physics (Kienzle/Taylor Constants) (0–100)
**SCORE: 25/100**

**No HDC formula references canonical Kienzle/Taylor constants.**

Evidence:
- `physics/constants.ts` contains zero HDC-related entries
- The HDC power-law exponents (-0.304 for speed, -0.193 for feed) are empirically derived from hyperMILL's proprietary database (`IM_Tool_DB_V2023.1.db`) and have no known public Kienzle/Taylor derivation
- The `VcHDC` formula adjusts Vc based on `(ae/d)` engagement ratio — this is an empirical correction, not derivable from Kienzle kc1.1/mc coefficients
- **No cross-reference formula exists** linking HDC constants to Taylor n/C tool-life degradation at high radial engagement (which would be the correct physics connection)
- The MAXX multiplier (2.5x) also has no physics derivation linkage — it matches trochoidal chip-thinning theory but is not formalized
- The only legitimate physics link: `F-CHIPTHK-001` (avg chip thickness `hm = fz * sqrt(ae/D)`) IS registered and IS used by engines, and represents the underlying mechanism that HDC exploits — but the connection is not documented

Score rationale: Correct physics base exists for chip thinning (+25), zero formal cross-referencing to HDC empirical constants.

---

### 6. Formula Provenance (0–100)
**SCORE: 30/100**

**Source citations exist in engine code but NOT in registry entries.**

Evidence:
- `hypermill-speed-feed-catalog.ts` header: `"extracted from IM_Tool_DB_V2023.1.db"` — good
- `HyperMillSafetyHooks.ts`: references `[hyperMILL Manual 4, p.757-758]`, `[hyperMILL Manual 1, p.759]`, etc. — excellent inline citation
- `HyperMillStrategyEngine.ts`: `source: "document:hypermill-manual-en-{1,2,3,4}"` — good
- `StepoverOptimizationEngine.ts`: `[hyperMILL hm-104 barrel cutter]` — good
- **BUT:** Since none of the formulas are actually IN the FormulaRegistry, the `references[]` and `source` fields of the Formula schema are never populated for hyperMILL formulas
- The `Formula` interface supports `references?: string[]` and `source?: string` fields that would be ideal for Open Mind documentation citations
- No Open Mind URLs, manual page numbers, or Automation Center documentation references appear in any registry entry

Score rationale: Citations exist in source code (+30), registry provenance field is entirely empty for hyperMILL formulas since they aren't registered.

---

## COMPOSITE SCORES SUMMARY

| Category | Score | Weight | Weighted |
|----------|-------|--------|---------|
| 1. hyperMILL Formula Registration | 14 | 25% | 3.5 |
| 2. Scallop Height Coverage | 35 | 15% | 5.25 |
| 3. HDC Formula Integration | 12 | 25% | 3.0 |
| 4. Safety Constraint Formulas | 42 | 15% | 6.3 |
| 5. Cross-Reference with Physics | 25 | 10% | 2.5 |
| 6. Formula Provenance | 30 | 10% | 3.0 |
| **OVERALL** | | | **23.6 / 100** |

---

## WHAT IS MISSING — Full 100% Coverage Requires

### Missing Registry Entries (14 formulas — direct from HYPERMILL_FORMULAS array)

Each needs a `Formula` entry in `FORMULA_REGISTRY.json` with full schema:

```
F-HM-001  fS                — (Vc*1000)/(d*pi)                           [RPM from Vc, metric]
F-HM-002  fSinch            — (Vc*12)/(d*pi)                             [RPM from Vc, imperial]
F-HM-003  fF                — fz*z*n                                     [Standard milling feedrate]
F-HM-004  fFZustellung      — fz*z*n/3                                   [Plunge/entry feedrate]
F-HM-005  fFreduziert       — fz*z*n*0.7                                 [Reduced approach feedrate]
F-HM-006  fFBohren          — f*n                                        [Drilling feedrate]
F-HM-007  fS-Schlichten     — ((Vc*1000)/(d*pi))*1.12                   [Finishing spindle boost +12%]
F-HM-008  apMAXX            — cl*0.85                                    [MAXX axial DOC = 85% of cutting length]
F-HM-009  aeMAXX015         — d*0.15                                     [MAXX radial engagement 15%D]
F-HM-010  MAXX              — fz*z*n*2.5                                 [MAXX feedrate multiplier x2.5]
F-HM-011  aeNormal          — d*0.6                                      [Normal radial depth 60%D]
F-HM-012  apNormal          — d*0.25                                     [Normal axial depth 25%D]
F-HM-013  VcHDC             — 3.020905*VcRef*(ae/d*100)^-0.304          [HDC speed: power-law Vc correction]
F-HM-014  fzHDC             — 2.348095*fzRef*sqrt(aeRef/d)*(ae/d*100)^-0.193/sqrt(ae/d)  [HDC feed]
```

Each entry MUST include:
- `domain: "cam_hypermill"`
- `category: "hypermill_speed_feed"` (or `"hypermill_hdc"` for 13-14)
- `references: ["Open Mind Technologies: hyperMILL Automation Center, IM_Tool_DB_V2023.1.db"]`
- `source: "Open Mind Technologies AG, hyperMILL® CAM Software"`
- For F-HM-013/014: `theory` field explaining the chip-thinning power-law basis

### Missing Registry Entries (geometry/safety formulas)

```
F-HM-015  Barrel Cutter Scallop  — h = Rb - sqrt(Rb² - (ae/2)²)
           where Rb = barrel radius >> tool body radius R
           references: ["hyperMILL hm-104 barrel cutter tangent machining"]
           consumers: ["StepoverOptimizationEngine", "CrossCamNovelAlgorithms"]

F-HM-016  Negative Allowance Limit — |allowance + allowance_xy| < tool_radius - tolerance
           domain: "cam_safety"
           category: "hypermill_safety_constraint"
           references: ["hyperMILL Manual 4, p.757-758"]
           consumers: ["HyperMillSafetyHooks::validateNegativeAllowance"]

F-HM-017  Max Surface Gap (negative allowance) — max_gap = 2 * (R_tool + allowance)
           references: ["hyperMILL Manual 4, p.757"]
```

### Missing Cross-Reference Entries

```
F-HM-018  HDC Chip-Thinning Link — relates VcHDC to chip thickness hm = fz*sqrt(ae/D)
           Shows HDC maintains hm_eff = constant as ae decreases
           Cross-refs: F-HM-013, F-HM-014, F-CHIPTHK-001

F-HM-019  Effective Barrel Radius (curvature correction) — R_eff = 1/(1/R_barrel - κ_cross)
           Currently in StepoverOptimizationEngine but unregistered
           references: ["Choi & Jerard, Sculptured Surface Machining, 1998"]
```

### Missing Algorithm Registry Entry

```
ALG-HM-001  hyperMILL HDC Speed/Feed Adaptation
            type: "manufacturing"
            description: "Power-law engagement correction for High Dynamic Cutting (HDC).
                          Adjusts Vc and fz as functions of ae/d ratio using Open Mind's
                          empirical exponents from IM_Tool_DB_V2023.1.db."
            safety_class: "HIGH"
            functions: [computeVcHDC, computeFzHDC, computeMAXXFeedrate]
            mfg_applications: ["trochoidal milling", "HDC roughing", "MAXX Machining"]
            source_file: "hypermill-speed-feed-catalog.ts"
```

---

## TOTAL MISSING TO REACH 100%

| Gap | Count | Priority |
|-----|-------|----------|
| Core HYPERMILL_FORMULAS (IDs 1–14) not registered | 14 | CRITICAL |
| Barrel cutter scallop variant | 1 | HIGH |
| Negative allowance limit formulas | 2 | HIGH |
| HDC chip-thinning cross-reference | 1 | MEDIUM |
| Effective barrel radius formula | 1 | MEDIUM |
| HDC algorithm entry in AlgorithmRegistry | 1 | MEDIUM |
| **Total new entries needed** | **20** | |

---

## KEY FINDING

The core problem is a **bridge gap**: `HYPERMILL_FORMULAS` is a well-structured, correctly-typed TypeScript array in `hypermill-speed-feed-catalog.ts` — but `FormulaRegistry.ts` never imports it. The registry loads from `FORMULA_REGISTRY.json` and `BUILT_IN_FORMULAS`, and neither source includes any hyperMILL formula. Adding 20 entries to `FORMULA_REGISTRY.json` (plus optionally bridging the import) would bring hyperMILL coverage to 100%.

The HDC formulas in particular represent a critical gap: they are the **only empirical speed/feed correction formulas in PRISM specific to a commercial CAM system's database**, and they are used nowhere in any calculation engine despite the catalog data being present.
