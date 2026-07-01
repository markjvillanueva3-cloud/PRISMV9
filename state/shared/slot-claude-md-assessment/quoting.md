# quoting — slot:charlie

## Current state

**Size:** ~181 lines, ~8.5KB  
**Quality grade:** GOOD  

The file has genuine domain content built from real commit archaeology (QUOTING-SYNERGY-MS0 iter9-46+). Sections 1-7 are accurate and load-bearing. The "Cross-cutting methodology" block (§ after line 155) is generic fleet boilerplate injected uniformly across all 34 galaxies — it duplicates the universal CLAUDE.md and bloats the file by ~40 lines with no quoting-specific value.

**Stale / inaccurate content found:**

1. **`prism_business` dispatcher reference (§ PATHS.md + TOOLBELT.md, galaxy CLAUDE.md §3)** — `businessDispatcher.ts` does NOT exist in `mcp-server/src/tools/dispatchers/` (Glob confirmed). The PATHS.md cites it as the primary dispatcher for `quote_estimate`, `instant_quote`, `actual_cost_*`, etc. ONLY `quotingDispatcher.ts` (`prism_quoting`) was confirmed present. All `prism_business:*` action references are // UNVERIFIED until the actual dispatcher file is located (may be in a non-standard path or renamed). Mark as // UNVERIFIED.

2. **Section 21 disk-anomaly warning (line 21)** — The `ActualCostEngine.ts-1` anomaly was already resolved at D1 close-out (line 9 of the same file). The warning duplicates the resolved notice two paragraphs later. Confusing; drop the warning from §3, keep only the resolved-state note in the header.

3. **`machine-rates.ts` and `customer-profile.ts` marked `(verify)`** — these remain unverified in the file itself; they should either be confirmed by Grep or removed from the constants table.

4. **`ActualCostEngine.ts` sister-engine callers listed as `businessDispatcher`** — same unverified dispatcher issue. The `LathePartCostModel` and `MillActualFeedbackTuning` callers cited in the header are legitimate cross-refs, but the dispatcher name is wrong.

5. **`§7 Cross-galaxy edges` cites `ERPWorkOrderEngine`** — not verified in this session; mark // UNVERIFIED until confirmed in MEMORY.md cross-galaxy bridge list (MEMORY.md cites `QuoteToOrderBridgeEngine` — different name).

---

## KEEP

All of the following are accurate, load-bearing, and quoting-specific — keep verbatim:

- **§1 Domain scope** — precise boundary definition (what counts as quoting vs. what belongs to hotel ERP or per-domain CAM). This is the highest-value section for preventing scope drift.
- **§3 Common quoting engines list** — verified names (78-engine surface), size hints, and role descriptions. Remove only the `prism_business` dispatcher row until verified.
- **§4 Test commands** — `npx vitest run -t "Quote|Cost|Estimat|Pricing"` and the single-file form. Accurate and instantly useful.
- **§5 Quoting-specific gotchas (all 8)** — every gotcha cites a real commit SHA and describes a real failure mode from the iter chain. This is the crown jewel of the file; irreplaceable tribal memory. Keep every line.
- **§6 Tribal pointers** — `scripts/quoting-pipeline-verify.mjs`, bootstrap filter chain, drift state file path (`state/shared/dashboards/latest-drift-alert.json`), JM Die corpus access pattern (API not Glob). All accurate.
- **§7 Cross-galaxy edges** — the quoting↔hotel/delta/whiskey/mill/wedm bridge list. Accurate directional description; just correct `ERPWorkOrderEngine` → `QuoteToOrderBridgeEngine` per MEMORY.md.
- **`## Related galaxies`** — blueprint-vision (xray) and ai-training (india) PSN edges. Accurate.
- **`## Closed-loop integration with india`** — `xproc_outcome_publish`, `xproc_calibration_monitor_record`, `xproc_kg_project_features` pattern. Accurate and quoting-specific.
- **`## AI-systems fleet state` pointer block** — the `<!-- AI-SYSTEMS-STATE -->` pointer to `knowledge/memories/patterns/ai-systems-fleet-state.md` is a slim, correct pointer. Keep.
- **`## Critic + keep-working contract` pointer** — slim 2-bullet pointer to global doctrine. Keep as-is.

---

## DROP

Generic / duplicated / stale content wasting tokens:

1. **`## Cross-cutting methodology` block (lines ~155-165, ~11 lines)** — duplicates hardware specs, Ollama model tiers, loop discipline, vault paths, LoRA/CAG/RAG pattern that lives in the universal CLAUDE.md and is injected via TOOLBELT.md `OPERATIONAL CONTEXT`. Zero quoting-specific content. DROP entirely — the TOOLBELT.md already carries this via auto-wire.

2. **Duplicate disk-anomaly warning in §3** (line ~54: `ActualCostEngine.ts` + `ActualCostEngine.ts-1` warning) — already resolved and documented in the §1 header note. Redundant; DROP the §3 warning paragraph.

3. **Authorship note block in the header (lines 5-9)** — the cross-galaxy authorship attribution (`alpha refined this under operator directive 2026-05-27`) is process archaeology, not operational doctrine. Charlie already has this in commit history. DROP.

4. **`## Cross-refs` section (lines 128-133)** — lists parent doctrine file, sibling galaxy CLAUDE.md links, root CLAUDE.md pointer, and two feedback memory refs. The sibling links are available from MEMORY.md/PATHS.md. The root pointer belongs in the UNIVERSAL-CORE POINTER section. The two feedback refs (`feedback_engine_tests_in_tests_dir`, `feedback_always_build`) belong in the SOUL.md refuses list, not here. DROP or collapse to a single line.

5. **`## Available algorithm primitives` in MEMORY.md (not CLAUDE.md)** — already in MEMORY.md where it belongs; does not need to be echoed into CLAUDE.md.

---

## ADD (domain-specific — the heart of this assessment)

### A. Verified dispatcher surface (CRITICAL GAP)

The galaxy CLAUDE.md's engine list is good but the dispatcher wiring is partially wrong (`prism_business` unverified). Replace with verified facts:

```
## Dispatchers (verified)
- `prism_quoting` (quotingDispatcher.ts — CONFIRMED) — primary execution surface for all quoting pipeline work:
    camera_intake_route | quote_xometry_style | outsource_recommend | scenario_generate
    jm_die_docustrata_ingest | jm_die_quote_training_pipeline | gcode_time_estimate
    inflation_adjust | fair_market_value | quote_outcome_feed
    quoting_calibration_derive | quoting_active_factor_apply | quoting_calibration_*
    accuracy_* | deep_reasoning_* | cost_index_prior | outbound_price_prior
    outbound_price_calibration | cost_savings (8 roi_* sub-actions, wired Jun-11)
    closed_loop_provenance_check | training_status (backend wired; frontend pending)
- `prism_business` (// UNVERIFIED — not found in dispatchers dir; locate before citing)
```

### B. Closed-loop training state (CRITICAL — not in CLAUDE.md)

The Jun-11 ROI session (most recent ship batch) landed units that charlie MUST know about at session start. These are not in the galaxy CLAUDE.md:

- `QuotingActualOutcomeLoaderEngine` — FAIL-LOUD on no real actuals (soul refuse); wired `closed_loop_provenance_check`
- `CostSavingsTrackerEngine` — was 0 consumers, now wired `prism_quoting:cost_savings` (8 `roi_*` sub-actions); commit `bdfa5f3b78`
- Training data coverage: loop currently consumes 2 of 5 quoting data sources (40%: baseline + outbound-when-match-ran). UNCONSUMED next-wire: `jm-vendor-cost-index.json` (cost basis, dispatcher-wired but NOT fed to training), `jm-tool-purchases.json`, `docustrata-invoices.curated.json`
- `prism_quoting:training_status` backend wired; frontend consumer pending (U-QP-TRAINING-STATUS-SNAPSHOT)

### C. Gotchas #9-#25 (MISSING from CLAUDE.md — only in MEMORY.md)

The galaxy CLAUDE.md lists gotchas #1-#8 (from commit archaeology iter9-46). MEMORY.md has gotchas through #25. These critical domain gotchas are missing from CLAUDE.md and should be summarized there:

- **#9 — DocuStrata INBOUND-only** (`H:/PRISM/JM DIE/Docustrata/` = 72% SCAN_GENERIC; NOT outbound revenue data. `H:/PRISM/JM DIE/QUOTES/` does NOT exist — was speculative.)
- **#10 — Baseline poisoning gate** (`scripts/lib/quoting-baseline-guard.mjs` refuses degenerate baseline-records.json with MAPE 1881%; train-cycle preflight enforced)
- **#11 — Guard v2 low_unique abs-floor** (abs-floor <8 correctly ADMITS the 47,905-rec real corpus; advisory `synthetic_revenue_dominant` for all-synth corpus)
- **#12 — VendorCostIndexEngine use-the-data** (wired `prism_quoting:cost_index_prior`; 7 category medians: material 3.39/outside 3.25/freight 17.27/tooling 33.87/inspection 160/overhead 58.96/misc 38.14 — these are the real JM AP cost-basis numbers)
- **#13 — OutboundPriceIndexEngine** (12,761 POs / 240 verified / $47,142.12; confidence-gate: use high+medium ONLY, NEVER low/none)
- **#15 — SILENT GRAIN MISMATCH** (`predicted_fmv_usd` is per-PART-JOB $, NOT per-piece; correct real-outbound ref = per-LINE `ext_price` distribution, NOT `unitPrice`/`orderTotal`)
- **#17 — Orchestrator psi_delta dead loop** (field was `pred.predicted_usd` not `pred.predicted_fmv_usd`; `psi_delta_fed_count` was always 0; fixed commit `1e67cfab93`)
- **#25 — vendor-cost-index UNITS-BLENDED** (`jm-vendor-cost-index.json` `unitCost.median` blends $/bar·$/foot·$/piece — feeding it into training/quote as per-unit cost is a UNITS ERROR; safe uses only via spend/vendor-concentration/cold-start range)

### D. Domain-specific safety / "what NOT to do" list

These are quoting-domain refuses not captured in one place in CLAUDE.md (scattered in SOUL.md / MEMORY.md):

```
## QUOTING REFUSES (domain-specific hard stops)
- NEVER inline shop-rate, margin, or machine-hour constants — read from jm-die-profile.ts
- NEVER emit a customer quote without a margin-floor gate check
- NEVER train on stale bootstrap distribution without freshness preflight (latest-drift-alert.json)
- NEVER Glob H:/PRISM/JM DIE/** (24,545+ files → timeout; use getJMDieCustomerPath() API)
- NEVER treat DocuStrata as outbound-revenue ground truth (it is INBOUND prints + scan generics)
- NEVER use VendorCostIndexEngine unitCost.median as per-unit cost (units-blended across $/bar/foot/piece)
- NEVER claim test count without reverifying from live runner (commit-message count rot proven in iter28-32)
- NEVER use a non-conservative customer-name filter (whole-segment anchors mandatory — false positives proven)
- NEVER compare predicted_fmv_usd (per-job) directly to outbound per-piece prices (grain mismatch)
- NEVER declare closed-loop "working" if psi_delta_fed_count is 0 (means the feed is dead)
- NEVER train on the poisoned stub baseline (MAPE 1881%); always run quoting-baseline-guard.mjs preflight
```

### E. Canonical corpora / data path quick-ref (missing from CLAUDE.md; lives only in PATHS.md)

```
## Canonical data (never re-derive — read the index)
- Training baseline (real): state/shared/quoting/baseline-records-corpus-with-real.json (47,905 records, iter59)
- Drift gate: state/shared/quoting/latest-drift-alert.json (MUST check freshness before training)
- Customers: state/shared/databases/jm-customers.jsonl (473 customers, 152KB — head-20 sample, never full-Read)
- Vendors: state/shared/databases/jm-vendors.jsonl (12 vendors)
- AP ledger: state/shared/quoting/jm-vendor-ap-ledger.jsonl (20,736 entries)
- Sold orders: state/shared/quoting/jm-sold-orders.json (500 entries, 240 verified, $47K outbound)
- DocuStrata: H:/PRISM/Docustrata/ — search manifest.json + .index/ ONLY; do NOT re-OCR
- Health check: node scripts/quoting-pipeline-verify.mjs --json (TAP-aggregated; exit 0=all pass)
```

### F. Open-threads / next-unit roadmap pointer

```
## Next units (open threads — verify against state/shared/OPEN-THREADS.md which is charlie-maintained)
- U-QP-COST-BASIS-NORMALIZE: parse units+piece-counts from AP-ledger descriptions → grain-tag rows → 
  then VendorCostIndex becomes safe to feed into training (prereq for gotcha #25)
- U-QP-TRAINING-STATUS-FRONTEND: frontend consumer for prism_quoting:training_status (backend done)
- U-QP-EXTPRICE-CALIB follow-up: OCR-noise ext_price median ~$1.005 caveat; structural vs OCR diagnosis pending
- Data coverage raise: 40% → target is 5/5 sources consumed in training loop
```

---

## IDEAL SECTION OUTLINE

```
# Quoting Galaxy — Domain CLAUDE.md (slot:charlie)
> [pointer to root /CLAUDE.md for universal doctrine]

## 1. Domain scope
   - What counts as quoting (boundary definition)
   - What is OUT of scope (hotel/ERP, per-domain CAM)
   - Slot affinity + worktree

## 2. Quoting refuses (domain hard stops)
   - The consolidated list (§D above + SOUL.md refuses merged here)
   - Inline constants — never
   - DocuStrata / grain / customer-filter specifics

## 3. Dispatchers (verified)
   - prism_quoting (CONFIRMED): full verified action list
   - prism_business (UNVERIFIED — note status until found)
   - When to use which action for daily work

## 4. Key engines (by role — not exhaustive; for exhaustive: ENGINE_DIGEST.md)
   - Quote orchestrators (InstantQuoteEngine, BlueprintToQuoteBridgeEngine, JMDieQuoteTrainingPipelineEngine)
   - Cost components (JobCostingEngine, ActualCostEngine canonical only, CycleTimeEstimatorEngine)
   - Reconciliation (LatheActualCostReconciliationEngine, ERPCostFeedbackEngine, CostSavingsTrackerEngine)
   - Routing / governance (CostAwareRouterEngine, CostAlarmEngine)
   - Per-process (AdditiveQuoteEngine, CastingQuoteEngine, InjectionMoldQuoteEngine, SheetMetalQuoteEngine)
   - Learning loop (QuoteOutcomeFeedEngine, QuotingActualOutcomeLoaderEngine, QuoteOutcomePSIDeltaBridgeEngine)

## 5. Canonical data / state quick-ref
   - Training corpus paths
   - Drift gate path + preflight command
   - Customer/vendor DBs (access pattern)
   - DocuStrata access rule

## 6. Test + health commands
   - npx vitest run -t "Quote|Cost|Estimat|Pricing"
   - node scripts/quoting-pipeline-verify.mjs --json

## 7. Gotchas (all 25 — #1-#8 expanded, #9-#25 summarized)
   - Group: filter/glob/math bugs (#1-#3, #8)
   - Group: data integrity (#9-#11, #25)
   - Group: grain/units errors (#15, #25)
   - Group: loop bugs (#17, #23)
   - Group: wiring/dormant assets (#12-#14, gotcha #20)

## 8. Tribal pointers
   - quoting-pipeline-verify.mjs (single health-check command)
   - Bootstrap filter chain (NON_CUSTOMER regex, iter9-41 canonical ref)
   - Memory search: prism_memory:semantic_search query="quoting" topK=20
   - Wiki: knowledge/wiki/quoting/ (6 entries)
   - Open threads: mcp-server/src/engines/quoting/OPEN-THREADS.md

## 9. Closed-loop integration (india)
   - xproc_outcome_publish, xproc_calibration_monitor_record, xproc_kg_project_features
   - What's wired (Jun-11), what's pending

## 10. Cross-galaxy edges
    - → hotel: QuoteToOrderBridgeEngine / ERPCostFeedbackEngine
    - ← delta: BlueprintToQuoteBridgeEngine (feature-recognize input)
    - ↔ whiskey: LatheActualCostReconciliationEngine
    - ← india: xproc_* feedback loop
    - ← xray: blueprint-vision feeds auto-quote

## 11. Open next-units
    - Pointer to OPEN-THREADS.md (maintained in this dir)
    - Top 3 highest-ROI units with prereq chain

## [AI-SYSTEMS-STATE pointer block — keep as-is]
## [Critic + keep-working pointer — keep as-is]
```

---

## UNIVERSAL-CORE POINTER

The galaxy CLAUDE.md must NOT duplicate these — it should carry only a single pointer line:

```
> **Universal doctrine:** see root `/CLAUDE.md` for: Expert role · R1-R15 rules · 
> Scrutiny 3-of-3 gate · Per-chat handoff protocol · Commit format ([charlie][SCOPE]/U-ID: title) ·
> Units-first rail · No-stub enforcement · GOLF slot · Fleet-reaper · 
> Slot-worktree discipline (H:/prism-slot-charlie, branch slot/charlie) ·
> Token economy (RTK prefix, Ollama offload tiers) · MCP dispatcher map (DISPATCHER_DIGEST.md).
```

The following sections in the current CLAUDE.md are redundant with the universal core and must NOT be copied into the ideal galaxy file:
- `## Cross-cutting methodology` (hardware, Ollama tiers, loop discipline, vault, LoRA/CAG/RAG) — lives in universal CLAUDE.md + TOOLBELT.md OPERATIONAL CONTEXT auto-wire
- `## Critic + keep-working contract` — pointer is fine; full doctrine body not needed here
- `## AI-systems fleet state` — pointer is fine; full block not needed here
- The per-file scrutiny protocol, 3-of-3 gate procedure, handoff bash commands, slot-worktree architecture prose — all live in root CLAUDE.md; pointer only here
