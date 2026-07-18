---
name: tribal-sc2-214
category: code-tribal
subdomain: post_processing
domain: tribal-knowledge
tags: ["post-processor", "testing", "verification", "test-part", "edge-cases"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-214.md
promoted_at: 2026-06-09T22:31:16.706Z
---

# SURFCAM Post Processor Testing Methodology

Test SURFCAM custom post processors using a standardized test part that exercises all output paths: 2D contour with arcs, 3D surface finish, drilling with multiple cycle types, thread milling, helical interpolation, and 5-axis motion. Run the test part through the post and verify: correct G/M codes, proper coordinate format (decimal places), arc center calculations (IJK incremental vs absolute), tool change sequence completeness, and program start/end blocks. Compare output line-by-line against a verified reference program. Test edge cases: first tool=largest number, zero-length moves, same-tool consecutive operations, and coolant transitions.

**Category:** post_processing
**Confidence:** 0.88
**Source:** web:surfcam-docs
**Operations:** roughing, finishing, drilling, 5_axis

## Related
- [[bobcad-cam-tips-bc-130|BobCAD V36 Advanced Toolpath Simulation with G-Code Verification]]
- [[catia-cam-tips-cat-189|Post Processor Testing with CLFile Comparison]]
- [[gibbscam-cam-tips-gc-170|Post processor verification compares G-code back to CAM toolpath for drift detection]]
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
- [[camworks-cam-tips-cw-086|Multi-Axis Post Processors — Handle Rotary Axis Output Correctly]]
