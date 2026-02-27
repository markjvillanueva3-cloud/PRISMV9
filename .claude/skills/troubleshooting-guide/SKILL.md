---
name: troubleshooting-guide
description: 'Manufacturing troubleshooting guide. Use when the user has machining problems like chatter, poor surface finish, tool breakage, dimensional errors, or machine alarms.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  product: Troubleshooting
---

# Manufacturing Troubleshooting Guide

## When to Use
- Diagnosing chatter, vibration, or resonance issues
- Investigating poor surface finish or dimensional drift
- Troubleshooting tool breakage or premature wear
- Resolving machine alarms and error codes

## How It Works
1. Classify problem via diagnostic decision tree (12 categories)
2. Gather context: material, tool, parameters, machine, symptoms
3. Query knowledge base via `prism_knowledge→query`
4. Run diagnostic via `prism_intelligence→troubleshoot_diagnose`
5. Recommend corrective actions ranked by likelihood

## Returns
- Root cause analysis with probability ranking
- Corrective actions: parameter changes, tool changes, or setup fixes
- Before/after parameter comparison
- Links to similar resolved cases from tribal knowledge base

## Example
**Input:** "Getting chatter on finishing pass, 12mm endmill in 17-4PH, 3200 RPM"
**Output:** Likely causes: (1) Harmonics — 3200 RPM × 4 flutes = 213 Hz near workpiece natural frequency (78% likely). Try 2800 or 3600 RPM to shift away. (2) Tool overhang — if >4xD, reduce to 3xD or use stub length. (3) Radial engagement — if Ae >40% for finishing, reduce to 15-20%. Quick fix: change RPM to 2850 and reduce Ae to 1.5mm.
