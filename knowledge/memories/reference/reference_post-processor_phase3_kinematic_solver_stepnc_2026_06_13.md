---
name: reference_post-processor_phase3_kinematic_solver_stepnc_2026_06_13
description: "Post-processor (echo) Phase-3 deeper anchor — Hermes-planned. (1) GENERIC kinematic solver: inverse kinematics from a machine kinematics-definition → one post engine drives N machine configs (head/table/mixed) vs N hand-written posts; (2) Heidenhain TNC640/iTNC530 kinematic cycles (Cycle 19, M128, TCPM, #ROT/#CS) + volumetric error-mapping/compensation tables; (3) NX Post Builder 2025 + Sandvik advanced 5-axis (TCPM/RTCP + dynamic machine compensation); (4) STEP-NC AP238 ed2 / ISO 10303-238:2022 — Workingstep execution, feature-based + closed-loop NC (CAM-neutral future). Written 2026-06-13 slot:zulu Hermes-loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.728Z
aliases: reference_post-processor_phase3_kinematic_solver_stepnc_2026_06_13
---


**Context:** Phase-3 post-processor anchor — **Hermes-planned**, per-galaxy harnessed loop. Deepens
[[reference_post-processor_controller_dialects_rtcp_2026_06_13]] (Phase-2). Spec: `FLEET-KNOWLEDGE-MAX-ROADMAP-2026-06-13.md` §echo.

## The next layer
- **Generic kinematic solver (the architectural leap):** instead of N hand-written posts, define each machine
  as a KINEMATICS MODEL (axis order, rotary vectors, pivot/offset lengths, limits) and solve **inverse
  kinematics** to map TCP tip+vector → joint values for ANY config (head-head / table-table / head-table).
  One post engine + a machine library = N machines. Handles multiple IK solutions (shortest-rotation /
  limit-aware selection) + RTCP-on/off pairing. This is how NX Post Builder + Autodesk's multi-axis post kernel
  scale; PRISM's MasterPost should be solver-driven, not dialect-cloned.
- **Heidenhain kinematics depth (TNC640/iTNC530):** Cycle 19 (working plane), M128 / FUNCTION TCPM, #ROT/#CS
  coordinate transforms, + **volumetric error-mapping / compensation tables** (the machine's measured geometric
  error map applied in the control) → accuracy beyond nominal kinematics.
- **5-axis advanced (NX Post Builder 2025 + Sandvik):** TCPM/RTCP + dynamic machine compensation (smoothing,
  jerk-limited rotary, look-ahead). Map each controller's high-speed-machining mode (CYCLE832 Siemens, G05.1
  Fanuc AICC, Heidenhain).
- **STEP-NC AP238 ed2 (ISO 10303-238:2022 / ISO 14649):** the CAM-neutral intelligent-NC model — Workingstep
  execution, feature-based machining, closed-loop feedback (the control adapts from measured results). The
  strategic future of the post: emit intent (features+ops), not just motion → pairs with kilo (CAM) + shop-floor
  (closed loop) + quality (in-process measurement).

## Wiring / consumers (R15)
- GALAXY: `engines/post-processor/` (echo). CONSUMERS: kilo (toolpath → post), the machine kinematics library
  (shared with cam global-collision Phase-3), shop-floor (STEP-NC closed loop), quality (error-map + in-process).
  DOMAIN: post-specific, but the kinematics-model + IK solver is shared with cam's 5-axis collision (one machine
  model serves both).
- AUTO-INVOCATION: cam-post-lint / post-validate already gate emitted G-code; the solver is an echo build unit.

## Next (Phase-4, per Hermes)
Build the kinematics-model schema + IK solver + a machine library (JM's 5-axis configs); validate emitted RTCP
G-code on a real 5-axis part against back-plot. Pairs with cam Phase-3 (shared machine model) + lathe (mill-turn kinematics).

Sources (Hermes-planned): Siemens NX Post Builder 2025 "Post Building Techniques"; Sandvik Coromant 5-axis
machining KB; Heidenhain TNC640/iTNC530 Technical Documentation + Kinematics Manual 2024; ISO 10303-238:2022 /
ISO 14649 (STEP-NC AP238 ed2); Autodesk multi-axis post kernel reference. Planner: Hermes (xAI Grok, :8645).
