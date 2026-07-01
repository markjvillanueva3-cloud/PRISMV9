---
name: tribal-cat-182
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "multi-setup", "stock-transfer", "intermediate", "coordination"]
confidence: 0
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-182.md
promoted_at: 2026-06-09T22:31:16.073Z
---

# Stock Transfer Between Setups with Intermediate Stock Bodies

For multi-setup parts, CATIA can carry the stock model from one setup to the next. After OP10 computes, the resulting stock body (partially machined billet) becomes the input stock for OP20. Enable 'Stock Update' across Part Operations in the Manufacturing Program. CATIA re-orients the intermediate stock body to match the OP20 fixture orientation (typically a 180° flip for top/bottom machining). Verify the stock transfer by checking the 'Stock Status' at the beginning of each Part Operation — the stock should show all material removed by prior setups. This prevents programming blind spots where OP20 tries to cut material already removed in OP10.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:catia-docs
**Operations:** setup

## Related
- [[catia-cam-tips-cat-099|Multi-Setup Part Positioning and Datum Transfer]]
- [[catia-cam-tips-cat-181|Multi-Setup Manufacturing Program Organization in CATIA]]
- [[catia-cam-tips-cat-183|Datum Feature Reference Consistency Across Machining Setups]]
- [[catia-cam-tips-cat-184|In-Process Probing Between Setups for Alignment Verification]]
- [[catia-cam-tips-cat-185|Multi-Setup Fixture Design Integration with Machining Program]]
