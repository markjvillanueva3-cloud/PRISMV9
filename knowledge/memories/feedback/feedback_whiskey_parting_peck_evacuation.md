---
name: feedback-whiskey-parting-peck-evacuation
description: Parting/grooving deeper than 3× tool width traps chips and breaks the blade. Peck (G75 Q-param) above ratio 3.
type: feedback
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.453Z
aliases: feedback_whiskey_parting_peck_evacuation
---


Parting and grooving tools in deep grooves (depth > 3× tool width) trap chips against the narrow blade and break it.

**Why:** a parting blade has no helix to evacuate chips; in a deep slot the chip packs, jams, and snaps the blade (often into the chuck).

**How to apply:** use a peck-grooving cycle (Q parameter on G75) once depth ratio exceeds 3. Verify blade L/t against chatter + stress-to-yield before lights-out. The `/lathe-groove` skill classifies 8 groove types + selects plunge-and-shift vs peck. Part-off also needs part-catcher M-code timing.
