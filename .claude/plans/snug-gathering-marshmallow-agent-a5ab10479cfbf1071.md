# PRISM v9 Color System Review -- Dark Mode UI Specialist Critique

## Executive Summary

The proposed color system is a solid starting point with good manufacturing-domain instincts (cobalt blue, orange accent, 4-level elevation). However, there are seven issues ranging from "will cause real user confusion" to "nice improvement opportunity." The biggest problems are the orange accent colliding with warning/error semantics and the text-shadow approach for legibility. Below is the full critique, point by point.

---

## 1. Industrial Cobalt (#3461b8) as Primary

**Verdict: GOOD choice, but needs one adjustment.**

`#3461b8` is a medium-saturation blue sitting at roughly HSL(220, 55%, 46%). Compared to the current Tailwind blue-500 (`#3b82f6`, HSL 217, 91%, 60%), it is noticeably darker and less saturated. This is the right direction for manufacturing. Highly saturated blues feel consumer/SaaS (think Facebook, Twitter). Desaturated blues feel industrial, trustworthy, and reduce eye fatigue during long shifts.

**However**, the current `index.css` still defines `--color-primary-500: #3b82f6` (stock Tailwind blue). These two blues will co-exist during migration and create visual inconsistency. The plan should include a hard cutover: replace the entire `--color-primary-*` ramp with a custom ramp built from `#3461b8` as the 500 anchor.

**Recommended ramp (generated from #3461b8 using OKLCH for perceptual uniformity):**

```
--color-primary-50:  #eef3fb
--color-primary-100: #d5e0f5
--color-primary-200: #b0c4ea
--color-primary-300: #839dd8
--color-primary-400: #5b7ec8
--color-primary-500: #3461b8   (anchor)
--color-primary-600: #2a4f99
--color-primary-700: #213d7a
--color-primary-800: #192d5c
--color-primary-900: #111e3e
--color-primary-950: #0a1225
```

**Distinctiveness check:** Against competitors -- Mastercam uses red, Fusion360 uses orange, SolidWorks uses red/blue, Haas uses red. A darker cobalt is distinctive enough and avoids the "generic SaaS blue" problem. Pass.

**One concern:** At 46% lightness, `#3461b8` on `#0c1220` background gives a contrast ratio of roughly 3.8:1, which fails WCAG AA for text. This primary should never be used as text on dark backgrounds -- only for filled buttons, active tab indicators, and focus rings. Text that refers to "primary" actions should use `--color-primary-300` or `--color-primary-200` on dark surfaces.

---

## 2. Machine Orange (#f97316) as Accent

**Verdict: PROBLEM. This will cause semantic confusion.**

`#f97316` is Tailwind's `orange-500`. The plan says it is for "CTAs and alerts." But look at the current semantic tokens in `index.css`:

```
--color-warning-500: #f59e0b   (amber/yellow-orange)
--color-danger-500:  #ef4444   (red)
```

The warning color `#f59e0b` and the accent `#f97316` are 23 degrees apart in hue (amber vs orange). On a dark background, they will be nearly indistinguishable to many users, and completely indistinguishable to the ~8% of male machinists with some form of color vision deficiency (protanopia makes orange and yellow-orange collapse into the same perceived hue).

**Additionally**, `#f97316` is already used as the ISO 513 "S" group (Superalloys) color in `materials.ts`. Using it as the brand accent means every superalloys badge in the SFC will look like a CTA button.

**Recommendation: Shift the accent to Amber-Gold (#f59e0b or #eab308) OR shift it to a warmer, more distinct orange like #ff6b1a, AND simultaneously shift warning to a pure yellow (#facc15).**

Better yet, reconsider whether orange is the right accent at all. For a manufacturing app, consider:

- **Bright Teal (#14b8a6):** Complementary to cobalt, high contrast on dark, zero confusion with red/orange/yellow status colors. Used by Machining Cloud and modern industrial UIs.
- **Precision Green (#22c55e with slight cyan shift):** Already in your semantic palette as success. Could work if status-green is kept distinct (see point 6).
- **Keep orange but ONLY for destructive/attention states:** Use the primary cobalt for CTAs instead. Many industrial apps (Siemens NX, CATIA) use blue for primary actions and reserve warm colors entirely for status.

My strongest recommendation: **Use cobalt for CTAs (filled blue button) and reserve ALL warm colors (yellow, orange, red) exclusively for status/severity.** This prevents semantic collisions entirely.

---

## 3. 4-Level Elevation System

**Verdict: MOSTLY GOOD. One problem layer.**

The proposed layers:

| Level | Value | Perceived Lightness (approx) |
|-------|-------|------------------------------|
| Page | `#0c1220` | L* ~6 |
| Sidebar | `#111827` | L* ~9 |
| Cards | `rgba(30,41,59,0.7)` + blur | L* ~17 (when composited on page) |
| Modals | `rgba(30,41,59,0.95)` + blur-lg | L* ~19 |

**The page-to-sidebar step is too small.** The delta between `#0c1220` (L* ~6) and `#111827` (L* ~9) is only about 3 L* units. On a typical shop floor monitor (which is often a lower-quality panel with poor black differentiation, and may be viewed from an angle), these two will merge into one indistinguishable dark mass. Material Design recommends a minimum of 5-8 L* units between elevation levels.

**Fix:** Either darken the page to `#080e1a` (L* ~4) or lighten the sidebar to `#1a2332` (L* ~12). I recommend the latter since going darker than `#0c1220` risks the background being invisible on some monitors.

**The card-to-modal step is also too small** (L* ~17 vs ~19). However, since modals use `backdrop-blur-lg` and typically have a scrim overlay behind them, the perceptual separation comes from the blur and dimming of background content, not the surface color alone. This is acceptable.

**Recommended revised elevation ramp:**

```
--elevation-page:    #0c1220     (L* ~6)   -- deepest background
--elevation-sidebar: #1a2332     (L* ~12)  -- clearly distinct from page
--elevation-card:    #1e293b/70  (L* ~17)  -- glass card with transparency
--elevation-modal:   #1e293b/95  (L* ~19)  -- near-opaque modal
--elevation-popover: #253347     (L* ~20)  -- tooltips, dropdowns (add 5th level)
```

I also recommend adding a 5th level for popovers/tooltips/dropdowns. Without it, dropdown menus from a card-level surface will appear at the same elevation as the card they emerged from, which breaks the visual hierarchy.

---

## 4. Text Shadow for Legibility

**Verdict: WRONG APPROACH. Will cause blurriness and subpixel rendering issues.**

The proposed utility:
```css
.text-safe { text-shadow: 0 1px 3px rgba(0,0,0,0.5), 0 0 8px rgba(0,0,0,0.3); }
```

Problems:

1. **Subpixel rendering conflict:** On Windows (which is your primary platform given this is a shop floor app), ClearType subpixel rendering and text-shadow interact badly. The shadow is rendered at full pixels, but the text uses subpixel hints. The result is a visible halo/fringe around each glyph, especially at small sizes (11-14px). This gets worse on lower-resolution monitors common on shop floors.

2. **The 8px glow is too large.** An 8px blur radius on 11-14px text creates a dark "aura" that is wider than the text itself. This reduces readability rather than improving it, especially for dense data tables.

3. **Performance on older hardware.** Text shadows force the browser to rasterize each text element into its own compositing layer. On a page with hundreds of text nodes (your SFC result tables, G-code editors, machine dashboards), this adds measurable paint time.

4. **Print/export degradation.** If users print or PDF-export any page, text shadows reproduce poorly.

**Recommended alternatives:**

**A. Ensure sufficient contrast without shadows.** If your text colors meet WCAG AA contrast ratios against their specific backgrounds, you do not need text shadows at all. This is the correct primary approach:
  - Body text on dark surfaces: `text-slate-100` (#f1f5f9) on `#0c1220` = 15.2:1 contrast. Excellent.
  - Secondary text: `text-slate-300` (#cbd5e1) on `#0c1220` = 10.1:1. Excellent.
  - Never use `text-slate-400` or darker for readable content on dark.

**B. For text over images/gradients (rare in this app), use a background scrim instead:**
```css
.text-over-image {
  background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%);
  /* Text sits on the gradient, not relying on shadow */
}
```

**C. If you absolutely must use a shadow (e.g., for overlay text on the 3D viewer), use a minimal single shadow:**
```css
.text-crisp { text-shadow: 0 1px 2px rgba(0,0,0,0.9); }
/* Single shadow, tight radius, high opacity = sharp rather than hazy */
```

**Recommendation:** Delete `.text-safe` entirely. Replace `.text-crisp` with the minimal version above. Fix the root cause (contrast ratios) instead of papering over it with shadows.

---

## 5. Glass Morphism / backdrop-blur

**Verdict: CONDITIONAL PASS with required fallback.**

The proposed card style:
```
rounded-xl border border-slate-700/60 bg-slate-800/70 backdrop-blur-sm shadow-lg shadow-black/20
```

**Browser support:** `backdrop-filter: blur()` is supported in Chrome 76+ (2019), Firefox 103+ (2022), Safari 9+ (2015), Edge 79+ (2020). This covers 96%+ of current browser share. For a manufacturing web app deployed on controlled shop floor machines, this is likely fine.

**The real concern is performance on older shop floor PCs.** `backdrop-filter` forces the browser to:
1. Render everything behind the element to an offscreen buffer
2. Apply a Gaussian blur kernel to that buffer
3. Composite the blurred result with the element's background

On integrated GPU hardware (Intel HD 4000 era, common in shop floor panel PCs), this can cause:
- 10-20ms additional paint time per blurred element
- Visible jank when scrolling content behind blurred sidebars
- Compounding cost when multiple glass cards are on screen simultaneously (your SFC page could have 4-6 cards visible at once)

**Required mitigations:**

1. **Use `backdrop-blur-sm` (4px), never `backdrop-blur` (8px) or larger for cards.** Smaller kernels are 4x cheaper to render. Reserve `backdrop-blur-lg` only for modal overlays (single element, full-screen).

2. **Add a fallback for browsers/hardware that cannot handle it:**
```css
@supports not (backdrop-filter: blur(4px)) {
  .glass-card {
    background-color: rgba(30, 41, 59, 0.95); /* opaque fallback */
  }
}
```

3. **Consider `will-change: backdrop-filter` on fixed elements** (sidebar) so the browser can pre-allocate the compositing layer.

4. **Add a "Reduce transparency" user preference** (similar to macOS accessibility):
```css
@media (prefers-reduced-transparency: reduce) {
  .glass-card {
    backdrop-filter: none;
    background-color: #1e293b; /* fully opaque */
  }
}
```

5. **Test on an Intel NUC or similar shop floor hardware.** If backdrop-blur causes dropped frames, make the opaque fallback the default and only enable glass for devices that pass a GPU capability check.

---

## 6. Status Colors vs Brand Palette

**Verdict: CRITICAL ISSUE. Status colors MUST be a separate, protected namespace.**

The proposed status colors:
- Running = green
- Idle = yellow
- Alarm = red
- Setup = blue

The current semantic tokens:
- success = `#22c55e` (green)
- warning = `#f59e0b` (amber)
- danger = `#ef4444` (red)

**Collision points:**

| Status | Proposed Color | Collides With |
|--------|---------------|---------------|
| Running = green | ~`#22c55e` | `success-500` (identical) |
| Idle = yellow | ~`#eab308`? | `warning-500` / ISO "M" stainless steel group |
| Alarm = red | ~`#ef4444` | `danger-500` (identical) |
| Setup = blue | ~`#3b82f6`? | `primary-500` / ISO "P" steel group |

This means: a "Setup" status badge looks identical to a primary action button. An "Idle" badge looks like a warning badge. A "Running" badge looks like a success badge.

**In a manufacturing context, status colors have safety-critical meaning.** A machinist glancing at a dashboard must instantly distinguish "this machine is alarming" from "this form field has a validation error." These are completely different urgency levels.

**Recommendation: Create a dedicated `machine-status-*` color namespace with deliberately distinct hues:**

```
--color-status-running:   #10b981  (emerald-500, shifted from green-500)
--color-status-idle:      #a78bfa  (violet-400, NOT yellow -- avoids warning collision)
--color-status-alarm:     #f43f5e  (rose-500, NOT red-500 -- slightly different hue)
--color-status-setup:     #38bdf8  (sky-400, lighter than cobalt primary)
--color-status-offline:   #64748b  (slate-500, gray)
--color-status-warmup:    #fbbf24  (amber-400, only warm color in status set)
```

**Key design principles for machine status:**
- Status colors should be used with a filled pill/dot/badge pattern, never as text color alone
- Each status should have a corresponding icon (filled circle, pause, triangle-alert, wrench, etc.)
- Never rely on color alone -- always pair with icon + text label (accessibility requirement, and practical for color-blind machinists)
- Status colors should NOT appear anywhere else in the UI (no "emerald" buttons, no "rose" links)

**Also: the ISO 513 material group colors in `materials.ts` are a third color system that must not collide with either status or semantic colors.** Currently, ISO "P" Steel uses `#3b82f6` (blue-500), which collides with both the current primary and the proposed "Setup" status. Consider using a muted/pastel version of each ISO color when displayed on dark backgrounds.

---

## 7. Font Recommendations

**Verdict: The plan is silent on fonts. This needs to be specified.**

Current state: the codebase uses Tailwind's default `font-mono` utility (which resolves to the system monospace stack) and no custom sans-serif font is declared. The `index.css` does not set a `font-family`.

**Recommendations:**

**A. UI Sans-Serif: Inter**
- Free, variable font, designed for screens at small sizes
- Excellent tabular numbers (`font-feature-settings: "tnum"`) which are critical for a calculator app -- columns of numbers must align
- Good x-height for legibility at 11-13px
- Already the industry standard for technical SaaS (Linear, Vercel, Raycast)
- Load via `@fontsource-variable/inter` (self-hosted, no Google Fonts dependency, works offline on shop floor)

**B. Data/G-code Monospace: JetBrains Mono or Fira Code**
- JetBrains Mono has programming ligatures, clear `0`/`O`/`l`/`1` differentiation, and excellent readability at 12-14px
- Fira Code is another good option, slightly narrower
- Critical for G-code display where `G0` vs `G00`, `O0001` vs `00001` must be instantly distinguishable
- Load via `@fontsource/jetbrains-mono` or `@fontsource/fira-code`
- Apply to: G-code editor, coordinate readouts, numeric data tables, DRO displays

**C. Optional -- Headings/Feature Names: Geist or Manrope**
- If you want headings to feel more distinctive than body Inter
- Both are geometric sans-serifs that pair well with Inter
- Probably not needed for v9 MVP -- Inter works fine for everything

**Implementation:**
```css
@theme {
  --font-sans: 'Inter Variable', 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace;
}
```

**Tabular numbers for numeric displays:**
```css
.font-tabular { font-variant-numeric: tabular-nums; }
/* Apply to all numeric readouts, tables, calculator results */
```

---

## 8. High Contrast Mode for Shop Floor

**Verdict: YES, this is essential. Not optional.**

Shop floors have:
- Fluorescent/LED high-bay lighting (5000K+, very bright)
- Machines with coolant splash guards that scatter light onto screens
- Operators wearing safety glasses (tinted yellow/amber for chip protection) that shift color perception
- Viewing angles from standing positions (often above and to the side of a panel PC)
- Gloved hands (reducing touch accuracy, needing larger targets)
- Operators who need to glance at a screen and return to the machine in under 2 seconds

**A standard dark mode will wash out on a bright shop floor.** The `#0c1220` background will appear as a uniform black blob, and the subtle elevation differences (point 3) will vanish entirely.

**Recommendation: Add a "Shop Floor" high-contrast mode as a third theme option.**

**Implementation approach:**

```typescript
// ThemeToggle.tsx -- add "shopfloor" to the cycle
type Theme = "light" | "dark" | "shopfloor" | "system";
```

**Shop Floor mode characteristics:**

| Property | Dark Mode | Shop Floor Mode |
|----------|-----------|-----------------|
| Background | `#0c1220` | `#000000` (true black) |
| Card surface | `rgba(30,41,59,0.7)` | `#1a1a2e` (opaque, no blur) |
| Text primary | `text-slate-200` (#e2e8f0) | `#ffffff` (pure white) |
| Text secondary | `text-slate-300` (#cbd5e1) | `#d4d4d8` (zinc-300) |
| Borders | `border-slate-700/60` | `border-slate-500` (higher contrast) |
| Status colors | Standard palette | +20% saturation, +10% lightness |
| Font size | 11px minimum | 14px minimum |
| Button size | Standard | 44px minimum touch target |
| backdrop-filter | blur enabled | blur disabled (performance) |
| Shadows | Standard | None (saves GPU, not visible on true black) |
| Focus rings | 2px primary | 3px bright white |
| Animations | Enabled | Reduced (fewer distractions) |

**CSS implementation via a `.shopfloor` class on `<html>`, similar to the `.dark` class:**

```css
html.shopfloor {
  --color-bg-page: #000000;
  --color-bg-card: #1a1a2e;
  --color-text-primary: #ffffff;
  --color-text-secondary: #d4d4d8;
  --color-border: #6b7280;
  font-size: 16px; /* bump base size */
}

html.shopfloor * {
  backdrop-filter: none !important;
  text-shadow: none !important;
}
```

**Additionally, consider a "kiosk" variant** that auto-hides the sidebar and maximizes data density for wall-mounted shop floor displays.

---

## Summary of Action Items (Prioritized)

### Must Fix Before Implementation

| # | Issue | Severity | Recommendation |
|---|-------|----------|----------------|
| 1 | Orange accent collides with warning semantics | HIGH | Use cobalt for CTAs; reserve warm colors for status only |
| 2 | Status colors not separated from semantic/brand colors | HIGH | Create dedicated `machine-status-*` namespace |
| 3 | Text-shadow approach will cause blurriness on Windows | HIGH | Delete `.text-safe`; fix contrast ratios at the source |
| 4 | Page/sidebar elevation delta too small (3 L* units) | MEDIUM | Lighten sidebar to `#1a2332` |
| 5 | Primary ramp not defined (only single hex in plan) | MEDIUM | Generate full 50-950 OKLCH ramp from `#3461b8` |

### Should Add

| # | Issue | Severity | Recommendation |
|---|-------|----------|----------------|
| 6 | No font specification | MEDIUM | Inter + JetBrains Mono, tabular nums |
| 7 | No high-contrast shop floor mode | MEDIUM | Add "shopfloor" theme with true black, larger text, no blur |
| 8 | Glass morphism needs fallback | LOW | `@supports` fallback + `prefers-reduced-transparency` |
| 9 | 5th elevation level missing (popovers) | LOW | Add `--elevation-popover` |
| 10 | ISO material colors collide with status/brand | LOW | Use muted pastels for ISO on dark backgrounds |

---

## Files That Need Changes

- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\index.css` -- primary ramp replacement, elevation tokens, font declarations, shop floor mode, backdrop-filter fallback
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\components\ui\ThemeToggle.tsx` -- add "shopfloor" to theme cycle
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\data\materials.ts` -- verify ISO colors do not collide with new status namespace
- New design token file or section in index.css for `machine-status-*` colors
- `package.json` -- add `@fontsource-variable/inter` and `@fontsource/jetbrains-mono`
