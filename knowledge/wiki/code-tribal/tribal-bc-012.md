---
name: tribal-bc-012
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["pocketing", "gouge-check", "neighboring-walls", "open-pocket"]
confidence: 90
source: "web:bobcad-pocket-gouge"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-012.md
promoted_at: 2026-05-26T16:07:19.754Z
---

# Pocket Milling with Gouge Check for Neighboring Walls

BobCAD V37 adds 'Gouge Check Curves' for pocket operations — open pockets with neighboring walls are automatically protected from tool gouging. Previously, programmers had to manually extend pocket geometry to prevent the tool from driving into adjacent walls. Enable this for all open pocket operations. Set the gouge check boundary to include all surfaces within 2x the tool diameter of the pocket edge. The system automatically trims the toolpath to avoid contact with these surfaces.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:bobcad-pocket-gouge
**Operations:** pocketing, 2.5d_milling

## Related
- [[catia-cam-tips-cat-001|Pocketing Spiral vs Zigzag Tool Path Style Selection]]
- [[edgecam-cam-tips-ec-012|Pocketing with Island Detection and Offset Strategy]]
- [[edgecam-cam-tips-ec-051|Wire EDM No-Core Pocketing for Small Features]]
- [[esprit-cam-tips-esp-010|ProfitMilling Slot Pass Control in ESPRIT EDGE 2025]]
- [[esprit-cam-tips-esp-054|Wire EDM No-Core Pocketing Eliminates Slug Handling]]
