---
name: prism-surface-roughness
description: |
  Surface roughness prediction and optimization for CNC turning and milling.
  Theoretical Ra/Rz models, empirical corrections, and measurement standards.
  Covers ISO 4287/4288 parameters, cutoff selection, and process-specific models.
  
  Functions: ra_turning_theoretical, ra_turning_empirical, ra_milling_peripheral,
  ra_milling_face, ra_milling_ball_nose, rz_from_ra, cutoff_select,
  ra_from_process, surface_finish_conversion, scallop_height
  
  Academic Source: MIT 2.008/2.810, ISO 4287, Boothroyd & Knight
  Total: ~350 lines
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "surface", "roughness", "prediction", "optimization", "turning", "milling", "theoretical"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-surface-roughness")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-surface-roughness") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What surface parameters for 316 stainless?"
→ Load skill: skill_content("prism-surface-roughness") → Extract relevant surface data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot roughness issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM SURFACE ROUGHNESS PREDICTION
## Models for CNC Turning, Milling, and Grinding

# 1. ISO SURFACE ROUGHNESS PARAMETERS

## 1.1 Primary Parameters (ISO 4287)

**Ra** — Arithmetic average roughness (most common):
```
Ra = (1/L) ∫₀ᴸ |z(x)| dx
```

**Rz** — Average maximum height (10-point):
```
Rz = (1/5) Σᵢ₌₁⁵ (Rp_i + Rv_i)
  where Rp = peak height, Rv = valley depth per sampling length
```

**Rq (RMS)** — Root mean square roughness:
```
Rq = sqrt((1/L) ∫₀ᴸ z²(x) dx)
Rq ≈ 1.11 × Ra  (for typical machined surfaces)
```

**Rt** — Total height of profile:
```
Rt = Rp_max + Rv_max  (over evaluation length)
```

## 1.2 Typical Relationships

```
Rz ≈ 4 × Ra     (turning, ground surfaces)
Rz ≈ 4.5 × Ra   (milling)
Rz ≈ 6 × Ra     (shaped/planed)
Rt ≈ 1.2..1.6 × Rz
Rq ≈ 1.11 × Ra
```

# 2. TURNING MODELS

## 2.1 Ideal (Theoretical) Ra

For a single-point tool with nose radius r_eps:
```
Ra_ideal = f² / (32 × r_eps)

where:
  f = feed per revolution (mm/rev)
  r_eps = tool nose radius (mm)
```

**Example:** f = 0.15 mm/rev, r_eps = 0.8 mm
  Ra_ideal = 0.15² / (32 × 0.8) = 0.000879 mm = 0.88 μm

## 2.2 Ideal Rz (Maximum Peak-to-Valley)

```
Rz_ideal = f² / (8 × r_eps)

Rz_ideal = 4 × Ra_ideal
```

## 2.3 Empirical Correction Factor

Real Ra exceeds theoretical due to BUE, vibration, tool wear, material effects:
```
Ra_actual = Ra_ideal × K_correction

K_correction depends on:
  Material: K = 1.2 (steel) .. 2.5 (aluminum with BUE)
  Speed: K decreases with increasing Vc (less BUE)
  Tool condition: K = 1.0 (new) .. 1.8 (worn)
  Rigidity: K = 1.0 (rigid) .. 2.0 (slender part)
```

## 2.4 Brammertz Correction (Minimum Chip Thickness Effect)

At very low feeds, minimum chip thickness h_min creates roughness floor:
```
Ra_Brammertz = (f² / (32·r_eps)) + (h_min/2) × (1 + h_min·r_eps/f²)

h_min ≈ 0.1 × r_beta  (cutting edge radius)
  CBN: h_min ≈ 5 μm
  Carbide: h_min ≈ 2-3 μm
  PCD: h_min ≈ 1 μm
```

This explains why Ra doesn't decrease below ~0.2 μm even at very low feeds.

## 2.5 Comprehensive Turning Model

```
Ra = C × Vc^a × f^b × ap^c × r_eps^d × HB^e

Typical exponents (carbide on steel):
  C = 0.024, a = -0.12, b = 0.68, c = 0.02, d = -0.37, e = 0.14

Dominant: feed (b=0.68) and nose radius (d=-0.37)
Speed effect: mild improvement at higher Vc (less BUE)
Depth: nearly negligible for Ra
```

# 3. MILLING MODELS

## 3.1 Face Milling Ra

```
Ra_face = f_z² / (32 × r_eps)  (per tooth, similar to turning)

For wiper insert (flat edge length b_s):
  If f_z < b_s: Ra ≈ 0 (kinematic), limited by vibration to ~0.2 μm
  If f_z > b_s: Ra = (f_z - b_s)² / (32 × r_eps)
```

## 3.2 Peripheral (Side) Milling Ra

Scallop height from cylindrical cutter:
```
Ra_peripheral ≈ ae² / (8 × D)   for ae << D

where:
  ae = stepover (radial depth of cut)
  D = cutter diameter

More precise:
  h_scallop = D/2 - sqrt((D/2)² - (ae/2)²)
  Ra ≈ h_scallop / 4
```

## 3.3 Feed Mark Roughness in End Milling

Along feed direction:
```
Ra_feed = fz² / (32 × r_eps)  (same as turning model)

Perpendicular to feed (stepover marks):
  Ra_stepover = ae² / (8 × D)  for flat end mill
```

Total Ra approximation: Ra ≈ sqrt(Ra_feed² + Ra_stepover²)

# 4. BALL NOSE END MILL SCALLOP

## 4.1 Planar Surface (Horizontal)

```
h_scallop = R - sqrt(R² - (ae/2)²)

For ae << R:
  h_scallop ≈ ae² / (8R)

where R = ball radius = D/2
```

## 4.2 Inclined Surface (Angle θ)

```
Uphill (along incline):
  h = ae² / (8R × cos(θ))

Downhill:
  h = ae² / (8R × cos(θ))

At wall (θ = 90°): h → ∞ (ball nose can't finish vertical walls)
```

## 4.3 Target Scallop to Stepover

Given target scallop height h:
```
ae = 2 × sqrt(2Rh - h²)
  ≈ 2 × sqrt(2Rh)  for h << R

Example: D = 10mm ball nose, target Ra = 1.6 μm (h ≈ 6.4 μm)
  ae = 2 × sqrt(2 × 5 × 0.0064) = 2 × 0.253 = 0.506 mm
```

## 4.4 Along-Feed Scallop

```
h_feed = R - sqrt(R² - (fz/2)²)
  ≈ fz² / (8R)  for fz << R

Combined: h_total ≈ sqrt(h_stepover² + h_feed²)
```

# 5. PROCESS CAPABILITY BY OPERATION

## 5.1 Achievable Ra Ranges

| Process | Ra Range (μm) | Typical (μm) | Rz Range (μm) |
|---------|---------------|---------------|----------------|
| Rough turning | 6.3 - 25 | 12.5 | 25 - 100 |
| Finish turning | 0.4 - 6.3 | 1.6 | 1.6 - 25 |
| Face milling | 0.8 - 6.3 | 3.2 | 3.2 - 25 |
| End milling | 0.8 - 6.3 | 1.6 | 3.2 - 25 |
| Ball nose finish | 0.4 - 3.2 | 0.8 | 1.6 - 12.5 |
| Boring | 0.4 - 3.2 | 0.8 | 1.6 - 12.5 |
| Reaming | 0.4 - 1.6 | 0.8 | 1.6 - 6.3 |
| Cylindrical grinding | 0.1 - 0.8 | 0.4 | 0.4 - 3.2 |
| Surface grinding | 0.1 - 0.8 | 0.2 | 0.4 - 3.2 |
| Honing | 0.05 - 0.4 | 0.1 | 0.2 - 1.6 |
| Lapping | 0.012 - 0.1 | 0.05 | 0.05 - 0.4 |

## 5.2 N-Grade to Ra Conversion (ISO 1302)

| N Grade | Ra (μm) | Ra (μin) | Common Process |
|---------|---------|----------|----------------|
| N12 | 50 | 2000 | Sawing, rough casting |
| N10 | 12.5 | 500 | Rough turning/milling |
| N8 | 3.2 | 125 | Finish milling |
| N7 | 1.6 | 63 | Finish turning/milling |
| N6 | 0.8 | 32 | Fine turning/boring |
| N5 | 0.4 | 16 | Grinding |
| N4 | 0.2 | 8 | Fine grinding |
| N3 | 0.1 | 4 | Honing |
| N2 | 0.05 | 2 | Lapping |
| N1 | 0.025 | 1 | Superfinishing |

# 6. MEASUREMENT AND CUTOFF SELECTION

## 6.1 Cutoff Selection (ISO 4288)

| Expected Ra (μm) | Cutoff λc (mm) | Evaluation Length (mm) |
|-------------------|-----------------|------------------------|
| 0.006 - 0.02 | 0.08 | 0.4 |
| 0.02 - 0.1 | 0.25 | 1.25 |
| 0.1 - 2.0 | 0.8 | 4.0 |
| 2.0 - 10.0 | 2.5 | 12.5 |
| 10.0 - 80.0 | 8.0 | 40.0 |

Evaluation length = 5 × cutoff (5 sampling lengths).

## 6.2 Measurement Rules

- Measure perpendicular to lay (feed marks) for worst-case Ra
- Measure parallel to lay for best-case Ra
- For turned parts: measure along axis (perpendicular to feed marks)
- For face-milled: measure perpendicular to feed direction
- Allow 1 cutoff length for run-in/run-out at each end

# 7. SURFACE FINISH CONVERSION TABLES

## 7.1 Ra to RMS to CLA

```
Ra (CLA) = Ra (arithmetic average) — same thing, different name
RMS (Rq) = 1.11 × Ra
Peak (Rt) ≈ 5-7 × Ra (typical machined)
```

## 7.2 Metric to Imperial

```
Ra (μm) = Ra (μin) × 0.0254
Ra (μin) = Ra (μm) / 0.0254 = Ra (μm) × 39.37

Common equivalents:
  0.4 μm = 16 μin
  0.8 μm = 32 μin
  1.6 μm = 63 μin (most common CNC spec)
  3.2 μm = 125 μin
  6.3 μm = 250 μin
```
