---
id: "pm-071"
title: "Multi-Setup Coordinate System Alignment"
source: "web:powermill-docs"
confidence: 0.87
category: "cam_strategy"
tags: ["multi-setup", "alignment", "datum", "probing"]
_source: "powermill-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.582Z
---

# Multi-Setup Coordinate System Alignment

For multi-setup parts, define a master coordinate system shared across all setups. Each setup workplane references the master datum. Use probing routines at the start of each setup to verify alignment. PowerMill's 'Setup Sheet' includes datum locations for each workplane. When machining both sides, use precision dowel pins or 3-2-1 locating to ensure Setup 2 aligns with features machined in Setup 1.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:powermill-docs
**Operations:** setup

## Related
- [[powermill-cam-tips-pm-139|Multi-Setup Alignment with Probing]]
- [[sprutcam-cam-tips-spr-155|Multi-Setup Alignment with Probing]]
- [[tebis-cam-tips-teb-126|Multi-Setup Coordinate System Alignment]]
- [[tebis-cam-tips-teb-184|Multi-Setup Alignment with Precision Datums]]
- [[catia-cam-tips-cat-184|In-Process Probing Between Setups for Alignment Verification]]
