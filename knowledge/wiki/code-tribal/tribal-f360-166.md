---
name: tribal-f360-166
category: code-tribal
subdomain: automation
domain: tribal-knowledge
tags: ["fusion360", "nc-documentation", "tool-table", "g-code-header", "post-processor"]
confidence: 0
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-166.md
promoted_at: 2026-06-09T22:31:16.292Z
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
