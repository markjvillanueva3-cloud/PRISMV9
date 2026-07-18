---
name: feedback-whiskey-threading-multipass
description: Single-point threading needs entry position-lock (G76/G92) + multi-pass schedule. Never single-pass a tolerance thread.
type: feedback
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.453Z
aliases: feedback_whiskey_threading_multipass
---


Single-point threading on a lathe REQUIRES a position-locked entry (G76 or G92 canned cycle); a feed-mode entry cuts a non-helical first revolution. Precision threads need a multi-pass schedule (rough → semi-finish → finish) per Sandvik/Kennametal infeed recipe — never single-pass.

**Why:** feed-mode entry = wrong lead on rev 1 = scrapped thread. Single-pass = overloaded final flank = torn thread + chipped insert.

**How to apply:** run `prism_turning:lathe_thread_schedule` for the pass plan. Prefer modern G76 (roughing+finish canned cycle) over legacy G92 single-block when the controller supports it (−10 rubric for G92-when-G76-available). See [[reference_lathe_g76_thread_validator_design_2026_05_27]].
