# Chip Evacuation Limits (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Practical Constraint - Master Level

## Description
Chip evacuation becomes a limiting factor at high MRR, especially in deep pockets and with certain materials.

## Key Limits
- Flute volume and helix angle
- Coolant pressure and direction
- Chip shape and size (affected by feed and engagement)
- Material (aluminum and titanium are particularly problematic)

## PRISM Implementation
- SpeedFeedOrchestratorEngine includes chip load and evacuation checks
- Warning when recommended parameters exceed safe chip evacuation

## JM Die Notes
- Many high-MRR attempts failed due to chip packing rather than force or power
- Rule: Reduce feed or engagement if chips are not clearing effectively

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)