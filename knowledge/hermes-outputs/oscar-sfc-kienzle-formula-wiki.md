# Kienzle Cutting Force Model (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Core Formula - Master Level

## Formula
Fc = kc1.1 · b · h^(1 - mc)

Where:
- kc1.1 = Specific cutting force at 1mm² chip cross-section (ISO group dependent)
- b = Width of cut (mm)
- h = Thickness of cut (mm)
- mc = Material exponent (0.14–0.41)

## Canonical kc1.1 Values (ISO Groups)
- P (Steel): 1800 N/mm²
- M (Stainless): 2100 N/mm²
- K (Cast Iron): 1100 N/mm²
- N (Aluminum): 700 N/mm²
- S (Superalloys): 2800 N/mm²
- H (Hardened): 3200 N/mm²

## Corrections Applied in PRISM
- Rake angle correction
- Wear land correction
- Size effect (small h)
- Approach angle effect (lead angle)

## Edge Cases
- h < 0.05mm → Size effect dominates
- Rake < -10° → Force increases sharply
- Worn tool (VB > 0.3mm) → Add Kwear term

## References
- Kienzle 1952
- PRISM SpeedFeedOrchestratorEngine
- JM Die validation data

**Last Updated:** 2026-06-12 (extracted from staging + engine)