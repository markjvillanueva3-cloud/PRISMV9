# Process Engineering Critique of PRISM v9 Roadmap

## Reviewer Perspective
50-person job shop process engineer. We run 15 CNC machines (mix of 3-axis VMCs, a 5-axis, two lathes with live tooling, a mill-turn, surface and cylindrical grinders, wire EDM, and a waterjet). We quote 200+ jobs/month, run 40-60 active jobs at any time, and our biggest pain is process planning -- getting the right part to the right machine with the right setup in the right sequence.

---

## 1. Feature Naming Assessment

### What Works Well
- **PRISM Calculator** -- solid rebrand. "Speed & Feed Calculator" is generic; tying it to the product name is smart.
- **Command Center** -- good for the dashboard. Machinists think in terms of control rooms.
- **Job Tracker** -- clear and direct. Better than "Jobs" alone.
- **QuoteForge** / **CodeForge** / **BillForge** -- the "Forge" family is memorable and manufacturing-relevant.
- **StockVault** -- evocative. Material inventory as a vault makes sense.

### What Needs Rethinking
- **PathAdvisor** -- too passive. A CAM programmer does not want "advice" from a speed-and-feed tool. This name implies it knows more about toolpath strategy than the programmer does. Consider **PathPilot** (already taken by Tormach, avoid) or just keep it as a subsection of the calculator. Toolpath strategy is a parameter of the SFC, not a standalone product.
- **FloorPlan** -- the double meaning is clever in a marketing document but confusing in daily use. When a shop foreman hears "FloorPlan" they think of the physical shop layout drawing, not the Gantt chart. Call it **ShopSchedule** or **ProductionBoard**.
- **CapacityIQ / ProcessIQ / CostIQ** -- the "IQ" suffix implies AI intelligence that better actually be there. If these pages are just dashboards with charts, calling them "IQ" is misleading. Only use "IQ" if there is genuine predictive/optimization logic behind them.
- **FinishLine** -- secondary ops are not the "finish line." Secondary ops include heat treat, plating, deburring, grinding after heat treat, etc. Some of these happen in the middle of the process. Better: **SecondaryOps** or **Outside Processing** (the actual shop term).
- **MetalMarket** -- implies a marketplace or commodity trading platform, not a material price lookup. Consider **MaterialPricing** or **ShopRates**.
- **Crew** -- fine for a sidebar group label, but the individual HR pages (ClockIn, TimeSheet, PayRoll) need to feel integrated with job costing, not siloed under a people-management heading. The payroll data feeds labor rates, which feed quoting. The naming hides this connection.
- **PrintScan** -- blueprint OCR is a niche feature. Naming it like a standalone product oversells it. Keep it as a feature within QuoteForge ("Import from Blueprint" button).
- **WinRate** -- this is a CRM metric, not a manufacturing metric. Shop owners will understand it, but it does not belong in the same nomenclature as manufacturing tools. Consider **QuoteAnalytics** (the old name was fine).
- **SimLab** -- what is actually being simulated? If it is parameter what-if analysis, call it **What-If Calculator** or **Parameter Explorer**. "SimLab" implies FEA or physics simulation, which this is not.

### Overall Naming Verdict
The "Forge" family and "Command Center" are strong. The "IQ" family and the forced-creative names (FloorPlan, FinishLine, SimLab, PrintScan) prioritize brand cleverness over shop-floor clarity. A machinist who has used Mastercam, Fusion, and a basic ERP for 15 years should be able to guess what each page does from the name alone. Test this: can a new employee navigate the sidebar without a tour? The creative names fail that test.

---

## 2. Are the 13 Process Mode Tabs the Right Decomposition?

### What the Tabs Currently Are
Mill, Lathe, Drilling, Boring, Grinding, Honing, Threading, Broaching, Wire EDM, Sinker EDM, Laser, Waterjet, Plasma.

### Problems

**A) Drilling, Boring, and Threading are not machine types -- they are operations performed ON machines.**
- Drilling happens on a mill, a lathe, a drill press, or a dedicated drilling machine.
- Boring happens on a mill, a lathe, or a boring mill.
- Threading happens on a mill (thread milling), a lathe (single-point threading), or with a tapping head.

The current model conflates "machine type" with "operation type." The tab bar implies you are choosing a machine, but "Drilling" is not a machine, it is what you do on a machine. This is the single biggest structural problem.

**B) Missing machine types that actually exist in job shops:**
- **Mill-Turn / Multi-Tasking** -- these machines do both milling and turning in one setup. They are increasingly common (Mazak Integrex, DMG Mori NTX, Okuma Multus). The current model forces you to pick "Mill" or "Lathe" but cannot represent a single setup where you turn OD, then index the C-axis and mill a flat.
- **Swiss-Type Lathe** -- fundamentally different from a standard CNC lathe. Guide bushing, sliding headstock, gang tooling. Different speed/feed considerations.
- **Horizontal Boring Mill (HBM)** -- not the same as a VMC. Different rigidity, different capabilities, different process planning considerations.
- **Gear Cutting** -- hobbing, shaping, shaving, gear grinding. This is a specialized process family that does not fit under "Mill" or "Grinding."

**C) The grouping labels are wrong.**
- Threading is in the "Finishing" group. Threading is not finishing. It is a chip-removal or forming operation. Thread milling is chip removal. Thread rolling is forming. Neither is "finishing."
- Broaching is in the "Finishing" group. Broaching is absolutely chip removal. A broach is one of the most aggressive cutting tools that exists.
- Boring is in the "Chip Removal" group, which is correct, but in many shops boring is a finishing operation (fine boring to +/- 0.0002").

**D) The grouping logic itself is questionable.**
"Chip Removal / Finishing / Non-Traditional" is a textbook classification, not a shop-floor mental model. A process engineer thinks in terms of:
- **Primary Machining** -- stock removal (milling, turning, drilling)
- **Secondary Machining** -- precision features (boring, threading, reaming, tapping)
- **Abrasive Processes** -- grinding, honing, lapping, superfinishing
- **Thermal / Electrical** -- EDM, laser, plasma, waterjet
- **Forming** -- thread rolling, burnishing, broaching

### Recommended Fix
The tabs should represent **process families on specific machine types**, not a flat list of operations. The architecture should be:

**Tier 1 (Machine Type):** Mill | Lathe | Mill-Turn | Grinder | EDM | Laser/Waterjet/Plasma

**Tier 2 (Operation on that machine):** Context-dependent sub-operations.
- Mill -> Face, Pocket, Profile, Slot, Drill, Bore, Tap, Thread Mill, Chamfer
- Lathe -> Turn OD, Turn ID, Face, Groove, Part, Thread, Drill (on center)
- Grinder -> Surface, Cylindrical OD, Cylindrical ID, Centerless, Creep Feed

This two-tier model is what the code already partially implements via `subOperations`, but the tier-1 tabs include items that should only be tier-2.

---

## 3. Is the 3-Column SFC Layout the Right Structure?

### Current Layout
- **Left Column**: Machine Config (controller, spindle, ATC) + Material Selector + Stock Dimensions
- **Center Column**: CAM Software + Cutting Priority + Toolpath Strategy + Parameters + Calculate Button + Results + Charts/Compare/History tabs
- **Right Column**: Tool Selector + Tool Holder + Insert + Fixture + Machine Selector

### What Works
- The general left-to-right flow (setup context -> parameters -> tooling) makes sense.
- Sub-operation pills under the mode tabs are a good UX pattern.
- Compatibility validator as a banner is well-placed.

### Structural Problems

**A) Machine is split across two locations.**
Machine configuration (controller, spindle, ATC) is in the left column. Machine selection (the actual machine from the shop) is at the bottom of the right column. This is backwards. You pick the machine first, then its configuration follows. The plan at section 1.1 acknowledges this and proposes merging them -- good.

**B) The center column is overloaded.**
Count the components: CAM Software Selector, Cutting Priority, Toolpath Strategy, Parameter Panel, Preset Manager, Calculate Button, Results Display, Compare/History tabs, Advanced Charts. That is 9+ components in one column. This is the "long scroll" problem. The user has to scroll past configuration to see results, then scroll back to tweak parameters. The plan acknowledges this at section 1.5 ("Move Calculate button higher").

**C) CAM Software does not belong in the SFC.**
A speed-and-feed calculator should not ask what CAM software you use. The CAM feed multiplier is a hack -- it adjusts feeds based on which CAM you are using, but that adjustment should happen in the CAM system, not in the SFC. The SFC should output ideal cutting parameters. The programmer then applies their CAM-specific adjustments. Including CAM selection here confuses the tool's purpose: is it a calculator or a CAM preprocessor?

If you keep it, make it a collapsed "Advanced Adjustments" section, not a primary selector.

**D) Missing from the layout: the workpiece itself.**
The SFC knows about the material (left column) and the stock dimensions (left column), but there is no concept of the **feature being machined**. A pocket has a depth-to-width ratio that affects tool selection. A thin wall has deflection concerns. A deep bore has chip evacuation concerns. The SFC parameters (depth, width) are entered manually, but they should be connected to the feature geometry.

**E) Results should be immediately visible, not below the fold.**
In a 3-column layout, the right column could host results instead of (or above) the tooling selectors. The most important output -- RPM, feed rate, safety status -- should be visible at all times without scrolling. Consider a sticky results summary bar.

### Recommended Layout Revision

```
TOP BAR: Machine Type Tabs + Sub-Operation Pills (full width) -- KEEP AS-IS

LEFT COLUMN (Context):          CENTER COLUMN (Calculate):       RIGHT COLUMN (Results):
  Machine Selector                 Parameters (DOC, WOC, etc.)     Results Summary (sticky)
  Material Selector                Cutting Priority (compact)        - RPM
  Stock Dimensions                 Calculate Button (sticky)         - Feed Rate
  Feature Info (NEW)               Safety Warnings (inline)          - MRR
                                                                     - Power/Torque
                                   Toolpath Strategy (collapsed)     - Safety Score
                                   CAM Adjustment (collapsed)
                                                                   Tool Selector
                                                                   Tool Holder / Insert
                                                                   Fixture
                                                                   Charts / Compare / History
```

---

## 4. Where is the Unified Process Planning View?

### The Gap
The plan mentions multi-operation sequence planning at section 7.5, but it is buried in Phase 7 (Sprint 11-12) as "Advanced Features." This is not an advanced feature. **This is the core of process engineering.**

Every part that goes through a job shop follows a process plan:
```
Op 10: Saw cut to length (bandsaw)
Op 20: Mill top and bottom (VMC-1, vise, face mill)
Op 30: Mill features (VMC-1, soft jaws, endmill)
Op 40: Drill and tap (VMC-1, same setup)
Op 50: Turn OD to finish (Lathe-1, chuck, boring bar + OD tool)
Op 60: Deburr (bench)
Op 70: Heat treat (outside vendor, 3-day lead)
Op 80: Grind OD to final (cylindrical grinder)
Op 90: Inspect (CMM)
```

The SFC currently calculates speeds and feeds for **one operation at a time** with no concept of how operations sequence together. This means:
- No aggregate cycle time for the entire part
- No setup time estimates between operations
- No machine loading visibility (which machine is bottlenecked?)
- No ability to say "this part requires 4 setups across 3 machines, total estimated 2.3 hours"
- No way to compare process plan alternatives (e.g., "do it in 3 setups on a 5-axis vs 5 setups on a 3-axis")

### Recommendation
Promote the Process Planning view to Phase 2 or 3, not Phase 7. It should be the **second major feature** after the SFC, because:
1. The quoting system needs it (you cannot quote a part without a process plan)
2. The scheduling system needs it (you cannot schedule without knowing which machines and how long)
3. The job tracking system needs it (the Kanban board needs to show where in the process each job is)

Without process planning, QuoteForge is just a spreadsheet, FloorPlan/ShopSchedule is just a calendar, and Job Tracker is just a to-do list.

---

## 5. Setup Reduction / SMED Concepts

### What is Missing
The plan has zero mention of:
- **Setup time tracking** -- how long does it take to set up each operation?
- **Setup reduction** -- what can be done to reduce changeover time?
- **SMED (Single Minute Exchange of Die)** principles -- internal vs external setup activities
- **Standard setup sheets** -- documented procedures for repeatable setups
- **Fixture/tooling pre-staging** -- getting the next job's tools ready while the current job runs

### Why This Matters
In a 50-person job shop, setup time is often 30-50% of total machine time for short-run jobs. A part that takes 20 minutes to machine takes 45 minutes to set up. If you run 10 of them, that is 200 minutes machining + 45 minutes setup = 245 minutes. If you can cut setup to 20 minutes, you save 10% of total time. For a shop running 15 machines, that is 1.5 machine-hours per day recovered.

### Where It Should Appear
- **SFC Calculator**: Each operation should have an estimated setup time field (defaulted from operation type but editable)
- **Process Planning**: Aggregate setup time across all operations; flag opportunities to combine setups
- **Job Tracker**: Show setup time vs cycle time breakdown per job
- **Scheduling**: Account for setup time in Gantt chart (many scheduling tools only show run time and dramatically underestimate delivery dates)
- **Quoting**: Setup time * shop rate is a real cost line item. The current QuoteForge cost breakdown lists "Setup" but there is no data feeding it.

---

## 6. Tooling Strategy (Indexable vs Solid Carbide)

### What Exists
The `OperationType.defaults.tool_material` field is a string: "Carbide", "HSS", "CBN", "Diamond", etc. The `InsertSelector` component exists with grade, coating, and geometry. The `SmartToolSelector` filters tools by material group and operation.

### What is Missing

**A) No decision support for indexable vs solid carbide.**
This is one of the most impactful decisions in process planning:
- Solid carbide endmills: higher rigidity, better finish, regrindable, expensive per tool, small diameters (1-25mm typical)
- Indexable milling cutters: cheaper per edge, quick insert change, larger diameters (25-200mm), multiple geometries available
- The crossover point depends on diameter, material, operation type, and production quantity

The SFC should present this choice explicitly when relevant (milling operations, diameter > 16mm) and show the trade-offs.

**B) No insert grade recommendation based on material.**
The InsertSelector has a `gradeId` field ("medium") but no logic connecting material being cut to recommended insert grade. Sandvik, Kennametal, and Iscar all publish material-to-grade matrices. For example:
- Aluminum: uncoated carbide or PCD
- Steel (ISO P): coated carbide (CVD TiCN/Al2O3 for roughing, PVD AlTiN for finishing)
- Stainless (ISO M): PVD coated with sharp geometry
- Cast Iron (ISO K): ceramic or CBN for high speed, coated carbide for conventional
- Titanium (ISO S): uncoated or PVD carbide, sharp edge, high positive rake
- Hardened Steel (ISO H): CBN or ceramic

**C) No tool life / cost-per-edge calculation.**
The types file has `ToolLifeRequest` and `ToolLifeResult`, which is good. But there is no UI to compare:
- Option A: Solid carbide endmill, $85, 120 min tool life, regrinds 3x = $21/edge-hour
- Option B: Indexable cutter + 4 inserts at $12 each, 20 min per edge, 4 edges per insert = $0.90/edge-minute = $54/hour

This comparison directly feeds quoting accuracy.

---

## 7. Machine Capability Matching

### What Exists
The `SmartMachineSelector` filters by `requiredRpm`, `requiredPowerKw`, and `requiredAxes`. This is a start.

### What is Missing

**A) Work envelope matching.**
Can the part physically fit in the machine? The stock dimensions are known (left column), but the machine's XYZ travel limits are not compared against them. A 600mm part does not go on a machine with 500mm X travel.

**B) Tolerance capability matching.**
If the drawing calls for +/- 0.0005" on a bore, your Haas VF-2 (positioning accuracy +/- 0.0002") might be marginal while your Mori Seiki NHX (positioning accuracy +/- 0.00004") is the right choice. The SFC has no concept of required tolerance feeding into machine selection.

**C) Weight/clamping capacity.**
A 500 lb casting does not go on a 40-taper VMC with a 6" vise. You need a horizontal boring mill or a large VMC with a rotary table rated for that weight.

**D) Feature-based routing.**
When a process engineer looks at a part, they think:
- "This has a deep pocket -- needs a machine with high-pressure through-spindle coolant"
- "This has a thin floor -- needs a machine with low runout and high-speed spindle for light passes"
- "This has a tapped hole pattern on an angle -- needs 4th or 5th axis"
- "This is a long shaft -- needs a lathe with steady rest or tailstock support"

None of this reasoning exists. The `requiredAxes` is hardcoded to 3 for milling and 2 for turning (line 320 of SfcCalculatorPage), which is not how axis requirements work.

---

## 8. Multi-Axis vs 3-Axis Decision Support

### The Problem
Line 320 of SfcCalculatorPage.tsx:
```typescript
const requiredAxes = operation?.category === "milling" ? 3 : 2;
```

This is always 3 for any milling operation, which means the system never recommends a 4-axis or 5-axis machine. But the decision between 3-axis, 3+2, and simultaneous 5-axis is one of the most impactful process planning decisions:

### What Should Drive the Decision

| Factor | 3-Axis | 3+2 (Positional 5-Axis) | Simultaneous 5-Axis |
|--------|--------|-------------------------|---------------------|
| Features on one face | Yes | Yes | Yes |
| Features on multiple faces | Multiple setups | One setup, index between | One setup, continuous |
| Undercuts | Cannot reach | Some, with indexed angles | Full access |
| Complex contours (turbine blades, impellers) | No | No | Required |
| Deep pockets with drafted walls | Limited by tool reach | Better access angles | Best access |
| Setup count | Highest (1 per face) | Medium (1 setup, indexed) | Lowest (1 setup) |
| Programming complexity | Lowest | Medium | Highest |
| Machine cost per hour | $75-100 | $100-150 | $150-250 |
| Risk of crash | Lowest | Medium | Highest |

### What the SFC Should Do
When a part has features on more than one face, or requires an undercut, or involves a complex surface, the system should:
1. Flag that 3-axis may require multiple setups
2. Estimate the setup count for 3-axis vs 5-axis
3. Show the cost trade-off: more setups at lower rate vs fewer setups at higher rate
4. Factor in tolerance stack-up risk (each re-fixturing introduces positional error)

This is directly connected to process planning (section 4) and quoting (setup count * setup time * rate).

---

## 9. Additional Process Engineering Gaps

### A) Material Removal Rate (MRR) Optimization
The plan mentions adding MRR to the results display (section 1.3), which is good. But there is no optimization loop. A process engineer wants to know: "given this machine's power limit and this material, what is the maximum MRR I can achieve?" The SFC should solve backwards from machine power to find optimal parameters, not just calculate MRR from user-entered parameters.

### B) Chip Thinning
The current model has no chip thinning calculation. When radial depth of cut is less than 50% of tool diameter (which is common in high-speed machining and trochoidal milling), the actual chip thickness is less than the programmed feed per tooth. The feed rate should be compensated upward. This is fundamental to modern machining and the toolpath strategy multipliers are a crude approximation of it.

### C) Surface Finish Prediction
The types file has `SurfaceFinishRequest` and `SurfaceFinishResult` (Ra, Rz), but there is no UI for it in the SFC page. Surface finish is one of the primary outputs a machinist needs -- it determines whether an additional finishing pass or grinding operation is required.

### D) Work Hardening Awareness
For stainless steels (304, 316) and nickel alloys (Inconel 718, Waspaloy), if the feed rate is too low, the material work-hardens and destroys the tool. The SFC should have a minimum feed rate floor for these materials, not just a maximum ceiling.

### E) Coolant Strategy is Oversimplified
The current coolant field is a string: "flood", "mist", "through_tool", "none", etc. Real coolant strategy includes:
- Coolant pressure (high-pressure TSC at 1000 psi vs flood at 50 psi)
- Coolant concentration (5-8% for most operations, 8-12% for stainless/titanium)
- Coolant type (soluble oil vs synthetic vs semi-synthetic)
- MQL (minimum quantity lubrication) as an option between flood and dry
- Cryogenic machining (CO2 or LN2 for titanium/nickel aerospace work)

---

## 10. Sprint Prioritization Critique

### What Should Change

The current sprint order is:
0: Foundation -> 1-2: SFC -> 3: Onboarding -> 4-5: Shop Management -> 6-7: Quote/Finance -> 8: CAM -> 9-10: HR/Quality -> 11-12: Advanced -> 13-14: Aerospace -> 15: Infrastructure

**Problems:**
1. **Process Planning (section 7.5) is in Sprint 11.** It should be Sprint 3 or 4. Everything downstream (quoting, scheduling, job tracking) depends on it.
2. **Infrastructure (Sprint 15) is last.** The unified HTTP client and auth fix (section 9.1, 9.3) should be Sprint 0 or 1. Building 14 sprints of UI on top of 5 different HTTP clients and a broken auth system is accumulating technical debt that will be expensive to fix later.
3. **Onboarding (Sprint 3) is too early.** You are onboarding users to an incomplete product. Build the core product first (SFC + Process Planning + Quoting + Job Tracking), then onboard.
4. **HR (Sprint 9) is too late for labor rate integration.** If payroll and timecards feed job costing, and job costing feeds quoting, then the labor rate data structure needs to exist before quoting is built. At minimum, define the labor rate schema in Sprint 0 even if the full HR pages come later.

### Recommended Sprint Reorder
```
0:  Foundation + Infrastructure (design system + unified HTTP client + auth fix)
1-2: SFC Calculator (as planned)
3:  Process Planning (multi-op sequence, setup time, machine routing)
4:  Quoting (needs process planning data to be accurate)
5-6: Shop Management (Job Tracker, Scheduling -- needs process plans to work)
7:  CAM integration
8-9: Finance + HR (labor rates now feed back into quoting)
10: Quality
11: Onboarding (now onboarding to a complete product)
12: Advanced features (turret layout, blueprint OCR, etc.)
13-14: Aerospace compliance
```

---

## Summary of Critical Findings

| # | Finding | Severity | Section |
|---|---------|----------|---------|
| 1 | Drilling/Boring/Threading are operations, not machine types -- tabs conflate machine and operation | CRITICAL | 2 |
| 2 | No process planning view (multi-op sequencing) until Sprint 11 | CRITICAL | 4 |
| 3 | No setup time tracking or SMED concepts anywhere | HIGH | 5 |
| 4 | No indexable vs solid carbide decision support | HIGH | 6 |
| 5 | requiredAxes hardcoded to 3 for all milling -- no 5-axis decision support | HIGH | 8 |
| 6 | Machine capability matching limited to RPM/power -- missing envelope, tolerance, weight | HIGH | 7 |
| 7 | Center column overloaded, results below fold | MEDIUM | 3 |
| 8 | CAM software selector does not belong in SFC primary flow | MEDIUM | 3 |
| 9 | Creative naming (FloorPlan, FinishLine, SimLab) sacrifices clarity for brand | MEDIUM | 1 |
| 10 | Infrastructure fixes (auth, HTTP client) should be Sprint 0, not Sprint 15 | HIGH | 10 |
| 11 | No chip thinning calculation for HEM/trochoidal | MEDIUM | 9B |
| 12 | No surface finish prediction UI despite having types defined | MEDIUM | 9C |
| 13 | Missing machine types: mill-turn, Swiss, HBM, gear cutting | MEDIUM | 2 |
| 14 | No MRR optimization (solve backwards from power to find max params) | MEDIUM | 9A |
| 15 | Coolant model oversimplified (no pressure, no MQL, no cryo) | LOW | 9E |
