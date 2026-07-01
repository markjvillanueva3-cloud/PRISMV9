# Mobile / Responsive Design Review

## Files Reviewed
- `web/src/pages/SfcCalculatorPage.tsx` (3-column grid)
- `web/src/components/layout/AppShell.tsx` (sidebar + mobile overlay)
- `web/src/components/sfc/MachineModeTabs.tsx` (13 scrollable tabs)
- `web/src/pages/LandingPage.tsx` (marketing page)
- `web/src/index.css` (global styles + Tailwind v4 theme)

## Breakpoints in Use (Tailwind v4 Defaults)
- `sm` = 640px
- `md` = 768px
- `lg` = 1024px
- `xl` = 1280px
- `2xl` = 1536px

---

## CRITICAL Issues

### C1. SFC 3-Column Grid Only Activates at `xl` (1280px) -- Nothing Between Mobile and Desktop

**File:** `SfcCalculatorPage.tsx` line 366
```
grid gap-4 xl:grid-cols-[minmax(300px,380px)_minmax(400px,1fr)_minmax(300px,380px)]
```

**Problem:** The grid has exactly two states: single-column stacked (everything below 1280px) and 3-column (1280px+). There is no `md` or `lg` breakpoint. This means:

- **Tablet portrait (1024px):** All three columns stack into a single column producing an extremely long vertical scroll. Users see Machine Config, Material, Stock, then CAM Software, Cutting Priority, Toolpath, Parameters, Presets, Calculate button, Results, Charts/Compare/History, and finally Tool, Fixture, Machine selectors -- all in one towering column. On a shop floor iPad this is unusable; the operator has to scroll 8+ screenfuls to reach the Calculate button and then scroll further to see results.
- **Tablet landscape (1180px):** Still single-column. This is particularly bad because 1180px of horizontal space is more than enough for at least a 2-column layout.
- **Phone (375px):** Single-column is correct here, so this is fine.
- **Large monitor (1920px):** 3-column with `max-w-[1600px]` works well. The `minmax` constraints produce good proportions.

**Impact:** HIGH -- The most important page in the app is unusable on the most common shop-floor form factor (tablets at 768-1279px).

**Recommended fix:** Add a 2-column intermediate layout:
```
grid gap-4
md:grid-cols-2
xl:grid-cols-[minmax(300px,380px)_minmax(400px,1fr)_minmax(300px,380px)]
```
At `md` (768px-1279px), the left and center columns can share a 2-column layout, with the right column spanning full width below. At `lg` (1024px) consider a `lg:grid-cols-[1fr_1fr_1fr]` equal-thirds layout to transition more gracefully.

---

### C2. Mobile Sidebar Overlay Has No Animation and No Body Scroll Lock

**File:** `AppShell.tsx` lines 227-253

**Problem:** The mobile sidebar is conditionally rendered with a simple boolean toggle (`{mobileOpen && (...)}`). There are two issues:

1. **No enter/exit animation.** The sidebar appears and disappears instantaneously. On mobile, this is jarring. Users expect a slide-in/slide-out transition. The CSS file defines an `--animate-in` keyframe but it is not applied to the overlay.

2. **No body scroll lock.** When the overlay is open, the background content behind the semi-transparent backdrop remains scrollable. If the user swipe-scrolls while the sidebar is visible, the main content scrolls underneath, creating a confusing experience. On iOS Safari this is especially problematic because of rubber-band scrolling.

3. **No swipe-to-close gesture.** Shop floor users with gloves frequently use swipe gestures. Tapping the small X button or the backdrop are the only close mechanisms.

**Impact:** MEDIUM-HIGH -- Affects every mobile user on every page (not just SFC).

**Recommended fix:**
- Wrap the sidebar in a CSS transition (e.g., `translate-x` from `-100%` to `0`) rather than conditional render, or use React Transition Group / `data-[state=open]` patterns.
- Add `overflow: hidden` to `<body>` when the overlay is open (or use a portal + `inert` attribute on the main content).
- Consider adding a `touch-action: none` or swipe gesture handler on the backdrop.

---

### C3. 13 Machine Mode Tabs Overflow with No Affordance on Mobile

**File:** `MachineModeTabs.tsx` lines 42-81

**Problem:** The tab bar renders 13 mode buttons (Mill, Lathe, Drilling, Grinding, Threading, Honing, Boring, Broaching, Plasma, Wire EDM, Sinker EDM, Laser, Waterjet) grouped into 3 categories with group labels and separators -- all in a single horizontally scrolling row.

- **Phone (375px):** The container is `overflow-x-auto` which is correct mechanically, but there is zero visual indication that more tabs exist off-screen. The `scrollbar-thin scrollbar-thumb-slate-600` classes only work in Webkit/Blink browsers and produce a tiny scrollbar that is almost invisible on a dark background. On iOS Safari, these classes have no effect and the scrollbar is completely hidden.

- **No scroll shadow / fade gradient.** Without a fade-out gradient on the right edge, users have no idea that 8+ tabs are hidden to the right. This is a classic discoverability failure.

- **Touch targets too small.** Each tab button is `px-2 py-1.5` with `text-[10px]` labels. On a 375px phone, the touch target is roughly 36x32px. Apple HIG recommends 44x44px minimum. Google Material recommends 48x48dp. For a shop floor device used with greasy or gloved hands, this is critically undersized.

- **Group labels waste space on mobile.** The `text-[9px]` group labels ("Chip Removal", "Finishing", "Non-Traditional") consume horizontal real estate without adding value on a small screen. They should collapse or hide on mobile.

**Impact:** HIGH -- Users cannot discover or reliably tap machine modes on mobile.

**Recommended fix:**
- Add a scroll shadow or fade gradient at the left/right edges to indicate overflow content.
- Increase touch targets to at least `min-h-[44px] min-w-[44px]` on mobile.
- Hide group labels below `sm` breakpoint.
- Consider a dropdown or bottom sheet on very narrow screens (below 480px).

---

## MAJOR Issues

### M1. No `lg` Breakpoint Anywhere in SfcCalculatorPage

**File:** `SfcCalculatorPage.tsx`

The entire page jumps from default (mobile) directly to `xl`. The `lg` (1024px) breakpoint -- which corresponds to standard iPad landscape and many shop floor terminals -- is completely unused. This creates a "dead zone" from 768px to 1279px where the layout is identical to a 375px phone.

---

### M2. AppShell Sidebar Breakpoint at `md` (768px) Conflicts with SFC Grid at `xl` (1280px)

**File:** `AppShell.tsx` line 212 vs `SfcCalculatorPage.tsx` line 366

The sidebar shows/hides at `md` (768px): `hidden ... md:flex`. But the SFC page does not switch to multi-column until `xl` (1280px). This means at 768-1279px the user sees:
- A permanent 224px (`w-56`) sidebar
- A single-column SFC layout in the remaining ~544-1056px

At 1024px the remaining content area is ~800px -- more than enough for 2 columns. The sidebar eats width but the content does not take advantage of it.

---

### M3. Landscape Phone Orientation Not Addressed

**Problem:** Shop floor tablets (e.g., Samsung Galaxy Tab Active, iPad Mini) are frequently mounted in landscape orientation. A landscape phone at 667x375px (iPhone SE) or 812x375px (iPhone X) presents a wide but very short viewport. The current layout provides:
- Full-width single column that requires excessive vertical scrolling
- The 56px header + MachineModeTabs (roughly 80px with sub-operations) consume ~136px of the 375px viewport height, leaving only 239px for actual content
- The machine mode tabs + sub-operation pills together occupy over 35% of the visible viewport in landscape

**Recommended fix:**
- Consider collapsing the MachineModeTabs into a compact dropdown in landscape phone orientation (`@media (max-height: 500px) and (orientation: landscape)`).
- Reduce header height on landscape phones.

---

### M4. Pricing Grid Has a 5-Column Layout at `xl` That Creates Very Narrow Cards

**File:** `LandingPage.tsx` line 519
```
grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5
```

At `xl` (1280px), five pricing cards in a row each get roughly 230px of width. With `p-6` (24px each side), the content area is ~182px. The "Enterprise" card has 7 feature bullet items with `text-xs` text. This works but is tight. At exactly 1280px the cards feel cramped.

**More critically,** there is no `md` breakpoint. At 768-1023px, `sm:grid-cols-2` applies, producing 2 columns with one orphaned card centered below -- which is a perfectly acceptable layout. But the jump from 2 columns to 3 columns at 1024px and then to 5 columns at 1280px is aggressive.

**Impact:** MEDIUM -- Visual quality issue, not a functional blocker.

---

### M5. Sub-Operation Pills Row Can Wrap Aggressively on Narrow Screens

**File:** `MachineModeTabs.tsx` line 85
```
flex flex-wrap gap-1.5 px-1
```

The Mill mode has 6 sub-operations. "Profile / Contour" and "Semi-Finishing" are long labels. On a 375px phone, `flex-wrap` will cause 2-3 rows of pills, consuming significant vertical space. Combined with the mode tab bar above it, the MachineModeTabs component could consume 150-180px of vertical space on mobile before any actual calculator content appears.

---

## MINOR Issues

### m1. LandingPage Hero Uses `min-h-[calc(100vh-57px)]` -- Hardcoded Header Height

**File:** `LandingPage.tsx` line 348

The `57px` value is fragile. If the header padding, font size, or border changes, this will drift. Consider using CSS variables or `dvh` units for better resilience.

---

### m2. Main Content Padding is Fixed `p-6` on All Screen Sizes

**File:** `AppShell.tsx` line 272
```
<main id="main-content" className="flex-1 overflow-y-auto p-6">
```

On a 375px phone, `p-6` (24px) consumes 48px of horizontal space, leaving only 327px of usable width (minus the hamburger menu area). Consider `p-4 md:p-6` to reclaim 16px on mobile.

---

### m3. No `prefers-color-scheme` Media Query for Initial Load

**File:** `index.css`

The CSS defines dark mode surfaces but there is no `@media (prefers-color-scheme: dark)` in the stylesheet. The theme is presumably handled by a class toggle (Tailwind's `dark:` variant). This is fine, but there may be a flash of light theme on initial load before JavaScript hydrates the theme preference.

---

### m4. `scrollbar-thin` and `scrollbar-thumb-*` Are Non-Standard

**File:** `MachineModeTabs.tsx` line 44

These are `scrollbar-*` utility classes. In Tailwind v4 with no custom plugin, these classes will not generate any CSS. They appear to be leftover from a Tailwind v3 plugin (`tailwind-scrollbar`). If the plugin is not installed, these classes silently do nothing, and the scrollbar appearance falls back to browser defaults. On iOS, the scrollbar is completely hidden regardless.

---

### m5. Stats Bar on Landing Page Has Fragile `split(" ")` Logic

**File:** `LandingPage.tsx` lines 492-493

```tsx
<span className="text-white">{stat.split(" ")[0]}</span>
<span className="text-slate-400">{stat.split(" ").slice(1).join(" ")}</span>
```

This splits "94,000+ Tools" into "94,000+" and "Tools" -- which works, but "Controller Dialects" would incorrectly split "20" and "Controller Dialects" while "296 Playbook Rules" splits "296" and "Playbook Rules". The current data happens to work, but this is fragile. Not a responsive issue per se, but worth noting.

---

## Device-by-Device Summary

### Phone Portrait (375px)
| Component | Status | Notes |
|-----------|--------|-------|
| AppShell sidebar | OK | Hamburger menu + overlay works mechanically |
| Sidebar overlay animation | POOR | Instant show/hide, no scroll lock |
| SFC 3-column grid | OK | Single column is correct at this width |
| SFC page scroll depth | POOR | 8+ scroll lengths to reach all sections |
| Machine mode tabs | POOR | Overflow hidden, tiny touch targets, no overflow hint |
| Sub-operation pills | FAIR | Wraps to 2-3 rows, eats vertical space |
| Landing page | GOOD | Responsive typography, stacked grids work well |
| Pricing cards | GOOD | Single column, readable |

### Phone Landscape (667x375px)
| Component | Status | Notes |
|-----------|--------|-------|
| SFC header + tabs | POOR | Consume 35%+ of 375px viewport height |
| SFC content area | POOR | Only ~239px remaining for content |
| Sidebar overlay | OK | Same as portrait |
| Landing page | FAIR | Hero is oversized for landscape, wastes space |

### Tablet Portrait (768px / iPad Mini)
| Component | Status | Notes |
|-----------|--------|-------|
| AppShell sidebar | OK | Permanent sidebar shows at md |
| SFC 3-column grid | BAD | Still single-column despite 544px content width |
| Machine mode tabs | FAIR | More room, but still no overflow hint |
| Landing page | GOOD | 2-col pricing, 2-col features |

### Tablet Landscape (1024px / iPad)
| Component | Status | Notes |
|-----------|--------|-------|
| AppShell sidebar | OK | 224px sidebar, 800px content |
| SFC 3-column grid | BAD | Still single-column in 800px content area |
| Machine mode tabs | OK | Most tabs visible, light scrolling needed |
| Landing page | GOOD | 3-col features, 3-col pricing |

### Desktop (1280px+)
| Component | Status | Notes |
|-----------|--------|-------|
| Everything | GOOD | 3-column SFC layout activates, sidebar permanent |

### Large Monitor (1920px)
| Component | Status | Notes |
|-----------|--------|-------|
| SFC grid | GOOD | `max-w-[1600px]` caps width, minmax columns balanced |
| Landing page | GOOD | `max-w-7xl` (1280px) keeps content centered |

---

## Action Items (Priority Order)

1. **[CRITICAL] Add md/lg breakpoints to SFC grid** -- 2-column at md, 3-column at xl. This single change has the highest impact for shop floor usability.
2. **[CRITICAL] Increase machine mode tab touch targets** -- min 44x44px, add overflow fade hints, consider dropdown on narrow screens.
3. **[HIGH] Add sidebar open/close animation** -- slide-in transition + body scroll lock.
4. **[HIGH] Address landscape phone orientation** -- compact tabs, reduce header consumption.
5. **[MEDIUM] Reduce main content padding on mobile** -- `p-4 sm:p-6` or `p-3 md:p-6`.
6. **[MEDIUM] Verify `scrollbar-thin` classes actually work** in Tailwind v4 -- if not, remove or replace with real CSS.
7. **[LOW] Add scroll shadow/gradient to MachineModeTabs** for overflow discoverability.
8. **[LOW] Fix hero `min-h` hardcoded 57px** -- use CSS custom property or dvh units.
