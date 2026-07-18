---
name: tribal-ctrl-004
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["fanuc", "macro-b", "probing", "g31", "custom-cycle", "variables"]
confidence: 92
source: "controller:fanuc_macro_manual"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-004.md
promoted_at: 2026-05-26T16:07:20.106Z
---

# Fanuc Macro B custom probing cycles

Fanuc Macro B (#variables and G65 subprogram calls) enables custom probing cycles far more flexible than canned cycles. Key variables: #5021-#5023 (current machine position XYZ), #100-#199 (common variables), #500-#999 (persistent across power cycles). Use G31 (skip function) with a probe signal to detect contact, then store positions. Pattern: G31 F100 Z-50. (feed until skip signal), then #101=#5023 (store Z touch position).

**Category:** programming
**Confidence:** 92
**Source:** controller:fanuc_macro_manual

## Related
- [[controller-knowledge-tips-ctrl-052|Fanuc Macro B variable ranges and persistence]]
- [[controller-knowledge-tips-ctrl-053|Fanuc probing with G31 skip signal]]
- [[controller-knowledge-tips-ctrl-065|Fanuc Macro B tool breakage detection pattern]]
- [[controller-knowledge-tips-ctrl-054|Fanuc G37 automatic tool length measurement]]
- [[controller-knowledge-tips-ctrl-056|Fanuc G10 programmatic offset setting for automation]]
