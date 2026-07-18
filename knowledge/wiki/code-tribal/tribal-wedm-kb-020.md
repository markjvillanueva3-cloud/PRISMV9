---
name: tribal-wedm-kb-020
category: code-tribal
subdomain: machining
domain: tribal-knowledge
tags: ["wire-edm", "taper", "uv-axis", "g-code", "arc", "linear"]
confidence: 92
source: "program:noze_test"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-kb-020.md
promoted_at: 2026-05-26T16:07:21.287Z
---

# UV taper only on G1 lines — G2/G3 arcs are straight

In standard WEDM taper programming, UV offset (taper) applies ONLY to G1 (linear) moves. G2/G3 arc moves are cut with UV=0 (straight). This is the correct behavior — a tapered arc would require 5-axis simultaneous interpolation that most WEDM machines cannot do. If the part requires tapered arcs, approximate them with short G1 segments (0.1-0.5mm chord) with linear UV interpolation. The NOZE TEST program demonstrates this: UV appears only on G1 blocks.

**Category:** machining
**Confidence:** 92
**Source:** program:noze_test
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
- [[camworks-cam-tips-cw-161|Wire EDM Taper Cutting — Die Clearance and Draft Angles]]
- [[esprit-cam-tips-esp-154|Wire EDM 4-Axis Taper Cutting with Independent UV Motion]]
- [[mastercam-cam-tips-mc-119|4-axis taper wire EDM requires synchronized upper/lower guide geometry]]
