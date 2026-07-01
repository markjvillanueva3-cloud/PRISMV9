---
name: tribal-cat-121
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "v5", "3dexperience", "migration", "nc-machine-builder"]
confidence: 0
source: "web:dassault-forum"
promoted_from: knowledge/tribal/catia-cam-tips-cat-121.md
promoted_at: 2026-06-09T22:31:16.058Z
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
