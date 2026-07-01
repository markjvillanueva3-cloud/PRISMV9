---
type: tribal-consolidation
topic: controller
iso_week: 2026-24
cluster_size: 7
cluster_size_synthesized: 7
aggregate_confidence: 91.7
tags: ["operation:5_axis", "5-axis", "operation:roughing", "operation:finishing", "controller:fanuc", "siemens", "SINUMERIK", "controller:siemens"]
materials: []
operations: ["pocketing", "roughing", "finishing", "tapping", "milling", "5_axis", "drilling", "threading"]
_consolidatedAt: 2026-06-09T06:33:51.702Z
epistemic_only: true
consumed_by_machining: false
milestone: OBSIDIAN-COMPOUND-MS1/S6/U-TRIBAL-CONSOLIDATE
---
# Tribal: controller — 2026-24

_7 tips clustered on 'controller' with mean confidence 91.7/100. The vault is supposed to talk back; this is what it heard from the shop floor this week._

## Top Tips (7)

### 1. Haas-specific G-codes beyond standard Fanuc: G143, G150, G154, G187, G234, G254

- **id:** `TK-DL-haas-001` · **confidence:** 95/100 · **usage:** 0
- **source:** document:haas-2023-mill-operators-manual
- **tags:** haas, g-codes, G143, G187, G234, G254

Haas NGC control extends Fanuc compatibility with unique codes: G143 (5-axis tool length comp, replaces G43.4), G150 (general purpose pocket milling cycle), G154 P1-P99 (99 extended work coordinates — far more than Fanuc's 48), G156 (broach…

### 2. CRITICAL: Okuma G28 = torque limit cancel (NOT home return!), G20 = home return

- **id:** `TK-DL-okuma-001` · **confidence:** 95/100 · **usage:** 0
- **source:** document:Okuma-OSP-P200L-Programming-Manual
- **tags:** okuma, OSP-P200L, g-code, G28-danger, translation, safety-critical

Okuma OSP-P200L G-code numbering differs fundamentally from Fanuc — direct translation will CRASH the machine. Critical differences: G20=home position return (Fanuc G28), G28=torque limit cancel (Fanuc: home return!), G29=torque limit comma…

### 3. Siemens SINUMERIK 5-axis: TRAORI activation, CYCLE832 8-digit encoding, orientation modes

- **id:** `TK-DL-siemens-5ax-001` · **confidence:** 92/100 · **usage:** 0
- **source:** document:Siemens-SINUMERIK-5-Axis-Programming
- **tags:** siemens, SINUMERIK, TRAORI, CYCLE832, 5-axis, ORIAXES

SINUMERIK 5-axis essentials: (1) TRAORI activates 5-axis transformation — MUST be called before any 5-axis motion. TRAFOOF deactivates. After tool change, re-issue TRAORI (WO resets). (2) CYCLE832 parameter is 8 digits: positions 1-2 = tole…

### 4. Haas macro variables: #7001-#7386 work offsets, #8608-#8617 tool usage tracking

- **id:** `TK-DL-haas-002` · **confidence:** 90/100 · **usage:** 0
- **source:** document:haas-2023-mill-operators-manual@macros
- **tags:** haas, macro, variables, automation, tool-usage, work-offsets

Haas macro variable ranges for automation: #7001-#7006 = G110 (G154 P1) offsets, #7021-#7026 = G111 (G154 P2), through #7041-#7386 for G112-G129 (G154 P3-P20). Extended: #14001-#15966 for G154 P1-P99. Tool usage tracking: #8608 (set desired…

### 5. Okuma named variables and LAP auto-programming (G80-G88) for turning cycles

- **id:** `TK-DL-okuma-002` · **confidence:** 90/100 · **usage:** 0
- **source:** document:Okuma-OSP-P200L-Programming-Manual
- **tags:** okuma, named-variables, LAP, G80-G88, safety-barrier, M24

Okuma OSP unique features: (1) Named variables: Okuma uses COMMON VARIABLE with names (VC1-VC200 common, VB1-VB100 local) instead of Fanuc # numbers. System variables: VTOFX/Z (tool offset X/Z), VMTRS (tool-change count), VSPDR (spindle spe…

### 6. Siemens 3D tool radius compensation: CUT2D/CUT3DC/CUT3DCC/CUT3DF modes for 5-axis

- **id:** `TK-DL-siemens-3d-comp-001` · **confidence:** 90/100 · **usage:** 0
- **source:** document:Siemens-5-Axis-Machining-Manual
- **tags:** siemens, SINUMERIK, CUT3DC, CUT3DCC, CUT3DF, tool-radius-compensation

SINUMERIK 3D tool radius compensation modes for 5-axis machining: (1) CUT2D/CUT2DF: 2.5D compensation with plane from G17-G19 or frame. Standard for 3-axis. (2) CUT3DC: 3D circumferential milling — compensation perpendicular to path tangent…

### 7. Siemens ORIPATH (LEAD/TILT), ORIWKS vs ORIMKS, TOROT safe retract from slanted holes

- **id:** `TK-DL-siemens-5ax-003` · **confidence:** 90/100 · **usage:** 0
- **source:** document:Siemens-5-Axis-Machining-Manual
- **tags:** siemens, SINUMERIK, ORIPATH, LEAD, TILT, ORIWKS

SINUMERIK advanced 5-axis orientation: (1) ORIPATH: path-related interpolation — defines end orientation via LEAD (rotation in plane of normal+tangent) and TILT (rotation around normal vector). Corresponds to spherical coordinates with surf…

## Common Threads

Top tags across the cluster: `operation:5_axis`, `5-axis`, `operation:roughing`, `operation:finishing`, `controller:fanuc`, `siemens`, `SINUMERIK`, `controller:siemens`.

## Sources Cited

- document:Okuma-OSP-P200L-Programming-Manual (2)
- document:Siemens-5-Axis-Machining-Manual (2)
- document:haas-2023-mill-operators-manual (1)
- document:Siemens-SINUMERIK-5-Axis-Programming (1)
- document:haas-2023-mill-operators-manual@macros (1)

## Citations

- [[TK-DL-haas-001]]
- [[TK-DL-okuma-001]]
- [[TK-DL-siemens-5ax-001]]
- [[TK-DL-haas-002]]
- [[TK-DL-okuma-002]]
- [[TK-DL-siemens-3d-comp-001]]
- [[TK-DL-siemens-5ax-003]]

