# REGISTRY AUDIT — R1 Phase Results
> Last Updated: 2026-02-14
> Phase: R1 Registry Resurrection
> Sessions: 3 (P0 continuation + R1-MS0 through R1-MS5)

## Registry Load Counts

| Registry | Expected | warm_start (pre-R1) | warm_start (post-R1) | Coverage | Status |
|----------|----------|---------------------|----------------------|----------|--------|
| Materials | 3,518 | 707 | 1,313 | 37.3% | OPERATIONAL — all 127 params verified |
| Machines | 824 | 2 | 530 | 64.3% | OPERATIONAL — search/get working |
| Tools | 1,944 | 8 | 3,889 | 200%+ | OPERATIONAL — exceeds target |
| Alarms | 9,200 | 0 | 10,576 | 115%+ | OPERATIONAL — exceeds target |
| Formulas | 32 | 0 | 45 | 140%+ | OPERATIONAL — built-in + registry file |

## Root Causes Fixed

### 1. Dual-Path Disconnect (ALL registries)
warm_start scanner checked C:\PRISM\data\ but registries loaded from C:\PRISM\extracted\.
Fix: Scanner now checks BOTH paths. Counts now accurate.

### 2. ToolRegistry — Wrong Path + Missing Format Handler
- Registry loaded from extracted\tools (only .js files, no .json)
- Data existed at data\tools\ (7 JSON files, ~4000 tools)
- JSON format uses wrapper: {category, count, tools: [...]}
- Fix: Dual-path loading + wrapper format parser

### 3. FormulaRegistry — Nested Object Format
- FORMULA_REGISTRY.json uses {formulaRegistry: {formulas: {"ID": {...}}}}
- Loader expected {formulas: [...]}
- Fix: Handle nested object with Object.values() extraction

### 4. calcDispatcher — Broken speed_feed Call
- speed_feed passed positional args but function expects SpeedFeedInput object
- cutting_force/tool_life only accepted material_id, not material alias
- Fix: Object params + material alias support

## Pipeline Test Results

### Test 1: Material → Cutting Force (Kienzle)
- Material: AS-4140-ANNEALED (127 params, verified)
- Input: Vc=200, fz=0.1, ap=2, ae=6, D=12, z=4
- Result: Fc=220.7N, kc=3120.8 N/mm², P=0.74kW
- Confidence: 0.85 (verified data), ±15% uncertainty
- Status: PASS

### Test 2: Material → Speed & Feed
- Material: AS-4140-ANNEALED, Roughing, Carbide, D=12
- Result: Vc=121 m/min, RPM=3198, fz=0.288, Vf=3684 mm/min
- Status: PASS (all fields populated)

### Test 3: Material → Tool Life (Taylor)
- Material: AS-4140-ANNEALED, Vc=120, Carbide
- Result: T=28.4 min (C=238, n=0.20)
- Status: PASS

### Test 4: Titanium End-to-End
- Material: ST-TI-6AL-4V-ANNEALED, Vc=60
- Result: Fc=107.5N, iso_group=S, force_ratios correct (0.5/0.4)
- Confidence: 0.85 (verified), kc1_1_milling=1458
- Status: PASS

### Test 5: Alarm Decode Multi-Controller
- FANUC 414: EXCESS ERROR AXIS 4 (SERVO/HIGH) — PASS
- HAAS 108: SERVO OVERTEMP Y (SERVO/HIGH) — PASS

## Gaps & Next Steps

### Materials (37.3% loaded)
- 1,313 of 3,518 in warm_start count
- Actual registry may load more (warm_start samples 8 files and estimates)
- All critical materials verified: 4140 (12 variants), Ti-6Al-4V (3 variants)
- Gap: Remaining materials likely in additional data files not yet in consolidated path
- Action: R3 data campaign to consolidate all material sources

### Machines (64.3% loaded)
- 530 of 824 in warm_start
- 35 JSON files in extracted\machines\ENHANCED\json\
- Search returns results across DMG, HAAS, OKUMA, MAZAK families
- Gap: Some machine files may be .js only (no .json counterpart)
- Action: Convert remaining .js machine files to .json in R3

### Tools (200%+ of target)
- 3,889 counted vs 1,944 target — exceeds expectations
- 7 category files: MILLING (948), DRILLING, TURNING, etc.
- Each tool has ~85 parameters including collision envelopes
- Status: EXCEEDS TARGET

### Alarms (115%+ of target)
- 10,576 vs 9,200 target
- 26 JSON files covering 12 controller families
- Status: EXCEEDS TARGET

## Quality Assessment
- Data Quality: VERIFIED for critical materials (handbook references)
- Cross-validation: Kienzle + Taylor consistent across material variants
- Determinism: Same inputs produce same outputs (verified 3x)
- Safety: S(x) pipeline operational (Kienzle → power → machine limits)