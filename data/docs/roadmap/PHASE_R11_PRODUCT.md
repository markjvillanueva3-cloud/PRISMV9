# PHASE R11: PRODUCT PACKAGING â€” v14.2
### RECOMMENDED_SKILLS: prism-codebase-packaging, prism-perf-patterns, prism-anti-regression
### HOOKS_EXPECTED: ALL
### DATA_PATHS: C:\PRISM\mcp-server

# Status: not-started | Sessions: 6-10 | MS: 4 (MS0-MS3) | Role: Product Manager
# DEPENDS ON: R1 (registries), R2 (safety), R3 (intelligence), R7 (coupled physics)
#
# WHY THIS PHASE EXISTS (Gap 1 from v14.2 Gap Analysis):
#   v14.1 builds the engine (P0â†’R6), intelligence (R7), experience (R8), and
#   integration (R9). But it never delivers packaged PRODUCTS that end-users buy.
#   Without R11, PRISM is a brilliant engine with no car around it.
#
# Source: PRISM_UNIFIED_MASTER_ROADMAP_v3.md  Tier 4G (Sessions 93-100)
# Depends: R8 (user experience) + R9 (real-world integration) complete
# Leverages: All preceding phases â€” R11 packages everything into deliverables

---

<!-- ANCHOR: r11_quick_reference_standalone_after_compaction_no_other_doc_needed -->
## QUICK REFERENCE (standalone after compaction â€” no other doc needed)
```
BUILD:      npm run build (NEVER standalone tsc â€” OOM at current scale)
SAFETY:     S(x) >= 0.70 is HARD BLOCK
POSITION:   Update CURRENT_POSITION.md every 3 calls
FLUSH:      Write results to disk after each logical unit of work
ERROR:      Fix ONE build error, rebuild, repeat. >5 from one edit â†’ git revert
IDEMPOTENT: Read-only = safe to re-run. Write = check if already done first.
STUCK:      3 same-approach fails â†’ try different approach. 6 total â†’ skip if non-blocking.
TRANSITION: Update CURRENT_POSITION first, ROADMAP_TRACKER second.
RECOVERY:   Read PRISM_RECOVERY_CARD.md for full recovery steps.
ENV:        R11 = Hybrid MCP + Code | Sonnet. Product Manager.
```

---

<!-- ANCHOR: r11_knowledge_contributions_what_this_phase_feeds_into_the_hierarchical_index -->
## KNOWLEDGE CONTRIBUTIONS (what this phase feeds into the hierarchical index)
```
BRANCH 1 (Execution Chain): Final product architecture â€” user-facing API chains, documentation
  generation pipeline, packaging and distribution chains.
BRANCH 3 (Relationships): Product integration edges â€” which features compose into which workflows,
  which capabilities depend on which registries.
BRANCH 4 (Session Knowledge): Product packaging decisions, API design rationale, documentation
  structure, user onboarding flow design.
AT PHASE GATE: All 4 branches of hierarchical index complete and cross-validated.
```

---

<!-- ANCHOR: r11_context_bridge -->
## CONTEXT BRIDGE

WHAT CAME BEFORE: R8 built the user experience layer (intent engine, personas, 22 app skills).
R9 connected to real machines (MTConnect, CAM plugins, DNC, ERP). R7 built intelligence depth
(coupled physics, optimization, learning). All engines are operational and validated.

WHAT THIS PHASE DOES: Packages PRISM intelligence into 4 standalone product verticals,
each with its own UI, API, documentation, onboarding, and pricing tier.

WHAT COMES AFTER: Market launch. R10 (Manufacturing Revolution) continues in parallel
as long-horizon research.

---

<!-- ANCHOR: r11_the_four_products -->
## THE FOUR PRODUCTS

```
1. SPEED & FEED CALCULATOR (SFC) â€” "The core product"
   User: Any machinist, any level
   Input: Material + tool + operation (+ optional machine)
   Output: Complete cutting parameters with safety validation
   Differentiator: Coupled physics, uncertainty bounds, formula comparison,
                   sustainability metrics, machine-specific limits
   Pricing: Free tier (basic calcs) â†’ Pro (full physics + optimization)
   Depends on: R1 (registries), R2 (safety), R3 (intelligence), R7 (coupled physics)

2. POST PROCESSOR GENERATOR (PPG) â€” "Controller-specific G-code"
   User: CAM programmer, shop floor lead
   Input: Generic toolpath + target controller
   Output: Controller-specific G-code with syntax validation
   Differentiator: Validates against controller capabilities, checks alarm patterns,
                   dialect translation (FANUCâ†”Siemensâ†”Haasâ†”Okuma)
   Pricing: Per-controller subscription
   Depends on: R3-MS3 (controller intelligence), R9 (CAM integration)

3. SHOP MANAGER / QUOTING â€” "Run the business"
   User: Shop owner, estimator, production manager
   Input: Part description or drawing
   Output: Job plan â†’ cost breakdown â†’ quote â†’ schedule
   Differentiator: Real physics-based cost estimation (not just $/hour guessing),
                   sustainability reporting, optimization suggestions
   Pricing: Per-seat subscription
   Depends on: R3-MS0 (job planner), R7-MS1 (optimization), R7-MS5 (scheduling)

4. AUTO CNC PROGRAMMER (ACNC) â€” "The future"
   User: Advanced CAM programmer, automation engineer
   Input: Feature description (pocket, hole, profile, etc.)
   Output: Complete: tool selection â†’ strategy â†’ parameters â†’ G-code
   Differentiator: PRISM intelligence drives every decision, not just lookup tables
   Pricing: Enterprise tier
   Depends on: R3-MS2 (toolpath), R7-MS0 (coupled physics), R9 (CAM integration)
```

---

<!-- ANCHOR: r11_ms0_speed_feed_calculator_sfc -->
## MS0: SPEED & FEED CALCULATOR (SFC)
<!-- ANCHOR: r11_role_product_manager_model_sonnet_build_pipeline_packaging_effort_l_15_calls_sessions_2 -->
### Role: Product Manager | Model: Sonnet (build pipeline + packaging) | Effort: L (15 calls) | Sessions: 2
<!-- ANCHOR: r11_sessions_2_effort_h_prerequisites_r3_r7_r8_complete -->
### Sessions: 2 | Effort: H | Prerequisites: R3+R7+R8 complete

**SFC EARLY SHIP GATE (optional â€” after R7 completes):**
```
SFC can ship as a standalone "SFC Preview" WITHOUT waiting for R8+R9 if:
  â–¡ R3 intelligence actions operational (job_plan, speed_feed, what_if)
  â–¡ R7 coupled physics integrated (surface_integrity, chatter_predict)
  â–¡ R5a visual components built (Calculator Page, Parameter Recommendation UI)
  â–¡ All safety invariants (INV-S1 through INV-S4) pass
  â–¡ Omega >= 0.75 for SFC-scoped assessment
SFC Preview = full calculation capability, basic UI, no intent engine/persona routing.
Full SFC (with intent engine + persona routing) ships after R8 + R11-MS0.
```

```
1. PRODUCT UI:
   Web application (React) with:
     - Material selector (search 3,518+ materials by name, UNS, DIN, JIS)
     - Tool selector (browse 12,000+ tools by category, diameter, vendor)
     - Operation type selector
     - Machine selector (optional â€” applies machine limits if selected)
     - Parameter display: speed, feed, DOC, WOC, force, power, tool life
     - Safety score display with color coding (green/yellow/red)
     - Uncertainty bounds shown as ranges
     - Formula selection (which model was used, alternatives available)
     - Sustainability metrics (energy, coolant, CO2)
     - "What if?" slider for parameter exploration

2. PRODUCT API:
   REST endpoints from R4-MS3 API layer:
     POST /api/v1/sfc/calculate â†’ full parameter set
     POST /api/v1/sfc/compare  â†’ compare formulas side-by-side
     POST /api/v1/sfc/optimize â†’ optimize for cost/quality/productivity
   API documentation with examples and SDKs

3. PRODUCT DOCUMENTATION:
   Getting started guide (5 minutes to first result)
   Material database reference
   Formula reference (which models PRISM uses and why)
   Safety score explanation
   API reference

4. ONBOARDING:
   Wire R8-MS3 onboarding system for SFC-specific flow
   Progressive disclosure: basic (material+toolâ†’speed/feed) â†’ advanced (coupled physics)

5. PACKAGING:
   Free tier: basic Taylor model, top 100 materials, no optimization
   Pro tier: full formula library, all materials, coupled physics, optimization
   Enterprise tier: API access, custom material database, multi-user
```

---

<!-- ANCHOR: r11_ms1_post_processor_generator_ppg -->
## MS1: POST PROCESSOR GENERATOR (PPG)
<!-- ANCHOR: r11_role_product_manager_model_haiku_bulk_doc_gen_then_sonnet_editorial_effort_l_18_calls_sessions_2 -->
### Role: Product Manager | Model: Haiku (bulk doc gen) then Sonnet (editorial) | Effort: L (18 calls) | Sessions: 2
<!-- ANCHOR: r11_sessions_1_2_effort_m_prerequisites_r3_ms3_controller_intelligence_r9 -->
### Sessions: 1-2 | Effort: M | Prerequisites: R3-MS3 (controller intelligence), R9

```
1. G-code validation engine (from R3-MS3 controller_validate)
2. Controller dialect translation (FANUC â†” Siemens â†” Haas â†” Okuma â†” others)
3. Post processor template library (10+ controllers)
4. UI: paste G-code â†’ select target controller â†’ get validated output
5. Integration: CAM plugin exports â†’ PPG validates â†’ operator gets clean code
```

---

<!-- ANCHOR: r11_ms2_shop_manager_quoting -->
## MS2: SHOP MANAGER / QUOTING
<!-- ANCHOR: r11_role_product_manager_model_opus_compliance_review_then_sonnet_impl_effort_m_10_calls_sessions_1 -->
### Role: Product Manager | Model: Opus (compliance review) then Sonnet (impl) | Effort: M (10 calls) | Sessions: 1
<!-- ANCHOR: r11_sessions_2_3_effort_h_prerequisites_r3_ms0_job_planner_r7_ms1_ms5 -->
### Sessions: 2-3 | Effort: H | Prerequisites: R3-MS0 (job planner), R7-MS1/MS5

```
1. Job intake: part description â†’ auto-generate job plan (R3-MS0)
2. Cost engine: job plan â†’ material cost + machine time + tool cost + labor
3. Quote generator: cost + margin â†’ professional quote document
4. Schedule integration: job â†’ available machines â†’ timeline (R7-MS5)
5. Sustainability report: environmental impact per job (R7-MS1)
6. Dashboard: active jobs, machine utilization, cost tracking
```

---

<!-- ANCHOR: r11_ms3_auto_cnc_programmer_acnc -->
## MS3: AUTO CNC PROGRAMMER (ACNC)
<!-- ANCHOR: r11_role_product_manager_model_opus_mandatory_final_launch_gate_effort_m_12_calls_sessions_1 -->
### Role: Product Manager | Model: Opus (MANDATORY final launch gate) | Effort: M (12 calls) | Sessions: 1
<!-- ANCHOR: r11_sessions_2_3_effort_xh_prerequisites_all_of_r3_r7_r9 -->
### Sessions: 2-3 | Effort: XH | Prerequisites: all of R3+R7+R9

```
1. Feature recognition: "pocket, 50mm deep, 100x80mm,  0.05mm"
2. Strategy selection: feature + material â†’ optimal toolpath strategy (R3-MS2)
3. Tool selection: strategy + material â†’ best tool from 12,000+ (R3-MS3)
4. Parameter calculation: tool + material + machine â†’ coupled physics params (R7-MS0)
5. G-code generation: strategy + params + controller â†’ validated G-code (R3-MS3)
6. Simulation: preview toolpath with collision detection
7. Complete output: setup sheet + G-code + tool list + cycle time estimate
```

---

<!-- ANCHOR: r11_phase_gate_r11_complete -->
## PHASE GATE: R11 â†’ COMPLETE

```
Gate criteria:
  SFC: end-to-end flow working (material â†’ params â†’ safety â†’ display)
  PPG: validates G-code for at least 5 controller families
  Shop Manager: generates accurate quotes for 3 sample parts
  ACNC: produces complete G-code from feature description for 1 sample part
  All products have: UI, API, documentation, onboarding
  The 60-second test: new user gets useful result in <60 seconds on SFC
  Ralph >= A- | Omega >= 0.80
```

---

<!-- ANCHOR: r11_r11_companion_assets -->
## R11 COMPANION ASSETS

```
SKILLS (4 new â€” product-specific):
  prism-sfc-guide           â€” Teaches Claude SFC product workflow
  prism-ppg-guide           â€” Teaches Claude PPG product workflow
  prism-shop-manager-guide  â€” Teaches Claude quoting/scheduling workflow
  prism-acnc-guide          â€” Teaches Claude auto-programming workflow

HOOKS (2 new):
  product_safety_gate       â€” blocking, ensures every product output includes S(x) score
  product_api_versioning    â€” warning, checks API version compatibility across products
```
