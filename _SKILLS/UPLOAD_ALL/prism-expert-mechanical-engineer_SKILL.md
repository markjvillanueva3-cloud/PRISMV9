---
name: prism-expert-mechanical-engineer
description: |
  Stress, deflection, and mechanical analysis expert.
---

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
