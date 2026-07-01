---
name: tribal-ec-195
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["bar-feeder", "part-counter", "automation", "post-processor"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-195.md
promoted_at: 2026-06-09T22:31:16.207Z
---

# Bar Feeder Integration with Part Counter

Configure Edgecam's post processor for bar feeder integration with automatic part counting. The post tracks parts machined per bar using a counter variable. When count × (part_length + cutoff_width) approaches bar length minus remnant, output the bar-end sequence: machine last part, eject remnant (M-code), feed new bar (M-code), reset counter. Set the remnant length to match your collet grip length plus 5-10mm safety margin. The post calculates available parts per bar and manages the transition automatically.

**Category:** cam_strategy
**Confidence:** 0.83
**Source:** web:edgecam-docs
**Operations:** turning

## Related
- [[bobcad-cam-tips-bc-060|Bar Feeder Integration for Lights-Out Production]]
- [[mastercam-cam-tips-mc-291|Mastercam Code Expert post processor customization automates post modifications without PST file editing]]
- [[camworks-cam-tips-cw-165|Swiss-Type Lathe Programming — Guide Bushing and Bar Feeder Control]]
- [[catia-cam-tips-cat-156|CATIA Lathe Sub-Spindle Transfer and Bar-Feeder Programming]]
- [[edgecam-cam-tips-ec-196|Bar Feeder Facing Stock Optimization]]
