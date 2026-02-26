# PHASE R11: PRODUCT PACKAGING — v14.2
# Status: not-started | Sessions: 6-10 | MS: 4 (MS0-MS3) | Role: Product Manager
#
# WHY THIS PHASE EXISTS (Gap 1 from v14.2 Gap Analysis):
#   v14.1 builds the engine (P0→R6), intelligence (R7), experience (R8), and
#   integration (R9). But it never delivers packaged PRODUCTS that end-users buy.
#   Without R11, PRISM is a brilliant engine with no car around it.
#
# Source: PRISM_UNIFIED_MASTER_ROADMAP_v3.md §Tier 4G (Sessions 93-100)
# Depends: R8 (user experience) + R9 (real-world integration) complete
# Leverages: All preceding phases — R11 packages everything into deliverables

---

## CONTEXT BRIDGE

WHAT CAME BEFORE: R8 built the user experience layer (intent engine, personas, 22 app skills).
R9 connected to real machines (MTConnect, CAM plugins, DNC, ERP). R7 built intelligence depth
(coupled physics, optimization, learning). All engines are operational and validated.

WHAT THIS PHASE DOES: Packages PRISM intelligence into 4 standalone product verticals,
each with its own UI, API, documentation, onboarding, and pricing tier.

WHAT COMES AFTER: Market launch. R10 (Manufacturing Revolution) continues in parallel
as long-horizon research.

---

## THE FOUR PRODUCTS

```
1. SPEED & FEED CALCULATOR (SFC) — "The core product"
   User: Any machinist, any level
   Input: Material + tool + operation (+ optional machine)
   Output: Complete cutting parameters with safety validation
   Differentiator: Coupled physics, uncertainty bounds, formula comparison,
                   sustainability metrics, machine-specific limits
   Pricing: Free tier (basic calcs) → Pro (full physics + optimization)
   Depends on: R1 (registries), R2 (safety), R3 (intelligence), R7 (coupled physics)

2. POST PROCESSOR GENERATOR (PPG) — "Controller-specific G-code"
   User: CAM programmer, shop floor lead
   Input: Generic toolpath + target controller
   Output: Controller-specific G-code with syntax validation
   Differentiator: Validates against controller capabilities, checks alarm patterns,
                   dialect translation (FANUC↔Siemens↔Haas↔Okuma)
   Pricing: Per-controller subscription
   Depends on: R3-MS3 (controller intelligence), R9 (CAM integration)

3. SHOP MANAGER / QUOTING — "Run the business"
   User: Shop owner, estimator, production manager
   Input: Part description or drawing
   Output: Job plan → cost breakdown → quote → schedule
   Differentiator: Real physics-based cost estimation (not just $/hour guessing),
                   sustainability reporting, optimization suggestions
   Pricing: Per-seat subscription
   Depends on: R3-MS0 (job planner), R7-MS1 (optimization), R7-MS5 (scheduling)

4. AUTO CNC PROGRAMMER (ACNC) — "The future"
   User: Advanced CAM programmer, automation engineer
   Input: Feature description (pocket, hole, profile, etc.)
   Output: Complete: tool selection → strategy → parameters → G-code
   Differentiator: PRISM intelligence drives every decision, not just lookup tables
   Pricing: Enterprise tier
   Depends on: R3-MS2 (toolpath), R7-MS0 (coupled physics), R9 (CAM integration)
```

---

## MS0: SPEED & FEED CALCULATOR (SFC)
### Sessions: 2 | Effort: H | Prerequisites: R3+R7+R8 complete

**SFC EARLY SHIP GATE (optional — after R7 completes):**
```
SFC can ship as a standalone "SFC Preview" WITHOUT waiting for R8+R9 if:
  □ R3 intelligence actions operational (job_plan, speed_feed, what_if)
  □ R7 coupled physics integrated (surface_integrity, chatter_predict)
  □ R5a visual components built (Calculator Page, Parameter Recommendation UI)
  □ All safety invariants (INV-S1 through INV-S4) pass
  □ Omega >= 0.75 for SFC-scoped assessment
SFC Preview = full calculation capability, basic UI, no intent engine/persona routing.
Full SFC (with intent engine + persona routing) ships after R8 + R11-MS0.
```

```
1. PRODUCT UI:
   Web application (React) with:
     - Material selector (search 3,518+ materials by name, UNS, DIN, JIS)
     - Tool selector (browse 12,000+ tools by category, diameter, vendor)
     - Operation type selector
     - Machine selector (optional — applies machine limits if selected)
     - Parameter display: speed, feed, DOC, WOC, force, power, tool life
     - Safety score display with color coding (green/yellow/red)
     - Uncertainty bounds shown as ranges
     - Formula selection (which model was used, alternatives available)
     - Sustainability metrics (energy, coolant, CO2)
     - "What if?" slider for parameter exploration

2. PRODUCT API:
   REST endpoints from R4-MS3 API layer:
     POST /api/v1/sfc/calculate → full parameter set
     POST /api/v1/sfc/compare  → compare formulas side-by-side
     POST /api/v1/sfc/optimize → optimize for cost/quality/productivity
   API documentation with examples and SDKs

3. PRODUCT DOCUMENTATION:
   Getting started guide (5 minutes to first result)
   Material database reference
   Formula reference (which models PRISM uses and why)
   Safety score explanation
   API reference

4. ONBOARDING:
   Wire R8-MS3 onboarding system for SFC-specific flow
   Progressive disclosure: basic (material+tool→speed/feed) → advanced (coupled physics)

5. PACKAGING:
   Free tier: basic Taylor model, top 100 materials, no optimization
   Pro tier: full formula library, all materials, coupled physics, optimization
   Enterprise tier: API access, custom material database, multi-user
```

---

## MS1: POST PROCESSOR GENERATOR (PPG)
### Sessions: 1-2 | Effort: M | Prerequisites: R3-MS3 (controller intelligence), R9

```
1. G-code validation engine (from R3-MS3 controller_validate)
2. Controller dialect translation (FANUC ↔ Siemens ↔ Haas ↔ Okuma ↔ others)
3. Post processor template library (10+ controllers)
4. UI: paste G-code → select target controller → get validated output
5. Integration: CAM plugin exports → PPG validates → operator gets clean code
```

---

## MS2: SHOP MANAGER / QUOTING
### Sessions: 2-3 | Effort: H | Prerequisites: R3-MS0 (job planner), R7-MS1/MS5

```
1. Job intake: part description → auto-generate job plan (R3-MS0)
2. Cost engine: job plan → material cost + machine time + tool cost + labor
3. Quote generator: cost + margin → professional quote document
4. Schedule integration: job → available machines → timeline (R7-MS5)
5. Sustainability report: environmental impact per job (R7-MS1)
6. Dashboard: active jobs, machine utilization, cost tracking
```

---

## MS3: AUTO CNC PROGRAMMER (ACNC)
### Sessions: 2-3 | Effort: XH | Prerequisites: all of R3+R7+R9

```
1. Feature recognition: "pocket, 50mm deep, 100x80mm, ±0.05mm"
2. Strategy selection: feature + material → optimal toolpath strategy (R3-MS2)
3. Tool selection: strategy + material → best tool from 12,000+ (R3-MS3)
4. Parameter calculation: tool + material + machine → coupled physics params (R7-MS0)
5. G-code generation: strategy + params + controller → validated G-code (R3-MS3)
6. Simulation: preview toolpath with collision detection
7. Complete output: setup sheet + G-code + tool list + cycle time estimate
```

---

## PHASE GATE: R11 → COMPLETE

```
Gate criteria:
  SFC: end-to-end flow working (material → params → safety → display)
  PPG: validates G-code for at least 5 controller families
  Shop Manager: generates accurate quotes for 3 sample parts
  ACNC: produces complete G-code from feature description for 1 sample part
  All products have: UI, API, documentation, onboarding
  The 60-second test: new user gets useful result in <60 seconds on SFC
  Ralph >= A- | Omega >= 0.80
```

---

## R11 COMPANION ASSETS

```
SKILLS (4 new — product-specific):
  prism-sfc-guide           — Teaches Claude SFC product workflow
  prism-ppg-guide           — Teaches Claude PPG product workflow
  prism-shop-manager-guide  — Teaches Claude quoting/scheduling workflow
  prism-acnc-guide          — Teaches Claude auto-programming workflow

HOOKS (2 new):
  product_safety_gate       — blocking, ensures every product output includes S(x) score
  product_api_versioning    — warning, checks API version compatibility across products
```
