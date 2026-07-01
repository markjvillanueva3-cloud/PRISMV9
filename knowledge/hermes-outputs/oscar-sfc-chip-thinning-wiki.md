# Chip Thinning Correction (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Core Correction - Master Level

## Description
When radial engagement is less than 50%, the actual chip thickness is reduced, requiring feedrate increase to maintain chip load.

## Formula
f_effective = f · (ae / D) / sin(κ)

Where:
- ae = radial depth of cut
- D = cutter diameter
- κ = approach angle

## PRISM Implementation
- RCTF (Radial Chip Thinning Factor) applied in SpeedFeedOrchestratorEngine
- Critical for high-speed trochoidal and adaptive clearing

## Recommended Practice
- Never exceed 50% radial engagement without chip thinning compensation
- JM Die standard: 30-40% ae/D for roughing with chip thinning

**Last Updated:** 2026-06-12