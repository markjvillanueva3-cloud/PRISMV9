---
name: tribal-ctrl-053
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "fanuc", "probing", "G31", "skip-signal", "measurement"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-053.md
promoted_at: 2026-06-09T22:31:16.144Z
---

# Fanuc probing with G31 skip signal

G31 (skip function) moves axes at programmed feedrate until a skip signal (probe contact) is received, then stops motion and records the contact position in system variables #5061-#5068 (machine coordinates at skip). Usage: G31 Z-50. F100 (probe toward Z-50 at 100mm/min). After contact, read #5061 (X), #5062 (Y), #5063 (Z) for the exact trip point. Always use a protected move approach — never rapid (G00) with a probe loaded; use G31 to detect unexpected collisions. Renishaw and Blum probing packages build their cycles on G31. Multi-skip variants: G31.1/G31.2/G31.3 use different skip signal inputs (useful for multi-probe setups). Feed override is typically disabled during G31 for consistent results.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-054|Fanuc G37 automatic tool length measurement]]
- [[controller-knowledge-tips-ctrl-056|Fanuc G10 programmatic offset setting for automation]]
- [[controller-knowledge-tips-ctrl-065|Fanuc Macro B tool breakage detection pattern]]
- [[controller-knowledge-tips-ctrl-004|Fanuc Macro B custom probing cycles]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
