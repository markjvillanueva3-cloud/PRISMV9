---
name: mfg-machine-lookup
description: Retrieve full machine specifications by ID from the MachineRegistry (1,016 entries)
---

## When To Use
- User asks for specs of a specific CNC machine (e.g., "What are the specs of a Haas VF-2?")
- Need axis travels, spindle specs, rapids, tool capacity, or controller type for a known machine
- Setting up a job and need to verify machine envelope or spindle taper
- NOT for searching machines by capability (use mfg-machine-search)
- NOT for capability analysis or torque curves (use mfg-machine-capabilities)

## How To Use
### Look up machine by ID
```
prism_data action=machine_get params={
  id: "haas_vf2"
}
```

### Look up with specific fields
```
prism_data action=machine_get params={
  id: "dmg_dmu50",
  fields: ["spindle", "travels", "tool_changer"]
}
```

## What It Returns
```json
{
  "id": "haas_vf2",
  "manufacturer": "Haas",
  "model": "VF-2",
  "type": "vertical_machining_center",
  "axes": 3,
  "travels": {
    "x_mm": 762,
    "y_mm": 406,
    "z_mm": 508
  },
  "spindle": {
    "max_rpm": 8100,
    "taper": "BT40",
    "power_kW": 22.4,
    "torque_Nm": 122
  },
  "rapids": {
    "xy_m_min": 25.4,
    "z_m_min": 25.4
  },
  "tool_changer": {
    "type": "carousel",
    "capacity": 20,
    "change_time_s": 4.2
  },
  "controller": "Haas NGC",
  "table_load_kg": 1361
}
```

## Examples
### Look up a 3-axis VMC
- Input: `prism_data action=machine_get params={id: "haas_vf2"}`
- Output: Full specs including 762x406x508mm travels, BT40 spindle at 8,100 RPM, 20-tool carousel
- Edge case: If ID not found, returns `{error: "machine_not_found", suggestion: "haas_vf-2"}` with fuzzy match suggestions

### Look up a 5-axis machine
- Input: `prism_data action=machine_get params={id: "dmg_dmu50"}`
- Output: Full specs including 5-axis simultaneous, 500mm travels, HSK-A63 spindle at 20,000 RPM
- Edge case: Hyphenated IDs may use underscores in registry (e.g., "vf-2" stored as "haas_vf2")
