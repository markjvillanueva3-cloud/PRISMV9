# Chatter Stability Lobe Diagram (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Core Topic - Master Level

## Description
Stability Lobe Diagrams (SLD) show stable and unstable cutting regions as a function of spindle speed and axial depth of cut.

## Key Parameters
- Natural frequency of the dominant mode
- Damping ratio
- Cutting force coefficients (Kienzle)
- Number of teeth
- Radial immersion

## PRISM Implementation
- ChatterStabilityLobeEngine
- Uses semi-discretization or frequency domain methods
- Monte Carlo UQ on modal parameters

## Tribal Notes (JM Die)
- Thin wall parts: Always check lobe diagram before high-speed roughing
- 5-axis: Orientation changes stability significantly

**Last Updated:** 2026-06-12