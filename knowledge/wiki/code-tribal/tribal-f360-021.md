---
name: tribal-f360-021
category: code-tribal
subdomain: post_processor
domain: tribal-knowledge
tags: ["post-verification", "safety", "dry-run", "g-code"]
confidence: 90
source: "web:autodesk-community"
promoted_from: knowledge/tribal/fusion360-cam-tips-f360-021.md
promoted_at: 2026-05-26T16:07:20.289Z
---

# Test Post Output Against Controller Before First Cut

After setting up a new or customized post processor, always dry-run the G-code output through your controller's verify/check mode or a backplotter before cutting metal. Pay special attention to tool change sequences (M6 formatting), coolant codes (M8/M9 placement), work offset calls (G54-G59), and safe retract heights. One wrong line in the post can crash a machine.

**Category:** post_processor
**Confidence:** 90
**Source:** web:autodesk-community
**Operations:** post_processing

## Related
- [[catia-cam-tips-cat-167|G-Code Playback Simulation Directly in CATIA]]
- [[bobcad-cam-tips-bc-064|No-Core Wire EDM for Non-Droppable Slugs]]
- [[camworks-cam-tips-cw-053|5-Axis Collision Avoidance — Automatic Tool Tilting Around Obstacles]]
- [[camworks-cam-tips-cw-116|Tool Measurement Probing — Verify Tool Length and Diameter On-Machine]]
- [[camworks-cam-tips-cw-198|Stock Verification Probing — Confirm Raw Material Before Machining]]
