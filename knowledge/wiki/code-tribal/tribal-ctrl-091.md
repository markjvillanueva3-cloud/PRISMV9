---
name: tribal-ctrl-091
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "haas", "probing", "WIPS", "Renishaw", "setup"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-091.md
promoted_at: 2026-06-09T22:31:16.153Z
---

# Haas probing setup requirements and WIPS integration

Haas probing requires multiple options enabled via unlock codes: spindle orientation, macros (Setting 9), coordinate rotation and scaling. The Renishaw 9000-series programs must be loaded. NGC introduced WIPS (Wireless Intuitive Probe System) which simplifies probe setup through guided dialogs. Key settings: Setting 59 (probe diameter), Setting 65 (probe overtravel). Probe results stored in macro variables #140-#199 (Renishaw) or system variables. Always verify probe stylus calibration ring diameter matches Setting 119. Tool setter requires separate calibration macro (O09995).

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-090|Haas macro look-ahead gotcha — G103 P1 for variable reads]]
- [[controller-knowledge-tips-ctrl-023|Haas macro variables and probing]]
- [[edgecam-cam-tips-ec-109|Setup Probing for Automatic Work Offset]]
- [[esprit-cam-tips-esp-115|On-Machine Probing for Work Offset Setup]]
- [[controller-knowledge-tips-ctrl-053|Fanuc probing with G31 skip signal]]
