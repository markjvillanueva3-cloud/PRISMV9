---
name: feedback-whiskey-live-tooling-polar-mode
description: Live-tooling on a turning center — off-center milling is Cartesian (Y); C-axis polar needs G12.1/G13.1. Wrong mode = wrong coords.
type: feedback
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.452Z
aliases: feedback_whiskey_live_tooling_polar_mode
---


On a turning center with live tooling: off-center face/OD milling uses the Y axis (Cartesian); true polar interpolation about the spindle centerline requires C-axis polar mode (`G12.1`/`G13.1`, dialect-dependent). They are not interchangeable.

**Why:** programming a polar feature in Cartesian (or vice versa) emits the wrong coordinates → wrong geometry or crash. Y-axis travel is also limited; deep off-center features may not reach without polar.

**How to apply:** pick the mode from the feature geometry (radial slot/flat on a face → polar; pocket offset from center within Y travel → Cartesian) and verify against the post's polar-mode support. Mill-turn bridges (`*MillTurn*`) handle the handoff; cross-galaxy with foxtrot.
