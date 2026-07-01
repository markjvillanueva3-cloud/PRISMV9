---
name: tribal-mc-175
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "micro-machining", "spring-pass", "deflection", "tolerance", "finishing"]
confidence: 85
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-175.md
promoted_at: 2026-06-09T22:31:16.438Z
---

# Spring passes in micro finishing remove deflection-induced oversize material

After the final depth pass in micro machining, the tool springs back when cutting forces cease, leaving a thin layer of uncut material (typically 2–10 µm). Program 2–3 spring passes in Mastercam: repeat the final contour or surface finish pass at the same depth with zero additional stock-to-leave. Each spring pass removes progressively less material as the remaining spring-back diminishes. In Mastercam, duplicate the finishing operation and set stock-to-leave to 0 for the first spring pass and -0.002 mm for the second (slight negative forces the tool to clean up any remaining material). Feed rate for spring passes should be 50–70% of the finish feed to maintain surface quality. Spring passes are essential for achieving tolerances tighter than ±0.01 mm with micro tools — without them, parts are consistently oversized by the tool deflection amount.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:community
**Operations:** finishing, micro

## Related
- [[mastercam-cam-tips-mc-174|Feature size limits in micro machining are constrained by tool deflection, not geometry]]
- [[gibbscam-cam-tips-gc-054|Finish turning spring pass removes deflection error from the first pass]]
- [[gibbscam-cam-tips-gc-193|GibbsCAM micro-machining tool deflection compensation adjusts toolpath for bendable tools]]
- [[edgecam-cam-tips-ec-037|Turning Finishing with Spring Pass for Accuracy]]
- [[mastercam-cam-tips-mc-050|Area Rough stock-to-leave should match finishing tool radius for best results]]
