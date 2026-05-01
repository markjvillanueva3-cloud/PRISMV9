---
name: prism-all-skills
description: |
  Complete PRISM Manufacturing Intelligence skill package containing all 59 skills.
  Covers: 9 core development, 3 monolith navigation, 5 materials system, 4 session
  management, 6 quality/validation, 6 code/architecture, 4 context management,
  2 knowledge base, 10 AI expert role skills, and 9 NEW comprehensive reference skills.
  For PRISM v9.0 rebuild. Total coverage: 1.2MB+ of manufacturing intelligence.
---

# PRISM Skills Package - All 59 Skills Combined
# Generated: 2026-01-24
# Version: 3.0 (includes 9 new comprehensive reference skills)
# For upload to Claude.ai skill tree

================================================================================
TABLE OF CONTENTS
================================================================================

## SKILL CATEGORIES (59 Total)

### CORE DEVELOPMENT (9 skills)
1. prism-development - Core protocols, 10 Commandments
2. prism-state-manager - Session state, CURRENT_STATE.json
3. prism-extractor - Module extraction from monolith
4. prism-auditor - Verify extraction completeness
5. prism-utilization - 100% wiring enforcement
6. prism-consumer-mapper - Database→Consumer wiring
7. prism-hierarchy-manager - CORE→ENHANCED→USER→LEARNED layers
8. prism-swarm-orchestrator - Multi-agent parallel work
9. prism-python-tools - Batch processing, automation

### MONOLITH NAVIGATION (3 skills)
10. prism-monolith-index - Pre-mapped line numbers for modules
11. prism-monolith-navigator - Navigate 986K-line source
12. prism-extraction-index - Track extraction progress

### MATERIALS SYSTEM (5 skills)
13. prism-material-template - 127-parameter category templates
14. prism-material-templates - Category-specific templates
15. prism-material-lookup - Property lookup by material ID
16. prism-physics-formulas - Kienzle, Johnson-Cook, Taylor
17. prism-physics-reference - Physics constants and equations

### SESSION MANAGEMENT (4 skills)
18. prism-session-handoff - End-of-session documentation
19. prism-session-buffer - Context preservation
20. prism-task-continuity - Resume interrupted work
21. prism-planning - Multi-session planning

### QUALITY & VALIDATION (6 skills)
22. prism-validator - Input/output validation
23. prism-verification - Code/data verification
24. prism-quality-gates - Stage gate checks
25. prism-tdd - Test-driven development
26. prism-review - Code/design review
27. prism-debugging - Troubleshooting issues

### CODE & ARCHITECTURE (6 skills)
28. prism-coding-patterns - PRISM coding standards
29. prism-algorithm-selector - Choose right algorithm
30. prism-dependency-graph - Module dependencies
31. prism-tool-selector - Pick right tool for task
32. prism-unit-converter - Unit conversion utilities
33. prism-large-file-writer - Writing files >1000 lines

### CONTEXT MANAGEMENT (4 skills)
34. prism-context-dna - Context compression
35. prism-context-pressure - Manage context limits
36. prism-quick-start - Fast session startup
37. prism-category-defaults - Default values by category

### KNOWLEDGE BASE (2 skills)
38. prism-knowledge-base - 220+ MIT/Stanford courses, 285 algorithms
39. prism-error-recovery - Error handling patterns

### AI EXPERT ROLES (10 skills)
40. prism-expert-cad-expert - CAD modeling, feature recognition, DFM
41. prism-expert-cam-programmer - Toolpath strategies, operation sequencing
42. prism-expert-master-machinist - 40+ years practical troubleshooting
43. prism-expert-materials-scientist - Metallurgy, material selection
44. prism-expert-mathematics - Matrix operations, numerical methods
45. prism-expert-mechanical-engineer - Stress, deflection, factor of safety
46. prism-expert-post-processor - G-code generation, controller syntax
47. prism-expert-quality-control - SPC, inspection, Cp/Cpk
48. prism-expert-quality-manager - ISO compliance, PPAP documentation
49. prism-expert-thermodynamics - Heat transfer, thermal expansion

### NEW COMPREHENSIVE REFERENCE SKILLS (9 skills) ★
50. prism-gcode-reference (87KB) - Complete G/M-code reference, all controllers
51. prism-fanuc-programming (98KB) - FANUC 0i/30i/31i complete programming
52. prism-siemens-programming (85KB) - SINUMERIK 840D/828D complete programming
53. prism-heidenhain-programming (86KB) - TNC 640/530 complete programming
54. prism-wiring-templates (89KB) - Database→Consumer wiring patterns
55. prism-manufacturing-tables (141KB) - Complete lookup tables
56. prism-product-calculators (128KB) - Speed/Feed, Tool Life, Cost calculators
57. prism-error-catalog (123KB) - Complete error code registry 1000-9999
58. prism-api-contracts (170KB) - All 93 gateway route contracts

### UTILITY SKILLS (1 skill)
59. prism-derivation-helpers - Formula derivation aids

================================================================================
QUICK SKILL SELECTION GUIDE
================================================================================

## BY TASK TYPE

| Task | Primary Skill | Supporting Skills |
|------|---------------|-------------------|
| **Session Start** | prism-state-manager | prism-quick-start |
| **Extraction** | prism-extractor | prism-monolith-index, prism-auditor |
| **Materials** | prism-material-template | prism-physics-formulas, prism-manufacturing-tables |
| **Code Writing** | prism-coding-patterns | prism-large-file-writer |
| **Troubleshooting** | prism-debugging | prism-expert-master-machinist, prism-error-catalog |
| **G-code Generation** | prism-gcode-reference | prism-fanuc/siemens/heidenhain-programming |
| **API Development** | prism-api-contracts | prism-wiring-templates, prism-error-catalog |
| **Database Wiring** | prism-consumer-mapper | prism-wiring-templates, prism-utilization |
| **Calculations** | prism-product-calculators | prism-physics-formulas, prism-manufacturing-tables |
| **Quality Checks** | prism-quality-gates | prism-validator, prism-verification |

## BY CONTROLLER TYPE

| Controller | Programming Skill | Code Reference |
|------------|-------------------|----------------|
| FANUC 0i/30i/31i | prism-fanuc-programming | prism-gcode-reference |
| SIEMENS 840D/828D | prism-siemens-programming | prism-gcode-reference |
| HEIDENHAIN TNC | prism-heidenhain-programming | prism-gcode-reference |
| MAZAK Smooth | prism-gcode-reference | - |
| HAAS NGC | prism-gcode-reference | - |
| OKUMA OSP | prism-gcode-reference | - |

================================================================================
THE 10 COMMANDMENTS (ALWAYS ACTIVE)
================================================================================

1. **IF IT EXISTS, USE IT EVERYWHERE** - Every database, engine, algorithm wired to ALL consumers
2. **FUSE THE UNFUSABLE** - Combine concepts from different domains
3. **TRUST BUT VERIFY** - Physics + empirical + historical validation
4. **LEARN FROM EVERYTHING** - Every interaction feeds learning pipeline
5. **PREDICT WITH UNCERTAINTY** - Confidence intervals on all outputs
6. **EXPLAIN EVERYTHING** - XAI explanation for all recommendations
7. **FAIL GRACEFULLY** - Fallbacks for every operation
8. **PROTECT EVERYTHING** - Validate, sanitize, encrypt, backup
9. **PERFORM ALWAYS** - <2s page load, <500ms calculations
10. **OBSESS OVER USERS** - 3-click rule, smart defaults, instant feedback

================================================================================
SESSION START PROTOCOL (MANDATORY)
================================================================================

```
1. READ: C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json
2. CHECK: Is currentTask IN_PROGRESS? → Resume from checkpoint, don't restart
3. READ: Relevant skill(s) from /mnt/skills/user/prism-*/SKILL.md
4. WORK: Then begin task
```

================================================================================
KEY PATHS
================================================================================

| Resource | Path |
|----------|------|
| STATE FILE | C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json |
| MONOLITH | C:\..\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\*.html |
| EXTRACTED | C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\ |
| SKILLS | /mnt/skills/user/prism-*/SKILL.md |
| LOGS | C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\SESSION_LOGS\ |

================================================================================
DATABASE LAYERS
================================================================================

```
LEARNED  → AI/ML-derived (highest priority)
USER     → Shop-specific
ENHANCED → Manufacturer-specific (33 complete)
CORE     → Infrastructure, defaults
```


================================================================================
NEW SKILL #50: prism-gcode-reference (87KB) - SUMMARY
================================================================================

## Complete G/M-Code Reference - All Controllers

### Universal G-Codes (ISO 6983)

| Code | Function | Modal | Example |
|------|----------|-------|---------|
| G00 | Rapid positioning | Yes | G00 X100 Y50 Z10 |
| G01 | Linear interpolation | Yes | G01 X50 Y25 F200 |
| G02 | Circular CW | Yes | G02 X50 Y0 I25 J0 F150 |
| G03 | Circular CCW | Yes | G03 X50 Y0 I25 J0 F150 |
| G04 | Dwell | No | G04 P1000 (1 sec) |
| G17 | XY plane select | Yes | G17 |
| G18 | ZX plane select | Yes | G18 |
| G19 | YZ plane select | Yes | G19 |
| G20 | Inch mode | Yes | G20 |
| G21 | Metric mode | Yes | G21 |
| G28 | Return to reference | No | G28 G91 Z0 |
| G40 | Cutter comp cancel | Yes | G40 |
| G41 | Cutter comp left | Yes | G41 D01 |
| G42 | Cutter comp right | Yes | G42 D01 |
| G43 | Tool length comp + | Yes | G43 H01 Z50 |
| G49 | Tool length comp cancel | Yes | G49 |
| G53 | Machine coordinate | No | G53 G00 Z0 |
| G54-G59 | Work offsets 1-6 | Yes | G54 |
| G80 | Canned cycle cancel | Yes | G80 |
| G81 | Drilling cycle | Yes | G81 Z-25 R2 F100 |
| G83 | Peck drilling | Yes | G83 Z-50 Q5 R2 F80 |
| G84 | Tapping cycle | Yes | G84 Z-20 R2 F1.5 |
| G90 | Absolute mode | Yes | G90 |
| G91 | Incremental mode | Yes | G91 |
| G94 | Feed per minute | Yes | G94 F200 |
| G95 | Feed per revolution | Yes | G95 F0.15 |
| G96 | Constant surface speed | Yes | G96 S200 |
| G97 | Constant RPM | Yes | G97 S3000 |

### Universal M-Codes

| Code | Function |
|------|----------|
| M00 | Program stop |
| M01 | Optional stop |
| M02 | Program end |
| M03 | Spindle CW |
| M04 | Spindle CCW |
| M05 | Spindle stop |
| M06 | Tool change |
| M08 | Coolant on |
| M09 | Coolant off |
| M30 | Program end & rewind |

### Controller-Specific High-Speed Modes

| Controller | High-Speed Command | Parameters |
|------------|-------------------|------------|
| FANUC | G05.1 Q1 | Q=mode (0=off, 1=on) |
| SIEMENS | CYCLE832 | Tolerance, mode |
| HEIDENHAIN | M204 | Tolerance |
| MAZAK | G05 P10000 | P=mode |

### Speed/Feed Quick Formulas

```
RPM = (SFM × 1000) / (π × D)     [metric]
RPM = (SFM × 12) / (π × D)       [inch]
Feed Rate = RPM × FPT × Flutes
MRR = DOC × WOC × Feed Rate
Chip Load = Feed Rate / (RPM × Flutes)
```

================================================================================
NEW SKILL #51: prism-fanuc-programming (98KB) - SUMMARY
================================================================================

## FANUC 0i/30i/31i Complete Programming Reference

### Key System Variables

| Variable | Description | R/W |
|----------|-------------|-----|
| #1-#33 | Local variables | R/W |
| #100-#199 | Common variables | R/W |
| #500-#999 | Permanent common | R/W |
| #1000-#1015 | Tool offset (wear) | R/W |
| #2001-#2200 | Tool offset (geom) | R/W |
| #3000 | Alarm generation | W |
| #3001 | Millisecond timer | R |
| #4001-#4030 | Modal G-codes | R |
| #5001-#5006 | Machine position | R |
| #5021-#5026 | Work position | R |
| #5041-#5046 | Work offset G54 | R/W |

### Macro Syntax

```gcode
IF [#1 EQ 0] GOTO 100
IF [#1 NE 0] THEN #2=1
WHILE [#1 LT 100] DO1
  G01 X#1 F500
  #1=#1+1
END1

#1=SIN[#2]    (Sine)
#1=COS[#2]    (Cosine)
#1=SQRT[#2]   (Square root)
#1=ABS[#2]    (Absolute)
```

### Drilling Cycles

| Cycle | Function | Parameters |
|-------|----------|------------|
| G73 | High-speed peck | Z R Q F |
| G74 | LH tapping | Z R F |
| G76 | Fine boring | Z R Q I J F |
| G81 | Spot drill | Z R F |
| G82 | Counter bore | Z R P F |
| G83 | Deep peck drill | Z R Q F |
| G84 | RH tapping | Z R F |
| G85 | Boring (feed out) | Z R F |

================================================================================
NEW SKILL #52: prism-siemens-programming (85KB) - SUMMARY
================================================================================

## SINUMERIK 840D/828D Complete Programming Reference

### Key System Variables

| Variable | Description |
|----------|-------------|
| $P_TOOL | Current tool number |
| $TC_DP1[t,d] | Tool length 1 |
| $TC_DP3[t,d] | Tool radius |
| $AA_IW[axis] | Workpiece position |
| $AA_MW[axis] | Machine position |
| $R0-$R999 | R parameters |

### Programming Syntax

```gcode
DEF INT COUNTER
DEF REAL DEPTH = -25.0

IF R1 > 100
  G01 X50 F500
ENDIF

FOR COUNTER = 1 TO 10
  G01 Z=-COUNTER F200
ENDFOR

CALL "SUBPROG"
MCALL CYCLE83
```

### Key Cycles

| Cycle | Function |
|-------|----------|
| CYCLE81 | Drilling |
| CYCLE83 | Deep hole peck |
| CYCLE84 | Tapping |
| CYCLE832 | High-speed mode |
| POCKET3 | Rect pocket |
| POCKET4 | Circ pocket |

================================================================================
NEW SKILL #53: prism-heidenhain-programming (86KB) - SUMMARY
================================================================================

## HEIDENHAIN TNC 640/530 Complete Programming Reference

### Conversational Structure

```heidenhain
0 BEGIN PGM EXAMPLE MM
1 BLK FORM 0.1 Z X-50 Y-50 Z-30
2 BLK FORM 0.2 X+50 Y+50 Z+0
3 TOOL CALL 1 Z S5000
4 L Z+100 R0 FMAX M3
5 L X+0 Y+0 R0 FMAX
6 CC X+0 Y+0               ; Circle center
7 LP PR+25 PA+0            ; Polar line
8 CP IPA+360 DR+ F200      ; Full circle arc
9 END PGM EXAMPLE MM
```

### Q Parameters

| Range | Type | Description |
|-------|------|-------------|
| Q0-Q99 | Local | Program-specific |
| Q100-Q199 | Global | Across programs |
| Q200-Q299 | Preset | Standard cycles |
| Q1000-Q1255 | System | Read-only |

### Key Cycles

| Cycle | Function |
|-------|----------|
| CYCL DEF 1.0 | Pecking |
| CYCL DEF 2.0 | Tapping |
| CYCL DEF 200 | Enhanced drilling |
| CYCL DEF 203 | Deep hole |
| CYCL DEF 251 | Rect pocket |
| CYCL DEF 252 | Circ pocket |

================================================================================
NEW SKILL #54: prism-wiring-templates (89KB) - SUMMARY
================================================================================

## Database → Consumer Wiring Templates

### Materials Database (15+ Consumers Required)

```javascript
PRISM_MATERIALS_MASTER → {
  'PRISM_SPEED_FEED_CALCULATOR': ['base_speed_sfm', 'machinability_rating', 'hardness_bhn'],
  'PRISM_FORCE_CALCULATOR': ['kc1_1', 'mc', 'yield_strength', 'tensile_strength'],
  'PRISM_THERMAL_ENGINE': ['thermal_conductivity', 'specific_heat', 'melting_point'],
  'PRISM_TOOL_LIFE_ENGINE': ['taylor_n', 'taylor_C', 'abrasiveness_factor'],
  'PRISM_SURFACE_FINISH_ENGINE': ['elastic_modulus', 'bue_tendency'],
  'PRISM_CHATTER_PREDICTION': ['damping_ratio', 'elastic_modulus', 'density'],
  'PRISM_CHIP_FORMATION_ENGINE': ['strain_hardening_exponent', 'chip_type'],
  'PRISM_COOLANT_SELECTOR': ['reactivity', 'coolant_compatibility'],
  'PRISM_COATING_OPTIMIZER': ['chemical_affinity', 'temperature_limit'],
  'PRISM_COST_ESTIMATOR': ['material_cost_per_kg', 'density'],
  'PRISM_CYCLE_TIME_PREDICTOR': ['base_speed_sfm', 'feed_factor'],
  'PRISM_QUOTING_ENGINE': ['material_cost_per_kg', 'machinability_rating'],
  'PRISM_AI_LEARNING_PIPELINE': ['ALL 127 fields'],
  'PRISM_BAYESIAN_OPTIMIZER': ['uncertainty_bounds'],
  'PRISM_EXPLAINABLE_AI': ['ALL fields']
}
```

### Machines Database (12+ Consumers Required)

```javascript
PRISM_MACHINES_DATABASE → {
  'PRISM_SPEED_FEED_CALCULATOR': ['spindle_max_rpm', 'spindle_power_kw'],
  'PRISM_COLLISION_ENGINE': ['work_envelope', 'axis_limits', 'kinematics'],
  'PRISM_POST_PROCESSOR_GENERATOR': ['controller_brand', 'gcode_dialect'],
  'PRISM_CHATTER_PREDICTION': ['spindle_stiffness', 'natural_frequency'],
  'PRISM_CYCLE_TIME_PREDICTOR': ['rapid_rate', 'acceleration'],
  'PRISM_COST_ESTIMATOR': ['hourly_rate', 'efficiency_factor'],
  'PRISM_SCHEDULING_ENGINE': ['availability', 'capabilities'],
  'PRISM_QUOTING_ENGINE': ['hourly_rate', 'setup_time_typical'],
  'PRISM_CAPABILITY_MATCHER': ['axes', 'operations'],
  'PRISM_3D_VISUALIZATION': ['kinematics_model', 'geometry_3d'],
  'PRISM_AI_LEARNING_PIPELINE': ['ALL'],
  'PRISM_EXPLAINABLE_AI': ['ALL']
}
```

### Wiring Verification

```javascript
PRISM_WIRING_VERIFIER.verify('PRISM_MATERIALS_MASTER')
// Returns: { utilization: 100%, consumers: 15, allWired: true }
```


================================================================================
NEW SKILL #55: prism-manufacturing-tables (141KB) - SUMMARY
================================================================================

## Complete Manufacturing Lookup Tables

### Material Speed/Feed Baseline

| Material | Hardness BHN | Base SFM Carbide | Feed Factor |
|----------|--------------|------------------|-------------|
| 1018 Steel | 126-160 | 400-700 | 1.00 |
| 1045 Steel | 170-210 | 350-550 | 0.90 |
| 4140 Steel | 200-240 | 300-500 | 0.85 |
| 304 SS | 150-200 | 200-400 | 0.75 |
| 316 SS | 150-190 | 150-350 | 0.70 |
| 6061-T6 Al | 95 | 1000-3000 | 1.20 |
| Ti-6Al-4V | 330-380 | 80-200 | 0.50 |
| Inconel 718 | 350-420 | 50-120 | 0.35 |

### Kienzle Coefficients (kc1.1)

| Material | kc1.1 (N/mm²) | mc |
|----------|---------------|-----|
| Carbon Steel (150 BHN) | 1500 | 0.25 |
| Carbon Steel (200 BHN) | 1800 | 0.26 |
| Alloy Steel (200 BHN) | 1900 | 0.27 |
| Stainless 304 | 2000 | 0.21 |
| Aluminum 6061 | 700 | 0.23 |
| Titanium 6Al-4V | 1900 | 0.19 |
| Inconel 718 | 3200 | 0.18 |

### Taylor Coefficients

| Material | Taylor n | Taylor C (Carbide) |
|----------|----------|-------------------|
| Carbon Steel | 0.125 | 300 |
| Alloy Steel | 0.100 | 200 |
| Stainless Steel | 0.080 | 150 |
| Aluminum | 0.400 | 2000 |
| Titanium | 0.060 | 100 |
| Superalloy | 0.050 | 60 |

### Coating Multipliers

| Coating | Steel | Stainless | Aluminum | Titanium | Max Temp °C |
|---------|-------|-----------|----------|----------|-------------|
| Uncoated | 1.00 | 1.00 | 1.00 | 1.00 | 600 |
| TiN | 1.50 | 1.30 | 1.10 | 1.20 | 600 |
| TiAlN | 2.00 | 1.80 | 1.00 | 1.60 | 800 |
| AlTiN | 2.20 | 2.00 | 0.90 | 1.80 | 900 |
| DLC | 1.00 | 1.20 | 2.50 | 1.00 | 300 |

### Surface Finish Ra Achievable (μm)

| Operation | Roughing | Semi-Finish | Finishing |
|-----------|----------|-------------|-----------|
| Face Milling | 3.2-6.3 | 1.6-3.2 | 0.8-1.6 |
| End Milling | 3.2-6.3 | 1.6-3.2 | 0.8-1.6 |
| Turning | 3.2-6.3 | 1.6-3.2 | 0.4-1.6 |
| Boring | 1.6-3.2 | 0.8-1.6 | 0.4-0.8 |
| Grinding | - | 0.4-0.8 | 0.1-0.4 |

================================================================================
NEW SKILL #56: prism-product-calculators (128KB) - SUMMARY
================================================================================

## Speed & Feed Calculator

### Core Algorithm

```javascript
function calculateSpeedFeed(material, tool, machine, operation) {
  // 1. Get base values
  const baseSFM = material.base_speed_sfm;
  const coatingMult = COATING_MULTIPLIERS[tool.coating][material.category];
  
  // 2. Calculate RPM
  let sfm = baseSFM * coatingMult;
  let rpm = (sfm * 1000) / (Math.PI * tool.diameter);
  rpm = Math.min(rpm, machine.maxRPM);
  
  // 3. Calculate feed per tooth
  let fpt = material.base_fpt * tool.diameter * 0.02;
  fpt *= getEngagementFactor(operation.radialEngagement);
  
  // 4. Calculate feed rate
  const feedRate = rpm * fpt * tool.flutes;
  
  // 5. Calculate predictions
  const mrr = operation.axialDOC * operation.radialWOC * feedRate;
  const power = calculatePower(mrr, material.kc1_1);
  const toolLife = calculateToolLife(sfm, material.taylor_n, material.taylor_C);
  
  return { rpm, feedRate, fpt, mrr, power, toolLife };
}
```

## Tool Life Calculator (Taylor)

```javascript
// Taylor's equation: VT^n = C → T = (C/V)^(1/n)
function calculateToolLife(cuttingSpeed, n, C, corrections) {
  const baseLife = Math.pow(C / cuttingSpeed, 1 / n);
  return baseLife * corrections.coolant * corrections.rigidity * corrections.interrupted;
}
```

## Cost Calculator

```javascript
function calculateCost(part, operations, machine) {
  const materialCost = part.stockWeight * part.materialCostPerKg;
  const machiningCost = operations.reduce((sum, op) => 
    sum + (op.cycleTime / 60) * machine.hourlyRate, 0);
  const toolingCost = operations.reduce((sum, op) => 
    sum + (op.cycleTime / op.toolLife) * op.toolCost, 0);
  return { materialCost, machiningCost, toolingCost, total: materialCost + machiningCost + toolingCost };
}
```

================================================================================
NEW SKILL #57: prism-error-catalog (123KB) - SUMMARY
================================================================================

## Error Code Registry

### Error Ranges

| Range | Category | Description |
|-------|----------|-------------|
| 1000-1999 | SYSTEM | Core system errors |
| 2000-2999 | DATABASE | Database operations |
| 3000-3999 | PHYSICS | Physics calculations |
| 4000-4999 | CAD_CAM | CAD/CAM operations |
| 5000-5999 | VALIDATION | Input validation |
| 7000-7999 | NETWORK | Network/API |
| 8000-8999 | SECURITY | Security |
| 9000-9999 | LEARNING | ML/AI |

### Key Error Codes

| Code | Name | Severity |
|------|------|----------|
| 1000 | SYSTEM_ERROR | critical |
| 1004 | TIMEOUT | medium |
| 2001 | RECORD_NOT_FOUND | low |
| 2010 | MATERIAL_NOT_FOUND | medium |
| 3010 | FORCE_EXCEEDS_LIMIT | high |
| 3011 | POWER_EXCEEDS_LIMIT | high |
| 3012 | CHATTER_DETECTED | high |
| 4010 | TOOLPATH_GENERATION_FAILED | medium |
| 4011 | COLLISION_DETECTED | high |
| 5001 | VALIDATION_FAILED | low |
| 7103 | RATE_LIMITED | medium |

### Error Response Factory

```javascript
PRISM_ERROR_RESPONSE.create(3012, { machineId: 'MCH-001', rpm: 8000 })
// Returns structured error with suggestions and documentation link
```

================================================================================
NEW SKILL #58: prism-api-contracts (170KB) - SUMMARY
================================================================================

## Complete Gateway Route Index (93 Routes)

### Routes by Category

| Category | Count | Routes |
|----------|-------|--------|
| Database | 17 | materials.*, machines.*, tools.* |
| Physics | 5 | physics.force.*, physics.toollife.*, physics.chatter.* |
| ML | 3 | ml.predict, ml.ensemble.*, ml.explain |
| Optimization | 3 | optimization.* |
| Calculators | 15 | calculator.speedfeed.*, calculator.power.*, etc. |
| CAD | 6 | cad.import, cad.export, cad.features.* |
| CAM | 9 | cam.operation.*, cam.toolpath.*, cam.post.* |
| Learning | 10 | learning.feedback.*, learning.model.*, learning.knowledge.* |
| System | 9 | system.health, system.config.*, system.cache.* |
| Events | 4 | events.* |
| Batch | 4 | batch.* |
| Auth | 5 | auth.* |
| Meta | 3 | api.* |

### Standard Response Format

```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: number; name: string; message: string; };
  metadata: { requestId: string; timestamp: string; duration: number; };
}
```

### Rate Limits

| Category | Limit |
|----------|-------|
| calculations | 100/min |
| database | 300/min |
| compute | 20/min |
| ml | 50/min |
| batch | 10/hour |

================================================================================
COMPLETE SKILL LIST FOR UPLOAD
================================================================================

When uploading to Claude.ai skill tree, use this description:

```yaml
name: prism-all-skills
description: |
  Complete PRISM Manufacturing Intelligence skill package containing all 59 skills.
  Covers: 9 core development, 3 monolith navigation, 5 materials system, 4 session
  management, 6 quality/validation, 6 code/architecture, 4 context management,
  2 knowledge base, 10 AI expert role skills, and 9 NEW comprehensive reference skills.
  For PRISM v9.0 rebuild. Total coverage: 1.2MB+ of manufacturing intelligence.
```

### Full Skill Paths

1. /mnt/skills/user/prism-development/SKILL.md
2. /mnt/skills/user/prism-state-manager/SKILL.md
3. /mnt/skills/user/prism-extractor/SKILL.md
4. /mnt/skills/user/prism-auditor/SKILL.md
5. /mnt/skills/user/prism-utilization/SKILL.md
...
50. /mnt/skills/user/prism-gcode-reference/SKILL.md
51. /mnt/skills/user/prism-fanuc-programming/SKILL.md
52. /mnt/skills/user/prism-siemens-programming/SKILL.md
53. /mnt/skills/user/prism-heidenhain-programming/SKILL.md
54. /mnt/skills/user/prism-wiring-templates/SKILL.md
55. /mnt/skills/user/prism-manufacturing-tables/SKILL.md
56. /mnt/skills/user/prism-product-calculators/SKILL.md
57. /mnt/skills/user/prism-error-catalog/SKILL.md
58. /mnt/skills/user/prism-api-contracts/SKILL.md
59. /mnt/skills/user/prism-derivation-helpers/SKILL.md

================================================================================
END OF ALL-IN-ONE SKILL PACKAGE v3.0
================================================================================

# Summary Statistics v4.0

- **Total Skills:** 99 (was 59, +40 including 6 NEW Combination Engine)
- **Total Agents:** 64 (was 58, +6 new/upgraded)
- **Total Formulas:** 22 (was 15, +7 COORDINATION)
- **Total Hooks:** 155 (was 147, +8 coordination:*)
- **Total Coefficients:** 40
- **Resources Catalogued:** 691
- **Total Content Size:** 1.5MB+
- **Gateway Routes:** 93
- **Error Codes:** 100+
- **Manufacturing Tables:** 15+
- **Controller References:** 4 (FANUC, SIEMENS, HEIDENHAIN, Universal)

## NEW v13.0 - Combination Engine Skills (6)

| Level | Skill | Purpose |
|-------|-------|--------|
| L0 | prism-combination-engine | ILP-based optimal resource selection via F-PSI-001 |
| L1 | prism-swarm-coordinator | Multi-agent task distribution and orchestration |
| L1 | prism-resource-optimizer | Capability scoring and requirement matching |
| L1 | prism-agent-selector | Cost-optimized agent assignment via F-AGENT-001 |
| L1 | prism-synergy-calculator | Pairwise resource interaction via F-SYNERGY-001 |
| L2 | prism-claude-code-bridge | Script execution and Python integration |

## NEW v13.0 - Coordination Formulas (7)

| ID | Name | Purpose |
|----|------|--------|
| F-PSI-001 | Master Combination Equation | ILP optimization for resource selection |
| F-RESOURCE-001 | Capability Score | Fuzzy matching resources to requirements |
| F-SYNERGY-001 | Synergy Calculator | Pairwise resource interaction effects |
| F-COVERAGE-001 | Task Coverage | Requirement completeness verification |
| F-SWARM-001 | Swarm Efficiency | Multi-agent performance measurement |
| F-AGENT-001 | Agent Selection | Cost-optimized agent assignment |
| F-PROOF-001 | Optimality Proof | Mathematical certificate generation |

**Remember: IF IT EXISTS, USE IT EVERYWHERE**
**F-PSI-001 AUTO-SELECTS OPTIMAL RESOURCES FOR EVERY TASK**
