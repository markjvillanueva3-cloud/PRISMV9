---
id: "cw-090"
title: "Macro Support in Posts — Custom Variable Output for Shop Floor Flexibility"
source: "web:camworks-docs"
confidence: 86
category: "cam_strategy"
tags: ["camworks", "post-processor", "macros", "variables", "shop-floor"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.713Z
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
