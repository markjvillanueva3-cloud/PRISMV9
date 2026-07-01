---
name: tribal-ctrl-009
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["fanuc", "coolant", "tsc", "through-spindle", "m-codes", "oem"]
confidence: 95
source: "controller:multi_oem_reference"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-009.md
promoted_at: 2026-05-26T16:07:20.116Z
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
