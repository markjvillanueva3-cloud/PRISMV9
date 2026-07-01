---
name: prism-tool-holder-schema
description: |
  Complete 85-parameter tool holder schema for PRISM Manufacturing Intelligence.
  Covers identification, geometry, dynamics, quality, thermal, collision avoidance,
  speed/feed impact, tool life impact, and surface finish factors.
  Level 3 Domain skill - load when working with tool holders.
  Key principle: Simulation-grade data requires derived performance factors, not just raw dimensions.
---

# PRISM TOOL HOLDER SCHEMA v2.0
## 85-PARAMETER SIMULATION-GRADE SCHEMA
## For: Collision Avoidance, Speed/Feed, Tool Life, Surface Finish

---

# WHEN TO USE

- When creating/modifying tool holder database entries
- When implementing tool holder consumers (12 required)
- When calculating derived performance factors
- When validating holder data completeness
- When designing collision detection algorithms
- When implementing speed/feed recommendations

---

# QUICK REFERENCE

## Schema Versions
| Version | Params | Status |
|---------|--------|--------|
| v1.0 | 65 | Legacy - basic data |
| **v2.0** | **85** | **Current - simulation-grade** |

## Parameter Categories (85 Total)
| Category | Count | Purpose |
|----------|-------|---------|
| Identification | 10 | Part numbers, brand, status |
| Classification | 5 | Taper, type, category |
| Spindle Interface | 12 | Taper geometry, retention |
| Tool Interface | 8 | Bore, clamping, capacity |
| Geometry | 12 | Dimensions for collision |
| Dynamics | 10 | Stiffness, damping, frequency |
| Quality/Runout | 4 | TIR, repeatability |
| Thermal | 4 | Expansion, limits |
| **Collision Avoidance** | **6** | **Envelope, interference** |
| **Speed/Feed Impact** | **8** | **Derating factors** |
| **Tool Life Impact** | **6** | **Life multipliers** |
| **Surface Finish** | **6** | **Quality factors** |
| Metadata | 4 | Mass, price, lead time |

---

# CRITICAL NEW PARAMETERS (v2.0)

## For Collision Avoidance
```
envelope_profile_points : [[z,r]...]  # 2D revolution profile
bounding_od_mm          : float       # Max OD anywhere
bounding_length_mm      : float       # Total length
interference_zones      : [{...}]     # Critical clearance areas
```

## For Speed/Feed Impact
```
speed_derating_factor   : 0.7-1.0     # Vc multiplier vs rigid
feed_derating_factor    : 0.8-1.0     # fz multiplier
doc_derating_factor     : 0.6-1.0     # ap multiplier
max_cutting_force_N     : float       # Before slip/deflection
deflection_per_N_um     : float       # = 1/K
```

## For Tool Life Impact
```
tool_life_factor        : 0.7-1.3     # Life multiplier
tir_wear_contribution   : 1.0-2.0     # Runout wear acceleration
vibration_amplification : float       # Spindle-to-tip gain
```

## For Surface Finish
```
surface_finish_factor   : 1.0-2.0     # Ra multiplier vs ideal
chatter_susceptibility  : 1-10        # Risk rating
stability_lobe_data     : [{rpm,doc}] # Chatter stability
```

---

# DERATING FACTOR LOOKUP TABLE

```python
HOLDER_TYPE_FACTORS = {
    # Type: {speed, feed, doc, woc, life, finish}
    "shrink_fit":     {"speed": 1.00, "feed": 1.00, "doc": 1.00, "woc": 1.00, "life": 1.20, "finish": 0.90},
    "hydraulic":      {"speed": 0.98, "feed": 0.98, "doc": 0.95, "woc": 0.95, "life": 1.15, "finish": 0.92},
    "tendo":          {"speed": 0.97, "feed": 0.97, "doc": 0.93, "woc": 0.93, "life": 1.12, "finish": 0.93},
    "tribos":         {"speed": 0.96, "feed": 0.96, "doc": 0.92, "woc": 0.92, "life": 1.10, "finish": 0.94},
    "powrgrip":       {"speed": 0.95, "feed": 0.95, "doc": 0.90, "woc": 0.90, "life": 1.08, "finish": 0.95},
    "er_collet":      {"speed": 0.92, "feed": 0.92, "doc": 0.85, "woc": 0.85, "life": 0.95, "finish": 1.10},
    "er_precision":   {"speed": 0.95, "feed": 0.95, "doc": 0.90, "woc": 0.90, "life": 1.05, "finish": 1.00},
    "end_mill":       {"speed": 0.90, "feed": 0.90, "doc": 0.85, "woc": 0.85, "life": 0.90, "finish": 1.15},
    "side_lock":      {"speed": 0.85, "feed": 0.85, "doc": 0.80, "woc": 0.80, "life": 0.85, "finish": 1.25},
    "shell_mill":     {"speed": 0.88, "feed": 0.88, "doc": 0.82, "woc": 0.90, "life": 0.88, "finish": 1.15},
    "face_mill":      {"speed": 0.90, "feed": 0.90, "doc": 0.85, "woc": 0.95, "life": 0.92, "finish": 1.10},
    "drill_chuck":    {"speed": 0.80, "feed": 0.80, "doc": 0.75, "woc": 0.75, "life": 0.80, "finish": 1.30},
    "tap_holder":     {"speed": 0.85, "feed": 0.90, "doc": 0.80, "woc": 0.80, "life": 0.85, "finish": 1.20},
    "boring_head":    {"speed": 0.88, "feed": 0.85, "doc": 0.70, "woc": 0.70, "life": 0.90, "finish": 0.95},
    "boring_bar":     {"speed": 0.85, "feed": 0.82, "doc": 0.65, "woc": 0.65, "life": 0.85, "finish": 1.00},
    "extension":      {"speed": 0.80, "feed": 0.80, "doc": 0.70, "woc": 0.70, "life": 0.75, "finish": 1.30},
    "reduction":      {"speed": 0.85, "feed": 0.85, "doc": 0.75, "woc": 0.75, "life": 0.80, "finish": 1.20},
    "sleeve":         {"speed": 0.82, "feed": 0.82, "doc": 0.72, "woc": 0.72, "life": 0.78, "finish": 1.25},
    "adapter":        {"speed": 0.80, "feed": 0.80, "doc": 0.70, "woc": 0.70, "life": 0.75, "finish": 1.30},
    "static_holder":  {"speed": 0.90, "feed": 0.90, "doc": 0.85, "woc": 0.85, "life": 0.95, "finish": 1.05},
    "driven_holder":  {"speed": 0.85, "feed": 0.85, "doc": 0.80, "woc": 0.80, "life": 0.88, "finish": 1.15},
    "solid_carbide":  {"speed": 1.00, "feed": 1.00, "doc": 0.95, "woc": 0.95, "life": 1.10, "finish": 0.95},
    "steel_shank":    {"speed": 0.90, "feed": 0.90, "doc": 0.85, "woc": 0.85, "life": 0.90, "finish": 1.10},
    "heavy_metal":    {"speed": 0.95, "feed": 0.95, "doc": 0.90, "woc": 0.90, "life": 1.05, "finish": 1.00},
}
```

---

# DERIVATION FORMULAS

## From Existing Data
```python
# Deflection compliance
deflection_per_N_um = 1.0 / radial_stiffness_N_um

# Bounding geometry
bounding_od_mm = max(flange_diameter_mm, body_diameter_mm, nose_diameter_mm)
bounding_length_mm = overall_length_mm + tool_projection_mm

# Second mode frequency (typically 2.5-3x first mode)
second_mode_hz = natural_frequency_Hz * 2.75

# TIR wear contribution
tir_wear_contribution = 1.0 + (tir_at_3xd_um / 5.0)

# Chatter susceptibility (1-10 scale, higher = more prone)
chatter_susceptibility = min(10, max(1, 10 - (damping_ratio * 100) - (radial_stiffness_N_um / 50000)))

# Tool life factor
tool_life_factor = HOLDER_TYPE_FACTORS[holder_type]["life"] * (1 - tir_at_3xd_um * 0.01)

# Surface finish factor
surface_finish_factor = HOLDER_TYPE_FACTORS[holder_type]["finish"] * (1 + tir_at_3xd_um * 0.02)
```

## Critical RPM Bands
```python
def calculate_critical_rpm_bands(fn_hz, damping_ratio):
    bands = []
    rpm_center_1 = fn_hz * 60
    rpm_width_1 = rpm_center_1 * (1 - damping_ratio * 5)
    bands.append({
        "rpm_low": int(rpm_center_1 - rpm_width_1 * 0.1),
        "rpm_high": int(rpm_center_1 + rpm_width_1 * 0.1),
        "reason": "first_mode_resonance"
    })
    rpm_center_2 = fn_hz * 60 * 2.75
    bands.append({
        "rpm_low": int(rpm_center_2 * 0.95),
        "rpm_high": int(rpm_center_2 * 1.05),
        "reason": "second_mode_resonance"
    })
    return bands
```

---

# ENVELOPE PROFILE GENERATION

```python
def generate_envelope_profile(holder):
    points = []
    z = 0
    points.append([z, holder["spindle_flange_mm"] / 2])
    z += holder["flange_thickness_mm"]
    points.append([z, holder["spindle_flange_mm"] / 2])
    points.append([z, holder["body_diameter_mm"] / 2])
    body_end = z + (holder["overall_length_mm"] - holder["flange_thickness_mm"] 
                    - holder["neck_length_mm"] - holder["nose_length_mm"])
    points.append([body_end, holder["body_diameter_mm"] / 2])
    if holder["neck_diameter_mm"] != holder["body_diameter_mm"]:
        points.append([body_end, holder["neck_diameter_mm"] / 2])
        neck_end = body_end + holder["neck_length_mm"]
        points.append([neck_end, holder["neck_diameter_mm"] / 2])
    else:
        neck_end = body_end + holder["neck_length_mm"]
        points.append([neck_end, holder["body_diameter_mm"] / 2])
    points.append([neck_end, holder["nose_diameter_mm"] / 2])
    points.append([holder["overall_length_mm"], holder["nose_diameter_mm"] / 2])
    return points
```

---

# 12 REQUIRED CONSUMERS

1. Speed/Feed Calculator
2. Tool Life Predictor  
3. Surface Finish Estimator
4. Collision Detector
5. Chatter Analyzer
6. Tool Assembly Builder
7. Cost Estimator
8. Balance Calculator
9. Thermal Analyzer
10. Recommendation Engine
11. CAM Post Processor
12. Digital Twin Simulator

---

# FULL SCHEMA REFERENCE

See: `C:\PRISM\docs\TOOL_HOLDER_SCHEMA_v2.md`

---

**Version**: 2.0 | **Date**: 2026-01-26 | **Level**: 3 (Domain)
