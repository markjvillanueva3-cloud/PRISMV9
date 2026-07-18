---
name: tribal-sc-091
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["solidcam", "gpp", "vscode", "debugging", "gppl"]
confidence: 88
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-091.md
promoted_at: 2026-06-09T22:31:16.591Z
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
