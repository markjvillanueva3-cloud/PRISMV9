---
name: prism-expert-master-machinist
description: |
  40-year master machinist expertise. Shop floor troubleshooting.
---

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

## Source Reference
- **Module:** PRISM_PHASE8_EXPERTS.MasterMachinist
- **Monolith Lines:** 589998-590132
- **Extracted:** January 2026

---

*Master Machinist Expert - 40+ years of practical shop floor knowledge*
