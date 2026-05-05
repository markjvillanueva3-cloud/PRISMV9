---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-198
title: Haas G150 general pocket milling — mandatory pre-drill and subprogram boundary format
category: programming
subcategory: cam_strategy
domain: cam_software
knowledge_type: rule
confidence: 94
source: controller:haas_ngc_programming_manual
created_at: 2026-04-15
usage_count: 0
tags: ["haas", "ngc", "g150", "pocket-milling", "pre-drill", "subprogram", "boundary", "conversational", "cutter-comp", "jm-die", "operation:pocketing", "operation:roughing", "operation:finishing", "operation:drilling", "operation:milling", "operation:plunge_milling", "machine:Haas", "tool:drill", "controller:haas"]
material_groups: []
operation_types: ["pocketing", "roughing", "finishing", "drilling", "milling", "plunge_milling"]
content_hash: 2171d3ecaa1a31c54c74a9e372f3febc14897f11e7af2ee3e94450890d106348
mirror_ts: 2026-05-05T13:36:00.914Z
mirror_engine: TribalVaultPopulatorEngine
---

# Haas G150 general pocket milling — mandatory pre-drill and subprogram boundary format

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `cam_software`

**Confidence:** `94` · **Source:** `controller:haas_ngc_programming_manual`

## Tip

G150 is Haas NGC's built-in general-purpose pocket milling cycle that replaces a CAM-generated roughing toolpath with a compact G-code call. The pocket boundary is defined in a separate O-number subprogram using standard G01/G02/G03 moves. Critical rules for G150: (1) ALWAYS pre-drill or helical-enter to full pocket depth before calling G150 — the cycle has no entry strategy and will plunge straight through material if no entry hole exists; (2) Position the tool at the entry hole center at pocket depth before G150; (3) Subprogram must start at a point ON the pocket boundary (not inside it) and end with M99; (4) Include D (cutter compensation register) — G150 uses tool radius from the D register, not from T offset. G150 parameter summary: P=subprogram number, D=cutter comp register, I=stepover, J=overlap, K=Z step per pass, L=finish passes, Q=start offset, F=feedrate. Practical use at JM Die: G150 is used for simple rectangular and circular die pocket roughing when running modified programs directly at the control without reposting from HyperMILL. Combine with G41/G42 cutter comp for accurate pocket sizing on finish passes.

## Applies to

- Operation types: `pocketing`, `roughing`, `finishing`, `drilling`, `milling`, `plunge_milling`

## Related tips

- [[ctrl-089|Haas G150 general pocket milling — mini-CAM in G-code]] _(category+op:5+tag:10)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:4+tag:7)_
- [[ctrl-194|Haas Visual Quick Code (VQC) — conversational programming from the machine front panel]] _(category+op:3+tag:9)_
- [[ctrl-105|Haas G12/G13 circular pocket milling — CW/CCW without CAM]] _(category+op:4+tag:7)_
- [[ctrl-138|Hurco WinMax Profile milling with Max Offset]] _(category+op:4+tag:4)_

## Tags

#haas #ngc #g150 #pocket-milling #pre-drill #subprogram #boundary #conversational #cutter-comp #jm-die #operation-pocketing #operation-roughing #operation-finishing #operation-drilling #operation-milling #operation-plunge_milling #machine-haas #tool-drill #controller-haas
