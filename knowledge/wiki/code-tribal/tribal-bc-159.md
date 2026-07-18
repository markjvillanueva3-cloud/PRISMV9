---
name: tribal-bc-159
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "open-profile", "slot-cutting", "partial-cut", "edge-approach"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-159.md
promoted_at: 2026-06-09T22:31:15.971Z
---

# BobCAD Wire EDM Open Profile and Partial Cut Strategies

BobCAD programs open-profile wire EDM cuts for features like slots, external contours, and partial shapes where the wire enters from one edge and exits from another (or the same) edge. Set the profile type to 'Open' and define the start/end points on the workpiece boundary. The wire approaches from outside the stock, cuts along the open profile, and retracts. For thin slots, use skim cuts on both sides of the wire path to achieve the final slot width. Open-profile cuts don't produce a slug, simplifying the process. Set the lead-in/out paths to clear the workpiece edge by at least 3mm.

**Category:** cam_strategy
**Confidence:** 0.84
**Source:** web:bobcad-docs
**Operations:** wire_edm

## Related
- [[bobcad-cam-tips-bc-155|BobCAD Wire EDM No-Core Cutting Strategy]]
- [[mastercam-cam-tips-mc-125|Open profile wire EDM cuts require extra stock and careful start/end positioning]]
- [[surfcam-cam-tips-sc2-062|Wire EDM Open-Profile Cutting for Notches and Slots]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
