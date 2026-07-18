---
name: tribal-bc-198
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["hard-milling", "mql", "air-blast", "thermal-shock", "cbn"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-198.md
promoted_at: 2026-06-09T22:31:15.981Z
---

# BobCAD MQL and Air Blast Configuration for Hard Milling

Configure BobCAD's post processor for MQL (minimum quantity lubrication) or air blast cooling in hard milling operations. Flood coolant causes thermal shock cracking of CBN/ceramic tools at 50+ HRC. Program MQL activation M-codes at tool change (typically M50/M51 for MQL on/off). Set the MQL flow rate to 5-20 ml/hour. For air blast, use 6-8 bar pressure directed at the cutting zone to evacuate chips without cooling the tool. BobCAD's coolant settings per operation allow mixing strategies: MQL for finishing (keeps surface clean) and air blast for roughing (better chip evacuation). Never use flood coolant on CBN inserts.

**Category:** setup
**Confidence:** 0.87
**Source:** web:bobcad-docs
**Operations:** roughing, finishing

## Related
- [[surfcam-cam-tips-sc2-184|SURFCAM Thermal Management Strategy for Hard Milling Operations]]
- [[bobcad-cam-tips-bc-117|Hardened Steel (>45 HRC) with Light Passes and Dry Cutting]]
- [[fusion360-cam-tips-ext-f360-194|Hardened Steel (50-65 HRC) Hard Milling Strategy]]
- [[mastercam-cam-tips-mc-138|Hard milling above 55 HRC demands rigid short-tool setups and light radial engagement]]
- [[surfcam-cam-tips-sc2-101|Hardened Steel (>45 HRC) with Light Passes and CBN/Ceramic Tools]]
