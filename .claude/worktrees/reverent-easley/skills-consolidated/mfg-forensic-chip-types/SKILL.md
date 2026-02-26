---
name: Chip Type Reference
description: Chip type reference database with visual identification guide
---

## When To Use
- Identifying a chip type from its physical appearance
- Looking up what a specific chip shape indicates about cutting conditions
- Comparing observed chips against the standard ISO chip classification
- Training machinists on chip form recognition and what it means

## How To Use
```
prism_intelligence action=forensic_chip_types params={
  filter: "turning",
  material_group: "steel",
  include_images: true
}
```

## What It Returns
- Chip type classification (ISO 3685 standard types 1-9)
- Physical description and identification characteristics for each type
- What each chip type indicates about cutting parameters
- Acceptable vs problematic chip forms for each operation type
- Parameter adjustment guidance to move between chip types

## Examples
- Input: `forensic_chip_types params={ filter: "all" }`
- Output: Full reference of 9 ISO chip types: ribbon, tubular, spiral, washer-type, conical, arc, elemental, needle, and powder chips

- Input: `forensic_chip_types params={ filter: "drilling", material_group: "stainless" }`
- Output: Expected chip types for drilling stainless: conical spiral (ideal), ribbon (feed too low), segmented (feed too high)

- Input: `forensic_chip_types params={ chip_type: "6-9", detail: true }`
- Output: Detailed breakdown of short spiral chips (type 6-9): ideal for CNC, good evacuation, indicates correct feed/depth ratio
