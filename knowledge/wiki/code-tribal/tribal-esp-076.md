---
name: tribal-esp-076
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["post-processor", "sub-program", "patterns", "code-reduction"]
confidence: 87
source: "web:esprit-post-processor"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-076.md
promoted_at: 2026-06-09T22:31:16.230Z
---

# Sub-Program Output for Repeated Patterns

Configure ESPRIT's post to output sub-programs (M98/M99 on Fanuc, L-calls on Siemens, CALL on Heidenhain) for repeated hole patterns, pocket arrays, and multi-fixture setups. Sub-programs reduce code size by 80-90% for patterns with many repetitions and improve readability. Set the sub-program numbering convention (O-words, P-numbers, or file-based) to match your shop's DNC system. Enable 'auto sub-program detection' to have ESPRIT identify repeating patterns automatically.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:esprit-post-processor
**Operations:** post_processing

## Related
- [[camworks-cam-tips-cw-089|Sub-Program Output — Reduce G-Code File Size for Pattern Operations]]
- [[topsolid-cam-tips-ts-070|Sub-Program Output for Repeated Patterns]]
- [[catia-cam-tips-cat-074|Sub-Program Generation for Repeated Geometry Patterns]]
- [[gibbscam-cam-tips-gc-080|Sub-program output reduces file size for repeated operations and patterns]]
- [[worknc-cam-tips-wnc-063|Sub-Program Output Reduces File Size for Patterns]]
