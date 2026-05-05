---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-fanuc-alarm-001
title: Fanuc alarm codes: top 15 crash-risk alarms every machinist must know
category: troubleshooting
subcategory: crash_recovery
domain: document_learned
knowledge_type: anti_pattern
confidence: 95
source: document:CNCCookbook-Fanuc-Alarm-Code-List
created_at: 2026-03-06
usage_count: 0
tags: ["fanuc", "alarm", "servo", "crash-risk", "error-codes", "safety", "diagnostics", "controller:fanuc"]
material_groups: []
operation_types: []
content_hash: 67d559dcaf1819578f7efd4e29b6b4df7ef5ce587bfae7833aab8f70a49e7bbe
mirror_ts: 2026-05-05T13:36:00.850Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc alarm codes: top 15 crash-risk alarms every machinist must know

**Category:** `troubleshooting` · **Subcategory:** `crash_recovery` · **Domain:** `document_learned`

**Confidence:** `95` · **Source:** `document:CNCCookbook-Fanuc-Alarm-Code-List`

## Tip

Critical Fanuc alarm codes ranked by crash/damage risk: SERVO alarms (machine damage): 400=motor overload (STOP IMMEDIATELY), 407=excess following error (axis lost position — CRITICAL), 409=torque limit exceeded. Programming (crash risk): 11=no feedrate commanded (will freeze mid-cut), 29/30=illegal offset value/number (wrong tool comp → gouge), 33=no CRC solution (geometry impossible), 38/41=interference in circular/CRC block (tool will gouge), 90=reference return incomplete (machine doesn't know position — DANGEROUS). Common: 3=too many digits, 10=improper G-code, 20=over tolerance of radius (arc center/endpoint mismatch >0.001mm), 59=program number not found, 70=no memory space, 77=subprogram nesting exceeded (max 4 levels on most controls), 85=communication error, 112=divide by zero in macro. Action for servo alarms: DO NOT restart without understanding cause — check for mechanical binding, crashed tool, or drive failure.

## Related tips

- [[wedm-sp-002|Makino SP43/SP64 vs Mitsubishi FA-10S: E-pack numbering is incompatible — never cross-apply codes]] _(category)_
- [[wedm-kb-007|Ra worse than expected: check water resistivity first]] _(category)_
- [[wedm-kb-004|Flush pressure prevents wire breaks in deep cuts]] _(category)_
- [[wedm-kb-001|Wire breakage: reduce power before increasing tension]] _(category)_
- [[wedm-kb-016|Thermal distortion in thick sections: stress relief first]] _(category)_

## Tags

#fanuc #alarm #servo #crash-risk #error-codes #safety #diagnostics #controller-fanuc
