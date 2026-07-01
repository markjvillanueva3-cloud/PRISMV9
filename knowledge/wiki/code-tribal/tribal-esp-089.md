---
name: tribal-esp-089
category: code-tribal
subdomain: automation
domain: tribal-knowledge
tags: ["feature-recognition", "solid-model", "automatic", "identification"]
confidence: 88
source: "web:esprit-automation"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-089.md
promoted_at: 2026-06-09T22:31:16.233Z
---

# Automatic Feature Recognition from Solid Models

ESPRIT's feature recognition scans solid models to automatically identify machinable features: holes (through, blind, tapped, countersunk), pockets (open, closed), slots, faces, bosses, and freeform surfaces. Each recognized feature includes geometric parameters (depth, width, radius, angle) that KBM rules use to assign machining operations. Accuracy depends on model quality — ensure models have proper fillets, draft angles, and no degenerate surfaces. Recognize features before manual programming to avoid missing hidden features.

**Category:** automation
**Confidence:** 88
**Source:** web:esprit-automation
**Operations:** all

## Related
- [[mastercam-cam-tips-mc-107|FBM Drill automatically identifies and programs all hole features from solid model]]
- [[bobcad-cam-tips-bc-070|Feature Recognition for Automated Operation Suggestion]]
- [[edgecam-cam-tips-ec-055|Feature Recognition Feeds Strategy Manager]]
- [[surfcam-cam-tips-sc2-106|Feature Recognition for Automatic Operation Creation]]
- [[surfcam-cam-tips-sc2-134|SURFCAM 2023 Automatic Feature Recognition from Solid Models]]
