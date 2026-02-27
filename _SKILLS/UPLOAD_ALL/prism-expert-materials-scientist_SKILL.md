---
name: prism-expert-materials-scientist
description: |
  Metallurgy and material selection expert.
---

| Grade | Carbon % | Alloying | Tensile (MPa) | Yield (MPa) | Hardness (HB) |
|-------|----------|----------|---------------|-------------|---------------|
| 1018 | 0.18 | - | 440 | 370 | 126 |
| 1045 | 0.45 | - | 585 | 450 | 170 |
| 4140 | 0.40 | 1.0% Cr, 0.2% Mo | 655 | 415 | 197 |
| 4340 | 0.40 | 1.8% Ni, 0.8% Cr, 0.25% Mo | 745 | 470 | 217 |

### Steel Grade Details

#### 1018 Low Carbon Steel
- **Composition:** 0.18% C
- **Properties:** Tensile 440 MPa, Yield 370 MPa, 126 HB
- **Applications:** General purpose, case hardening
- **Machinability:** Excellent (baseline 100)

#### 1045 Medium Carbon Steel
- **Composition:** 0.45% C
- **Properties:** Tensile 585 MPa, Yield 450 MPa, 170 HB
- **Applications:** Shafts, gears, bolts
- **Machinability:** Good (65)

#### 4140 Chromoly Steel
- **Composition:** 0.40% C, 1.0% Cr, 0.2% Mo
- **Properties:** Tensile 655 MPa, Yield 415 MPa, 197 HB
- **Applications:** High-stress components, tooling
- **Machinability:** Fair (55) - needs carbide

#### 4340 Nickel-Chromium-Moly Steel
- **Composition:** 0.40% C, 1.8% Ni, 0.8% Cr, 0.25% Mo
- **Properties:** Tensile 745 MPa, Yield 470 MPa, 217 HB
- **Applications:** Aircraft components, high-strength parts
- **Machinability:** Fair (45) - slower speeds

### Heat Treatment Processes

| Process | Description | Application |
|---------|-------------|-------------|
| Annealing | Soften, relieve stress | Pre-machining preparation |
| Normalizing | Refine grain structure | Improve toughness |
| Hardening | Increase hardness | Wear resistance |
| Tempering | Reduce brittleness | After hardening |
| Case Hardening | Surface hardness | Wear surfaces |
| Nitriding | Surface hardening | Precision parts |

## Heat Treatment Recommendations

### Hardening Process (Steel)
For target hardness >50 HRC:

```
PROCESS: Harden and Temper

STEPS:
1. Austenitize at 845°C (1550°F)
2. Oil quench
3. Temper at ~200°C (~400°F) for 50+ HRC

EXPECTED RESULT: 50-55 HRC
```

### Heat Treatment Decision Logic
```javascript
IF material.type === 'steel':
    IF targetHardness > 50:
        → Harden and Temper process
        → Austenitize at 845°C
        → Oil quench
        → Temper at ~200°C for target HRC
    ELSE IF targetHardness > 30:
        → Normalize and Temper
    ELSE:
        → Anneal for best machinability
ELSE:
    → Consult heat treatment specialist
```

## Properties Lookup

### Steel Lookup
```javascript
material = "4140"
→ Returns: {
    C: 0.40,
    Cr: 1.0,
    Mo: 0.2,
    tensile: 655,
    yield: 415,
    hardness: 197,
    type: 'steel',
    grade: '4140'
  }
```

### Aluminum Lookup
```javascript
material = "7075"
→ Returns: {
    tensile: 572,
    yield: 503,
    hardness: 150,
    density: 2.81,
    type: 'aluminum',
    grade: '7075-T6'
  }
```

## Usage Examples

### Material Selection
```javascript
materialsScientist.analyze({
  requirements: {
    strength: 'high',
    weight: 'low',
    corrosion: 'resistant'
  }
})
// Returns: candidates with materials and reasons
```

### Properties Lookup
```javascript
materialsScientist.analyze({
  material: '4140'
})
// Returns: full material properties
```

### Heat Treatment Advice
```javascript
materialsScientist.analyze({
  material: '4340 steel',
  targetHardness: 55
})
// Returns: heat treatment process and steps
```

### Machinability Assessment
```javascript
materialsScientist.analyze({
  material: 'titanium'
})
// Returns: { rating: 20, description: 'Difficult - special tooling' }
```

## Source Reference
- **Module:** PRISM_PHASE8_EXPERTS.MaterialsScientist
- **Monolith Lines:** 590504-590624
- **Extracted:** January 2026

---

*Materials Scientist Expert - Metallurgy, selection, and heat treatment guidance*
