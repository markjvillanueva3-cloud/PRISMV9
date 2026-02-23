---
name: prism-expert-mechanical-engineer
description: |
  AI Domain Expert for Mechanical Design & Analysis. Provides stress analysis,
  deflection calculations, factor of safety assessment, and material strength
  evaluation. Covers beam theory, fatigue analysis, and structural mechanics.
---

# PRISM Expert: Mechanical Engineer
## AI Domain Expert Skill for Mechanical Design & Analysis

---

## Expert Profile

| Attribute | Value |
|-----------|-------|
| **ID** | `mechanical_engineer` |
| **Name** | Mechanical Engineer |
| **Domain** | Mechanical Design & Analysis |
| **Source** | PRISM_PHASE8_EXPERTS.MechanicalEngineer |
| **Lines** | 589711-589774 |
| **Confidence** | 1.0 |

---

## Knowledge Base

### Material Properties
```javascript
const materialProperties = {
  steel: { yieldStrength: 250, elasticModulus: 200e3, poisson: 0.3 },    // MPa, MPa, ratio
  aluminum: { yieldStrength: 270, elasticModulus: 70e3, poisson: 0.33 },
  stainless: { yieldStrength: 215, elasticModulus: 193e3, poisson: 0.29 }
};
```

### Analysis Capabilities
- **Stress Analysis**: Bending stress, shear stress, combined loading
- **Deflection**: Cantilever beam, simply supported, fixed-fixed
- **Factor of Safety**: Yield-based safety factors
- **Moment of Inertia**: Cross-section properties

---

## Decision Rules

| Rule | Condition | Action |
|------|-----------|--------|
| Bending Stress Check | σ_bending > 0.6 × yield | Flag as high stress |
| Deflection Check | δ > L/500 | Recommend stiffening |
| Fatigue Analysis | cyclic loading | Apply fatigue factors |
| Safety Factor | FoS < 2.0 | Recommend design review |

---

## Analysis Patterns (JavaScript)

### Bending Stress Calculation
```javascript
function calculateBendingStress(moment, c, I) {
    // σ = Mc/I (bending stress formula)
    return moment * c / I;  // MPa
}
```

### Cantilever Deflection
```javascript
function cantileverDeflection(force, length, E, I) {
    // δ = PL³/3EI (maximum deflection at free end)
    return (force * Math.pow(length, 3)) / (3 * E * I);
}
```

### Factor of Safety
```javascript
function factorOfSafety(yieldStrength, appliedStress) {
    return yieldStrength / appliedStress;
}
```

### Moment of Inertia (Rectangle)
```javascript
function momentOfInertiaRectangle(b, h) {
    // I = bh³/12
    return (b * Math.pow(h, 3)) / 12;
}
```

---

## Integration Points

### PRISM Modules Using This Expert
1. **PRISM_DEFLECTION_ENGINE** - Tool/workpiece deflection
2. **PRISM_WORKHOLDING_ANALYZER** - Clamping force calculations
3. **PRISM_FIXTURE_DESIGNER** - Fixture stress analysis
4. **PRISM_TOOL_HOLDER_SELECTOR** - Holder stiffness analysis
5. **PRISM_CHATTER_PREDICTION** - System stiffness contribution

### Input Requirements
```javascript
{
  problem: {
    type: 'stress' | 'deflection' | 'fatigue',
    material: 'steel' | 'aluminum' | 'stainless',
    geometry: { length, width, height, force, moment },
    loading: 'static' | 'cyclic'
  }
}
```

### Output Format
```javascript
{
  expert: 'Mechanical Engineer',
  domain: 'Mechanical Design & Analysis',
  stressAnalysis: { bendingStress, factorOfSafety, status },
  deflectionAnalysis: { maxDeflection, deflectionRatio, recommendation },
  confidence: 0.95
}
```

---

## Quick Consultation

### When to Consult
- Fixture design for heavy cuts
- Long tool holder assemblies
- Thin-wall part machining
- High clamping force applications
- Vibration-prone setups

### Key Questions
1. What is the factor of safety for this setup?
2. Will tool deflection affect surface finish?
3. Is the workholding stiff enough for aggressive parameters?
4. What is the maximum allowable cutting force?

---

## MIT Course References
- **2.001** - Mechanics & Materials I
- **2.002** - Mechanics & Materials II
- **2.003** - Dynamics & Control I
- **2.008** - Design & Manufacturing II
