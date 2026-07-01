---
name: feedback-oscar-css-g50-cap-mandatory
description: Standing SFC/lathe doctrine — every G96 (constant surface speed) move must carry a G50/G92 max-RPM cap. Runaway at small diameter is a P0 safety class.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.438Z
aliases: feedback_oscar_css_g50_cap_mandatory
---


# Every G96/CSS move needs a max-RPM cap (oscar + whiskey doctrine)

In constant-surface-speed (G96) turning, RPM = Vc / (π·D). As the cutting diameter shrinks toward zero (facing to center, parting off, small bores), commanded RPM climbs without bound. **Every G96 block must be paired with a G50 (or G92 / controller equivalent) max-RPM cap.** G97 (constant RPM) is the correct regime at/below the clamp diameter and for threading.

**Why:** an un-capped CSS move at a small diameter can command RPM beyond the chuck's safe limit → workpiece ejection, chuck-jaw failure, or spindle damage. This is a P0 safety class, not an optimization detail. It is the canonical fail-loud check whiskey already shipped (`jm-die-lathe-upgrade-ms0-u-okuma-lathe-g50-check`).

**How to apply:** SFC's 9-axis orchestrator injects the cap (clamp step 5) on any CSS path; when emitting lathe G-code, verify a G50/G92 cap precedes the first G96. Refuse any CSS rewrite that lacks it. The cap value comes from the chuck/workholding max-RPM (machine + workholding axis), not a guess.

Related: [[feedback_oscar_sfc_physics_discipline]] · sister doctrine in whiskey's lathe soul (G50/G96 max-RPM cap).
