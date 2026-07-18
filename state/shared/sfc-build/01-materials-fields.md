**Kienzle-Physics CNC Speed/Feed Calculator — Exhaustive Per-Material Data Requirements**

Data must be stored **per heat treatment state** (Annealed, Normalized, Q&T, Hardened/Tempered) because microstructure and properties change drastically.

---

### **1. Metallurgy (per state)**
- **Chemical Composition** (%C, Si, Mn, Cr, Ni, Mo, V, Al, S, Pb, Ca, O, N) → Drives: *all* (phase prediction, thermal props, kc, abrasiveness, BUE)
- **Primary Phases & Volume Fractions** (ferrite, pearlite, bainite, martensite, retained austenite, carbides) → Drives: *Force, Tool Life, Finish*
- **Inclusion Content & Type** (MnS, oxides, silicates, Ca-treated) → Drives: *Tool Life, Finish* (lubricity, chip break)
- **Grain Size** (ASTM # or mean diameter μm) → Drives: *Force* (Hall-Petch flow stress), *Finish*, *Tool Life*

---

### **2. Thermodynamics (per state, preferably temperature-dependent curves)**
- **Thermal Conductivity** *k(T)* (W/m·K) → **Thermal**
- **Specific Heat Capacity** *cp(T)* (J/kg·K) → **Thermal**
- **Density** *ρ* (g/cm³) → **Thermal**
- **Melting / Solidus Temperature** *Tm* (°C) → **Thermal** (also BUE tendency)
- **Thermal Diffusivity** *α(T)* (m²/s) → **Thermal**

**Primary use:** Heat partition model, tool-chip interface temperature, maximum allowable Vc, thermal softening in Johnson-Cook.

---

### **3. Machinability Parameters (per state + tool coating family)**

**Kienzle Force Model (core)**
- *kc1.1* (specific cutting force at *h*=1.1 mm², N/mm²) → **Force**
- *mc* (chip thickness exponent) → **Force**

**Taylor Tool Life (per tool type: uncoated carbide, PVD, CVD, cermet, PCBN, etc.)**
- Taylor *C* (velocity constant)
- Taylor *n* (speed exponent) → **Tool Life**

**Advanced Constitutive Model**
- **Johnson-Cook** parameters: *A, B, C, n, m* → **Force + Thermal** (flow stress, strain-rate, thermal softening)
- **Optional:** Oxley or Zerilli-Armstrong constants if higher fidelity desired.

**Classification**
- ISO 513 Material Group + Subgroup (P1–P6, M1–M3, K1–K3, etc.)
- Machinability Index (relative to reference steel)

---

### **4. Mechanical Properties (per state)**

| Property              | Symbol     | Drives                  | Notes |
|-----------------------|------------|-------------------------|-------|
| Brinell Hardness      | HB         | Force, Tool Life, Finish | Primary kc estimator |
| Rockwell C Hardness   | HRC        | Force, Tool Life, Finish | For hardened range |
| Ultimate Tensile Strength | UTS (MPa) | Force, Tool Life | Correlates with kc |
| Yield Strength        | Rp0.2 / YS (MPa) | Force (flow stress) | Input for JC model |
| Elongation at Break   | A (%)      | Finish, Tool Life | BUE tendency, chip morphology |
| Reduction of Area     | Z (%)      | Finish | Optional but useful |

---

### **Summary: What Drives What**

- **Force Calculation**: `kc1.1, mc, HB/HRC, JC (A/B/C/n/m), Grain Size, UTS/YS`
- **Tool Life Calculation**: `Taylor C/n, HB/HRC, kc1.1 (power), microstructure/abrasives, Thermal props (temp reached)`
- **Thermal Calculation**: `k(T), cp(T), ρ, Tm, α, JC thermal softening (m)`
- **Surface Finish / Integrity**: `Elongation, Grain Size, Inclusions, Ductility, Hardness, BUE tendency (Tm, composition)`

---

**Implementation Note**: Store base values at a reference hardness (e.g. 180 HB annealed) and provide scaling rules (e.g. *kc1.1* increases ~1.15–1.35× from annealed to hardened state for steels) so the calculator can dynamically adjust when user selects different hardness/condition.
