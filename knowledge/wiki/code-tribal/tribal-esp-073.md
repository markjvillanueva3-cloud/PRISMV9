---
name: tribal-esp-073
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["post-processor", "machine-specific", "controller", "tcp"]
confidence: 89
source: "web:esprit-post-processor"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-073.md
promoted_at: 2026-06-09T22:31:16.229Z
---

# Machine-Specific G-Code Output Optimization

Different CNC controllers interpret G-code differently. ESPRIT's machine-specific posts handle these nuances: Fanuc uses G43.4/G43.5 for 5-axis TCP, Siemens uses TRAORI, Heidenhain uses TCPM. Configure the exact controller model (e.g., Fanuc 31i-B5 vs. 30i) as even minor version differences affect cycle output. Enable 'RTCP/TCP output' for 5-axis machines and set the correct pivot length in the post to match the machine's kinematic calibration.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:esprit-post-processor
**Operations:** post_processing

## Related
- [[edgecam-cam-tips-ec-077|Machine-Specific Post Configuration]]
- [[topsolid-cam-tips-ts-071|Machine-Specific Post Handles Unique Controller Features]]
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[catia-cam-tips-cat-070|Post-Processor Table Customization for Controller Compatibility]]
