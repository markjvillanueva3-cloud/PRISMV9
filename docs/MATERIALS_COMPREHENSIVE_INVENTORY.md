# PRISM COMPREHENSIVE MATERIALS INVENTORY
## Every Material That Gets Machined - Complete Database Specification
### Version 1.0 | Target: 2,500+ Materials

---

# EXECUTIVE SUMMARY

**Current State:** 1,530 materials across 6 ISO groups (P, M, K, N, S, H)
**Target State:** 2,500+ materials covering ALL machined material classes
**Gap:** X_SPECIALTY empty + expansion of existing categories

---

# SECTION 1: CURRENT COVERAGE ANALYSIS

## 1.1 Existing Database (1,530 materials)

| ISO Group | Category | Current | Target | Gap |
|-----------|----------|---------|--------|-----|
| P_STEELS | Carbon, Alloy, Tool Steels | 849 | 900 | +51 |
| M_STAINLESS | All Stainless Grades | 191 | 250 | +59 |
| K_CAST_IRON | Gray, Ductile, Special | 54 | 80 | +26 |
| N_NONFERROUS | Al, Cu, Ti, Mg, Zn | 398 | 500 | +102 |
| S_SUPERALLOYS | Ni-base, Co-base | 28 | 60 | +32 |
| H_HARDENED | Hardened Steels | 10 | 50 | +40 |
| **Subtotal** | | **1,530** | **1,840** | **+310** |

## 1.2 Missing Category: X_SPECIALTY (Target: 660+ materials)

| Subcategory | Code | Materials | Priority |
|-------------|------|-----------|----------|
| Composites | X-COMP | 80 | HIGH |
| Engineering Polymers | X-POLY | 120 | HIGH |
| Engineering Ceramics | X-CER | 50 | MEDIUM |
| Refractory Metals | X-REF | 40 | MEDIUM |
| Precious Metals | X-PREC | 25 | LOW |
| Graphite/Carbon | X-GRAP | 30 | MEDIUM |
| Glass/Optical | X-GLAS | 25 | LOW |
| Specialty Alloys | X-SPEC | 50 | MEDIUM |
| Wood/Natural | X-WOOD | 60 | MEDIUM |
| Foam/Soft Materials | X-FOAM | 30 | LOW |
| Powder Metallurgy | X-PM | 40 | MEDIUM |
| Additive Mfg Materials | X-AM | 60 | HIGH |
| Rubber/Elastomers | X-RUBE | 30 | LOW |
| Honeycomb/Sandwich | X-SAND | 20 | LOW |
| **Subtotal** | | **660** | |

---

# SECTION 2: DETAILED MATERIAL SPECIFICATIONS

## 2.1 X-COMP: COMPOSITES (80 materials)

### 2.1.1 Carbon Fiber Reinforced Polymers (CFRP) - 25 materials
| ID | Name | Matrix | Fiber | Layup |
|----|------|--------|-------|-------|
| X-COMP-001 | CFRP UD Epoxy Standard | Epoxy | T300 | Unidirectional |
| X-COMP-002 | CFRP UD Epoxy High Modulus | Epoxy | M55J | Unidirectional |
| X-COMP-003 | CFRP UD Epoxy Intermediate | Epoxy | T700 | Unidirectional |
| X-COMP-004 | CFRP UD Epoxy Aerospace | Epoxy | T800 | Unidirectional |
| X-COMP-005 | CFRP Woven Epoxy Plain | Epoxy | T300 | Plain Weave |
| X-COMP-006 | CFRP Woven Epoxy Twill | Epoxy | T300 | 2x2 Twill |
| X-COMP-007 | CFRP Woven Epoxy Satin | Epoxy | T300 | 5H Satin |
| X-COMP-008 | CFRP Quasi-Iso Standard | Epoxy | T300 | [0/±45/90]s |
| X-COMP-009 | CFRP Quasi-Iso High Strength | Epoxy | T700 | [0/±45/90]s |
| X-COMP-010 | CFRP BMI High Temp | BMI | T300 | Quasi-Iso |
| X-COMP-011 | CFRP PEEK Thermoplastic | PEEK | AS4 | UD |
| X-COMP-012 | CFRP PPS Thermoplastic | PPS | T300 | Woven |
| X-COMP-013 | CFRP Prepreg Autoclave | Epoxy | T700 | Various |
| X-COMP-014 | CFRP RTM Standard | Epoxy | T300 | Various |
| X-COMP-015 | CFRP Pultrusion Rod | Epoxy | T300 | UD |
| X-COMP-016 | CFRP Filament Wound Tube | Epoxy | T700 | Helical |
| X-COMP-017 | CFRP Short Fiber Molding | Epoxy | Chopped | Random |
| X-COMP-018 | CFRP Long Fiber Injection | PA6 | Chopped | Random |
| X-COMP-019 | CFRP Forged Composite | Epoxy | Chopped | Random 3D |
| X-COMP-020 | CFRP Sandwich w/Nomex | Epoxy | T300 | Sandwich |
| X-COMP-021 | CFRP Sandwich w/Foam | Epoxy | T300 | Sandwich |
| X-COMP-022 | CFRP/Al Hybrid GLARE-type | Epoxy | T300 | FML |
| X-COMP-023 | CFRP High Tg 180°C | Epoxy | T800 | Various |
| X-COMP-024 | CFRP Cyanate Ester Space | CE | M55J | UD |
| X-COMP-025 | CFRP Recycled Content | Epoxy | rCF | Random |

### 2.1.2 Glass Fiber Reinforced Polymers (GFRP) - 15 materials
| ID | Name | Matrix | Fiber | Layup |
|----|------|--------|-------|-------|
| X-COMP-026 | GFRP E-Glass Polyester | Polyester | E-Glass | CSM |
| X-COMP-027 | GFRP E-Glass Vinylester | Vinylester | E-Glass | Woven |
| X-COMP-028 | GFRP E-Glass Epoxy | Epoxy | E-Glass | Woven |
| X-COMP-029 | GFRP S-Glass Epoxy | Epoxy | S-Glass | UD |
| X-COMP-030 | GFRP S2-Glass High Perf | Epoxy | S2-Glass | Woven |
| X-COMP-031 | GFRP R-Glass Aerospace | Epoxy | R-Glass | UD |
| X-COMP-032 | GFRP Pultrusion Profile | Polyester | E-Glass | UD |
| X-COMP-033 | GFRP SMC Molding Compound | Polyester | E-Glass | Random |
| X-COMP-034 | GFRP BMC Bulk Molding | Polyester | E-Glass | Random |
| X-COMP-035 | GFRP FR Fire Retardant | Phenolic | E-Glass | Woven |
| X-COMP-036 | GFRP Marine Grade | Vinylester | E-Glass | Biax |
| X-COMP-037 | GFRP Wind Blade Grade | Epoxy | E-Glass | Triax |
| X-COMP-038 | GFRP Transparent | Epoxy | E-Glass | Thin |
| X-COMP-039 | GFRP PP Thermoplastic | PP | E-Glass | GMT |
| X-COMP-040 | GFRP PA Thermoplastic | PA66 | E-Glass | LFT |

### 2.1.3 Aramid Composites - 8 materials
| ID | Name | Matrix | Fiber | Layup |
|----|------|--------|-------|-------|
| X-COMP-041 | Kevlar 49 Epoxy UD | Epoxy | Kevlar 49 | UD |
| X-COMP-042 | Kevlar 49 Epoxy Woven | Epoxy | Kevlar 49 | Plain |
| X-COMP-043 | Kevlar 29 Ballistic | Phenolic | Kevlar 29 | Woven |
| X-COMP-044 | Twaron Composite | Epoxy | Twaron | Woven |
| X-COMP-045 | Kevlar/Carbon Hybrid | Epoxy | K49/T300 | Hybrid |
| X-COMP-046 | Nomex Honeycomb Core | - | Nomex | Honeycomb |
| X-COMP-047 | Technora High Temp | BMI | Technora | Woven |
| X-COMP-048 | Vectran Composite | Epoxy | Vectran | Woven |

### 2.1.4 Metal Matrix Composites (MMC) - 15 materials
| ID | Name | Matrix | Reinforcement | Form |
|----|------|--------|---------------|------|
| X-COMP-049 | Al-SiC 10% Cast | A356 | SiC Particles | Cast |
| X-COMP-050 | Al-SiC 20% Cast | A356 | SiC Particles | Cast |
| X-COMP-051 | Al-SiC 30% Wrought | 6061 | SiC Particles | Wrought |
| X-COMP-052 | Al-SiC 40% PM | 2124 | SiC Particles | PM |
| X-COMP-053 | Al-Al2O3 Saffil | A380 | Alumina Fiber | Cast |
| X-COMP-054 | Al-B4C Cermet | 6061 | B4C | PM |
| X-COMP-055 | Ti-SiC Monofilament | Ti-6Al-4V | SiC Fiber | Diffusion |
| X-COMP-056 | Ti-TiB Whisker | Ti-6Al-4V | TiB Whisker | PM |
| X-COMP-057 | Mg-SiC Cast | AZ91 | SiC Particles | Cast |
| X-COMP-058 | Cu-W Infiltrated | Cu | W Particles | Infiltrated |
| X-COMP-059 | Cu-Diamond Thermal | Cu | Diamond | Infiltrated |
| X-COMP-060 | Ni-Al2O3 ODS | Ni | Al2O3 | Mechanical |
| X-COMP-061 | Steel-TiC Cermet | Steel | TiC | PM |
| X-COMP-062 | Al-CNT Nanocomposite | Al | CNT | PM |
| X-COMP-063 | Mg-CNT Nanocomposite | Mg | CNT | PM |

### 2.1.5 Ceramic Matrix Composites (CMC) - 12 materials
| ID | Name | Matrix | Reinforcement | Process |
|----|------|--------|---------------|---------|
| X-COMP-064 | SiC/SiC Standard | SiC | SiC Fiber | CVI |
| X-COMP-065 | SiC/SiC Hi-Nicalon | SiC | Hi-Nicalon | CVI |
| X-COMP-066 | SiC/SiC Tyranno | SiC | Tyranno | MI |
| X-COMP-067 | C/SiC Standard | SiC | Carbon Fiber | CVI |
| X-COMP-068 | C/SiC Brake | SiC | Carbon Fiber | MI |
| X-COMP-069 | C/C Carbon-Carbon | Carbon | Carbon Fiber | CVI |
| X-COMP-070 | C/C High Density | Carbon | Carbon Fiber | CVI+Pitch |
| X-COMP-071 | Al2O3/Al2O3 | Alumina | Alumina Fiber | Sinter |
| X-COMP-072 | Mullite/Mullite | Mullite | Nextel 720 | Sinter |
| X-COMP-073 | ZrO2/ZrO2 | Zirconia | Zirconia Fiber | Sinter |
| X-COMP-074 | UHTC ZrB2-SiC | ZrB2 | SiC | HP |
| X-COMP-075 | UHTC HfB2-SiC | HfB2 | SiC | HP |

### 2.1.6 Special Composites - 5 materials
| ID | Name | Description |
|----|------|-------------|
| X-COMP-076 | Natural Fiber Flax | Bio-composite |
| X-COMP-077 | Natural Fiber Hemp | Bio-composite |
| X-COMP-078 | Basalt Fiber Composite | Volcanic fiber |
| X-COMP-079 | UHMWPE Dyneema | High strength PE |
| X-COMP-080 | PBO Zylon Composite | Ultra-high modulus |

---

## 2.2 X-POLY: ENGINEERING POLYMERS (120 materials)

### 2.2.1 High Performance Polymers - 30 materials
| ID | Name | Trade Names | Tg/Tm | Key Property |
|----|------|-------------|-------|--------------|
| X-POLY-001 | PEEK Unfilled | Victrex, Ketron | 143/343°C | High temp, chemical |
| X-POLY-002 | PEEK 30% GF | Ketron GF30 | 143/343°C | Stiffness |
| X-POLY-003 | PEEK 30% CF | Ketron CA30 | 143/343°C | Wear, strength |
| X-POLY-004 | PEEK Bearing Grade | Ketron HPV | 143/343°C | Low friction |
| X-POLY-005 | PEEK Medical Grade | Invibio | 143/343°C | Biocompatible |
| X-POLY-006 | PEI Unfilled | Ultem 1000 | 217°C | High temp, flame |
| X-POLY-007 | PEI 30% GF | Ultem 2300 | 217°C | Stiffness |
| X-POLY-008 | PEI 40% CF | Ultem 2400 | 217°C | Strength |
| X-POLY-009 | PAI Unfilled | Torlon 4203 | 275°C | Highest strength |
| X-POLY-010 | PAI 30% GF | Torlon 4301 | 275°C | Stiffness |
| X-POLY-011 | PAI Bearing | Torlon 4540 | 275°C | Low friction |
| X-POLY-012 | PPS Unfilled | Ryton | 85/285°C | Chemical resist |
| X-POLY-013 | PPS 40% GF | Ryton R-4 | 85/285°C | Stiffness |
| X-POLY-014 | PVDF Unfilled | Kynar | -40/170°C | Chemical, pure |
| X-POLY-015 | PVDF Homopolymer | Kynar 740 | -40/170°C | Semiconductor |
| X-POLY-016 | PSU Unfilled | Udel | 185°C | Clarity, temp |
| X-POLY-017 | PPSU Unfilled | Radel R | 220°C | Toughness |
| X-POLY-018 | PES Unfilled | Ultrason E | 225°C | Hydrolysis |
| X-POLY-019 | LCP Unfilled | Vectra | 280°C | Thin wall, flow |
| X-POLY-020 | PI Unfilled | Vespel SP-1 | 360°C | Extreme temp |
| X-POLY-021 | PI Graphite | Vespel SP-21 | 360°C | Wear |
| X-POLY-022 | PI MoS2 | Vespel SP-211 | 360°C | Low friction |
| X-POLY-023 | PTFE Unfilled | Teflon | 327°C | Lowest friction |
| X-POLY-024 | PTFE 25% GF | - | 327°C | Wear |
| X-POLY-025 | PTFE 25% CF | - | 327°C | Conductivity |
| X-POLY-026 | PTFE Bronze | - | 327°C | Compression |
| X-POLY-027 | FEP | Teflon FEP | 260°C | Melt processable |
| X-POLY-028 | PFA | Teflon PFA | 305°C | Pure, weldable |
| X-POLY-029 | ETFE | Tefzel | 267°C | Toughness |
| X-POLY-030 | ECTFE | Halar | 240°C | Chemical |

### 2.2.2 Engineering Plastics - 40 materials
| ID | Name | Trade Names | Tg/Tm | Key Property |
|----|------|-------------|-------|--------------|
| X-POLY-031 | PA6 Unfilled | Nylon 6 | 50/220°C | General purpose |
| X-POLY-032 | PA6 30% GF | - | 50/220°C | Stiffness |
| X-POLY-033 | PA66 Unfilled | Nylon 66 | 70/260°C | Higher temp |
| X-POLY-034 | PA66 30% GF | Zytel | 70/260°C | Structural |
| X-POLY-035 | PA66 50% GF | - | 70/260°C | High stiffness |
| X-POLY-036 | PA66 Toughened | Zytel ST | 70/260°C | Impact |
| X-POLY-037 | PA11 Unfilled | Rilsan B | 46/186°C | Flex, chemical |
| X-POLY-038 | PA12 Unfilled | Grilamid | 37/178°C | Low moisture |
| X-POLY-039 | PA46 Unfilled | Stanyl | 75/295°C | High temp nylon |
| X-POLY-040 | PA612 Unfilled | - | 46/210°C | Dimensional |
| X-POLY-041 | MXD6 Unfilled | - | 85/243°C | Barrier |
| X-POLY-042 | POM-H Unfilled | Delrin | -60/175°C | Springs, gears |
| X-POLY-043 | POM-H 20% GF | Delrin AF | -60/175°C | Stiffness |
| X-POLY-044 | POM-H Low Friction | Delrin AF | -60/175°C | Bearings |
| X-POLY-045 | POM-C Unfilled | Celcon | -50/165°C | Lower friction |
| X-POLY-046 | POM-C Toughened | - | -50/165°C | Impact |
| X-POLY-047 | PBT Unfilled | Valox | 50/225°C | Electrical |
| X-POLY-048 | PBT 30% GF | Valox 420 | 50/225°C | Connectors |
| X-POLY-049 | PET Unfilled | - | 75/250°C | Clarity |
| X-POLY-050 | PET 30% GF | Rynite | 75/250°C | Structural |
| X-POLY-051 | PC Unfilled | Lexan | 145°C | Clarity, impact |
| X-POLY-052 | PC 20% GF | Lexan | 145°C | Stiffness |
| X-POLY-053 | PC/ABS Blend | Cycoloy | 115°C | Balance |
| X-POLY-054 | PC/PBT Blend | Xenoy | 125°C | Chemical |
| X-POLY-055 | PPO Unfilled | Noryl | 215°C | Dimensional |
| X-POLY-056 | PPO 30% GF | Noryl GFN | 215°C | Stiffness |
| X-POLY-057 | PPE+PA Blend | Noryl GTX | 200°C | Chemical+heat |
| X-POLY-058 | ABS General | Cycolac | 105°C | Balance |
| X-POLY-059 | ABS High Impact | - | 105°C | Toughness |
| X-POLY-060 | ABS High Heat | - | 115°C | Temperature |
| X-POLY-061 | ABS Plating Grade | - | 105°C | Chrome plating |
| X-POLY-062 | ASA Unfilled | Luran S | 105°C | UV stable |
| X-POLY-063 | SAN Unfilled | Lustran | 105°C | Clarity |
| X-POLY-064 | PMMA Cast | Plexiglas | 105°C | Optical |
| X-POLY-065 | PMMA Cell Cast | - | 105°C | Thick sheet |
| X-POLY-066 | PMMA Extruded | - | 100°C | Sheet |
| X-POLY-067 | PMMA Impact | Plexiglas DR | 100°C | Toughened |
| X-POLY-068 | HIPS General | Styron | 95°C | Low cost |
| X-POLY-069 | PS Crystal | - | 100°C | Clarity |
| X-POLY-070 | SBC Block Copolymer | K-Resin | 95°C | Clarity+impact |

### 2.2.3 Commodity Plastics (Machined) - 20 materials
| ID | Name | Trade Names | Tm | Key Property |
|----|------|-------------|-----|--------------|
| X-POLY-071 | HDPE General | Hostalen | 130°C | Chemical, FDA |
| X-POLY-072 | HDPE UHMW | Tivar | 130°C | Wear, impact |
| X-POLY-073 | HDPE UHMW Reprocessed | - | 130°C | Economy |
| X-POLY-074 | LDPE Unfilled | - | 110°C | Flex |
| X-POLY-075 | PP Homopolymer | Pro-fax | 165°C | Chemical |
| X-POLY-076 | PP Copolymer | - | 165°C | Impact |
| X-POLY-077 | PP 30% GF | - | 165°C | Stiffness |
| X-POLY-078 | PP Talc Filled | - | 165°C | Dimensional |
| X-POLY-079 | PVC Rigid Type I | - | 80°C | Chemical, flame |
| X-POLY-080 | PVC Rigid Type II | - | 75°C | Impact |
| X-POLY-081 | CPVC | Corzan | 95°C | Higher temp |
| X-POLY-082 | PVC Foam (Foamex) | Sintra | 70°C | Light, sign |
| X-POLY-083 | Phenolic G10 | - | 150°C | Electrical |
| X-POLY-084 | Phenolic G11 | - | 170°C | Higher temp |
| X-POLY-085 | Phenolic LE Linen | - | 120°C | Machinability |
| X-POLY-086 | Phenolic CE Canvas | - | 120°C | Toughness |
| X-POLY-087 | Melamine Unfilled | - | 130°C | Hardness |
| X-POLY-088 | Epoxy Cast | - | varies | Tooling |
| X-POLY-089 | Epoxy Glass FR4 | - | 130°C | PCB |
| X-POLY-090 | Epoxy Tooling Board | - | 120°C | Patterns |

### 2.2.4 Specialty Polymers - 30 materials
| ID | Name | Description |
|----|------|-------------|
| X-POLY-091 | TPU Shore 80A | Flexible polyurethane |
| X-POLY-092 | TPU Shore 95A | Semi-rigid PU |
| X-POLY-093 | TPU Shore 60D | Rigid PU |
| X-POLY-094 | TPE General | Thermoplastic elastomer |
| X-POLY-095 | TPE Medical | Biocompatible TPE |
| X-POLY-096 | TPV EPDM/PP | Santoprene |
| X-POLY-097 | Silicone Sheet | RTV cured |
| X-POLY-098 | Silicone LSR | Liquid silicone |
| X-POLY-099 | EPDM Rubber | Weather seal |
| X-POLY-100 | Neoprene Sheet | Oil resistant |
| X-POLY-101 | Nitrile Rubber | Fuel resistant |
| X-POLY-102 | Viton FKM | High temp seal |
| X-POLY-103 | Natural Rubber | General purpose |
| X-POLY-104 | SBR Rubber | Economy |
| X-POLY-105 | Butyl Rubber | Gas barrier |
| X-POLY-106 | Polyurethane Cast | Tooling, wheels |
| X-POLY-107 | Rigid PU Foam 2 lb | Low density |
| X-POLY-108 | Rigid PU Foam 6 lb | Medium density |
| X-POLY-109 | Rigid PU Foam 15 lb | High density |
| X-POLY-110 | Rigid PU Foam 40 lb | Tooling board |
| X-POLY-111 | EPS Foam | Packaging |
| X-POLY-112 | XPS Foam | Insulation |
| X-POLY-113 | EVA Foam | Soft touch |
| X-POLY-114 | Neoprene Foam | Gaskets |
| X-POLY-115 | Rohacell PMI | Aerospace core |
| X-POLY-116 | Divinycell PVC | Marine core |
| X-POLY-117 | Airex PET | Structural foam |
| X-POLY-118 | Kydex Sheet | Thermoform |
| X-POLY-119 | Boltaron Sheet | Fire rated |
| X-POLY-120 | Corian Solid Surface | Countertops |

---

## 2.3 X-CER: ENGINEERING CERAMICS (50 materials)

### 2.3.1 Oxide Ceramics - 18 materials
| ID | Name | Composition | Key Property |
|----|------|-------------|--------------|
| X-CER-001 | Alumina 99.5% | Al2O3 | Hardness, wear |
| X-CER-002 | Alumina 99.9% | Al2O3 | Purity |
| X-CER-003 | Alumina 96% | Al2O3 | Economy |
| X-CER-004 | Alumina 94% Machinable | Al2O3+SiO2 | Machinability |
| X-CER-005 | Zirconia TZP | ZrO2-3Y | Toughness |
| X-CER-006 | Zirconia PSZ | ZrO2-MgO | Thermal shock |
| X-CER-007 | Zirconia YSZ | ZrO2-8Y | Thermal barrier |
| X-CER-008 | Zirconia ATZ | Al2O3-ZrO2 | Wear+tough |
| X-CER-009 | Zirconia Dental | ZrO2-3Y | Biocompatible |
| X-CER-010 | Mullite | 3Al2O3·2SiO2 | Thermal shock |
| X-CER-011 | Cordierite | Mg2Al4Si5O18 | Low expansion |
| X-CER-012 | Steatite L-5 | MgSiO3 | Electrical |
| X-CER-013 | Forsterite | Mg2SiO4 | Low loss |
| X-CER-014 | Spinel | MgAl2O4 | Transparent |
| X-CER-015 | Beryllia | BeO | Thermal cond |
| X-CER-016 | Magnesia | MgO | Refractory |
| X-CER-017 | Titania | TiO2 | Dielectric |
| X-CER-018 | Yttria | Y2O3 | Plasma spray |

### 2.3.2 Non-Oxide Ceramics - 16 materials
| ID | Name | Composition | Key Property |
|----|------|-------------|--------------|
| X-CER-019 | Silicon Carbide Sintered | SiC | Hardness, wear |
| X-CER-020 | Silicon Carbide RB | SiC+Si | Economy |
| X-CER-021 | Silicon Carbide CVD | SiC | Purity |
| X-CER-022 | Silicon Nitride HPSN | Si3N4 | Strength |
| X-CER-023 | Silicon Nitride RBSN | Si3N4 | Porosity |
| X-CER-024 | Silicon Nitride SSN | Si3N4 | Dense |
| X-CER-025 | SiAlON | Si-Al-O-N | Toughness |
| X-CER-026 | Boron Carbide | B4C | Hardest ceramic |
| X-CER-027 | Boron Nitride HBN | BN hex | Machinable |
| X-CER-028 | Boron Nitride CBN | BN cubic | Cutting tool |
| X-CER-029 | Aluminum Nitride | AlN | Thermal cond |
| X-CER-030 | Titanium Carbide | TiC | Wear, hard |
| X-CER-031 | Titanium Nitride | TiN | Wear, gold |
| X-CER-032 | Tungsten Carbide | WC-Co | Extreme wear |
| X-CER-033 | Tungsten Carbide Fine | WC-6Co | Finish |
| X-CER-034 | Titanium Diboride | TiB2 | Conductive |

### 2.3.3 Machinable Ceramics - 8 materials
| ID | Name | Trade Name | Key Property |
|----|------|------------|--------------|
| X-CER-035 | Macor | Corning | Mica-glass |
| X-CER-036 | Shapal-M | Tokuyama | AlN based |
| X-CER-037 | Shapal Hi-M | Tokuyama | Higher thermal |
| X-CER-038 | Photoveel | - | Mica ceramic |
| X-CER-039 | Mycalex | - | Mica-glass |
| X-CER-040 | Lava | 3M | Dental |
| X-CER-041 | Dicor | Dentsply | Dental glass |
| X-CER-042 | IPS e.max | Ivoclar | Lithium disilicate |

### 2.3.4 Glass Materials (Precision Machined) - 8 materials
| ID | Name | Composition | Key Property |
|----|------|-------------|--------------|
| X-CER-043 | Fused Silica | SiO2 | UV transparent |
| X-CER-044 | Fused Quartz | SiO2 | Purity |
| X-CER-045 | Borosilicate (Pyrex) | SiO2-B2O3 | Thermal shock |
| X-CER-046 | Soda-Lime | SiO2-Na2O | Economy |
| X-CER-047 | Zerodur | Glass-ceramic | Zero expansion |
| X-CER-048 | ULE Glass | SiO2-TiO2 | Near-zero exp |
| X-CER-049 | Sapphire | Al2O3 single | Scratch resist |
| X-CER-050 | Germanium | Ge | IR optics |

---

## 2.4 X-REF: REFRACTORY METALS (40 materials)

### 2.4.1 Tungsten & Alloys - 12 materials
| ID | Name | Composition | Key Property |
|----|------|-------------|--------------|
| X-REF-001 | Pure Tungsten | W 99.95% | Highest melting |
| X-REF-002 | Tungsten Heavy Alloy 90W | W-Ni-Fe | Density, shield |
| X-REF-003 | Tungsten Heavy Alloy 95W | W-Ni-Fe | Higher density |
| X-REF-004 | Tungsten Heavy Alloy 97W | W-Ni-Cu | Non-magnetic |
| X-REF-005 | W-ThO2 1% | Thoriated | Emission |
| X-REF-006 | W-ThO2 2% | Thoriated | Welding |
| X-REF-007 | W-La2O3 | Lanthanated | Non-radioactive |
| X-REF-008 | W-CeO2 | Ceriated | AC welding |
| X-REF-009 | W-Re 3% | W-Rhenium | Ductility |
| X-REF-010 | W-Re 25% | W-Rhenium | High temp |
| X-REF-011 | W-Cu Infiltrated | W-Cu | Electrical |
| X-REF-012 | Tungsten Carbide Blank | WC-Co | Machining |

### 2.4.2 Molybdenum & Alloys - 10 materials
| ID | Name | Composition | Key Property |
|----|------|-------------|--------------|
| X-REF-013 | Pure Molybdenum | Mo 99.95% | High temp |
| X-REF-014 | Mo-La2O3 | Mo-La | Creep resist |
| X-REF-015 | TZM | Mo-Ti-Zr | Strength |
| X-REF-016 | Mo-Re 41% | Mo-Rhenium | Ductility |
| X-REF-017 | Mo-Re 47.5% | Mo-Rhenium | High temp |
| X-REF-018 | Mo-W 30% | Mo-Tungsten | Balance |
| X-REF-019 | Mo-Cu | Mo-Copper | Thermal mgt |
| X-REF-020 | HCM | High C Mo | EDM |
| X-REF-021 | MHC | Mo-Hf-C | Extreme temp |
| X-REF-022 | Mo Spray Grade | Plasma spray | Coating |

### 2.4.3 Tantalum & Alloys - 8 materials
| ID | Name | Composition | Key Property |
|----|------|-------------|--------------|
| X-REF-023 | Pure Tantalum | Ta 99.95% | Corrosion |
| X-REF-024 | Ta-2.5W | Ta-Tungsten | Strength |
| X-REF-025 | Ta-10W | Ta-Tungsten | Higher strength |
| X-REF-026 | Ta-40Nb | Ta-Niobium | Lower cost |
| X-REF-027 | Tantalum Capacitor Grade | Ta | Electronics |
| X-REF-028 | Ta-2.5W-0.15Nb | - | Aerospace |
| X-REF-029 | Ta Clad Steel | - | Economics |
| X-REF-030 | Tantalum Foam | - | Medical |

### 2.4.4 Other Refractories - 10 materials
| ID | Name | Composition | Key Property |
|----|------|-------------|--------------|
| X-REF-031 | Pure Niobium | Nb 99.95% | Superconductor |
| X-REF-032 | Nb-1Zr | Nb-Zirconium | Nuclear |
| X-REF-033 | C-103 | Nb-Hf-Ti | Aerospace |
| X-REF-034 | Pure Rhenium | Re 99.99% | Highest recryst |
| X-REF-035 | Re-Mo Alloy | Re-Mo | Balance |
| X-REF-036 | Pure Hafnium | Hf 99.9% | Nuclear |
| X-REF-037 | Hf-Ta Alloy | Hf-Ta | - |
| X-REF-038 | Pure Vanadium | V 99.9% | - |
| X-REF-039 | Pure Chromium | Cr 99.9% | Hard plating |
| X-REF-040 | Chromium Carbide | Cr3C2 | Wear |

---

## 2.5 X-SPEC: SPECIALTY ALLOYS (50 materials)

### 2.5.1 Beryllium & Alloys - 8 materials
| ID | Name | Be Content | Key Property |
|----|------|------------|--------------|
| X-SPEC-001 | Pure Beryllium | Be 99% | Stiffness/weight |
| X-SPEC-002 | Beryllium S-200F | Be structural | Aerospace |
| X-SPEC-003 | Beryllium O-50 | Be optical | Mirrors |
| X-SPEC-004 | Be-Al AlBeMet | Be-38Al | Lower cost |
| X-SPEC-005 | BeCu C17200 | Cu-2Be | Springs |
| X-SPEC-006 | BeCu C17500 | Cu-0.5Be | Conductivity |
| X-SPEC-007 | BeCu C17510 | Cu-0.4Be | Welding |
| X-SPEC-008 | BeNi 360 | Ni-2Be | Electronics |

### 2.5.2 Low Expansion Alloys - 10 materials
| ID | Name | Composition | CTE |
|----|------|-------------|-----|
| X-SPEC-009 | Invar 36 | Fe-36Ni | 1.2 ppm |
| X-SPEC-010 | Super Invar | Fe-32Ni-4Co | 0.5 ppm |
| X-SPEC-011 | Kovar | Fe-29Ni-17Co | 5.1 ppm |
| X-SPEC-012 | Alloy 42 | Fe-42Ni | 5.3 ppm |
| X-SPEC-013 | Alloy 48 | Fe-48Ni | 8.5 ppm |
| X-SPEC-014 | Alloy 52 | Fe-52Ni | 10.2 ppm |
| X-SPEC-015 | Rodar | Fe-29Ni-17Co | Match glass |
| X-SPEC-016 | Nilo K | Fe-29Ni-17Co | Low expansion |
| X-SPEC-017 | Dilvar | Fe-36Ni | Stable |
| X-SPEC-018 | Inovar | - | Precision |

### 2.5.3 Magnetic Alloys - 12 materials
| ID | Name | Composition | Key Property |
|----|------|-------------|--------------|
| X-SPEC-019 | Mu-Metal | Ni-Fe-Mo | High permeability |
| X-SPEC-020 | Permalloy 80 | Ni-Fe | Shielding |
| X-SPEC-021 | Supermalloy | Ni-Fe-Mo | Highest perm |
| X-SPEC-022 | HyMu 80 | Ni-Fe | Economy |
| X-SPEC-023 | Hipernom | Ni-Fe | Square loop |
| X-SPEC-024 | Permendur | Fe-Co-V | High saturation |
| X-SPEC-025 | Supermendur | Fe-Co | Maximum Bs |
| X-SPEC-026 | Hyperco 50 | Fe-Co | Pole pieces |
| X-SPEC-027 | Silicon Iron GO | Fe-3Si | Transformers |
| X-SPEC-028 | Silicon Iron NGO | Fe-3Si | Motors |
| X-SPEC-029 | Alnico 5 | Al-Ni-Co | Magnets |
| X-SPEC-030 | Alnico 8 | Al-Ni-Co | Higher Hc |

### 2.5.4 Shape Memory & Advanced - 10 materials
| ID | Name | Composition | Key Property |
|----|------|-------------|--------------|
| X-SPEC-031 | Nitinol SE508 | Ni-Ti | Superelastic |
| X-SPEC-032 | Nitinol SM495 | Ni-Ti | Shape memory |
| X-SPEC-033 | Nitinol Medical | Ni-Ti | Biocompatible |
| X-SPEC-034 | Cu-Al-Ni SMA | Cu-Al-Ni | Low cost SMA |
| X-SPEC-035 | Cu-Zn-Al SMA | Cu-Zn-Al | Economy |
| X-SPEC-036 | Vitreloy (BMG) | Zr-based | Amorphous |
| X-SPEC-037 | Liquidmetal | Zr-Ti-Cu-Ni-Be | Cast BMG |
| X-SPEC-038 | HEA CoCrFeNiMn | Equiatomic | Research |
| X-SPEC-039 | HEA AlCoCrFeNi | High entropy | Advanced |
| X-SPEC-040 | Metallic Glass Fe-based | Fe-B-Si | Transformer |

### 2.5.5 Electrical & Thermal - 10 materials
| ID | Name | Composition | Key Property |
|----|------|-------------|--------------|
| X-SPEC-041 | OFHC Copper | Cu 99.99% | Conductivity |
| X-SPEC-042 | ETP Copper | Cu 99.9% | Economy |
| X-SPEC-043 | DHP Copper | Cu-P | Brazing |
| X-SPEC-044 | Silver 99.9% | Ag | Highest σ |
| X-SPEC-045 | AgCu Eutectic | Ag-28Cu | Brazing |
| X-SPEC-046 | AgCdO Contact | Ag-CdO | Switching |
| X-SPEC-047 | W-Cu 80/20 | W-20Cu | Heat sink |
| X-SPEC-048 | W-Cu 70/30 | W-30Cu | EDM |
| X-SPEC-049 | Mo-Cu 70/30 | Mo-30Cu | Lower cost |
| X-SPEC-050 | Cu-Diamond | Cu-Diamond | Extreme k |

---

## 2.6 X-PREC: PRECIOUS METALS (25 materials)

### 2.6.1 Gold & Alloys - 8 materials
| ID | Name | Fineness | Key Property |
|----|------|----------|--------------|
| X-PREC-001 | Pure Gold 24K | 999.9 | Max ductility |
| X-PREC-002 | Gold 22K | 916 | Jewelry |
| X-PREC-003 | Gold 18K Yellow | 750 | Balance |
| X-PREC-004 | Gold 18K White | 750 | Ni/Pd alloy |
| X-PREC-005 | Gold 14K | 585 | Economy |
| X-PREC-006 | Gold 10K | 417 | Durability |
| X-PREC-007 | Au-Ni Contact | Au-5Ni | Electronics |
| X-PREC-008 | Au-Cu-Ag Dental | Various | Dental |

### 2.6.2 Silver & Alloys - 6 materials
| ID | Name | Fineness | Key Property |
|----|------|----------|--------------|
| X-PREC-009 | Pure Silver | 999.9 | Conductivity |
| X-PREC-010 | Sterling Silver | 925 | Jewelry |
| X-PREC-011 | Argentium | 935 | Tarnish resist |
| X-PREC-012 | Coin Silver | 900 | Historical |
| X-PREC-013 | Ag-Cu Brazing | Ag-28Cu | Joining |
| X-PREC-014 | Ag-Pd Alloy | Various | Contact |

### 2.6.3 Platinum Group - 11 materials
| ID | Name | Composition | Key Property |
|----|------|-------------|--------------|
| X-PREC-015 | Pure Platinum | Pt 99.95% | Corrosion |
| X-PREC-016 | Pt-10Ir | Pt-10Ir | Hardness |
| X-PREC-017 | Pt-10Rh | Pt-10Rh | Thermocouple |
| X-PREC-018 | Pt-30Rh | Pt-30Rh | Higher temp |
| X-PREC-019 | Pure Palladium | Pd 99.95% | Hydrogen |
| X-PREC-020 | Pd White Gold | Au-Pd | Jewelry |
| X-PREC-021 | Pure Rhodium | Rh 99.9% | Plating |
| X-PREC-022 | Pure Iridium | Ir 99.9% | Hardest PGM |
| X-PREC-023 | Pt-Ir 10% | Pt-10Ir | Standards |
| X-PREC-024 | Pure Ruthenium | Ru 99.9% | Hardener |
| X-PREC-025 | Pure Osmium | Os 99.9% | Densest |

---

## 2.7 X-GRAP: GRAPHITE & CARBON (30 materials)

| ID | Name | Type | Key Property |
|----|------|------|--------------|
| X-GRAP-001 | Isomolded Fine | EDM | Surface finish |
| X-GRAP-002 | Isomolded Medium | EDM | Balance |
| X-GRAP-003 | Isomolded Coarse | EDM | MRR |
| X-GRAP-004 | Extruded Graphite | General | Economy |
| X-GRAP-005 | Vibration Molded | Large | Big parts |
| X-GRAP-006 | Premium EDM TTK-4 | EDM | Angstrofine |
| X-GRAP-007 | Premium EDM TTK-50 | EDM | Fine detail |
| X-GRAP-008 | Premium EDM AF-5 | EDM | Fast machining |
| X-GRAP-009 | Nuclear Grade | Reactor | Purity |
| X-GRAP-010 | Electrode Grade | Arc furnace | Strength |
| X-GRAP-011 | Isostatic Pressed | Semiconductor | Purity |
| X-GRAP-012 | Flexible Graphite | Gaskets | Sealing |
| X-GRAP-013 | Expanded Graphite | Thermal | Conductivity |
| X-GRAP-014 | Pyrolytic Graphite | CVD | Anisotropic |
| X-GRAP-015 | HOPG | Oriented | Research |
| X-GRAP-016 | Glassy Carbon | Electrodes | Impermeability |
| X-GRAP-017 | RVC Foam | Electrodes | Surface area |
| X-GRAP-018 | Carbon Fiber | Reinforcement | Strength |
| X-GRAP-019 | Graphite Foil | Heat spread | Thin |
| X-GRAP-020 | SiC Coated | Oxidation | Protection |
| X-GRAP-021 | Graphite Felt | Insulation | High temp |
| X-GRAP-022 | Graphite Crucible | Melting | Metal |
| X-GRAP-023 | Graphite Mold | Casting | Glass |
| X-GRAP-024 | Graphite Bearing | Tribology | Self-lub |
| X-GRAP-025 | Graphite Seal | Sealing | Steam |
| X-GRAP-026 | Carbon Brush | Motors | Electrical |
| X-GRAP-027 | Graphite Electrode | EDM | Sinker |
| X-GRAP-028 | Graphite Die | Pressing | PM |
| X-GRAP-029 | Graphite Fixture | Heat treat | Aerospace |
| X-GRAP-030 | Carbon-Carbon | Aerospace | Brakes |

---

## 2.8 X-AM: ADDITIVE MANUFACTURING MATERIALS (60 materials)

### 2.8.1 Metal AM - 30 materials
| ID | Name | Process | Base |
|----|------|---------|------|
| X-AM-001 | Ti-6Al-4V ELI DMLS | DMLS | Titanium |
| X-AM-002 | Ti-6Al-4V Standard | SLM | Titanium |
| X-AM-003 | CP Ti Grade 2 | EBM | Titanium |
| X-AM-004 | Inconel 718 | DMLS | Ni-base |
| X-AM-005 | Inconel 625 | SLM | Ni-base |
| X-AM-006 | CoCr Dental | DMLS | Co-base |
| X-AM-007 | CoCr Medical | EBM | Co-base |
| X-AM-008 | Maraging Steel MS1 | DMLS | Steel |
| X-AM-009 | Stainless 316L | SLM | Stainless |
| X-AM-010 | Stainless 17-4PH | DMLS | Stainless |
| X-AM-011 | Stainless 15-5PH | SLM | Stainless |
| X-AM-012 | Tool Steel H13 | DMLS | Tool steel |
| X-AM-013 | Tool Steel M2 | SLM | HSS |
| X-AM-014 | AlSi10Mg | DMLS | Aluminum |
| X-AM-015 | AlSi12 | SLM | Aluminum |
| X-AM-016 | Al6061-RAM2 | SLM | Aluminum |
| X-AM-017 | Scalmalloy | DMLS | Al-Mg-Sc |
| X-AM-018 | Copper CuCrZr | SLM | Copper |
| X-AM-019 | Pure Copper | EBM | Copper |
| X-AM-020 | Bronze CuSn | DMLS | Bronze |
| X-AM-021 | Tungsten | SLM | Refractory |
| X-AM-022 | Tantalum | EBM | Refractory |
| X-AM-023 | NiTi Nitinol | SLM | SMA |
| X-AM-024 | Hastelloy X | DMLS | Ni-base |
| X-AM-025 | Haynes 230 | SLM | Ni-base |
| X-AM-026 | Rene 80 | EBM | Ni-base |
| X-AM-027 | Platinum | DMLS | Precious |
| X-AM-028 | Gold | SLM | Precious |
| X-AM-029 | Silver | DMLS | Precious |
| X-AM-030 | HEA Printed | SLM | Advanced |

### 2.8.2 Polymer AM - 20 materials
| ID | Name | Process | Base |
|----|------|---------|------|
| X-AM-031 | PA12 SLS | SLS | Nylon |
| X-AM-032 | PA12 GF SLS | SLS | Nylon |
| X-AM-033 | PA11 SLS | SLS | Nylon |
| X-AM-034 | PA12 MJF | MJF | Nylon |
| X-AM-035 | PA12 GF MJF | MJF | Nylon |
| X-AM-036 | TPU SLS | SLS | Elastomer |
| X-AM-037 | PP SLS | SLS | PP |
| X-AM-038 | PEEK SLS | SLS | PEEK |
| X-AM-039 | PEKK SLS | SLS | PEKK |
| X-AM-040 | Standard Resin SLA | SLA | Acrylate |
| X-AM-041 | Tough Resin SLA | SLA | Acrylate |
| X-AM-042 | Flexible Resin SLA | SLA | Urethane |
| X-AM-043 | Dental Resin SLA | SLA | Medical |
| X-AM-044 | Castable Resin SLA | SLA | Jewelry |
| X-AM-045 | High Temp Resin SLA | SLA | Cyanate |
| X-AM-046 | Ceramic Resin SLA | SLA | Filled |
| X-AM-047 | ABS FDM | FDM | ABS |
| X-AM-048 | PC FDM | FDM | PC |
| X-AM-049 | ULTEM 9085 FDM | FDM | PEI |
| X-AM-050 | CF Nylon FDM | FDM | CF-PA |

### 2.8.3 Ceramic/Other AM - 10 materials
| ID | Name | Process | Base |
|----|------|---------|------|
| X-AM-051 | Alumina | Binder Jet | Ceramic |
| X-AM-052 | Zirconia | SLA | Ceramic |
| X-AM-053 | Silicon Carbide | Binder Jet | Ceramic |
| X-AM-054 | Silicon Nitride | - | Ceramic |
| X-AM-055 | Hydroxyapatite | SLA | Bioceramic |
| X-AM-056 | Sand Casting | Binder Jet | Silica |
| X-AM-057 | Investment Core | Binder Jet | Ceramic |
| X-AM-058 | Concrete | Extrusion | Concrete |
| X-AM-059 | Glass | SLA | Glass |
| X-AM-060 | Multi-Material | PolyJet | Various |

---

## 2.9 X-WOOD: WOOD & NATURAL (60 materials)

### 2.9.1 Hardwoods - 25 materials
| ID | Name | Janka | Density |
|----|------|-------|---------|
| X-WOOD-001 | Red Oak | 1290 | 0.75 |
| X-WOOD-002 | White Oak | 1360 | 0.77 |
| X-WOOD-003 | Hard Maple | 1450 | 0.72 |
| X-WOOD-004 | Soft Maple | 950 | 0.63 |
| X-WOOD-005 | Black Walnut | 1010 | 0.61 |
| X-WOOD-006 | Cherry | 950 | 0.56 |
| X-WOOD-007 | Ash | 1320 | 0.67 |
| X-WOOD-008 | Hickory | 1820 | 0.83 |
| X-WOOD-009 | Beech | 1300 | 0.72 |
| X-WOOD-010 | Birch | 1260 | 0.71 |
| X-WOOD-011 | Poplar | 540 | 0.45 |
| X-WOOD-012 | Alder | 590 | 0.45 |
| X-WOOD-013 | Mahogany | 800 | 0.53 |
| X-WOOD-014 | Teak | 1070 | 0.63 |
| X-WOOD-015 | Ebony | 3220 | 1.12 |
| X-WOOD-016 | Rosewood | 1780 | 0.85 |
| X-WOOD-017 | Padauk | 1725 | 0.75 |
| X-WOOD-018 | Purple Heart | 1860 | 0.88 |
| X-WOOD-019 | Ipe | 3510 | 1.10 |
| X-WOOD-020 | Bubinga | 1980 | 0.91 |
| X-WOOD-021 | Wenge | 1630 | 0.88 |
| X-WOOD-022 | Zebrawood | 1575 | 0.80 |
| X-WOOD-023 | Sapele | 1410 | 0.67 |
| X-WOOD-024 | Balsa | 100 | 0.16 |
| X-WOOD-025 | Basswood | 410 | 0.42 |

### 2.9.2 Softwoods - 15 materials
| ID | Name | Janka | Density |
|----|------|-------|---------|
| X-WOOD-026 | Eastern White Pine | 380 | 0.38 |
| X-WOOD-027 | Ponderosa Pine | 460 | 0.45 |
| X-WOOD-028 | Southern Yellow Pine | 690 | 0.59 |
| X-WOOD-029 | Douglas Fir | 660 | 0.53 |
| X-WOOD-030 | Western Red Cedar | 350 | 0.37 |
| X-WOOD-031 | Alaskan Yellow Cedar | 580 | 0.50 |
| X-WOOD-032 | Redwood | 450 | 0.44 |
| X-WOOD-033 | Sitka Spruce | 510 | 0.43 |
| X-WOOD-034 | Norway Spruce | 380 | 0.43 |
| X-WOOD-035 | Hemlock | 540 | 0.48 |
| X-WOOD-036 | Cypress | 510 | 0.51 |
| X-WOOD-037 | Larch | 830 | 0.59 |
| X-WOOD-038 | Yew | 1520 | 0.67 |
| X-WOOD-039 | Juniper | 690 | 0.52 |
| X-WOOD-040 | Obeche | 350 | 0.39 |

### 2.9.3 Engineered Wood - 20 materials
| ID | Name | Type | Key Property |
|----|------|------|--------------|
| X-WOOD-041 | MDF Standard | Fiberboard | Smooth |
| X-WOOD-042 | MDF Moisture Resist | Fiberboard | MR |
| X-WOOD-043 | MDF Ultralight | Fiberboard | Light |
| X-WOOD-044 | HDF/Hardboard | Fiberboard | Dense |
| X-WOOD-045 | Particleboard | Particle | Economy |
| X-WOOD-046 | OSB | Strand | Structural |
| X-WOOD-047 | Plywood Baltic Birch | Plywood | Void-free |
| X-WOOD-048 | Plywood Marine | Plywood | Waterproof |
| X-WOOD-049 | Plywood Hardwood | Plywood | Face |
| X-WOOD-050 | Plywood Softwood | Plywood | Sheathing |
| X-WOOD-051 | LVL | Veneer | Beam |
| X-WOOD-052 | LSL | Strand | Header |
| X-WOOD-053 | PSL | Strand | Column |
| X-WOOD-054 | CLT | Cross-lam | Mass timber |
| X-WOOD-055 | Glulam | Laminated | Beam |
| X-WOOD-056 | Bamboo Solid | Natural | Sustainable |
| X-WOOD-057 | Bamboo Strand | Woven | Flooring |
| X-WOOD-058 | Cork Sheet | Natural | Gasket |
| X-WOOD-059 | Richlite | Paper | Countertop |
| X-WOOD-060 | Paperstone | Paper | Sustainable |

---

## 2.10 REMAINING CATEGORIES (Summary)

### X-PM: Powder Metallurgy (40 materials)
- Sintered iron/steel grades (F-0000 to F-0008)
- Sintered bronze bearings
- Sintered stainless
- MIM materials (316L, 17-4PH, Ti-6Al-4V)
- Cemented carbides (various grades)
- Cermets

### X-SAND: Honeycomb & Sandwich (20 materials)
- Aluminum honeycomb (various cell sizes)
- Nomex honeycomb
- Thermoplastic honeycomb
- Aluminum foam
- Metal sandwich panels
- PMI foam cores

### X-RUBE: Rubber & Elastomers (30 materials)
- Already partially covered in X-POLY
- Additional specialty grades
- Machinable rubber compounds

---

# SECTION 3: GRAND TOTAL

| Category | Materials | Lines Est. |
|----------|-----------|------------|
| P_STEELS (existing + expansion) | 900 | 170,000 |
| M_STAINLESS (existing + expansion) | 250 | 55,000 |
| K_CAST_IRON (existing + expansion) | 80 | 15,000 |
| N_NONFERROUS (existing + expansion) | 500 | 75,000 |
| S_SUPERALLOYS (existing + expansion) | 60 | 12,000 |
| H_HARDENED (existing + expansion) | 50 | 10,000 |
| **X-COMP** (NEW) | 80 | 16,000 |
| **X-POLY** (NEW) | 120 | 24,000 |
| **X-CER** (NEW) | 50 | 10,000 |
| **X-REF** (NEW) | 40 | 8,000 |
| **X-SPEC** (NEW) | 50 | 10,000 |
| **X-PREC** (NEW) | 25 | 5,000 |
| **X-GRAP** (NEW) | 30 | 6,000 |
| **X-AM** (NEW) | 60 | 12,000 |
| **X-WOOD** (NEW) | 60 | 12,000 |
| **X-PM** (NEW) | 40 | 8,000 |
| **X-SAND** (NEW) | 20 | 4,000 |
| **X-RUBE** (NEW) | 30 | 6,000 |
| **TOTAL** | **2,445** | **~458,000** |

---

# SECTION 4: IMPLEMENTATION PHASES

## Phase B1: X-COMP Composites (80 materials)
- Priority: HIGH - Aerospace/automotive demand
- Unique parameters: fiber orientation, delamination risk, abrasive wear
- Effort: ~160 tool calls

## Phase B2: X-POLY Polymers (120 materials)  
- Priority: HIGH - Medical/consumer products
- Unique parameters: melting behavior, chip welding, coolant sensitivity
- Effort: ~240 tool calls

## Phase B3: X-AM Additive Materials (60 materials)
- Priority: HIGH - Growing demand for post-processing
- Unique parameters: as-built vs machined, layer orientation effects
- Effort: ~120 tool calls

## Phase B4: X-CER Ceramics (50 materials)
- Priority: MEDIUM - Specialty applications
- Unique parameters: diamond tooling required, brittle fracture
- Effort: ~100 tool calls

## Phase B5: X-REF Refractories (40 materials)
- Priority: MEDIUM - Aerospace/nuclear
- Unique parameters: extreme temperatures, special tooling
- Effort: ~80 tool calls

## Phase B6: X-WOOD Natural (60 materials)
- Priority: MEDIUM - CNC routing common
- Unique parameters: grain direction, moisture content
- Effort: ~120 tool calls

## Phase B7: Remaining (X-SPEC, X-PREC, X-GRAP, X-PM, X-SAND, X-RUBE)
- 195 materials total
- Effort: ~390 tool calls

## Phase B8: Existing Category Expansion (+310 materials)
- Fill gaps in P, M, K, N, S, H categories
- Effort: ~620 tool calls

---

**TOTAL ESTIMATED EFFORT:** 1,830 ± 365 tool calls (95% CI)
**TOTAL ESTIMATED TIME:** 91.5 ± 18 hours (at 3s/call average)
**MICROSESSIONS:** ⌈1830/15⌉ = 122 microsessions

---

*Document: MATERIALS_COMPREHENSIVE_INVENTORY.md*
*Version: 1.0*
*Created: 2026-01-26*
*Status: APPROVED FOR EXECUTION*
