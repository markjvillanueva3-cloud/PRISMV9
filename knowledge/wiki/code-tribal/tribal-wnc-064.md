---
name: tribal-wnc-064
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["macro", "probing", "custom-cycles", "post-processor"]
confidence: 89
source: "web:worknc-macro"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-064.md
promoted_at: 2026-06-09T22:31:16.807Z
---

# Custom Macro Support for Probing and Special Cycles

WorkNC's post can embed custom macro calls for probing routines and special cycles. Define macro templates that map WorkNC operations to controller-specific calls (Renishaw G65 P9xxx on Fanuc, TOUCH PROBE on Heidenhain). Include variable passing for probe positions, expected values, and tolerance bands. Test macro calls in MDI mode before automatic execution.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:worknc-macro
**Operations:** probing

## Related
- [[topsolid-cam-tips-ts-072|Custom Macro Support for Probing and Special Cycles]]
- [[controller-knowledge-tips-ctrl-023|Haas macro variables and probing]]
- [[controller-knowledge-tips-ctrl-050|Universal probing compatibility across controllers]]
- [[controller-knowledge-tips-ctrl-090|Haas macro look-ahead gotcha — G103 P1 for variable reads]]
- [[edgecam-cam-tips-ec-142|Fixture Plate Part Presence Probing Before Machining]]
