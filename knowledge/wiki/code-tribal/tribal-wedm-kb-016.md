---
name: tribal-wedm-kb-016
category: code-tribal
subdomain: troubleshooting
domain: tribal-knowledge
tags: ["wire-edm", "thick-section", "thermal-distortion", "stress-relief", "dimensional-accuracy"]
confidence: 91
source: "handbook:klocke_2013_ch8"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-kb-016.md
promoted_at: 2026-05-26T16:07:21.282Z
---

# Thermal distortion in thick sections: stress relief first

When wire-cutting thick hardened steel (>75mm), residual stresses from heat treatment cause the cut to open or close during machining. The part literally moves while you're cutting it — the wire follows a straight path but the part shifts. Mitigation: (1) stress-relieve before WEDM (sub-critical anneal at 550°C for 2h for D2/A2), (2) leave 0.5mm stock and let the part 'breathe' after rough cut, (3) re-reference before skim passes. This is the #1 cause of dimensional errors in thick WEDM work.

**Category:** troubleshooting
**Confidence:** 91
**Source:** handbook:klocke_2013_ch8
**Operations:** wire_edm

## Related
- [[topsolid-cam-tips-ts-147|TopSolid Wire EDM Workpiece Clamping Strategy — Datum Preservation]]
- [[wedm-knowledge-tips-wedm-kb-004|Flush pressure prevents wire breaks in deep cuts]]
- [[wedm-knowledge-tips-wedm-kb-013|Thick section (>50mm): flushing efficiency degrades as 1/sqrt(thickness)]]
- [[wedm-knowledge-tips-wedm-kb-014|Thick sections need voltage compensation]]
- [[wedm-knowledge-tips-wedm-kb-015|Maximum practical WEDM thickness depends on wire type]]
