# JM Die Validation Data (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Validation & Tribal - Master Level

## Description
Real-world force, power, and tool life data collected from JM Die production parts used to validate and calibrate the OSCAR models.

## Key Data Points
- Kienzle model accuracy on P2–P4 steels: ±8% with full corrections
- Size effect correction improves finishing pass accuracy by 25–35%
- Adaptive clearing with proper chip thinning compensation increases tool life 1.8–2.5x
- 5-axis parameter adjustment reduces force spikes by 30–40%

## PRISM Usage
- Used to calibrate default coefficients in MaterialRegistry and ToolRegistry
- Forms the basis of confidence intervals in UQ module

## Tribal Notes
- Many "conservative" parameters used before OSCAR were 30–50% below optimal
- Tool life predictions are now within 15% of actual on most P-material jobs

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)