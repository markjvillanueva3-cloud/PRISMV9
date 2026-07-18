---
name: tribal-mc-109
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["mastercam", "tool-measurement", "probe", "tool-length", "tool-diameter", "breakage-detect"]
confidence: 85
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-109.md
promoted_at: 2026-06-09T22:31:16.422Z
---

# Tool measurement probing verifies tool length and radius before cutting

Program tool measurement probe cycles in Mastercam to verify tool length and diameter at the start of each job or after a tool change. The probe cycle touches the tool to a fixed probe (table-mounted for length, arm-mounted for diameter) and updates the tool offset register. Set a tolerance band (+/-0.05 mm for length, +/-0.02 mm for diameter) — if the measured value falls outside this band, the program alarms and stops. This catches broken tools, wrong tools, and incorrect tool setting before they produce scrap.

**Category:** quality
**Confidence:** 85
**Source:** web:community
**Operations:** probing, tooling

## Related
- [[mastercam-cam-tips-mc-110|In-process inspection probes critical dimensions between operations]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[surfcam-cam-tips-sc2-205|SURFCAM Tool Length Measurement with Laser Probe]]
- [[mastercam-cam-tips-mc-040|Dynamic Mill micro lifts eliminate full retracts between slices]]
