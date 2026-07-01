---
name: tribal-spr-013
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["post-processor", "lua", "customization", "sppx"]
confidence: 0
source: "web:sprutcam-docs"
promoted_from: knowledge/tribal/sprutcam-cam-tips-spr-013.md
promoted_at: 2026-06-09T22:31:16.622Z
---

# Post Processor Customization with SprutCAM Post System

SprutCAM uses a Lua-based post processor system. Common customizations: add custom M-codes for coolant/clamping, modify canned cycle output format, add tool length measurement macros, configure multi-channel output for Swiss machines. Test with 'Post Debug' mode which shows Lua execution alongside G-code output. Back up .sppx files before modifying — there's no undo in the post editor.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:sprutcam-docs
**Operations:** post_processing

## Related
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
- [[catia-cam-tips-cat-187|IMS Script Custom Cycles for CATIA Post Processing]]
- [[cimatron-cam-tips-cim-021|Post Processor Customization for Machine Controllers]]
- [[edgecam-cam-tips-ec-074|Code Wizard for Custom Post Processor Creation]]
- [[esprit-cam-tips-esp-072|Post Processor Customization with ESPRIT's Post Engine]]
