---
name: tribal-ec-167
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["composite", "waterjet", "5-axis", "trimming"]
confidence: 0
source: "web:edgecam-forum"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-167.md
promoted_at: 2026-06-09T22:31:16.200Z
---

# Composite Waterjet Trimming Toolpath from Edgecam

Edgecam can generate 5-axis waterjet trimming toolpaths for composite parts. Define the waterjet as a custom tool with the nozzle diameter (0.3-1.0mm) and standoff distance (2-5mm). Set kerf compensation equal to half the waterjet stream diameter at the cutting surface. Program lead-in/lead-out moves to avoid waterjet dwell marks. For curved composite panels, enable normal-to-surface orientation to maintain consistent standoff across the 3D contour.

**Category:** cam_strategy
**Confidence:** 0.79
**Source:** web:edgecam-forum
**Operations:** finishing

## Related
- [[bobcad-cam-tips-bc-037|5-Axis Trimming for Composite and Sheet Parts]]
- [[edgecam-cam-tips-ec-031|5-Axis Trimming for Sheet and Composite Parts]]
- [[esprit-cam-tips-esp-036|5-Axis Trimming for Composite and Sheet Parts]]
- [[surfcam-cam-tips-sc2-043|Trimming Operations for Composite and Sheet Parts]]
- [[worknc-cam-tips-wnc-169|Composite Contour Machining — 5-Axis Trimming with Auto5]]
