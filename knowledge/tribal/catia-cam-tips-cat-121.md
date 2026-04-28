---
id: "cat-121"
title: "V5 Manufacturing Hub vs 3DEXPERIENCE NC Machine Builder Migration"
source: "web:dassault-forum"
confidence: 0.82
category: "cam_strategy"
tags: ["catia", "v5", "3dexperience", "migration", "nc-machine-builder"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.895Z
---

# V5 Manufacturing Hub vs 3DEXPERIENCE NC Machine Builder Migration

In CATIA V5, machine definitions live in the Manufacturing Hub (.CATProcess) with PPR tree structure (Product-Process-Resource). In 3DEXPERIENCE, machine setup migrates to NC Machine Builder app where machine tools are PLM objects stored in the 3DSpace database. When migrating V5 programs, export the machine kinematics (axes, limits, home positions) to XML first, then re-create them in NC Machine Builder. Direct .CATProcess import loses machine-specific collision zones and requires manual re-linking of tool assemblies to the 3DSpace tool catalog.

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:dassault-forum
**Operations:** setup

## Related
- [[catia-cam-tips-cat-123|V5 CATTool vs 3DEXPERIENCE Tool Resource Management]]
- [[catia-cam-tips-cat-125|V5 Macro Migration to 3DEXPERIENCE EKL Automation]]
- [[catia-cam-tips-cat-126|CATProcess to 3DEXPERIENCE Manufacturing Item Conversion]]
- [[catia-cam-tips-cat-128|V5 PP Table vs 3DEXPERIENCE Post Processor Workbench]]
- [[catia-cam-tips-cat-075|Cloud CAM on 3DEXPERIENCE Enables Browser-Based NC Programming]]
