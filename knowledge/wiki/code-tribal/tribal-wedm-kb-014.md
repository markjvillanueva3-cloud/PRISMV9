---
name: tribal-wedm-kb-014
category: code-tribal
subdomain: speeds_feeds
domain: tribal-knowledge
tags: ["wire-edm", "thick-section", "voltage", "gap-voltage", "servo"]
confidence: 87
source: "handbook:mitsubishi_fa_app_notes"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-kb-014.md
promoted_at: 2026-06-09T22:31:16.790Z
---

# Thick sections need voltage compensation

For workpiece thickness >100mm, increase gap voltage by 5-10V above the standard setting. The longer spark gap path through the dielectric has higher electrical resistance, requiring more voltage to maintain stable discharge. Without compensation, the discharge frequency drops and cutting speed decreases more than expected. Mitsubishi FA machines have automatic thickness compensation — enable it via the SV (servo voltage) parameter.

**Category:** speeds_feeds
**Confidence:** 87
**Source:** handbook:mitsubishi_fa_app_notes
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-kb-004|Flush pressure prevents wire breaks in deep cuts]]
- [[wedm-knowledge-tips-wedm-kb-013|Thick section (>50mm): flushing efficiency degrades as 1/sqrt(thickness)]]
- [[wedm-knowledge-tips-wedm-kb-015|Maximum practical WEDM thickness depends on wire type]]
- [[wedm-knowledge-tips-wedm-kb-016|Thermal distortion in thick sections: stress relief first]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
