---
namespace: code-tribal
type: lesson
title: Okuma 5-axis TCP emit + post-processor golden-NC drift cron (advanced features)
domain: post-processor
slot: echo
source: U-PP-OKUMA-5AXIS-TCP (ed5a7ae10d) + U-PP-GOLDEN-NC-CRON (27aa35b7bf)
last_verified: 2026-06-28
related:
  - "[[post-processor-knowledge-base]]"
  - "[[post-processor-controller-dialect-matrix]]"
  - "[[mill-opcycle-canned-cycles]]"
---

# Okuma 5-axis TCP emit + post-processor golden-NC drift cron

Two advanced post-processor capabilities shipped 2026-06-28 (slot:echo) for the JM fleet
closed loop. Both are now exercised in the `verify-jm-fleet-coverage.ts` closed loop (20/20).

## 1. Okuma 5-axis TCP emission (VMC-02 Genos M460V-5AX)

`OkumaOSPMillMasterPostEngine` wraps a `3d_surface`/`adaptive` op that carries
`rotary_moves[]` (per-move A/C trunnion angles from the CAM post) in a TCP open/close bracket.

**Dialect (codes sourced from `ControllerDialectEngine.tcpc`, never inlined):**
| tcp_mode / family | TCP ON | TCP OFF | provenance |
|---|---|---|---|
| `G169_G170` (JM Die house) | `G169` | `G170` | Okuma-native; `OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps:47,515` (G169 ON / G170 OFF) |
| `G43.4` (Fanuc-style) | `G43.4 H{tool}` | `G49` | Fanuc TCP with tool-length H offset |
| dialect-DB P300 | `G43.4` | `G49` | `okuma_osp_p300.tcpc` |
| dialect-DB P500 | `G43.5 H{tool}` | `G49` | `okuma_osp_p500.tcpc` |

**Key rules (hard-won):**
- The post EMITS the A/C angles; it NEVER computes inverse kinematics. IK + collision route
  to `MillKinematicsCollisionEngine` (foxtrot/CAM owns the angles). Crossing that lane is a bug.
- **Singularity advisory** fires when the tool-axis k-component (cos of tilt from +Z) exceeds
  `cos(5°)≈0.9962` — the trunnion A-axis approaches its pole, where small XYZ perturbations cause
  large A/C excursions + feedrate spikes. The post WARNS (comment + warning), never alters the path.
  Boundary is strict `>`: k exactly cos(5°) → no advisory; k+ε → advisory.
- **Arc interpolation is unsafe under active TCP** — `arc_cw`/`arc_ccw` moves downgrade to a linear
  `G1` (CAM posts already linearize RTCP surfacing into dense G1 segments) and push a loud warning.
- Additive invariant: any 3-axis op (no `rotary_moves`, empty, or non-5axis type) takes the
  byte-identical prior path; golden snapshots unchanged.

## 2. Golden-NC drift cron (engineered harness)

`scripts/post-golden-drift-cron.mjs` — a nightly Windows task (`PRISM Post Golden Drift`, 2:47 AM)
that COMPOSES the two existing drift gates rather than reimplementing detection:
1. `verify-jm-fleet-coverage.ts` (regen every JM emit + lint/structural/header/marker, exit 3 on drift)
2. golden byte-lock vitest snapshots (all 5 mill posts + the OkumaB250 lathe — byte-lock parity).

Loss function: a planted drift fails the run (`DRIFT_EXIT=3`) + a one-line `AGENT_CHAT` alert on a
NEW regression (an already-failing gate does NOT re-alert — no spam). Mirrors `launch-readiness-cron`.

**Gotchas captured:**
- On Windows, `spawnSync('npx', ...)` returns `status:null` (the `.cmd` shim needs `shell:true`).
  Without it the cron false-positives a DRIFT on every run. `status:null` must report
  "FAILED TO LAUNCH" (fail-loud), distinct from a real non-zero gate exit.
- A non-zero exit that happens to carry the clean banner in stdout must still report the failing
  exit code — gate the clean-label on `status===0`, or an operator reads "XX gate: ALL N PERFECT".
- Byte-lock goldens must MASK the volatile `(GENERATED: <iso>)` header (OkumaOSP:743, HurcoV11:761)
  or the snapshot locks the wall clock, not the emit logic. Mirrors the OkumaB250 lathe golden mask.
- OkumaOSP/HurcoV11 `generateProgram` return `{gcode,warnings}` (NO `success` field, unlike
  RokuRoku/HaasNGC `{success,gcode}`) — a shared soundness assert must tolerate both shapes and
  assert a non-empty program as the universal success signal.

## BUG CAUGHT (R12) — the citation must be verified against the actual `.cps`

The 5-axis TCP code shipped (`ed5a7ae10d`) with **two safety-critical dialect bugs** that the
per-file 2-arm scrutiny PASSED (it trusted the engine's own citation comment) but the **end-of-session
3-of-3 gate caught** (arm A opened the `.cps` and read the ground truth):
1. ⚠ **[2026-06-29 CORRECTION (`b6b863d268`): THIS SUB-POINT IS ITSELF WRONG. The real Okuma OSP TCP-OFF is `G170`, NOT G168 — Okuma's own OSP 5-axis training material + the Autodesk vendor post confirm G169=TCPC ON / G170=TCPC OFF; G168 is not a documented TCPC-off code. `.cps:47` actually reads "TCP CONTROL (G169/G170)" and the post emits `gFormat.format(170)` at :4538/:4697. The `77e1861bba` flip to G168 was a re-regression on a misread citation, reverted to G170. Ignore the G168 claims in the rest of this bullet.]** ~~TCP-OFF was `G170` (wrong) — the M460V cancels RTCP with `G168`.~~ `.cps:47` "G169 ON / **G168**
   OFF" + `.cps:515` "Output G169 (TCP on) and **G168** (TCP off)". Emitting G170 leaves TCP ACTIVE
   after the op → crash on the next positioning move. The engine doc-comment had FABRICATED ".cps:515
   (G170 off)".
2. **Tilt word was `B` (wrong) — the M460V trunnion is the `A`-axis.** `.cps:833` `aOutput{prefix:"A"}`,
   `.cps:1097` tilt = `coordinate:0` axis `[1,0,0]`; table = `coordinate:2` (C). The M460V has no B-axis;
   the engine's own OO88 macro already used A. Emitting B-words drives a non-existent axis.

**Lesson:** a dialect/citation comment is NOT proof — open the cited `.cps` and read the actual code
(`createAxis`/`aOutput`/the TCP M-code lines) before trusting it. A per-file reviewer that reads only
the engine + its self-citation will rubber-stamp a fabricated cite; the 3-of-3's independent arm that
reads the SOURCE is what catches it. → [[feedback_read_full_content_not_titles]]

## Remaining (documented, NOT built this session)
- **Sub-spindle part-transfer** (Multus/OkumaB250): the engine has `sub_spindle_enabled` + an
  M38/M39-sync tribal tip but NO actual emit path — a real, safety-critical (phase-sync) feature
  needing design + handoff sync. Not an autonomous exercise.
- **HurcoWinMaxLathe C-axis/live-tool parity** (verify the real Hurco TM/TMX has C-axis first).
- **CIMCO machine-sim** of the generated NC + U-LEGAL-13 provenance — operator-gated.
