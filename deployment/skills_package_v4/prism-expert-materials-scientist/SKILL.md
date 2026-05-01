---
name: prism-expert-materials-scientist
description: |
  Materials Scientist AI Expert (Dr. level) specializing in metallurgy, material selection, heat treatment recommendations, and machinability assessment. Covers steel grades, aluminum alloys, and specialty materials.
---

# PRISM Expert: Dr. Materials Scientist
## Materials Science & Metallurgy Expertise

---

## Expert Profile

```javascript
{
  id: 'materials_scientist',
  name: 'Dr. Materials Scientist',
  domain: 'Materials Science & Metallurgy',
  confidence: 1.0
}
```

---

## Knowledge Base

### Steel Grades Database

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

---

### Aluminum Alloys Database

| Alloy | Tensile (MPa) | Yield (MPa) | Hardness (HB) | Density (g/cm³) |
|-------|---------------|-------------|---------------|-----------------|
| 6061-T6 | 310 | 276 | 95 | 2.70 |
| 7075-T6 | 572 | 503 | 150 | 2.81 |
| 2024-T3 | 483 | 345 | 120 | 2.78 |

### Aluminum Alloy Details

#### 6061-T6 (General Purpose)
- **Properties:** Tensile 310 MPa, Yield 276 MPa, 95 HB
- **Density:** 2.70 g/cm³
- **Applications:** Structural, marine, general purpose
- **Machinability:** Excellent (120)
- **Weldability:** Good

#### 7075-T6 (Aircraft Aluminum)
- **Properties:** Tensile 572 MPa, Yield 503 MPa, 150 HB
- **Density:** 2.81 g/cm³
- **Applications:** Aircraft, high-strength structural
- **Machinability:** Very good (90)
- **Weldability:** Poor (not recommended)

#### 2024-T3 (Aircraft Sheet)
- **Properties:** Tensile 483 MPa, Yield 345 MPa, 120 HB
- **Density:** 2.78 g/cm³
- **Applications:** Aircraft structures, fatigue-critical
- **Machinability:** Very good (90)
- **Weldability:** Poor

---

### Heat Treatment Processes

| Process | Description | Application |
|---------|-------------|-------------|
| Annealing | Soften, relieve stress | Pre-machining preparation |
| Normalizing | Refine grain structure | Improve toughness |
| Hardening | Increase hardness | Wear resistance |
| Tempering | Reduce brittleness | After hardening |
| Case Hardening | Surface hardness | Wear surfaces |
| Nitriding | Surface hardening | Precision parts |

---

## Material Selection Logic

### By Requirements
```javascript
IF requirements.strength === 'high' && requirements.weight === 'low':
    → 7075-T6 Aluminum (High strength-to-weight ratio)
    → Ti-6Al-4V (Excellent strength, low density)

IF requirements.hardness === 'high' && requirements.wear === 'resistant':
    → 4340 Steel heat treated (High hardness and toughness)
    → D2 Tool Steel (Excellent wear resistance)

IF requirements.corrosion === 'resistant':
    → 316 Stainless Steel (Excellent corrosion resistance)

IF requirements.cost === 'low':
    → 1018 Steel (Low cost, good machinability)

DEFAULT:
    → 6061-T6 Aluminum (Good general purpose material)
```

### Selection Matrix
| Requirement | Primary Choice | Secondary Choice |
|-------------|----------------|------------------|
| High strength + Light | 7075-T6 | Ti-6Al-4V |
| High hardness + Wear | 4340 HT | D2 Tool Steel |
| Corrosion resistance | 316 SS | 6061-T6 |
| Low cost | 1018 | 1045 |
| General purpose | 6061-T6 | 1018 |

---

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

---

## Machinability Ratings

### Rating Scale (1018 = 100 Baseline)

| Material | Rating | Description | Notes |
|----------|--------|-------------|-------|
| 6061 Aluminum | 120 | Excellent | High speeds, excellent finish |
| 1018 Steel | 100 | Excellent | Baseline reference |
| 7075 Aluminum | 90 | Very good | Watch for galling |
| 1045 Steel | 65 | Good | Moderate speeds |
| 4140 Steel | 55 | Fair | Needs carbide tooling |
| 4340 Steel | 45 | Fair | Slower speeds required |
| Stainless Steel | 40 | Poor | Work hardening issues |
| Titanium | 20 | Difficult | Special tooling required |

### Machinability Assessment Logic
```javascript
FOR material IN [1018, 1045, 4140, 4340, stainless, titanium, 6061, 7075]:
    IF material.toLowerCase().includes(key):
        RETURN { rating, description }

DEFAULT:
    RETURN { rating: 50, description: 'Unknown - use conservative parameters' }
```

---

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

---

## Integration Points

### PRISM Modules Used
- `PRISM_MATERIALS_MASTER` - Master material database (618+ materials)
- `PRISM_MATERIAL_KC_DATABASE` - Kienzle cutting coefficients
- `PRISM_JOHNSON_COOK_DATABASE` - Constitutive model parameters
- `PRISM_ENHANCED_MATERIAL_DATABASE` - Extended properties

### Gateway Routes
- `POST /api/expert/materials/select`
- `POST /api/expert/materials/properties`
- `POST /api/expert/materials/heat-treatment`
- `POST /api/expert/materials/machinability`

---

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

---

## Quick Reference Tables

### Strength Comparison (MPa)
```
Titanium Ti-6Al-4V:  ~1000
4340 Steel:           745
4140 Steel:           655
7075-T6 Aluminum:     572
1045 Steel:           585
2024-T3 Aluminum:     483
1018 Steel:           440
6061-T6 Aluminum:     310
```

### Density Comparison (g/cm³)
```
Steel (all grades):   7.85
Titanium:             4.43
7075 Aluminum:        2.81
2024 Aluminum:        2.78
6061 Aluminum:        2.70
```

---

## Source Reference
- **Module:** PRISM_PHASE8_EXPERTS.MaterialsScientist
- **Monolith Lines:** 590504-590624
- **Extracted:** January 2026

---

*Materials Scientist Expert - Metallurgy, selection, and heat treatment guidance*
