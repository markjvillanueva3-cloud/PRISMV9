---
name: mfg-acnc-output
description: Generate and validate final CNC output from auto-programming
---

# ACNC Output Generator

## When To Use
- Generating post-processed G-code for a specific controller from auto-programming
- Validating generated code against controller syntax rules
- Producing setup sheets and documentation alongside the program
- Exporting programs in multiple controller formats from one source

## How To Use
```
prism_intelligence action=acnc_output params={program_id: "ACNC-001", controller: "fanuc_0i", format: "nc"}
```

```
prism_intelligence action=acnc_validate params={program_id: "ACNC-001", controller: "fanuc_0i"}
```

## What It Returns
- `gcode` — final post-processed G-code ready for the machine
- `validation_result` — syntax and safety validation pass/fail with details
- `program_header` — program number, date, tool list, and operator notes
- `setup_sheet` — auto-generated setup documentation
- `file_info` — output filename, line count, estimated transfer size

## Examples
- `acnc_output params={program_id: "ACNC-001", controller: "fanuc_0i", format: "nc"}` — generate Fanuc G-code output
- `acnc_validate params={program_id: "ACNC-001", controller: "siemens_840d"}` — validate for Siemens controller
- `acnc_output params={program_id: "ACNC-001", controllers: ["fanuc_0i", "haas"], include_setup: true}` — multi-controller output with setup sheets
