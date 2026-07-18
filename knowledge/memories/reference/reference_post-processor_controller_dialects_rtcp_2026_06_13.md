---
name: reference_post-processor_controller_dialects_rtcp_2026_06_13
description: Post-processor (echo) Phase-2 deep-research anchor — ISO 6983 vs ISO 14649 STEP-NC; controller dialects (Fanuc/Haas/Okuma OSP/Siemens 840D/Heidenhain TNC/Mazatrol) WCS+tool-length+canned-cycle+macro differences; 5-axis RTCP/TCPM (G43.4 / TRAORI / M128-FUNCTION TCPM) + kinematic chains (head-head/table-table/head-table) + TWP + inverse-time feed G93; .cps post structure (onOpen/onSection/onLinear/onCircular). Written 2026-06-13 slot:zulu Phase-2.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.728Z
aliases: reference_post-processor_controller_dialects_rtcp_2026_06_13
---


**Context:** Phase-2 anchor for the post-processor galaxy (echo — Master Post product), per the 2026-06-13
knowledge-max `/goal`. Spec: `FLEET-KNOWLEDGE-MAX-ROADMAP-2026-06-13.md` §echo.

## NC language layers
- **ISO 6983 (RS-274 / G&M code):** the universal low-level NC language a post EMITS. Controller-specific
  dialects diverge well beyond the ISO core.
- **ISO 14649 (STEP-NC):** the high-level, CAM-neutral, feature+operation NC model (the "intelligent" future) —
  carries intent, not just motion. Relevant for a vendor-neutral toolpath interchange (kilo↔echo).

## Controller dialects (what a post must specialize per machine)
- **Fanuc (30i/0i)** — the de-facto baseline: WCS G54-G59 (+ G54.1 Pn extended), tool-length G43 H, cutter-comp
  G41/G42 D, G68 coordinate rotation, canned cycles G73/G76/G81-G89, **Macro B** (#vars, IF/WHILE/GOTO), G43.4
  RTCP.
- **Haas NGC** — Fanuc-like with Haas extensions (G143 5-axis tool-length, settings/parameters, G187 smoothing).
- **Okuma OSP (P300)** — distinct: **VC/VS user macros**, IGF conversational, G15 H WCS form, different canned-
  cycle semantics; needs its own post family.
- **Siemens SINUMERIK 840D sl** — high-level: `CYCLE8xx` canned cycles, FRAMES (TRANS/ROT/AROT) for offsets,
  **TRAORI** (5-axis transform = RTCP), `CYCLE832` High-Speed-Settings; ShopMill/ShopTurn modes.
- **Heidenhain TNC (640)** — **Klartext conversational** (not raw G-code by default): `TOOL CALL`, `CYCL DEF`,
  `M128 / FUNCTION TCPM` (RTCP), `PLANE SPATIAL` (TWP), Q-params. Very different post target.
- **Mazak Mazatrol** — conversational EIA/ISO hybrid; Smooth control.

## 5-axis kinematics (the hard part of a post)
- **RTCP / TCPM (Rotational Tool Center Point):** controller compensates rotary motion so the **programmed point
  stays at the tool tip** + the commanded feed is at the tip → posts can output tip coords + tool vector, machine
  solves joints. Dialect: Fanuc **G43.4/G43.5**, Siemens **TRAORI**, Heidenhain **M128 / FUNCTION TCPM**, Haas G234.
- **Kinematic chain types:** head-head (both rotaries in spindle — e.g. gantry), table-table (trunnion + rotary
  table — most VMC 5-ax), head-table (mixed). The post's machine-definition encodes rotary axis vectors, pivot
  lengths, limits → inverse kinematics for joint angles (and the multiple-solution / shortest-rotation choice).
- **TWP / 3+2 positional:** `PLANE SPATIAL` (Heidenhain), `CYCLE800` (Siemens), G68.2 (Fanuc tilted work plane)
  — index the rotaries, then program in the tilted plane.
- **Inverse-time feed (G93):** for simultaneous 5-axis where linear+rotary combine, feed expressed as 1/time so
  the resultant TCP feed is correct.

## Post structure (.cps — Autodesk/Fusion post)
- FormatConfiguration JS: lifecycle `onOpen` → `onSection` (per op: WCS, tool, RTCP on) → `onLinear/onRapid/
  onCircular` (motion) → `onCycle` (canned) → `onSectionEnd` → `onClose`. Modal output (suppress unchanged words),
  number formatting (decimals, leading/trailing zero), block numbering, EOB, safe-start/retract blocks. Kinematics
  + machine config define rotary limits + RTCP capability. JM's `.cps` fleet is the in-house corpus.
- **Prove-out / lint:** back-plot + a post-lint that parses emitted G-code and asserts concrete params (WCS set,
  tool-length active before motion, RTCP paired on/off, no rapid through stock, feed present) — PRISM's
  `cam-post-lint` / `post-validate`.

## Integration (echo)
- Consumes kilo (toolpath) + machine kinematics; safety-gates via compliance-safety. Next deep-research (roadmap
  §echo): ingest the 6 controller manuals' alarm + G/M + canned-cycle tables → a per-controller dialect-coverage
  matrix; STEP-NC (ISO 14649) interchange. Re-verify dialect specifics against current controller manuals
  (web throttled this pass).

Sources (canonical): controller manuals — Fanuc 30i/0i-MF, Haas NGC, Okuma OSP-P300, Siemens SINUMERIK 840D sl,
Heidenhain TNC640, Mazak Mazatrol; ISO 6983 (RS-274); ISO 14649 (STEP-NC); Autodesk post-processor / .cps
FormatConfiguration reference. Expertise-authored anchor; controller G/M + alarm tables flagged for ingest.
