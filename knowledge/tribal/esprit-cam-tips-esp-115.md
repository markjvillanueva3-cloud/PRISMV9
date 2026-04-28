---
id: "esp-115"
title: "On-Machine Probing for Work Offset Setup"
source: "web:esprit-probing"
confidence: 89
category: "quality"
tags: ["probing", "work-offset", "setup", "renishaw"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.531Z
---

# On-Machine Probing for Work Offset Setup

Program Renishaw or Blum probing cycles in ESPRIT to automatically set work offsets (G54-G59). A typical setup probing sequence: (1) probe X-face to set X zero, (2) probe Y-face to set Y zero, (3) probe Z-face to set Z zero, (4) optionally probe two X-faces or Y-faces to determine angular offset for G68 rotation. This replaces manual edge-finding that takes 10-20 minutes per setup with automated probing that takes 1-2 minutes.

**Category:** quality
**Confidence:** 89
**Source:** web:esprit-probing
**Operations:** probing

## Related
- [[edgecam-cam-tips-ec-109|Setup Probing for Automatic Work Offset]]
- [[controller-knowledge-tips-ctrl-091|Haas probing setup requirements and WIPS integration]]
- [[topsolid-cam-tips-ts-109|Setup Probing Automates Part Alignment]]
- [[worknc-cam-tips-wnc-117|Setup Probing Automates Part Alignment]]
- [[camworks-cam-tips-cw-115|Setup Probing — Automatic Work Coordinate Establishment]]
