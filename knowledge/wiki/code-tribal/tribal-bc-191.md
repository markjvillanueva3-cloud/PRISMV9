---
name: tribal-bc-191
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["composite", "honeycomb", "nomex", "ultrasonic-knife", "vacuum-fixture"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-191.md
promoted_at: 2026-06-09T22:31:15.979Z
---

# BobCAD Honeycomb Core Machining Strategies

Machine honeycomb core materials (Nomex, aluminum) in BobCAD using specialized strategies that prevent cell wall crushing. Use ultrasonic knife tools for Nomex core — define the knife geometry in BobCAD's tool library with zero rake angle. Feed rates: 1000-3000 mm/min for Nomex, 500-1500 mm/min for aluminum honeycomb. For conventional end mill machining of aluminum honeycomb, use high RPM (15,000+) with very light radial engagement (<0.5mm) to cut cell walls without crushing them. Down-cut (climb) milling pushes cells into the adhesive bond line, reducing tear-out. Vacuum fixturing is essential.

**Category:** cam_strategy
**Confidence:** 0.83
**Source:** web:bobcad-docs
**Operations:** contouring, trimming

## Related
- [[surfcam-cam-tips-sc2-174|SURFCAM Honeycomb Core Machining with Ultrasonic Knife]]
- [[edgecam-cam-tips-ec-166|Honeycomb Core Machining with Vacuum Fixturing]]
- [[fusion360-cam-tips-ext-f360-185|Honeycomb Core Machining Strategy]]
- [[catia-cam-tips-cat-207|Honeycomb Core Machining with Ultrasonic-Assisted Cutting in CATIA]]
- [[gibbscam-cam-tips-gc-184|GibbsCAM honeycomb core machining uses ultrasonic knife tools on 5-axis routers]]
