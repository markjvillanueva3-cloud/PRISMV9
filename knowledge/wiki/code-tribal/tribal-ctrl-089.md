---
name: tribal-ctrl-089
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "haas", "G150", "pocket-milling", "conversational"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-089.md
promoted_at: 2026-06-09T22:31:16.153Z
---

# Haas G150 general pocket milling — mini-CAM in G-code

G150 is Haas's built-in pocket milling cycle — essentially a mini-CAM system in G-code. Define pocket boundary as a sub-program with line/arc moves, then G150 generates roughing toolpaths with stepover. CRITICAL: G150 requires a pre-drilled hole at full pocket depth for cutter entry — it will NOT ramp or helical-enter. Drill or helical-interpolate the entry hole before calling G150. Parameters: P (subprogram number), D (tool diameter offset), I (stepover), J (overlap), K (number of finishing passes). Useful for simple pockets when CAM is unavailable.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-105|Haas G12/G13 circular pocket milling — CW/CCW without CAM]]
- [[controller-knowledge-tips-ctrl-070|ShopMill/ShopTurn Conversational Programming]]
- [[controller-knowledge-tips-ctrl-088|Haas G187 accuracy/speed control for HSM]]
- [[controller-knowledge-tips-ctrl-090|Haas macro look-ahead gotcha — G103 P1 for variable reads]]
- [[controller-knowledge-tips-ctrl-091|Haas probing setup requirements and WIPS integration]]
