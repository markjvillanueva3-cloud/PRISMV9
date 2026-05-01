#!/usr/bin/env node
// Round-3 micro-patch (S02 + typo + S09 reverse reciprocity)
// + Novel-feature milestones MS33-MS38 (6 new category-defining milestones, ~30 novel units)
// Idempotent.

import fs from "node:fs";
import path from "node:path";

const MS_DIR = "H:/prism/mcp-server/data/milestones";
const NOW = new Date().toISOString();
const PATCH_TAG = "ppg-round3-novel-2026-04-29";

const changes = [];
function load(id) { const p = path.join(MS_DIR, `${id}.json`); return { p, json: JSON.parse(fs.readFileSync(p, "utf8")) }; }
function save(p, j) { j.last_updated = NOW; fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n"); }
function alreadyPatched(j) { return Array.isArray(j._patches) && j._patches.includes(PATCH_TAG); }
function markPatched(j) { j._patches = [...new Set([...(j._patches || []), PATCH_TAG])]; }
function deepReplace(obj, find, replaceWith) {
  if (typeof obj === "string") return obj.split(find).join(replaceWith);
  if (Array.isArray(obj)) return obj.map((x) => deepReplace(x, find, replaceWith));
  if (obj && typeof obj === "object") { const out = {}; for (const k of Object.keys(obj)) out[k] = deepReplace(obj[k], find, replaceWith); return out; }
  return obj;
}

// ============================================================
// ROUND-3 MICRO-PATCH: S02 dispatcher routing precision + typo fix
// ============================================================
{
  let { p, json } = load("PPG-MS14");
  if (!alreadyPatched(json)) {
    // Soften the over-strong "actions live in cam, not turning/edm" wording
    json = deepReplace(json,
      "(camDispatcher.ts — 18 lathe predicate actions all unwired into MS14 gate; actions live in cam dispatcher, not turning dispatcher)",
      "(actions dual-wired: camDispatcher.ts (router) AND turningDispatcher.ts (canonical home). MS14 wires through both surfaces; tests assert action availability via either dispatcher)");
    json = deepReplace(json,
      "(camDispatcher.ts — 14 wedm_* predicate actions all unwired into MS14 gate; actions live in cam dispatcher, not edm dispatcher)",
      "(actions dual-wired: camDispatcher.ts (router) AND edmDispatcher.ts (canonical home). MS14 wires through both surfaces; tests assert action availability via either dispatcher)");
    json = deepReplace(json, "18 camDispatcher lathe-predicate actions wired into PreEmitSafetyPredicateEngine",
      "18 lathe-predicate actions (dual-wired in camDispatcher + turningDispatcher) routed through PreEmitSafetyPredicateEngine");
    json = deepReplace(json, "14 camDispatcher wedm-predicate actions wired into PreEmitSafetyPredicateEngine",
      "14 wedm-predicate actions (dual-wired in camDispatcher + edmDispatcher) routed through PreEmitSafetyPredicateEngine");
    // Fix typo: mill_turn_live_tool → mill_turn_live_tooling
    json = deepReplace(json, "mill_turn_live_tool action", "mill_turn_live_tooling action");
    json = deepReplace(json, "live_tool via mill_turn_live_tooling", "live_tool via mill_turn_live_tooling");
    markPatched(json);
    save(p, json);
    changes.push("PPG-MS14: dispatcher wording softened (dual-wired); typo mill_turn_live_tool→mill_turn_live_tooling fixed");
  }
}

// ============================================================
// ROUND-3 MICRO-PATCH: S09 reverse-reciprocity sweep on MS0-17
// For every depends_on edge in MS0-32, ensure the upstream's blocks[] reciprocates
// ============================================================
{
  const allEnvelopes = fs.readdirSync(MS_DIR).filter((f) => f.startsWith("PPG-MS") && f.endsWith(".json"));
  const reverseEdges = [];
  // Build dependency edges
  for (const f of allEnvelopes) {
    const j = JSON.parse(fs.readFileSync(path.join(MS_DIR, f), "utf8"));
    if (Array.isArray(j.depends_on)) {
      for (const upstream of j.depends_on) {
        if (typeof upstream === "string" && upstream.startsWith("PPG-MS")) {
          reverseEdges.push({ downstream: j.id, upstream });
        }
      }
    }
  }
  // Apply reverse reciprocity: for each {downstream, upstream}, ensure upstream.blocks includes downstream
  let touched = 0;
  const touchedIds = new Set();
  for (const { downstream, upstream } of reverseEdges) {
    const fp = path.join(MS_DIR, `${upstream}.json`);
    if (!fs.existsSync(fp)) continue;
    const j = JSON.parse(fs.readFileSync(fp, "utf8"));
    if (!Array.isArray(j.blocks)) j.blocks = [];
    if (!j.blocks.includes(downstream)) {
      j.blocks.push(downstream);
      j._reverse_reciprocity_patch = PATCH_TAG;
      save(fp, j);
      touched++;
      touchedIds.add(upstream);
    }
  }
  changes.push(`Reverse reciprocity: ${reverseEdges.length} depends_on edges checked; ${touched} blocks[] entries added across ${touchedIds.size} envelopes (${[...touchedIds].slice(0, 8).join(", ")}${touchedIds.size > 8 ? "..." : ""})`);
}

// ============================================================
// NOVEL MILESTONE WRITER — MS33-MS38 (category-defining capabilities)
// ============================================================
const novelMilestones = [
  // ---- MS33: Causal Reasoning & Counterfactual Posts ----
  {
    id: "PPG-MS33",
    version: "1.0.0",
    title: "PPG-MS33 — Causal-Counterfactual Post Authoring (CCP): What-If trade-off graphs + Monte Carlo P99 stall risk + time-reversed root-cause audit + tolerance warpath",
    track: "PPG",
    parent_roadmap: "PRISM-UNIFIED-ROADMAP-v2",
    pillar: "P3-PPG-SFC-LEARNING-LOOP",
    status: "not_started",
    phase: "P2",
    priority: "STRATEGIC",
    novel_capability_class: "category-defining",
    description: "Adds causal reasoning to post emission. Programmer asks 'what if I run this 12% slower?' — wizard runs counterfactual simulation, returns trade-off graph (cycle vs surface vs wear vs $/part). Pre-emit Monte Carlo simulates 1000× against material variability, tool wear distribution, machine drift; flags P99 spindle stall risk. When scrap happens, time-reversed audit traces backward: measurement → program → tool → S/F → constants → calibration → operator in seconds. Tolerance warpath projects: 'at current drift rate, 30% of these parts will fail GD&T at characteristic 17 in 6 months.' No CAM vendor offers any of these.",
    rationale: "The 4 most-asked operator questions today are: (1) 'what would happen if I changed X?', (2) 'how risky is this?', (3) 'why did this scrap?', (4) 'what's coming?'. CAM vendors answer none of these. PRISM has the engines (forensic_*, monte_carlo_*, StochasticForcePipeline, amsaa_reliability_growth) — they're just not surfaced into post authoring. This milestone is the difference between a tool and an oracle.",
    leverage_existing: [
      "MonteCarloProcessEngine + monte_carlo_simulate + monte_carlo_tool_life + monte_carlo_tolerance — 1000× simulation substrate (already in prism_calc)",
      "StochasticForcePipelineEngine + stochastic_chain + stochastic_composite_mc + stochastic_sensitivity — uncertainty propagation",
      "ForensicToolAutopsy + ForensicChipAnalysis + ForensicSurfaceDefect + ForensicCrash — root cause analysis (E0XXX in prism_diagnosis)",
      "InverseSolveEngine + inverse_troubleshoot + inverse_chatter + inverse_dimensional — backward causality",
      "ToleranceStackEngine + tolerance_stack + amsaa_reliability_growth — drift projection",
      "PRISMCreativeReasoningEngine.explore() with mode=optimal — counterfactual exploration",
      "BayesianToolLifeEngine + Weibull life — probability-of-failure surface",
      "ChanceConstrainedOptimizeEngine + uncertainty_quantify — robust outputs"
    ],
    the_worked_example_that_proves_it: {
      scenario: "JM Die programmer about to run a Hurco V11 D2 die plate. Wizard shows green light on every gate. Programmer asks 'what if I run feed 12% slower?'",
      today_pre_ppg_ms33: "No way to answer. Programmer either gambles or hand-calculates by walking back through the constants. Takes 20 minutes. Often skipped.",
      should_be_post_ppg_ms33: "Counterfactual emit runs in 800ms. Trade-off graph: 12% feed cut → +14% cycle, -38% predicted tool wear, +3 µm Ra worse, $0.42/part more, P99 stall risk 0.04%→0.01%. Programmer sees the curve. Picks. When part scraps tomorrow on characteristic 17, time-reversed audit traces in 4s: measurement→Z-axis backlash→last spindle warmup at 4°C cold-start→drift_canary fired but operator overrode→2-person rule violated. Root cause attributable.",
      gap_now_closed: "Programmer reasoning + safety + accountability all surface in the post."
    },
    units: [
      { id: "U-PPGM200", title: "CounterfactualPostEngine — what-if simulation surface",
        scope: "src/engines/CounterfactualPostEngine.ts — accepts (current_program, parameter_perturbation), runs sub-second simulation through StochasticForcePipeline + MonteCarloProcess + BayesianToolLife; returns trade-off vector {cycle_delta, wear_delta, surface_delta, cost_delta, P99_stall_delta, P99_chatter_delta}. Variability: ≥3 perturbation classes (feed-only, RPM-only, strategy-swap). Adversarial: NaN perturbation, perturbation that drives outside material envelope.",
        files_to_modify: ["src/engines/CounterfactualPostEngine.ts", "src/tools/dispatchers/camDispatcher.ts"],
        tests_to_add: ["src/__tests__/CounterfactualPost.integration.test.ts"] },
      { id: "U-PPGM201", title: "Monte Carlo P99 catastrophic-failure prevention gate",
        scope: "src/engines/MonteCarloP99GateEngine.ts — simulates emitted program 1000× against (material distribution, tool wear distribution, machine drift, fixture micro-shift); reports P99 spindle stall, P99 chatter unstable, P99 force ceiling exceedance, P99 thermal limit. Tier-aware: shop_floor HARD BLOCK on P99 stall > 0.1%, P99 ceiling > 1%; sim WARN only. Variability: ≥3 material variance models (uniform, lognormal, bimodal). Adversarial: 0-sample distribution, infinite-tail distribution → must default to canonical fallback with explicit confidence drop.",
        files_to_modify: ["src/engines/MonteCarloP99GateEngine.ts", "src/engines/PreEmitSafetyPredicateEngine.ts"],
        tests_to_add: ["src/__tests__/MonteCarloP99Gate.integration.test.ts"] },
      { id: "U-PPGM202", title: "Time-reversed causal audit (post-failure backward trace)",
        scope: "src/engines/TimeReversedAuditEngine.ts — given (failure_event, measurement, program, tool, sf_inputs, constants_version, calibration_source, operator_badge, machine_state_at_run), walks backward through ForensicToolAutopsy + InverseSolveEngine + drift_canary history; identifies probable root cause + confidence; ranks remediation. Variability: ≥3 failure modes (catastrophic crash, slow drift, sudden scrap). Adversarial: missing telemetry, conflicting witnesses (operator says X, machine says Y).",
        files_to_modify: ["src/engines/TimeReversedAuditEngine.ts"],
        tests_to_add: ["src/__tests__/TimeReversedAudit.integration.test.ts"] },
      { id: "U-PPGM203", title: "Tolerance warpath projection (drift-rate forward simulation)",
        scope: "src/engines/ToleranceWarpathEngine.ts — given (current_machine_drift_rate, current_calibration_state, GDT_envelope_per_characteristic, planned_job_queue), projects forward 1/3/6/12 months: 'at current rate, characteristic X will fail at confidence Y%.' Pre-emptive recalibration recommendation. Variability: ≥3 machine drift profiles (linear, exponential, step-change). Adversarial: missing drift history, calibration data corruption.",
        files_to_modify: ["src/engines/ToleranceWarpathEngine.ts"],
        tests_to_add: ["src/__tests__/ToleranceWarpath.integration.test.ts"] },
      { id: "U-PPGM204", title: "Inverse reverse-engineering: ingest competitor program → reproduce on PRISM",
        scope: "src/engines/InverseReverseEngineerEngine.ts — given competitor G-code, extract material guess, machine guess, strategy guess, parameter envelope; route through PRISMCreativeReasoningEngine; reproduce on PRISM stack with documented assumptions and confidence per parameter. Variability: ≥3 source dialects (Mastercam, hyperMILL, manual). Adversarial: heavily macro'd program, encrypted post output.",
        files_to_modify: ["src/engines/InverseReverseEngineerEngine.ts"],
        tests_to_add: ["src/__tests__/InverseReverseEngineer.integration.test.ts"] },
      { id: "U-PPGM205", title: "Wizard CounterfactualPanel — trade-off graph + 'show me the alternative' UI",
        scope: "web/src/components/ppg/CounterfactualPanel.tsx — slider per parameter, real-time updated trade-off graph; 'show me 5 alternatives in the Pareto frontier' button (hands off to MS35); audit log captures the perturbation history.",
        files_to_modify: ["web/src/components/ppg/CounterfactualPanel.tsx", "web/src/pages/PostProcessorGeneratorPage.tsx"],
        tests_to_add: ["src/__tests__/web-api/CounterfactualPanel.test.ts"] }
    ],
    completion_criteria: [
      "Counterfactual simulation returns trade-off graph in <1s on JM Die D2 reference; ≥3 perturbation classes tested",
      "Monte Carlo P99 gate HARD BLOCKs on shop_floor when P99 stall > 0.1%; zero false BLOCKs on 50-program corpus; 10/10 injected catastrophic faults caught",
      "Time-reversed audit identifies root cause within 5 seconds across 10 historical scrap incidents from JM Die archive",
      "Tolerance warpath projection within ±10% of measured drift over 90-day validation window",
      "Inverse reverse-engineer reproduces 3 reference competitor programs with ≥80% parameter accuracy",
      "Wizard CounterfactualPanel usable by operator in <30s per perturbation"
    ],
    depends_on: ["PPG-MS1", "PPG-MS9", "PPG-MS14", "PPG-MS17"],
    blocks: [],
    leverage_class: "novel-uses-existing-engines"
  },

  // ---- MS34: Self-Healing & Continuous Learning Posts ----
  {
    id: "PPG-MS34",
    version: "1.0.0",
    title: "PPG-MS34 — Self-Healing & Continuous-Learning Posts (SHCLP): self-healing manifests + recursive per-shop drift calibration + print-diff incremental update + conversational learning capture + overnight dream-tuning",
    track: "PPG",
    parent_roadmap: "PRISM-UNIFIED-ROADMAP-v2",
    pillar: "P3-PPG-SFC-LEARNING-LOOP",
    status: "not_started",
    phase: "P2",
    priority: "STRATEGIC",
    novel_capability_class: "category-defining",
    description: "Posts learn after they ship. Each emit carries a self-healing manifest — when MTConnect/OPC-UA observes deviation from prediction, the next emit auto-derates by the measured delta (tier-aware). Recursive drift calibration: each shop converges to its own kc1.1 multiplier without human intervention over N jobs. Print-diff → program-diff: customer revs print A→B; system regenerates ONLY changed ops, byte-locks unchanged. Conversational learning capture: operator says 'this chatters at corners' → wizard captures as tribal tip linked to feature/material/tool. Overnight dream-tuning: Monte Carlo on tomorrow's queue, recommends one tweak per program by morning.",
    rationale: "Static posts age and rot. Living posts compound shop value. PRISM has every substrate (drift_canary, BayesianToolLifeEngine, program_diff, blueprint_compare_revisions, tribal_capture, MonteCarloProcessEngine) — this milestone wires them into a continuous learning loop that no CAM vendor has built.",
    leverage_existing: [
      "BayesianToolLifeEngine + Weibull update — recursive parameter drift",
      "PostDriftCanaryEngine (PPG-MS9) — already wired",
      "MTConnectAdapter + OPCUAAdapter — read deviation, write override",
      "program_diff + program_compare + program_compare_physics — incremental update substrate",
      "blueprint_compare_revisions + blueprint_dxf_dimensions — print-diff intake",
      "TribalEnrichmentCoordinatorEngine (E0468) + tribal_capture + tribal_search — conversational learning persistence",
      "MonteCarloProcessEngine + monte_carlo_process — overnight simulation",
      "ProtoMAML adapter (PSAU-PPG-SFC) — few-shot calibration update",
      "OutcomeCaptureEngine + SFCOutcomeCaptureWireEngine — feedback substrate",
      "FederatedLearningEngine + learn_contribute + learn_aggregate + learn_anonymize — peer-shop intelligence"
    ],
    the_worked_example_that_proves_it: {
      scenario: "JM Die ships a program for 4140 prehardened bracket. Mid-batch, MTConnect spindle load shows 8% above prediction at corners. Same week, customer revs the print: depth 25→27 mm, all other features unchanged.",
      today_pre_ppg_ms34: "Operator reports the spindle observation to programmer hand-to-hand; programmer might forget; if remembered, programmer manually edits next program. Print rev forces full regen of all 12 ops; QC must re-FAI everything.",
      should_be_post_ppg_ms34: "Self-healing manifest sees the deviation, queues 1.5% feed derate for the next 5 jobs; operator sees an alert + accepts. 14 jobs later, recursive drift converges: this shop's true kc1.1 for 4140 is 1820 (canonical 1800). Constants overlay updated automatically. Print rev: program-diff regenerates ops 3+4 only (depth-affected); ops 1-2 + 5-12 byte-locked; FAI required only on 3+4. Programmer says to wizard 'corners chatter on 4140 with this insert geometry' — captured as tribal tip linked to material+feature+insert; auto-shared with consenting peer shops. Overnight: dream-tuning runs Monte Carlo on tomorrow's queue; in the morning, programmer sees 3 recommended tweaks (one per program) with the projected win.",
      gap_now_closed: "Posts get smarter every day. Shops converge to their own ground truth. Knowledge is captured, not lost."
    },
    units: [
      { id: "U-PPGM206", title: "SelfHealingManifestEngine — emit manifest + observe deviation + queue corrective derate",
        scope: "src/engines/SelfHealingManifestEngine.ts — every emit carries a manifest (predicted force/RPM/temp envelope + observation hooks + auto-correction policy); MTConnect/OPC-UA stream observation; deviation > σ queues a derate proposal for next emit (operator approval on shop_floor; auto on sim). Variability: ≥3 deviation classes (gradual creep, sudden jump, oscillation). Adversarial: telemetry stream stalls, observed values are NaN.",
        files_to_modify: ["src/engines/SelfHealingManifestEngine.ts", "src/engines/PostProcessorPipelineEngine.ts"],
        tests_to_add: ["src/__tests__/SelfHealingManifest.integration.test.ts"] },
      { id: "U-PPGM207", title: "RecursiveDriftCalibrationEngine — per-shop kc1.1/Taylor convergence",
        scope: "src/engines/RecursiveDriftCalibrationEngine.ts — over N jobs, fits per-shop kc1.1/Taylor multipliers via Bayesian update; converges without human; constants overlay per shop in shop_config; canonical constants remain authoritative globally. Variability: ≥3 material classes converge independently. Adversarial: contaminated samples (operator-edited program), single-job extreme outlier — must use robust regression.",
        files_to_modify: ["src/engines/RecursiveDriftCalibrationEngine.ts"],
        tests_to_add: ["src/__tests__/RecursiveDriftCalibration.integration.test.ts"] },
      { id: "U-PPGM208", title: "PrintDiffIncrementalUpdateEngine — rev A→B regenerates only affected ops",
        scope: "src/engines/PrintDiffIncrementalUpdateEngine.ts — diff print A vs print B via blueprint_compare_revisions; classify changes (dimension, tolerance, material, GDT, feature add/remove); regenerate impacted operations only; byte-lock unchanged ops; emit incremental program with provenance. Variability: ≥3 change classes (dim only, GDT only, feature add). Adversarial: print B has ambiguous geometry, print B is cosmetic-only.",
        files_to_modify: ["src/engines/PrintDiffIncrementalUpdateEngine.ts"],
        tests_to_add: ["src/__tests__/PrintDiffIncrementalUpdate.integration.test.ts"] },
      { id: "U-PPGM209", title: "ConversationalLearningCaptureEngine — operator-narrative → tribal-tip pipeline",
        scope: "src/engines/ConversationalLearningCaptureEngine.ts — operator says 'chatters at corners on 4140 with 4-flute end mill'; nlp_cam_parse extracts (feature=corner, material=4140, tool=4-flute end mill, symptom=chatter); tribal_capture persists with author + timestamp; auto-link to similar tips; surface in next emit when context matches. Variability: ≥3 narrative styles (terse, elaborate, jargon-heavy). Adversarial: ambiguous narrative ('it sounded weird'), narrative contradicts existing tribal rule.",
        files_to_modify: ["src/engines/ConversationalLearningCaptureEngine.ts"],
        tests_to_add: ["src/__tests__/ConversationalLearningCapture.integration.test.ts"] },
      { id: "U-PPGM210", title: "DreamTuningEngine — overnight Monte Carlo on tomorrow's queue",
        scope: "src/engines/DreamTuningEngine.ts — runs nightly; for each scheduled job, runs 1000-sample MonteCarloProcess against latest calibration; recommends ≤1 parameter tweak per job (max impact, min risk); presents in morning dashboard with projected $ + cycle-time + risk delta. Variability: ≥3 job types (mill, lathe, WEDM). Adversarial: queue contains NaN parameters, queue is empty, calibration data is fresh (no history) — must skip with explicit reason.",
        files_to_modify: ["src/engines/DreamTuningEngine.ts"],
        tests_to_add: ["src/__tests__/DreamTuning.integration.test.ts"] }
    ],
    completion_criteria: [
      "Self-healing manifest detects + queues derate within 1 cycle of telemetry deviation; tier-aware approval enforced",
      "Recursive drift calibration converges per shop within ±5% of measured ground truth on 50-job validation window",
      "Print-diff incremental update regenerates only impacted ops; byte-locked ops verified identical via SHA",
      "Conversational learning captures ≥80% of operator narratives on UX test (N≥10 narratives)",
      "Dream-tuning recommendations accepted ≥40% on 30-day pilot (proxy for relevance)"
    ],
    depends_on: ["PPG-MS1", "PPG-MS9", "PPG-MS11", "PPG-MS13"],
    blocks: [],
    leverage_class: "novel-uses-existing-engines"
  },

  // ---- MS35: Pareto & Personalization Posts ----
  {
    id: "PPG-MS35",
    version: "1.0.0",
    title: "PPG-MS35 — Pareto Multi-Program Authoring + Programmer Genome (PMA-PG): 5-candidate Pareto frontier + per-programmer personalization + cost-aware optimization + quote-win prediction",
    track: "PPG",
    parent_roadmap: "PRISM-UNIFIED-ROADMAP-v2",
    pillar: "P3-PPG-SFC-LEARNING-LOOP",
    status: "not_started",
    phase: "P2",
    priority: "STRATEGIC",
    novel_capability_class: "category-defining",
    description: "Wizard emits 3-5 candidate programs simultaneously across the Pareto frontier (cycle time × surface × tool wear × $/part). Programmer picks. Each programmer carries a 'genome' learned from their commit history (corner radius philosophy, climb-vs-conventional, peck depth conservatism, surface finish target priors); the wizard personalizes candidate generation per programmer. Cost-aware: optimizes for $/part not just cycle (factor: tool cost amortized over predicted life, machine hourly rate, energy, coolant lifecycle). Quote-win prediction: at quote time, predicts probability the customer accepts based on competitor pricing intelligence + customer history.",
    rationale: "Today's wizards emit ONE answer. Reality is multi-objective: every programmer has different priorities. PRISM has NSGA-II + tribal embeddings + cost_aware_route already wired — this milestone surfaces them into the post-authoring UX. Quote-win prediction is novel and creates a flywheel: more wins → more outcome data → better predictions.",
    leverage_existing: [
      "moo_nsga2 + moo_pareto_dominates + moo_non_dominated_sort — Pareto frontier (already in prism_calc)",
      "TribalEnrichmentCoordinatorEngine + per-author tribal-tip indexing",
      "cost_aware_route + roi_advisor_analyze + tool_cost_per_part + tool_roi_analyze — cost-aware substrate",
      "QuoteEstimatorEngine + quote_estimate + quote_what_if + quote_compare_materials — quoting substrate",
      "AnalyticsConversionEngine + analytics_conversion + analytics_calibration — quote-win training data",
      "BayesianOptimizeEngine + bayesopt_optimize + bayesian_suggest — guided Pareto search",
      "PRISMCreativeReasoningEngine.explore({mode: 'innovative'}) — novel candidate generation",
      "GA + DE + PSO + SA — alternative search heuristics for diverse candidates"
    ],
    the_worked_example_that_proves_it: {
      scenario: "JM Die programmer Mark opens a new D2 die plate job. Mark's genome (from 4 years of commits): conservative on corners, prefers climb, rough at 75% engagement target, finish at 0.8 µm Ra target.",
      today_pre_ppg_ms35: "Wizard emits one program. Mark hand-tweaks if not to taste. 8 minutes lost. Mark's preferences are not captured for next time.",
      should_be_post_ppg_ms35: "Wizard emits 5 candidates: (A) Mark's genome (his usual), (B) min cycle (more aggressive), (C) min wear (longest tool life), (D) min $/part (best amortized cost), (E) max surface (tightest Ra). Pareto frontier visualized; Mark sees A pre-selected; clicks compare to D, sees $0.18/part savings, picks D. Genome updates: Mark is shifting toward cost-awareness over cycle. Quote-win prediction shows 78% probability customer accepts at this quoted price (based on prior 12 ITW jobs — they typically accept >75% confidence quotes).",
      gap_now_closed: "Multi-objective truth surfaces. Each programmer's evolution captured. Quoting becomes data-driven."
    },
    units: [
      { id: "U-PPGM211", title: "ParetoCandidateAuthoringEngine — emit 3-5 candidates across frontier",
        scope: "src/engines/ParetoCandidateAuthoringEngine.ts — for given operation, runs NSGA-II across (cycle, surface, wear, $/part); returns 3-5 non-dominated candidates with full sidecar each; presents in wizard. Variability: ≥3 operation classes (rough mill, finish lathe, WEDM skim). Adversarial: degenerate frontier (all candidates identical), infeasible objective (negative cycle).",
        files_to_modify: ["src/engines/ParetoCandidateAuthoringEngine.ts"],
        tests_to_add: ["src/__tests__/ParetoCandidateAuthoring.integration.test.ts"] },
      { id: "U-PPGM212", title: "ProgrammerGenomeEngine — per-programmer preference learning",
        scope: "src/engines/ProgrammerGenomeEngine.ts — extracts programmer preference vector (corner_radius_bias, climb_vs_conventional, peck_conservatism, surface_finish_priority, cost_vs_cycle_priority, etc) from commit history of programs they've authored or accepted; updates per-emit. Genome biases candidate generation. Variability: ≥3 programmer profiles. Adversarial: new programmer with empty history (cold start), programmer with contradictory commit signal.",
        files_to_modify: ["src/engines/ProgrammerGenomeEngine.ts"],
        tests_to_add: ["src/__tests__/ProgrammerGenome.integration.test.ts"] },
      { id: "U-PPGM213", title: "CostPerPartOptimizationEngine — $/part objective in Pareto search",
        scope: "src/engines/CostPerPartOptimizationEngine.ts — composite cost: amortized tool cost over predicted Weibull life + machine hourly rate × cycle + energy cost + coolant lifecycle + floor space; objective for NSGA-II. Variability: ≥3 cost regimes (high tool, high machine, high energy). Adversarial: missing cost components (energy unknown), inverted price signals.",
        files_to_modify: ["src/engines/CostPerPartOptimizationEngine.ts"],
        tests_to_add: ["src/__tests__/CostPerPartOptimization.integration.test.ts"] },
      { id: "U-PPGM214", title: "QuoteWinPredictionEngine — probability of customer acceptance",
        scope: "src/engines/QuoteWinPredictionEngine.ts — given (customer, material, qty, lead, quoted_price, internal_cost), trains on AnalyticsConversion historical wins/losses; returns P(win) + price-sensitivity curve. Variability: ≥3 customer profiles (price-sensitive, lead-sensitive, quality-sensitive). Adversarial: new customer with no history (cold start), customer with binary win/loss only.",
        files_to_modify: ["src/engines/QuoteWinPredictionEngine.ts"],
        tests_to_add: ["src/__tests__/QuoteWinPrediction.integration.test.ts"] },
      { id: "U-PPGM215", title: "Wizard ParetoFrontierPanel + GenomeOverlay UI",
        scope: "web/src/components/ppg/ParetoFrontierPanel.tsx + GenomeOverlay.tsx — 3-5 candidate cards on a 4-axis radar; programmer's genome highlights their natural pick; one-click 'take me up the frontier' button.",
        files_to_modify: ["web/src/components/ppg/ParetoFrontierPanel.tsx", "web/src/components/ppg/GenomeOverlay.tsx", "web/src/pages/PostProcessorGeneratorPage.tsx"],
        tests_to_add: ["src/__tests__/web-api/ParetoFrontierUI.test.ts"] }
    ],
    completion_criteria: [
      "Wizard emits 3-5 non-dominated candidates per operation in <2s",
      "Programmer genome converges within 30 commits; predicted-pick accuracy ≥70% on held-out commits",
      "$/part objective matches measured cost within ±8% on 50-program validation",
      "Quote-win prediction calibrated on JM Die ITW history; AUC ≥0.75",
      "Pareto UI usable in <60s per decision (UX test)"
    ],
    depends_on: ["PPG-MS1", "PPG-MS27"],
    blocks: [],
    leverage_class: "novel-uses-existing-engines"
  },

  // ---- MS36: Multi-Sensor Real-Time Adaptation ----
  {
    id: "PPG-MS36",
    version: "1.0.0",
    title: "PPG-MS36 — Multi-Sensor Real-Time Adaptive Cutting (MS-RTAC): acoustic chatter RPM-hop + time-of-day thermal-state adaptation + chip-color CV + multi-sensor wear fusion + LIBS material verification",
    track: "PPG",
    parent_roadmap: "PRISM-UNIFIED-ROADMAP-v2",
    pillar: "P3-PPG-SFC-LEARNING-LOOP",
    status: "not_started",
    phase: "P2",
    priority: "STRATEGIC",
    novel_capability_class: "first-of-kind",
    description: "Posts adapt to physical reality at run-time. Acoustic FFT in cabinet detects chatter in <100ms; auto-emits RPM-hop macro (M-code shifts spindle 5%) without operator intervention. Time-of-day adaptation: spindle warmup state changes through the day; first job derates 8%, jobs 10+ run full speed. Chip-color CV (camera in machine): blue chips = too hot → feed reduce; straw = optimal; silver = too cool → feed increase. Multi-sensor wear fusion: vibration FRF + audio FFT + spindle current → tool-wear state estimate in real-time. Pre-cut LIBS verifies material (e.g. confirms 17-4 PH not 304SS); catches stock mix-ups before the cutter touches.",
    rationale: "PRISM has every sensor module wired (acoustic_emission_monitor, sensor_fuse, sensor_anomaly_detect, thermal_machine_error, fft_analyze, vibration_modal). What's missing is closing the loop into the post — sensor sees → post auto-adjusts within the same cycle. No CAM vendor offers this because they don't own the sensor stack. PRISM does.",
    leverage_existing: [
      "AcousticEmissionMonitorEngine + acoustics_cutting_noise + acoustics_chatter_noise — acoustic baseline",
      "fft_analyze + dominant_frequency + spectrogram + signal_envelope_analysis — chatter spectral detection",
      "ChatterDetectEngine + chatter_neural_classify — neural chatter classification",
      "ThermalMachineErrorEngine + thermal_machine_error + thermal_compensation_model — time-of-day thermal state",
      "MTConnectAdapter spindle_load + cnc_simulate_predictive — predictive baseline",
      "SensorFuseEngine + sensor_fuse + sensor_anomaly_detect — multi-sensor fusion",
      "MaterialCertRegisterEngine + material_cert_register + material_cert_link_program — LIBS integration anchor",
      "RealTimeAdaptiveControllerEngine (E0405) — adaptive control orchestrator (already wired in prism_adaptive_control)",
      "post_advanced_physics + post_inject_motion + post_inject_coolant — post-pipeline injection points"
    ],
    the_worked_example_that_proves_it: {
      scenario: "Hurco V11 cuts D2 die plate at 7am (cold start). Stock label says D2 but stockroom mix-up sent 304SS.",
      today_pre_ppg_ms36: "Cold-start spindle: 6 µm thermal drift, parts run mid-tolerance ±10 µm. Stock mix-up: cutter touches; immediate force spike; cutter chips; $80 lost. Mid-cut chatter: operator hears it, runs to controller, hits override, derates 15%.",
      should_be_post_ppg_ms36: "Pre-cut LIBS probe: spectral analysis says 304SS not D2. HARD BLOCK with 'material mismatch — verify stock'. Operator confirms mix-up; correct stock loaded. First job of day: thermal-state engine sees cold spindle + 4°C ambient; auto-derates feed 8% + adds 90s warmup G-code at top of program. Job 10: full speed. Mid-cut: acoustic FFT flags 14% chatter signature in 87ms; M-code shifts spindle from 8500 to 8925 (5% hop); chatter clears in 1 cycle. Chip color stays straw across the day.",
      gap_now_closed: "Sensor → post → machine loop closes inside one cycle. Catastrophes prevented at the source."
    },
    units: [
      { id: "U-PPGM216", title: "AcousticChatterRPMHopEngine — sub-100ms chatter detection + RPM macro",
        scope: "src/engines/AcousticChatterRPMHopEngine.ts — streams audio from cabinet mic, FFT every 50ms; chatter neural classifier confidence > 0.8 fires RPM-hop M-code (Hurco G-codes M99 P-call to subprogram, generic M0 + reload, controller-aware); shift = 5% nominal, escalating to 8% on persistent. Variability: ≥3 chatter signatures (low-freq, mid-freq, high-freq). Adversarial: shop ambient noise spike (forklift), microphone failure → must fail gracefully not BLOCK.",
        files_to_modify: ["src/engines/AcousticChatterRPMHopEngine.ts"],
        tests_to_add: ["src/__tests__/AcousticChatterRPMHop.integration.test.ts"] },
      { id: "U-PPGM217", title: "ThermalStateAdaptationEngine — time-of-day cold-start derate",
        scope: "src/engines/ThermalStateAdaptationEngine.ts — reads MTConnect machine_uptime + ambient_temp; first N jobs after cold-start derate via thermal_compensation_model; warmup G-code injected at program top when needed; full speed once machine reaches steady state (typically jobs 8-12). Variability: ≥3 ambient regimes (4°C cold, 22°C nominal, 35°C summer). Adversarial: machine uptime sensor dead, ambient sensor missing.",
        files_to_modify: ["src/engines/ThermalStateAdaptationEngine.ts"],
        tests_to_add: ["src/__tests__/ThermalStateAdaptation.integration.test.ts"] },
      { id: "U-PPGM218", title: "ChipColorCVEngine — color-driven feed correction",
        scope: "src/engines/ChipColorCVEngine.ts — camera in machine; CV pipeline classifies chip color (blue/dark-blue/straw/silver/white); maps to thermal regime; emits feed correction proposal (blue → feed -10%, silver → feed +5%); operator approval on shop_floor. Variability: ≥3 material/color profiles (steel: straw=good; aluminum: silver=good; titanium: dark-blue=acceptable). Adversarial: bad lighting, chip occlusion, camera failure.",
        files_to_modify: ["src/engines/ChipColorCVEngine.ts"],
        tests_to_add: ["src/__tests__/ChipColorCV.integration.test.ts"] },
      { id: "U-PPGM219", title: "MultiSensorWearFusionEngine — vibration + audio + spindle current → wear state",
        scope: "src/engines/MultiSensorWearFusionEngine.ts — fuses (vibration_modal, audio FFT bands, spindle current trend); Kalman filter on tool wear state; flags imminent failure 5+ minutes before catastrophic event; tier-aware proactive tool-change alert. Variability: ≥3 wear profiles (gradual flank, abrupt edge chip, BUE buildup). Adversarial: one sensor stream stalls (must fall back), conflicting sensor signal.",
        files_to_modify: ["src/engines/MultiSensorWearFusionEngine.ts"],
        tests_to_add: ["src/__tests__/MultiSensorWearFusion.integration.test.ts"] },
      { id: "U-PPGM220", title: "LIBSMaterialVerificationEngine — pre-cut spectral verification",
        scope: "src/engines/LIBSMaterialVerificationEngine.ts — laser-induced breakdown spectroscopy probe arm fires before cutter engagement; returns elemental composition; cross-checks against work-order material; HARD BLOCK on mismatch (>3% Cr/Ni/Mo deviation from spec). Variability: ≥3 stock conditions (clean, oxidized, oil-coated). Adversarial: probe arm fault, spectrometer drift, stock with surface contamination.",
        files_to_modify: ["src/engines/LIBSMaterialVerificationEngine.ts"],
        tests_to_add: ["src/__tests__/LIBSMaterialVerification.integration.test.ts"] }
    ],
    completion_criteria: [
      "Acoustic chatter RPM-hop fires in <100ms on injected chatter signature; clears chatter in <2 cycles",
      "Thermal-state cold-start derate measurably reduces first-job dimensional drift by ≥40% on 30-day pilot",
      "Chip-color CV agrees with operator subjective rating ≥85% (UX test)",
      "Multi-sensor wear fusion predicts catastrophic tool failure ≥5 minutes before event on 10/10 historical incidents",
      "LIBS verification HARD BLOCKs all 10/10 injected material-mismatch scenarios; zero false BLOCKs on 50 correct-material runs"
    ],
    depends_on: ["PPG-MS1", "PPG-MS9", "PPG-MS14"],
    blocks: [],
    leverage_class: "novel-uses-existing-engines",
    hardware_dependency_note: "U-PPGM218 requires in-cabinet camera (~$200-500); U-PPGM219 requires existing MTConnect spindle current + accelerometer (most modern machines have these); U-PPGM220 requires LIBS probe arm (~$15-40k optional accessory; tier-2 milestone for high-margin shops)."
  },

  // ---- MS37: Federated Intelligence & Cross-Shop Learning ----
  {
    id: "PPG-MS37",
    version: "1.0.0",
    title: "PPG-MS37 — Federated Cross-Shop Intelligence (FCSI): anonymized recipe sharing + predictive tool procurement + robot cell integration + energy-aware scheduling",
    track: "PPG",
    parent_roadmap: "PRISM-UNIFIED-ROADMAP-v2",
    pillar: "P3-PPG-SFC-LEARNING-LOOP",
    status: "not_started",
    phase: "P2",
    priority: "HIGH",
    novel_capability_class: "first-of-kind",
    description: "Shops in the PRISM federation (with consent) anonymously share outcome data. Your post says: 'JM Die's ALCOA work has 23% lower wear when using XX coating on D2 12mm — try?'. Predictive tool procurement: post analyzes the next 90 days of pending jobs, emits a tool order with optimal qty + grade + supplier. Robot cell integration: post emits robot loading/unloading programs alongside CNC G-code with synchronized handshakes. Energy-aware scheduling: heavy jobs shift to off-peak (industrial demand-charge) saving thousands/month.",
    rationale: "PRISM's federation engine is wired (FederatedLearningEngine + learn_*) but no post consumer exists. Predictive procurement uses ToolROIEngine + InventoryEOQEngine — wired but unsurfaced. Robot cell uses cobot_* — wired but unwoven into post emit. Energy uses sustain_optimize + energy_carbon_footprint — wired but unconnected to scheduling. This milestone weaves the cross-shop and cross-system intelligence into one operational fabric.",
    leverage_existing: [
      "FederatedLearningEngine + learn_contribute + learn_query + learn_aggregate + learn_anonymize + learn_network_stats — federation substrate",
      "TribalEnrichmentCoordinatorEngine — shared tribal-tip backbone",
      "ToolROIEngine + tool_roi_analyze + tool_cost_predict + InventoryEOQEngine — procurement substrate",
      "SupplierIntegrationEngine + purchasing_search + purchasing_recommend — supplier API hooks",
      "CobotAssessSafetyEngine + cobot_assess_safety + cobot_plan_task + cobot_select — robot cell substrate",
      "SustainOptimizeEngine + sustain_optimize + energy_optimize + energy_carbon_footprint — energy substrate",
      "ScheduleOptimizeEngine + schedule_optimize + schedule_balance + schedule_what_if — scheduling substrate",
      "CapacityPlanningEngine + capacity_machine_load + capacity_what_if — capacity substrate"
    ],
    the_worked_example_that_proves_it: {
      scenario: "JM Die runs 800 D2 die plates/year. Federation has 12 peer fastener-die shops with shared anonymized outcomes. Energy demand-charge $0.18/kWh peak vs $0.06/kWh off-peak.",
      today_pre_ppg_ms37: "JM Die's coating choice based only on Sandvik catalog. Tool procurement is reactive ('we ran out of XX'). Robot cell programmed separately from CNC (operator manually syncs). Heavy jobs run when scheduled, often peak hours. ~$1,200/mo demand charge.",
      should_be_post_ppg_ms37: "Federation surfaces: 'peer shop X uses TiAlSiN coating on D2 12mm with measured 23% lower wear vs your TiAlN' — Mark accepts; tool order auto-includes 12 of the new coating for next quarter (predictive procurement). Robot cell program emits with handshake macros (CNC M-code triggers robot load/unload via MTConnect). Heavy jobs scheduled to off-peak; demand charge drops to ~$340/mo (~$10k/year saved).",
      gap_now_closed: "Each shop benefits from every shop's experience. Procurement gets ahead. Energy bill drops. Robot cells become first-class citizens."
    },
    units: [
      { id: "U-PPGM221", title: "FederatedRecipeSharingEngine — anonymized peer-shop outcome surface in wizard",
        scope: "src/engines/FederatedRecipeSharingEngine.ts — opt-in consent; outcomes anonymized via learn_anonymize (k-anonymity ≥5); wizard surfaces relevant peer-shop recipes during emit ('shops with similar profile achieved X with Y') with confidence + cohort size; HARD BLOCK on PII leakage (assertion test). Variability: ≥3 cohort sizes (5, 20, 100+). Adversarial: malicious peer injects bad recipe (must filter on outcome variance), cohort below k-anonymity threshold.",
        files_to_modify: ["src/engines/FederatedRecipeSharingEngine.ts"],
        tests_to_add: ["src/__tests__/FederatedRecipeSharing.integration.test.ts"] },
      { id: "U-PPGM222", title: "PredictiveToolProcurementEngine — 90-day forward order generator",
        scope: "src/engines/PredictiveToolProcurementEngine.ts — analyzes scheduled jobs over 90 days; predicts tool consumption via ToolROIEngine + Weibull life; computes EOQ; recommends purchase order with qty + grade + supplier ranked by ROI; integrates purchasing_search. Variability: ≥3 supplier strategies (cheapest, fastest, highest-quality). Adversarial: schedule with high variance (must hedge), supplier API offline.",
        files_to_modify: ["src/engines/PredictiveToolProcurementEngine.ts"],
        tests_to_add: ["src/__tests__/PredictiveToolProcurement.integration.test.ts"] },
      { id: "U-PPGM223", title: "RobotCellPostEngine — synchronized CNC + robot load/unload program",
        scope: "src/engines/RobotCellPostEngine.ts — emits robot program (Fanuc/UR/KUKA/ABB) alongside CNC G-code; handshake protocol (M-code on CNC triggers robot via MTConnect digital I/O or OPC-UA); pre-cycle vision check; post-cycle inspection routine; HARD BLOCK on cobot_assess_safety failure. Variability: ≥3 robot brands. Adversarial: robot offline mid-program, vision system fault.",
        files_to_modify: ["src/engines/RobotCellPostEngine.ts"],
        tests_to_add: ["src/__tests__/RobotCellPost.integration.test.ts"] },
      { id: "U-PPGM224", title: "EnergyAwareSchedulingEngine — peak/off-peak job placement",
        scope: "src/engines/EnergyAwareSchedulingEngine.ts — for each scheduled job, computes energy footprint via sustain_optimize; ranks jobs by demand charge sensitivity; reschedules heavy jobs to off-peak; emits time-of-run annotations on programs; surfaces savings dashboard. Variability: ≥3 utility rate structures (TOU, demand-only, flat). Adversarial: schedule conflicts (deadlines vs energy), missing energy data (fall back to nominal).",
        files_to_modify: ["src/engines/EnergyAwareSchedulingEngine.ts"],
        tests_to_add: ["src/__tests__/EnergyAwareScheduling.integration.test.ts"] },
      { id: "U-PPGM225", title: "FederationConsentUI + opt-in audit trail",
        scope: "web/src/components/ppg/FederationConsentPanel.tsx — granular consent (share recipe outcomes? share tribal tips? share calibration deltas? per-customer opt-out); audit trail; revocation propagates within 24h.",
        files_to_modify: ["web/src/components/ppg/FederationConsentPanel.tsx", "src/engines/FederationConsentEngine.ts"],
        tests_to_add: ["src/__tests__/web-api/FederationConsent.test.ts"] }
    ],
    completion_criteria: [
      "Federated recipes surface in wizard with k-anonymity ≥5; 0 PII leaks on red-team test",
      "Predictive tool procurement reduces stock-out events by ≥60% on 30-day pilot",
      "Robot cell post emits synchronized programs validated on UR + Fanuc test cells",
      "Energy-aware scheduling reduces measured peak demand charge ≥40% on JM Die quarterly bill",
      "Consent UI revokes propagate within 24h per audit trail"
    ],
    depends_on: ["PPG-MS9", "PPG-MS27"],
    blocks: [],
    leverage_class: "novel-uses-existing-engines"
  },

  // ---- MS38: Operator-Facing AI Surfaces ----
  {
    id: "PPG-MS38",
    version: "1.0.0",
    title: "PPG-MS38 — Operator-Facing AI Surfaces (OFAIS): holographic AR setup sheets + NLP voice authoring + GD&T-driven probe plan + multi-setup AGI sequencer + adaptive FAI sampling + dimensional reasoning + AI-rendered setup imagery",
    track: "PPG",
    parent_roadmap: "PRISM-UNIFIED-ROADMAP-v2",
    pillar: "P3-PPG-SFC-LEARNING-LOOP",
    status: "not_started",
    phase: "P2",
    priority: "HIGH",
    novel_capability_class: "first-of-kind",
    description: "Operators see + speak with the post. AR overlay (HoloLens / Quest 3 / iPad) renders the toolpath, fixture clamps, probe approach in 3D over the actual machine. Voice authoring: 'drill 6mm hole through M2 depth 25' → wizard generates op + asks confirmation. GD&T-driven probe plan auto-generates probe macros (tight bore → in-process probe; flat datum → pre-cut; surface profile → CMM handoff). Multi-setup AGI sequencer plans 4-setup parts (which features setup 1, what fixture 2, when to flip). Adaptive FAI sampling adjusts probe density per part complexity + sigma history. Dimensional reasoning catches operator unit errors (mm hole + inch depth). AI-rendered setup imagery: photorealistic images of correct setup (not just text).",
    rationale: "Operators are the bottleneck on PRISM ROI. Every minute they spend deciphering a setup sheet, retyping op definitions, manually planning multi-setup sequences is a minute the post is not earning. PRISM has every backend (cobot, nlp_cam, gdt_validate, sequence_constraint_graph, cmm_sampling_strategy, dim_analysis_consistency, TextToCADGenerationEngine) — this milestone surfaces them as operator-grade UX.",
    leverage_existing: [
      "TextToCADGenerationEngine + cad_generate — AI imagery for setup sheets",
      "NeuralCADGenerationEngine — alternative CAD generation pathway",
      "BlueprintToCADGenerationEngine — blueprint-to-3D for AR overlay",
      "nlp_cam_parse + nlp_cam_extract_dims + nlp_cam_parse_context — voice-to-op pipeline",
      "GDTValidateEngine + gdt_validate + gdt_stackup — GD&T → probe macro mapping",
      "ProbeWCSSetupGenEngine + probe_wcs_setup_gen + probe_first_article_gen + probe_in_process_gen — probe macro emission",
      "SequenceConstraintGraphEngine + sequence_constraint_graph + sequence_simulate + sequence_resequence — multi-setup planning",
      "AssemblySequenceEngine + assembly_sequence — assembly-aware sequencing",
      "AdaptivePipelineGenerateEngine + adaptive_pipeline_generate + adaptive_pipeline_adapt_step — adaptive FAI sampling",
      "CMMSamplingStrategyEngine + cmm_sampling_strategy + cmm_uncertainty_budget — sampling density",
      "DimAnalysisConsistencyEngine + dim_analysis_consistency + dim_analysis_buckingham_pi — unit-error detection"
    ],
    the_worked_example_that_proves_it: {
      scenario: "Holo-Krome shoulder bolt mill job at JM Die. New operator (3rd day on the job). 3-setup part. Multiple GD&T characteristics.",
      today_pre_ppg_ms38: "Operator reads paper setup sheet, struggles with which clamp position. Calls programmer. 12 minutes lost. Probe macros copy-pasted from previous job; wrong for this GD&T scheme. FAI sampling N=10 on every characteristic (overconservative). Multi-setup planned by programmer hand. Operator nearly enters '6 inch' for what should be '6 mm'.",
      should_be_post_ppg_ms38: "Operator dons Quest 3 + AR overlay shows fixture clamps + tool callouts + probe approach + first-cut path animated in real space. Operator says 'verify the depth on this M2 part is 25 mm' — voice authoring confirms + adds in-process probe. GD&T-driven probe plan emits: tight 0.025 mm bore → in-process probe with 4-touch averaging; flat datum → pre-cut probe; surface profile → CMM handoff. Adaptive FAI: critical bore N=10, tolerance-band features N=2 (saves 14 minutes per part). Multi-setup AGI sequenced: setup 1 datums + critical bore + threading; setup 2 (90° flip) finish OD + chamfer; setup 3 (mill-turn) cross-drill. Dimensional reasoning catches: 'you said 25 mm but the print says 0.984 in (24.999 mm) — confirm?'",
      gap_now_closed: "New operators perform like 5-year veterans on day 3. Every micro-task that wasted minutes becomes seconds."
    },
    units: [
      { id: "U-PPGM226", title: "ARSetupOverlayEngine — Quest 3 / HoloLens / iPad spatial overlay",
        scope: "src/engines/ARSetupOverlayEngine.ts — emits AR scene description (USDZ for iPad, glTF + spatial anchors for Quest/HoloLens); fixture clamps + tool callouts + probe paths + first-cut animation; spatial anchored to machine bed via printed fiducial. Variability: ≥3 platforms (iPad, Quest 3, HoloLens 2). Adversarial: poor lighting AR tracking, fiducial occluded, machine moved between sessions.",
        files_to_modify: ["src/engines/ARSetupOverlayEngine.ts"],
        tests_to_add: ["src/__tests__/ARSetupOverlay.integration.test.ts"] },
      { id: "U-PPGM227", title: "VoiceAuthoringEngine — speech-to-op pipeline",
        scope: "src/engines/VoiceAuthoringEngine.ts — Whisper or similar speech-to-text; nlp_cam_parse extracts (operation, dim, material, tool); confirmation dialog; supports 'cancel that' rollback. Variability: ≥3 accents/speakers. Adversarial: noisy shop, ambiguous dimension ('about 6'), unsupported operation type.",
        files_to_modify: ["src/engines/VoiceAuthoringEngine.ts"],
        tests_to_add: ["src/__tests__/VoiceAuthoring.integration.test.ts"] },
      { id: "U-PPGM228", title: "GDTDrivenProbePlanEngine — automatic probe macro emission per GD&T",
        scope: "src/engines/GDTDrivenProbePlanEngine.ts — for each toleranced feature, classify (size/orientation/position/profile/runout); emit probe macro (in-process bore probe / pre-cut datum / surface CMM handoff / runout indicator); compose into setup-sheet probe section. Variability: ≥3 GD&T classes per part. Adversarial: conflicting datum schemes, GD&T missing on critical feature.",
        files_to_modify: ["src/engines/GDTDrivenProbePlanEngine.ts"],
        tests_to_add: ["src/__tests__/GDTDrivenProbePlan.integration.test.ts"] },
      { id: "U-PPGM229", title: "MultiSetupAGISequencerEngine — N-setup planner",
        scope: "src/engines/MultiSetupAGISequencerEngine.ts — sequence_constraint_graph builds dependency graph (datums first, holes before threads, etc.); assigns features to setups respecting workholding rotation + tool availability; emits setup transition plan. Variability: ≥3 part complexities (2-setup, 4-setup, 6-setup mill-turn). Adversarial: cycle in feature graph, infeasible workholding rotation.",
        files_to_modify: ["src/engines/MultiSetupAGISequencerEngine.ts"],
        tests_to_add: ["src/__tests__/MultiSetupAGISequencer.integration.test.ts"] },
      { id: "U-PPGM230", title: "AdaptiveFAISamplingEngine — sigma-history-driven probe density",
        scope: "src/engines/AdaptiveFAISamplingEngine.ts — given (GDT_envelope_per_characteristic, prior_sigma_history_per_characteristic, criticality_class), recommends probe N per characteristic; tight bore + low historical Cpk → N=10; loose dim + high historical Cpk → N=2; explicit confidence + audit trail. Variability: ≥3 characteristic classes. Adversarial: zero history (cold start), characteristic with bimodal historical distribution.",
        files_to_modify: ["src/engines/AdaptiveFAISamplingEngine.ts"],
        tests_to_add: ["src/__tests__/AdaptiveFAISampling.integration.test.ts"] },
      { id: "U-PPGM231", title: "DimensionalReasoningGuardEngine + AISetupImageryEngine",
        scope: "src/engines/DimensionalReasoningGuardEngine.ts — dim_analysis_consistency + Buckingham Pi catches unit errors at wizard input ('25 mm hole, 0.984 in depth' → must be confirmed); plus src/engines/AISetupImageryEngine.ts which uses TextToCADGenerationEngine to render photorealistic setup imagery (operator sees what setup should LOOK like, not just text). Variability: ≥3 unit-mix scenarios + ≥3 setup types. Adversarial: deliberately consistent-but-wrong units, ambiguous photo lighting requirement.",
        files_to_modify: ["src/engines/DimensionalReasoningGuardEngine.ts", "src/engines/AISetupImageryEngine.ts"],
        tests_to_add: ["src/__tests__/DimensionalReasoningGuard.test.ts", "src/__tests__/AISetupImagery.test.ts"] }
    ],
    completion_criteria: [
      "AR overlay tracks machine bed within 2 mm spatial accuracy on Quest 3 + iPad",
      "Voice authoring captures ≥85% of operator narratives correctly on UX test",
      "GD&T-driven probe plan covers 100% of toleranced features on JM Die reference part",
      "Multi-setup AGI sequencer matches programmer's manual sequence on ≥80% of 50-part validation",
      "Adaptive FAI sampling reduces probe time by ≥45% with zero missed escapes on 90-day pilot",
      "Dimensional reasoning catches 10/10 injected unit-mismatch scenarios",
      "AI setup imagery rated ≥7/10 useful by operator UX panel (N≥10)"
    ],
    depends_on: ["PPG-MS7", "PPG-MS13"],
    blocks: [],
    leverage_class: "novel-uses-existing-engines"
  }
];

// Write each novel milestone
for (const m of novelMilestones) {
  m.schemaVersion = "1.0.0";
  m.created_at = NOW;
  m.last_updated = NOW;
  m.total_units = m.units.length;
  m.completed_units = 0;
  m._patches = [PATCH_TAG];
  const fp = path.join(MS_DIR, `${m.id}.json`);
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, JSON.stringify(m, null, 2) + "\n");
    changes.push(`${m.id}: NEW novel milestone ${m.title.split(":")[0]} (${m.units.length} units, ${m.novel_capability_class})`);
  } else {
    // Already exists; skip silently
    changes.push(`${m.id}: already exists, skipped`);
  }
}

// ============================================================
// SUMMARY
// ============================================================
console.log(JSON.stringify({ patched_at: NOW, tag: PATCH_TAG, changes }, null, 2));
