---
name: tribal-gc-078
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "post-processor", "canned-cycle", "drilling", "g81", "g83"]
confidence: 86
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-078.md
promoted_at: 2026-06-09T22:31:16.332Z
---

# Canned cycle output from post maps GibbsCAM operations to G81/G83/G84

GibbsCAM's post processors can output drilling, tapping, and boring as canned cycles (G81, G83, G84, etc.) rather than expanded G01 moves. Enable 'Use Canned Cycles' in the post configuration. The post maps GibbsCAM's peck drill to G83, tap to G84, and boring to G85/G86. For controls that support custom canned cycles (e.g., Fanuc's G16x series for pattern drilling), customize the post to output the pattern call with hole coordinates as a data block. Canned cycles reduce program size by 60-80% for parts with many holes and simplify on-machine editing.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:gibbscam-docs

## Related
- [[catia-cam-tips-cat-072|Canned Cycle Output for Drilling Operations]]
- [[surfcam-cam-tips-sc2-212|SURFCAM Post Processor Canned Cycle Customization]]
- [[gibbscam-cam-tips-gc-004|Drill tile supports spot-drill-tap sequences with automatic depth linking]]
- [[gibbscam-cam-tips-gc-059|Center drilling before through-drilling ensures positional accuracy]]
- [[gibbscam-cam-tips-gc-076|Post processor customization through Compost enables machine-specific G-code]]
