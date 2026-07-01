---
name: tribal-f360-157
category: code-tribal
subdomain: simulation
domain: tribal-knowledge
tags: ["fusion360", "stock-simulation", "deviation-mapping", "rest-machining", "compare"]
confidence: 0
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-157.md
promoted_at: 2026-06-09T22:31:16.290Z
---

# Stock Simulation for Remaining Material Analysis

After running stock simulation, use the Compare function to overlay the simulated machined part against the design model. Color-coded deviation mapping shows: green for within tolerance, red for excess material (stock left behind), blue for gouges (overcut). Focus on red zones near corners and fillets where the tool radius prevents full material removal — these areas need rest machining operations. For mold and die work, verify the deviation is within the polishing allowance (typically 0.01-0.03mm). Export the deviation report as HTML for quality documentation.

**Category:** simulation
**Confidence:** 0.88
**Source:** web:fusion360-docs
**Operations:** general

## Related
- [[fusion360-cam-tips-ext-f360-042|Rest Machining Adaptive with Tight Tolerance Overlap]]
- [[solidcam-cam-tips-sc-176-2|Progressive Rest Machining]]
- [[fusion360-cam-tips-ext-f360-040|Fine-Tune Optimal Load by Material Hardness]]
- [[fusion360-cam-tips-ext-f360-041|Multi-Depth Adaptive with Progressive Stepdown]]
- [[fusion360-cam-tips-ext-f360-043|Separate Radial and Axial Stock-to-Leave for Adaptive]]
