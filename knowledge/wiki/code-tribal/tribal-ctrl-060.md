---
name: tribal-ctrl-060
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "fanuc", "turning", "canned-cycles", "threading", "lathe"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-060.md
promoted_at: 2026-06-09T22:31:16.145Z
---

# Fanuc 0i-TF turning-specific canned cycles

Fanuc 0i-TF/0i-TF Plus turning canned cycles differ significantly from milling G-codes. Stock removal: G71 (longitudinal rough turning — auto-calculates passes from depth-of-cut), G72 (facing rough cycle), G73 (pattern repeating for castings/forgings). Finishing: G70 (finish cycle — follows G71/G72/G73 profile at finish allowance). Threading: G32/G33 (single-pass thread cutting), G76 (multi-pass auto threading cycle — preferred for production), G92 (simple threading cycle). Grooving/Parting: G75 (grooving cycle with peck). Drilling: G74 (face drilling/peck cycle). Key difference from milling: G90 on turning = single-pass turning cycle (NOT absolute mode — G90/G91 absolute/incremental concept uses different codes on lathes). G76 threading: control auto-determines internal vs external by comparing start X to programmed X.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-061|Fanuc milling-specific canned cycles (0i-MF / 31i-B5)]]
- [[catia-cam-tips-cat-038|Thread Turning Infeed Strategy Affects Thread Quality]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-051|Fanuc look-ahead buffer sizes by controller model]]
- [[controller-knowledge-tips-ctrl-052|Fanuc Macro B variable ranges and persistence]]
