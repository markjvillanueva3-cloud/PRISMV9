---
name: tribal-mc-159
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "bta-drilling", "deep-hole", "through-coolant", "guide-pad", "chip-evacuation"]
confidence: 83
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-159.md
promoted_at: 2026-06-09T22:31:16.434Z
---

# Deep hole BTA drilling requires through-tool coolant programming and guide pad alignment

BTA (Boring and Trepanning Association) drills are designed for holes deeper than 10× diameter, with internal coolant supply and external chip evacuation. In Mastercam, program BTA drilling using a custom drill cycle with the following settings: entry feed at 25% of normal until the guide pads engage (typically 1× diameter depth), then ramp to full feed. Set coolant pressure to maximum (50–100 bar) for through-tool flow. BTA drills do not retract for chip clearing — coolant flushes chips out through the flute. Program spindle speed based on the BTA manufacturer's recommendations (typically 30–50% lower than twist drill speed for the same diameter). Monitor thrust force by programming feed override ramp-down if the control supports it. BTA drilling in Mastercam requires a post processor configured for the specific BTA cycle codes.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:community
**Operations:** drilling, hole_making

## Related
- [[edgecam-cam-tips-ec-159|BTA Drilling Programming for Large Diameter Deep Holes]]
- [[mastercam-cam-tips-mc-046|Dynamic Motion entry helix diameter should be 80-125% of tool diameter]]
- [[mastercam-cam-tips-mc-156|Mastercam Advanced Drill allows per-segment speed, feed, and cycle changes within a single hole]]
- [[mastercam-cam-tips-mc-160|Gun drilling parameters focus on straight-line accuracy and coolant flow for extreme depth ratios]]
- [[mastercam-cam-tips-mc-163|Peck depth optimization balances chip evacuation time against total drill cycle time]]
