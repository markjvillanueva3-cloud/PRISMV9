---
name: feedback-foxtrot-spindle-power-headroom
description: Mill cutting recommendations must stay within installed spindle HP minus 20% headroom.
type: feedback
slot: foxtrot
galaxy: mill
source: prism-memory
synced: 2026-06-27T20:30:46.426Z
aliases: feedback_foxtrot_spindle_power_headroom
---


# Spindle power headroom gate (mill) — installed HP − 20%

Cutting power = (Kienzle force × cutting velocity) / efficiency. Any recommended param set whose power demand exceeds the machine's installed spindle HP minus a 20% headroom must be rejected (or de-rated).

**Why:** running a spindle at >80% continuous invites stall, thermal growth, and accelerated bearing wear; the 20% buffer absorbs transients (entry spikes, hard spots). Shop_floor safety tier requires S(x) ≥ 0.98.
**How to apply:** pull the per-machine power curve from `data/jm-die-profile.ts` / `MachineRegistry`; run `prism_safety:validate_physics` before surfacing any speed/feed. JM Die mill fleet: VMC-01 Hurco VM30i, VMC-02 Okuma 5-AX, VMC-03/04 Haas, VMC-05 Roku-Roku. Cross-ref [[feedback_foxtrot_chip_thinning_mandatory]].
