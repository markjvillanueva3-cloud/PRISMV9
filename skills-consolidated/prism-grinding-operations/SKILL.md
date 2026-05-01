---
name: prism-grinding-operations
description: |
  Grinding process fundamentals for CNC surface, cylindrical, and internal grinding.
  Wheel selection, dressing, speeds/feeds, thermal damage prevention, and process optimization.
  Covers abrasive types, bond systems, wheel specifications, and grinding burn detection.
  
  Functions: wheel_select, grinding_speed, dress_params, thermal_limit,
  surface_finish_predict, mrr_grinding, specific_energy, burn_threshold,
  wheel_wear_rate, coolant_grinding
  
  Academic Source: MIT 2.810, Malkin Grinding Technology, CIRP annals
  Total: ~370 lines
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "grinding", "operations", "process", "fundamentals", "surface", "cylindrical", "internal"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-grinding-operations")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-grinding-operations") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What grinding parameters for 316 stainless?"
→ Load skill: skill_content("prism-grinding-operations") → Extract relevant grinding data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot operations issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM GRINDING OPERATIONS
## Wheel Selection, Process Parameters & Thermal Management

## 1. GRINDING FUNDAMENTALS

### Process Mechanics
Each abrasive grain acts as a single-point cutter with highly negative rake angle (-30° to -60°).
Energy partition: 60-90% of grinding energy enters the workpiece as heat.

### Specific Grinding Energy
```
e_s = F_t × v_s / (v_w × a_e × b)

Typical values (J/mm³):
  Aluminum: 10-20
  Carbon steel: 25-45
  Hardened steel: 35-60
  Stainless steel: 40-70
  Nickel alloys: 50-80
  Ceramics: 15-30

Compare to cutting: Milling steel ≈ 3-5 J/mm³
Grinding uses 10-15× more specific energy → heat is the primary constraint
```

### Chip Thickness Model (Undeformed)
```
h_max = (4 × v_w / (v_s × C × r))^0.5 × (a_e / d_s)^0.25

Where:
  v_w = workpiece speed (m/s)
  v_s = wheel speed (m/s)
  C = active grain density (grains/mm²)
  r = chip width-to-thickness ratio (~10-20)
  a_e = depth of cut (mm)
  d_s = wheel diameter (mm)

Typical h_max: 0.1-5 μm (much smaller than conventional cutting)
```

## 2. WHEEL SPECIFICATION & SELECTION

### Standard Marking System (ISO 525 / ANSI B74.13)
```
Example: WA 60 K 5 V

  Prefix: Abrasive type
  1st: Grain size
  2nd: Grade (hardness)
  3rd: Structure
  4th: Bond type
```

### Abrasive Types
| Symbol | Abrasive | Hardness (Knoop) | Best For |
|--------|----------|-------------------|----------|
| A | Aluminum oxide (brown) | 2100 | Carbon steel, alloy steel |
| WA | White aluminum oxide | 2100 | Tool steel, HSS (friable, cool cutting) |
| PA | Pink aluminum oxide | 2100 | Precision finishing, light grinding |
| SA | Single crystal Al₂O₃ | 2100 | Hardened steel finishing |
| C | Silicon carbide (black) | 2500 | Cast iron, non-ferrous, ceramics |
| GC | Green silicon carbide | 2500 | Carbide tool sharpening |
| CBN | Cubic boron nitride | 4500 | Hardened steel (>55 HRC), superalloys |
| D | Diamond | 7000 | Carbide, ceramics, glass, PCD |

### Selection Guide
```
Material                → Abrasive
Carbon steel (<40 HRC)  → A (brown aluminum oxide)
Alloy steel (<50 HRC)   → WA (white aluminum oxide)
Hardened steel (>55 HRC) → CBN (electroplated or vitrified)
Stainless steel         → WA or SG (ceramic grain)
Cast iron               → C (silicon carbide) or A
Aluminum/copper         → C (silicon carbide)
Carbide                 → D (diamond), GC for touch-up
Ceramics                → D (diamond)
HSS tools               → WA or CBN
```

### Grain Size
| Grit | Size (μm) | Application |
|------|----------|-------------|
| 16-24 | 700-1000 | Heavy stock removal (snagging) |
| 36-46 | 350-500 | Rough grinding |
| 60-80 | 180-250 | General purpose |
| 100-120 | 125-150 | Finish grinding |
| 150-220 | 63-75 | Fine finishing |
| 320-600 | 20-40 | Superfinishing |

### Grade (Wheel Hardness)
```
Scale: A (softest) → Z (hardest)

Selection rules:
  Soft material → Hard wheel (H-L): Grains don't dull fast, need retention
  Hard material → Soft wheel (D-G): Grains dull fast, need to self-sharpen
  Large contact area → Softer wheel: Prevents loading and burn
  Small contact area → Harder wheel: Prevents excessive wear
  
Common ranges:
  Surface grinding: H-K
  Cylindrical OD: J-M
  Internal grinding: H-K (softer due to arc of contact)
  Creep feed: E-G (very soft, prevent burn)
  Centerless: K-N
```

## 3. GRINDING PARAMETERS

### Speed Recommendations
| Operation | Wheel Speed (m/s) | Work Speed (m/min) |
|-----------|-------------------|-------------------|
| Surface (reciprocating) | 25-35 | 10-25 |
| Surface (rotary) | 25-35 | 15-40 |
| Cylindrical OD | 30-45 | 15-35 |
| Cylindrical ID | 20-30 | 20-40 |
| Centerless (through) | 30-40 | 10-30 |
| Creep feed | 25-35 | 0.1-1.0 |
| CBN wheels | 45-80 | 15-40 |
| Diamond wheels | 20-35 | 10-25 |

### Depth of Cut
| Operation | Rough (mm) | Finish (mm) | Spark-out |
|-----------|-----------|------------|-----------|
| Surface | 0.010-0.050 | 0.002-0.010 | 3-5 passes |
| Cylindrical OD | 0.010-0.050 | 0.005-0.015 | 2-4 passes |
| Cylindrical ID | 0.005-0.025 | 0.002-0.008 | 3-5 passes |
| Creep feed | 0.5-5.0 | 0.1-0.5 | 1-2 passes |

### Crossfeed (Surface Grinding)
```
Crossfeed = Wheel width × overlap factor

Overlap factors:
  Rough: 0.5-0.7 × wheel width
  Finish: 0.25-0.4 × wheel width
  Fine finish: 0.1-0.2 × wheel width
```

## 4. THERMAL DAMAGE PREVENTION

### Grinding Temperature
```
θ_max = C × (e_s × a_e × v_w)^0.5 / (k × ρ × c_p)^0.25

Critical thresholds:
  Tempering burn: >300-400°C (reduces hardness)
  Rehardening burn: >700-900°C (creates brittle martensite)
  Residual stress reversal: >200-300°C (tensile stress appears)
```

### Burn Detection Methods
| Method | Detection Level | Timing |
|--------|----------------|--------|
| Visual inspection | Discoloration (>350°C) | Post-process |
| Nital etch (ANSI B46.1) | Temper/rehardening zones | Post-process |
| Barkhausen noise | Stress/microstructure change | In-process possible |
| Power monitoring | Specific energy threshold | Real-time |
| Thermocouple | Direct temperature | Research/setup |

### Burn Prevention Rules
```
1. Monitor specific energy: e_s should stay below material threshold
   Steel: e_s < 40 J/mm³
   Hardened steel: e_s < 55 J/mm³
   
2. Keep depth × speed product moderate:
   a_e × v_w < burn_limit (material dependent)
   
3. Dress frequently: Sharp wheel = lower specific energy
   
4. Coolant delivery: Must reach grinding zone
   Flow rate > 5 × wheel_width × wheel_speed (empirical)
   
5. Use softer grade wheel: Self-sharpening prevents glazing
```

## 5. DRESSING & CONDITIONING

### Dressing Parameters
| Method | Tool | Application |
|--------|------|-------------|
| Single-point diamond | Natural diamond in holder | Precision form dressing |
| Rotary diamond | Diamond disc | High-volume production |
| Crush dressing | Hardened steel roller | Form profile wheels |
| Stick dressing | Abrasive stick | CBN/diamond wheels (conditioning) |
| Laser dressing | Pulsed laser | Superabrasive wheels (advanced) |

### Single-Point Dressing Parameters
```
Dress depth (a_d): 0.010-0.030 mm per pass
Dress lead (f_d): 
  Rough: 0.15-0.30 mm/rev of wheel
  Finish: 0.05-0.12 mm/rev of wheel
  
Overlap ratio (U_d) = active width / f_d
  Rough: U_d = 2-3
  Finish: U_d = 5-10
  
Higher U_d → smoother wheel → better finish but more rubbing → risk of burn
Lower U_d → sharper wheel → more aggressive but rougher finish
```

## 6. SURFACE FINISH PREDICTION

### Theoretical Surface Roughness
```
R_t ≈ f_d² / (8 × r_d)    (from dressing)

Where:
  f_d = dress lead (mm/rev)
  r_d = dresser tip radius (mm)

After grinding:
  Ra ≈ R_t / 4 to R_t / 6 (empirical)

Achievable Ra by operation:
  Rough grinding: 0.8-1.6 μm
  Finish grinding: 0.2-0.8 μm
  Fine grinding: 0.05-0.2 μm
  Superfinishing: 0.01-0.05 μm
```

## 7. PROCESS-SPECIFIC GUIDELINES

### Surface Grinding
- Table speed: 15-25 m/min for steel
- Down-feed: 0.005-0.020 mm/pass finish
- Cross-feed: 1/3 wheel width for finish
- Spark-out: Minimum 3 passes at zero infeed
- Demagnetize parts after magnetic chuck holding

### Cylindrical OD Grinding
- Wheel contact: Full diameter wrap
- Plunge feed: 0.005-0.015 mm/rev workpiece
- Traverse rate: 1/3-2/3 wheel width per revolution
- Tailstock pressure: Adequate support without distortion
- Steady rest for L/D > 6

### Internal Grinding
- Wheel diameter: 0.6-0.8 × bore diameter
- High wheel speed to compensate for small diameter
- Frequent dressing (aggressive contact arc)
- Coolant delivery critical (limited access)

### Creep Feed Grinding
- Very slow workpiece feed: 100-1000 mm/min
- Large depth: 0.5-5mm per pass
- Continuous dressing recommended
- Requires high-pressure coolant (10+ bar)
- Very soft wheel grade (E-G) to prevent burn

## 8. TROUBLESHOOTING

### Common Problems & Solutions
```
Burn marks → Reduce DOC, increase work speed, dress sharper, check coolant
Chatter marks → Check wheel balance, true wheel, reduce speed ratio
Loading (clogging) → Use softer wheel, different abrasive, increase coolant
Scratches → Filter coolant, check for loose grains, dress finer
Taper → Check alignment, adjust dresser compensation
Out of round → Check centers, reduce DOC, improve support
Waviness → Wheel out of balance, dress out-of-round, check bearings
Poor finish → Dress with finer lead, increase spark-out, check vibration
```

*Single-purpose skill: Grinding process parameters, wheel selection, and thermal management.*
