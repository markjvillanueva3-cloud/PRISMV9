---
name: prism-high-pressure-coolant
description: 'High-Pressure Coolant (HPC) guide. Use when the user needs through-spindle HPC setup, chip breaking in deep hole drilling, or coolant pressure/flow optimization for difficult materials.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  tier: PASS2
  scrutiny_id: M118
  process: HPC
---

# High-Pressure Coolant (HPC)

## When to Use
- Through-spindle coolant for deep hole drilling (>3xD)
- Chip breaking in turning stainless steel, Inconel, or titanium
- Improving tool life in interrupted cuts or hard-to-cool operations
- Selecting pump, filtration, and nozzle specifications

## How It Works
1. Determine required pressure based on operation and material
2. Calculate flow rate via nozzle diameter and pressure
3. Select filtration level (chip size vs. nozzle diameter — 10:1 rule)
4. Configure machine HPC system (pump capacity, accumulator)
5. Adjust tool selection (through-coolant inserts/drills)

## Returns
- Pressure and flow rate recommendation per operation
- Nozzle/jet configuration (diameter, angle, count)
- Filtration specification (mesh size for reliable flow)
- Tool life improvement estimate vs. standard coolant

## Example
**Input:** "Set up HPC for turning Inconel 718, facing and OD turning, current tool life 5 min"
**Output:** HPC recommended: 70 bar (1000 PSI) through-tool. Nozzle: 1.5mm precision jet aimed at rake face, flow 12 L/min. Filtration: 25μm absolute (bag + cartridge). Parameters: keep Vc=45 m/min but chip control dramatically improved. Expected tool life: 12-15 min (2.5-3× improvement). Chip form: long stringy → short C-shape (safety improvement). Pump: 15kW minimum for 70 bar @ 12 L/min. For facing: add flank jet (second nozzle, 40 bar). ROI: tool cost savings pay for HPC system in ~6 months at >4h/day Inconel turning.
