---
name: tribal-ctrl-006
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["fanuc", "tool-life", "sister-tools", "lights-out", "automation"]
confidence: 88
source: "controller:fanuc_tool_mgmt"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-006.md
promoted_at: 2026-06-09T22:31:16.134Z
---

# Fanuc tool life management M-codes

Enable Fanuc tool life management with parameter #6800 bit 0 = 1. Register tool groups with G10 L3 P1 (group 1 setup), then list tools: T0101 H01 (first tool), T0202 H02 (sister tool). When tool 1 reaches life limit (set via G10 L3 Q_ count), the control automatically substitutes the sister tool. Monitor with system variable #6001 (current tool life counter). Critical for lights-out operations.

**Category:** programming
**Confidence:** 88
**Source:** controller:fanuc_tool_mgmt

## Related
- [[controller-knowledge-tips-ctrl-065|Fanuc Macro B tool breakage detection pattern]]
- [[controller-knowledge-tips-ctrl-056|Fanuc G10 programmatic offset setting for automation]]
- [[esprit-cam-tips-esp-180|ESPRIT API Integration with ERP and MES Systems]]
- [[bobcad-cam-tips-bc-090|Machine-Specific Posts for Major CNC Brands]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
