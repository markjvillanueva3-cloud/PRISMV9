---
name: tribal-ctrl-054
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "fanuc", "probing", "G37", "tool-measurement", "tool-setting"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-054.md
promoted_at: 2026-06-09T22:31:16.144Z
---

# Fanuc G37 automatic tool length measurement

G37 performs automatic tool offset measurement. When the probe skip signal is received during a G37 move, the Z position is captured and used to set the specified tool length offset (H register). Syntax: G37 Zxx.xxx Hnn (measure tool, set offset Hnn). The resulting offset equals the distance between the work coordinate zero and the probe contact point. This is typically used with a fixed tool setter (table-mounted or spindle-mounted). Combine with Macro B for automated tool breakage detection: measure tool, compare to expected length stored in #500+, trigger alarm (#3000=101[TOOL BROKEN]) if deviation exceeds threshold. More reliable than G31-based manual measurement for production environments.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-053|Fanuc probing with G31 skip signal]]
- [[controller-knowledge-tips-ctrl-056|Fanuc G10 programmatic offset setting for automation]]
- [[controller-knowledge-tips-ctrl-065|Fanuc Macro B tool breakage detection pattern]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-051|Fanuc look-ahead buffer sizes by controller model]]
