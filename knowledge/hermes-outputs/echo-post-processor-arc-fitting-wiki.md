# Arc Fitting and Smoothing (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Core Feature - Master Level

## Description
Conversion of linear toolpath segments into arcs (G02/G03) and application of smoothing (spline or polynomial) for better surface finish and reduced file size.

## PRISM Implementation
- Phase 4 (Motion & Kinematics) of the pipeline
- Configurable tolerance and smoothing strength per dialect
- Collision-aware arc fitting

## Key Parameters
- Arc fitting tolerance (typically 0.01–0.05mm)
- Smoothing strength
- Maximum arc radius

## Dialect Differences
- Fanuc: Good arc support, limited spline
- Siemens: Excellent spline support (BSPLINE)
- Heidenhain: Strong spline and polynomial support

**Last Updated:** 2026-06-12