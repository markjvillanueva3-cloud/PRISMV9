---
name: probe-routine-guide
description: 'Probing and in-process measurement guide. Use when the user needs touch probe routines, tool length measurement, part alignment, or in-cycle inspection for CNC machines.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  product: Probing
---

# Probing & In-Process Measurement Guide

## When to Use
- Setting up touch probe routines for part alignment (WCS)
- Tool length and diameter measurement with tool setter
- In-cycle inspection for critical dimensions
- Automated offset correction based on probe data

## How It Works
1. Select probe type (spindle probe, tool setter, laser)
2. Generate probe routine via `prism_cam→probe_routine_generate`
3. Configure offset update rules (auto-correct within tolerance band)
4. Integrate with SPC via `prism_quality→measurement_record`
5. Set up alarm triggers for out-of-tolerance conditions

## Returns
- Probe routine G-code (Renishaw, Blum, or Heidenhain format)
- Offset update rules with correction limits
- Measurement data logging configuration
- Alarm thresholds and operator notification setup

## Example
**Input:** "Probe routine to find part center and Z-top on a round part, Renishaw OMP60"
**Output:** Routine: X-axis 2-point probe at Y=0 → center X. Y-axis 2-point probe at X=center → center Y. Z single-point probe at center → Z-top. Updates G54 X/Y/Z. Protected move: Z+50 between moves, feed 1000mm/min approach, 200mm/min probe. Cycle time: ~35 seconds. Auto-correct: ±2mm XY, ±1mm Z; alarm if greater.
