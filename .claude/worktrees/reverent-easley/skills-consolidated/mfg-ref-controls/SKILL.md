---
name: mfg-ref-controls
description: Control systems reference from MIT 2.004, 2.171, 6.302 for CNC applications
---

# MIT Control Systems Reference for CNC

## When To Use
- Need servo control theory for CNC axis tuning and motion control
- Applying feedback system design to adaptive machining loops
- Analyzing stability margins for chatter avoidance via control theory
- Understanding transfer functions and frequency response in machine tools

## How To Use
```
prism_knowledge action=search params={
  query: "PID control servo feedback transfer function CNC stability",
  registries: ["formulas", "courses"]
}
```

## What It Returns
- PID tuning theory mapped to prism_intelligence adaptive_config
- Transfer function analysis for prism_calc chatter_predict frequency domain
- Stability margin concepts (gain/phase) for servo loop design
- Feedback control architectures for adaptive machining strategies

## Key Course Mappings
- **MIT 2.004** (Dynamics & Control II): PID, root locus, Bode -> adaptive_*, chatter_predict
- **MIT 2.171** (Analysis of Systems): State-space, observers, optimal control -> adaptive_override
- **MIT 6.302** (Feedback Systems): Nyquist, robustness, loop shaping -> servo tuning, bandwidth

## Examples
- **Servo tuning**: Apply 2.004 PID + Bode analysis for CNC axis bandwidth via adaptive_config
- **Chatter control**: Use 6.302 Nyquist stability with prism_calc chatter_predict for spindle RPM
- **Adaptive feed**: Design 2.171 state observer for real-time feed override via adaptive_chipload
- **Disturbance rejection**: Apply 6.302 loop shaping for cutting force disturbance via adaptive_override
