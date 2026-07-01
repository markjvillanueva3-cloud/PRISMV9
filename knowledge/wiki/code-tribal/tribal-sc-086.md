---
name: tribal-sc-086
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["solidcam", "gpp", "sub-program", "g-code", "file-size"]
confidence: 87
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-086.md
promoted_at: 2026-06-09T22:31:16.590Z
---

# GPP Sub-Program Generation — Reduce G-Code File Size for Repeated Features

Use GPPL sub-program generation to output repeated toolpath patterns as G-code sub-programs (M98/M99 or equivalent). In the GPP file, define a sub-program trigger based on operation name patterns or geometry hash. For parts with multiple identical pockets, sub-programs reduce file size by 60-80% and enable the CNC to cache the toolpath in memory. Set the sub-program number range in VMID to avoid conflicts with the machine's existing macro numbers.

**Category:** programming
**Confidence:** 87
**Source:** web:solidcam-docs
**Operations:** post_processing

## Related
- [[solidcam-cam-tips-sc-087|GPP Canned Cycle Configuration — Map SolidCAM Drilling to Controller Cycles]]
- [[solidcam-cam-tips-sc-088|GPP Multi-Axis Output — VMID Settings for 5-Axis G-Code Format]]
- [[solidcam-cam-tips-sc-089|GPP Custom Macro Output — Insert Controller-Specific M-Codes and Variables]]
- [[solidcam-cam-tips-sc-090|GPP Arc Output Control — Enable 3D Arcs for Smoother 5-Axis Motion]]
- [[solidcam-cam-tips-sc-091|GPP VS Code Debugger — Step Through Post Processing Logic]]
