---
name: tribal-ec-194
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["bar-puller", "macro", "lathe", "cutoff"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-194.md
promoted_at: 2026-06-09T22:31:16.207Z
---

# Bar Puller Macro Programming for CNC Lathes

Program bar puller operations in Edgecam by inserting custom macro calls at part cutoff points. After parting off, the bar puller grips the bar remnant and pulls it forward by the part length plus cutoff width plus facing stock. Use G65 P-call or M-code (machine-specific) to activate the bar puller. Set the pull distance as a macro variable: #500 = part_length + cutoff_width + face_stock (typically +1-2mm). The collet opens during pull and re-clamps automatically.

**Category:** cam_strategy
**Confidence:** 0.84
**Source:** web:edgecam-docs
**Operations:** turning

## Related
- [[catia-cam-tips-cat-069|Macro-Based Batch Processing for High-Volume Programming]]
- [[cimatron-cam-tips-cim-158|Macro Programming for Repetitive Operations]]
- [[cimatron-cam-tips-cim-173|Macro Automation for Mold Base Programming]]
- [[controller-knowledge-tips-ctrl-023|Haas macro variables and probing]]
- [[controller-knowledge-tips-ctrl-050|Universal probing compatibility across controllers]]
