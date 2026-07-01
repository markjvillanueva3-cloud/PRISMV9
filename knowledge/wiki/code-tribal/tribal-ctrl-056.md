---
name: tribal-ctrl-056
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "fanuc", "G10", "offsets", "automation", "probing"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-056.md
promoted_at: 2026-06-09T22:31:16.144Z
---

# Fanuc G10 programmatic offset setting for automation

G10 enables setting tool and work offsets from within the NC program — essential for automated probing and fixture setup. Work offsets: G10 L2 P(n) X__ Y__ Z__ (L2=standard offsets, P1=G54 through P6=G59). G10 L20 P(n) X__ Y__ Z__ (L20=extended offsets, P1-P48 for G54.1). Tool offsets: G10 L10 P(n) R__ (L10=tool length geometry), G10 L11 P(n) R__ (L11=tool length wear), G10 L12 P(n) R__ (L12=tool radius geometry), G10 L13 P(n) R__ (L13=tool radius wear). In G90 mode values are absolute (replace); in G91 mode values are incremental (add). Combine with G31 probing: probe a surface, read #5063, then G10 L2 to set the work offset automatically. This is the foundation of automated setup on Fanuc controls.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-065|Fanuc Macro B tool breakage detection pattern]]
- [[controller-knowledge-tips-ctrl-053|Fanuc probing with G31 skip signal]]
- [[controller-knowledge-tips-ctrl-054|Fanuc G37 automatic tool length measurement]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-051|Fanuc look-ahead buffer sizes by controller model]]
