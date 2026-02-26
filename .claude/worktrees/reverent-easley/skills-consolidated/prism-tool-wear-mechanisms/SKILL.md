---
name: prism-tool-wear-mechanisms
description: |
  Tool wear mechanisms, measurement, prediction, and management for CNC operations.
  Flank wear, crater wear, notch wear, BUE, thermal cracking, chipping, fracture.
  ISO 3685 wear criteria, Taylor extended models, and wear monitoring strategies.
  
  Functions: wear_classify, flank_wear_rate, crater_wear_rate, taylor_extended,
  tool_life_remaining, wear_monitor_strategy, insert_grade_selector,
  coating_effectiveness, wear_cost_per_part, tool_change_optimization
  
  Academic Source: MIT 2.008/2.810, ISO 3685, Trent & Wright Tool Wear
  Total: ~380 lines
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "tool", "wear", "mechanisms", "measurement", "prediction", "management", "operations", "flank"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-tool-wear-mechanisms")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-tool-wear-mechanisms") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What tool parameters for 316 stainless?"
→ Load skill: skill_content("prism-tool-wear-mechanisms") → Extract relevant tool data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot wear issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM TOOL WEAR MECHANISMS
## Wear Prediction, Monitoring, and Management for CNC

# 1. WEAR MECHANISMS OVERVIEW

## 1.1 Temperature-Dependent Mechanisms

```
Low temp (< 500°C):   Abrasion dominates
                       Hard particles in workpiece scratch tool
                       Dominant in: cast iron, hardened steel

Medium temp (500-900°C): Adhesion + diffusion
                          BUE formation/detachment
                          Chemical reaction at interface
                          Dominant in: steel at moderate speed

High temp (> 900°C):   Diffusion dominates
                        Atomic migration across interface
                        Crater wear accelerates
                        Dominant in: steel at high speed, Ti alloys
```

## 1.2 Wear Map (Speed vs Feed)

```
                High speed
                    |
  Thermal cracking  |  Crater wear + diffusion
  (interrupted cuts)|  (continuous high speed)
  __________________|___________________
                    |
  Mechanical wear   |  Flank wear (abrasion)
  Chipping/fracture |  BUE at moderate speed
  (high feed)       |  Notch wear (work-hardening)
                    |
                Low speed ──────────── High speed
```

# 2. FLANK WEAR

## 2.1 Flank Wear Progression

Three phases:
```
Phase I (Break-in):   Rapid initial wear, VB grows quickly
  Duration: 1-5 min typically
  Cause: Sharp edge radius increases to stable geometry

Phase II (Steady-state): Linear wear growth
  VB = VB₀ + K × t
  K = wear rate (mm/min)
  This is the useful life region

Phase III (Accelerated): Exponential growth → catastrophic failure
  Temperature rises → diffusion accelerates → rapid collapse
  MUST change tool before Phase III
```

## 2.2 Flank Wear Measurement

```
VB_avg = average flank wear land width (mm)
VB_max = maximum local wear (mm)
VB_N = notch wear at depth-of-cut line (mm)

Measurement: perpendicular to cutting edge, on flank face
  Use toolmaker's microscope at 20-50× magnification
```

## 2.3 Flank Wear Rate Factors

```
Wear rate K (mm/min) increases with:
  ↑ Cutting speed: K ∝ Vc^(2-4) (strongest factor)
  ↑ Feed: K ∝ f^(0.5-1.0)
  ↑ Hardness: K ∝ HB^(1.0-2.0)
  ↑ Abrasive content: SiC particles, carbides in cast iron

Wear rate K decreases with:
  ↑ Tool hardness (CBN > ceramic > carbide > HSS)
  ↑ Coating effectiveness (TiAlN, AlCrN)
  ↑ Coolant flow (reduces temperature → reduces diffusion)
```

# 3. CRATER WEAR

## 3.1 Crater Wear Parameters

```
KT = crater depth (mm) — measured from original rake face
KM = distance from edge to crater center (mm)
KB = crater width (mm)
KF = distance from edge to crater front (mm)

Critical: when KF → 0, the crater meets the cutting edge → catastrophic
```

## 3.2 Crater Wear Mechanisms

```
Diffusion (dominant at high temp):
  Carbon diffuses from WC tool into steel chip
  Rate: dKT/dt ∝ exp(-Q/RT)
  
  Activation energy Q:
    WC-Co uncoated: Q ≈ 200 kJ/mol
    TiC coated: Q ≈ 350 kJ/mol (much slower)
    Al₂O₃ coated: Q ≈ 450 kJ/mol (excellent crater resistance)
```

## 3.3 Material Susceptibility

```
High crater wear risk:
  - Steel at high speed (C diffusion into WC)
  - Titanium alloys (Ti reacts with almost everything)
  - Nickel alloys (Ni diffusion into Co binder)

Low crater wear risk:
  - Cast iron (graphite lubricates, low adhesion)
  - Aluminum (low temperature, no diffusion)
  - Hardened steel with CBN (stable interface)
```

# 4. OTHER WEAR MODES

## 4.1 Notch Wear

Location: at depth-of-cut line where chip edge meets unmachined surface.
```
Causes:
  - Oxidation (air contact at chip boundary)
  - Work-hardened layer from previous pass
  - Abrasive contact with hard skin (castings, forgings)
  
Countermeasures:
  - Vary ap slightly between passes (spread notch load)
  - Round insert geometry (no fixed DOC line)
  - Use Al₂O₃ coating (oxidation resistant)
```

## 4.2 Thermal Cracking

Location: parallel cracks perpendicular to cutting edge.
```
Cause: Thermal cycling in interrupted cuts (milling)
  Heating on entry → expansion
  Cooling on exit → contraction → tensile stress → cracks
  
Countermeasures:
  - DRY milling (no coolant cycle → no thermal shock)
  - Tougher grades (higher Co content, K-series carbide)
  - Reduce entry/exit shock (roll-in, smaller ae)
```

## 4.3 Edge Chipping

```
Causes:
  - Excessive chip load (fz too high)
  - Interrupted cut impact
  - Hard inclusions in workpiece
  - Negative land too narrow for application
  
Countermeasures:
  - Tougher grade (higher toughness K₁c)
  - Wider negative land (T-land, S-land)
  - Reduce fz or use honed edge preparation
  - Chamfer insert entry edge
```

## 4.4 Plastic Deformation

```
Cause: Tool softens at extreme temperature (>1000°C at edge)
  Edge droops/bulges, changing effective geometry
  
Conditions: Very high speed + high feed in hard materials
  
Countermeasures:
  - Harder substrate (reduced Co, finer grain WC)
  - Better coating (thermal barrier)
  - Reduce speed before reduce feed
```

# 5. ISO 3685 WEAR CRITERIA

## 5.1 Standard End-of-Life Criteria

| Criterion | Limit | Application |
|-----------|-------|-------------|
| VB_avg | 0.3 mm | Uniform flank wear (general) |
| VB_max | 0.6 mm | Irregular flank wear |
| VB_N | 1.0 mm | Notch wear |
| KT | 0.06 + 0.3f mm | Crater depth |
| Catastrophic | Any fracture | Immediate tool change |
| Surface finish | Exceeds spec | Functional criterion |
| Dimensional | Out of tolerance | Functional criterion |

## 5.2 Practical CNC Criteria

In production CNC, functional criteria often trigger tool change before ISO limits:
```
Typical CNC tool change triggers:
  1. Dimensional drift > 50% of tolerance band
  2. Surface finish exceeds spec (Ra target)
  3. Burr formation (indicates edge breakdown)
  4. Cutting force increase > 25% (torque monitoring)
  5. Sound change (chatter onset from worn edge)
  6. Chip form change (ribbons instead of C-chips)
```

# 6. TAYLOR TOOL LIFE MODELS

## 6.1 Basic Taylor Equation

```
V × T^n = C

where:
  V = cutting speed (m/min)
  T = tool life (minutes)
  n = Taylor exponent
  C = constant (speed for 1-minute life)

Solve for T:
  T = (C/V)^(1/n)
```

## 6.2 Taylor Exponents by Tool Material

| Tool Material | n | C (steel) | C (cast iron) |
|---------------|---|-----------|---------------|
| HSS | 0.08-0.12 | 50-80 | 70-100 |
| Uncoated carbide | 0.20-0.25 | 150-250 | 200-350 |
| Coated carbide | 0.25-0.35 | 250-450 | 350-600 |
| Ceramic (Al₂O₃) | 0.30-0.45 | 400-800 | 500-1000 |
| CBN | 0.40-0.60 | 200-400 | 800-1500 |
| PCD | 0.50-0.70 | — | — (non-ferrous) |

## 6.3 Extended Taylor (Multi-Factor)

```
V × T^n × f^a × ap^b = C_ext

Typical exponents (coated carbide on steel):
  n = 0.30 (speed effect on life)
  a = 0.20 (feed effect)
  b = 0.10 (depth effect)

Speed dominates: doubling speed reduces life by ~8× (for n=0.30)
Feed moderate: doubling feed reduces life by ~1.15× (for a=0.20)
Depth minor: doubling depth reduces life by ~1.07× (for b=0.10)
```

## 6.4 Minimum Cost vs Maximum Production

```
Minimum cost speed:
  V_mc = C / ((1/n - 1) × (C_t/C_m + t_c))^n

Maximum production speed:
  V_mp = C / ((1/n - 1) × t_c)^n

where:
  C_t = tool cost per edge ($)
  C_m = machine + labor rate ($/min)
  t_c = tool change time (min)

V_mp > V_mc always (max production runs faster, burns tools)
Optimal: between V_mc and V_mp depending on priority
```

# 7. COATING EFFECTIVENESS

## 7.1 Common Coatings and Properties

| Coating | Thickness | Max Temp | Hardness (HV) | Best For |
|---------|-----------|----------|----------------|----------|
| TiN | 2-5 μm | 600°C | 2300 | General steel |
| TiCN | 2-6 μm | 450°C | 3000 | Medium speed steel |
| TiAlN | 2-5 μm | 800°C | 3300 | High-speed steel, dry |
| AlTiN | 2-5 μm | 900°C | 3400 | High-speed, hard steel |
| AlCrN | 2-5 μm | 1100°C | 3200 | Stainless, Inconel |
| Al₂O₃ | 5-15 μm | 1200°C | 2500 | High-speed steel/CI |
| DLC | 1-3 μm | 300°C | 5000+ | Aluminum, composites |
| CVD diamond | 5-20 μm | 700°C | 10000 | Graphite, CFRP, Al-Si |

## 7.2 Coating Selection Guide

```
Steel (general):     TiAlN (dry) or TiCN (wet)
Steel (high speed):  AlTiN or Al₂O₃ (CVD multilayer)
Stainless:           AlCrN or TiAlN
Cast iron:           Al₂O₃ or TiCN
Aluminum:            DLC or uncoated polished
Titanium:            TiAlN or AlCrN (sharp edge, no Al₂O₃)
Inconel:             AlCrN (whisker-reinforced ceramic for high speed)
CFRP/composites:     CVD diamond or PCD
```

# 8. TOOL LIFE MANAGEMENT FOR CNC

## 8.1 Tool Life Counter Setup

```
CNC controller tool life management:
  Method 1: Part count (simplest)
    Set MAX_PARTS per edge based on testing
    
  Method 2: Cutting time (better)
    Accumulate actual cutting minutes
    Trigger change at T_limit
    
  Method 3: Cutting distance (best for varying ops)
    Track total distance cut = Σ(Vc × t_cut)
    More consistent than time for multi-pass ops
```

## 8.2 Tool Group Management

```
For redundant tools (T01.1, T01.2, ... T01.N):
  Auto-switch to next offset when life expires
  Alert operator when last tool in group active
  
Life stagger: start tools at different initial wear states
  to avoid all edges expiring in same shift
```

## 8.3 Tool Wear Compensation

```
Automatic offset adjustment for wear:
  After N parts, adjust tool offset by ΔX, ΔZ
  Based on measured dimensional trend
  
  ΔZ_comp = VB × tan(κ_r) × K_wear_factor
  
  Fanuc: G10 L11 P[tool#] R[offset]
  Siemens: $TC_DP3[tool,edge] += delta
```
