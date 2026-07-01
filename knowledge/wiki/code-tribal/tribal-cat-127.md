---
name: tribal-cat-127
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "3dexperience", "cloud", "latency", "performance"]
confidence: 0
source: "web:dassault-forum"
promoted_from: knowledge/tribal/catia-cam-tips-cat-127.md
promoted_at: 2026-06-09T22:31:16.059Z
---

# 3DEXPERIENCE Cloud vs On-Premise Manufacturing Data Latency

When running 3DEXPERIENCE manufacturing apps on cloud infrastructure, tool path computation happens locally on the client workstation — only PLM metadata travels to the cloud. However, loading large tool catalogs or machine definitions from 3DSpace on a cloud tenant introduces 2-5 second latency per object retrieval. Mitigate by using 'Prefetch' in the Manufacturing context to cache machine, tool, and stock data locally before starting programming. On-premise deployments avoid this latency since 3DSpace runs on the local network.

**Category:** cam_strategy
**Confidence:** 0.79
**Source:** web:dassault-forum
**Operations:** setup

## Related
- [[catia-cam-tips-cat-075|Cloud CAM on 3DEXPERIENCE Enables Browser-Based NC Programming]]
- [[catia-cam-tips-cat-076|DELMIA Machining Integration for Shop Floor Connectivity]]
- [[catia-cam-tips-cat-077|Digital Twin Machining Simulation on 3DEXPERIENCE]]
- [[catia-cam-tips-cat-078|Collaborative Machining Enables Multi-User NC Programming]]
- [[catia-cam-tips-cat-079|Data Management and Revision Control for NC Programs]]
