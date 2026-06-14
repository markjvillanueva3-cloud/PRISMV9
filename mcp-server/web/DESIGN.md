# PRISM Web — Design Tokens & System

> **Why this file exists.** Claude Code generates hardcoded `#hex` / `16px`
> values when a project's design system isn't written down — both the
> Anthropic frontend-aesthetics cookbook and the Playwright-MCP design-loop
> guidance flag an explicit token doc as the #1 lever for design-quality
> output. This file is that doc: the canonical, portable token reference for
> the PRISM dashboard. Source of truth for VALUES is `src/index.css`; this
> file is the human/AI-readable index. Created 2026-05-21 (SF-STUDIO-UX).
>
> **Rule for all UI work:** reference a token name from this file. Never
> inline a raw hex/rgba or px value that has a token here.

---

## ⚑ FLEET DESIGN LANGUAGE = iOS (2026-06-09, supersedes "Calculator Studio" as the DEFAULT)

**Operator decision 2026-06-09.** The fleet shell moves to an **Apple-iOS feel**:
professional, calm, tactile. Full doctrine + rollout:
`state/shared/specs/FLEET-IOS-REDESIGN-DOCTRINE-2026-06-09.md`. Driver: slot:hotel
(foundation + the 22 ERP pages); frontend owner **quebec** drives the remaining
~89 pages onto this foundation (coordinated via `state/shared/AGENT_CHAT.md`).

**KEEP (these were right):** dark canonical · the 5-color status spectrum (below) ·
density/zoom · the WCAG-AA a11y floor · the page-protection rule. **CHANGE toward
iOS:** SF typography with negative title tracking · critically-damped press springs
(settle, NO overshoot — this *reconciles* the old "no bouncy springs" ban, it does
not revert it) · soft directionless shadows as the default (the glow becomes an
opt-in accent) · segmented controls · 44pt tap targets · visible focus rings. The
"Calculator Studio" industrial-HUD identity is **retained as a scoped per-page
accent** (e.g. the speed/feed calculator), no longer the fleet default — its section
below is preserved for that scoped use.

### Token foundation — the `:root` CSS-var layer (NEW, the keystone)

Defined in `src/index.css :root` (top of file). Primitives read these instead of
hardcoded values, so a per-user theme override is one
`documentElement.style.setProperty()` call (no rebuild). Tailwind utilities point
AT the vars (single source of truth).

| Token (`var(--…)`)   | Default                                 | Tailwind utility            | Use |
|----------------------|-----------------------------------------|-----------------------------|-----|
| `--font-sans`        | `-apple-system, BlinkMacSystemFont, "SF Pro Text"…` | `font-sans` (+ html default) | all chrome/body text |
| `--font-mono`        | `ui-monospace, "SF Mono", "JetBrains Mono"…`        | `font-mono`                 | numerics / G-code (column-aligned) |
| `--tracking-title`   | `-0.02em`                               | (apply inline on large titles) | iOS large-title negative tracking |
| `--accent-rgb`       | `34 211 238` (cyan-400)                 | `rgb(var(--accent-rgb)/α)`  | user-overridable accent (U3) |
| `--radius-{sm,md,lg,xl}` | `12 / 18 / 24 / 32 px`              | `rounded-ios-{sm,md,lg,xl}` | card / control corner radius |
| `--density`          | `1` (0.9 compact · 1.1 spacious)        | (multiplier in U2 sizing)   | per-user control density (U3) |
| `--shadow-{1,2}`     | soft directionless                      | `shadow-ios-{1,2}`          | card elevation (DEFAULT) |
| `--shadow-accent`    | `0 0 24px rgb(var(--accent-rgb)/.14)`   | `shadow-ios-accent`         | opt-in glow accent only |
| `--focus-ring`       | offset double-ring                      | (applied in primitives)     | a11y focus-visible |
| `--tap-min`          | `44px`                                  | `min-h-11` (=44px; a bare `var()` arbitrary does not JIT) | iOS HIG min tap target (fixed a11y floor, not user-customizable) |
| `--ease-ios` / `--press-scale` | `cubic-bezier(.32,.72,0,1)` / `0.96` | (framer-motion `whileTap`) | critically-damped press |

**Rollout (R13 logical order, foundation before pages):** U1 this token layer +
SF font + this doctrine **(done)** → U2 WorkspacePrimitives upgrades (focus rings,
ghost-tone fix, 44pt, segmented tabs, ResultCard) → U3 `useThemeTokens` +
`useHaptics` + layout customization → U4 ErpDashboard outlier → U5 hotel's 22 ERP
pages → U6 quebec fleet rollout → U7 Capacitor shell (real haptics).

---

## Design Language: "Calculator Studio" (SCOPED per-page accent — see supersession above)

Every page follows the `CalculatorPage.tsx` design concept — PRISM dark
theme, glow borders, LED-sweep spectrum effects. New pages improve an
existing page before adding a new one (see `web/CLAUDE.md` §Codex Page
Protection).

Aesthetic direction (pick this, do not drift to generic): **industrial dark
HUD** — near-black layered backgrounds, a single dominant accent per surface
with sharp glow, monospace-adjacent numerics, dense data tables. NOT a soft
SaaS pastel dashboard.

## Color — Status Spectrum

Five semantic accents. Each maps to lifecycle states AND has a `.prism-glow-*`
card treatment in `index.css`.

| Token        | Core rgba           | Status meaning                          | Glow class          |
|--------------|---------------------|-----------------------------------------|---------------------|
| `cyan`       | `34,211,238`        | ordered · shipped · info                | `.prism-glow-cyan`    |
| `violet`     | `167,139,250`       | scheduled · pending                     | `.prism-glow-violet`  |
| `emerald`    | `16,185,129`        | in_progress · complete · success        | `.prism-glow-emerald` |
| `amber`      | `251,191,36`        | on_hold · qc_pending · warning          | `.prism-glow-amber`   |
| `red`        | `239,68,68`         | qc_failed · error                       | `.prism-glow-red`     |

Glow-card recipe (per accent): `border-color: rgba(<core>,.18)` →
`.35` on hover; `background: linear-gradient(180deg, rgba(<core>,.10) 0%,
<near-black> 100%)`; `box-shadow: 0 0 24px rgba(<core>,.08)` → `0 0 30px …14`
on hover. Use the `.prism-glow-<accent>` class — do not re-derive.

## Color — Surfaces

| Token            | Value                      | Use                              |
|------------------|----------------------------|----------------------------------|
| `bg.app`         | `linear-gradient(180deg,#0a1520,#0f1c28)` | app background        |
| `bg.card`        | `rgba(2,6,23,0.78)`        | standard card / panel            |
| `text.primary`   | `#e2e8f0`                  | body text                        |
| `border.subtle`  | `rgba(255,255,255,0.10)`   | default card border              |
| `border.faint`   | `rgba(148,163,184,0.08)`   | inner dividers                   |

## Spectrum Fill (progress bars)

`.prism-spectrum-fill` — the canonical multi-stop progress gradient:
`#ef4444 0% → #f97316 18% → #f59e0b 36% → #facc15 56% → #84cc16 78% →
#22c55e 100%`. Use for any 0-100 progress/score bar. Never hand-roll.

## Components

| Class                  | What                                                      |
|------------------------|-----------------------------------------------------------|
| `.prism-chip`          | status badge — pill, `.625rem`, weight 800, `.16em` tracking, uppercase |
| `.prism-spectrum-fill` | progress-bar fill (gradient above)                        |
| `.prism-led-sweep`     | animated LED sweep accent                                 |
| `.prism-glow-<accent>` | glow card per status accent (table above)                 |

Primitives: Radix UI (`@radix-ui/react-*` — accordion, dialog, dropdown,
popover, select, switch, tabs, tooltip) + Tailwind. **Use the installed
Radix primitive before hand-rolling** an overlay/menu/tabs component.

## Density / Zoom

| Token                  | Value     | Scope                                          |
|------------------------|-----------|------------------------------------------------|
| `--prism-app-zoom`     | `0.9`     | global, ≥1024px viewports (`index.css`)         |
| compact density        | `~0.85`   | `body[data-sf-density="compact"]` — dense SF studio routes only (`/speed-feed`, `/speed-feed-calc`); set via `useEffect` on mount |

Dense multi-field forms (≥30 inputs) should opt into compact density. Light
pages keep the `0.9` default.

## Accessibility floor (WCAG 2.2 AA)

- Text contrast ≥ 4.5:1 (≥ 3:1 for ≥18px). The dark theme's `#e2e8f0` on
  `rgba(2,6,23,.78)` passes; verify any new accent-on-dark pairing.
- Every interactive control: visible focus ring + keyboard reachable.
- Icon-only buttons need `aria-label`.
- Toggle/mode buttons (process tabs, unit toggles, workflow modes) MUST
  expose `aria-pressed` — audited 2026-05-21, several SF-studio mode
  buttons were missing it.
- Touch targets ≥ 44px on mobile.

## Verification loop (do this for every UI change)

1. Edit component.
2. `/run` or Playwright MCP → screenshot the rendered route.
3. Compare to intent; list concrete visual gaps.
4. Iterate until the screenshot matches.
5. For mode/toggle buttons, assert `aria-pressed` reflects state.

See `knowledge/wiki/architecture/specs/claude-cli-app-design-capabilities-2026-05-21.md`
for the full design-workflow research + improvement plan.
