---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-072
title: Safety Integrated: SOS, SLS, SS1, SSM Functions
category: programming
domain: controller_specific
knowledge_type: rule
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "siemens", "safety", "SOS", "SLS", "SS1", "SSM", "Safety-Integrated", "PROFIsafe", "material:P", "material:S7 Tool Steel", "controller:siemens"]
material_groups: ["P"]
operation_types: []
content_hash: 04b4638f9f4d44a4cce645aa2c51778d624fb2c0299b45e697c8a476906803e4
mirror_ts: 2026-05-05T13:36:03.952Z
mirror_engine: TribalVaultPopulatorEngine
---

# Safety Integrated: SOS, SLS, SS1, SSM Functions

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

SINUMERIK Safety Integrated provides certified (SIL 2 / PL d) safety functions through the SINAMICS drive system, communicated via PROFIsafe protocol. Key functions: SOS (Safe Operating Stop) - drive remains energized and in closed-loop control but monitors for zero velocity, preventing unintentional movement during loading/unloading without losing position reference. SS1 (Safe Stop 1) - controlled deceleration followed by STO (Safe Torque Off), time-monitored and acceleration-controlled. SLS (Safely-Limited Speed) - monitors that axis speed does not exceed configurable limits, essential for setup mode and door-open machining at reduced speed. SSM (Safe Speed Monitor) - provides a safety-rated binary signal when drive operates below a threshold, used for interlocking (e.g., door release only when spindle stopped). SLP (Safely-Limited Position) - monitors axis position within a configurable window. SDI (Safe Direction) - restricts axis to one direction of motion. All functions are configured in SINAMICS drive parameters and activated via safety PLC (F-PLC). SINUMERIK ONE uses integrated SIMATIC S7-1500F safety PLC. 840D sl uses external SIMATIC safety PLC. 828D has integrated safety with simpler configuration. These functions are mandatory for CE-marked machines and are tested during annual machine safety validation.

## Applies to

- Material groups: `P`

## Related tips

- [[ctrl-073|840D sl vs SINUMERIK ONE vs 828D Feature Comparison]] _(category+material:1+tag:5)_
- [[ctrl-228|JM Die Okuma CSS G96/G97 usage — constant surface speed for die turning]] _(category+material:1+tag:2)_
- [[ctrl-093|MAZATROL Intelligent Pocket Milling (IPM) for high-efficiency roughing]] _(category+material:1+tag:2)_
- [[ctrl-227|JM Die Okuma G74 peck drilling on lathe — deep hole drilling cycle]] _(category+material:1+tag:1)_
- [[ctrl-005|Fanuc high-speed peck drilling G73 vs G83]] _(category+material:1+tag:1)_

## Tags

#controller #siemens #safety #sos #sls #ss1 #ssm #safety-integrated #profisafe #material-p #material-s7-tool-steel #controller-siemens
