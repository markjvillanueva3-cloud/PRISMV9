---
id: "sc-091"
title: "GPP VS Code Debugger — Step Through Post Processing Logic"
source: "web:solidcam-docs"
confidence: 88
category: "programming"
tags: ["solidcam", "gpp", "vscode", "debugging", "gppl"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.734Z
---

# GPP VS Code Debugger — Step Through Post Processing Logic

Install the SolidCAM GPP VS Code extension for syntax highlighting, procedure tree navigation, Go-to-Definition, and step-through debugging of post processor logic. Set breakpoints on specific GPPL procedures (e.g., proc_arc, proc_line_5x) to inspect variable values during post processing. This is invaluable when diagnosing why specific G-code blocks are incorrect — you can watch how SolidCAM internal variables (like cax_act, tax_act for rotary positions) transform through each GPPL procedure.

**Category:** programming
**Confidence:** 88
**Source:** web:solidcam-docs
**Operations:** post_processing

## Related
- [[solidcam-cam-tips-sc-089|GPP Custom Macro Output — Insert Controller-Specific M-Codes and Variables]]
- [[solidcam-cam-tips-sc-086|GPP Sub-Program Generation — Reduce G-Code File Size for Repeated Features]]
- [[solidcam-cam-tips-sc-087|GPP Canned Cycle Configuration — Map SolidCAM Drilling to Controller Cycles]]
- [[solidcam-cam-tips-sc-088|GPP Multi-Axis Output — VMID Settings for 5-Axis G-Code Format]]
- [[solidcam-cam-tips-sc-090|GPP Arc Output Control — Enable 3D Arcs for Smoother 5-Axis Motion]]
