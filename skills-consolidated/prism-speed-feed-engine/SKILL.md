# PRISM-SPEED-FEED-ENGINE
## Core Machining Parameter Calculator | Level 2 Workflow
### Version 1.0 | Manufacturing Physics Integration

---

## SECTION 1: OVERVIEW

### Purpose
The Speed-Feed Engine is PRISM's primary calculation engine for generating optimal cutting parameters. It integrates physics models, material databases, tool specifications, and machine capabilities to produce safe, efficient machining recommendations with uncertainty quantification.

### When to Use
- Calculating cutting speeds and feeds for any operation
- Optimizing parameters for new materials
- Validating existing parameters against physics
- Generating machine-specific recommendations

### Prerequisites
- PRISM_MATERIALS_MASTER database loaded
- PRISM_MACHINES_DATABASE loaded
- PRISM_TOOLS_DATABASE loaded
- Physics models calibrated (F-PHYS-001 through F-PHYS-003)

### Outputs
- Cutting speed (SFM/m/min) ± uncertainty
- Feed rate (IPM/mm/min) ± uncertainty
- Spindle RPM
- Depth of cut recommendation
- Material removal rate (MRR)
- Power requirement
- Tool life estimate
- Surface finish prediction
- Safety validation status

---

## SECTION 2: CORE CALCULATIONS

### 2.1 Cutting Speed (SFM)

```javascript
/**
 * Calculate optimal surface feet per minute
 * @param material - Material object with machinability data
 * @param tool - Tool object with coating and geometry
 * @param operation - Operation type (rough, finish, drill, etc.)
 * @returns {speed: number, uncertainty: number, confidence: number}
 */
function calculateSFM(material, tool, operation) {
    // Base speed from material machinability
    const baseSFM = material.machining.recommendedSpeed.turning || 
                    material.machining.sfm_carbide;
    
    // Adjustment factors
    const coatingFactor = getCoatingFactor(tool.coating, material.category);
    const operationFactor = getOperationFactor(operation);
    const conditionFactor = material.condition === 'hardened' ? 0.4 : 1.0;
    const coolantFactor = operation.coolant ? 1.0 : 0.85;
    
    // Calculate adjusted speed
    const adjustedSFM = baseSFM * coatingFactor * operationFactor * 
                        conditionFactor * coolantFactor;
    
    // Uncertainty propagation (from prism-uncertainty-propagation)
    const uncertainty = calculateSpeedUncertainty(
        baseSFM, coatingFactor, operationFactor, conditionFactor
    );
    
    return {
        speed: adjustedSFM,
        uncertainty: uncertainty,
        confidence: 0.95,
        unit: 'SFM'
    };
}
```

### 2.2 Spindle RPM

```javascript
/**
 * Calculate spindle RPM from cutting speed and diameter
 * RPM = (SFM × 12) / (π × D) for imperial
 * RPM = (Vc × 1000) / (π × D) for metric
 */
function calculateRPM(sfm, diameter, unit = 'imperial') {
    let rpm;
    if (unit === 'imperial') {
        rpm = (sfm * 12) / (Math.PI * diameter);
    } else {
        rpm = (sfm * 1000) / (Math.PI * diameter);
    }
    
    // Uncertainty propagation
    const sfmUncertainty = sfm * 0.10; // 10% typical
    const diameterUncertainty = 0.001; // 0.001" typical
    const rpmUncertainty = rpm * Math.sqrt(
        Math.pow(sfmUncertainty/sfm, 2) + 
        Math.pow(diameterUncertainty/diameter, 2)
    );
    
    return {
        rpm: Math.round(rpm),
        uncertainty: Math.round(rpmUncertainty),
        confidence: 0.95
    };
}
```

### 2.3 Feed Rate

```javascript
/**
 * Calculate feed rate based on chip load
 * Feed = Chip Load × Number of Flutes × RPM
 */
function calculateFeedRate(chipLoad, flutes, rpm, operation) {
    // Adjust chip load for operation type
    const operationChipLoad = adjustChipLoad(chipLoad, operation);
    
    // Feed per revolution (FPR)
    const fpr = operationChipLoad * flutes;
    
    // Feed per minute (FPM)
    const fpm = fpr * rpm;
    
    // Uncertainty (chip load typically ±15%, RPM ±5%)
    const fpmUncertainty = fpm * Math.sqrt(
        Math.pow(0.15, 2) + Math.pow(0.05, 2)
    );
    
    return {
        feedPerMinute: fpm,
        feedPerRev: fpr,
        chipLoad: operationChipLoad,
        uncertainty: fpmUncertainty,
        confidence: 0.95,
        unit: 'IPM'
    };
}
```

---

## SECTION 3: PHYSICS INTEGRATION

### 3.1 Kienzle Force Model (F-PHYS-001)

```javascript
/**
 * Calculate cutting force using Kienzle model
 * Fc = kc1.1 × b × h^(1-mc) × K_corrections
 */
function calculateCuttingForce(material, params) {
    const { kc1_1, mc } = material.machining.kienzle;
    const { depthOfCut, feed, rakeAngle, cuttingSpeed } = params;
    
    // Chip thickness (h) approximation
    const h = feed * Math.sin(params.leadAngle * Math.PI / 180);
    
    // Width of cut (b)
    const b = depthOfCut / Math.sin(params.leadAngle * Math.PI / 180);
    
    // Correction factors
    const K_gamma = 1 - 0.01 * (rakeAngle - 6); // Rake angle correction
    const K_v = Math.pow(cuttingSpeed / 100, -0.1); // Speed correction
    const K_wear = 1.0; // New tool (increases with wear)
    
    // Specific cutting force
    const kc = kc1_1 * Math.pow(h, -mc) * K_gamma * K_v * K_wear;
    
    // Total cutting force
    const Fc = kc * b * h;
    
    return {
        force: Fc,
        specificForce: kc,
        uncertainty: Fc * 0.15, // 15% typical uncertainty
        unit: 'N'
    };
}
```

### 3.2 Taylor Tool Life (F-PHYS-002)

```javascript
/**
 * Predict tool life using Taylor equation
 * VT^n = C → T = (C/V)^(1/n)
 */
function predictToolLife(material, cuttingSpeed) {
    const { taylor_C, taylor_n } = material.machining;
    
    // Tool life in minutes
    const T = Math.pow(taylor_C / cuttingSpeed, 1 / taylor_n);
    
    // Uncertainty (Taylor equation typically ±20-30%)
    const uncertainty = T * 0.25;
    
    return {
        toolLife: T,
        uncertainty: uncertainty,
        confidence: 0.90,
        unit: 'minutes'
    };
}
```

### 3.3 Surface Finish Prediction

```javascript
/**
 * Theoretical surface finish (Ra) prediction
 * Ra ≈ f² / (32 × r) for finish turning
 */
function predictSurfaceFinish(feedRate, noseRadius, operation) {
    // Theoretical Ra (microinches)
    const Ra_theoretical = Math.pow(feedRate, 2) / (32 * noseRadius) * 1000000;
    
    // Empirical correction factor (material and process dependent)
    const correctionFactor = getSurfaceFinishCorrection(operation);
    
    const Ra_predicted = Ra_theoretical * correctionFactor;
    
    return {
        Ra: Ra_predicted,
        Rz: Ra_predicted * 4.5, // Approximate Rz from Ra
        uncertainty: Ra_predicted * 0.20,
        unit: 'µin'
    };
}
```

---

## SECTION 4: MACHINE CAPABILITY VALIDATION

### 4.1 Spindle Power Check

```javascript
/**
 * Validate spindle power requirement
 * Power = (Fc × Vc) / (60 × 1000 × η)
 */
function validateSpindlePower(cuttingForce, cuttingSpeed, machine) {
    const efficiency = 0.85; // Typical spindle efficiency
    
    // Power in kW
    const powerRequired = (cuttingForce * cuttingSpeed) / 
                         (60 * 1000 * efficiency);
    
    // Safety factor
    const safetyFactor = 0.80; // Use max 80% of available power
    const powerAvailable = machine.spindle.power_kW * safetyFactor;
    
    return {
        required: powerRequired,
        available: powerAvailable,
        utilization: powerRequired / powerAvailable,
        status: powerRequired <= powerAvailable ? 'PASS' : 'FAIL',
        recommendation: powerRequired > powerAvailable ? 
            'Reduce DOC or feed rate' : 'OK'
    };
}
```

### 4.2 RPM Range Check

```javascript
function validateRPMRange(rpm, machine) {
    const { min_rpm, max_rpm } = machine.spindle;
    
    return {
        requested: rpm,
        min: min_rpm,
        max: max_rpm,
        status: (rpm >= min_rpm && rpm <= max_rpm) ? 'PASS' : 'FAIL',
        recommendation: rpm < min_rpm ? 'Increase diameter or reduce SFM' :
                       rpm > max_rpm ? 'Reduce SFM or use larger diameter' : 'OK'
    };
}
```

---

## SECTION 5: OPERATION-SPECIFIC CALCULATIONS

### 5.1 Milling Operations

```javascript
const MILLING_OPERATIONS = {
    face_milling: {
        sfmFactor: 1.0,
        chipLoadFactor: 1.0,
        docRatio: { rough: 0.4, finish: 0.1 } // % of cutter diameter
    },
    peripheral_milling: {
        sfmFactor: 0.9,
        chipLoadFactor: 0.9,
        docRatio: { rough: 1.0, finish: 0.25 } // times diameter
    },
    slot_milling: {
        sfmFactor: 0.75,
        chipLoadFactor: 0.7,
        docRatio: { rough: 0.5, finish: 0.5 }
    },
    plunge_milling: {
        sfmFactor: 0.6,
        chipLoadFactor: 0.5,
        docRatio: { rough: 1.5, finish: 0.5 }
    }
};
```

### 5.2 Turning Operations

```javascript
const TURNING_OPERATIONS = {
    rough_turning: {
        sfmFactor: 0.85,
        docRange: { min: 0.080, max: 0.300 }, // inches
        feedRange: { min: 0.010, max: 0.030 }
    },
    finish_turning: {
        sfmFactor: 1.1,
        docRange: { min: 0.010, max: 0.060 },
        feedRange: { min: 0.003, max: 0.010 }
    },
    boring: {
        sfmFactor: 0.8,
        docRange: { min: 0.020, max: 0.150 },
        feedRange: { min: 0.004, max: 0.012 }
    },
    threading: {
        sfmFactor: 0.5,
        threadDepth: '0.6495/TPI' // formula for 60° thread
    }
};
```

### 5.3 Drilling Operations

```javascript
const DRILLING_OPERATIONS = {
    standard_drill: {
        sfmFactor: 0.7,
        feedFormula: 'diameter × 0.01',
        peckDepth: 'diameter × 3'
    },
    indexable_drill: {
        sfmFactor: 1.0,
        feedFormula: 'diameter × 0.008',
        coolantRequired: true
    },
    gun_drill: {
        sfmFactor: 0.6,
        feedFormula: 'diameter × 0.003',
        coolantRequired: true,
        throughCoolant: true
    }
};
```

---

## SECTION 6: OPTIMIZATION ENGINE

### 6.1 Multi-Objective Optimization

```javascript
/**
 * Optimize cutting parameters for multiple objectives
 * Objectives: MRR, Tool Life, Surface Finish, Power
 */
function optimizeParameters(material, tool, machine, objectives) {
    // Define search space
    const searchSpace = {
        sfm: { min: material.machining.sfm_min, max: material.machining.sfm_max },
        feed: { min: 0.001, max: 0.030 },
        doc: { min: 0.010, max: 0.500 }
    };
    
    // Weight objectives
    const weights = {
        mrr: objectives.productivity || 0.4,
        toolLife: objectives.economy || 0.3,
        surfaceFinish: objectives.quality || 0.2,
        power: objectives.efficiency || 0.1
    };
    
    // Pareto optimization (simplified)
    const paretoFront = findParetoFront(searchSpace, weights, evaluatePoint);
    
    // Select best compromise solution
    const optimal = selectCompromise(paretoFront, weights);
    
    return {
        optimal: optimal,
        paretoFront: paretoFront,
        confidence: 0.85
    };
}
```

### 6.2 Material Removal Rate

```javascript
/**
 * Calculate MRR for productivity assessment
 * MRR = DOC × WOC × Feed × (for milling)
 * MRR = π × D × DOC × Feed × RPM (for turning)
 */
function calculateMRR(params, operation) {
    let mrr;
    
    if (operation.type === 'milling') {
        mrr = params.doc * params.woc * params.feedRate;
    } else if (operation.type === 'turning') {
        mrr = Math.PI * params.diameter * params.doc * params.feed * params.rpm;
    }
    
    return {
        mrr: mrr,
        unit: 'in³/min',
        uncertainty: mrr * 0.10
    };
}
```

---

## SECTION 7: OUTPUT FORMAT

### 7.1 Recommendation Output

```javascript
{
    recommendation: {
        cuttingSpeed: { value: 450, uncertainty: 45, unit: 'SFM', confidence: 0.95 },
        spindleRPM: { value: 3500, uncertainty: 175, unit: 'RPM', confidence: 0.95 },
        feedRate: { value: 28, uncertainty: 4.2, unit: 'IPM', confidence: 0.95 },
        feedPerTooth: { value: 0.004, uncertainty: 0.0006, unit: 'IPT', confidence: 0.95 },
        depthOfCut: { value: 0.125, uncertainty: 0.025, unit: 'in', confidence: 0.90 },
        widthOfCut: { value: 0.500, unit: 'in' }
    },
    predictions: {
        toolLife: { value: 45, uncertainty: 11, unit: 'min', confidence: 0.90 },
        surfaceFinish: { value: 63, uncertainty: 13, unit: 'µin Ra', confidence: 0.85 },
        cuttingForce: { value: 850, uncertainty: 128, unit: 'N', confidence: 0.90 },
        powerRequired: { value: 3.2, uncertainty: 0.5, unit: 'kW', confidence: 0.90 },
        mrr: { value: 1.75, uncertainty: 0.18, unit: 'in³/min', confidence: 0.95 }
    },
    validation: {
        spindlePower: { status: 'PASS', utilization: 0.64 },
        rpmRange: { status: 'PASS' },
        feedRange: { status: 'PASS' },
        safetyCheck: { status: 'PASS', S: 0.85 }
    },
    metadata: {
        material: 'AL-6061-T6',
        tool: 'EM-003-CARBIDE-ALTIN',
        machine: 'DMG-DMU50',
        operation: 'face_milling_finish',
        timestamp: '2026-01-29T12:00:00Z',
        engine_version: '1.0'
    }
}
```

---

## SECTION 8: INTEGRATION POINTS

### 8.1 Database Consumers
- PRISM_MATERIALS_MASTER (15+ parameters used)
- PRISM_MACHINES_DATABASE (12+ parameters used)
- PRISM_TOOLS_DATABASE (10+ parameters used)
- PRISM_WORKHOLDING_DATABASE (4+ parameters used)

### 8.2 Physics Engine Integration
- F-PHYS-001 (Kienzle cutting force)
- F-PHYS-002 (Taylor tool life)
- F-PHYS-003 (Johnson-Cook thermal)
- F-QUAL-001 (Quality assessment)

### 8.3 Product Integration
- Speed & Feed Calculator (primary consumer)
- Auto CNC Programmer
- Shop Manager / Quoting
- Post Processor Generator

---

## SECTION 9: QUICK REFERENCE

### Calculation Checklist
- [ ] Material data loaded (127 parameters)
- [ ] Tool specifications loaded
- [ ] Machine capabilities loaded
- [ ] Operation type identified
- [ ] Base speed calculated
- [ ] Adjustment factors applied
- [ ] RPM computed and validated
- [ ] Feed rate computed
- [ ] Force and power calculated
- [ ] Tool life predicted
- [ ] Surface finish predicted
- [ ] Machine validation passed
- [ ] Uncertainty quantified
- [ ] Safety check completed

### Key Formulas
| Calculation | Formula |
|-------------|---------|
| RPM | (SFM × 12) / (π × D) |
| Feed (IPM) | Chip Load × Flutes × RPM |
| MRR (milling) | DOC × WOC × Feed |
| Force (Kienzle) | kc1.1 × b × h^(1-mc) |
| Tool Life | (C/V)^(1/n) |
| Ra (turning) | f² / (32 × r) |

### Safety Thresholds
| Parameter | Max Utilization |
|-----------|-----------------|
| Spindle Power | 80% |
| Spindle RPM | 100% |
| Tool Deflection | 0.001" |
| Chatter Margin | 20% |

---

**Version:** 1.0 | **Date:** 2026-01-29 | **Level:** 2 (Workflow)
**Status:** Production Ready | **PRISM Integration:** Complete
