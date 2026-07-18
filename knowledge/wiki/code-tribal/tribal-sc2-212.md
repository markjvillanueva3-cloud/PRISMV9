---
name: tribal-sc2-212
category: code-tribal
subdomain: post_processing
domain: tribal-knowledge
tags: ["post-processor", "canned-cycles", "drilling", "g83", "controller-specific"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-212.md
promoted_at: 2026-06-09T22:31:16.706Z
---

# SURFCAM Post Processor Canned Cycle Customization

Customize SURFCAM's canned cycle output for machine-specific drilling formats. Standard canned cycles (G81-G89 for Fanuc) may differ on other controllers. Map SURFCAM's internal drill types to the target controller's cycles: spot drill→G81, peck drill→G83, boring→G85, back bore→G87. For controllers without standard canned cycles (some Siemens 840D configurations), expand canned cycles into discrete G01/G00 moves in the post. Define the retract plane behavior (G98/G99) and the peck increment format (Q value vs incremental depth). Always test chip-break peck (G73) vs full-retract peck (G83) output.

**Category:** post_processing
**Confidence:** 0.87
**Source:** web:surfcam-docs
**Operations:** drilling

## Related
- [[camworks-cam-tips-cw-087|Canned Cycle Output — Map Operations to Controller Drill Cycles]]
- [[edgecam-cam-tips-ec-076|Canned Cycle Output for Standard Operations]]
- [[esprit-cam-tips-esp-074|Canned Cycle Output for Standard Hole Operations]]
- [[gibbscam-cam-tips-gc-078|Canned cycle output from post maps GibbsCAM operations to G81/G83/G84]]
- [[topsolid-cam-tips-ts-069|Canned Cycle Output for Drilling Operations]]
