---
name: tribal-esp-077
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["post-processor", "macro", "parametric", "family-of-parts"]
confidence: 86
source: "web:esprit-post-processor"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-077.md
promoted_at: 2026-06-09T22:31:16.230Z
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
