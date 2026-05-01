# SESSION 1.A.1-SCI-01 LOG
## Scientific Materials Data - Carbon & Alloy Steels
**Date:** 2026-01-22/23
**Status:** ✅ COMPLETE

---

## Objectives
- Create modular JavaScript file for Carbon & Alloy Steels scientific data
- Include validated Kienzle coefficients (Kc1.1, mc) with sources
- Include Johnson-Cook constitutive parameters with multiple datasets where available
- Include thermal properties (temperature-dependent conductivity, specific heat, CTE)
- Include heat treatment transformation temperatures and procedures
- Include dimensional changes during heat treatment
- Include Taylor tool life coefficients by tool material
- Include helper functions for data retrieval

---

## Completed Tasks

### ✅ Created PRISM_CARBON_ALLOY_STEELS_SCIENTIFIC.js
**Location:** `EXTRACTED/materials/scientific/PRISM_CARBON_ALLOY_STEELS_SCIENTIFIC.js`
**Lines:** ~2,150
**Materials Included:** 12

### Materials with Full Scientific Data:

| Material | Type | J-C Available | Key Features |
|----------|------|---------------|--------------|
| AISI 1212 | Free-machining | ✗ | 100% machinability reference |
| AISI 12L14 | Leaded free-machining | ✗ | 165% machinability, safety warnings |
| AISI 1018 | Low carbon | ✓ (Guo 2006) | Carburizing data |
| AISI 1020 | Low carbon | ✓ (Original J-C 1983) | Classic J-C reference |
| AISI 1045 | Medium carbon | ✓ (Jaspers 2002 + alt) | Multiple conditions |
| AISI 1095 | High carbon | ✗ | Spheroidized data |
| AISI 4130 | Chromoly | ✓ (Sung 1999) | Aircraft grade |
| AISI 4140 | Chromoly | ✓ (Gray 1994 + 2 alts) | **Most validated** |
| AISI 4340 | Ni-Cr-Mo | ✓ (Chen 2011 + 2 alts) | Multiple J-C sets |
| AISI 8620 | Carburizing | ✓ (estimated) | Gear steel |
| 300M | Ultra-high-strength | ✓ (aerospace) | Landing gear steel |
| Maraging 300 | Maraging | ✓ (aerospace) | Dimensional stability data |
| AISI 52100 | Bearing steel | ✓ (Abed 2005) | Deep freeze treatment |

### Data Fields Per Material:
- `composition`: Elemental ranges
- `physicalProperties`: Density, E, G, ν
- `conditions`: Multiple heat treatment states, each with:
  - Hardness, tensile/yield strength
  - `kienzle`: Kc1.1, mc with sources
  - `johnsonCook`: A, B, n, C, m, Tmelt with source citations
  - `machinability`: Rating and characteristics
- `thermalProperties`: Temperature-dependent k, Cp, CTE, melting range
- `heatTreatment`: Temperatures, procedures, critical temps (A1, A3, Ms, Mf)
- `dimensionalChanges`: Growth/shrinkage for each HT step
- `taylorCoefficients`: By tool material (HSS, carbide, CBN)
- `recommendedParameters`: Speed/feed/DOC by condition

### Helper Functions Included:
- `getMaterial(id)` - Get material by ID
- `getKienzle(id, condition)` - Get Kienzle coefficients
- `getJohnsonCook(id, condition)` - Get J-C parameters
- `getAllMaterialIds()` - List all materials
- `searchByMachinability(min, max)` - Search by rating
- `getThermalPropertyAtTemp(id, prop, temp)` - Interpolated thermal data

---

## Files Created
1. `EXTRACTED/materials/scientific/PRISM_CARBON_ALLOY_STEELS_SCIENTIFIC.js` (~2,150 lines)

## Directory Created
1. `EXTRACTED/materials/scientific/`

---

## Data Sources Referenced
- Machining Data Handbook (3rd Ed.)
- ASM Metals Handbook Vol. 16: Machining
- Johnson & Cook (1983) - Original paper
- Gray et al. (1994) - 4140 validation
- Jaspers & Dautzenberg (2002) - 1045
- Guo & Nemat-Nasser (2006) - 1018
- Chen et al. (2011) - 4340
- Abed & Voyiadjis (2005) - 52100
- Heat Treater's Guide (ASM)

---

## Issues/Notes
- Micro-session approach working well - file completed without context compaction
- Johnson-Cook parameters include multiple alternative datasets for key materials (4140, 4340) for user selection based on application
- Some materials (1212, 12L14, 1095) lack J-C data in literature - noted as unavailable
- Safety warnings included for 12L14 (lead content)

---

## Next Session
**ID:** 1.A.1-SCI-02
**Focus:** Tool Steels scientific data
**Materials:** A2, D2, H13, M2, O1, S7, P20, CPM steels, etc.
**Estimated:** ~20 materials, ~2,500 lines

---

## Session Statistics
- Duration: ~20 minutes
- Lines written: ~2,150
- Materials completed: 12
- Files created: 1
- State updates: 2
