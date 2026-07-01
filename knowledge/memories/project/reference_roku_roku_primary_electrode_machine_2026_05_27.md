---
name: roku-roku-primary-electrode-machine-2026-05-27
description: "Roku-Roku high-speed mill is JM Die's PRIMARY electrode machining machine — has its own electrode CAD/CAM folder. Lathe (whiskey slot) is being trained for eccentric/polygon turning of trilobe electrodes as a faster alternative to milling them."
type: project
source: prism-memory
synced: 2026-06-27T20:30:47.147Z
aliases: reference_roku_roku_primary_electrode_machine_2026_05_27
---


# Roku-Roku is JM Die's primary electrode machine

**Fact (operator, 2026-05-27, slot:delta during CAD electrode work):**
"roku-roku also has electrodes, thats our primary machine for electrodes, memorize that."

The Roku-Roku high-speed mill is the production machine that actually burns
out the trilobe / Taptite / Altracs / square electrodes used for sinker EDM.
Its own electrode CAD/CAM library lives at:

`H:/PRISM/JM DIE/FUSION CAD AND CAM FILES/ROKU ROKU/`

There is a SEPARATE `ELECTRODES/` folder at the same level — that one is the
master electrode-CAD library cross-machine. ROKU-ROKU/ is the
machine-specific cut-path corpus (its actual programs + setups).

**Why:** Roku-Roku gives the surface finish + accuracy a sinker-EDM
electrode needs (~0.0001" tolerance on the trilobe envelope) at production
speed. It is THE machine to optimize for when PRISM trains electrode CAM.

**How to apply:**
- Any electrode-CAM training (cad/cam-AI corpus, JM-die specialist) MUST
  weight the ROKU-ROKU/ programs first.
- When emitting CAM for a new electrode (the closed-loop pipeline this
  delta session is building) the default machine is Roku-Roku, not a VMC.
- Reference [[reference_ejot_p30247750_exact_dims_2026_05_27]] for the EJOT
  P30247750-1D2 case (M8 Taptite EDM burn-form) — the test piece the
  parametric generator is being validated against.

# Eccentric turning for trilobe — whiskey slot training goal

**Fact (same operator message):**
"trying to get lathe (whiskey) to train to do eccentric turning for the
trilobe electrodes which would be a lot faster than milling them"

**Why this matters:**
- Milling a trilobe on the Roku-Roku is multi-pass with a small ball-end mill.
  Cycle time is dominated by the cosine-modulated envelope sweep.
- Polygon turning (a.k.a. eccentric turning, or "trilobing" on a CNC lathe
  with live-tool or polygon-cutting attachment) cuts the trilobe in ONE
  revolution by oscillating the X-axis (or driven tool) at 3× spindle RPM
  for a 3-lobe profile.
- Industry standard: gear-driven polygon-cutting attachments (e.g. Mitsubishi
  MN1) lock the live-tool spindle at exactly the lobe-count ratio to the
  main spindle. CNC versions synthesize this with synchronized C+X-axis
  motion.
- 5-10× cycle-time reduction on production runs.

**How to apply (whiskey slot — lathe-soul):**
- Training data should include the trilobe envelope formula
  r(θ) = R_mean + amp·cos(N_lobes·θ) and the inverse motion equations
  (X-position vs C-angle for a given amplitude).
- Wire to LatheKinematicsEngine + PolygonTurningEngine (build if missing).
- Test piece: same EJOT P30247750-1D2 the delta slot is generating in CAD
  — eccentric-turn it on a lathe, compare cycle time + accuracy vs the
  Roku-Roku mill program.
- See [[reference_ejot_p30247750_exact_dims_2026_05_27]] for the target geometry.

# Related memories
- [[reference_ejot_p30247750_exact_dims_2026_05_27]] — the test electrode
- [[reference_delta_cad_toolchain_session_2026_05_27]] — delta-side toolchain
- [[reference_cam_corpus_locations]] — kilo-side full corpus map
- [[reference_cad_cam_seat_paths_2026_05_27]] — available CAD/CAM seats
