# PRISM v9 Web UI — Complete Rebuild Roadmap
## 10-Agent Scrutiny-Informed Plan | 120+ Findings Synthesized

### Context
PRISM v8 was a 986K-line monolithic HTML file (48.6 MB) with 1,636 functions, 1,574 DOM elements, 28 modals, and 40+ panels. It broke catastrophically because one failure cascaded through everything. The v9 modular React architecture (67 pages, 12 UI components, Tailwind v4, Vite, React 19) has routing and skeleton in place but most pages are stubs. This session already fixed all 55+ sidebar routes, expanded SFC to 13 process modes, and removed the redundant OperationSelector.

This roadmap addresses 177+ findings from 20 specialist reviewers and implements **milestone APP-MS0** from the main PRISM roadmap.

### Alignment with Main v24 Roadmap (roadmap-index.json)

This plan IS the implementation of **APP-MS0: "Product & UI Overhaul — Pricing, Features, Web App"** (12 units, status: `not_started`).

**Already-Completed Infrastructure This Plan Leverages:**
| Milestone | What It Built | How Our Plan Uses It |
|-----------|--------------|---------------------|
| **WIRE-MS0** (complete) | 285 dispatcher actions wired to UI (13 dispatchers, routes, API, types, hooks, pages) | Our pages wire to these pre-built API endpoints |
| **RT-MS0** (complete) | WebSocket infrastructure (`/ws`, 6 channels) | Command Center, Machine Live, Safety alerts wire to existing WS |
| **L8-P0-MS1** (complete) | Core REST API — 9 route modules, 42 endpoints | Our HTTP client uses these existing endpoints |
| **L8-P0-MS2** (complete) | Auth, Admin, WebSocket, OpenAPI | Auth system exists — we fix the token injection gap |
| **L8-P2-MS1** (complete) | PPG Web UI | CodeForge page enhances existing PPG |
| **L8-P2-MS2** (complete) | ERP/Business Web UI | OpsCenter/QuoteForge/BillForge enhance existing ERP pages |
| **L8-P3-MS1** (complete) | WebGL 3D Viewer | PartView page completes existing viewer with Three.js |
| **L0-P0-MS1/MS2** (complete) | 24 databases (12 core + 12 specialty) | Our data layer pulls from these via MCP dispatchers |
| **L2-P0 to P4** (complete) | 150+ engines (calc, CAD/CAM, safety, intelligence) | All SFC calculations, safety checks, process planning USE these engines |
| **L3** (complete) | 12 new dispatchers + dispatcher wiring | Our 73 dispatchers are already built and wired |

**APP-MS0 Unit → Our Sprint Mapping:**
| APP-MS0 Unit | Our Sprint | Our Phase |
|-------------|-----------|-----------|
| P0-U01: Product Catalog & Feature Registry | Sprint 0 | Foundation (add tier gating to design system) |
| P0-U02: Design System — Extract & Modernize | Sprint 0 | Foundation (haptic buttons, glass cards, brand) |
| P0-U03: App Shell — Navigation & Layout | Sprint 0 + 5-B | Foundation + sidebar dedup |
| P1-U01: Landing Page & Pricing Page | Sprint 12-B | Advanced |
| P1-U02: Dashboard — Home Page | Sprint 4-A | Shop Floor (Command Center) |
| P1-U03: Speed & Feed Calculator Page | Sprint 1-2 | SFC (PRISM Calculator) |
| P2-U01: CNC Programming Suite | Sprint 8 | CAM (CodeForge + backplot) |
| P2-U02: Quoting & Estimation Suite | Sprint 6 | Quoting (QuoteForge) |
| P2-U03: Feasibility & Process Planning | Sprint 11-B | Advanced (multi-op sequence) |
| P3-U01: Engineering Calculators Hub | Sprint 10-C | Intelligence pages |
| P3-U02: Tool & Machine Database Pages | Sprint 4-D | Shop Floor (StockVault + Tool Crib) |
| P3-U03: Settings, Account & Billing | Sprint 12-B | Advanced |

**Not-Yet-Started Milestones Our Plan Also Feeds Into:**
- **Benchmark Suite** (not_started) — our PRISM Calculator results validation feeds benchmark tests
- **Hook Event Expansion** (not_started) — our onboarding/tour system can wire to lifecycle hooks

**No Loose Ends:** Every page we build connects to an existing dispatcher, every API call hits an existing endpoint, every calculation uses an existing engine. The WIRE-MS0 phase already completed the plumbing — we're building the UI on top of proven infrastructure.

---

## Branding & Naming

### Logo Concept
**PRISM** = Precision Refracted Into Smart Manufacturing. The logo is a geometric **triangular prism** (viewed at 30° angle) with a single beam entering and splitting into 3 colored rays (Cobalt Blue → Machine Orange → Precision Green). The prism shape doubles as an abstract cutting tool insert (TNMG triangle). Clean, geometric, no gradients — works at 16px favicon and 200px header.

**Favicon:** Simplified prism triangle in cobalt blue, no rays. Renders sharp at 16×16.

### Feature Naming (Creative, Memorable, Manufacturing-Relevant)

| Old Name | New Name | Why | Lucide Icon |
|----------|----------|-----|-------------|
| SFC Calculator | **PRISM Calculator** | Brand-first, the core product | `Gauge` |
| Post Processor Generator | **CodeForge** | G-code is forged, not generated | `Terminal` |
| CAM Strategy | **PathAdvisor** | It advises on toolpath strategies | `Route` |
| Shop Dashboard | **Command Center** | Like a machine shop control room | `LayoutDashboard` |
| Jobs | **Job Tracker** | Clear action-oriented name | `ClipboardList` |
| Scheduling | **FloorPlan** | Double meaning: shop floor + planning | `CalendarClock` |
| Capacity Planning | **CapacityIQ** | Intelligence-driven | `BarChart3` |
| Inventory | **StockVault** | Secure, organized material storage | `Package` |
| Batch Planning | **BatchOptimizer** | It optimizes batch sizes | `Layers` |
| Quote Builder | **QuoteForge** | Quotes forged with physics-backed data | `Receipt` |
| Blueprint Quote | **PrintScan** | Scans prints to generate quotes | `ScanLine` |
| Quote Analytics | **WinRate** | Tracks quote win/loss rates | `Target` |
| Secondary Ops | **FinishLine** | Secondary ops finish the part | `CheckCircle2` |
| Material Pricing | **MetalMarket** | Real-time material pricing | `DollarSign` |
| Stock Optimizer | **CutPlanner** | Optimizes stock cutting layout | `Scissors` |
| Invoices | **BillForge** | Consistent "Forge" naming | `FileText` |
| Financial Analysis | **ProfitPulse** | Pulse of your financial health | `TrendingUp` |
| Job Profitability | **MarginTracker** | Tracks margins per job | `PieChart` |
| Tooling Cost | **ToolSpend** | Clear, direct | `Wrench` |
| Employees | **Crew** | Shop floor team language | `Users` |
| Shop Clock | **ClockIn** | Action-oriented | `Clock` |
| Timecards | **TimeSheet** | Industry standard term | `Timer` |
| Payroll | **PayRoll** | Keep standard, add space | `Banknote` |
| HR Compliance | **SafeTeam** | Safety + team compliance | `ShieldCheck` |
| ERP Dashboard | **OpsCenter** | Operations center | `Activity` |
| Job Planner AI | **ProcessIQ** | AI-powered process planning | `Brain` |
| What-If | **SimLab** | Simulation laboratory | `FlaskConical` |
| Machine Rates | **RateCard** | Industry term for hourly rates | `CreditCard` |
| Order Tracking | **OrderPulse** | Track orders in real-time | `Truck` |
| Customers | **ClientBook** | CRM-lite naming | `BookUser` |
| Purchasing | **BuyDesk** | Purchasing agent's desk | `ShoppingCart` |
| 3D Viewer | **PartView** | View your parts in 3D | `Box` |
| Data Management | **DataVault** | Secure data storage | `Database` |
| Safety Dashboard | **SafeGuard** | Guards safety compliance | `ShieldAlert` |
| Quality | **QualityGate** | Parts pass through quality gates | `BadgeCheck` |
| Quality Management | **InspectPro** | Professional inspection management | `Search` |
| Reports | **ReportForge** | Generate reports | `FileBarChart` |
| Exports | **ExportHub** | Central export location | `Download` |
| Post Processors | **PostStore** | Store/marketplace for posts | `Store` |
| Cost Estimator | **CostIQ** | Intelligent cost estimation | `Calculator` |
| Learning | **PRISM Academy** | Educational brand | `GraduationCap` |
| Settings | **Config** | Clean, technical | `Settings` |

### Process Mode Tab Icons (Lucide, replacing emojis)

| Mode | Lucide Icon | Reasoning |
|------|-------------|-----------|
| Mill | `Factory` | Vertical/horizontal machining center |
| Lathe | `RotateCcw` | Rotational cutting motion |
| Drilling | `ArrowDownToLine` | Plunge motion into material |
| Boring | `CircleDashed` | Opening/enlarging a bore |
| Grinding | `CircleDot` | Grinding wheel cross-section |
| Honing | `Diamond` | Precision finishing, diamond stones |
| Threading | `Cable` | Thread helix pattern |
| Broaching | `ChevronsDown` | Linear push/pull motion |
| Wire EDM | `Zap` | Electrical discharge, wire spark |
| Sinker EDM | `ZapOff` | Controlled spark erosion |
| Laser | `Crosshair` | Focused beam targeting |
| Waterjet | `Droplets` | High-pressure water stream |
| Plasma | `Flame` | Plasma arc cutting |

### Sidebar Group Names

| Old Group | New Group | Icon |
|-----------|-----------|------|
| Core | **Calculate** | `Gauge` |
| Shop | **Shop Floor** | `Factory` |
| Quoting | **QuoteForge** | `Receipt` |
| Finance | **Money** | `DollarSign` |
| HR & Payroll | **Crew** | `Users` |
| ERP | *(merge into Shop Floor / remove duplicate)* | — |
| Analysis | **Intelligence** | `Brain` |
| Viewer | *(fold into Calculate group)* | — |
| Data & Quality | **Quality** | `ShieldCheck` |
| Billing | *(fold into Money group)* | — |
| Admin | **Admin** | `Settings` |

**Result: 8 sidebar groups (down from 11), ~30 items (down from 55+)**

---

## Design Commandments (Non-Negotiable)

1. **Dark Mode Default** — App defaults to dark. ThemeToggle persists preference
2. **Text Legibility Guarantee** — Global CSS utilities:
   - `.text-safe` — `text-shadow: 0 1px 3px rgba(0,0,0,0.5), 0 0 8px rgba(0,0,0,0.3)` for text over gradients
   - `.text-crisp` — `text-shadow: 0 1px 2px rgba(0,0,0,0.8)` for labels on semi-transparent surfaces
   - Minimum font: **11px** (`text-[11px]`). Never `text-[9px]` or `text-[10px]`
   - Minimum contrast: **WCAG AA 4.5:1**. Body text on dark = `text-slate-200` minimum. Secondary = `text-slate-300`. Never `text-slate-500` for readable content
3. **Haptic-Feel Buttons** — `shadow-md` + `hover:-translate-y-px hover:shadow-lg` + `active:translate-y-0 active:shadow-sm active:scale-[0.98]` + `transition-all duration-150`
4. **4-Level Dark Elevation** — page `#0c1220` → sidebar `#111827` → cards `rgba(30,41,59,0.7) backdrop-blur` → modals `rgba(30,41,59,0.95) backdrop-blur-lg`
5. **Lucide Icons** — Replace ALL emoji icons and hand-drawn SVGs with `lucide-react`. Consistent 24px stroke, CSS-colorable
6. **Glass Morphism Cards** — `rounded-xl border border-slate-700/60 bg-slate-800/70 backdrop-blur-sm shadow-lg shadow-black/20`
7. **Brand Colors** — Industrial Cobalt primary (`#3461b8`), Machine Orange accent (`#f97316`) for CTAs and alerts

## New Dependencies

```
framer-motion          — Spring animations, layout transitions, haptic press
lucide-react           — 1500+ professional icons (replace all emojis + hand-drawn SVGs)
react-joyride          — Guided tours / onboarding walkthroughs per page
cmdk                   — Command palette (Cmd+K quick navigation)
@dnd-kit/core          — Drag-drop for tool crib, turret layout, Kanban boards
@dnd-kit/sortable      — Sortable lists (tool ordering, job priority)
```

---

## Phase 0 — Foundation (Sprint 0) ★ DO FIRST

### 0.1 Install Dependencies & Design System
**Files:** `package.json`, `web/src/index.css`
- `npm install framer-motion lucide-react react-joyride cmdk @dnd-kit/core @dnd-kit/sortable`
- Add brand color tokens (Industrial Cobalt + Machine Orange)
- Add 4-level elevation tokens
- Add `.text-safe`, `.text-crisp`, `.text-data` utility classes
- Set 11px font floor globally
- Fix all `text-slate-500` → `text-slate-300` on dark surfaces

### 0.2 UI Component Overhaul
**Files:** `web/src/components/ui/*.tsx`
- **Button.tsx** — Add shadow, hover lift, active press-down, spring transition (haptic feel)
- **Card.tsx** — Glass morphism: `backdrop-blur-sm`, visible shadow, `rounded-xl`
- **Modal.tsx** — `framer-motion` AnimatePresence enter/exit, backdrop blur
- **Tabs.tsx** — Animated sliding underline indicator
- **New: InfoTooltip.tsx** — `?` icon with hover popover for contextual help
- **New: SkeletonLoader.tsx** — Shimmer placeholder while data loads
- **New: EmptyState.tsx** — Illustration + CTA for empty pages
- **New: StatusPill.tsx** — Colored status indicators
- **New: StepWizard.tsx** — Multi-step wizard with progress bar
- **New: GuidedTour.tsx** — Wrapper around react-joyride with PRISM-themed tooltips
- **New: CommandPalette.tsx** — Cmd+K to search pages/tools/materials/machines

### 0.3 Replace ALL Emoji Icons with Lucide
**Files:** `machineModes.ts`, `AppShell.tsx`, `MachineModeTabs.tsx`
- Replace 13 emoji icons in machineModes.ts with Lucide component names
- Replace 16 hand-drawn SVG functions in AppShell.tsx (~130 lines → ~16 imports)
- Update MachineModeTabs to render Lucide icons instead of emoji strings

### 0.4 Fix Text Legibility Globally
**Files:** All components using `text-slate-500`, `text-[9px]`, `text-[10px]`
- Audit every component for contrast violations
- Bump all `text-[9px]` → `text-[11px]` minimum
- Bump all `text-slate-500` on dark → `text-slate-300` minimum
- Add `text-crisp` to labels on semi-transparent surfaces (MachineModeTabs, cards)

---

## Phase 1 — SFC Calculator Completion (Sprint 1-2)

### 1.1 Merge Machine Selection + Configuration (CRITICAL — user request + UX finding)
**File:** `web/src/components/sfc/MachinePanel.tsx` (rename from MachineConfigPanel)
- **Single unified panel** with internal tabs: Select | Configure | Features | Specs
- Move SmartMachineSelector from RIGHT column INTO this panel's "Select" tab
- "Configure" tab: Controller, spindle, ATC
- "Features" tab: Checkboxes (4th axis, 5th axis, live tooling, TSC, probing, bar feeder)
- "Specs" tab: Read-only envelope display (X/Y/Z travel, RPM, power, torque)
- Machine selection and configuration are now ONE panel in the LEFT column

### 1.2 Safety Guards (CRITICAL — machinist findings)
**Files:** `SfcCalculatorPage.tsx`, new `web/src/utils/sfcValidation.ts`
- Material-aware coolant validation: Flag hardened steel (ISO H) + flood coolant, cast iron + flood
- Parameter ceiling guards: DOC < 3xD for milling, WOC ≤ tool diameter
- Chip load pre-validation before Calculate
- L/D ratio warning for drilling (>3x = peck recommended, >5x = TSC required)
- RPM sanity check even without machine selected (>20K = warning, >40K = error)
- Slot milling WOC = tool diameter warning

### 1.3 Results Display Enhancement (HIGH — machinist finding)
**File:** `web/src/components/sfc/ResultsDisplay.tsx`
- Add: Cutting force (N), Torque (Nm), Power (kW), MRR (cm³/min)
- Add: Deflection estimate (using tool diameter + stickout from holder)
- Color-code results: Green = safe, Yellow = caution, Red = exceeds limits
- Format numbers properly (not raw decimals)

### 1.4 Missing Operations (HIGH — machinist finding)
**Files:** `operations.ts`, `machineModes.ts`
- Add: Shoulder milling, helical ramping, plunge milling, chamfering
- Add: Lathe threading (under lathe mode), knurling, taper turning, ID grooving
- Add: Counterboring, countersinking
- Move Threading from "finishing" group to "chip_removal" group
- Material-aware coolant defaults (hardened steel → dry, cast iron → air blast)

### 1.5 Center Column Restructure (HIGH — UX finding)
**File:** `SfcCalculatorPage.tsx`
- Move Calculate button higher (sticky or immediately below parameters)
- Collapse CamSoftwareSelector + CuttingPriority into compact single-row controls
- Add sub-operation pill label ("Operation:" prefix)
- Add progress indicator showing required fields status
- Surface Imperial/Metric toggle as global control near page header

### 1.6 Non-Traditional Mode Params (HIGH — UX finding)
**Files:** `ParameterPanel.tsx` or new mode-specific param components
- Wire EDM: wire diameter, wire speed, tension, flush pressure, on/off time
- Sinker EDM: voltage, pulse duration, gap, electrode material
- Laser: power, speed, focus, assist gas, frequency
- Waterjet: pressure, abrasive flow, nozzle diameter, standoff
- Plasma: amperage, speed, pierce height, gas type

### 1.7 Performance Fixes (MEDIUM — perf findings)
- Add `React.memo` to 6 key SFC child components
- Refactor AdvancedCharts to accept `toolDiameter` instead of full `params`
- Defer localStorage writes with `requestIdleCallback`
- Dynamic-import `generateSfcReport` (jsPDF 300KB) on PDF button click

---

## Phase 2 — Onboarding & New User Experience (Sprint 3)

### 2.1 Post-Registration Onboarding Wizard (CRITICAL)
**Files:** New `web/src/pages/OnboardingPage.tsx`, `web/src/contexts/OnboardingContext.tsx`
- Step 1: Welcome → Role select (Machinist / Programmer / Shop Owner / Student)
- Step 2: Experience level (Beginner / Journeyman / Master)
- Step 3: Quick shop setup (add 1-3 machines, select common materials)
- Step 4: "Your dashboard is ready" → route to role-appropriate page
- Store completion in localStorage. Show wizard on first visit.
- Add `/onboarding` route in App.tsx

### 2.2 Experience Level System
**Files:** `OnboardingContext.tsx`, `SfcCalculatorPage.tsx`
- Beginner: Hide CAM, toolpath strategy, tool holder, insert, fixture. Show 5 essential fields only
- Journeyman: Standard 10-field view with tooltips
- Master: All panels visible, no guardrails, compact layout
- Toggle in sidebar or header. Persisted per user.

### 2.3 Guided Tours
**Files:** New `web/src/components/shared/PageTour.tsx`
- SFC Calculator tour: 8 steps highlighting mode tabs → material → calculate → results
- Shop Dashboard tour: KPIs → machine status → recent jobs
- Quote Builder tour: customer → part → calculate → generate
- `?` button on each page header triggers the tour

### 2.4 Contextual Help Tooltips
**Files:** All SFC components, using new `InfoTooltip.tsx`
- Add `?` icon with 1-sentence explanation to every selector/input
- Examples: "Cutting Priority: Optimize for fastest cycle time, best surface finish, or balanced"
- "Toolpath Strategy: How the cutter moves through material. Affects depth, width, and feed."

### 2.5 Sidebar Improvements
**File:** `AppShell.tsx`
- Collapse non-essential groups by default for new users
- Add "New" badges on unvisited pages
- Add onboarding progress ring at top ("Shop Setup 2/5")
- Add Cmd+K trigger button
- Role-based highlighting (dim irrelevant sections)

---

## Phase 3 — Shop Management Pages (Sprint 4-5)

### 3.1 Shop Dashboard — Full Rebuild
**File:** `web/src/pages/ShopDashboardPage.tsx`
- **Top row:** Animated KPI cards (active jobs, machines running, utilization %, revenue today)
- **Center:** Machine status grid (card per machine: idle/running/alarm with live colors)
- **Bottom:** Recent jobs timeline, upcoming deadlines, alerts panel
- Wire to `prism_business` dispatcher

### 3.2 Jobs Page — Kanban + State Machine (CRITICAL — shop owner findings)
**File:** `web/src/pages/JobsPage.tsx`
- Kanban board: Quote → Scheduled → In Progress → QC → Complete → Shipped
- Drag-drop cards between columns (@dnd-kit)
- **Enforce state machine** — no skipping steps
- Job cards: part name, customer, PO#, due date, progress bar, machine assigned
- Click → Job detail drawer with multi-operation routing (Op 10, Op 20, etc.)
- "Convert Quote to Job" button
- "Invoice This Job" button on completed jobs
- Job traveler/work order print view

### 3.3 Scheduling — Practical, Not Academic (HIGH — shop owner finding)
**File:** `web/src/pages/SchedulingPage.tsx`
- Gantt chart view (machine rows, job blocks)
- Drag to reschedule, resize to adjust
- Rename: "Johnson's Rule" → "2-Machine Optimizer", "WSPT" → "Priority Scheduler"
- Use REAL job data from Jobs page, not hardcoded samples
- Capacity heatmap overlay

### 3.4 Inventory + Tool Crib (HIGH — machinist finding)
**Files:** `web/src/pages/InventoryPage.tsx`, new `web/src/components/shared/ToolCribModal.tsx`
- Tabs: Raw Material | Cutting Tools | Holders | Fixtures | Consumables
- "My Tools" concept — tools the shop owns vs. full catalog
- Tool crib modal: ATC magazine populator with drag-drop slot assignment
- Low-stock alerts, reorder points
- Tool life tracking (hours used / remaining)
- Batch import from purchase orders (CSV)

---

## Phase 4 — Quoting & Finance (Sprint 6-7)

### 4.1 Quote Builder — Production-Ready (CRITICAL — shop owner findings)
**File:** `web/src/pages/QuoteBuilderPage.tsx`
- **Material/Operation as searchable dropdowns** (not free text)
- Customer field (required)
- Quote number auto-generated, persistent, revisioned
- Multi-operation quotes (line items)
- Outside processing (heat treat, plating, anodize)
- Cost breakdown: Material + Machining + Tooling + Setup + Overhead + Margin
- **"Convert to Job" button**
- **PDF export** with letterhead, terms, validity date (not JSON)

### 4.2 Financial Dashboard (CRITICAL — shop owner finding)
**File:** New `web/src/pages/FinancialDashboardPage.tsx` (or enhance FinancialAnalysisPage)
- Revenue this month (chart)
- AR aging: 0-30, 31-60, 61-90, 90+ day buckets
- Margin trend (rolling 12 months)
- Overdue invoices list
- P&L summary (revenue, COGS, gross profit, overhead, net)
- Cash flow forecast

### 4.3 Invoice Page Enhancement
- "Invoice This Job" flow from Jobs page
- Tax calculation
- Payment terms from customer record
- PDF export with line items

### 4.4 De-duplicate Shop vs ERP (CRITICAL — shop owner finding)
**File:** `AppShell.tsx`
- Remove duplicate ERP section or clearly differentiate
- Consolidate: "Shop > Jobs" and "ERP > Job Planner" into one
- Consolidate: "Shop > Scheduling" and "ERP > Schedule" into one
- Reduce sidebar from 50+ to ~25 items

---

## Phase 5 — CAM & Post Processor (Sprint 8)

### 5.1 Retire/Merge CamStrategyPage (CRITICAL — CAM finding)
- Merge unique CamStrategyPage features into SFC Calculator
- Remove duplicate hardcoded data (it has its own materials/operations separate from SFC)

### 5.2 Expand CAM Software List
**File:** `web/src/data/camSoftware.ts`
- Add: NX CAM, PowerMill, hyperMILL, CATIA, Edgecam, ESPRIT, CAMWorks, BobCAD, Cimatron, GibbsCAM
- Fix outdated license tiers (Mastercam 2024+, Fusion personal)
- Make feed multiplier vary by strategy, not just software tier

### 5.3 Missing Toolpath Strategies
**File:** `web/src/data/toolpathStrategies.ts`
- Add: rest machining, parallel/raster finishing, high-feed milling, helical interpolation, thread milling, slot milling, spiral finishing, flowline
- Fix trochoidal speedMultiplier (1.15 is dangerous in stainless/titanium → make material-aware)

### 5.4 G-Code Backplot Viewer
**File:** New `web/src/components/shared/GCodeBackplot.tsx`
- Parse G-code to XYZ segments
- Render on canvas: rapids in red, cutting in blue, per-tool colors
- XY, XZ, YZ view toggles

### 5.5 Tool Library Import/Export (HIGH — CAM finding)
- Import from: Mastercam .mcam-tooldb, Fusion 360 tool library, generic CSV
- Export to same formats
- Bridge between "My Shop Tools" and SFC Calculator

---

## Phase 6 — HR, Quality, Viewer & Analysis (Sprint 9-10)

### 6.1 HR Pages (5 pages)
- Employee directory with skill matrix
- Shop floor clock-in/out
- Timecard approval → **auto-feed into job costing**
- Payroll calculation (hours × rate × burden)
- HR compliance checklist

### 6.2 Quality Pages
- SPC charts with Cpk gauges
- Inspection planning → CMM routine generation
- First article inspection tracking
- NCR/RMA tracking tied to jobs

### 6.3 3D Viewer (install `three` + `@react-three/fiber`)
- STEP/STL import and rendering
- View controls: 3D / Top / Front / Side / Iso / Wireframe
- Stock vs. finished part overlay
- Collision zone highlighting

### 6.4 Analysis Pages
- What-If: Parameter sliders with instant preview
- Machine Rates: Configure $/hr per machine with burden/overhead
- Customers: CRM-lite tied to quoting/invoicing
- Order Tracking: Customer order status timeline

---

## Phase 7 — Advanced Features (Sprint 11-12)

### 7.1 Turret Layout Visualizer
- Interactive SVG turret disc (12 stations)
- Click slot to assign tool from tool crib
- Color-coded: occupied/active/empty

### 7.2 Workholding & Stability Panel
- Fixture selector with stability meter gauge (0-100%)
- Cutting force arrows overlay
- Clamping force calculator
- **Feed stability results back into SFC calculation**

### 7.3 Blueprint Import with OCR
- Drag-drop PDF zone
- Dimension extraction with confidence scores
- Auto-redact option
- "Send to Quote" / "Send to SFC" buttons

### 7.4 Command Palette (Cmd+K)
- Search: pages, machines, materials, tools, jobs, customers
- Quick actions: "New Quote", "Calculate S&F", "Add Machine"
- Recent items

### 7.5 Multi-Operation Sequence Planning
- Operation sheet builder (Op 10 → Op 20 → Op 30...)
- Aggregate cycle time + tool list
- Setup sheet PDF generation
- G-code export per operation

---

## Phase 10 — Pricing & Tier System (Sprint 16)

### 10.1 Modular Pricing Architecture (Base Tier + À La Carte Add-Ons)

Instead of forcing users into rigid 5-tier buckets where they pay for features they don't need, PRISM uses a **3 base tiers + modular add-on** model. Users pick a base, then customize with add-ons from any tier.

**3 Base Tiers:**

| Tier | Price | Audience | Core Access |
|------|-------|----------|-------------|
| **Starter** (Free) | $0/mo | Students, hobbyists, evaluators | PRISM Calculator (10 calcs/day), 100 materials, 500 tools, PRISM Academy |
| **Pro** | $79/mo | Individual machinists & programmers | Unlimited calcs, full material/tool/machine DB, CodeForge (5 posts/mo), basic QuoteForge |
| **Shop** | $299/mo | Job shops (multi-user) | Everything in Pro + 5 seats, Command Center, Job Tracker, FloorPlan, BillForge, InspectPro |

**À La Carte Add-Ons (mix & match from any tier):**

| Add-On | Price | What You Get |
|--------|-------|-------------|
| **CodeForge Unlimited** | +$49/mo | Unlimited post processor generation, 20 controller dialects, G-code backplot |
| **QuoteForge Pro** | +$49/mo | Multi-op quoting, blueprint OCR, price breaks, PDF export, quote-to-job conversion |
| **PathAdvisor** | +$39/mo | CAM toolpath strategy engine, 12+ CAM software integration, feed multipliers |
| **PartView 3D** | +$39/mo | STEP/STL 3D viewer, collision detection, stock-vs-finish overlay |
| **ProcessIQ** | +$49/mo | AI job planning, multi-op sequencing, feasibility checks, setup optimization |
| **Engineering Suite** | +$79/mo | 51 mechanical design calcs, thermal/fluid, vibration/stability, gear calculators |
| **Quality Pack** | +$59/mo | SPC charts, FAI (AS9102), NCR/CAPA, calibration tracking, CoC generator |
| **Real-Time Pack** | +$99/mo | WebSocket machine monitoring, live alerts, OEE dashboards, predictive maintenance |
| **Compliance Pack** | +$99/mo | AS9100, ITAR flagging, audit trails, serial/lot tracking, revision control |
| **Extra Seats** | +$29/seat/mo | Additional user seats beyond base tier allocation |
| **API Access** | +$49/mo | REST API access for integrations (ERP sync, CAM tool library, MES) |

**Why This Works:**
- A **solo machinist** buys Pro ($79) + CodeForge ($49) = $128/mo — gets exactly what they need
- A **CAM programmer** buys Pro ($79) + PathAdvisor ($39) + CodeForge ($49) = $167/mo
- A **job shop owner** buys Shop ($299) + QuoteForge Pro ($49) + Quality Pack ($59) = $407/mo
- An **aerospace shop** buys Shop ($299) + Quality ($59) + Compliance ($99) + Real-Time ($99) = $556/mo
- A **student** uses Starter (free) + PRISM Academy — $0

**Enterprise ($custom):** For shops needing 20+ seats, SSO, dedicated support, custom integrations, on-premise option — contact sales.

### 10.2 Feature Gating UI
- Locked features show a **frosted glass overlay** with the add-on name and price
- "Unlock [Add-On Name]" button opens a compact purchase drawer (not a full page redirect)
- **No annoying modals** — locked features are visible but dimmed, users can still see what they'd get
- Sidebar shows **tier badge** next to user avatar
- Add-on badges next to features that require them (small pill: "Pro" / "CodeForge" / "Quality")
- Settings page has "My Plan" tab showing current tier + active add-ons + usage stats

### 10.3 Annual Pricing
- **20% discount** for annual commitment on all tiers and add-ons
- Toggle on pricing page: Monthly / Annual (shows both prices)
- Annual saves show explicit dollar amount: "Save $190/year"

### 10.4 Free Trial Strategy
- **14-day unrestricted access** to ALL features on signup (no CC required)
- After 14 days: graceful downgrade to Starter tier
- "Your trial is ending in X days" banner (not modal) at day 10
- Trial users see a "What you'll lose" summary showing their actual usage during trial
- One-click upgrade preserves all data and configurations

---

## Phase 8 — Aerospace & Compliance (Sprint 13-14)

### 8.1 AS9100 Compliance (CRITICAL — aerospace audit)
- Add AS9100D, AS9102, AS9103, NADCAP to compliance standards
- Serial/lot/batch number system with full trace chain
- Rebuild FAI to AS9102 three-form structure (Form 1: Part Accountability, Form 2: Product Accountability, Form 3: Characteristic Accountability)
- CAPA lifecycle on NCR: root cause → corrective action → MRB approval → verification → closure
- Immutable audit trail on all quality records (who/what/when/old/new)

### 8.2 Calibration Enhancement
- Add: cert number, NIST-traceable standards, as-found/as-left readings, OOT impact assessment
- Gage R&R / MSA support
- Accredited cal lab tracking (A2LA/NVLAP)

### 8.3 Receiving Inspection
- Incoming inspection for raw material and outsourced process returns
- Accept/reject with linkage to PO, supplier, material cert

### 8.4 Certificate of Conformance Generator
- CoC PDF with part info, material cert reference, inspection results, special process certs

### 8.5 ITAR/Export Control (if needed)
- Flag ITAR-controlled parts, restrict access to US Persons
- Country-of-origin tracking, CMMC/NIST 800-171

---

## Phase 9 — Infrastructure Fixes (Sprint 15)

### 9.1 Unified HTTP Client (CRITICAL — API finding)
- Create single `web/src/api/httpClient.ts` with auth token injection, error handling, timeout
- Refactor all 35 API modules to use it
- Add 401 interceptor for token refresh

### 9.2 Shared useApi Hook (HIGH — API finding)
- Extract `useApiCall` from 28 duplicate copies into `web/src/hooks/useApi.ts`
- Consider adopting TanStack Query for caching/deduplication

### 9.3 Fix Auth Token Gap (CRITICAL — security)
- Ensure ALL 35 API modules send `Authorization: Bearer` token
- Add global 401 interceptor

### 9.4 Data Layer Strategy
- Static `web/src/data/` files become fallbacks for offline/demo mode
- Primary data comes from MCP server via API
- "My Shop" filter: user's machines/tools/materials shown first, full catalog available

### 9.5 WebSocket Wiring
- Use existing `useWebSocket.ts` hook (already well-built)
- Wire to: ShopDashboard (machine status), MachineLive, Safety alerts
- Replace ErpContext's separate WebSocket with shared hook

### 9.6 Dark Mode Fix for Chart Pages
- Replace all hardcoded `bg-white`/`style={{ background: '#fff' }}` with Tailwind dark variants
- Add dark-aware Recharts colors (grid, ticks, tooltips)
- Color-blind safe palette with redundant encoding (icons + text labels alongside color)

---

## PRISM Academy — Complete Zero-to-Master Curriculum

### Context
The existing 15-course academy covers fundamentals but falls far short of comprehensive machinist training. Industry leaders show what comprehensive looks like: **Sandvik Coromant Academy** has 9 chapters / 75 courses (16-24h) covering metalcutting theory through toolholding. **Titans of CNC Academy** uses project-based learning with progressive series (M101→M401 mill, L101→L401 lathe) plus specialized academies (Swiss, Grinding, Aerospace). **NIMS** offers 20 machining credentials across 2 levels. **Tooling U-SME** has 500+ classes across all manufacturing disciplines. **Haas CNC Certification** pairs online learning with hands-on testing.

PRISM has the assets to surpass all of them: 150+ calculation engines, 2,957 materials, 910 machines, 86K+ tools, 3,700 tribal tips from 18 CAM systems, 296 playbook rules — no other platform can offer interactive Kienzle force calculations or real tribal knowledge search during lessons. The goal: **turn any random person into a master machinist** through a comprehensive, logically-flowing curriculum.

### Inspiration & Flow Design

| Source | Key Insight Adopted |
|--------|-------------------|
| **Sandvik** | Theory-first chapters organized by operation type (turning, milling, drilling, boring, threading, toolholding) |
| **Titans of CNC** | Project-based learning — every level builds real artifacts. Skill stacking through repetition + progressive complexity |
| **NIMS** | Credential-aligned levels. Written + hands-on assessment at each checkpoint |
| **Tooling U-SME** | Competency-based pathways. Math → Blueprint → GD&T → Workholding → Metalcutting → CNC → Controller-specific |
| **Haas** | Online theory + practical exercises. CAD → CAM → CNC pipeline per course |

### Architecture: 6 Levels, 108 Core Courses, 7 Specialization Tracks

| Level | Name | Career Target | Courses | Hours | Certification |
|-------|------|---------------|---------|-------|---------------|
| **L0** | Foundations | Pre-employment | 8 | ~52h | PRISM Foundational (≥70%) |
| **L1** | Operator | CNC Operator | 10 | ~70h | PRISM Certified Operator (≥75%) |
| **L2** | Programmer | CNC Programmer | 12 | ~84h | PRISM Certified Programmer (≥80%) |
| **L3** | Specialist | Lead Programmer | 14 core | ~90h | PRISM Specialist (≥85%) + track cert |
| **L4** | Expert | Mfg. Engineer | 8 | ~60h | PRISM Expert (≥88%) |
| **L5** | Master | Shop Manager | 6 | ~44h | PRISM Certified Master (≥90%) |
| | **Tracks** | Specialization | 50 | ~300h | Track-specific certs |

**Grand Total: 108 core + 50 track courses = 158 courses, ~700 hours**

---

### LEVEL 0: FOUNDATIONS (8 courses, ~52h)
*Zero experience required. Covers everything before touching a machine.*

| ID | Title | Mod | Hr | Key Topics | PRISM Engine |
|----|-------|-----|-----|------------|-------------|
| `L0-01` | Shop Math for Machinists | 8 | 6 | Decimals, fractions, metric, trig, geometry | SFC Calculator *(existing course-0a)* |
| `L0-02` | Hand Tools & Measurement | 10 | 8 | Calipers, micrometers, indicators, gauge blocks | MeasurementIntegrationEngine *(existing course-0b)* |
| `L0-03` | Blueprint Reading & GD&T | 12 | 10 | Orthographic views, dims, tolerances, GD&T FCFs | GDTStackupEngine, CAD Drawing KB *(existing course-0c)* |
| `L0-04` | Materials & Metallurgy Basics | 8 | 6 | Iron vs steel vs aluminum, hardness, heat treat intro, ISO 513 | MaterialDatabaseEngine (2,957 materials) |
| `L0-05` | Shop Safety & Hazard Recognition | 6 | 4 | PPE, machine guarding, chip hazards, coolant, LOTO | SafetyValidationEngine |
| `L0-06` | Introduction to CNC Machines | 8 | 6 | Machine types (VMC/HMC/lathe/Swiss/grinder), axes, controllers | MachineDatabase (910 machines) |
| `L0-07` | Cutting Tools — Types & Anatomy | 8 | 6 | End mills, drills, inserts, holders, coatings, ISO designation | ToolDatabase (86K+ tools) |
| `L0-08` | Workholding Fundamentals | 6 | 6 | Vises, chucks, collets, fixtures, 3-2-1 datum principle | FixtureDesignEngine, ChuckJawForceEngine |

**Checkpoint:** 80-question exam + read a real engineering drawing, identify all features/tolerances/materials.

### LEVEL 1: OPERATOR (10 courses, ~70h)
*Hands-on machine operation. Student can set up, run, and monitor CNC machines.*

| ID | Title | Mod | Hr | Key Topics | PRISM Engine |
|----|-------|-----|-----|------------|-------------|
| `L1-01` | CNC Machine Setup | 8 | 8 | Work offsets (G54-G59), tool length comp (G43), touch-off, first article | MachineSetupEngine |
| `L1-02` | Speeds & Feeds — The Foundation | 10 | 8 | RPM formula, chip load, SFM, table feed, chip thinning | AutoSpeedFeedEngine, SFC Calculator |
| `L1-03` | G-Code Programming I — Motion | 10 | 8 | G00/G01/G02/G03, G90/G91, G28, coordinate systems | GCodeValidationEngine |
| `L1-04` | G-Code Programming II — Cycles | 8 | 6 | Canned drilling (G73/G81/G83), tapping (G84), boring (G76/G85/G86) | GCodeSafetyAnalyzerEngine |
| `L1-05` | Basic Milling Operations | 10 | 8 | Face milling, pocketing, slotting, contouring, drilling | AdvancedMillingStrategiesEngine |
| `L1-06` | Basic Turning Operations | 10 | 8 | OD roughing, finishing, facing, grooving, threading basics | SinglePointThreadEngine |
| `L1-07` | Coolant & Chip Management | 6 | 4 | Coolant types, concentration, TSC, air blast, chip evacuation | CoolantStrategyEngine |
| `L1-08` | Quality & Inspection Basics | 8 | 6 | First article, in-process checks, go/no-go gauges, SPC intro | ProcessCapabilityPredictionEngine |
| `L1-09` | Troubleshooting Basics | 8 | 8 | Chatter, poor finish, tool breakage, dimensional errors | TroubleshootingAssistantEngine |
| `L1-10` | CNC Safety & Emergency Procedures | 6 | 6 | E-stop, alarm response, tool crash recovery, servo errors | AlarmDiagnosticsEngine |

**Checkpoint:** 100-question exam + 5 calculation exercises. **Project:** Write complete G-code for a 2.5D part with calculated speeds/feeds. NIMS alignment: CNC Mill Operator L1 + CNC Lathe Operator L1.

### LEVEL 2: PROGRAMMER (12 courses, ~84h)
*Deep cutting physics, CAM programming, advanced operations.*

| ID | Title | Mod | Hr | Key Topics | PRISM Engine |
|----|-------|-----|-----|------------|-------------|
| `L2-01` | Cutting Physics — Kienzle & Taylor | 10 | 8 | Kienzle force model, Taylor tool life, specific cutting force, power | CuttingForceEngine, ToolLifeEngine |
| `L2-02` | Advanced Milling | 12 | 10 | HSM/adaptive, rest machining, 3D surfacing, thread milling | AdaptiveEngagementEngine |
| `L2-03` | Advanced Turning | 10 | 8 | Complex profiles, boring, live tooling, sub-spindle, part-off | BoreFinishingEngine |
| `L2-04` | Drilling & Holemaking | 8 | 6 | Peck cycles, deep hole, gun drilling, reaming, counterboring | DeepHoleDrillingPhysicsEngine, TapDrillEngine |
| `L2-05` | Threading Mastery | 8 | 6 | Single-point, thread milling, tapping, measurement, standards | ThreadCalculationEngine, TappingTorqueEngine |
| `L2-06` | CAM Programming I — Setup & Strategy | 10 | 8 | CAM workflow, stock def, WCS, toolpath strategy, simulation | CAMKernelEngine |
| `L2-07` | CAM Programming II — Toolpath Mastery | 10 | 8 | Adaptive clearing, rest, pencil, scallop, flowline, morphed | AdaptiveToolpathRouterEngine |
| `L2-08` | Post Processing & Machine Dialect | 8 | 6 | Post anatomy, Fanuc/Haas/Siemens/Heidenhain dialect | AdvancedPostProcessorEngine |
| `L2-09` | Fixture Design & Workholding | 8 | 6 | Fixture plates, custom jigs, modular, FEA clamping, 3-2-1 | FixtureDesignEngine, FixtureDynamicsEngine |
| `L2-10` | Surface Finish Science | 8 | 6 | Ra/Rz theory, cusp height, feed marks, burnishing | SurfaceFinishEngine |
| `L2-11` | Tool Deflection & Vibration | 8 | 6 | Beam model, deflection limits, stability lobes, chatter | DeflectionEngine, ChatterStabilityLobeEngine |
| `L2-12` | Material-Specific Strategies | 8 | 6 | Strategy per ISO 513 group (P/M/K/N/S/H) | MaterialDatabaseEngine, SuperalloyMachiningEngine |

**Checkpoint:** 120-question exam + 10 calculation exercises + 2 troubleshooting trees. **Project:** Full multi-op CAM project (rough/semi/finish/drill/tap), generate post, validate G-code. NIMS alignment: CNC Mill Programming + CNC Lathe Programming.

### LEVEL 3: SPECIALIST — CORE (14 courses, ~90h)
*Advanced topics every specialist needs regardless of track.*

| ID | Title | Mod | Hr | PRISM Engine |
|----|-------|-----|-----|-------------|
| `L3-01` | 5-Axis Fundamentals | 8 | 8 | FiveAxisPostEngine, MultiAxisKinematicEngine |
| `L3-02` | Process Optimization — DOE & SPC | 8 | 8 | StochasticCuttingForceEngine, LeanSixSigmaEngine |
| `L3-03` | Thermal Effects in Machining | 6 | 4 | CuttingThermalEngine, ThermalCompensationEngine |
| `L3-04` | Tool Wear — Prediction & Management | 8 | 6 | BayesianToolLifeEngine, AdvancedWearPhysicsEngine |
| `L3-05` | Advanced Troubleshooting | 10 | 8 | AlarmDiagnosticsEngine, VibrationAnalysisEngine |
| `L3-06` | Machine Maintenance & Calibration | 8 | 6 | LaserInterferometerCompensationEngine |
| `L3-07` | Advanced GD&T & Inspection | 8 | 6 | GDTStackupEngine, CMMPathPlanningEngine |
| `L3-08` | Shop Economics & Quoting | 6 | 5 | QuoteEstimatorEngine, ActualCostEngine |
| `L3-09` | Multi-Operation Process Planning | 8 | 6 | AcoSequencerEngine, MillTurnSwissPipelineEngine |
| `L3-10` | Secondary Operations | 8 | 6 | DeburringEngine, BroachingEngine, KnurlingEngine |
| `L3-11` | Heat Treatment for Machinists | 6 | 4 | CarburizingEngine, AnodizingProcessEngine |
| `L3-12` | Fastener & Assembly Knowledge | 6 | 4 | AssemblyEngine, SplineJointEngine |
| `L3-13` | Programming with Macros & Variables | 8 | 8 | GCodeTemplateEngine |
| `L3-14` | Lean Manufacturing for Machinists | 6 | 6 | LeanSixSigmaEngine |

**Checkpoint:** All L0-L3 core + at least ONE specialization track completed, ≥85%. NIMS alignment: Level 2 credentials.

### LEVEL 4: EXPERT (8 courses, ~60h)
*Engineering-level. Can optimize entire production cells.*

| ID | Title | Mod | Hr | PRISM Engine |
|----|-------|-----|-----|-------------|
| `L4-01` | Monte Carlo & Stochastic Analysis | 8 | 8 | StochasticCuttingForceEngine |
| `L4-02` | Energy & Sustainability Optimization | 6 | 6 | GCodeEnergyOptimizerEngine |
| `L4-03` | Vibration Physics & Modal Analysis | 8 | 8 | VibrationPhysicsEngine |
| `L4-04` | Advanced Material Science | 8 | 8 | MicrostructureEffectEngine |
| `L4-05` | Digital Twin & Simulation | 8 | 8 | CNCSimulationPipelineEngine |
| `L4-06` | Automation & Robotics Integration | 8 | 6 | (content-based, no engine) |
| `L4-07` | Advanced Quality Systems | 8 | 8 | AMSAAReliabilityGrowthEngine |
| `L4-08` | Production Cell Optimization | 8 | 8 | AdaptivePipelineGeneratorEngine |

**Checkpoint:** 150-question exam + Monte Carlo simulation exercise + optimization case study. Requires 2+ specialization tracks.

### LEVEL 5: MASTER (6 courses, ~44h)
*Leadership, teaching, and industry mastery.*

| ID | Title | Mod | Hr | PRISM Engine |
|----|-------|-----|-----|-------------|
| `L5-01` | Process Engineering & FMEA | 8 | 8 | LeanSixSigmaEngine |
| `L5-02` | Teaching & Mentorship | 6 | 6 | ApprenticeEngine |
| `L5-03` | Advanced Shop Economics | 8 | 8 | CostEstimationEngine, ROIAdvisorEngine |
| `L5-04` | Continuous Improvement & Kaizen | 6 | 6 | LeanSixSigmaEngine |
| `L5-05` | Industry Standards & Compliance | 8 | 8 | ComplianceEngine, AuditEngine |
| `L5-06` | Career Mastery & Professional Dev | 6 | 8 | (career content) |

**Capstone:** Optimize a complete production process (quoting → delivery), documented with PRISM tools. Requires ALL core + 3 tracks, ≥90%.

---

### SPECIALIZATION TRACKS (Branch after L2, parallel with L3-L5)

#### Track A: Advanced Milling & 5-Axis (8 courses, ~56h)
| ID | Title | Hr | Engine |
|----|-------|----|--------|
| `TA-01` | 5-Axis Simultaneous | 8 | MultiaxisToolpathEngine, FiveAxisPostEngine |
| `TA-02` | Impeller & Turbomachinery | 8 | FiveAxisToolpathIntegrationEngine |
| `TA-03` | Mold & Die Machining | 8 | CAMKernelExtensionEngine, ElectrodeDesignEngine |
| `TA-04` | High-Speed Machining (HSM) | 6 | HighFeedMillingEngine, AdaptiveFeedControlEngine |
| `TA-05` | Barrel Cutter & Advanced Tools | 4 | BallEndMillEngine, PlungeMillingEngine |
| `TA-06` | Large Part Machining | 6 | AccessibilityAnalysisEngine |
| `TA-07` | Micro-Machining | 6 | MicroMachiningEngine |
| `TA-08` | 5-Axis Post Processors Deep Dive | 6 | FiveAxisPostEngine, HybridPostMergeEngine |

#### Track B: Turning & Mill-Turn (6 courses, ~40h)
| ID | Title | Hr | Engine |
|----|-------|----|--------|
| `TB-01` | Advanced Turning Strategies | 8 | DiamondTurningEngine, TaperTurningEngine |
| `TB-02` | Swiss-Type Machining | 8 | MillTurnSwissPipelineEngine, BarFeederEngine |
| `TB-03` | Mill-Turn / Multi-Task | 8 | MillTurnSwissPipelineEngine |
| `TB-04` | Hard Turning (>50 HRC) | 4 | SuperalloyMachiningEngine |
| `TB-05` | Lathe Post Processing | 6 | LathePostProcessorEngine |
| `TB-06` | Sub-Spindle & Y-Axis Programming | 6 | CNCProgramAssemblerEngine |

#### Track C: CAM System Deep Dives (18 courses, ~108h)
*One per CAM system. Uses 3,700 tribal tips via TribalKnowledgeEngine + CamKnowledgePortabilityEngine.*

Each course: 8 modules — (1) Interface & Philosophy, (2) Stock/Setup, (3) 2D Ops, (4) 3D Ops, (5) Drilling/Hole, (6) Advanced Strategies, (7) Post Processing, (8) Tribal Tips & Troubleshooting.

| ID | CAM System | Tips | Specialty |
|----|-----------|------|-----------|
| `TC-MC` | Mastercam | 261 | Dynamic Motion, OptiRough, Mill-Turn |
| `TC-EC` | Edgecam | 221 | Turning, mill-turn integration |
| `TC-HM` | hyperMILL | 200 | MAXX Machining, barrel cutters, 5-axis |
| `TC-F3` | Fusion 360 | 200 | Adaptive clearing, cloud CAM, API |
| `TC-SC` | SolidCAM | 200 | iMachining, SolidWorks integration |
| `TC-NX` | Siemens NX | 200 | Adaptive milling, aerospace |
| `TC-PM` | PowerMill | 200 | 5-axis finishing, large molds/dies |
| `TC-ES` | ESPRIT | 208 | Multi-channel, Swiss-type |
| `TC-CW` | CAMWorks | 201 | Feature-based, auto recognition |
| `TC-TS` | TopSolid | 201 | Integrated CAD/CAM, mold design |
| `TC-WN` | WorkNC | 201 | Automatic 3-5 axis, mold machining |
| `TC-GC` | GibbsCAM | 200 | Multi-task, mill-turn |
| `TC-BC` | BobCAD-CAM | 220 | Affordable, wire EDM, nesting |
| `TC-CT` | CATIA | 213 | Aerospace, composites |
| `TC-CM` | Cimatron | 200 | Mold/die, electrode, 5-axis |
| `TC-TB` | Tebis | 200 | Die/mold, NC templates |
| `TC-SP` | SprutCAM | 200 | Robot machining, multi-axis |
| `TC-SF` | SurfCAM | 220 | 2-5 axis milling, turning |

#### Track D: Grinding & Finishing (5 courses, ~30h)
| ID | Title | Hr | Engine |
|----|-------|----|--------|
| `TD-01` | Surface Grinding | 6 | GrindingForceEngine, GrindingWheelEngine |
| `TD-02` | Cylindrical Grinding | 6 | CenterlessGrindingEngine |
| `TD-03` | Centerless Grinding | 4 | CenterlessGrindingEngine |
| `TD-04` | Honing & Lapping | 6 | HoningProcessEngine, BurnishingPolishingEngine |
| `TD-05` | Grinding Wheel Selection & Dressing | 8 | GrindingWheelDressingOptimizationEngine |

#### Track E: EDM (5 courses, ~30h)
| ID | Title | Hr | Engine |
|----|-------|----|--------|
| `TE-01` | Wire EDM Fundamentals | 6 | EDMWireEngine |
| `TE-02` | Sinker EDM & Electrode Design | 8 | EDMEngine, ElectrodeDesignEngine |
| `TE-03` | Micro-EDM | 4 | MicroEDMEngine |
| `TE-04` | EDM Surface Integrity | 6 | EDMSurfaceIntegrityEngine |
| `TE-05` | EDM Programming & Automation | 6 | EDMProgramAssemblerEngine |

#### Track F: Aerospace Manufacturing (5 courses, ~35h)
| ID | Title | Hr | Engine |
|----|-------|----|--------|
| `TF-01` | Titanium & Superalloy Machining | 8 | SuperalloyMachiningEngine |
| `TF-02` | Aerospace Tolerancing & AS9100 | 6 | ComplianceEngine |
| `TF-03` | Composites Machining (CFRP/GFRP) | 6 | Material-specific strategies |
| `TF-04` | Thin-Wall & Structural Machining | 8 | DeflectionEngine, AdaptiveFeedControlEngine |
| `TF-05` | Aerospace Documentation & Traceability | 6 | AuditEngine, DigitalThreadEngine |

#### Track G: Additive + Hybrid Manufacturing (3 courses, ~18h)
| ID | Title | Hr |
|----|-------|----|
| `TG-01` | Additive Manufacturing Overview | 6 |
| `TG-02` | Post-Processing Additive Parts | 6 |
| `TG-03` | Hybrid Manufacturing (Add + Subtract) | 6 |

---

### Prerequisite Flow

```
L0 (8 courses — all required) → L1 (10 courses — all required) → L2 (12 courses — all required)
                                                                          │
                                                    ┌───────────────────┬─┴──────────────────┐
                                                    ▼                   ▼                    ▼
                                             L3 Core (14)      Track A-G (pick 1+)    Track C (CAM)
                                                    │                   │
                                                    ├───────────────────┘
                                                    ▼
                                             L4 Expert (8) ← requires 2+ tracks
                                                    │
                                                    ▼
                                             L5 Master (6) ← requires 3+ tracks
```

### Assessment Strategy Per Level

| Level | Pass | Question Types | Spaced Repetition Adds | Project |
|-------|------|---------------|----------------------|---------|
| L0 | 70% | Multiple choice, calculation, visual ID | RPM formula, circumference, fraction-decimal | Read a blueprint |
| L1 | 75% | + Troubleshooting trees, G-code write | Speed/feed, G-code structure | Write G-code program |
| L2 | 80% | + Sandbox exercises, CAM tasks | Kienzle, Taylor, chip thinning | Full CAM project |
| L3 | 85% | + Case studies, multi-step problems | DOE, SPC, Cpk formulas | Optimize a process |
| L4 | 88% | + Simulation exercises, Monte Carlo | Statistical, regression | Simulation study |
| L5 | 90% | + Capstone project defense | Economic (NPV, ROI, OEE) | Full production optimization |

### Interactive Exercise Types (Map to PRISM Engines)

**Calculator exercises** (`ContentType = "calculator"`): Student inputs parameters, PRISM engine computes results live
- SFC Calculator (L0-01, L1-02), CuttingForceEngine (L2-01), ToolLifeEngine (L2-01), DeflectionEngine (L2-11), ThreadCalculationEngine (L2-05), GDTStackupEngine (L3-07), CostEstimationEngine (L3-08), StochasticCuttingForceEngine (L4-01)

**Sandbox exercises** (`ContentType = "sandbox"`): Student writes G-code/designs fixtures, PRISM validates
- GCodeSafetyAnalyzerEngine (L1-03/L1-04), AutoSpeedFeedEngine (L1-02), FixtureDesignEngine (L2-09), CAMKernelEngine (L2-06), PostProcessorEngine (L2-08), TribalKnowledgeEngine (Track C)

**Visual ID questions** (`QuestionType = "visual_id"`): Student identifies tools/chips/wear/defects from images
- Tool identification (L0-07), insert code decoding (L0-07), chip identification (L2-01), wear pattern ID (L3-04), surface finish defect ID (L2-10)

**Troubleshooting trees** (`QuestionType = "troubleshooting_tree"`): Decision trees for diagnosis
- Chatter (L1-09, L3-05), dimensional error (L1-09), poor finish (L3-05), tool breakage (L3-05), post processor issues (L2-08)

### Migration: Existing 15 Courses → New Structure

| Old ID | Maps To | Note |
|--------|---------|------|
| course-0a | L0-01 | Direct rename, content reused |
| course-0b | L0-02 | Direct rename |
| course-0c | L0-03 | Direct rename |
| course-1 | Split → L0-06 (intro) + L1-01 (setup) | Expand both with deeper content |
| course-2 | Split → L1-02 (basics) + L2-01 (physics) | Add Kienzle/Taylor exercises |
| course-3 | Split → L1-03 + L1-04 | Split motion vs cycles |
| course-4 | Split → L1-05 (basic) + L2-02 (advanced) | Much deeper coverage |
| course-5 | Split → L1-06 (basic) + L2-03 (advanced) | Add live tooling, sub-spindle |
| course-6 | → Track C (18 CAM courses) | One course per CAM system |
| course-7 | Split → L0-04 (basics) + L2-12 (strategies) | ISO 513 strategy mapping |
| course-8 | → L3-01 + Track A | 5-axis fundamentals + deep dive |
| course-9 | → L3-02 + L4-01 | DOE/SPC + Monte Carlo |
| course-10 | Split → L1-09 (basic) + L3-05 (advanced) | Basic + FFT-level diagnosis |
| course-11 | → L3-08 | Shop economics stays intact |
| course-12 | → L5-06 | Career development moves to master |

Student progress on old course IDs preserved via alias mapping in CurriculumEngine.

### Implementation — Critical Files

| File | Change |
|------|--------|
| `mcp-server/src/engines/CurriculumEngine.ts` | Add "specialist"/"expert" to SkillLevel. Expand CERTIFICATION_CONFIG to 6 levels. Register 108 courses in `initializeCurriculum()`. Add alias map for old→new IDs |
| `mcp-server/src/data/academy/courses-L0-foundations.ts` | NEW — L0-04 through L0-08 (Materials, Safety, Machines, Tools, Workholding) following course-0a pattern |
| `mcp-server/src/data/academy/courses-L1-operator.ts` | NEW — L1-01 through L1-10 (10 courses, ~70h content) |
| `mcp-server/src/data/academy/courses-L2-programmer.ts` | NEW — L2-01 through L2-12 (12 courses, physics-heavy) |
| `mcp-server/src/data/academy/courses-L3-specialist.ts` | NEW — L3-01 through L3-14 core courses |
| `mcp-server/src/data/academy/courses-L4-expert.ts` | NEW — L4-01 through L4-08 |
| `mcp-server/src/data/academy/courses-L5-master.ts` | NEW — L5-01 through L5-06 |
| `mcp-server/src/data/academy/track-*.ts` | NEW — One file per track (A through G), following same Module[] pattern |
| `web/src/pages/LearningDashboard.tsx` | Replace hardcoded COURSES array with level-grouped browser. Add level accordion/tabs |
| `web/src/types/learning.ts` | Add track types, expand LearningDomain, add certification types |
| `web/src/components/learning/CurriculumBrowser.tsx` | NEW — Browse 108 courses by level, filter by track |
| `web/src/components/learning/CertificationStatus.tsx` | NEW — 6-level progress display |
| `web/src/components/learning/SpecializationTrackPicker.tsx` | NEW — Choose tracks after L2 |
| `web/src/layouts/LearningLayout.tsx` | Expand sidebar nav with tracks, certifications |

### Verification

1. `npm run build` — Zero TypeScript errors after each micro-session
2. CurriculumEngine `getAllCourses()` returns 108+ courses with correct level/prerequisite chains
3. Frontend renders all 6 levels with correct course counts
4. Quiz flow works: question → answer → score → next question → module complete
5. Certification checkpoint triggers at correct level boundaries
6. "Try in PRISM Calculator" bridge opens SFC with correct engine parameters
7. Old course-0a through course-12 IDs still resolve via alias map (no student progress lost)

---

## Scrutiny Findings Summary (177+ findings from 11+ agents, 20 total launched)

| # | Agent | Crit | High | Med | Low | Key Theme |
|---|-------|------|------|-----|-----|-----------|
| 1 | UX Designer | 1 | 7 | 7 | 4 | Machine panel split, center overload, 9px fonts |
| 2 | Machinist (20yr) | 6 | 13 | 9 | 4 | Safety defaults, missing ops, no force display |
| 3 | Shop Owner | 5 | 11 | 6 | 1 | No quote-to-job, JSON output, sidebar chaos |
| 4 | Visual Designer | 0 | 5 | 4 | 2 | Flat dark mode, emojis, no brand identity |
| 5 | CAM Programmer | 3 | 4 | 5 | 3 | Disconnected CamStrategy, 5 CAMs only, no backplot |
| 6 | Onboarding | 2 | 4 | 5 | 1 | Zero onboarding, no tooltips, Learning disconnected |
| 7 | Performance | 0 | 0 | 3 | 5 | React.memo needed, jsPDF eager load |
| 8 | API/Data | 2 | 3 | 4 | 1 | 5 HTTP clients, auth gap, 48/73 dispatchers unwired |
| 9 | Accessibility | 3 | 5 | 7 | 4 | No ARIA tabs, contrast failures, no focus trap |
| 10 | DataViz | 3 | 4 | 6 | 0 | Dark mode broken on charts, color-blind unsafe |
| 11 | Aerospace QA | 4 | 5 | 5 | 1 | No AS9100, FAI fails AS9102, no serial tracking |
| 12-20 | Round 2 (9 agents) | — | — | — | — | Safety, mobile, competitor, responsive, data arch, tooling, ERP, QA, apprentice |
| | **CONFIRMED TOTAL** | **29** | **61** | **61** | **26** | **177 findings (11 agents complete, 9 pending)** |

---

## Sprint Execution Order

| Sprint | Phase | Focus | Pages/Components |
|--------|-------|-------|-----------------|
| 0 | **PRISM Academy** | 108-course curriculum (6 levels + 7 tracks), learning UI overhaul, certification system | 7 new data files + 3 new components + engine updates |
| 1 | Foundation | Design system, icons, legibility, deps, unified HTTP client | ~25 component + infra files |
| 2-3 | SFC | Machine panel merge, safety, results, params, non-trad modes | 4 pages + 12 components |
| 3 | Onboarding | Wizard, tours, experience levels, tooltips | 5 new components + context |
| 4-5 | Shop Mgmt | Dashboard, Jobs kanban, Scheduling, Inventory, Tool Crib | 6 pages + modals |
| 6-7 | Quote/Finance | Quote builder, Financial dashboard, Invoices, sidebar dedup | 8 pages |
| 8 | CAM | Merge CamStrategy, expand CAMs, backplot, tool import | 3 pages + 2 components |
| 9-10 | HR/Quality/Viewer | 5 HR + 4 Quality + 3D Viewer + Analysis pages | 12 pages |
| 11-12 | Advanced | Turret, workholding, blueprint OCR, Cmd+K, multi-op | 6 components |
| 13-14 | Aerospace | AS9100, FAI rebuild, CAPA, serial tracking, CoC generator | Quality page overhauls |
| 15 | Infrastructure | Auth fix, unified API client, WebSocket wiring, dark chart fix | API + hook refactors |

## Micro-Session Architecture (Anti-Drift + Quality Preservation)

Each sprint is decomposed into **micro-sessions** of 3-5 files max per session. This prevents context drift and ensures each session starts fresh with clear scope.

### Session Protocol (MANDATORY — Follow Exactly)

**STARTUP (every session):**
1. `/effort max`
2. Load MEMORY.md + this plan file + target file list (3-5 files max)
3. Read the specific micro-session description below for scope
4. Verify pre-conditions: previous session's files exist and TypeScript passes

**EXECUTE:**
5. Edit ONLY the target files for this micro-session
6. `npx tsc --noEmit` after EVERY file change (catch errors immediately)
7. Visual check in browser for UI changes

**COMPACT (MANDATORY after every micro-session — DO NOT SKIP):**
8. `git add [specific files]` + `git commit` with session ID in message
9. Update MEMORY.md with: session ID, files changed, what works, blockers
10. If context window > 60% full: **STOP AND COMPACT NOW**
11. Write handoff note: "Next session is [X-Y]. It needs to [description]."

**COMPACTION TRIGGERS (hard rules):**
- After EVERY micro-session (e.g., after 0-A, before 0-B)
- When context window exceeds 60% capacity
- After ANY failed TypeScript check that requires more than 2 fix attempts
- Before switching between sprints (e.g., Sprint 0 → Sprint 1)
- After completing any verification step

**HANDOFF FORMAT (paste this at end of every session):**
```
## Session [X-Y] Complete
- Files changed: [list]
- TypeScript: PASS/FAIL
- Browser check: PASS/FAIL
- Committed: [commit hash]
- Next session: [X-Y+1] — [what it does]
- Blockers: [none / describe]
```

### CRITICAL: Context Preservation Between Sessions
Each micro-session MUST be self-contained. The handoff note is the ONLY link between sessions. Include:
- What was built (component names, file paths)
- What the user should see in the browser
- Any deferred work or known issues
- The exact next micro-session ID and its scope

### Compaction Points (Mandatory commit + compact after each micro-session)

**Sprint 0 — PRISM Academy: Comprehensive Curriculum (PRIORITY) (8 micro-sessions)**

See **"PRISM Academy — Complete Zero-to-Master Curriculum"** section below for the full 108-course, 6-level, 7-track design.

- **0-A**: Audit existing 8 learning components + 9 course data files. Dark mode fixes for remaining components. Identify gaps vs. new curriculum design. *(DONE — committed as 7b3d1d3b + 30f36507)*
- **0-B**: Backend curriculum expansion — Add SkillLevel types ("specialist"/"expert"), expand CERTIFICATION_CONFIG to 6 levels, create `courses-L0-foundations.ts` data file (L0-04 through L0-08: Materials, Safety, Machines, Tools, Workholding)
- **0-C**: Backend curriculum expansion — Create `courses-L1-operator.ts` (L1-01 through L1-10: Setup, Speeds/Feeds, G-Code I/II, Milling, Turning, Coolant, Quality, Troubleshoot, Safety)
- **0-D**: Backend curriculum expansion — Create `courses-L2-programmer.ts` (L2-01 through L2-12: Physics, Adv Milling, Adv Turning, Drilling, Threading, CAM I/II, Post, Fixtures, Surface, Vibration, Material Strategies)
- **0-E**: Backend curriculum expansion — Create `courses-L3-specialist.ts` (L3-01 through L3-14 core) + update CurriculumEngine `initializeCurriculum()` to register all new courses
- **0-F**: Frontend overhaul — Replace hardcoded `LearningDashboard.tsx` COURSES array with level-grouped browser. Add level tabs, progress per level, track picker after L2
- **0-G**: Frontend new components — `CurriculumBrowser.tsx` (browse 108 courses by level/track), `CertificationStatus.tsx` (6-level progress), `PrerequisiteGraph.tsx` (visual DAG)
- **0-H**: Wire interactive exercises — Connect "Try in PRISM Calculator" bridges, sandbox exercises, and troubleshooting trees from course content to real PRISM engines. Verify end-to-end flow: enroll → lesson → quiz → certificate

**Sprint 1 — Foundation Design System (4 micro-sessions)**
- **1-A**: Install deps + brand colors + elevation tokens + text utilities in `index.css`
- **1-B**: Button haptic + Card glass + Modal animation + Tabs animated underline
- **1-C**: New components: InfoTooltip, SkeletonLoader, EmptyState, StatusPill, StepWizard
- **1-D**: Lucide icon swap (machineModes.ts + AppShell.tsx + MachineModeTabs.tsx)

**Sprint 2 — SFC Part 1 (4 micro-sessions)**
- **2-A**: Merge MachinePanel (SmartMachineSelector + MachineConfigPanel → unified panel)
- **2-B**: Safety validation utils + parameter ceiling guards + coolant-material checks
- **2-C**: ResultsDisplay enhancement (force, power, torque, MRR, deflection)
- **2-D**: Missing operations (shoulder mill, helical ramp, lathe threading, knurling)

**Sprint 3 — SFC Part 2 (4 micro-sessions)**
- **3-A**: Non-traditional mode parameter panels (Wire EDM, Sinker EDM, Laser, Waterjet, Plasma)
- **3-B**: Center column restructure (Calculate higher, CAM/Priority compact, progress indicator)
- **3-C**: Performance fixes (React.memo × 6, AdvancedCharts prop fix, lazy jsPDF)
- **3-D**: Accessibility fixes (ARIA tabs, focus trap, contrast, touch targets)

**Sprint 4 — Onboarding (3 micro-sessions)**
- **4-A**: OnboardingContext + OnboardingPage + routing
- **4-B**: Shop setup wizard steps (machines, materials, tools, CAM, economics)
- **4-C**: GuidedTour + page tours + experience level selector

**Sprint 4 — Shop Floor (4 micro-sessions)**
- **4-A**: Command Center (ShopDashboardPage) full rebuild with KPI cards
- **4-B**: Job Tracker (JobsPage) Kanban with state machine + drag-drop
- **4-C**: FloorPlan (SchedulingPage) Gantt + real data wiring
- **4-D**: StockVault (InventoryPage) + Tool Crib modal

**Sprint 5 — Shop Floor (3 micro-sessions)**
- **5-A**: CapacityIQ page + BatchOptimizer page
- **5-B**: Sidebar restructure (8 groups, ~30 items, merge ERP dupes)
- **5-C**: Dark mode fix for all chart pages + color-blind safe palette

**Sprint 6 — Quoting (3 micro-sessions)**
- **6-A**: QuoteForge rebuild (dropdowns, customer, save, multi-op)
- **6-B**: PrintScan (blueprint OCR) + quote-to-job conversion
- **6-C**: WinRate analytics + specialty quote pages (sheet metal, additive, mold)

**Sprint 7 — Finance (3 micro-sessions)**
- **7-A**: ProfitPulse financial dashboard (revenue, AR aging, P&L, margin trend)
- **7-B**: BillForge (invoices) + job-to-invoice flow + tax calculation
- **7-C**: MarginTracker + ToolSpend + remaining finance pages

**Sprint 8 — CAM (2 micro-sessions)**
- **8-A**: Merge/retire CamStrategyPage, expand CAM list to 12+, fix toolpath strategies
- **8-B**: G-Code backplot viewer + tool library import/export

**Sprint 9-10 — HR/Quality/Viewer (5 micro-sessions)**
- **9-A**: Crew pages (employees, clock, timecards → auto-feed job costing)
- **9-B**: PayRoll + SafeTeam (payroll calc + compliance)
- **10-A**: QualityGate + InspectPro (SPC, FAI, NCR)
- **10-B**: PartView 3D viewer (Three.js setup)
- **10-C**: Intelligence pages (ProcessIQ, SimLab, RateCard, ClientBook)

**Sprint 11-12 — Advanced (4 micro-sessions)**
- **11-A**: Turret layout + workholding stability panel
- **11-B**: Multi-operation sequence planner + setup sheet generator
- **12-A**: Command palette (Cmd+K) + keyboard shortcuts
- **12-B**: Landing page refresh + experience level gating

**Sprint 13-14 — Aerospace (3 micro-sessions)**
- **13-A**: AS9100 standards + serial/lot tracking system
- **13-B**: FAI rebuild (AS9102 three-form) + CAPA lifecycle
- **14-A**: Calibration enhancement + receiving inspection + CoC generator

**Sprint 15 — Infrastructure (3 micro-sessions)**
- **15-A**: Unified HTTP client + auth token fix
- **15-B**: Shared useApi hook + TanStack Query adoption
- **15-C**: WebSocket wiring + remaining API client generation

### Session Naming Convention
Format: `[sprint]-[session] [description]` → e.g., `0-A Design tokens and deps`
Each session = 1 commit with descriptive message.
Total: **~49 micro-sessions** across 16 sprints (Sprint 0 expanded from 4 to 8 sessions for comprehensive curriculum).

---

## Verification After Each Sprint

1. `npx tsc --noEmit` — Zero TypeScript errors
2. `npx vite build` — Production build succeeds
3. Visual check in browser at localhost:5173
4. Navigate every sidebar link — no redirects to /sfc
5. Test haptic button feel — visible press-down + spring-back
6. Test dark mode — every component readable, 4.5:1 contrast minimum
7. Test onboarding — fresh localStorage triggers wizard
8. Test responsive — mobile single-column, tablet 2-column, desktop 3-column
