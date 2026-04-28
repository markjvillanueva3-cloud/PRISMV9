---
id: "f360-166"
title: "NC Program Documentation with Tool Table"
source: "web:fusion360-docs"
confidence: 0.86
category: "automation"
tags: ["fusion360", "nc-documentation", "tool-table", "g-code-header", "post-processor"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.759Z
---

# NC Program Documentation with Tool Table

In the Post Processor settings, enable 'Write Tool Table' and 'Write Operation Notes' to embed tooling and operation details directly into the G-code file header. The tool table lists every tool used with its pocket number, diameter, length, and description. Operation notes include stock-to-leave, stepover, and key parameters. This makes the G-code file self-documenting — operators can read the header to understand the program without a separate setup sheet. Add custom properties in the Post Processor's onComment function to include material type, fixture ID, and WCS offset numbers in the header.

**Category:** automation
**Confidence:** 0.86
**Source:** web:fusion360-docs
**Operations:** post_processing

## Related
- [[fusion360-cam-tips-ext-f360-081|Machine Configuration Ties Post to Kinematic Model]]
- [[fusion360-cam-tips-ext-f360-175|Custom Post Processor Development in JavaScript]]
- [[fusion360-cam-tips-ext-f360-186|MQL Configuration in Fusion Post Processor]]
- [[fusion360-cam-tips-ext-f360-040|Fine-Tune Optimal Load by Material Hardness]]
- [[fusion360-cam-tips-ext-f360-041|Multi-Depth Adaptive with Progressive Stepdown]]
