---
name: tribal-sc2-072
category: code-tribal
subdomain: post_processor
domain: tribal-knowledge
tags: ["canned-cycles", "drilling", "tapping", "controller-specific"]
confidence: 88
source: "web:surfcam-canned-cycles"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-072.md
promoted_at: 2026-06-09T22:31:16.676Z
---

# Canned Cycle Output for Drilling and Tapping

SURFCAM posts map drilling operations to controller canned cycles: G81 (spot drill), G83 (peck drill), G73 (chip-break drill), G84 (right-hand tap), G74 (left-hand tap), G85 (bore), G76 (fine bore). Configure the post to output the correct cycle format for your controller brand (Fanuc, Siemens, Heidenhain, etc.). For non-standard cycles like back-spot-facing or combined drill/countersink, create custom cycle definitions in the post processor.

**Category:** post_processor
**Confidence:** 88
**Source:** web:surfcam-canned-cycles
**Operations:** posting, drilling

## Related
- [[controller-knowledge-tips-ctrl-061|Fanuc milling-specific canned cycles (0i-MF / 31i-B5)]]
- [[surfcam-cam-tips-sc2-212|SURFCAM Post Processor Canned Cycle Customization]]
- [[bobcad-cam-tips-bc-049|Center Drilling and Canned Cycle Mapping]]
- [[camworks-cam-tips-cw-087|Canned Cycle Output — Map Operations to Controller Drill Cycles]]
- [[edgecam-cam-tips-ec-076|Canned Cycle Output for Standard Operations]]
