---
name: prism-program-proving
description: 'Safe program proving guide. Use when the user needs to safely prove out a new CNC program, including dry run, single block, graphics verify, and first-piece strategies.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  tier: PASS2
  scrutiny_id: M121
  category: operator-knowledge
---

# Safe Program Proving

## When to Use
- Running a new CNC program for the first time
- Proving out after program edits or tool changes
- Training operators on safe prove-out procedures
- Setting up first-piece protocols for new jobs

## How It Works
1. Pre-check: verify tool list, offsets, WCS, stock dimensions
2. Graphics verify (if available): `prism_cam→toolpath_simulate`
3. Dry run: air cut above part with Z-shift (+50mm)
4. Single block first part: hand on feed override, watching each move
5. First piece inspection: critical dimensions before batch run

## Returns
- Pre-prove checklist (tool offsets, WCS, stock, fixtures)
- Prove-out sequence (graphics → dry run → single block → first piece)
- Feed override strategy per operation phase
- First-piece inspection plan with measurement priority

## Example
**Input:** "Prove-out procedure for 5-axis impeller program, new fixture"
**Output:** Step 1: Graphics verify — run full simulation in VERICUT/CAM, check no gouges or collisions. Step 2: Install fixture, indicate within 0.01mm, set WCS via probing. Step 3: Load tools, verify each with tool setter (length ±0.005mm of presetter). Step 4: Dry run at Z+100mm safety plane, 100% rapid, watch path (4 min). Step 5: First piece — single block through tool changes, 25% feed override on first approach per tool, increase to 50% → 75% → 100% as confidence builds. Step 6: Measure: blade thickness (±0.05mm), leading edge radius, hub blend radius, tip clearance. Estimated prove-out time: 2-3 hours for 45-min cycle program.
