# Nose Radius Effect on Chip Thickness (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Core Correction - Master Level

## Description
When using a tool with a nose radius, the effective chip thickness changes, especially at low depths of cut. This must be accounted for to maintain proper chip load.

## Correction Formula
```
h_effective = f · sin(κ) + r · (1 - cos(κ))
```

Where:
- f = feed per tooth
- κ = approach angle
- r = nose radius

## PRISM Implementation
- Applied automatically in SpeedFeedOrchestratorEngine when radial engagement is low
- Critical for finishing passes and when ap < 2r

## Edge Cases
- Very small ap relative to r → effective chip thickness drops dramatically
- Requires feedrate increase to maintain chip load

## JM Die Notes
- Many finishing operations were underperforming until nose radius correction was applied
- Rule: Always check h_effective when ap < 2r

**Last Updated:** 2026-06-12 (4-LOOP + RGS + Critic + Self-Review + Persistent Memory enforced)