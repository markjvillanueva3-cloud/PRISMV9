---
id: "nx-108"
title: "Gouge-Free Linking with Transfer Type Control"
source: "web:siemens-nx-docs"
confidence: 84
category: "cam_strategy"
tags: ["siemens-nx", "linking", "transfer-type", "gouge-free", "non-cutting"]
_source: "nx-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:43.405Z
---

# Gouge-Free Linking with Transfer Type Control

Set the Transfer Type in NX operations to Direct for moves between cut passes on the same level and to Clearance for moves between different Z-levels. Use Along Path with Safety Distance of 2 mm for high-speed finishing where lifting the tool causes re-entry marks. NX verifies that all linking moves clear the IPW and fixture geometry. The Shortest Path option minimizes non-cutting time but must be combined with collision checking to prevent holder-to-part interference during rapid traverses.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:siemens-nx-docs
**Operations:** finishing, 3-axis, 5-axis

## Related
- [[edgecam-cam-tips-ec-092|Linking Strategy Reduces Non-Cutting Travel]]
- [[esprit-cam-tips-esp-104|Linking Strategy Optimization Reduces Non-Cutting Time]]
- [[gibbscam-cam-tips-gc-099|Linking optimization reduces non-cutting travel between operations]]
- [[topsolid-cam-tips-ts-104|Linking Optimization Minimizes Non-Cutting Moves]]
- [[worknc-cam-tips-wnc-100|Linking Optimization Minimizes Non-Cutting Time]]
