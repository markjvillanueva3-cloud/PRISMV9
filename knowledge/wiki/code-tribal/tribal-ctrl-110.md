---
name: tribal-ctrl-110
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "sodick", "EDM", "linear-motor", "wire-EDM", "sinker-EDM"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-110.md
promoted_at: 2026-06-09T22:31:16.158Z
---

# Sodick EDM linear motor and programming considerations

All modern Sodick EDMs use linear motors on all axes (no ballscrews), providing zero backlash and superior positioning accuracy critical for EDM precision. When programming Sodick wire EDM, the LN Professional offers automatic programming with shape pattern libraries covering common die/mold geometries. For sinker EDM, electrode orbiting patterns and Z-depth control are managed by the technology database. Key tip: when setting up scheduled operations (unattended multi-electrode jobs), use the LN Professional's built-in scheduling function rather than external systems — it coordinates electrode changes with the technology database for optimal sequencing. The CF card storage is standard for program backup. API access to LN Professional engines enables integration with external CAD/CAM and automation systems.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[controller-knowledge-tips-ctrl-046|Sodick LN Professional for wire EDM]]
- [[mastercam-cam-tips-mc-142|Electrode creation from solid bodies automates EDM electrode design and machining]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
