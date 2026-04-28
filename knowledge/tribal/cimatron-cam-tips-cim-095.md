---
id: "cim-095"
title: "Multi-Machine Post Processing"
source: "web:cimatron-docs"
confidence: 0.85
category: "cam_strategy"
tags: ["multi-machine", "post-processing", "flexibility", "scheduling"]
_source: "cimatron-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.056Z
---

# Multi-Machine Post Processing

Post-process the same toolpath for different machines by switching post configurations. Program once with machine-independent strategies, then post for DMG, Hermle, Makino, etc. Each post applies machine-specific axis naming, RTCP format, and retract strategy. Enables flexible job scheduling — if one machine is occupied, quickly re-post for an available machine.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:cimatron-docs
**Operations:** post_processing

## Related
- [[tebis-cam-tips-teb-093|Multi-Machine Post Processing from Single Program]]
- [[tebis-cam-tips-teb-172|Multi-Machine Post Flexibility]]
- [[powermill-cam-tips-pm-153|Multi-Machine Post-Processing Flexibility]]
- [[sprutcam-cam-tips-spr-144|Multi-Machine Post Flexibility]]
- [[esprit-cam-tips-esp-203|Multi-Machine Job Scheduling Optimization]]
