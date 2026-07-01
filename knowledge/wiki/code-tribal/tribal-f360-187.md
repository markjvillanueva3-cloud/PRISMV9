---
name: tribal-f360-187
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "coolant-strategy", "flood", "mql", "through-tool"]
confidence: 0
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-187.md
promoted_at: 2026-06-09T22:31:16.297Z
---

# Coolant Strategy Selection by Operation Type

Match coolant delivery to the operation in Fusion: Flood (M8) for deep pocketing, slotting, and drilling where chip evacuation is the priority. Through-tool (M88 or custom) for drilling >3xD, tapping, and deep cavity milling. Mist/MQL (M7) for general milling, contouring, and operations where flood coolant causes thermal shock (e.g., interrupted cuts in cast iron). Air blast (M7 without oil) for dry machining of cast iron and graphite where coolant causes mud. Off (M9) for finishing passes in hardened steel where the tool edge temperature needs to be consistently high (CBN/ceramic cutting). Program coolant mode per-operation in Fusion rather than per-setup to optimize for each cutting condition.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:fusion360-docs
**Operations:** general

## Related
- [[fusion360-cam-tips-ext-f360-190|Coolant Transition Management Between Operations]]
- [[fusion360-cam-tips-ext-f360-186|MQL Configuration in Fusion Post Processor]]
- [[cimatron-cam-tips-cim-025|Coolant Strategy Selection by Operation Type]]
- [[fusion360-cam-tips-ext-f360-040|Fine-Tune Optimal Load by Material Hardness]]
- [[fusion360-cam-tips-ext-f360-041|Multi-Depth Adaptive with Progressive Stepdown]]
