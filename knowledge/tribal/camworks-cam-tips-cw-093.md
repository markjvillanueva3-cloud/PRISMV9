---
id: "cw-093"
title: "Air Cut Reduction — Eliminate Non-Productive Tool Travel"
source: "web:camworks-docs"
confidence: 90
category: "cam_strategy"
tags: ["camworks", "optimization", "air-cut", "non-productive", "rapids"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.716Z
---

# Air Cut Reduction — Eliminate Non-Productive Tool Travel

Enable air cut detection to identify and remove toolpath segments where the tool is not in contact with material. CAMWorks compares each toolpath segment against the current stock model and eliminates or rapids over air-cutting zones. This is most beneficial on rest machining operations where the previous tool removed 80-90% of the stock. Regenerate the stock model before enabling air cut detection to ensure it reflects all previous operations accurately.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:camworks-docs
**Operations:** milling, rest_roughing

## Related
- [[camworks-cam-tips-cw-094|Rapid Planning — Optimize Rapid Traverse Height and Paths]]
- [[camworks-cam-tips-cw-030|VoluMill Air Cut Reduction — Minimize Non-Cutting Travel Time]]
- [[camworks-cam-tips-cw-091|Feed Optimization — Post-Process Feed Rate Adjustment by Engagement]]
- [[camworks-cam-tips-cw-092|Linking Strategy — Optimize Retract and Transition Moves]]
- [[camworks-cam-tips-cw-095|Acceleration Control — Match Toolpath Density to Machine Dynamics]]
