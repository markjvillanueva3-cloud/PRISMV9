---
id: "ctrl-009"
title: "Fanuc through-spindle coolant M-codes vary by OEM"
source: "controller:multi_oem_reference"
confidence: 95
category: "programming"
tags: ["fanuc", "coolant", "tsc", "through-spindle", "m-codes", "oem"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.160Z
---

# Fanuc through-spindle coolant M-codes vary by OEM

Through-spindle coolant (TSC) M-codes are NOT standardized on Fanuc-based machines. Haas: M88 on / M89 off. DMG MORI: M51 on / M59 off. DN Solutions: M68 on / M69 off. Brother: M85 on / M86 off. Always check the OEM manual, not generic Fanuc docs. Standard coolant (M8 flood, M7 mist, M9 off) is universal across all Fanuc machines.

**Category:** programming
**Confidence:** 95
**Source:** controller:multi_oem_reference

## Related
- [[controller-knowledge-tips-ctrl-057|Fanuc coolant M-codes including through-spindle]]
- [[catia-cam-tips-cat-190|CATIA PP Table Coolant and Auxiliary Function Mapping]]
- [[cimatron-cam-tips-cim-025|Coolant Strategy Selection by Operation Type]]
- [[controller-knowledge-tips-ctrl-024|Haas NGC unique M-codes reference]]
- [[bobcad-cam-tips-bc-090|Machine-Specific Posts for Major CNC Brands]]
