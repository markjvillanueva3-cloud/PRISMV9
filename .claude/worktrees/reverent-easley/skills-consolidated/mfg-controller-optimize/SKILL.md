---
name: Controller G-code Optimizer
description: Optimize G-code for specific controller features (Fanuc/Siemens/Haas/Mazak/Okuma/Heidenhain).
---

## When To Use
- When adapting generic G-code to leverage controller-specific advanced features
- When optimizing programs for high-speed machining with look-ahead and smoothing
- When converting G-code between controller dialects (e.g., Fanuc to Siemens)
- When enabling controller features like AICC, CYCLE800, or G187 for better performance

## How To Use
```
prism_calc action=controller_optimize params={
  controller: "fanuc",
  gcode: "O0001\nG90 G54\n...",
  mode: "finishing"
}
```

Required: `controller`, `gcode` or `job_id`, `mode` (roughing, finishing, contouring). Optional: `features` (array of specific features to enable).

## What It Returns
- Optimized G-code with controller-specific feature codes enabled
- Look-ahead and path smoothing settings for the target controller
- Acceleration and jerk control parameters where applicable
- Corner rounding or tolerance band settings for contouring
- Before/after comparison notes explaining each optimization applied

## Examples
- Input: `controller_optimize params={ controller: "fanuc", mode: "finishing", features: ["AICC", "nano_smoothing"] }`
- Output: Program with G05.1 Q1 nano-smoothing enabled, G08 P1 look-ahead on, optimized corner decel for 0.005mm tolerance band

- Input: `controller_optimize params={ controller: "heidenhain", mode: "contouring", gcode: "..." }`
- Output: Heidenhain program with CYCLE832 tolerance setting, M120 LA30 look-ahead, and SMOOTH function activated for 5-axis contouring
