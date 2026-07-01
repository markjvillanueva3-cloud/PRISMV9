---
name: tribal-ctrl-107
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "citizen", "swiss-lathe", "guide-bushing", "detachable", "Z-origin"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-107.md
promoted_at: 2026-06-09T22:31:16.157Z
---

# Citizen detachable guide bushing and programming impact

Many Citizen Cincom machines (L12, L20) feature a detachable guide bushing. With guide bushing installed, the machine operates as a traditional swiss-type for long/small-diameter parts. When removed, it becomes a fixed-headstock lathe for short workpieces with less material waste. This configuration change affects programming: with guide bushing, Z-axis reference is at the bushing face; without it, reference shifts to the chuck face. Always verify your Z-origin when switching modes. The detachable bushing also changes bar remnant length — non-guide-bushing mode typically saves 30-50mm of bar stock per remnant. Update your bar feeder parameters and part-off positions accordingly.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-106|Citizen LFV low-frequency vibration cutting G-code control]]
- [[controller-knowledge-tips-ctrl-037|Citizen Cincom Swiss lathe guide bushing programming]]
- [[controller-knowledge-tips-ctrl-114|Star swiss lathe Fanuc variant with NC Assist and B-axis]]
- [[controller-knowledge-tips-ctrl-116|Tsugami opposed gang tool swiss lathe with Fanuc 32i-B]]
- [[controller-knowledge-tips-ctrl-038|Swiss lathe synchronization between spindles]]
