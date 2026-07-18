---
name: tribal-sc-088
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["solidcam", "gpp", "vmid", "5-axis", "kinematics"]
confidence: 90
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-088.md
promoted_at: 2026-05-26T16:07:20.433Z
---

# GPP Multi-Axis Output — VMID Settings for 5-Axis G-Code Format

The VMID Machine Definition controls whether 5-axis output uses Euler angles (A/B/C words), tool tip vectors (I/J/K words), or machine joint angles. For Heidenhain controls, configure VMID for Euler angles with the correct rotation order (typically C-A or B-C). For FANUC, use machine joint angles that match the kinematic configuration (table-table, head-head, or mixed). Incorrect VMID kinematics cause the post to output valid-looking but geometrically wrong positions that gouge the part.

**Category:** programming
**Confidence:** 90
**Source:** web:solidcam-docs
**Operations:** 5axis_roughing, 5axis_finishing, post_processing

## Related
- [[solidcam-cam-tips-sc-158-2|Digital Twin Feedback for Continuous Improvement]]
- [[solidcam-cam-tips-sc-159-2|AMSAA Reliability Growth for Program Maturity]]
- [[solidcam-cam-tips-sc-160-2|Deflection Compensation δ=FL³/3EI for Finishing]]
- [[solidcam-cam-tips-sc-162-2|Gamma Process for Monotonic Degradation]]
- [[solidcam-cam-tips-sc-163-2|Copula for Dependent Failure Modes]]
