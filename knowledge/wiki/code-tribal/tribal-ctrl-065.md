---
name: tribal-ctrl-065
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "fanuc", "macro-b", "tool-breakage", "probing", "lights-out", "automation"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-065.md
promoted_at: 2026-06-09T22:31:16.146Z
---

# Fanuc Macro B tool breakage detection pattern

Practical Macro B pattern for automated tool breakage detection using G31 probing and system variables. Pattern: (1) After machining, call tool setter with G31 Z-xx F100. (2) Read skip position: #101=#5063 (Z at contact). (3) Compare to expected length stored in non-volatile variable: IF[ABS[#101-#501] GT 0.5] GOTO 900. (4) Normal path: continue program. (5) N900: #3000=101[TOOL 1 BROKEN - REPLACE]. This halts the machine with a clear alarm. Store reference lengths in #500-#999 (persist across power cycles). For multi-tool programs, use #500+tool_number as the storage variable. Add #3001 (millisecond timer) reads before/after probing to log cycle times. This pattern is the foundation of lights-out machining on Fanuc controls and works identically on 0i-MF, 31i-B5, and 0i-TF controllers.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-056|Fanuc G10 programmatic offset setting for automation]]
- [[controller-knowledge-tips-ctrl-052|Fanuc Macro B variable ranges and persistence]]
- [[controller-knowledge-tips-ctrl-053|Fanuc probing with G31 skip signal]]
- [[controller-knowledge-tips-ctrl-054|Fanuc G37 automatic tool length measurement]]
- [[controller-knowledge-tips-ctrl-059|Fanuc system variables for alarms and program control]]
