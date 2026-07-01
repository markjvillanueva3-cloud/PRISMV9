---
name: tribal-mc-086
category: code-tribal
subdomain: post_processor
domain: tribal-knowledge
tags: ["mastercam", "pst", "psof", "safety-line", "header", "modal-state"]
confidence: 87
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-086.md
promoted_at: 2026-06-09T22:31:16.416Z
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
