---
name: prism-thermal-effects
description: |
  Thermal effects on CNC machining accuracy and part quality.
  Cutting temperature models (Loewen-Shaw, Trigger-Chao), thermal expansion
  compensation, machine tool thermal drift, spindle growth prediction,
  and coolant strategy optimization.
  
  Functions: cutting_temperature, thermal_expansion, spindle_growth,
  machine_drift_compensation, coolant_effectiveness, thermal_error_budget
  
  Academic Source: MIT 2.810 (Manufacturing Processes), Tlusty machine tool research
  Total: ~400 lines
---

## Quick Reference (Operational)

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-thermal-effects")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-thermal-effects") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What thermal parameters for 316 stainless?"
→ Load skill: skill_content("prism-thermal-effects") → Extract relevant thermal data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot effects issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM THERMAL EFFECTS IN CNC MACHINING

### When To Use
- Trigger keywords: "thermal", "effects", "heat", "machining", "accuracy", "quality", "cutting", "temperature"
- Activate when user task involves thermal or effects or heat concepts
- Also fires when related dispatchers need reference knowledge from this domain

## Temperature Prediction, Expansion Compensation & Thermal Management

# 1. CUTTING TEMPERATURE MODELS

## Loewen-Shaw Shear Plane Temperature Rise

The average temperature rise at the shear plane during orthogonal cutting:

```
Delta_T_shear = (1 - beta) * F_s * V_s / (rho * c * A_s * V_c)

Where:
  beta     = fraction of heat conducted into workpiece (0.1-0.4 typical)
  F_s      = shear force (N)
  V_s      = shear velocity (m/s) = V_c * cos(alpha) / cos(phi - alpha)
  rho      = workpiece density (kg/m^3)
  c        = specific heat capacity (J/kg*K)
  A_s      = shear plane area (m^2) = (a_p * w) / sin(phi)
  V_c      = cutting speed (m/min)
  phi      = shear angle (degrees)
  alpha    = rake angle (degrees)
```

## Trigger-Chao Average Chip Temperature

For practical shop-floor estimation:

```
T_chip = T_ambient + (0.4 * U_s * t_1 * V_c) / (rho * c * K)^0.333

Where:
  U_s  = specific cutting energy (J/m^3) = F_c / (a_p * f)
  t_1  = undeformed chip thickness (mm)
  K    = thermal diffusivity (m^2/s) = k / (rho * c)
  k    = thermal conductivity (W/m*K)
```

## Empirical Maximum Temperature (Turning)

```
T_max = C * V_c^a * f^b * a_p^c

Typical coefficients by material group:
  Carbon steel (AISI 1045):   C=200, a=0.40, b=0.20, c=0.06
  Stainless (AISI 304):       C=260, a=0.38, b=0.22, c=0.08
  Ti-6Al-4V:                  C=320, a=0.35, b=0.25, c=0.10
  Inconel 718:                C=380, a=0.32, b=0.28, c=0.12
  Aluminum 6061:              C=85,  a=0.45, b=0.15, c=0.04
```

# 2. HEAT PARTITION IN MACHINING

## Heat Distribution Between Chip, Workpiece, Tool, and Environment

```
Q_total = Q_chip + Q_workpiece + Q_tool + Q_environment

Typical partition ratios (% of total heat):
                  Q_chip   Q_work   Q_tool   Q_env
  Low speed:      60-70%   20-25%   8-12%    2-5%
  Medium speed:   70-80%   10-15%   5-8%     2-5%
  High speed:     80-90%   5-8%     2-5%     2-5%
  With coolant:   varies   -5-10%   -2-5%    +15-25%
```

## Peclet Number for Heat Partition

```
Pe = V_c * t_1 / (2 * K_w)

Where:
  K_w = thermal diffusivity of workpiece

Pe > 10:  Most heat carried by chip (HSM regime)
Pe < 0.5: Significant heat into workpiece (low speed)
```

# 3. THERMAL EXPANSION COMPENSATION

## Linear Thermal Expansion

```
Delta_L = L_0 * alpha * Delta_T

Where:
  L_0     = original length (mm)
  alpha   = CTE coefficient (um/m/K)
  Delta_T = temperature change (K)

Common CTE values:
  Steel (low carbon):    11.7 um/m/K
  Steel (stainless 304): 17.3 um/m/K
  Aluminum 6061:         23.6 um/m/K
  Titanium Ti-6Al-4V:    8.6 um/m/K
  Cast iron (gray):      10.8 um/m/K
  Inconel 718:           13.0 um/m/K
  Copper:                16.5 um/m/K
  Tungsten carbide:      5.2 um/m/K
  Brass:                 18.7 um/m/K
  Invar 36:              1.3 um/m/K
```

## Part Dimensional Error from Machining Heat

```
Error_thermal = D_part * alpha_part * (T_finish - T_ref)

Where:
  D_part     = critical dimension (mm)
  alpha_part = CTE of part material (um/m/K)
  T_finish   = part temperature after machining (C)
  T_ref      = reference/inspection temperature (typically 20C)

Example: 100mm aluminum part at 35C after machining:
  Error = 100 * 23.6e-6 * (35-20) = 0.0354 mm = 35.4 um
```

# 4. MACHINE TOOL THERMAL DRIFT

## Thermal Drift Sources and Magnitudes

```
Source                    Typical Drift     Time Constant
Spindle bearings:         5-30 um          20-60 min
Ball screws:              3-15 um/m        30-90 min
Column/bed structure:     5-25 um          2-8 hours
Environment (ambient):    2-10 um/K        hours
Coolant temperature:      1-5 um/K         10-30 min
Cutting heat (workpiece): 10-50 um         minutes
```

## First-Order Thermal Drift Model

```
Delta_pos(t) = Delta_max * (1 - exp(-t / tau))

Where:
  Delta_max = steady-state displacement (um)
  tau       = thermal time constant (minutes)
  t         = elapsed time since heat source active

For spindle warm-up:
  Delta_max_Z = 15-40 um (axial growth typical)
  Delta_max_X = 3-10 um (radial shift typical)
  tau         = 20-45 min (depends on spindle design/speed)
```

## Warm-Up Protocol Compensation

```
Recommended warm-up by tolerance class:
  IT6 (tight):    30 min at 50% max RPM, then 15 min at working RPM
  IT7 (standard): 20 min at 50% max RPM, then 10 min at working RPM
  IT8 (loose):    15 min at working RPM
  IT9+ (rough):   5-10 min or skip

Post-warmup residual error (typical):
  Without compensation: 5-15 um
  With probe cycle:     1-3 um
  With RTCP/thermal comp: 2-5 um
```

# 5. SPINDLE GROWTH PREDICTION

## Spindle Axial Growth Model

```
Growth_Z(RPM, t) = A * RPM^b * (1 - exp(-t / tau_s))

Typical values by spindle type:
  Direct-drive (HSK-A63):  A=0.0003, b=1.2, tau_s=25 min
  Belt-drive (BT40):       A=0.0005, b=1.0, tau_s=35 min
  Gear-drive (BT50):       A=0.0008, b=0.8, tau_s=45 min

Example: BT40 at 8000 RPM, 30 min:
  Growth = 0.0005 * 8000^1.0 * (1 - exp(-30/35))
         = 4.0 * 0.576 = 2.30 um axial growth
```

## Speed-Change Growth Transient

```
When RPM changes from RPM_1 to RPM_2:
  Delta_Z = A * (RPM_2^b - RPM_1^b) * (1 - exp(-Delta_t / tau_s))

If RPM increases: positive growth (spindle extends)
If RPM decreases: negative growth with LONGER tau (cooling slower)
  tau_cooling = 1.5 * tau_heating (typical)
```

# 6. COOLANT STRATEGY SELECTION

## Coolant Effectiveness by Operation

```
Operation         Flood    MQL    Dry    Cryo   Air Blast
Roughing steel:   +++      ++     +      ++     +
Finishing steel:  +++      +++    +      ++     ++
Roughing alum:    +++      ++     ++     +      ++
Finishing alum:   +++      +++    ++     +      ++
Roughing Ti:      +++      +      --     +++    -
Drilling deep:    +++      -      --     +      --
Threading:        +++      ++     -      +      +
HSM (>200m/min):  ++       +++    +++    ++     +++

Legend: +++ optimal, ++ good, + acceptable, - poor, -- avoid
```

## Temperature Reduction by Coolant Type

```
Coolant Type          Temp Reduction    Notes
Flood (6-8%):         40-60%           Best overall, chip evacuation
MQL (10-50 mL/hr):   20-35%           Lubrication > cooling
Dry machining:        0%               Highest tool temp, best for some
Cryogenic CO2:        50-70%           Excellent for Ti, Ni alloys
Cryogenic LN2:        60-80%           Best cooling, highest cost
High-pressure (70bar): 45-65%          Through-spindle, chip breaking
Air blast:            10-20%           Chip evacuation only
```

# 7. THERMAL ERROR BUDGETING

## Error Budget Allocation

```
Total thermal error = sqrt(E_spindle^2 + E_structure^2 + E_workpiece^2 + E_tool^2)

For a typical VMC machining IT7 tolerance on 100mm part:
  Tolerance band:    35 um (IT7 for 100mm)
  Allowed thermal:   ~50% of tolerance = 17.5 um
  
  Budget allocation:
    Spindle growth:      7 um (40%)
    Structure drift:     5 um (29%)  
    Workpiece expansion: 4 um (23%)
    Tool expansion:      1.5 um (8%)
    RSS total:           sqrt(49+25+16+2.25) = 9.6 um [within budget]
```

## Thermal Compensation Strategies by Error Source

```
Error Source         Compensation Method             Reduction
Spindle growth:      Probe tool length each cycle     80-90%
                     Thermal comp firmware (FANUC)    60-80%
                     Warm-up protocol                 50-70%
Structure drift:     Environmental control (+/-1C)    70-90%
                     In-process probing               80-95%
                     Thermal model compensation       50-70%
Workpiece:           Machine at reference temp         90%+
                     Apply CTE correction to dims      80-90%
                     Temperature-controlled coolant    60-80%
Tool:                HSK/Capto (shorter, stiffer)      30-50%
                     Probing between ops               90%+
```

# 8. CNC-SPECIFIC COMPENSATION STRATEGIES

## FANUC Thermal Compensation Parameters

```
Parameter           Function                          Typical Value
#1626-#1641:        Thermal growth coefficients        Machine-specific
#11841:             Thermal comp enable/disable        1=ON
#11842:             Spindle growth axis                3 (Z-axis)
#11843:             Sampling interval                  60 sec
#11844:             Filter time constant               300 sec
```

## Practical Temperature Management Rules

```
Rule 1: First-Part Inspection Protocol
  - Machine warm-up per tolerance class
  - Cut first part, measure critical features
  - Apply offset corrections before production run
  
Rule 2: Dimensional Trend Monitoring
  - Measure every 10th part (tight tol) or 25th (standard)
  - Plot X-bar chart on critical dimension
  - If trend > 0.3 * tolerance, probe and re-zero

Rule 3: Environmental Stability Requirements
  Tolerance     Max Ambient Variation    Coolant Temp Control
  IT5:          +/- 0.5 C               +/- 0.5 C
  IT6:          +/- 1.0 C               +/- 1.0 C
  IT7:          +/- 2.0 C               +/- 2.0 C
  IT8+:         +/- 5.0 C               Not critical

Rule 4: Tool Length Probing Frequency
  Surface speed < 100 m/min:  Every 30 min or tool change
  Surface speed 100-300:      Every 20 min
  Surface speed > 300:        Every 10 min or per part
```

## QUICK REFERENCE: THERMAL EFFECT DECISION TREE

```
Is part tolerance < IT7?
  YES -> Full thermal management protocol:
         1. Warm-up per spec
         2. Environmental control
         3. Probe every cycle
         4. CTE compensation on inspection
  NO  -> Is tolerance < IT9?
         YES -> Basic protocol:
                1. 15 min warm-up
                2. First-article inspection
                3. Trend monitoring every 25 parts
         NO  -> Minimal:
                1. Quick warm-up
                2. First-article only
```
