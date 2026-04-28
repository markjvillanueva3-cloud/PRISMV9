---
id: "sc-089"
title: "GPP Custom Macro Output — Insert Controller-Specific M-Codes and Variables"
source: "web:solidcam-docs"
confidence: 86
category: "programming"
tags: ["solidcam", "gpp", "custom-macros", "m-codes", "gppl"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.732Z
---

# GPP Custom Macro Output — Insert Controller-Specific M-Codes and Variables

Use GPPL user-defined procedures to insert custom M-codes, controller variables, and machine-specific commands at strategic points in the G-code. Common applications: insert coolant pressure selection (M50-M59) based on operation type, output probing macros before critical operations, and insert chip conveyor control between roughing passes. Define custom procedures in the GPP file using proc_user1 through proc_user10, triggered by operation attributes or tool type changes.

**Category:** programming
**Confidence:** 86
**Source:** web:solidcam-docs
**Operations:** post_processing

## Related
- [[solidcam-cam-tips-sc-091|GPP VS Code Debugger — Step Through Post Processing Logic]]
- [[solidcam-cam-tips-sc-086|GPP Sub-Program Generation — Reduce G-Code File Size for Repeated Features]]
- [[solidcam-cam-tips-sc-087|GPP Canned Cycle Configuration — Map SolidCAM Drilling to Controller Cycles]]
- [[solidcam-cam-tips-sc-088|GPP Multi-Axis Output — VMID Settings for 5-Axis G-Code Format]]
- [[solidcam-cam-tips-sc-090|GPP Arc Output Control — Enable 3D Arcs for Smoother 5-Axis Motion]]
