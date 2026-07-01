---
name: tribal-mc-088
category: code-tribal
subdomain: post_processor
domain: tribal-knowledge
tags: ["mastercam", "canned-cycles", "g81", "g83", "control-definition", "expanded-code"]
confidence: 86
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-088.md
promoted_at: 2026-06-09T22:31:16.417Z
---

# Canned cycle post output requires matching control-specific G-code sequences

Mastercam supports outputting drill cycles as either canned cycles (G81, G83, G73, G76, G85, G86) or expanded code (individual G0/G1 moves). The Control Definition maps Mastercam's internal cycle types to specific G-codes. For controls that do not support certain canned cycles (e.g., some Mitsubishi controls lack G76 fine bore), configure the Control Definition to expand those specific cycles while keeping supported cycles canned. Never assume all controls support all canned cycles — verify against the machine's programming manual.

**Category:** post_processor
**Confidence:** 86
**Source:** web:mastercam-docs
**Operations:** post_processing, drilling

## Related
- [[mastercam-cam-tips-mc-157|Chip break peck patterns must be tuned to material type and hole depth ratio]]
- [[mastercam-cam-tips-mc-163|Peck depth optimization balances chip evacuation time against total drill cycle time]]
- [[mastercam-cam-tips-mc-204|Control definition files must match the specific CNC control for accurate G-code generation]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
