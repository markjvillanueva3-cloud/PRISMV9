---
name: safety-validation-guide
description: 'Safety validation and compliance guide. Use when the user needs to validate spindle limits, check collision clearances, verify machine envelopes, or ensure safe cutting parameters.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  product: Safety
---

# Safety Validation & Compliance Guide

## When to Use
- Validating cutting parameters against machine limits
- Checking tool/fixture collision clearances
- Verifying G-code safety before running on machine
- Ensuring compliance with shop safety rules and standards

## How It Works
1. Define machine envelope via `prism_data→machine_search`
2. Validate parameters via pre-calculate-safety hook (blocking)
3. Check G-code via pre-gcode-safety hook (blocking)
4. Run collision check via `prism_cam→collision_check_full`
5. Generate safety report with pass/fail per check

## Returns
- Pass/fail for each safety check (spindle RPM, feed rate, DOC, power)
- Collision report with minimum clearance values
- Machine limit violations with axis/parameter details
- Compliance certificate for validated programs

## Example
**Input:** "Validate: 20mm endmill, 12000 RPM, 5000mm/min feed, 30mm DOC in Ti-6Al-4V on VF-2"
**Output:** PASS: RPM within VF-2 limit (12000 of 8100 max) — FAIL. RPM exceeds VF-2 max spindle speed. Reduce to 8100 RPM or recalculate: Vc=80m/min for Ti-6Al-4V → RPM = 1273. Feed at 1273 RPM: 1018 mm/min (0.2mm/tooth × 4 flutes). DOC 30mm OK (within Z-travel). Power: 4.8kW of 22.4kW available — OK.
