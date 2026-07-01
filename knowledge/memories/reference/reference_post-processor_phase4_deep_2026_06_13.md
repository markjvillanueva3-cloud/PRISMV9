---
name: reference_post-processor_phase4_deep_2026_06_13
description: "Post-processor (echo) Phase-4 deep anchor — Hermes-planned, R12-tempered. The 5 deeper sub-domains: (1) 43-parameter volumetric error model ISO 230-1/-11 + DH/Hayati-Hsu/SE(3) kinematic calibration; (2) servo dynamics + MPC look-ahead buffer theory per controller; (3) TCP orientation smoothing on SO(3) via SLERP/Squad + G43.4 Type-1/Type-2 semantics; (4) post-processor as formal compiler (attribute grammar applied to .cps DSL); (5) closed-loop adaptive post via on-machine probing + MTConnect/OPC UA digital thread. Written 2026-06-13 slot:zulu Hermes-loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.729Z
aliases: reference_post-processor_phase4_deep_2026_06_13
---


**Context:** Phase-4 post-processor anchor — **Hermes-planned, R12-tempered**. Deepens
[[reference_post-processor_controller_dialects_rtcp_2026_06_13]] (Phase-2) and
[[reference_post-processor_phase3_kinematic_solver_stepnc_2026_06_13]] (Phase-3).
Phase-2 established: dialect differences, RTCP/TCPM G43.4/TRAORI/M128, kinematic chain types, .cps lifecycle.
Phase-3 established: generic IK solver concept, Heidenhain volumetric error mapping (brief mention),
STEP-NC AP238 ed2, NX Post Builder 2025.

---

## The 5 deeper increments (Phase-4)

### 1. 43-Parameter Volumetric Error Model + Kinematic Calibration (ISO 230-1/-11)

**What it adds:** Phase-3 mentioned "volumetric error-mapping" as a concept; this layer names the actual model
and calibration theory.

**Core model:** A 5-axis machine has **43 geometric error parameters** (21 quasi-static + up to 22 thermal) per
ISO 230-1:2012 (test conditions for machine tools) + ISO 230-11:2016 (measurement of thermal effects). For
each linear/rotary axis: 6 DoF errors (3 translational + 3 rotational = Abbe errors). The total volumetric
error at the tool tip is the superposition across all axes.

**Kinematic formulations (named):**
- **Denavit-Hartenberg (DH) convention** — the classic homogeneous-transform chain for serial robots; adapted
  to machine tools by encoding each axis as a 4×4 HTM (Homogeneous Transformation Matrix).
- **Hayati-Hsu modified DH** — handles nearly-parallel axes (a common 5-axis config) where standard DH is
  ill-conditioned; Hayati & Mooring (1985) introduced the beta-parameter fix; Hsu & Everett extended to
  machine tools.
- **Lie group / SE(3) screw-theory formulation** — expresses rigid-body motion in SE(3) (Special Euclidean
  group in 3D) using exponential maps and adjoint representations; handles singular configurations cleanly.
  See: Hollerbach, Khalil, Ganesh, "Kinematic Calibration" chapter in *Springer Handbook of Robotics* (2016,
  Siciliano & Khatib eds.).

**Real measurement instruments for calibration data:**
- Renishaw XL-80 laser interferometer + QC20-W ballbar (circular deviation)
- Etalon LaserTRACER-MT (6D volumetric, sub-micron)
- Siemens "Measure kinematics" (CYCLE996), Heidenhain KinematicsOpt (Cycle 450/451), Okuma 3D-MAC —
  each produce a machine-specific XML/JSON error compensation table loaded into the control.
- Fanuc 30i-B: **Compensation Data Table** (pitch error, backlash, volumetric); Haas NGC: **Volumetric Error
  Compensation (VEC)** tables.

**Post-processor relevance:** a post that understands the machine's error model can apply **pre-compensation**
in emitted coordinates — or at minimum it must preserve compatibility with the control's compensation layer
(e.g., not double-apply offsets). The MasterPost (echo) should ingest a machine's compensation table path
as part of machine-definition.

**R12 flag:** Specific Veitschegger & Wu (1986) paper on non-ideal 5-axis kinematic identification is real
(Int. J. Robotics Research). ASME B5.54-2005 "Methods for Performance Evaluation of Computer Numerically
Controlled Machining Centers" is the machine-tool performance standard (not B5.64 — Hermes cited B5.64-2021
for TCP dynamics; B5.64 existence needs web-verification before citing in code).

---

### 2. Servo Dynamics, MPC Look-Ahead Buffering + Per-Controller Feed-Forward Tuning

**What it adds:** Phase-2 mentioned look-ahead as a concept (G187 smoothing, CYCLE832). This layer names the
control-theory models behind it.

**Digital twin of the servo loop:** Each CNC axis runs a **position-velocity-current cascade (PVC)** control
loop. In the Z-domain (sampled at ~1–4 kHz): the position loop sets a velocity reference, velocity loop sets
current reference, current loop drives motor torque. The **following error** (lag between commanded and actual
position) is the key observable — visible in Fanuc Servo Guide II, Siemens Trace, Heidenhain TNCscope.

**Model Predictive Control (MPC) trajectory generation:** Modern 5-axis controls use a finite-horizon MPC
(or equivalent feedforward) to generate jerk-limited trajectories that respect velocity/acceleration/jerk
constraints on EACH axis simultaneously. Altintas and colleagues (CIRP Annals, multiple years 2018–2023)
model this as a quadratic program solved per interpolation cycle. The post-processor must emit toolpaths
that are **compatible with the control's interpolator bandwidth** — overly dense points cause buffer overflow /
slow the look-ahead; too sparse causes chord error at corners.

**Per-controller look-ahead specifics (named, verify exact block counts against manuals):**
- **Fanuc 30i-B:** Multi-block look-ahead (AI Contour Control / AICC) — nominally 200–2000-block buffer;
  G05.1 Q1 enables AICC; G05 P10000 enables nano-smoothing.
- **Siemens 840D SL:** CYCLE832 (High Speed Settings) + COMPCURV/COMPCAD spline compression; adaptive feed
  in corners; NURBS interpolation (G06.2 / BSPLINE).
- **Heidenhain TNC640:** Cycle 32 (Tolerance) + TCPM smoothing; orientation interpolation via PLANE SPATIAL
  sequences; actual look-ahead depth is proprietary but observable via TNCscope following-error logs.
- **Haas NGC:** G187 (Accuracy/Smoothing), P1/P2/P3 settings; E-setting for corner rounding.

**Post-processor action:** the post can tune feed-rate **adaptively at corners** (corner deceleration blocks)
and select the correct high-speed mode G/M word per controller. PRISM's `cam-post-lint` should verify that
high-speed mode is active when dense 5-axis moves are emitted.

**Named textbook:** Yusuf Altintas, *Manufacturing Automation: Metal Cutting Mechanics, Machine Tool Vibrations,
and CNC Design* (Cambridge University Press, 2nd ed. 2012) — covers servo dynamics + CNC interpolation in
detail. The MPC/look-ahead extensions are from Altintas group CIRP Annals papers (2018–2023; specific
titles flagged for web-verification per R12).

---

### 3. TCP Orientation Smoothing on SO(3) — SLERP / Squad + G43.4 Type-1 vs Type-2

**What it adds:** Phase-2 named RTCP modes; Phase-3 named the IK solver. This layer covers the **tool
orientation interpolation mathematics** that the post must either generate or rely on the control to perform.

**The problem:** in simultaneous 5-axis, the tool orientation (a point on S^2, or equivalently an element of
SO(3)) must be interpolated between programmed orientations. Naive linear interpolation of I/J/K vectors
gives non-uniform angular velocity and visible scallop artifacts. The post must either:
(a) output dense I/J/K samples at the control's interpolation density, or
(b) rely on the control's own SLERP/cubic spline.

**SLERP (Spherical Linear Interpolation):** for unit quaternions q0, q1:
`q(t) = q0 * (q0^{-1} * q1)^t`, t ∈ [0,1] — gives constant angular velocity. Ken Shoemake (SIGGRAPH 1985)
introduced SLERP; its application to CNC orientation paths is standard in CAM post kernels.

**Squad (Spherical Cubic Hermite / Shoemake 1985):** smoother than SLERP; uses intermediate control quaternions
to C1-continuously interpolate through a sequence of orientations — reduces rotary jerk.

**Per-controller G43.4 semantics (Fanuc 30i):**
- **G43.4 Type 1 (TCP along tool axis):** programs in machine coordinates with RTCP compensation; the
  controller solves joint angles. Output: X Y Z A B (or A C) coordinates. The post must output the CORRECT
  machine-coordinate solution given the specific rotary configuration.
- **G43.4 Type 2:** programs in WORKPIECE coordinates (tip position + tool vector I/J/K directly) — the
  control's internal IK converts to joint angles. Post can output tip coords + unit vector; simpler for
  the post but requires the machine's kinematic model to be loaded in the control.

**Siemens TRAORI + ORIWKS:** TRAORI enables TCP; ORIWKS specifies orientation in the workpiece coordinate
system. ORIPLANE, ORIFULLO, ORIAXPOS variants control how orientation is interpolated.

**Heidenhain TCPM + PLANE SPATIAL:** FUNCTION TCPM orients tool relative to the active tilted WCS; PLANE
SPATIAL defines the tilt; orientation interpolation uses SLERP internally.

**ISO 14649-11/-12 feedrate reference:** the `feedrate_reference` attribute in STEP-NC specifies whether
feed is at the tool center, tool tip, or tool contact point — critical for 5-axis finishing where the
TCP traces a different path than the programmed center.

**R12 note:** ASME B5.64-2021 (cited by Hermes for TCP dynamics) — existence unverified; flag for web check.
The ISO 10303-238:2022 (STEP-NC AP238 ed2) is the real standard. Shoemake SIGGRAPH 1985 is real.

---

### 4. Post-Processor as Formal Compiler — Attribute Grammar + DSL Theory Applied to .cps

**What it adds:** Phase-2 described the .cps lifecycle (onOpen/onSection/onLinear etc.). This layer provides
the **formal computational model** for treating a post-processor as a compiler.

**The compiler analogy:**
- **Source language:** the CAM system's internal toolpath representation (operations, tool moves, cycles).
- **Target language:** the controller's dialect of G-code (the NC program).
- **The post (.cps):** a **translator** — semantically, a **transducer** (finite-state transducer in the
  formal-language sense) that maps source tokens to target tokens with modal state (current WCS, tool,
  feed mode, RTCP state, cycle state = the "registers" of the post's abstract machine).

**Attribute grammar formulation:**
Attach **synthesized and inherited attributes** to each toolpath event node:
- `wcsActive`, `toolActive`, `rtcpState`, `feedMode`, `cycleActive` = inherited (passed down from context)
- `emittedBlocks`, `blockNumber`, `modalState` = synthesized (built up from children)

This is directly the **Attribute Grammar** formalism of Knuth (1968) and the Dragon Book (Aho, Lam, Sethi,
Ullman — *Compilers: Principles, Techniques, and Tools*, 2nd ed. 2006, Addison-Wesley). A well-designed
post is an **L-attributed grammar** (left-to-right, inherited attrs flow left-to-right) — which is why
event-driven (.cps callback) architectures work: they mirror an LR or LL parse of the toolpath stream.

**Modal suppression as data-flow analysis:** the post's "don't repeat unchanged G/M words" is exactly
**copy propagation** in compiler data-flow: if the value of a variable (modal code) hasn't changed since
last emission, suppress the write. The post's formal state machine is the **def-use chain** of modal codes.

**SMT / constraint satisfaction for rotary sequencing:** When multiple IK solutions exist for a 5-axis move,
choosing the correct one (shortest rotation, avoid limits, avoid singularity) is a **constraint satisfaction
problem**. Z3 (de Moura & Bjorner, Microsoft Research, 2008) is a real SMT solver usable for offline
pre-planning of rotary solution sequences. In real-time interpolation, controllers use simpler heuristics
(shortest rotation, clamp at limits), but a PRISM post can use Z3 or LP relaxation for offline optimization.

**PRISM relevance:** MasterPost (echo) can be architected as a **compiler pipeline**:
lexer (CAM events) → parser (operation structure) → semantic analysis (modal state, unit/WCS checks) →
code generation (dialect-specific emitter) → optimizer (modal suppression, corner feed). The cam-post-lint
is then a **verifier** on the compiler's output (analogous to a type-checker on generated code).

---

### 5. Closed-Loop Adaptive Post-Processing — On-Machine Probing + MTConnect / OPC UA Digital Thread

**What it adds:** Phase-3 mentioned STEP-NC closed-loop as a "future." This layer names the concrete
standards and instruments that make it real today.

**On-machine probing (the measurement input):**
- **Renishaw OMP600 / RMP600 / OLP40** touch-trigger probes: measure actual feature positions mid-cycle;
  results stored in controller variables (Fanuc #vars, Siemens R-params, Heidenhain Q-params) and can
  trigger macro-driven re-cuts.
- **Renishaw NC4 / Blum laser tool setter:** measures actual tool length + diameter; post can use this to
  correct tool-length offset H values dynamically.
- **In-process gauging macros:** a post-processor that understands probing cycles (G65 P9xxx Fanuc,
  CYCLE976/977 Siemens, CYCL DEF 400-499 Heidenhain) can insert measurement calls and conditional
  re-machining blocks.

**Digital thread standards for feedback:**
- **MTConnect (ANSI/MTC1.4, latest ANSI/MTC2.0):** XML/REST streaming protocol for machine tool data
  (position, load, override, alarm) — the post can consume MTConnect streams to adapt future programs.
- **OPC UA (IEC 62541 series, + OPC UA for Machine Tools / umati companion spec):** the industrial
  communication standard for structured machine data; umati (universal machine tool interface) maps
  CNC state to a standard information model. A STEP-NC closed-loop system uses OPC UA to push measured
  results back to the CAM planner.
- **STEP-NC closed loop (ISO 10303-238 + ISO 14649):** the Workingstep execution model carries
  `in_process_geometry` — the measured actual shape after each operation — allowing the next Workingstep
  to adapt its toolpath. NIST Smart Manufacturing Systems (Proctor, Michaloski, Horst — multiple papers
  2012–2023, NIST IR series) have prototyped this; the reference implementation is the **STEP Tools Inc.
  ST-Plan / ST-Machine** suite.

**SPC integration point:** Statistical Process Control on volumetric error uses the measured data from
multiple parts to detect drift in machine accuracy (Cpk on key dimensions) and trigger re-calibration
or offset correction in the next post run. ASME B89.4.10360.2:2008 (acceptance tests for CMMs) and
ISO 230-2 (positioning accuracy) define the measurement standards used to assess drift.

**R12 flag:** "NIST AL2 Algorithmic Language Level 2" cited by Hermes is NOT a recognized standard
acronym — likely a confabulation; removed. The NIST papers by Proctor/Michaloski are real (NIST IR
reports, publicly available). ANSI/MTC MTConnect versions and IEC 62541 OPC UA are real standards.

---

## Wiring / consumers (R15)

- **GALAXY:** `mcp-server/src/engines/post-processor/` (echo). The MasterPost product is the primary consumer.
- **Kinematic calibration (sub-domain 1):** shared with `engines/cam/` (kilo — 5-axis collision uses the
  same machine model); `engines/mill/` (VMC-01..05 machine definitions); `engines/compliance-safety/`
  (verify compensation table loaded before 5-axis ops).
- **Servo dynamics / look-ahead (sub-domain 2):** `engines/speed-feed/` (oscar — feed-rate at corners is
  a shared concern); `cam-post-lint` (verify high-speed mode G/M words present in dense 5-axis sections).
- **Orientation smoothing (sub-domain 3):** `engines/cam/` (kilo — toolpath generator must output
  orientation-compatible dense I/J/K or rely on G43.4 Type 2); `engines/quality/` (scallop height
  validation depends on orientation interpolation quality).
- **Compiler architecture (sub-domain 4):** `engines/post-processor/MasterPostEngine.ts` — the modal
  state machine IS the post compiler; cam-post-lint is the verifier. Attribute grammar framing guides
  the engine's design (modal def-use tracking, suppression pass).
- **Closed-loop / digital thread (sub-domain 5):** `engines/shop-floor/` (MTConnect/OPC UA consumers);
  `engines/quality/` (SPC on volumetric drift); `engines/cam/` (kilo — STEP-NC Workingstep adaptation).
- **Physics constants:** import from `src/physics/constants.ts` — do NOT inline cutting-force constants;
  only kinematic geometry (axis offsets, pivot lengths) belongs in the machine definition schema.
- **Dispatchers:** `prism_cam` (toolpath → post hand-off), `prism_dev` (post-lint build/validate actions),
  `prism_safety` (pre-motion safety gate for 5-axis ops).

---

## Next (Phase-5, honestly scoped)

1. **Kinematic calibration schema:** define the machine error-parameter JSON schema (43 params, per ISO
   230-1 axis ordering) and a `MachineKinematicsCalibrationEngine` that ingests Renishaw/Siemens/Heidenhain
   calibration export files and produces the compensation table PRISM can apply in IK.
2. **Attribute grammar post compiler:** restructure MasterPostEngine as a modal-state compiler pipeline —
   define the `PostModalState` type (wcs, tool, rtcpState, feedMode, cycleActive), implement the
   suppression pass as copy-propagation, add a verifier pass (cam-post-lint integration).
3. **Per-controller look-ahead budget test:** for each controller (Fanuc/Siemens/Heidenhain/Haas), define
   the nominal block-buffer depth + the post's strategy for dense 5-axis sections (adaptive feed blocking,
   NURBS compression toggle). Validate against a real JM Die 5-axis part toolpath.
4. **MTConnect ingestion stub:** `engines/shop-floor/MTConnectIngestEngine.ts` that reads a machine's
   data stream and surfaces position/load/following-error to the closed-loop feedback path.
5. **ASME B5.64 / B89.4.22 standard verification:** web-confirm exact standard numbers and years before
   citing in engine code or dispatchers (R12 — these need one web lookup to confirm).

---

## Sources

- ISO 230-1:2012 *Test conditions for machine tools — Part 1: Geometric accuracy of machines*
- ISO 230-11:2016 *Machine tools — Measurement of thermal effects*
- Veitschegger W.K. & Wu C.-H. (1986) "Robot accuracy analysis based on kinematics," *IEEE J. Robotics
  Automation*, 2(3):171–179.
- Hayati S. & Mooring B. (1985) "The effect of joint-angle errors on robot positioning accuracy," *Proc.
  IEEE Int. Conf. Robotics Automation*, pp. 278–283.
- Hollerbach J., Khalil W., Ganesh G. (2016) "Kinematic Calibration" in *Springer Handbook of Robotics*
  2nd ed. (Siciliano & Khatib, eds.) — SE(3)/Lie group formulation.
- Altintas Y. (2012) *Manufacturing Automation: Metal Cutting Mechanics, Machine Tool Vibrations, and CNC
  Design*, 2nd ed. Cambridge University Press. — servo dynamics + interpolation.
- Altintas Y. et al., CIRP Annals 2018–2023 (multiple papers on MPC trajectory generation — specific
  titles flagged for web-verification per R12).
- Shoemake K. (1985) "Animating rotation with quaternion curves," *Proc. SIGGRAPH*, 19:245–254. — SLERP.
- Aho A.V., Lam M.S., Sethi R., Ullman J.D. (2006) *Compilers: Principles, Techniques, and Tools*
  (Dragon Book), 2nd ed. Addison-Wesley. — attribute grammar, L-attributed, data-flow.
- de Moura L. & Bjorner N. (2008) "Z3: An Efficient SMT Solver," *Proc. TACAS*, LNCS 4963:337–340.
- ANSI/MTC1.4 / ANSI/MTC2.0 MTConnect standard (MT Connect Institute).
- IEC 62541 series (OPC UA) + umati companion specification (VDW, 2019+).
- ISO 10303-238:2022 / ISO 14649 (STEP-NC AP238 ed2).
- Proctor F., Michaloski J., Horst J. — NIST IR reports on STEP-NC closed-loop (2012–2023, publicly
  available at nvlpubs.nist.gov).
- ASME B89.4.10360.2:2008 (CMM acceptance tests) + ISO 230-2 (positioning accuracy).
- **Planner: Hermes (xAI Grok, :8645), tempered per R12** — "NIST AL2" confabulation removed;
  ASME B5.64-2021 TCP dynamics standard flagged for web-verification before citation in code.
