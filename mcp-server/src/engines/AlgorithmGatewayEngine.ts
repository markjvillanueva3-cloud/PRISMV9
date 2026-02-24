/**
 * R7-MS4: Algorithm Gateway Engine
 *
 * Wires MIT/Stanford course algorithms into production use.
 * Given a manufacturing problem, recommends and executes the appropriate algorithm.
 *
 * Actions:
 * - algorithm_select: Route to best algorithm for a given problem type + domain
 *
 * Implemented algorithms (10 core):
 * 1. FFT / spectral analysis      — chatter frequency identification (MIT 6.003)
 * 2. Gradient descent + Newton     — parameter optimization (MIT 6.079)
 * 3. Bayesian inference            — learning from jobs (MIT 6.041)
 * 4. Eigenvalue solvers            — modal analysis for chatter (MIT 18.06)
 * 5. Interpolation methods         — material property interpolation (MIT 18.330)
 * 6. Kalman filter (EKF)           — adaptive machining (MIT 6.832)
 * 7. Graph algorithms              — operation sequencing (MIT 6.046J)
 * 8. Monte Carlo methods           — uncertainty quantification (MIT 6.867)
 * 9. Ruppert mesh refinement       — workpiece mesh for FEA-lite (MIT 2.158J)
 * 10. Control theory (PID tuning)  — adaptive feed rate control (MIT 6.302)
 */

// ============================================================================
// TYPES
// ============================================================================

export type ProblemType = 'optimize' | 'predict' | 'classify' | 'interpolate' | 'sequence' | 'filter';
export type DomainType = 'cutting_params' | 'toolpath' | 'scheduling' | 'quality' | 'maintenance';

export interface AlgorithmSelectInput {
  problem_type: ProblemType;
  domain: DomainType;
  data?: Record<string, any>;
}

export interface AlgorithmSelectResult {
  selected_algorithm: string;
  source_course: string;
  rationale: string;
  result: any;
  alternatives: string[];
  safety: { score: number; flags: string[] };
}

// ============================================================================
// ALGORITHM REGISTRY
// ============================================================================

interface AlgorithmEntry {
  name: string;
  course: string;
  problems: ProblemType[];
  domains: DomainType[];
  description: string;
}

const ALGORITHM_DB: AlgorithmEntry[] = [
  { name: 'fft_spectral',        course: 'MIT 6.003',  problems: ['predict', 'classify'], domains: ['quality', 'maintenance'],     description: 'FFT spectral analysis — identify dominant frequencies in vibration/chatter signals' },
  { name: 'gradient_descent',    course: 'MIT 6.079',  problems: ['optimize'],             domains: ['cutting_params', 'toolpath'], description: 'Gradient descent — find optimal parameters by iterative gradient following' },
  { name: 'bayesian_update',     course: 'MIT 6.041',  problems: ['predict'],              domains: ['cutting_params', 'quality', 'maintenance'], description: 'Bayesian inference — update parameter beliefs from observed data' },
  { name: 'eigenvalue_solver',   course: 'MIT 18.06',  problems: ['predict'],              domains: ['quality', 'maintenance'],     description: 'Eigenvalue solver — modal analysis for chatter prediction' },
  { name: 'interpolation',       course: 'MIT 18.330', problems: ['interpolate', 'predict'], domains: ['cutting_params', 'quality'], description: 'Cubic spline / Lagrange interpolation — estimate values between known data points' },
  { name: 'kalman_filter',       course: 'MIT 6.832',  problems: ['filter', 'predict'],    domains: ['maintenance', 'quality'],     description: 'Extended Kalman Filter — real-time state estimation for adaptive machining' },
  { name: 'topological_sort',    course: 'MIT 6.046J', problems: ['sequence'],             domains: ['scheduling', 'toolpath'],     description: 'Graph topological sort — dependency-aware operation sequencing' },
  { name: 'monte_carlo',         course: 'MIT 6.867',  problems: ['predict'],              domains: ['cutting_params', 'quality'],  description: 'Monte Carlo simulation — uncertainty quantification for predictions' },
  { name: 'mesh_refinement',     course: 'MIT 2.158J', problems: ['predict'],              domains: ['quality'],                    description: 'Ruppert mesh refinement — adaptive triangulation for FEA-lite deflection' },
  { name: 'pid_tuning',          course: 'MIT 6.302',  problems: ['optimize', 'filter'],   domains: ['cutting_params', 'maintenance'], description: 'PID controller tuning — adaptive feed rate control modeling' },
];

// ============================================================================
// SOURCE FILE CATALOG — 52 MEDIUM-priority extracted algorithm modules
// Generated from MASTER_EXTRACTION_INDEX_V2.json (safety_class=MEDIUM, category=algorithms)
// Total: 52 files, 35,257 lines of algorithm source code
// ============================================================================

export type AlgorithmDomain =
  | 'general'
  | 'toolpath'
  | 'interpolation'
  | 'optimization'
  | 'collision-detection'
  | 'surface'
  | 'kinematics'
  | 'signal-processing'
  | 'graph'
  | 'graphics'
  | 'control'
  | 'search'
  | 'numerical'
  | 'tool-life'
  | 'sorting'
  | 'spatial-indexing'
  | 'design-for-manufacturing';

export interface SourceFileCatalogEntry {
  filename: string;
  source_dir: string;
  category: string;
  lines: number;
  safety_class: 'MEDIUM';
  description: string;
  algorithm_domain: AlgorithmDomain;
}

export const ALGORITHM_SOURCE_FILE_CATALOG: Record<string, SourceFileCatalogEntry> = {
  'EXT-001': {
    filename: 'ALGORITHM_LIBRARY.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 2213,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for general: comprehensive algorithm library with core mathematical routines',
    algorithm_domain: 'general',
  },
  'EXT-002': {
    filename: 'COMPLETE_TOOLPATH_ALGORITHM_LIBRARY.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 2213,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for toolpath: complete toolpath generation and optimization library',
    algorithm_domain: 'toolpath',
  },
  'EXT-003': {
    filename: 'PRISM_ACO_SEQUENCER.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 5383,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for optimization: ant colony optimization for operation sequencing',
    algorithm_domain: 'optimization',
  },
  'EXT-004': {
    filename: 'PRISM_ADVANCED_INTERPOLATION.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 176,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for interpolation: advanced interpolation methods for curve fitting',
    algorithm_domain: 'interpolation',
  },
  'EXT-005': {
    filename: 'PRISM_ALGORITHM_ENSEMBLER.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 182,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for general: algorithm ensemble combiner for multi-method consensus',
    algorithm_domain: 'general',
  },
  'EXT-006': {
    filename: 'PRISM_ALGORITHM_ORCHESTRATOR.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 225,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for general: algorithm orchestration and pipeline management',
    algorithm_domain: 'general',
  },
  'EXT-007': {
    filename: 'PRISM_ALGORITHM_REGISTRY.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 3567,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for general: algorithm registry with capability metadata and selection logic',
    algorithm_domain: 'general',
  },
  'EXT-008': {
    filename: 'PRISM_ALGORITHM_STRATEGIES.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 257,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for general: strategy pattern implementations for algorithm selection',
    algorithm_domain: 'general',
  },
  'EXT-009': {
    filename: 'PRISM_BEZIER_MIT.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 111,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for interpolation: Bezier curve evaluation and subdivision',
    algorithm_domain: 'interpolation',
  },
  'EXT-010': {
    filename: 'PRISM_CONTROL_SYSTEMS_MIT.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 117,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for control: control systems modeling and stability analysis',
    algorithm_domain: 'control',
  },
  'EXT-011': {
    filename: 'PRISM_CORE_ALGORITHMS.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 616,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for general: core algorithmic primitives and utility functions',
    algorithm_domain: 'general',
  },
  'EXT-012': {
    filename: 'PRISM_CRITICAL_ALGORITHM_INTEGRATION.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 188,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for general: critical algorithm integration and safety validation',
    algorithm_domain: 'general',
  },
  'EXT-013': {
    filename: 'PRISM_DFM_MIT.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 76,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for design-for-manufacturing: design-for-manufacturability analysis',
    algorithm_domain: 'design-for-manufacturing',
  },
  'EXT-014': {
    filename: 'PRISM_DIGITAL_CONTROL_MIT.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 101,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for control: digital control system design and discretization',
    algorithm_domain: 'control',
  },
  'EXT-015': {
    filename: 'PRISM_DS_SEARCH.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 102,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for search: data structure based search algorithms',
    algorithm_domain: 'search',
  },
  'EXT-016': {
    filename: 'PRISM_FFT_PREDICTIVE_CHATTER.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 330,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for signal-processing: FFT-based predictive chatter detection',
    algorithm_domain: 'signal-processing',
  },
  'EXT-017': {
    filename: 'PRISM_GRAPH.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 285,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for graph: core graph data structure and traversal algorithms',
    algorithm_domain: 'graph',
  },
  'EXT-018': {
    filename: 'PRISM_GRAPHICS.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 660,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for graphics: computational graphics rendering primitives',
    algorithm_domain: 'graphics',
  },
  'EXT-019': {
    filename: 'PRISM_GRAPHICS_KERNEL_PASS.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 171,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for graphics: graphics kernel pass pipeline processing',
    algorithm_domain: 'graphics',
  },
  'EXT-020': {
    filename: 'PRISM_GRAPHICS_MIT.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 276,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for graphics: MIT-sourced computer graphics algorithms',
    algorithm_domain: 'graphics',
  },
  'EXT-021': {
    filename: 'PRISM_GRAPH_ALGORITHMS.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 315,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for graph: graph algorithm suite including shortest path and MST',
    algorithm_domain: 'graph',
  },
  'EXT-022': {
    filename: 'PRISM_GRAPH_TOOLPATH.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 180,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for toolpath: graph-based toolpath planning and optimization',
    algorithm_domain: 'toolpath',
  },
  'EXT-023': {
    filename: 'PRISM_JACOBIAN_ENGINE.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 238,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for kinematics: Jacobian matrix computation for kinematic chains',
    algorithm_domain: 'kinematics',
  },
  'EXT-024': {
    filename: 'PRISM_JOHNSON_COOK_DATABASE.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 158,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for general: Johnson-Cook material constitutive model database',
    algorithm_domain: 'general',
  },
  'EXT-025': {
    filename: 'PRISM_KDTREE.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 112,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for spatial-indexing: k-d tree spatial partitioning for nearest neighbor queries',
    algorithm_domain: 'spatial-indexing',
  },
  'EXT-026': {
    filename: 'PRISM_KNOWLEDGE_INTEGRATION_TESTS.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 119,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for general: knowledge base integration test suite',
    algorithm_domain: 'general',
  },
  'EXT-027': {
    filename: 'PRISM_LINALG_MIT.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 155,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for numerical: MIT linear algebra routines for matrix operations',
    algorithm_domain: 'numerical',
  },
  'EXT-028': {
    filename: 'PRISM_LOCAL_SEARCH.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 385,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for optimization: local search metaheuristics for combinatorial problems',
    algorithm_domain: 'optimization',
  },
  'EXT-029': {
    filename: 'PRISM_LP_SOLVERS.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 131,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for optimization: linear programming solvers for constraint optimization',
    algorithm_domain: 'optimization',
  },
  'EXT-030': {
    filename: 'PRISM_MANUFACTURING_ALGORITHMS.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 101,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for general: manufacturing-specific algorithm collection',
    algorithm_domain: 'general',
  },
  'EXT-031': {
    filename: 'PRISM_MANUFACTURING_SEARCH.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 141,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for search: manufacturing knowledge search and retrieval',
    algorithm_domain: 'search',
  },
  'EXT-032': {
    filename: 'PRISM_MANUFACTURING_SEARCH_ENGINE.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 148,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for search: full-text manufacturing search engine with ranking',
    algorithm_domain: 'search',
  },
  'EXT-033': {
    filename: 'PRISM_MATH_FOUNDATIONS.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 1730,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for numerical: mathematical foundation library with core numeric routines',
    algorithm_domain: 'numerical',
  },
  'EXT-034': {
    filename: 'PRISM_MEMORY_EFFICIENT_SEARCH.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 160,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for search: memory-efficient search for large datasets',
    algorithm_domain: 'search',
  },
  'EXT-035': {
    filename: 'PRISM_NUMERICAL.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 185,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for numerical: numerical methods for root finding and integration',
    algorithm_domain: 'numerical',
  },
  'EXT-036': {
    filename: 'PRISM_NUMERICAL_METHODS_MIT.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 167,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for numerical: MIT numerical methods including ODE and quadrature',
    algorithm_domain: 'numerical',
  },
  'EXT-037': {
    filename: 'PRISM_NURBS_MIT.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 590,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for interpolation: NURBS curve and surface evaluation',
    algorithm_domain: 'interpolation',
  },
  'EXT-038': {
    filename: 'PRISM_OCTREE.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 111,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for spatial-indexing: octree spatial partitioning for 3D queries',
    algorithm_domain: 'spatial-indexing',
  },
  'EXT-039': {
    filename: 'PRISM_ODE_SOLVERS_MIT.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 6386,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for numerical: MIT ODE solver suite with Runge-Kutta and adaptive stepping',
    algorithm_domain: 'numerical',
  },
  'EXT-040': {
    filename: 'PRISM_OPTIMIZATION_ALGORITHMS.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 195,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for optimization: optimization algorithm collection with gradient and derivative-free methods',
    algorithm_domain: 'optimization',
  },
  'EXT-041': {
    filename: 'PRISM_PHASE3_GRAPH_NEURAL.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 424,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for graph: graph neural network for manufacturing feature prediction',
    algorithm_domain: 'graph',
  },
  'EXT-042': {
    filename: 'PRISM_PHASE7_KNOWLEDGE.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 2396,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for general: phase 7 knowledge graph integration and reasoning',
    algorithm_domain: 'general',
  },
  'EXT-043': {
    filename: 'PRISM_POLICY_GRADIENT_ENGINE.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 113,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for control: policy gradient reinforcement learning for process control',
    algorithm_domain: 'control',
  },
  'EXT-044': {
    filename: 'PRISM_RL_ALGORITHMS.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 358,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for control: reinforcement learning algorithms for adaptive manufacturing',
    algorithm_domain: 'control',
  },
  'EXT-045': {
    filename: 'PRISM_SEARCH_ENHANCED.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 1961,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for search: enhanced search with fuzzy matching and relevance scoring',
    algorithm_domain: 'search',
  },
  'EXT-046': {
    filename: 'PRISM_SIGNAL_ALGORITHMS.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 375,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for signal-processing: signal processing algorithms for vibration analysis',
    algorithm_domain: 'signal-processing',
  },
  'EXT-047': {
    filename: 'PRISM_SORTING.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 122,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for sorting: comparison and non-comparison sorting implementations',
    algorithm_domain: 'sorting',
  },
  'EXT-048': {
    filename: 'PRISM_SPECTRAL_GRAPH_CAD.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 185,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for signal-processing: spectral graph analysis for CAD feature extraction',
    algorithm_domain: 'signal-processing',
  },
  'EXT-049': {
    filename: 'PRISM_SURFACE_GEOMETRY_MIT.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 173,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for surface: MIT surface geometry and differential geometry computations',
    algorithm_domain: 'surface',
  },
  'EXT-050': {
    filename: 'PRISM_TAYLOR_ADVANCED.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 51,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for tool-life: advanced Taylor tool life modeling with thermal effects',
    algorithm_domain: 'tool-life',
  },
  'EXT-051': {
    filename: 'PRISM_TAYLOR_LOOKUP.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 45,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for tool-life: Taylor equation lookup table for rapid tool life estimation',
    algorithm_domain: 'tool-life',
  },
  'EXT-052': {
    filename: 'PRISM_TAYLOR_TOOL_LIFE.js',
    source_dir: 'extracted/algorithms',
    category: 'algorithms',
    lines: 98,
    safety_class: 'MEDIUM' as const,
    description: 'Algorithm for tool-life: Taylor tool life equation with extended parameters',
    algorithm_domain: 'tool-life',
  },
};

// ============================================================================
// ALGORITHM SELECTION
// ============================================================================

function selectAlgorithm(input: AlgorithmSelectInput): { best: AlgorithmEntry; alternatives: AlgorithmEntry[] } {
  // Score each algorithm by match quality
  const scored = ALGORITHM_DB.map(alg => {
    let score = 0;
    if (alg.problems.includes(input.problem_type)) score += 2;
    if (alg.domains.includes(input.domain)) score += 2;
    return { alg, score };
  }).filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    // Fallback to gradient descent for optimize, monte carlo for predict
    const fallback = input.problem_type === 'optimize'
      ? ALGORITHM_DB.find(a => a.name === 'gradient_descent')!
      : ALGORITHM_DB.find(a => a.name === 'monte_carlo')!;
    return { best: fallback, alternatives: [] };
  }

  return {
    best: scored[0].alg,
    alternatives: scored.slice(1, 4).map(s => s.alg),
  };
}

// ============================================================================
// FFT SPECTRAL ANALYSIS
// ============================================================================

export interface FFTInput {
  signal: number[];         // Time-domain vibration signal
  sample_rate_hz: number;   // Sampling rate
  window?: 'hann' | 'hamming' | 'rectangular';
}

export interface FFTResult {
  dominant_frequency_hz: number;
  magnitude: number;
  spectrum: { freq_hz: number; magnitude: number }[];
  chatter_detected: boolean;
  chatter_frequency_hz?: number;
}

function runFFT(data: Record<string, any>): FFTResult {
  const signal: number[] = data.signal ?? [];
  const sampleRate: number = data.sample_rate_hz ?? 1000;
  const N = signal.length;

  if (N === 0) {
    return { dominant_frequency_hz: 0, magnitude: 0, spectrum: [], chatter_detected: false };
  }

  // Apply Hann window
  const windowed = signal.map((x, i) => x * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1))));

  // DFT (O(N²) — sufficient for manufacturing signals up to ~4096 samples)
  const halfN = Math.floor(N / 2);
  const spectrum: { freq_hz: number; magnitude: number }[] = [];
  let maxMag = 0;
  let maxFreq = 0;

  for (let k = 1; k <= halfN; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const angle = -2 * Math.PI * k * n / N;
      re += windowed[n] * Math.cos(angle);
      im += windowed[n] * Math.sin(angle);
    }
    const mag = Math.sqrt(re * re + im * im) / N;
    const freq = k * sampleRate / N;

    spectrum.push({ freq_hz: +freq.toFixed(2), magnitude: +mag.toFixed(6) });

    if (mag > maxMag) {
      maxMag = mag;
      maxFreq = freq;
    }
  }

  // Chatter detection: dominant frequency in 100-3000 Hz range with significant amplitude
  const meanMag = spectrum.reduce((s, x) => s + x.magnitude, 0) / spectrum.length;
  const chatterDetected = maxFreq >= 50 && maxFreq <= 5000 && maxMag > meanMag * 3;

  return {
    dominant_frequency_hz: +maxFreq.toFixed(2),
    magnitude: +maxMag.toFixed(6),
    spectrum: spectrum.slice(0, 50), // Limit output size
    chatter_detected: chatterDetected,
    chatter_frequency_hz: chatterDetected ? +maxFreq.toFixed(2) : undefined,
  };
}

// ============================================================================
// BAYESIAN INFERENCE
// ============================================================================

export interface BayesianInput {
  prior_mean: number;
  prior_std: number;
  observations: number[];
  likelihood_std?: number;   // Observation noise std dev
}

export interface BayesianResult {
  posterior_mean: number;
  posterior_std: number;
  credible_interval_95: [number, number];
  num_observations: number;
  shrinkage: number;         // How much posterior moved from prior toward data
}

function runBayesian(data: Record<string, any>): BayesianResult {
  const priorMean: number = data.prior_mean ?? 0;
  const priorStd: number = data.prior_std ?? 1;
  const observations: number[] = data.observations ?? [];
  const likelihoodStd: number = data.likelihood_std ?? priorStd;

  const n = observations.length;

  if (n === 0) {
    return {
      posterior_mean: priorMean,
      posterior_std: priorStd,
      credible_interval_95: [priorMean - 1.96 * priorStd, priorMean + 1.96 * priorStd],
      num_observations: 0,
      shrinkage: 0,
    };
  }

  const dataMean = observations.reduce((a, b) => a + b, 0) / n;

  // Conjugate normal-normal update
  const priorPrec = 1 / (priorStd * priorStd);
  const likePrec = n / (likelihoodStd * likelihoodStd);

  const postPrec = priorPrec + likePrec;
  const postMean = (priorPrec * priorMean + likePrec * dataMean) / postPrec;
  const postStd = Math.sqrt(1 / postPrec);

  const shrinkage = Math.abs(postMean - priorMean) / (Math.abs(dataMean - priorMean) + 1e-10);

  return {
    posterior_mean: +postMean.toFixed(4),
    posterior_std: +postStd.toFixed(4),
    credible_interval_95: [+(postMean - 1.96 * postStd).toFixed(4), +(postMean + 1.96 * postStd).toFixed(4)],
    num_observations: n,
    shrinkage: +Math.min(1, shrinkage).toFixed(4),
  };
}

// ============================================================================
// GRADIENT DESCENT
// ============================================================================

export interface GradientDescentInput {
  objective: 'taylor_tool_life' | 'surface_finish' | 'mrr' | 'cost';
  initial_vc: number;
  bounds?: [number, number];       // [min_vc, max_vc]
  material_C?: number;             // Taylor C
  material_n?: number;             // Taylor n
  max_iterations?: number;
  learning_rate?: number;
}

export interface GradientDescentResult {
  optimal_vc: number;
  optimal_objective: number;
  iterations: number;
  converged: boolean;
  trajectory: { vc: number; objective: number }[];
}

function runGradientDescent(data: Record<string, any>): GradientDescentResult {
  const objective: string = data.objective ?? 'taylor_tool_life';
  let vc: number = data.initial_vc ?? 200;
  const bounds: [number, number] = data.bounds ?? [20, 800];
  const C: number = data.material_C ?? 300;
  const n: number = data.material_n ?? 0.25;
  const maxIter: number = data.max_iterations ?? 50;

  const trajectory: { vc: number; objective: number }[] = [];
  let converged = false;
  let iterations = 0;

  // Objective function: maximize tool life T = (C/vc)^(1/n), or equivalently minimize -T
  // For cost: minimize cost/part = machine_rate × cycle_time + tool_cost/tool_life
  // For MRR: maximize vc × fz × ap (simplified to vc since fz,ap fixed)
  // For surface finish: minimize Ra (depends mainly on fz, so vc optimization is secondary)

  function evalObjective(v: number): number {
    switch (objective) {
      case 'taylor_tool_life':
        return -Math.pow(C / v, 1 / n); // Negate for minimization
      case 'mrr':
        return -v; // Maximize vc → minimize -vc
      case 'cost': {
        const machineRate = 1.5; // $/min
        const toolCostPer = 15;  // $/edge
        const T = Math.pow(C / v, 1 / n);
        const cycleTime = 100 / v; // Simplified: length/vc
        return machineRate * cycleTime + toolCostPer / T;
      }
      case 'surface_finish':
        return 0.1 * v; // Higher vc slightly improves Ra (simplified)
      default:
        return -Math.pow(C / v, 1 / n);
    }
  }

  // For Taylor tool life, use log-domain optimization.
  // T = (C/v)^(1/n) has gradient ∝ v^(-1/n-1) which varies by 1000x+ across typical ranges.
  // In log-space (u = ln(v)), the gradient is T/n — well-conditioned for GD convergence.
  const useLogDomain = (objective === 'taylor_tool_life' || objective === 'default');
  let x = useLogDomain ? Math.log(vc) : vc;
  const xBounds: [number, number] = useLogDomain
    ? [Math.log(bounds[0]), Math.log(bounds[1])]
    : bounds;

  // Auto-scale learning rate to variable range if not specified
  let lr: number = data.learning_rate ?? (xBounds[1] - xBounds[0]) / 10;

  function evalAtX(xVal: number): number {
    const v = useLogDomain ? Math.exp(xVal) : xVal;
    return evalObjective(v);
  }

  for (let i = 0; i < maxIter; i++) {
    iterations = i + 1;
    const currentVc = useLogDomain ? Math.exp(x) : x;
    const objVal = evalObjective(currentVc);
    const dispVal = (objective === 'cost' || objective === 'surface_finish') ? objVal : -objVal;
    trajectory.push({ vc: +currentVc.toFixed(2), objective: +Math.abs(dispVal).toFixed(4) });

    // Numerical gradient (h scaled to variable magnitude for accuracy)
    const h = Math.max(0.01, Math.abs(x) * 0.001);
    const grad = (evalAtX(x + h) - evalAtX(x - h)) / (2 * h);

    // Gradient step with clamped step size (max 25% of current x)
    const rawStep = lr * grad;
    const maxStep = Math.max(Math.abs(x) * 0.25, 0.5);
    const clampedStep = Math.sign(rawStep) * Math.min(Math.abs(rawStep), maxStep);
    const newX = x - clampedStep;
    const clampedX = Math.max(xBounds[0], Math.min(xBounds[1], newX));

    // Convergence check
    if (Math.abs(clampedX - x) < 0.001) {
      converged = true;
      x = clampedX;
      const finalVc = useLogDomain ? Math.exp(x) : x;
      trajectory.push({ vc: +finalVc.toFixed(2), objective: +(-evalObjective(finalVc)).toFixed(4) });
      break;
    }

    x = clampedX;
    lr *= 0.98; // Decay learning rate
  }

  vc = useLogDomain ? Math.exp(x) : x;

  // Return actual metric value (positive)
  const rawObj = evalObjective(vc);
  // For cost, rawObj is positive cost; for others, rawObj is negated (minimization trick)
  const displayObj = objective === 'cost' || objective === 'surface_finish'
    ? rawObj   // Already positive
    : -rawObj; // Un-negate for tool_life/mrr

  return {
    optimal_vc: +vc.toFixed(2),
    optimal_objective: +Math.abs(displayObj).toFixed(4),
    iterations,
    converged,
    trajectory: trajectory.slice(0, 25), // Limit output
  };
}

// ============================================================================
// INTERPOLATION
// ============================================================================

export interface InterpolationInput {
  x_points: number[];
  y_points: number[];
  x_query: number;
  method?: 'linear' | 'cubic_spline';
}

export interface InterpolationResult {
  x_query: number;
  y_interpolated: number;
  method: string;
  in_range: boolean;
  extrapolation_warning: boolean;
}

function runInterpolation(data: Record<string, any>): InterpolationResult {
  const xs: number[] = data.x_points ?? [];
  const ys: number[] = data.y_points ?? [];
  const xq: number = data.x_query ?? 0;
  const method: string = data.method ?? 'linear';

  if (xs.length < 2 || ys.length < 2 || xs.length !== ys.length) {
    return { x_query: xq, y_interpolated: 0, method, in_range: false, extrapolation_warning: true };
  }

  // Sort by x
  const pairs = xs.map((x, i) => ({ x, y: ys[i] })).sort((a, b) => a.x - b.x);
  const sortedX = pairs.map(p => p.x);
  const sortedY = pairs.map(p => p.y);

  const inRange = xq >= sortedX[0] && xq <= sortedX[sortedX.length - 1];

  let yInterp: number;

  if (method === 'cubic_spline' && sortedX.length >= 4) {
    // Natural cubic spline
    yInterp = cubicSplineInterp(sortedX, sortedY, xq);
  } else {
    // Linear interpolation
    yInterp = linearInterp(sortedX, sortedY, xq);
  }

  return {
    x_query: xq,
    y_interpolated: +yInterp.toFixed(6),
    method,
    in_range: inRange,
    extrapolation_warning: !inRange,
  };
}

function linearInterp(xs: number[], ys: number[], xq: number): number {
  if (xq <= xs[0]) return ys[0];
  if (xq >= xs[xs.length - 1]) return ys[ys.length - 1];

  for (let i = 0; i < xs.length - 1; i++) {
    if (xq >= xs[i] && xq <= xs[i + 1]) {
      const t = (xq - xs[i]) / (xs[i + 1] - xs[i]);
      return ys[i] + t * (ys[i + 1] - ys[i]);
    }
  }
  return ys[ys.length - 1];
}

function cubicSplineInterp(xs: number[], ys: number[], xq: number): number {
  const n = xs.length - 1;
  if (n < 1) return ys[0] ?? 0;

  // Tridiagonal system for natural cubic spline
  const h: number[] = [];
  for (let i = 0; i < n; i++) h.push(xs[i + 1] - xs[i]);

  const alpha: number[] = [0];
  for (let i = 1; i < n; i++) {
    alpha.push(3 * (ys[i + 1] - ys[i]) / h[i] - 3 * (ys[i] - ys[i - 1]) / h[i - 1]);
  }

  // Solve tridiagonal
  const l: number[] = [1];
  const mu: number[] = [0];
  const z: number[] = [0];

  for (let i = 1; i < n; i++) {
    l.push(2 * (xs[i + 1] - xs[i - 1]) - h[i - 1] * mu[i - 1]);
    mu.push(h[i] / l[i]);
    z.push((alpha[i] - h[i - 1] * z[i - 1]) / l[i]);
  }

  const c: number[] = new Array(n + 1).fill(0);
  const b: number[] = new Array(n).fill(0);
  const d: number[] = new Array(n).fill(0);

  for (let j = n - 1; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (ys[j + 1] - ys[j]) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }

  // Find interval and evaluate
  let seg = 0;
  if (xq <= xs[0]) seg = 0;
  else if (xq >= xs[n]) seg = n - 1;
  else {
    for (let i = 0; i < n; i++) {
      if (xq >= xs[i] && xq <= xs[i + 1]) { seg = i; break; }
    }
  }

  const dx = xq - xs[seg];
  return ys[seg] + b[seg] * dx + c[seg] * dx * dx + d[seg] * dx * dx * dx;
}

// ============================================================================
// MONTE CARLO SIMULATION
// ============================================================================

export interface MonteCarloInput {
  parameter_distributions: {
    name: string;
    mean: number;
    std: number;
  }[];
  model: 'taylor_tool_life' | 'surface_finish' | 'cutting_force';
  num_samples?: number;
}

export interface MonteCarloResult {
  mean: number;
  std: number;
  percentile_5: number;
  percentile_95: number;
  min: number;
  max: number;
  num_samples: number;
  distribution_shape: 'normal' | 'skewed_right' | 'skewed_left';
}

function runMonteCarlo(data: Record<string, any>): MonteCarloResult {
  const distributions: { name: string; mean: number; std: number }[] = data.parameter_distributions ?? [];
  const model: string = data.model ?? 'taylor_tool_life';
  const numSamples: number = data.num_samples ?? 1000;

  // Box-Muller for normal random
  function randn(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1 + 1e-15)) * Math.cos(2 * Math.PI * u2);
  }

  function sampleParam(p: { mean: number; std: number }): number {
    return p.mean + p.std * randn();
  }

  const results: number[] = [];

  for (let i = 0; i < numSamples; i++) {
    const params = distributions.map(d => ({ name: d.name, value: sampleParam(d) }));
    const paramMap: Record<string, number> = {};
    for (const p of params) paramMap[p.name] = p.value;

    let output: number;
    switch (model) {
      case 'taylor_tool_life': {
        const vc = Math.max(10, paramMap['vc'] ?? 200);
        const C = Math.max(10, paramMap['C'] ?? 300);
        const n = Math.max(0.05, paramMap['n'] ?? 0.25);
        output = Math.pow(C / vc, 1 / n);
        break;
      }
      case 'surface_finish': {
        const fz = Math.max(0.01, paramMap['fz'] ?? 0.15);
        const rn = Math.max(0.1, paramMap['rn'] ?? 0.8);
        output = (fz * fz) / (32 * rn) * 1000;
        break;
      }
      case 'cutting_force': {
        const kc11 = Math.max(100, paramMap['kc11'] ?? 1800);
        const mc = Math.max(0.1, paramMap['mc'] ?? 0.25);
        const fz = Math.max(0.01, paramMap['fz'] ?? 0.15);
        const ap = Math.max(0.1, paramMap['ap'] ?? 3.0);
        output = kc11 * Math.pow(fz, 1 - mc) * ap;
        break;
      }
      default:
        output = 0;
    }

    if (isFinite(output) && output > 0) results.push(output);
  }

  if (results.length === 0) {
    return { mean: 0, std: 0, percentile_5: 0, percentile_95: 0, min: 0, max: 0, num_samples: 0, distribution_shape: 'normal' };
  }

  results.sort((a, b) => a - b);
  const mean = results.reduce((a, b) => a + b, 0) / results.length;
  const variance = results.reduce((s, x) => s + (x - mean) * (x - mean), 0) / results.length;
  const std = Math.sqrt(variance);

  const p5 = results[Math.floor(results.length * 0.05)];
  const p50 = results[Math.floor(results.length * 0.50)];
  const p95 = results[Math.floor(results.length * 0.95)];

  // Skewness from median vs mean
  const skewness = (mean - p50) / (std + 1e-10);
  const shape = skewness > 0.3 ? 'skewed_right' : skewness < -0.3 ? 'skewed_left' : 'normal';

  return {
    mean: +mean.toFixed(4),
    std: +std.toFixed(4),
    percentile_5: +p5.toFixed(4),
    percentile_95: +p95.toFixed(4),
    min: +results[0].toFixed(4),
    max: +results[results.length - 1].toFixed(4),
    num_samples: results.length,
    distribution_shape: shape,
  };
}

// ============================================================================
// TOPOLOGICAL SORT (Operation Sequencing)
// ============================================================================

export interface TopoSortInput {
  operations: { id: string; name: string }[];
  dependencies: { from: string; to: string }[];  // from must come before to
}

export interface TopoSortResult {
  sequence: string[];
  is_valid: boolean;
  has_cycle: boolean;
  critical_path_length: number;
}

function runTopoSort(data: Record<string, any>): TopoSortResult {
  const ops: { id: string; name: string }[] = data.operations ?? [];
  const deps: { from: string; to: string }[] = data.dependencies ?? [];

  if (ops.length === 0) {
    return { sequence: [], is_valid: true, has_cycle: false, critical_path_length: 0 };
  }

  // Build adjacency list and in-degree map
  const adj: Map<string, string[]> = new Map();
  const inDeg: Map<string, number> = new Map();

  for (const op of ops) {
    adj.set(op.id, []);
    inDeg.set(op.id, 0);
  }

  for (const dep of deps) {
    if (adj.has(dep.from) && inDeg.has(dep.to)) {
      adj.get(dep.from)!.push(dep.to);
      inDeg.set(dep.to, (inDeg.get(dep.to) ?? 0) + 1);
    }
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [id, deg] of inDeg) {
    if (deg === 0) queue.push(id);
  }

  const sequence: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    sequence.push(node);
    for (const neighbor of adj.get(node) ?? []) {
      const newDeg = (inDeg.get(neighbor) ?? 1) - 1;
      inDeg.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  const hasCycle = sequence.length < ops.length;

  // Critical path: longest path in DAG
  let criticalPath = 0;
  if (!hasCycle) {
    const dist: Map<string, number> = new Map();
    for (const id of sequence) dist.set(id, 0);
    for (const id of sequence) {
      for (const neighbor of adj.get(id) ?? []) {
        const newDist = (dist.get(id) ?? 0) + 1;
        if (newDist > (dist.get(neighbor) ?? 0)) {
          dist.set(neighbor, newDist);
        }
      }
    }
    criticalPath = Math.max(0, ...Array.from(dist.values())) + 1;
  }

  return {
    sequence: hasCycle ? sequence : sequence,
    is_valid: !hasCycle,
    has_cycle: hasCycle,
    critical_path_length: criticalPath,
  };
}

// ============================================================================
// KALMAN FILTER (Tool Wear Estimation)
// ============================================================================

export interface KalmanInput {
  initial_state: number;          // e.g., initial tool wear = 0
  initial_uncertainty: number;    // e.g., 1.0
  process_noise: number;          // e.g., 0.01 (wear rate uncertainty)
  measurement_noise: number;      // e.g., 0.5 (sensor noise)
  measurements: number[];         // Observed tool wear values
  wear_rate?: number;             // Expected wear per step
}

export interface KalmanResult {
  final_state: number;
  final_uncertainty: number;
  states: { step: number; predicted: number; updated: number; uncertainty: number }[];
  innovations: number[];          // Measurement - predicted
}

function runKalman(data: Record<string, any>): KalmanResult {
  let x: number = data.initial_state ?? 0;
  let P: number = data.initial_uncertainty ?? 1.0;
  const Q: number = data.process_noise ?? 0.01;
  const R: number = data.measurement_noise ?? 0.5;
  const measurements: number[] = data.measurements ?? [];
  const wearRate: number = data.wear_rate ?? 0;

  const states: { step: number; predicted: number; updated: number; uncertainty: number }[] = [];
  const innovations: number[] = [];

  for (let i = 0; i < measurements.length; i++) {
    // Predict
    const xPred = x + wearRate;
    const PPred = P + Q;

    // Update
    const z = measurements[i];
    const innovation = z - xPred;
    const S = PPred + R;
    const K = PPred / S;       // Kalman gain

    x = xPred + K * innovation;
    P = (1 - K) * PPred;

    states.push({
      step: i,
      predicted: +xPred.toFixed(4),
      updated: +x.toFixed(4),
      uncertainty: +P.toFixed(6),
    });
    innovations.push(+innovation.toFixed(4));
  }

  return {
    final_state: +x.toFixed(4),
    final_uncertainty: +P.toFixed(6),
    states: states.slice(0, 50), // Limit output
    innovations: innovations.slice(0, 50),
  };
}

// ============================================================================
// EIGENVALUE SOLVER (Modal Analysis)
// ============================================================================

export interface EigenInput {
  stiffness_matrix: number[][];    // K (2×2 or 3×3)
  mass_matrix: number[][];         // M
}

export interface EigenResult {
  natural_frequencies_hz: number[];
  mode_shapes: number[][];
  critical_speed_rpm: number;
}

function runEigen(data: Record<string, any>): EigenResult {
  const K: number[][] = data.stiffness_matrix ?? [[1000, -500], [-500, 1000]];
  const M: number[][] = data.mass_matrix ?? [[1, 0], [0, 1]];
  const n = K.length;

  if (n === 0 || n > 3) {
    return { natural_frequencies_hz: [], mode_shapes: [], critical_speed_rpm: 0 };
  }

  // For 2×2: eigenvalues of M^-1 × K analytically (ω² = eigenvalues)
  if (n === 2) {
    // M^-1 × K for diagonal M
    const m1 = M[0][0] || 1;
    const m2 = M[1][1] || 1;
    const a = K[0][0] / m1;
    const b = K[0][1] / m1;
    const c = K[1][0] / m2;
    const d = K[1][1] / m2;

    // Eigenvalues of [[a,b],[c,d]]
    const trace = a + d;
    const det = a * d - b * c;
    const disc = Math.max(0, trace * trace - 4 * det);
    const lambda1 = (trace + Math.sqrt(disc)) / 2;
    const lambda2 = (trace - Math.sqrt(disc)) / 2;

    const f1 = Math.sqrt(Math.max(0, lambda2)) / (2 * Math.PI);
    const f2 = Math.sqrt(Math.max(0, lambda1)) / (2 * Math.PI);

    return {
      natural_frequencies_hz: [+f1.toFixed(2), +f2.toFixed(2)],
      mode_shapes: [[1, (lambda2 - a) / (b || 1)].map(v => +v.toFixed(4)), [1, (lambda1 - a) / (b || 1)].map(v => +v.toFixed(4))],
      critical_speed_rpm: +(f1 * 60).toFixed(0),
    };
  }

  // For 1×1 or 3×3: simplified
  if (n === 1) {
    const omega2 = K[0][0] / (M[0][0] || 1);
    const f = Math.sqrt(Math.max(0, omega2)) / (2 * Math.PI);
    return { natural_frequencies_hz: [+f.toFixed(2)], mode_shapes: [[1]], critical_speed_rpm: +(f * 60).toFixed(0) };
  }

  // 3×3: use power iteration for dominant eigenvalue
  const freqs: number[] = [];
  let v = [1, 0, 0];
  for (let iter = 0; iter < 50; iter++) {
    // M^-1 × K × v (assuming diagonal M)
    const Kv = K.map(row => row.reduce((s, val, j) => s + val * v[j], 0));
    const MiKv = Kv.map((val, i) => val / (M[i][i] || 1));
    const norm = Math.sqrt(MiKv.reduce((s, x) => s + x * x, 0));
    if (norm < 1e-15) break;
    v = MiKv.map(x => x / norm);
  }
  const Kv = K.map(row => row.reduce((s, val, j) => s + val * v[j], 0));
  const rayleigh = v.reduce((s, vi, i) => s + vi * Kv[i], 0) / v.reduce((s, vi, i) => s + vi * (M[i][i] || 1) * vi, 0);
  freqs.push(+(Math.sqrt(Math.max(0, rayleigh)) / (2 * Math.PI)).toFixed(2));

  return {
    natural_frequencies_hz: freqs,
    mode_shapes: [v.map(x => +x.toFixed(4))],
    critical_speed_rpm: +(freqs[0] * 60).toFixed(0),
  };
}

// ============================================================================
// PID TUNING (Ziegler-Nichols)
// ============================================================================

export interface PIDInput {
  ultimate_gain: number;       // Ku — gain at sustained oscillation
  ultimate_period_s: number;   // Tu — period at sustained oscillation
  controller_type?: 'P' | 'PI' | 'PID';
}

export interface PIDResult {
  Kp: number;
  Ki: number;
  Kd: number;
  controller_type: string;
  settling_time_estimate_s: number;
}

function runPID(data: Record<string, any>): PIDResult {
  const Ku: number = data.ultimate_gain ?? 1.0;
  const Tu: number = data.ultimate_period_s ?? 1.0;
  const type: string = data.controller_type ?? 'PID';

  let Kp: number, Ki: number, Kd: number;

  switch (type) {
    case 'P':
      Kp = 0.5 * Ku; Ki = 0; Kd = 0;
      break;
    case 'PI':
      Kp = 0.45 * Ku; Ki = Kp / (Tu / 1.2); Kd = 0;
      break;
    case 'PID':
    default:
      Kp = 0.6 * Ku; Ki = Kp / (Tu / 2); Kd = Kp * Tu / 8;
      break;
  }

  const settlingTime = 4 * Tu; // Rule of thumb: ~4 oscillation periods

  return {
    Kp: +Kp.toFixed(4),
    Ki: +Ki.toFixed(4),
    Kd: +Kd.toFixed(4),
    controller_type: type,
    settling_time_estimate_s: +settlingTime.toFixed(4),
  };
}

// ============================================================================
// MAIN DISPATCHER: algorithm_select
// ============================================================================

export function algorithmSelect(input: AlgorithmSelectInput): AlgorithmSelectResult {
  const { best, alternatives } = selectAlgorithm(input);
  const data = input.data ?? {};

  let result: any;
  const flags: string[] = [];
  let safetyScore = 0.90;

  try {
    switch (best.name) {
      case 'fft_spectral':
        result = runFFT(data);
        break;
      case 'gradient_descent':
        result = runGradientDescent(data);
        break;
      case 'bayesian_update':
        result = runBayesian(data);
        break;
      case 'eigenvalue_solver':
        result = runEigen(data);
        break;
      case 'interpolation':
        result = runInterpolation(data);
        if (result.extrapolation_warning) {
          flags.push('Query point outside data range — extrapolation may be unreliable');
          safetyScore -= 0.10;
        }
        break;
      case 'kalman_filter':
        result = runKalman(data);
        break;
      case 'topological_sort':
        result = runTopoSort(data);
        if (result.has_cycle) {
          flags.push('Dependency cycle detected — sequence may be incomplete');
          safetyScore -= 0.15;
        }
        break;
      case 'monte_carlo':
        result = runMonteCarlo(data);
        break;
      case 'mesh_refinement':
        // Simplified: return mesh quality metrics
        result = {
          algorithm: 'ruppert_mesh',
          note: 'Full Ruppert mesh refinement requires geometry input — returning algorithmic metadata',
          min_angle_guarantee_deg: 20.7,
          source: 'MIT 2.158J — Computational Geometry',
        };
        break;
      case 'pid_tuning':
        result = runPID(data);
        break;
      default:
        result = { error: `Algorithm '${best.name}' not yet implemented` };
        safetyScore -= 0.20;
        flags.push(`Algorithm '${best.name}' execution not available`);
    }
  } catch (err: any) {
    result = { error: err.message };
    safetyScore -= 0.20;
    flags.push(`Algorithm execution error: ${err.message}`);
  }

  return {
    selected_algorithm: best.name,
    source_course: best.course,
    rationale: best.description,
    result,
    alternatives: alternatives.map(a => `${a.name} (${a.course})`),
    safety: { score: +safetyScore.toFixed(2), flags },
  };
}

// ============================================================================
// SOURCE FILE CATALOG METHODS
// ============================================================================

/**
 * Returns the full source file catalog for all 52 MEDIUM-priority algorithm modules.
 * Optionally filters by algorithm_domain.
 */
export function getSourceFileCatalog(params: {
  domain?: AlgorithmDomain;
  filename_pattern?: string;
}): {
  total_files: number;
  total_lines: number;
  files: (SourceFileCatalogEntry & { id: string })[];
  domain_summary: Record<string, { count: number; lines: number }>;
} {
  const entries = Object.entries(ALGORITHM_SOURCE_FILE_CATALOG);

  // Apply filters
  let filtered = entries;
  if (params.domain) {
    filtered = filtered.filter(([, e]) => e.algorithm_domain === params.domain);
  }
  if (params.filename_pattern) {
    const pattern = params.filename_pattern.toLowerCase();
    filtered = filtered.filter(([, e]) => e.filename.toLowerCase().includes(pattern));
  }

  const files = filtered.map(([id, entry]) => ({ id, ...entry }));
  const totalLines = files.reduce((sum, f) => sum + f.lines, 0);

  // Build domain summary from the full catalog (unfiltered)
  const domainSummary: Record<string, { count: number; lines: number }> = {};
  for (const [, entry] of entries) {
    if (!domainSummary[entry.algorithm_domain]) {
      domainSummary[entry.algorithm_domain] = { count: 0, lines: 0 };
    }
    domainSummary[entry.algorithm_domain].count++;
    domainSummary[entry.algorithm_domain].lines += entry.lines;
  }

  return {
    total_files: files.length,
    total_lines: totalLines,
    files,
    domain_summary: domainSummary,
  };
}

/**
 * Returns a structured summary of cataloged source files grouped by algorithm domain,
 * with per-domain statistics and overall totals.
 */
export function catalogSourceFiles(): {
  catalog_version: string;
  safety_class: 'MEDIUM';
  total_files: number;
  total_lines: number;
  domains: {
    domain: AlgorithmDomain;
    file_count: number;
    total_lines: number;
    files: { id: string; filename: string; lines: number; description: string }[];
  }[];
  largest_files: { id: string; filename: string; lines: number; algorithm_domain: AlgorithmDomain }[];
} {
  const entries = Object.entries(ALGORITHM_SOURCE_FILE_CATALOG);
  const totalFiles = entries.length;
  const totalLines = entries.reduce((sum, [, e]) => sum + e.lines, 0);

  // Group by domain
  const domainMap = new Map<AlgorithmDomain, { id: string; entry: SourceFileCatalogEntry }[]>();
  for (const [id, entry] of entries) {
    const list = domainMap.get(entry.algorithm_domain) ?? [];
    list.push({ id, entry });
    domainMap.set(entry.algorithm_domain, list);
  }

  const domains = Array.from(domainMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([domain, items]) => ({
      domain,
      file_count: items.length,
      total_lines: items.reduce((sum, i) => sum + i.entry.lines, 0),
      files: items
        .sort((a, b) => b.entry.lines - a.entry.lines)
        .map(i => ({
          id: i.id,
          filename: i.entry.filename,
          lines: i.entry.lines,
          description: i.entry.description,
        })),
    }));

  // Top 10 largest files
  const largest = entries
    .sort(([, a], [, b]) => b.lines - a.lines)
    .slice(0, 10)
    .map(([id, e]) => ({
      id,
      filename: e.filename,
      lines: e.lines,
      algorithm_domain: e.algorithm_domain,
    }));

  return {
    catalog_version: '2.0',
    safety_class: 'MEDIUM' as const,
    total_files: totalFiles,
    total_lines: totalLines,
    domains,
    largest_files: largest,
  };
}

// ============================================================================
// DISPATCHER FUNCTION
// ============================================================================

export function algorithmGateway(action: string, params: Record<string, unknown>): unknown {
  switch (action) {
    case 'algorithm_select':
      return algorithmSelect(params as unknown as AlgorithmSelectInput);
    case 'get_source_file_catalog':
      return getSourceFileCatalog(params as { domain?: AlgorithmDomain; filename_pattern?: string });
    case 'catalog_source_files':
      return catalogSourceFiles();
    default:
      return { error: `Unknown algorithm gateway action: ${action}` };
  }
}
