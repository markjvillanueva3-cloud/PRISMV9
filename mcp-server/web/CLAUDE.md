# PRISM Web Frontend — Development Rules

> ## ⚑ FLEET DESIGN LANGUAGE = iOS (2026-06-09 — supersedes the "Calculator Studio" DEFAULT below)
> **Operator decision 2026-06-09.** The fleet shell moves to an **Apple-iOS feel**.
> Authoritative doctrine + token foundation: **`DESIGN.md` §⚑ FLEET DESIGN LANGUAGE = iOS**
> and `state/shared/specs/FLEET-IOS-REDESIGN-DOCTRINE-2026-06-09.md`. Driver slot:hotel;
> frontend owner **quebec** (coordinated via `state/shared/AGENT_CHAT.md`).
>
> **What this changes in the rules below (R7 — superseded, not blended):**
> - **"Never bouncy spring physics"** → use a *critically-damped* framer-motion spring
>   (`whileTap` scale `var(--press-scale)`, stiffness 500 / damping 34 — settle, NO
>   overshoot/bounce). The ban was against *bouncy* springs; a damped press is iOS-correct.
> - **"Calculator Studio = the committed direction" / "All pages MUST follow Calculator
>   Studio"** → iOS is the fleet default; Calculator Studio is retained as a **scoped
>   per-page accent** (e.g. speed/feed), not the fleet identity.
> - **Glow shadow as the baseline** → soft directionless `shadow-ios-1/2` is the default;
>   the glow (`shadow-ios-accent`) is opt-in.
>
> **What is UNCHANGED (still authoritative below):** dark canonical · the 5-color status
> spectrum · the WCAG-AA a11y floor + visible focus rings · 44pt tap targets · the whole
> **Mobile (iOS + Android)** section (Capacitor 6 wrapper, safe-area, thumb-zone, inputMode) ·
> the token-source-of-truth rule (`src/index.css` → `DESIGN.md`, never inline hex/px) ·
> Codex Page Protection. Reference a token; the new `:root` vars are the foundation.

## Codex Page Protection (CRITICAL)
**DO NOT build over Codex frontend builds/web pages.**

Before creating ANY new page:
1. Check `web/src/pages/` for existing pages with similar functionality
2. If found → analyze and improve the existing page
3. Only create new pages for genuinely new functionality

## Aesthetic Direction (G2 fix per claude-cli-app-design-capabilities-2026-05-21)
**Three Anthropic-recommended strategies. Apply ALL THREE in every new page.**

### Strategy 1 — Guide typography / color / motion / backgrounds INDIVIDUALLY
- **Typography:** monospace (`ui-monospace`, `JetBrains Mono`) for any numeric / G-code / data value; system-ui for chrome. **Never Inter, never Roboto** (AI-slop defaults).
- **Color:** PRISM dark base (`#0f1014` / `#1a1c23` / `#232631`) + the 5-color status palette (cyan / violet / emerald / amber / red). **Never purple-on-white gradients.** **Never neon green default Bootstrap.**
- **Motion:** subtle, industrial — `transition: 0.18s ease` on hover, `0.07-0.18s` on state change. **Never bouncy spring physics.** **Never confetti / micro-celebration animations.**
- **Backgrounds:** flat panels with `border: 1px solid var(--border)` + 6px radius. **Never glassmorphism / frosted blur.** **Never gradient backgrounds inside content panels.**

### Strategy 2 — Reference concrete design inspirations
- **Bloomberg Terminal** — information density without noise; consistent left-of-decimal alignment; numeric-table primacy
- **Linear app** — keyboard-driven; instant; no spinners over 200ms (otherwise it's a real load — show the actual state)
- **Vercel dashboard** — dark panels + crisp typography + spectrum status badges
- **HUD industrial control panel** — the Calculator Studio's `.prism-glow-*` + `.prism-spectrum-fill` + `.prism-led-sweep` aesthetic embodies this

### Strategy 3 — Explicitly name the defaults to AVOID
- ✗ Inter / Roboto as primary font
- ✗ Purple-on-white SaaS gradient
- ✗ Identical-card grids with no information hierarchy
- ✗ Hardcoded hex / px values inline — **always reference `DESIGN.md` tokens or `index.css` CSS variables**
- ✗ `text-gray-500` as the "safe choice" — use the semantic `--fg-dim` variable
- ✗ Glassmorphism / frosted backdrop blur
- ✗ Sentence-case button labels for primary actions — use Title Case on CTAs
- ✗ Centered Hero sections with giant headline + small body — this is consumer marketing, PRISM is industrial tooling

### Tokens — single source of truth
- Values: `mcp-server/web/src/index.css` (CSS variables — production source)
- Reference doc: `mcp-server/web/DESIGN.md` (token catalog — read before any new page)
- **Inlining a hex code or px value when a token exists is a design-language violation** and will fail Codex CLI review (per `state/shared/specs/FRONTEND-MERGE-AUDIT-AND-PLAN-2026-05-25.md` §6).

## Mobile (iOS + Android) — applies to every page, not retrofitted later
Per operator directive 2026-05-25 + FRONTEND-MERGE-AUDIT-AND-PLAN §Phase E. The phone app ships as a **Capacitor 6 wrapper** around this exact React+Vite bundle — there is no second mobile codebase. That means **every page you build is already a mobile page**; "I'll make it responsive later" is the bug, not the deferred work.

### Required from line 1 of any new/edited page
- **Tap targets ≥ 44pt (iOS HIG) / 48dp (Android Material 3).** Use `h-11` (44px) for any tappable element on mobile; `md:h-9` desktop downgrade is fine. **Never** ship a button that's smaller than your thumb pad.
- **Safe-area insets.** Wrap full-bleed pages in the shared `<MobileSafeArea>` (handles `env(safe-area-inset-top/bottom/left/right)`). iOS notch + Dynamic Island + Android gesture nav all live in one component — never inline these env vars per-page.
- **Responsive at 5 viewports.** Verify at 375×667 (iPhone SE — smallest), 390×844 (iPhone 14 — modal), 412×915 (Pixel 7 — Android modal), 768×1024 (iPad), 1024×1366 (iPad Pro). Tables ≥ 4 columns must collapse to card lists at <600px via the existing `<ResponsiveTable>` pattern, not `overflow-x: scroll` (which is unusable on small screens).
- **Thumb-zone-aware layout.** Primary CTAs go in the bottom-center 25% of the viewport on mobile, NOT pinned top-right (operator can't reach top-right one-handed on a 6.1" phone). Top bar = navigation + identity only; never put a destructive action there.
- **System dark mode tracking.** Dark stays canonical (`feedback_frontend_codex`); light mode is graceful-degrade via `[data-theme='light']` only. Capacitor's `StatusBar` plugin syncs system tint — never hard-code status bar color.
- **Native gesture handling.** Back-swipe (iOS) + system back button (Android) wire to `navigate(-1)`. Long-press = context menu (mirrors desktop right-click). Pull-to-refresh on any list/data page via `@capacitor/pull-to-refresh`. Don't reinvent these — the existing hooks already wrap them.

### Mobile-specific aesthetic guardrails (additions to Strategy 3 — explicit defaults to AVOID)
- ✗ **Hamburger menus as primary navigation.** Anthropic + Apple HIG both deprecate this — use bottom tab bar (iOS) / navigation rail (Android tablet). Hamburger is acceptable only as secondary "more" drawer.
- ✗ **iOS-style modals on Android (or vice versa).** Use `@capacitor/dialog` which renders system-native — don't ship a custom modal that looks iOS on both.
- ✗ **Custom keyboards / number pads.** Use `<input inputMode="decimal">` and `<input inputMode="numeric">` so the OS shows the right keyboard. PRISM is numeric-forward — this is the lowest-effort highest-impact mobile UX win.
- ✗ **Tap-to-zoom hacks (`<meta name="viewport" content="user-scalable=no">`).** Accessibility regression. Ship at correct base font size (16px minimum on form inputs to prevent iOS zoom-on-focus) and let the user pinch.
- ✗ **Hover-only affordances.** Anything that only appears on `:hover` is invisible on touch. Use long-press or always-visible icon chips instead.
- ✗ **Fixed-pixel widths anywhere.** `min-w-[280px]` is fine; `w-[1200px]` breaks at 375px. The Calculator Page monolith (660KB) is the canonical violation — every refactored split must drop fixed widths.
- ✗ **Toast notifications top-center.** Notch + Dynamic Island collide. Bottom-center, above the safe-area inset.

### Mobile typography exception to Strategy 1
Strategy 1 mandates `ui-monospace` for numerics and system-ui for chrome. **On mobile**, the system-ui fallback explicitly resolves to **SF Pro (iOS) / Roboto (Android)** — these are the platform fonts, not the banned web defaults. So `font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto` is correct and required; the ban on Inter/Roboto is specifically about *web-imported* Inter/Roboto fonts, not the platform-supplied versions. Numerics remain `ui-monospace, "JetBrains Mono", "SF Mono", Consolas, monospace` — same on every surface.

### Mobile reference inspirations (concrete, not adjectives)
- **Stripe Dashboard mobile** — numeric-forward, dense tables that collapse cleanly to cards, no decorative chrome
- **GitHub Mobile** — bottom tab nav done right, gesture-driven, native chrome where it matters
- **Wise (TransferWise)** — bottom-sheet primary actions, instant tap response, no loading shimmer for cached data
- **Linear mobile** — keyboard-driven on mobile via custom command palette, same as desktop philosophy
- **NOT** consumer SaaS mobile (Notion, Asana) — too much chrome, too many bouncy animations, doesn't scale to industrial use

### Verify mobile, every change
The desktop visual-verify loop (edit → `/run` → Playwright screenshot → compare) extends to mobile by adding `devices['iPhone 14']` + `devices['Pixel 7']` Playwright projects. Three screenshots per page change (desktop + iOS + Android) is the minimum verification surface. Claude is visually blind without all three.

## Design Language: Calculator Studio
All pages MUST follow the Calculator Studio (CalculatorPage.tsx) design concept:

### Theme
- PRISM dark theme with glow borders
- LED sweep spectrum effects
- Consistent color palette

### CSS Classes
```css
/* Glow effects */
.prism-glow-cyan, .prism-glow-violet, .prism-glow-emerald, .prism-glow-amber, .prism-glow-red

/* Components */
.prism-chip          /* Status badges */
.prism-spectrum-fill /* Progress bars */
.prism-led-sweep     /* Animated effects */

/* Backgrounds */
bg-[rgba(2,6,23,0.78)]

/* Borders */
border-white/10
rgba(148,163,184,0.08)
```

### Status Color Mapping
- Cyan: ordered, shipped, info
- Violet: scheduled, pending
- Emerald: in_progress, complete, success
- Amber: on_hold, qc_pending, warning
- Red: qc_failed, error

## Page Structure
- Tab-based layouts for multi-feature pages
- Status chips with color coding
- Progress bars with spectrum fill
- Consistent card components

## API Integration
- API clients in `web/src/api/`
- Types in `web/src/types/`
- Hooks in `web/src/hooks/`
- Routes wired in `App.tsx`

## Existing Pages (102 total)
Check these before creating new pages:
- CalculatorPage.tsx (12,909 LOC) — main speed/feed calculator
- ShopFloorLivePage.tsx — job/labor tracking
- LatheWizardPage.tsx, WireEdmWizardPage.tsx — wizard flows
- See full list with `ls web/src/pages/`

## Design Tokens (READ FIRST for any UI work)
`web/DESIGN.md` is the canonical token index — colors, status spectrum,
surfaces, components, density. **Reference a token name; never inline a raw
hex/rgba or px value that has a token there.** Value source of truth stays
`src/index.css`; DESIGN.md is the human/AI-readable map.

## Aesthetic Direction (avoid AI slop)
Claude defaults to the statistical center of its training data — generic,
forgettable UI ("distributive convergence"). Counter it with explicit
direction:
- **Committed direction:** Calculator Studio = *industrial dark HUD* —
  near-black layered backgrounds, ONE dominant accent per surface with sharp
  glow, dense data tables, numeric-forward. NOT a soft pastel SaaS dashboard.
- **Guide each dimension deliberately:** typography (distinctive, not the
  Inter/Roboto default), color (dominant accent + sharp glow, not timid
  evenly-distributed palettes), backgrounds (layered gradients/atmosphere,
  not flat fills), motion (purposeful, `prefers-reduced-motion` honored).
- **Banned defaults:** Inter/Roboto/Arial/system-font as the headline face,
  purple-gradient-on-white, cookie-cutter card grids with no point of view.
- **Verify visually, every change:** edit → `/run` or Playwright MCP
  screenshot → compare to intent → list concrete gaps → iterate. Claude is
  visually blind without the screenshot loop.

Full research + improvement plan:
`knowledge/wiki/architecture/specs/claude-cli-app-design-capabilities-2026-05-21.md`
