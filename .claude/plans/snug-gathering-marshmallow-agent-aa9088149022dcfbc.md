# Shop Floor Usability Review -- Industrial Design Critique

## Scenario

A machinist at a Haas VF-2 vertical machining center. Hands are oily, possibly gloved (nitrile or leather work gloves). The screen is a 15" touchscreen mounted on the machine's pendant arm, approximately 24-30 inches from the operator's face. Ambient light is 300-500 lux fluorescent overhead plus the machine's own work light. The shop is noisy (spindle, coolant pump, air compressor, adjacent machines). The operator may be holding a part, a tool, or a rag in one hand and needs to make quick selections with the other.

This review is organized as: Critical (blocks use), Major (degrades use), and Minor (improvement opportunity).

---

## FILE 1: MachineModeTabs.tsx -- 13 mode tabs across 3 groups

### CRITICAL ISSUES

**C1. Touch targets are dangerously undersized for gloved hands.**

The mode buttons use `px-2 py-1.5` which, at default Tailwind sizing (1rem = 16px), yields approximately:
- Horizontal padding: 8px each side
- Vertical padding: 6px each side
- With a `text-[10px]` label and a `text-sm` (14px) icon, the total rendered height of each button is roughly **26-30px**.

WCAG 2.5.8 (Target Size Enhanced) requires 44px minimum. For gloved industrial use, the de facto standard from ISO 9241-420 and real-world kiosk guidelines is **48px minimum**, with 56-64px strongly preferred. These tabs are roughly **half** the minimum safe size.

A machinist with nitrile gloves will routinely mis-tap, activating an adjacent mode (e.g., tapping "Lathe" and hitting "Drilling" instead). With oily leather gloves, the capacitive touch may not even register at this size.

**Specific lines:**
- Line 66: `px-2 py-1.5` -- must become at minimum `px-4 py-3` (or better, explicit `min-h-[48px] min-w-[48px]`)
- Line 73: `text-[10px]` label -- **completely illegible** at 24 inches. At arm's length on a 15" 1080p screen, 10px text subtends roughly 0.06 degrees of visual arc. The human eye needs about 0.3 degrees minimum for comfortable reading. This text is effectively invisible under shop conditions.

**C2. Sub-operation pills are even worse.**

Line 93: `px-2.5 py-1` produces pills approximately **22-24px tall**. These are half the size of the already-too-small mode tabs. A "Peck Drill" pill sitting next to "Gun Drill" will be indistinguishable and untappable with gloved fingers. The `text-xs` (12px) label compounds this.

**C3. Group labels at `text-[9px]` are functionally invisible.**

Line 53: `text-[9px]` for "Chip Removal", "Finishing", "Non-Traditional". At 24+ inches on a 15" panel, 9px text does not exist as far as the operator is concerned. Even with perfect vision, fluorescent glare on a glossy touchscreen will wash this out. The `text-slate-500` color (roughly #64748b) on a `bg-slate-800/60` background also fails WCAG AA contrast for text this small.

### MAJOR ISSUES

**M1. Horizontal scroll on a 15" screen with 13 tabs is hostile.**

The `overflow-x-auto` scroll container (line 44) means a significant number of tabs are hidden off-screen. On a 15" display at 1080p with 13 mode buttons, the operator must scroll horizontally to reach "Plasma", "Waterjet", "Laser", etc. Horizontal scrolling on a touchscreen with oily/gloved hands is unreliable -- the swipe gesture often registers as a tap, activating the wrong mode.

There are no visible scroll affordances (arrows, fade indicators). The `scrollbar-thin scrollbar-thumb-slate-600` is a styled scrollbar that will be nearly invisible in shop lighting.

**M2. The 1px group separator is invisible.**

Line 50: `h-8 w-px bg-slate-600/50` -- a 1-pixel-wide, 50%-opacity separator. This provides no meaningful visual grouping on a shop floor display. The operator cannot tell where "Chip Removal" ends and "Finishing" begins at a glance.

**M3. `hover:` states are useless on touch.**

Lines 69, 97: `hover:bg-slate-700/50`, `hover:bg-slate-600/60` -- touch devices do not hover. These provide no feedback. There is no `:active` state defined, so the operator gets zero tactile feedback when pressing a button. On a shop floor, you need an obvious press/active state (scale transform, color flash, or border highlight) to confirm the tap registered.

### MINOR ISSUES

**m1. Emoji icons at `text-sm` (14px) are too small and inconsistent across platforms.**

Line 72: The icons are emoji characters (factory, wrench, bolt, etc.). Emoji rendering varies wildly across browsers and OSes. On some embedded Chrome/kiosk setups, these may render as black-and-white outlines. At 14px, they are indistinct blobs. Industrial UIs should use monochrome SVG icons at 24-28px minimum, with thick 2px+ strokes for visibility.

**m2. No indication of currently active mode at a quick glance.**

The active state is `bg-primary-600 text-white` (line 68). This is a medium blue (#2563eb) which, while decent contrast against white text, does not "pop" in a fluorescent-lit environment the way a high-saturation orange, yellow, or green would. The active tab should be visually dominant -- think of a Haas control's green CYCLE START button. Critical state should shout, not whisper.

---

## FILE 2: Button.tsx -- Button sizes

### CRITICAL ISSUES

**C4. No button size meets the 48px industrial touch target.**

Current sizes:
| Size | Classes | Approximate height |
|------|---------|-------------------|
| `sm` | `px-2.5 py-1 text-xs` | ~24px |
| `md` | `px-4 py-2 text-sm` | ~34px |
| `lg` | `px-6 py-2.5 text-base` | ~38px |

Even `lg` falls short of the 44px WCAG minimum, let alone the 48px+ needed for gloved industrial use. The main "Calculate" button on the SFC page uses `size="lg"` (SfcCalculatorPage line 420) -- this is the single most important action button on the page and it is too small.

The "Download PDF" and "+ Compare" buttons use `size="sm"` (lines 451-452) -- these are 24px-tall targets, essentially untappable with gloves.

**C5. No `xl` or `shop` size exists.**

An industrial application needs a size tier that guarantees 48-56px minimum height with 16-18px text. This does not exist in the system.

### MAJOR ISSUES

**M4. The `text-xs` on `sm` buttons (12px) is below readable threshold at arm's length.**

Minimum readable body text at 24 inches in an industrial environment is 14px, and 16px is strongly preferred. `text-xs` (12px) and `text-sm` (14px) are at or below threshold. The `lg` size uses `text-base` (16px) which is acceptable, but only `lg` reaches it.

**M5. No minimum width constraint.**

A button labeled "+" or a short word like "PDF" could render as a narrow 40px-wide sliver. Buttons need `min-w-[48px]` at minimum to be tappable.

**M6. Focus ring uses `ring-offset-2` which may be invisible in high-contrast shop lighting.**

The 2px offset + 2px ring is fine for desktop office use. On a shop display with glare, the focus indicator needs to be bolder (3-4px ring, high-contrast color, possibly inset rather than offset to avoid clipping at screen edges).

---

## FILE 3: index.css -- Design tokens

### CRITICAL ISSUES

**C6. No shop-floor / high-contrast mode or token set.**

The entire color system is built around the `slate` palette -- subtle blue-grays that are designed for comfortable office viewing. On a shop floor with fluorescent overhead lighting:

- `slate-400` (#94a3b8) on `slate-800` (#1e293b) yields roughly 4.3:1 contrast -- barely passes WCAG AA for large text, fails for the small text actually used.
- `slate-500` (#64748b) on `slate-800/60` (the mode tab group labels) is approximately 3.1:1 -- **fails WCAG AA entirely**.
- `primary-600` (#2563eb) against white is 4.6:1 -- passes AA for large text only. At `text-[10px]` it needs AAA (7:1) and does not come close.

There are no tokens for:
- Minimum font size floor (e.g., `--font-size-min: 14px`)
- Minimum touch target size (e.g., `--touch-target-min: 48px`)
- High-contrast active state (e.g., `--color-active: #ff6600` or bright green)
- Glare-resistant surface colors (matte-toned, avoiding pure whites and very dark blacks that cause reflections)

### MAJOR ISSUES

**M7. The `surface` color (#f8fafc) is essentially white -- maximum glare on a shop floor.**

Under fluorescent lighting, a near-white background produces significant glare on typical touchscreen glass. Industrial UIs typically use a medium gray (around #c0c0c0 to #d0d0d0) or a dark theme as default. The dark theme (`surface-dark: #0f172a`) is better but very dark navy may cause readability issues with small text.

**M8. No consideration for sunlight/outdoor readable modes.**

Some shops have open bay doors with direct sunlight. The current palette has no "high-visibility" mode.

**M9. The 0.2s animation is wasted bandwidth on a shop floor.**

Line 31: `enter 0.2s ease-out` -- animating opacity and translateY. On a shop floor, the operator is not admiring smooth animations. They want instant feedback. The `prefers-reduced-motion` media query (line 40) is good but most industrial displays will not have this preference set. Consider making reduced motion the default and opting into animation rather than the reverse.

---

## FILE 4: AppShell.tsx -- Sidebar navigation

### CRITICAL ISSUES

**C7. Sidebar navigation items are far too small for touch.**

Line 180: `px-3 py-1.5 text-sm` -- this produces nav links approximately **28-30px tall**. There are potentially **50+ nav items** across 11 groups. Each one is a small, tightly-packed text link. A machinist trying to navigate from "SFC Calculator" to "Shop Clock" (to punch in from break) will mis-tap repeatedly.

The group heading buttons (line 157: `px-2 py-1 text-xs`) are even smaller at roughly **24px tall**.

**C8. The sidebar is 224px wide (`w-56`) with 50+ items -- information overload.**

A machinist does not need simultaneous access to "General Ledger", "HR Compliance", "Financial Analysis", and "Quality Management" while standing at a VF-2. This sidebar structure is designed for a desktop ERP admin, not a shop floor operator. On a 15" screen, the sidebar consumes roughly 15% of horizontal space, leaving the already-cramped SFC calculator with even less room.

### MAJOR ISSUES

**M10. No role-based view filtering.**

A machinist at a machine should see 4-6 items maximum: SFC Calculator, Shop Clock, Jobs, Shop Dashboard, 3D Viewer, and maybe Quality. The remaining 45+ navigation items are noise that slows recognition and increases error rate.

**M11. Icons are 16px (`h-4 w-4`) and use 2px strokes -- borderline invisible at arm's length.**

Line 285 and all icon functions: `h-4 w-4` (16x16px) with `strokeWidth={2}`. At 24 inches, these icons are decorative at best. Industrial nav icons should be 24-28px with thick strokes (2.5-3px) and ideally filled rather than outlined for better recognition at a glance.

**M12. The close button for mobile sidebar is too small.**

Line 242: `h-5 w-5` (20x20px) X icon with no padding. This is a ~20px touch target. In the real scenario, a machinist who opened the mobile nav and now needs to close it will struggle to hit this button.

**M13. The hamburger menu button (mobile) is minimal.**

Line 261: `p-1.5` padding on a 20px icon gives roughly a 26px touch target. On a 15" touchscreen used as a "mobile" breakpoint, this is inadequate.

### MINOR ISSUES

**m3. Group collapse/expand chevrons are 12px (`h-3 w-3`).**

Line 161: These are 12-pixel interaction indicators. They will not be seen or accurately tapped.

**m4. The `space-y-0.5` (2px) between nav items provides no separation.**

Line 172: Items are stacked with 2px gaps. There is no visual breathing room between "Invoices" and "Purchase Orders". At a glance, the sidebar becomes a wall of text.

---

## COMPOSITE ASSESSMENT: Can a machinist use this at a VF-2?

**No. Not effectively, and not safely.**

The specific failure modes:

1. **Mode selection (MachineModeTabs)**: The operator needs to switch from Mill to Lathe. The 13 tabs at ~28px height with 10px labels in a horizontal scroll container will require multiple attempts. In a shop where the operator may have just been handling coolant-soaked parts, the repeated mis-taps will cause frustration and potentially wrong-mode calculations that produce incorrect feeds/speeds -- which is a **safety issue** (wrong feed rate can break tools, crash spindles, or throw workpieces).

2. **Parameter entry**: The "Calculate" button at 38px height with the critical action of computing feeds and speeds is undersized. More dangerously, the "sm" utility buttons ("+ Compare", "Download PDF") are virtually untappable.

3. **Navigation**: Getting from the SFC Calculator to the Shop Clock to punch a time card requires navigating 50+ sidebar items at 28-30px height. The operator will likely give up and walk to a separate time clock.

4. **Readability**: At 24+ inches, the 9px group labels, 10px tab labels, and 12px button text are illegible. The operator cannot confirm which mode is selected without leaning in close to the screen, taking their eyes off the machine.

---

## RECOMMENDED FIXES (Priority Order)

### P0: Immediate (safety-impacting)

1. **Add a `shop` or `xl` button size**: `min-h-[48px] min-w-[48px] px-6 py-3 text-base` at minimum. Apply to all interactive elements on the SFC page.

2. **Rewrite MachineModeTabs as a 2-column or 3-column grid** instead of horizontal scroll. Each mode button should be `min-h-[56px]` with `text-sm` (14px) minimum labels. Three groups of tabs can stack as labeled sections.

3. **Increase sub-operation pills** to `min-h-[44px] px-4 py-2.5 text-sm`.

4. **Enforce a 14px font floor** across the entire application. Nothing below `text-sm`. Group labels should be `text-sm font-bold uppercase` not `text-[9px]`.

5. **Add `:active` states** to all buttons: `active:scale-95 active:bg-primary-700` or similar, to give tactile press confirmation.

### P1: High (usability-impacting)

6. **Add design tokens** for industrial/touch mode: `--touch-target-min`, `--font-size-floor`, `--active-highlight`.

7. **Add a "Shop Mode" toggle or role-based filtering** that collapses the sidebar to 5-6 machinist-relevant items with 48px+ nav links and 24px+ icons.

8. **Replace emoji icons with SVG icons** at `h-6 w-6` minimum, using filled or bold-stroke variants.

9. **Increase sidebar nav items** to `py-3` minimum (padding yields ~44px height). Increase icons to `h-5 w-5` or `h-6 w-6`.

10. **Add visible scroll indicators** (left/right arrow buttons) to MachineModeTabs if horizontal layout is kept, or better yet, use a grid/wrap layout.

### P2: Medium (quality-of-life)

11. **Audit all color contrast** against WCAG AA at the actual font sizes used. Fix `slate-500` on `slate-800` combinations.

12. **Reduce `surface` background brightness** to something in the #e0e4e8 range for light mode, or default to dark mode on shop displays.

13. **Make reduced-motion the default**; opt into animations with `prefers-reduced-motion: no-preference`.

14. **Add spacing between sidebar groups**: `space-y-1` minimum between nav items, `space-y-4` between groups.

15. **Increase close/hamburger button targets** to 44px minimum with adequate padding.
