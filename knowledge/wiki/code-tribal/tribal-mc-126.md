---
name: tribal-mc-126
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "wire-edm", "no-core", "slug-free", "hardened-material", "parallel-passes"]
confidence: 82
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-126.md
promoted_at: 2026-06-09T22:31:16.426Z
---

# No-core wire EDM cutting eliminates slug handling for large openings

No-core cutting in Mastercam Wire removes material without producing a solid slug by programming multiple parallel passes that erode the entire opening into swarf. This technique is used for large openings where the slug would be too heavy to manage safely or when start holes cannot be drilled (hardened material). Program parallel passes spaced at 1.2–1.5× the kerf width (wire diameter + 2× spark gap) to ensure complete material removal. No-core cutting is 3–5× slower than conventional slug-drop cutting but eliminates manual slug handling. It is ideal for through-hardened die blocks where start hole drilling would risk cracking. Use lower power settings to manage the increased swarf volume and prevent re-welding of particles.

**Category:** cam_strategy
**Confidence:** 82
**Source:** web:community
**Operations:** wire_edm, roughing

## Related
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[mastercam-cam-tips-mc-118|2-axis wire EDM profile cuts require proper lead-in to avoid witness marks on the part]]
