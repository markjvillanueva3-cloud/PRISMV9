---
name: tribal-mc-200
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "machine-group", "stock-setup", "wcs", "tool-plane", "multi-setup"]
confidence: 87
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-200.md
promoted_at: 2026-06-09T22:31:16.444Z
---

# Machine group properties define stock shape, material, and coordinate system for all contained operations

In Mastercam, the Machine Group is the top-level container in the Toolpath Manager that holds stock setup, machine definition, and all operations for one setup. Configure Machine Group Properties carefully: Stock Setup defines the raw material shape (rectangular, cylindrical, or STL), dimensions, and material type. The stock definition controls simulation accuracy and roughing toolpath boundaries. Work Coordinate System (WCS) sets the program origin — all G-code coordinates reference this origin. Always set WCS to match the physical fixture datum. Tool Plane and Construction Plane default to the WCS but can be changed per operation for angled features. A single Mastercam file can contain multiple Machine Groups for multi-setup parts — each group represents a separate setup with its own stock, origin, and tool list.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:mastercam-docs
**Operations:** setup

## Related
- [[mastercam-cam-tips-mc-141|Core/cavity split machining uses separate machine groups for each mold half]]
- [[mastercam-cam-tips-mc-201|Stock setup per machine group must accurately represent the actual raw material for each setup]]
- [[mastercam-cam-tips-mc-203|Multiple machine groups in one file enable multi-setup programming with coordinated fixtures]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[mastercam-cam-tips-mc-202|Tool plane alignment for angled features uses named planes and 3+2 positioning]]
