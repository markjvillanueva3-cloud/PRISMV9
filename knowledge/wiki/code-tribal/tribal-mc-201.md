---
name: tribal-mc-201
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "stock-setup", "machine-group", "raw-material", "casting", "stl-stock"]
confidence: 86
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-201.md
promoted_at: 2026-06-09T22:31:16.445Z
---

# Stock setup per machine group must accurately represent the actual raw material for each setup

Each Machine Group in Mastercam should have a stock definition that matches the actual raw material for that setup. For Op1 (first setup), the stock is the raw billet — define it as a rectangular block with accurate X/Y/Z dimensions and offsets from the part origin. For Op2 (flip setup), the stock should be a stock model generated from Op1 — this represents the semi-machined state including all features cut in the first setup. Importing the Op1 stock model as Op2's stock prevents the simulation from showing false collisions with already-removed material and allows the Op2 toolpath to reference actual remaining material. For parts with casting or forging stock shapes, import the casting CAD model as an STL stock — this produces dramatically more efficient roughing than a rectangular billet assumption, often reducing rough cycle time by 30–50%.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:community
**Operations:** setup, roughing

## Related
- [[mastercam-cam-tips-mc-200|Machine group properties define stock shape, material, and coordinate system for all contained operations]]
- [[mastercam-cam-tips-mc-141|Core/cavity split machining uses separate machine groups for each mold half]]
- [[mastercam-cam-tips-mc-203|Multiple machine groups in one file enable multi-setup programming with coordinated fixtures]]
- [[mastercam-cam-tips-mc-271|Mastercam for SolidWorks configurations enable machining multiple part variants from a single setup]]
- [[mastercam-cam-tips-mc-298|Mastercam OptiRough morphing between roughing levels maximizes material removal on near-net-shape stock]]
