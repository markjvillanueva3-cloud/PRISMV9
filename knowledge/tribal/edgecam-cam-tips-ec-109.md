---
id: "ec-109"
title: "Setup Probing for Automatic Work Offset"
source: "web:edgecam-probing"
confidence: 89
category: "quality"
tags: ["probing", "work-offset", "setup", "renishaw"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.337Z
---

# Setup Probing for Automatic Work Offset

Program probing cycles in Edgecam to automatically set work offsets (G54-G59). Typical sequence: probe X-face, Y-face, Z-face for datum, optionally probe two faces for angular offset (G68 rotation). Edgecam supports Renishaw and M&H (now Hexagon) probes with six measuring cycles. Automated probing replaces 10-20 minute manual edge-finding with 1-2 minute automated cycles. Essential for reducing setup time on short-run production.

**Category:** quality
**Confidence:** 89
**Source:** web:edgecam-probing
**Operations:** probing

## Related
- [[esprit-cam-tips-esp-115|On-Machine Probing for Work Offset Setup]]
- [[controller-knowledge-tips-ctrl-091|Haas probing setup requirements and WIPS integration]]
- [[topsolid-cam-tips-ts-109|Setup Probing Automates Part Alignment]]
- [[worknc-cam-tips-wnc-117|Setup Probing Automates Part Alignment]]
- [[camworks-cam-tips-cw-115|Setup Probing — Automatic Work Coordinate Establishment]]
