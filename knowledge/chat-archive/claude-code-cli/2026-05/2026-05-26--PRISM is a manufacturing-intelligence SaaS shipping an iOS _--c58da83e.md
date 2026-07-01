---
type: "chat-session"
source: "claude-code-cli"
session_id: "c58da83e-3703-40ab-a1da-206c8d75cb05"
title: "PRISM is a manufacturing-intelligence SaaS shipping an iOS + Android wrapper (Ca"
date: "2026-05-26"
first_ts: "2026-05-26T00:16:49.345Z"
last_ts: "2026-05-26T00:20:08.936Z"
cwd: "H:\\prism"
messages: 15
user_msgs: 7
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/c58da83e-3703-40ab-a1da-206c8d75cb05/subagents/agent-ab529931ab679dc2a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# PRISM is a manufacturing-intelligence SaaS shipping an iOS + Android wrapper (Ca

> **claude-code-cli** | 2026-05-26 | 15 msgs (7 user / 8 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c58da83e-3703-40ab-a1da-206c8d75cb05/subagents/agent-ab529931ab679dc2a.jsonl`

## Transcript

### User | 2026-05-26T00:16:49.345Z

PRISM is a manufacturing-intelligence SaaS shipping an iOS + Android wrapper (Capacitor 6) around its React+Vite web frontend. Design language is **Calculator Studio** = industrial dark HUD (near-black backgrounds, single dominant accent per surface with sharp glow, Bloomberg-terminal density, monospace numerics). Operator asks for "deep research into ui/ux/ios/android design" specifically to improve the existing app.

Target: a senior frontend engineer building this. NOT generic "what is good UX" — concrete 2026 best practices for THIS aesthetic + THIS Capacitor stack.

Deliver under 1000 words with these sections:

**1. Apple HIG 2026 — what changed in the last 12 months** (iOS 18+, Liquid Glass / new materials, what's deprecated for industrial dark dashboards). Skip the obvious; surface what an engineer who last shipped iOS in 2025 wouldn't know.

**2. Material 3 Expressive (2026) for industrial dashboards** — M3 Expressive landed late 2025; what specifically applies to data-dense numeric pages (Material You color is the wrong default for industrial dark — what is the right Material 3 path that preserves the HUD aesthetic).

**3. Cross-platform parity gotchas for Capacitor 6 + React** — top 5 places a single React component renders WRONG on one OS (touch-target legal sizes differ, modal presentation, dynamic type, keyboard avoidance, scroll inertia, status bar).

**4. Industrial dark + accessibility — the actual rules** — WCAG 2.2 AA contrast minimums on dark themes (specifically near-black backgrounds and the "no pure black" finding), respecting `prefers-reduced-motion` + `prefers-contrast: more`, the 16px-form-input iOS-zoom-avoidance trick, what auto-detects-system-dark-mode actually means in 2026.

**5. Concrete design references with URLs** — 3-5 production apps that nail industrial-dark mobile (NOT consumer SaaS — Stripe Dashboard mobile, Linear mobile, GitHub Mobile, Wise are existing references in the PRISM spec; add anything BETTER). Include a Figma comm
... [+731 chars truncated]

### Assistant | 2026-05-26T00:17:07.862Z

I'll research current best practices for industrial dark mobile UI on Capacitor 6 + React, with focus on what's genuinely new and load-bearing for this stack.

### Assistant | 2026-05-26T00:17:08.412Z

[tool_use: WebSearch]

### Assistant | 2026-05-26T00:17:09.387Z

[tool_use: WebSearch]

### Assistant | 2026-05-26T00:17:09.942Z

[tool_use: WebSearch]

### Assistant | 2026-05-26T00:17:10.531Z

[tool_use: WebSearch]

### User | 2026-05-26T00:17:44.229Z

[tool_result] Web search results for query: "Apple HIG 2026 iOS 18 Liquid Glass dark mode dashboard guidelines"

I'll search for that query for you.

Links: [{"title":"Apple Human Interface Guidelines: Complete iOS Design 2026","url":"https://www.nadcab.com/blog/apple-human-interface-guidelines-explained"},{"title":"Dark Mode | Apple Developer Documentation","url":"https://developer.apple.com/design/human-inter
... [+5599 chars truncated]

### User | 2026-05-26T00:17:51.175Z

[tool_result] Web search results for query: "Capacitor 6 React iOS Android touch target safe area keyboard avoidance 2026"

Links: [{"title":"capacitor-plugin-safe-area - npm","url":"https://www.npmjs.com/package/capacitor-plugin-safe-area"},{"title":"GitHub - capacitor-community/safe-area: Capacitor Plugin that patches the safe area for older versions of Chromium · GitHub","url":"https://github.com/capacitor-c
... [+6433 chars truncated]

### User | 2026-05-26T00:17:51.267Z

[tool_result] Web search results for query: "WCAG 2.2 AA dark theme contrast pure black avoid 2026 prefers-contrast"

Links: [{"title":"Contrast requirements for WCAG 2.2 Level AA | Make Things Accessible","url":"https://www.makethingsaccessible.com/guides/contrast-requirements-for-wcag-2-2-level-aa/"},{"title":"WCAG 2.2 Color Contrast — Rules & How to Comply","url":"https://rgblind.com/blog/wcag-color-contrast
... [+6531 chars truncated]

### User | 2026-05-26T00:17:51.801Z

[tool_result] Web search results for query: "Material 3 Expressive 2026 dark theme data dense dashboard tokens"

I'll search for information on that query.

Links: [{"title":"GitHub - Nerwyn/material-you-theme: Material Design 3 Theme for Home Assistant · GitHub","url":"https://github.com/Nerwyn/material-you-theme"},{"title":"Dark Mode Android Material 3: Complete Guide to Color Tokens and DayNight Theme in 202
... [+7512 chars truncated]

### Assistant | 2026-05-26T00:17:57.818Z

[tool_use: WebSearch]

### Assistant | 2026-05-26T00:17:58.381Z

[tool_use: WebSearch]

### User | 2026-05-26T00:18:34.399Z

[tool_result] Web search results for query: "React Tailwind Capacitor 6 industrial dark dashboard 16px input zoom prevent iOS 2026"

Links: [{"title":"GitHub - mlynch/nextjs-tailwind-ionic-capacitor-starter: A starting point for building an iOS, Android, and Progressive Web App with Tailwind CSS, React w/ Next.js, Ionic Framework, and Capacitor · GitHub","url":"https://github.com/mlynch/nextjs-tailwind-ionic-ca
... [+5292 chars truncated]

### User | 2026-05-26T00:18:54.147Z

[tool_result] Web search results for query: "industrial dark mobile app design 2026 Linear GitHub Mobile Bloomberg terminal aesthetic"

I'll search for that query about industrial dark mobile app design trends.

Links: [{"title":"Mobile App Design Trends 2026: UI Patterns | Muzli Blog","url":"https://muz.li/blog/whats-changing-in-mobile-app-design-ui-patterns-that-matter-in-2026/"},{"title":"What's Next: 7 UI D
... [+7254 chars truncated]

### Assistant | 2026-05-26T00:20:08.936Z

I have enough signal. Synthesizing now under the word budget.

---

# PRISM Mobile UI/UX — Deep Research (2026)

Industrial dark HUD on Capacitor 6 + React. Focus: what changed in the last 12 months, what an engineer who last shipped in 2025 would miss.

## 1. Apple HIG — what's new since iOS 26 / Liquid Glass

Liquid Glass shipped with **iOS 26** (mid-2025), not iOS 18 — and **iOS 26.2** (early 2026) reacted to the legibility complaints by making dark mode *darker* when "Reduce Transparency" + "Increase Contrast" are on ([MacRumors](https://www.macrumors.com/2026/04/06/apple-liquid-glass-design-gallery-update/)). For an industrial HUD the load-bearing rules:

- **Do not adopt translucent tab bars/toolbars on dense data screens.** Apple's own gallery uses Liquid Glass on tab/nav chrome, but the documented critique is glass on top of dense numerics destroys plane separation ([anotherapple.com](https://www.anotherapple.com/2026/04/the-correct-way-to-use-dark-mode-with-liquid-glass/)). Keep solid `surface` tokens behind chrome; respect the user's **Reduce Transparency** toggle and fall through to opaque.
- **Honor `UIAccessibilityIsReduceTransparencyEnabled` and `UIAccessibilityDarkerSystemColorsEnabled`** — these now compose with Liquid Glass to produce the new "Ultra Dark" tier ([Geeky Gadgets](https://www.geeky-gadgets.com/enable-iphone-ultra-dark-mode/)). In React this means a third theme variant beyond `light`/`dark`: `dark-high-contrast`.
- **App icon variants are now table-stakes** — ship `light`, `dark`, *and* `tinted` icon assets (iOS 18+ requirement still active) ([HIG](https://developer.apple.com/design/human-interface-guidelines/)).
- **Control Center / Lock Screen / Action button extensions** — a manufacturing app that doesn't surface "active job + spindle load" as a Lock Screen Live Activity in 2026 is leaving the most valuable iOS surface on the table.

## 2. Material 3 Expressive for industrial dark

M3 Expressive (late 2025) is built on **two token lay
... [+7110 chars truncated]
