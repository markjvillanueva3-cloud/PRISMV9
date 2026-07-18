# PPG Deep Audit — Agent 5: Tests

## Coverage (files, it() count, LOC)

**Test Files:** 7 core + 3 supporting = 10 total
- `l8-p0-ppg.test.ts` (77 it(), 768 LOC) — PostProcessor + GCode template engines
- `PrintToProgramPipelineEngine.test.ts` (12 it(), 150 LOC) — Module shape validation
- `FeatureRecognitionEngine.test.ts` (29 it(), 300 LOC) — Feature classification + confidence
- `GDTStackupEngine.test.ts` (12 it(), 95 LOC) — Tolerance stack-up + Monte-Carlo
- `print-to-program-pipeline.test.ts` (32 it(), 400 LOC) — 5-stage pipeline validation
- `cam-pipeline-real-parts.test.ts` (15 it(), 200 LOC) — Aerospace + industrial parts
- `negative-input-battery.test.ts` (54 it., 600 LOC) — Adversarial inputs
- AutoPrintToProgramBridgeEngine.test.ts + wedm-pipeline-e2e.test.ts + pipeline-variability.test.ts

**Total:** 231 it() blocks across 1,364 LOC (core PPG tests) + 3,200+ LOC (pipeline integration suites)

## Format / GD&T / variability coverage

**Happy Path (PDF → G-code):**
- Clean single-page PDF → feature recognition → process plan → G-code generation ✓ (print-to-program-pipeline.test.ts, lines 69-95)
- Real aerospace STEP → Inconel 718 valve body → S/F planning ✓ (cam-pipeline-real-parts.test.ts, AEROSPACE_VALVE_BODY)
- Real parts: 5-axis impeller, rotor shaft turning, turbocharger housing, die trim ✓

**Edge Cases:**
- Empty G-code validation ✓ (l8-p0-ppg.test.ts:339)
- Empty moves array ✓ (l8-p0-ppg.test.ts:712)
- Very high spindle RPM (50,000) ✓ (l8-p0-ppg.test.ts:721)
- Zero feed rate (div-by-zero) ✓ (l8-p0-ppg.test.ts:729, noted as known limitation)
- Feed override in moves ✓ (l8-p0-ppg.test.ts:739)

**Format Variability:**
- PDF → G-code: fanuc/haas/siemens/heidenhain/mazak/okuma ✓ (l8-p0-ppg.test.ts:86-96)
- DXF/STEP import: referenced in PrintToProgramPipelineEngine.test.ts but no concrete test cases with actual DXF/STEP parsing
- Controller dialect differences (G00/G01 vs CYCLE vs CYCL DEF) ✓ (l8-p0-ppg.test.ts:233-267)

**GD&T Coverage:**
- Position: NOT tested (no callout-parser test cases)
- Profile: NOT tested (no profile tolerance test cases)
- Flatness: referenced in cam-pipeline-real-parts.test.ts (TURBOCHARGER_HOUSING, gasket face) but no validation
- Datum refs: referenced in part definitions but no GD&T callout parsing engine
- GDTStackupEngine: 12 tests for worst-case/RSS/Monte-Carlo but only for linear dimensions, not GD&T frames

**Variability Coverage:**
- Material: steel, aluminum, stainless, inconel, Ti-6Al-4V, D2 tool steel ✓ (cam-pipeline-real-parts.test.ts)
- Machine: 6 controller families + 3 CAM systems (speed/feed optimization) ✓
- Process variability: Monte-Carlo tolerance (1,000-10,000 trials) ✓ (GDTStackupEngine)

## Reference value sourcing

**Actual Reference Data:** 
- JM Die production programs: H:/PRISM/JM DIE/CNC LATHE/, CNC MILL HAAS/, OKUMA/ (200+ .MIN/.MCX files verified)
- Real aerospace/industrial STEP geometry in cam-pipeline-real-parts.test.ts ✓
- Material callouts (ISO groups N/P/M/S/H) mapped to Kienzle constants ✓

**Stub/Placeholder Issues:**
- PrintToProgramPipelineEngine.test.ts explicitly delegates behavioral tests to 6 other suites (lines 5-13)
- FeatureRecognitionEngine.test.ts: confidence values hard-coded (0.95, but no validation against real PDF extraction)
- Negative-input-battery.test.ts: many tests assert result.isDefined() rather than result.value.matches_expected
- GDTStackupEngine: fixture uses synthetic 3-part shaft/spacer/housing stack; no JM Die cross-hole clearance example

## Adversarial inputs

**Strong Coverage (54 tests in negative-input-battery.test.ts):**
- Missing/empty/invalid material (10 tests) ✓
- Invalid ISO groups, negative HRC, HRC > 72 ✓
- Missing/zero/infinite dimensions ✓
- Oversize features (50mm pocket on 25mm stock) ✓
- Conflicts (thread depth exceeds stock length) ✓

**Gaps:**
- No corrupt PDF header test
- No multi-page PDF rotation test
- No scanned low-resolution image test (OCR failing to extract dimensions)
- No non-mechanical drawing (photo, text document)
- No oversized file (> 100MB PDF)
- No empty PDF test

## Score (0–100)

**Breakdown:**
- Test file count (7/10 core files): 70%
- it() blocks (231/250 target): 92%
- Happy path coverage: 95% ✓
- Format variability (PDF/DXF/STEP): 40% (PDF only; DXF/STEP imports not tested)
- GD&T callout parsing: 0% (no Position/Profile/Flatness/datum tests)
- Adversarial inputs: 75% (strong battery; missing PDF corruption cases)
- Reference values (JM Die): 80% (real programs linked; not all parameters validated)

**Overall: 68/100**

**Action Items:**
1. Add DXF/STEP import test suite with actual geometry parsing
2. Create GDT callout parser test (Position, Profile, Flatness, datum trees)
3. Add PDF adversarial suite (corrupt header, multi-page rotation, scanned low-res, non-mechanical)
4. Validate FeatureRecognitionEngine.recognize() confidence values against real PDF extraction
5. Link negative-input-battery assertions to expected behaviors (not just toBeDefined)
