---
name: tribal-sc2-210
category: code-tribal
subdomain: post_processing
domain: tribal-knowledge
tags: ["post-processor", "variables", "conditional-logic", "5-axis", "kinematic"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-210.md
promoted_at: 2026-06-09T22:31:16.705Z
---

# SURFCAM Post Processor Variable System for Dynamic Output

SURFCAM's post processor uses variables to dynamically insert values into G-code output. System variables include: @tool_number, @spindle_speed, @feed_rate, @x_pos, @y_pos, @z_pos, @a_axis, @b_axis, @coolant_code. User-defined variables can store intermediate calculations. Use conditional logic: IF @tool_change THEN output_toolchange_block END. For 5-axis posts, compute the rotary axis values from the tool axis vector using the machine's kinematic model. Test all variable substitutions with a range of operations to ensure correct output for edge cases (first tool, last tool, no-coolant operations).

**Category:** post_processing
**Confidence:** 0.87
**Source:** web:surfcam-docs
**Operations:** roughing, finishing, 5_axis

## Related
- [[camworks-cam-tips-cw-086|Multi-Axis Post Processors — Handle Rotary Axis Output Correctly]]
- [[camworks-cam-tips-cw-090|Macro Support in Posts — Custom Variable Output for Shop Floor Flexibility]]
- [[controller-knowledge-tips-ctrl-068|TOROT, TOFRAME, and TCARR Tool Orientation Commands]]
- [[controller-knowledge-tips-ctrl-069|CUT2D/CUT3DC/CUT3DF 3D Tool Compensation Modes]]
- [[esprit-cam-tips-esp-075|Variable Output and Conditional Logic in Posts]]
