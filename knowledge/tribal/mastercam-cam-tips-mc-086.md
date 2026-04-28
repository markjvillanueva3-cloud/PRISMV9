---
id: "mc-086"
title: "PST subroutine psof initializes program header and first tool change"
source: "web:mastercam-docs"
confidence: 87
category: "post_processor"
tags: ["mastercam", "pst", "psof", "safety-line", "header", "modal-state"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.175Z
---

# PST subroutine psof initializes program header and first tool change

The psof (start of file) subroutine in Mastercam's MP post language controls the program header output: safety line (G90 G80 G40 G17), program number, date/time comments, and the initial tool change. Always include a comprehensive safety line in psof that cancels all modal states — canned cycles (G80), cutter comp (G40), and sets absolute mode (G90). Missing any cancellation code risks inheriting a dangerous modal state from the previous program left in the control's memory.

**Category:** post_processor
**Confidence:** 87
**Source:** web:mastercam-docs
**Operations:** post_processing

## Related
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[mastercam-cam-tips-mc-040|Dynamic Mill micro lifts eliminate full retracts between slices]]
- [[mastercam-cam-tips-mc-041|Dynamic Mill approach distance controls initial engagement ramp length]]
- [[mastercam-cam-tips-mc-042|Dynamic Mill slot width controls minimum feature size for engagement]]
