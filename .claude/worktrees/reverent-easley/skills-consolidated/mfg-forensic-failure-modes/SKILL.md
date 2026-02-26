---
name: Failure Mode Database
description: Browse known failure modes with identification guides
---

## When To Use
- Looking up a specific failure mode to understand its characteristics
- Browsing failure modes to identify which one matches observed symptoms
- Training or reference for recognizing common manufacturing failure patterns
- Building failure mode documentation for FMEA or quality systems

## How To Use
```
prism_intelligence action=forensic_failure_modes params={
  category: "tool_wear",
  filter: "carbide endmill",
  include_identification: true
}
```

## What It Returns
- List of failure modes matching the query category
- Visual identification characteristics for each mode
- Typical causes and contributing factors
- Severity rating and typical progression timeline
- Cross-references to related failure modes

## Examples
- Input: `forensic_failure_modes params={ category: "tool_wear" }`
- Output: 8 failure modes: flank wear, crater wear, notch wear, edge chipping, thermal cracking, BUE, plastic deformation, fracture

- Input: `forensic_failure_modes params={ category: "surface_defect", filter: "milling" }`
- Output: 6 modes for milling surfaces: chatter marks, feed lines, smearing, tearing, orange peel, step marks

- Input: `forensic_failure_modes params={ category: "dimensional", filter: "turning" }`
- Output: 5 modes: taper error, ovality, size drift, eccentricity, concentricity loss with identification guides
