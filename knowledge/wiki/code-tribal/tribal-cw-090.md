---
name: tribal-cw-090
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "post-processor", "macros", "variables", "shop-floor"]
confidence: 86
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-090.md
promoted_at: 2026-06-09T22:31:16.007Z
---

# Macro Support in Posts — Custom Variable Output for Shop Floor Flexibility

Configure the post to output macro variables (#100-#199 on Fanuc) for parameters that operators may need to adjust: work offset number, tool length offset number, coolant mode, or approach distance. This allows shop floor adjustment without editing the G-code program. Example: use #101 for finish allowance in a roughing program — the operator can adjust stock-to-leave without reprogramming. Document all macro variables in the program header comment block.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:camworks-docs
**Operations:** milling, turning

## Related
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
- [[camworks-cam-tips-cw-086|Multi-Axis Post Processors — Handle Rotary Axis Output Correctly]]
- [[camworks-cam-tips-cw-087|Canned Cycle Output — Map Operations to Controller Drill Cycles]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[camworks-cam-tips-cw-089|Sub-Program Output — Reduce G-Code File Size for Pattern Operations]]
