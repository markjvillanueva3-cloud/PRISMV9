# Nose Radius Effect on Effective Chip Thickness (OSCAR) — Max Variability

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Core Correction - Master Level
**Assessment:** Max variability applied

## Overview
When using tools with a nose radius, the effective chip thickness changes — especially at low depths of cut. This must be corrected to maintain proper chip load and avoid rubbing or poor chip formation.

## Core Formula (Max Variability)

```
h_effective = f · sin(κ) + r · (1 - cos(κ))
```

Where:
- `f` = feed per tooth (mm/tooth)
- `κ` = approach angle (degrees)
- `r` = nose radius (mm)

This formula varies significantly with:
- Nose radius size (0.2mm → 3.2mm+)
- Approach angle (45°, 60°, 90°, 120°)
- Radial engagement (ap vs r)

## Nose Radius by Major Brands & Variants

| Brand          | Common Nose Radii (mm)      | Typical Approach Angles | Notes |
|----------------|-----------------------------|--------------------------|-------|
| **Sandvik**    | 0.2, 0.4, 0.8, 1.2, 1.6    | 45°, 60°, 90°           | Strong in 0.8–1.6 for steel |
| **Kennametal** | 0.2, 0.4, 0.8, 1.2, 2.0    | 45°, 60°, 90°           | Good low-r options for finishing |
| **OSG**        | 0.2, 0.4, 0.8, 1.2         | 45°, 90°                | Strong in small radii for aluminum |
| **Mitsubishi** | 0.2, 0.4, 0.8, 1.6         | 45°, 60°, 90°           | Good balance across P/M/K |
| **Iscar**      | 0.2, 0.4, 0.8, 1.2, 2.4    | 45°, 60°, 90°           | Aggressive geometries |
| **Kyocera**    | 0.2, 0.4, 0.8, 1.2         | 45°, 90°                | Strong in small radii |
| **Tungaloy**   | 0.2, 0.4, 0.8, 1.6         | 45°, 60°, 90°           | Good for high-feed |

## Material-Specific Behavior

| Material Group | Recommended Nose Radius Range | Effect on h_effective | Notes |
|----------------|-------------------------------|-----------------------|-------|
| **P (Steel)**  | 0.8 – 2.0 mm                 | Moderate              | 0.8–1.2 most common |
| **M (Stainless)** | 0.4 – 1.2 mm              | High sensitivity      | Small radii preferred to reduce work hardening |
| **K (Cast Iron)** | 0.8 – 2.4 mm             | Low sensitivity       | Larger radii acceptable |
| **N (Aluminum)** | 0.2 – 0.8 mm             | Very high sensitivity | Small radii critical for finish |
| **S (Titanium)** | 0.4 – 1.2 mm             | High sensitivity      | Small radii reduce built-up edge |
| **H (Hardened)** | 0.2 – 0.8 mm             | Very high sensitivity | Small radii + low ap common |

## Operation-Specific Recommendations

- **Roughing (high ap):** Larger nose radii (1.2–2.4 mm) acceptable
- **Finishing (low ap):** Small nose radii (0.2–0.8 mm) strongly preferred
- **High-feed milling:** Very large radii (2.0–3.2 mm) with specific geometry

## PRISM Implementation

- ToolRegistry now stores nose radius + approach angle
- SpeedFeedOrchestratorEngine applies the h_effective correction when ap < 2r
- Automatic feedrate increase recommendation when correction is active

## Assessment Note
Max variability applied because nose radius effect is highly dependent on radius size, approach angle, material, and operation depth. Partial coverage would lead to incorrect chip load calculations.

**Last Updated:** 2026-06-12 (Max Variability Assessment applied)