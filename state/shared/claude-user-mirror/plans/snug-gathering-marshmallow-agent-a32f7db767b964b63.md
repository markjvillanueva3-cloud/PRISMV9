# Data Visualization Review -- PRISM v9 Charts & Dashboards

**Reviewer**: Data Visualization Specialist (Tufte school)
**Files reviewed**: 6 primary + 3 shared chart library files
**Verdict**: Structurally sound foundation with several systematic deficiencies

---

## CRITICAL ISSUES (must fix)

### C1. Dark Mode is Functionally Broken on 4 of 6 Files

| File | Dark mode support |
|------|-------------------|
| `AdvancedCharts.tsx` | Partial -- tab buttons only |
| `ComparisonView.tsx` | Yes -- text colors adapt |
| `ShopDashboardPage.tsx` | **NONE** -- hardcoded `#fff`, `#111827`, inline styles |
| `FinancialAnalysisPage.tsx` | **NONE** -- `bg-white`, `text-gray-900` throughout |
| `QuoteAnalyticsPage.tsx` | **NONE** -- `bg-white`, `text-gray-900` throughout |
| `JobProfitabilityPage.tsx` | **NONE** -- `bg-white`, `text-gray-900` throughout |

**ShopDashboardPage** is the worst offender: it uses inline `style={{ background: '#fff' }}` on every panel, making dark-mode Tailwind classes impossible to override. A machinist working night shift with dark mode enabled will see blinding white cards on a dark background.

**AdvancedCharts** has a subtler problem: the Recharts `CartesianGrid` and axis tick colors are hardcoded (`stroke="#e2e8f0"`, tick fill defaults to dark text). On a dark background, gridlines vanish and axis labels become invisible.

**The PNG export** in `AdvancedCharts.tsx` line 91 hardcodes `ctx.fillStyle = "#ffffff"` -- exporting a chart from dark mode produces a white-background image, which is acceptable behavior for print, but should be documented.

### C2. Color-Blind Accessibility Failures

The palette across these files relies on **red/green semantic encoding** without any redundant channel:

- **PowerChart** (AdvancedCharts line 217): Required=red or blue, Available=green. A deuteranope cannot distinguish `#ef4444` (red) from `#22c55e` (green).
- **ComparisonView** (line 124-130): Best=green, Worst=red, plus a green "Best" badge. No shape, icon, or pattern distinguishes best from worst.
- **ShopDashboardPage OEEGauge** (line 158): color threshold is green/yellow/red with no text label of the state.
- **ShopDashboardPage ToolLifeRow** (line 141): critical=red, elevated=amber, normal=green -- only color distinguishes these states.
- **JobProfitabilityPage varianceColor** (line 65-69): a 4-level semantic scale encoded purely as green/gray/yellow/red.
- **QuoteAnalyticsPage** variance bars (line 106): orange vs blue with no label inside the bar.

The `PRISM_COLORS` palette in `charts/index.tsx` claims "accessible contrast" in the comment but does not actually verify WCAG 2.1 contrast ratios. Blue `#3b82f6` on white passes AA, but yellow `#f59e0b` on white fails at 2.9:1 (needs 4.5:1).

### C3. No ARIA or Screen-Reader Support for Charts

- **AdvancedCharts**: The `<LineChart>` and `<BarChart>` from Recharts produce SVGs with no `role="img"` or `aria-label`. The `tabpanel` is correct, but the chart content inside it is opaque to assistive technology.
- **ShopDashboardPage OEEGauge**: The SVG has no `role`, no `aria-label`, no `<title>` element. A screen reader sees nothing.
- **ComparisonView**: The table is semantically correct (good), but the color-only best/worst encoding means a screen reader user only gets the badge text for "Best" and nothing for "Worst".
- The standalone `Sparkline` in `charts/Sparkline.tsx` does set `role="img" aria-label="Trend line"` (good), but the one in `charts/index.tsx` does not.

---

## MAJOR ISSUES (should fix)

### M1. Chart Type Mismatches

**PowerChart is a bar chart with 2 bars** (AdvancedCharts lines 215-260). Two bars side by side is the least efficient encoding for a simple comparison. A bullet chart (Tufte) or a single horizontal bar with a reference mark would convey the same information in 1/4 the ink. A machinist wants to see "am I over or under?" -- a single gauge with a threshold marker answers that instantly.

**OEE Gauges** (ShopDashboardPage lines 156-173) use donut/ring charts for single scalar values. Tufte would call this a low data-ink ratio: 4 separate ring charts consuming significant screen real estate to show 4 numbers. A simple labeled bar or even just bold numbers with a small color indicator would be equally legible and far more compact. The circular encoding also makes it harder to compare values across the 4 gauges because arc angles are perceptually less accurate than aligned lengths.

### M2. Financial Pages Have Zero Charts

**FinancialAnalysisPage**, **QuoteAnalyticsPage**, and **JobProfitabilityPage** are entirely text/number/table presentations with no charts at all. This is a significant missed opportunity:

- **NPV/IRR**: A waterfall chart showing cumulative cash flows over time would make the payback period visually obvious.
- **Breakeven**: A classic cost-revenue intersection line chart is the canonical visualization -- its absence forces the user to mentally construct the relationship from 4 numbers.
- **Quote Accuracy variance**: The horizontal bar (QuoteAnalyticsPage lines 105-108) attempts a diverging bar but the CSS implementation is broken -- `marginLeft: 'auto'` on a flex child inside a relative-positioned bar does not produce a correct left-growing bar for negative variances.
- **Cost Forecast**: A 6-period forecast table cries out for a line chart with confidence intervals.
- **Job Profitability cost breakdown**: The proportional bar (lines 153-154) is reasonable, but a treemap or stacked bar would support comparison across multiple jobs.

### M3. Data-Ink Ratio Issues

**CartesianGrid everywhere**: All Recharts charts use `<CartesianGrid strokeDasharray="3 3">`. Tufte advocates removing grids entirely or reducing them to the lightest possible whisper. The dashed grid in the ToolLife and SurfaceFinish charts competes with the actual data line.

**ShopDashboardPage** has no gridlines on its inline bar/progress elements (which is fine), but wraps every section in white cards with borders and shadows -- `border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'`. This decorative chrome is chart junk at the container level; the eye is drawn to card edges rather than data.

**ComparisonView** is well-designed from a data-ink perspective -- a clean table with minimal decoration and intelligent use of bold/color for best/worst values.

### M4. Missing Small Multiples

**ShopDashboardPage** would benefit enormously from small multiples:
- Machine uptime/RPM over the last hour as a row of sparklines next to each MachineCard
- Job progress as sparklines showing rate of completion (not just current percentage)
- Tool wear rate as sparklines (the data exists: `wear_rate` is categorized but there is no trend data)

The Sparkline component exists (`charts/Sparkline.tsx` and `charts/index.tsx`) but is **not used in any of the six reviewed files**. This is a wasted asset.

### M5. Inconsistent Color Systems

Three different color systems are in play:
1. `PRISM_COLORS` array in `charts/index.tsx` -- 8 colors
2. Hardcoded hex values in AdvancedCharts (`#2563eb`, `#ef4444`, `#22c55e`, `#f59e0b`)
3. Hardcoded hex values in ShopDashboardPage (`STATUS_COLORS` map, plus inline colors in gauges)

None of these reference each other. The blue in AdvancedCharts (`#2563eb`) is different from the blue in PRISM_COLORS (`#3b82f6`). The green in ShopDashboardPage (`#22c55e`) matches AdvancedCharts but not PRISM_COLORS (`#10b981`).

---

## MODERATE ISSUES (nice to fix)

### m1. Axis Labels Need Domain Language

- ToolLifeChart Y-axis: "Tool Life (min)" -- good
- SurfaceFinishChart: "Ra (um)" and "Feed per Tooth (mm)" -- good
- PowerChart Y-axis: "Power (kW)" -- good
- But: no chart titles on the Recharts components themselves (the title is in the `<p>` above each chart). A machinist scanning quickly might not associate the description paragraph with the chart below it.

### m2. Comparison View Limited to 4 Entries

ComparisonView caps at 4 entries (line 80: `Comparison (${entries.length}/4)`). For a shop comparing feeds and speeds across 6+ materials, this is limiting. A small-multiples matrix layout would scale better.

### m3. Tooltip Formatting Inconsistencies

- ToolLifeChart tooltip: `${val} min`, `${label} m/min` -- units on both axes, good
- SurfaceFinishChart tooltip: `${val} um`, `${label} mm/tooth` -- good
- PowerChart tooltip: `${val} kW` -- value only, no axis label in tooltip

### m4. Reference Lines Need Better Labeling

- ToolLifeChart "Current" reference line at line 203-208: position "top", font size 10. On a 240px-tall chart, this label is tiny and may collide with data.
- SurfaceFinishChart has a "Target 1.6um" reference line (line 300-305). This is a good practice -- an absolute domain reference -- but the 1.6um target is hardcoded. Different operations require different Ra targets (0.8um for bearing surfaces, 3.2um for general machining). This should be parameterized.

### m5. ShopDashboardPage Uses Inline Styles Exclusively

The entire ShopDashboardPage uses `style={{}}` instead of Tailwind classes, making it the odd one out in the codebase. This is a maintainability issue: theme changes, responsive breakpoints, and dark mode are all harder to implement with inline styles.

### m6. Duplicate Sparkline Components

Two Sparkline implementations exist: `charts/Sparkline.tsx` and `charts/index.tsx` (lines 148-181). The one in `index.tsx` supports a `fill` option; the standalone one has better ARIA. Neither is used in any of the reviewed files.

---

## WHAT WORKS WELL

1. **AdvancedCharts ToolLifeChart**: Taylor curve with a "Current" reference line is pedagogically excellent. A machinist can see where they sit on the tool-life envelope and immediately understand the tradeoff. The formula annotation (`T = (C/V)^(1/n)`) educates while informing.

2. **AdvancedCharts SurfaceFinishChart**: The 1.6um target reference line is a strong domain anchor. Showing Ra vs feed as a curve with the current operating point marked is exactly what a setup programmer needs.

3. **ComparisonView**: Clean tabular comparison with best/worst highlighting and unit-aware imperial/metric switching. This is the most Tufte-aligned component in the set. The `higherBetter` flag per row is thoughtful domain modeling.

4. **ShopDashboardPage overall layout**: The information hierarchy (KPIs at top, machine grid, jobs, OEE, tools) follows the natural attention flow. The WebSocket real-time update architecture is correct for a shop floor display.

5. **PNG export** in AdvancedCharts: 2x resolution scaling for print quality is a good detail.

6. **JobProfitabilityPage variance table**: Proper table structure with sortable-style headers, monospace numbers for alignment, color-coded percentage variance. This is how a shop owner reads cost data.

---

## RECOMMENDED FIXES (prioritized)

| Priority | Fix | Files | Effort |
|----------|-----|-------|--------|
| P0 | Add dark mode support to ShopDashboardPage (replace inline styles with Tailwind) | ShopDashboardPage | L |
| P0 | Add dark-aware colors to Recharts (CartesianGrid, axis ticks, tooltips) | AdvancedCharts | M |
| P0 | Add dark mode classes to Financial/Quote/Profitability pages | 3 files | M |
| P0 | Add redundant encoding for color-blind: icons/patterns/text alongside red/green | All 6 files | M |
| P1 | Replace PowerChart 2-bar with bullet chart or gauge-with-threshold | AdvancedCharts | S |
| P1 | Add waterfall chart for NPV, line chart for breakeven | FinancialAnalysisPage | M |
| P1 | Add sparklines to ShopDashboardPage machine cards and tool rows | ShopDashboardPage | M |
| P1 | Fix variance bar CSS in QuoteAnalyticsPage (broken negative-direction bar) | QuoteAnalyticsPage | S |
| P1 | Unify color constants into single PRISM_CHART_COLORS import | All | S |
| P2 | Remove or lighten CartesianGrid (reduce to `stroke="#f1f5f9"` or remove) | AdvancedCharts | S |
| P2 | Parameterize Ra target value in SurfaceFinishChart | AdvancedCharts | S |
| P2 | Add ARIA labels to all SVG chart elements | All charts | S |
| P2 | Consolidate duplicate Sparkline into one canonical component | charts/ | S |
| P3 | Add cost forecast line chart with trend overlay | JobProfitabilityPage | M |
| P3 | Replace OEE ring gauges with compact horizontal bars | ShopDashboardPage | S |
| P3 | Lift ComparisonView 4-entry limit, use small-multiples grid | ComparisonView | M |

**Effort key**: S = small (< 1hr), M = medium (1-4hr), L = large (4-8hr)

---

## MACHINIST READABILITY VERDICT

**Would a machinist understand these charts without training?**

**AdvancedCharts**: Yes. The Taylor curve and Ra-vs-feed charts use standard machining terminology (m/min, mm/tooth, Ra in um). The reference lines for "Current" operating point are immediately actionable. A machinist who has seen a Sandvik catalog will recognize these curves.

**ComparisonView**: Yes. Side-by-side parameter comparison is how machinists compare insert grades in catalogs. The imperial/metric toggle is essential and correctly implemented.

**ShopDashboardPage**: Mostly yes. Machine status cards with RPM/feed/program are exactly what a shop floor monitor shows. The OEE gauges use standard manufacturing terminology. However, the OEE percentage without trend context does not tell a foreman whether things are getting better or worse -- sparklines would fix this.

**FinancialAnalysisPage**: No, not without training. NPV, IRR, and profitability index are finance concepts. A shop owner might understand breakeven but would need context for "discount rate" and "salvage value". This page needs either glossary tooltips or inline explanations. The absence of charts makes the numbers harder to interpret.

**QuoteAnalyticsPage**: Partially. "Win rate" and "variance" are somewhat intuitive, but "calibration suggestions" is abstract. The variance-by-category bar visualization (if it worked correctly) would be understandable.

**JobProfitabilityPage**: Yes for the cost breakdown and variance table -- these map to real job costing concepts machinists and shop managers use. The margin alerts are actionable. The forecast table is less intuitive without a chart.
