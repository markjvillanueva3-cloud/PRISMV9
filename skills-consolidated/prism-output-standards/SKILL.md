---
name: prism-output-standards
description: |
  Audience-aware formatting for all PRISM outputs. Operator, engineer, and manager
  views for the same data. Units, precision, safety warnings, and presentation rules.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "output", "standards", "audience", "aware", "formatting", "outputs", "operator"
- Safety validation required, collision risk assessment, or safe parameter verification needed.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-output-standards")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_safety→[relevant_check] for safety validation
   - prism_skill_script→skill_content(id="prism-output-standards") for safety reference
   - prism_validate→safety for S(x)≥0.70 gate

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Safety criteria, validation rules, and threshold values
- **Failure**: S(x)<0.70 → operation BLOCKED, must resolve before proceeding

### Examples
**Example 1**: Pre-operation safety check needed
→ Load skill → Run safety criteria against current parameters → Return S(x) score → BLOCK if <0.70

**Example 2**: User overriding recommended limits
→ Load skill → Flag risk factors → Require explicit acknowledgment → Log override decision

# PRISM Output Standards
## Right Format for Right Audience

## Audience Profiles

### CNC Operator (Shop Floor)
- **Units:** Imperial preferred (US shops), metric with imperial in parentheses
- **Precision:** RPM whole numbers, feed to 1 decimal, depth to 2 decimals
- **Format:** Parameter sheet style, large values, clear labels
- **Safety:** ⚠️ warnings PROMINENT, bold, at top
- **Avoid:** Formulas, derivations, uncertainty ranges, academic references

### Manufacturing Engineer (CAM/Process)
- **Units:** Metric primary (Vc in m/min, fz in mm/tooth)
- **Precision:** Full decimal precision, uncertainty bounds
- **Format:** Technical with formula references, comparison tables
- **Safety:** Include safety factors, show margin from limits
- **Include:** Alternative approaches, sensitivity analysis, trade-offs

### Manager/Planner (Cost/Schedule)
- **Units:** Time (min/part), cost ($/part), rate (parts/hour)
- **Precision:** 2 significant figures, rounded for clarity
- **Format:** Summary first, details on request
- **Safety:** Risk assessment language (low/medium/high)
- **Include:** Cost comparison, ROI, cycle time impact

## Formatting Rules

### Cutting Parameters (Always Include)
```
Material: AISI 4140 (HRC 28-32)
Operation: Face Milling
Tool: Ø20mm 4-flute carbide endmill

Cutting Speed: 200 m/min (656 SFM)
Spindle Speed: 3,183 RPM
Feed per Tooth: 0.10 mm (0.004 IPT)
Table Feed: 1,273 mm/min (50.1 IPM)
Axial Depth: 3.0 mm (0.118")
Radial Width: 10.0 mm (0.394")

MRR: 38.2 cm³/min
Predicted Ra: 1.6 μm (63 μin)
Estimated Tool Life: 45 min

⚠️ Safety: Spindle load 67% (OK) | Torque 45% of limit (OK)
```

### Safety Warning Levels
| Level | Symbol | When |
|-------|--------|------|
| INFO | ℹ️ | Informational note, no action needed |
| CAUTION | ⚡ | Approaching limits, monitor closely |
| WARNING | ⚠️ | Near limit, proceed with care |
| DANGER | 🛑 | At or beyond limit, DO NOT proceed |

### Numerical Precision
| Parameter | Decimal Places | Example |
|-----------|---------------|---------|
| RPM | 0 | 3,183 RPM |
| Feed mm/min | 0 | 1,273 mm/min |
| Feed mm/tooth | 2-3 | 0.10 mm/tooth |
| Depth mm | 1-2 | 3.0 mm |
| Force N | 0 | 2,847 N |
| Power kW | 1-2 | 9.5 kW |
| Temperature °C | 0 | 487 °C |
| Surface finish μm | 1-2 | 1.6 μm |
| Tool life min | 0 | 45 min |
| Cost $/part | 2 | $3.47/part |

### Dual Unit Display
Always show both metric and imperial for shop-facing outputs:
`200 m/min (656 SFM)` · `0.10 mm/tooth (0.004 IPT)` · `3.0 mm (0.118")`
