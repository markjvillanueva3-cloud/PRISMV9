---
id: "cat-125"
title: "V5 Macro Migration to 3DEXPERIENCE EKL Automation"
source: "web:dassault-forum"
confidence: 0.78
category: "cam_strategy"
tags: ["catia", "v5", "3dexperience", "ekl", "automation", "migration"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.898Z
---

# V5 Macro Migration to 3DEXPERIENCE EKL Automation

V5 CATScript/VBA macros for automating machining operations do not run in 3DEXPERIENCE. Replace them with EKL (Engineering Knowledge Language) scripts in the Knowledge Expert app. EKL can automate operation creation, parameter assignment, and tool selection using the same manufacturing object model. Key difference: V5 macros access COM objects (HybridShapeFactory, MfgProgram), while EKL uses Knowledge types (MfgOperation, MfgTool). Start migration by mapping V5 COM calls to equivalent EKL methods documented in the 3DEXPERIENCE CAA Encyclopedia.

**Category:** cam_strategy
**Confidence:** 0.78
**Source:** web:dassault-forum
**Operations:** automation

## Related
- [[catia-cam-tips-cat-121|V5 Manufacturing Hub vs 3DEXPERIENCE NC Machine Builder Migration]]
- [[catia-cam-tips-cat-123|V5 CATTool vs 3DEXPERIENCE Tool Resource Management]]
- [[catia-cam-tips-cat-126|CATProcess to 3DEXPERIENCE Manufacturing Item Conversion]]
- [[catia-cam-tips-cat-063|Knowledge-Based Machining Automates Feature-to-Operation Mapping]]
- [[catia-cam-tips-cat-064|EKL Scripts Automate Repetitive CAM Parameter Adjustments]]
