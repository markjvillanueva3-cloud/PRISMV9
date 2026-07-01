---
name: tribal-cw-015
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "techdb", "tool-selection", "rules", "automation"]
confidence: 91
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-015.md
promoted_at: 2026-05-26T16:07:19.824Z
---

# Tool Selection Rules in TechDB — Automate Tool Choice by Feature Size

Configure TechDB tool selection rules to automatically pick tools based on feature dimensions. For pockets, set rules like: tool diameter ≤ 60% of pocket minimum width for roughing, tool radius ≤ fillet radius for finishing. For holes, map drill diameter ranges to specific tool types (e.g., < 3mm use carbide micro drill, 3-20mm use indexable insert drill, > 20mm use spade drill). This eliminates tool selection errors and standardizes the shop floor.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:camworks-docs
**Operations:** milling, drilling

## Related
- [[camworks-cam-tips-cw-013|TechDB Knowledge-Based Machining — Capture Best Practices for Reuse]]
- [[camworks-cam-tips-cw-001|AFR Machinable Feature Detection — Let CAMWorks Analyze the Solid Model]]
- [[camworks-cam-tips-cw-012|Fillet Recognition — Avoid Misclassification of Blended Internal Corners]]
- [[camworks-cam-tips-cw-014|Operation Mapping Rules — Link Feature Types to Machining Strategies]]
- [[camworks-cam-tips-cw-016|Feed/Speed Defaults — Material-Specific Cutting Data in TechDB]]
