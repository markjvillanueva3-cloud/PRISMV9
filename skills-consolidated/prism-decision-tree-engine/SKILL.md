# PRISM Decision Tree Engine

## Purpose
Rule-based selection trees for tooling, insert grades, coolant strategies, workholding, and machining approaches. Returns scored recommendations with reasoning chains.

## Actions (via prism_calc)
- `decision_tree` — Execute a named decision tree with input parameters

## Available Trees
- `tool_selection` — End mill vs insert vs drill based on feature, material, tolerance
- `insert_selection` — Grade, geometry, chipbreaker by material ISO group and operation
- `coolant_selection` — Flood vs MQL vs air vs through-spindle by material and operation
- `workholding_selection` — Vise vs chuck vs fixture plate by part geometry and forces
- `strategy_selection` — Roughing approach (trochoidal, HSM, conventional) by feature type
- `approach_selection` — Entry method (ramp, helix, plunge) by pocket geometry

## Usage
Provide material, operation type, feature geometry, and tolerance requirements. Engine traverses decision nodes scoring each option. Returns ranked recommendations with confidence scores and reasoning.

## Key Parameters
- `tree` — Tree name from list above
- `material` — ISO group or specific alloy
- `operation` — "roughing" | "finishing" | "semi-finishing" | "drilling" | "threading"
- `feature` — "pocket" | "slot" | "bore" | "face" | "profile" | "hole"
- `tolerance_mm` — Target tolerance (drives tool/strategy selection)
