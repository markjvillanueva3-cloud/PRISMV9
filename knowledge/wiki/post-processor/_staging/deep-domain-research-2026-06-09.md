---
status: VERIFIED-PARTIAL
owner_slot: echo
staged_by: papa-deepdomain-research
promoted_by: papa-workflow (claude-b5de5424, 2026-06-09)
date: 2026-06-09
galaxy: post-processor
---

**<!-- VERIFIED-PARTIAL (papa-workflow 2026-06-09): institutional/method facts promoted to knowledge/wiki/post-processor/post-processor-foundations.md; numeric/safety specifics below stay owner-gated for echo. -->**

Deep-domain research packet for the PRISM **post-processor** galaxy — CNC post-processing,
G/M-code (ISO 6983), controller dialects (Fanuc / Okuma OSP / Haas / Siemens 840D), canned
cycles, work/tool offsets, and high-speed look-ahead. Every claim below is drafted from free,
reputable sources and is **UNVERIFIED**. Echo (post-processor owner) must confirm each cited fact
against the cited source — and against the live PRISM `*Post*` engines + `.cps` corpus — before
any of this is promoted into the live galaxy CLAUDE.md / MEMORY.md.

> Drafting note for echo: where a fact is sourced from a community knowledge hub (e.g. cnccode.com,
> Helman CNC, gcodetutor) it is corroborated by at least one primary/vendor source where possible.
> Re-confirm the controller-specific numeric defaults (Haas Setting 22, 191; Fanuc parameter 5210/5212;
> Siemens CYCLE832 tolerance-mode digits) against the **manufacturer manual for the exact control/builder**,
> because builders routinely modify defaults and syntax (see fact 14).

---

## 1. The standard: ISO 6983 / RS-274 lineage

- **G-code is standardized as ISO 6983-1** ("Automation systems and integration — Numerical control
  of machines — Program format and structure of computerized numerical controllers"); the US lineage
  is EIA **RS-274**. RS-274 was first published **1963** by the EIA; the last RS-274 revision was
  **RS-274-D (1979)**; **ISO 6983 was finalized in 1982**. National variants exist: **DIN 66025** (Germany),
  PN-73M-55256 / PN-93/M-55251 (Poland). [Wikipedia: G-code]
- G-code is a **modal, word-address** language: each block is an address letter + numeric value
  (e.g. `G01 X10.0 Y5.0 F200`); a command stays active until overridden by another in its modal group.
  [Wikipedia: G-code]
- **G-codes = preparatory functions** (geometry/motion: G00 rapid, G01 linear, G02/G03 circular,
  G17/G18/G19 plane select, G90/G91 absolute/incremental). **M-codes = miscellaneous functions**
  (M03/M04/M05 spindle CW/CCW/stop, M06 tool change, M08/M09 coolant on/off, M30 end+rewind).
  [Wikipedia: G-code]
- **Why post-processors exist:** ISO 6983 standardizes the *format*, but virtually every builder
  (Fanuc, Haas, Okuma, Siemens) implements its own **dialect/extensions**, so CAM must run a
  controller-specific **post-processor** to translate a generic toolpath into the exact format that
  control accepts. The emerging successor, **STEP-NC (ISO 14649)**, is not yet widely adopted as a
  replacement. [Wikipedia: G-code]

## 2. Work coordinate systems (G54–G59.3)

- A control provides (in LinuxCNC's reference implementation) **nine work coordinate systems**:
  G54–G59 = systems 1–6, and **G59.1 / G59.2 / G59.3 = systems 7–9**. These are **modal** — they act on
  all subsequent blocks until another is set. [LinuxCNC G-code Reference]
- The offset values are stored in **numbered parameters**: G54 → 5221-5230, G55 → 5241-5250 …
  G59.3 → 5381-5390 (each set stores axis values + the XY rotation angle about Z).
  [LinuxCNC G-code Reference]
- **G53 is non-modal** and references the **machine** absolute (homed) position, *not* the part — used
  for safe-Z/tool-change moves that must ignore the active work offset. [LinuxCNC Coordinate Systems]
- Offsets can be set programmatically with **`G10 L2 P<n>`** (P1=G54 … P9=G59.3), measured from the
  machine origin established at homing, e.g. `G10 L2 P1 X.. Y.. Z..` for G54.
  [LinuxCNC Coordinate Systems]
- **G92** is a *global* offset that shifts the origins of **all** coordinate systems so the current
  point takes the commanded value; **G52** is a *local* offset applied **after** the active workpiece
  offset (including its rotation). Note a portability hazard: in LinuxCNC G92 persists by default,
  whereas **Fanuc clears G92 at reset/program-end** — LinuxCNC mimics Fanuc only with
  `DISABLE_G92_PERSISTENCE = 1`. [LinuxCNC Coordinate Systems]

## 3. Tool-length compensation (G43 / G43.1 / G49)

- **`G43`** enables tool-length compensation, offsetting axis coordinates by the tool's length; it
  causes **no motion itself** — the offset takes effect on the next compensated-axis move.
  **`G43 Hn`** uses the offset register for tool *n*; **`G43`** with no H uses the currently loaded
  tool from the last `Tn M6`. [LinuxCNC G-code Reference]
- Active tool-length-compensation values are stored in **numbered parameters 5401-5409**.
  [LinuxCNC G-code Reference]
- **`G43.1`** is a *dynamic* tool-length offset (replaces the current offset with axis-word values,
  no tool table needed); **`G49`** cancels tool-length compensation. [LinuxCNC G-code Reference]
- **Post-processor discipline:** Fanuc/Haas best practice is to enable look-ahead/HSM **before** `G43`
  (see fact 12), and to pair `G43 Hn` with the matching tool number so the H register and the Tn match.
  [LinkedIn: Fanuc AI High-Speed Modes Simplified — corroborated]

## 4. Cutter / tool-radius compensation (G40 / G41 / G42)

- **`G41`** = compensation **left** of the programmed path, **`G42`** = **right**, **`G40`** = cancel.
  Left/right are relative to the direction of tool travel. The optional **D-word** selects the radius
  offset register (no D → radius of the currently loaded tool). [gcodetutor: G41/G42; Tormach: G40/G41/G42]
- Comp lets the programmer use **exact part-print coordinates**; without it the programmer must
  manually offset every coordinate by the cutter radius and re-do it if the cutter size changes.
  [ManufacturingET.org: Cutter Radius Compensation]
- **Programming rules a post-processor must honor:** (a) comp must be applied/cancelled during a
  **linear (G1) move**; (b) the lead-in move must be **≥ the tool radius**; (c) on most controls comp
  requires the **G17 (XY) plane** active; (d) always **G40** at the end of a tool's section to avoid a
  stale G41/G42 on re-entry. A **negative** offset value reverses the comp direction.
  [gcodetutor: G41/G42; Tormach: G40/G41/G42]
- **Okuma OSP nuance:** OSP distinguishes **tool-nose-radius compensation** (turning) from
  **cutter-radius compensation** (milling) but uses the same G40/G41/G42 codes. On turning, nose-radius
  comp must be **activated together with the tool-offset function**; cancel with **G40 before switching
  G41↔G42**. [Okuma OSP-P200L Programming Manual]

## 5. Drilling canned cycles (G81 / G82 / G83) and chip-break (G73)

- **`G81`** — basic drilling: feed Z to depth, then **rapid retract**. **`G82`** — drill with a
  **dwell** (P seconds) at the bottom before rapid retract (cleaner hole bottoms / counterbores).
  [LinuxCNC Mill Canned Cycles]
- **`G83`** — deep-hole **peck drilling** with **full retract to the R plane** between pecks, clearing
  chips and admitting coolant; the **Q word** is the peck delta (incremental Z bite). Recommended for
  deep holes and stringy/gummy materials (stainless, titanium, Inconel). [LinuxCNC Mill Canned Cycles;
  gcodetutor: G73/G83]
- **`G73`** — **high-speed peck drilling (chip-break)**: pecks with only a **small retract that stays in
  the hole** (just enough to snap the chip), so it's barely slower than straight G81 — best where chips
  are manageable and speed matters. On **Haas**, the per-peck retract is **Setting 22 (default 0.02" /
  0.5 mm)**. [Haas Tech Doc: High-Speed Peck Drilling; gcodetutor: G73/G83]
- **Rule of thumb:** a "deep hole" warranting full-retract G83 is generally **> 5× diameter** deep.
  [makeitfrommetal: G73 vs G83 — corroborated by multiple shop refs]

## 6. Boring/reaming/tapping cycles (G84 / G85 / G86 / G87 / G88 / G89)

- **`G84`** — right-hand tapping (spindle feeds CW to depth, reverses, feeds out).
  **`G85`** — boring/reaming: feed in **and feed out** (no rapid retract) for a clean wall.
  **`G86`** — boring that **stops the spindle** before retract (like G82 but spindle-off at bottom).
  **`G87`** — back-boring. **`G88`** — boring with spindle stop + manual out. **`G89`** — boring with a
  **dwell** then feed out. [LinuxCNC Mill Canned Cycles]
- **Return-level modal pair:** **`G98`** retracts to the **initial Z** (the level before the cycle
  series began); **`G99`** retracts to the **R plane** between holes (faster for clustered holes with no
  clamps to clear). **`G80`** cancels the modal canned cycle. The **L word** repeats the cycle (used in
  incremental mode). [LinuxCNC Mill Canned Cycles]

## 7. Fanuc rigid tapping (G84 + M29)

- On Fanuc, **`M29 S<rpm>`** placed **before** the `G84` block engages **rigid-tapping mode** (it
  synchronizes the spindle to the Z feed via servo mode); it does **not** start the spindle. Without
  M29 the block is ordinary (floating-head) tapping. M29 is cancelled by a feed/motion command (G00/G01).
  [cnctrainingcentre: Rigid Tapping G84; practicalmachinist forum — corroborated]
- **Feed-per-rev best practice:** in **G95** (feed per revolution) the **F-word equals the thread pitch**,
  so changing spindle RPM does not require re-computing feed — e.g. M10×1.5 → `F1.5`. Remember to
  return to **G94** (feed per minute) after tapping. In G94, F = RPM × pitch (e.g. 300 × 1.5 = 450).
  [cnctrainingcentre: Rigid Tapping G84]
- **Builder parameters to verify per machine:** rigid-tap M-code is set by **parameter 5210** (value 0
  defaults the M-code to 29); some controls expose **5212 = 29** and **parameter 5200** to toggle
  M-code-vs-no-M-code rigid-tap entry. Deep/clogging holes use **peck tapping** via a Q word, or the
  dedicated **`G84.2`** rigid peck-tap cycle (`G84.2 G98 Z.. Q.. R.. F..`). [practicalmachinist /
  cnczone forums — VERIFY against the specific Fanuc control's parameter manual]

## 8. Feed-rate modes (G93 / G94 / G95)

- **`G94`** — units-per-minute (mm/min or in/min), the default milling feed mode. **`G95`** —
  units-per-**revolution** (couples feed to spindle; canonical for turning + tapping). **`G93`** —
  **inverse-time**: F means "complete this move in 1/F minutes" — required for some 5-axis simultaneous
  moves where a per-distance feed is ill-defined. [LinuxCNC G-code Reference]

## 9. Path-control / smoothing modes (G61 / G64)

- **`G61`** — **exact-path/exact-stop**: the machine reaches every programmed point, slowing/stopping at
  corners (best dimensional accuracy, slower). **`G64`** — **path blending / continuous-path** at best
  speed; optional **`G64 P<tol>`** bounds the deviation so the actual path is no more than the tolerance
  from the programmed endpoints. These are the generic equivalents of vendor HSM modes below.
  [LinuxCNC G-code Reference]

## 10. Haas high-speed: G187 + Setting 191

- **`G187 P<n> E<nnnn>`** sets smoothness + max corner-rounding for the part being cut. **P1 = rough**
  (fastest, loosest), **P2 = medium**, **P3 = finish** (most accurate). **E** sets the max corner-rounding
  value. `G187` alone cancels E and reverts to the **Setting 191** default. G187 is cancelled by RESET,
  M30/M02, end-of-program, or E-STOP. [Haas G187 (mill) codes-settings; cnccode: G187]
- **Setting 191** sets the default smoothness (**ROUGH / MEDIUM / FINISH**; **MEDIUM is the factory
  default**) used when no G187 is active. The E value interacts with **Setting 85 (Max Corner Rounding)**:
  with `G187 P1`/rough the E (or Setting 85) value is **×4**; `G187 P3`/finish **÷4**.
  [Helman CNC: Haas Setting 191; cnccode: G187]
- **Cycle-time impact:** roughing mode (`G187 P1`) can save ~**20%** execution time vs. medium (`G187 P2`)
  for the same program/machine. [paycnc: How to use G187 — VERIFY magnitude per machine/job]

## 11. Fanuc high-speed: AICC / AIAPC (G05.1 Q1) and look-ahead

- **`G05.1 Q1 R<x>`** enables **AI Contour Control / AI Advanced Preview Control**; **`G05.1 Q0`** cancels.
  ("AI" = Fanuc **Alpha-I servo**, *not* artificial intelligence.) The **R1–R10** value trades feedrate vs.
  positioning accuracy: **R1 = rough** (toolpath-speed priority), **R5 = equal**, **R10 = finish** (accuracy
  priority). [cncmanuals: AI Contour Control; LinkedIn: Fanuc AI High-Speed Modes Simplified]
- **Look-ahead:** with feed-per-minute, the function reads **up to ~40 blocks ahead** (classic Fanuc Oi/16i
  era) to apply accel/decel before interpolation; newer controls read far more.
  [Fanuc AI Contour Control manual via cncmanuals — VERIFY block count for the target control generation]
- **Programming order matters:** engage `G05.1 Q1 Rx` **before** `G43`; AICC/AIAPC must be turned on/off
  **per tool** and **do not apply to canned drilling cycles**. **`G05.1 Q2`** = Smooth Interpolation,
  **`G05.1 Q3`** = Nano Smoothing (both also activate AICC). [LinkedIn: Fanuc AI High-Speed Modes Simplified]
- **Alarms a post should design around:** **5111** IMPROPER MODAL G-CODE (wrong modal state when entering
  AICC); **5112** (G08 specified inside AICC mode); **5157** PARAMETER ZERO (max cutting feedrate param
  1422/1432/1420 = 0, or accel/decel param 1770/1771 = 0). [cncmanuals: AI Contour Control]

## 12. Siemens 840D high-speed: CYCLE832 + G641/G642 + COMPCAD

- **`CYCLE832(S_TOL, S_TOLM, S_OTOL)`** is the **High-Speed-Cutting settings** cycle that bundles the
  G-codes/setting-data for free-form HSC machining; it tunes the **contour tolerance** and selects
  smoothing/compressor/feedforward strategies for roughing vs. finishing. [Siemens SINUMERIK 840D
  Programming Manual — CYCLE832]
- **Continuous-path (smoothing) options** selected by the tolerance-mode parameter: **G64**, **G641**,
  **G642** (G642 default); machining modes 1=finishing(default)/2=pre-finishing/3=roughing;
  compressor 0=COMPOF(default)/1=COMPCAD/2=COMPCURV/3=B-spline; feedforward/jerk 0=FFWOF+SOFT(default)
  /1=FFWON+SOFT/2=FFWOF+BRISK. With **COMPCAD/COMPCURV** the path control is **forced to G642**.
  [Siemens SINUMERIK 840D Programming Manual — CYCLE832 — VERIFY the exact digit mapping for the
  control's software version]
- **CYCLE832 does not relieve the machine builder of axis/servo optimization** — FFWON+SOFT require the
  axes to have been optimized at commissioning. [Siemens SINUMERIK 840D Operating Manual — CYCLE832]

## 13. Siemens 840D drilling cycle form (vs ISO G81)

- Siemens uses **named cycles** rather than bare G-codes: **`CYCLE81(RTP, RFP, SDIS, DP, DPR)`** =
  drilling/centering (RTP=retract plane abs, RFP=reference plane abs, SDIS=safety distance unsigned,
  DP=final depth abs, DPR=final depth relative-to-reference unsigned). The drill XY position is approached
  **before** the cycle call, and **tool-length compensation must be selected before the call**. **`MCALL`**
  makes a cycle modal across multiple positions. [Siemens SINUMERIK 840D Programming Manual — CYCLE81;
  Helman CNC: CYCLE81] A post-processor for Siemens therefore emits cycle *calls*, not Fanuc-style
  `G81 X.. Y.. Z.. R..` lines — a key dialect divergence.

## 14. Dialect-divergence checklist for the post-processor (synthesis)

A correct post must localize, per control/builder, at least: **block/line-numbering** (N words, optional);
**decimal/trailing-zero format** and **modal-suppression** of unchanged words; **units mode** (G20/G21 — see
PRISM UNITS-FIRST safety rail); **G92 persistence** (Fanuc clears, LinuxCNC persists — fact 2);
**canned-cycle dialect** (ISO `G81..G89` vs Siemens `CYCLEnn(...)` — fact 13); **rigid-tap entry**
(Fanuc M29 + params vs others — fact 7); **HSM/look-ahead block** (Haas G187 vs Fanuc G05.1 Q1 Rx vs
Siemens CYCLE832 — facts 10-12); and **comp lead-in length ≥ radius** + **G40 at section end** (fact 4).
**Builders may modify the default syntax/parameters** for any of these — always confirm against the
*specific machine's* manual, never the generic vendor default. [Fanuc AI Contour Control manual: "All
machine tool builders can modify the syntax from the default FANUC"; corroborated across vendor docs]

---

## Sources

- *G-code* — Wikipedia (ISO 6983 / RS-274 lineage, modal word-address structure, G/M function families, STEP-NC successor): https://en.wikipedia.org/wiki/G-code
- *G-Codes* — LinuxCNC Documentation (work offsets G54-G59.3, G43/G49 + params 5401-5409, feed modes G93/G94/G95, path control G61/G64): https://linuxcnc.org/docs/html/gcode/g-code.html
- *Coordinate Systems* — LinuxCNC Documentation (G54-G59.3 param ranges, G53/G52/G92, G10 L2, G92-persistence INI flag): https://linuxcnc.org/docs/html/gcode/coordinates.html
- *Mill Canned Cycles* — LinuxCNC Documentation (G81/G82/G83/G84/G85/G86/G87/G88/G89, G98/G99, G80, L word, Q peck delta): http://linuxcnc.org/docs/2.4/html/gcode_mill_canned.html
- *G187 Setting the Smoothness Level (Group 00)* — Haas Automation official codes & settings (G187 P/E syntax, Setting 191, Setting 85 interaction): https://www.haascnc.com/service/codes-settings.type=gcode.machine=mill.value=G187.html
- *Haas Setting 191 Default Smoothness* — Helman CNC (ROUGH/MEDIUM/FINISH default, parameter list): https://www.helmancnc.com/haas-setting-191-default-smoothness-haas-mill/
- *Drilling With High-Speed Peck (G73)* — Haas Automation technical document (Setting 22 retract amount): https://www.haascnc.com/content/dam/haascnc/ecommerce-assets/linedrawings/holemaking/modular_drill_heads/Tech_Doc_Drilling_With_High-Speed_Peck_sr_02-0060_to_02-0077.pdf
- *G73 and G83 Peck Drilling Cycles* — gcodetutor Fanuc Training Course (full-retract vs in-hole retract, Q peck depth, 5×D rule): https://gcodetutor.com/fanuc-training-course/g73-g83-drilling-cycle.html
- *Rigid Tapping G84 Canned Cycle* — CNC Training Centre (M29 rigid-tap mode, G95 feed=pitch, G84.2 peck-tap): https://www.cnctrainingcentre.com/rigid-tapping-g84-canned-cycle/
- *G41 and G42 cutter compensation* — gcodetutor G-code tutorial (left/right comp, D-word, lead-in ≥ radius, G40 discipline): https://gcodetutor.com/gcode-tutorial/g41-g42-cutter-compensation.html
- *Cutter Compensation (G40, G41, G42)* — Tormach machine-codes reference (plane requirement, negative-offset reversal): https://tormach.com/machine-codes/cutter-compensation-g40-g41-g42
- *Tool Nose Radius Compensation Function (G40, G41, G42)* — Okuma OSP-P200L Programming Manual via ManualsLib (turning nose-radius vs milling cutter-radius comp, activate-with-offset rule): https://www.manualslib.com/manual/1251887/Okuma-Osp-P200l.html?page=69
- *AI Contour Control, Specifications Additional Manual* — Fanuc CNC manual via cncmanuals (G05.1 Q1 Rx, R1-R10, ~40-block look-ahead, alarms 5111/5112/5157, builder-may-modify caveat): http://www.cncmanuals.com/fanuc/595/ai-contour-control-specifications-additional-manual
- *FANUC AI High-Speed Modes — Simplified* (Tim Markoski) — LinkedIn article (Alpha-I meaning, G05.1 Q2/Q3, engage-before-G43, per-tool on/off, not in canned cycles): https://www.linkedin.com/pulse/fanuc-ai-high-speed-modes-simplified-tim-markoski
- *High Speed Settings — CYCLE832* — Siemens SINUMERIK 840D Programming Manual via ManualsLib (CYCLE832 bundling G641/G642/COMPCAD/FFWON/SOFT, tolerance-mode digits, builder-optimization caveat): https://www.manualslib.com/manual/1797033/Siemens-Sinumerik-840d-Sl.html?page=1107
- *Drilling, Centering — CYCLE81* — Siemens SINUMERIK 840D sl Programming Manual via ManualsLib (CYCLE81 RTP/RFP/SDIS/DP/DPR params, pre-call positioning + tool-length-comp, MCALL): https://www.manualslib.com/manual/1670082/Siemens-Sinumerik-840d-Sl.html?page=745
