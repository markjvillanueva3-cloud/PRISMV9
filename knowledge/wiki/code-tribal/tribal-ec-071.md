---
name: tribal-ec-071
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["gouge-detection", "surface-quality", "simulation", "scrap"]
confidence: 90
source: "web:edgecam-simulation"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-071.md
promoted_at: 2026-05-26T16:07:20.180Z
---

# Gouge Detection for Surface Quality Assurance

Enable Edgecam's gouge detection in simulation to identify any location where the tool cuts below the finished surface model. Gouges as small as 0.005mm are flagged and highlighted in red. Common gouge causes: incorrect tool radius compensation, insufficient stock allowance, or tool deflection not accounted for in the program. Address all gouge warnings before sending the program to the machine — even minor gouges may scrap the part.

**Category:** quality
**Confidence:** 90
**Source:** web:edgecam-simulation
**Operations:** simulation

## Related
- [[fusion360-cam-tips-ext-f360-086|In-App Simulation Resolution for Detecting Small Gouges]]
- [[gibbscam-cam-tips-gc-086|Gouge detection sensitivity should match surface tolerance requirements]]
- [[surfcam-cam-tips-sc2-063|Solid Verification Detects Gouges Before Posting]]
- [[powermill-cam-tips-pm-023|ViewMill Verification Catches Gouges Before Machine]]
- [[surfcam-cam-tips-sc2-217|SURFCAM Material Removal Simulation Accuracy Settings]]
