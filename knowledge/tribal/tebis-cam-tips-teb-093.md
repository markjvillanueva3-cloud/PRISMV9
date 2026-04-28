---
id: "teb-093"
title: "Multi-Machine Post Processing from Single Program"
source: "web:tebis-docs"
confidence: 85
category: "setup"
tags: ["multi-machine", "post-processing", "flexibility", "scheduling"]
_source: "tebis-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.291Z
---

# Multi-Machine Post Processing from Single Program

Tebis can post-process the same toolpath for different machines by switching virtual machine configurations. Program once using machine-independent strategies, then post to: DMG DMU 80, Hermle C42, or Makino D500. Each virtual machine applies machine-specific axis naming, RTCP format, and safe retract strategy. This enables flexible job scheduling across the shop floor.

**Category:** setup
**Confidence:** 85
**Source:** web:tebis-docs
**Operations:** post_processing

## Related
- [[cimatron-cam-tips-cim-095|Multi-Machine Post Processing]]
- [[tebis-cam-tips-teb-172|Multi-Machine Post Flexibility]]
- [[powermill-cam-tips-pm-153|Multi-Machine Post-Processing Flexibility]]
- [[sprutcam-cam-tips-spr-144|Multi-Machine Post Flexibility]]
- [[esprit-cam-tips-esp-203|Multi-Machine Job Scheduling Optimization]]
