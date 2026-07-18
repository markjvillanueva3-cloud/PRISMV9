---
name: prism-machine-warmup
description: 'Machine warm-up and thermal stabilization guide. Use when the user needs warm-up routines, thermal compensation strategies, or thermal drift monitoring for precision machining.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  tier: PASS2
  scrutiny_id: M119
  category: operator-knowledge
---

# Machine Warm-Up & Thermal Stabilization

## When to Use
- Starting a machine after overnight/weekend shutdown
- Precision work requiring <0.01mm positional accuracy
- Monitoring thermal growth during long production runs
- Configuring thermal compensation (if machine supports it)

## How It Works
1. Define precision requirements and machine type
2. Generate warm-up routine via `prism_intelligence→machine_warmup_routine`
3. Monitor thermal growth via spindle/axis probing cycle
4. Determine stabilization time from historical thermal data
5. Configure in-process probing to compensate residual drift

## Returns
- Warm-up routine (spindle RPM ramp, axis exercise sequence)
- Stabilization time estimate (typically 20-60 min for VMC)
- Thermal growth profile (μm/°C per axis)
- Compensation strategy (probing interval, offset update rules)

## Example
**Input:** "Warm-up routine for Mori Seiki NV5000, precision bore work ±0.005mm"
**Output:** Phase 1 (0-10 min): Spindle ramp 1000→5000→10000→5000 RPM, 2 min each. Phase 2 (10-20 min): exercise all axes full travel at 10 m/min. Phase 3 (20-30 min): spindle at production RPM (8000), probe test bore every 5 min. Typical NV5000 Z-growth: 12μm in first 20 min, stabilizes at 30 min. Recommendation: start production cuts at T+30 min. For ±5μm tolerance: probe every 50 parts during first 2 hours, then every 100 parts.
