---
id: "ctrl-054"
title: "Fanuc G37 automatic tool length measurement"
source: "controller:web_research"
confidence: 80
category: "programming"
tags: ["controller", "fanuc", "probing", "G37", "tool-measurement", "tool-setting"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.194Z
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
