---
name: tribal-ctrl-112
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "datron", "vacuum-table", "camera-setup", "thin-sheet"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-112.md
promoted_at: 2026-06-09T22:31:16.159Z
---

# DATRON next vacuum table and accessory integration

DATRON's SimPL language directly integrates commands for DATRON-specific accessories: vacuum tables, dust collection, ionizing spray bars, and camera-based workpiece setup. The camera + multi-touch display + XYZ sensor combination allows zero-point setting via swiping gestures — no edge-finder or indicator needed. This is uniquely suited to thin aluminum, plastic, and composite sheet machining where traditional clamping would distort the part. When programming in CAM, ensure your post-processor includes DATRON vacuum zone control commands (activating/deactivating specific vacuum zones as the tool moves). The 4-step setup wizard guides through workholding, tool loading, zero-point, and program verification. For beginners, the conversational interface translates operation selections directly into SimPL code.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-111|DATRON next SimPL programming language vs G-code]]
- [[controller-knowledge-tips-ctrl-041|DATRON next controller for micro-milling]]
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[catia-cam-tips-cat-070|Post-Processor Table Customization for Controller Compatibility]]
