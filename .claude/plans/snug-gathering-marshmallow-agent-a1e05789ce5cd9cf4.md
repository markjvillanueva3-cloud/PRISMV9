# WCAG 2.1 AA Accessibility Audit -- PRISM v9 Web App

Scope: 6 files (AppShell, MachineModeTabs, Button, Modal, Tabs, index.css) plus supporting UI components (Input, Select, Toast).

---

## CRITICAL Findings

### F-01: Tabs component missing keyboard arrow-key navigation
- **File**: `web/src/components/ui/Tabs.tsx` (lines 38-55)
- **WCAG**: 2.1.1 Keyboard (Level A)
- **Severity**: CRITICAL
- **Detail**: The `Tab` component uses `role="tab"` and `aria-selected` correctly, but there is no `onKeyDown` handler implementing the WAI-ARIA Tabs pattern. Per the ARIA Authoring Practices, pressing Left/Right arrow keys must move focus between tabs; Home/End must jump to first/last tab. Currently, users must Tab through every tab sequentially, which violates the expected interaction model. Additionally, inactive `TabPanel` elements are conditionally unmounted (`return null`), so there are no corresponding `tabpanel` elements for non-active tabs. Each `Tab` button also lacks `aria-controls` pointing to its panel, and each `TabPanel` lacks `aria-labelledby` pointing back to its tab.
- **Fix**: Add `onKeyDown` handler for ArrowLeft, ArrowRight, Home, End. Set `tabIndex={0}` on the active tab and `tabIndex={-1}` on inactive tabs. Add `id` attributes on both Tab and TabPanel, wire `aria-controls` and `aria-labelledby`. Render inactive panels as hidden (`hidden` attribute or `display:none`) rather than unmounting, so the DOM relationship is preserved.

### F-02: MachineModeTabs has no ARIA tab semantics at all
- **File**: `web/src/components/sfc/MachineModeTabs.tsx` (lines 42-81, 85-103)
- **WCAG**: 4.1.2 Name, Role, Value (Level A); 2.1.1 Keyboard (Level A)
- **Severity**: CRITICAL
- **Detail**: This component renders what is visually a tabbed interface (mode buttons in Row 1, sub-operation pills in Row 2), but uses plain `<button>` elements inside plain `<div>` containers. There is no `role="tablist"`, no `role="tab"`, no `role="tabpanel"`, no `aria-selected`. Screen readers will announce these as generic buttons with no relationship to each other or to the content they control. The sub-operation pills row similarly lacks any group semantics. No arrow-key navigation is implemented.
- **Fix**: Wrap the button row in a container with `role="tablist"` and `aria-label="Machine mode"`. Add `role="tab"`, `aria-selected`, and manage `tabIndex` (0 for active, -1 for inactive) on each mode button. Add `onKeyDown` for arrow key navigation. Wrap the sub-operation row with `role="tablist"` with its own label, or use `role="radiogroup"` if only one can be selected at a time.

### F-03: Mobile sidebar overlay backdrop not keyboard-dismissible; no focus trap
- **File**: `web/src/components/layout/AppShell.tsx` (lines 227-253)
- **WCAG**: 2.1.2 No Keyboard Trap (Level A); 2.4.3 Focus Order (Level A)
- **Severity**: CRITICAL
- **Detail**: The mobile sidebar overlay is implemented with a plain `<div>` with `onClick`. When the sidebar opens, there is no focus management: focus does not move into the sidebar, and there is no focus trap to prevent tabbing behind the overlay. The backdrop overlay div (line 229) uses `onClick` to close but cannot be activated via keyboard (no `onKeyDown` for Escape). A keyboard user who opens the sidebar can tab through it and continue into content behind the overlay, or be unable to close it without a mouse.
- **Fix**: When `mobileOpen` becomes true, move focus to the first focusable element in the sidebar (or the close button). Trap focus within the sidebar while it is open. Add an `onKeyDown` listener for Escape to close. Consider using `<dialog>` for the overlay to get native focus trapping.

---

## HIGH Findings

### F-04: Color contrast -- `text-slate-400` on dark backgrounds fails 4.5:1
- **Files**: `AppShell.tsx` (line 157: group headings, line 221: footer text), `MachineModeTabs.tsx` (line 69: inactive mode text, line 53: group labels `text-slate-500`)
- **WCAG**: 1.4.3 Contrast (Minimum) (Level AA)
- **Severity**: HIGH
- **Detail**: `text-slate-400` is approximately `#94a3b8`. Against the sidebar background `#1e293b`, the contrast ratio is roughly 3.7:1 -- below the 4.5:1 minimum for normal text. The `text-slate-500` (`#64748b`) used for group labels in MachineModeTabs against `bg-slate-800/60` (approximately `#1e293b99` over `#0f172a`, yielding roughly `#16202f`) gives approximately 3.2:1 contrast, also failing. The inactive mode buttons using `text-slate-400` on the same dark background also fail.
- **Fix**: Use `text-slate-300` (`#cbd5e1`, ~6.3:1) instead of `text-slate-400` for sidebar group headings and footer. Use at least `text-slate-400` for the MachineModeTabs group labels (currently `text-slate-500`), or preferably `text-slate-300`.

### F-05: Color contrast -- `text-[9px]` and `text-[10px]` text is below minimum size thresholds
- **File**: `MachineModeTabs.tsx` (line 53: `text-[9px]`, line 73: `text-[10px]`)
- **WCAG**: 1.4.3 Contrast (Minimum) (Level AA); 1.4.12 Text Spacing (Level AA)
- **Severity**: HIGH
- **Detail**: 9px and 10px text is extremely small. While WCAG does not set an absolute minimum font size, text this small combined with the already-failing contrast ratios makes it effectively illegible for many users, particularly at distance or on high-DPI mobile screens. At such small sizes, the large-text contrast relaxation (3:1) does not apply -- the stricter 4.5:1 ratio is required, and is not met.
- **Fix**: Increase minimum font size to at least 11px (ideally 12px). The group labels at 9px should be at least `text-[11px]` or use Tailwind's `text-xs` (12px). Tab labels at 10px should be `text-xs` (12px).

### F-06: Touch targets too small on MachineModeTabs mode buttons and sub-operation pills
- **File**: `MachineModeTabs.tsx` (lines 60-77: mode buttons with `px-2 py-1.5`; lines 89-101: sub-operation pills with `px-2.5 py-1`)
- **WCAG**: 2.5.8 Target Size (Minimum) (Level AA -- new in WCAG 2.2, but recommended under 2.5.5 Target Size in 2.1)
- **Severity**: HIGH
- **Detail**: The mode buttons have approximately 8px vertical padding and very small text, resulting in a touch target likely around 28-32px tall. The sub-operation pills have even less padding (`py-1` = 4px each side) on `text-xs` text, yielding roughly 24-26px height. Both are well below the recommended 44x44px minimum for touch targets on mobile.
- **Fix**: Add `min-h-[44px] min-w-[44px]` to touch targets on mobile, or increase padding. For pills: `py-2` minimum. For mode buttons: `py-2.5` minimum.

### F-07: Modal does not return focus to trigger element on close
- **File**: `web/src/components/ui/Modal.tsx`
- **WCAG**: 2.4.3 Focus Order (Level A)
- **Severity**: HIGH
- **Detail**: When the modal closes, focus is not explicitly returned to the element that triggered it. The native `<dialog>` element's `close()` method attempts this in some browsers, but behavior is inconsistent. The current implementation has no explicit focus restoration logic.
- **Fix**: Store a ref to `document.activeElement` when the modal opens (`showModal()` is called). On close, restore focus to that stored element.

### F-08: Select component missing `aria-describedby` for error state
- **File**: `web/src/components/ui/Select.tsx` (lines 20-29, 42-45)
- **WCAG**: 1.3.1 Info and Relationships (Level A); 4.1.2 Name, Role, Value (Level A)
- **Severity**: HIGH
- **Detail**: The `Select` component sets `aria-invalid` on error, but unlike the `Input` component, it does not set `aria-describedby` linking to the error message paragraph. The error `<p>` at line 43 also lacks an `id` attribute. Screen readers will announce the select as invalid but will not read the error message.
- **Fix**: Add an `id` to the error paragraph (`id={selectId + "-error"}`) and add `aria-describedby={error ? selectId + "-error" : undefined}` to the `<select>` element.

---

## MEDIUM Findings

### F-09: Sidebar group collapse button lacks `aria-expanded`
- **File**: `web/src/components/layout/AppShell.tsx` (lines 154-169)
- **WCAG**: 4.1.2 Name, Role, Value (Level A)
- **Severity**: MEDIUM
- **Detail**: The group heading buttons toggle visibility of their child nav items, but do not communicate their expanded/collapsed state to assistive technology. There is no `aria-expanded` attribute.
- **Fix**: Add `aria-expanded={!isCollapsed}` to each group toggle button. Optionally add `aria-controls` pointing to the collapsible region's `id`.

### F-10: Sidebar group's collapsed content is conditionally rendered, not hidden
- **File**: `web/src/components/layout/AppShell.tsx` (lines 171-193)
- **WCAG**: 4.1.2 Name, Role, Value (Level A)
- **Severity**: MEDIUM
- **Detail**: When a group is collapsed, the child `<div>` is removed from the DOM entirely (`{!isCollapsed && ...}`). This means there is no target element for `aria-controls` to reference. While functionally not a blocker, it breaks the recommended pattern where `aria-controls` references an element that is present but hidden.
- **Fix**: Instead of conditionally rendering, keep the container in the DOM and use `hidden` attribute or `aria-hidden="true"` with `display:none` when collapsed.

### F-11: Toast auto-dismiss may be too fast for screen reader users
- **File**: `web/src/components/ui/Toast.tsx` (line 27: default `duration = 4000`)
- **WCAG**: 2.2.1 Timing Adjustable (Level A)
- **Severity**: MEDIUM
- **Detail**: Toasts auto-dismiss after 4 seconds. For users relying on screen readers, 4 seconds may not be enough time to hear and process the message, especially if they are navigating elsewhere. Error-type toasts should persist until dismissed. The `aria-live="polite"` container is correct, but if the toast is removed from the DOM before the screen reader finishes reading it, the announcement may be truncated.
- **Fix**: Make error toasts persist indefinitely (or at least 10+ seconds). Allow user to pause auto-dismiss on hover/focus. Consider adding `role="alert"` for error toasts (which would use `aria-live="assertive"` semantics).

### F-12: Toast dismiss button touch target too small
- **File**: `web/src/components/ui/Toast.tsx` (lines 74-80)
- **WCAG**: 2.5.8 Target Size (Minimum) (Level AA)
- **Severity**: MEDIUM
- **Detail**: The dismiss button renders only a `x` character with no explicit sizing. The clickable area depends on the text size and surrounding padding, which is likely well under 44x44px.
- **Fix**: Add `min-w-[44px] min-h-[44px] flex items-center justify-center` to ensure adequate touch target size, or increase the button's padding.

### F-13: `focus-visible:ring-offset-2` on Button may be invisible in dark mode
- **File**: `web/src/components/ui/Button.tsx` (line 29)
- **WCAG**: 2.4.7 Focus Visible (Level AA)
- **Severity**: MEDIUM
- **Detail**: The Button uses `focus-visible:ring-2 focus-visible:ring-offset-2`. The ring-offset color defaults to white in Tailwind, which works on light backgrounds. In dark mode, the white offset gap between the ring and the button creates a jarring visual. More critically, for the `primary` variant (blue ring on blue button), the focus indicator may lack sufficient contrast against the button itself.
- **Fix**: Add `dark:ring-offset-slate-900` (or whatever the dark background color is) to maintain visual coherence. Ensure the focus ring color contrasts at least 3:1 with both the button and the adjacent background per WCAG 2.4.11 (Focus Appearance).

### F-14: Mobile hamburger button touch target borderline at 36px
- **File**: `web/src/components/layout/AppShell.tsx` (lines 258-267)
- **WCAG**: 2.5.8 Target Size (Minimum) (Level AA)
- **Severity**: MEDIUM
- **Detail**: The hamburger button uses `p-1.5` (6px padding) on a 20x20 icon (`h-5 w-5`), yielding a 32x32px touch target. This is below the 44x44px recommendation.
- **Fix**: Increase to `p-2.5` or add `min-h-[44px] min-w-[44px]`.

### F-15: Desktop sidebar `<aside>` doubles up on `role="navigation"` with inner `<nav>`
- **File**: `web/src/components/layout/AppShell.tsx` (line 212 and line 149)
- **WCAG**: 1.3.1 Info and Relationships (Level A)
- **Severity**: MEDIUM
- **Detail**: The `<aside>` element at line 212 has `role="navigation"` and `aria-label="Main navigation"`. Inside it, `renderNav()` produces a `<nav>` element (also with `aria-label="Main navigation"`) at line 149. This creates a nested navigation landmark with duplicate labels, confusing screen reader landmark navigation.
- **Fix**: Remove `role="navigation"` and `aria-label` from the `<aside>` element. The `<aside>` can use its default `complementary` role, or remove it entirely and let the `<nav>` serve as the landmark. Alternatively, remove the `<nav>` wrapper inside `renderNav()` and let the `<aside role="navigation">` serve as the sole navigation landmark.

---

## LOW Findings

### F-16: No `prefers-reduced-motion` handling for `scrollIntoView({ behavior: "smooth" })`
- **File**: `MachineModeTabs.tsx` (line 35)
- **WCAG**: 2.3.3 Animation from Interactions (Level AAA, but good practice for AA)
- **Severity**: LOW
- **Detail**: The `index.css` reduces motion globally for CSS animations and transitions, which is good. However, the JavaScript call `scrollIntoView({ behavior: "smooth" })` in MachineModeTabs is not gated on `prefers-reduced-motion`. The CSS `scroll-behavior: auto !important` rule in the reduced-motion media query should override this in most browsers, but behavior is browser-dependent for the JavaScript API.
- **Fix**: Query `window.matchMedia("(prefers-reduced-motion: reduce)")` and pass `behavior: "auto"` when the user prefers reduced motion.

### F-17: Modal close-on-backdrop-click not discoverable
- **File**: `web/src/components/ui/Modal.tsx` (line 41)
- **WCAG**: 3.2.4 Consistent Identification (Level AA)
- **Severity**: LOW
- **Detail**: Clicking the backdrop (the `<dialog>` element itself) closes the modal. This is a common pattern but is not communicated to assistive technology users. The Escape key works natively with `<dialog>`, which is good. This is primarily a discoverability concern rather than a hard failure.
- **Fix**: No critical fix needed, but consider adding a visible close instruction or ensuring the close button is the first focusable element.

### F-18: Nav link icons lack group-level context for screen readers
- **File**: `web/src/components/layout/AppShell.tsx` (lines 173-189)
- **WCAG**: 1.3.1 Info and Relationships (Level A)
- **Severity**: LOW
- **Detail**: All icon components correctly use `aria-hidden="true"`, which is good -- the text label provides the accessible name. However, the group heading text (e.g., "Core", "Shop") is rendered as a `<button>` element rather than a proper heading element. Screen reader users navigating by headings will not discover these groups.
- **Fix**: Consider rendering the group names as `<h2>` or `<h3>` elements inside the button, or use `role="heading" aria-level="2"` on the button text, so the sidebar structure is navigable by heading.

### F-19: `TabPanel` lacks `tabIndex` for non-interactive content panels
- **File**: `web/src/components/ui/Tabs.tsx` (line 68)
- **WCAG**: 2.4.3 Focus Order (Level A)
- **Severity**: LOW
- **Detail**: Per the WAI-ARIA tabs pattern, if a `tabpanel` does not contain any focusable elements, it should have `tabIndex={0}` so that pressing Tab from the tab list lands in the panel content. Currently, if a panel contains only static text, keyboard users cannot easily navigate to it.
- **Fix**: Add `tabIndex={0}` to the `tabpanel` div.

---

## Summary Table

| ID | Severity | WCAG Criterion | Component | Issue |
|----|----------|---------------|-----------|-------|
| F-01 | CRITICAL | 2.1.1, 4.1.2 | Tabs.tsx | No arrow-key nav, missing aria-controls/labelledby |
| F-02 | CRITICAL | 2.1.1, 4.1.2 | MachineModeTabs.tsx | No tab ARIA roles at all |
| F-03 | CRITICAL | 2.1.2, 2.4.3 | AppShell.tsx | Mobile sidebar: no focus trap, no Escape handler |
| F-04 | HIGH | 1.4.3 | AppShell, MachineModeTabs | text-slate-400/500 contrast fails 4.5:1 on dark bg |
| F-05 | HIGH | 1.4.3 | MachineModeTabs.tsx | 9px and 10px text too small for legibility |
| F-06 | HIGH | 2.5.8 | MachineModeTabs.tsx | Touch targets ~24-32px, need 44px minimum |
| F-07 | HIGH | 2.4.3 | Modal.tsx | No focus restoration on close |
| F-08 | HIGH | 1.3.1, 4.1.2 | Select.tsx | Missing aria-describedby for error messages |
| F-09 | MEDIUM | 4.1.2 | AppShell.tsx | Collapse buttons lack aria-expanded |
| F-10 | MEDIUM | 4.1.2 | AppShell.tsx | Collapsed groups unmounted instead of hidden |
| F-11 | MEDIUM | 2.2.1 | Toast.tsx | 4s auto-dismiss too fast for screen readers |
| F-12 | MEDIUM | 2.5.8 | Toast.tsx | Dismiss button touch target too small |
| F-13 | MEDIUM | 2.4.7 | Button.tsx | Focus ring offset may be invisible in dark mode |
| F-14 | MEDIUM | 2.5.8 | AppShell.tsx | Hamburger button 32px, needs 44px |
| F-15 | MEDIUM | 1.3.1 | AppShell.tsx | Nested duplicate navigation landmarks |
| F-16 | LOW | 2.3.3 | MachineModeTabs.tsx | JS smooth scroll ignores prefers-reduced-motion |
| F-17 | LOW | 3.2.4 | Modal.tsx | Backdrop close not discoverable to AT |
| F-18 | LOW | 1.3.1 | AppShell.tsx | Group headings not navigable as headings |
| F-19 | LOW | 2.4.3 | Tabs.tsx | TabPanel missing tabIndex for static content |

---

## Positive Observations

1. **Skip-to-content link** (AppShell.tsx line 203-209): Present, properly hidden until focused. Well done.
2. **`prefers-reduced-motion` media query** (index.css lines 40-47): Comprehensive global reduction of animation/transition durations. Solid implementation.
3. **Global `:focus-visible` ring** (index.css lines 50-53): Applied universally, 2px solid with offset. Good baseline.
4. **Icons use `aria-hidden="true"`** consistently across all icon components in AppShell.tsx. Correct pattern.
5. **Input component** (Input.tsx): Excellent -- proper `htmlFor`/`id` association, `aria-invalid`, `aria-describedby` linking to error message with `role="alert"`. This is the model the Select component should follow.
6. **Toast uses `aria-live="polite"`** with dismiss buttons that have `aria-label`. Good foundation.
7. **Native `<dialog>` element** for Modal: Gets free Escape-to-close and some focus management from the browser. Good choice.
8. **Button component** uses `focus-visible:outline-none` paired with ring styles, avoiding the older `:focus` trap. Uses `disabled:pointer-events-none disabled:opacity-50` for clear disabled states.

---

## Recommended Priority for Fixes

**Phase 1 (immediate -- Level A violations):**
- F-01, F-02: Add proper ARIA tab patterns with keyboard navigation
- F-03: Add focus trap and Escape handler to mobile sidebar
- F-08: Add aria-describedby to Select error state
- F-09: Add aria-expanded to collapse buttons

**Phase 2 (near-term -- Level AA violations):**
- F-04, F-05: Fix contrast and minimum font sizes
- F-06, F-12, F-14: Fix touch target sizes
- F-07: Add focus restoration to Modal
- F-13: Fix dark mode focus ring offset

**Phase 3 (improvements):**
- F-10, F-11, F-15, F-16, F-17, F-18, F-19
