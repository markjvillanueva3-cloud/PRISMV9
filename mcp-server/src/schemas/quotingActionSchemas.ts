/**
 * quotingActionSchemas — QUOTING-PIPELINE-MS0 / U-QP08
 *
 * Zod schemas + action enum for the new prism_quoting dispatcher.
 * Each action maps to a U-QP02..U-QP07 engine.
 */
import { z } from "zod";

export const quotingActionEnum = z.enum([
  "camera_intake_route",      // U-QP02
  "insert_box_lookup",         // U-QP03
  "machine_tag_extract",       // U-QP04
  "machine_parts_bom_resolve", // U-QP05
  "vendor_realtime_price",     // U-QP06
  "live_chat_session_open",    // U-QP07
  "live_chat_session_turn",    // U-QP07
  "live_chat_session_close",   // U-QP07
  // U-QP13 accuracy enhancement actions
  "accuracy_platt_calibrate",  // U-QP13 — wrap raw confidence with calibrated probability
  "accuracy_fuzzy_match_sku",  // U-QP13 — OCR-confusion-aware catalog fuzzy match
  "accuracy_bom_urgency",      // U-QP13 — Weibull replacement-probability for BOM lifecycle
  "accuracy_quote_interval",   // U-QP13 — guaranteed-correct quote bounds via interval arithmetic
  // U-QP14 neural+reasoning bridge actions
  "neural_route_quoting_task", // U-QP14 — route quoting task class to the right AI substrate
  "neural_psn_synergy_status", // U-QP14 — runtime probe: which PSN AI legs are actually wired
  // SYNERGY-NN-GNN-PSI-DELTA-FEED
  "quote_outcome_feed",        // SYNERGY — feed quote actuals → PSNAutonomyLoop psi_delta
  // JM-DIE-FINANCIAL-BASELINE-MS0 actions
  "jm_die_docustrata_ingest",       // U-JM01 — walk JM Die archive for {customer, part, date}
  "jm_die_historical_material_price", // U-JM02 — date → commodity price lookup
  "jm_die_financial_baseline",      // U-JM03 — aggregate to per-customer/material/year baseline
  "jm_die_quote_training_pipeline", // U-JM04 — orchestrate ingest+price+baseline (+ optional psi_delta feed)
  // JM-DIE-PROGRAM-ANALYSIS-MS0 actions
  "gcode_time_estimate",             // U-JP01 — parse G-code, estimate time-in-cut + op counts
  "gcode_cycle_time",                // U-QP-GCODE-TIME-WIRE -- precise S-curve cycle time (CycleTimeEstimatorEngine: canned cycles + per-machine kinematics)
  "inflation_adjust",                // U-JP02 — CPI-U date→date USD adjustment
  "fair_market_value",               // U-JP03 — FMV estimate + under/at/over-charged verdict
  "quoting_public_quote",            // U-QP-PUBLIC-QUOTE -- customer-safe FMV projection (no internal cost basis leaks)
  "quoting_public_instant_quote",    // U-QP-PUBLIC-INSTANT -- customer-safe InstantQuote (price+tiers+qty-breaks+DFM gate, no cost basis)
  "quote_packet_generate",           // U-QP-QUOTE-PACKET -- customer-deliverable quote packet from a public instant quote (MVP S4; no cost basis)
  // JM-DIE-FLEET-SCAN-MS0 actions
  "jm_die_scan_ledger_stats",        // U-FS01 — aggregate ledger stats (rows, unique paths, by_source, by_kind)
  "jm_die_scan_plan_batches",        // U-FS02 — walk archive + dedup vs ledger + split into batches
  "jm_die_scan_record_batch",        // U-FS02 — record a finished batch's files back to the ledger
  // U-FS08 — role-aware document query
  "jm_die_docs_by_customer",         // U-FS08 — quoter/operator: docs for a customer
  "jm_die_docs_by_part",             // U-FS08 — setup/operator: docs for a part
  "jm_die_docs_by_machine_family",   // U-FS08 — manager: programs by mill/lathe/wedm
  "jm_die_docs_by_extension",        // U-FS08 — engineer: programs by file type
  "jm_die_docs_by_tokens",           // U-FS08 — engineer: tool-code or multi-token search
  "jm_die_docs_customer_rollup",     // U-FS08 — sales overview: per-customer doc counts
  // JM-DIE-QUOTE-TRAINING-MS0 actions
  "jm_die_training_loop_run",        // U-QT01 — run accuracy measurement against baseline records
  "jm_die_training_loop_recommend",  // U-QT01 — recommend improvements from a prior report
  "jm_die_training_loop_under_quote_assess", // U-QP-UNDERQUOTE-ASSESS-WIRE — per-job under/fair/over-quote assessment from a report's all_records
  // U-QT03/04/05 user-facing quote + outsource + scenario-generator
  "quote_xometry_style",             // U-QT03 — Xometry-style user inputs → quote
  "outsource_recommend",             // U-QT04 — in-house vs outsource recommender
  "scenario_generate",               // U-QT05 — seeded synthetic scenario generator
  "three_view_pricing",              // U-3VIEW01 -- current/optimal/cost-floor + improvement advisor
  "location_vendor_pricing",         // U-LVP01 -- landed-cost across current + alternative vendors by region
  "vendor_unit_price",               // U-LVP02 -- per-vendor advisory unit-price band (tier + region supply factor)
  "outside_knowledge_query",         // U-QT06 — query the curated external-source catalog
  "outside_knowledge_citations",     // U-QT06 — formatted citation block
  "deep_reasoning_explain_bias",     // U-QT07 — bias-explanation prompt envelope
  "deep_reasoning_find_pattern",     // U-QT07 — feature-correlation prompt envelope
  "deep_reasoning_suggest_rate_adjust", // U-QT07 — rate-adjust prompt envelope
  "deep_reasoning_outlier_investigate", // U-QT07 — outlier-investigate prompt envelope
  "deep_reasoning_cross_customer",   // U-QT07 — cross-customer transfer prompt envelope
  // U-QT10 calibration cycle — closes the inner training loop
  "quoting_calibration_derive",      // U-QT10 — AccuracyReport → multiplicative correction factors
  "quoting_calibration_apply",       // U-QT10 — apply factors to a predicted FMV
  "quoting_calibration_measure",     // U-QT10 — pre/post MAPE + bias-reduction projection
  // U-COV-QUOTING — CoV verification + active-factor runtime bridge (2026-05-25)
  "quoting_calibration_derive_with_cov",  // U-COV-QUOTING — derive() + ChainOfVerification verifier (safe-to-activate flag)
  "quoting_active_factor_get",            // U-COV-QUOTING-ACTIVE — load active factors from durable JSON + metadata
  "quoting_active_factor_apply",          // U-COV-QUOTING-ACTIVE — apply active factors at quote-time (runtime bridge)
  "quoting_active_factor_metadata",       // U-COV-QUOTING-ACTIVE — cheap metadata read (ageMinutes/isStale/signature)
  // QUOTING-COMPLETENESS-MS0 (charlie /goal-20, 2026-05-25) — operator's 13-axis directive
  "quoting_lead_time_tiers",              // U-QP-LEAD-TIME-TIERS — rush/standard/economy 3-tier emit (Axis F)
  "quoting_secondary_ops_price",          // U-QP-SECONDARY-OPS-PRICING — laser/grind/finish/paint/harden/hone... (Axis K)
  "quoting_secondary_ops_list",           // U-QP-SECONDARY-OPS-PRICING — list available op types for UI dropdown
  "quoting_tolerance_pricing",            // U-QP-TOL-PRICING — per-dimension callout-driven price multiplier (Axis L)
  "quoting_cross_part_synergy",           // U-QP-CROSS-PART-SYNERGY — "this tool helps parts A/B/C too" novel (Axis I)
  "quoting_phone_ocr",                    // U-QP-TESS-OCR — phone photo → OCR text (Axis J, operator-named)
  "quoting_phone_ocr_status",             // U-QP-TESS-OCR — adapter installed? for UI gating
  "quoting_freight_quote",                // U-QP-FREIGHT — ground/2day/nextday/LTL/FTL quote (Axis E)
  "quoting_freight_tiers",                // U-QP-FREIGHT — list available service tiers for UI
  "quoting_outcome_psi_delta_score",      // U-QP-PSI-DELTA-WIRE — feed quote outcome to NN/GNN learning loop (Axis M)
  "quoting_outcome_psi_delta_batch",      // U-QP-PSI-DELTA-WIRE — batch score outcomes
  "quoting_mcmaster_quote",               // U-VENDOR-MCMASTER — real-time McMaster part quote
  "quoting_mcmaster_batch",               // U-VENDOR-MCMASTER — batch quote
  "quoting_pipeline_stresstest",          // U-PIPELINE-STRESSTEST — adaptive variability runner + leak report
  "quoting_docustrata_train",             // U-DOCUSTRATA-TRAINER — market-conditioned training records
  // QUOTING-SYNERGY-MS0 (charlie /goal-20 iter11, 2026-05-25) — wizard + pipeline → quote bridges
  "quoting_shop_profile_get",             // U-SHOP-PROFILE-TEMPLATE — load shop profile (machines, labor, electricity rate, overhead)
  "quoting_shop_profile_list",            // U-SHOP-PROFILE-TEMPLATE — list available shop profile ids
  "quoting_shop_electricity_cost",        // U-SHOP-PROFILE-TEMPLATE — electricity cost for one machine cycle
  "quoting_wizard_to_quote",              // U-WIZARD-TO-QUOTE — bridge mill/lathe/wedm wizard output → quote
  "quoting_print_to_program_to_quote",    // U-PRINT-TO-PROGRAM-TO-QUOTE — bridge full pipeline (CAD+CAM+G-code) → quote
  "quoting_speed_feed_to_cycle",          // U-SPEED-FEED-TO-QUOTE — physics-backed cycle-time enrichment (SpeedFeedOrchestrator → wizard)
  "quoting_secondary_ops_price_for_profile", // U-SECONDARY-OPS-PROFILE-OVERRIDE — price ops using shop profile's secondary_op_overrides
  "quoting_shop_utilities_cost",          // U-UTILITY-COSTS-EXTENDED — aggregate electricity + water + air + natural gas
  "quoting_cross_part_synergy_from_fleet",  // U-CROSS-PART-SYNERGY-FROM-JM-FLEET — auto-populate corpus from JM Die ledger
  "quoting_machine_invest_roi",             // U-MACHINE-INVEST-FROM-FLEET — payback for candidate new machine vs incumbent
  "quoting_dynamic_shop_rate",              // U-DYNAMIC-SHOP-RATE — utilization-band rate adjustment + rush-lead uplift
  "quoting_training_orchestrator_run",      // U-QP-TRAINING-ORCHESTRATOR — one continuous-calibration cycle (measure→derive→cov→write)
  // U-QP-COST-BASIS-WIRE (charlie 2026-06-01) — real vendor cost-basis priors
  "cost_index_prior",                       // U-QP-COST-BASIS-WIRE — per-category unit-cost prior(s) from jm-vendor-cost-index
  "material_cost_basis",                    // U-QP-COST-BASIS-NORMALIZE -- units-correct per-grade $/in3 (block-only) from jm-material-cost-basis
  // U-QP-OUTBOUND-PRICE-PRIOR (charlie 2026-06-01) — real outbound sold-price distribution prior
  "outbound_price_prior",                   // U-QP-OUTBOUND-PRICE-PRIOR — confidence-gated per-piece price distribution from jm-sold-orders
  // U-QP-OUTBOUND-PRICE-CALIB (charlie 2026-06-01) — predicted-vs-real-outbound distribution-match diagnostic
  "outbound_price_calibration",             // U-QP-OUTBOUND-PRICE-CALIB — KS/median-ratio/band match of predicted prices vs real outbound
  // U-QP-OUTBOUND-PROMOTE-GATE (charlie 2026-06-09) -- outbound-alignment promote gate (compareToPredicted + gateOutboundAlignment); read-only advisory
  "outbound_promote_check",                 // U-QP-OUTBOUND-PROMOTE-GATE -- block-decision over JM real sold-price alignment (PRICE-grain, against=line)
  // U-QP-TRAINING-STATUS-ACTION (charlie 2026-06-02) -- front-to-back read of the latest closed-loop training-cycle status
  "training_status",                        // U-QP-TRAINING-STATUS-ACTION -- latest-training-status.json snapshot + active-factor metadata for the app
  // QUOTING-CLOSED-LOOP-MS0 (charlie 2026-06-11) -- provenance gate: load real actuals from hotel ActualCostEngine -> classify -> may_promote
  "closed_loop_provenance_check",           // QUOTING-CLOSED-LOOP-MS0 -- load JobProfitability actuals, classify provenance, return may_promote verdict
  // QUOTING-COST-SAVINGS-WIRE (charlie 2026-06-11) -- wire the dormant CostSavingsTrackerEngine (13/13 tests, was 0 dispatcher consumers)
  "cost_savings",                           // QUOTING-COST-SAVINGS-WIRE -- route to CostSavingsTrackerEngine.calculate(savingsAction,params): roi_log/_log_outcome/_summary/_report/_reset/_configure_costs/_events/_trend
  // QUOTING-SYNERGY-MS0/U-QP-OUTCOME-LEDGER-DIGEST (charlie 2026-06-11) -- read-side consumer of the closed-loop outcome ledger
  "closed_loop_outcome_digest",             // U-QP-OUTCOME-LEDGER-DIGEST -- read quoting-cycle-outcomes.jsonl -> behavior distribution + health verdict (withhold/rollback signals)
  // U-QP-SIMILAR-JOB-RETRIEVE (india 2026-06-24) -- kNN similar-job retrieval over precomputed feature vectors (cold-start prior)
  "quoting_similar_job_retrieve",           // U-QP-SIMILAR-JOB-RETRIEVE -- top-k nearest historical jobs by feature-vector similarity
  // U-QP-JM-PARTSPEC-ADAPTER (charlie 2026-06-28, W3) -- adapt live JMDiePartRecords -> PartSpecs
  // and rank a new part against the JM corpus (no precomputed vectors needed).
  "quoting_find_similar_jm_parts",          // U-QP-JM-PARTSPEC-ADAPTER -- find nearest JM parts to a target spec via the live corpus
  // QUOTING-OPTIMAL-MS0/U8 (juliett 2026-06-30) -- the two-layer optimal-quote algorithm head:
  // fit the realized-price model on the 1,787 real settled prices, compose the profit-optimal
  // recommender (fail-honest when win/loss data is thin), return predicted price + CI band.
  "optimal_quote_recommend",                // U8 -- RealizedPriceModel (U6) + OptimalQuoteRecommender (U7) over the real corpus
  // QUOTING-OPTIMAL-MS0/U4 (charlie 2026-06-30) -- per-consumable-type predicted-vs-actual reconciliation
  // (perishable tooling: inserts/drills/taps/wire/coolant/abrasives). Telemetry-only; bounded [0.8,1.2]
  // advisory multipliers, never a reconciliation threshold gate. Advisory prior from jm-tool-purchases.json.
  "consumable_reconcile",                   // U4 -- reconcile predicted vs actual consumable consumption per type
]);
export type QuotingAction = z.infer<typeof quotingActionEnum>;

// ── QUOTING-OPTIMAL-MS0/U8 -- two-layer optimal-quote algorithm head (juliett 2026-06-30) ──
export const optimalQuoteRecommendSchema = z.object({
  cost_floor_usd: z.number().positive().describe("Layer-A deterministic cost floor (material + machine time + setup + overhead), USD"),
  customer: z.string().min(1).describe("Customer name (normalized internally for the per-customer price model)"),
  tier_score: z.number().min(0).max(1).optional().describe("Customer relationship strength 0..1 (cold lead -> anchor account). Default 0.5"),
  quantity: z.number().int().positive().optional().describe("Order quantity. Default 1"),
});

// ── U-COV-QUOTING calibration verification + runtime bridge schemas (2026-05-25) ──
export const quotingCalibrationDeriveWithCovSchema = z.object({
  report: z.unknown().describe("AccuracyReport from QuotingTrainingLoopEngine"),
  minRecordsForCustomer: z.number().optional(),
  minFactor: z.number().optional(),
  maxFactor: z.number().optional(),
  balancedBandPct: z.number().optional(),
}).describe("U-COV-QUOTING — derive() + Chain-of-Verification → {factors, cov, safe_to_activate}");

export const quotingActiveFactorGetSchema = z.object({
  path: z.string().optional().describe("Optional override of the active-factor JSON path"),
}).describe("U-COV-QUOTING-ACTIVE — load currently-active calibration factors + metadata");

export const quotingActiveFactorApplySchema = z.object({
  predicted_usd: z.number().describe("Predicted FMV before calibration"),
  customer: z.string().optional().describe("Optional customer key for per-customer factor lookup"),
}).describe("U-COV-QUOTING-ACTIVE — apply active factors to a predicted FMV (with safe fallback when no factors loaded)");

export const quotingActiveFactorMetadataSchema = z.object({}).describe(
  "U-COV-QUOTING-ACTIVE — cheap metadata read (ageMinutes / isStale / signature / hasFactors) without applying"
);

// ── QUOTING-COMPLETENESS-MS0 schemas (charlie /goal-20, 2026-05-25) ──
export const quotingLeadTimeTiersSchema = z.object({
  base_unit_price: z.number().positive(),
  base_lead_days: z.number().nonnegative(),
  quantity: z.number().positive(),
  configs: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
}).describe("U-QP-LEAD-TIME-TIERS — emit rush/standard/economy 3-tier pricing");

export const quotingSecondaryOpsPriceSchema = z.object({
  ops: z.array(z.string()),
  quantity: z.number().positive(),
  base_material_cost_usd: z.number().nonnegative().optional(),
  catalog_overrides: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
}).describe("U-QP-SECONDARY-OPS-PRICING — price selected secondary ops (laser/grind/finish/paint/harden/hone/...)");

export const quotingSecondaryOpsListSchema = z.object({}).describe("U-QP-SECONDARY-OPS-PRICING — list available op types for UI dropdown");

export const quotingTolerancePricingSchema = z.object({
  callouts: z.array(z.object({
    dimension: z.string(),
    band_mm: z.number().positive(),
    datum_count: z.number().int().optional(),
    surface_finish_ra_um: z.number().nonnegative().optional(),
    class_override: z.string().optional(),
  })),
  base_machining_cost_usd: z.number().nonnegative(),
  precision_exponent: z.number().positive().optional(),
}).describe("U-QP-TOL-PRICING — per-dimension tolerance-callout cost impact");

export const quotingCrossPartSynergySchema = z.object({
  proposal: z.object({
    type: z.enum(["tool", "fixture", "machine", "consumable"]),
    description: z.string(),
    cost_usd: z.number().positive(),
    savings_per_part_usd_quoted: z.number().nonnegative(),
    quoted_annual_volume: z.number().nonnegative(),
    match: z.object({
      materials: z.array(z.string()).optional(),
      processes: z.array(z.string()).optional(),
      feature_tokens: z.array(z.string()).optional(),
      machines: z.array(z.string()).optional(),
    }),
    savings_per_part_usd_beneficiary: z.number().nonnegative().optional(),
  }),
  corpus: z.array(z.object({
    part_id: z.string(),
    customer: z.string().optional(),
    material: z.string().optional(),
    process: z.string().optional(),
    feature_tokens: z.array(z.string()).optional(),
    machine: z.string().optional(),
    annual_volume: z.number().nonnegative().optional(),
  })),
}).describe("U-QP-CROSS-PART-SYNERGY — cross-part tooling/machine investment ROI analysis (novel)");

export const cameraIntakeRouteSchema = z.object({
  text: z.string().describe("OCR'd text from upstream ImageOCRPipeline"),
  extractedData: z.object({
    numbers: z.array(z.string()).optional(),
    dates: z.array(z.string()).optional(),
    measurements: z.array(z.string()).optional(),
    toolCodes: z.array(z.string()).optional(),
    partNumbers: z.array(z.string()).optional(),
  }).optional(),
  ocrConfidence: z.number().optional(),
}).describe("U-QP02 — classify camera-OCR'd image into blueprint|insert-box|tool-body|machine-service-tag");

export const insertBoxLookupSchema = z.object({
  text: z.string(),
  toolCodes: z.array(z.string()).optional(),
  partNumbers: z.array(z.string()).optional(),
  ocrConfidence: z.number().optional(),
}).describe("U-QP03 — insert-box / tool-body → catalog match + compatible-insert recommendations");

export const machineTagExtractSchema = z.object({
  text: z.string(),
  ocrConfidence: z.number().optional(),
}).describe("U-QP04 — machine service-tag OCR → {make,model,serial,voltage,spindle_hp,mfg_date}");

export const machinePartsBomResolveSchema = z.object({
  make: z.string().nullable(),
  model: z.string().nullable(),
  serial: z.string().nullable().optional(),
}).describe("U-QP05 — service-tag → parts BOM with per-part vendor adapter routing");

export const vendorRealtimePriceSchema = z.object({
  adapter: z.enum([
    "mcmaster", "misumi", "haas-oem", "okuma-oem", "mazak-oem", "doosan-oem",
    "hurco-oem", "dmg-mori-oem", "makino-oem", "fanuc-parts", "sodick-oem",
    "agie-oem", "edm-supplies", "roku-roku-oem", "brother-oem",
  ]),
  sku: z.string(),
  quantity: z.number().optional(),
  cachedPrices: z.record(z.string(), z.record(z.string(), z.object({
    unit_price_usd: z.number(),
    lead_time_days: z.number().optional(),
    source: z.string().optional(),
  }))).optional(),
}).describe("U-QP06 — vendor real-time pricing (MS0 adapter shape + cache fallback; real APIs = MS1)");

export const liveChatSessionOpenSchema = z.object({}).describe("U-QP07 — open a chat session, returns sessionId");
export const liveChatSessionTurnSchema = z.object({
  sessionId: z.string(),
  userText: z.string(),
}).describe("U-QP07 — submit a user turn to an open chat session");
export const liveChatSessionCloseSchema = z.object({
  sessionId: z.string(),
}).describe("U-QP07 — close an open chat session");

// ── U-QP13 accuracy enhancement schemas ──
export const accuracyPlattCalibrateSchema = z.object({
  rawScore: z.number(),
  params: z.object({ A: z.number(), B: z.number() }).optional(),
}).describe("U-QP13 — Platt-scaling calibration for classifier raw scores");

export const accuracyFuzzyMatchSkuSchema = z.object({
  query: z.string(),
  candidates: z.array(z.string()),
  maxDistance: z.number().optional(),
}).describe("U-QP13 — OCR-confusion-weighted fuzzy SKU match");

export const accuracyBomUrgencySchema = z.object({
  intervalMonths: z.number(),
  currentAgeMonths: z.number(),
  lookAheadMonths: z.number().optional(),
  beta: z.number().optional(),
}).describe("U-QP13 — Weibull replacement-probability for BOM lifecycle");

export const accuracyQuoteIntervalSchema = z.object({
  material_cost: z.object({ lo: z.number(), hi: z.number() }),
  labor_cost: z.object({ lo: z.number(), hi: z.number() }),
  tooling_cost: z.object({ lo: z.number(), hi: z.number() }),
  overhead_pct: z.object({ lo: z.number(), hi: z.number() }),
  margin_pct: z.object({ lo: z.number(), hi: z.number() }),
}).describe("U-QP13 — interval-arithmetic quote uncertainty propagation");

// ── U-QP14 neural+reasoning bridge schemas ──
export const neuralRouteQuotingTaskSchema = z.object({
  task_class: z.enum(["blueprint_to_quote", "insert_replacement", "machine_parts_sourcing", "live_troubleshoot", "quote_anomaly_detect", "competitive_bid"]),
  prompt: z.string(),
  context: z.record(z.string(), z.unknown()).optional(),
}).describe("U-QP14 — route a quoting task to the right AI substrate");

export const neuralPsnSynergyStatusSchema = z.object({
  hasAiRouter: z.boolean().optional(),
  hasReasoning: z.boolean().optional(),
  psiDeltaFedRecently: z.boolean().optional(),
  systemVizHasNode: z.boolean().optional(),
}).describe("U-QP14 — runtime probe: which PSN AI legs are actually wired");

export const quoteOutcomeFeedSchema = z.object({
  quote_id: z.string(),
  quoted_cost_usd: z.number(),
  actual_cost_usd: z.number(),
  ts: z.string().optional(),
  slot: z.string().optional(),
}).describe("SYNERGY — feed quote actuals → PSNAutonomyLoop psi_delta");

// ── JM-DIE-FINANCIAL-BASELINE-MS0 schemas ──
export const jmDieDocustrataIngestSchema = z.object({
  rootDir: z.string(),
  limit: z.number().optional(),
  extensions: z.array(z.string()).optional(),
}).describe("U-JM01 — walk JM Die _PART LIBRARY for {customer, part, date} records");

export const jmDieHistoricalMaterialPriceSchema = z.object({
  material: z.enum(["steel_a36", "aluminum_6061", "copper_c110", "stainless_304"]),
  isoDate: z.string(),
}).describe("U-JM02 — date → commodity price lookup (CSV-seeded LME monthly avg)");

export const jmDieFinancialBaselineSchema = z.object({
  records: z.array(z.object({
    customer: z.string(),
    part_id: z.string(),
    doc_date: z.string().nullable(),
    size_bytes: z.number(),
    estimated_revenue_usd: z.number().optional(),
    material: z.string().optional(),
    material_spend_usd: z.number().optional(),
  })),
}).describe("U-JM03 — aggregate records into per-customer/material/year financial baseline");

export const jmDieQuoteTrainingPipelineSchema = z.object({
  rootDir: z.string(),
  limit: z.number().optional(),
  defaultMaterial: z.enum(["steel_a36", "aluminum_6061", "copper_c110", "stainless_304"]).optional(),
  defaultWeightLbs: z.number().optional(),
  feedPsnAutonomy: z.boolean().optional(),
  extensions: z.array(z.string()).optional(),
}).describe("U-JM04 — orchestrate ingest+price-lookup+baseline (+ optional psi_delta feed) over JM Die archive");

// ── JM-DIE-PROGRAM-ANALYSIS-MS0 schemas ──
export const gcodeTimeEstimateSchema = z.object({
  text: z.string(),
  dialect: z.enum(["fanuc_mill", "mazak_lathe", "sodick_wedm", "auto"]).optional(),
  machineRapidRateMmPerMin: z.number().optional(),
  toolChangeOverheadS: z.number().optional(),
}).describe("U-JP01 — parse G-code, estimate time-in-cut + op counts + tool changes");

export const gcodeCycleTimeSchema = z.object({
  gcode: z.string(),
  controller: z.enum(["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma", "hurco"]).optional(),
  machine_profile: z.string().optional(),
}).describe("U-QP-GCODE-TIME-WIRE -- precise S-curve cycle time from G-code (canned cycles + per-machine kinematics) for quoting");

export const inflationAdjustSchema = z.object({
  usd: z.number(),
  fromIsoDate: z.string(),
  toIsoDate: z.string(),
}).describe("U-JP02 — CPI-U date→date USD adjustment");

// ── JM-DIE-FLEET-SCAN-MS0 U-FS08 document-query schemas ──
const machineFamilyEnum = z.enum(["mill", "lathe", "wedm", "sinker_edm", "mill_turn", "micro_mill", "mixed", "utility", "tooling", "unknown"]);
const ledgerKindEnum = z.enum(["cnc-program", "docustrata", "other"]);

export const jmDieDocsByCustomerSchema = z.object({
  customer: z.string().describe("Customer name (case-insensitive substring on absolute path)"),
  limit: z.number().optional().describe("Max results to return (default 50)"),
  kindFilter: ledgerKindEnum.optional().describe("Optional kind filter — e.g. 'docustrata' for PDFs only"),
}).describe("U-FS08 — quoter/operator: docs for a customer");

export const jmDieDocsByPartSchema = z.object({
  partId: z.string().describe("Part id (case-insensitive substring)"),
  limit: z.number().optional(),
  kindFilter: ledgerKindEnum.optional(),
}).describe("U-FS08 — setup/operator: docs for a part");

export const jmDieDocsByMachineFamilySchema = z.object({
  family: machineFamilyEnum.describe("Machine family"),
  limit: z.number().optional(),
}).describe("U-FS08 — manager: programs by machine family");

export const jmDieDocsByExtensionSchema = z.object({
  extension: z.string().describe("File extension with or without leading dot (e.g. 'min' or '.min')"),
  limit: z.number().optional(),
}).describe("U-FS08 — engineer: programs by file extension");

export const jmDieDocsByTokensSchema = z.object({
  tokens: z.array(z.string()).describe("Tokens to search for (OR semantics); score = match count"),
  limit: z.number().optional(),
}).describe("U-FS08 — engineer: multi-token search (tool codes, part families, etc)");

export const jmDieDocsCustomerRollupSchema = z.object({
  limit: z.number().optional().describe("Top-N customers (default 50)"),
}).describe("U-FS08 — sales overview: per-customer doc counts");

// ── JM-DIE-QUOTE-TRAINING-MS0 U-QT01 ──
const quoteBaselineRecordSchema = z.object({
  customer: z.string(),
  part_id: z.string(),
  doc_date: z.string().nullable(),
  actual_revenue_usd: z.number(),
  estimated_time_in_cut_s: z.number().optional(),
  estimated_material_spend_usd: z.number().optional(),
  machine_rate_usd_per_hr: z.number().optional(),
});

export const jmDieTrainingLoopRunSchema = z.object({
  records: z.array(quoteBaselineRecordSchema).describe("Ground-truth baseline records to measure accuracy against"),
  defaultMachineRate: z.number().optional(),
  defaultMaterialSpend: z.number().optional(),
  defaultTimeInCutS: z.number().optional(),
  feedPsnAutonomy: z.boolean().optional(),
}).describe("U-QT01 — run accuracy measurement against baseline records");

// ── U-QT03/04/05 schemas ──
const quoteMaterialEnum = z.enum(["aluminum_6061", "steel_a36", "stainless_304", "copper_c110"]);
const quoteProcessEnum = z.enum(["mill", "lathe", "wedm", "sinker_edm"]);
const toleranceClassEnum = z.enum(["coarse", "medium", "fine", "very_fine"]);

export const quoteXometryStyleSchema = z.object({
  material: quoteMaterialEnum,
  length_mm: z.number().positive(),
  width_mm: z.number().positive(),
  height_mm: z.number().positive(),
  tolerance_class: toleranceClassEnum,
  surface_finish_um: z.number().positive(),
  quantity: z.number().int().positive(),
  lead_time_days: z.number().nonnegative(),
  process: quoteProcessEnum,
  machine_rate_usd_per_hr: z.number().optional(),
  asOfIsoDate: z.string().optional(),
}).describe("U-QT03 — Xometry-style user inputs → quote with breakdown");

export const outsourceRecommendSchema = z.object({
  in_house_total_usd: z.number().positive(),
  in_house_lead_time_days: z.number().nonnegative(),
  process: quoteProcessEnum,
  material: quoteMaterialEnum,
  tolerance_class: toleranceClassEnum,
  quantity: z.number().int().positive(),
  shop_loading_pct: z.number(),
  margin_threshold: z.number().optional(),
  unavailable_materials: z.array(quoteMaterialEnum).optional(),
  estimated_volume_cm3_per_part: z.number().positive(),
}).describe("U-QT04 — in-house vs outsource recommendation");

export const scenarioGenerateSchema = z.object({
  count: z.number().int().positive(),
  seed: z.number().optional(),
  materials: z.array(quoteMaterialEnum).optional(),
  processes: z.array(quoteProcessEnum).optional(),
}).describe("U-QT05 — seeded synthetic scenario generator");

// U-3VIEW01 -- three-view pricing: current (headline) / optimal-vs-market /
// cost-floor + improvement advisor. Grounded on canonical ShopConfigurationEngine
// rates; headline is the customer-facing current-JM-structure price.
export const threeViewPricingSchema = z.object({
  material: z.string().min(1).describe("Material grade (e.g. tool_steel_a2, aluminum_6061)"),
  process: z.enum(["mill", "lathe", "wedm", "sinker_edm", "grind", "other"]).default("mill").describe("Process -- drives the machine rate"),
  machine_hours_per_part: z.number().nonnegative().describe("Cycle/run time at the machine, hours per part"),
  labor_hours_per_part: z.number().nonnegative().default(0).describe("Hands-on labor hours per part"),
  setup_hours: z.number().nonnegative().default(0).describe("One-time setup hours for the lot"),
  programming_hours: z.number().nonnegative().default(0).describe("One-time programming hours for the lot"),
  material_lb_per_part: z.number().nonnegative().default(0).describe("Raw material weight per part (lb)"),
  tooling_cost_per_part: z.number().nonnegative().default(0).describe("Perishable tooling cost per part"),
  quantity: z.number().int().positive().describe("Lot size"),
  material_cost_per_lb_override: z.number().nonnegative().optional().describe("Explicit material $/lb (skips market lookup)"),
  verified_comparables: z.number().int().nonnegative().default(0).describe("Count of verified historical comparables for this material x process cell -- drives the confidence band"),
  profile_id: z.string().default("jm-die").describe("Shop profile id"),
  region: z.string().optional().describe("Region for market material lookup"),
}).describe("U-3VIEW01 -- three-view pricing (current/optimal/cost-floor) + improvement advisor");

// U-LVP01 -- location/logistics/vendor-aware pricing: total landed cost (part + freight
// + customs) across current JM vendors AND alternative catalog vendors, ranked, with a
// sourcing suggestion. Composes GeoLogisticsRoutingEngine + the 482-vendor JM catalog.
export const locationVendorPricingSchema = z.object({
  part_value_usd: z.number().nonnegative().describe("Quoted part/order value for the lot (USD)"),
  per_part_weight_kg: z.number().positive().optional().describe("Per-part weight (kg) for freight"),
  quantity: z.number().int().positive().default(1).describe("Lot quantity"),
  buyer_region: z.string().min(1).default("US").describe("Buyer/delivery region code (US/EU/...)"),
  category: z.string().min(1).describe("Vendor category (material/tooling-consumable/outside-process/...)"),
  expedite: z.boolean().default(false).describe("Expedited freight"),
  same_metro: z.boolean().default(false).describe("Same-metro courier/pickup (cheapest zone)"),
  current_vendor_id: z.string().optional().describe("Explicit current-vendor id (else inferred)"),
  catalog_path: z.string().optional().describe("Override vendor catalog path (testing)"),
}).describe("U-LVP01 -- location/logistics/vendor-aware landed-cost pricing + sourcing suggestion");

export const vendorUnitPriceSchema = z.object({
  anchor_unit_price_usd: z.number().nonnegative().describe("Anchor unit price (USD/unit) -- the buyer's own material/part basis, canonical-rate-derived upstream"),
  pricing_access: z.string().optional().describe("Vendor catalog pricing_access signal (api/catalog/quote/unknown)"),
  has_api: z.boolean().optional().describe("Vendor has_api flag (programmatic price feed exists)"),
  vendor_region: z.string().optional().describe("Vendor supply region code (US/EU/CN/...); unknown -> buyer baseline"),
  quantity: z.number().int().positive().default(1).describe("Lot quantity"),
  vendor_id: z.string().optional().describe("Vendor id for provenance echo"),
  vendor_name: z.string().optional().describe("Vendor name for provenance echo"),
}).describe("U-LVP02 -- per-vendor advisory unit-price band (tier + region supply factor); NOT a firm quote");

// ── U-QT06/U-QT07 schemas ──
const sourceCategoryEnum = z.enum(["machining-handbook", "speeds-feeds", "tool-life", "surface-finish", "tolerance-standard", "material-property", "cost-benchmark", "process-capability", "safety-standard", "fixture-design", "cad-cam-reference", "edm-reference"]);

export const outsideKnowledgeQuerySchema = z.object({
  tokens: z.array(z.string()).optional(),
  categories: z.array(sourceCategoryEnum).optional(),
  minReliability: z.number().min(0).max(1).optional(),
  limit: z.number().int().positive().optional(),
}).describe("U-QT06 — query curated external-source catalog");

export const outsideKnowledgeCitationsSchema = outsideKnowledgeQuerySchema.describe("U-QT06 — formatted citation block from top-N catalog matches");

const reportShapeSchema = z.object({}).passthrough();

export const deepReasoningExplainBiasSchema = z.object({
  report: reportShapeSchema,
  customer: z.string(),
}).describe("U-QT07 — bias-explanation prompt envelope");
export const deepReasoningFindPatternSchema = z.object({ report: reportShapeSchema }).describe("U-QT07 — pattern-finding prompt envelope");
export const deepReasoningSuggestRateAdjustSchema = z.object({ report: reportShapeSchema }).describe("U-QT07 — rate-adjust prompt envelope");
export const deepReasoningOutlierInvestigateSchema = z.object({ report: reportShapeSchema }).describe("U-QT07 — outlier-investigate prompt envelope");
export const deepReasoningCrossCustomerSchema = z.object({
  report: reportShapeSchema,
  sourceCustomer: z.string(),
  targetCustomer: z.string(),
}).describe("U-QT07 — cross-customer transfer prompt envelope");

export const jmDieTrainingLoopRecommendSchema = z.object({
  report: z.object({
    ok: z.boolean(),
    total_predicted: z.number(),
    metrics: z.object({
      mae_usd: z.number(),
      rmse_usd: z.number(),
      mape_pct: z.number(),
      mean_signed_pct_error: z.number(),
    }),
    per_customer_bias: z.array(z.object({
      customer: z.string(),
      record_count: z.number(),
      mean_pct_error: z.number(),
      mean_abs_pct_error: z.number(),
      systematic_direction: z.enum(["over-predicting", "under-predicting", "balanced"]),
    })),
  }).passthrough(),
}).describe("U-QT01 — derive improvement recommendations from a prior accuracy report");

export const jmDieTrainingLoopUnderQuoteAssessSchema = z.object({
  report: z.object({}).passthrough().describe("AccuracyReport from jm_die_training_loop_run; its all_records[] feed the per-job under-quote assessment"),
  bandPct: z.number().positive().optional().describe("Fair-band half-width % (default 10): a job with |gap_pct| <= bandPct is classified 'fair'"),
  topN: z.number().int().positive().optional().describe("Max worst-under-quote rows returned (default 10)"),
}).describe("U-QP-UNDERQUOTE-ASSESS-WIRE — per-job under/fair/over-quote assessment over a training report's all_records (ADVISORY; fair_usd = model FMV estimate, NOT a customer quote — never emit without the margin-floor gate)");

// ── JM-DIE-FLEET-SCAN-MS0 schemas ──
export const jmDieScanLedgerStatsSchema = z.object({}).describe("U-FS01 — return aggregate ledger stats");

export const jmDieScanPlanBatchesSchema = z.object({
  archiveRoot: z.string().describe("Absolute path to JM Die archive root (e.g. H:/prism/JM DIE)"),
  batchSize: z.number().optional().describe("Files per batch (default 5000)"),
  walkLimit: z.number().optional().describe("Hard cap on files walked (default 500000)"),
  maxBatches: z.number().optional().describe("Hard cap on batches returned (default 100)"),
  subdirs: z.array(z.string()).optional().describe("Restrict walk to these subdirs"),
}).describe("U-FS02 — walk archive + dedup vs ledger + split into batches");

export const jmDieScanRecordBatchSchema = z.object({
  batch_id: z.string(),
  files: z.array(z.object({
    abs_path: z.string(),
    rel_path: z.string(),
    size_bytes: z.number(),
    mtime_iso: z.string(),
    machine_family: z.string(),
    extension: z.string(),
    is_cnc_program: z.boolean(),
  })),
  source: z.enum(["fleet-scan-batch", "program-analysis", "financial-baseline", "seed"]).optional(),
}).describe("U-FS02 — record a finished batch's files back to the ledger");

// ── U-QT10 calibration schemas ──
const calibrationFactorSchema = z.object({
  customer: z.string(),
  record_count: z.number(),
  signed_pct_error_observed: z.number(),
  factor: z.number(),
  factor_clamped: z.boolean(),
  rationale: z.string(),
});
const calibrationFactorsShapeSchema = z.object({
  ok: z.boolean(),
  generated_at: z.string(),
  source_report_signature: z.string(),
  global: calibrationFactorSchema,
  per_customer: z.array(calibrationFactorSchema),
  notes: z.array(z.string()),
  reason: z.string().optional(),
}).passthrough();

export const quotingCalibrationDeriveSchema = z.object({
  report: reportShapeSchema,
  minRecordsForCustomer: z.number().optional().describe("Below this → use global instead (default 3)"),
  minFactor: z.number().optional().describe("Lower clamp (default 0.20)"),
  maxFactor: z.number().optional().describe("Upper clamp (default 5.0)"),
  balancedBandPct: z.number().optional().describe("|signed_pct| ≤ this → factor=1.0 (default 5)"),
}).describe("U-QT10 — derive multiplicative correction factors from an AccuracyReport");

export const quotingCalibrationApplySchema = z.object({
  factors: calibrationFactorsShapeSchema,
  predicted_usd: z.number(),
  customer: z.string().optional(),
}).describe("U-QT10 — apply factors to a predicted FMV (per-customer falls back to global)");

export const quotingCalibrationMeasureSchema = z.object({
  report: reportShapeSchema,
  factors: calibrationFactorsShapeSchema,
}).describe("U-QT10 — measure pre/post MAPE + bias reduction from applying factors");

// ── QUOTING-SYNERGY-MS0 schemas (charlie /goal-20 iter11, 2026-05-25) ──
export const quotingShopProfileGetSchema = z.object({
  profile_id: z.string().optional().describe("Profile id (default 'jm-die'); falls back to built-in defaults when not on disk"),
}).describe("U-SHOP-PROFILE-TEMPLATE — load shop profile (machines, labor, electricity rate, overhead)");

export const quotingShopProfileListSchema = z.object({}).describe(
  "U-SHOP-PROFILE-TEMPLATE — list available shop profile ids from state/shared/shop-profiles/"
);

export const quotingShopElectricityCostSchema = z.object({
  profile_id: z.string().optional(),
  machine_family: z.string().describe("Machine family id (e.g. 'haas_vf2', 'okuma_lb3000')"),
  cycle_time_hr: z.number().nonnegative().describe("Active cycle time in hours"),
  load_factor: z.number().min(0).max(1).optional().describe("Power load factor 0..1 (default 0.65)"),
}).describe("U-SHOP-PROFILE-TEMPLATE — electricity cost for one machine cycle");

export const quotingWizardToQuoteSchema = z.object({
  wizard: z.object({
    domain: z.enum(["mill", "lathe", "wedm"]),
    machine_family: z.string(),
    material: z.string(),
    operations: z.array(z.object({
      name: z.string(),
      cycle_min: z.number().nonnegative(),
      tool_ids: z.array(z.string()).optional(),
      passes: z.number().int().nonnegative().optional(),
    })).min(1),
    setup_min: z.number().nonnegative(),
    operator_tier: z.enum(["apprentice", "operator", "senior", "master", "programmer"]).optional(),
    quantity: z.number().positive(),
  }),
  profile_id: z.string().optional(),
}).describe("U-WIZARD-TO-QUOTE — bridge mill/lathe/wedm wizard output → quote-time cost breakdown");

export const quotingSpeedFeedToCycleSchema = z.object({
  operations: z.array(z.object({
    name: z.string(),
    cycle_min: z.number().nonnegative(),
    tool_ids: z.array(z.string()).optional(),
    passes: z.number().int().nonnegative().optional(),
    physics: z.object({
      volume_to_remove_cm3: z.number().positive().optional(),
      path_length_mm: z.number().positive().optional(),
      material: z.string().optional(),
      machine_name: z.string().optional(),
      tool_diameter_mm: z.number().positive().optional(),
      flutes: z.number().int().positive().optional(),
      axial_depth_mm: z.number().positive().optional(),
      radial_depth_mm: z.number().positive().optional(),
      operation: z.enum(["milling", "turning", "drilling", "tapping", "reaming", "boring", "thread_milling"]).optional(),
      cut_type: z.enum(["roughing", "semi_finishing", "finishing"]).optional(),
    }).optional(),
  })).min(1),
}).describe("U-SPEED-FEED-TO-QUOTE — enrich wizard operations[] with physics-backed cycle_min via SpeedFeedOrchestrator");

export const quotingPrintToProgramToQuoteSchema = z.object({
  pipeline: z.object({
    domain: z.enum(["mill", "lathe", "wedm", "sinker_edm", "grinder"]),
    machine_family: z.string(),
    material: z.string(),
    estimated_cycle_min: z.number().nonnegative(),
    estimated_setup_min: z.number().nonnegative(),
    tool_ids: z.array(z.string()),
    op_count: z.number().int().nonnegative(),
    programming_hours: z.number().nonnegative().optional(),
    cad_generation_hours: z.number().nonnegative().optional(),
    quantity: z.number().positive(),
    // U-GCODE-TO-CYCLE-FOR-PRINT-PIPELINE (iter13) — optional G-code text drives auto-estimation
    gcode_text: z.string().optional().describe("Raw G-code text; when supplied AND estimated_cycle_min=0 → auto-estimated via GCodeTimeEstimatorEngine"),
    gcode_dialect: z.enum(["fanuc_mill", "mazak_lathe", "sodick_wedm", "auto"]).optional(),
    machine_rapid_rate_mm_per_min: z.number().positive().optional(),
    tool_change_overhead_s: z.number().nonnegative().optional(),
  }),
  profile_id: z.string().optional(),
  operator_tier: z.enum(["apprentice", "operator", "senior", "master", "programmer"]).optional(),
}).describe("U-PRINT-TO-PROGRAM-TO-QUOTE — bridge full print→CNC pipeline (CAD+CAM+G-code) → quote with programming + CAD costs (gcode_text → auto-estimate)");

export const fairMarketValueSchema = z.object({
  time_in_cut_s: z.number(),
  setup_time_s: z.number().optional(),
  machine_rate_usd_per_hr: z.number(),
  material_spend_usd: z.number(),
  material_markup: z.number().optional(),
  overhead_pct: z.number().optional(),
  target_margin_pct: z.number().optional(),
  charged_usd: z.number().optional(),
}).describe("U-JP03 — FMV estimate + verdict vs charged");

// Customer-safe public quote: same FMV inputs, plus optional raw lead-time tiers
// to sanitize. The action computes the internal FMV, then projects it through the
// QuotingPublicQuoteEngine total allow-list so NO internal cost basis can leak.
export const quotingPublicQuoteSchema = z.object({
  time_in_cut_s: z.number(),
  setup_time_s: z.number().optional(),
  machine_rate_usd_per_hr: z.number(),
  material_spend_usd: z.number(),
  material_markup: z.number().optional(),
  overhead_pct: z.number().optional(),
  target_margin_pct: z.number().optional(),
  charged_usd: z.number().optional(),
  lead_time_tiers: z.array(z.record(z.string(), z.unknown())).optional(),
}).describe("U-QP-PUBLIC-QUOTE -- customer-safe FMV projection (no internal cost basis)");

// Customer-safe instant quote: the full InstantQuoteInput (part_name/material/
// quantity required; all other part/feature/machine fields optional and validated
// inside InstantQuoteEngine.quote). The action runs the instant quote, then projects
// the InstantQuoteResult through the customer-safe boundary (no cost basis, DFM gate).
export const quotingPublicInstantQuoteSchema = z.object({
  part_name: z.string().min(1),
  material: z.string().min(1),
  // Positive integer -- reject a degenerate quantity at the schema rather than
  // relying on the downstream okNum guard to fail it closed (defense-in-depth).
  quantity: z.number().int().positive(),
}).passthrough().describe("U-QP-PUBLIC-INSTANT -- customer-safe instant quote (InstantQuoteInput; engine validates the rest)");

// Customer-deliverable quote packet (MVP S4 "download/email quote"). Takes the same
// InstantQuoteInput as the public instant quote -- the action runs the instant quote,
// projects it through the customer-safe boundary, THEN builds the packet -- plus an
// optional `meta` for the packet header (identity + validity; never pricing). The
// engine + the public projection enforce the no-cost-basis-leak boundary.
export const quotePacketGenerateSchema = z.object({
  part_name: z.string().min(1),
  material: z.string().min(1),
  quantity: z.number().int().positive(),
  // Optional packet header metadata. Identity/validity only -- NO pricing inputs
  // (those would be internal). All optional; the engine fills sane defaults.
  meta: z.object({
    quote_id: z.string().optional(),
    date: z.string().optional(),
    valid_until: z.string().optional(),
    valid_until_days: z.number().optional(),
    part_name: z.string().optional(),
    customer_ref: z.string().optional(),
    quantity: z.number().optional(),
  }).optional(),
}).passthrough().describe("U-QP-QUOTE-PACKET -- customer-deliverable quote packet (InstantQuoteInput + optional header meta; no cost basis)");

export const QUOTING_ACTION_SCHEMAS: Record<QuotingAction, z.ZodTypeAny> = {
  camera_intake_route: cameraIntakeRouteSchema,
  insert_box_lookup: insertBoxLookupSchema,
  machine_tag_extract: machineTagExtractSchema,
  machine_parts_bom_resolve: machinePartsBomResolveSchema,
  vendor_realtime_price: vendorRealtimePriceSchema,
  live_chat_session_open: liveChatSessionOpenSchema,
  live_chat_session_turn: liveChatSessionTurnSchema,
  live_chat_session_close: liveChatSessionCloseSchema,
  accuracy_platt_calibrate: accuracyPlattCalibrateSchema,
  accuracy_fuzzy_match_sku: accuracyFuzzyMatchSkuSchema,
  accuracy_bom_urgency: accuracyBomUrgencySchema,
  accuracy_quote_interval: accuracyQuoteIntervalSchema,
  neural_route_quoting_task: neuralRouteQuotingTaskSchema,
  neural_psn_synergy_status: neuralPsnSynergyStatusSchema,
  quote_outcome_feed: quoteOutcomeFeedSchema,
  jm_die_docustrata_ingest: jmDieDocustrataIngestSchema,
  jm_die_historical_material_price: jmDieHistoricalMaterialPriceSchema,
  jm_die_financial_baseline: jmDieFinancialBaselineSchema,
  jm_die_quote_training_pipeline: jmDieQuoteTrainingPipelineSchema,
  gcode_time_estimate: gcodeTimeEstimateSchema,
  gcode_cycle_time: gcodeCycleTimeSchema,
  inflation_adjust: inflationAdjustSchema,
  fair_market_value: fairMarketValueSchema,
  quoting_public_quote: quotingPublicQuoteSchema,
  quoting_public_instant_quote: quotingPublicInstantQuoteSchema,
  quote_packet_generate: quotePacketGenerateSchema,
  jm_die_scan_ledger_stats: jmDieScanLedgerStatsSchema,
  jm_die_scan_plan_batches: jmDieScanPlanBatchesSchema,
  jm_die_scan_record_batch: jmDieScanRecordBatchSchema,
  jm_die_docs_by_customer: jmDieDocsByCustomerSchema,
  jm_die_docs_by_part: jmDieDocsByPartSchema,
  jm_die_docs_by_machine_family: jmDieDocsByMachineFamilySchema,
  jm_die_docs_by_extension: jmDieDocsByExtensionSchema,
  jm_die_docs_by_tokens: jmDieDocsByTokensSchema,
  jm_die_docs_customer_rollup: jmDieDocsCustomerRollupSchema,
  jm_die_training_loop_run: jmDieTrainingLoopRunSchema,
  jm_die_training_loop_recommend: jmDieTrainingLoopRecommendSchema,
  jm_die_training_loop_under_quote_assess: jmDieTrainingLoopUnderQuoteAssessSchema,
  quote_xometry_style: quoteXometryStyleSchema,
  outsource_recommend: outsourceRecommendSchema,
  scenario_generate: scenarioGenerateSchema,
  three_view_pricing: threeViewPricingSchema,
  location_vendor_pricing: locationVendorPricingSchema,
  vendor_unit_price: vendorUnitPriceSchema,
  outside_knowledge_query: outsideKnowledgeQuerySchema,
  outside_knowledge_citations: outsideKnowledgeCitationsSchema,
  deep_reasoning_explain_bias: deepReasoningExplainBiasSchema,
  deep_reasoning_find_pattern: deepReasoningFindPatternSchema,
  deep_reasoning_suggest_rate_adjust: deepReasoningSuggestRateAdjustSchema,
  deep_reasoning_outlier_investigate: deepReasoningOutlierInvestigateSchema,
  deep_reasoning_cross_customer: deepReasoningCrossCustomerSchema,
  quoting_calibration_derive: quotingCalibrationDeriveSchema,
  quoting_calibration_apply: quotingCalibrationApplySchema,
  quoting_calibration_measure: quotingCalibrationMeasureSchema,
  quoting_calibration_derive_with_cov: quotingCalibrationDeriveWithCovSchema,
  quoting_active_factor_get: quotingActiveFactorGetSchema,
  quoting_active_factor_apply: quotingActiveFactorApplySchema,
  quoting_active_factor_metadata: quotingActiveFactorMetadataSchema,
  // QUOTING-COMPLETENESS-MS0
  quoting_lead_time_tiers: quotingLeadTimeTiersSchema,
  quoting_secondary_ops_price: quotingSecondaryOpsPriceSchema,
  quoting_secondary_ops_list: quotingSecondaryOpsListSchema,
  quoting_tolerance_pricing: quotingTolerancePricingSchema,
  quoting_cross_part_synergy: quotingCrossPartSynergySchema,
  quoting_phone_ocr: z.object({
    image_base64: z.string().describe("Base64-encoded image bytes (jpeg/png)"),
    language: z.string().optional(),
    psm: z.number().int().optional(),
    autoClassify: z.boolean().optional(),
  }),
  quoting_phone_ocr_status: z.object({}),
  quoting_freight_quote: z.object({
    weight_lbs: z.number().positive(),
    cubic_inches: z.number().positive().optional(),
    origin_zip3: z.string().optional(),
    destination_zip3: z.string().optional(),
    service_tier: z.enum(["ground", "two_day", "next_day", "ltl", "ftl"]).optional(),
    declared_value_usd: z.number().nonnegative().optional(),
  }),
  quoting_freight_tiers: z.object({}),
  quoting_outcome_psi_delta_score: z.object({
    quote_id: z.string(),
    slot: z.string().optional(),
    customer: z.string().optional(),
    predicted_usd: z.number().nonnegative(),
    actual_usd: z.number().positive(),
    ts: z.string().optional(),
    calibrated: z.boolean().optional(),
  }),
  quoting_outcome_psi_delta_batch: z.object({
    outcomes: z.array(z.object({
      quote_id: z.string(),
      slot: z.string().optional(),
      customer: z.string().optional(),
      predicted_usd: z.number().nonnegative(),
      actual_usd: z.number().positive(),
      ts: z.string().optional(),
      calibrated: z.boolean().optional(),
    })),
  }),
  quoting_mcmaster_quote: z.object({
    part_number: z.string(),
    quantity: z.number().positive().optional(),
  }),
  quoting_mcmaster_batch: z.object({
    parts: z.array(z.object({ part_number: z.string(), quantity: z.number().positive().optional() })),
  }),
  quoting_pipeline_stresstest: z.object({
    n: z.number().int().positive(),
    seed: z.number().int().optional(),
    materials: z.array(z.string()).optional(),
    processes: z.array(z.string()).optional(),
    earlyExit: z.boolean().optional(),
  }),
  // QUOTING-SYNERGY-MS0 (charlie /goal-20 iter11)
  quoting_shop_profile_get: quotingShopProfileGetSchema,
  quoting_shop_profile_list: quotingShopProfileListSchema,
  quoting_shop_electricity_cost: quotingShopElectricityCostSchema,
  quoting_wizard_to_quote: quotingWizardToQuoteSchema,
  quoting_print_to_program_to_quote: quotingPrintToProgramToQuoteSchema,
  quoting_speed_feed_to_cycle: quotingSpeedFeedToCycleSchema,
  // U-SECONDARY-OPS-PROFILE-OVERRIDE (charlie /goal-20 iter14)
  quoting_secondary_ops_price_for_profile: z.object({
    ops: z.array(z.string()).min(1),
    quantity: z.number().positive(),
    base_material_cost_usd: z.number().nonnegative().optional(),
    catalog_overrides: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
    profile_id: z.string().optional(),
  }),
  // U-UTILITY-COSTS-EXTENDED (charlie /goal-20 iter15)
  quoting_shop_utilities_cost: z.object({
    profile_id: z.string().optional(),
    machine_family: z.string(),
    cycle_time_hr: z.number().nonnegative(),
    load_factor: z.number().min(0).max(1).optional(),
  }),
  // U-QP-TRAINING-ORCHESTRATOR (charlie /goal-yolo iter1)
  quoting_training_orchestrator_run: z.object({
    records: z.array(z.object({
      customer: z.string(),
      part_id: z.string(),
      doc_date: z.string().nullable(),
      actual_revenue_usd: z.number().positive(),
      estimated_time_in_cut_s: z.number().nonnegative().optional(),
      machine_rate_usd_per_hr: z.number().nonnegative().optional(),
      estimated_material_spend_usd: z.number().nonnegative().optional(),
    })),
    trainingOpts: z.object({
      defaultMachineRate: z.number().nonnegative().optional(),
      defaultMaterialSpend: z.number().nonnegative().optional(),
      defaultTimeInCutS: z.number().nonnegative().optional(),
    }).optional(),
    deriveOpts: z.object({
      minRecordsForCustomer: z.number().int().nonnegative().optional(),
      minFactor: z.number().positive().optional(),
      maxFactor: z.number().positive().optional(),
      balancedBandPct: z.number().nonnegative().optional(),
    }).optional(),
    writeIfSafe: z.boolean().optional(),
    activeFactorPath: z.string().optional(),
    feedPsnAutonomy: z.boolean().optional(),
  }),
  // U-DYNAMIC-SHOP-RATE (charlie /goal-20 iter19; auto-loading-source yolo-iter2)
  quoting_dynamic_shop_rate: z.object({
    machine_family: z.string(),
    /** Optional in yolo-iter2 — omit to auto-read from state/shared/quoting/current-loading.json */
    current_loading_pct: z.number().min(0).max(1).optional(),
    hours_until_delivery: z.number().nonnegative().optional(),
    profile_id: z.string().optional(),
    loadingStateFilePath: z.string().optional(),
    loadingStalenessHours: z.number().positive().optional(),
  }),
  // U-MACHINE-INVEST-FROM-FLEET (charlie /goal-20 iter18)
  quoting_machine_invest_roi: z.object({
    proposal: z.object({
      candidate_family: z.string(),
      candidate_domain: z.enum(["mill", "lathe", "wedm", "sinker_edm", "grinder"]),
      cost_usd: z.number().positive(),
      candidate_rate_usd_per_hr: z.number().nonnegative(),
      candidate_power_kw: z.number().nonnegative(),
      candidate_utilization_pct: z.number().min(0).max(1),
      incumbent_family: z.string(),
      migration_fraction: z.number().min(0).max(1),
      monthly_target_hours: z.number().nonnegative().optional(),
    }),
    profile_id: z.string().optional(),
    ledgerPath: z.string().optional(),
  }),
  // U-CROSS-PART-SYNERGY-FROM-JM-FLEET (charlie /goal-20 iter17)
  quoting_cross_part_synergy_from_fleet: z.object({
    proposal: z.object({
      type: z.enum(["tool", "fixture", "machine", "consumable"]),
      description: z.string(),
      cost_usd: z.number().positive(),
      savings_per_part_usd_quoted: z.number().nonnegative(),
      quoted_annual_volume: z.number().nonnegative(),
      match: z.object({
        materials: z.array(z.string()).optional(),
        processes: z.array(z.string()).optional(),
        feature_tokens: z.array(z.string()).optional(),
        machines: z.array(z.string()).optional(),
      }),
      savings_per_part_usd_beneficiary: z.number().nonnegative().optional(),
    }),
    ledgerPath: z.string().optional(),
    customerFilter: z.string().optional(),
    machineFamilyFilter: z.string().optional(),
    annualVolumePerPart: z.number().nonnegative().optional(),
  }),
  quoting_docustrata_train: z.object({
    records: z.array(z.object({
      date: z.string(),
      customer: z.string(),
      part_id: z.string(),
      material: z.string(),
      predicted_quote_usd: z.number().nonnegative(),
      actual_invoice_usd: z.number().positive(),
      quantity: z.number().positive(),
    })),
    today_market: z.object({
      material_spot_by_name: z.record(z.string(), z.number()),
      freight_index: z.number(),
      labor_index: z.number(),
    }).optional(),
  }),
  // U-QP-COST-BASIS-WIRE (charlie 2026-06-01) — real vendor cost-basis priors from jm-vendor-cost-index
  cost_index_prior: z.object({
    category: z.enum([
      "material", "outside-process", "freight-shipping", "tooling-consumable",
      "inspection-quality", "overhead-utility", "misc",
    ]).optional().describe("Cost category; omit to return all categories + totals"),
    indexPath: z.string().optional().describe("Override the jm-vendor-cost-index.json path (testing/override)"),
  }),
  // U-QP-COST-BASIS-NORMALIZE (charlie 2026-06-12) -- units-correct per-grade $/in3 material basis
  material_cost_basis: z.object({
    grade: z.string().optional().describe("Material grade (e.g. H13, D2); omit to return all grades"),
    volume_in3: z.number().positive().optional().describe("Part volume in cubic inches; with grade -> material_cost_usd = usd_per_in3 * volume"),
    basisPath: z.string().optional().describe("Override the jm-material-cost-basis.json path (testing/override)"),
    minConfidence: z.enum(["high", "low-n"]).optional().describe("Confidence floor for grade+volume costing (default low-n). Use 'high' for customer-facing quotes -- refuses low-n AP-ledger outliers (e.g. D2 $251/in3)"),
  }),
  // QUOTING-OPTIMAL-MS0/U4 (charlie 2026-06-30) -- per-consumable-type predicted-vs-actual reconciliation
  consumable_reconcile: z.object({
    job_id: z.string().min(1).describe("Job identifier for this reconciliation"),
    quote_id: z.string().min(1).describe("Quote identifier joined to the closed-loop lineage"),
    customer: z.string().optional().describe("Customer name (context only)"),
    predicted: z
      .array(
        z.object({
          type: z.string().min(1).describe("Stable key joining predicted<->actual (e.g. roughing_inserts)"),
          category: z
            .enum([
              "insert",
              "drill",
              "tap",
              "reamer",
              "end-mill",
              "wire",
              "coolant",
              "abrasive",
              "grinding-wheel",
              "boring-bar",
              "misc-tooling",
            ])
            .describe("Coarse consumable family; drives the jm-tool-purchases.json advisory-prior fallback"),
          subtype: z.string().optional().describe("Finer label (e.g. coated_carbide_r390)"),
          predicted_qty: z.number().describe("Predicted quantity consumed on this job"),
          cost_per_unit: z.number().optional().describe("Caller unit cost (USD); omit to fall back to the advisory per-line-item prior (NOT a true per-unit cost)"),
        }),
      )
      .describe("Predicted consumable lines from the quote"),
    actual: z
      .array(
        z.object({
          type: z.string().min(1).describe("Matches a predicted line's type"),
          qty_used: z.number().describe("Actual quantity consumed on the shop floor"),
          qty_broken: z.number().optional().describe("Quantity broken/scrapped (drives breakage_rate)"),
        }),
      )
      .describe("Actual per-type consumption reported from the shop floor / ERP"),
    unit_cost_basis_path: z.string().optional().describe("Override the jm-tool-purchases.json path (testing/override)"),
  }),
  // U-QP-OUTBOUND-PRICE-PRIOR (charlie 2026-06-01) — real outbound sold-price distribution prior from jm-sold-orders
  outbound_price_prior: z.object({
    minConfidence: z.enum(["high", "medium", "low", "none"]).optional().describe("Confidence floor (default medium=high+medium); NEVER default low/none — source forbids low-confidence prices in a live quote"),
    indexPath: z.string().optional().describe("Override the jm-sold-orders.json path (testing/override)"),
  }),
  // U-QP-OUTBOUND-PRICE-CALIB (charlie 2026-06-01) — predicted-vs-real-outbound distribution-match diagnostic (read-only, advisory)
  outbound_price_calibration: z.object({
    predicted: z.array(z.number()).describe("Predicted prices to compare against the real outbound distribution (grain must match `against`)"),
    against: z.enum(["unit", "line", "order"]).optional().describe("Real-outbound grain: unit=per-piece (default), line=per-part-job ext_price, order=per-order total"),
    minConfidence: z.enum(["high", "medium", "low", "none"]).optional().describe("Reference confidence floor (default high = cleanest verified subset)"),
    alignTolerance: z.number().positive().optional().describe("Dimensionless diagnostic alignment band (default 0.15); NOT a margin / quote-vs-actual reconciliation threshold"),
    minReferenceN: z.number().positive().optional().describe("Sample-quality floor (default 30): below this many real reference observations the result is flagged reliabilityVerdict=insufficient-reference (verdict DIRECTIONAL). Dimensionless, NOT a price constant"),
    maxConcentration: z.number().positive().optional().describe("Sample-quality bound (default 0.02): if the reference (p75-p25)/median is below this, the distribution is a degenerate price spike (OCR $1 signature) → reliabilityVerdict=degenerate-reference. Dimensionless, NOT a price constant"),
    maxBottomSpikeFrac: z.number().positive().optional().describe("Sample-quality bound (default 0.25): if this fraction or more of the reference observations sit at the minimum value AND the median is pinned to that floor, the reference is a degenerate OCR $1 floor-spike -> reliabilityVerdict=degenerate-reference even when the IQR is wide. Dimensionless, NOT a price constant"),
    indexPath: z.string().optional().describe("Override the jm-sold-orders.json path (testing/override)"),
  }),
  // U-QP-OUTBOUND-PROMOTE-GATE (charlie 2026-06-09) -- secondary promote gate: does the predicted price distribution align with JM real sold prices? compareToPredicted + gateOutboundAlignment; read-only advisory
  outbound_promote_check: z.object({
    predicted: z.array(z.number()).describe("Predicted prices (PRICE-grain). Compared against `line` (per-part-job ext_price = the FMV grain) by default"),
    against: z.enum(["unit", "line", "order"]).optional().describe("Real-outbound grain (default `line` = per-part-job ext_price = FMV grain). Must match the grain of `predicted`"),
    minConfidence: z.enum(["high", "medium", "low", "none"]).optional().describe("Reference confidence floor (default high = cleanest verified subset)"),
    alignTolerance: z.number().positive().optional().describe("Dimensionless diagnostic alignment band (default 0.15); NOT a margin / quote-vs-actual reconciliation threshold"),
    minReferenceN: z.number().positive().optional().describe("Sample-quality floor (default 30): below this many real reference observations the gate reads unverified (reference DIRECTIONAL). Dimensionless, NOT a price constant"),
    maxConcentration: z.number().positive().optional().describe("Sample-quality bound (default 0.02): if the reference (p75-p25)/median is below this, the reference is a degenerate price spike -> unverified. Dimensionless, NOT a price constant"),
    driftTolerance: z.number().positive().optional().describe("Dimensionless drift band for the WITHHELD decision (defaults to the match alignTolerance); NOT a margin/price constant"),
    maxBottomSpikeFrac: z.number().positive().optional().describe("Sample-quality bound (default 0.25): a degenerate OCR $1 floor-spike (>= this fraction of reference observations at the minimum value with the median pinned to that floor) reads reliabilityVerdict=degenerate-reference -> unverified, even when the IQR is wide. Dimensionless, NOT a price constant"),
    indexPath: z.string().optional().describe("Override the jm-sold-orders.json path (testing/override)"),
  }),
  // U-QP-TRAINING-STATUS-ACTION (charlie 2026-06-02) -- front-to-back read of the latest closed-loop training-cycle status
  training_status: z.object({
    statusPath: z.string().optional().describe("Override the latest-training-status.json path (testing/override)"),
    staleThresholdHours: z.number().positive().optional().describe("Staleness flag threshold in hours (default 24); isStale=true above it so the UI can warn the loop may have stopped. Dimensionless time, NOT a price/margin constant"),
    includeActiveFactor: z.boolean().optional().describe("Also return the currently-active calibration-factor metadata (ageMinutes/isStale/signature). Default true"),
    // U-QP-OUTCOME-DIGEST-IN-STATUS (charlie 2026-06-11) -- surface the closed-loop behavior-health digest in the same read
    includeOutcomeDigest: z.boolean().optional().describe("Also return the closed-loop outcome digest (behavior distribution + provenance_problem/drift_uncorrectable health verdict from quoting-cycle-outcomes.jsonl). Default false (opt-in, zero contract change when omitted)"),
    outcomeLedgerPath: z.string().optional().describe("Override the outcome-ledger path for the digest (testing/override). Only used when includeOutcomeDigest=true"),
  }),
  // QUOTING-CLOSED-LOOP-MS0 (charlie 2026-06-11) -- provenance gate: load real actuals from hotel ActualCostEngine -> classify -> may_promote verdict
  closed_loop_provenance_check: z.object({
    sinceIso: z.string().optional().describe("ISO 8601 date filter -- return outcomes on or after this date. Currently advisory (ActualCostEngine has no created_at); reserved for future sinceIso plumbing."),
  }).describe("QUOTING-CLOSED-LOOP-MS0 -- load JobProfitability actuals, classify provenance via classifyOutcomeProvenance(), return {may_promote, provenance, outcome_count, outcomes}"),
  // QUOTING-COST-SAVINGS-WIRE (charlie 2026-06-11) -- expose the previously-dormant CostSavingsTrackerEngine via ONE dispatcher action
  // that routes to the engine's own calculate(savingsAction, params) dispatch. passthrough() carries each sub-action's own
  // fields (category/description/estimatedSavings/recommendation/baseline/sourceEngine/months/since/confirm/cost-config keys)
  // straight to the engine, which validates them internally -- so the dispatcher schema only pins the discriminator.
  cost_savings: z.object({
    savingsAction: z.enum([
      "roi_log", "roi_log_outcome", "roi_summary", "roi_report",
      "roi_reset", "roi_configure_costs", "roi_events", "roi_trend",
    ]).describe("Which CostSavingsTrackerEngine.calculate sub-action to run (ROI savings ledger: log a recommendation/outcome, summary, report, reset period, configure cost basis, query events, monthly trend)"),
  }).passthrough().describe("QUOTING-COST-SAVINGS-WIRE -- route to CostSavingsTrackerEngine.calculate(savingsAction, params); passthrough fields carry the sub-action's own params"),
  // QUOTING-SYNERGY-MS0/U-QP-OUTCOME-LEDGER-DIGEST (charlie 2026-06-11) -- read-side consumer of the feedOutcome ledger
  closed_loop_outcome_digest: z.object({
    ledgerPath: z.string().optional().describe("Override the quoting-cycle-outcomes.jsonl path (testing/override). Defaults to DEFAULT_OUTCOME_LEDGER_PATH (state/shared/quoting/quoting-cycle-outcomes.jsonl)."),
  }).describe("U-QP-OUTCOME-LEDGER-DIGEST -- read the closed-loop outcome ledger -> behavior distribution (per-verdict counts/rates, applied/withhold/rollback rates, mean applied mape_delta) + advisory health verdict (provenance_problem / drift_uncorrectable / healthy)"),
  // U-QP-SIMILAR-JOB-RETRIEVE (india 2026-06-24) -- kNN similar-job retrieval primitive (precomputed vectors injected; corpus loading + featurization are a charlie/juliett data-infra pre-req)
  quoting_similar_job_retrieve: z.object({
    query: z.array(z.number()).min(1).describe("Query feature vector (length d)"),
    corpus: z.array(z.object({
      jobId: z.string().min(1).describe("Stable id of the historical job/quote"),
      vector: z.array(z.number()).min(1).describe("Precomputed d-dim feature vector (same length as query)"),
      record: z.unknown().optional().describe("Opaque historical-job record echoed back on a hit"),
    })).describe("Historical-job corpus with precomputed feature vectors"),
    k: z.number().int().positive().optional().describe("Neighbors to return (default 5, clamped to corpus size)"),
    metric: z.enum(["cosine", "euclidean", "manhattan"]).optional().describe("Distance metric (default cosine -- the RAG default)"),
  }).describe("U-QP-SIMILAR-JOB-RETRIEVE -- top-k nearest historical jobs by feature-vector similarity via the canonical KNearestNeighbors algorithm (cold-start retrieval prior)"),

  // U-QP-JM-PARTSPEC-ADAPTER (charlie 2026-06-28, W3) -- rank a new part against the LIVE JM
  // corpus: JMDiePartRecords are adapted to PartSpecs (machine_type/operations/material from
  // the file-join index) then ranked by PartSimilarityEngine. No precomputed vectors needed.
  quoting_find_similar_jm_parts: z.object({
    target: z.object({
      material: z.string().min(1).describe("Target part material (e.g. D2, A2, AL6061)"),
      iso_group: z.string().optional(),
      machine_type: z.string().optional().describe("lathe | mill | wire_edm | sinker_edm | grinder"),
      operations: z.array(z.string()).optional(),
      features: z.array(z.string()).optional(),
    }).passthrough().describe("Target PartSpec to find JM neighbors for"),
    records: z.array(z.object({
      partNumber: z.string().min(1),
      customer: z.string().optional(),
      cncPrograms: z.array(z.object({
        machineCategory: z.string().optional(),
        copiedAs: z.string().optional(),
        sourcePath: z.string().optional(),
      }).passthrough()).optional(),
    }).passthrough()).describe("JMDiePartRecords from the live jm-part-library corpus"),
    topN: z.number().int().positive().optional().describe("Neighbors to return (default 5)"),
  }).describe("U-QP-JM-PARTSPEC-ADAPTER -- adapt live JM part records to PartSpecs + rank a target part against them"),
  optimal_quote_recommend: optimalQuoteRecommendSchema,
};
