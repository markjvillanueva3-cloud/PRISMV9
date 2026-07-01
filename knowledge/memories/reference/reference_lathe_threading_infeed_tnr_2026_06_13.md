---
name: reference_lathe_threading_infeed_tnr_2026_06_13
description: "Lathe (whiskey) Phase-2 deep-research anchor — single-point threading infeed methods + nose-radius/CSS safety. Infeed: radial/plunge (both flanks cut, heat+chatter on coarse, ≤16 TPI ok), FLANK/angular (~29-29.5° = thread-angle/2 minus ~0.5-1°, chip off one flank, best for coarse), MODIFIED-flank (alternating), INCREMENTAL depth schedule (decreasing DOC/pass to hold chip-area ~constant, Sandvik tables). Multi-start = offset starts by pitch via tool-shift or spindle C-angle. CSS G96 + G50 cap; TNR comp G41/G42. Written 2026-06-13 slot:zulu, FLEET-KNOWLEDGE-MAX Phase-2."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.640Z
aliases: reference_lathe_threading_infeed_tnr_2026_06_13
---


**Context:** Phase-2 external-knowledge anchor for the lathe galaxy (Lathe Wizard / whiskey), per the
2026-06-13 knowledge-max `/goal`. Canonical turning/threading theory + tooling-maker practice. Spec:
`FLEET-KNOWLEDGE-MAX-ROADMAP-2026-06-13.md` §whiskey.

## Single-point threading infeed methods (the world-leading distinction)
A threading insert cuts a full thread profile over many passes; HOW depth is fed in per pass determines chip
control, tool life, and finish:
- **Radial (plunge) infeed:** feed straight in (X only) each pass. Both flanks cut simultaneously → a stiff
  V-chip, high heat, chatter-prone on coarse pitches. Acceptable for fine pitches (~≤1.5 mm / ≥16 TPI) and
  hard/short-chipping materials. Simplest; default for fine threads.
- **Flank / angular / "infeed" method:** feed in along an angle ≈ **half the thread angle minus ~0.5-1°**
  (so ~29-29.5° for a 60° thread). Chip is formed by essentially ONE flank → curls away cleanly, lower cutting
  force + heat, far better for **coarse pitches**. Risk: rubbing on the trailing flank if angle = exactly
  half-angle (hence the −0.5-1° relief). The dominant CNC method for coarse threads.
- **Modified / alternating flank:** alternate the angular infeed left/right each pass → wears both insert flanks
  evenly, best insert life on very coarse threads/large profiles. More complex (canned-cycle / CAM support).
- **Incremental (decreasing) depth schedule:** per-pass DOC DECREASES each pass so the removed chip CROSS-SECTION
  stays ~constant (constant cutting force) — first pass deepest, last passes light. Sandvik/Kennametal publish
  per-pitch pass-count + per-pass depth tables; CNC threading canned cycles (Fanuc **G76** two-block, Haas G76,
  Okuma) implement this with a depth-degression exponent. Constant-DOC (G92/G32 hand-schedule) is the cruder
  alternative.

## Multi-start threads
- N starts = N independent helices offset by **(pitch / N)** along the axis, lead = N × pitch. Cut each start
  then **offset**: (a) **tool Z-shift** by pitch/N between starts (simple, accumulates error), or (b) **spindle
  start-angle** offset 360°/N (Fanuc threading angle Q in G76, cleaner). Pitch (not lead) sets the per-tooth
  feed engagement.

## Turning safety + finish (pairs with the cutting core)
- **CSS (G96):** constant surface speed holds Vc as diameter shrinks → rpm rises toward center → **G50 (or G92
  on some controls) caps max rpm** to protect chuck/workholding (centrifugal grip-loss). G97 = constant rpm
  (use for threading/drilling at center). This is a HARD safety rule — never run G96 facing-to-center without a
  G50 cap (whiskey soul refuses it).
- **Theoretical surface finish:** `Ra ≈ f² / (32 · rε) · 1000` (µm, f mm/rev, rε nose radius mm) — bigger nose
  radius + lower feed = finer finish, but rε too large vs DOC → chatter. Drives finish-pass feed selection.
- **TNR (tool-nose-radius) compensation:** G41/G42 + tool-tip orientation code (imaginary tip 0-9) corrects the
  profile error the nose radius introduces on tapers/arcs/faces — without it, angled/curved features are
  oversized/undersized by ~rε.
- **ISO turning insert code (ISO 1832):** shape-clearance-tolerance-type / size-thickness-nose-radius — e.g.
  CNMG120408 = 80° rhombic, N clearance, M tol, G chipbreaker, 12 mm IC, 04 thick, 08 = 0.8 mm nose radius.

## SFC integration (whiskey)
- Turning is the canonical ISO 3685 tool-life test geometry → Taylor/Kienzle constants (shared with oscar) are
  most directly validated here. Next deep-research (roadmap §whiskey): Sandvik turning application guide pass-
  schedule tables, ISO 1832 full insert decode, sub-spindle/live-tooling Y-axis. Pairs with
  [[reference_speed-feed_sfc_chatter_sld_taylor_2026_06_13]].

Sources: canonical turning/threading practice — Sandvik Coromant threading application guide; Harvey Performance
"Multi-Start Thread Reference Guide" (harveyperformance.com/in-the-loupe); Cutting Tool Engineering "Cutting
multiple-start threads" (ctemag.com); *Machinery's Handbook* (threading, turning); Fanuc G76 threading-cycle
manual. Live web partially rate-limited this pass — infeed-angle + Ra formulas are standard; re-verify the
Sandvik per-pitch pass-schedule tables on the next Phase-2 lathe pass.
