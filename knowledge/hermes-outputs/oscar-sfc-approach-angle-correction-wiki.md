# Approach Angle / Lead Angle Correction (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Core Correction - Master Level

## Description
Correction to Kienzle model when the cutting edge is not perpendicular to the feed direction.

## Formula
kc_effective = kc1.1 · (1 + k_lead · sin(κ))

Where κ = approach angle (lead angle)

## Typical k_lead Values
- 0° (orthogonal): 1.0
- 45°: 1.15–1.25
- 90° (slotting): 1.4–1.6

## PRISM Implementation
- SpeedFeedOrchestratorEngine applies lead angle correction automatically
- Critical for trochoidal and adaptive clearing

## Edge Cases
- κ < 15° → Force rises sharply
- Variable lead angle (5-axis) → Requires per-block recalculation

**Last Updated:** 2026-06-12