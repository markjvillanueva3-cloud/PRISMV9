---
name: prism-expert-thermodynamics
description: |
  Heat transfer and thermal analysis expert.
---

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

## MIT Course References
- **2.51** - Intermediate Heat & Mass Transfer
- **2.55** - Advanced Heat & Mass Transfer
- **2.006** - Thermal Fluids Engineering
- **2.810** - Manufacturing Processes (thermal aspects)
