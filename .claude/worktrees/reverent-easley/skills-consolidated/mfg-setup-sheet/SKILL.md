---
name: Setup Sheet Generator
description: Generate formatted setup sheets with part datum, tooling, and operation sequence
---

## When To Use
- When preparing work instructions for the machine operator
- When documenting fixture setup, datums, and tool positions
- When generating standardized setup documentation for ISO compliance
- When you need a printable or digital setup package
- NOT for process planning — use mfg-job-plan first, then generate sheets

## How To Use
```
prism_intelligence action=setup_sheet params={
  job_id: "JOB-2024-0142",
  part: "bracket-001",
  setup_number: 1,
  machine: "Haas VF-2",
  fixture: "Kurt D688 vise",
  datum: "X0Y0 = part corner, Z0 = top face"
}

prism_intelligence action=setup_sheet_format params={
  sheet_id: "SS-001",
  format: "pdf"
}

prism_intelligence action=setup_sheet_template params={
  machine_type: "3-axis VMC"
}
```

## What It Returns
- Formatted setup sheet with datum diagram references
- Tool list with pocket assignments, lengths, and offsets
- Operation sequence with speeds, feeds, and depths
- Fixture and workholding instructions with torque specs
- Template library for common machine configurations

## Examples
- Input: `setup_sheet params={part: "manifold", machine: "DMG Mori DMU-50", setup_number: 2}`
- Output: Setup sheet with 8 tools, A/B axis positions, 5-axis datum alignment procedure

- Input: `setup_sheet_template params={machine_type: "lathe"}`
- Output: Standard lathe template with chuck jaw spec, tailstock position, and turret layout
