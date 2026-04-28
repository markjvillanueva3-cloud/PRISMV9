---
id: "ctrl-059"
title: "Fanuc system variables for alarms and program control"
source: "controller:web_research"
confidence: 80
category: "programming"
tags: ["controller", "fanuc", "macro-b", "system-variables", "alarms", "programming"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.199Z
---

# Fanuc system variables for alarms and program control

Key Fanuc system variables for macro programming: #3000 = generates a custom alarm and halts program (e.g., #3000=101[TOOL BROKEN] — alarm number 101 with message, up to 26 chars). #3006 = displays message and pauses program (operator acknowledgment required, e.g., #3006=1[CHECK CLAMP]). #5001-#5006 = current end-point position (work coordinates). #5021-#5026 = current machine position. #5041-#5046 = current actual position. #5061-#5068 = skip signal (G31) position. #1000-#1035 = input signal status. #1100-#1115 = output signal status. #2001-#2200 = tool length offset values. #2401-#2600 = cutter radius compensation values. #3001 = millisecond timer. #3002 = hour meter. #4001-#4120 = modal G-code group states (read which G-codes are active).

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-052|Fanuc Macro B variable ranges and persistence]]
- [[controller-knowledge-tips-ctrl-064|Fanuc turning vs milling controller G-code conflicts]]
- [[controller-knowledge-tips-ctrl-065|Fanuc Macro B tool breakage detection pattern]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-051|Fanuc look-ahead buffer sizes by controller model]]
