---
name: tribal-sc-147
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "pencil-milling", "corner-cleanup", "die-mold", "finishing"]
confidence: 90
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-147.md
promoted_at: 2026-05-26T16:07:20.462Z
---

# Pencil Milling Cleanup — Reach Corners Left by Larger Tools

SolidCAM's Pencil Milling strategy targets internal corners and fillets where larger tools left material. The toolpath follows the intersection lines between surfaces, driving a smaller ball or bull-nose end mill along concave edges. Set the pencil milling tolerance tighter than the previous finishing pass (0.005mm vs 0.01mm). Use the 'number of offsets' parameter to widen the pencil path — 1 offset for sharp corners, 2-3 offsets for wider blend zones. Enable the 'smooth connections' option to avoid retracts between adjacent pencil segments. For mold work, pencil milling after a constant-stepover finish eliminates the visible corner line that would otherwise require hand polishing.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:solidcam-docs
**Operations:** finishing, cleanup

## Related
- [[hypermill-cam-tips-ext-hm-149|Taguchi Robust Design for Stable Machining]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
- [[solidcam-cam-tips-sc-145-2|Bayesian Feed Rate Updating from Production Data]]
- [[solidcam-cam-tips-sc-146-2|Cpk Prediction from Error Budget Analysis]]
