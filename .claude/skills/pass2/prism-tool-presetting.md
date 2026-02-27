---
name: prism-tool-presetting
description: 'Tool presetting guide. Use when the user needs offline tool measurement, shrink-fit procedures, tool assembly validation, or tool data management between presetter and CNC.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  tier: PASS2
  scrutiny_id: M120
  category: operator-knowledge
---

# Tool Presetting

## When to Use
- Offline tool length and diameter measurement
- Shrink-fit and hydraulic toolholder procedures
- Transferring tool data from presetter to CNC (via chip, network, or manual)
- Validating tool assembly (runout, balance, pull-stud torque)

## How It Works
1. Assemble tool in holder per manufacturer specs
2. Measure on presetter via `prism_intelligence→tool_preset_procedure`
3. Verify runout (TIR) and balance grade
4. Transfer offsets to CNC (tool table update)
5. Verify on-machine with touch setter (optional cross-check)

## Returns
- Tool measurement data (length, diameter, runout, corner radius)
- Assembly procedure (torque specs, shrink-fit temperature, cooling time)
- Offset transfer format (Fanuc, Siemens, Haas, Mazak)
- Runout and balance acceptance criteria

## Example
**Input:** "Preset 10mm ball-nose endmill in shrink-fit holder, BT40 spindle"
**Output:** Shrink-fit: heat holder to 350°C (induction unit, 8 sec), insert tool to gauge line, air cool 3 min (do NOT quench). Measure on presetter: Length 142.35mm, Diameter 10.003mm, Corner R 5.001mm, TIR 0.003mm at 3xD. Balance: G2.5 at 20,000 RPM — OK (requires <1 gmm). Transfer: Haas format T12 H12 L142.350 D10.003 → load via MDI or USB. On-machine verify: tool setter confirms ±0.005mm of presetter value.
