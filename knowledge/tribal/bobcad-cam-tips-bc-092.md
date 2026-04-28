---
id: "bc-092"
title: "Post Processor Macro Support for Custom Logic"
source: "web:bobcad-post-macros"
confidence: 87
category: "post_processor"
tags: ["post-macros", "conditional-logic", "custom-output", "variables"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.529Z
---

# Post Processor Macro Support for Custom Logic

BobCAD post processors support macro logic for conditional G-code output. Use macros for: automatic tool length measurement at tool change, conditional coolant control based on tool type, custom safe-start blocks, and controller-specific initialization sequences. The macro system supports IF/THEN/ELSE, loop constructs, and variable manipulation. This enables a single post to handle multiple machine configurations through user-selectable options in the posting dialog.

**Category:** post_processor
**Confidence:** 87
**Source:** web:bobcad-post-macros
**Operations:** posting

## Related
- [[surfcam-cam-tips-sc2-210|SURFCAM Post Processor Variable System for Dynamic Output]]
- [[esprit-cam-tips-esp-176|Knowledge Base Conditional Logic for Material-Based Parameter Selection]]
- [[gibbscam-cam-tips-gc-167|Post processor conditional logic handles optional machine features dynamically]]
- [[nx-cam-tips-ext-nx-086|Knowledge Fusion Rules for Conditional CAM Logic]]
- [[surfcam-cam-tips-sc2-070|S-POST with Factory Interface Language for Complex Logic]]
