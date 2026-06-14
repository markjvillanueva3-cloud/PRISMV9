/**
 * quotingDispatcher — QUOTING-PIPELINE-MS0 / U-QP08
 *
 * MCP dispatcher for the camera-intake + quoting bridges.
 *
 * Actions:
 *   - camera_intake_route          → CameraIntakeRouterEngine.classify           (U-QP02)
 *   - insert_box_lookup            → InsertBoxToCatalogBridgeEngine.lookup       (U-QP03)
 *   - machine_tag_extract          → MachineServiceTagOCREngine.extract          (U-QP04)
 *   - machine_parts_bom_resolve    → MachinePartsBOMResolverEngine.resolve       (U-QP05)
 *   - vendor_realtime_price        → VendorRealtimePricingClientEngine.lookupPrice (U-QP06)
 *   - live_chat_session_{open,turn,close} → LiveChatRouterEngine                 (U-QP07)
 *
 * Each handler lazy-imports its engine to keep cold-start cheap.
 *
 * @author slot:charlie /goal-13 iter5, 2026-05-24
 */
import { z } from "zod";
import { quotingActionEnum, QUOTING_ACTION_SCHEMAS } from "../../schemas/quotingActionSchemas.js";

export function registerQuotingDispatcher(server: any): void {
  server.tool(
    "prism_quoting",
    "PRISM camera-intake + quoting bridges (QUOTING-PIPELINE-MS0). 8 actions: image-route, insert-box catalog, machine-tag OCR, parts BOM, vendor pricing, live chat (open/turn/close).",
    {
      action: quotingActionEnum,
      params: z.record(z.string(), z.unknown()).optional().describe("Action-specific parameters (see action schemas)"),
    },
    async ({ action, params = {} }: { action: string; params?: Record<string, unknown> }) => {
      const schema = QUOTING_ACTION_SCHEMAS[action as keyof typeof QUOTING_ACTION_SCHEMAS];
      if (!schema) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: `unknown action: ${action}` }) }],
          isError: true,
        };
      }
      const parsed = schema.safeParse(params);
      if (!parsed.success) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "schema-validation-failed", issues: parsed.error.issues }) }],
          isError: true,
        };
      }
      let result: unknown;
      try {
        switch (action) {
          case "camera_intake_route": {
            const { cameraIntakeRouterEngine } = await import("../../engines/CameraIntakeRouterEngine.js");
            result = cameraIntakeRouterEngine.classify(parsed.data as any);
            break;
          }
          case "insert_box_lookup": {
            const { insertBoxToCatalogBridgeEngine } = await import("../../engines/InsertBoxToCatalogBridgeEngine.js");
            result = insertBoxToCatalogBridgeEngine.lookup(parsed.data as any);
            break;
          }
          case "machine_tag_extract": {
            const { machineServiceTagOCREngine } = await import("../../engines/MachineServiceTagOCREngine.js");
            result = machineServiceTagOCREngine.extract(parsed.data as any);
            break;
          }
          case "machine_parts_bom_resolve": {
            const { machinePartsBOMResolverEngine } = await import("../../engines/MachinePartsBOMResolverEngine.js");
            result = machinePartsBOMResolverEngine.resolve(parsed.data as any);
            break;
          }
          case "vendor_realtime_price": {
            const { vendorRealtimePricingClientEngine } = await import("../../engines/VendorRealtimePricingClientEngine.js");
            result = vendorRealtimePricingClientEngine.lookupPrice(parsed.data as any);
            break;
          }
          case "cost_index_prior": {
            // U-QP-COST-BASIS-WIRE — per-category unit-cost prior(s) from the real JM AP cost-index
            const { vendorCostIndexEngine } = await import("../../engines/VendorCostIndexEngine.js");
            result = vendorCostIndexEngine.prior(parsed.data as any);
            break;
          }
          case "material_cost_basis": {
            // U-QP-COST-BASIS-NORMALIZE -- units-correct per-grade $/in3 (block-only consumable).
            // grade+volume_in3 -> material_cost_usd; grade only -> per-grade basis; neither -> all grades.
            const { vendorCostIndexEngine } = await import("../../engines/VendorCostIndexEngine.js");
            const p = parsed.data as { grade?: string; volume_in3?: number; basisPath?: string; minConfidence?: "high" | "low-n" };
            if (p.grade && typeof p.volume_in3 === "number") {
              result = vendorCostIndexEngine.materialCostForVolume(p.grade, p.volume_in3, p.basisPath, p.minConfidence ? { minConfidence: p.minConfidence } : undefined);
            } else if (p.grade) {
              result = vendorCostIndexEngine.getMaterialGradeBasis(p.grade, p.basisPath);
            } else {
              result = vendorCostIndexEngine.loadMaterialCostBasis(p.basisPath);
            }
            break;
          }
          case "outbound_price_prior": {
            // U-QP-OUTBOUND-PRICE-PRIOR — confidence-gated real outbound sold-price distribution prior (jm-sold-orders)
            const { outboundPriceIndexEngine } = await import("../../engines/OutboundPriceIndexEngine.js");
            result = outboundPriceIndexEngine.pricePrior(parsed.data as any);
            break;
          }
          case "outbound_price_calibration": {
            // U-QP-OUTBOUND-PRICE-CALIB — read-only distribution-match diagnostic (predicted prices vs real outbound)
            const { outboundPriceIndexEngine } = await import("../../engines/OutboundPriceIndexEngine.js");
            result = outboundPriceIndexEngine.compareToPredicted((parsed.data as any).predicted, parsed.data as any);
            break;
          }
          case "outbound_promote_check": {
            // U-QP-OUTBOUND-PROMOTE-GATE -- secondary promote gate over the real outbound price
            // distribution: compareToPredicted (PRICE-grain; default against=line = the per-part-job
            // FMV grain) -> gateOutboundAlignment (block ONLY on a reliable predicted-high drift).
            // Read-only advisory; never writes a factor or emits a quote.
            const { outboundPriceIndexEngine } = await import("../../engines/OutboundPriceIndexEngine.js");
            const { gateOutboundAlignment } = await import("../../engines/QuotingClosedLoopEngine.js");
            const p = parsed.data as { predicted: number[]; against?: "unit" | "line" | "order"; driftTolerance?: number };
            const match = outboundPriceIndexEngine.compareToPredicted(p.predicted, { ...(parsed.data as any), against: p.against ?? "line" });
            const gate = gateOutboundAlignment(match, { driftTolerance: p.driftTolerance });
            result = { match, gate };
            break;
          }
          case "training_status": {
            // U-QP-TRAINING-STATUS-ACTION -- front-to-back synergy read: the latest closed-loop
            // training-cycle status (latest-training-status.json) + the currently-active calibration
            // factor metadata, so the frontend/backend reads ONE action instead of tail-parsing the
            // train-cycle-history.jsonl ledger. Read-only; never activates a factor.
            const p = parsed.data as { statusPath?: string; staleThresholdHours?: number; includeActiveFactor?: boolean; includeOutcomeDigest?: boolean; outcomeLedgerPath?: string };
            const { quotingActiveFactorLoaderEngine } = await import("../../engines/QuotingActiveFactorLoaderEngine.js");
            const trainingStatus = await quotingActiveFactorLoaderEngine.readLatestTrainingStatus({
              path: p.statusPath,
              staleThresholdHours: p.staleThresholdHours,
            });
            const activeFactor =
              p.includeActiveFactor === false ? undefined : await quotingActiveFactorLoaderEngine.getMetadata();
            // U-QP-OUTCOME-DIGEST-IN-STATUS (charlie 2026-06-11): make the closed-loop behavior-health
            // verdict consumable through the SAME read the calibration-health UI already calls. Opt-in
            // (default off -> zero contract change); telemetry-read only, never gates.
            const outcomeDigest = p.includeOutcomeDigest
              ? await (await import("../../engines/QuotingOutcomeLedgerDigestEngine.js")).quotingOutcomeLedgerDigestEngine.digest({ ledgerPath: p.outcomeLedgerPath })
              : undefined;
            result = { ok: trainingStatus.ok, reason: trainingStatus.reason, training_status: trainingStatus, active_factor: activeFactor, outcome_digest: outcomeDigest };
            break;
          }
          case "closed_loop_provenance_check": {
            // QUOTING-CLOSED-LOOP-MS0 -- load real actuals from hotel's ActualCostEngine,
            // classify via classifyOutcomeProvenance(), return {may_promote, provenance, outcome_count, outcomes}.
            // Charlie soul refuse: FAIL LOUD when no real actuals (loader throws -> provenanceCheck maps to empty verdict).
            const p = parsed.data as { sinceIso?: string };
            const { quotingActualOutcomeLoaderEngine } = await import("../../engines/QuotingActualOutcomeLoaderEngine.js");
            result = await quotingActualOutcomeLoaderEngine.provenanceCheck({ sinceIso: p.sinceIso });
            break;
          }
          case "cost_savings": {
            // QUOTING-COST-SAVINGS-WIRE (charlie 2026-06-11) -- wire the dormant CostSavingsTrackerEngine
            // (13/13 tests, was 0 dispatcher consumers) into prism_quoting. One action routes to the engine's
            // own calculate(savingsAction, params) dispatch (8 roi_* sub-actions: ROI savings ledger).
            const p = parsed.data as { savingsAction: string } & Record<string, unknown>;
            const { costSavingsTrackerEngine } = await import("../../engines/CostSavingsTrackerEngine.js");
            result = costSavingsTrackerEngine.calculate(p.savingsAction, p);
            break;
          }
          case "closed_loop_outcome_digest": {
            // QUOTING-SYNERGY-MS0/U-QP-OUTCOME-LEDGER-DIGEST (charlie 2026-06-11) -- read-side consumer of the
            // feedOutcome ledger (U-QP-CLOSED-LOOP-OUTCOME-TELEMETRY). Reads quoting-cycle-outcomes.jsonl and
            // returns the loop's behavior distribution + an advisory health verdict (high withhold rate =>
            // provenance problem; high rollback-among-drift => calibration cannot fix drift). Telemetry-ONLY:
            // never writes the ledger, never alters a gate. Fail-soft: a missing ledger -> a zero digest.
            const p = parsed.data as { ledgerPath?: string };
            const { quotingOutcomeLedgerDigestEngine } = await import("../../engines/QuotingOutcomeLedgerDigestEngine.js");
            result = await quotingOutcomeLedgerDigestEngine.digest({ ledgerPath: p.ledgerPath });
            break;
          }
          case "live_chat_session_open": {
            const { liveChatRouterEngine } = await import("../../engines/LiveChatRouterEngine.js");
            const sess = liveChatRouterEngine.openSession();
            result = { sessionId: sess.id, opened_at: sess.opened_at, state: sess.state };
            break;
          }
          case "live_chat_session_turn": {
            const { liveChatRouterEngine } = await import("../../engines/LiveChatRouterEngine.js");
            const data = parsed.data as { sessionId: string; userText: string };
            result = await liveChatRouterEngine.turn(data.sessionId, data.userText);
            break;
          }
          case "live_chat_session_close": {
            const { liveChatRouterEngine } = await import("../../engines/LiveChatRouterEngine.js");
            const data = parsed.data as { sessionId: string };
            result = { closed: liveChatRouterEngine.closeSession(data.sessionId) };
            break;
          }
          // ── U-QP13 accuracy enhancements ──
          case "accuracy_platt_calibrate": {
            const { plattCalibrate, DEFAULT_PLATT_PARAMS } = await import("../../engines/QuotingAccuracyEnhancementEngine.js");
            const d = parsed.data as { rawScore: number; params?: { A: number; B: number } };
            result = { probability: plattCalibrate(d.rawScore, d.params ?? DEFAULT_PLATT_PARAMS) };
            break;
          }
          case "accuracy_fuzzy_match_sku": {
            const { fuzzyMatchSku } = await import("../../engines/QuotingAccuracyEnhancementEngine.js");
            const d = parsed.data as { query: string; candidates: string[]; maxDistance?: number };
            result = fuzzyMatchSku(d.query, d.candidates, d.maxDistance);
            break;
          }
          case "accuracy_bom_urgency": {
            const { bomReplacementUrgency } = await import("../../engines/QuotingAccuracyEnhancementEngine.js");
            const d = parsed.data as { intervalMonths: number; currentAgeMonths: number; lookAheadMonths?: number; beta?: number };
            result = { urgency: bomReplacementUrgency(d.intervalMonths, d.currentAgeMonths, d.lookAheadMonths, d.beta) };
            break;
          }
          case "accuracy_quote_interval": {
            const { quoteIntervalArithmetic } = await import("../../engines/QuotingAccuracyEnhancementEngine.js");
            result = quoteIntervalArithmetic(parsed.data as any);
            break;
          }
          // ── U-QP14 neural+reasoning bridge ──
          case "neural_route_quoting_task": {
            const { quotingNeuralReasoningBridgeEngine } = await import("../../engines/QuotingNeuralReasoningBridgeEngine.js");
            result = quotingNeuralReasoningBridgeEngine.route(parsed.data as any);
            break;
          }
          case "neural_psn_synergy_status": {
            const { quotingNeuralReasoningBridgeEngine } = await import("../../engines/QuotingNeuralReasoningBridgeEngine.js");
            const d = parsed.data as { hasAiRouter?: boolean; hasReasoning?: boolean; psiDeltaFedRecently?: boolean; systemVizHasNode?: boolean };
            result = quotingNeuralReasoningBridgeEngine.inspectPsnSynergy({
              aiRouterFn: d.hasAiRouter ? () => null : undefined,
              reasoningFn: d.hasReasoning ? () => null : undefined,
              psiDeltaFedRecently: d.psiDeltaFedRecently,
              systemVizHasNode: d.systemVizHasNode,
            });
            break;
          }
          case "quote_outcome_feed": {
            const { quoteOutcomeFeedEngine } = await import("../../engines/QuoteOutcomeFeedEngine.js");
            result = quoteOutcomeFeedEngine.feed(parsed.data as any);
            break;
          }
          // ── JM-DIE-FINANCIAL-BASELINE-MS0 ──
          case "jm_die_docustrata_ingest": {
            const { jmDieDocustrataIngestEngine } = await import("../../engines/JMDieDocustrataIngestEngine.js");
            const d = parsed.data as { rootDir: string; limit?: number; extensions?: string[] };
            result = jmDieDocustrataIngestEngine.ingest(d.rootDir, { limit: d.limit, extensions: d.extensions });
            break;
          }
          case "jm_die_historical_material_price": {
            const { historicalMaterialPriceEngine } = await import("../../engines/HistoricalMaterialPriceEngine.js");
            const d = parsed.data as { material: any; isoDate: string };
            result = historicalMaterialPriceEngine.lookup(d.material, d.isoDate);
            break;
          }
          case "jm_die_financial_baseline": {
            const { jmDieFinancialBaselineEngine } = await import("../../engines/JMDieFinancialBaselineEngine.js");
            const d = parsed.data as { records: any[] };
            result = jmDieFinancialBaselineEngine.aggregate(d.records);
            break;
          }
          case "jm_die_quote_training_pipeline": {
            const { jmDieQuoteTrainingPipelineEngine } = await import("../../engines/JMDieQuoteTrainingPipelineEngine.js");
            result = jmDieQuoteTrainingPipelineEngine.trainBatch(parsed.data as any);
            break;
          }
          // ── JM-DIE-PROGRAM-ANALYSIS-MS0 ──
          case "gcode_time_estimate": {
            const { gCodeTimeEstimatorEngine } = await import("../../engines/GCodeTimeEstimatorEngine.js");
            const d = parsed.data as { text: string; dialect?: any; machineRapidRateMmPerMin?: number; toolChangeOverheadS?: number };
            result = gCodeTimeEstimatorEngine.analyze(d.text, { dialect: d.dialect, machineRapidRateMmPerMin: d.machineRapidRateMmPerMin, toolChangeOverheadS: d.toolChangeOverheadS });
            break;
          }
          // U-QP-GCODE-TIME-WIRE -- precise S-curve cycle time (canned cycles + per-machine kinematics)
          case "gcode_cycle_time": {
            const { cycleTimeEstimatorEngine } = await import("../../engines/CycleTimeEstimatorEngine.js");
            const d = parsed.data as { gcode: string; controller?: "fanuc" | "haas" | "siemens" | "heidenhain" | "mazak" | "okuma" | "hurco"; machine_profile?: string };
            result = cycleTimeEstimatorEngine.estimateFromGCode(d.gcode, { controller: d.controller ?? "fanuc", machine_profile: d.machine_profile });
            break;
          }
          case "inflation_adjust": {
            const { inflationAdjustEngine } = await import("../../engines/InflationAdjustEngine.js");
            const d = parsed.data as { usd: number; fromIsoDate: string; toIsoDate: string };
            result = inflationAdjustEngine.adjust(d.usd, d.fromIsoDate, d.toIsoDate);
            break;
          }
          case "fair_market_value": {
            const { fairMarketValueEngine } = await import("../../engines/FairMarketValueEngine.js");
            result = fairMarketValueEngine.estimate(parsed.data as any);
            break;
          }
          // ── JM-DIE-FLEET-SCAN-MS0 ──
          case "jm_die_scan_ledger_stats": {
            const { jmDieScanLedgerEngine } = await import("../../engines/JMDieScanLedgerEngine.js");
            result = jmDieScanLedgerEngine.stats();
            break;
          }
          case "jm_die_scan_plan_batches": {
            const { jmDieScanCoordinatorEngine } = await import("../../engines/JMDieScanCoordinatorEngine.js");
            result = jmDieScanCoordinatorEngine.plan(parsed.data as any);
            break;
          }
          case "jm_die_scan_record_batch": {
            const { jmDieScanCoordinatorEngine } = await import("../../engines/JMDieScanCoordinatorEngine.js");
            const d = parsed.data as any;
            result = jmDieScanCoordinatorEngine.recordBatchScanned(d, d.source);
            break;
          }
          // ── U-FS08 document-query (role-aware) ──
          case "jm_die_docs_by_customer": {
            const { jmDieDocumentQueryEngine } = await import("../../engines/JMDieDocumentQueryEngine.js");
            const d = parsed.data as any;
            result = jmDieDocumentQueryEngine.findByCustomer(d.customer, d.limit, d.kindFilter);
            break;
          }
          case "jm_die_docs_by_part": {
            const { jmDieDocumentQueryEngine } = await import("../../engines/JMDieDocumentQueryEngine.js");
            const d = parsed.data as any;
            result = jmDieDocumentQueryEngine.findByPart(d.partId, d.limit, d.kindFilter);
            break;
          }
          case "jm_die_docs_by_machine_family": {
            const { jmDieDocumentQueryEngine } = await import("../../engines/JMDieDocumentQueryEngine.js");
            const d = parsed.data as any;
            result = jmDieDocumentQueryEngine.findByMachineFamily(d.family, d.limit);
            break;
          }
          case "jm_die_docs_by_extension": {
            const { jmDieDocumentQueryEngine } = await import("../../engines/JMDieDocumentQueryEngine.js");
            const d = parsed.data as any;
            result = jmDieDocumentQueryEngine.findByExtension(d.extension, d.limit);
            break;
          }
          case "jm_die_docs_by_tokens": {
            const { jmDieDocumentQueryEngine } = await import("../../engines/JMDieDocumentQueryEngine.js");
            const d = parsed.data as any;
            result = jmDieDocumentQueryEngine.findByTokens(d.tokens, d.limit);
            break;
          }
          case "jm_die_docs_customer_rollup": {
            const { jmDieDocumentQueryEngine } = await import("../../engines/JMDieDocumentQueryEngine.js");
            const d = parsed.data as any;
            result = jmDieDocumentQueryEngine.customerRollup(d.limit);
            break;
          }
          // ── U-QT01 quote-training loop ──
          case "jm_die_training_loop_run": {
            const { quotingTrainingLoopEngine } = await import("../../engines/QuotingTrainingLoopEngine.js");
            const d = parsed.data as any;
            result = quotingTrainingLoopEngine.run(d.records, {
              defaultMachineRate: d.defaultMachineRate,
              defaultMaterialSpend: d.defaultMaterialSpend,
              defaultTimeInCutS: d.defaultTimeInCutS,
              feedPsnAutonomy: d.feedPsnAutonomy,
            });
            break;
          }
          case "jm_die_training_loop_recommend": {
            const { quotingTrainingLoopEngine } = await import("../../engines/QuotingTrainingLoopEngine.js");
            const d = parsed.data as any;
            result = { recommendations: quotingTrainingLoopEngine.recommendImprovements(d.report) };
            break;
          }
          case "jm_die_training_loop_under_quote_assess": {
            // U-QP-UNDERQUOTE-ASSESS-WIRE — per-job under/fair/over-quote assessment over a report's all_records.
            // ADVISORY (R12 + soul): fair_usd is the model FMV estimate, NOT a customer quote — never emit without the margin-floor gate.
            const { assessUnderQuotes } = await import("../../engines/QuotingTrainingLoopEngine.js");
            const d = parsed.data as any;
            const records = Array.isArray(d.report?.all_records) ? d.report.all_records : [];
            result = assessUnderQuotes(records, { bandPct: d.bandPct, topN: d.topN });
            break;
          }
          // ── U-QT03/04/05 ──
          case "quote_xometry_style": {
            const { xometryStyleQuoteInputsEngine } = await import("../../engines/XometryStyleQuoteInputsEngine.js");
            result = xometryStyleQuoteInputsEngine.quote(parsed.data as any);
            break;
          }
          case "outsource_recommend": {
            const { outsourceRecommenderEngine } = await import("../../engines/OutsourceRecommenderEngine.js");
            const d = parsed.data as any;
            const { estimated_volume_cm3_per_part, ...rest } = d;
            result = outsourceRecommenderEngine.recommend(rest, estimated_volume_cm3_per_part);
            break;
          }
          case "scenario_generate": {
            const { quoteScenarioGeneratorEngine } = await import("../../engines/QuoteScenarioGeneratorEngine.js");
            result = quoteScenarioGeneratorEngine.generate(parsed.data as any);
            break;
          }
          // ── U-QT06/U-QT07 ──
          case "outside_knowledge_query": {
            const { outsideKnowledgeSourceCatalogEngine } = await import("../../engines/OutsideKnowledgeSourceCatalogEngine.js");
            result = outsideKnowledgeSourceCatalogEngine.query(parsed.data as any);
            break;
          }
          case "outside_knowledge_citations": {
            const { outsideKnowledgeSourceCatalogEngine } = await import("../../engines/OutsideKnowledgeSourceCatalogEngine.js");
            result = { citations: outsideKnowledgeSourceCatalogEngine.citationsFor(parsed.data as any) };
            break;
          }
          case "deep_reasoning_explain_bias": {
            const { quotingDeepReasoningBridgeEngine } = await import("../../engines/QuotingDeepReasoningBridgeEngine.js");
            const d = parsed.data as any;
            result = quotingDeepReasoningBridgeEngine.buildExplainBias(d.report, d.customer);
            break;
          }
          case "deep_reasoning_find_pattern": {
            const { quotingDeepReasoningBridgeEngine } = await import("../../engines/QuotingDeepReasoningBridgeEngine.js");
            const d = parsed.data as any;
            result = quotingDeepReasoningBridgeEngine.buildFindPattern(d.report);
            break;
          }
          case "deep_reasoning_suggest_rate_adjust": {
            const { quotingDeepReasoningBridgeEngine } = await import("../../engines/QuotingDeepReasoningBridgeEngine.js");
            const d = parsed.data as any;
            result = quotingDeepReasoningBridgeEngine.buildSuggestRateAdjust(d.report);
            break;
          }
          case "deep_reasoning_outlier_investigate": {
            const { quotingDeepReasoningBridgeEngine } = await import("../../engines/QuotingDeepReasoningBridgeEngine.js");
            const d = parsed.data as any;
            result = quotingDeepReasoningBridgeEngine.buildOutlierInvestigate(d.report);
            break;
          }
          case "deep_reasoning_cross_customer": {
            const { quotingDeepReasoningBridgeEngine } = await import("../../engines/QuotingDeepReasoningBridgeEngine.js");
            const d = parsed.data as any;
            result = quotingDeepReasoningBridgeEngine.buildCrossCustomerRec(d.report, d.sourceCustomer, d.targetCustomer);
            break;
          }
          case "quoting_calibration_derive": {
            const { quotingCalibrationEngine } = await import("../../engines/QuotingCalibrationEngine.js");
            const d = parsed.data as any;
            result = quotingCalibrationEngine.derive(d.report, {
              minRecordsForCustomer: d.minRecordsForCustomer,
              minFactor: d.minFactor,
              maxFactor: d.maxFactor,
              balancedBandPct: d.balancedBandPct,
            });
            break;
          }
          case "quoting_calibration_apply": {
            const { quotingCalibrationEngine } = await import("../../engines/QuotingCalibrationEngine.js");
            const d = parsed.data as any;
            result = quotingCalibrationEngine.apply(d.factors, d.predicted_usd, { customer: d.customer });
            break;
          }
          case "quoting_calibration_measure": {
            const { quotingCalibrationEngine } = await import("../../engines/QuotingCalibrationEngine.js");
            const d = parsed.data as any;
            result = quotingCalibrationEngine.measureImprovement(d.report, d.factors);
            break;
          }
          // U-COV-QUOTING + U-COV-QUOTING-ACTIVE — verification + runtime bridge (2026-05-25 charlie)
          case "quoting_calibration_derive_with_cov": {
            const { quotingCalibrationEngine } = await import("../../engines/QuotingCalibrationEngine.js");
            const d = parsed.data as any;
            result = await quotingCalibrationEngine.deriveWithCoV(d.report, {
              minRecordsForCustomer: d.minRecordsForCustomer,
              minFactor: d.minFactor,
              maxFactor: d.maxFactor,
              balancedBandPct: d.balancedBandPct,
            });
            break;
          }
          case "quoting_active_factor_get": {
            const { quotingActiveFactorLoaderEngine } = await import("../../engines/QuotingActiveFactorLoaderEngine.js");
            const d = parsed.data as any;
            if (d.path) quotingActiveFactorLoaderEngine.setPath(d.path);
            result = await quotingActiveFactorLoaderEngine.getActiveFactors();
            break;
          }
          case "quoting_active_factor_apply": {
            const { quotingActiveFactorLoaderEngine } = await import("../../engines/QuotingActiveFactorLoaderEngine.js");
            const d = parsed.data as any;
            result = await quotingActiveFactorLoaderEngine.applyToQuote(d.predicted_usd, d.customer);
            break;
          }
          case "quoting_active_factor_metadata": {
            const { quotingActiveFactorLoaderEngine } = await import("../../engines/QuotingActiveFactorLoaderEngine.js");
            result = await quotingActiveFactorLoaderEngine.getMetadata();
            break;
          }
          // QUOTING-COMPLETENESS-MS0 (charlie /goal-20, 2026-05-25)
          case "quoting_lead_time_tiers": {
            const { leadTimePricingTierEngine } = await import("../../engines/LeadTimePricingTierEngine.js");
            result = leadTimePricingTierEngine.emit(parsed.data as any);
            break;
          }
          case "quoting_secondary_ops_price": {
            const { secondaryOpsQuotePricingEngine } = await import("../../engines/SecondaryOpsQuotePricingEngine.js");
            result = secondaryOpsQuotePricingEngine.priceOps(parsed.data as any);
            break;
          }
          case "quoting_secondary_ops_list": {
            const { secondaryOpsQuotePricingEngine } = await import("../../engines/SecondaryOpsQuotePricingEngine.js");
            const ops = secondaryOpsQuotePricingEngine.listAvailableOps();
            const catalog = secondaryOpsQuotePricingEngine.getCatalog();
            result = { ok: true, ops, catalog };
            break;
          }
          case "quoting_tolerance_pricing": {
            const { tolerancePricingImpactEngine } = await import("../../engines/TolerancePricingImpactEngine.js");
            result = tolerancePricingImpactEngine.priceTolerances(parsed.data as any);
            break;
          }
          case "quoting_cross_part_synergy": {
            const { crossPartToolingSynergyEngine } = await import("../../engines/CrossPartToolingSynergyEngine.js");
            result = crossPartToolingSynergyEngine.analyze(parsed.data as any);
            break;
          }
          case "quoting_phone_ocr": {
            const { tesseractOCRBridgeEngine } = await import("../../engines/TesseractOCRBridgeEngine.js");
            const d = parsed.data as any;
            const image = Uint8Array.from(Buffer.from(String(d.image_base64), "base64"));
            result = await tesseractOCRBridgeEngine.ocr({
              image,
              language: d.language,
              psm: d.psm,
              autoClassify: d.autoClassify,
            });
            break;
          }
          case "quoting_phone_ocr_status": {
            const { tesseractOCRBridgeEngine } = await import("../../engines/TesseractOCRBridgeEngine.js");
            result = { ok: true, ready: tesseractOCRBridgeEngine.isReady(), adapter_name: tesseractOCRBridgeEngine.getAdapterName() };
            break;
          }
          case "quoting_freight_quote": {
            const { freightCostEngine } = await import("../../engines/FreightCostEngine.js");
            result = await freightCostEngine.quote(parsed.data as any);
            break;
          }
          case "quoting_freight_tiers": {
            const { freightCostEngine } = await import("../../engines/FreightCostEngine.js");
            result = { ok: true, tiers: freightCostEngine.getTiers() };
            break;
          }
          case "quoting_outcome_psi_delta_score": {
            const { quoteOutcomePSIDeltaBridgeEngine } = await import("../../engines/QuoteOutcomePSIDeltaBridgeEngine.js");
            result = quoteOutcomePSIDeltaBridgeEngine.scoreOutcome(parsed.data as any);
            break;
          }
          case "quoting_outcome_psi_delta_batch": {
            const { quoteOutcomePSIDeltaBridgeEngine } = await import("../../engines/QuoteOutcomePSIDeltaBridgeEngine.js");
            const d = parsed.data as any;
            result = quoteOutcomePSIDeltaBridgeEngine.scoreBatch(d.outcomes);
            break;
          }
          case "quoting_mcmaster_quote": {
            const { mcMasterCarrAPIAdapter } = await import("../../engines/McMasterCarrAPIAdapter.js");
            const d = parsed.data as any;
            result = await mcMasterCarrAPIAdapter.quotePart(d.part_number, d.quantity ?? 1);
            break;
          }
          case "quoting_mcmaster_batch": {
            const { mcMasterCarrAPIAdapter } = await import("../../engines/McMasterCarrAPIAdapter.js");
            const d = parsed.data as any;
            result = { ok: true, results: await mcMasterCarrAPIAdapter.quoteBatch(d.parts) };
            break;
          }
          case "quoting_pipeline_stresstest": {
            const { quotingPipelineStressTestEngine } = await import("../../engines/QuotingPipelineStressTestEngine.js");
            result = await quotingPipelineStressTestEngine.run(parsed.data as any);
            break;
          }
          case "quoting_docustrata_train": {
            const { docustrataHistoricalPricingTrainerEngine } = await import("../../engines/DocustrataHistoricalPricingTrainerEngine.js");
            result = docustrataHistoricalPricingTrainerEngine.buildTrainingSet(parsed.data as any);
            break;
          }
          // QUOTING-SYNERGY-MS0 (charlie /goal-20 iter11, 2026-05-25)
          case "quoting_shop_profile_get": {
            const { shopProfileTemplateEngine } = await import("../../engines/ShopProfileTemplateEngine.js");
            result = await shopProfileTemplateEngine.getProfile((parsed.data as any)?.profile_id);
            break;
          }
          case "quoting_shop_profile_list": {
            const { shopProfileTemplateEngine } = await import("../../engines/ShopProfileTemplateEngine.js");
            const ids = await shopProfileTemplateEngine.listProfiles();
            result = { ok: true, profile_ids: ids };
            break;
          }
          case "quoting_shop_electricity_cost": {
            const { shopProfileTemplateEngine } = await import("../../engines/ShopProfileTemplateEngine.js");
            const p = parsed.data as any;
            const profile = await shopProfileTemplateEngine.getProfile(p.profile_id);
            result = shopProfileTemplateEngine.electricityCost(profile, {
              machine_family: p.machine_family,
              cycle_time_hr: p.cycle_time_hr,
              load_factor: p.load_factor,
            });
            break;
          }
          case "quoting_wizard_to_quote": {
            const { wizardToQuoteBridgeEngine } = await import("../../engines/WizardToQuoteBridgeEngine.js");
            const p = parsed.data as any;
            result = await wizardToQuoteBridgeEngine.bridge(p.wizard, { profile_id: p.profile_id });
            break;
          }
          case "quoting_print_to_program_to_quote": {
            const { printToProgramToQuoteBridgeEngine } = await import("../../engines/PrintToProgramToQuoteBridgeEngine.js");
            const p = parsed.data as any;
            result = await printToProgramToQuoteBridgeEngine.bridge(p.pipeline, {
              profile_id: p.profile_id,
              operator_tier: p.operator_tier,
            });
            break;
          }
          case "quoting_speed_feed_to_cycle": {
            const { speedFeedToQuoteBridgeEngine } = await import("../../engines/SpeedFeedToQuoteBridgeEngine.js");
            const p = parsed.data as any;
            result = await speedFeedToQuoteBridgeEngine.enrich(p.operations);
            break;
          }
          case "quoting_secondary_ops_price_for_profile": {
            const { secondaryOpsQuotePricingEngine } = await import("../../engines/SecondaryOpsQuotePricingEngine.js");
            const p = parsed.data as any;
            result = await secondaryOpsQuotePricingEngine.priceOpsForProfile({
              ops: p.ops,
              quantity: p.quantity,
              base_material_cost_usd: p.base_material_cost_usd,
              catalog_overrides: p.catalog_overrides,
            }, { profile_id: p.profile_id });
            break;
          }
          case "quoting_shop_utilities_cost": {
            const { shopProfileTemplateEngine } = await import("../../engines/ShopProfileTemplateEngine.js");
            const p = parsed.data as any;
            const profile = await shopProfileTemplateEngine.getProfile(p.profile_id);
            result = shopProfileTemplateEngine.utilitiesCost(profile, {
              machine_family: p.machine_family,
              cycle_time_hr: p.cycle_time_hr,
              load_factor: p.load_factor,
            });
            break;
          }
          case "quoting_cross_part_synergy_from_fleet": {
            const { crossPartToolingSynergyEngine } = await import("../../engines/CrossPartToolingSynergyEngine.js");
            const p = parsed.data as any;
            result = await crossPartToolingSynergyEngine.analyzeFromJMFleet(p.proposal, {
              ledgerPath: p.ledgerPath,
              customerFilter: p.customerFilter,
              machineFamilyFilter: p.machineFamilyFilter,
              annualVolumePerPart: p.annualVolumePerPart,
            });
            break;
          }
          case "quoting_machine_invest_roi": {
            const { machineInvestmentROIEngine } = await import("../../engines/MachineInvestmentROIEngine.js");
            const p = parsed.data as any;
            result = await machineInvestmentROIEngine.evaluate(p.proposal, {
              profile_id: p.profile_id,
              ledgerPath: p.ledgerPath,
            });
            break;
          }
          case "quoting_training_orchestrator_run": {
            const { quotingTrainingOrchestratorEngine } = await import("../../engines/QuotingTrainingOrchestratorEngine.js");
            const p = parsed.data as any;
            result = await quotingTrainingOrchestratorEngine.runOnce({
              records: p.records,
              trainingOpts: p.trainingOpts,
              deriveOpts: p.deriveOpts,
              writeIfSafe: p.writeIfSafe,
              activeFactorPath: p.activeFactorPath,
              feedPsnAutonomy: p.feedPsnAutonomy,
            });
            break;
          }
          case "quoting_dynamic_shop_rate": {
            const { dynamicShopRateEngine } = await import("../../engines/DynamicShopRateEngine.js");
            const p = parsed.data as any;
            result = await dynamicShopRateEngine.adjust({
              machine_family: p.machine_family,
              current_loading_pct: p.current_loading_pct,
              hours_until_delivery: p.hours_until_delivery,
            }, {
              profile_id: p.profile_id,
              loadingStateFilePath: p.loadingStateFilePath,
              loadingStalenessHours: p.loadingStalenessHours,
            });
            break;
          }
          default:
            return {
              content: [{ type: "text" as const, text: JSON.stringify({ error: `unhandled action: ${action}` }) }],
              isError: true,
            };
        }
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "dispatcher-runtime-error", detail: err instanceof Error ? err.message : String(err) }) }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    }
  );
}
