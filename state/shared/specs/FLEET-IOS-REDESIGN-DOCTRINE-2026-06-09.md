# FLEET iOS REDESIGN -- Doctrine + Foundation + Rollout (2026-06-09)

**Operator decision (2026-06-09):** fleet-wide iOS redesign (supersede the "Calculator Studio
industrial-HUD" doctrine) + ship web-doable customization now with a Capacitor-ready haptics hook.
Driver: slot:hotel (foundation + hotel's 22 ERP pages). Frontend owner: **quebec** -- this doc
SUPERSEDES quebec's canonical `mcp-server/web/DESIGN.md` + `web/CLAUDE.md`; quebec drives the
remaining ~89 non-hotel pages onto this foundation. Posted to AGENT_CHAT for quebec review.

Grounded by the 3-reader inventory (design-system / hotel-surfaces / iOS-feasibility), 2026-06-09.

---

## 1. What is already installed (BUILD ON, do not fork)
- **`web/src/components/workspace/WorkspacePrimitives.tsx`** -- the de-facto primitive set (111 pages
  import it): WorkspaceHero, SummaryTile, PanelCard, Field, Input, Select, TabButton, StatusPill,
  ActionButton. **Extend these in place; never fork a parallel kit.**
- **framer-motion ^12** (installed, used in only ~6 files, NO spring physics yet) -> iOS spring-press.
- **react-grid-layout ^2.2.3 + @dnd-kit/{core,sortable,utilities}** (installed, UNUSED) -> layout customization.
- **Radix UI** (8 headless primitives incl. react-tabs) -> segmented controls without a new dep.
- Tailwind + `web/src/index.css` (class-based tokens; NO `:root` CSS-var layer yet) + `DESIGN.md`.

## 2. The new design language (supersedes the anti-iOS bans; KEEP what works)
KEEP: dark canonical, the 5-color status spectrum, density/zoom, the a11y floor, the page-protection rule.
CHANGE toward iOS:
- **Typography:** add the SF stack `-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui` on `html`
  (currently NONE is set). Large titles `weight 700, letter-spacing -0.02em` (negative tracking = the
  single most iOS-recognizable marker). Retire fleet-wide uppercase+0.18em tracking to Calculator-Studio-scoped only.
- **Motion:** framer-motion **critically-damped** spring on press (`whileTap scale 0.96, spring
  stiffness 500 damping 34` -- settle, NO overshoot/bounce -> reconciles the old "no bouncy springs"
  ban). Honor `prefers-reduced-motion`.
- **Shadows:** soft directionless (`0 2px 8px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)`) as DEFAULT;
  the glow shadow becomes an opt-in accent prop, not the baseline.
- **Radii:** already iOS-grade (`rounded-[18..32px]` in Layout) -- standardize via tokens.
- **Controls:** segmented control (Radix tabs reskin: filled-pill on a tinted track) replaces underline tabs.
- **Touch:** enforce 44pt min tap target (HIG) on all interactive primitives (current `Button size=sm` ~24px).

## 3. Token foundation (NEW -- the keystone; does not exist today)
Add a `:root` CSS-custom-property layer in `index.css`: `--accent`, `--radius-{sm,md,lg}`,
`--density`, `--shadow-{1,2}`, `--font-sans`. Primitives read the vars (not hardcoded rgba), so a
user theme override is a `documentElement.style.setProperty()` call. This is what makes per-user
button/look customization possible without a rebuild.

## 4. Primitive upgrades (fixes the 10 concrete "vibe-coded" gaps the readers found)
1. `ActionButton tone="ghost"` is a silent no-op (falls to cyan) -> implement ghost/outline; render the
   accepted-but-ignored `variant`/`size`.  2. **No focus-visible ring** (a11y + mobile failure) -> add
   `focus-visible:ring` to Input/Select/Button.  3. No hover transition on PanelCard/SummaryTile -> add.
4. Replace raw `<pre>{JSON.stringify}</pre>` result dumps (HRCompliance/GeneralLedger) with a real
   **ResultCard** primitive.  5. Shared **Stepper** primitive (PayrollPage inlines a lifecycle stepper).
6. `Select` custom chevron (`appearance-none` + SVG).  7. Migrate raw `<button>`s -> ActionButton
   (HRCompliance has 3 button styles).  8. SummaryTile priority/weight variants for hierarchy.
9. Segmented `TabButton`/`Tabs`.  10. Migrate the **ErpDashboard outlier** (light-mode, letter-icons
   `$`/`P`/`S`, `<a>` breaks SPA nav) onto WorkspacePrimitives + `<Link>`.

## 5. Customization + haptics (operator: "web-doable now, haptics-ready")
- **`useThemeTokens()`** -- writes `--accent`/`--radius`/`--density` to `:root`, persists to
  `localStorage` (`prism-theme-v1`) with optional server sync via a `prism_business` user-prefs action.
- **Dashboard layout** -- wire `react-grid-layout` (drag/resize widgets) persisted to `prism-layout-v1`;
  `@dnd-kit` for button/quick-action reordering.
- **`useHaptics()`** -- detects `window.Capacitor` -> `Haptics.impact()` on native; falls back to
  `navigator.vibrate(8)` on Android web; **no-op on iOS Safari** (REALITY: web cannot vibrate on iOS).
  Real device haptics arrive only with the Capacitor 6 shell (NOT installed today) -- the hook is wired
  now so the shell lights it up later. We do NOT fake haptics.

## 6. Unit-ordered rollout (R13 logical order -- foundation before pages)
- **U1 FOUNDATION** (hotel): `:root` token layer + SF font + this doctrine in `DESIGN.md`/`web/CLAUDE.md`.
- **U2 PRIMITIVES** (hotel): the §4 upgrades to WorkspacePrimitives/Button/Tabs + ResultCard + Stepper.
- **U3 CUSTOMIZATION+HAPTICS** (hotel): `useThemeTokens` + `useHaptics` + react-grid-layout scaffold.
- **U4 ErpDashboard migration** (hotel): the worst outlier onto the system.
- **U5 HOTEL PAGES** (hotel): polish the 22 ERP/business pages on the new foundation.
- **U6 FLEET ROLLOUT** (quebec): the remaining ~89 pages adopt the foundation + segmented controls.
- **U7 CAPACITOR SHELL** (quebec/infra): native wrapper -> real haptics, status-bar, safe-area.

Each unit: visual verify + the existing a11y floor + `prefers-reduced-motion` + per-file 2-arm scrutiny;
foundation/primitive units get the 3-of-3 gate (they affect every page).

## 7. R7 note
The old doctrine's anti-iOS bans (uppercase tracking, glow-default, "no springs") are SUPERSEDED for the
fleet shell but the *critically-damped* spring + dark-canonical + status-spectrum choices PRESERVE the
parts that were right. Calculator Studio's HUD identity may remain as a scoped per-page accent, not the
fleet default.
