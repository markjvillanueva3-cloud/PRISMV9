---
description: Orchestrate the full hyperMILL workflow — material to NC output with safety audit
model: sonnet
effort: HIGH
---

# /hypermill-full-job

## Args: $ARGUMENTS

Run the complete hyperMILL programming workflow from material identification to NC code with safety validation.

Expected args: `material=<name> feature=<type> tool_diameter=<mm> [depth=<mm>] [controller=<id>] [axes=<3|5>]`

## Steps

### Phase 1 — Material & Physics
1. Call `prism_cam` → `cam_hypermill_material_to_physics` with material
   - Capture: iso_group, kc1_1, mc
2. Call `prism_cam` → `cam_hypermill_calibration_compare` to validate against catalog

### Phase 2 — Cycle Selection & Defaults
3. Call `prism_cam` → `cam_hypermill_cycle_recommend` with:
   - feature_type, material, diameter_mm, depth_mm, controller_id
   - `include_speed_feed`: true
   - `include_full_defaults`: true
4. Call `prism_cam` → `cam_hypermill_validate_cycle_defaults` if user has existing params

### Phase 3 — Controller & Post-Processor
5. Call `prism_cam` → `cam_controller_catalog` with controller_id
6. Call `prism_cam` → `cam_hypermill_ppp_defaults` for PPP configuration

### Phase 4 — Safety Audit
7. Call `prism_cam` → `cam_safety_validate` with all parameters
8. If any BLOCK found: halt and report. Resolve before continuing.

### Phase 5 — Output Summary
9. Present complete job summary to user.

## Present to User

Present a structured job card:

```
HYPERMILL JOB SUMMARY
=====================
Material:   <name> — ISO <group> (kc1.1 = <X> N/mm²)
Feature:    <type> — <cycle displayName>
Cycle:      <code>
Speeds:     Vc = <X> m/min | n = <X> RPM | fz = <X> mm/tooth | Vf = <X> mm/min
Defaults:   stepdown = <X> mm | stepover = <X> mm | allowance = <X> mm
Controller: <name> — <dialect> dialect
Safety:     [PASS/WARN/BLOCK] — <summary>
Next step:  [Generate AC script / Review in hyperMILL]
```

If safety audit blocks: show blocking issue prominently and stop.
