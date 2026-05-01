# PRISM Tool Holder Database Roadmap v4.1
## Updated: 2026-01-26 | Schema v2.0 MANDATORY

---

## CRITICAL REQUIREMENT: 85-PARAMETER SCHEMA

**All tool holders MUST have simulation-grade data:**

| Category | Key Parameters | Purpose |
|----------|---------------|---------|
| Collision Avoidance | `envelope_profile_points`, `bounding_box_mm` | CAM/machine simulation |
| Speed/Feed Impact | `speed_derating_factor`, `feed_derating_factor`, `doc_derating_factor` | Automatic parameter adjustment |
| Tool Life Impact | `tool_life_factor`, `tir_wear_contribution` | Wear prediction |
| Surface Finish Impact | `surface_finish_factor`, `chatter_susceptibility` | Quality prediction |
| Chatter Analysis | `critical_rpm_bands`, `stability_lobe_data` | Vibration avoidance |

**Schema Reference**: `C:\PRISM\docs\TOOL_HOLDER_SCHEMA_v2.md`

---

## CURRENT STATUS

| Metric | Value | Status |
|--------|-------|--------|
| Total Holders | 6,331 | ✅ |
| Tapers | 96 | ✅ |
| Types | 54 | 🔄 Expanding |
| Brands | 92 | 🔄 Expanding |
| Schema Version | MIXED (65/85) | ⚠️ UPGRADE NEEDED |
| Target Schema | v2.0 (85 params) | 🎯 |

---

## PHASE OVERVIEW

| Phase | Description | Holders | Status |
|-------|-------------|---------|--------|
| 2A | Hierarchy + 65-param schema | 2,341 | ✅ Complete |
| 2B.1 | Taper expansion (69 tapers) | +3,990 | ✅ Complete |
| **2B.2** | **SCHEMA UPGRADE to 85 params** | 6,331 | ⭐ NEXT |
| 2C | Type expansion (34 types) | +1,640 | Planned |
| 2D | Brand expansion | +3,000 | Planned |
| 2E | Validation & consumer wiring | 0 | Planned |

---

## PHASE 2B.2: SCHEMA UPGRADE (PRIORITY)

### Objective
Upgrade all 6,331 holders from 65-param to 85-param simulation-grade schema.

### Tasks

1. **Normalize v9 Data (2,341 holders)**
   - Flatten nested structure (geometry.*, performance.*, thermal.*)
   - Match v10 flat parameter names
   - Preserve all existing data

2. **Add 20 New Parameters (all 6,331 holders)**
   
   | Category | Parameters to Add |
   |----------|-------------------|
   | Collision | envelope_profile_points, bounding_box_mm, collision_safety_margin_mm |
   | Dynamics | second_mode_Hz, mode_damping_ratios, moment_of_inertia_kgm2, center_of_mass_mm, critical_rpm_bands, chatter_susceptibility |
   | Quality | repeatability_um, concentricity_um |
   | Performance | speed_derating_factor, feed_derating_factor, doc_derating_factor, woc_derating_factor, tool_life_factor, surface_finish_factor, deflection_per_N_um, max_cutting_force_N |
   | Thermal | thermal_stability_rating |

3. **Generate Envelope Profiles**
   - Create [[z,r]...] arrays from geometry
   - Validate closed profiles
   - Add bounding_box_mm

4. **Calculate Derating Factors**
   - Lookup by holder_type
   - Apply holder-type-specific modifiers

5. **Derive Performance Metrics**
   - tool_life_factor from F-TH-011
   - surface_finish_factor from F-TH-010
   - chatter_susceptibility from damping/frequency

6. **Validate All 85 Params**
   - Range checks
   - Consistency rules
   - Completeness audit

### Effort Estimate
- **35 ± 10 tool calls** (95% CI)
- **25 ± 8 minutes** (95% CI)

---

## PHASE 2C: TYPE EXPANSION

### Missing Types to Add (34)

| Category | Types | Holders/Type | Total |
|----------|-------|--------------|-------|
| Precision | hidrogrip, jetsleeve, ultragrip, centrogrip | 50 | 200 |
| Anti-Vibration | whisperline, major_dream, silent_tools | 40 | 120 |
| Boring | micro, fine, rough, modular, back_boring | 30 | 150 |
| Tapping | floating_tap, rigid_tap, synchro_tap | 50 | 150 |
| Angle/Speed | angle_head_90, angle_head_variable, speed_increaser | 30 | 90 |
| Live Tooling | live_milling, live_drilling, driven_tool | 80 | 240 |
| Specialty | deburring, polygon, thread_whirling | 20 | 60 |

**Total**: ~1,010 holders

---

## PHASE 2D: BRAND EXPANSION

### Target Brands (20 priority)

| Brand | Specialization | Holders Est. |
|-------|---------------|--------------|
| NT Tool | Japanese precision | 200 |
| Maritool | US value | 150 |
| Techniks | US performance | 150 |
| Pioneer | Budget | 100 |
| Dorian | Quick change | 100 |
| Iscar | Shrink fit | 100 |
| Emuge | Tapping | 100 |
| Kyocera | Carbide bore | 80 |
| Ingersoll | Heavy duty | 80 |
| YG-1 | Korean value | 80 |

**Total**: ~1,140 holders

---

## PHASE 2E: VALIDATION & CONSUMER WIRING

### 12 Required Consumers

Each holder must support:

1. **Speed/Feed Calculator** - Uses derating factors
2. **Tool Life Predictor** - Uses tool_life_factor
3. **Surface Finish Estimator** - Uses surface_finish_factor
4. **Collision Detector** - Uses envelope_profile_points
5. **Chatter Analyzer** - Uses stability_lobe_data
6. **Tool Assembly Builder** - Uses all geometry
7. **Cost Estimator** - Uses price, lead_time
8. **Balance Calculator** - Uses moment_of_inertia
9. **Thermal Analyzer** - Uses thermal params
10. **Recommendation Engine** - Uses ALL factors
11. **CAM Post Processor** - Uses geometry
12. **Digital Twin** - Uses ALL params

### Validation Checklist

- [ ] All 85 params present on all holders
- [ ] All derating factors in valid range
- [ ] All envelope profiles valid geometry
- [ ] All consumers can query required data
- [ ] All formulas (F-TH-001 to F-TH-012) work
- [ ] Database passes anti-regression vs v10

---

## TARGET METRICS

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| Holders | 6,331 | 12,000+ | +5,669 |
| Schema | MIXED | v2.0 (85) | Upgrade |
| Consumers | 0 | 12 | +12 |
| Coverage | 67% | 95%+ | +28% |

---

## FILES & LOCATIONS

| File | Path | Purpose |
|------|------|---------|
| Database v10 | `/mnt/user-data/outputs/tool_holders_v10/` | Current holder data |
| Schema Spec | `C:\PRISM\docs\TOOL_HOLDER_SCHEMA_v2.md` | 85-param definition |
| Skill | `C:\PRISM\skills\prism-tool-holder-schema\SKILL.md` | Auto-load skill |
| State | `C:\PRISM\state\CURRENT_STATE.json` | Progress tracking |
| This Roadmap | `C:\PRISM\docs\TOOL_HOLDER_DATABASE_ROADMAP_v4.md` | Planning |

---

**REMEMBER**: Raw dimensions are NOT sufficient. Simulation requires DERIVED PERFORMANCE FACTORS.

**Version**: 4.1 | **Date**: 2026-01-26
