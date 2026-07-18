---
name: tribal-ctrl-062
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "fanuc", "spindle-orientation", "M19", "rigid-tapping", "M29"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-062.md
promoted_at: 2026-06-09T22:31:16.146Z
---

# Fanuc M19 spindle orientation and rigid tapping

M19 commands the spindle to orient to a specific angular position using a position encoder. Required for: tool changes (orient spindle for ATC arm), fine boring cycle G76 (orient before shift-retract), live tooling on lathes. M19 is modal in the same group as M3/M4/M5 — issuing M19 stops the spindle and orients it. Rigid tapping: G84 with M29 (or G84.2/G84.3 on newer controls) synchronizes spindle rotation with Z-axis feed for tap-without-floating-holder. On 0i-MF Plus and 31i-B5: rigid tapping is standard. Parameters control the synchronization gain — poorly tuned rigid tapping causes tap breakage or oversized holes. For deep holes (>2xD), use G84 with peck (G83-style) if supported, or break the cycle into segments.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-010|Fanuc rigid tapping G84 with synchronization]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-051|Fanuc look-ahead buffer sizes by controller model]]
- [[controller-knowledge-tips-ctrl-052|Fanuc Macro B variable ranges and persistence]]
- [[controller-knowledge-tips-ctrl-053|Fanuc probing with G31 skip signal]]
