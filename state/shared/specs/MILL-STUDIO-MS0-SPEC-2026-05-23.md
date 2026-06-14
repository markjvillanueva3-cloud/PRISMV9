# MILL-STUDIO-MS0 — Mill Calculator Page Studio Spec

**Status:** spec — units enumerated, not yet shipped
**Author:** claude-e83edc54 (slot oscar, 2026-05-23, /goal pivot from BRIDGE-WIRE)
**Goal source:** *"begin working on all units for the mill calculator page studio. do deep research on the best looking web uis and app ui. determine if we have full functionality. see what we can add to our system to improve ui/ux design output | synergize with PSN"*

---

## 1. Current state — what exists (read-first audit, Karpathy R8)

### Mill domain panels in `mcp-server/web/src/components/mill/` (3 files, ~21K total)
| File | Size | Purpose | Wired into CalculatorPage? |
|---|---|---|---|
| `StrategyPanel.tsx` | 7.1K | facing/roughing/finishing/HSM/trochoidal/adaptive strategy chips, header tags `MILL-MASTER/P0-U04-STUDIO-PANELS` | **NO** — orphan |
| `ProgramPreview.tsx` | 6.4K | program preview render | **NO** — orphan |
| `SimPanel.tsx` | 7.4K | sim view | **NO** — orphan |

### Lathe peer surface (`components/calculator/Lathe*`) — 9 panels, ~88K
ChatterPanel · CostPanel · GroovingPanel · HardTurningPanel · InsertSelectorPanel · Sketch2D · ThreadingPanel · ToolLifePanel · WorkholdingPanel. All `lazyNamed`-imported into `CalculatorPage.tsx` (confirmed L206-228).

### WireEDM peer surface (`components/calculator/WireEdm*`) — 8 panels, ~165K
Backplot · Contour3D · ContourPicker · CostBreakdownPanel · FeasibilityPanel · OptimizeCards · PassChart · SurfaceIntegrityPanel. Eagerly + lazy imported into `CalculatorPage.tsx` (L16-30, L242+).

### Calculator scaffolding (cross-domain) — already exists
`CalculatorBackendAiReview.tsx` (17.6K) · `CalculatorProgramWorkbench.tsx` (71.4K) · `CalculatorSectionPurchaseModal.tsx` · `CalculatorSetupPreview3D.tsx` (17.3K) · `FeatureEditorPanel.tsx` (26K).

### Calculator utils + stores (mature)
`stores/calculatorStore.ts` + 33 `calculator*` files in `utils/`/`data/`/`api/`/`__tests__/` — surface-finish, coolant strategy, parameter optimization, purchase recommendations, programming catalog, JM Die mill variability oracle (test).

### Skills already related
`/mill` `/mill-studio` `/mill-master` `/mill-optimize` `/mill-validate` `/mill-awareness` `/mill-learn` `/mill-harden` `/mill-agi` — full mill skill family exists; the **UI layer is the bottleneck**.

---

## 2. The gap — what's missing (parity matrix)

**Mill is 5x understaffed in the calculator page studio vs Lathe and WireEDM.** Lathe has 9 dedicated panels for cutting strategy, threading, hard-turning, chatter, cost, tool-life, workholding, insert selection, 2D sketch. WireEDM has 8 panels for backplot, contour pick/3D, optimize cards, feasibility, cost, passes, surface integrity. Mill has 3 stub files — none wired.

### Parity matrix (domain × concern × shipped?)
| Concern | Lathe | WireEDM | **Mill** |
|---|:-:|:-:|:-:|
| Strategy chips / picker | ✓ (in CalcPage) | ✓ (in CalcPage) | **STUB (not wired)** |
| Program / G-code preview | ✓ | ✓ Backplot | **STUB (not wired)** |
| Sim view | ✓ | ✓ Contour3D | **STUB (not wired)** |
| Chatter / stability | ✓ LatheChatterPanel | n/a | **MISSING** |
| Cost breakdown | ✓ LatheCostPanel | ✓ WireEdmCostBreakdownPanel | **MISSING** |
| Tool life | ✓ LatheToolLifePanel | n/a | **MISSING** |
| Workholding | ✓ LatheWorkholdingPanel | n/a | **MISSING** |
| Insert / tool selector | ✓ LatheInsertSelectorPanel | n/a | **MISSING** |
| Surface finish | ✓ via SurfaceIntegrityCard | ✓ WireEdmSurfaceIntegrityPanel | **MISSING** |
| Feasibility check | n/a explicit | ✓ WireEdmFeasibilityPanel | **MISSING** |
| 2D sketch | ✓ LatheSketch2D | ✓ WireEdmContourPicker | **MISSING** |
| 3D setup preview | ✓ via CalculatorSetupPreview3D | ✓ Contour3D | shared — exists |
| Pass schedule / chart | ✓ PassScheduleChart (shared) | ✓ WireEdmPassChart | shared — exists |

**8 missing mill-specific panels + 3 stub panels needing wiring + 1 page-level orchestration = ~12 units.**

---

## 3. Functionality assessment — backend already supports this

The mill calculator can ship today because the engine layer is rich:
- **Force/Physics:** `KienzleForceModelEngine`, `CuttingForceEngine`, `StochasticCuttingForceEngine`, `ConstitutiveModelEngine`
- **Speed/Feed:** `UltimateSpeedFeedEngine`, `AutoSpeedFeedEngine`, `SpeedFeedOrchestratorEngine` (2.8K LOC central hub)
- **Chatter/Stability:** `ChatterStabilityLobeEngine`, `RegenerativeChatterEngine`, `DampingOptimizationEngine`, `StochasticChatterEngine` (13 engines per CLAUDE.md)
- **Deflection:** `ToolDeflectionEngine`, `PartDeflectionEngine` (17 engines)
- **Thermal:** `CuttingTemperatureEngine`, `ThermalWearCouplingEngine` (24 engines)
- **Wear/Life:** `ToolWearProgressionEngine`, `StochasticToolLifeEngine` Weibull (9 engines)
- **Surface:** `SurfaceFinishPredictorEngine`, `SurfaceIntegrityEngine`, `ResidualStressEngine` (17 engines)
- **Mill master:** `MillMasterOrchestratorFacadeEngine` (referenced by StrategyPanel.tsx header) + `/mill-master` skill

The dispatcher path is already paved: `prism_calc` for physics, `prism_cam` for toolpath, `prism_safety` for S(x) gates. The mill UI layer just needs to **expose** what's already built.

---

## 4. Web UI / UX research — best-in-class engineering calculator patterns

PRISM Calculator already uses **shadcn/ui + Radix + Tailwind** (per `web/src/components/ui/*`) — modern stack. Reference patterns from contemporary engineering calculator + studio UIs:

### Layout patterns
- **Split-pane workbench** (Onshape, Fusion, Altium Designer) — left rail for inputs, center for canvas/viz, right rail for parameters + outputs. Already used by `CalculatorProgramWorkbench.tsx`.
- **Inspector pattern** (Figma, Linear, Notion) — collapsible right-side parameter panels grouped by concern. Lathe panels follow this — Mill should too.
- **Strategy chips → progressive disclosure** (Adobe Creative Cloud, Vercel dashboards) — pick a strategy, only the parameters relevant to that strategy expand. `StrategyPanel.tsx` has the chip structure already.
- **Real-time recompute with debounced inputs** (Desmos, GeoGebra, OnShape FeatureScript) — every input change re-fires the speed/feed/force/chatter pipeline with a 150-300 ms debounce. `calculatorStore.ts` should orchestrate.

### Visual patterns
- **Domain-color tokens** — Mill = blue family / Lathe = amber / WireEDM = green (extend existing `index.css` 108K token system). Visual lane separation.
- **Status badges on every input** — `green` validated, `amber` near-limit, `red` exceeds-machine-envelope (powered by `MachineLimitGuard` hook). Trust-builder for shop-floor users.
- **Live-derived viz** — surface-finish Ra prediction sparkline next to feed-rate input; chatter stability lobe overlay on RPM picker. Use `visx` or `recharts` (already in lock).
- **3D setup preview always visible** (already shipped via `CalculatorSetupPreview3D` + `React-Three-Fiber` per `mcp-cadquery/frontend` startup banner) — Mill page just needs to feed mill-setup geometry.

### Interaction patterns
- **Copy-as for outputs** — "copy as G-code", "copy as MathML", "copy as JSON", "copy as PRISM-spec". Reduces friction for downstream consumers.
- **Share-via-link with state in URL hash** (Wolfram Alpha, Desmos, Excalidraw) — every calculator state must be reproducible from URL alone. `calculatorStore` zustand persist + URL hash sync.
- **Keyboard-driven** (Linear, Raycast) — `?` opens shortcut sheet; `Cmd+K` opens action palette wired to `prism_calc` actions.
- **A11y first** — every input has `aria-describedby` pointing at unit + range + physics-formula reference (per existing `a11y-debugging` chrome-devtools skill).

### Anti-patterns to avoid
- Mill page becoming a 2nd 656K monolith — split into lazy-loaded panels from day one (Lathe/WireEDM do this).
- Hidden cliffs — show "this calculation has 8 assumptions" up-front, not behind a tooltip.
- Hard-coded materials/tools — every dropdown sourced from the registry layer (`material-lookup`, `tool-catalog`).

---

## 5. PSN synergy — wire all 11 legs into the mill calculator

Per [[feedback_psn_definition]] (11-leg PRISM Synergy Network), the mill calculator page studio must touch every leg:

| Leg | How the mill calculator synergizes |
|---|---|
| **1. Obsidian brain** | Every "explain" tooltip queries Obsidian memory for related ship history. Stop hook records calculator session → memory. |
| **2. PRISM OS** | Calculator runs inside `prism_operating_system` shell mode — role-aware (operator vs programmer vs engineer). Pull `/operating-system` workspace context. |
| **3. Wiki** | Every formula in the UI has a `[[wiki-link]]` button → opens `/wiki-query <formula-name>`. Strategy chips link to `knowledge/wiki/architecture/{cam,mill}/`. |
| **4. Memories** | "Why this RPM?" pulls relevant `reference_*` files. Memory-relevance hook surfaces prior similar setups. |
| **5. Tribal Knowledge** | Every strategy chip shows top-3 tribal tips from `tribal-embed-index.json` slot-domain `mill`. ("Don't pocket dry aluminum" surfaces inline.) |
| **6. System Viz** | "Show in system viz" button opens `/system-viz` filtered to mill engines. Master-index search inline. |
| **7. Engines** | Calculator wires to `MillMasterOrchestratorFacadeEngine` + 100+ mill-relevant engines via lazy dispatcher calls. |
| **8. Algorithms** | Calculator surfaces algorithm choices (Kienzle vs Constitutive for force; classic vs stochastic for chatter) with rationale UI. |
| **9. Formulas** | Inline formula display via MathML/KaTeX (existing in WireEdm panels); never inline constants — pull from `physics/constants.ts`. |
| **10. NN/GNN** | "Recommend strategy" button calls GNN tier-5 wiring-inference for unknown setups; falls back to heuristics if AUROC < 0.78. |
| **11. PRISM AI** | "Ask the AI" panel routes via `aiSystemRouterEngine.route()` → `prismCreativeReasoningEngine.explore("optimal")`. Octopus 5-voice consensus available for high-stakes overrides. |

PSN-synergy is **the differentiator** vs G-Wizard / FSWizard / HSMAdvisor — those competitors are isolated calculators with no knowledge graph backing them. PRISM's calculator should feel like it *knows your shop* because PSN actually does.

---

## 6. Unit enumeration — full scope (12 units, MILL-STUDIO-MS0)

Per COMPREHENSIVE-BUILD ENFORCEMENT: list ALL units, no "and others."

### Phase A — wire existing stubs (3 units, fast)
- **U-MSTUD-A1** — Import `StrategyPanel` into `CalculatorPage.tsx` mill-mode, wire to `MillMasterOrchestratorFacadeEngine` via `prism_cam` dispatcher. Lazy-load.
- **U-MSTUD-A2** — Import `ProgramPreview` into mill-mode, wire to `g-code-render` action. Lazy-load.
- **U-MSTUD-A3** — Import `SimPanel` into mill-mode, wire to `program_simulate` action. Lazy-load.

### Phase B — build 8 missing mill-specific panels (parity with Lathe/WireEDM)
- **U-MSTUD-B1** — `MillChatterPanel.tsx` → `ChatterStabilityLobeEngine` (lobe diagram, RPM picker, depth-of-cut slider).
- **U-MSTUD-B2** — `MillCostPanel.tsx` → cycle-time + tool-life + coolant + spindle cost breakdown.
- **U-MSTUD-B3** — `MillToolLifePanel.tsx` → Taylor + Weibull stochastic projection.
- **U-MSTUD-B4** — `MillWorkholdingPanel.tsx` → fixture stiffness + part-deflection + clamp force advisor.
- **U-MSTUD-B5** — `MillToolSelectorPanel.tsx` → tool registry filter + holder compatibility + diameter/length recommendation.
- **U-MSTUD-B6** — `MillSurfaceFinishPanel.tsx` → predicted Ra/Rz sparkline, stepover-vs-finish tradeoff curve.
- **U-MSTUD-B7** — `MillFeasibilityPanel.tsx` → green/amber/red badges (machine envelope, spindle power, max RPM, tool reach).
- **U-MSTUD-B8** — `MillSketch2D.tsx` → feature-class picker (pocket/contour/slot/face/drill pattern) with simple 2D sketch input.

### Phase C — PSN-synergy weave (1 unit)
- **U-MSTUD-C1** — Wire all 11 PSN legs into the mill mode per §5 table. Mostly UI affordances (link buttons, "explain" tooltips, "show in viz") + 1 new shared component (`<PSNExplain>` reusable inline tooltip).

### Validation
- Each B-unit ships with vitest dispatcher-round-trip tests (≥10 it()), like the BRIDGE-WIRE-AGENT pattern proven this session.
- Each ships with a story in `__tests__/<panel>.test.tsx` rendering a real engine result, no mocks.
- Per-file scrutiny on multi-file shipments.

---

## 7. Compounding gains (every iter must emit one per /forge6 doctrine)

- **MILL-STUDIO-PSN-MATRIX.md** — this spec itself; future PSN-extension audits can read the §5 matrix to know what's wired.
- **Reusable `<PSNExplain>` component** (U-MSTUD-C1) — Lathe + WireEDM panels can adopt it for parity.
- **Mill panel template** — first B-unit becomes the template; subsequent units copy-paste the lazy-import + dispatcher-wire boilerplate. ~10 min/panel after B1.
- **CalculatorPage.tsx is brittle (656K monolith)** — adding mill mode forces incremental split-into-feature-folders refactor, paying down debt for all 3 domains.

---

## 8. Risks + open questions

- **CalculatorPage.tsx 656K monolith** — editing in place is high-risk for peer absorption. Phase A may require `git worktree add` to a slot-worktree.
- **Mill-master engine surface API** — `StrategyPanel.tsx` header references `MillMasterOrchestratorFacadeEngine` but the actual engine method names need verification before Phase A wires.
- **Component naming clash** — Lathe panels are `LatheChatterPanel` (under `components/calculator/`), Mill stubs are `StrategyPanel` (under `components/mill/`). Decide: rename mill stubs to `MillStrategyPanel` + relocate to `components/calculator/`, OR keep mill in own folder + extend pattern. Recommendation: **rename + relocate** for consistency.
- **PSN explain tooltip backend** — wiring the explain tooltip to memory/wiki/tribal requires a new `prism_memory:explain_for_input` action, or reuse `master_index_query`. Per Karpathy R8, reuse `master_index_query`.

---

## 9. Iter pickup order (proposed)

1. **U-MSTUD-A1** (fastest, lowest risk, unblocks the page) — wire the existing StrategyPanel stub.
2. **U-MSTUD-A2 + A3** — finish the existing stub trio.
3. **U-MSTUD-B7** (Feasibility) — small, immediately useful, drives confidence for B-series.
4. **U-MSTUD-B2** (Cost) — operator-facing value, leverages existing cycle-time engines.
5. **U-MSTUD-B1** (Chatter) — flagship physics feature.
6. Remaining B-units (B3, B4, B5, B6, B8) in any order.
7. **U-MSTUD-C1** (PSN-synergy weave) — last, after the panels exist to attach affordances to.

---

## 10. References

- [[feedback_psn_definition]] — PSN 11-leg canonical definition.
- `mcp-server/web/src/pages/CalculatorPage.tsx` L16-30, L206-242 — Lathe/WireEDM lazy-import pattern.
- `mcp-server/web/src/components/mill/StrategyPanel.tsx` header — `MILL-MASTER/P0-U04-STUDIO-PANELS` reference (envelope not found — half-shipped).
- `mcp-server/data/milestones/` — MILLTURN-AI exists; MILL-MASTER envelope does NOT (should be created as MILL-STUDIO-MS0 alongside this spec).
- CLAUDE.md §"ENGINE WIRING — WIRE TO ALL VIABLE SOURCES" — applies to UI panels too: wire to every consumer dispatcher, not just one.
