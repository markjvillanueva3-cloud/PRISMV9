---
artifact: domain-buildout-plan
slot: charlie
galaxy: quoting
galaxy_dir: mcp-server/src/engines/quoting/
kienzle_pages: ["Kienzle Quote.dc.html", "Kienzle Job Cost.dc.html"]
backend_dispatchers: [prism_quoting, prism_business]
frontend_owner: quebec
status: draft
generated_by: charlie-plan-agent
generated_at: 2026-06-26
---

# DOMAIN BUILDOUT PLAN — charlie (quoting)

> Finalized plan to take the quoting galaxy to **PhD-master depth**, then **test → simulate → validate → fine-tune**, then **build/flesh out the frontend** from the Kienzle Claude-Design build.
> Universal rails (R1–R16 · scrutiny 3-of-3 · units-first · no-stub · no-inline-constants · canonical physics from `src/physics/constants.ts`) bind every step → `H:/prism/CLAUDE.md`.
> Parent: `state/shared/domain-plans/00-MASTER-ORCHESTRATION-PLAN.md`.

## §1 — Domain identity & scope

- **Owns:** print-to-quote pipelines · instant quote generation · multi-process routing (mill/lathe/wedm/casting/additive/injection-mold/sheet-metal/weld-fab) · quote-vs-actual reconciliation · historical price + material price tracking · freight + import cost · cost-aware routing · blueprint-to-quote bridge · customer-facing quote generation · JM Die financial baseline ($355M DocuStrata actuals, 6,718 real records) · closed-loop OODA calibration + outcome ledger.
- **Excludes:** post-quote work-order management (hotel/business galaxy) · per-domain CAM strategy (mill/lathe/wedm) · OCR/blueprint parsing (xray) · ERP master-data (hotel) · actual cost ERP sync creds (hotel-owned).
- **Slot worktree:** `H:/prism-slot-charlie` · branch `slot/charlie`
- **Galaxy brain:** `mcp-server/src/engines/quoting/{CLAUDE,MEMORY,PATHS,TOOLBELT,AWARENESS}.md`

## §2 — Current state (verified, not assumed — R12)

- **Scaffolding:** PARTIAL — AI-synergy audit all-4 dims score=1 (discoverability/ownsOrWiresAi/vaultSynergy/crossSubstrate). CLAUDE.md, MEMORY.md, AWARENESS.md all present; OPEN-THREADS.md maintained. 13-artifact gate: CLAUDE+MEMORY+PATHS+TOOLBELT confirmed; SOUL.md status unverified this session.
- **Engines / dispatcher actions:** ~78 engines confirmed (MEMORY.md ref `reference_charlie_quoting_engine_map`). Engine families: orchestrators (InstantQuoteEngine, BlueprintToQuoteBridgeEngine, JMDieQuoteTrainingPipelineEngine), per-process (Additive/Casting/InjectionMold/SheetMetal/WeldFabrication), cost core (JobCostingEngine, ActualCostEngine, CostEstimationEngine, CycleTimeEstimatorEngine, GCodeTimeEstimatorEngine, FreightCostEngine, ImportCostEngine), routing+governance (CostAwareRouterEngine, CostEfficiencyBridgeEngine, CostAlarmEngine, CostSavingsTrackerEngine), reconciliation+loop (ERPCostFeedbackEngine, QuoteToOrderBridgeEngine, LatheActualCostReconciliationEngine, QuoteOutcomeFeedEngine, QuotingActualOutcomeLoaderEngine, QuoteOutcomePSIDeltaBridgeEngine, QuotingOutcomeLedgerDigestEngine), pricing indexes (VendorCostIndexEngine, OutboundPriceIndexEngine, QuotingCalibrationEngine). `prism_quoting` dispatcher: ~15 confirmed actions including `camera_intake_route`, `gcode_time_estimate`, `gcode_cycle_time`, `fair_market_value`, `inflation_adjust`, `cost_index_prior`, `outbound_price_prior`, `outbound_promote_check`, `training_status`, `closed_loop_provenance_check`, `cost_savings`, `closed_loop_outcome_digest`, `quote_outcome_feed`, `jm_die_quote_training_pipeline`, `jm_die_docustrata_ingest`.
- **Knowledge legs (PSN 11-leg):**
  - Obsidian brain (#1): PRESENT — `knowledge/memories/patterns/quoting_synthesis.md` confirmed; 40 curated memory files.
  - Wiki (#3): 356 wiki entries matching keyword heuristic; sample entries confirmed under `knowledge/wiki/code-tribal/learnings/cost-cascade-ms0-*.md`.
  - Tribal (#5 / system-viz leg): 81 tribal tips matching galaxy keyword — THIN vs the target of 120+.
  - Memories (#4): 40 curated files; gap = non-obvious gotcha facts not yet written (grain mismatch, VendorCostIndex units-blended, DocuStrata INBOUND-only).
  - System-viz (#6): cross-substrate edges present (`owned-by-slot`, `documented-by`); `prism_quoting` node confirmed.
  - Engines (#7): 78 engines; 2 AI reasoning bridges (QuotingDeepReasoningBridgeEngine, QuotingNeuralReasoningBridgeEngine).
  - Algorithms (#8): knn/gmm/dtw primitives mapped via `prism_algorithm`; not yet consumed in training path.
  - LoRA (#9): vault→LoRA feed active (`scripts/vault-to-lora-dataset.mjs`); dataset quality ungated (no coverage floor test).
  - NN/GNN (#10): ghost-wiring candidates classified by GraphSAGE tier-5; refpool contribution unverified this session.
  - PRISM-OS (#2) + PRISM-AI (#11): reasoning bridge live; `gpt-oss:120b` on Blackwell for deep pricing-model reasoning confirmed in CLAUDE.md §13.
- **Known landmines (R12):**
  1. **Training loop coverage 40%** — only 2 of 5 sources consumed (baseline + outbound-when-match); `jm-vendor-cost-index.json` / `jm-tool-purchases.json` / `docustrata-invoices.curated.json` unconsumed (gotcha #25 units-blended prereq blocks vendor cost index).
  2. **VendorCostIndex unitCost.median is units-blended** — $/bar·$/foot·$/piece; `U-QP-COST-BASIS-NORMALIZE` prerequisite not shipped; never feed as per-unit into training.
  3. **frontend `training_status` consumer pending** — `U-QP-TRAINING-STATUS-SNAPSHOT` backend wired; frontend panel not yet live.
  4. **Glob silent-exclusion** (gotcha #1, `211ab8e1f3`) — prefix-anchored test globs silently exclude non-matching files; always use explicit regex alternation.
  5. **Baseline poisoning gate** — degenerate stub baseline MAPE=1881%; guard `scripts/lib/quoting-baseline-guard.mjs` blocks it; never run `--baseline` without preflight.
  6. **psi_delta_fed_count=0 dead-feed** — fixed `1e67cfab93`; verify before any closed-loop health assertion.
  7. **DocuStrata INBOUND-only** — 72% SCAN_GENERIC receipts, NOT outbound revenue; `H:/PRISM/JM DIE/QUOTES/` does not exist (gotcha #4).
  8. **tsx-reexec required** — bare `node` on train-cycle fails ERR_MODULE_NOT_FOUND under Node 24 type-strip (fixed `U-QP-TSX-REEXEC`); always invoke via tsx or the self-reexec guard.

## §3 — Deepening roadmap → PhD master (engineered loop)

**Tribal tips to add:** current=81; target=130. Sources: JM Die AP-ledger patterns (20,736 entries), DocuStrata INBOUND corpus manifest, JM sold-orders (6,718 actuals at $355M), vendor RFQ notes from `jm-vendors.jsonl`, tribal sessions with shop floor on labor routing vs outsource decisions. Capture via `prism_knowledge:tribal_capture slot=charlie`. Priority topics: quoting margin degradation patterns by material/process, freight lane unit economics (FreightCostEngine), import duty classification errors (ImportCostEngine), quantity-break inflection pricing (per Kienzle Quote design §Quantity breaks panel), outsource-vs-make decision rules by machine availability.

**Wiki entries to write/cross-link:**
- `knowledge/wiki/architecture/quoting/quoting-vendor-cost-normalize.md` — U-QP-COST-BASIS-NORMALIZE grain-tag protocol; prerequisite for 3rd training source.
- `knowledge/wiki/lessons/quoting-grain-mismatch.md` — per-part-job FMV vs per-line ext_price grain trap (gotcha #15/16; already has [[quoting-outbound-price-prior]] but needs a standalone lesson node).
- `knowledge/wiki/architecture/quoting/quoting-training-coverage-roadmap.md` — 2→5 source coverage plan with per-source unit + gotcha index.
- `knowledge/wiki/architecture/quoting/quoting-multi-process-routing.md` — 8-process cost-model matrix (mill/lathe/wedm/casting/additive/sheet-metal/weld-fab/injection-mold) with cross-reference to per-process engine.
- `knowledge/wiki/architecture/quoting/quoting-quantity-break-model.md` — quantity-break pricing math (setup amortization curve, tooling fixed-cost spread).

**Memories to write:**
- `reference_charlie_quoting_vendor_cost_normalize_<date>.md` — grain-tag protocol + AP-ledger description parsing plan.
- `reference_charlie_quoting_jm_tool_purchases_schema_<date>.md` — `jm-tool-purchases.json` schema + grain classification before consumption.
- `feedback_charlie_quoting_tsx_reexec_always.md` — standing doctrine: train-cycle MUST self-reexec under tsx; bare node breaks on Node 24 TS type-strip.
- `reference_charlie_docustrata_actuals_closed_loop_<date>.md` — 6,718-record/$355M wire summary (already partially in MEMORY.md latest arc — promote to standalone reference).

**RAG corpus:** primary trove = `state/shared/quoting/` (baseline-records-corpus-with-real.json 47,905 records + orders-closed-actuals.jsonl 6,718 + AP-ledger 20,736 entries + sold-orders 500/240 verified). Embed target: all 47,905 baseline records + actuals into Qdrant `quoting-corpus` collection via `prism_memory:embed_corpus`. Secondary: DocuStrata manifest `H:/PRISM/Docustrata/manifest.json` (search via `.index/` only — never re-OCR). Dense/hybrid RAG arm already on by default in `galaxy-reasoning-bridge.mjs` (`PRISM_GALAXY_RAG_DENSE=0` to opt out).

**CAG cold-anchor:** cache quoting CLAUDE.md §5 gotchas (all 25) + jm-die-profile.ts shop-rate table + `QUOTING_DATA_SOURCES` manifest as the static cold-tier anchor via `scripts/lib/cag-router.mjs`. Refresh cadence: weekly or on any new gotcha.

**NN/GNN features:** quoting engine nodes need feature vectors for the wiring-inference refpool (owner: india). Priority nodes: `InstantQuoteEngine`, `JobCostingEngine`, `CostAwareRouterEngine`, `QuoteOutcomeFeedEngine` (4 nodes; submit to india `xproc_kg_project_features` after verifying action name against live india dispatcher).

**LoRA dataset:** `quoting_lora_train.jsonl` / `quoting_lora_test.jsonl` — instruction pairs drawn from the 47,905-record corpus (input=part/material/process features, output=FMV + cost breakdown). Target: 2,000 train / 400 test pairs. Emit via `PRISM_GALAXY_BRIDGE_LORA_EMIT=1` on galaxy-reasoning-bridge; india trains; promote IFF MAPE ≤ 25% on held-out actuals.

**Engineered loop + cron:**
- Nightly: `scripts/quoting-train-cycle.mjs --json` (tsx self-reexec guard active) → updates `state/shared/quoting/latest-training-status.json` + drift-alert → emits `quote_outcome_feed` to close OODA loop.
- Weekly: `node scripts/mine-galaxy-transcripts.mjs --galaxy quoting` via Ollama qwen2.5-coder:32b → synthesis → tribal/wiki updates.
- Acceptance signal: training coverage ≥ 60% (3 of 5 sources), calibration factor drift < 15% week-over-week, MAPE ≤ 35% on real actuals holdout.

**Ollama offload:** summarize RFQ/print text → `gpt-oss:20b`; lint engine/test code → `qwen2.5-coder:32b`; deep pricing-model reasoning + multi-source reconciliation → `gpt-oss:120b` (Blackwell 96GB). Deterministic $ math stays in engines; never route numerical transforms to LLM.

## §4 — Test plan (real assertions — R9)

**Unit (reference-value / algebraic-invariant):**
- `InstantQuoteEngine.test.ts` — assert FMV for known JM Die SEMBLEX trilobe punch (D2 steel, ×10, mill+wire) falls within ±20% of `orders-closed-actuals.jsonl` matched record; assert `pct_error` formula: `(predicted - actual) / actual` (not reversed); assert `psi_delta_fed_count > 0` after one `quote_outcome_feed` call.
- `JobCostingEngine.test.ts` — assert labor + material + burden + outside sum equals total cost (algebraic identity: `Σ cost_components = total_cost`); assert per-unit cost is NOT derived from `VendorCostIndexEngine.unitCost.median` (units-blended guard).
- `CostEstimationEngine.test.ts` — assert shop rates read from `jm-die-profile.ts` (not inline); assert output unit is USD per part-job (not per-piece); reference: canonical machine-hour rate from `src/data/jm-die-profile.ts`.
- `QuotingCalibrationEngine.test.ts` — assert calibration factor stays in [0.5, 2.0] after 10 feed iterations (drift bound); assert that `synthetic_revenue_dominant` corpus yields advisory flag, not training abort.
- `OutboundPriceIndexEngine.test.ts` — assert `compareToPredicted({against:'line'})` uses per-line `extPrice` distribution (grain-correct); assert two-sample KS p-value is numeric (not undefined) on ≥ 30 sample reference.

**Integration (round-trip through dispatcher):**
- Round-trip `prism_quoting:fair_market_value` → assert Zod schema validates (action enum, required params); assert response contains `predicted_fmv_usd`, `confidence`, `cost_breakdown`.
- Round-trip `prism_quoting:outbound_promote_check` → assert promotion gate fires FAIL-LOUD when `psi_delta_fed_count === 0` (not silently returning ok).
- Round-trip `prism_quoting:training_status` → assert `latest-training-status.json` freshness < 25h; assert `data_source_coverage.covered` ≥ 2 of 5.
- Round-trip `prism_quoting:cost_savings` with each of 8 `roi_*` sub-actions → assert each returns numeric value, not undefined.

**E2E (JM Die live data):**
- Load `state/shared/quoting/orders-closed-actuals.jsonl` (6,718 records); run `InstantQuoteEngine` on a stratified 50-record sample; assert MAPE ≤ 50% (directional baseline; tighten to 35% post fine-tune).
- Run `scripts/quoting-pipeline-verify.mjs --json`; assert exit 0, all TAP tests pass.

**Coverage floor:**
- Happy path: SEMBLEX trilobe punch with D2 + mill+wire+grind process route + standard tolerance.
- Failure modes (≥3): (1) `VendorCostIndexEngine.unitCost.median` fed as per-unit → must throw units-blended guard; (2) degenerate baseline (MAPE > 500%) → `quoting-baseline-guard.mjs` must block; (3) `psi_delta_fed_count = 0` → `closed_loop_provenance_check` must FAIL-LOUD.
- Adversarial (≥2): (1) `qty = 0` → no division-by-zero, returns structured error; (2) `predicted_fmv_usd = NaN` → `assessUnderQuotes` skips via non-finite guard (proven double-guard).
- Spanning configs (≥3): (1) carbide + sinker EDM single-process; (2) 17-4 PH stainless + mill+turn multi-process; (3) M2 HSS + jig-grind + FAI inspection.

**Target test files:** `src/__tests__/InstantQuoteEngine.test.ts` · `src/__tests__/JobCostingEngine.test.ts` · `src/__tests__/CostEstimationEngine.test.ts` · `src/__tests__/QuotingCalibrationEngine.test.ts` · `src/__tests__/OutboundPriceIndexEngine.test.ts` · `src/__tests__/quotingDispatcher.wire.test.ts` (new — dispatcher round-trip).

**Runner:** `cd mcp-server && rtk npx vitest run -t "Quote|Cost|Estimat|Pricing|Calibrat"` + `node H:/prism/scripts/quoting-pipeline-verify.mjs --json`; CI gate green.

## §5 — Simulation plan

**What to simulate:** closed-loop OODA convergence simulation (does the calibration factor converge after N iterations on real actuals?); quantity-break curve shape (setup-cost amortization over 1/5/10/50/100/500 pcs); margin waterfall stability across 8 process routes.

**Tools:** `prism_quoting:jm_die_quote_training_pipeline` (batch simulation) · `prism_quoting:closed_loop_outcome_digest` (loop health distribution) · `prism_quoting:fair_market_value` in batch mode · `prism_calc` for cycle-time physics cross-check.

**Scenarios:**
1. **JOB-SEMBLEX-TRILOBE (real):** SEMBLEX ×500 trilobe punch, D2, mill+turn+wire+grind; compare simulated FMV to `orders-closed-actuals.jsonl` matched record; accept: |pct_error| ≤ 30%.
2. **JOB-OPTIMAS-DIE (real):** OPTIMAS ×50 hex-flange die insert; accept: |pct_error| ≤ 35% (lower-confidence outsource component).
3. **JOB-SIG-CAVITY (real):** SIG SAUER carbide header die cavity; accept: |pct_error| ≤ 40% (carbide + sinker EDM has high material cost variance).
4. **Adversarial — zero-qty:** qty=0, all processes toggled; accept: returns structured error, no crash.
5. **Adversarial — max-qty (5,000 pcs):** assert quantity-break price monotonically decreases (setup amortized); accept: unit price at 5,000 ≤ price at 1 pcs.

**Pass criteria:** MAPE ≤ 35% on real-actuals cohort (3 real scenarios); monotone quantity-break curve verified; loop convergence: factor stabilizes within ±5% after 20 iterations on 100-record holdout.

## §6 — Validation plan (live data + numbers — R12/R15)

**Live-data validation:** run `scripts/quoting-pipeline-verify.mjs --json` against `state/shared/quoting/orders-closed-actuals.jsonl` (6,718 records, $355M); report MAPE + coverage + `psi_delta_fed_count`; compare predicted FMV distribution vs `outbound_price_prior` distribution (KS test + median ratio).

**Acceptance gates:**
- MAPE on real actuals holdout: ≤ 35% (directional) → ≤ 25% (post fine-tune target).
- Parity probe: `fair_market_value` dispatcher response vs `InstantQuoteEngine` singleton output must agree within ±1% (floating-point rounding only).
- `training_status.data_source_coverage.covered`: ≥ 3 of 5 after U-QP-COST-BASIS-NORMALIZE ships.
- `calibration_factor` drift: < 15% change between consecutive weekly runs (stability gate).
- `outbound_price_calibration` median ratio: predicted FMV vs real ext_price median ratio in [0.70, 1.40] (directional alignment, not exact; OCR-noise caveat documented).
- Quantity-break monotonicity: strictly non-increasing unit price as qty increases.

**Safety gate:** `prism_safety:validate_physics` not directly applicable (quoting is financial, not S(x) safety-critical). Apply `closed_loop_provenance_check` (FAIL-LOUD on no real actuals) as the domain-equivalent integrity gate. S(x) ≥ 0.98 applies if a quote feeds a shop-floor work-order that triggers machine operation.

**Parity probe:** frontend QuoteBuilderPage → `prism_quoting:fair_market_value` → compare unit_price displayed vs backend `InstantQuoteEngine.quote()` result; accept: ≤ ±1%.

## §7 — Fine-tune loop (results → retrain)

**Outcome capture:** every completed job writes to `state/shared/quoting/orders-closed-actuals.jsonl` via `QuoteOutcomeFeedEngine` + `QuoteOutcomePSIDeltaBridgeEngine`; ledger row schema (16 keys incl. `reference_reliable`, `reliability_verdict`) captured by `buildLedgerRow` in `QuotingOutcomeLedgerDigestEngine`.

**LoRA:** failing/edge cases (|pct_error| > 50%) → augment `quoting_lora_train.jsonl` with corrected (features→FMV) pairs → india retrains via `xproc_outcome_publish {slot:'charlie', domain:'quoting'}` (verify action name against live india dispatcher before calling — CLAUDE.md §10 marks it UNVERIFIED) → promote IFF held-out MAPE ≤ 25% on real actuals.

**RAG/CAG:** new validated pricing facts (e.g., confirmed quantity-break inflection points, material-price vintages) → re-embed into Qdrant `quoting-corpus` via `prism_memory:embed_corpus`; refresh CAG cold-anchor weekly with updated gotcha list + shop-rate snapshot.

**NN/GNN:** new labeled quoting-node edges (wired engine → dispatcher confirmed) → contribute to refpool via `scripts/vault-to-gnn-refpool.mjs` → india retrain trigger; promote IFF AUROC ≥ 0.78 / macro-F1 ≥ 0.55 / Brier ≤ 0.15 (fleet gates from CLAUDE.md §NN-GRAPH).

**Trigger + cadence:** nightly cron runs `quoting-train-cycle.mjs`; on MAPE crossing ≤ 35% threshold → auto-emit LoRA batch flag; india retrain runs weekly; promotion gate checked by `outbound_promote_check` dispatcher action.

## §8 — Frontend build (Kienzle Claude-Design rollout)

**Assigned Kienzle pages:** `Kienzle Quote.dc.html` (Quote Builder) + `Kienzle Job Cost.dc.html` (Job Cost & Profitability).

**Target React pages — reuse-first (Codex Page Protection):**
- `Kienzle Quote.dc.html` → **extend `mcp-server/web/src/pages/QuoteBuilderPage.tsx`** (already exists; design source adds: 4-KPI header row [UNIT PRICE/LOT TOTAL/LEAD TIME/CONFIDENCE], cost-breakdown stacked bar + per-row grid, DFM review panel, Make-vs-Buy panel, Quantity breaks table, What-if panel; left panel: Customer/Part dropdowns, Material/Stock fields, Process-route toggles [Mill/Turn/Wire/Sinker/Grind/Roku], Requirements 2×2 grid [Tolerance/Finish Ra/Inspection/Lead], Qty quick-select buttons).
- `Kienzle Job Cost.dc.html` → **extend `mcp-server/web/src/pages/CostEstimatorPage.tsx`** (already exists; design source adds: 3-column layout [Job List / Margin Waterfall SVG + Cost Variance table / P&L Snapshot + A/R Aging + Margin Leaks + Kaizen Action], period selector [MTD/QTD/YTD], status filter chips, net margin badge in header).

**Backend wiring:**
- QuoteBuilderPage: `prism_quoting:fair_market_value` (unit price + margin), `prism_quoting:gcode_cycle_time` (lead days estimation), `prism_quoting:outbound_price_prior` (confidence score + confNote), `prism_quoting:cost_index_prior` (cost breakdown bars), `prism_quoting:outbound_promote_check` (margin gate before Send Quote). API client: `web/src/api/quotingApi.ts`. Route: `POST /api/v1/quoting/fair-market-value` (verify exists in `src/routes/`; add if missing — no dead wires).
- CostEstimatorPage: `prism_quoting:cost_savings` (P&L + ROI rows via `roi_*` sub-actions), `prism_quoting:closed_loop_outcome_digest` (margin waterfall data), `prism_quoting:closed_loop_provenance_check` (AR aging integrity), `prism_business:job_list` or `prism_quoting:training_status` (job list panel). API client: `web/src/api/quotingApi.ts` + `web/src/api/businessApi.ts`.

**Design language:** iOS fleet language (`web/DESIGN.md` tokens; never inline hex/px). Use `var(--bg-surface)`, `var(--border)`, `var(--fg-dim)`, `var(--accent-orange)` (`#FF5A2B` → token `--accent-primary`). JetBrains Mono for all numerics (unit price, margin pct, lead days, confidence). Space Grotesk for panel headers. 44pt tap targets on all buttons (process-route toggles, qty quick-select, status filters). `<MobileSafeArea>` wrapping. Bottom-center CTA placement on mobile. `inputMode="decimal"` on stock Ø/L inputs. No inline hex; reference tokens throughout.

**Build/verify loop:** edit → `rtk npm run build:fast` → Playwright screenshot at 1360×852 (Quote), 1600×980 (Job Cost), 390×844 (iPhone 14), 412×915 (Pixel 7) → compare to `.dc.html` intent panel-by-panel → iterate.

**Acceptance:** both pages render with live data round-tripping `:3100`; parity with §6 backend (±1% unit price); 3-viewport screenshots match design intent; `prism_quoting:training_status` panel live on CostEstimatorPage (closes `U-QP-TRAINING-STATUS-SNAPSHOT`).

## §9 — Dependencies & sequencing

- **Blocked by:** india for LoRA/NN retrain (`xproc_outcome_publish` action name — verify before calling); hotel for ERP actual-cost credentials (`ActualCostEngine.listJobIds()` creds-gated); U-QP-COST-BASIS-NORMALIZE must ship before 3rd training source (VendorCostIndex grain-tag); quebec for shared iOS shell + `<MobileSafeArea>` component.
- **Blocks:** hotel (QuoteToOrderBridgeEngine feeds work-order creation); oscar (SpeedFeedToQuoteBridgeEngine feeds cycle-time cost basis); xray (blueprint-to-quote pipeline downstream consumer).
- **Logical order (R13):** (1) U-QP-COST-BASIS-NORMALIZE (grain-tag prereq) → (2) deepen tribal/wiki/RAG to 130 tips / 5 wiki entries → (3) unit + integration tests (§4) → (4) simulation on real JM Die jobs (§5) → (5) validate on 6,718-record actuals (§6) → (6) fine-tune loop wired (§7) → (7) frontend QuoteBuilderPage + CostEstimatorPage (§8 last, never UI atop unproven backend).

## §10 — Done-definition (R15: WIRE → TEST → VALIDATE → APPLY)

- [ ] WIRE: U-QP-COST-BASIS-NORMALIZE shipped; `quoting_lora_train.jsonl` emitting; 4 GNN feature nodes submitted to india; `prism_quoting:training_status` frontend consumer live; all new assets wired to `prism_quoting` dispatcher in same commit (no orphans).
- [ ] TEST: `quotingDispatcher.wire.test.ts` green; all 6 test files (§4) passing; happy + ≥3 failure + ≥2 adversarial + ≥3 spanning configs; `scripts/quoting-pipeline-verify.mjs --json` exit 0.
- [ ] VALIDATE: MAPE ≤ 35% on 6,718 real actuals; `outbound_price_calibration` median ratio in [0.70, 1.40]; quantity-break monotonicity verified; parity probe ≤ ±1%.
- [ ] APPLY: deepening loop cron live (nightly train + weekly mine); QuoteBuilderPage + CostEstimatorPage rendering live data at `:3100`; training_status panel live; tribal tip count ≥ 130; training coverage ≥ 3 of 5 sources.
- [ ] Per-file 2-arm scrutiny on every code file + 3-of-3 Stop gate on the session.
