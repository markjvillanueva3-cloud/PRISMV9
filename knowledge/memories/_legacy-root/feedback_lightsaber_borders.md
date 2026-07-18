---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/feedback_lightsaber_borders.md
source_filename: feedback_lightsaber_borders.md
content_hash: 9850b41c6fe046910dc27cc79dc89957000224b26bc4b21ac824ae141c9869f4
mirror_ts: 2026-05-05T13:00:09.453Z
mirror_engine: ObsidianMemorySyncEngine
---

Feature sections on pages must have vibrant 2-tone LED lightsaber-style glowing borders with hues in between. Purpose: attract user attention to advanced features to help sell the product. Follow the calculator studio page (CalculatorPage.tsx) style and layout as the reference. Use the existing CSS variables and animation patterns from index.css (calculator-toolbar-led-sweep, calculator-shell-border-clockwise, etc.).

**Why:** User wants the product to look premium and draw attention to paid/advanced features. The borders should be eye-catching like lightsaber effects — not subtle.

**How to apply:** When building any new page or feature section, use the calculator studio's multi-layered box-shadow + animated gradient border pattern. Main borders should use 2-tone gradients (e.g., cyan→blue, amber→gold, violet→rose) with the hue spectrum in between. Use the existing `--calculator-brand-led-*` CSS variables and keyframe animations.
