---
name: prism-expert-thermodynamics
description: |
  AI Domain Expert for Heat Transfer & Thermal Analysis. Provides cutting zone
  temperature calculations, thermal expansion prediction, coolant effectiveness
  analysis, and heat partition modeling. Covers conduction, convection, radiation.
---

# PRISM Expert: Thermodynamics Specialist
## AI Domain Expert Skill for Heat Transfer & Thermal Analysis

---

## Expert Profile

| Attribute | Value |
|-----------|-------|
| **ID** | `thermodynamics` |
| **Name** | Thermodynamics Specialist |
| **Domain** | Heat Transfer & Thermal Analysis |
| **Source** | PRISM_PHASE8_EXPERTS.ThermodynamicsSpecialist |
| **Lines** | 590627-590711 |
| **Confidence** | 1.0 |

---

## Knowledge Base

### Thermal Expansion Coefficients (µm/m/°C)
```javascript
const thermalExpansion = {
  'steel':     11.7,   // Carbon and alloy steels
  'aluminum':  23.1,   // Most aluminum alloys
  'titanium':   8.6,   // Ti-6Al-4V
  'cast_iron': 10.5    // Gray and ductile iron
};
```

### Coolant Effectiveness
```javascript
const coolantEffectiveness = {
  'through_tool':  { removal: 0.90, desc: 'Excellent - direct to cutting zone' },
  'high_pressure': { removal: 0.85, desc: 'Very good chip evacuation and cooling' },
  'flood':         { removal: 0.70, desc: 'Good heat removal' },
  'mist':          { removal: 0.40, desc: 'Moderate cooling' },
  'dry':           { removal: 0.10, desc: 'Minimal - air only' }
};
```

### Temperature Zones
| Temperature | Zone | Risk |
|-------------|------|------|
| < 400°C | Normal | Low |
| 400-600°C | Elevated | Moderate |
| > 600°C | Critical | Tool damage |

---

## Analysis Patterns (JavaScript)

### Cutting Temperature (Loewen-Shaw Model)
```javascript
function calculateCuttingTemp(conditions) {
    const { speed, feed, material } = conditions;
    const materialFactor = material?.toLowerCase().includes('steel') ? 1.0 : 0.6;

    const temp = 300 + 0.5 * speed * materialFactor + 100 * feed;

    return {
        estimated: Math.round(temp),
        unit: '°C',
        zone: temp > 600 ? 'Critical - tool damage risk' : 
              temp > 400 ? 'Elevated' : 'Normal'
    };
}
```

### Thermal Expansion Calculation
```javascript
function calculateExpansion(material, deltaT, length) {
    const coefficients = {
        'steel': 11.7e-6,
        'aluminum': 23.1e-6,
        'titanium': 8.6e-6,
        'cast_iron': 10.5e-6
    };
    
    let alpha = coefficients['steel'];  // Default
    for (const [mat, coef] of Object.entries(coefficients)) {
        if (material.toLowerCase().includes(mat)) {
            alpha = coef;
            break;
        }
    }
    
    const expansion = alpha * length * deltaT;

    return {
        coefficient: (alpha * 1e6) + ' µm/m/°C',
        expansion: (expansion * 1000).toFixed(3) + ' µm',
        length: length + ' mm',
        deltaT: deltaT + ' °C'
    };
}
```

### Coolant Analysis
```javascript
function analyzeCoolant(type, heatGeneration) {
    const effectiveness = {
        'flood': { removal: 0.7, description: 'Good heat removal' },
        'mist': { removal: 0.4, description: 'Moderate cooling' },
        'through_tool': { removal: 0.9, description: 'Excellent - direct to cutting zone' },
        'high_pressure': { removal: 0.85, description: 'Very good chip evacuation' },
        'dry': { removal: 0.1, description: 'Minimal - air only' }
    };
    
    const eff = effectiveness[type.toLowerCase()] || effectiveness['flood'];
    const removedHeat = heatGeneration * eff.removal;

    return {
        type,
        heatRemoved: removedHeat.toFixed(0) + ' W',
        heatRemaining: (heatGeneration - removedHeat).toFixed(0) + ' W',
        effectiveness: (eff.removal * 100).toFixed(0) + '%',
        description: eff.description
    };
}
```

---

## Integration Points

### PRISM Modules Using This Expert
1. **PRISM_THERMAL_ENGINE** - Heat generation prediction
2. **PRISM_TOOL_LIFE_ENGINE** - Temperature-based wear
3. **PRISM_COOLANT_SELECTOR** - Coolant recommendation
4. **PRISM_DIMENSIONAL_STABILITY** - Thermal expansion compensation
5. **PRISM_SURFACE_INTEGRITY** - Heat-affected zones

### Input Requirements
```javascript
{
  problem: {
    cuttingConditions: { speed, feed, material },
    material: 'steel' | 'aluminum' | 'titanium',
    temperatureChange: deltaT,
    length: mm,
    coolantType: 'flood' | 'mist' | 'through_tool',
    heatGeneration: watts
  }
}
```

### Output Format
```javascript
{
  expert: 'Thermodynamics Specialist',
  domain: 'Heat Transfer & Thermal Analysis',
  cuttingTemperature: { estimated, zone },
  expansion: { coefficient, expansion },
  coolantEffectiveness: { heatRemoved, effectiveness },
  confidence: 0.91
}
```

---

## Quick Consultation

### When to Consult
- High-speed machining temperature estimation
- Precision part thermal compensation
- Coolant selection for difficult materials
- Heat-affected zone prediction
- Dimensional stability analysis

### Key Questions
1. What temperature will the cutting zone reach?
2. How much will the part expand during machining?
3. Which coolant is best for this application?
4. Is tool coating temperature-rated for this operation?

---

## MIT Course References
- **2.51** - Intermediate Heat & Mass Transfer
- **2.55** - Advanced Heat & Mass Transfer
- **2.006** - Thermal Fluids Engineering
- **2.810** - Manufacturing Processes (thermal aspects)
