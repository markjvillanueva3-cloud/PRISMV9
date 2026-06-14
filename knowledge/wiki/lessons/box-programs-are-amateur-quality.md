---
title: "Box programs are amateur quality"
name: box-programs-are-amateur-quality
kind: reference
status: promoted
category: lessons
domain: knowledge-vault
promoted_from: knowledge/memories/feedback/feedback_box_programs_amateur.md
promoted_at: 2026-06-06T04:55:44.835Z
source_refs: 7
---

# Box programs are amateur quality

Box drive programs were written by amateurs who don't know proper machining, speed/feed calculations, or advanced lathe nuances. NEVER treat the original S/F values as correct or use them as training targets.

**Why:** The user explicitly stated the programs are far from optimized. Using amateur values as targets would propagate bad practices into PRISM's physics engines.

**How to apply:**
- Physics optimization must calculate from first principles (Kienzle, Taylor, Brammertz), NOT from shop averages
- MaterialResolver can use SFM for material *detection* but not for optimization targets
- PatternMinerEngine should mine *structural* patterns (G-code dialect, tool conventions, variable naming) — NOT speed/feed patterns as "shop best practices"
- When generating reports, frame original values as "what the shop runs" vs "physics-correct", not as "reference" vs "optimized"
- PostProcessorTrainer matches *structure* (G85 vs G71, T-code format, comment style) — NOT parameter values

## Source

Promoted from memory [[feedback_box_programs_amateur]] (referenced 7x across the vault). The memory remains the editable source of truth.
