---
name: feedback_echo_no_inline_post_constants
description: Post-processor dialect/feed/speed/physics constants route through DB + speed-feed — never inline (slot echo standing rule)
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.423Z
aliases: feedback_echo_no_inline_post_constants
---


**Rule:** never inline post-processor constants into an engine or dispatcher case.

- **Dialect G/M tables** → `src/data/controller-dialects/<vendor>.ts` (the `box_okuma_dialect_*` MCP surface implies this exists; verify).
- **Feed/speed values** → `cam_speedfeed_compute` (oscar's speed-feed galaxy).
- **Physics (Kienzle kc, Taylor C/n)** → `src/physics/constants.ts` (bravo/alpha own; read-only for echo).
- **Kinematic config (RTCP/G68.2/multi-channel)** → `src/data/machine-kinematics.ts`.

**Why:** inlined codes drift per-controller, break byte-equivalence vs golden NC, and can't be calibrated by the MasterPostFineTuning loop. **How to apply:** if a code isn't in the canonical table, ASK before adding — do not hand-roll a formatter. Cross-ref the root SAFETY rule. See [[reference_echo_controller_dialect_matrix]], [[feedback_echo_masterpost_pipeline_route]].
