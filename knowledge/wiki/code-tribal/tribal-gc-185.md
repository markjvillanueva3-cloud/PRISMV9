---
name: tribal-gc-185
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "composite", "stack-drilling", "step-tool", "multi-material"]
confidence: 82
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-185.md
promoted_at: 2026-06-09T22:31:16.360Z
---

# GibbsCAM composite stack drilling with step-tool geometry manages multi-material exits

Composite-metal stacks (CFRP/Ti, CFRP/Al) require step tools with different geometries at each diameter step to handle each material layer. In GibbsCAM, define the step tool with its full profile (pilot diameter for composite, step diameter for metal) and program a single-shot drilling cycle. The cutting parameters change at the material interface — program a feed reduction (30-50%) when transitioning from composite to titanium to prevent exit burr while managing the titanium's work hardening. Use through-coolant at 70+ bar pressure for Ti chip evacuation. GibbsCAM's cycle tracks the tool position relative to the defined material stack boundaries and can output adaptive feed commands.

**Category:** cam_strategy
**Confidence:** 82
**Source:** web:gibbscam-docs

## Related
- [[edgecam-cam-tips-ec-165|Composite Stack Drilling with Stepped Parameters]]
- [[surfcam-cam-tips-sc2-173|SURFCAM Composite Stack Drilling for CFRP/Titanium Laminates]]
- [[gibbscam-cam-tips-gc-114|Composite machining requires compression routers and dust extraction setup]]
- [[gibbscam-cam-tips-gc-181|GibbsCAM composite trimming uses compression routers to prevent delamination]]
- [[gibbscam-cam-tips-gc-182|GibbsCAM composite drilling with orbital motion eliminates fiber breakout]]
