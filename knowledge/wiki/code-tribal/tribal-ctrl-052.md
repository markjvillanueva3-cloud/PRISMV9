---
name: tribal-ctrl-052
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "fanuc", "macro-b", "programming", "variables"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-052.md
promoted_at: 2026-06-09T22:31:16.143Z
---

# Fanuc Macro B variable ranges and persistence

Fanuc Macro B variable ranges: Local variables #1-#33 (per-call scope, cleared on power-off, used for G65/G66 argument passing). Common variables #100-#199 (global, cleared on power-off — use for temporary cross-macro data). Common variables #500-#999 (global, RETAINED on power-off — use for persistent data like tool counts, calibration offsets, fixture data). System variables #1000+ (read/write machine state). Argument mapping for G65 calls: A=#1, B=#2, C=#3, D=#7, E=#8, F=#9, H=#11, I=#4, J=#5, K=#6, M=#13, Q=#17, R=#18, S=#19, T=#20, U=#21, V=#22, W=#23, X=#24, Y=#25, Z=#26. Note the non-sequential mapping — a common source of bugs.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-059|Fanuc system variables for alarms and program control]]
- [[controller-knowledge-tips-ctrl-064|Fanuc turning vs milling controller G-code conflicts]]
- [[controller-knowledge-tips-ctrl-065|Fanuc Macro B tool breakage detection pattern]]
- [[controller-knowledge-tips-ctrl-004|Fanuc Macro B custom probing cycles]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
