---
id: "esp-077"
title: "Macro Support for Parametric Operations"
source: "web:esprit-post-processor"
confidence: 86
category: "cam_strategy"
tags: ["post-processor", "macro", "parametric", "family-of-parts"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.500Z
---

# Macro Support for Parametric Operations

ESPRIT supports macro output (Fanuc Custom Macro B, Siemens cycles, Heidenhain Q-parameters) for parametric operations. Define macro variables (#100-#199 on Fanuc) for stock diameter, part length, or feature dimensions, and the posted program adapts without reprogramming. This is essential for family-of-parts production where the same operations apply to different sizes. ESPRIT maps its internal parameters to controller-specific macro variable syntax.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:esprit-post-processor
**Operations:** post_processing

## Related
- [[edgecam-cam-tips-ec-079|Macro Output for Parametric Programs]]
- [[gibbscam-cam-tips-gc-081|Macro variable output enables parametric programs for part families]]
- [[topsolid-cam-tips-ts-072|Custom Macro Support for Probing and Special Cycles]]
- [[worknc-cam-tips-wnc-064|Custom Macro Support for Probing and Special Cycles]]
- [[gibbscam-cam-tips-gc-092|Parametric geometry with macros creates part families from variable dimensions]]
