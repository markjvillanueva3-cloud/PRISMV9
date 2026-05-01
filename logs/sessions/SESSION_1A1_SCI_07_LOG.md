# SESSION 1.A.1-SCI-07 LOG
## Nickel Superalloys Scientific Data

**Date:** January 22, 2026  
**Status:** ✅ COMPLETE  
**Duration:** ~12 minutes  

---

## Objectives
- [x] Create comprehensive nickel superalloys scientific database
- [x] Include Kienzle cutting coefficients (kc1_1, mc)
- [x] Include Johnson-Cook parameters (A, B, n, C, m)
- [x] Include physical properties (density, thermal conductivity, etc.)
- [x] Include machining fundamentals specific to nickel superalloys
- [x] Add utility functions for data access

---

## Files Created
| File | Size | Materials |
|------|------|-----------|
| `PRISM_NICKEL_SUPERALLOYS_SCIENTIFIC.js` | 66,004 bytes | 21 |

---

## Materials Included (21 total)

### Inconel Series (8)
| Alloy | Type | Machinability |
|-------|------|---------------|
| Inconel 600 | Solid Solution | D (15%) |
| Inconel 601 | Solid Solution | D (14%) |
| Inconel 617 | Solid Solution | D (13%) |
| Inconel 625 | Solid Solution | D (12%) |
| Inconel 706 | Precip. Hardened | D-E (14%/8%) |
| Inconel 718 | Precip. Hardened | D-E (12%/6%) |
| Inconel 725 | Precip. Hardened | D-E (12%/7%) |
| Inconel X-750 | Precip. Hardened | D-E (13%/8%) |

### Hastelloy Series (4)
| Alloy | Type | Machinability |
|-------|------|---------------|
| Hastelloy X | Solid Solution | D (16%) |
| Hastelloy C-276 | Solid Solution | D (11%) |
| Hastelloy C-22 | Solid Solution | D (12%) |
| Hastelloy B-2 | Solid Solution | E (8%) |

### Waspaloy (1)
| Alloy | Type | Machinability |
|-------|------|---------------|
| Waspaloy | Precip. Hardened | D-E (11%/6%) |

### Monel Series (2)
| Alloy | Type | Machinability |
|-------|------|---------------|
| Monel 400 | Solid Solution | C (30%) |
| Monel K-500 | Precip. Hardened | C-D (22%/12%) |

### René Series (3)
| Alloy | Type | Machinability |
|-------|------|---------------|
| René 41 | Precip. Hardened | D-E (10%/5%) |
| René 80 | Cast Precip. Hard | E (5%) |
| René 95 | P/M Precip. Hard | E (4%) - MOST DIFFICULT |

### Nimonic Series (2)
| Alloy | Type | Machinability |
|-------|------|---------------|
| Nimonic 80A | Precip. Hardened | D-E (14%/9%) |
| Nimonic 90 | Precip. Hardened | E (8%) |

### Udimet Series (2)
| Alloy | Type | Machinability |
|-------|------|---------------|
| Udimet 500 | Precip. Hardened | E (7%) |
| Udimet 720 | Precip. Hardened | E (4%) |

---

## Key Features Implemented

### Machining Fundamentals Section
Comprehensive guidance applicable to ALL nickel superalloys:
- Work hardening mechanisms and mitigation strategies
- Heat management (80% to tool vs 10% for steel)
- Tool selection hierarchy (ceramic/CBN for roughing, carbide for finishing)
- Coolant requirements (70-140 bar high-pressure)
- Surface integrity concerns (white layer, residual stress)

### Classification System
- Solid Solution: Mo/W/Cr strengthened (better machinability)
- Precipitation Hardened: γ′/γ″ strengthened (most difficult)
- Oxide Dispersion: Y2O3 particles (extremely difficult)

### Key Machining Insights Documented
- Inconel 718 is the most widely used superalloy - detailed dual-condition data
- René 95 is documented as MOST DIFFICULT common superalloy (4% of B1112)
- Monel 400 is easiest at 30% of B1112 (still challenging)
- Machine in solution treated condition before aging when possible
- Ceramic tools allow 5-10x higher speeds than carbide

---

## Data Quality

### Kienzle Parameters
- All alloys have kc1_1 and mc values
- Reliability ratings: good/medium/low based on source validation
- Range: 2100 MPa (Monel 400) to 4450 MPa (René 95)

### Johnson-Cook Parameters
- All alloys have A, B, n, C, m parameters
- Inconel 718 has dual-condition J-C parameters
- Reliability noted based on experimental validation
- Sources: Sima & Özel (2010), Kobayashi & Dodd (1989)

### Utility Functions Included
- `getMaterial(id)`, `getKienzle()`, `getJohnsonCook()`
- `getSolidSolutionAlloys()`, `getPrecipitationHardenedAlloys()`
- `searchByMachinability(min, max)`
- `getRecommendedTooling()`
- `getMachiningFundamentals()`

---

## Data Sources
- Machining Data Handbook (3rd Edition)
- ASM Specialty Handbook: Nickel, Cobalt, and Their Alloys
- Haynes International machining guides
- Special Metals Corporation technical data
- Sima & Özel (2010) - Johnson-Cook parameters
- König & Klocke (1997) - Kienzle parameters

---

## Next Session
**ID:** 1.A.1-SCI-08
**Focus:** Copper Alloys scientific data
**Materials:** 
- Free-machining brasses (C360, C385)
- Bronzes (Phosphor, Silicon, Aluminum)
- Beryllium Copper
- Copper-Nickel alloys
- Tellurium Copper
**Estimated:** ~30 materials, ~2,500 lines

---

## Session Statistics
- Duration: ~12 minutes
- File size: 66,004 bytes
- Materials completed: 21
- Files created: 1
- State updates: 1
- Scientific Materials Progress: 7/10 micro-sessions complete (145 materials total)
