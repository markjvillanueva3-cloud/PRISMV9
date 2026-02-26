---
name: mfg-acnc-program
description: Automatically generate CNC programs from feature data
---

# Auto CNC Programming

## When To Use
- Generating complete CNC programs from recognized part features
- Automating routine programming for prismatic or turned parts
- Creating first-pass programs that programmers can refine
- Batch-programming families of similar parts

## How To Use
```
prism_intelligence action=acnc_program params={features: [{type: "pocket", length: 50, width: 30, depth: 10}], material: "6061-T6", machine: "3axis_vmc"}
```

## What It Returns
- `program` — complete G-code program with tool paths
- `tools_required` — list of tools with holder and offset assignments
- `cycle_time_est` — estimated cycle time in minutes
- `operations` — ordered list of operations (roughing, finishing, drilling, etc.)
- `warnings` — any limitations or manual review items flagged

## Examples
- `acnc_program params={features: [{type: "pocket", length: 50, width: 30, depth: 10}], material: "6061-T6", machine: "3axis_vmc"}` — program a pocket in aluminum
- `acnc_program params={features: [{type: "hole", diameter: 10, depth: 25, tolerance: "H7"}], material: "4140"}` — program a precision hole
- `acnc_program params={part_file: "bracket_v2", controller: "fanuc", output: "full_program"}` — generate full program for a part
