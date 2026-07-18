---
name: tribal-sc-087
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["solidcam", "gpp", "canned-cycles", "drilling", "controller"]
confidence: 89
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-087.md
promoted_at: 2026-06-09T22:31:16.591Z
---

# GPP Canned Cycle Configuration — Map SolidCAM Drilling to Controller Cycles

SolidCAM drilling operations output generic drilling moves that the GPP maps to controller-specific canned cycles (G81, G83, G73, etc.). Verify the GPP's peck increment handling — some controllers expect total depth per peck while others expect incremental depth. A mismatch causes the drill to peck at incorrect depths, potentially snapping the tool. Test the GPP output for each drilling type (spot, peck, chip-break, bore, ream, tap) against your controller's programming manual before production.

**Category:** programming
**Confidence:** 89
**Source:** web:solidcam-docs
**Operations:** drilling, post_processing

## Related
- [[solidcam-cam-tips-sc-181-2|Feature Recognition for Drilling Automation]]
- [[controller-knowledge-tips-ctrl-061|Fanuc milling-specific canned cycles (0i-MF / 31i-B5)]]
- [[solidcam-cam-tips-sc-086|GPP Sub-Program Generation — Reduce G-Code File Size for Repeated Features]]
- [[solidcam-cam-tips-sc-088|GPP Multi-Axis Output — VMID Settings for 5-Axis G-Code Format]]
- [[solidcam-cam-tips-sc-089|GPP Custom Macro Output — Insert Controller-Specific M-Codes and Variables]]
