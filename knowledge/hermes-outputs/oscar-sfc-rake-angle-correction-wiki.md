# Rake Angle Correction (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Core Correction - Master Level

## Description
Positive or negative rake angle significantly affects cutting force.

## Correction
kc_effective = kc1.1 · (1 + k_rake · (γ - γ0))

Where γ = rake angle in degrees

## Typical k_rake
- Steel: 0.015–0.025 per degree
- Aluminum: 0.01–0.015 per degree

## PRISM Implementation
- Applied in KienzleForceModelEngine
- Critical for high-positive and high-negative rake tools

## Edge Cases
- γ < -15° → Force increases dramatically
- High-positive rake on hardened steel → Edge chipping risk

**Last Updated:** 2026-06-12