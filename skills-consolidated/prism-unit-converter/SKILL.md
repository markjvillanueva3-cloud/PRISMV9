---
name: prism-unit-converter
description: |
  Instant unit conversions for manufacturing calculations. Covers stress,
  speed, feed, force, temperature, and dimensional units. 20% calculation
  time reduction. Eliminates conversion errors and lookup time.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "unit", "converter", "instant", "conversions", "manufacturing", "calculations", "stress"
- Knowledge retrieval, cross-domain query, or registry data enrichment needed.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-unit-converter")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_knowledge→search/cross_query for knowledge retrieval
   - prism_skill_script→skill_content(id="prism-unit-converter") for reference data
   - prism_data→[relevant_action] for structured lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Reference knowledge applicable to current task
- **Failure**: Content not found → verify skill exists in index

### Examples
**Example 1**: User asks about unit
→ Load skill: skill_content("prism-unit-converter") → Apply relevant knowledge → Provide structured response

**Example 2**: Task requires converter guidance
→ Load skill → Extract applicable section → Cross-reference with related skills → Deliver recommendation

# PRISM Unit Converter Skill
## Quick Conversion Formulas & Machining Unit Tables
**Time Savings: 20% calculation reduction**
## PURPOSE
Instant unit conversions for manufacturing calculations. Eliminates conversion errors and lookup time.
## STRESS / STRENGTH

### Pressure/Stress Units
```
1 MPa = 1 N/mm²
1 MPa = 0.145038 ksi
1 MPa = 145.038 psi
1 ksi = 6.89476 MPa
1 psi = 0.00689476 MPa
1 GPa = 1000 MPa
1 bar = 0.1 MPa
1 kg/mm² = 9.80665 MPa
```

### Quick Conversion Table
| MPa | ksi | psi |
|-----|-----|-----|
| 100 | 14.5 | 14,504 |
| 200 | 29.0 | 29,008 |
| 300 | 43.5 | 43,511 |
| 400 | 58.0 | 58,015 |
| 500 | 72.5 | 72,519 |
| 600 | 87.0 | 87,023 |
| 700 | 101.5 | 101,527 |
| 800 | 116.0 | 116,030 |
| 1000 | 145.0 | 145,038 |
| 1500 | 217.6 | 217,557 |
| 2000 | 290.1 | 290,076 |

### Quick Formulas
```javascript
MPa_to_ksi = MPa × 0.145038
ksi_to_MPa = ksi × 6.89476
MPa_to_psi = MPa × 145.038
psi_to_MPa = psi ÷ 145.038
```
## LENGTH / DISTANCE

### Length Units
```
1 mm = 0.03937 in
1 in = 25.4 mm
1 m = 39.3701 in
1 ft = 304.8 mm
1 µm = 0.001 mm = 0.00003937 in
1 mil = 0.001 in = 0.0254 mm
```

### Quick Conversion Table
| mm | inch | µm |
|----|------|-----|
| 0.01 | 0.0004 | 10 |
| 0.1 | 0.004 | 100 |
| 0.5 | 0.020 | 500 |
| 1.0 | 0.039 | 1000 |
| 2.0 | 0.079 | 2000 |
| 5.0 | 0.197 | 5000 |
| 10.0 | 0.394 | 10000 |
| 25.4 | 1.000 | 25400 |

### Surface Finish (Ra)
```
1 µm Ra = 39.37 µin Ra
1 µin Ra = 0.0254 µm Ra
```

| µm Ra | µin Ra | Description |
|-------|--------|-------------|
| 0.1 | 4 | Super finish |
| 0.2 | 8 | Mirror |
| 0.4 | 16 | Ground |
| 0.8 | 32 | Fine turned |
| 1.6 | 63 | Standard turned |
| 3.2 | 125 | Rough turned |
| 6.3 | 250 | Coarse |
| 12.5 | 500 | Very rough |
## CUTTING SPEED / VELOCITY

### Speed Units
```
1 m/min = 3.2808 ft/min (sfm)
1 sfm = 0.3048 m/min
1 m/s = 60 m/min
```

### Cutting Speed Conversion
| m/min | sfm | m/s |
|-------|-----|-----|
| 50 | 164 | 0.83 |
| 100 | 328 | 1.67 |
| 150 | 492 | 2.50 |
| 200 | 656 | 3.33 |
| 250 | 820 | 4.17 |
| 300 | 984 | 5.00 |
| 400 | 1312 | 6.67 |
| 500 | 1640 | 8.33 |
| 800 | 2624 | 13.33 |

### RPM ↔ Cutting Speed
```
RPM = (Vc × 1000) / (π × D)
Vc = (π × D × RPM) / 1000

Where:
  Vc = cutting speed (m/min)
  D = diameter (mm)
  RPM = spindle speed (rev/min)
```

| Diameter (mm) | Vc=100 m/min | Vc=200 m/min | Vc=300 m/min |
|---------------|--------------|--------------|--------------|
| 6 | 5305 RPM | 10610 RPM | 15915 RPM |
| 10 | 3183 RPM | 6366 RPM | 9549 RPM |
| 12 | 2653 RPM | 5305 RPM | 7958 RPM |
| 16 | 1989 RPM | 3979 RPM | 5968 RPM |
| 20 | 1592 RPM | 3183 RPM | 4775 RPM |
| 25 | 1273 RPM | 2546 RPM | 3820 RPM |
| 32 | 995 RPM | 1989 RPM | 2984 RPM |
| 50 | 637 RPM | 1273 RPM | 1910 RPM |
| 100 | 318 RPM | 637 RPM | 955 RPM |
## FEED RATE

### Feed Units
```
mm/rev = feed per revolution
mm/tooth = feed per tooth (milling)
mm/min = table feed rate
ipr = inches per revolution
ipm = inches per minute
```

### Conversions
```
mm/min = mm/rev × RPM
mm/min = mm/tooth × z × RPM  (milling)
ipm = ipr × RPM
mm/rev = ipr × 25.4
```

### Feed Rate Table
| mm/rev | ipr |
|--------|-----|
| 0.05 | 0.002 |
| 0.10 | 0.004 |
| 0.15 | 0.006 |
| 0.20 | 0.008 |
| 0.25 | 0.010 |
| 0.30 | 0.012 |
| 0.40 | 0.016 |
| 0.50 | 0.020 |
## TEMPERATURE

### Temperature Units
```
°C = (°F - 32) × 5/9
°F = °C × 9/5 + 32
K = °C + 273.15
```

### Quick Conversion Table
| °C | °F | K |
|----|-----|-----|
| 0 | 32 | 273 |
| 100 | 212 | 373 |
| 200 | 392 | 473 |
| 300 | 572 | 573 |
| 400 | 752 | 673 |
| 500 | 932 | 773 |
| 600 | 1112 | 873 |
| 700 | 1292 | 973 |
| 800 | 1472 | 1073 |
| 1000 | 1832 | 1273 |
| 1500 | 2732 | 1773 |
## FORCE / POWER / TORQUE

### Force Units
```
1 N = 0.2248 lbf
1 lbf = 4.4482 N
1 kN = 1000 N = 224.8 lbf
1 kgf = 9.80665 N
```

### Power Units
```
1 kW = 1.341 hp
1 hp = 0.7457 kW
1 W = 1 N·m/s = 1 J/s
```

### Torque Units
```
1 N·m = 0.7376 ft·lbf
1 ft·lbf = 1.3558 N·m
1 N·m = 8.851 in·lbf
```

### Cutting Power Formula
```
Power (kW) = Fc × Vc / 60000
Power (hp) = Fc × Vc / 44760

Where:
  Fc = cutting force (N)
  Vc = cutting speed (m/min)
```

### Power Quick Reference
| Fc (N) | Vc (m/min) | Power (kW) | Power (hp) |
|--------|------------|------------|------------|
| 500 | 100 | 0.83 | 1.12 |
| 1000 | 100 | 1.67 | 2.24 |
| 1000 | 200 | 3.33 | 4.47 |
| 2000 | 150 | 5.00 | 6.71 |
| 3000 | 200 | 10.00 | 13.41 |
## THERMAL PROPERTIES

### Thermal Conductivity
```
1 W/(m·K) = 0.5778 BTU/(hr·ft·°F)
1 BTU/(hr·ft·°F) = 1.731 W/(m·K)
```

### Specific Heat
```
1 J/(kg·K) = 0.000239 BTU/(lb·°F)
1 BTU/(lb·°F) = 4186.8 J/(kg·K)
```

### Thermal Expansion
```
1 µm/(m·K) = 0.556 µin/(in·°F)
1 µin/(in·°F) = 1.8 µm/(m·K)
```
## HARDNESS CONVERSIONS

### Approximate Conversion Table
| HRC | HB | HV | UTS (MPa) |
|-----|-----|-----|-----------|
| 20 | 226 | 238 | 760 |
| 25 | 253 | 266 | 860 |
| 30 | 286 | 302 | 980 |
| 35 | 327 | 345 | 1125 |
| 40 | 371 | 392 | 1280 |
| 45 | 421 | 446 | 1480 |
| 50 | 481 | 513 | 1720 |
| 55 | 560 | 595 | 1980 |
| 60 | 654 | 697 | 2240 |

### Brinell to Other Scales (Steel)
```
HV ≈ HB × 1.05 (for HB < 350)
HRC ≈ (HB - 104) / 5.2 (for HB > 200)
UTS (MPa) ≈ HB × 3.45 (approximate)
```

### Rockwell B to Brinell
| HRB | HB |
|-----|-----|
| 60 | 105 |
| 70 | 125 |
| 80 | 150 |
| 85 | 170 |
| 90 | 190 |
| 95 | 210 |
| 100 | 240 |
## DENSITY / MASS

### Density Units
```
1 kg/m³ = 0.001 g/cm³
1 g/cm³ = 1000 kg/m³ = 0.0361 lb/in³
1 lb/in³ = 27,680 kg/m³
```

### Common Material Densities
| Material | kg/m³ | lb/in³ |
|----------|-------|--------|
| Steel | 7850 | 0.284 |
| Stainless | 8000 | 0.289 |
| Aluminum | 2700 | 0.098 |
| Titanium | 4430 | 0.160 |
| Cast Iron | 7150 | 0.258 |
| Copper | 8960 | 0.324 |
| Brass | 8500 | 0.307 |
## MACHINING SPECIFIC CALCULATIONS

### Material Removal Rate (MRR)
```
Turning:  MRR = Vc × f × ap (cm³/min)
Milling:  MRR = ae × ap × Vf / 1000 (cm³/min)
Drilling: MRR = π × D² × f × N / 4000 (cm³/min)

Where:
  Vc = cutting speed (m/min)
  f = feed (mm/rev)
  ap = depth of cut (mm)
  ae = width of cut (mm)
  Vf = table feed (mm/min)
  D = drill diameter (mm)
  N = RPM
```

### Specific Cutting Energy
```
u = Fc / (b × h) [J/mm³] or [N/mm²]
u = Power / MRR [kW/(cm³/min)]

Typical values:
  Steel: 2.5-4.0 J/mm³
  Aluminum: 0.7-1.2 J/mm³
  Titanium: 3.5-5.0 J/mm³
  Cast Iron: 1.5-2.5 J/mm³
```

### Chip Thickness Ratio
```
rc = h / hc = sin(φ) / cos(φ - γ)

Where:
  h = uncut chip thickness (mm)
  hc = actual chip thickness (mm)
  φ = shear angle
  γ = rake angle
```
## QUICK JAVASCRIPT CONVERTERS

```javascript
// Stress
const MPa_to_ksi = MPa => MPa * 0.145038;
const ksi_to_MPa = ksi => ksi * 6.89476;

// Length
const mm_to_in = mm => mm * 0.03937;
const in_to_mm = inch => inch * 25.4;

// Speed
const mpm_to_sfm = mpm => mpm * 3.2808;
const sfm_to_mpm = sfm => sfm * 0.3048;

// RPM
const rpm_from_vc = (Vc_mpm, D_mm) => (Vc_mpm * 1000) / (Math.PI * D_mm);
const vc_from_rpm = (RPM, D_mm) => (Math.PI * D_mm * RPM) / 1000;

// Temperature
const C_to_F = C => C * 9/5 + 32;
const F_to_C = F => (F - 32) * 5/9;

// Power
const kW_to_hp = kW => kW * 1.341;
const cutting_power_kW = (Fc_N, Vc_mpm) => Fc_N * Vc_mpm / 60000;

// Hardness (approximate)
const HB_to_UTS = HB => HB * 3.45;  // MPa
const HB_to_HV = HB => HB * 1.05;   // for HB < 350
```
## END OF SKILL
