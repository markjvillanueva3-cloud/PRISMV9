---
name: tribal-ts-147
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["topsolid", "wire-edm", "clamping", "datum", "stress-relief"]
confidence: 88
source: "web:topsolid-docs"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-147.md
promoted_at: 2026-06-09T22:31:16.771Z
---

# TopSolid Wire EDM Workpiece Clamping Strategy — Datum Preservation

Wire EDM workpiece clamping must maintain datum integrity through the cutting process. As cores are removed, the remaining workpiece can shift or distort due to released internal stresses. TopSolid's setup planning includes clamping recommendations: (1) clamp at least 3 points outside the cutting zone, (2) for stress-relieved materials, clamp firmly at 2 points and use a rest support at the third, (3) sequence cuts to maintain maximum connected material during the longest possible time. For high-precision work, stress-relieve the material before Wire EDM to minimize post-cut distortion.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:topsolid-docs
**Operations:** wire_edm

## Related
- [[topsolid-cam-tips-ts-142|TopSolid Wire EDM — Integrated Profile and Technology Management]]
- [[topsolid-cam-tips-ts-143|TopSolid Wire EDM 4-Axis Taper — Independent Upper and Lower Profiles]]
- [[topsolid-cam-tips-ts-144|TopSolid Wire EDM Multi-Pass Sequencing — Automatic Rough-Skim-Finish]]
- [[topsolid-cam-tips-ts-145|TopSolid Wire EDM Tab Management — Prevent Core Drop with Smart Tabs]]
- [[topsolid-cam-tips-ts-146|TopSolid Wire EDM Start Point Optimization — Threading and Path Planning]]
