---
name: Box programs are amateur quality
description: All CNC programs in Box drive were written by amateurs — do not trust S/F values, only mine structural patterns
type: feedback
---

Box drive programs were written by amateurs who don't know proper machining, speed/feed calculations, or advanced lathe nuances. NEVER treat the original S/F values as correct or use them as training targets.

**Why:** The user explicitly stated the programs are far from optimized. Using amateur values as targets would propagate bad practices into PRISM's physics engines.

**How to apply:**
- Physics optimization must calculate from first principles (Kienzle, Taylor, Brammertz), NOT from shop averages
- MaterialResolver can use SFM for material *detection* but not for optimization targets
- PatternMinerEngine should mine *structural* patterns (G-code dialect, tool conventions, variable naming) — NOT speed/feed patterns as "shop best practices"
- When generating reports, frame original values as "what the shop runs" vs "physics-correct", not as "reference" vs "optimized"
- PostProcessorTrainer matches *structure* (G85 vs G71, T-code format, comment style) — NOT parameter values
