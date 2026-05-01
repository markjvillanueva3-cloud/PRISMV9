---
name: prism-vibration-chatter
description: |
  Vibration analysis and chatter prediction for CNC machining.
  Stability lobe diagrams, regenerative chatter theory, dynamic stiffness,
  forced vibration analysis, tap testing, and practical chatter mitigation.
  
  Functions: stability_lobe, chatter_frequency, dynamic_stiffness,
  critical_depth, forced_vibration, frf_analysis, chatter_mitigation,
  variable_pitch_stability, spindle_speed_selection
  
  Academic Source: MIT 2.810, Tlusty/Altintas chatter theory, Schmitz TLD method
  Total: ~420 lines
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "vibration", "chatter", "analysis", "prediction", "machining", "stability", "lobe"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-vibration-chatter")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-vibration-chatter") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What vibration parameters for 316 stainless?"
→ Load skill: skill_content("prism-vibration-chatter") → Extract relevant vibration data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot chatter issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM VIBRATION & CHATTER ANALYSIS
## Stability Prediction, Chatter Avoidance & Vibration Control in CNC

# 1. REGENERATIVE CHATTER THEORY

## Fundamental Mechanism

Regenerative chatter occurs when the current cut encounters waviness left by the previous
pass, creating a varying chip thickness that excites the system at its natural frequency.

```
Dynamic chip thickness:
  h(t) = h_0 + [y(t) - y(t - T)]

Where:
  h_0  = nominal/static chip thickness (mm)
  y(t) = current vibration displacement (mm)
  T    = tooth passing period (s) = 60 / (N * RPM)
  N    = number of teeth

Dynamic cutting force:
  F(t) = K_s * a_p * [h_0 + y(t) - y(t - T)]

Where:
  K_s  = specific cutting force (N/mm^2)
  a_p  = axial depth of cut (mm)

Stability condition (Tlusty):
  a_p_lim = -1 / (2 * K_s * Re[G(jw)])

Where:
  G(jw) = transfer function of the most flexible mode
  Re[G(jw)] = real part (negative minimum determines stability limit)
```

## Phase Between Successive Passes

```
Phase angle epsilon = 2*pi*f_c*T + pi

Where:
  f_c = chatter frequency (Hz)
  T   = tooth passing period (s)

Stable: current wave cancels previous (epsilon = even multiple of pi)
Unstable: current wave reinforces previous (epsilon = odd multiple of pi)
```

# 2. STABILITY LOBE DIAGRAMS

## Analytical Stability Lobe Calculation (Altintas Method)

```
For lobe number k (k = 0, 1, 2, ...):

  Spindle speed:
    RPM_k = 60 * f_c / (N * (k + epsilon/(2*pi)))

  Critical depth:
    a_p_lim = -1 / (2 * K_s * Re[G(j*2*pi*f_c)])

  Where:
    f_c   = chatter frequency (Hz), near dominant natural frequency
    N     = number of flutes
    k     = lobe number (0 = rightmost/highest speed lobe)
    epsilon = phase shift

Lobe peaks (maximum stable depth) occur between lobes where:
  RPM_peak = 60 * f_c / (N * (k + 0.5))
```

## Practical Stability Lobe Data (Typical VMC, BT40)

```
Example: 4-flute endmill, fn=850 Hz, zeta=0.03, K_s=2000 N/mm^2

Lobe  RPM_center   a_p_max (mm)   Notes
0     12750        8.5            Highest speed, widest lobe
1     6375         5.2            Common operating range
2     4250         4.8            
3     3188         4.6            
4     2550         4.5            Lobes converge at low speed
5+    <2550        4.3-4.5        Narrow lobes, hard to exploit

Between lobes (stability pockets):
  Pocket 0-1:  ~8500 RPM, a_p up to 12+ mm
  Pocket 1-2:  ~5100 RPM, a_p up to 8+ mm
```

# 3. DYNAMIC STIFFNESS & FRF

## Single-Degree-of-Freedom (SDOF) Model

```
Transfer function:
  G(jw) = 1 / (k * (1 - r^2 + j*2*zeta*r))

Where:
  k    = static stiffness (N/um)
  r    = frequency ratio = w/w_n = f/f_n
  zeta = damping ratio (typically 0.02-0.06 for machine tools)
  w_n  = natural frequency (rad/s) = 2*pi*f_n

Real part (controls stability):
  Re[G] = (1 - r^2) / (k * ((1-r^2)^2 + (2*zeta*r)^2))

Negative minimum of Re[G]:
  Re_min = -1 / (2*k*zeta*(1+zeta))
  occurs at r = sqrt(1 + zeta) approximately r ~ 1

Dynamic stiffness at resonance:
  k_dyn = k * 2 * zeta = k / Q

Quality factor:
  Q = 1 / (2 * zeta)
```

## Typical Machine Tool Dynamic Parameters

```
Component              f_n (Hz)   k (N/um)   zeta    k_dyn (N/um)
Spindle (BT40):        800-1200   20-50      0.02-0.04   1-4
Spindle (HSK-A63):     1000-1500  30-80      0.02-0.04   1.5-6
Tool holder+tool:      500-2000   5-30       0.01-0.03   0.2-1.5
Workpiece (thin wall): 200-1000   2-20       0.01-0.05   0.1-2
Table/fixture:         300-800    50-200     0.03-0.06   3-20
Column (C-frame VMC):  40-120     100-500    0.02-0.04   5-30
```

# 4. CRITICAL DEPTH OF CUT

## Absolute Stability Limit (Tlusty)

```
a_p_crit = 1 / (2 * K_s * |Re_min[G]|)

For SDOF:
  a_p_crit = k * zeta * (1 + zeta) / K_s
  Simplified: a_p_crit ~ k * zeta / K_s  (for small zeta)

Example: BT40 spindle, 4-flute carbide in AISI 1045
  k = 30 N/um, zeta = 0.03, K_s = 2200 N/mm^2
  a_p_crit = 30000 * 0.03 / 2200 = 0.41 mm (unconditionally stable)
  
  But at stability lobe peaks: a_p_max = 3-8x higher
```

## Critical Depth by Material Group (Practical Ranges)

```
Material           K_s (N/mm^2)   Typical a_p_crit (mm)   Notes
Low carbon steel:  1800-2200      0.3-0.8                 Medium difficulty
Stainless 304:     2400-2800      0.2-0.5                 High K_s, tight
Ti-6Al-4V:         1600-2000      0.3-0.7                 Low speed compounds it
Inconel 718:       2800-3500      0.15-0.4                Most chatter-prone
Aluminum 6061:     600-900        1.0-3.0                 Easiest
Cast iron (gray):  1200-1600      0.5-1.2                 Good damping helps
Brass/Bronze:      700-1100       0.8-2.0                 Free-cutting
```

# 5. FORCED VIBRATION SOURCES

## Non-Regenerative Vibration Sources in CNC

```
Source                    Frequency              Severity   Mitigation
Spindle imbalance:        1x RPM                Medium     Balancing, lower RPM
Bearing defect (outer):   BPFO = N_b*RPM/2*(1-d/D)  High  Replace bearing
Bearing defect (inner):   BPFI = N_b*RPM/2*(1+d/D)  High  Replace bearing
Gear mesh:                N_teeth * RPM          Medium     Gear quality, damping
Tooth passing:            N_flutes * RPM         Low-Med    Normal, design for it
Belt frequency:           RPM * N_grooves        Low        Belt tension, replace
Coolant pump:             Pump RPM               Low        Isolate pump mount
Interrupted cut:          Entry/exit frequency   Medium     Engagement control
Workpiece resonance:      Natural freq of part   High       Fixture, dampening

Where:
  N_b = number of rolling elements in bearing
  d   = rolling element diameter
  D   = bearing pitch diameter
```

## Distinguishing Chatter from Forced Vibration

```
Characteristic     Regenerative Chatter      Forced Vibration
Frequency:         Near natural freq (fn)     At forcing frequency
                   NOT exact multiple of RPM  Exact multiple of RPM or known source
Speed dependence:  Disappears at certain RPM  Present at all speeds (proportional)
Depth dependence:  Sudden onset at a_p_crit   Gradual increase with depth
Sound:             Distinctive screech/howl   Hum, rumble, or periodic knock
Surface:           Uniform chatter marks      Varies by source
Fix:               Change RPM, reduce depth   Fix source (balance, bearing, etc.)
```

# 6. TAP TESTING PROTOCOL

## Impact Hammer Test Procedure

```
Equipment needed:
  - Impact hammer with force transducer (PCB 086C03 or similar)
  - Accelerometer (PCB 352C33 or similar, <1g mass)
  - 2-channel DAQ (at least 10 kHz sample rate)
  - Modal analysis software (CutPro, MetalMax, or MATLAB)

Procedure:
  1. Mount tool in spindle (actual tool, not master reference)
  2. Attach accelerometer to tool tip (wax mount, X and Y directions)
  3. Impact tool tip with hammer at 90 deg to accelerometer
  4. Capture 3-5 valid impacts (coherence > 0.95 at peaks)
  5. Average FRFs to reduce noise
  6. Extract modal parameters: f_n, k, zeta for dominant modes
  
  Impact location: tool tip, perpendicular to cutting direction
  Hammer tip selection:
    Steel tip:     0-3000 Hz (heavy tools, low frequency)
    Plastic tip:   0-1500 Hz (medium tools, general purpose)
    Rubber tip:    0-500 Hz  (large structures, low frequency)
```

## FRF Quality Checks

```
Coherence check:
  Coherence > 0.95 at resonance peaks = valid
  Coherence < 0.80 = retake measurements
  
Repeatability:
  f_n variation < 2% between impacts
  Amplitude variation < 10% between impacts
  
Common issues:
  Double-hit: Remove and retake (shows as dip in coherence)
  Overload:   Reduce impact force (flat FRF = sensor saturated)
  Noise floor: Increase averaging (5-10 averages)
```

# 7. CHATTER MITIGATION STRATEGIES

## Strategy Selection by Root Cause

```
Strategy                  Effectiveness  Cost    Implementation
                          
SPEED ADJUSTMENT (first try always):
  Move to stability pocket:  90%+       Free    Adjust RPM to lobe peak
  Speed formula: RPM = 60*f_c/(N*k)    Free    k = integer for pocket center

DEPTH/WIDTH REDUCTION:
  Reduce a_p below a_p_crit: 100%      Free*   Reduces MRR (*productivity cost)
  Reduce a_e (radial):       80-90%    Free*   Less radial engagement

TOOL CHANGES:
  Fewer flutes (3->2):       60-80%    Low     Changes tooth passing freq
  Variable pitch/helix:      50-70%    Medium  Disrupts regeneration
  Shorter stick-out:         70-90%    Free    Increases stiffness dramatically
  Larger diameter:           40-60%    Low     Increases stiffness
  Different coating:         10-30%    Low     Changes friction/damping

WORKHOLDING:
  Add support/fixture:       60-90%    Medium  Increases part stiffness
  Damping material:          30-50%    Low     Viscoelastic pads, sand fill
  Vacuum fixture (thin):     40-70%    Medium  Better than clamps for thin parts

MACHINE-LEVEL:
  Active damping (spindle):  50-80%    High    Requires special spindle
  Tuned mass damper:         30-50%    Medium  Bolted to spindle housing
  Process damping (low Vc):  40-70%    Free*   Only works below ~100 SFM
```

## Variable Pitch Endmill Stability Enhancement

```
Variable pitch angles disrupt the regenerative mechanism by preventing
all teeth from encountering the same waviness pattern.

Common variable pitch configurations (4-flute):
  Standard:    90-90-90-90 deg (no benefit)
  Light VP:    88-92-88-92 deg (20-30% improvement)
  Medium VP:   85-95-85-95 deg (40-60% improvement)
  Aggressive:  80-100-80-100 deg (50-70% but uneven loads)
  
Variable helix (combined with VP):
  35/38 deg alternating helix + variable pitch
  Most effective commercial solution (e.g., Niagara VPX)
```

# 8. CNC-SPECIFIC APPLICATIONS

## Spindle Speed Selection Algorithm

```
Given: f_n (from tap test or database), N_flutes, desired a_p

Step 1: Calculate tooth-passing frequency for stability pocket centers
  f_tp = N_flutes * RPM / 60
  
  For pocket center between lobes k and k+1:
    RPM_pocket = 60 * f_n / (N_flutes * (k + 0.5))

Step 2: Check if RPM_pocket is within machine/tool capability
  V_c = pi * D * RPM / 1000
  Ensure V_c is within recommended range for material

Step 3: If desired RPM doesn't hit a pocket, alternatives:
  a) Change number of flutes to shift pockets
  b) Use variable pitch tooling
  c) Reduce a_p below absolute stability limit
  d) Accept lower RPM at a pocket (productivity trade-off)
```

## Quick Chatter Diagnosis Checklist

```
Symptom                   Likely Cause              First Action
Consistent screech:       Regenerative chatter       Change RPM +/- 10-15%
Intermittent vibration:   Entry/exit dynamics        Reduce radial engagement
Low-freq rumble:          Structural resonance       Check fixture, reduce force
High-pitch whine:         Tool resonance             Shorter tool, fewer flutes
Marks match flute count:  Forced (tooth passing)     Normal, reduce depth if bad
Marks DON'T match flutes: Chatter (near f_n)         RPM adjustment or variable pitch
Only on thin walls:       Part flexibility            Add support, lighter cuts
Only at certain depth:    Near stability boundary     Reduce a_p by 20% or change RPM
```

## Process Damping (Low Speed Stability Enhancement)

```
At low cutting speeds (V_c < 50-120 m/min depending on material),
the clearance face of the tool contacts the wavy surface, creating
a damping effect that extends the stability limit.

Process damping coefficient:
  C_pd = mu * K_pd * V_c_ratio

Where:
  mu        = friction coefficient (0.3-0.6)
  K_pd      = indentation force coefficient (material dependent)
  V_c_ratio = wavelength/clearance geometry factor

Effect: a_p_crit at low speed can be 2-5x higher than analytical prediction
Implication: If chatter occurs at low speed, don't slow down further - 
             the process damping was already helping. Try faster or change tool.
```
