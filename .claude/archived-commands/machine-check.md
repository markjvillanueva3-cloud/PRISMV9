# Machine Check — Validate Machining Parameters Against Machine Limits

Check if your planned cutting parameters are within a specific machine's capabilities — RPM, feed, power, torque, tool size, and travel.

## Args
- Empty: interactive — ask for machine and parameters
- `[machine_id]`: show machine profile (e.g., `haas_vf2`, `dmg_dmu50`)
- `list`: list all available machine profiles
- `list [type]`: filter by type (vmc, hmc, lathe, 5axis, swiss, mill_turn)
- `validate [machine_id] [rpm] [feed] [power]`: quick parameter validation
- `curve [machine_id]`: show spindle torque/power curve

## Workflow

1. **Get profile**: call `prism_calc` → `machine_profile_get` with machine_id
2. **List machines**: call `machine_profile_list` with optional type filter
3. **Validate**: call `machine_profile_validate` with machine_id + cutting params
4. **Spindle curve**: call `machine_profile_spindle_curve` with machine_id + points

## Available Machines
- **Haas**: VF-2, VF-2SS, UMC-500, ST-20
- **DMG MORI**: DMC 635V, DMU 50
- **Mazak**: VCS-430A, QT-200
- **Okuma**: GENOS M560-V
- **Citizen**: L20
- **Tormach**: 1100MX
- **Datron**: neo

## Output Format
```
MACHINE VALIDATION — [machine_name]
════════════════════════════════════
Parameter     Value    Limit    Status    Utilization
RPM           [val]    [lim]    [OK/WARN/EXCEEDED]    [%]
Feed Rate     [val]    [lim]    [OK/WARN/EXCEEDED]    [%]
Power         [val]    [lim]    [OK/WARN/EXCEEDED]    [%]
Torque        [val]    [lim]    [OK/WARN/EXCEEDED]    [%]

Verdict: [PASS / FAIL — N violations]
```
