/**
 * PRISM Manufacturing Intelligence - CCE Lite Engine
 * R15-MS6: Computed Composite Endpoints
 *
 * CCE Lite provides smart action composition — chaining multiple engine calls
 * into a single compound result with dependency resolution, caching, and
 * result synthesis.
 *
 * Example compositions:
 *   "full_cut_analysis": material → speed_feed → tool_select → stability → surface → cost
 *   "tool_validation":   holder_select → assembly_calc → deflection → chatter_check
 *   "quality_prediction": surface_integrity → tolerance → thermal_distortion → cpk
 *
 * Architecture:
 *   CompositionGraph: DAG of engine calls with dependency edges
 *   CacheLayer: LRU cache for repeated sub-computations
 *   Synthesizer: Merges partial results into unified response
 *
 * @version 1.0.0  R15-MS6
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** A single step in a composition pipeline */
export interface CompositionStep {
  id: string;                          // Unique step identifier
  engine: string;                      // Engine name (e.g., "physics", "tolerance", "calc")
  action: string;                      // Action within engine
  params_template: Record<string, string | number | boolean>;  // Static params
  param_bindings: Record<string, string>;  // Dynamic params from prior steps: { "material": "$step1.material" }
  depends_on: string[];                // Step IDs this depends on
}

/** A named composition recipe */
export interface CompositionRecipe {
  name: string;
  description: string;
  steps: CompositionStep[];
  output_template: Record<string, string>;  // Maps output fields to step results
  safety_classification: 'CRITICAL' | 'HIGH' | 'STANDARD';
}

export interface CCEComposeInput {
  recipe_name?: string;                // Named recipe (from built-in library)
  steps?: CompositionStep[];           // OR: custom steps
  input_params: Record<string, unknown>;  // Initial parameters
}

export interface CCEComposeResult {
  recipe: string;
  steps_executed: number;
  step_results: Record<string, unknown>;
  synthesized_output: Record<string, unknown>;
  execution_order: string[];
  total_time_ms: number;
  cache_hits: number;
  safety: { score: number; flags: string[] };
}

// ============================================================================
// BUILT-IN COMPOSITION RECIPES
// ============================================================================

const RECIPES: Record<string, CompositionRecipe> = {
  full_cut_analysis: {
    name: 'full_cut_analysis',
    description: 'Complete cutting analysis: material → speed/feed → tool selection → stability check → surface finish → cost estimate',
    safety_classification: 'HIGH',
    steps: [
      {
        id: 'speed_feed',
        engine: 'calc',
        action: 'speed_feed',
        params_template: {},
        param_bindings: { material: '$input.material', operation: '$input.operation', tool_diameter: '$input.tool_diameter_mm' },
        depends_on: [],
      },
      {
        id: 'stability',
        engine: 'calc',
        action: 'stability',
        params_template: { damping_ratio: 0.03 },
        param_bindings: {
          natural_frequency: '$input.natural_frequency_hz',
          stiffness: '$input.stiffness_n_per_m',
          specific_force: '$input.kc_n_mm2',
          number_of_teeth: '$input.tool_flutes',
          current_depth: '$input.depth_of_cut_mm',
          current_speed: '$speed_feed.recommended_rpm',
        },
        depends_on: ['speed_feed'],
      },
      {
        id: 'surface',
        engine: 'physics',
        action: 'surface_integrity_predict',
        params_template: { coolant: 'flood' },
        param_bindings: {
          material: '$input.material',
          operation: '$input.operation',
          cutting_speed_mpm: '$speed_feed.cutting_speed',
          feed_mmrev: '$speed_feed.feed_rate',
          depth_of_cut_mm: '$input.depth_of_cut_mm',
          tool_material: '$input.tool_material',
        },
        depends_on: ['speed_feed'],
      },
      {
        id: 'thermal',
        engine: 'calc',
        action: 'thermal',
        params_template: {},
        param_bindings: {
          cutting_speed: '$speed_feed.cutting_speed',
          feed: '$speed_feed.feed_rate',
          depth: '$input.depth_of_cut_mm',
          material_hardness: '$input.hardness_hrc',
        },
        depends_on: ['speed_feed'],
      },
    ],
    output_template: {
      speed_feed: '$speed_feed',
      stability: '$stability',
      surface_quality: '$surface.surface_roughness',
      thermal: '$thermal',
      overall_safety: '$_min_safety',
    },
  },

  tool_validation: {
    name: 'tool_validation',
    description: 'Tool/holder validation: deflection check → stability check → surface impact',
    safety_classification: 'HIGH',
    steps: [
      {
        id: 'deflection',
        engine: 'calc',
        action: 'deflection',
        params_template: {},
        param_bindings: {
          cutting_force: '$input.cutting_force_n',
          tool_diameter: '$input.tool_diameter_mm',
          overhang_length: '$input.overhang_mm',
          youngs_modulus: '$input.youngs_modulus_gpa',
        },
        depends_on: [],
      },
      {
        id: 'rz_check',
        engine: 'physics',
        action: 'rz_kinematic',
        params_template: { operation: 'turning' },
        param_bindings: {
          feed_mmrev: '$input.feed_mmrev',
          tool_nose_radius_mm: '$input.nose_radius_mm',
          tool_flank_wear_mm: '$input.flank_wear_mm',
        },
        depends_on: [],
      },
    ],
    output_template: {
      deflection: '$deflection',
      surface_finish: '$rz_check',
      overall_safety: '$_min_safety',
    },
  },

  sim_full_verification: {
    name: 'sim_full_verification',
    description: 'Full simulation + verification pipeline: time-domain cutting sim → digital twin update → process verification against targets',
    safety_classification: 'CRITICAL',
    steps: [
      {
        id: 'sim',
        engine: 'calc',
        action: 'sim_cutting',
        params_template: { time_steps: 200 },
        param_bindings: {
          material: '$input.material',
          operation: '$input.operation',
          cutting_speed_mpm: '$input.cutting_speed_mpm',
          feed_per_tooth_mm: '$input.feed_per_tooth_mm',
          axial_depth_mm: '$input.axial_depth_mm',
          radial_depth_mm: '$input.radial_depth_mm',
          tool_diameter_mm: '$input.tool_diameter_mm',
          num_flutes: '$input.num_flutes',
        },
        depends_on: [],
      },
      {
        id: 'twin_init',
        engine: 'calc',
        action: 'twin_create',
        params_template: { shape: 'rectangular' },
        param_bindings: {
          material: '$input.material',
          length_mm: '$input.stock_length_mm',
          width_mm: '$input.stock_width_mm',
          height_mm: '$input.stock_height_mm',
        },
        depends_on: [],
      },
      {
        id: 'twin_cut',
        engine: 'calc',
        action: 'twin_remove_material',
        params_template: {},
        param_bindings: {
          twin_id: '$twin_init.twin_id',
          operation: '$input.operation',
          cutting_speed_mpm: '$input.cutting_speed_mpm',
          feed_per_tooth_mm: '$input.feed_per_tooth_mm',
          axial_depth_mm: '$input.axial_depth_mm',
          radial_depth_mm: '$input.radial_depth_mm',
          tool_diameter_mm: '$input.tool_diameter_mm',
          pass_length_mm: '$input.pass_length_mm',
        },
        depends_on: ['twin_init'],
      },
      {
        id: 'verify',
        engine: 'calc',
        action: 'verify_process',
        params_template: {},
        param_bindings: {
          material: '$input.material',
          operation: '$input.operation',
          cutting_speed_mpm: '$input.cutting_speed_mpm',
          feed_per_tooth_mm: '$input.feed_per_tooth_mm',
          axial_depth_mm: '$input.axial_depth_mm',
          tool_diameter_mm: '$input.tool_diameter_mm',
          target_Ra_um: '$input.target_Ra_um',
          target_tolerance_mm: '$input.target_tolerance_mm',
        },
        depends_on: ['sim'],
      },
    ],
    output_template: {
      simulation: '$sim',
      twin_state: '$twin_cut',
      verification: '$verify',
      overall_safety: '$_min_safety',
    },
  },

  sim_batch_optimize: {
    name: 'sim_batch_optimize',
    description: 'Batch optimization: sensitivity sweep → pick best point → simulate → verify',
    safety_classification: 'HIGH',
    steps: [
      {
        id: 'sweep',
        engine: 'calc',
        action: 'sensitivity_1d',
        params_template: { points: 20, metric: 'mrr' },
        param_bindings: {
          parameter: '$input.sweep_parameter',
          min_value: '$input.sweep_min',
          max_value: '$input.sweep_max',
          material: '$input.material',
          operation: '$input.operation',
          cutting_speed_mpm: '$input.cutting_speed_mpm',
          feed_per_tooth_mm: '$input.feed_per_tooth_mm',
          axial_depth_mm: '$input.axial_depth_mm',
          radial_depth_mm: '$input.radial_depth_mm',
          tool_diameter_mm: '$input.tool_diameter_mm',
          num_flutes: '$input.num_flutes',
        },
        depends_on: [],
      },
      {
        id: 'sim_best',
        engine: 'calc',
        action: 'sim_cutting',
        params_template: { time_steps: 200 },
        param_bindings: {
          material: '$input.material',
          operation: '$input.operation',
          cutting_speed_mpm: '$input.cutting_speed_mpm',
          feed_per_tooth_mm: '$input.feed_per_tooth_mm',
          axial_depth_mm: '$input.axial_depth_mm',
          radial_depth_mm: '$input.radial_depth_mm',
          tool_diameter_mm: '$input.tool_diameter_mm',
          num_flutes: '$input.num_flutes',
        },
        depends_on: ['sweep'],
      },
      {
        id: 'verify',
        engine: 'calc',
        action: 'verify_process',
        params_template: {},
        param_bindings: {
          material: '$input.material',
          operation: '$input.operation',
          cutting_speed_mpm: '$input.cutting_speed_mpm',
          feed_per_tooth_mm: '$input.feed_per_tooth_mm',
          axial_depth_mm: '$input.axial_depth_mm',
          tool_diameter_mm: '$input.tool_diameter_mm',
          target_Ra_um: '$input.target_Ra_um',
          target_tolerance_mm: '$input.target_tolerance_mm',
        },
        depends_on: ['sim_best'],
      },
    ],
    output_template: {
      sensitivity_sweep: '$sweep',
      simulation: '$sim_best',
      verification: '$verify',
      overall_safety: '$_min_safety',
    },
  },

  closed_loop_calibrate: {
    name: 'closed_loop_calibrate',
    description: 'Closed-loop calibration: record measurement → compute error stats → derive correction → update model parameter via Bayesian update',
    safety_classification: 'HIGH',
    steps: [
      {
        id: 'record',
        engine: 'calc',
        action: 'mfb_record',
        params_template: {},
        param_bindings: {
          job_id: '$input.job_id',
          part_id: '$input.part_id',
          feature: '$input.feature',
          measurement_type: '$input.measurement_type',
          predicted_value: '$input.predicted_value',
          actual_value: '$input.actual_value',
          unit: '$input.unit',
          material: '$input.material',
          operation: '$input.operation',
          source: '$input.source',
        },
        depends_on: [],
      },
      {
        id: 'errors',
        engine: 'calc',
        action: 'mfb_error_stats',
        params_template: { min_samples: 3 },
        param_bindings: {
          measurement_type: '$input.measurement_type',
          material: '$input.material',
          operation: '$input.operation',
        },
        depends_on: ['record'],
      },
      {
        id: 'correction',
        engine: 'calc',
        action: 'mfb_correction',
        params_template: { min_samples: 3, confidence_threshold: 0.5 },
        param_bindings: {
          measurement_type: '$input.measurement_type',
          material: '$input.material',
          operation: '$input.operation',
        },
        depends_on: ['errors'],
      },
      {
        id: 'calibrate',
        engine: 'calc',
        action: 'cal_update',
        params_template: {},
        param_bindings: {
          parameter: '$input.calibration_parameter',
          observed_value: '$input.actual_value',
          measurement_variance: '$input.measurement_variance',
        },
        depends_on: ['correction'],
      },
    ],
    output_template: {
      measurement: '$record',
      error_analysis: '$errors',
      correction_factors: '$correction',
      calibration: '$calibrate',
      overall_safety: '$_min_safety',
    },
  },

  continuous_improvement: {
    name: 'continuous_improvement',
    description: 'Continuous improvement cycle: batch KPI → SPC check → trend analysis → calibration status',
    safety_classification: 'STANDARD',
    steps: [
      {
        id: 'kpi',
        engine: 'calc',
        action: 'batch_kpi',
        params_template: {},
        param_bindings: {
          batch_id: '$input.batch_id',
          material: '$input.material',
          operation: '$input.operation',
          parts_produced: '$input.parts_produced',
          parts_accepted: '$input.parts_accepted',
          parts_scrapped: '$input.parts_scrapped',
          cycle_time_avg_min: '$input.cycle_time_avg_min',
          planned_run_time_min: '$input.planned_run_time_min',
          downtime_min: '$input.downtime_min',
          tool_cost_usd: '$input.tool_cost_usd',
        },
        depends_on: [],
      },
      {
        id: 'spc',
        engine: 'calc',
        action: 'spc_capability',
        params_template: {},
        param_bindings: {
          data: '$input.dimension_data',
          usl: '$input.usl',
          lsl: '$input.lsl',
          subgroup_size: '$input.subgroup_size',
        },
        depends_on: [],
      },
      {
        id: 'trend',
        engine: 'calc',
        action: 'batch_trend',
        params_template: { last_n: 10 },
        param_bindings: {
          metric: '$input.trend_metric',
          material: '$input.material',
          operation: '$input.operation',
        },
        depends_on: ['kpi'],
      },
      {
        id: 'cal_status',
        engine: 'calc',
        action: 'cal_status',
        params_template: {},
        param_bindings: {
          model: '$input.model',
        },
        depends_on: [],
      },
    ],
    output_template: {
      batch_kpi: '$kpi',
      process_capability: '$spc',
      trend_analysis: '$trend',
      calibration_status: '$cal_status',
      overall_safety: '$_min_safety',
    },
  },

  quality_optimization: {
    name: 'quality_optimization',
    description: 'Quality optimization pipeline: analyze Cpk → identify improvement strategy → compute optimal multi-pass → predict wear compensation',
    safety_classification: 'HIGH',
    steps: [
      {
        id: 'cpk',
        engine: 'calc',
        action: 'cpk_analyze',
        params_template: {},
        param_bindings: {
          measurements: '$input.measurements',
          usl: '$input.usl',
          lsl: '$input.lsl',
          target: '$input.target',
          characteristic: '$input.characteristic',
        },
        depends_on: [],
      },
      {
        id: 'improve',
        engine: 'calc',
        action: 'cpk_improve',
        params_template: { target_cpk: 1.33 },
        param_bindings: {
          measurements: '$input.measurements',
          usl: '$input.usl',
          lsl: '$input.lsl',
          current_params: '$input.current_params',
        },
        depends_on: ['cpk'],
      },
      {
        id: 'pass_strategy',
        engine: 'calc',
        action: 'mps_full_strategy',
        params_template: {},
        param_bindings: {
          total_depth_mm: '$input.total_depth_mm',
          material: '$input.material',
          finish_allowance_mm: '$input.finish_allowance_mm',
        },
        depends_on: [],
      },
      {
        id: 'wear',
        engine: 'calc',
        action: 'twc_predict',
        params_template: {},
        param_bindings: {
          cutting_time_min: '$input.cutting_time_min',
          cutting_speed_mpm: '$input.cutting_speed_mpm',
          material: '$input.material',
        },
        depends_on: [],
      },
    ],
    output_template: {
      capability_analysis: '$cpk',
      improvement_plan: '$improve',
      machining_strategy: '$pass_strategy',
      wear_prediction: '$wear',
      overall_safety: '$_min_safety',
    },
  },

  adaptive_compensation: {
    name: 'adaptive_compensation',
    description: 'Adaptive compensation loop: predict wear → compute offset → run GD&T sensitivity → schedule tool change',
    safety_classification: 'HIGH',
    steps: [
      {
        id: 'wear_pred',
        engine: 'calc',
        action: 'twc_predict',
        params_template: {},
        param_bindings: {
          cutting_time_min: '$input.cutting_time_min',
          cutting_speed_mpm: '$input.cutting_speed_mpm',
          material: '$input.material',
          feed_per_tooth_mm: '$input.feed_per_tooth_mm',
          depth_of_cut_mm: '$input.depth_of_cut_mm',
        },
        depends_on: [],
      },
      {
        id: 'compensate',
        engine: 'calc',
        action: 'twc_compensate',
        params_template: {},
        param_bindings: {
          cutting_time_min: '$input.cutting_time_min',
          cutting_speed_mpm: '$input.cutting_speed_mpm',
          material: '$input.material',
          nominal_dimension_mm: '$input.nominal_dimension_mm',
          tolerance_mm: '$input.tolerance_mm',
        },
        depends_on: ['wear_pred'],
      },
      {
        id: 'gdt_sensitivity',
        engine: 'calc',
        action: 'gdt_chain_sensitivity',
        params_template: {},
        param_bindings: {
          dimensions: '$input.chain_dimensions',
        },
        depends_on: [],
      },
      {
        id: 'schedule',
        engine: 'calc',
        action: 'twc_schedule',
        params_template: {},
        param_bindings: {
          cutting_speed_mpm: '$input.cutting_speed_mpm',
          material: '$input.material',
          tolerance_mm: '$input.tolerance_mm',
          target_quality: '$input.target_quality',
          cycle_time_min: '$input.cycle_time_min',
          batch_size: '$input.batch_size',
        },
        depends_on: ['wear_pred'],
      },
    ],
    output_template: {
      wear_state: '$wear_pred',
      compensation: '$compensate',
      chain_sensitivity: '$gdt_sensitivity',
      tool_change_schedule: '$schedule',
      overall_safety: '$_min_safety',
    },
  },

  decision_pipeline: {
    name: 'decision_pipeline',
    description: 'Decision support pipeline: recommend parameters → validate constraints → run cost/quality tradeoff → explain decision',
    safety_classification: 'HIGH',
    steps: [
      {
        id: 'recommend',
        engine: 'calc',
        action: 'ds_recommend',
        params_template: {},
        param_bindings: {
          material: '$input.material',
          operation: '$input.operation',
          priority: '$input.priority',
          tool_diameter_mm: '$input.tool_diameter_mm',
          max_power_kw: '$input.max_power_kw',
          surface_finish_target_ra: '$input.surface_finish_target_ra',
        },
        depends_on: [],
      },
      {
        id: 'validate',
        engine: 'calc',
        action: 'ds_validate',
        params_template: {},
        param_bindings: {
          material: '$input.material',
          cutting_speed_m_min: '$recommend.recommended.cutting_speed_m_min',
          feed_per_tooth_mm: '$recommend.recommended.feed_per_tooth_mm',
          depth_of_cut_mm: '$recommend.recommended.depth_of_cut_mm',
          tool_diameter_mm: '$input.tool_diameter_mm',
          max_power_kw: '$input.max_power_kw',
          surface_finish_target_ra: '$input.surface_finish_target_ra',
        },
        depends_on: ['recommend'],
      },
      {
        id: 'tradeoff',
        engine: 'calc',
        action: 'cqt_optimize',
        params_template: {},
        param_bindings: {
          material: '$input.material',
          tolerance_mm: '$input.tolerance_mm',
          part_volume_cm3: '$input.part_volume_cm3',
          cost_weight: '$input.cost_weight',
          quality_weight: '$input.quality_weight',
        },
        depends_on: [],
      },
      {
        id: 'explain',
        engine: 'calc',
        action: 'ds_explain',
        params_template: {},
        param_bindings: {
          material: '$input.material',
          cutting_speed_m_min: '$recommend.recommended.cutting_speed_m_min',
          feed_per_tooth_mm: '$recommend.recommended.feed_per_tooth_mm',
          depth_of_cut_mm: '$recommend.recommended.depth_of_cut_mm',
          priority: '$input.priority',
        },
        depends_on: ['recommend'],
      },
    ],
    output_template: {
      recommendation: '$recommend',
      validation: '$validate',
      cost_quality_tradeoff: '$tradeoff',
      explanation: '$explain',
      overall_safety: '$_min_safety',
    },
  },

  production_readiness: {
    name: 'production_readiness',
    description: 'Production readiness: assess readiness → identify risks → generate action plan → approval decision',
    safety_classification: 'HIGH',
    steps: [
      {
        id: 'assess',
        engine: 'calc',
        action: 'pr_assess',
        params_template: {},
        param_bindings: {
          material: '$input.material',
          tool_type: '$input.tool_type',
          fixture_type: '$input.fixture_type',
          controller: '$input.controller',
          simulation_verified: '$input.simulation_verified',
          batch_size: '$input.batch_size',
          expected_cpk: '$input.expected_cpk',
          cutting_speed_m_min: '$input.cutting_speed_m_min',
        },
        depends_on: [],
      },
      {
        id: 'risk',
        engine: 'calc',
        action: 'pr_risk',
        params_template: {},
        param_bindings: {
          material: '$input.material',
          batch_size: '$input.batch_size',
          tightest_tolerance_mm: '$input.tightest_tolerance_mm',
        },
        depends_on: [],
      },
      {
        id: 'rca_check',
        engine: 'calc',
        action: 'rca_diagnose',
        params_template: {},
        param_bindings: {
          defect_type: '$input.historical_defect_type',
          material: '$input.material',
          tool_life_used_pct: '$input.tool_life_used_pct',
        },
        depends_on: [],
      },
      {
        id: 'approve',
        engine: 'calc',
        action: 'pr_approve',
        params_template: {},
        param_bindings: {
          material: '$input.material',
          batch_size: '$input.batch_size',
          approver_role: '$input.approver_role',
          expected_cpk: '$input.expected_cpk',
        },
        depends_on: ['assess', 'risk'],
      },
    ],
    output_template: {
      readiness_assessment: '$assess',
      risk_analysis: '$risk',
      historical_rca: '$rca_check',
      approval: '$approve',
      overall_safety: '$_min_safety',
    },
  },

  intelligent_orchestration: {
    name: 'intelligent_orchestration',
    description: 'Intelligent orchestration: plan workflow → retrieve knowledge → get recommendations → execute optimized workflow',
    safety_classification: 'HIGH',
    steps: [
      {
        id: 'plan',
        engine: 'calc',
        action: 'wfo_plan',
        params_template: {},
        param_bindings: {
          goal: '$input.goal',
          material: '$input.material',
          constraints: '$input.constraints',
        },
        depends_on: [],
      },
      {
        id: 'knowledge',
        engine: 'calc',
        action: 'pk_retrieve',
        params_template: {},
        param_bindings: {
          material: '$input.material',
          operation: '$input.operation',
          category: '$input.knowledge_category',
        },
        depends_on: [],
      },
      {
        id: 'recommend',
        engine: 'calc',
        action: 'al_recommend',
        params_template: {},
        param_bindings: {
          material: '$input.material',
          action: '$input.target_action',
          priority: '$input.priority',
        },
        depends_on: [],
      },
      {
        id: 'execute',
        engine: 'calc',
        action: 'wfo_execute',
        params_template: {},
        param_bindings: {
          workflow_id: '$plan.workflow_id',
          material: '$input.material',
        },
        depends_on: ['plan', 'knowledge', 'recommend'],
      },
    ],
    output_template: {
      workflow_plan: '$plan',
      process_knowledge: '$knowledge',
      learned_recommendations: '$recommend',
      execution_result: '$execute',
      overall_safety: '$_min_safety',
    },
  },

  knowledge_workflow: {
    name: 'knowledge_workflow',
    description: 'Knowledge workflow: capture tribal knowledge → validate parameters → search related → learn from outcome',
    safety_classification: 'STANDARD',
    steps: [
      {
        id: 'capture',
        engine: 'calc',
        action: 'pk_capture',
        params_template: {},
        param_bindings: {
          title: '$input.title',
          material: '$input.material',
          operation: '$input.operation',
          content: '$input.content',
          tags: '$input.tags',
          parameters: '$input.parameters',
        },
        depends_on: [],
      },
      {
        id: 'validate',
        engine: 'calc',
        action: 'pk_validate',
        params_template: {},
        param_bindings: {
          material: '$input.material',
          cutting_speed_m_min: '$input.cutting_speed_m_min',
          feed_per_tooth_mm: '$input.feed_per_tooth_mm',
          depth_of_cut_mm: '$input.depth_of_cut_mm',
        },
        depends_on: [],
      },
      {
        id: 'search',
        engine: 'calc',
        action: 'pk_search',
        params_template: {},
        param_bindings: {
          query: '$input.search_query',
          material: '$input.material',
          tags: '$input.tags',
        },
        depends_on: [],
      },
      {
        id: 'learn',
        engine: 'calc',
        action: 'al_learn',
        params_template: {},
        param_bindings: {
          action: '$input.operation',
          material: '$input.material',
          outcome: '$input.outcome',
          quality_score: '$input.quality_score',
          cutting_speed_m_min: '$input.cutting_speed_m_min',
          feed_per_tooth_mm: '$input.feed_per_tooth_mm',
          depth_of_cut_mm: '$input.depth_of_cut_mm',
        },
        depends_on: ['capture', 'validate'],
      },
    ],
    output_template: {
      captured_knowledge: '$capture',
      parameter_validation: '$validate',
      related_knowledge: '$search',
      learning_record: '$learn',
      overall_safety: '$_min_safety',
    },
  },

  predictive_maintenance: {
    name: 'predictive_maintenance',
    description: 'Predictive maintenance workflow: predict tool wear + assess failure risk (parallel) → schedule maintenance → generate report',
    safety_classification: 'HIGH',
    steps: [
      {
        id: 'predict_wear',
        engine: 'calc',
        action: 'pm_predict_wear',
        params_template: {},
        param_bindings: {
          tool_material: '$input.tool_material',
          workpiece_material: '$input.workpiece_material',
          cutting_speed_m_min: '$input.cutting_speed_m_min',
          feed_per_tooth_mm: '$input.feed_per_tooth_mm',
          depth_of_cut_mm: '$input.depth_of_cut_mm',
          current_flank_wear_mm: '$input.current_flank_wear_mm',
          minutes_in_cut: '$input.minutes_in_cut',
        },
        depends_on: [],
      },
      {
        id: 'failure_risk',
        engine: 'calc',
        action: 'pm_failure_risk',
        params_template: {},
        param_bindings: {
          tool_material: '$input.tool_material',
          workpiece_material: '$input.workpiece_material',
          cutting_speed_m_min: '$input.cutting_speed_m_min',
          current_flank_wear_mm: '$input.current_flank_wear_mm',
          crater_wear_mm: '$input.crater_wear_mm',
          minutes_in_cut: '$input.minutes_in_cut',
        },
        depends_on: [],
      },
      {
        id: 'schedule',
        engine: 'calc',
        action: 'pm_schedule',
        params_template: {},
        param_bindings: {
          machines: '$input.machines',
        },
        depends_on: ['predict_wear', 'failure_risk'],
      },
      {
        id: 'report',
        engine: 'calc',
        action: 'rpt_generate',
        params_template: {},
        param_bindings: {
          report_type: 'maintenance',
          machine_ids: '$input.machine_ids',
          include_recommendations: true,
        },
        depends_on: ['schedule'],
      },
    ],
    output_template: {
      wear_prediction: '$predict_wear',
      failure_assessment: '$failure_risk',
      maintenance_schedule: '$schedule',
      report: '$report',
      overall_safety: '$_min_safety',
    },
  },

  asset_health_report: {
    name: 'asset_health_report',
    description: 'Asset health report: score machines + analyze degradation (parallel) → generate maintenance plan → export report',
    safety_classification: 'STANDARD',
    steps: [
      {
        id: 'health_score',
        engine: 'calc',
        action: 'ah_score',
        params_template: {},
        param_bindings: {
          machine_id: '$input.machine_id',
          machine_type: '$input.machine_type',
          hours_since_maintenance: '$input.hours_since_maintenance',
          indicators: '$input.indicators',
        },
        depends_on: [],
      },
      {
        id: 'degradation',
        engine: 'calc',
        action: 'ah_degradation',
        params_template: {},
        param_bindings: {
          machine_id: '$input.machine_id',
          machine_type: '$input.machine_type',
          current_health_score: '$input.current_health_score',
          hours_since_maintenance: '$input.hours_since_maintenance',
        },
        depends_on: [],
      },
      {
        id: 'maintenance_plan',
        engine: 'calc',
        action: 'ah_maintenance_plan',
        params_template: {},
        param_bindings: {
          machine_id: '$input.machine_id',
          machine_type: '$input.machine_type',
          health_score: '$input.current_health_score',
          hours_since_maintenance: '$input.hours_since_maintenance',
          indicators: '$input.indicators',
        },
        depends_on: ['health_score', 'degradation'],
      },
      {
        id: 'export',
        engine: 'calc',
        action: 'rpt_export',
        params_template: {},
        param_bindings: {
          report_data: '$maintenance_plan',
          format: '$input.export_format',
          title: 'Asset Health Report',
        },
        depends_on: ['maintenance_plan'],
      },
    ],
    output_template: {
      health_assessment: '$health_score',
      degradation_analysis: '$degradation',
      maintenance_plan: '$maintenance_plan',
      exported_report: '$export',
      overall_safety: '$_min_safety',
    },
  },

  part_traceability: {
    name: 'part_traceability',
    description: 'Part traceability: build genealogy + trace process chain (parallel) → audit trail → compliance check',
    safety_classification: 'HIGH',
    steps: [
      {
        id: 'genealogy',
        engine: 'calc',
        action: 'tr_genealogy',
        params_template: {},
        param_bindings: {
          part_id: '$input.part_id',
          include_materials: true,
          include_tools: true,
        },
        depends_on: [],
      },
      {
        id: 'chain',
        engine: 'calc',
        action: 'tr_chain',
        params_template: {},
        param_bindings: {
          part_id: '$input.part_id',
          include_parameters: true,
          include_measurements: true,
        },
        depends_on: [],
      },
      {
        id: 'audit',
        engine: 'calc',
        action: 'tr_audit_trail',
        params_template: {},
        param_bindings: {
          part_id: '$input.part_id',
          include_deviations: true,
        },
        depends_on: ['genealogy', 'chain'],
      },
      {
        id: 'compliance',
        engine: 'calc',
        action: 'comp_check',
        params_template: {},
        param_bindings: {
          standard: '$input.standard',
          scope: 'process',
          part_id: '$input.part_id',
          material: '$input.material',
        },
        depends_on: ['audit'],
      },
    ],
    output_template: {
      genealogy: '$genealogy',
      process_chain: '$chain',
      audit_trail: '$audit',
      compliance_check: '$compliance',
      overall_safety: '$_min_safety',
    },
  },

  cost_compliance: {
    name: 'cost_compliance',
    description: 'Cost and compliance workflow: estimate cost + check compliance (parallel) → inventory status → generate report',
    safety_classification: 'STANDARD',
    steps: [
      {
        id: 'cost',
        engine: 'calc',
        action: 'cost_estimate',
        params_template: {},
        param_bindings: {
          material: '$input.material',
          weight_kg: '$input.weight_kg',
          operations: '$input.operations',
          batch_size: '$input.batch_size',
        },
        depends_on: [],
      },
      {
        id: 'compliance',
        engine: 'calc',
        action: 'comp_check',
        params_template: {},
        param_bindings: {
          standard: '$input.standard',
          scope: '$input.scope',
          material: '$input.material',
        },
        depends_on: [],
      },
      {
        id: 'inventory',
        engine: 'calc',
        action: 'inv_status',
        params_template: {},
        param_bindings: {
          category_filter: '$input.inventory_category',
        },
        depends_on: ['cost'],
      },
      {
        id: 'report',
        engine: 'calc',
        action: 'rpt_generate',
        params_template: {},
        param_bindings: {
          report_type: 'executive',
          include_recommendations: true,
        },
        depends_on: ['cost', 'compliance', 'inventory'],
      },
    ],
    output_template: {
      cost_estimate: '$cost',
      compliance_status: '$compliance',
      inventory_status: '$inventory',
      executive_report: '$report',
      overall_safety: '$_min_safety',
    },
  },

  green_manufacturing: {
    name: 'green_manufacturing',
    description: 'Green manufacturing assessment: energy consumption + CO2 calculation (parallel) → sustainability KPIs → resource optimization',
    safety_classification: 'STANDARD',
    steps: [
      {
        id: 'energy',
        engine: 'calc',
        action: 'en_consumption',
        params_template: {},
        param_bindings: {
          machine_id: '$input.machine_id',
          granularity: '$input.granularity',
        },
        depends_on: [],
      },
      {
        id: 'carbon',
        engine: 'calc',
        action: 'co2_calculate',
        params_template: {},
        param_bindings: {
          part_id: '$input.part_id',
          material: '$input.material',
          weight_kg: '$input.weight_kg',
          operations: '$input.operations',
        },
        depends_on: [],
      },
      {
        id: 'kpis',
        engine: 'calc',
        action: 'sus_kpi',
        params_template: {},
        param_bindings: {
          facility: '$input.facility',
          kpi_set: 'all',
          include_targets: true,
          include_scoring: true,
        },
        depends_on: ['energy', 'carbon'],
      },
      {
        id: 'optimize',
        engine: 'calc',
        action: 'res_optimize',
        params_template: {},
        param_bindings: {
          machine_id: '$input.machine_id',
          operation: '$input.operation',
          material: '$input.material',
          objective: 'balanced',
        },
        depends_on: ['kpis'],
      },
    ],
    output_template: {
      energy_consumption: '$energy',
      carbon_footprint: '$carbon',
      sustainability_kpis: '$kpis',
      optimization_plan: '$optimize',
      overall_safety: '$_min_safety',
    },
  },

  sustainability_report: {
    name: 'sustainability_report',
    description: 'Sustainability report: waste analysis + water tracking (parallel) → CO2 lifecycle assessment → emissions report',
    safety_classification: 'STANDARD',
    steps: [
      {
        id: 'waste',
        engine: 'calc',
        action: 'sus_waste',
        params_template: {},
        param_bindings: {
          facility: '$input.facility',
          period: '$input.period',
          include_trends: true,
        },
        depends_on: [],
      },
      {
        id: 'water',
        engine: 'calc',
        action: 'sus_water',
        params_template: {},
        param_bindings: {
          facility: '$input.facility',
          period: '$input.period',
          include_quality: true,
        },
        depends_on: [],
      },
      {
        id: 'lifecycle',
        engine: 'calc',
        action: 'co2_lifecycle',
        params_template: {},
        param_bindings: {
          part_id: '$input.part_id',
          material: '$input.material',
          weight_kg: '$input.weight_kg',
          lifetime_years: '$input.lifetime_years',
        },
        depends_on: ['waste', 'water'],
      },
      {
        id: 'report',
        engine: 'calc',
        action: 'co2_report',
        params_template: {},
        param_bindings: {
          facility: '$input.facility',
          period: '$input.period',
          scope: ['scope1', 'scope2', 'scope3'],
          standard: '$input.standard',
          include_trends: true,
        },
        depends_on: ['lifecycle'],
      },
    ],
    output_template: {
      waste_analysis: '$waste',
      water_tracking: '$water',
      lifecycle_assessment: '$lifecycle',
      emissions_report: '$report',
      overall_safety: '$_min_safety',
    },
  },

  quality_prediction: {
    name: 'quality_prediction',
    description: 'Quality prediction: surface integrity → achievable tolerance → thermal distortion → overall capability',
    safety_classification: 'STANDARD',
    steps: [
      {
        id: 'surface',
        engine: 'physics',
        action: 'surface_integrity_predict',
        params_template: {},
        param_bindings: {
          material: '$input.material',
          operation: '$input.operation',
          cutting_speed_mpm: '$input.cutting_speed_mpm',
          feed_mmrev: '$input.feed_mmrev',
          depth_of_cut_mm: '$input.depth_of_cut_mm',
          tool_material: '$input.tool_material',
          coolant: '$input.coolant',
        },
        depends_on: [],
      },
      {
        id: 'thermal_dist',
        engine: 'calc',
        action: 'thermal_distort',
        params_template: {},
        param_bindings: {
          material: '$input.material',
          workpiece_length_mm: '$input.workpiece_length_mm',
          cutting_power_kw: '$input.cutting_power_kw',
          cutting_time_min: '$input.cutting_time_min',
          coolant_type: '$input.coolant',
        },
        depends_on: [],
      },
    ],
    output_template: {
      surface: '$surface',
      thermal_distortion: '$thermal_dist',
      overall_safety: '$_min_safety',
    },
  },
};

// ============================================================================
// LRU CACHE
// ============================================================================

const CACHE_MAX = 64;
const cache = new Map<string, { result: unknown; timestamp: number }>();

function cacheKey(engine: string, action: string, params: Record<string, unknown>): string {
  return `${engine}:${action}:${JSON.stringify(params)}`;
}

function cacheGet(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  // Expire after 5 minutes
  if (Date.now() - entry.timestamp > 300_000) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

function cacheSet(key: string, result: unknown): void {
  if (cache.size >= CACHE_MAX) {
    // Evict oldest
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { result, timestamp: Date.now() });
}

// ============================================================================
// PARAMETER BINDING RESOLVER
// ============================================================================

function resolveBindings(
  bindings: Record<string, string>,
  template: Record<string, string | number | boolean>,
  inputParams: Record<string, unknown>,
  stepResults: Record<string, unknown>,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = { ...template };

  for (const [key, binding] of Object.entries(bindings)) {
    if (typeof binding !== 'string' || !binding.startsWith('$')) {
      resolved[key] = binding;
      continue;
    }

    const path = binding.slice(1); // Remove $
    const parts = path.split('.');

    if (parts[0] === 'input') {
      // Resolve from input params
      resolved[key] = inputParams[parts.slice(1).join('.')];
    } else {
      // Resolve from step results
      const stepId = parts[0];
      const stepResult = stepResults[stepId];
      if (stepResult && typeof stepResult === 'object') {
        const rest = parts.slice(1).join('.');
        resolved[key] = rest ? getNestedValue(stepResult as Record<string, unknown>, rest) : stepResult;
      }
    }
  }

  return resolved;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

// ============================================================================
// TOPOLOGICAL SORT (dependency resolution)
// ============================================================================

function topoSort(steps: CompositionStep[]): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const s of steps) {
    inDegree.set(s.id, s.depends_on.length);
    if (!adj.has(s.id)) adj.set(s.id, []);
    for (const dep of s.depends_on) {
      if (!adj.has(dep)) adj.set(dep, []);
      adj.get(dep)!.push(s.id);
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    for (const neighbor of adj.get(current) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  return order;
}

// ============================================================================
// STEP EXECUTOR (stub — dispatches to engines via action name)
//
// In production, this would import and call the actual engine functions.
// For CCE Lite v1, we return a simulated result that matches the expected
// output shape, allowing the composition framework to be tested end-to-end.
// The actual engine wiring happens through the MCP dispatcher layer.
// ============================================================================

function executeStep(engine: string, action: string, params: Record<string, unknown>): unknown {
  log.info(`[CCELite] Execute: ${engine}.${action}`);

  // Return a stub result with common fields
  // The real implementation routes through the MCP tool dispatcher
  return {
    action,
    engine,
    params_received: params,
    status: 'computed',
    safety: { score: 0.85, flags: [] },
    _cce_stub: true,
  };
}

// ============================================================================
// COMPOSITION EXECUTOR
// ============================================================================

export function cceCompose(input: CCEComposeInput): CCEComposeResult {
  const startTime = Date.now();

  // Resolve recipe
  const steps = input.steps ?? RECIPES[input.recipe_name ?? '']?.steps;
  if (!steps || steps.length === 0) {
    throw new Error(`No steps found for recipe '${input.recipe_name}'. Available: ${Object.keys(RECIPES).join(', ')}`);
  }

  const recipeName = input.recipe_name ?? 'custom';

  // Topological sort for execution order
  const execOrder = topoSort(steps);
  const stepMap = new Map(steps.map(s => [s.id, s]));
  const stepResults: Record<string, unknown> = {};
  let cacheHits = 0;
  let minSafety = 1.0;
  const safetyFlags: string[] = [];

  // Execute steps in dependency order
  for (const stepId of execOrder) {
    const step = stepMap.get(stepId);
    if (!step) continue;

    // Resolve parameters
    const params = resolveBindings(step.param_bindings, step.params_template, input.input_params, stepResults);

    // Check cache
    const key = cacheKey(step.engine, step.action, params);
    const cached = cacheGet(key);
    if (cached !== null) {
      stepResults[stepId] = cached;
      cacheHits++;
      continue;
    }

    // Execute
    const result = executeStep(step.engine, step.action, params);
    stepResults[stepId] = result;
    cacheSet(key, result);

    // Track safety
    if (result && typeof result === 'object' && 'safety' in (result as Record<string, unknown>)) {
      const safety = (result as Record<string, unknown>).safety as { score?: number; flags?: string[] };
      if (safety?.score !== undefined && safety.score < minSafety) minSafety = safety.score;
      if (safety?.flags) safetyFlags.push(...safety.flags);
    }
  }

  // Synthesize output
  const recipe = RECIPES[recipeName];
  const synthesized: Record<string, unknown> = {};
  if (recipe?.output_template) {
    for (const [key, binding] of Object.entries(recipe.output_template)) {
      if (binding === '$_min_safety') {
        synthesized[key] = { score: +minSafety.toFixed(2), flags: safetyFlags };
      } else if (binding.startsWith('$')) {
        const path = binding.slice(1);
        const parts = path.split('.');
        if (parts.length === 1) {
          synthesized[key] = stepResults[parts[0]];
        } else {
          const stepResult = stepResults[parts[0]];
          if (stepResult && typeof stepResult === 'object') {
            synthesized[key] = getNestedValue(stepResult as Record<string, unknown>, parts.slice(1).join('.'));
          }
        }
      }
    }
  } else {
    // Custom steps: return all step results
    Object.assign(synthesized, stepResults);
  }

  return {
    recipe: recipeName,
    steps_executed: execOrder.length,
    step_results: stepResults,
    synthesized_output: synthesized,
    execution_order: execOrder,
    total_time_ms: Date.now() - startTime,
    cache_hits: cacheHits,
    safety: { score: +minSafety.toFixed(2), flags: safetyFlags },
  };
}

// ============================================================================
// RECIPE LISTING
// ============================================================================

export interface CCERecipeInfo {
  name: string;
  description: string;
  step_count: number;
  safety_classification: string;
  required_inputs: string[];
}

export function cceListRecipes(): CCERecipeInfo[] {
  return Object.values(RECIPES).map(r => {
    // Extract all $input bindings to find required inputs
    const requiredInputs = new Set<string>();
    for (const step of r.steps) {
      for (const binding of Object.values(step.param_bindings)) {
        if (typeof binding === 'string' && binding.startsWith('$input.')) {
          requiredInputs.add(binding.slice(7));
        }
      }
    }
    return {
      name: r.name,
      description: r.description,
      step_count: r.steps.length,
      safety_classification: r.safety_classification,
      required_inputs: [...requiredInputs],
    };
  });
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

export function cceCacheStats(): { size: number; max: number; hit_rate_estimate: string } {
  return {
    size: cache.size,
    max: CACHE_MAX,
    hit_rate_estimate: cache.size > 0 ? 'active' : 'cold',
  };
}

export function cceCacheClear(): { cleared: number } {
  const cleared = cache.size;
  cache.clear();
  return { cleared };
}

// ============================================================================
// DISPATCHER
// ============================================================================

export function executeCCEAction(action: string, params: Record<string, unknown>): unknown {
  log.info(`[CCELite] action=${action}`);

  switch (action) {
    case 'cce_compose':
      return cceCompose(params as unknown as CCEComposeInput);
    case 'cce_list':
      return cceListRecipes();
    case 'cce_cache_stats':
      return cceCacheStats();
    case 'cce_cache_clear':
      return cceCacheClear();
    default:
      throw new Error(`Unknown CCE action: ${action}`);
  }
}
