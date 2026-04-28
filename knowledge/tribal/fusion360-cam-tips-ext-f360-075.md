---
id: "f360-075"
title: "Turning Face Operation with Constant Surface Speed"
source: "web:fusion360-docs"
confidence: 89
category: "cam_strategy"
tags: ["fusion360", "turning", "facing", "constant-surface-speed", "g96"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.686Z
---

# Turning Face Operation with Constant Surface Speed

Always use Constant Surface Speed (CSS / G96) for facing operations rather than constant RPM (G97). CSS automatically increases spindle RPM as the tool moves toward center, maintaining the same cutting speed at every diameter. Set the Maximum Spindle Speed limit to 80% of your lathe's maximum RPM to leave headroom for the controller. Without a speed limit, the spindle can hit its maximum and lose CSS control near the center, causing poor finish and potential tool breakage.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:fusion360-docs
**Operations:** turning_face

## Related
- [[fusion360-cam-tips-ext-f360-130|Turning Face Operation Stock Recognition]]
- [[camworks-cam-tips-cw-067|Facing — Optimize Feed Direction and Constant Surface Speed]]
- [[catia-cam-tips-cat-039|Face Turning Constant Surface Speed for Uniform Finish]]
- [[bobcad-cam-tips-bc-047|Face Turning with CSS and Max RPM Control]]
- [[fusion360-cam-tips-ext-f360-074|Turning Roughing Profile with DOC Pattern Selection]]
