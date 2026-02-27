---
name: prism-cryogenic-machining
description: 'Cryogenic machining guide. Use when the user machines with LN2 or CO2 cooling for improved tool life in difficult-to-cut materials like titanium, Inconel, or CFRP.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  tier: PASS2
  scrutiny_id: M116
  process: cryogenic
---

# Cryogenic Machining

## When to Use
- Machining Ti-6Al-4V, Inconel 718, or other difficult-to-cut alloys
- LN2 (liquid nitrogen, -196°C) delivery through spindle or external nozzle
- CO2 (dry ice, -78°C) cooling as MQL alternative
- CFRP/composite machining where coolant contamination is prohibited

## How It Works
1. Evaluate material and operation for cryogenic benefit
2. Select delivery method (through-tool LN2, external LN2, CO2 + MQL)
3. Adjust cutting parameters (typically 30-50% higher Vc vs. flood)
4. Configure flow rate and pressure via `prism_intelligence→coolant_strategy`
5. Monitor tool wear pattern (crater wear reduces, flank wear may differ)

## Returns
- Delivery system specification (flow rate, pressure, nozzle configuration)
- Adjusted cutting parameters for cryogenic regime
- Tool life improvement estimate vs. flood coolant
- Cost-benefit analysis (LN2 consumption vs. productivity gain)

## Example
**Input:** "Cryogenic turning Ti-6Al-4V, currently Vc=60 m/min with flood, poor tool life (8 min)"
**Output:** LN2 through-tool: 0.5 L/min, 10 bar, directed at rake face. New parameters: Vc=90 m/min (+50%), same feed/DOC. Expected tool life: 18-22 min (2.5× improvement). LN2 cost: $0.30/min. Productivity gain: 50% higher MRR + fewer tool changes = net 35% cost reduction. Chip morphology: continuous→segmented (easier evacuation). Surface integrity: lower tensile residual stress (beneficial for fatigue). ROI positive at >20 parts/day.
