---
id: "ctrl-091"
title: "Haas probing setup requirements and WIPS integration"
source: "controller:web_research"
confidence: 80
category: "programming"
tags: ["controller", "haas", "probing", "WIPS", "Renishaw", "setup"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.224Z
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
