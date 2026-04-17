---
name: Lightsaber LED border style for feature sections
description: User wants vibrant 2-tone LED lightsaber-style glowing borders on feature sections to attract attention and sell the product
type: feedback
---

Feature sections on pages must have vibrant 2-tone LED lightsaber-style glowing borders with hues in between. Purpose: attract user attention to advanced features to help sell the product. Follow the calculator studio page (CalculatorPage.tsx) style and layout as the reference. Use the existing CSS variables and animation patterns from index.css (calculator-toolbar-led-sweep, calculator-shell-border-clockwise, etc.).

**Why:** User wants the product to look premium and draw attention to paid/advanced features. The borders should be eye-catching like lightsaber effects — not subtle.

**How to apply:** When building any new page or feature section, use the calculator studio's multi-layered box-shadow + animated gradient border pattern. Main borders should use 2-tone gradients (e.g., cyan→blue, amber→gold, violet→rose) with the hue spectrum in between. Use the existing `--calculator-brand-led-*` CSS variables and keyframe animations.
