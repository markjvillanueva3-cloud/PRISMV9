---
name: feedback-whiskey-subspindle-phase-tolerance
description: Sub-spindle handoff on a mill-turn must align cutoff timing within 0.5° of spindle phase or it crashes the part.
type: feedback
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.453Z
aliases: feedback_whiskey_subspindle_phase_tolerance
---


On a multi-task / mill-turn machine, the sub-spindle pickup must align cutoff timing within **0.5° of spindle phase**. Outside that window the part transfer collides or drops.

**Why:** the two spindles are synchronized during transfer; a phase mismatch at the cutoff means the sub-spindle clamps mid-rotation → crash or dropped part.

**How to apply:** verify via `SubSpindleHandoffVerifierEngine` (and `LatheSubSpindleTransferPurgeEngine` for coolant/chip purge) before emitting a transfer block. Also confirm bar-puller M-codes + part-catcher timing across the controller dialect (Fanuc/Okuma OSP/Mazatrol/Haas-NGC). Cross-galaxy: mill-turn bridges (foxtrot).
