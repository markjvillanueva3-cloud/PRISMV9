---
name: quality-spc-guide
description: 'Quality management and SPC guide. Use when the user needs statistical process control, inspection planning, tolerance analysis, or quality reporting for manufactured parts.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  product: Quality
---

# Quality Management & SPC Guide

## When to Use
- Setting up SPC charts for critical dimensions
- Planning inspection sequences (CMM, vision, manual)
- Analyzing Cp/Cpk trends and process capability
- Generating quality reports and first-article inspection (FAI)

## How It Works
1. Define critical dimensions and tolerances from drawing
2. Configure SPC via `prism_quality→spc_setup` (X-bar/R, X-bar/S, or individual)
3. Collect measurements via `prism_quality→measurement_record`
4. Analyze capability via `prism_quality→capability_analysis`
5. Generate FAI/PPAP report via `prism_export→render_pdf`

## Returns
- Control charts (X-bar/R) with UCL/LCL calculated from data
- Cp/Cpk values with confidence intervals
- Out-of-control signals (Western Electric rules)
- FAI report with balloon drawing cross-references

## Example
**Input:** "Set up SPC for bore diameter 25.000 ±0.013mm, last 50 measurements"
**Output:** X-bar = 25.002mm, R-bar = 0.008mm. Cp = 1.62, Cpk = 1.47 (capable). UCL = 25.007, LCL = 24.997. No OOC signals. Process centered +0.002mm — adjust offset to center on nominal for Cpk improvement to ~1.60.
