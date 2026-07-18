# PRISM Visual Design Critique & Recommendations

## Senior Visual Designer Review — Dark-Mode Industrial Software Interface

---

## Code Review Summary

### Strengths
- Accessible foundations: `:focus-visible`, `prefers-reduced-motion`, skip-to-content link, ARIA roles
- Landing page hero gradient and glow-blob layering creates depth
- Feature cards use per-card accent colors well (blue, violet, cyan, emerald, amber, rose)
- Collapsible sidebar nav groups are practical for a 50+ item nav tree
- Clean component API separation (Button variants/sizes, Card with title slot)

### Critical Design Issues (16 findings)

---

## 1. COLOR PALETTE

### Problem: Identity-less blue defaults
The entire app leans on Tailwind's stock `blue-600` / `slate-*` palette. There is no brand color beyond "generic Tailwind blue." For a $199-$499/mo manufacturing tool, this reads as a free open-source dashboard template.

### Problem: The gray count is excessive
I count **7 distinct gray shades** in active use across the files reviewed: `slate-100`, `slate-200`, `slate-300`, `slate-400`, `slate-500`, `slate-700`, `slate-800`. These are used inconsistently -- sometimes `slate-400` is body text, sometimes it is a muted label, sometimes a border. There is no semantic mapping.

### Problem: No secondary accent
The only accent is blue. When everything that is "active" or "primary" is `blue-600`, the hierarchy collapses. There is no warm color for destructive actions (the `danger` variant exists but uses generic `red-600`), no distinct color for success states outside of the landing page `emerald-400` checkmarks.

### Recommendations

```css
/* index.css -- Replace generic blue with a branded palette */
@theme {
  /* Brand Primary: Industrial Cobalt (slightly warmer, more saturated than stock blue) */
  --color-primary-400: #5b8def;
  --color-primary-500: #4373d4;
  --color-primary-600: #3461b8;
  --color-primary-700: #284f9e;

  /* Brand Accent: Machine Orange (CNC status indicator color, universally recognized) */
  --color-accent-400: #fb923c;
  --color-accent-500: #f97316;
  --color-accent-600: #ea580c;

  /* Semantic Surface Tokens (dark mode) */
  --color-surface-base: #0c1220;        /* deepest background */
  --color-surface-raised: #141c2e;      /* card background */
  --color-surface-overlay: #1a2540;     /* modals, dropdowns */
  --color-border-subtle: #1e293b;       /* low-contrast dividers */
  --color-border-default: #334155;      /* visible borders */

  /* Text hierarchy */
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;
}
```

---

## 2. TYPOGRAPHY

### Problem: No typographic hierarchy tokens
Font sizes are scattered as inline Tailwind classes with no system. I see `text-[9px]`, `text-[10px]`, `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-2xl`, `text-3xl`, `text-4xl`, `text-5xl`, `text-6xl`, `text-7xl`. The sub-10px sizes (`text-[9px]` for group labels in MachineModeTabs) are below the WCAG minimum legible size and will be unreadable at 1080p on a shop floor monitor.

### Problem: No letter-spacing system
`tracking-wide`, `tracking-wider`, `tracking-widest`, `tracking-tight` are all used, but there is no consistent mapping. Section headings use `tracking-tight`, tiny labels use `tracking-wider` -- this is correct directionally but should be codified.

### Problem: Missing line-height control on dense UI
Cards use default line-heights. In the SFC calculator, dense panels of labels + inputs need tighter, controlled line heights (e.g., `leading-snug` or `leading-tight`) to feel like a professional instrument panel rather than a blog.

### Recommendations

```css
/* Type scale for industrial UI -- add to index.css */

/* Minimum text size: 11px. Never use text-[9px] or text-[10px]. */
/* Group labels in tabs: bump from 9px to 11px */

.label-overline {
  font-size: 0.6875rem;  /* 11px */
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1;
  color: var(--color-text-muted);
}

.label-caption {
  font-size: 0.75rem;    /* 12px */
  font-weight: 500;
  letter-spacing: 0.02em;
  line-height: 1.4;
  color: var(--color-text-secondary);
}

.type-data-value {
  font-size: 0.875rem;   /* 14px */
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  line-height: 1.2;
}
```

Specific fixes in MachineModeTabs.tsx:
- Line 53: Change `text-[9px]` to `text-[11px]` minimum
- Line 73: Change `text-[10px]` to `text-xs` (12px)

---

## 3. SPACING & RHYTHM

### Problem: Inconsistent gaps
The SfcCalculatorPage uses `gap-4` (16px) between columns and `space-y-4` (16px) within columns. But the MachineModeTabs use `gap-3` (12px), sub-operation pills use `gap-1.5` (6px), and the Card component uses `p-4` (16px). These small inconsistencies create visual noise.

### Problem: The header bar is thin
The top bar (`h-14` = 56px) is adequate but the sidebar also uses `h-14` for its logo area. For a premium feel, the sidebar logo area should be taller or have more breathing room.

### Recommendations
- Standardize on a 4px/8px/16px/24px/32px spacing scale
- Card internal padding: increase from `p-4` (16px) to `p-5` (20px) for breathing room
- Gap between cards in SFC page: keep `gap-4` but use `gap-6` (24px) between major sections
- MachineModeTabs container padding: increase from `p-1.5` to `p-2`

---

## 4. BUTTON DESIGN

### Problem: Buttons feel flat and dead
The current Button has: rounded corners, solid fill, hover color shift, and... nothing else. No shadows, no active/press state, no border treatment, no transition for transform. For a manufacturing tool where the "Calculate" button is the primary action, it should feel like pressing a physical button on a CNC control panel.

### Problem: Missing active/pressed state
There is no `active:` state whatsoever. When a user clicks "Calculate," there is zero tactile feedback.

### Problem: No shadow or depth
`shadow-sm` is not used on primary buttons. The button is a flat rectangle on a flat background.

### Recommendations

```tsx
// Button.tsx -- Enhanced variant styles

const variantStyles: Record<Variant, string> = {
  primary: [
    "bg-primary-600 text-white",
    "border border-primary-500/20",
    "shadow-md shadow-primary-900/40",
    "hover:bg-primary-500 hover:shadow-lg hover:shadow-primary-900/50",
    "hover:-translate-y-px",
    "active:translate-y-0 active:shadow-sm active:bg-primary-700",
    "focus-visible:ring-primary-400",
    "transition-all duration-150",
  ].join(" "),

  secondary: [
    "bg-slate-800 text-slate-200",
    "border border-slate-600/50",
    "shadow-sm",
    "hover:bg-slate-700 hover:border-slate-500/50 hover:text-white",
    "active:bg-slate-800 active:shadow-none",
    "transition-all duration-150",
  ].join(" "),

  ghost: [
    "text-slate-400",
    "hover:bg-slate-800/60 hover:text-slate-200",
    "active:bg-slate-800",
    "transition-colors duration-150",
  ].join(" "),

  danger: [
    "bg-red-600 text-white",
    "border border-red-500/20",
    "shadow-md shadow-red-900/40",
    "hover:bg-red-500 hover:shadow-lg",
    "active:bg-red-700 active:shadow-sm",
    "focus-visible:ring-red-400",
    "transition-all duration-150",
  ].join(" "),
};

// Size styles -- increase padding for better click targets
const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2.5 text-sm gap-2",
  lg: "px-6 py-3 text-base gap-2",
};
```

Key additions:
- `border` for subtle edge definition
- `shadow-md` for depth/floating feeling
- `hover:-translate-y-px` for a lift effect
- `active:translate-y-0 active:shadow-sm` for a press-down feeling
- `transition-all duration-150` so the transform animates

The "Calculate" button specifically (in SfcCalculatorPage) should be even more prominent:

```tsx
<Button
  onClick={handleCalculate}
  disabled={!material || !operation || calc.loading}
  className="w-full bg-gradient-to-b from-primary-500 to-primary-700
    shadow-lg shadow-primary-900/50 hover:from-primary-400 hover:to-primary-600
    active:from-primary-700 active:to-primary-800"
  size="lg"
>
```

---

## 5. CARD DESIGN

### Problem: Cards are visually indistinguishable from background
Current card: `bg-white dark:bg-slate-800` with `border-slate-200 dark:border-slate-700` and `shadow-sm`. In dark mode, `slate-800` on a `slate-900` background has a contrast ratio of roughly 1.1:1. The card barely separates from its container. The `shadow-sm` is invisible on dark backgrounds.

### Problem: No glass-morphism or layered depth
The cards look like colored rectangles with no atmospheric depth. For a premium tool, cards should either (a) have visible elevation via stronger shadows, or (b) use backdrop-blur glass-morphism to create layered transparency.

### Recommendations

```tsx
// Card.tsx -- Enhanced for dark-mode depth

export default function Card({ title, children, className = "", ...props }: CardProps) {
  return (
    <div
      className={[
        "rounded-xl",
        "border border-slate-700/60",
        "bg-slate-800/70 backdrop-blur-sm",
        "shadow-lg shadow-black/20",
        "p-5",
        className,
      ].join(" ")}
      {...props}
    >
      {title && (
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
```

Changes:
- `rounded-lg` to `rounded-xl` for softer, more premium corners
- `border-slate-700/60` (semitransparent) instead of opaque `border-slate-700`
- `bg-slate-800/70 backdrop-blur-sm` for glass-morphism
- `shadow-lg shadow-black/20` for actual visible elevation on dark backgrounds
- `p-5` (20px) up from `p-4` (16px)
- Card title: `text-sm font-semibold` changed to `text-xs uppercase tracking-wider` for a proper section label treatment

### Optional: Card hover state for interactive cards

```css
.card-interactive {
  transition: border-color 200ms, box-shadow 200ms, transform 200ms;
}
.card-interactive:hover {
  border-color: rgba(100, 116, 139, 0.5);  /* slate-500/50 */
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  transform: translateY(-1px);
}
```

---

## 6. DARK MODE DEPTH & ELEVATION

### Problem: The dark mode is completely flat
The entire app reads as one continuous dark plane. There is no sense of z-axis. Professional dark UIs (Figma, Linear, Vercel dashboard, Stripe dashboard) achieve depth through:
1. Progressively lighter surfaces as they stack
2. Visible shadows (even on dark backgrounds, using pure black at low opacity)
3. Subtle border-light effects (1px borders that are slightly lighter than the fill)
4. Inner glow or top-edge highlights

### The sidebar is a flat slab
`bg-sidebar` (#1e293b) blends with the dark content area. There is no divider shadow or edge treatment.

### Recommendations

```css
/* Elevation system for dark mode -- add to index.css */

/* Level 0: Page background */
.elevation-0 { background: #0c1220; }

/* Level 1: Sidebar, main content well */
.elevation-1 {
  background: #111827;
  box-shadow: 0 1px 0 0 rgba(255,255,255,0.03) inset; /* subtle top highlight */
}

/* Level 2: Cards, panels */
.elevation-2 {
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(8px);
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.05),  /* border-light */
    0 4px 12px rgba(0,0,0,0.3);         /* drop shadow */
}

/* Level 3: Dropdowns, tooltips, modals */
.elevation-3 {
  background: rgba(30, 41, 59, 0.95);
  backdrop-filter: blur(12px);
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.08),
    0 8px 32px rgba(0,0,0,0.5);
}
```

For the sidebar specifically:

```tsx
/* AppShell.tsx sidebar */
<aside className="hidden w-56 flex-shrink-0 flex-col bg-[#0f172a] text-white md:flex
  border-r border-slate-800/60 shadow-xl shadow-black/30"
>
```

The right edge needs a visible `border-r` and a `shadow-xl` that bleeds rightward to create the sense that the sidebar is elevated above the content.

---

## 7. ICONS: EMOJI vs. PROPER ICON SET

### Problem: Emojis for machine modes
The machine mode tabs use Unicode emoji: factory (U+1F3ED), wrench (U+1F529), fire (U+1F525), water droplet (U+1F4A7), etc. This is fundamentally incompatible with a professional manufacturing interface:
1. Emojis render differently across OS/browser (Windows vs macOS vs Linux)
2. Emojis have clashing visual styles (some are 3D-rendered, some flat)
3. Emojis cannot be color-controlled (they ignore CSS `color`)
4. Emojis look casual and consumer-grade

### Problem: Hand-drawn SVG icons in AppShell
The sidebar has 16 hand-drawn SVG icon components. These are functional but create maintenance burden and cannot be tree-shaken or swapped.

### Recommendation: Adopt Lucide React

Lucide is the best fit for this project:
- 1500+ icons, MIT licensed
- Every icon is 24x24 consistent stroke weight
- Tree-shakeable (only imports what you use)
- Accepts `className`, `size`, `strokeWidth` props
- Has industry-relevant icons: `Factory`, `Wrench`, `Drill`, `Gauge`, `Flame`, `Droplets`, `Zap`, `CircleDot`, `Cable`, `Scissors`

```bash
npm install lucide-react
```

```tsx
// machineModes.ts -- Replace emoji strings with icon component names
// Then in MachineModeTabs.tsx:
import { Factory, Wrench, Drill, CircleDot, Disc, Gem, Cable, Scissors, Zap, Flame, Droplets, Crosshair, Target } from "lucide-react";

const MODE_ICONS: Record<MachineMode, React.ComponentType<{ className?: string }>> = {
  mill: Factory,
  lathe: Wrench,
  drilling: Drill,
  grinding: Disc,
  honing: Gem,
  threading: Cable,
  boring: CircleDot,
  broaching: Scissors,
  wire_edm: Cable,
  sinker_edm: Zap,
  laser: Crosshair,
  waterjet: Droplets,
  plasma: Flame,
};
```

For the sidebar AppShell, replace all 16 hand-drawn SVGs with Lucide imports:

```tsx
import { Calculator, Code, Box, Building2, ClipboardList, Calendar, BarChart3, Database, Shield, CheckCircle, Settings, DollarSign, FileText, Users, Clock, GraduationCap } from "lucide-react";
```

This eliminates ~130 lines of hand-drawn SVG code.

---

## 8. OVERALL AESTHETIC: DOES IT LOOK LIKE A $500/MO TOOL?

### Verdict: Not yet. Currently it looks like a competent Tailwind starter.

The missing elements that separate a free template from a premium manufacturing tool:

| Element | Current State | Target State |
|---------|--------------|-------------|
| Brand identity | Generic blue | Distinctive cobalt + orange accent |
| Elevation system | Flat | 4-level depth hierarchy |
| Button tactility | Flat rectangles | Shadow + press + lift |
| Card treatment | Barely visible | Glass-morphism + visible shadow |
| Typography | Inconsistent sizes | Strict scale, min 11px |
| Icons | Emojis + hand-drawn SVGs | Lucide (consistent, professional) |
| Data density | Blog-like spacing | Instrument-panel tightness |
| Loading states | "Calculating..." text | Skeleton loaders or shimmer |
| Micro-interactions | Only color transitions | Scale, translate, opacity |
| Status indicators | None visible | Colored dots, pulse animations |

### The #1 highest-impact change
Replace emojis with Lucide icons. This single change will shift the perceived quality from "student project" to "commercial software" overnight.

### The #2 highest-impact change
Add the elevation/depth system. Cards need to float. Sidebar needs to cast a shadow. Dropdowns need to pop. Dark-mode flatness is the primary aesthetic failure.

---

## 9. TEXT VISIBILITY & LEGIBILITY

### Critical visibility issues found

1. **MachineModeTabs group labels** (`text-[9px]` / `text-slate-500` on `bg-slate-800/60`): Contrast ratio is approximately 2.8:1. WCAG AA minimum for text this small would be 4.5:1. This text is nearly invisible.

2. **Social proof line** on landing page (`text-xs text-slate-500` on dark gradient): "Trusted by machinists..." is barely visible. This is deliberate design intent (subtle), but crosses into unreadable territory.

3. **FAQ answers** (`text-sm text-slate-400` on `bg-slate-900/60`): Contrast ratio is approximately 4.2:1. Passes WCAG AA for large text but fails for small. Bump to `text-slate-300`.

4. **Pricing tier descriptions** (`text-xs text-slate-400`): At 12px and `slate-400`, this is borderline. On a shop floor monitor at arm's length, this will be unreadable.

5. **Sidebar nav group headings** (`text-xs text-slate-400`): Adequate contrast but competes visually with the nav items themselves (`text-slate-300`). Should be more distinct -- either dimmer or use the overline treatment.

6. **Stats bar number/label split** (`text-white` + `text-slate-400`): The `slate-400` portions ("Materials", "Tools") are too dim next to the bright white numbers. Consider `text-slate-300`.

### Recommendations for text-shadow/outline for guaranteed legibility

For text over gradient or image backgrounds (hero section, CTA band):

```css
/* Utility class for text over uncertain backgrounds */
.text-safe {
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5), 0 0 8px rgba(0, 0, 0, 0.3);
}

/* For small labels on semi-transparent backgrounds */
.text-crisp {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  -webkit-font-smoothing: antialiased;
}

/* For data values that must be readable at any zoom */
.text-data {
  font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: subpixel-antialiased;
  text-rendering: optimizeLegibility;
}
```

Specific places to apply:
- Hero heading already has gradient text -- add `text-safe` to the paragraph below it
- All text inside MachineModeTabs on the `bg-slate-800/60` surface -- add `text-crisp` or just lighten the text colors
- Any text on the sidebar that sits on `bg-sidebar` (already dark) -- adequate, no shadow needed
- FAQ answers -- change from `text-slate-400` to `text-slate-300`

---

## 10. MACHINE MODE TABS SPECIFIC CRITIQUE

### Problem: Horizontal scroll bar is hidden UX
13 machine modes in a horizontal scroll container with no visible scroll affordance. Users will not know more modes exist offscreen. The `scrollbar-thin scrollbar-thumb-slate-600` classes help but are not visible on many browsers by default.

### Problem: Active state is too subtle
Active tab: `bg-primary-600 text-white shadow-sm` vs inactive: `text-slate-400`. The active state works but the inactive states are too dim to scan quickly.

### Recommendations
- Add left/right fade gradient masks to indicate overflow:
```css
.tab-scroll-container {
  mask-image: linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent);
}
```
- Increase inactive tab contrast: `text-slate-400` to `text-slate-300`
- Add a bottom-border indicator to active tab instead of (or in addition to) background fill
- Consider showing scroll arrows at the edges when overflow exists

---

## 11. SIDEBAR DESIGN (AppShell)

### Problem: Too many nav items with no visual priority
11 nav groups with 50+ items. All items look identical (same icon size, same text size, same weight). There is no visual hierarchy between "SFC Calculator" (the hero feature) and "Exports" (a utility).

### Recommendations
- Top 3 nav items (SFC Calculator, Post Processor, CAM Strategy) should have slightly larger text or a left accent bar when active
- Active nav item: add a left border accent: `border-l-2 border-primary-400` instead of just `bg-primary-600`
- Consider using icon-only mode when sidebar is at narrow widths
- Add a subtle `bg-slate-800/30` alternating stripe on groups for visual separation

---

## PRIORITY ORDER OF CHANGES

1. **Install Lucide React, replace all emojis and hand-drawn SVGs** (highest visual impact)
2. **Add elevation/depth system to cards and sidebar** (second highest)
3. **Enhance Button with shadow, press, lift states** (tactile feedback)
4. **Fix text visibility issues** (minimum 11px, fix contrast ratios)
5. **Add glass-morphism to Card component** (premium feel)
6. **Establish brand color palette beyond stock blue** (identity)
7. **Codify type scale and spacing tokens** (consistency)
8. **Add scroll affordance to MachineModeTabs** (usability)
9. **Add micro-interactions** (translate, scale on hover/active)
10. **Sidebar visual hierarchy improvements** (navigation clarity)
