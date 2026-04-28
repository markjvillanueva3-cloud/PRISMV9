---
id: "ctrl-050"
title: "Universal probing compatibility across controllers"
source: "controller:renishaw_compatibility"
confidence: 92
category: "programming"
tags: ["probing", "renishaw", "cross-controller", "macro", "measurement"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.191Z
---

# Universal probing compatibility across controllers

Renishaw probing cycles work across all major controllers but with different macro call numbers: Fanuc G65 P9810-P9814, Siemens CYCLE977/978/976, Heidenhain Touch Probe Cycles 0-4/400-405/40x, Haas G65 P9995/P9023, Okuma uses proprietary O-numbers. The probe hardware (OMP60, RMP600, OTS) is universal — only the software interface differs. Blum probes use their own macro sets. Always use the correct macro package for your controller.

**Category:** programming
**Confidence:** 92
**Source:** controller:renishaw_compatibility

## Related
- [[controller-knowledge-tips-ctrl-016|Siemens measuring cycles CYCLE977/978 for probing]]
- [[controller-knowledge-tips-ctrl-023|Haas macro variables and probing]]
- [[controller-knowledge-tips-ctrl-053|Fanuc probing with G31 skip signal]]
- [[controller-knowledge-tips-ctrl-090|Haas macro look-ahead gotcha — G103 P1 for variable reads]]
- [[controller-knowledge-tips-ctrl-091|Haas probing setup requirements and WIPS integration]]
