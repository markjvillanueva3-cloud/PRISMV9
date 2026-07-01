---
name: reference_echo_controller_dialect_matrix
description: Controller-dialect feature deltas + the canonical dialect gotchas (post-processor galaxy / slot echo)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.559Z
aliases: reference_echo_controller_dialect_matrix
---


The #1 prove-out failure is controller-dialect mismatch. Canonical traps:

- **Feed-rate mode:** G93 inverse-time vs G94 ipm vs G95 ipr — wrong mode = wildly wrong feed.
- **Coolant ordering:** M8 must come AFTER M3-at-speed, else wet floor before the tool engages.
- **Comment syntax:** Okuma OSP uses `[]`; Fanuc/Haas/Hurco use `()`.
- **Tapping:** Siemens `MCALL` vs Fanuc `G84` modal-tap.
- **Decimal convention:** some Fanuc controllers reject `0.5`, require `.5` (or vice-versa).
- **Modal state** must survive subprogram (M98/M99) calls — leak = silent wrong WCS/plane.

JM production controllers + their high-end features: Haas Classic (iMachining), Hurco WinMAX (UltiMotion G64, G05.3 smooth), Okuma OSP-P300 (Super NURBS G131, TCP G169/G170 & G255/G254, CAS, polar G137), Fanuc 31i (AICC II G05.1, Nano smooth). Dialect tables → `src/data/controller-dialects/<vendor>.ts` (never inline). See [[feedback_echo_no_inline_post_constants]], [[reference_echo_jm_cps_fleet]].
