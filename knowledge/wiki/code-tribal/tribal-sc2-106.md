---
name: tribal-sc2-106
category: code-tribal
subdomain: automation
domain: tribal-knowledge
tags: ["feature-recognition", "automatic", "hole-detection", "pocket-detection"]
confidence: 85
source: "web:surfcam-feature-recognition"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-106.md
promoted_at: 2026-06-09T22:31:16.683Z
---

# Feature Recognition for Automatic Operation Creation

SURFCAM feature recognition (in newer versions) scans the solid model and identifies machinable features: holes (through, blind, countersunk), pockets (open, closed), slots, bosses, and chamfers. Each recognized feature is assigned a recommended machining sequence (drill → tap, rough → finish, etc.) with appropriate tools from the library. Review the auto-generated operations for correctness — complex features with multiple interpretations may require manual adjustment.

**Category:** automation
**Confidence:** 85
**Source:** web:surfcam-feature-recognition
**Operations:** setup

## Related
- [[bobcad-cam-tips-bc-070|Feature Recognition for Automated Operation Suggestion]]
- [[esprit-cam-tips-esp-089|Automatic Feature Recognition from Solid Models]]
- [[gibbscam-cam-tips-gc-091|Automatic Feature Recognition identifies holes with minimal user input]]
- [[mastercam-cam-tips-mc-107|FBM Drill automatically identifies and programs all hole features from solid model]]
- [[topsolid-cam-tips-ts-080|Feature Recognition Drives Automatic Operation Assignment]]
