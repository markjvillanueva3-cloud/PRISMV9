---
name: tribal-ec-077
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["post-processor", "machine-specific", "configuration", "controller"]
confidence: 88
source: "web:edgecam-post"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-077.md
promoted_at: 2026-06-09T22:31:16.177Z
---

# Machine-Specific Post Configuration

Always configure the post processor for the specific machine model, not just the controller brand. Even machines with the same controller (e.g., Fanuc 31i) may have different: tool change positions, work offset ranges, axis naming conventions, and optional features. Edgecam's post library includes machine-specific posts for major brands (DMG, Mazak, Haas, Okuma, Makino). Customize from the machine-specific post, not the generic controller post.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:edgecam-post
**Operations:** post_processing

## Related
- [[controller-knowledge-tips-ctrl-078|SINUMERIK Post-Processor Configuration Essentials]]
- [[esprit-cam-tips-esp-073|Machine-Specific G-Code Output Optimization]]
- [[topsolid-cam-tips-ts-071|Machine-Specific Post Handles Unique Controller Features]]
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
- [[camworks-cam-tips-cw-086|Multi-Axis Post Processors — Handle Rotary Axis Output Correctly]]
