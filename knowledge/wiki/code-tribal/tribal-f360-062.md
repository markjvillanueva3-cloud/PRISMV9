---
name: tribal-f360-062
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["fusion360", "3+2", "wcs", "indexed", "work-offset"]
confidence: 87
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-062.md
promoted_at: 2026-06-09T22:31:16.267Z
---

# 3+2 Indexed Machining with WCS Per Orientation

When programming 3+2 indexed operations, create a separate WCS (Work Coordinate System) for each tool orientation. In Fusion, use the Setup dialog to define the orientation by selecting a face or entering A/B/C angles. Each orientation gets its own G54-G59 offset on the machine. Limit the total number of orientations to 4-6 per setup — more than that increases cycle time from indexing moves and raises the risk of accumulating angular positioning errors.

**Category:** setup
**Confidence:** 87
**Source:** web:fusion360-docs
**Operations:** multiaxis_3plus2

## Related
- [[fusion360-cam-tips-ext-f360-091|WCS Probing to Establish Part Zero Automatically]]
- [[fusion360-cam-tips-ext-f360-135|3+2 Indexed Multi-Face Machining Setup]]
- [[bobcad-cam-tips-bc-034|Indexed 3+2 Machining for Multi-Face Prismatic Parts]]
- [[camworks-cam-tips-cw-046|3+2 Indexed Machining — Fixed Orientation for Rigidity and Accuracy]]
- [[controller-knowledge-tips-ctrl-066|CYCLE800 Swivel Plane for 3+2 Axis Positioning]]
