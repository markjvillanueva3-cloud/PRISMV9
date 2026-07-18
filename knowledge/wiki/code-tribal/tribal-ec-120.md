---
name: tribal-ec-120
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["multi-setup", "work-coordinates", "fixturing", "datum-transfer"]
confidence: 88
source: "web:edgecam-multi-setup"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-120.md
promoted_at: 2026-06-09T22:31:16.188Z
---

# Multi-Setup Programming with Work Coordinate Systems

Edgecam supports multi-setup programming for parts requiring multiple fixturing orientations. Define separate work coordinate systems (G54-G59, G54.1 P1-P48) per setup. Use in-process stock transfer between setups — the stock shape from setup 1 becomes the stock for setup 2, ensuring accurate material removal simulation. Program datum transfer probing between setups to align subsequent operations to features machined in the first setup.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:edgecam-multi-setup
**Operations:** all

## Related
- [[catia-cam-tips-cat-099|Multi-Setup Part Positioning and Datum Transfer]]
- [[edgecam-cam-tips-ec-219|Tolerance Stack Analysis for Multi-Setup Machining]]
- [[bobcad-cam-tips-bc-083|Stock Model Tracking Across Operations]]
- [[catia-cam-tips-cat-181|Multi-Setup Manufacturing Program Organization in CATIA]]
- [[catia-cam-tips-cat-182|Stock Transfer Between Setups with Intermediate Stock Bodies]]
