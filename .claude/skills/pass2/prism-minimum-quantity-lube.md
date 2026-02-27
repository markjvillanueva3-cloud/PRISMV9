---
name: prism-minimum-quantity-lube
description: 'Minimum Quantity Lubrication (MQL) guide. Use when the user wants to reduce coolant usage with MQL mist, select MQL-compatible tools, or optimize nozzle design and flow rates.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  tier: PASS2
  scrutiny_id: M117
  process: MQL
---

# Minimum Quantity Lubrication (MQL)

## When to Use
- Reducing or eliminating flood coolant (environmental/cost benefits)
- MQL nozzle design and positioning for milling/turning/drilling
- Selecting MQL-compatible cutting tools (through-tool delivery)
- Evaluating MQL feasibility for specific material/operation combinations

## How It Works
1. Evaluate operation suitability (MQL works best: Al/steel milling, drilling <5xD)
2. Select lubricant (ester-based, vegetable oil, fatty alcohol)
3. Design nozzle configuration via `prism_intelligence→coolant_strategy`
4. Set flow rate (typically 5-50 mL/h) and air pressure (4-6 bar)
5. Adjust parameters: may need 10-20% speed reduction vs. flood in some cases

## Returns
- MQL feasibility assessment (green/yellow/red per operation)
- Nozzle configuration (internal through-tool or external, number, angles)
- Lubricant selection and flow rate
- Parameter adjustment recommendations

## Example
**Input:** "Convert aluminum pocket milling from flood to MQL, 16mm 3-flute endmill"
**Output:** MQL feasibility: GREEN (aluminum milling is ideal for MQL). Through-tool delivery preferred (16mm endmill with MQL channels). Lubricant: ester-based, 20 mL/h flow, 5 bar air. Parameters: keep Vc=300 m/min (no change for Al). Chip evacuation: air blast assists — critical for pockets >2xD deep. Expected: same tool life, 30% lower energy (no coolant pump), zero coolant disposal cost. Caution: chips must be dry for recycling value ($0.85/lb vs. $0.40/lb contaminated).
