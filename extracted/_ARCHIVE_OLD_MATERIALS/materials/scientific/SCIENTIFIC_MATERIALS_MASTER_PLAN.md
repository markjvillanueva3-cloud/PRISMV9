# PRISM SCIENTIFIC MATERIALS - COMPREHENSIVE EXPANSION MASTER PLAN
## Version 2.0 - 100% Theoretical/Mathematical/Statistical Coverage
**Created:** 2026-01-22
**Target:** 400+ materials with complete scientific parameter coverage

---

# 🎯 GOAL: World-Class Material Database

PRISM will have the most comprehensive machining material database ever created, surpassing:
- Machining Data Handbook
- ASM Handbooks
- Sandvik/Kennametal/Seco databases
- Any commercial CAM software

---

# 📊 PARAMETER COVERAGE MATRIX (100% Required)

## SECTION A: Basic Properties (Currently Have)
| Parameter | Symbol | Unit | Required |
|-----------|--------|------|----------|
| Density | ρ | kg/m³ | ✅ |
| Melting Point/Range | Tm | °C | ✅ |
| Thermal Conductivity | k | W/m·K | ✅ |
| Specific Heat | Cp | J/kg·K | ✅ |
| Thermal Expansion | α | ×10⁻⁶/°C | ✅ |
| Elastic Modulus | E | GPa | ✅ |
| Poisson's Ratio | ν | - | ✅ |
| Hardness | HRC/HB/HV | - | ✅ |
| Tensile Strength | σu | MPa | ✅ |
| Yield Strength | σy | MPa | ✅ |
| Elongation | ε | % | ✅ |

## SECTION B: Cutting Force Parameters
| Parameter | Symbol | Unit | Description |
|-----------|--------|------|-------------|
| Kienzle kc1.1 | kc1_1 | MPa | Specific cutting force at h=1mm, b=1mm |
| Kienzle exponent | mc | - | Chip thickness exponent (typically 0.2-0.35) |
| Kienzle kc1.1 (tangential) | kc1_1_t | MPa | Tangential component |
| Kienzle kc1.1 (feed) | kc1_1_f | MPa | Feed force component |
| Kienzle kc1.1 (radial) | kc1_1_r | MPa | Radial force component |
| Force ratio Kf | Kf | - | Feed force / Main force ratio |
| Force ratio Kr | Kr | - | Radial force / Main force ratio |
| Rake angle correction | Cγ | - | kc multiplier per degree from 6° |
| Speed correction | Cv | - | kc multiplier for cutting speed |

## SECTION C: Johnson-Cook Constitutive Model
| Parameter | Symbol | Unit | Description |
|-----------|--------|------|-------------|
| Initial yield stress | A | MPa | Quasi-static yield strength |
| Hardening modulus | B | MPa | Strain hardening coefficient |
| Hardening exponent | n | - | Strain hardening exponent |
| Strain rate coefficient | C | - | Strain rate sensitivity |
| Thermal softening exp | m | - | Thermal softening exponent |
| Reference strain rate | ε̇₀ | s⁻¹ | Reference strain rate (usually 1.0) |
| Melting temperature | Tm | °C | For thermal softening calculation |
| Reference temperature | Tr | °C | Usually room temp (20-25°C) |

## SECTION D: Johnson-Cook Damage Model
| Parameter | Symbol | Unit | Description |
|-----------|--------|------|-------------|
| Damage constant D1 | D1 | - | Pressure/stress ratio effect |
| Damage constant D2 | D2 | - | Pressure/stress ratio effect |
| Damage constant D3 | D3 | - | Pressure/stress ratio effect |
| Damage constant D4 | D4 | - | Strain rate effect on damage |
| Damage constant D5 | D5 | - | Temperature effect on damage |

## SECTION E: Alternative Constitutive Models
### Zerilli-Armstrong (BCC metals: steels, refractory)
| Parameter | Symbol | Unit |
|-----------|--------|------|
| Athermal stress | C0 | MPa |
| Thermal activation | C1 | MPa |
| Temperature coefficient | C3 | K⁻¹ |
| Strain rate coefficient | C4 | K⁻¹ |
| Hall-Petch coefficient | C5 | MPa |
| Strain hardening coeff | n_ZA | - |

### Zerilli-Armstrong (FCC metals: aluminum, copper, nickel)
| Parameter | Symbol | Unit |
|-----------|--------|------|
| Athermal stress | C0 | MPa |
| Hardening coefficient | C2 | MPa |
| Temperature coefficient | C3 | K⁻¹ |
| Strain rate coefficient | C4 | K⁻¹ |

### Cowper-Symonds (Impact loading)
| Parameter | Symbol | Unit |
|-----------|--------|------|
| Static yield stress | σ0 | MPa |
| Strain rate constant | D | s⁻¹ |
| Strain rate exponent | q | - |

### Power Law (Simple model)
| Parameter | Symbol | Unit |
|-----------|--------|------|
| Strength coefficient | K | MPa |
| Strain hardening exp | n_pl | - |

## SECTION F: Tool Life / Taylor Parameters
| Parameter | Symbol | Unit | Description |
|-----------|--------|------|-------------|
| Taylor constant | C | m/min | Speed for 1-min tool life |
| Taylor exponent | n | - | Speed-life exponent (0.1-0.4) |
| Extended Taylor - feed | n_f | - | Feed exponent |
| Extended Taylor - DOC | n_d | - | Depth of cut exponent |
| Extended Taylor - HB | n_HB | - | Hardness exponent |
| Tool life constant | K_T | - | Combined constant |
| Flank wear rate | VB_rate | mm/min | At reference conditions |
| Crater wear rate | KT_rate | mm/min | At reference conditions |

## SECTION G: Chip Formation Parameters
| Parameter | Symbol | Unit | Description |
|-----------|--------|------|-------------|
| Chip type | - | enum | continuous/discontinuous/segmented/BUE |
| Shear angle | φ | ° | Primary shear plane angle |
| Chip compression ratio | ζ | - | Chip thickness / uncut chip thickness |
| Chip curl radius | rc | mm | Natural chip curl radius |
| Segmentation frequency | fseg | kHz | For segmented chips |
| Segment spacing | Ls | μm | Distance between segments |
| Adiabatic shear threshold | γ_crit | - | Critical strain for segmentation |
| Minimum chip thickness | hmin | μm | Below this = ploughing |
| Minimum chip thickness ratio | hmin/re | - | Ratio to edge radius |
| Stagnation angle | θs | ° | Material separation angle |

## SECTION H: Friction / Tribology Parameters
| Parameter | Symbol | Unit | Description |
|-----------|--------|------|-------------|
| Coulomb friction coeff | μ | - | Sliding zone friction |
| Sticking friction factor | m_f | - | Sticking zone (0-1, 1=full sticking) |
| Friction angle | β | ° | arctan(μ) |
| Contact length ratio | lc/h | - | Contact length / chip thickness |
| Tool-chip interface temp | Tint | °C | At reference speed |
| Seizure threshold | Tseize | °C | Full sticking temperature |
| Adhesion tendency | - | 1-10 | Qualitative scale |
| BUE formation range | - | m/min | Speed range for BUE |

## SECTION I: Thermal Parameters
| Parameter | Symbol | Unit | Description |
|-----------|--------|------|-------------|
| Specific cutting energy | u | J/mm³ | Energy per unit volume |
| Heat partition to chip | Rchip | % | % of heat to chip |
| Heat partition to workpiece | Rwork | % | % of heat to workpiece |
| Heat partition to tool | Rtool | % | % of heat to tool |
| Thermal number | Pe | - | Peclet number at ref speed |
| Thermal diffusivity | α_th | mm²/s | k/(ρ·Cp) |
| Thermal softening threshold | Tsoft | °C | Significant strength loss |
| Recrystallization temp | Trex | °C | Dynamic recrystallization |
| Phase transformation temp | Tphase | °C | If applicable (steels: Ac1, Ac3) |
| Oxidation threshold | Tox | °C | Significant oxidation begins |

## SECTION J: Surface Integrity Parameters
| Parameter | Symbol | Unit | Description |
|-----------|--------|------|-------------|
| Residual stress tendency | σres | - | +tensile, -compressive, neutral |
| Residual stress magnitude | σres_mag | MPa | Typical surface residual stress |
| White layer threshold | Twl | °C | Temperature for white layer |
| White layer susceptibility | - | 1-10 | 10=highly susceptible |
| Work hardening depth | dharden | μm | Affected depth |
| Work hardening ratio | HVsurf/HVbulk | - | Surface/bulk hardness ratio |
| Achievable Ra (turning) | Ra_turn | μm | Typical achievable |
| Achievable Ra (milling) | Ra_mill | μm | Typical achievable |
| Achievable Ra (grinding) | Ra_grind | μm | Typical achievable |
| Burr formation tendency | - | 1-10 | 10=severe burrs |
| Burr type | - | enum | rollover/tear/Poisson/cutoff |

## SECTION K: Machinability Indices
| Parameter | Symbol | Unit | Description |
|-----------|--------|------|-------------|
| AISI machinability rating | M_AISI | % | Relative to B1112 (100%) |
| Copper alloy rating | M_Cu | % | Relative to C360 (100%) |
| Speed factor | Kv | - | Multiplier vs reference |
| Feed factor | Kf | - | Multiplier vs reference |
| DOC factor | Kd | - | Multiplier vs reference |
| Tool wear factor | Kw | - | Relative tool wear rate |
| Surface finish factor | Ks | - | Relative surface quality |
| Chip control factor | Kc | - | Chip breakability (1-10) |
| Power factor | Kp | - | Relative power consumption |

## SECTION L: Process-Specific Parameters
| Parameter | Unit | Description |
|-----------|------|-------------|
| Flood coolant effectiveness | 1-10 | How much coolant helps |
| MQL effectiveness | 1-10 | Minimum quantity lubrication |
| Cryogenic suitability | boolean | LN2/CO2 machining viable |
| Cryogenic benefit | % | Tool life improvement |
| Dry machining viability | boolean | Can machine without coolant |
| HSM speed limit | m/min | High-speed machining limit |
| HSM benefit | % | Improvement at HSM speeds |
| EDM machinability | 1-10 | Wire/sinker EDM suitability |
| Laser cutting suitability | 1-10 | Laser machining |
| Waterjet cutting | 1-10 | Abrasive waterjet |

## SECTION M: Statistical / Uncertainty Parameters
| Parameter | Description |
|-----------|-------------|
| Data source | Primary reference |
| Source reliability | high/medium/low/estimated |
| Parameter confidence | % confidence interval |
| Standard deviation | Where measured data exists |
| Sample size | n for measured parameters |
| Year of data | Publication year |
| Recommended safety factor | For calculations |
| Validation status | validated/unvalidated/theoretical |

---

# 📦 MATERIAL CATEGORIES & COUNTS

## Target: 400+ Materials Total

| Category | Current | Target | Gap |
|----------|---------|--------|-----|
| Carbon & Alloy Steels | 12 | 40 | +28 |
| Tool Steels | 20 | 30 | +10 |
| Stainless Steels | 18 | 45 | +27 |
| Cast Irons | 28 | 35 | +7 |
| Aluminum Alloys | 29 | 50 | +21 |
| Titanium Alloys | 17 | 30 | +13 |
| Nickel Superalloys | 21 | 40 | +19 |
| Copper Alloys | 23 | 40 | +17 |
| Cobalt Alloys | 5 | 15 | +10 |
| Magnesium Alloys | 6 | 15 | +9 |
| Refractory Metals | 8 | 20 | +12 |
| Cemented Carbides | 3 | 10 | +7 |
| Precious Metals | 0 | 10 | +10 |
| Zinc Alloys | 0 | 8 | +8 |
| Plastics/Composites | 0 | 20 | +20 |
| **TOTAL** | **193** | **408** | **+215** |

---

# 📋 DETAILED MATERIAL LISTS BY CATEGORY

## 1. CARBON & ALLOY STEELS (Target: 40)

### Low Carbon (≤0.25% C)
- 1006, 1008, 1010, 1015, 1018, 1020, 1022, 1025
- A36 (structural)
- 1117, 1141 (free machining)

### Medium Carbon (0.25-0.55% C)
- 1030, 1035, 1040, 1045, 1050, 1055
- 1137, 1144 (free machining)

### High Carbon (>0.55% C)
- 1060, 1070, 1080, 1090, 1095
- 1566 (spring steel)

### Alloy Steels - Chromium
- 5120, 5140, 5160
- 52100 (bearing steel)

### Alloy Steels - Chromium-Molybdenum
- 4130, 4140, 4145, 4150
- 4340 (aircraft quality)

### Alloy Steels - Nickel-Chromium-Molybdenum
- 8620, 8640, 8740
- 9310 (carburizing grade)

### Alloy Steels - Other
- 4320, 4615, 4620 (carburizing)
- 6150 (spring steel)
- 300M (ultra-high strength)
- Maraging 250, 300, 350

## 2. TOOL STEELS (Target: 30)

### Water Hardening (W)
- W1, W2

### Oil Hardening (O)
- O1, O2, O6, O7

### Air Hardening (A)
- A2, A4, A6, A10

### High Carbon High Chromium (D)
- D2, D3, D4, D7

### Shock Resistant (S)
- S1, S5, S7

### Hot Work (H)
- H10, H11, H12, H13, H21, H26

### High Speed (M)
- M1, M2, M4, M7, M42

### High Speed (T)
- T1, T4, T15

### Mold Steels (P)
- P20, P21

### Low Alloy Special Purpose (L)
- L2, L6

## 3. STAINLESS STEELS (Target: 45)

### Austenitic - 300 Series
- 301, 302, 303, 304, 304L
- 309, 310, 310S
- 316, 316L, 316Ti
- 317, 317L
- 321, 347, 348
- 904L

### Austenitic - High Performance
- AL-6XN, 254 SMO, 654 SMO
- Nitronic 50 (XM-19), Nitronic 60
- 20Cb-3 (Carpenter 20)

### Ferritic - 400 Series
- 405, 409, 430, 430F, 434, 436, 439, 444, 446

### Martensitic - 400 Series
- 403, 410, 414, 416, 420, 420F
- 431, 440A, 440B, 440C

### Precipitation Hardening
- 13-8 Mo (XM-13)
- 15-5 PH (XM-12)
- 17-4 PH (630)
- 17-7 PH (631)
- Custom 450, Custom 455, Custom 465
- A-286

### Duplex
- 2205 (S31803/S32205)
- 2507 (S32750)
- 2304 (S32304)
- Zeron 100

### Super Duplex
- SAF 2507

## 4. CAST IRONS (Target: 35)

### Gray Iron
- Class 20, 25, 30, 35, 40, 45, 50, 60

### Ductile Iron
- 60-40-18, 65-45-12, 80-55-06
- 100-70-03, 120-90-02

### Compacted Graphite Iron (CGI)
- Grade 300, 350, 400, 450

### Malleable Iron
- 32510, 35018 (ferritic)
- 45006, 45008 (pearlitic)

### White Iron
- Ni-Hard Type 1, 2, 4
- High-Chrome (25% Cr)

### Austempered Ductile Iron (ADI)
- Grade 1 (900), Grade 2 (1050)
- Grade 3 (1200), Grade 4 (1400), Grade 5 (1600)

### Ni-Resist (Austenitic)
- Type 1, 1b, 2, 2b, 3, 4, 5, D-2, D-2C, D-3, D-4, D-5

## 5. ALUMINUM ALLOYS (Target: 50)

### 1xxx Series (Pure)
- 1050, 1060, 1100, 1145, 1199

### 2xxx Series (Cu)
- 2011, 2014, 2017, 2024, 2124
- 2219, 2618

### 3xxx Series (Mn)
- 3003, 3004, 3005, 3105

### 5xxx Series (Mg)
- 5005, 5050, 5052, 5056
- 5083, 5086, 5154, 5182, 5251, 5454, 5456

### 6xxx Series (Mg-Si)
- 6005, 6013, 6060, 6061, 6063
- 6066, 6070, 6082, 6101, 6262, 6351

### 7xxx Series (Zn)
- 7005, 7020, 7049, 7050, 7055
- 7075, 7079, 7175, 7178, 7475

### Cast Alloys
- A356 (AlSi7Mg), A357
- A380 (die cast), 383, 384
- A413, B390
- 201, 206, 242, 319, 355, 356, 357, 390, 535

## 6. TITANIUM ALLOYS (Target: 30)

### Commercially Pure
- Grade 1, 2, 3, 4, 7, 11, 12

### Alpha Alloys
- Ti-5Al-2.5Sn, Ti-3Al-2.5V, Ti-0.3Mo-0.8Ni

### Near-Alpha Alloys
- Ti-6Al-2Sn-4Zr-2Mo (Ti-6242)
- Ti-6Al-2Sn-4Zr-2Mo-Si (Ti-6242S)
- Ti-8Al-1Mo-1V (Ti-811)
- Ti-5Al-5Sn-2Zr-2Mo (Ti-5522)
- IMI 834

### Alpha-Beta Alloys
- Ti-6Al-4V (Grade 5)
- Ti-6Al-4V ELI (Grade 23)
- Ti-6Al-6V-2Sn (Ti-662)
- Ti-6Al-2Sn-4Zr-6Mo (Ti-6246)
- Ti-6Al-7Nb
- Ti-3Al-2.5V
- Ti-17 (Ti-5Al-2Sn-2Zr-4Mo-4Cr)
- Ti-55531 (Ti-5Al-5Mo-5V-3Cr)
- SP-700 (Ti-4.5Al-3V-2Mo-2Fe)

### Beta Alloys
- Ti-15V-3Cr-3Al-3Sn (Ti-15-3)
- Ti-10V-2Fe-3Al (Ti-10-2-3)
- Ti-3Al-8V-6Cr-4Mo-4Zr (Beta C)
- Ti-5Al-5Mo-5V-3Cr (Ti-5553)
- Ti-15Mo (ASTM F2066)
- Ti-13V-11Cr-3Al (Beta III)
- Ti-35V-15Cr (Alloy C)

## 7. NICKEL SUPERALLOYS (Target: 40)

### Solid Solution Strengthened
- Inconel 600, 601, 617, 625, 690
- Hastelloy B, B-2, B-3
- Hastelloy C-4, C-22, C-276, C-2000
- Hastelloy G-30, G-35
- Hastelloy N, S, W, X
- Haynes 230, 556

### Precipitation Hardened - Wrought
- Inconel 706, 718, 725, X-750, 751
- Waspaloy
- Astroloy
- Udimet 500, 520, 630, 700, 710, 720
- René 41, 95
- Nimonic 75, 80A, 90, 105, 115, 263
- Pyromet 860

### Cast Superalloys
- IN-100, IN-713, IN-738LC, IN-792
- MAR-M-246, MAR-M-247
- René 77, René 80, René 125
- B-1900, PWA 1480, PWA 1484
- CMSX-2, CMSX-4, CMSX-10
- CM 247 LC

## 8. COPPER ALLOYS (Target: 40)

### Pure Copper
- C101 (OFHC), C102, C110 (ETP), C122 (DHP)

### High Copper Alloys
- C145 (Tellurium), C147, C155 (Silver bearing)

### Brass - Low Zinc
- C210, C220 (Commercial Bronze), C226, C230 (Red Brass)

### Brass - Standard
- C260 (Cartridge), C268, C270, C272, C280

### Brass - High Zinc
- C330, C340

### Leaded Brass
- C353, C360 (Free Cutting), C370, C377, C380, C385

### Naval/Special Brass
- C443, C444, C464, C465, C467 (Naval Brass)
- C485, C687 (Aluminum Brass)

### Phosphor Bronze
- C505, C510, C511, C519, C521, C524, C544

### Aluminum Bronze
- C606, C613, C614, C623, C624, C630, C632
- C954, C955, C958

### Silicon Bronze
- C651, C655, C661

### Copper-Nickel
- C706 (90-10), C710, C715 (70-30), C722

### Nickel Silver
- C745, C752, C757, C762, C770

### Beryllium Copper
- C170, C172, C175, C510, C630

## 9. COBALT ALLOYS (Target: 15)

### Wear Resistant (Stellite)
- Stellite 1, 3, 6, 6B, 12, 21, 25, 31, 190, 306

### Aerospace
- L-605 (Haynes 25), Haynes 188
- MP35N, MP159
- Elgiloy

### Medical
- Co-Cr-Mo (ASTM F75, F799, F1537)

## 10. MAGNESIUM ALLOYS (Target: 15)

### Wrought - AZ Series
- AZ31B, AZ61A, AZ80A

### Wrought - ZK Series
- ZK60A, ZK40A

### Wrought - Other
- M1A, HK31A, HM21A, HM31A

### Cast - AZ Series
- AZ91D, AZ91E

### Cast - AM Series
- AM60B, AM50A

### Cast - Rare Earth
- WE43, WE54, Elektron 21, EV31A, QE22A

## 11. REFRACTORY METALS (Target: 20)

### Tungsten
- Pure W (99.95%), W-1%La2O3, W-2%ThO2
- W-3Re, W-5Re, W-25Re, W-26Re

### Molybdenum
- Pure Mo, TZM (Mo-0.5Ti-0.08Zr)
- Mo-30W, Mo-50Re, MHC

### Tantalum
- Pure Ta, Ta-2.5W, Ta-10W
- T-111 (Ta-8W-2Hf), T-222

### Niobium
- Pure Nb, Nb-1Zr, C103 (Nb-10Hf-1Ti)
- Cb-752 (Nb-10W-2.5Zr), FS-85

### Rhenium
- Pure Re, Re-Mo, Re-W

## 12. CEMENTED CARBIDES (Target: 10)

### Straight WC-Co
- WC-3Co, WC-6Co, WC-10Co, WC-15Co, WC-20Co, WC-25Co

### WC-Co with Additives
- WC-TiC-Co, WC-TiC-TaC-Co, WC-TiC-TaC-NbC-Co

### Cermets
- TiC-Ni-Mo, TiCN-based

## 13. PRECIOUS METALS (Target: 10)

### Gold
- Pure Au, Au-Cu alloys, Au-Pt alloys

### Silver
- Pure Ag, Sterling (92.5%), Ag-Cu-Zn

### Platinum Group
- Pt, Pd, Pt-Ir, Pt-Rh

## 14. ZINC ALLOYS (Target: 8)

### Die Cast (Zamak)
- Zamak 2, 3, 5, 7
- ZA-8, ZA-12, ZA-27

### Wrought
- Zn-Cu-Ti

## 15. ENGINEERING PLASTICS & COMPOSITES (Target: 20)

### Thermoplastics
- PEEK, PEI (Ultem), PTFE (Teflon), Nylon 6/66
- Acetal (Delrin), PC, POM, ABS, UHMWPE

### Thermosets
- Phenolic, Epoxy glass

### Composites
- CFRP, GFRP, Kevlar/Aramid, MMC (Al-SiC)

---

# 🗓️ REVISED SESSION PLAN

## Phase 2A: Enhanced Scientific Materials (Comprehensive)

Each session will now produce materials with 100% parameter coverage.

| Session | Category | Materials | Est. Size |
|---------|----------|-----------|-----------|
| SCI-2A-01 | Carbon Steels (Low/Med) | 20 | ~60 KB |
| SCI-2A-02 | Carbon Steels (High) + Alloy Steels | 20 | ~60 KB |
| SCI-2A-03 | Tool Steels Complete | 30 | ~90 KB |
| SCI-2A-04 | Stainless Austenitic | 22 | ~70 KB |
| SCI-2A-05 | Stainless Ferritic/Martensitic/PH | 23 | ~70 KB |
| SCI-2A-06 | Cast Irons Complete | 35 | ~100 KB |
| SCI-2A-07 | Aluminum Wrought | 30 | ~90 KB |
| SCI-2A-08 | Aluminum Cast + Special | 20 | ~60 KB |
| SCI-2A-09 | Titanium Complete | 30 | ~100 KB |
| SCI-2A-10 | Nickel Wrought | 25 | ~90 KB |
| SCI-2A-11 | Nickel Cast + Special | 15 | ~55 KB |
| SCI-2A-12 | Copper Part 1 | 20 | ~60 KB |
| SCI-2A-13 | Copper Part 2 | 20 | ~60 KB |
| SCI-2A-14 | Cobalt + Magnesium | 30 | ~90 KB |
| SCI-2A-15 | Refractory Complete | 20 | ~70 KB |
| SCI-2A-16 | Carbides + Precious + Zinc | 28 | ~80 KB |
| SCI-2A-17 | Plastics & Composites | 20 | ~50 KB |
| SCI-2A-18 | Master Index + Validation | - | ~30 KB |

**Total: 18 sessions, ~408 materials, ~1.3 MB of data**

---

# 📝 TEMPLATE: Complete Material Entry

```javascript
'AISI_1045': {
  // === IDENTIFICATION ===
  name: 'AISI 1045',
  alternateNames: ['SAE 1045', 'UNS G10450', 'C45', 'EN8', 'S45C'],
  uns: 'G10450',
  standard: 'ASTM A29',
  description: 'Medium carbon steel, general purpose',
  category: 'carbon_steels',
  subcategory: 'medium_carbon',
  
  // === COMPOSITION ===
  composition: {
    C: { min: 0.43, max: 0.50, nominal: 0.46, unit: '%' },
    Mn: { min: 0.60, max: 0.90, nominal: 0.75, unit: '%' },
    P: { max: 0.040, unit: '%' },
    S: { max: 0.050, unit: '%' },
    Si: { min: 0.15, max: 0.35, nominal: 0.25, unit: '%' },
    Fe: { balance: true, unit: '%' }
  },
  
  // === CONDITIONS/HEAT TREATMENTS ===
  conditions: {
    'Hot_Rolled': {
      temper: 'As-rolled',
      hardness: { brinell: 179, rockwellB: 86 },
      tensileStrength: { value: 620, unit: 'MPa' },
      yieldStrength: { value: 340, unit: 'MPa' },
      elongation: { value: 16, unit: '%' },
      reductionOfArea: { value: 40, unit: '%' },
      
      // Kienzle cutting force
      kienzle: {
        kc1_1: { value: 1780, unit: 'MPa', std: 85 },
        mc: { value: 0.26, std: 0.02 },
        kc1_1_tangential: { value: 1780, unit: 'MPa' },
        kc1_1_feed: { value: 712, unit: 'MPa' },
        kc1_1_radial: { value: 534, unit: 'MPa' },
        forceRatio_Kf: { value: 0.40 },
        forceRatio_Kr: { value: 0.30 },
        rakeAngleCorrection_Cγ: { value: 1.5, unit: '%/degree' },
        speedCorrection_Cv: { value: 0.95, refSpeed: 200, unit: 'm/min' },
        source: 'König & Klocke (1997)',
        reliability: 'high',
        validationStatus: 'validated'
      },
      
      // Johnson-Cook constitutive
      johnsonCook: {
        A: { value: 553, unit: 'MPa', std: 15 },
        B: { value: 600, unit: 'MPa', std: 25 },
        n: { value: 0.234, std: 0.01 },
        C: { value: 0.013, std: 0.002 },
        m: { value: 1.0, std: 0.05 },
        epsilon_dot_0: { value: 1.0, unit: 's⁻¹' },
        Tm: { value: 1460, unit: '°C' },
        Tr: { value: 20, unit: '°C' },
        source: 'Jaspers & Dautzenberg (2002)',
        reliability: 'high'
      },
      
      // Johnson-Cook damage
      johnsonCookDamage: {
        D1: { value: 0.05 },
        D2: { value: 3.44 },
        D3: { value: -2.12 },
        D4: { value: 0.002 },
        D5: { value: 0.61 },
        source: 'Johnson & Cook (1985)',
        reliability: 'medium'
      },
      
      // Zerilli-Armstrong (BCC)
      zerilliArmstrong: {
        C0: { value: 175, unit: 'MPa' },
        C1: { value: 1160, unit: 'MPa' },
        C3: { value: 0.0052, unit: 'K⁻¹' },
        C4: { value: 0.00019, unit: 'K⁻¹' },
        C5: { value: 300, unit: 'MPa' },
        n: { value: 0.32 },
        source: 'Zerilli & Armstrong (1987)',
        reliability: 'medium'
      },
      
      // Taylor tool life
      taylor: {
        C_carbide: { value: 280, unit: 'm/min', toolGrade: 'P20' },
        n_carbide: { value: 0.25 },
        C_HSS: { value: 45, unit: 'm/min' },
        n_HSS: { value: 0.12 },
        extendedCoeffs: {
          n_feed: { value: 0.77 },
          n_depth: { value: 0.37 },
          n_hardness: { value: 1.75 }
        },
        flankWearRate_VB: { value: 0.15, unit: 'mm/min', conditions: 'V=200, f=0.2, ap=2' },
        source: 'Machining Data Handbook',
        reliability: 'high'
      },
      
      // Chip formation
      chipFormation: {
        chipType: 'continuous',
        chipTypeRange: { low: 'continuous', medium: 'continuous', high: 'segmented_onset' },
        shearAngle: { value: 25, unit: '°', std: 3 },
        chipCompressionRatio: { value: 2.8, std: 0.3 },
        chipCurlRadius: { value: 3.5, unit: 'mm' },
        segmentationFrequency: { value: null, notes: 'Not segmented at normal speeds' },
        adiabaticShearThreshold: { value: 2.5, notes: 'Strain for segmentation onset' },
        minimumChipThickness: { value: 5, unit: 'μm' },
        minimumChipThicknessRatio: { value: 0.25, notes: 'hmin/edge_radius' },
        stagnationAngle: { value: 55, unit: '°' },
        BUE_tendency: { value: 4, scale: '1-10' },
        BUE_speedRange: { min: 15, max: 45, unit: 'm/min' }
      },
      
      // Friction/tribology
      friction: {
        coulombCoeff: { value: 0.5, range: { min: 0.4, max: 0.6 } },
        stickingFrictionFactor: { value: 0.8, notes: 'At low speeds' },
        frictionAngle: { value: 26.5, unit: '°' },
        contactLengthRatio: { value: 2.0 },
        toolChipInterfaceTemp: { value: 450, unit: '°C', atSpeed: 200 },
        seizureThreshold: { value: 750, unit: '°C' },
        adhesionTendency: { value: 5, scale: '1-10' }
      },
      
      // Thermal cutting
      thermal: {
        specificCuttingEnergy: { value: 2.8, unit: 'J/mm³', atSpeed: 200 },
        heatPartition: {
          chip: { value: 75, unit: '%' },
          workpiece: { value: 15, unit: '%' },
          tool: { value: 10, unit: '%' }
        },
        pecletNumber: { value: 8.5, atSpeed: 200 },
        thermalSofteningThreshold: { value: 550, unit: '°C' },
        recrystallizationTemp: { value: 450, unit: '°C' },
        phaseTransformation: {
          Ac1: { value: 725, unit: '°C' },
          Ac3: { value: 780, unit: '°C' },
          Ms: { value: 350, unit: '°C' }
        },
        oxidationThreshold: { value: 300, unit: '°C' }
      },
      
      // Surface integrity
      surfaceIntegrity: {
        residualStressTendency: 'tensile',
        residualStressMagnitude: { value: 350, unit: 'MPa', range: { min: 200, max: 500 } },
        whiteLayerThreshold: { value: 750, unit: '°C' },
        whiteLayerSusceptibility: { value: 5, scale: '1-10' },
        workHardeningDepth: { value: 100, unit: 'μm' },
        workHardeningRatio: { value: 1.15 },
        achievableRa: {
          turning: { min: 0.8, typical: 1.6, max: 6.3, unit: 'μm' },
          milling: { min: 0.8, typical: 1.6, max: 6.3, unit: 'μm' },
          grinding: { min: 0.1, typical: 0.4, max: 1.6, unit: 'μm' }
        },
        burrFormationTendency: { value: 4, scale: '1-10' },
        burrType: 'rollover'
      },
      
      // Machinability indices
      machinability: {
        AISI_rating: { value: 55, unit: '%', basis: 'B1112=100%' },
        speedFactor: { value: 0.55 },
        feedFactor: { value: 1.0 },
        DOC_factor: { value: 1.0 },
        toolWearFactor: { value: 1.1 },
        surfaceFinishFactor: { value: 1.0 },
        chipControlFactor: { value: 7, scale: '1-10' },
        powerFactor: { value: 1.05 }
      },
      
      // Process-specific
      processSpecific: {
        floodCoolantEffectiveness: { value: 8, scale: '1-10' },
        MQL_effectiveness: { value: 6, scale: '1-10' },
        cryogenicSuitable: true,
        cryogenicBenefit: { value: 40, unit: '%', notes: 'Tool life improvement' },
        dryMachiningViable: true,
        HSM_speedLimit: { value: 800, unit: 'm/min' },
        HSM_benefit: { value: 15, unit: '%' },
        EDM_machinability: { value: 8, scale: '1-10' },
        laserCuttingSuitability: { value: 7, scale: '1-10' },
        waterjetCutting: { value: 9, scale: '1-10' }
      }
    },
    
    'Normalized': { /* Similar structure */ },
    'Annealed': { /* Similar structure */ },
    'Quenched_Tempered_HRC28': { /* Similar structure */ },
    'Quenched_Tempered_HRC40': { /* Similar structure */ },
    'Induction_Hardened_Surface': { /* Similar structure */ }
  },
  
  // === PHYSICAL PROPERTIES (Condition-independent) ===
  physical: {
    density: { value: 7850, unit: 'kg/m³' },
    meltingRange: { min: 1425, max: 1480, unit: '°C' },
    thermalConductivity: { value: 51.9, unit: 'W/m·K', at: 100, atUnit: '°C' },
    thermalConductivityVsTemp: [
      { temp: 100, value: 51.9 },
      { temp: 200, value: 49.8 },
      { temp: 400, value: 44.0 },
      { temp: 600, value: 37.0 }
    ],
    specificHeat: { value: 486, unit: 'J/kg·K' },
    thermalExpansion: { value: 11.7, unit: '×10⁻⁶/°C', range: '20-100°C' },
    thermalDiffusivity: { value: 13.6, unit: 'mm²/s' },
    elasticModulus: { value: 205, unit: 'GPa' },
    shearModulus: { value: 80, unit: 'GPa' },
    poissonsRatio: { value: 0.29 },
    electricalResistivity: { value: 0.171, unit: 'μΩ·m' }
  },
  
  // === STATISTICAL METADATA ===
  dataQuality: {
    overallConfidence: 'high',
    kienzleConfidence: { value: 95, unit: '%' },
    johnsonCookConfidence: { value: 90, unit: '%' },
    taylorConfidence: { value: 85, unit: '%' },
    primarySources: [
      'Machining Data Handbook 3rd Ed (1980)',
      'König & Klocke - Manufacturing Processes 1 (1997)',
      'Jaspers & Dautzenberg - IJMTM (2002)',
      'ASM Metals Handbook Vol 1 (1990)'
    ],
    lastUpdated: '2026-01-22',
    validatedAgainst: ['Sandvik Coromant', 'Kennametal', 'Iscar'],
    recommendedSafetyFactor: { value: 1.15, notes: 'For untested conditions' }
  },
  
  // === APPLICATIONS ===
  applications: [
    'Shafts', 'Gears', 'Axles', 'Bolts', 'Studs', 
    'Crankshafts', 'Connecting rods', 'Machinery parts'
  ],
  
  // === NOTES ===
  notes: [
    'Most widely used medium carbon steel',
    'Good balance of strength, ductility, and machinability',
    'Can be through-hardened or surface hardened',
    'Weldable with preheat/postheat'
  ]
}
```

---

# ✅ VALIDATION REQUIREMENTS

Every material entry MUST pass:

1. **Completeness Check**: All required parameters present
2. **Range Validation**: Values within physical limits
3. **Consistency Check**: Related parameters are consistent
4. **Source Documentation**: Primary source cited
5. **Cross-Reference**: Matches published data ±15%

---

**Document Version:** 2.0
**Created:** 2026-01-22
**Author:** Claude (PRISM Primary Developer)
