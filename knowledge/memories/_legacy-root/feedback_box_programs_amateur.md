---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/feedback_box_programs_amateur.md
source_filename: feedback_box_programs_amateur.md
content_hash: e7b75935b709f9543436237fa3f598ff32e1adb18a75e5471d60f501d8ebb7d3
mirror_ts: 2026-05-05T13:00:09.417Z
mirror_engine: ObsidianMemorySyncEngine
---

Box drive programs were written by amateurs who don't know proper machining, speed/feed calculations, or advanced lathe nuances. NEVER treat the original S/F values as correct or use them as training targets.

**Why:** The user explicitly stated the programs are far from optimized. Using amateur values as targets would propagate bad practices into PRISM's physics engines.

**How to apply:**
- Physics optimization must calculate from first principles (Kienzle, Taylor, Brammertz), NOT from shop averages
- MaterialResolver can use SFM for material *detection* but not for optimization targets
- PatternMinerEngine should mine *structural* patterns (G-code dialect, tool conventions, variable naming) — NOT speed/feed patterns as "shop best practices"
- When generating reports, frame original values as "what the shop runs" vs "physics-correct", not as "reference" vs "optimized"
- PostProcessorTrainer matches *structure* (G85 vs G71, T-code format, comment style) — NOT parameter values
