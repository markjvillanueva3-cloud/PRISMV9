# Medical Device Machinist Evaluation — hyperMILL Dental/Medical Coverage

## Task
Score hyperMILL dental/medical coverage in PRISM's HM-REV roadmap across 6 criteria,
then recommend which skills to generate for medical manufacturing in hyperMILL.

## Evidence Collected (read-only audit)

### HyperMillMultiAxisEngine.ts
- DntCrX5: crown_surface + margin_curve, stepdown=0.3, stepover=0.1, climb — exists
- DntBrX5: bridge_surface + connector_curves, stepdown=0.3, stepover=0.1 — exists
- DntAbX5: abutment_surface + connection_surface, stepdown=0.2, stepover=0.05 — exists
- Material group S warning: "reduce feeds 40%, use climb milling, ensure flood coolant" (generic)
- NO material-specific dental params (zirconia, PMMA, CoCr, wax blanks)
- NO margin-line accuracy spec (typical dental req: ± 20 µm)
- NO connection-geometry tolerance for abutments (platform matching: ± 5 µm typical)
- NO DntAbX5 roughing goal — finishing only, no roughing path

### HyperMillMaterialMapEngine.ts
- Group 7 = Titanium, ISO S: subgroups 7_1_1 to 7_1_5 (non-alloyed → Beta alloy)
- Group 9_1_10 = Polyetheretherketone (PEEK) — exists as thermoplast subgroup
- Group 10_8 = Medicinal Technology: 10_8_1 Implant, 10_8_2 Dental, 10_8_3 Instrument — exists
- NO CoCr (Cobalt-Chromium) group — missing entirely
- NO implant-grade Ti designation (Ti-6Al-4V ELI = ASTM F136, Ti CP Gr4 = F67) — not distinguished from standard alpha-beta alloy
- Cutter recommendations for S-group: SolidCarbide, Carbide, Ceramic — no PCD for PEEK

### SuperalloyMachiningEngine.ts
- Covers: inconel_718, inconel_625, waspaloy, rene_41, hastelloy_x, mar_m247
- NO titanium alloys — Ti machining not in SuperalloyEngine (it is ISO S but separate)
- NO bone screw / small-part threading logic
- Process window: covers roughing/finishing/semi_finishing — usable for implant bodies

### SinglePointThreadEngine.ts
- Thread forms: UN, metric, ACME, trapezoidal, buttress — metric covers M1.5-M6 bone screws
- Inputs: pitch_mm, major_diameter_mm, internal bool, infeed_method, spindle_rpm, num_passes
- Safety-critical flag present
- NO validation for miniature thread dimensions (M1.5 minor dia ~1.05 mm is at limit of SPT)
- NO reference to ASTM F543 (bone screw standard) or ISO 5835
- No tap/die alternative suggestion at M1.5 where SPT is risky

### CryogenicCuttingEngine.ts
- LN2, CO2, LN2+MQL coolant modes
- Extended Taylor tool life model for cryo
- Bermingham Ti-6Al-4V cryo reference explicitly cited
- CryoSurfaceIntegrityOutput type exists — residual stress, Ra after cryo
- Good coverage for implant-grade Ti machining

### SurfaceIntegrityEngine.ts
- Processes: turning, milling, grinding, hard_turning, edm, honing, polishing, shot_peen
- Material types: steel, stainless, titanium, nickel_alloy, aluminum
- Residual stress, white layer, fatigue derating — all present
- NO osseointegration-specific Ra target (Ra 1-4 µm for bone ingrowth vs Ra < 0.2 µm for articulating)
- NO distinction between implant surface zones (porous coating zone vs polished neck)

### WhiteLayerDetectionEngine.ts
- Hard machining focus (HRC input, CBN/ceramic/carbide tools)
- Covers ASTM-relevant case: hard turning of surgical instruments, hardened implant components
- Coolant modes include cryo — 80% prevention factor
- Good fit for CoCr hard milling (CoCr typically 30-40 HRC range)

### BoreFinishingEngine.ts
- Preston's equation (k×P×V), crosshatch angle, stone life estimation
- Bore diameter + length + target Ra + grit selection
- Stone grits: coarse → superfinish (Ra 0.025 µm achievable)
- NO implant bore specific parameters (hip stem Morse taper, modular junction bore)
- Appropriate for dental implant internal hex bores (Ra < 0.4 µm typical)

### IndustryStandardsComplianceEngine.ts
- ISO_13485_REQUIREMENTS: biocompatibility, sterilization, validation, traceability — all 4 categories present
- UDI, DHR, ISO 10993, ISO 14971 risk management — all documented
- IQ/OQ/PQ validation protocols documented
- ISO 14644 cleanroom classes present
- NO FDA 21 CFR Part 820 (QSR) explicit mapping
- NO EU MDR 2017/745 specific requirements
- NO ASTM material standards for implant grades (F136, F1295, F67, F562 CoCr)
- NO machining-specific DHR template (Device History Record for CNC programs)

### MillTurnSwissPipelineEngine.ts (Swiss-type)
- Multi-channel Swiss lathe support exists in pipeline
- No medical-specific Swiss parameters found in engine scope

## Scoring

### 1. Dental Crown/Bridge/Abutment: 52/100
GAPS: No dental-blank material database (zirconia/PMMA/CoCr/titanium blank routing).
DntAbX5 has stepover=0.05 (good) but no margin-line accuracy enforcement.
No multi-unit bridge collision sequencing logic. No sintering shrinkage compensation for zirconia.
Missing roughing goal for DntAbX5.

### 2. Bone Screw Manufacturing: 48/100
GAPS: SPT engine covers metric M1.5-M6 mathematically but no ASTM F543/ISO 5835 validation.
No miniature-thread risky-zone warning below M2. No Ti-6Al-4V ELI-specific feeds.
No thread form verification output (flank angle, root radius conformance).
SuperalloyEngine doesn't cover Ti at all.

### 3. Implant Surface Integrity: 61/100
STRENGTHS: CryoEngine Ti Bermingham reference, SurfaceIntegrityEngine Ra+white layer+residual stress,
WhiteLayerDetection, BoreFinishing all exist.
GAPS: No osseointegration Ra zoning. No Wennerberg/Albrektsson roughness scale integration.
No shot-peen spec for fatigue-critical implant necks. No Ra-zone map by implant region.

### 4. PEEK/CoCr Machining: 31/100
GAPS: PEEK exists as 9_1_10 "Polyetheretherketone" in material map but NO cutting parameters.
CoCr not in material database at all — critical gap for dental crowns and orthopedic implants.
No PCD tool recommendation for PEEK. No specific feed/speed for CoCr (ISO S analog but not mapped).
No chip evacuation guidance for PEEK (long stringy chips, static buildup).

### 5. Swiss-Type Medical: 29/100
GAPS: MillTurnSwissPipelineEngine exists but no medical-specific small-diameter parameters.
No guide bushing runout impact on bone screw thread quality. No part-off burr control for implants.
No subspindle handoff strategy for medical parts. No sliding headstock optimization.
No minimum-diameter warnings for M1.5 bone screws on Swiss lathes.

### 6. Compliance Documentation: 58/100
STRENGTHS: ISO 13485 all 4 categories. ISO 10993, ISO 14971, UDI, DHR present.
IQ/OQ/PQ, ISO 14644 cleanroom.
GAPS: No FDA 21 CFR Part 820 mapping. No EU MDR 2017/745 Article 10 requirements.
No ASTM implant-grade material standard cross-references. No machining DHR template.
No NC program validation record (software validation artifact for 21 CFR 11).

## Skills to Generate

Priority order based on coverage gap severity:

1. hypermill-medical-materials — CoCr + PEEK + implant-Ti cutting parameters
2. hypermill-bone-screw — M1.5-M6 on Ti-6Al-4V ELI with ASTM F543 compliance
3. hypermill-dental-blank-router — zirconia/PMMA/CoCr/Ti blank selection + DntXX5 routing
4. hypermill-implant-surface-zones — Ra zone mapping for osseointegration vs articulating surfaces
5. hypermill-swiss-medical — Swiss lathe medical part optimization (subspindle, guide bushing, part-off)
6. hypermill-medical-dhr — Device History Record template wired to NC program output
