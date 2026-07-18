---
name: tribal-cw-163
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "wire-edm", "start-hole", "pre-drill", "optimization"]
confidence: 89
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-163.md
promoted_at: 2026-06-09T22:31:16.021Z
---

# Wire EDM Start Hole Optimization — Minimize Pre-Drilling

Wire EDM requires a start hole for the wire to thread through. CAMWorks optimizes start hole placement: (1) place start holes in scrap areas to avoid witness marks, (2) chain multiple profiles from a single start hole when geometry allows, (3) use existing features (bolt holes) as start points. Minimum start hole diameter is wire diameter + 0.2mm (typically 0.45mm for 0.25mm wire). For hardened parts, pre-drill start holes before heat treatment — EDM drilling into hardened material is slow and expensive.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:camworks-docs
**Operations:** wire_edm

## Related
- [[camworks-cam-tips-cw-073|2-Axis Wire EDM — Profile Cutting with Automatic Feature Detection]]
- [[camworks-cam-tips-cw-074|4-Axis Wire EDM Taper — Independent Upper and Lower Profiles]]
- [[camworks-cam-tips-cw-075|Skim Cuts — Multi-Pass Wire EDM for Surface Finish and Accuracy]]
- [[camworks-cam-tips-cw-076|No-Core Cutting — Eliminate Slug Drop for Small and Fragile Features]]
- [[camworks-cam-tips-cw-077|Wire Threading Strategy — Automatic Re-Threading for Multi-Opening Parts]]
