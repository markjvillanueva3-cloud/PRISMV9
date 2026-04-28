---
id: "ts-149"
title: "TopSolid Wire EDM Material Database — Optimized Parameters per Alloy"
source: "web:topsolid-docs"
confidence: 89
category: "cam_strategy"
tags: ["topsolid", "wire-edm", "material-database", "parameters", "alloy"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.500Z
---

# TopSolid Wire EDM Material Database — Optimized Parameters per Alloy

TopSolid's Wire EDM material database stores cutting parameters optimized for specific alloys: P20 mold steel, D2 tool steel, H13 hot work steel, tungsten carbide, copper-tungsten, aluminum alloys, and titanium. Each material entry includes recommended wire type (brass, zinc-coated, molybdenum), power settings, wire speed, and expected surface finish per number of passes. Using material-specific parameters is critical — cutting D2 hardened (60 HRC) with P20 parameters produces 40% slower cut speed and poor surface finish.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:topsolid-docs
**Operations:** wire_edm

## Related
- [[topsolid-cam-tips-ts-142|TopSolid Wire EDM — Integrated Profile and Technology Management]]
- [[topsolid-cam-tips-ts-143|TopSolid Wire EDM 4-Axis Taper — Independent Upper and Lower Profiles]]
- [[topsolid-cam-tips-ts-144|TopSolid Wire EDM Multi-Pass Sequencing — Automatic Rough-Skim-Finish]]
- [[topsolid-cam-tips-ts-145|TopSolid Wire EDM Tab Management — Prevent Core Drop with Smart Tabs]]
- [[topsolid-cam-tips-ts-146|TopSolid Wire EDM Start Point Optimization — Threading and Path Planning]]
