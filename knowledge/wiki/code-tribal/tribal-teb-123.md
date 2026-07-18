---
name: tribal-teb-123
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["drilling", "feature-recognition", "canned-cycles", "automation"]
confidence: 86
source: "web:tebis-docs"
promoted_from: knowledge/tribal/tebis-cam-tips-teb-123.md
promoted_at: 2026-06-09T22:31:16.732Z
---

# Feature-Based Drilling with Automatic Cycle Selection

Tebis recognizes hole features from the 3D model: through, blind, countersink, counterbore, tapped. After recognition, assign drilling strategies in batch. Set recognition tolerance to 0.01mm. Sort features by diameter to optimize tool changes. Assign canned cycles automatically: G81 for through, G83 peck for deep, G84 for tapping. Review — filleted pockets occasionally misidentified.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:tebis-docs
**Operations:** drilling

## Related
- [[cimatron-cam-tips-cim-008|Automatic Feature Recognition for Drilling]]
- [[powermill-cam-tips-pm-058|Feature Recognition for Automated Hole Machining]]
- [[worknc-cam-tips-wnc-195|WorkNC Feature Recognition — Automatic Hole Pattern Detection]]
- [[cimatron-cam-tips-cim-086|Feature Recognition for Automated Hole Programming]]
- [[bobcad-cam-tips-bc-049|Center Drilling and Canned Cycle Mapping]]
