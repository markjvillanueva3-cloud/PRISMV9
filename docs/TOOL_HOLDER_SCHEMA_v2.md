# PRISM Tool Holder Schema v2.0
## 85-Parameter Simulation-Grade Schema
## Created: 2026-01-26 | Mandatory for All Tool Holder Data

---

## PURPOSE

This schema defines the MINIMUM parameters required for tool holders to support:
1. **Collision Avoidance** - CAM simulation, machine simulation
2. **Speed/Feed Optimization** - Automatic parameter adjustment
3. **Tool Life Prediction** - Wear rate estimation
4. **Surface Finish Prediction** - Ra/Rz estimation
5. **Chatter Avoidance** - Stability lobe integration

**CRITICAL**: Any tool holder missing these parameters is INCOMPLETE for PRISM's intended use.

---

## SCHEMA DEFINITION (85 Parameters)

### Section 1: IDENTIFICATION (10 parameters)
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | YES | Unique identifier TH-[TAPER]-[TYPE]-[BRAND]-[XXXX] |
| `part_number` | string | YES | Manufacturer part number |
| `brand` | string | YES | Manufacturer name |
| `model` | string | YES | Model/series name |
| `description` | string | YES | Human-readable description |
| `upc` | string | NO | Universal product code |
| `manufacturer_url` | string | NO | Product page URL |
| `catalog_page` | int | NO | Catalog page reference |
| `revision` | string | YES | Data revision (A, B, C...) |
| `status` | string | YES | ACTIVE, DISCONTINUED, OBSOLETE |

### Section 2: CLASSIFICATION (6 parameters)
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taper_interface` | string | YES | Specific taper (hsk63a, cat40, bt30, vdi40, etc.) |
| `taper_family` | string | YES | Family (HSK-A, CAT, BT, VDI, BMT, STRAIGHT_SHANK) |
| `holder_type` | string | YES | Type (shrink_fit, hydraulic, er_collet, etc.) |
| `holder_category` | string | YES | precision, standard, heavy_duty, anti_vibration |
| `application` | string | YES | general, finishing, roughing, drilling, boring |
| `material` | string | YES | Holder material (42CrMo4, 1.2312, etc.) |

### Section 3: SPINDLE INTERFACE (12 parameters)
| Parameter | Type | Unit | Required | Description |
|-----------|------|------|----------|-------------|
| `spindle_taper_angle_deg` | float | deg | YES | Taper angle (1.0 for HSK, 8.297 for CAT/BT) |
| `spindle_bore_mm` | float | mm | YES | Taper bore diameter |
| `spindle_flange_mm` | float | mm | YES | Flange diameter |
| `spindle_gauge_mm` | float | mm | YES | Gauge line distance |
| `spindle_retention_kN` | float | kN | YES | Drawbar/retention force |
| `spindle_torque_capacity_Nm` | float | Nm | YES | Max torque transmission |
| `spindle_bending_moment_Nm` | float | Nm | YES | Max bending load |
| `spindle_face_contact` | bool | - | YES | Face contact (true for HSK/BigPlus) |
| `spindle_pull_stud` | string | - | YES | Pull stud type or "no" |
| `spindle_coolant_thru` | bool | - | YES | Coolant through spindle |
| `spindle_balance_plane` | string | - | YES | single, dual |
| `spindle_standard` | string | - | YES | DIN 69893-1, ANSI B5.50, etc. |

### Section 4: TOOL INTERFACE (8 parameters)
| Parameter | Type | Unit | Required | Description |
|-----------|------|------|----------|-------------|
| `tool_bore_mm` | float | mm | YES | Clamping bore diameter |
| `tool_clamping_method` | string | - | YES | shrink, hydraulic, collet, mechanical |
| `tool_clamping_force_kN` | float | kN | YES | Clamping force |
| `tool_max_diameter_mm` | float | mm | YES | Max tool OD capacity |
| `tool_projection_mm` | float | mm | YES | Nominal tool projection |
| `tool_collet_type` | string | - | NO | ER32, ER40, TG100, etc. |
| `tool_shank_type` | string | - | YES | weldon, whistle_notch, standard |
| `tool_coolant_thru` | bool | - | YES | Coolant through tool |

### Section 5: GEOMETRY - COLLISION AVOIDANCE (16 parameters) ⭐ CRITICAL
| Parameter | Type | Unit | Required | Description |
|-----------|------|------|----------|-------------|
| `overall_length_mm` | float | mm | YES | Total length gauge to nose |
| `body_diameter_mm` | float | mm | YES | Main body OD |
| `body_length_mm` | float | mm | YES | Body section length |
| `neck_diameter_mm` | float | mm | YES | Neck (reduced) OD |
| `neck_length_mm` | float | mm | YES | Neck section length |
| `nose_diameter_mm` | float | mm | YES | Nose/nut OD |
| `nose_length_mm` | float | mm | YES | Nose projection length |
| `flange_diameter_mm` | float | mm | YES | Flange OD |
| `flange_thickness_mm` | float | mm | YES | Flange thickness |
| `center_height_mm` | float | mm | COND | VDI/BMT center height (0 for spindle tools) |
| `drive_key_width_mm` | float | mm | NO | Drive key width |
| `drive_key_depth_mm` | float | mm | NO | Drive key depth |
| `serration_count` | int | - | COND | VDI serration count |
| `envelope_profile_points` | array | mm | YES | [[z1,r1], [z2,r2]...] 2D revolution profile |
| `bounding_box_mm` | object | mm | YES | {max_od, total_length} simplified envelope |
| `collision_safety_margin_mm` | float | mm | YES | Recommended clearance (default 2.0) |

### Section 6: DYNAMICS - CHATTER/VIBRATION (12 parameters) ⭐ CRITICAL
| Parameter | Type | Unit | Required | Description |
|-----------|------|------|----------|-------------|
| `radial_stiffness_N_um` | float | N/μm | YES | Static radial stiffness K |
| `axial_stiffness_N_um` | float | N/μm | YES | Static axial stiffness |
| `damping_ratio` | float | - | YES | System damping ζ (0.01-0.10) |
| `natural_frequency_Hz` | float | Hz | YES | First bending mode |
| `second_mode_Hz` | float | Hz | YES | Second bending mode |
| `mode_damping_ratios` | array | - | YES | [ζ1, ζ2, ζ3] per mode |
| `moment_of_inertia_kgm2` | float | kg·m² | YES | Rotational inertia |
| `center_of_mass_mm` | float | mm | YES | CoM from gauge line |
| `max_rpm` | int | rpm | YES | Maximum safe RPM |
| `recommended_rpm` | int | rpm | YES | Optimal operating RPM |
| `critical_rpm_bands` | array | rpm | YES | [[rpm_low, rpm_high]...] avoid zones |
| `chatter_susceptibility` | int | 1-10 | YES | Chatter tendency rating |

### Section 7: QUALITY - RUNOUT/BALANCE (6 parameters)
| Parameter | Type | Unit | Required | Description |
|-----------|------|------|----------|-------------|
| `tir_at_gauge_um` | float | μm | YES | TIR at gauge line |
| `tir_at_3xd_um` | float | μm | YES | TIR at 3×D projection |
| `balance_grade` | string | - | YES | G2.5, G6.3, G16, G40 |
| `balance_mass_g_mm` | float | g·mm | YES | Residual unbalance |
| `repeatability_um` | float | μm | YES | Tool change repeatability |
| `concentricity_um` | float | μm | YES | Bore concentricity |

### Section 8: PERFORMANCE FACTORS (8 parameters) ⭐ CRITICAL FOR OPTIMIZATION
| Parameter | Type | Range | Required | Description |
|-----------|------|-------|----------|-------------|
| `speed_derating_factor` | float | 0.7-1.0 | YES | Vc multiplier vs rigid reference |
| `feed_derating_factor` | float | 0.8-1.0 | YES | fz multiplier vs rigid reference |
| `doc_derating_factor` | float | 0.6-1.0 | YES | ap (depth of cut) multiplier |
| `woc_derating_factor` | float | 0.7-1.0 | YES | ae (width of cut) multiplier |
| `tool_life_factor` | float | 0.7-1.3 | YES | Tool life multiplier vs baseline |
| `surface_finish_factor` | float | 1.0-2.0 | YES | Ra multiplier vs ideal (1.0 = best) |
| `deflection_per_N_um` | float | μm/N | YES | Compliance = 1/K at tool tip |
| `max_cutting_force_N` | float | N | YES | Force limit before deflection/slip |

### Section 9: THERMAL (5 parameters)
| Parameter | Type | Unit | Required | Description |
|-----------|------|------|----------|-------------|
| `thermal_expansion_um_per_C` | float | μm/°C | YES | Linear expansion coefficient |
| `max_temperature_C` | float | °C | YES | Operating temperature limit |
| `shrink_temperature_C` | float | °C | COND | Shrink fit temperature (shrink_fit only) |
| `thermal_stability_rating` | int | 1-10 | YES | Grip consistency under heat |
| `coolant_compatible` | bool | - | YES | Coolant exposure OK |

### Section 10: METADATA (4 parameters)
| Parameter | Type | Unit | Required | Description |
|-----------|------|------|----------|-------------|
| `mass_kg` | float | kg | YES | Total holder mass |
| `price_usd` | float | USD | YES | List price |
| `lead_time_days` | int | days | YES | Typical lead time |
| `data_source` | string | - | YES | catalog, measured, calculated, estimated |

---

## PARAMETER DERIVATION FORMULAS

When raw data is available, these formulas MUST be used to derive missing values:

### F-TH-003: Deflection per Newton
```
deflection_per_N_um = 1 / radial_stiffness_N_um
```

### F-TH-007: Natural Frequency (if not measured)
```
fn = (1.875² / 2πL²) × √(EI / ρA)
Where:
  L = overall_length_mm / 1000 (m)
  E = 210e9 Pa (steel)
  I = π × (body_diameter_mm/2000)⁴ / 4 (m⁴)
  ρ = 7850 kg/m³
  A = π × (body_diameter_mm/2000)² (m²)
```

### F-TH-008: Radial Stiffness (if not measured)
```
K = 3EI / L³
```

### F-TH-010: Surface Finish Factor
```
surface_finish_factor = 1.0 + (tir_at_3xd_um / 5.0) + (1.0 - damping_ratio) × 2.0
Clamped to [1.0, 2.0]
```

### F-TH-011: Tool Life Factor
```
tool_life_factor = 1.0 - (tir_at_3xd_um / 20.0) - (1.0 - damping_ratio) × 0.5
Clamped to [0.7, 1.3]
```

### Speed/Feed Derating (based on holder type)
| Holder Type | speed_derating | feed_derating | doc_derating |
|-------------|----------------|---------------|--------------|
| shrink_fit | 1.00 | 1.00 | 1.00 |
| hydraulic | 0.98 | 0.98 | 0.95 |
| tendo/tribos | 0.98 | 0.98 | 0.95 |
| er_collet | 0.92 | 0.90 | 0.85 |
| er_precision | 0.95 | 0.95 | 0.90 |
| milling_chuck | 0.88 | 0.85 | 0.80 |
| side_lock | 0.85 | 0.82 | 0.75 |
| drill_chuck | 0.80 | 0.78 | 0.70 |
| weldon | 0.90 | 0.88 | 0.85 |

### Chatter Susceptibility Rating
```
chatter_susceptibility = round(10 - damping_ratio × 50 - (natural_frequency_Hz / 1000))
Clamped to [1, 10] where 1 = most stable, 10 = most prone
```

---

## ENVELOPE PROFILE FORMAT

The `envelope_profile_points` array defines a 2D revolution profile for collision detection:

```json
"envelope_profile_points": [
  [0.0, 19.0],      // z=0 (gauge line), r=flange radius
  [5.0, 19.0],      // flange face
  [5.0, 25.0],      // flange OD
  [10.0, 25.0],     // flange end
  [10.0, 20.0],     // body start
  [45.0, 20.0],     // body end
  [45.0, 15.0],     // neck start
  [60.0, 15.0],     // neck end
  [60.0, 18.0],     // nose start
  [80.0, 18.0],     // nose end
  [80.0, 0.0]       // tool tip centerline
]
```

- z = distance from gauge line (mm), positive toward workpiece
- r = radius from centerline (mm)
- Points define the OUTER envelope for swept volume calculation

---

## VALIDATION RULES

### Mandatory Ranges
| Parameter | Min | Max | Unit |
|-----------|-----|-----|------|
| overall_length_mm | 30 | 500 | mm |
| body_diameter_mm | 10 | 200 | mm |
| radial_stiffness_N_um | 1000 | 500000 | N/μm |
| damping_ratio | 0.005 | 0.15 | - |
| natural_frequency_Hz | 500 | 10000 | Hz |
| tir_at_gauge_um | 0.5 | 50 | μm |
| speed_derating_factor | 0.5 | 1.0 | - |
| tool_life_factor | 0.5 | 1.5 | - |
| surface_finish_factor | 1.0 | 3.0 | - |

### Consistency Rules
1. `tir_at_3xd_um >= tir_at_gauge_um` (runout grows with projection)
2. `recommended_rpm <= max_rpm`
3. `speed_derating_factor <= 1.0`
4. `tool_life_factor` inversely related to TIR
5. `envelope_profile_points` must start at z=0

---

## MIGRATION FROM 65-PARAM SCHEMA

Existing 65-parameter holders need these 20 additional parameters:

| New Parameter | Derivation Method |
|---------------|-------------------|
| envelope_profile_points | Generate from geometry dimensions |
| bounding_box_mm | Calculate from max dimensions |
| collision_safety_margin_mm | Default 2.0 |
| second_mode_Hz | Estimate as 2.5 × natural_frequency_Hz |
| mode_damping_ratios | [damping_ratio, damping_ratio×0.8, damping_ratio×0.6] |
| moment_of_inertia_kgm2 | Calculate from mass and geometry |
| center_of_mass_mm | Estimate as overall_length_mm × 0.4 |
| critical_rpm_bands | Calculate from natural frequencies |
| chatter_susceptibility | Derive from formula |
| repeatability_um | Estimate as tir_at_gauge_um × 1.2 |
| concentricity_um | Estimate as tir_at_gauge_um × 0.5 |
| speed_derating_factor | Lookup by holder_type |
| feed_derating_factor | Lookup by holder_type |
| doc_derating_factor | Lookup by holder_type |
| woc_derating_factor | Lookup by holder_type |
| tool_life_factor | Derive from formula |
| surface_finish_factor | Derive from formula |
| deflection_per_N_um | 1 / radial_stiffness_N_um |
| max_cutting_force_N | radial_stiffness_N_um × 50 (50μm deflection limit) |
| thermal_stability_rating | Lookup by holder_type |

---

## USAGE IN PRISM

### Speed/Feed Calculator Integration
```typescript
const adjustedSpeed = baseSpeed × holder.speed_derating_factor;
const adjustedFeed = baseFeed × holder.feed_derating_factor;
const adjustedDoc = baseDoc × holder.doc_derating_factor;
```

### Tool Life Prediction
```typescript
const predictedLife = baseToolLife × holder.tool_life_factor;
```

### Surface Finish Estimation
```typescript
const predictedRa = theoreticalRa × holder.surface_finish_factor;
```

### Collision Detection
```typescript
const envelope = generateSweptVolume(holder.envelope_profile_points);
const collision = checkInterference(envelope, workpiece, fixture);
```

---

**Schema Version**: 2.0
**Parameters**: 85
**Created**: 2026-01-26
**Status**: MANDATORY FOR ALL NEW DATA
