---
name: feedback_lima_physics_constants_never_inline
description: Academy lessons must LINK src/physics/constants.ts, never inline kc1.1/Taylor/material values. An inlined constant in a course rots when the canonical value changes.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.432Z
aliases: feedback_lima_physics_constants_never_inline
---


Standing rule for slot:lima (academy). Course/lesson content frequently teaches cutting physics (Kienzle force, Taylor tool life, material kc1.1). It is tempting to write the number directly into the lesson body for readability.

**Do not.** Inlining a physics constant into a course creates a second source of truth that silently rots when `mcp-server/src/physics/constants.ts` changes. Canonical kc1.1 per ISO group lives there ONLY: P=1800, M=2100, K=1100, N=700, S=2800, H=3200.

**Why:** A course that hardcodes kc1.1=1800 becomes WRONG (and teaches a wrong value) the day the constant is recalibrated. Academy content informs production decisions (shop_floor tier, Ω≥0.95) — a stale taught constant is a safety/quality regression that propagates to every apprentice.

**How to apply:** In a lesson, cite "per `src/physics/constants.ts` (ISO P group, kc1.1)" and pull the live value via `prism_calc`/`mcdl_link_to_physics_constants` rather than typing it. Grep new course files for `kc1_1|kc11_mpa|taylor|\b1800\b|\b2100\b` — should be 0 inlined values. Encoded in lima soul refuse #5. See [[reference_lima_citation_at_claim]].
