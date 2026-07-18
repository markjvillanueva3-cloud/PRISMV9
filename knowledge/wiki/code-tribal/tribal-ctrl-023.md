---
name: tribal-ctrl-023
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["haas", "ngc", "macro", "probing", "wips", "variables"]
confidence: 90
source: "controller:haas_macro_manual"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-023.md
promoted_at: 2026-05-26T16:07:20.129Z
---

# Haas macro variables and probing

Haas NGC supports Fanuc-compatible Macro B with key additions: #5021-#5023 (machine position), #5041-#5043 (work position), #3027 (spindle load %), #1601-#1800 (tool offsets). Haas WIPS (Wireless Intuitive Probing System): use G65 P9995 calls for automated probing. Unlike Fanuc, Haas stores probe results in #10001-#10020. Setting 59 enables/disables macros.

**Category:** programming
**Confidence:** 90
**Source:** controller:haas_macro_manual

## Related
- [[controller-knowledge-tips-ctrl-090|Haas macro look-ahead gotcha — G103 P1 for variable reads]]
- [[controller-knowledge-tips-ctrl-091|Haas probing setup requirements and WIPS integration]]
- [[controller-knowledge-tips-ctrl-022|Haas NGC Setting 191 for smoothing tolerance]]
- [[controller-knowledge-tips-ctrl-024|Haas NGC unique M-codes reference]]
- [[controller-knowledge-tips-ctrl-050|Universal probing compatibility across controllers]]
