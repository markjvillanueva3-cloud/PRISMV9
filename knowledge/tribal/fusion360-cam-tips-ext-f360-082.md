---
id: "f360-082"
title: "Custom Post Properties for Shop-Specific Behavior"
source: "web:fusion360-docs"
confidence: 85
category: "post_processor"
tags: ["fusion360", "post-properties", "customization", "shop-standard", "toggles"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.691Z
---

# Custom Post Properties for Shop-Specific Behavior

Add custom properties to your post processor's propertyDefinitions section to expose shop-specific toggles in the Post Process dialog. Common examples: outputCoolantType (flood/mist/through-spindle), useSubPrograms (boolean), safeRetractMode (clearance plane vs machine home), and programNumberStart (integer). This lets operators adjust output behavior without editing post code — reducing errors and making the same post usable across similar machines with different options.

**Category:** post_processor
**Confidence:** 85
**Source:** web:fusion360-docs
**Operations:** post_processing

## Related
- [[fusion360-cam-tips-ext-f360-175|Custom Post Processor Development in JavaScript]]
- [[fusion360-cam-tips-ext-f360-040|Fine-Tune Optimal Load by Material Hardness]]
- [[fusion360-cam-tips-ext-f360-041|Multi-Depth Adaptive with Progressive Stepdown]]
- [[fusion360-cam-tips-ext-f360-042|Rest Machining Adaptive with Tight Tolerance Overlap]]
- [[fusion360-cam-tips-ext-f360-043|Separate Radial and Axial Stock-to-Leave for Adaptive]]
