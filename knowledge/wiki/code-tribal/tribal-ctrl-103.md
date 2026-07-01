---
name: tribal-ctrl-103
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "makino", "Fanuc", "Pro6", "ATLM", "G-codes"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-103.md
promoted_at: 2026-06-09T22:31:16.156Z
---

# Makino Pro6 is Fanuc-based — standard G-codes with Makino enhancements

The Professional 6 control is built on Fanuc hardware with Windows CE GUI overlay. Standard Fanuc G-codes (G00-G04, G17-G19, G28, G40-G43, G54-G59, G80-G89) all work. Makino-specific enhancements: ATLM (Automatic Tool Length Measurement) via guided on-screen prompts, tilted working plane setup with graphical guidance, and SGI.5 integration for HSM. M-codes above M79 are typically machine-specific — always verify with machine documentation. Pro6 stores up to 3GB of programs (expandable to 20GB), supports MDI recall of last 20 inputs, and allows simultaneous program editing during machining.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-051|Fanuc look-ahead buffer sizes by controller model]]
- [[controller-knowledge-tips-ctrl-052|Fanuc Macro B variable ranges and persistence]]
- [[controller-knowledge-tips-ctrl-053|Fanuc probing with G31 skip signal]]
- [[controller-knowledge-tips-ctrl-054|Fanuc G37 automatic tool length measurement]]
