# Torque Calculation Model (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Core Formula - Master Level

## Formula
```
T = (Fc · D) / (2 · 1000)
```

Where:
- T = Torque (Nm)
- Fc = Cutting force (N)
- D = Cutter diameter (mm)

## PRISM Implementation
- Used in machine capability checks within SpeedFeedOrchestratorEngine
- Critical safety gate for small-diameter tools (< Ø10mm) in hard materials

## Edge Cases
- High Fc + small D = very high torque risk
- Interrupted cutting on small tools dramatically increases breakage probability

## JM Die Notes
- Multiple Ø6–8mm carbide tool failures in HRC 55+ material directly linked to exceeding torque limits
- Rule: Always calculate both power and torque on tools under Ø10mm

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)