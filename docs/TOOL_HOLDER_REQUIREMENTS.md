# PRISM Tool Holder Development Requirements
## AUTO-LOAD KEYWORDS: tool holder, holder, toolholder, taper, spindle interface, collision, collision avoidance
## Last Updated: 2026-01-26

---

## CRITICAL REQUIREMENT: 85-PARAMETER SCHEMA

When working on tool holders, ALWAYS load:
- `C:\PRISM\skills\prism-tool-holder-schema\SKILL.md`
- `C:\PRISM\docs\TOOL_HOLDER_SCHEMA_v2.md`

### Why 85 Parameters?
Tool holders need SIMULATION-GRADE data, not just identification:

| Use Case | Required Parameters |
|----------|---------------------|
| **Collision Avoidance** | envelope_profile_points, bounding_od_mm, interference_zones |
| **Speed/Feed Optimization** | speed_derating_factor, feed_derating_factor, doc_derating_factor |
| **Tool Life Prediction** | tool_life_factor, tir_wear_contribution, vibration_amplification |
| **Surface Finish Estimation** | surface_finish_factor, chatter_susceptibility, stability_lobe_data |
| **Chatter Analysis** | critical_rpm_bands, natural_frequency_Hz, damping_ratio |

### Schema Versions
| Version | Parameters | Status |
|---------|------------|--------|
| v1.0 | 65 | Legacy - insufficient for simulation |
| **v2.0** | **85** | **REQUIRED - simulation-grade** |

---

## HOLDER TYPE DERATING FACTORS

These factors adjust cutting parameters based on holder type:

```
shrink_fit:  speed=1.00, feed=1.00, doc=1.00, life=1.20, finish=0.90
hydraulic:   speed=0.98, feed=0.98, doc=0.95, life=1.15, finish=0.92
er_collet:   speed=0.92, feed=0.92, doc=0.85, life=0.95, finish=1.10
side_lock:   speed=0.85, feed=0.85, doc=0.80, life=0.85, finish=1.25
drill_chuck: speed=0.80, feed=0.80, doc=0.75, life=0.80, finish=1.30
```

See full table in SKILL.md

---

## 12 CONSUMERS (All Must Work)

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

## DATABASE LOCATIONS

```
Current v10: /mnt/user-data/outputs/tool_holders_v10/
Schema Spec: C:\PRISM\docs\TOOL_HOLDER_SCHEMA_v2.md
Skill:       C:\PRISM\skills\prism-tool-holder-schema\SKILL.md
```

---

## UPGRADE STATUS (2026-01-26)

- [x] Phase 2B.1: Added 69 tapers, 3,990 holders
- [ ] Phase 2B.2: Upgrade to 85-param schema (NEXT)
- [ ] Phase 2C: Add missing holder types
- [ ] Phase 2D: Brand expansion
- [ ] Phase 2E: Consumer wiring

---

**REMEMBER**: Raw dimensions are NOT enough. Simulation requires DERIVED PERFORMANCE FACTORS.
