---
name: tribal-bc-149
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mill-turn", "thread-chasing", "synchronized", "infeed", "g76"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-149.md
promoted_at: 2026-06-09T22:31:15.968Z
---

# BobCAD Mill-Turn Thread Chasing with Synchronized Spindle

BobCAD programs single-point thread chasing on mill-turn machines using spindle-synchronized feed. The C-axis encoder provides the angular position reference for thread start synchronization. Program multiple passes with decreasing infeed: 0.15mm first pass down to 0.02mm final pass for a 1.5mm pitch thread. Use modified flank infeed (29.5° for 60° threads) to reduce cutting force and improve thread finish. Set thread chamfer at entry (1-2 pitches) and exit (1 pitch) for smooth thread lead-in/out. The post outputs G76/G32 depending on the control type.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:bobcad-docs
**Operations:** turning, threading

## Related
- [[edgecam-cam-tips-ec-198|Power Skiving Programming for Internal Gears]]
- [[bobcad-cam-tips-bc-046|Threading with Multi-Pass Infeed and Spring Passes]]
- [[bobcad-cam-tips-bc-053|C-Axis Milling on Turning Centers]]
- [[bobcad-cam-tips-bc-054|Y-Axis Milling for Off-Center Features]]
- [[bobcad-cam-tips-bc-082|Collision Detection for Tool Assembly and Fixtures]]
