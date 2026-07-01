# PRISM v9 -- Mobile UX Review for Shop Floor Tablet Deployment

## Verdict: NOT READY for shop floor deployment. Significant rework needed.

The application was clearly designed desktop-first. While there is a mobile sidebar overlay and some responsive grid classes, the UI has serious usability gaps when imagined on an iPad bolted to the wall next to a Haas VF-2, operated by a machinist in nitrile gloves, with coolant mist in the air and chips on the floor.

---

## CRITICAL ISSUES (Must Fix Before Shop Floor Use)

### C1. Touch Targets Are Dangerously Undersized Across the Board

**Apple HIG minimum: 44x44pt. Google Material: 48x48dp. WCAG 2.5.5 (AAA): 44x44 CSS px.**

Almost every interactive element fails this standard:

| Component | File | Actual Size | Required | Severity |
|-----------|------|-------------|----------|----------|
| Sidebar nav links | `AppShell.tsx:180` | `px-3 py-1.5` (~36x30px) | 44x44px | CRITICAL |
| Sidebar group headings | `AppShell.tsx:157` | `px-2 py-1` (~32x26px) | 44x44px | CRITICAL |
| MachineModeTabs mode buttons | `MachineModeTabs.tsx:66` | `px-2 py-1.5` (~40x32px) | 44x44px | CRITICAL |
| Sub-operation pills | `MachineModeTabs.tsx:93` | `px-2.5 py-1` (~48x24px) | 44x44px | CRITICAL |
| Button `sm` | `Button.tsx:14` | `px-2.5 py-1` (~38x24px) | 44x44px | CRITICAL |
| Button `md` | `Button.tsx:15` | `px-4 py-2` (~60x36px) | 44x44px | HIGH |
| Button `lg` | `Button.tsx:16` | `px-6 py-2.5` (~80x40px) | 44x44px | MEDIUM |
| Tab component | `Tabs.tsx:47` | `px-4 py-2.5` (~60x40px) | 44x44px | HIGH |
| Right-panel result tabs | `SfcCalculatorPage.tsx:468` | `px-3 py-2` (~48x32px) | 44x44px | CRITICAL |
| Hamburger menu button | `AppShell.tsx:261` | `p-1.5` (~28x28px) | 44x44px | CRITICAL |
| Mobile sidebar close button | `AppShell.tsx:238` | implicit ~20x20px | 44x44px | CRITICAL |

The hamburger menu button at `p-1.5` with a `h-5 w-5` icon computes to roughly 28x28px. This is the single most important button for mobile navigation and it is almost half the required size. A machinist in gloves will miss this repeatedly.

The sub-operation pills at `py-1` are only ~24px tall. These are among the most frequently tapped elements on the SFC page and they will cause constant mis-taps on a touchscreen.

### C2. 13 Machine Mode Tabs Cannot Fit on Any Tablet Screen

`MachineModeTabs.tsx` renders 13 tabs in a horizontal scrollable row:
- Mill, Lathe, Drilling, Boring, Grinding, Honing, Threading, Broaching, Wire EDM, Sinker EDM, Laser, Waterjet, Plasma
- Plus 3 group labels ("Chip Removal", "Finishing", "Non-Traditional") and 2 dividers

Even on an iPad Pro 12.9" in landscape (1024 CSS px), 13 tab buttons + labels + separators will require ~800-900px, meaning only landscape mode can show them all, and barely. In portrait (~768px), the user must scroll horizontally with no visual indicator that more tabs exist off-screen.

The `overflow-x-auto` is present but there are no scroll affordances (no fade edges, no arrows, no pagination dots). A user has no idea there are more modes to the right. The `scrollbar-thin scrollbar-thumb-slate-600` classes only work on Webkit/Blink -- they are invisible on iOS Safari which uses its own overlay scrollbar behavior that hides after scrolling stops.

### C3. Three-Column Layout Collapses to Single Vertical Stack

`SfcCalculatorPage.tsx:366`:
```
grid gap-4 xl:grid-cols-[minmax(300px,380px)_minmax(400px,1fr)_minmax(300px,380px)]
```

The three-column layout only activates at the `xl` breakpoint (1280px). On any tablet -- even an iPad Pro 12.9" landscape (1024 CSS px) -- all three columns stack vertically. This means the user must scroll through: Machine Config -> Material Selector -> Stock Dimensions -> CAM Software -> Cutting Priority -> Toolpath Strategy -> Parameters -> Presets -> Calculate Button -> Results -> Charts/Compare/History -> Tool Selector -> Tool Holder -> Insert -> Fixture -> Machine Selector.

That is 16+ distinct sections in a single scrolling column. On a 10.2" iPad (810px portrait), this will be 6-8 full screen-heights of scrolling. The Calculate button is buried in the middle. Results are below the fold. The operator cannot see inputs and outputs simultaneously.

### C4. No PWA Manifest, No Service Worker, No Offline Capability

Critical for shop floor use where:
- WiFi can be spotty near CNC machines (EMI from spindle VFDs and servo drives)
- A cellular dead zone behind sheet metal enclosures is common
- Machine tools in remote areas of the shop may have intermittent connectivity

Evidence:
- No `public/manifest.json` or `manifest.webmanifest` found
- No service worker registration file found
- No `vite-plugin-pwa` in the Vite config (`web/vite.config.ts`)
- `index.html` has `<meta name="theme-color">` but no `<link rel="manifest">`
- The `OfflineBanner.tsx` shows a yellow toast saying "You are offline" but provides zero offline functionality

The current calculation engine calls `calc.execute()` which appears to be an API call. If the network drops mid-calculation, the operator gets nothing. For SFC calculations (speed & feed), these could be computed entirely client-side since the formulas and data are deterministic.

### C5. ShopFloorClockPage Has No Offline Resilience

`ShopFloorClockPage.tsx` is the most critical shop floor page and it has zero offline handling:
- `listEmployees()` on mount (line 28) -- if this fails, the page shows an empty dropdown
- `shiftClockIn`/`shiftClockOut` are direct API calls -- if the network is down when an operator tries to clock in/out, their time is lost
- No local storage queue for failed clock operations
- No retry logic
- No optimistic updates

An operator who walks up to the kiosk at 6:00 AM, selects their name, hits CLOCK IN, and gets a network error has no recourse. Their shift start time is lost. This is a payroll and labor compliance issue.

---

## HIGH SEVERITY ISSUES

### H1. Fat-Finger Hazard on Dropdowns and Select Elements

Three distinct `<select>` elements are used on shop floor pages:

1. `ShopFloorClockPage.tsx:143` -- Employee selector: `py-2 text-sm` (~32px height)
2. `MachineLivePage.tsx:156` -- Machine selector: `py-1.5 text-sm` (~28px height)
3. `MachineLivePage.tsx:275` -- Machine selector (duplicated): same sizing

Native `<select>` elements on iOS/iPadOS trigger the native picker wheel, which is acceptable. On Android tablets, native selects show a dropdown that can have tiny option rows. Neither platform's native behavior is glove-friendly.

For shop floor use, the employee selector should be a **large button grid** (one button per employee, or per-department filtered list) rather than a dropdown. Operators in gloves should never need to scroll a picker to find their name.

### H2. No Landscape vs. Portrait Adaptation

There is zero orientation-aware CSS in `index.css`. No `@media (orientation: landscape)` or `@media (orientation: portrait)` queries anywhere. The only responsive mechanism is Tailwind's width breakpoints (`md:`, `xl:`).

For a tablet mounted in landscape next to a machine (the most common orientation), the wide format is wasted because the three-column grid doesn't activate until 1280px, far above any tablet viewport.

For a tablet held in portrait for floor walking, the nav sidebar at 56px (`w-56` = 224px) consumes 29% of a 768px screen when open, but it at least has a mobile overlay pattern.

### H3. Text Too Small for Arm's Length Reading

Shop floor tablets are typically viewed at 18-36 inches (arm's length or further when mounted). Key readability issues:

| Element | Current | Minimum for arm's length |
|---------|---------|-------------------------|
| Mode tab labels | `text-[10px]` (MachineModeTabs.tsx:73) | 14px minimum |
| Group labels | `text-[9px]` (MachineModeTabs.tsx:53) | Not readable at any distance |
| Badge count | `text-[10px]` (SfcCalculatorPage.tsx:476) | 14px minimum |
| General body text | `text-sm` (14px) | Acceptable |
| Guidance text | `text-xs` (12px) used extensively | 14px minimum |

The `text-[9px]` group labels in MachineModeTabs ("Chip Removal", "Finishing", "Non-Traditional") are functionally invisible at arm's length. At 9px, even with perfect vision and close-up viewing, these are hard to read. On a shop floor mounted tablet, they serve no purpose.

### H4. Timer Display Too Small for Kiosk Use

`ShopFloorClockPage.tsx:223`:
```
text-5xl font-mono font-bold
```

`text-5xl` is 3rem (48px). For a time clock kiosk visible from 6 feet away (operator walking up to the clock station), this should be `text-7xl` to `text-9xl` (72-128px). The current size is fine for desktop but inadequate for kiosk use.

### H5. No Visual Feedback for Network Operations

When operators tap CLOCK IN, CALCULATE, or ACKNOWLEDGE:
- The button shows `disabled:opacity-50` while loading
- A generic `<LoadingState label="Processing..." />` appears above the form
- No spinner inside the button itself
- No haptic feedback (not available in web, but visual feedback must compensate)

On a noisy shop floor, the operator may not see the subtle loading indicator and tap again, potentially double-submitting. Buttons should show an inline spinner and/or change to a distinct "processing" state.

---

## MEDIUM SEVERITY ISSUES

### M1. No Scroll-to-Top or Quick Navigation

The SfcCalculatorPage at single-column tablet width is 6-8 screens of scrolling. There is no:
- Sticky "Calculate" button (it scrolls off screen)
- Floating action button to jump to results
- Breadcrumb or section navigation
- Pull-to-refresh

### M2. Mobile Sidebar Has 50+ Navigation Items

The sidebar navigation has 11 groups with 50+ total nav items. The mobile overlay presents all of these in a scrolling list at `py-1.5` row heights. On a tablet, finding "Shop Clock" requires scrolling past Core, Shop, Quoting, Finance sections. There is no search, no favorites, no "shop floor mode" that shows only relevant pages.

### M3. Color Contrast Concerns for Shop Floor Lighting

The UI uses `slate-400`, `slate-500` text colors extensively for secondary information. In the high-bay fluorescent or LED lighting typical of machine shops, with potential glare on the tablet screen, these low-contrast colors become unreadable.

Specific examples:
- `text-slate-400` on dark backgrounds: contrast ratio likely below WCAG AA 4.5:1
- `text-[9px]` group labels in `text-slate-500`: doubly problematic (small AND low contrast)
- `text-xs text-slate-400` used for uptime hours, timestamps, guidance text

### M4. No Confirmation Dialogs for Destructive Actions

- CLOCK OUT has no confirmation ("Are you sure? You have been clocked in for 8.2 hours")
- JOB STOP has no confirmation (stops the timer permanently)
- Clear History has no confirmation (deletes all calculation history)

On a touchscreen with undersized buttons, accidental taps on STOP or CLOCK OUT are a real risk.

### M5. Tables Not Touch-Friendly

`MachineLivePage.tsx` uses `<table>` elements for Adaptive Overrides (line 186) and Axes data (line 332). Tables with `text-sm` and `px-3 py-2` cells are cramped on tablets. The rows are too close together for fat-finger row selection, though currently only the Acknowledge button in the maintenance section is interactive.

### M6. No Dark Mode Default for Shop Floor

Machine shops often have mixed lighting with bright overhead lights and shadowy areas. The app has a dark mode toggle (`ThemeToggle` in the sidebar), but:
- There is no auto-detection beyond `prefers-color-scheme`
- The toggle is buried at the bottom of the sidebar
- There is no per-page or per-station default (a kiosk near a bright window vs. one in a dark corner may need different settings)

---

## SUGGESTIONS (Nice to Have for Shop Floor Excellence)

### S1. Implement a "Kiosk Mode" for Dedicated Shop Floor Stations

A dedicated mode that:
- Hides the full navigation sidebar
- Shows only shop-floor-relevant pages (Clock, Machine Live, SFC Calculator)
- Uses oversized buttons and fonts
- Locks to a specific employee or machine
- Prevents navigation to admin/finance pages
- Can be configured per-station via URL parameter (e.g., `?kiosk=clock&machine=haas-vf2`)

### S2. Add Haptic-Style Visual Feedback

Since the Web Vibration API is not available on iOS:
- Button press animations (scale transform on `:active`)
- Color flash on successful operations
- Large green checkmark overlay on successful clock-in
- Error states that use the full screen width, not subtle text

### S3. Consider Barcode/RFID for Employee Selection

Instead of dropdown employee selection, shop floor kiosks typically use:
- Badge scan (RFID)
- Barcode scan (camera-based or USB scanner)
- PIN pad entry

The current dropdown approach is fine for a web app but is the wrong interaction pattern for a shop floor clock-in station.

### S4. Add Auto-Refresh for Machine Live Dashboard

`MachineLivePage.tsx` requires manually clicking "Refresh" to update machine data. For a dashboard mounted near machines, this should auto-refresh every 5-15 seconds using `setInterval` or WebSocket (the Vite config already has a WebSocket proxy at `/ws`).

### S5. Implement Swipe Gestures for MachineModeTabs

Instead of horizontal scrolling (which has no affordances), implement swipe gesture navigation between mode groups, with pagination dots or a stepper indicator showing the current group.

---

## FILE-BY-FILE SUMMARY

### `AppShell.tsx`
- **Strengths**: Has mobile overlay sidebar, skip-to-content link, ErrorBoundary, OfflineBanner
- **Failures**: Touch targets undersized (nav links, hamburger, close button), sidebar too long for mobile, no favorites/pinning, no kiosk mode

### `SfcCalculatorPage.tsx`
- **Strengths**: Well-structured state management, good component decomposition, calculation history with localStorage
- **Failures**: Three-column grid unreachable on tablets (xl breakpoint), 16+ sections in single-column stack, Calculate button buried mid-page, result tabs undersized, no sticky controls

### `MachineModeTabs.tsx`
- **Strengths**: Auto-scroll active tab into view, grouped with visual separators, emoji icons for quick recognition
- **Failures**: 13 tabs + groups overflow any tablet, no scroll affordance, 9-10px text unreadable, touch targets undersized, no alternative layout for narrow screens

### `index.css`
- **Strengths**: `prefers-reduced-motion` support, focus-visible ring, clean theme variables
- **Failures**: No touch-target utilities, no tablet breakpoints, no orientation queries, no safe-area-inset handling (iPad notch/home indicator), only 54 lines total -- minimal customization

### `ShopFloorClockPage.tsx`
- **Strengths**: Big buttons for CLOCK IN/OUT (px-8 py-4 = ~100x56px -- PASSES 44px minimum), running timer display, clear status indicators
- **Failures**: Employee dropdown not glove-friendly, timer too small for kiosk, no offline queue, no confirmation dialogs, job timer buttons slightly undersized (px-6 py-3 = ~80x48px -- passes but marginal for gloves)

### `MachineLivePage.tsx`
- **Strengths**: Good card layout, badge system for status, responsive grid (sm/lg breakpoints), proper loading/error states
- **Failures**: Select dropdowns too small, no auto-refresh, tables not touch-optimized, Acknowledge button needs confirmation, no WebSocket live updates despite proxy being configured

---

## QUANTIFIED ASSESSMENT

| Category | Score | Notes |
|----------|-------|-------|
| Touch Target Compliance | 2/10 | Only ShopFloorClock CLOCK IN/OUT buttons pass |
| Tablet Layout | 3/10 | Mobile overlay exists but xl-only 3-col grid fails tablets |
| Glove Operability | 3/10 | Clock buttons OK, everything else too small |
| Arm's Length Readability | 2/10 | 9-10px text, low contrast secondaries |
| Offline Resilience | 1/10 | Banner exists, zero actual offline capability |
| PWA Readiness | 0/10 | No manifest, no service worker |
| Landscape/Portrait | 2/10 | No orientation-aware styles |
| Network Reliability | 2/10 | No retry, no queue, no optimistic updates |
| Shop Floor Kiosk Use | 2/10 | Not designed for kiosk deployment |
| **Overall Tablet Readiness** | **1.9/10** | **Not deployable in current state** |

---

## RECOMMENDED REMEDIATION PRIORITY

1. **[CRITICAL]** Add `min-h-[44px] min-w-[44px]` touch target utility class; apply to all interactive elements
2. **[CRITICAL]** Replace MachineModeTabs with a 2-row grid or collapsible group pattern for tablet
3. **[CRITICAL]** Add `lg:grid-cols-2` or `lg:grid-cols-3` breakpoint to SfcCalculatorPage (not just xl)
4. **[CRITICAL]** Implement PWA manifest + service worker with Workbox via `vite-plugin-pwa`
5. **[CRITICAL]** Add offline queue for ShopFloorClock operations with IndexedDB retry
6. **[HIGH]** Make Calculate button sticky at bottom of viewport on mobile/tablet
7. **[HIGH]** Increase all text to minimum 14px for shop floor pages
8. **[HIGH]** Add confirmation dialogs for CLOCK OUT, JOB STOP, Clear History
9. **[HIGH]** Replace employee dropdown with large button grid or PIN entry
10. **[MEDIUM]** Add orientation-aware CSS for landscape tablet mounting
11. **[MEDIUM]** Implement auto-refresh on MachineLivePage via WebSocket
12. **[MEDIUM]** Add kiosk mode URL parameter for dedicated stations
13. **[MEDIUM]** Add safe-area-inset padding for iPads with home indicator
