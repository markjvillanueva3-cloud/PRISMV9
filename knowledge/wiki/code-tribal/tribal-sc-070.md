---
name: tribal-sc-070
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "5-axis", "impeller", "splitter-blades", "turbomachinery"]
confidence: 84
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-070.md
promoted_at: 2026-06-09T22:31:16.587Z
---

# 5-Axis Impeller Machining — Splitter Blade Strategy

For impellers with splitter blades (alternating full and partial blades), program the full blades first with standard impeller roughing, then create a separate operation for splitter blade channels. Reference the full-blade operation's stock model so the splitter pass only machines the remaining material. Set the tool axis to follow the splitter blade ruling lines independently — do not copy the full blade's axis control, as splitter blades often have different twist angles requiring 3-5 degrees more tilt.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:solidcam-docs
**Operations:** 5axis_roughing, 5axis_finishing, impeller

## Related
- [[solidcam-cam-tips-sc-158-2|Digital Twin Feedback for Continuous Improvement]]
- [[solidcam-cam-tips-sc-159-2|AMSAA Reliability Growth for Program Maturity]]
- [[solidcam-cam-tips-sc-160-2|Deflection Compensation δ=FL³/3EI for Finishing]]
- [[solidcam-cam-tips-sc-162-2|Gamma Process for Monotonic Degradation]]
- [[solidcam-cam-tips-sc-163-2|Copula for Dependent Failure Modes]]
