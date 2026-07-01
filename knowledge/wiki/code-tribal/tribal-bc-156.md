---
name: tribal-bc-156
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["wire-edm", "technology-tables", "cutting-parameters", "calibration", "multi-pass"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-156.md
promoted_at: 2026-06-09T22:31:15.970Z
---

# BobCAD Wire EDM Multi-Pass Technology Table Management

BobCAD stores wire EDM cutting parameters in technology tables indexed by workpiece material, thickness, and wire type. Each table defines the rough cut and skim passes with parameters: power, pulse on/off time, wire tension, wire speed, flushing pressure, and offset. Create custom technology tables for your specific machine by running test cuts on material samples. Store tables with descriptive names: 'D2_50mm_Brass025_4pass'. BobCAD applies the technology table automatically when you specify material/thickness. Calibrate new tables against known-good parts before production use.

**Category:** setup
**Confidence:** 0.87
**Source:** web:bobcad-docs
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[camworks-cam-tips-cw-160|Wire EDM Multi-Pass Strategy — Rough, Skim, and Finish Cuts]]
- [[gibbscam-cam-tips-gc-065|Skim cuts progressively improve surface finish and dimensional accuracy]]
- [[surfcam-cam-tips-sc2-164|SURFCAM Wire EDM Multi-Pass Skim Cut Strategies]]
- [[surfcam-cam-tips-sc2-170|SURFCAM Wire EDM Closed-Loop Adaptive Control Integration]]
