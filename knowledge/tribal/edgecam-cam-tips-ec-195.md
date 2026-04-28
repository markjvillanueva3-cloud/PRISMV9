---
id: "ec-195"
title: "Bar Feeder Integration with Part Counter"
source: "web:edgecam-docs"
confidence: 0.83
category: "cam_strategy"
tags: ["bar-feeder", "part-counter", "automation", "post-processor"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.419Z
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
