# Tool Deflection Variability Matrix (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Core Topic - Master Level (Max Variability Applied)

## Assessment
This topic requires maximum variability. Deflection behavior changes significantly with tool brand, geometry, length, and material.

## Overview
Tool deflection is a major source of dimensional error. It depends on tool diameter, length, material, and brand-specific geometry.

## Deflection Comparison (Relative to Standard Carbide End Mill)

| Tool Type                  | Major Brands                  | Relative Deflection | Notes |
|----------------------------|-------------------------------|---------------------|-------|
| Standard Carbide End Mill  | Sandvik, Kennametal, OSG      | 100% (baseline)     | Most common reference |
| High-Performance End Mill  | OSG, Mitsubishi, Tungaloy     | 85–95%              | Better core geometry |
| Variable Helix End Mill    | Sandvik, Kennametal, OSG      | 80–92%              | Reduced vibration helps |
| Long Reach End Mill        | All brands                    | 140–200%            | Length is the dominant factor |
| Solid Carbide Drill        | Sandvik, Kennametal, OSG      | 70–85%              | Much stiffer than end mills |
| Indexable End Mill         | Sandvik, Kennametal, Seco     | 110–130%            | Less stiff than solid carbide |
| Ceramic End Mill           | Kyocera, Sandvik              | 60–75%              | Very stiff but brittle |

## Brand Geometry Impact on Deflection

| Brand       | Geometry Feature            | Deflection Reduction vs Standard | Best Application |
|-------------|-----------------------------|----------------------------------|------------------|
| Sandvik     | CoroMill Plura              | 8–15%                            | General purpose |
| OSG         | EXO / A Brand               | 10–18%                           | Hardened materials |
| Mitsubishi  | VPX / VQ                    | 12–20%                           | High performance |
| Kennametal  | Mill 1 / Mill 4             | 5–12%                            | Value option |
| Tungaloy    | DoFeed                      | 8–15%                            | High feed |

## Key Variability Factors

- **Length/Diameter Ratio**: The single largest factor. L/D > 5 dramatically increases deflection.
- **Core Diameter**: Larger core = less deflection (OSG and Mitsubishi often optimize this).
- **Material Modulus**: Carbide is ~3× stiffer than HSS. Ceramic is even stiffer but brittle.
- **Coating Thickness**: Negligible effect on deflection.

**Last Updated:** 2026-06-12 (Max Variability Assessment passed)