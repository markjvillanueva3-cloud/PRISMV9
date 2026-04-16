# Calculator Feature Leverage Audit

Generated: 2026-04-07
Scope: `H:\PRISM` calculator-applicable surfaces only. This audit covers the features that can credibly improve the calculator page for `mill`, `lathe`, and `wire_edm`; it does not try to force unrelated ERP or specialty pages into the calculator UI.

## Summary

The calculator is already using the real production solve path, not a fake demo lane.

What is already wired:
- Live calculator catalogs for machines, materials, programming environments, tooling, holders, and parts search.
- Real speed/feed solve via `/api/v1/speed-feed/orchestrate` and `/api/v1/speed-feed/quick`.
- Real tooling ROI analysis via `/api/v1/speed-feed/tool-roi`.
- Dedicated wire EDM solve path instead of routing wire through generic spindle math.
- Backend orchestration that resolves machine, tool, material, holder, coolant, workholding, CAM strategy, and geometry before computing results.

What was missing at the frontend boundary before this audit:
- No exported frontend helpers for `/speed-feed/resolve/machine`.
- No exported frontend helpers for `/speed-feed/resolve/tool`.
- No exported frontend helpers for `/speed-feed/compare`.
- No exported frontend helpers for `/speed-feed/optimize`.

Those helpers have now been added in `web/src/api/speedfeed.ts`.

## Evidence

Primary calculator page consumers:
- `web/src/pages/CalculatorPage.tsx`
- `web/src/api/speedfeed.ts`
- `web/src/api/calculatorData.ts`
- `src/routes/speedfeed.ts`
- `src/routes/data.ts`
- `src/engines/SpeedFeedOrchestratorEngine.ts`

Confirmed current calculator page usage:
- `sfOrchestrate`
- `sfQuick`
- `sfToolRoiAnalysis`
- live catalog loaders for machines, materials, programming, tooling, holders
- `listParts`

Confirmed backend routes available for calculator-grade use:
- `/speed-feed/orchestrate`
- `/speed-feed/quick`
- `/speed-feed/stochastic`
- `/speed-feed/resolve/machine`
- `/speed-feed/resolve/tool`
- `/speed-feed/resolve/material`
- `/speed-feed/compare`
- `/speed-feed/optimize`
- `/speed-feed/inventory-select`
- `/speed-feed/tool-roi`

Confirmed routes or helpers not previously surfaced on the calculator page:
- `sfStochastic`
- `sfResolveMachine`
- `sfResolveTool`
- `sfCompare`
- `sfOptimize`
- `sfInventoryToolSelect`

## Already Leveraged Well

### 1. Real Solve Backbone

`CalculatorPage` already calls the live speed/feed API and normalizes the result through the calculator contract. This is the strongest calculator foundation on the page today.

### 2. Real Catalog Hydration

The page already hydrates:
- machine catalog state
- material catalog state
- programming catalog state
- tool catalog state
- holder catalog state
- parts search

That means the calculator is not just guessing selectable state from static UI lists.

### 3. Real Backend Context Resolution

`SpeedFeedOrchestratorEngine` already resolves:
- machine
- tool
- material
- holder
- coolant
- workholding
- CAM strategy
- geometry

The calculator does not expose all of those resolve stages independently, but the main solve already benefits from them.

## Available And Strongly Applicable, But Still Underused

### 1. Stochastic Solve

Status:
- Backend route exists.
- Frontend helper exists.
- Calculator page does not use it.

Why it matters:
- This is the cleanest path to a real uncertainty / confidence / process-risk lane for PRISM mode.
- It fits paid-tier depth naturally without degrading the free-tier base solve.

Recommended use:
- Run `sfQuick` for free-tier fast solve.
- Run `sfOrchestrate` for default paid solve.
- Run `sfStochastic` for PRISM mode confidence bands, process spread, and optimization-risk context.

### 2. Machine-Only And Tool-Only Resolve

Status:
- Backend routes exist.
- Frontend helpers were missing before this audit and are now exported.
- Calculator page does not use them yet.

Why it matters:
- These can power preflight machine and tooling validation before a full solve.
- They would improve early warnings when a selected machine or tool body is poorly matched before the user reaches final output.

Recommended use:
- Preflight machine capability after machine selection changes.
- Preflight tool capability and limits after tool or holder selection changes.

### 3. Scenario Compare

Status:
- Backend route exists.
- Frontend helper was missing before this audit and is now exported.
- No calculator page usage yet.

Why it matters:
- This is directly applicable to “same part, different machine / tool / holder / coolant / strategy” comparisons.
- It belongs on the calculator more than on a generic separate utility page.

Recommended use:
- Compare selected setup against one alternative:
  - current holder vs shorter-gauge holder
  - free-tier baseline vs PRISM optimized candidate
  - current machine vs alternate machine

### 4. Multi-Objective Optimize

Status:
- Backend route exists.
- Frontend helper was missing before this audit and is now exported.
- No calculator page usage yet.

Why it matters:
- This is the cleanest backend-backed PRISM optimization lane.
- It matches the requested product split: strong free-tier guidance, deeper paid optimization.

Recommended use:
- Keep free tier on legality-aware, machine-aware, materially useful baseline output.
- Reserve optimizer-backed search depth and Pareto tradeoffs for paid PRISM modes.

### 5. Inventory-Aware Tool Selection

Status:
- Backend route exists.
- Frontend helper already existed.
- Calculator page does not use it.

Why it matters:
- This answers the machinist question: “What can I run with what I already have?”
- It is more actionable than ROI alone because it can constrain the recommendation before purchase analysis.

Recommended use:
- Run before ROI if the user has an active tool crib.
- Fall back to ROI upgrade recommendations only when the inventory lane cannot satisfy the requirement.

## Strong Backend Engines That Can Improve The Calculator, But Should Be Applied Carefully

### 1. `ControllerStrategyValidatorEngine`

Why it fits:
- Can validate whether a chosen CAM-style toolpath is actually executable on the selected control family.

Best use:
- Preflight warning for advanced toolpaths and controller-specific limitations.

### 2. `AccessibilityAnalysisEngine`

Why it fits:
- Can verify tool plus holder reach and holder collision risk.

Best use:
- Setup preview and feasibility warnings when geometry depth, wall spacing, or holder geometry are known.

### 3. `WorkholdingVerificationEngine`

Why it fits:
- Can validate grip-force margin, ejection risk, and datum-shift risk.

Best use:
- Output-side warning or PRISM setup check when cutting-force and clamp posture are known.

Current blocker:
- The calculator still lacks a live dedicated workholding route, so the page cannot claim full workholding intelligence yet.

### 4. `AdaptiveToolpathRouterEngine`

Why it fits:
- Can route features to more precise strategy families than broad UI buckets.

Best use:
- Map calculator toolpath selections to stronger physics and legality profiles behind the scenes.

### 5. `ToolInventoryOrchestratorEngine`

Why it fits:
- Can answer on-hand feasibility, substitution, and reorder logic.

Best use:
- Bridge the calculator to the user tool crib instead of relying on static tool recommendations only.

### 6. `UnifiedPhysicsVerifierEngine`

Why it fits:
- Cross-checks the same cutting case across multiple physics paths.

Best use:
- CI and release gate validation, not primary user-facing calculator UI.

## Adjacent Features That Should Not Be Forced Into The Calculator Page

These are useful, but they already belong to separate specialist pages or quoting/post-processing flows:
- `machineRateCompare`
- `inventoryToolOptimize`
- `stockSizeOptimize`
- `materialPriceCompare`
- `ppgCompare`
- `ppgCycleTimeCompare`
- `ppgToolOptimize`

Recommendation:
- Link to them from the calculator when context makes sense.
- Do not collapse them into the main calculator surface by default.

## Confirmed Gaps

### 1. Workholding Is Still Curated

There is still no dedicated backend workholding catalog route in `src/routes/data.ts`.

Impact:
- Workholding selection is useful, but it is not yet as live-backed as machines, materials, tooling, holders, or programming.

### 2. Calculator Page Still Leaves High-Value Routes Unused

The page still does not consume:
- `sfStochastic`
- `sfResolveMachine`
- `sfResolveTool`
- `sfCompare`
- `sfOptimize`
- `sfInventoryToolSelect`

### 3. Free vs Paid Contract Still Needs Enforcement

The calculator product goal is clear, but the explicit route-level and page-level tier contract is still roadmap work, not fully enforced code.

## Recommended Integration Order

1. Use `sfResolveMachine` and `sfResolveTool` as calculator preflight checks.
2. Add `sfInventoryToolSelect` before ROI when a tool crib is present.
3. Use `sfCompare` for same-setup what-if comparisons on the calculator.
4. Use `sfOptimize` as the backend PRISM optimization lane for paid tiers.
5. Use `sfStochastic` to power PRISM confidence / uncertainty / process-risk cards.
6. Add `ControllerStrategyValidatorEngine` warnings for advanced CAM-style paths.
7. Add `AccessibilityAnalysisEngine` and `WorkholdingVerificationEngine` once geometry and workholding inputs are sufficiently live-backed.
8. Use `UnifiedPhysicsVerifierEngine` as a release gate and validation harness, not as everyday page UI.

## Bottom Line

The calculator is already using the real speed/feed backbone and live catalog stack, which is good.

The biggest missed opportunities are not “missing all backend work.” They are:
- missing page-level access to stochastic, compare, optimize, and inventory-aware selection
- missing preflight machine/tool resolve surfaces
- missing live-backed workholding

Those are the highest-value leverage points still available on `H:\PRISM` for the calculator page.
