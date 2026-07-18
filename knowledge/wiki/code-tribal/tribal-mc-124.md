---
name: tribal-mc-124
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "wire-edm", "slug-management", "tabs", "wire-break", "retention"]
confidence: 85
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-124.md
promoted_at: 2026-06-09T22:31:16.426Z
---

# Slug management in wire EDM prevents loose slugs from shorting the wire

When wire EDM cuts a closed profile, the interior slug drops free and can contact the wire, causing a short and wire break. Mastercam Wire provides several slug retention strategies: (1) Tab cuts — leave 2–4 small tabs (0.3–0.5 mm wide) connecting the slug to the parent material, then snap off tabs manually after cutting; (2) Glue stop — program a pause point where the operator applies adhesive to hold the slug; (3) Slug retainer — use a magnetic or vacuum slug holder below the workpiece. For unmanned operation, tabs are the safest approach. Place tabs at non-critical locations and program a secondary pass to remove tab remnants during skim cuts. Tab height should match the workpiece thickness for full retention.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:community
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
- [[surfcam-cam-tips-sc2-061|Slug Management with Tab and Bridge Strategies]]
