---
name: prism-metrology-inspection
description: |
  CNC part inspection methods, measurement uncertainty, and quality verification.
  CMM programming, in-process probing, surface measurement, GR&R studies,
  and measurement system analysis for manufacturing quality assurance.
  
  Functions: measurement_uncertainty, grr_study, cmm_strategy, probe_routine,
  surface_measure_setup, gage_select, cpk_from_measurement, traceability_chain
  
  Academic Source: MIT 2.830, ASME B89, ISO 10360, Whitehouse surface metrology
  Total: ~340 lines
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "metrology", "inspection", "methods", "measurement", "uncertainty", "quality", "verification"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-metrology-inspection")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-metrology-inspection") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What metrology parameters for 316 stainless?"
→ Load skill: skill_content("prism-metrology-inspection") → Extract relevant metrology data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot inspection issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM METROLOGY & INSPECTION
## Measurement Methods, Uncertainty & Quality Verification for CNC

## 1. MEASUREMENT FUNDAMENTALS

### 10:1 Rule (Gage Maker's Rule)
```
Measurement instrument resolution ≤ 1/10 of tolerance

Example: Part tolerance ±0.025mm (total 0.050mm)
  Required resolution: ≤ 0.005mm (5 μm)
  Micrometer (1 μm): ✓ Adequate
  Caliper (10 μm): ✗ Insufficient
```

### Measurement Environment
```
Standard conditions (ISO 1):
  Temperature: 20°C ± 0.5°C (precision), ± 2°C (general)
  Humidity: 40-60% RH
  Vibration: <0.5 μm amplitude at measurement surface
  
Thermal expansion error:
  δ = α × L × ΔT
  
  Steel (α = 11.7 μm/m/°C):
    100mm part, 2°C deviation → 2.3 μm error
    500mm part, 2°C deviation → 11.7 μm error
  
  Aluminum (α = 23.6 μm/m/°C):
    100mm part, 2°C deviation → 4.7 μm error
    
  ALWAYS allow thermal soak time before measurement
  Minimum: 1 hour per 25mm of maximum dimension
```

## 2. MEASUREMENT INSTRUMENTS

### Selection by Tolerance
| Total Tolerance | Instrument | Resolution |
|----------------|------------|------------|
| >0.5 mm | Caliper | 0.01-0.02 mm |
| 0.1-0.5 mm | Micrometer | 0.001 mm |
| 0.025-0.1 mm | Dial indicator | 0.001-0.01 mm |
| 0.010-0.050 mm | Bore gauge, height gauge | 0.001 mm |
| 0.005-0.025 mm | CMM, air gauge | 0.0001-0.001 mm |
| <0.005 mm | CMM (scanning), interferometer | 0.0001 mm |

### Go/No-Go Gauging
```
For high-volume production:
  Plug gauge (holes): GO enters, NO-GO doesn't
  Ring gauge (shafts): GO fits, NO-GO doesn't
  
Gauge tolerance allocation (ASME B89.1.5):
  Bilateral: Gauge tolerance centered on limit
  Unilateral: Gauge tolerance inside part tolerance (conservative)
  
  Class X: 5% of part tolerance (precision gauges)
  Class Y: 10% of part tolerance (working gauges)
  Class Z: 10% of part tolerance (reference gauges)
```

## 3. CMM MEASUREMENT

### CMM Types & Capability
| Type | Work Volume | Accuracy (μm) | Best For |
|------|-----------|---------------|----------|
| Bridge (manual) | 0.5-2m | 2-5 + L/300 | Versatile, medium parts |
| Bridge (CNC) | 0.5-3m | 1.5-3 + L/400 | Production, complex parts |
| Gantry | 2-10m | 3-8 + L/300 | Large aerospace parts |
| Horizontal arm | 1-4m | 3-10 + L/250 | Automotive body panels |
| Portable arm | 1-4m radius | 15-50 | In-situ, large assemblies |
| Optical (structured light) | 0.1-2m | 10-50 | Free-form surfaces |

### CMM Probing Strategy
```
Point measurement guidelines:
  - Plane: Minimum 3 points, recommend 5-9
  - Circle/cylinder: Minimum 3 points, recommend 8-12
  - Sphere: Minimum 4 points, recommend 9-15
  - Cone: Minimum 6 points, recommend 12+
  
Point distribution:
  - Spread points evenly over feature
  - Avoid measuring near edges (probe radius compensation error)
  - For form evaluation: More points = better representation
  
Scanning vs discrete:
  Scanning: 50-200 points/second, better form capture
  Discrete: 1-3 points/second, sufficient for size/position
```

### CMM Programming Best Practices
```
1. Establish alignment FIRST (3-2-1 on datum features)
   - Level to datum A (plane)
   - Rotate to datum B (line/axis)
   - Set origin to datum C (point)
   
2. Measure datum features with extra points
   - Datum A plane: 9+ points (flatness matters)
   - Datum B: 6+ points per feature
   
3. Measure critical features BEFORE non-critical
   - Temperature drift affects later measurements
   
4. Approach directions:
   - Always approach features from same direction as function
   - Perpendicular approach to measured surface
   
5. Report format:
   - Nominal, actual, deviation, tolerance, pass/fail
   - Include measurement uncertainty (if required by spec)
```

## 4. IN-PROCESS PROBING

### Touch Probe Applications on CNC
```
Pre-cycle probing:
  1. Part setup verification (is part seated correctly?)
  2. Stock verification (is there enough material?)
  3. Datum measurement (set WCS from actual part position)
  4. Feature location (find cast/forged features)

In-cycle probing:
  1. Tool breakage detection (between operations)
  2. Feature verification (mid-process check)
  3. Adaptive machining (adjust based on measured stock)
  4. Size compensation (adjust offset based on first article)

Post-cycle probing:
  1. Final dimension verification
  2. Automated offset update for next part
  3. SPC data collection
  4. Bore/hole position verification
```

### Probe Accuracy on CNC
```
Typical probe system accuracy:
  Repeatability (2σ): 1-3 μm
  Accuracy: 3-8 μm (depends on calibration, machine accuracy)
  
Factors affecting probe accuracy:
  - Machine positioning accuracy: dominant error source
  - Stylus length: longer = more deflection error
  - Approach speed: slower = more accurate (typically 500-1000 mm/min)
  - Approach direction: consistent direction eliminates systematic errors
  - Thermal state: after warmup only
  - Calibration frequency: every shift minimum
```

## 5. SURFACE MEASUREMENT

### Surface Roughness Parameters (ISO 4287)
| Parameter | Definition | Typical Spec |
|-----------|-----------|--------------|
| Ra | Arithmetic mean deviation | 0.2-6.3 μm |
| Rz | Maximum height (10-point) | 1-25 μm |
| Rq | RMS deviation | 1.1-1.3 × Ra |
| Rsk | Skewness (symmetry) | -1 to +1 |
| Rku | Kurtosis (sharpness) | ~3.0 nominal |
| Rt | Total height of profile | Largest peak-to-valley |

### Measurement Setup
```
Stylus parameters (ISO 4288):
  Tip radius: 2 μm (standard) or 5 μm (robust)
  Measuring force: 0.75 mN (standard)
  Traverse speed: 0.5 mm/s (standard)

Cutoff length (λc) selection:
  Ra 0.006-0.02 μm → λc = 0.08 mm
  Ra 0.02-0.1 μm → λc = 0.25 mm
  Ra 0.1-2.0 μm → λc = 0.8 mm
  Ra 2.0-10 μm → λc = 2.5 mm
  Ra 10-80 μm → λc = 8.0 mm

Evaluation length = 5 × λc (standard)
Total traverse = evaluation + 2 × λc (run-in/run-out)
```

### Surface Roughness by Process
| Process | Typical Ra (μm) | Best Achievable Ra (μm) |
|---------|-----------------|------------------------|
| Rough milling | 3.2-12.5 | 1.6 |
| Finish milling | 0.8-3.2 | 0.4 |
| Rough turning | 3.2-12.5 | 1.6 |
| Finish turning | 0.4-3.2 | 0.1 |
| Grinding | 0.1-1.6 | 0.025 |
| Hard turning | 0.1-0.8 | 0.05 |
| Honing | 0.05-0.4 | 0.012 |
| Lapping | 0.012-0.1 | 0.006 |
| Polishing | 0.006-0.05 | 0.003 |

## 6. MEASUREMENT UNCERTAINTY

### GUM Framework (ISO/IEC Guide 98-3)
```
Combined standard uncertainty:
  u_c = √(u₁² + u₂² + u₃² + ... + uₙ²)

Expanded uncertainty:
  U = k × u_c
  
  k = 2 for 95% confidence (standard)
  k = 3 for 99.7% confidence

Reporting: Measurement = value ± U (k=2, 95%)
```

### Typical Uncertainty Sources
```
Source                          Typical u (μm)
Instrument resolution           0.5-2
Instrument calibration          1-3
Thermal expansion              1-10
Operator/procedure              1-5
Workpiece form error            0.5-3
Probe/stylus                    0.5-2
Fixturing/alignment             1-5

Example for micrometer measurement:
  u_resolution = 0.001/√12 = 0.29 μm
  u_calibration = 1.0 μm (from cal cert)
  u_thermal = α×L×ΔT = 11.7×0.050×1 = 0.59 μm
  u_operator = 1.5 μm (from GR&R)
  
  u_c = √(0.29² + 1.0² + 0.59² + 1.5²) = 1.95 μm
  U = 2 × 1.95 = 3.9 μm (95% confidence)
```

## 7. GR&R STUDIES

### Gauge Repeatability & Reproducibility (AIAG MSA)
```
GR&R determines if measurement system is adequate for the tolerance:

%GR&R = (σ_measurement / σ_tolerance) × 100

Acceptance criteria:
  <10%: Excellent measurement system
  10-30%: Acceptable (may be acceptable depending on application)
  >30%: Unacceptable — fix measurement system before proceeding
```

### Study Design
```
Standard GR&R study:
  Operators: 3 (minimum 2)
  Parts: 10 (spanning tolerance range)
  Trials: 3 per operator per part
  Total measurements: 3 × 10 × 3 = 90

Calculations (ANOVA method preferred):
  EV (Equipment Variation) = repeatability
  AV (Appraiser Variation) = reproducibility
  GR&R = √(EV² + AV²)
  PV (Part Variation) = actual part-to-part variation
  TV (Total Variation) = √(GR&R² + PV²)
  
  ndc (number of distinct categories) = 1.41 × PV/GR&R
  ndc ≥ 5 required for capable measurement system
```

## 8. INSPECTION PLANNING

### First Article Inspection (FAI)
```
AS9102 (aerospace) requires:
  - Every dimension on drawing measured and reported
  - Material certification traced
  - Process records documented
  - Performed on first production part from each setup
  
FAI triggers:
  - New part number
  - Design change affecting form/fit/function
  - New manufacturing process
  - 2+ year gap in production
  - Change of supplier/sub-tier
```

### In-Process Inspection Strategy
```
Inspection frequency selection:
  First piece: ALWAYS (100% inspection)
  Last piece: ALWAYS (confirm process held)
  
  Between first and last:
    Cpk > 2.0: Every 25th-50th part
    Cpk 1.33-2.0: Every 10th-25th part  
    Cpk 1.0-1.33: Every 5th-10th part
    Cpk < 1.0: 100% inspection (process not capable)
    
  Critical dimensions: 2-3× more frequent than non-critical
  After tool change: First piece re-inspect
  After break/shift change: First piece re-inspect
```

### Decision Rules (ISO 14253-1)
```
Conformance: Measured value + uncertainty must be within tolerance
Non-conformance: Measured value - uncertainty must be outside tolerance
Uncertainty zone: Measured value ± uncertainty straddles limit

Conservative approach (customer protection):
  Part accepted only if: measurement + U < upper limit
                    AND: measurement - U > lower limit
  
Reduces acceptance zone by 2U
This is why measurement uncertainty MATTERS for tight tolerances
```

*Single-purpose skill: Part measurement, inspection planning, and measurement system analysis for CNC manufacturing.*
