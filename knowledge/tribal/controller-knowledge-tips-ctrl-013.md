---
id: "ctrl-013"
title: "Siemens COMPCAD vs COMPCURV compressor modes"
source: "controller:siemens_compressor_docs"
confidence: 88
category: "programming"
tags: ["siemens", "compcad", "compcurv", "compressor", "hsm", "toolpath"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.163Z
---

# Siemens COMPCAD vs COMPCURV compressor modes

SINUMERIK has two toolpath compressors: COMPCAD converts G1 segments into polynomial splines (best for CAM-generated paths), COMPCURV preserves the original path better for hand-programmed contours. For HSM with CAM output, always use COMPCAD — it can reduce block count 90% while maintaining tolerance. Set tolerance with G642 or CYCLE832. COMPOF disables compression.

**Category:** programming
**Confidence:** 88
**Source:** controller:siemens_compressor_docs

## Related
- [[controller-knowledge-tips-ctrl-011|Siemens CYCLE832 high-speed machining settings]]
- [[bobcad-cam-tips-bc-090|Machine-Specific Posts for Major CNC Brands]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-012|Siemens TRAORI for 5-axis transformation]]
- [[controller-knowledge-tips-ctrl-014|Siemens ShopMill conversational vs G-code programming]]
