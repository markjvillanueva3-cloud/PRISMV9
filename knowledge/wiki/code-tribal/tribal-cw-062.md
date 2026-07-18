---
name: tribal-cw-062
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "solidworks", "multi-body", "fixture", "setup"]
confidence: 86
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-062.md
promoted_at: 2026-06-09T22:31:16.000Z
---

# Multi-Body Part Machining — Separate Operations per Solid Body

SOLIDWORKS multi-body parts allow multiple solids in one file. CAMWorks machines each body independently or together depending on setup. For progressive machining (machine body 1 first, then body 2 references body 1), create separate setups per body with appropriate stock definitions. Use the 'Combine Bodies' feature in SOLIDWORKS if bodies share machining operations. Multi-body is powerful for fixture design — machine the fixture and part in the same CAMWorks session.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:camworks-docs
**Operations:** milling

## Related
- [[camworks-cam-tips-cw-057|Configuration Management — Separate CAM Setups per SOLIDWORKS Config]]
- [[camworks-cam-tips-cw-059|Weldment Machining — Handle Multi-Body Parts and Weldment Profiles]]
- [[camworks-cam-tips-cw-156|SOLIDWORKS Assembly Machining — Fixture and Multi-Part Setups]]
- [[camworks-cam-tips-cw-158|SOLIDWORKS Configurations — One Model, Multiple CAM Setups]]
- [[camworks-cam-tips-cw-055|Associative Machining — Automatic Toolpath Update on Design Changes]]
