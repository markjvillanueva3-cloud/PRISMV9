---
name: feedback-foxtrot-five-axis-singularity-gate
description: Check 5-axis RTCP singularity before generating any A-axis move near zero.
type: feedback
slot: foxtrot
galaxy: mill
source: prism-memory
synced: 2026-06-27T20:30:46.425Z
aliases: feedback_foxtrot_five_axis_singularity_gate
---


# 5-axis singularity gate (mill) — check before generating A-axis < 0.5° from zero

At A=0 with the tool axis aligned to Z, the RTCP (rotational tool-center-point) transform divides by zero — a singularity that produces NaN / wild rotary moves.

**Why:** the inverse kinematics degenerates when the tilt axis is at/near the pole; the C-axis becomes indeterminate. Generating a program through it crashes the post or the machine.
**How to apply:** call `MillKinematicsCollisionEngine.detectSingularity()` (or `Fusion360MillTurnBridgeEngine.detectSingularity()`) BEFORE emitting any A-axis value within 0.5° of zero. If detected, re-orient the part setup or insert a tilt offset — never emit through the singularity. Pairs with the `prism_safety` collision gate.
