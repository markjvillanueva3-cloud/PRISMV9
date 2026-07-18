---
name: tribal-ctrl-111
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "datron", "SimPL", "micro-milling", "high-speed", "post-processor"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-111.md
promoted_at: 2026-06-09T22:31:16.158Z
---

# DATRON next SimPL programming language vs G-code

DATRON machines use SimPL (Simple Programming Language) instead of standard G-code. SimPL is a modern conversational language with plain-language commands, syntax checking, auto-completion, and debugging — features absent from traditional G-code controls. DATRON worked with major CAM vendors (Fusion 360, Mastercam, SolidCAM, HSMWorks, CAMWorks) to create post-processors that output directly to SimPL format. Do NOT use generic Fanuc/ISO posts — they will not work. The next control adds interpolation points within CAM tolerance bands, calculated to 5 decimal places (metric) for superior surface finish on micro-milled parts. Z Surface Mapping with the measuring probe automatically compensates for workpiece surface variations — essential for engraving and thin-sheet machining. Auto Tool Management monitors wear and swaps sister tools without program changes.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-041|DATRON next controller for micro-milling]]
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[catia-cam-tips-cat-070|Post-Processor Table Customization for Controller Compatibility]]
- [[catia-cam-tips-cat-186|PP Table Word Address Customization for Controller-Specific Output]]
