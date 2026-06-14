---
type: tribal-consolidation
topic: programming
iso_week: 2026-24
cluster_size: 200
cluster_size_synthesized: 10
aggregate_confidence: 85.9
tags: ["controller:fanuc", "document-learned", "wire-edm", "machine:Mitsubishi", "fanuc", "mitsubishi", "fa-10s", "operation:threading"]
materials: ["H", "P", "M"]
operations: ["wire_edm", "turning", "threading", "probing", "milling"]
_consolidatedAt: 2026-06-09T06:33:51.702Z
epistemic_only: true
consumed_by_machining: false
milestone: OBSIDIAN-COMPOUND-MS1/S6/U-TRIBAL-CONSOLIDATE
---
# Tribal: programming — 2026-24

_200 tips clustered on 'programming' with mean confidence 85.9/100. The vault is supposed to talk back; this is what it heard from the shop floor this week._

## Top Tips (10)

### 1. Always use double M78 M78 for tank fill on Mitsubishi FA-10S

- **id:** `wedm-jmd-002` · **confidence:** 98/100 · **usage:** 0
- **source:** jm_die_programs
- **tags:** wire-edm, m78, tank-fill, mitsubishi, fa-10s, awt

On the Mitsubishi FA-10S at JM Die, the Fill Tank command M78 is ALWAYS issued twice in succession (M78 M78) before every cut restart. This is not a typo — a single M78 starts the pump but the FA-10S requires a second M78 to confirm and hol…

### 2. H175 master offset: global trim variable for JM Die Mitsubishi FA-10S

- **id:** `wedm-jmd-001` · **confidence:** 97/100 · **usage:** 0
- **source:** jm_die_programs
- **tags:** wire-edm, h175, offset, mastercam, mitsubishi, fa-10s

JM Die uses a shop-standard H175 variable as a global master trim offset applied to ALL wire compensation H-registers. The header pattern is: 'H175 = 0.0000' followed by 'H1 = 0.0085 + H175', 'H2 = 0.0064 + H175', etc. This means the operat…

### 3. UV taper programs: set all H-register offsets to zero

- **id:** `wedm-jmd-005` · **confidence:** 96/100 · **usage:** 0
- **source:** jm_die_programs
- **tags:** wire-edm, taper, uv-axis, h-register, offset, e28xx

In JM Die's Mitsubishi FA-10S UV taper programs (E28xx family), ALL H-register wire compensation offsets are set to zero: H1=0.0+H175, H2=0.0+H175, etc. (and H175=0.0000 as well). This is confirmed in NOZE TEST.NC — a 5-pass UV taper stainl…

### 4. Fanuc extended work offsets G54.1 P1-P300

- **id:** `ctrl-003` · **confidence:** 95/100 · **usage:** 0
- **source:** controller:fanuc_operator_manual
- **tags:** fanuc, work-offsets, g54.1, pallet, tombstone, controller:fanuc

Beyond the standard G54-G59 (6 offsets), Fanuc controllers support G54.1 P1 through P300 for 300 additional work offsets. Essential for pallet systems and tombstone setups. On 0i-MF the default is 48 additional offsets (P1-P48); on 31i-B5 u…

### 5. Fanuc through-spindle coolant M-codes vary by OEM

- **id:** `ctrl-009` · **confidence:** 95/100 · **usage:** 0
- **source:** controller:multi_oem_reference
- **tags:** fanuc, coolant, tsc, through-spindle, m-codes, oem

Through-spindle coolant (TSC) M-codes are NOT standardized on Fanuc-based machines. Haas: M88 on / M89 off. DMG MORI: M51 on / M59 off. DN Solutions: M68 on / M69 off. Brother: M85 on / M86 off. Always check the OEM manual, not generic Fanu…

### 6. Cross-controller post processor selection guide

- **id:** `ctrl-049` · **confidence:** 95/100 · **usage:** 0
- **source:** controller:cross_reference_guide
- **tags:** post-processor, cam, cross-controller, selection-guide, machine:DMG Mori, machine:Mazak

Critical post-processor matching: Fanuc-based machines (DN Solutions, Feeler, YCM, Hartford, Brother) — use brand-specific Fanuc post, NOT generic. Siemens-based machines (DMG MORI CELOS, Chiron, GROB, Heller, Index, EMAG, Spinner) — use Si…

### 7. No M06 on lathes — T-word executes tool change

- **id:** `TK-DL-cnc-lathe-fundamentals-007` · **confidence:** 95/100 · **usage:** 0
- **source:** document:cnc-lathe-fundamentals
- **tags:** m06, t-word, tool-change, lathe, mill-turn, document-learned

Unlike mills, CNC lathes execute tool changes immediately with the T-word. No M06 required or allowed on most lathe controls. T0200 commands turret rotation to station 2 immediately. Some mill-turn machines use M06; verify your specific con…

### 8. G76 minimum cutting depth vs finish allowance

- **id:** `TK-DL-g76-threading-cycle-005` · **confidence:** 95/100 · **usage:** 0
- **source:** document:g76-threading-cycle
- **tags:** g76, min-depth, finish-allowance, fanuc, safety, document-learned

The minimum cutting depth parameter (Fanuc Q on line 1) must be ≤ finish allowance. If min depth > finish allowance, the control may skip the finish pass entirely, leaving threads undercut. Always verify with a G-code simulator before runni…

### 9. Cancel G68/G54.4 before Haas probing

- **id:** `TK-DL-haas-programming-007` · **confidence:** 95/100 · **usage:** 0
- **source:** document:haas-programming
- **tags:** haas, probing, g68, g54.4, renishaw, document-learned

Critical: Cannot probe while G68 coordinate rotation or G54.4 workpiece setting error compensation is active on Haas. Always issue G69 (cancel rotation) and/or cancel G54.4 before probing cycles. Resume rotation/compensation after probing c…

### 10. Mazatrol uses conversational UNIT-based programming, not G-code

- **id:** `TK-DL-mazak-mazatrol-programming-001` · **confidence:** 95/100 · **usage:** 0
- **source:** document:mazak-mazatrol-programming
- **tags:** mazak, mazatrol, conversational, unit, programming, document-learned

MAZATROL programs are composed of discrete units: Common (UNo.0), BAR, CPY, THREAD, GROOVE, DRILLING, TAPPING, LINE, FACE machining units. Each unit contains tool sequence data and shape sequence data. The controller auto-generates toolpath…

## Common Threads

Top tags across the cluster: `controller:fanuc`, `document-learned`, `wire-edm`, `machine:Mitsubishi`, `fanuc`, `mitsubishi`, `fa-10s`, `operation:threading`.

## Sources Cited

- jm_die_programs (3)
- controller:fanuc_operator_manual (1)
- controller:multi_oem_reference (1)
- controller:cross_reference_guide (1)
- document:cnc-lathe-fundamentals (1)

## Citations

- [[wedm-jmd-002]]
- [[wedm-jmd-001]]
- [[wedm-jmd-005]]
- [[ctrl-003]]
- [[ctrl-009]]
- [[ctrl-049]]
- [[TK-DL-cnc-lathe-fundamentals-007]]
- [[TK-DL-g76-threading-cycle-005]]
- [[TK-DL-haas-programming-007]]
- [[TK-DL-mazak-mazatrol-programming-001]]

