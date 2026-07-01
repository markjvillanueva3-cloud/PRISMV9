---
name: tribal-sc2-113
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["multi-setup", "stock-transfer", "op10-op20", "re-clamping"]
confidence: 88
source: "web:surfcam-multi-setup"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-113.md
promoted_at: 2026-06-09T22:31:16.684Z
---

# Multi-Setup Operations with Stock Transfer Between Setups

SURFCAM multi-setup programming defines separate setups (Op10, Op20, etc.) within a single part file, each with its own WCS, fixtures, and operations. The stock model from Setup 1 carries forward as the starting stock for Setup 2, ensuring rest machining in Setup 2 accounts for material already removed. Always add 0.1mm re-clamping stock allowance on Setup 1 features that will be finish-machined in Setup 2 to account for positioning error during part flip.

**Category:** setup
**Confidence:** 88
**Source:** web:surfcam-multi-setup
**Operations:** setup

## Related
- [[catia-cam-tips-cat-182|Stock Transfer Between Setups with Intermediate Stock Bodies]]
- [[mastercam-cam-tips-mc-203|Multiple machine groups in one file enable multi-setup programming with coordinated fixtures]]
- [[topsolid-cam-tips-ts-010|Multi-Setup Machining in a Single Project Document]]
- [[worknc-cam-tips-wnc-198|WorkNC Multi-Setup Management — Automatic Work Coordinate Transfer]]
- [[bobcad-cam-tips-bc-083|Stock Model Tracking Across Operations]]
