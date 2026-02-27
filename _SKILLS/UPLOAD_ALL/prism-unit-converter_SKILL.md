---
name: prism-unit-converter
description: |
  Unit conversion utilities. SI, imperial, and custom units.
---

**Time Savings: 20% calculation reduction**

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

---

## END OF SKILL
