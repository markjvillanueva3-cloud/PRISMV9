---
name: cad-import-guide
description: 'CAD import and geometry analysis guide. Use when the user needs to import STEP/IGES/DXF files, analyze part geometry, recognize features, or set up work coordinate systems.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
---

# CAD Import & Geometry Analysis Guide

## When to Use
- Importing STEP, IGES, DXF, or STL files for manufacturing
- Analyzing part geometry for machinability
- Feature recognition (holes, pockets, slots, bosses)
- Setting up WCS (Work Coordinate System) for multi-setup parts

## How It Works
1. Import geometry via `prism_cad→mesh_import`
2. Analyze features via `prism_cad→feature_recognize`
3. Evaluate stock model via `prism_cad→stock_model`
4. Set WCS via `prism_cad→wcs_setup`
5. Validate machinability against machine envelope

## Returns
- Feature list with dimensions, tolerances, and surface finish callouts
- Stock size recommendation (round, flat, near-net)
- WCS origin and datum scheme
- Undercut/accessibility warnings

## Example
**Input:** "Import bracket.step, identify features, suggest stock"
**Output:** 14 features found: 6 holes (M6x1, M8x1.25), 2 pockets (30x20x8mm), 4 profiles, 2 chamfers. Stock: 6061-T6 flat 100x65x25mm. WCS: bottom-left corner, Z-top. No undercuts, all features accessible from top + one side.
