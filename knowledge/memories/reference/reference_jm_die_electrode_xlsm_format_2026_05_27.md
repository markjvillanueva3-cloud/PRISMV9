---
name: reference-jm-die-electrode-xlsm-format-2026-05-27
description: "JM Die \"Automated Program_Corrected 5-25.xlsm\" structural analysis — the canonical parametric-CAD-template format for electrode generation. 11 sheets × Excel-driven SolidWorks SLDPRT regeneration × VBA macro pipeline. Operator directive (2026-05-27): adopt this format for PRISM's CAD template self-improving closed loop."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-09T14:54:09.166Z
aliases: reference_jm_die_electrode_xlsm_format_2026_05_27
---


# JM Die Electrode xlsm — canonical parametric-CAD template format (2026-05-27)

## Source
`H:/PRISM/JM DIE/Automated Program_Corrected 5-25.xlsm` — JM Die's production electrode-program generator. The workbook drives SolidWorks part regeneration via parametric Excel cells + VBA macros that emit machining programs.

## Structural anatomy (446 internal parts)

### 11 sheets (one per electrode archetype family)
| Sheet | Use case |
|-------|----------|
| Sheet1 | Index / dispatcher / template browser |
| MailBox | Mailbox-head electrode (postal-style) |
| MailBox (Square) | Square mailbox variant |
| Altracs | Altracs (Acument's trilobular brand) electrode |
| Altracs Orbit | Altracs with orbital tool path |
| Squares | Square / hex socket electrodes |
| Heading Die | Header die (cold-forging) electrode |
| **Single Taptite** | EJOT Taptite/DELTA-PT single trilobe |
| **3 Taptites** | 3-up Taptite electrode batch |
| TD | Top Die (TD) family |
| Template | Blueprint sheet for new archetypes |

### Per-sheet parametric layout (Single Taptite example)
| Column | Purpose | Sample value |
|--------|---------|---------------|
| A1 | Archetype name | "SINGLE TAPTITE" |
| B2 | Order # | "CM 064929A" |
| D2 | **Master SLDPRT path** | `C:\Users\Milling\Documents\Automated EXCEL\Master Files\SINGLE TAPTITE.SLDPRT` |
| T1..AT1 | Header row labels | Order Name, Date, Time, C(1), E(1), Dim 3, Dim 4, … Dim 34 |
| T2..AT2 (and below) | One order per row | numeric parameter values |
| W2 (C1) | Main diameter | 0.3575 in |
| X2 (E1) | Secondary dia | 0.3450 in |
| Y2 (Dim 3) | Third dim | 0.3575 in |
| Z2..AB2 | Stepped diameters | 0.3345, 0.3345, 0.3115 in |
| AC2 (Dim 7) | Length | 1.251 in |
| AD2..AF2 | Feature dims | 0.177, 0.2385, 15 (angle?) |
| AG2 (Dim 11) | Offset/lateral | 0.8775 in |

**Up to 34 dimensions per row** (W..BD columns). One order = one row.

### Embedded SolidWorks dimension references (shared strings)
The xlsm references SolidWorks named dimensions directly:
- `D1@Start of Trilobe`
- `D1@End of Trilobe`
- `D1@Start of Trilobe2` / `D1@End of Trilobe2`
- `D1@Start of Trilobe3` / `D1@End of Trilobe3`

This is SolidWorks' `<dim>@<feature>` syntax — the SLDPRT has 3 trilobe features (one per lobe) each with a parametric `D1` dimension wired to an Excel cell.

### Operator-facing UI (86 ActiveX controls)
The workbook has 86 ActiveX controls (`xl/activeX/activeX{1..86}.bin`) — buttons, dropdowns, inputs — driving the macro execution. This is a click-driven order-entry surface, not a spreadsheet to be edited cell-by-cell.

### Macro engine (`xl/vbaProject.bin`, 153 KB → decompiled to 12 modules, 2,151 lines)
Decompiled via `oletools.olevba` at iter119; sources at `H:/prism/state/shared/jm-electrode-extracted/Sheet{1,8-16,18}.cls.bas` + `ThisWorkbook.cls.bas`.

**Each archetype-sheet's `BuildButton_Click` event is the core pipeline (Sheet9 = Single Taptite, copied with archetype-specific tweaks across the other sheets):**

```vba
1. swApp = CreateObject("sldworks.application")    ' launch / attach SolidWorks
2. swApp.OpenDoc [FileLocationCell], 1             ' open master SLDPRT (path in cell D2)
3. Set Part = swApp.ActiveDoc                      ' acquire SW part handle
4. For i = 1 To [NumberOfDimensions]               ' iterate dimension rows starting at row 11
     j = i + 10                                    ' (row 11 = dim 1)
     If Cells(j, 4) = "" Then skip                 ' col D = SW parameter name(s)
     paramName = Cells(j, 4)                       ' may contain comma-separated names for grouped params
     unitMultiplier = Cells(j, 5)="LENGTH" ? 0.0254 : 3.14159/180   ' inch→meter or deg→rad
     paramValue    = Cells(j, 2) * unitMultiplier  ' col B = the numeric value
     ' Handle comma-separated multi-name groups: split, apply same value to each
     Part.Parameter(name).SystemValue = paramValue ' drive SW's parametric variable
   Next
5. Part.EditRebuild                                ' SolidWorks regenerates the model
   ' (the SLDPRT contains the full revolved-feature, cylindrical, toroidal, swept geometry —
   '  the macro just drives parameters; SW does the geometry math.)
```

**Implication:** the macro does NOT emit STEP files. It commands a LIVE SolidWorks instance to regenerate the master SLDPRT with new parameter values. The smooth cylindrical/toroidal/swept surfaces in the output come from SolidWorks' parametric engine, NOT from the macro itself.

**The Save_Click event** logs the order row + timestamp into history (T..AO column band).
**HideSW_Click** toggles the SolidWorks-coupling columns (D/E/F) visibility for cleaner operator view.
**The McamforSWX9 add-in path** (`C:\Program Files\McamforSWX9\MastercamWorksX9.dll`) — the macro can optionally load Mastercam-in-SolidWorks for NC program generation after geometry regen.

Notable embedded comment: `"WARNING: IF ELECTRODE IS TOO BIG, UN-GHOST EXTRA ROUGHING OP"` — conditional roughing-op insertion based on electrode size threshold.

**Per-sheet line counts (decompiled):**
- Sheet1 (dispatcher): 8 lines
- ThisWorkbook: 22 lines
- Sheet8 (Heading Die): 204 lines
- Sheet9 (Single Taptite): 205 lines
- Sheet10 (3 Taptites): 283 lines (extra logic for multi-up batch)
- Sheet11 (TD): 203 lines
- Sheet12 (Altracs): 204 lines
- Sheet13 (Altracs Orbit): 203 lines
- Sheet14 (Squares): 204 lines
- Sheet15 (Heading Die alt): 205 lines
- Sheet16 (MailBox): 204 lines
- Sheet18 (MailBox Square): 206 lines

### Visual richness (92 embedded images)
Mix of EMF (vector drawings) + PNG (raster). Each archetype sheet ships its own dimensioned diagram so operators see what each parameter controls.

## Canonical conventions captured

### Spark-gap allowance
JM Die standing rule (cross-reference [[customer-electrodes-all-od-003]]):
> **ALL OD -.003"** — every electrode OD is undersized by 0.003" total (0.0015" per side) to give a spark-gap allowance. The finished die cavity = electrode OD + 0.003".

### Trilobe parametrics
For EJOT P30247750 M8 x 1.25 Taptite (the test-electrode print at `H:/test-electrode.jpeg`):
- Nominal cavity major: 8.0 mm / 0.31496 in
- Electrode peak radius (after spark gap): 0.15598 in (= 3.962 mm)
- Lobe amplitude (peak-to-valley swing): 0.0208 in (≈ ½ of 0.0416 print Detail B chord range)
- 3-fold cosine modulation: `r(θ) = R_mean + amplitude * cos(3θ + phase)`
- Burn depth: 0.160 in (from print ".16" dim)

### Order-row + master-SLDPRT pattern
The workflow:
1. Operator enters dimensions into a new row of the sheet matching their archetype
2. Macro reads the row, opens the master SLDPRT, drives Excel-linked dimensions
3. SolidWorks regenerates the model
4. NC programs auto-emit from the regenerated geometry (per CNC LATHE / WIRE EDM / HAAS-HURCO folders)

## Implication for PRISM CAD templates (operator directive 2026-05-27)

**Adopt this format as the canonical parametric-CAD template structure for our self-improving closed-loop CAD generation system.**

### Mapping to PRISM
| JM xlsm concept | PRISM equivalent |
|-----------------|------------------|
| 11 archetype sheets | 11 archetype JSON specs (plus more — 10 already at `cad-assembly-plan-lib.mjs` ARCHETYPE_RECIPES) |
| Order-row × Dim 1..34 | Parametric input object with named dims (≥34 slots) |
| Master SLDPRT path | `H:/prism-slot-delta/scripts/lib/cad-assembly-synthesize-lib.mjs` orchestrator |
| `D1@Start of Trilobe` named dims | Named feature handles in our STEP output (`'cbore_upper_center'`, `'helix_${i}'`, etc.) |
| VBA macros emit NC programs | PRISM emits STEP + NC (Layer 2 synth + Layer 3 validate) |
| 86 ActiveX UI controls | `prism_cad:generate_assembly` dispatcher action + future React surface |
| 92 embedded EMF diagrams | wiki entries with auto-generated dimensioned previews |
| "IF ELECTRODE IS TOO BIG, UN-GHOST EXTRA ROUGHING OP" rule | Conditional pipeline branching encoded in `cad-assembly-plan-lib` rules |

### Template-format design (next-iter unit)
A PRISM CAD template = a JSON sidecar matching this shape:
```json
{
  "archetype": "single-taptite",
  "masterSynthOrchestrator": "scripts/lib/cad-assembly-synthesize-lib.mjs#synthesizeFromPlan",
  "dimensions": {
    "C1":   { "label": "main diameter", "unit": "in", "default": 0.3575 },
    "E1":   { "label": "secondary diameter", "unit": "in", "default": 0.3450 },
    "Dim3": { "label": "diameter step 1", "unit": "in", "default": 0.3575 },
    "Dim7": { "label": "length", "unit": "in", "default": 1.251 },
    "Dim11":{ "label": "lateral offset", "unit": "in", "default": 0.8775 }
  },
  "sparkGapPerSide": 0.0015,
  "conditionalOps": [
    { "if": "electrode_major > 0.5", "thenAdd": "extra_roughing_op" }
  ],
  "outputs": ["step", "ipt", "sldprt", "nc"]
}
```

### Closed-loop integration
1. **Capture step** — every CAD model PRISM generates writes back its parametric metadata (which Dim columns drove which feature). Feeds `state/shared/cad-corpus/order-ledger.jsonl`.
2. **Learn step** — `CADReverseTemplateEngine.ts` already exists and extracts templates from existing CAD; point it at JM xlsm corpus to enrich `ARCHETYPE_RECIPES`.
3. **Validate step** — `cadRegressionDispatcher` (37 actions) verifies regenerated parts against print PMI.
4. **Improve step** — when an order ships, the actual finished-part dim ↔ programmed-dim delta feeds back into template parameter priors (Bayesian update on default values).

## Extracted artifacts
- `H:/prism/state/shared/jm-electrode-extracted/vbaProject.bin` — raw VBA blob (153 KB), needs olevba to decompile
- `H:/prism/state/shared/jm-electrode-extracted/sheet{4,5,7,8,9,10}.xml` — Altracs, Altracs Orbit, Heading Die, Single Taptite, 3 Taptites, TD sheets

## Companion electrode programs (for further training)
Operator pointed to JM Die wire programs + electrode programs available for ingestion:
- `H:/PRISM/JM DIE/CNC LATHE/BIRMINGHAM FASTENER/BFELECTRODE.MIN` — Okuma lathe program turning electrode blank
- `H:/PRISM/JM DIE/CNC LATHE/BIRMINGHAM FASTENER/PRISM_UPGRADED/Okuma_*/BFELECTRODE.nc` — 7 controller-port variants
- `H:/PRISM/JM DIE/HAAS-HURCO/BIRMINGHAM FASTENER MFG/BH-1414 {FINISHING,ROUGHING} ELECTRODE.ipt` — Inventor source for 2-op electrode set
- `H:/PRISM/JM DIE/HAAS-HURCO/SEMS & SPECIALS/5030624 ELECTRODE.ipt` — SEMS electrode
- `H:/PRISM/JM DIE/MATTHEW programs/{9106169, 9106190, V5372} ELECTRODE.mcx-8` — Mastercam program sources

## Anchor memories
- [[reference_cad_domain_map_for_delta_2026_05_27]] — full CAD-domain map for delta
- [[reference_cad_piece3_fleet_complete_2026_05_27]] — piece-3 fleet state at iter112
- [[customer-electrodes-all-od-003]] — JM Die spark-gap convention (wiki)
