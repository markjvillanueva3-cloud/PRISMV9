# Edge Preparation and Hone Radius Effect (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Core Correction - Master Level

## Description
Edge preparation (hone radius, chamfer, or sharp) significantly affects cutting force, especially at small chip thicknesses.

## Typical Effects
- Sharp edge: Lowest force, but poor edge strength
- Hone radius 10-25µm: Good balance for general use
- Hone radius 40-60µm: Higher force but better edge life in hard materials
- Chamfered edge: Used in heavy roughing of hardened steel

## PRISM Implementation
- Edge prep factor stored in ToolRegistry
- Applied in KienzleForceModelEngine

## Tribal Notes
- JM Die often uses heavier hone on tools for HRC 50+ materials
- Small hone radius on aluminum to reduce built-up edge

**Last Updated:** 2026-06-12