# Surface Finish Considerations (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Practical Constraint - Master Level

## Description
Surface finish requirements can limit feedrate and stepover, sometimes more than force or power.

## Key Relationships
- Feed per tooth has the largest effect on cusp height
- Stepover and nose radius interaction
- Climb vs conventional milling
- Tool deflection at high engagement

## PRISM Implementation
- Surface finish constraints included in optimization
- Trade-off analysis between MRR and Ra

## JM Die Notes
- Many parts have mixed requirements (roughing vs finishing zones)
- Rule: Use different parameter sets for roughing and finishing zones rather than compromising

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)