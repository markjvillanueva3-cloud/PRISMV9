---
name: tribal-sc2-062
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "open-profile", "notch", "slot", "wire-kerf"]
confidence: 86
source: "web:surfcam-wire-edm-open"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-062.md
promoted_at: 2026-06-09T22:31:16.674Z
---

# Wire EDM Open-Profile Cutting for Notches and Slots

SURFCAM Wire EDM open-profile cutting machines notches, slots, and edge features without a start hole — the wire enters from the stock edge. Program the approach path perpendicular to the stock edge with 2mm lead-in. For thin slots, use a single-pass strategy with reduced power to minimize wire deflection. Set the wire offset based on the target width accuracy — typical wire kerf is the wire diameter plus 2x the discharge gap (0.25mm wire + 2x0.015mm gap = 0.28mm total kerf).

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:surfcam-wire-edm-open
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
- [[bobcad-cam-tips-bc-159|BobCAD Wire EDM Open Profile and Partial Cut Strategies]]
- [[mastercam-cam-tips-mc-125|Open profile wire EDM cuts require extra stock and careful start/end positioning]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
