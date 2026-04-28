---
id: "mc-203"
title: "Multiple machine groups in one file enable multi-setup programming with coordinated fixtures"
source: "web:community"
confidence: 85
category: "cam_strategy"
tags: ["mastercam", "multi-setup", "machine-group", "tombstone", "flip", "stock-transfer"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.282Z
---

# Multiple machine groups in one file enable multi-setup programming with coordinated fixtures

For parts requiring multiple setups (flip machining, tombstone fixtures, 4th-axis indexing), create separate Machine Groups in the same Mastercam file. Each group has its own WCS origin, stock definition, and operations. Benefits: (1) all setups share the same part model, ensuring geometric consistency; (2) stock models pass between groups — Op1's finished stock becomes Op2's starting stock; (3) tool libraries are shared, reducing tool number conflicts; (4) posting can output separate NC files per group or a combined file with setup stops. For tombstone fixtures (4 parts on 4 faces), create 4 Machine Groups with WCS origins at each face. Name groups descriptively: 'Op1-Top', 'Op2-Bottom', 'Op3-Left-Side'. Operation ordering within each group controls the machining sequence — drag operations to reorder. Cross-group tool number conflicts must be resolved manually.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:community
**Operations:** setup

## Related
- [[mastercam-cam-tips-mc-200|Machine group properties define stock shape, material, and coordinate system for all contained operations]]
- [[mastercam-cam-tips-mc-141|Core/cavity split machining uses separate machine groups for each mold half]]
- [[mastercam-cam-tips-mc-201|Stock setup per machine group must accurately represent the actual raw material for each setup]]
- [[mastercam-cam-tips-mc-271|Mastercam for SolidWorks configurations enable machining multiple part variants from a single setup]]
- [[mastercam-cam-tips-mc-278|Statistical tolerance stack-up analysis validates multi-setup part accuracy before programming]]
