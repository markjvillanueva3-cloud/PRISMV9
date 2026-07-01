---
name: tribal-mc-222
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["mastercam", "operation-comments", "g-code", "documentation", "troubleshooting", "navigation"]
confidence: 84
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-222.md
promoted_at: 2026-06-09T22:31:16.449Z
---

# Operation comments embedded in G-code aid troubleshooting and operator understanding

In Mastercam, each operation has a Comment field that is output as a G-code comment (parenthetical text) at the start of that operation's NC code block. Write descriptive comments that explain what each operation does: 'ROUGH POCKET P1 - 20MM EM - DOC 10MM' is far more useful than 'OP3'. Include the feature name, tool description, and key parameter (depth, tolerance). In the post processor, enable comment output and set the comment format to match the control's syntax (parentheses for FANUC, semicolon for Heidenhain). For long programs (5,000+ lines), operation comments serve as navigation markers — operators can search for a specific comment to find the relevant code section when troubleshooting. Also add safety comments before critical operations: 'CAUTION - FIRST PART PROVE-OUT - RUN AT 25% FEED OVERRIDE'.

**Category:** quality
**Confidence:** 84
**Source:** web:community
**Operations:** post_processing, documentation

## Related
- [[mastercam-cam-tips-mc-204|Control definition files must match the specific CNC control for accurate G-code generation]]
- [[mastercam-cam-tips-mc-220|Setup sheet creation in Mastercam documents fixture, tool, and origin information for operators]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[mastercam-cam-tips-mc-040|Dynamic Mill micro lifts eliminate full retracts between slices]]
