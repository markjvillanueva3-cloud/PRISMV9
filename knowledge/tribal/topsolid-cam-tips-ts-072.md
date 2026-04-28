---
id: "ts-072"
title: "Custom Macro Support for Probing and Special Cycles"
source: "web:topsolid-macro"
confidence: 90
category: "cam_strategy"
tags: ["macro", "probing", "custom-cycles", "post-processor"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.441Z
---

# Custom Macro Support for Probing and Special Cycles

TopSolid's post-processor can embed custom macro calls for probing routines, in-process measurement, and special machining cycles. Define macro templates in the post configuration that map TopSolid's probing operations to controller-specific macro calls (Renishaw on Fanuc: G65 P9xxx, Heidenhain: TOUCH PROBE cycling). Include variable passing for probe positions, expected values, and tolerance bands. Always test macro calls in MDI mode before running in automatic.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:topsolid-macro
**Operations:** probing

## Related
- [[worknc-cam-tips-wnc-064|Custom Macro Support for Probing and Special Cycles]]
- [[controller-knowledge-tips-ctrl-023|Haas macro variables and probing]]
- [[controller-knowledge-tips-ctrl-050|Universal probing compatibility across controllers]]
- [[controller-knowledge-tips-ctrl-090|Haas macro look-ahead gotcha — G103 P1 for variable reads]]
- [[edgecam-cam-tips-ec-142|Fixture Plate Part Presence Probing Before Machining]]
