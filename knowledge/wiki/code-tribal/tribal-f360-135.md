---
name: tribal-f360-135
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "3-plus-2", "indexed", "multi-face", "prismatic"]
confidence: 0
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-135.md
promoted_at: 2026-06-09T22:31:16.285Z
---

# 3+2 Indexed Multi-Face Machining Setup

For prismatic parts requiring machining from multiple faces, create separate setups for each indexed orientation rather than one 5-axis setup. In each setup, set the WCS orientation to the indexed angle (0, 90, 180, 270 degrees on the rotary table) and program conventional 3-axis operations. This approach produces cleaner G-code that any shop-floor operator can verify, avoids RTCP/TCPC dependency, and runs on 4-axis machines with a rotary table. Fusion calculates the fixture offsets for each orientation — post-process with a 3+2 post that outputs G68.2 or equivalent tilted plane commands.

**Category:** cam_strategy
**Confidence:** 0.89
**Source:** web:fusion360-docs
**Operations:** 3d_roughing, 3d_finishing, 2d_contour

## Related
- [[cimatron-cam-tips-cim-054|3+2 Axis Indexed Machining for Multi-Face Parts]]
- [[mastercam-cam-tips-mc-053|3+2 Automatic Roughing outperforms OptiRough on steep-walled prismatic parts]]
- [[sprutcam-cam-tips-spr-075|3+2 Axis Positioning for Multi-Face Machining]]
- [[tebis-cam-tips-teb-060|3+2 Axis Indexed Machining for Multi-Face Parts]]
- [[fusion360-cam-tips-ext-f360-062|3+2 Indexed Machining with WCS Per Orientation]]
