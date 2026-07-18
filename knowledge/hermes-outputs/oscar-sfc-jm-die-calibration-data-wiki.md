# JM Die SFC Calibration Data (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Shop-Specific - Master Level

## Description
Calibrated kc1.1 and mc values derived from actual JM Die production data across multiple materials and tools.

## Current Calibrated Values (Selected)

| Material          | kc1.1 (N/mm²) | mc    | Notes |
|-------------------|---------------|-------|-------|
| 4140 (28-32 HRC)  | 1950          | 0.23  | Most common |
| D2 (58-60 HRC)    | 3100          | 0.18  | High force |
| 17-4 PH (H900)    | 2350          | 0.26  | Stainless |
| Ti-6Al-4V         | 1450          | 0.32  | Low kc but difficult |

## PRISM Usage
- These values override generic ISO group values when available
- Stored in MaterialRegistry with provenance

## Notes
- Values are periodically updated from production data
- High uncertainty on exotic materials due to low sample size

**Last Updated:** 2026-06-12 (JM Die internal data)