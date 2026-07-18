import { readFileSync, writeFileSync } from "node:fs";

const SLICE = JSON.parse(readFileSync("H:/prism/state/shared/dashboards/ke-pass2-resume-slice-1.json","utf8"));
const out = {};

const dispCam = "knowledge/wiki/architecture/dispatcher-cam.md";
const dispCalc = "knowledge/wiki/architecture/dispatcher-calc.md";
const dispToolpath = "knowledge/wiki/architecture/dispatcher-toolpath.md";
const dispSafety = "knowledge/wiki/architecture/dispatcher-safety.md";
const dispMill = "knowledge/wiki/architecture/dispatcher-mill.md";
const dispTurning = "knowledge/wiki/architecture/dispatcher-turning.md";
const dispTurningProg = "knowledge/wiki/architecture/dispatcher-turningprogram.md";
const dispEdm = "knowledge/wiki/architecture/dispatcher-edm.md";
const dispCad = "knowledge/wiki/architecture/dispatcher-cad.md";
const dispGrinding = "knowledge/wiki/architecture/dispatcher-grinding.md";
const dispIntegration = "knowledge/wiki/architecture/dispatcher-integration.md";
const dispFive = "knowledge/wiki/architecture/dispatcher-fiveaxis.md";
const dispQuality = "knowledge/wiki/architecture/dispatcher-quality.md";
const dispBusiness = "knowledge/wiki/architecture/dispatcher-business.md";
const dispAi = "knowledge/wiki/architecture/dispatcher-aireasoning.md";
const dispKnowledge = "knowledge/wiki/architecture/dispatcher-knowledge.md";
const dispExport = "knowledge/wiki/architecture/dispatcher-export.md";
const dispBridge = "knowledge/wiki/architecture/dispatcher-bridge.md";
const dispMachineLive = "knowledge/wiki/architecture/dispatcher-machinelive.md";
const dispContext = "knowledge/wiki/architecture/dispatcher-context.md";
const dispGuard = "knowledge/wiki/architecture/dispatcher-guard.md";

const seTest = () => ["test-design-real-values","regression-prevention-doctrine","per-file-scrutiny-gate"];
const seSafety = () => ["safety-tier-discipline","fail-loud-r12-patterns","per-file-scrutiny-gate"];
const seDispatcher = () => ["dispatcher-action-design","mcp-tool-design","schema-read-discipline"];

const set = (k, archWiki, seWiki, impact, depth) => {
  out[k] = { addArchWiki: archWiki, addSeWiki: seWiki, systemImpact: impact, csDepth: depth };
};
const skip = (k) => set(k, [], ["schema-read-discipline"],
  "Unit lacks a milestone-envelope title; treat as documentation or close-out candidate.", []);

set("CAMX-MS11::U-CAMX06",
  [dispCam, "knowledge/wiki/architecture/actions/cam/powermill-code-generate.md", "knowledge/wiki/architecture/actions/cam/powermill-controller-lookup.md"],
  ["engine-creation-discipline","mcp-tool-design","dispatcher-action-design"],
  "PowerMill plugin engine surfaces under prism_cam (powermill_* actions) — consumed by /cam-strategy-select and /powermill-strategy-guide skills. Sister to mastercam/solidcam/nxcam plugin engines; shares the per-CAM strategy + safety + material-bridge pattern.",
  ["Vendor plugin process spawn is I/O-bound; idempotency via deterministic operation IDs.","Failure mode: PowerMill not installed must fail-loud R12, never silent skip."]);

const ms12Common = [dispCam, "knowledge/wiki/architecture/engines/cam/featurestrategyknowledgebaseengine.md"];
set("CAMX-MS12::U01", ms12Common,
  ["engine-creation-discipline","test-design-real-values"],
  "FeatureStrategyKnowledgeBaseEngine seeds strategy-selection for the feature->strategy mapping consumed by prism_cam:cam_strategy_recommend and the per-CAM strategy engines (MS3-MS8). Knowledge base must round-trip with mill/lathe/wedm feature taxonomies.",
  ["Lookup is O(features * strategy_rules); needs index for >1k rules.","Edge: unknown feature must fall back to conservative default, never crash."]);

set("CAMX-MS12::U02", [dispCam, dispCalc],
  ["engine-creation-discipline","test-design-real-values","regression-prevention-doctrine"],
  "StrategyBenchmarkEngine compares strategy candidates via cycle-time + cost + risk metrics; consumed by /cam-strategy-compare and prism_cam:strategy_benchmark_compare. Feeds StrategyComparisonEngine and the ML ranker (CAMX-MS12::U04).",
  ["Pairwise compare is O(n^2); cap candidate set at 16 for interactive use.","Monte-Carlo noise: same input must yield deterministic ranking for reproducibility."]);

set("CAMX-MS12::U03", [dispCam, dispCalc],
  ["engine-creation-discipline","test-design-real-values"],
  "StrategyComparisonEngine produces head-to-head + radar-chart deltas across strategies; surfaces via prism_cam:strategy_compare/strategy_head_to_head/strategy_radar_chart. Consumed by /cam-strategy-compare skill and StrategyBenchmarkEngine.",
  ["Pareto-frontier extraction O(n log n); ensure stable sort under equal-cost ties.","Edge: empty candidate list -> return well-typed empty result, not throw."]);

set("CAMX-MS12::U04", [dispCam, dispAi],
  ["engine-creation-discipline","test-design-real-values","mcp-tool-design"],
  "MachineLearningStrategyRankerEngine learns per-shop strategy preferences from outcome ledger; consumed by prism_cam:ml_strategy_recommend/record/history. Pairs with PredictionCalibrationEngine (CAMX-MS15::U-CAMX06) for accuracy drift.",
  ["Beta posterior update is O(1) per outcome; ranking O(n log n) on sample.","Cold-start: needs >=30 outcomes per arm before recommending; guard with minSamples."]);

set("CAMX-MS12::U05", [dispCam, dispSafety],
  ["engine-creation-discipline","safety-tier-discipline","test-design-real-values"],
  "ContextualStrategyOverrideEngine applies controller/machine/fixture context to override default strategy; consumed by prism_cam:strategy_override_check/apply and StrategySequencingEngine. Hard-blocks unsafe overrides via SafetyVetoEngine (CAMX-MS14::U-CAMX02).",
  ["Override rule evaluation O(rules * context); short-circuit on first deny.","Invariant: override CAN only narrow, never widen the safe envelope."]);

set("CAMX-MS12::U06", [dispCam, dispCalc],
  ["engine-creation-discipline","test-design-real-values"],
  "StrategySequencingEngine orders multi-operation strategies to minimize setup + tool changes + rework; consumes feature-precedence graph from CAD (prism_cad:feature_precedence_graph). Feeds CAM toolpath generation and ProductionBatchOptimizationEngine.",
  ["Sequencing is TSP-like; use nearest-neighbor + 2-opt for n<50, ILP for larger.","Constraint: precedence violation (drill before bore) must throw, not silently reorder."]);

set("CAMX-MS12::U07", [dispCam, "knowledge/wiki/architecture/engines/cam/fixtureawarestrategyengine.md"],
  ["engine-creation-discipline","test-design-real-values"],
  "FixtureAwareStrategyEngine narrows strategy candidates by fixture clearance + clamp positions; consumes prism_cad:fixture_design_recommend + prism_safety:check_fixture_clearance. Surfaces via prism_cam:strategy_fixture_adjust/validate.",
  ["Per-strategy clearance check O(strategies * clamps); bounding-volume early reject.","Edge: fixture undefined must surface as a feasibility-check failure, not assume open envelope."]);

set("CAMX-MS12::U08", [dispCam, dispBusiness],
  ["engine-creation-discipline","test-design-real-values"],
  "BatchSizeStrategyEngine adapts strategy for batch size; single-piece favors flexible HSM, high-volume favors dedicated cycle-time-min. Consumed by prism_business:batch_group/sequence/setup_matrix + ProductionBatchOptimizationEngine (CAMX-MS21::U08).",
  ["Threshold curves continuous in N (batch size); linear interpolation between brackets.","Edge: N=0 must return diagnostic, not divide by zero."]);

set("CAMX-MS12::U09", [dispCam, "knowledge/wiki/architecture/dispatcher-tools.md"],
  ["dispatcher-action-design","mcp-tool-design","schema-read-discipline"],
  "Dispatcher wiring for CAMX-MS12 strategy engines into prism_cam (~13 strategy_* actions). Round-trip zod schemas + DSL shortcodes; consumed by /cam-strategy-* skills.",
  ["Schema enum drift caught only by real-data E2E (lesson from RGS-TOOL-AUTOINVOKE-MS1 U-DISPATCHER P0).","z.enum action validation MUST run in production tests, not just mocked unit tests."]);

set("CAMX-MS12::U10", [], seTest(),
  "Test pass for CAMX-MS12 strategy/ML engines; real strategy comparisons across mill/lathe materials. Feeds the 3-of-3 scrutiny gate ledger.",
  ["Tests must use real Kienzle kc1.1 constants, never inline; placeholder asserts blocked by hook.","Real-data E2E required (mock-fake-readers proved insufficient in MS1 U-INTEG-FIX-P0)."]);

set("CAMX-MS12::U11", [dispCam, dispCalc],
  ["engine-creation-discipline","test-design-real-values"],
  "Stochastic strategy comparison adds Monte-Carlo variance to StrategyBenchmarkEngine; propagates uncertainty from material/tool variability. Consumed by prism_cam:strategy_stochastic_compare/rank/monte_carlo.",
  ["N>=1000 Monte-Carlo trials per pairwise compare; vectorize for tractability.","Variance-reduction (antithetic) required to keep CI tight at N=1000."]);

set("CAMX-MS12::U12", [dispCam, dispQuality, dispCalc],
  ["engine-creation-discipline","safety-tier-discipline","test-design-real-values"],
  "Cpk prediction gate; predicts process Cpk from strategy + machine + material; blocks deploy if Cpk<1.33. Consumed by prism_cam:strategy_cpk_gate/filter and PredictionCalibrationEngine.",
  ["Cpk formula uses 6 sigma; needs >=30 samples or robust estimator.","Hard gate: predicted Cpk<1.0 -> block (R12 fail-loud), never warn-and-continue."]);

set("CAMX-MS12::U13", [dispCam, dispCalc],
  ["engine-creation-discipline","test-design-real-values"],
  "Robust optimization under uncertainty; replaces nominal cost with worst-case-95% across uncertainty band. Consumed by prism_cam:strategy_robust_optimize/worst_case and ProductionBatchOptimizationEngine.",
  ["Robust min-max is convex when objective is convex; otherwise scenario decomposition.","Edge: uncertainty zero must degrade to nominal optimize, not throw."]);

set("CAMX-MS13::U-CAMX01", [dispCam, dispBusiness, dispCalc],
  ["engine-creation-discipline","test-design-real-values"],
  "PipelineCostModelEngine computes per-stage cost (tool + cycle + setup + coolant + energy); aggregated across the 18-stage DOMAIN-PIPELINE-MS0 sequence. Consumed by prism_cam:pipeline_cost_compute and TCODashboardEngine (CAMX-MS13::U-CAMX06).",
  ["Cost sum O(stages * resources); pre-aggregate by stage for sensitivity.","Edge: missing resource cost must fail-loud R12 with stage name (not silent zero)."]);

set("CAMX-MS13::U-CAMX02", [dispCam, dispBusiness],
  ["engine-creation-discipline","test-design-real-values"],
  "ToolChangeOptimizationEngine minimizes tool-change count across multi-op sequence via tool sharing + magazine layout; consumed by prism_cam:tool_change_optimize/magazine/sharing. Feeds StrategySequencingEngine.",
  ["Tool-sharing graph coloring NP-hard; greedy + 2-opt sufficient for n<24 pockets.","Constraint: required-tool-life check before sharing across ops."]);

set("CAMX-MS13::U-CAMX03", [dispCam, dispBusiness],
  ["engine-creation-discipline","test-design-real-values"],
  "CoolantCostOptimizationEngine selects flood/MQL/dry/cryo by material+operation+sustainability constraints; consumed by prism_cam:coolant_cost_compare/optimal/lifecycle. Feeds PipelineCostModelEngine.",
  ["Lifecycle cost includes disposal; discrete choice over 4 modes is O(1) per op.","Hazard: cryo selected for material without LN2 supply must surface as feasibility veto."]);

set("CAMX-MS13::U-CAMX04", [dispCam, dispBusiness],
  ["engine-creation-discipline","test-design-real-values"],
  "EnergyOptimizationEngine reduces kWh by feed/speed/coolant tuning; surfaces via prism_cam:camx_energy_optimize/breakdown/suggest_savings. Feeds PipelineCostModelEngine + Cpk gate.",
  ["Energy model: specific cutting energy * MRR + idle baseline; minimization convex in feed.","Trade-off: low energy may extend cycle time; multi-objective Pareto required."]);

set("CAMX-MS13::U-CAMX05", [dispCam, dispBusiness],
  ["engine-creation-discipline","test-design-real-values"],
  "SetupCostOptimizationEngine batches like-setups + reduces fixture changes; consumed by prism_cam:setup_cost_optimize and prism_business:capacity_what_if. Feeds ProductionBatchOptimizationEngine.",
  ["Setup-grouping is bin-packing NP-hard; first-fit-decreasing within 11/9 ratio.","Edge: single-piece batches must skip grouping logic, not enter degenerate state."]);

set("CAMX-MS13::U-CAMX06", [dispCam, dispBusiness],
  ["engine-creation-discipline","test-design-real-values","html-companion-discipline"],
  "TCODashboardEngine renders Total-Cost-of-Ownership across machine+tooling+labor+overhead; consumed by /tco-dashboard and prism_cam:tco_dashboard/savings/drivers. Aggregates all CAMX-MS13 engines.",
  ["Dashboard is read-heavy; cache rollups, invalidate on cost-input mutation.","HTML companion required for operator review (per html-companion-discipline)."]);

set("CAMX-MS14::U-CAMX01", [dispCam, dispSafety, dispGuard],
  ["safety-tier-discipline","fail-loud-r12-patterns","per-file-scrutiny-gate"],
  "PipelineSafetyOrchestratorEngine runs SafetyVetoEngine + CollisionPreventionEngine + WorkholdingVerificationEngine at every pipeline transition; consumed by prism_cam:pipeline_safety_assess/veto/batch. Hard-blocks pipeline advance.",
  ["Orchestration is short-circuit; first veto stops chain (O(1) on veto path).","Invariant: SAFETY_VALIDATE stage cannot be bypassed (DOMAIN-PIPELINE-MS0 hard constraint)."]);

set("CAMX-MS14::U-CAMX02", [dispCam, dispSafety], seSafety(),
  "SafetyVetoEngine emits binary veto with cited rule; consumed by prism_cam:safety_veto_check/all/escalate and PipelineSafetyOrchestratorEngine. Routes to SafetyEscalationEngine (CAMX-MS14::U-CAMX03) on critical class.",
  ["Veto rule eval O(rules * context); ordered by severity so critical short-circuit.","R12: every veto MUST include rule_id + measured_value + threshold (never opaque 'unsafe')."]);

set("CAMX-MS14::U-CAMX03", [dispCam, dispSafety],
  ["safety-tier-discipline","fail-loud-r12-patterns"],
  "SafetyEscalationEngine routes vetos to operator + audit log + chat-bus broadcast; consumed by prism_cam:safety_escalate/preview. Pairs with prism_guard:safety_explain_veto.",
  ["Escalation is fire-and-forget for audit, blocking for operator confirmation.","Edge: chat-bus down must log to disk fallback, never drop a safety event."]);

set("CAMX-MS14::U-CAMX04", [dispCam, dispSafety],
  ["safety-tier-discipline","fail-loud-r12-patterns","test-design-real-values"],
  "CollisionPreventionEngine sweeps tool envelope through toolpath vs stock+fixture+spindle housing; consumed by prism_cam:collision_prevent_full/certify/zones. Hard-blocks toolpath generation on detected hit.",
  ["Swept-volume test is BVH-accelerated O(n log n); voxel fallback for complex stock.","Tolerance band: epsilon must be larger than CAM rounding error (~10um) to avoid false negatives."]);

set("CAMX-MS14::U-CAMX05", [dispCam, dispSafety, dispCalc],
  ["safety-tier-discipline","engine-creation-discipline","test-design-real-values"],
  "ToolBreakagePredictionEngine forecasts breakage probability from cumulative force + chip-load anomaly + Weibull tool-life; consumed by prism_cam:tool_breakage_predict/cumulative_damage/risk. Feeds adaptive feed override.",
  ["Weibull fit + cumulative damage O(n) per tool; live update via Kalman.","Conservative: false-positive (warn) better than false-negative (broken tool)."]);

set("CAMX-MS14::U-CAMX06", [dispCam, dispSafety], seSafety(),
  "WorkholdingVerificationEngine checks clamp force + pullout + liftoff + contact stress for the proposed cut; consumed by prism_cam:workholding_verify/verify_all/min_safety. Hard-blocks if min safety factor < 1.5.",
  ["Clamp-force compute is closed-form O(clamps); Hertzian contact for stress.","Invariant: never approve workholding with mu assumed > 0.3; fail-loud R12."]);

set("CAMX-MS15::U-CAMX01", [dispCam, dispAi],
  ["engine-creation-discipline","test-design-real-values","jsonl-ledger-conventions"],
  "StrategyPerformanceTrackerEngine logs predicted-vs-actual per strategy; ledger feeds StrategyRankingUpdateEngine + MachineLearningStrategyRankerEngine. Surfaces via prism_cam:strategy_ranking_record/get/confidence.",
  ["Append-only JSONL; rotation at 64MB chunks (per jsonl-ledger-conventions).","Predicted-actual diff must include unit context (material+tool+machine) for stratified rank."]);

set("CAMX-MS15::U-CAMX02", [dispCam],
  ["engine-creation-discipline","test-design-real-values"],
  "StrategyRankingUpdateEngine recomputes per-context strategy ranks from the performance ledger; consumed by prism_cam:strategy_ranking_get/confidence and the ML ranker. Bayesian update on Beta(alpha,beta) per strategy.",
  ["Bayesian update O(1) per outcome; rank recompute O(n log n) per context bucket.","Cold-start prior: Beta(1,1); informative prior only after >=5 outcomes."]);

set("CAMX-MS15::U-CAMX03", [dispCam, dispMachineLive],
  ["engine-creation-discipline","fail-loud-r12-patterns","test-design-real-values"],
  "AnomalyDetectionEngine flags strategy outcomes >3 sigma from prior distribution; consumed by prism_cam:anomaly_detect/record_and_detect/history/auto_adjust. Routes to adaptive-feed override + tribal-tip emit.",
  ["Online MAD-based detector O(1) per sample; window 200 outcomes.","Edge: <5 samples must report 'insufficient data', never spurious 'anomaly'."]);

set("CAMX-MS15::U-CAMX04", [dispCam, dispKnowledge],
  ["engine-creation-discipline","test-design-real-values"],
  "FleetLearningStrategyEngine federates per-shop strategy learnings across the fleet with anonymization + correction; consumed by prism_cam:fleet_aggregate/transfer/insights. Pairs with learn-* skills.",
  ["FedAvg-style aggregation; outlier shops down-weighted by IQR.","Privacy: never propagate shop-id; only material+strategy+outcome aggregates."]);

set("CAMX-MS15::U-CAMX05", [dispCam, dispAi],
  ["engine-creation-discipline","test-design-real-values"],
  "StrategyEvolutionEngine mutates+crosses strategies to discover novel candidates; consumed by prism_cam:strategy_evolve/best_discoveries/evolution_history. Sandbox-tested before promotion to KB.",
  ["GA population n=24, 40 generations; fitness eval expensive; cache.","Discovered strategies must pass SafetyVetoEngine before KB promotion."]);

set("CAMX-MS15::U-CAMX06", [dispCam, dispCalc],
  ["engine-creation-discipline","test-design-real-values","regression-prevention-doctrine"],
  "PredictionCalibrationEngine measures prediction-vs-actual drift across all CAM predictors; consumed by prism_cam:prediction_calibrate/get_factors/calibration_history. Auto-tunes ML ranker temperature.",
  ["Calibration via isotonic regression O(n log n); ECE as headline metric.","Recurring class: a mocked test that fakes the calibration reader hides production drift; needs real-data E2E."]);

set("CAMX-MS15::U-CAMX11", [dispEdm, dispCam, dispKnowledge],
  ["engine-creation-discipline","test-design-real-values"],
  "Wire TransferLearningEngine seeds new wire-EDM material params from similar-material posterior; consumed by prism_edm:wedm_transfer_params/material_similarity/batch_transfer. Reuses learn_transfer_* surface.",
  ["Material-similarity via feature distance; weighted average of donor priors.","Validation: transfer must NOT widen safe envelope (only narrow or hold)."]);

set("CAMX-MS15::U-CAMX12", [dispEdm, dispCam],
  ["engine-creation-discipline","jsonl-ledger-conventions","test-design-real-values"],
  "Wire FeedbackPersistence + MLFeedback; durable storage of per-cut outcomes + ML training set for the WEDM LoRA. Consumed by prism_edm:wedm_feedback_submit/history/get_calibration.",
  ["Append-only JSONL with schemaVersion; durable across /compact.","Schema-read-first when consuming; drift kills the ML signal silently."]);

set("CAMX-MS16::U01", [dispCam], seDispatcher(),
  "camDispatcher expansion; adds ~150 new actions covering post-gen, cost, mill-turn, multi-process. Consumed by every /cam-* skill + the per-CAM strategy engines.",
  ["Action enum drift risk; z.enum strictness MUST hold against production payloads.","Dispatcher size already 70KB; splitting into sub-dispatchers eventually required."]);

set("CAMX-MS16::U02", [dispCalc], seDispatcher(),
  "calcDispatcher expansion; adds adaptive/peck/specific-cutting-energy/u-wire actions. Consumed by prism_calc actions across mill/lathe/wedm + SpeedFeedCascadeEngine.",
  ["calcDispatcher is the largest at 35KB; split-points around physics families.","Constants MUST be imported from src/physics/constants.ts (never inlined)."]);

set("CAMX-MS16::U03", [dispToolpath, dispCam], seDispatcher(),
  "toolpathDispatcher expansion; adds smoothing, cycle-time-estimate, transition-path actions. Consumed by per-CAM bridges + StrategySequencingEngine.",
  ["Toolpath ops are O(segments); large parts (>100K segs) need streaming.","Action contract MUST surface the algorithm choice (HSM/trochoidal/...) explicitly."]);

set("CAMX-MS16::U04", [dispIntegration, dispCam], seDispatcher(),
  "integrationDispatcher expansion; CAM/CMM/DNC/ERP/mobile/measure surfaces. Consumed by /cam-bridge + integration-* skills + ProcessRouterEngine.",
  ["External-system call requires retry+backoff; network is the failure mode.","Auth-token discipline: never log secrets, follow auth-token rules."]);

set("CAMX-MS16::U05", [dispCam, dispToolpath, dispCalc], seDispatcher(),
  "ToolRouter expansion; routes a manufacturing task to the right dispatcher action. Consumed by prism_session:tool_route + the auto-skill-trigger hook.",
  ["Route classification is keyword-weighted; precision over recall (false routes are loud).","Must NOT shadow user-explicit dispatcher action choice."]);

set("CAMX-MS16::U06", [dispCam, dispCalc],
  ["dispatcher-action-design","schema-read-discipline","regression-prevention-doctrine"],
  "z.enum sync; sync action enums across MCP SDK + production dispatchers. Stops the 'mock-passes-prod-fails' class (RGS U-DISPATCHER P0).",
  ["Enum-as-source-of-truth requires generated TypeScript types per dispatcher.","Real-data E2E required; mocked MCPServer bypasses the SDK gate."]);

set("CAMX-MS16::U07", [dispCam],
  ["engine-creation-discipline","schema-read-discipline","dispatcher-action-design"],
  "index.ts exports; surface every CAMX engine through index for consumer imports; pairs with auto-wire stop hook.",
  ["Tree-shake friendly named exports; no default exports.","Audit MUST confirm engine is exported AND wired to a dispatcher (orphan otherwise)."]);

set("CAMX-MS16::U08", [dispCam],
  ["regression-prevention-doctrine","per-file-scrutiny-gate","ts-error-recipe-bank"],
  "Build verification; full tsc + esbuild + vitest pass after CAMX-MS16 dispatcher expansion. Stop-on-fail gate.",
  ["Build is the last truth; passing unit tests + failing build = ship blocker.","TS errors decompose by class; use ts-error-recipe-bank patterns."]);

set("CAMX-MS17::U-CAMX01", [dispCam],
  ["claude-md-as-pointer-index","doc-reflection-rule","handoff-discipline"],
  "Per-CAM setup commands (/cam-fusion, /cam-hypermill, /cam-mastercam, /catia-cam); operator entry points for each vendor flow. Consumed via slash-command auto-trigger hook.",
  ["Skill body must reference live dispatcher actions, not hard-coded examples.","Pipeline integration frontmatter feeds skill-auto-trigger ledger."]);

set("CAMX-MS17::U-CAMX02", [dispCam],
  ["claude-md-as-pointer-index","doc-reflection-rule"],
  "Per-CAM strategy guides; vendor-specific strategy selection runbooks. Consumed via /cam-strategy-* skills + strategy-kb-query.",
  ["Guides MUST cite the engine action they delegate to (no inline duplicated logic).","Frontmatter triggers populate the skill-trigger jsonl ledger."]);

set("CAMX-MS17::U-CAMX03", [dispCam],
  ["claude-md-as-pointer-index","prompt-engineering-rails"],
  "/cam-strategy-select skill; interactive strategy picker with cost+safety+sequencing. Wraps prism_cam:cam_strategy_recommend + StrategyComparisonEngine.",
  ["Skill must surface candidate set with safety+cost breakdown, not just pick one.","Operator override path required; never silently choose for high-risk parts."]);

set("CAMX-MS17::U-CAMX04", [dispCam],
  ["claude-md-as-pointer-index","prompt-engineering-rails"],
  "/cam-strategy-compare; side-by-side strategy comparison (cycle, cost, risk, surface). Wraps StrategyBenchmarkEngine + StrategyComparisonEngine.",
  ["Pairwise display; <=4 strategies for screen-readability.","Output must include uncertainty band, not a single number per metric."]);

set("CAMX-MS17::U-CAMX05", [dispCam, dispBridge],
  ["claude-md-as-pointer-index","prompt-engineering-rails"],
  "/cam-bridge; bridges PRISM physics output to external CAM (Fusion360/hyperMILL/Mastercam). Wraps cam_bridge_status + per-CAM integration engines.",
  ["External-app bridge requires version check; mismatched API silently mis-renders.","Cited tool/feed values must propagate (operator audit trail)."]);

set("CAMX-MS17::U-CAMX06", [dispCam, dispBridge],
  ["claude-md-as-pointer-index","prompt-engineering-rails"],
  "/cam-export-tools; export tool library to vendor format. Wraps universal_tool_export + hypermill/inventor/mastercam tool_export.",
  ["Tool-library format drift between vendor versions; schema-read-first per export.","Round-trip test: export -> import -> equal-shape required for safety."]);

const ms18Titles = ["Strategy taxonomy tests","Pipeline integration tests","Per-CAM engine tests","Cross-CAM consistency tests","Cost optimization tests","Safety tests","Self-learning tests","API bridge tests","Regression tests","Performance benchmarks"];
const ms18Units = ["U01","U02","U03","U04","U05","U06","U07","U08","U09","U10"];
ms18Units.forEach((u,i)=>{
  const archs = i===5 ? [dispCam, dispSafety] :
                i===4 ? [dispCam, dispBusiness] :
                i===6 ? [dispCam, dispAi] :
                i===7 ? [dispCam, dispIntegration] : [dispCam];
  set("CAMX-MS18::"+u, archs, seTest(),
    `${ms18Titles[i]} pass for CAMX milestone deliverables. Feeds 3-of-3 scrutiny ledger; real-data E2E required to avoid the mock-passes-prod-fails class.`,
    ["Real reference values mandatory (no placeholder asserts; hook blocks).","Stratified test: per-CAM x per-material x per-machine to catch interaction defects."]);
});

set("CAMX-MS19::U01", [dispCam, dispMill, dispTurning, dispEdm],
  ["engine-creation-discipline","test-design-real-values"],
  "PrintToProgramPipelineEngine v2; orchestrates the 18-stage DOMAIN-PIPELINE-MS0 (intake->OCR->features->...->G-code). Consumed by /print-to-program + per-domain studios.",
  ["Pipeline is staged DAG; failure at stage i must roll back to stage i-1 atomically.","R12: missing input data must fail-loud with stage name, never invent defaults."]);

set("CAMX-MS19::U02", [dispCam, dispAi],
  ["engine-creation-discipline","prompt-engineering-rails"],
  "Strategy explanation in output; every strategy choice carries 'why' with cited rule + alternative considered. Pairs with cam_reasoning_explain.",
  ["Reasoning chain serializable for audit/replay.","Hidden assumption disclosure required (e.g., material substituted)."]);

set("CAMX-MS19::U03", [dispCam, dispMill, dispTurning],
  ["engine-creation-discipline","test-design-real-values"],
  "Multi-strategy zone decomposition; splits part into zones with per-zone strategy (HSM core, trochoidal corners, finish pass). Consumed by multi_process_route + StrategySequencingEngine.",
  ["Zone decomposition is graph partitioning; spectral cut for k zones.","Zone boundary continuity (no scallop step) is a hard constraint."]);

set("CAMX-MS19::U04", [dispCam, dispBusiness],
  ["engine-creation-discipline","test-design-real-values"],
  "Cost summary in output; per-stage cost breakdown attached to G-code header. Wraps PipelineCostModelEngine + TCODashboardEngine.",
  ["Cost surfacing must include uncertainty band (cost +/- 10%).","Auditable: cost change requires named driver (tool change, material upgrade)."]);

set("CAMX-MS19::U05", [dispCam, dispSafety],
  ["safety-tier-discipline","engine-creation-discipline"],
  "Safety report in output; every program ships with a safety dossier (vetos, overrides, residual risks). Wraps PipelineSafetyOrchestratorEngine.",
  ["Dossier is append-only; bypasses logged with operator id (per goal-gate-bypasses.jsonl pattern).","Critical residual risk requires operator sign-off before run."]);

set("CAMX-MS19::U06", [dispCam, dispIntegration],
  ["engine-creation-discipline","mcp-tool-design"],
  "CAM system recommendation; recommends best-fit CAM (Mastercam vs hyperMILL vs Fusion360) for the part. Wraps per-CAM strategy + capability registries.",
  ["Recommendation must cite controller + machine compat AND user shop's installed seats.","Tie-break: cost-per-seat * cycle-time."]);

set("CAMX-MS19::U07", [dispCam, dispContext],
  ["claude-md-as-pointer-index","prompt-engineering-rails"],
  "Interactive mode; interactive PrintToProgram flow with operator-in-the-loop gates. Pairs with operator-gate doctrine.",
  ["Stateful session; checkpoint after each stage per loop-state-tracking-discipline.","Operator gate cannot be auto-resumed across /compact."]);

set("CAMX-MS19::U08", [dispCam],
  ["engine-creation-discipline","jsonl-ledger-conventions"],
  "Batch mode; non-interactive batch PrintToProgram for many parts. Wraps PrintToProgramPipelineEngine + ProductionBatchOptimizationEngine.",
  ["Batch must checkpoint per-part; resume on crash without re-running clean parts.","Stop-on-first-failure vs continue-on-error a CLI flag."]);

set("CAMX-MS19::U09", [dispCam, dispExport],
  ["engine-creation-discipline","mcp-tool-design"],
  "Export modes; PDF setup sheet, Excel cost report, DXF for inspection, STEP for CMM. Wraps integration_export_* + render_*.",
  ["Format fan-out is per-template; templates schema-versioned for back-compat.","Export must be deterministic (sortable JSON inputs -> byte-identical output)."]);

set("CAMX-MS19::U10", [dispCam, dispMill, dispTurning], seTest(),
  "E2E integration tests; full PrintToProgram pipeline against real Haas/Fanuc programs (JM-DIE corpus). Feeds 3-of-3 scrutiny.",
  ["E2E >=30 min runtime; nightly only, not per-commit.","Real-data E2E (not hermetic); the lesson from MS1 U-INTEG-FIX-P0."]);

skip("CAMX-MS19::U11");

set("CAMX-MS19::U12", [dispCam, dispToolpath],
  ["engine-creation-discipline","dispatcher-action-design"],
  "MultiProcessCAMRouter expansion; routes multi-process parts (mill+turn+grind+inspect) to correct dispatcher per stage. Wraps multi_process_route.",
  ["Process selection per feature; conflict resolution by cost+capability vector.","Edge: a feature accepted by N processes must pick by deterministic tiebreak, not random."]);

set("CAMX-MS19::U13", [dispTurning, dispTurningProg, dispCam],
  ["dispatcher-action-design","engine-creation-discipline"],
  "Turning strategy dispatcher action; surfaces lathe strategy recommendations via prism_turning. Pairs with TurningStrategyEngine + /lathe-studio.",
  ["Turning vs milling has different constraint set (CSS, nose radius, chip control).","Must NOT shadow mill strategy actions in prism_cam (separate dispatchers)."]);

set("CAMX-MS19::U14", [dispTurning, dispCam],
  ["engine-creation-discipline","claude-md-as-pointer-index"],
  "MillTurn/Swiss web UI; operator-facing config + monitoring for multi-channel mill-turn + Swiss-type lathes. Pairs with mill_turn_* + /swiss-program.",
  ["Multi-channel sync visualization requires real-time event stream.","Swiss has unique guide-bushing dimension; UI must capture it."]);

set("CAMX-MS19::U15", [dispCam],
  ["claude-md-as-pointer-index","html-companion-discipline"],
  "CAM strategy web pages; per-strategy explainer pages with physics + when-to-use + risks. Consumed by /cam-strategy-* skills.",
  ["Static-generated from strategy-taxonomy; per-strategy 1 file.","Update on strategy-KB change (drift guard)."]);

set("CAMX-MS20::U01", [dispCam, dispCad],
  ["engine-creation-discipline","test-design-real-values","schema-read-discipline"],
  "STEPNCParserEngine reads STEP-NC AP238 files into PRISM feature taxonomy; consumed by prism_cad/cam STEPNC actions. Pairs with stepnc_generate.",
  ["STEP-NC parser is recursive descent; schema versions AP238 ed1/ed2.","Edge: unrecognized entity -> log + skip, not throw (forward-compat)."]);

set("CAMX-MS20::U02", [dispCam, dispCad],
  ["engine-creation-discipline","test-design-real-values","schema-read-discipline"],
  "STEPNCGeneratorEngine emits STEP-NC AP238 from PRISM CAM output; round-trips STEPNCParserEngine.",
  ["Round-trip test: parse -> regen -> byte-equivalent or semantically equal.","Validation against AP238 schema required pre-emit."]);

set("CAMX-MS20::U03", [dispCam, dispCad],
  ["engine-creation-discipline","test-design-real-values","schema-read-discipline"],
  "ISO13399ToolDataEngine reads ISO 13399 tool catalog data; consumed by prism_cam:iso13399_import/export/validate + tool-catalog skills.",
  ["ISO 13399 is XML with deep schema; parser must streaming for >10k tool catalogs.","Vendor extensions tolerated; required core attrs strict."]);

set("CAMX-MS20::U04", [dispCam, dispQuality],
  ["engine-creation-discipline","test-design-real-values","schema-read-discipline"],
  "QIFIntegrationEngine reads/writes QIF 3.0 inspection plans + results; consumed by prism_cam:qif_import_plan/import_results/export_plan/results. Pairs with CMM measurement engines.",
  ["QIF is XML + namespaced; XSD validation required.","Result schema must round-trip; data loss in re-export is a bug."]);

set("CAMX-MS20::U05", [dispCam, dispIntegration],
  ["engine-creation-discipline","test-design-real-values"],
  "VericutBridgeEngine exports PRISM CAM to VERICUT verification; consumed by prism_cam:vericut_export/import_optipath/import_collision.",
  ["VERICUT API version drift; pin tested version.","Collision-detection results must propagate back into prism_safety ledger."]);

set("CAMX-MS20::U06", [dispCam, dispIntegration],
  ["engine-creation-discipline","test-design-real-values"],
  "NCSIMULBridgeEngine exports PRISM CAM to NCSIMUL; consumed by prism_cam:ncsimul_export/import.",
  ["Same vendor-API-version hazard as VERICUT bridge.","Symmetric: round-trip semantic equivalence required."]);

set("CAMX-MS20::U07", [dispCam], seDispatcher(),
  "Dispatcher wiring for CAMX-MS20 interop engines (STEPNC, ISO13399, QIF, VERICUT, NCSIMUL); consumed by /cam-bridge + integration skills.",
  ["Format drift: each external vendor evolves spec at different cadence; schema sniff first.","Real-data round-trip in CI (mocked tests miss schema drift)."]);

set("CAMX-MS20::U08", [dispCam, dispIntegration], seTest(),
  "Tests for CAMX-MS20 interop; round-trip STEP-NC + QIF + ISO13399 against real vendor sample files.",
  ["Sample files must include each vendor's quirks (Mastercam, Siemens, Renishaw outputs differ).","Round-trip is the regression oracle."]);

set("CAMX-MS21::U01", [dispCam, dispBusiness],
  ["engine-creation-discipline","test-design-real-values"],
  "MakeVsBuyDecisionEngine; recommend make-in-house vs outsource by cost+capacity+capability. Consumed by /quote and prism_business:capacity_what_if.",
  ["Decision matrix: cost margin + capacity fit + capability gap -> score.","Edge: tied score -> prefer in-house (preserve learning loop)."]);

set("CAMX-MS21::U02", [dispCam, dispBusiness],
  ["engine-creation-discipline","fleet-coordination-discipline"],
  "ShopNetworkEngine federates capacity across partner shops; consumed by prism_cam:shop_network_register/search/broadcast/stats.",
  ["Network broadcast is fan-out O(shops); throttle to avoid flood.","Privacy: never share customer or quote data, only capability+capacity."]);

set("CAMX-MS21::U03", [dispCad, dispCam],
  ["engine-creation-discipline","test-design-real-values"],
  "WorkholdingSurfaceInferenceEngine infers candidate workholding surfaces from CAD; consumed by prism_cam:workholding_infer_surfaces + FixtureAwareStrategyEngine.",
  ["Surface inference is geometric: planar faces >= area_min, parallel to base.","Edge: thin-wall part must surface as no-grip-zone risk."]);

set("CAMX-MS21::U04", [dispCam, dispBusiness],
  ["engine-creation-discipline","test-design-real-values"],
  "QuoteToShipOrchestratorEngine orchestrates the full quote->design->program->cut->inspect->ship flow; consumed by /quote-to-ship skill.",
  ["Long-running orchestration; checkpoint per stage; resumable across /compact.","Failure at any stage must record stage + reason + recovery action."]);

set("CAMX-MS21::U05", [dispCam, dispBusiness],
  ["engine-creation-discipline","test-design-real-values"],
  "PackingSlipEngine generates ship-ready packing slip with traceability codes; consumed by /ship + invoice flow.",
  ["Slip is deterministic from order+lot data; PDF render via template.","Heat lot/material cert traceability MUST persist on slip."]);

set("CAMX-MS21::U06", [dispCam, dispQuality],
  ["engine-creation-discipline","test-design-real-values","jsonl-ledger-conventions"],
  "MaterialCertTraceabilityEngine ties material lot -> heat -> job -> part -> ship. Consumed by prism_cam:material_cert_register/assign/link_program.",
  ["Traceability graph: lot is root, parts are leaves; query both directions.","Audit: missing cert blocks ship in aerospace/medical industries."]);

set("CAMX-MS21::U07", [dispCam, dispQuality],
  ["engine-creation-discipline","test-design-real-values"],
  "FirstArticleInspectionPipelineEngine orchestrates FAI from CAD -> balloons -> CMM -> report. Consumed by prism_cam:fai_run/disposition/generate_forms.",
  ["FAI flow has many vendor-specific report formats (AS9102, ISIR, PPAP); pluggable.","Disposition: ACCEPT/REWORK/SCRAP must be a hard gate before ship."]);

set("CAMX-MS21::U08", [dispCam, dispBusiness],
  ["engine-creation-discipline","test-design-real-values"],
  "ProductionBatchOptimizationEngine sequences a batch of jobs to minimize setup+tooling+cycle. Wraps SetupCostOptimizationEngine + ToolChangeOptimizationEngine.",
  ["Batch sequencing is permutation problem; nearest-neighbor + 2-opt for n<24.","Constraint: due-date hard, setup-share soft (preference)."]);

set("CAMX-MS21::U09", [dispCam], seDispatcher(),
  "Dispatcher wiring for CAMX-MS21 quote-to-ship engines into prism_cam + prism_business.",
  ["Cross-dispatcher wiring (cam + business); z.enum sync between both.","Real-data test on a full quote-to-ship round-trip."]);

set("CAMX-MS21::U10", [dispCam, dispBusiness], seTest(),
  "Tests for CAMX-MS21 quote-to-ship cluster; JM-DIE customer corpus (ITW, Alcoa, Optimas).",
  ["Customer-specific quote profiles; per-customer regression to catch drift.","Real-data E2E required; mocked customer profiles miss real-world quirks."]);

const ms22ProgTitles = ["Milling reference programs","5-Axis reference programs","Grinding reference programs","Wire EDM reference programs","Sinker EDM reference programs","Laser cutting reference programs","Waterjet reference programs","Mill-Turn reference programs"];
const ms22ProgUnits = ["U01","U02","U03","U04","U05","U06","U07","U08"];
const ms22ProgDoms = ["mill","fiveaxis","grinding","edm","edm","laser","waterjet","mill"];
ms22ProgUnits.forEach((u,i)=>{
  const archs = [dispCam];
  if (ms22ProgDoms[i]==="mill") archs.push(dispMill);
  else if (ms22ProgDoms[i]==="fiveaxis") archs.push(dispFive);
  else if (ms22ProgDoms[i]==="grinding") archs.push(dispGrinding);
  else if (ms22ProgDoms[i]==="edm") archs.push(dispEdm);
  set("CAMX-MS22::"+u, archs, ["test-design-real-values","regression-prevention-doctrine","engine-creation-discipline"],
    `${ms22ProgTitles[i]} corpus; real vendor programs (Haas/Fanuc/Mitsubishi/Studer/...) seed the per-domain reference benchmark + regression oracle. Feeds /cam-compare and StrategyBenchmarkEngine.`,
    ["Reference programs MUST be real (Box corpus), not synthetic; synthetic hides real-world quirks.","Per-vendor dialect (G-code) must round-trip through post-processor."]);
});

const ms22PipeUnits = ["U09","U10","U11","U12","U13","U14","U15","U16","U17","U18","U19","U20"];
const ms22PipeArchs = {
  "U09": [dispCam, dispMill],
  "U10": [dispCam, dispFive],
  "U11": [dispCam, dispTurning, dispMill],
  "U12": [dispCam, dispGrinding],
  "U13": [dispCam, dispEdm],
  "U14": [dispCam, dispEdm],
  "U15": [dispCam],
  "U16": [dispCam],
  "U17": [dispCam, dispAi],
  "U18": [dispCam, dispSafety],
  "U19": [dispCam, dispCalc],
  "U20": [dispCam, dispMill, dispTurning, dispEdm]
};
const ms22PipeTitles = ["Milling pipeline","5-Axis pipeline","Mill-Turn pipeline","Grinding pipeline","Wire EDM pipeline","Sinker EDM pipeline","Laser pipeline","Waterjet pipeline","Decision reasoning audit","Safety verification","Variability verification","E2E integration test"];
ms22PipeUnits.forEach((u,i)=>{
  const seWiki = i===9 ? seSafety()
    : i>=8 ? ["engine-creation-discipline","test-design-real-values","regression-prevention-doctrine"]
    : ["engine-creation-discipline","test-design-real-values","fail-loud-r12-patterns"];
  set("CAMX-MS22::"+u, ms22PipeArchs[u], seWiki,
    `${ms22PipeTitles[i]} closes a real defect in the corresponding domain pipeline. Consumed by per-domain studio skills (/lathe-studio, /wire-edm-studio, etc).`,
    ["Pipeline stage outputs must be data-typed (no opaque strings).","R12: missing pipeline data must fail-loud with stage name, never invent."]);
});

set("CAMX-MS2::U01", [dispCam],
  ["engine-creation-discipline","test-design-real-values"],
  "ControllerStrategyValidatorEngine; validates a strategy against the target controller's capabilities (Fanuc, Siemens, Haas, Okuma). Consumed by prism_cam:strategy_controller_validate/find_compatible.",
  ["Capability matrix per controller; lookup O(1).","Edge: unknown controller must surface as unsupported, never silently allow."]);

set("CAMX-MS2::U02", [dispCam, dispMill],
  ["engine-creation-discipline","test-design-real-values"],
  "MachineStrategyConstraintEngine; narrows strategy candidates by machine constraints (spindle power, rapid feed, work envelope). Consumed by prism_cam:strategy_machine_validate/find_best_machine.",
  ["Power-feed-MRR constraint check O(1) per strategy.","Real machine specs from MachineCapabilityRegistry, not assumed."]);

set("CAMX-MS2::U03", [dispCam],
  ["engine-creation-discipline","fail-loud-r12-patterns"],
  "Strategy fallback chain; when chosen strategy fails (collision/feasibility/safety) fall back to safer alternative. Consumed by prism_cam:strategy_fallback_chain/default_chain.",
  ["Chain is bounded depth (<=4); cycle detection required.","R12: chain exhausted must fail-loud, never deliver an unsafe default."]);

set("CAMX-MS2::U04", [dispCam],
  ["engine-creation-discipline","dispatcher-action-design"],
  "Wire CAMX-MS2 strategy engines into PostProcessorPipelineEngine; surfaces controller+machine validation into post-processing. Closes WIRE-UNWIRED.",
  ["Wiring is additive; never replace existing validators.","Audit: post-gate engine must round-trip through prism_cam."]);

set("CAMX-MS2::U05", [dispCam, dispBusiness],
  ["engine-creation-discipline","test-design-real-values"],
  "Cost-optimal decision engine; picks the lowest-TCO strategy under safety+capability constraints. Consumed by prism_cam:strategy_cost_compute/decide/sensitivity.",
  ["Constrained optimization: minimize cost s.t. safety+capability.","Tie-break: prefer strategy with better learning data (lower epistemic uncertainty)."]);

set("CAMX-MS2::U06", [dispCam, dispSafety],
  ["safety-tier-discipline","engine-creation-discipline","fail-loud-r12-patterns"],
  "Safety decision engine; final safety review across all strategies; routes to SafetyEscalationEngine on residual risk. Consumed by prism_cam:strategy_safety_assess/decide/filter.",
  ["Final-veto gate: any-fail -> veto. No averaging.","R7 conflict-fork: surface ambiguity, never silent average."]);

set("CAMX-MS2::U07", [dispCam], seDispatcher(),
  "Dispatcher wiring for CAMX-MS2 engines (controller/machine validators + cost/safety decision).",
  ["Wiring drift caught by real-data E2E (RGS lesson).","Schema enum sync per CAMX-MS16::U06."]);

set("CAMX-MS2::U08", [dispCam, dispMill, dispTurning], seTest(),
  "Tests for CAMX-MS2; controller x machine x material x strategy matrix.",
  ["Combinatorial test space; stratified sampling required.","Real-data E2E (no mocked validators)."]);

const ms3 = {
  "U-CAMX01": ["MastercamStrategyEngine", "MastercamStrategyEngine strategy-recommend for Mastercam's Dynamic Motion/OptiRough/etc. Consumed by /cam-mastercam + prism_cam:mastercam_strategy_*."],
  "U-CAMX02": ["MastercamSafetyHooksEngine", "MastercamSafetyHooksEngine safety validators specific to Mastercam (Dynamic Motion engagement, safe Z, plunge limits). Consumed by prism_cam:mastercam_safety_validate/rules."],
  "U-CAMX04": ["MastercamMaterialBridgeEngine", "MastercamMaterialBridgeEngine bridges PRISM material registry to Mastercam material library. Consumed by prism_cam:mastercam_material_find/get_physics/list."],
  "U-CAMX05": ["MastercamControllerCatalogEngine", "MastercamControllerCatalogEngine catalog of Mastercam-supported controllers + dialect. Consumed by prism_cam:mastercam_controller_lookup/list."]
};
Object.entries(ms3).forEach(([u,arr])=>{
  const archs = [dispCam];
  if (u==="U-CAMX02") archs.push(dispSafety);
  set("CAMX-MS3::"+u, archs,
    u==="U-CAMX02" ? seSafety() : ["engine-creation-discipline","test-design-real-values","mcp-tool-design"],
    arr[1], ["Per-CAM engines share the strategy+safety+material+controller pattern across MS3-MS9.","Vendor capability drift requires periodic re-validation against real Mastercam install."]);
});
skip("CAMX-MS3::U-CAMX03");
skip("CAMX-MS3::U-CAMX06");

set("CAMX-MS3::U-CAMX11", [dispCam], seDispatcher(),
  "Dispatcher wiring; 10+ mc_* actions for Mastercam. Consumed by /cam-mastercam + /mastercam-strategy-guide.",
  ["Action names follow mastercam_* convention (NOT mc_*; naming aligned with prism_cam taxonomy).","Real-data E2E required."]);

set("CAMX-MS3::U-CAMX12", [dispCam],
  ["claude-md-as-pointer-index","test-design-real-values","prompt-engineering-rails"],
  "Slash commands /mastercam-setup /mastercam-strategy-guide + 50 tests.",
  ["Skill body MUST reference live dispatcher actions.","50 tests sound ambitious; must be real assertions, not toBeDefined."]);

set("CAMX-MS4::U-CAMX01", [dispCam],
  ["engine-creation-discipline","test-design-real-values"],
  "SolidCAMStrategyEngine; strategy-recommend for SolidCAM's iMachining/HSS/HSR. Consumed by /cam-solidcam + prism_cam:solidcam_strategy_*.",
  ["iMachining is SolidCAM's flagship; its chipload/engagement physics are vendor-proprietary; PRISM uses generic adaptive model.","Per-CAM strategy class must NOT inline vendor physics constants."]);

set("CAMX-MS4::U-CAMX02", [dispCam, dispSafety], seSafety(),
  "SolidCAMSafetyHooksEngine; safety validators for iMachining + HSS + turning. Consumed by prism_cam:solidcam_safety_validate/rules.",
  ["iMachining engagement override safety check.","Real-data validation against published iMachining limits."]);

set("CAMX-MS4::U-CAMX03", [dispCam],
  ["engine-creation-discipline","test-design-real-values","dispatcher-action-design"],
  "SolidCAMiMachiningEngine; CONSOLIDATE 18 existing iMachining engines into 1 authoritative engine. Closes engine sprawl per dedup discipline.",
  ["Consolidation: enumerate the 18 sources, identify the canonical, deprecate the rest with WIRE-EXEMPT + reason.","Risk: silent behavior change during consolidation; diff every call site."]);

skip("CAMX-MS4::U-CAMX04");
skip("CAMX-MS4::U-CAMX05");
skip("CAMX-MS4::U-CAMX06");

set("CAMX-MS4::U-CAMX11", [dispCam], seDispatcher(),
  "Dispatcher wiring; 10+ sc_* actions for SolidCAM. Consumed by /cam-solidcam.",
  ["Naming: solidcam_* per prism_cam taxonomy.","Schema sync."]);

set("CAMX-MS4::U-CAMX12", [dispCam],
  ["claude-md-as-pointer-index","test-design-real-values","prompt-engineering-rails"],
  "/solidcam-setup + /solidcam-imachining-guide + 50 tests.",
  ["Tests must use real iMachining outputs, not synthetic.","Skill body cites live actions."]);

set("CAMX-MS5::U-CAMX01", [dispCam],
  ["engine-creation-discipline","test-design-real-values"],
  "NXCAMStrategyEngine; strategy-recommend for NX-CAM (Adaptive, Fixed Axis Surface, Multi-axis). Consumed by /cam-nx + prism_cam:nx_cam_*.",
  ["NX-CAM has deep multiaxis support; strategy taxonomy must capture tilt + lead-lag.","Vendor capability matrix differs per Siemens release."]);

skip("CAMX-MS5::U-CAMX02");
skip("CAMX-MS5::U-CAMX03");
skip("CAMX-MS5::U-CAMX04");
skip("CAMX-MS5::U-CAMX05");

set("CAMX-MS5::U-CAMX06", [dispCam],
  ["engine-creation-discipline","test-design-real-values"],
  "NXCAMCodeGeneratorEngine; emit NX journal scripts or CLSF/APT. Consumed by prism_cam:nx_code_generate/templates.",
  ["Generated code must round-trip (NX -> file -> re-import) for verification.","Templates per controller post-processor."]);

set("CAMX-MS6::U-CAMX01", [dispCam],
  ["engine-creation-discipline","test-design-real-values"],
  "PowerMillStrategyEngine; Vortex/Steep&Shallow/Pencil. Consumed by /cam-powermill + prism_cam:pm_*.",
  ["Vortex is PowerMill's adaptive flagship; PRISM uses generic adaptive feed model.","Strategy capability per PowerMill release."]);

skip("CAMX-MS6::U-CAMX02");

set("CAMX-MS6::U-CAMX03", [dispCam],
  ["engine-creation-discipline","test-design-real-values"],
  "PowerMillCodeGeneratorEngine; emit PowerMill macros. Consumed by prism_cam:powermill_code_generate/templates.",
  ["Macros are tcl-flavored; escape carefully.","Round-trip test via PowerMill execution."]);

skip("CAMX-MS6::U-CAMX04");

set("CAMX-MS6::U-CAMX05", [dispCam],
  ["engine-creation-discipline","test-design-real-values"],
  "CATIAStrategyEngine; strategy-recommend for CATIA Machining. Consumed by /cam-catia + prism_cam:catia_strategy_*.",
  ["CATIA has KBM (knowledge-based machining); bridge to PRISM strategy KB.","Capability per CATIA release."]);

skip("CAMX-MS6::U-CAMX06");

["U-CAMX01","U-CAMX02","U-CAMX03","U-CAMX04","U-CAMX05","U-CAMX06"].forEach(u => skip("CAMX-MS7::"+u));

["U-CAMX01","U-CAMX02","U-CAMX03","U-CAMX04","U-CAMX05","U-CAMX06","U-CAMX13","U-CAMX14","U-CAMX15","U-CAMX16"].forEach(u => skip("CAMX-MS8::"+u));

set("CAMX-MS8::U-CAMX11", [dispCam, dispSafety],
  ["engine-creation-discipline","safety-tier-discipline","test-design-real-values"],
  "Batch safety hooks + material bridges; uniform safety+material layer across GibbsCAM/ESPRIT/SurfCAM/CAMWorks/BobCAD/TopSolid. Closes the long-tail per-CAM gap.",
  ["Reuse the per-CAM safety pattern from MS3-MS6.","Material bridge round-trip per vendor."]);

set("CAMX-MS8::U-CAMX12", [dispCam],
  ["dispatcher-action-design","test-design-real-values","mcp-tool-design"],
  "Dispatcher wiring + tests for batch CAMs (CAMX-MS8::U01-U06).",
  ["Schema sync for batch.","Real-data E2E per vendor."]);

skip("CAMX-MS9::U-CAMX01");

set("CAMX-MS9::U-CAMX02", [dispCam],
  ["engine-creation-discipline","test-design-real-values"],
  "HyperMillCodeGeneratorEngine; emit hyperMILL job-list/AC scripts. Consumed by prism_cam:hypermill_code_generate/templates.",
  ["AC scripts run inside hyperMILL Automation Center; version-pinned.","Round-trip test via in-host execution."]);

set("CAMX-MS9::U-CAMX03", [dispCam],
  ["engine-creation-discipline","test-design-real-values"],
  "HyperMillToolExportEngine; export PRISM tool library to hyperMILL DB. Consumed by prism_cam:hypermill_tool_export/job + universal_tool_export.",
  ["Tool library schema is XML; vendor schema versioned.","Round-trip: export -> import -> equal-shape."]);

set("CAMX-MS9::U-CAMX04", [dispCam],
  ["engine-creation-discipline","test-design-real-values"],
  "Fusion360StrategyEngine; strategy-recommend for Fusion360 Manufacture Extension (Adaptive, Steep&Shallow). Consumed by /cam-fusion + prism_cam:fusion360_strategy_*.",
  ["Fusion has deep MfgExt strategy set + cloud-API; capability matrix per release.","Adaptive engagement physics vendor-proprietary; PRISM uses generic."]);

set("CAMX-MS9::U-CAMX05", [dispCam, dispSafety], seSafety(),
  "Fusion360SafetyHooksEngine; safety validators for Fusion (engagement, plunge, safe Z, retract). Consumed by prism_cam:fusion360_safety_validate/rules.",
  ["Fusion-specific safety: Adaptive radial engagement override check.","Real-data validation against published Fusion limits."]);

set("CAMX-MS9::U-CAMX06", [dispCam],
  ["engine-creation-discipline","test-design-real-values"],
  "Fusion360MaterialBridgeEngine; bridges PRISM materials to Fusion360 material library. Consumed by prism_cam:fusion360_material_*.",
  ["Material library: Fusion uses 'group ISO' taxonomy; bridge to PRISM ISO-P/M/K/N/S/H.","Round-trip required."]);

set("CAMX-V17-P0A::U01", [dispCad, dispCam], seTest(),
  "Test BlueprintOCREngine with 5 real Haas drawings; real-data E2E for OCR -> features. Closes the hermetic-fake regression class.",
  ["Real Haas drawings have hand-written notes, oblique angles; OCR must handle.","Stratified: 5 drawings across material + tolerance + view types."]);

set("CAMX-V17-P0A::U02", [dispCad], seTest(),
  "Test PrintToGeometryEngine; actually EXECUTE the CadQuery output (not just generate code).",
  ["Execution catches syntax + topology defects unit-tests miss.","Lesson: passing-test-without-execution is the classic hermetic-fake bug."]);

set("CAMX-V17-P0A::U03", [dispCad], seTest(),
  "Test StepImportEngine with real STEP files from BOX corpus.",
  ["Vendor STEP files have schema quirks (AP203 vs AP214 vs AP242).","Round-trip: STEP -> BREP -> STEP."]);

set("CAMX-V17-P0A::U04", [dispCad, dispCam], seTest(),
  "Test FeatureRecognitionEngine on real geometry from the JM-DIE corpus.",
  ["Feature recognition is the failure-mode gold mine; pockets vs slots vs grooves.","Per-feature-class assertions + per-material edge cases."]);

set("CAMX-V17-P0A::U05", [dispCad, dispTurning, dispTurningProg], seTest(),
  "End-to-end lathe: drawing -> features -> turning program. Real Haas lathe drawing through full pipeline.",
  ["E2E catches integration defects unit tests miss (DOMAIN-PIPELINE-MS0 lesson).","Per-stage assertions to localize failure."]);

set("CAMX-V17-P0A::U06", [dispCad, dispMill, dispCam], seTest(),
  "End-to-end mill: drawing -> features -> milling program. Real Haas mill drawing through full pipeline.",
  ["Same pattern as U05 but mill domain.","Real cycle-time + cost validation against shop history."]);

set("CAMX-V17-P0B::U-CAMX01", [dispCam, dispTurning],
  ["fail-loud-r12-patterns","test-design-real-values","regression-prevention-doctrine"],
  "Fix multi-start threading; generate N G76 blocks (not 1). Bug: silent under-thread.",
  ["Multi-start threading: N starts -> N G76 calls with start-angle offset.","Regression oracle: real multi-start screw G-code must match published spec."]);

set("CAMX-V17-P0B::U-CAMX02", [dispCam, dispTurning],
  ["fail-loud-r12-patterns","test-design-real-values","regression-prevention-doctrine"],
  "Fix facing; implement G72 multi-pass or pass-loop. Bug: single-pass on deep face.",
  ["Multi-pass facing per DOC >=0.5mm.","Edge: face profile not flat -> G72 path planning required."]);

set("CAMX-V17-P0B::U-CAMX03", [dispCam, dispTurning, dispMill],
  ["fail-loud-r12-patterns","engine-creation-discipline","test-design-real-values"],
  "Fix MillTurn assembleProgram() crash. Live regression; assembleProgram throws on real input.",
  ["Repro: real input -> crash. Bug-finding-wiki gate doctrine.","Memory: bug-finding requires wiki entry per [[feedback_always_update_wiki_on_bug_finding]]."]);

set("CAMX-V17-P0B::U-CAMX04", [dispCam],
  ["dispatcher-action-design","fail-loud-r12-patterns","regression-prevention-doctrine"],
  "Fix routing; action names + method names drifted. Real-data E2E to catch.",
  ["Action name registry; mismatch must throw at registration not at call.","Recurring class: schema-read-first per CAMX-MS16::U06."]);

set("CAMX-V17-P0B::U-CAMX05", [dispCam, dispTurning, dispCalc],
  ["physics-constants-discipline","fail-loud-r12-patterns","test-design-real-values"],
  "Fix Kienzle approach angle in turning. Bug: missing approach-angle correction in turning kc1.1.",
  ["Kienzle force: F = kc1.1 * b * h * (h/h0)^(-mc); angle correction per ISO 3685.","Constant kc1.1 MUST be imported from src/physics/constants.ts."]);

set("CAMX-V17-P0B::U-CAMX06", [dispCam],
  ["fail-loud-r12-patterns","engine-creation-discipline","test-design-real-values"],
  "Fix robustness_weight=0 in OptimalStrategySelection. Bug: robustness silently ignored.",
  ["Default weights must be visible + non-zero; zero is a config error not a no-op.","R12: weight=0 -> log warning, never silent."]);

set("CAMX-V17-P0C::U-CAMX01", [],
  ["regression-prevention-doctrine","fail-loud-r12-patterns","per-file-scrutiny-gate"],
  "Audit and fix ALL `|| true` and keyword-only assertions across the codebase. Closes the silent-pass class.",
  ["`|| true` defeats fail-loud R12; grep + fix every site.","Keyword-only assertion (toContain('error')) hides defects when real error class changes."]);

set("CAMX-V17-P0C::U-CAMX02", [dispCam],
  ["engine-creation-discipline","test-design-real-values","schema-read-discipline"],
  "Define 14-stage pipeline validation matrix; per-stage I/O contract + assertions. Maps to DOMAIN-PIPELINE-MS0.",
  ["Stage contract = typed I/O + invariants.","Validation matrix enables stage-skip-detection."]);

set("CAMX-V17-P0C::U-CAMX03", [dispCam, dispCalc],
  ["physics-constants-discipline","test-design-real-values","engine-creation-discipline"],
  "Create cross-material S/F range tables; published Sandvik/Kennametal ranges per ISO group.",
  ["Source: vendor catalogs; cite source per entry.","Range MUST encode uncertainty (vc +/- 20%), not single value."]);

set("CAMX-V17-P0C::U-CAMX04", [dispCam],
  ["test-design-real-values","engine-creation-discipline","schema-read-discipline"],
  "Create controller dialect assertion library; Fanuc/Siemens/Haas/Okuma dialect differences.",
  ["Dialect = G-code subset + extension; assertions per controller.","Round-trip: post-processor must emit valid dialect."]);

set("CAMX-V17-P0C::U-CAMX05", [dispCam],
  ["test-design-real-values","fail-loud-r12-patterns","regression-prevention-doctrine"],
  "Create 50+ negative/error input test battery; invalid input + edge cases.",
  ["Negative-input testing is the foundation of fail-loud R12.","Each test must assert the SPECIFIC error, not just 'throws'."]);

set("CAMX-V17-P0C::U-CAMX06", [dispCam, dispSafety],
  ["fail-loud-r12-patterns","safety-tier-discipline","test-design-real-values"],
  "Create parameter sanity guard; sanity-check inputs (vc>0, ap>0, fz>0, material known).",
  ["Sanity check at API entry, not deep in math.","R12: NaN/Infinity must throw with field name."]);

["U-CAMX01","U-CAMX02","U-CAMX03","U-CAMX04","U-CAMX05"].forEach(u => {
  set("CAMX-V17-P10::"+u, [],
    ["claude-md-as-pointer-index","doc-reflection-rule"],
    "Pointer-only unit citing CAMX-FINAL-ROADMAP-v17.md and LATHE-COMPREHENSIVE-ROADMAP.md for the 105-unit detailed breakdown. No standalone deliverable.",
    ["Pointer units are valid per claude-md-as-pointer-index; keep detail in the linked roadmap.","Drift risk: pointer can rot if linked doc deletes section."]);
});

set("CAMX-V17-P11::U-CAMX01", [dispCam, dispCalc],
  ["physics-constants-discipline","test-design-real-values","regression-prevention-doctrine"],
  "Physics validation against Sandvik published kc1.1. Closes the inlined-constant class.",
  ["Validation tolerance: +/-10% (vendor publishes nominal).","Constants MUST be imported from src/physics/constants.ts."]);

set("CAMX-V17-P11::U-CAMX02", [dispCam, dispCalc],
  ["test-design-real-values","regression-prevention-doctrine","engine-creation-discipline"],
  "S/F validation against Sandvik/Kennametal/ISCAR recommendations. Real-data benchmark across 3 vendors.",
  ["Three-vendor agreement is the strongest signal.","Disagreement: surface as 'vendor-band' uncertainty."]);

set("CAMX-V17-P11::U-CAMX03", [dispCam, dispMill, dispCalc],
  ["test-design-real-values","regression-prevention-doctrine"],
  "Cross-material milling test; same part in 12 materials. Full physics+strategy regression.",
  ["12 materials cover ISO P/M/K/N/S/H x 2 hardness brackets.","Per-material expected MRR + tool life from published tables."]);

set("CAMX-V17-P11::U-CAMX04", [dispCam, dispTurning, dispCalc],
  ["test-design-real-values","regression-prevention-doctrine"],
  "Cross-material turning test; same part in 10 materials.",
  ["10 materials x turning physics.","Per-material chip-form prediction."]);

set("CAMX-V17-P11::U-CAMX05", [dispCam, dispMill, dispTurning],
  ["test-design-real-values","regression-prevention-doctrine"],
  "Cross-machine test; same part on 4 machine classes (VMC/HMC/turning-center/Swiss).",
  ["Machine class x strategy interaction; separate concern from material x strategy.","Cycle-time scaling per machine."]);

set("CAMX-V17-P11::U-CAMX06", [dispCam, dispMill],
  ["test-design-real-values","engine-creation-discipline"],
  "Mold cavity; P20 injection mold real-world test case.",
  ["Mold has steep-shallow + small-corner-radius; strategy switch zones.","Real injection mold dimensions; not synthetic."]);

set("CAMX-V17-P11::U-CAMX11", [dispCam, dispFive, dispMill],
  ["test-design-real-values","engine-creation-discipline","safety-tier-discipline"],
  "Aerospace engine component; full lifecycle test (blisk/impeller). Multi-axis + tight tolerance.",
  ["AS9100 traceability mandatory; FAI required.","5-axis singularity handling tested explicitly."]);

set("CAMX-V17-P11::U-CAMX12", [dispCam, dispTurning],
  ["test-design-real-values","engine-creation-discipline","safety-tier-discipline"],
  "Swiss bone screw; Ti 3.5mm medical. Swiss-type lathe + Ti machining + ISO 13485 traceability.",
  ["Ti 3.5mm has chip-control + heat-control challenges.","ISO 13485 material cert traceability gate."]);

set("CAMX-V17-P11::U-CAMX13", [dispCam],
  ["test-design-real-values","regression-prevention-doctrine"],
  "PRISM vs tutorial programs; benchmark across 9 machine types. Closes the 'PRISM matches expert practice' gate.",
  ["Tutorials = expert practice (Mastercam/hyperMILL/SolidCAM); PRISM should match within cost+cycle band.","Benchmark deltas flag where PRISM diverges from convention."]);

const outPath = "H:/prism/state/shared/dashboards/ke-pass2-resume-agent-1.json";
const expected = Object.keys(SLICE).length;
const actual = Object.keys(out).length;
const missing = Object.keys(SLICE).filter(k => !(k in out));
const extra = Object.keys(out).filter(k => !(k in SLICE));
writeFileSync(outPath, JSON.stringify(out, null, 1));
console.log(`Expected ${expected}, wrote ${actual}`);
console.log(`Missing: ${missing.length}`);
if (missing.length) console.log("Missing keys:", missing.slice(0,30));
console.log(`Extra: ${extra.length}`);
if (extra.length) console.log("Extra keys:", extra.slice(0,30));
