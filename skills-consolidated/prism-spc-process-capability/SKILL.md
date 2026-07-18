---
name: prism-spc-process-capability
description: |
  Statistical Process Control and Process Capability analysis for CNC manufacturing.
  Shewhart control charts (X-bar/R, X-bar/S, I-MR), process capability indices
  (Cp, Cpk, Pp, Ppk, Cpm), Western Electric rules, and Nelson rules.
  
  Functions: spc_xbar_r, spc_xbar_s, spc_imr, capability_cp, capability_cpk,
  capability_pp, capability_ppk, capability_cpm, ooc_detection, yield_from_cpk
  
  Academic Source: MIT 2.830J (Quality Control in Manufacturing), AIAG SPC Manual
  Total: ~450 lines
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "spc", "process", "capability", "statistical", "control", "analysis", "manufacturing", "shewhart"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-spc-process-capability")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-spc-process-capability") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What spc parameters for 316 stainless?"
→ Load skill: skill_content("prism-spc-process-capability") → Extract relevant spc data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot process issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM SPC & PROCESS CAPABILITY
## Statistical Process Control for CNC Manufacturing

# 1. CONTROL CHART CONSTANTS

Standard constants for subgroup sizes n = 2..25 (most common in CNC: n = 3..5):

| n | A2 | A3 | B3 | B4 | d2 | D3 | D4 |
|---|----|----|----|----|----|----|----| 
| 2 | 1.880 | 2.659 | 0 | 3.267 | 1.128 | 0 | 3.267 |
| 3 | 1.023 | 1.954 | 0 | 2.568 | 1.693 | 0 | 2.574 |
| 4 | 0.729 | 1.628 | 0 | 2.266 | 2.059 | 0 | 2.282 |
| 5 | 0.577 | 1.427 | 0 | 2.089 | 2.326 | 0 | 2.114 |
| 6 | 0.483 | 1.287 | 0.030 | 1.970 | 2.534 | 0 | 2.004 |
| 7 | 0.419 | 1.182 | 0.118 | 1.882 | 2.704 | 0.076 | 1.924 |
| 8 | 0.373 | 1.099 | 0.185 | 1.815 | 2.847 | 0.136 | 1.864 |
| 10 | 0.308 | 0.975 | 0.284 | 1.716 | 3.078 | 0.223 | 1.777 |

**Usage in CNC:** Typical subgroup = 5 consecutive parts from same setup.

# 2. X-BAR/R CHARTS

For subgroup sizes n ≤ 10. Most common SPC chart in CNC shops.

**Formulas:**
```
X_double_bar = mean of all subgroup means
R_bar = mean of all subgroup ranges

X-bar chart:
  UCL_xbar = X_double_bar + A2 * R_bar
  CL_xbar  = X_double_bar
  LCL_xbar = X_double_bar - A2 * R_bar

R chart:
  UCL_R = D4 * R_bar
  CL_R  = R_bar
  LCL_R = D3 * R_bar
```

**Estimated process sigma:**
```
σ_hat = R_bar / d2
```

**CNC Example:** Boring a 25.000 ±0.013 mm hole, subgroups of 5:
- X_double_bar = 25.002, R_bar = 0.008
- σ_hat = 0.008 / 2.326 = 0.00344 mm
- UCL_xbar = 25.002 + 0.577 × 0.008 = 25.0066
- LCL_xbar = 25.002 - 0.577 × 0.008 = 24.9974

# 3. X-BAR/S CHARTS

For subgroup sizes n > 10, or when better sigma estimation is needed.

**Formulas:**
```
S_bar = mean of all subgroup standard deviations

X-bar chart:
  UCL = X_double_bar + A3 * S_bar
  LCL = X_double_bar - A3 * S_bar

S chart:
  UCL = B4 * S_bar
  LCL = B3 * S_bar

σ_hat = S_bar / c4
  where c4 ≈ sqrt(2/(n-1)) * Γ(n/2) / Γ((n-1)/2)
  c4(5) = 0.9400, c4(10) = 0.9727, c4(25) = 0.9896
```

# 4. INDIVIDUAL-MOVING RANGE (I-MR)

For CNC operations where only one measurement per setup (e.g., first-article inspection, batch production with long cycle times).

**Formulas:**
```
MR_i = |X_i - X_{i-1}|  (moving range of consecutive values)
MR_bar = mean of all MR values

I chart (Individuals):
  UCL = X_bar + 2.660 * MR_bar
  CL  = X_bar
  LCL = X_bar - 2.660 * MR_bar

MR chart:
  UCL = 3.267 * MR_bar
  CL  = MR_bar
  LCL = 0

σ_hat = MR_bar / d2 = MR_bar / 1.128
```

**When to use in CNC:**
- First-article inspection across setups
- Tool wear tracking (one measurement per tool change)
- Machine warm-up drift monitoring

# 5. PROCESS CAPABILITY INDICES

## 5.1 Cp — Process Potential (spread only, ignores centering)

```
Cp = (USL - LSL) / (6 * σ_hat)
```

| Cp | Sigma Level | PPM Defective | Interpretation |
|----|-------------|---------------|----------------|
| 0.67 | 2σ | 45,500 | Not capable |
| 1.00 | 3σ | 2,700 | Marginally capable |
| 1.33 | 4σ | 63 | Capable (typical CNC target) |
| 1.67 | 5σ | 0.6 | Highly capable |
| 2.00 | 6σ | 0.002 | World-class |

## 5.2 Cpk — Process Capability (accounts for centering)

```
Cpu = (USL - X_bar) / (3 * σ_hat)
Cpl = (X_bar - LSL) / (3 * σ_hat)
Cpk = min(Cpu, Cpl)
```

**Rule of thumb:** Cpk ≥ 1.33 for existing processes, Cpk ≥ 1.67 for new processes or safety-critical features.

## 5.3 Pp and Ppk — Performance Indices (use overall σ, not within-subgroup)

```
σ_overall = sqrt(Σ(xi - X_bar)² / (N-1))

Pp = (USL - LSL) / (6 * σ_overall)
Ppk = min((USL - X_bar), (X_bar - LSL)) / (3 * σ_overall)
```

**Cp vs Pp:** When Cp >> Pp, the process has significant between-subgroup variation (setup shifts, material lots, tool changes). This is common in CNC where within-part variation is small but setup-to-setup variation is significant.

## 5.4 Cpm — Taguchi Index (penalizes off-target)

```
T = target value (may differ from midpoint of spec)
σ_T = sqrt(σ² + (X_bar - T)²)
Cpm = (USL - LSL) / (6 * σ_T)
```

Use Cpm when target ≠ midpoint (e.g., bearing bores where interference fit requires being on the tight side).

# 6. OUT-OF-CONTROL DETECTION RULES

## 6.1 Western Electric Rules (WECO)

Applied to X-bar chart with zones: A (2-3σ), B (1-2σ), C (0-1σ):

1. **Rule 1:** 1 point beyond 3σ (Zone A)
2. **Rule 2:** 2 of 3 consecutive points in Zone A (same side)
3. **Rule 3:** 4 of 5 consecutive points in Zone B or beyond (same side)
4. **Rule 4:** 8 consecutive points on same side of centerline

## 6.2 Nelson Rules (extended set)

5. **Rule 5:** 6 consecutive points trending up or down
6. **Rule 6:** 14 consecutive points alternating up/down
7. **Rule 7:** 15 consecutive points in Zone C (stratification — multiple streams)
8. **Rule 8:** 8 consecutive points outside Zone C (mixture — bimodal)

## 6.3 CNC-Specific Patterns

- **Tool wear trend:** Gradual upward drift on bore size (Rule 5)
- **Thermal drift:** Cyclical pattern correlating with ambient temperature
- **Fixture shift:** Sudden level change after re-clamping (Rule 1)
- **Material lot change:** Step change when new bar stock loaded

# 7. YIELD PREDICTION FROM CAPABILITY

```
Yield = Φ(3 * Cpk) - Φ(-3 * Cpk)
      ≈ 1 - 2 * Φ(-3 * Cpk)

PPM_defective = 1,000,000 * (1 - Yield)

For one-sided spec:
  PPM_upper = 1,000,000 * Φ(-3 * Cpu)
  PPM_lower = 1,000,000 * Φ(-3 * Cpl)
  PPM_total = PPM_upper + PPM_lower
```

**Quick lookup:**
| Cpk | Yield % | PPM |
|-----|---------|-----|
| 0.50 | 86.64 | 133,600 |
| 0.67 | 95.45 | 45,500 |
| 1.00 | 99.73 | 2,700 |
| 1.33 | 99.9937 | 63 |
| 1.50 | 99.99932 | 6.8 |
| 1.67 | 99.999943 | 0.57 |
| 2.00 | 99.9999998 | 0.002 |

# 8. CNC-SPECIFIC APPLICATIONS

## 8.1 Critical Dimensions to Monitor

**Turning:**
- Bore diameter (most critical — Cpk ≥ 1.33 minimum)
- OD diameter (tool wear sensitive)
- Length/shoulder position (Z-axis repeatability)
- Surface finish Ra (tool condition indicator)

**Milling:**
- Pocket depth (Z-axis thermal drift)
- Hole position (X/Y repeatability)
- Profile tolerance (cutter deflection + wear)
- Step height between passes (axis alignment)

## 8.2 Measurement System Requirement

For meaningful SPC, measurement system must satisfy:
```
%GR&R = (σ_measurement / σ_process) * 100

Requirement: %GR&R ≤ 10% (acceptable)
             %GR&R ≤ 30% (marginal)
             %GR&R > 30% (unacceptable — fix measurement first)

ndc = 1.41 * (σ_parts / σ_gauge)
Requirement: ndc ≥ 5 (number of distinct categories)
```

## 8.3 Rational Subgrouping for CNC

- **Within-spindle:** 5 consecutive parts, same setup → captures short-term variation
- **Across-setup:** 1 part per setup, I-MR chart → captures setup-to-setup variation
- **Across-shift:** First/last part per shift → captures thermal/environmental drift
- **Across-tool:** First part after each tool change → captures tool-to-tool variation
