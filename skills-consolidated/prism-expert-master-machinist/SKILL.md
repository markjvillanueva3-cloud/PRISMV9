---
name: prism-expert-master-machinist
description: |
  Master Machinist AI Expert with 40+ years practical machining knowledge. Provides troubleshooting guidance, workholding recommendations, setup optimization, and tool life predictions based on shop floor experience.
---

# PRISM Expert: Master Machinist (40+ Years)
## Practical Machining & Shop Floor Expertise

---

## Expert Profile

```javascript
{
  id: 'master_machinist',
  name: 'Master Machinist (40 years)',
  domain: 'Practical Machining & Shop Floor',
  confidence: 1.0
}
```

---

## Knowledge Base

### Chatter Signs
Indicators that chatter is occurring:
- `surface_pattern` - Visible pattern on machined surface
- `noise` - Unusual sound during cutting
- `tool_wear` - Accelerated or unusual wear patterns
- `vibration` - Excessive machine vibration

### Tool Wear Indicators
Signs that tool needs replacement:
- `surface_finish` - Degrading finish quality
- `dimensional_drift` - Parts going out of tolerance
- `power_increase` - Higher spindle/axis loads
- `sound_change` - Different cutting sound

### Workholding Types
Available workholding options:
- `vise` - Standard for prismatic parts
- `chuck` - Cylindrical parts
- `collet` - Precision cylindrical work
- `fixture` - Custom/production setups
- `vacuum` - Thin/flexible parts
- `magnetic` - Ferrous flat parts

---

## Decision Rules

### Chatter Reduction
**Conditions:** chatter_detected
**Actions:**
1. Reduce speed (RPM -20%)
2. Increase feed rate
3. Change tool (shorter, stiffer)
4. Adjust toolpath (reduce engagement)

### Tool Life Optimization
**Conditions:** excessive_wear, short_life
**Actions:**
1. Reduce cutting speed
2. Check coolant (concentration, flow)
3. Verify runout (<0.0005")

---

## Troubleshooting Guide

### Chatter
| Cause | Solution | Priority |
|-------|----------|----------|
| Speed too high | Reduce RPM by 20% | First |
| Tool overhang | Shorten tool stick-out | Second |
| Weak workholding | Add support | Third |
| Dull tool | Replace tool | Fourth |

**Priority:** Reduce speed first, then check tool

### Poor Surface Finish
| Cause | Solution | Priority |
|-------|----------|----------|
| Dull tool | Fresh cutting edge | First |
| Wrong feeds | Increase feed | Second |
| Chip recutting | Improve chip evacuation | Third |
| Vibration | Check rigidity | Fourth |

**Priority:** Check tool condition first

### Dimensional Error
| Cause | Solution | Priority |
|-------|----------|----------|
| Thermal growth | Allow warmup | First |
| Tool wear | Measure tool wear | Second |
| Wrong offset | Verify offsets | Third |
| Deflection | Reduce forces | Fourth |

**Priority:** Check thermal conditions first

### Tool Breakage
| Cause | Solution | Priority |
|-------|----------|----------|
| Chip load too high | Reduce feed | First |
| Interrupted cut | Ramp entry | Second |
| Wrong tool grade | Use tougher grade | Third |
| Crash | Check program | Fourth |

**Priority:** Review cutting conditions

---

## Workholding Selection

### By Part Shape
| Shape | Primary | Secondary | Notes |
|-------|---------|-----------|-------|
| Prismatic | Vise | Fixture plate | Long parts (>200mm) need more support |
| Cylindrical | Chuck | Collet | Collet for tight tolerance (<0.01mm) |
| Thin wall | Vacuum | Soft jaws | Minimize distortion |

### Decision Logic
```
IF part.shape === 'prismatic':
    → Use vise
    IF part.length > 200mm:
        → Add fixture plate support

IF part.shape === 'cylindrical':
    → Use chuck
    IF part.tolerance < 0.01mm:
        → Use collet for better concentricity

IF part.thinWall:
    → Use vacuum (minimal distortion)
    → Or soft jaws (custom fit)
```

---

## Setup Optimization Tips

### Tool Change Minimization
- Group operations by tool
- Flag warning if >5 tool changes
- Consider combination tools

### Part Flipping
- Minimize number of setups
- Flag warning if >2 sides required
- Consider 5-axis or indexing

### General Setup Checklist
1. ✓ Touch off all tools before starting
2. ✓ Verify workholding torque
3. ✓ Check coolant concentration
4. ✓ Verify work offset
5. ✓ Run first part with feed hold ready

---

## Tool Life Prediction

### Taylor Tool Life Equation
```
VT^n = C

Where:
V = Cutting speed (SFM)
T = Tool life (minutes)
n = Material exponent
C = Material constant
```

### Material Constants
| Material | C | n | Notes |
|----------|---|---|-------|
| Steel | 200 | 0.25 | General purpose |
| Aluminum | 400 | 0.35 | High speed possible |
| Stainless | 120 | 0.20 | Work hardening issues |
| Titanium | 80 | 0.15 | Special tooling required |

### Life Calculation
```javascript
lifeMinutes = Math.pow(C / V, 1 / n)
partsPerTool = lifeMinutes / cycleTime

IF lifeMinutes < 30:
    → "Consider reducing speed"
ELSE:
    → "Good tool life expected"
```

---

## Integration Points

### PRISM Modules Used
- `PRISM_CHATTER_PREDICTION_ENGINE` - Stability analysis
- `PRISM_TOOL_LIFE_ENGINE` - Taylor equation calculations
- `PRISM_WORKHOLDING_DATABASE` - Workholding selection
- `PRISM_SURFACE_FINISH_ENGINE` - Finish prediction

### Gateway Routes
- `POST /api/expert/machinist/troubleshoot`
- `POST /api/expert/machinist/workholding`
- `POST /api/expert/machinist/setup-tips`
- `POST /api/expert/machinist/tool-life`

---

## Usage Examples

### Troubleshooting Request
```javascript
masterMachinist.analyze({
  issue: 'chatter'
})
// Returns causes, solutions, priority
```

### Workholding Selection
```javascript
masterMachinist.analyze({
  part: {
    shape: 'prismatic',
    length: 250,
    tolerance: 0.05
  }
})
// Returns: vise + fixture plate recommendation
```

### Tool Life Prediction
```javascript
masterMachinist.analyze({
  tool: { type: 'end_mill' },
  material: 'steel',
  conditions: { sfm: 300, cycleTime: 5 }
})
// Returns estimated life in minutes and parts per tool
```

---

## Source Reference
- **Module:** PRISM_PHASE8_EXPERTS.MasterMachinist
- **Monolith Lines:** 589998-590132
- **Extracted:** January 2026

---

*Master Machinist Expert - 40+ years of practical shop floor knowledge*
