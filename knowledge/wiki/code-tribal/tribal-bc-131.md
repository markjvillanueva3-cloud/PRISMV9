---
name: tribal-bc-131
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["v37", "afr", "feature-recognition", "hole-patterns", "automation"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-131.md
promoted_at: 2026-06-09T22:31:15.964Z
---

# BobCAD V37 Automatic Feature Recognition for Hole Patterns

BobCAD V37's AFR engine automatically identifies holes, counterbores, countersinks, and tapped holes from imported solid models. It groups identical holes and proposes drill cycles with appropriate tools. AFR detects hole diameter, depth, bottom type (flat/point), and thread specifications from the model geometry. Review AFR results for blind holes — the system may misidentify the bottom geometry. For complex hole patterns with mixed sizes, AFR saves 60-80% of programming time by eliminating manual hole selection and cycle assignment.

**Category:** setup
**Confidence:** 0.88
**Source:** web:bobcad-docs
**Operations:** drilling

## Related
- [[camworks-cam-tips-cw-001|AFR Machinable Feature Detection — Let CAMWorks Analyze the Solid Model]]
- [[esprit-cam-tips-esp-175|ESPRIT Knowledge Base Rules for Automated Feature Recognition]]
- [[gibbscam-cam-tips-gc-091|Automatic Feature Recognition identifies holes with minimal user input]]
- [[surfcam-cam-tips-sc2-134|SURFCAM 2023 Automatic Feature Recognition from Solid Models]]
- [[topsolid-cam-tips-ts-005|Feature-Driven Machining Auto-Recognizes Machinable Shapes]]
