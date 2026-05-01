---
name: prism-burnishing
description: 'Burnishing guide. Use when the user needs roller or ball burnishing to improve surface finish, hardness, and fatigue life on turned or bored surfaces.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  tier: PASS2
  scrutiny_id: M115
  process: burnishing
---

# Roller & Ball Burnishing

## When to Use
- Improving surface finish on turned/bored surfaces (Ra 0.1-0.4 μm from Ra 1.6-3.2)
- Increasing surface hardness through cold working (10-30% improvement)
- Improving fatigue life via compressive residual stress (-200 to -800 MPa)
- Sizing bores or ODs to tight tolerances (+/- 0.005mm achievable)

## How It Works
1. Select burnishing method (single-roller, multi-roller, ball — ID or OD)
2. Calculate parameters via `prism_calc→burnishing_params`
3. Configure force, speed, feed, and number of passes
4. Verify dimensional change (burnishing removes 0 material but displaces peaks)
5. Measure surface finish, hardness, and residual stress post-process

## Returns
- Tool selection (roller diameter, ball size, tool holder type)
- Process parameters (force, speed, feed, passes)
- Expected surface finish improvement ratio
- Dimensional change estimate (peak-to-valley displacement)

## Example
**Input:** "Burnish 50mm bore in 4140 steel (HRC 30), current Ra 1.6μm, target Ra 0.2μm"
**Output:** Multi-roller burnishing tool, 3 rollers × 8mm dia. Force: 1200N (hydraulic). Speed: 80 m/min, Feed: 0.1 mm/rev, 1 pass. Expected: Ra 1.6→0.15 μm (90% improvement). Bore size change: -0.003mm (peaks displaced into valleys). Surface hardness: HRC 30→34 (13% increase). Residual stress: -450 MPa compressive at surface. Cycle time: 12 seconds. Note: pre-bore to 50.003mm to hit 50.000 final.
