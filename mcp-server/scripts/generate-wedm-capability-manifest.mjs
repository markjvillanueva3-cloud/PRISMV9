#!/usr/bin/env node
/**
 * WEDM-ERP / U-P1.5-OS-03 — Generate WEDM_CAPABILITY_MANIFEST.json
 *
 * Scans src/engines/ for every WEDM/WireEDM/EDM engine, categorizes by
 * keyword heuristic, emits canonical manifest with inputs/outputs so
 * AutoPrintToProgramBridgeEngine can route any wire-EDM job against
 * the actual on-disk engine inventory (not a stale list).
 *
 * Run: node scripts/generate-wedm-capability-manifest.mjs
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');
const ENGINE_DIR = join(REPO, 'src/engines');
const OUT_PATH = join(REPO, 'data/state/WEDM_CAPABILITY_MANIFEST.json');

const CATEGORY_RULES = [
  // [category, keyword-match predicate, input-types, output-types]
  {
    cat: 'geometry_import',
    test: (n) => /Dwg|Drawing|DXFClosure|Import/.test(n),
    inputs: ['dxf', 'dwg', 'step', 'iges'],
    outputs: ['geometry', 'contours', 'features'],
  },
  {
    cat: 'feature_recognition',
    test: (n) => /PartRecognition|Feature/.test(n),
    inputs: ['geometry'],
    outputs: ['features', 'feature_types'],
  },
  {
    cat: 'physics',
    test: (n) => /CornerPhysics|WireHeating|WireDeflection|DielectricCorrection|DielectricFlush|KerfWidth|TaperError|StartPoint|ThinWireDerate/.test(n),
    inputs: ['cutting_params', 'wire_props', 'material'],
    outputs: ['physics_prediction', 'compensation'],
  },
  {
    cat: 'safety_validation',
    test: (n) => /CurrentDensity|PowerDensity|PulseLimit|Failsafe|HeadClearance|SafetyEnvelope|ProgramSafetyGate|PreFlight|Fixture/.test(n),
    inputs: ['toolpath', 'machine', 'fixture'],
    outputs: ['safety_check', 'envelope_result'],
  },
  {
    cat: 'parameter_calculation',
    test: (n) => /Parameter|MaterialSpark|MaterialMachineWire|MaterialCharacterization|CuttingParam|AdaptivePass/.test(n),
    inputs: ['material', 'wire', 'machine', 'thickness'],
    outputs: ['cutting_params', 'spark_params'],
  },
  {
    cat: 'toolpath_strategy',
    test: (n) => /Strategy|MultiPass|Tab|Accessibility|BiMaterial|Slug|Sequencing|WirePathCollision/.test(n),
    inputs: ['features', 'geometry', 'constraints'],
    outputs: ['toolpath', 'pass_plan', 'strategy'],
  },
  {
    cat: 'post_processing',
    test: (n) => /Post|ProgramAssembler|ProgramVerification|PostDialect|GCode/.test(n),
    inputs: ['toolpath', 'controller_dialect'],
    outputs: ['gcode', 'program_text'],
  },
  {
    cat: 'quality_monitoring',
    test: (n) => /Quality|SurfaceIntegrity|Calibration|ProductionReadiness|Monitor/.test(n),
    inputs: ['program', 'measurements'],
    outputs: ['quality_metrics', 'surface_prediction'],
  },
  {
    cat: 'business',
    test: (n) => /InvoiceLine|JobCost|CreditCost|OverageApproval|WirePremiumROI|WireBreakRiskCost|CostDocumentation|Scheduling|Invoice/.test(n),
    inputs: ['job_spec', 'actuals'],
    outputs: ['cost', 'invoice', 'schedule'],
  },
  {
    cat: 'workflow',
    test: (n) => /JobCreator|SetupSheet|QuoteBridge|ProgressTracker|RecipeAdaptation|ArchiveBackfill|MultiProfileBatch/.test(n),
    inputs: ['job_spec', 'template'],
    outputs: ['job_packet', 'setup_sheet', 'workflow_state'],
  },
  {
    cat: 'ai_reasoning',
    test: (n) => /CalculatorAI|ReasoningBridge|ReasoningTrace|AnalogicalReasoning|DeepReasoning|DeepLogic|DeepNeuralReasoning|ResearchAI|Causality/.test(n),
    inputs: ['problem', 'context'],
    outputs: ['reasoning', 'analogies', 'trace'],
  },
  {
    cat: 'machine_learning',
    test: (n) => /NeuralTraining|NeuralFormulaFusion|Prototypical|FewShot|ContinuousLearning|KnowledgeDistillation|AdvancedNeural|PredictiveIntelligence|NeuralAnalysis/.test(n),
    inputs: ['training_data', 'features'],
    outputs: ['model', 'prediction'],
  },
  {
    cat: 'simulation',
    test: (n) => /VirtualMachine|WhatIf|Rollout/.test(n),
    inputs: ['program', 'scenario'],
    outputs: ['simulation', 'outcome'],
  },
  {
    cat: 'autonomy',
    test: (n) => /Autonomy|HumanHandoff|RLController|RewardShaping|RolloutSimulator|AutonomyAudit|SubstrateGate/.test(n),
    inputs: ['state', 'decision'],
    outputs: ['autonomous_action', 'gate_decision'],
  },
  {
    cat: 'diagnostics',
    test: (n) => /FaultDiagnosis|DriftDetection|Degradation|RULEngine|MaintenanceScheduler|ExceptionHandler/.test(n),
    inputs: ['symptoms', 'metrics'],
    outputs: ['diagnosis', 'drift_alert', 'rul'],
  },
  {
    cat: 'feedback_learning',
    test: (n) => /Feedback|TribalTip|TribalRuntime|LearningLoop|JobPatternLearner|DeviationToTip/.test(n),
    inputs: ['operator_feedback', 'measurement'],
    outputs: ['learned_rule', 'calibration'],
  },
  {
    cat: 'knowledge_synthesis',
    test: (n) => /KnowledgeSynthesis|CAMKnowledge|UnifiedScience|TechData|BenchmarkTolerance/.test(n),
    inputs: ['sources', 'query'],
    outputs: ['synthesized_knowledge'],
  },
  {
    cat: 'orchestration',
    test: (n) => /AGIOrchestrator|NeuralOrchestration|MasterAI|MultiAgentDispatch|HierarchicalPlanner|CompleteOrchestration|ProgramOptimizer/.test(n),
    inputs: ['job', 'task'],
    outputs: ['orchestrated_result', 'plan'],
  },
  {
    cat: 'state_management',
    test: (n) => /MachineState|Blackboard|Governance|Settings|ProgramParser/.test(n),
    inputs: ['key', 'state_delta'],
    outputs: ['state', 'stored_value'],
  },
  {
    cat: 'awareness',
    test: (n) => /SelfAwareness|AwarenessAdoption|ActiveQuery|CitationCheck|SelfAwarenessIntegration/.test(n),
    inputs: ['query'],
    outputs: ['awareness', 'citation_check'],
  },
  {
    cat: 'caching_optimization',
    test: (n) => /ParetoCache|ParetoFrontier|KalmanFusion|ModelUpdate|DeepAIHardening/.test(n),
    inputs: ['query', 'measurements'],
    outputs: ['cached_result', 'pareto_front'],
  },
  {
    cat: 'analysis',
    test: (n) => /BatchProgramAnalyzer|ProgramComparison|Tradeoff/.test(n),
    inputs: ['programs', 'options'],
    outputs: ['analysis', 'comparison'],
  },
];

const FALLBACK = {
  cat: 'specialized',
  inputs: ['params'],
  outputs: ['result'],
};

const WEDM_ENGINE_RE = /^(WEDM|WireEDM|EDM)[A-Z].*Engine\.ts$/;

function categorize(engineName) {
  for (const rule of CATEGORY_RULES) {
    if (rule.test(engineName)) {
      return { cat: rule.cat, inputs: rule.inputs, outputs: rule.outputs };
    }
  }
  return FALLBACK;
}

function main() {
  const files = readdirSync(ENGINE_DIR)
    .filter((f) => WEDM_ENGINE_RE.test(f))
    .sort();

  const engines = {};
  for (const file of files) {
    const engineName = file.replace(/\.ts$/, '');
    const { cat, inputs, outputs } = categorize(engineName);
    if (!engines[cat]) engines[cat] = [];
    engines[cat].push({
      name: engineName,
      category: cat,
      inputs,
      outputs,
      module: `./${engineName}.js`,
    });
  }

  const totalEngines = files.length;
  const categoryCounts = Object.fromEntries(
    Object.entries(engines).map(([k, v]) => [k, v.length]),
  );

  const today = new Date().toISOString().slice(0, 10);

  const manifest = {
    schemaVersion: 2,
    created: '2026-04-17',
    updated: today,
    track: 'WEDM-CONSOLIDATED',
    milestone: 'MS-P1.5-ONESHOT',
    unit: 'U-P1.5-OS-03',
    description:
      'Complete Wire EDM capability inventory for AutoPrintToProgramBridgeEngine routing — auto-generated from src/engines/ filesystem scan. Regenerate via scripts/generate-wedm-capability-manifest.mjs.',
    generated_by: 'scripts/generate-wedm-capability-manifest.mjs',
    process_type: 'wire_edm',
    feature_types: [
      'closed_profile_cut',
      'taper_cut',
      'multi_pass_skim',
      'start_hole',
      'wire_profile',
      'slug_drop',
      'corner_rounding',
      'wire_contour',
      'wire_pocket',
      'wire_slot',
      'wire_hole',
      'wire_taper',
      'wire_corner',
      'wire_tab',
    ],
    primary_pipeline: 'WireEDMAIPrintToProgramEngine',
    entry_points: [
      'WireEDMAIPrintToProgramEngine',
      'WEDMPrintToProgramEngine',
      'WEDMCompleteOrchestrationEngine',
      'WireEDMAGIOrchestrator',
      'WireEDMMasterAIEngine',
    ],
    autobridge_route: {
      process_match: 'wire_edm',
      engine: 'WireEDMAIPrintToProgramEngine',
      method: 'generate',
      required_inputs: [
        'material',
        'thickness_mm',
        'contours',
      ],
      optional_inputs: [
        'hardness_hrc',
        'target_ra_um',
        'tolerance_mm',
        'taper_angle_deg',
        'machine_id',
        'wire_diameter_mm',
        'reasoning_mode',
        'optimization_objective',
      ],
      produces: [
        'gcode',
        'passes',
        'cycle_time',
        'confidence',
        'reasoning_chain',
        'counterfactuals',
      ],
    },
    total_engines: totalEngines,
    category_counts: categoryCounts,
    engines,
    supported_controllers: [
      'mitsubishi_fa',
      'mitsubishi_mv',
      'sodick_aq',
      'sodick_al',
      'makino_u',
      'makino_eu',
      'agie_cut',
      'agie_progress',
      'fanuc_robocut',
    ],
    supported_wire_types: [
      'brass_0.20',
      'brass_0.25',
      'brass_0.30',
      'coated_0.20',
      'coated_0.25',
      'coated_0.30',
      'molybdenum_0.18',
      'tungsten_0.10',
    ],
    pipeline_stages: [
      'geometry_import',
      'feature_recognition',
      'parameter_calculation',
      'toolpath_strategy',
      'physics',
      'safety_validation',
      'post_processing',
      'quality_monitoring',
      'autonomy',
      'documentation',
    ],
  };

  writeFileSync(OUT_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`✓ Wrote ${OUT_PATH}`);
  console.log(`  total_engines: ${totalEngines}`);
  console.log(`  categories: ${Object.keys(engines).length}`);
  for (const [cat, count] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${cat.padEnd(24)} ${count}`);
  }
}

main();
