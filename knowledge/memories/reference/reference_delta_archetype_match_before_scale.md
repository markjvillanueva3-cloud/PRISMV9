---
name: reference-delta-archetype-match-before-scale
description: "Match topology archetype BEFORE scaling a reference STEP. Scaling a single-section template (JM trilobe-example) to a two-section+blend target (EJOT) is geometrically wrong regardless of scale factors. Generate parametrically instead."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-09T14:54:09.076Z
aliases: reference_delta_archetype_match_before_scale
---


# Archetype match before scale (delta)

Scaling a reference STEP only works when the reference and target share the same topology archetype.

JM `trilobe-example.step` (9106325) is a **single-section** trilobe. The EJOT P30247750 electrode is **two-section + R0.787 blend**. Anisotropic-scaling the JM reference (radial 0.723× + axial 1.596×) produces JM-style topology at EJOT size — but it is the WRONG archetype, so it does not represent the EJOT part. Scale factors cannot convert one archetype into another.

**Rule:** classify the target archetype first; if it differs from the reference, generate parametrically (`cad-generate-stepped-trilobe-cli.mjs`) rather than scale-from-template. See [[reference_jm_trilobe_example_step_analysis_2026_05_27]] · wiki [[cad-electrode-generation]].
