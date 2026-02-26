---
name: mfg-toolholder-match
description: Match compatible toolholder types to a machine spindle — BT40, CT40, HSK, CAT adapters and tool change specs
---

## When To Use
- Need to know which toolholder types fit a specific machine spindle (BT40, HSK-A63, CAT50, etc.)
- Selecting tooling for a job and need to verify holder compatibility
- Checking adapter availability for cross-platform tooling
- Need tool change time, pull stud type, or ATC compatibility info
- NOT for machine specs beyond toolholder interface (use mfg-machine-lookup)
- NOT for cutting tool selection (use mfg-tool-recommend)

## How To Use
### Match toolholders for a machine
```
prism_data action=machine_toolholder_match params={
  machine: "haas_vf2"
}
```

### Match with specific holder type filter
```
prism_data action=machine_toolholder_match params={
  machine: "dmg_dmu50",
  holder_type: "HSK-A63"
}
```

## What It Returns
```json
{
  "machine": "haas_vf2",
  "spindle_taper": "BT40",
  "pull_stud": "MAS-P403 (Haas)",
  "compatible_holders": [
    {
      "type": "BT40",
      "standard": "JIS B6339",
      "max_rpm_balanced": 12000,
      "retention_force_kN": 10,
      "variants": ["BT40-ER32", "BT40-ER16", "BT40-FMB22", "BT40-APU13"]
    },
    {
      "type": "CT40",
      "standard": "ANSI B5.50",
      "max_rpm_balanced": 8000,
      "retention_force_kN": 10,
      "note": "Compatible with BT40 spindle via pull stud"
    }
  ],
  "tool_change": {
    "type": "carousel",
    "capacity": 20,
    "max_tool_diameter_mm": 76,
    "max_tool_length_mm": 250,
    "max_tool_weight_kg": 5.4,
    "change_time_s": 4.2
  },
  "adapters": [
    {"from": "HSK-A63", "to": "BT40", "adapter": "HSK-A63-BT40-reduction", "runout_penalty_um": 3}
  ]
}
```

## Examples
### Find holders for a Haas VMC
- Input: `prism_data action=machine_toolholder_match params={machine: "haas_vf2"}`
- Output: BT40 and CT40 compatible, MAS-P403 pull stud, 20-tool carousel with 76mm max diameter
- Edge case: Haas machines use proprietary pull stud; standard BT40 pull studs will not work

### Find holders for a 5-axis with HSK spindle
- Input: `prism_data action=machine_toolholder_match params={machine: "dmg_dmu50"}`
- Output: HSK-A63 face/taper contact, 15,000+ RPM balanced, 30-tool magazine
- Edge case: HSK holders have no pull stud; retention is via expanding collet mechanism
