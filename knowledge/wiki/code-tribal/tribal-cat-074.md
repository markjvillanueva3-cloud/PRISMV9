---
name: tribal-cat-074
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "sub-program", "pattern", "post-processor", "optimization"]
confidence: 86
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-074.md
promoted_at: 2026-06-09T22:31:16.047Z
---

# Sub-Program Generation for Repeated Geometry Patterns

Configure the CATIA post-processor to output repeated machining patterns as sub-programs (M98/M99 on Fanuc, L-calls on Siemens). This reduces NC program size and makes edits easier — changing the sub-program updates all instances. In CATIA, group repeated operations into a Manufacturing Program sub-tree and enable 'Sub-Program Output' in the post-processor settings. Define the sub-program numbering scheme (O-number range) to avoid conflicts with other programs on the controller.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:catia-docs
**Operations:** post_processing

## Related
- [[catia-cam-tips-cat-171|FBM Group Machining for Pattern Feature Optimization]]
- [[gibbscam-cam-tips-gc-080|Sub-program output reduces file size for repeated operations and patterns]]
- [[catia-cam-tips-cat-047|Stock-Aware Roughing Uses In-Process Stock Model]]
- [[catia-cam-tips-cat-066|PowerCopy Machining Patterns for Repeated Feature Arrays]]
- [[catia-cam-tips-cat-070|Post-Processor Table Customization for Controller Compatibility]]
