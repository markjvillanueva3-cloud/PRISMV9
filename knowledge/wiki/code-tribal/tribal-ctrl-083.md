---
name: tribal-ctrl-083
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "heidenhain", "collision-avoidance", "DCM", "safety"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-083.md
promoted_at: 2026-06-09T22:31:16.151Z
---

# TNC 640 Dynamic Collision Monitoring (DCM)

DCM monitors the full work envelope in ALL operating modes (auto, manual, handwheel) and stops motion before collision. Unlike CAM-based collision checking, DCM uses the actual machine kinematic model with real-time tool/holder geometry. Critical setup: tool and holder dimensions must be accurately defined in the tool table (columns DL, DR, R2 plus holder definition). DCM will NOT protect against workpiece collisions unless a workpiece blank is defined via Cycle 20/Q-parameters. Performance impact: DCM can reduce rapid traverse speeds by 5-15% due to look-ahead calculations.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-096|Okuma Collision Avoidance System (CAS) — real-time 3D protection]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-058|Fanuc Dual Check Safety (DCS) system]]
- [[controller-knowledge-tips-ctrl-064|Fanuc turning vs milling controller G-code conflicts]]
- [[controller-knowledge-tips-ctrl-072|Safety Integrated: SOS, SLS, SS1, SSM Functions]]
