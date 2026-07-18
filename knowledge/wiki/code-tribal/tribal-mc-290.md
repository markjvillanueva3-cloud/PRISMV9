---
name: tribal-mc-290
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "api", "net-hook", "automation", "plugin", "csharp"]
confidence: 80
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-290.md
promoted_at: 2026-06-09T22:31:16.468Z
---

# Mastercam NET-Hook API enables custom automation plugins for repetitive programming tasks

Mastercam's NET-Hook API (C#/.NET) allows creation of custom plugins that automate repetitive CAM programming tasks. Common automation targets: (1) automatic toolpath generation from feature recognition — scan the solid model for pockets, holes, and contours, then apply pre-defined toolpath templates; (2) batch processing — open multiple part files, apply a standard operation set, and post-process to NC files without user interaction; (3) custom tool selection logic — query an external tool database (SQL/ERP) and assign tools based on feature dimensions and material. The NET-Hook SDK is included with Mastercam Developer Edition. Create a Class Library project in Visual Studio, reference Mastercam.Interop.dll, and implement the INetHook3App interface. Deploy the compiled DLL to the Mastercam plugins folder. Key classes: LevelsManager (layer control), OperationsManager (toolpath CRUD), ToolManager (tool library access), GeometryManipulationManager (chain/solid manipulation).

**Category:** cam_strategy
**Confidence:** 80
**Source:** web:mastercam-docs
**Operations:** general

## Related
- [[mastercam-cam-tips-mc-104|NET-Hook (.NET) bridges the gap between VBScript simplicity and C-Hook power]]
- [[mastercam-cam-tips-mc-102|VBScript automation can regenerate toolpaths and post-process entire part families]]
- [[mastercam-cam-tips-mc-218|Custom feature templates extend FBM recognition to shop-specific non-standard features]]
- [[mastercam-cam-tips-mc-250|Mastercam 2025 Deburr toolpath automates edge-break and chamfer operations from solid model edges]]
- [[mastercam-cam-tips-mc-252|Mastercam 2025 Toolpath Hole Recognition automatically identifies and programs hole features from solids]]
