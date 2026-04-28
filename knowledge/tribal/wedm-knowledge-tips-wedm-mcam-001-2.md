---
id: "wedm-mcam-001"
title: "Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0"
source: "mastercam_wire_tutorial:page13"
confidence: 90
category: "programming"
tags: ["wire-edm", "overburn", "wire-offset", "multi-pass", "skim", "mastercam", "compensation"]
_source: "wedm-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:44.605Z
---

# Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0

In multi-pass Wire EDM, the wire overburn (kerf compensation beyond wire radius) decreases with each pass. Mastercam Wire default progression for 0.20mm wire on steel: Pass 1 (rough) = 0.035mm overburn, Pass 2 (first skim) = 0.02mm, Pass 3 (second skim) = 0.01mm, Pass 4 (final skim) = 0mm. Rationale: rough pass removes bulk material with large craters → larger overburn accounts for rougher kerf wall. Each skim removes less material with smaller craters, so overburn decreases. Final pass targets finished size with zero overburn. This progression is baked into Mastercam TECH libraries. If manually programming, follow this reduction pattern.

**Category:** programming
**Confidence:** 90
**Source:** mastercam_wire_tutorial:page13
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[camworks-cam-tips-cw-160|Wire EDM Multi-Pass Strategy — Rough, Skim, and Finish Cuts]]
- [[topsolid-cam-tips-ts-144|TopSolid Wire EDM Multi-Pass Sequencing — Automatic Rough-Skim-Finish]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
