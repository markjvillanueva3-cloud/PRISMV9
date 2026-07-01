---
name: feedback-whiskey-g50-css-cap-mandatory
description: Every G96 (CSS) turning move MUST carry a G50 S<max-rpm> cap. Missing G50 on a G96 program is a crash-risk P0.
type: feedback
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.452Z
aliases: feedback_whiskey_g50_css_cap_mandatory
---


Every constant-surface-speed (G96) turning move MUST carry a `G50 S<max-rpm>` spindle cap (or controller equivalent). G96 raises RPM as diameter shrinks; at a small-diameter finish pass it can exceed the machine's max-RPM and over-spin the chuck.

**Why:** unbounded G96 at small X = chuck/part overspeed → workpiece ejection / crash. Quality-rubric penalty −20.

**How to apply:** validate G50 presence before any emit; the canonical fail-loud check whiskey shipped is `jm-die-lathe-upgrade-ms0-u-okuma-lathe-g50-check`. Pair G96 with G50; use G97 (fixed RPM) at the clamp diameter and for all threading. See [[reference_lathe_canned_cycle_dialects_2026_05_27]].
