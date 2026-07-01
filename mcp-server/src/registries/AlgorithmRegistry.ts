/**
 * PRISM MCP Server - Algorithm Registry
 * Complete access to 52 algorithm modules across 8 categories
 * Graph, Optimization, Search, Interpolation, Manufacturing, Numerical, Signal, ML
 */

import * as path from "path";
import { BaseRegistry } from "./base.js";
import { PATHS } from "../constants.js";
import { log } from "../utils/Logger.js";
import { fileExists, readJsonFile, listDirectory } from "../utils/files.js";

// ============================================================================
// ALGORITHM TYPES
// ============================================================================

/** Safety classification for manufacturing algorithms */
export type AlgorithmSafetyClass = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

/** Manufacturing relevance level */
export type MfgRelevance = "HIGH" | "MEDIUM" | "LOW";

/** Algorithm category / type */
export type AlgorithmType =
  | "graph"
  | "optimization"
  | "search"
  | "interpolation"
  | "manufacturing"
  | "numerical"
  | "signal"
  | "ml"
  | "control"
  | "toolpath"
  | "data_structure"
  | "graphics"
  | "knowledge"
  | "ensemble";

/** Size complexity bracket */
export type AlgorithmComplexity = "S" | "M" | "L" | "XL";

/** A single exported function from an algorithm module */
export interface AlgorithmFunction {
  name: string;
  description?: string;
}

/** Full algorithm entry stored in the registry */
export interface AlgorithmEntry {
  // Identification
  id: string;
  name: string;
  type: AlgorithmType;

  // Classification
  complexity_class: string;           // Big-O notation, e.g. "O(n log n)"
  size_complexity: AlgorithmComplexity;
  safety_class: AlgorithmSafetyClass;
  integration_wave: number;           // 1 = first (CRITICAL), 4 = last (LOW)

  // Documentation
  description: string;
  source_file: string;                // Filename in extracted/algorithms/
  source_course?: string;             // e.g. "MIT 6.003", "Stanford CS234"
  lines?: number;

  // Manufacturing context
  mfg_relevance: MfgRelevance;
  mfg_applications?: string[];        // e.g. ["chatter detection", "vibration monitoring"]

  // Exported API
  functions: AlgorithmFunction[];

  // Dependencies and relationships
  depends_on?: string[];              // IDs of algorithms this one requires
  consumers?: string[];               // Engines/tools that use this algorithm
  potential_duplicate_of?: string;    // Flag for dedup review
}

// ============================================================================
// BUILT-IN ALGORITHMS (Core seed data from MS0 scan)
// ============================================================================

const BUILT_IN_ALGORITHMS: AlgorithmEntry[] = [
  // --- Wave 1: CRITICAL safety ---
  {
    id: "ALG-SIGNAL-001",
    name: "Signal Processing & FFT",
    type: "signal",
    complexity_class: "O(n log n)",
    size_complexity: "M",
    safety_class: "CRITICAL",
    integration_wave: 1,
    description: "FFT (Cooley-Tukey), digital filters, spectral analysis, windowing functions. 60 algorithms for vibration monitoring, chatter detection, sensor data processing.",
    source_file: "PRISM_SIGNAL_ALGORITHMS.js",
    source_course: "MIT 6.003",
    lines: 375,
    mfg_relevance: "HIGH",
    mfg_applications: ["chatter detection", "vibration monitoring", "sensor signal processing"],
    functions: [
      { name: "fft", description: "Fast Fourier Transform (Cooley-Tukey)" },
      { name: "spectralAnalysis", description: "Power spectral density estimation" },
      { name: "digitalFilter", description: "FIR/IIR digital filter design" },
      { name: "windowFunction", description: "Hanning, Hamming, Blackman windows" },
    ],
    consumers: ["chatter_predict", "vibration_monitor", "quality_prediction"],
  },
  {
    id: "ALG-FFT-CHATTER-001",
    name: "FFT Predictive Chatter",
    type: "signal",
    complexity_class: "O(n log n)",
    size_complexity: "M",
    safety_class: "CRITICAL",
    integration_wave: 1,
    description: "FFT-based chatter prediction using vibration signal analysis combined with stability lobe diagrams. Real-time spindle vibration monitoring for proactive chatter avoidance.",
    source_file: "PRISM_FFT_PREDICTIVE_CHATTER.js",
    source_course: "MIT 6.003 / MIT 2.14",
    lines: 330,
    mfg_relevance: "HIGH",
    mfg_applications: ["chatter prediction", "stability lobe diagrams", "spindle vibration monitoring"],
    functions: [
      { name: "predictChatter", description: "Predict chatter onset from vibration FFT" },
      { name: "stabilityLobe", description: "Compute stability lobe diagram" },
    ],
    consumers: ["chatter_predict", "stability_analysis"],
  },
  {
    id: "ALG-CONTROL-001",
    name: "Control Systems (PID)",
    type: "control",
    complexity_class: "O(1) per step",
    size_complexity: "S",
    safety_class: "CRITICAL",
    integration_wave: 1,
    description: "PID controller implementation, Ziegler-Nichols tuning, transfer function analysis. Direct machine control algorithm for CNC servo loops.",
    source_file: "PRISM_CONTROL_SYSTEMS_MIT.js",
    source_course: "MIT 6.302",
    lines: 117,
    mfg_relevance: "HIGH",
    mfg_applications: ["CNC servo control", "adaptive feed rate", "spindle speed regulation"],
    functions: [
      { name: "pidController", description: "PID controller with anti-windup" },
      { name: "zieglerNicholsTune", description: "Ziegler-Nichols auto-tuning" },
      { name: "transferFunction", description: "Transfer function analysis" },
    ],
    consumers: ["adaptive_control", "feed_rate_control"],
  },
  {
    id: "ALG-JACOBIAN-001",
    name: "Jacobian Kinematics Engine",
    type: "numerical",
    complexity_class: "O(n^3)",
    size_complexity: "M",
    safety_class: "CRITICAL",
    integration_wave: 1,
    description: "Jacobian matrix computation and singularity analysis for multi-axis CNC kinematics. Maps joint velocities to end-effector velocities (forward kinematics via DH parameters).",
    source_file: "PRISM_JACOBIAN_ENGINE.js",
    source_course: "MIT 6.832",
    lines: 238,
    mfg_relevance: "HIGH",
    mfg_applications: ["multi-axis kinematics", "singularity avoidance", "5-axis motion planning"],
    functions: [
      { name: "computeJacobian", description: "Compute Jacobian matrix from DH parameters" },
      { name: "singularityAnalysis", description: "Detect kinematic singularities" },
      { name: "forwardKinematics", description: "Forward kinematics via DH convention" },
    ],
    consumers: ["5axis_toolpath", "kinematics_engine"],
  },

  // --- Wave 2: HIGH safety ---
  {
    id: "ALG-ACO-001",
    name: "Ant Colony Optimization (Sequencer)",
    type: "optimization",
    complexity_class: "O(n^2 * iterations)",
    size_complexity: "XL",
    safety_class: "HIGH",
    integration_wave: 2,
    description: "Ant Colony Optimization for hole sequencing and operation ordering. Metaheuristic optimizer for CNC drilling sequence optimization (TSP-variant).",
    source_file: "PRISM_ACO_SEQUENCER.js",
    lines: 5383,
    mfg_relevance: "HIGH",
    mfg_applications: ["hole sequencing", "operation ordering", "cycle time minimization"],
    functions: [
      { name: "acoSequence", description: "Run ACO for operation sequencing" },
      { name: "pheromoneUpdate", description: "Update pheromone trails" },
      { name: "localSearch2opt", description: "2-opt local improvement" },
    ],
    consumers: ["operation_sequencer", "cycle_optimizer"],
  },
  {
    id: "ALG-NURBS-001",
    name: "NURBS Surface Evaluation",
    type: "interpolation",
    complexity_class: "O(p^2) per point",
    size_complexity: "L",
    safety_class: "HIGH",
    integration_wave: 2,
    description: "NURBS (Non-Uniform Rational B-Spline) surface evaluation: Cox-de Boor basis functions, surface point evaluation, knot insertion, degree elevation. Critical for CAD/CAM geometry.",
    source_file: "PRISM_NURBS_MIT.js",
    source_course: "MIT 2.158J",
    lines: 590,
    mfg_relevance: "HIGH",
    mfg_applications: ["CAD surface evaluation", "toolpath interpolation", "5-axis surface machining"],
    functions: [
      { name: "evaluateNURBS", description: "Evaluate NURBS surface point" },
      { name: "coxDeBoor", description: "Cox-de Boor basis function recursion" },
      { name: "knotInsert", description: "Knot insertion refinement" },
      { name: "degreeElevate", description: "Degree elevation" },
    ],
    consumers: ["toolpath_gen", "surface_machining", "cad_import"],
  },
  {
    id: "ALG-TOOLPATH-001",
    name: "Toolpath Algorithm Library",
    type: "toolpath",
    complexity_class: "O(n^2)",
    size_complexity: "XL",
    safety_class: "HIGH",
    integration_wave: 2,
    description: "Comprehensive toolpath algorithm library: morph spiral, trochoidal, adaptive clearing, rest machining, and finishing strategies. Core CAM toolpath generation.",
    source_file: "COMPLETE_TOOLPATH_ALGORITHM_LIBRARY.js",
    lines: 2213,
    mfg_relevance: "HIGH",
    mfg_applications: ["adaptive clearing", "trochoidal milling", "rest machining", "finishing strategies"],
    functions: [
      { name: "morphSpiral", description: "Morphing spiral toolpath generation" },
      { name: "trochoidalPath", description: "Trochoidal milling path" },
      { name: "adaptiveClearing", description: "Adaptive clearing with constant engagement" },
      { name: "restMachining", description: "Rest material detection and re-machining" },
    ],
    consumers: ["cam_engine", "toolpath_gen", "strategy_selector"],
    potential_duplicate_of: "ALGORITHM_LIBRARY.js",
  },

  // --- Wave 3: MEDIUM safety ---
  {
    id: "ALG-SEARCH-001",
    name: "Enhanced Search Algorithms",
    type: "search",
    complexity_class: "O(b^d)",
    size_complexity: "XL",
    safety_class: "MEDIUM",
    integration_wave: 3,
    description: "Enhanced search algorithms: Best-First, A*, Beam Search, Bidirectional search, IDA*, SMA*, RBFS. Comprehensive AI search from MIT 6.034.",
    source_file: "PRISM_SEARCH_ENHANCED.js",
    source_course: "MIT 6.034",
    lines: 1961,
    mfg_relevance: "MEDIUM",
    mfg_applications: ["operation planning", "process optimization"],
    functions: [
      { name: "aStarSearch", description: "A* graph search" },
      { name: "beamSearch", description: "Beam search with bounded width" },
      { name: "idaStar", description: "Iterative Deepening A*" },
      { name: "rbfs", description: "Recursive Best-First Search" },
    ],
    consumers: ["path_planner", "operation_sequencer"],
  },
  {
    id: "ALG-OPT-001",
    name: "Optimization Algorithms",
    type: "optimization",
    complexity_class: "O(n * iterations)",
    size_complexity: "S",
    safety_class: "MEDIUM",
    integration_wave: 3,
    description: "Gradient-based optimization: steepest descent, conjugate gradient, BFGS, L-BFGS. General optimization toolbox from MIT 6.251J/15.099.",
    source_file: "PRISM_OPTIMIZATION_ALGORITHMS.js",
    source_course: "MIT 6.251J",
    lines: 195,
    mfg_relevance: "MEDIUM",
    mfg_applications: ["parameter optimization", "process tuning"],
    functions: [
      { name: "gradientDescent", description: "Steepest descent optimizer" },
      { name: "conjugateGradient", description: "Conjugate gradient method" },
      { name: "bfgs", description: "BFGS quasi-Newton optimizer" },
      { name: "lbfgs", description: "Limited-memory BFGS" },
    ],
    consumers: ["param_optimizer", "speed_feed"],
  },

  // --- Wave 4: LOW safety ---
  {
    id: "ALG-GRAPH-001",
    name: "Graph Algorithms",
    type: "graph",
    complexity_class: "O(V + E log V)",
    size_complexity: "M",
    safety_class: "LOW",
    integration_wave: 4,
    description: "Core graph algorithms: Dijkstra shortest path, BFS, DFS, topological sort. General-purpose graph traversal and shortest path computation.",
    source_file: "PRISM_GRAPH.js",
    lines: 285,
    mfg_relevance: "LOW",
    mfg_applications: ["operation dependency graphs", "rapid move minimization"],
    functions: [
      { name: "dijkstra", description: "Dijkstra shortest path" },
      { name: "bfs", description: "Breadth-first search" },
      { name: "dfs", description: "Depth-first search" },
      { name: "topologicalSort", description: "Topological sort for DAGs" },
    ],
    consumers: ["operation_sequencer", "toolpath_gen"],
    potential_duplicate_of: "PRISM_GRAPH_ALGORITHMS.js",
  },

  // ── SCIMATH-MS0: Linear Algebra Algorithms ────────────────────────────
  {
    id: "ALG-LINALG-001",
    name: "Matrix Decompositions (SVD, QR, Cholesky, Eigen)",
    type: "numerical",
    complexity_class: "O(mn min(m,n))",
    size_complexity: "L",
    safety_class: "HIGH",
    integration_wave: 2,
    description: "Jacobi SVD, Householder/Givens QR, LL^T Cholesky, QR eigenvalue algorithm, Lanczos for sparse symmetric, generalized eigenvalue A*x=λ*B*x. Foundation for PCA, FEM, system ID, regression.",
    source_file: "SVDEngine.ts, QRDecompositionEngine.ts, CholeskyEngine.ts, EigensolverEngine.ts",
    source_course: "MIT 18.06, MIT 18.335",
    lines: 2800,
    mfg_relevance: "HIGH",
    mfg_applications: ["PCA process monitoring", "FEM modal analysis", "Kienzle/Taylor regression", "chatter stability eigenvalues"],
    functions: [
      { name: "SVDEngine.decompose", description: "Full/truncated SVD via Jacobi" },
      { name: "QRDecompositionEngine.decompose", description: "Householder QR with optional pivoting" },
      { name: "CholeskyEngine.factorize", description: "LL^T for SPD matrices" },
      { name: "EigensolverEngine.symmetricQR", description: "Full eigenspectrum for dense symmetric" },
      { name: "EigensolverEngine.lanczos", description: "Large sparse symmetric eigenvalues" },
      { name: "EigensolverEngine.generalizedEigen", description: "A*x = λ*B*x for FEM vibration" },
    ],
    consumers: ["svd_decompose", "qr_factorize", "cholesky_factor", "eigen_solve", "PrincipalComponentEngine", "FiniteElementEngine"],
  },
  {
    id: "ALG-KRYLOV-001",
    name: "Krylov Subspace Solvers (CG, BiCGSTAB, GMRES)",
    type: "numerical",
    complexity_class: "O(n * nnz * k_iter)",
    size_complexity: "L",
    safety_class: "HIGH",
    integration_wave: 2,
    description: "Conjugate Gradient for SPD, BiCGSTAB for non-symmetric, GMRES(m) with restart. Preconditioner interface (Jacobi, SSOR). Convergence monitoring with residual tracking.",
    source_file: "IterativeSolverEngine.ts",
    source_course: "MIT 18.335, MIT 18.085",
    lines: 450,
    mfg_relevance: "HIGH",
    mfg_applications: ["FEM large system solve", "thermal equilibrium", "sparse least-squares"],
    functions: [
      { name: "IterativeSolverEngine.cg", description: "Conjugate Gradient for SPD systems" },
      { name: "IterativeSolverEngine.bicgstab", description: "BiCGSTAB for general non-symmetric" },
      { name: "IterativeSolverEngine.gmres", description: "GMRES(m) with restart" },
    ],
    consumers: ["iterative_solve", "FiniteElementEngine", "sparse_solve"],
  },
  {
    id: "ALG-SPARSE-001",
    name: "Sparse Matrix Methods (CSR/CSC, RCM, SpMM)",
    type: "numerical",
    complexity_class: "O(nnz)",
    size_complexity: "M",
    safety_class: "MEDIUM",
    integration_wave: 2,
    description: "CSR/CSC/COO sparse storage, sparse matrix-vector (SpMV), sparse matrix-matrix (SpMM), Reverse Cuthill-McKee bandwidth reduction, triplet assembly for FEM.",
    source_file: "SparseMatrixEngine.ts, MatrixFactorizationEngine.ts",
    source_course: "MIT 18.085, MIT 18.335",
    lines: 600,
    mfg_relevance: "MEDIUM",
    mfg_applications: ["FEM global stiffness assembly", "large thermal models", "bandwidth reduction"],
    functions: [
      { name: "MatrixFactorizationEngine.toCSR", description: "Dense to CSR conversion" },
      { name: "MatrixFactorizationEngine.csrMatVec", description: "Sparse matrix-vector product" },
      { name: "SparseMatrixEngine.rcmOrdering", description: "Reverse Cuthill-McKee ordering" },
      { name: "SparseMatrixEngine.spMM", description: "Sparse matrix multiplication" },
    ],
    consumers: ["sparse_solve", "FiniteElementEngine", "matrix_factorize"],
  },
  // --- SCIMATH-MS0 P3 additions ---
  {
    id: "ALG-KPCA-001",
    name: "Kernel PCA (RBF/Polynomial/Linear)",
    type: "numerical",
    complexity_class: "O(n²p + n³)",
    size_complexity: "M",
    safety_class: "LOW",
    integration_wave: 3,
    description: "Nonlinear PCA via kernel trick. RBF kernel K(x,y)=exp(-γ||x-y||²) for process monitoring where linear PCA misses curved patterns. Centered kernel eigendecomposition.",
    source_file: "PrincipalComponentEngine.ts",
    source_course: "MIT 18.065",
    lines: 60,
    mfg_relevance: "MEDIUM",
    mfg_applications: ["nonlinear process monitoring", "sensor anomaly detection", "tool wear pattern recognition"],
    functions: [
      { name: "PrincipalComponentEngine.kernelPCA", description: "Kernel PCA with RBF/polynomial/linear kernels" },
    ],
    consumers: ["process_monitoring", "anomaly_detection"],
  },
  {
    id: "ALG-IPCA-001",
    name: "Incremental PCA (Streaming SVD Update)",
    type: "numerical",
    complexity_class: "O((k+m)p)",
    size_complexity: "S",
    safety_class: "LOW",
    integration_wave: 3,
    description: "Processes data in batches without storing full dataset. Augmented SVD update: [diag(s)*V^T; X_new; meanCorr] → SVD. Used for real-time sensor data dimensionality reduction.",
    source_file: "PrincipalComponentEngine.ts",
    source_course: "MIT 18.065",
    lines: 50,
    mfg_relevance: "MEDIUM",
    mfg_applications: ["streaming sensor data", "real-time process monitoring", "adaptive baseline updates"],
    functions: [
      { name: "PrincipalComponentEngine.incrementalPCA", description: "Incremental PCA with SVD update" },
    ],
    consumers: ["streaming_monitor", "adaptive_process_control"],
  },
  {
    id: "ALG-RPCA-001",
    name: "Robust PCA (Principal Component Pursuit / ADMM)",
    type: "numerical",
    complexity_class: "O(mnk) per iteration",
    size_complexity: "M",
    safety_class: "LOW",
    integration_wave: 3,
    description: "Decomposes X = L + S via ADMM where L is low-rank (normal process) and S is sparse (outliers/anomalies). SVD thresholding for nuclear norm, soft thresholding for L1.",
    source_file: "PrincipalComponentEngine.ts",
    source_course: "MIT 18.065",
    lines: 60,
    mfg_relevance: "MEDIUM",
    mfg_applications: ["outlier detection in sensor data", "process anomaly isolation", "robust baseline estimation"],
    functions: [
      { name: "PrincipalComponentEngine.robustPCA", description: "Robust PCA via ADMM" },
    ],
    consumers: ["anomaly_detection", "robust_process_monitoring"],
  },
  {
    id: "ALG-QUAD4-001",
    name: "Quad4 Bilinear Finite Element",
    type: "numerical",
    complexity_class: "O(n³) solve",
    size_complexity: "M",
    safety_class: "MEDIUM",
    integration_wave: 3,
    description: "4-node bilinear quadrilateral for 2D plane stress/strain. 2×2 Gauss quadrature, isoparametric mapping. Von Mises stress recovery at centroid. CG solver for large systems.",
    source_file: "FiniteElementEngine.ts",
    source_course: "MIT 2.093, MIT 2.094",
    lines: 120,
    mfg_relevance: "HIGH",
    mfg_applications: ["fixture compliance analysis", "workpiece stress prediction", "thermal distortion estimation"],
    functions: [
      { name: "finiteElementEngine.solveQuad4", description: "2D quad4 plane stress/strain solver" },
    ],
    consumers: ["fixture_analysis", "workpiece_deflection", "thermal_distortion"],
  },

  // --- QA-MS5 P0-U01: Genetic/Evolutionary Algorithms ---
  {
    id: "ALG-GA-001",
    name: "Genetic Algorithm",
    type: "optimization",
    complexity_class: "O(g × p × d)",
    size_complexity: "M",
    safety_class: "HIGH",
    integration_wave: 2,
    description: "Real-valued genetic algorithm with tournament/roulette selection, single/two/uniform/blend crossover, Gaussian/uniform mutation, elitism, convergence detection, stagnation limit.",
    source_file: "GeneticAlgorithmEngine.ts",
    source_course: "MIT 6.034, Stanford CS 221",
    lines: 380,
    mfg_relevance: "HIGH",
    mfg_applications: ["tool path optimization", "machine parameter tuning", "fixture layout", "multi-objective scheduling"],
    functions: [
      { name: "GeneticAlgorithmEngine.optimize", description: "Run GA optimization" },
      { name: "GeneticAlgorithmEngine.tournamentSelection", description: "Tournament selection" },
      { name: "GeneticAlgorithmEngine.blendCrossover", description: "BLX-alpha crossover" },
    ],
    consumers: ["toolpath_optimizer", "parameter_tuner", "schedule_optimizer"],
  },
  {
    id: "ALG-PSO-001",
    name: "Particle Swarm Optimization",
    type: "optimization",
    complexity_class: "O(i × s × d)",
    size_complexity: "M",
    safety_class: "HIGH",
    integration_wave: 2,
    description: "Swarm-based metaheuristic with inertia weight decay, cognitive/social terms, Clerc-Kennedy constriction factor, velocity clamping, convergence tolerance.",
    source_file: "ParticleSwarmOptimizationEngine.ts",
    source_course: "Kennedy & Eberhart (1995)",
    lines: 250,
    mfg_relevance: "HIGH",
    mfg_applications: ["continuous parameter optimization", "feed rate optimization", "spindle speed tuning"],
    functions: [
      { name: "ParticleSwarmOptimizationEngine.minimize", description: "PSO minimization" },
      { name: "ParticleSwarmOptimizationEngine.maximize", description: "PSO maximization" },
    ],
    consumers: ["feed_optimizer", "speed_optimizer", "parameter_tuner"],
  },
  {
    id: "ALG-ACO-001-EXT",
    name: "Ant Colony Optimization (Extended)",
    type: "optimization",
    complexity_class: "O(i × a × n²)",
    size_complexity: "M",
    safety_class: "HIGH",
    integration_wave: 2,
    description: "Ant System (AS) and Max-Min Ant System (MMAS) for combinatorial optimization. Pheromone trails, evaporation rate, alpha/beta parameters.",
    source_file: "AntColonyOptimizationEngine.ts",
    source_course: "Dorigo (1992)",
    lines: 220,
    mfg_relevance: "HIGH",
    mfg_applications: ["tool change sequencing", "fixture ordering", "machine routing", "operation sequencing"],
    functions: [
      { name: "AntColonyOptimizationEngine.solve", description: "Solve TSP-like problem" },
    ],
    consumers: ["tool_sequence_optimizer", "operation_scheduler"],
  },
  {
    id: "ALG-SWARM-001",
    name: "Swarm Algorithms Suite",
    type: "optimization",
    complexity_class: "O(i × s × d)",
    size_complexity: "M",
    safety_class: "HIGH",
    integration_wave: 2,
    description: "Combined PSO and ACO implementations with shared infrastructure. Includes inertia decay, cognitive/social terms, pheromone trails, roulette selection.",
    source_file: "SwarmAlgorithmsEngine.ts",
    source_course: "Kennedy & Eberhart (1995), Dorigo (1992)",
    lines: 300,
    mfg_relevance: "HIGH",
    mfg_applications: ["multi-objective optimization", "tool change optimization", "path planning"],
    functions: [
      { name: "SwarmAlgorithmsEngine.pso", description: "Particle swarm optimization" },
      { name: "SwarmAlgorithmsEngine.aco", description: "Ant colony optimization" },
    ],
    consumers: ["toolpath_optimizer", "change_optimizer", "route_planner"],
  },
  {
    id: "ALG-META-001",
    name: "Metaheuristic Framework",
    type: "optimization",
    complexity_class: "O(varies)",
    size_complexity: "L",
    safety_class: "HIGH",
    integration_wave: 2,
    description: "Unified metaheuristic framework supporting GA, PSO, ACO, simulated annealing, tabu search. Configurable operators and convergence criteria.",
    source_file: "MetaheuristicOptimizationEngine.ts",
    lines: 450,
    mfg_relevance: "HIGH",
    mfg_applications: ["complex optimization", "hybrid search", "adaptive optimization"],
    functions: [
      { name: "MetaheuristicOptimizationEngine.optimize", description: "Run metaheuristic" },
      { name: "MetaheuristicOptimizationEngine.hybridSearch", description: "Combined search" },
    ],
    consumers: ["complex_optimizer", "adaptive_tuner"],
  },

  // --- QA-MS5 P0-U02: Gradient Descent / Parameter Optimization ---
  {
    id: "ALG-GD-001",
    name: "Gradient Descent Suite",
    type: "optimization",
    complexity_class: "O(i × d)",
    size_complexity: "M",
    safety_class: "HIGH",
    integration_wave: 2,
    description: "4 gradient descent variants (vanilla, momentum, Nesterov, Adam), Newton's method with line search, BFGS quasi-Newton. Numerical differentiation fallback.",
    source_file: "GradientOptimizationEngine.ts",
    source_course: "MIT 6.251J, 15.099, Stanford AA222",
    lines: 380,
    mfg_relevance: "HIGH",
    mfg_applications: ["parameter tuning", "curve fitting", "process optimization", "model calibration"],
    functions: [
      { name: "GradientOptimizationEngine.gradientDescent", description: "GD with variants" },
      { name: "GradientOptimizationEngine.newton", description: "Newton's method" },
      { name: "GradientOptimizationEngine.bfgs", description: "BFGS quasi-Newton" },
    ],
    consumers: ["parameter_tuner", "model_calibrator", "curve_fitter"],
  },
  {
    id: "ALG-QP-001",
    name: "Quadratic Programming",
    type: "optimization",
    complexity_class: "O(n³)",
    size_complexity: "M",
    safety_class: "HIGH",
    integration_wave: 2,
    description: "Active-set QP solver for min 0.5 x^T Q x + c^T x s.t. Ax <= b, Aeq x = beq. Handles bounds, equality/inequality constraints. Projected gradient for general convex.",
    source_file: "ConvexOptimizationEngine.ts",
    source_course: "MIT 6.255, Stanford EE364A",
    lines: 320,
    mfg_relevance: "HIGH",
    mfg_applications: ["cutting parameter optimization", "tool allocation", "feed/speed trade-offs", "fixture clamping force"],
    functions: [
      { name: "ConvexOptimizationEngine.solveQP", description: "Quadratic programming solver" },
      { name: "ConvexOptimizationEngine.projectedGradient", description: "Projected gradient descent" },
    ],
    consumers: ["cutting_optimizer", "tool_allocator", "force_distributor"],
  },
  {
    id: "ALG-BO-001",
    name: "Bayesian Optimization",
    type: "optimization",
    complexity_class: "O(n³) per iteration",
    size_complexity: "L",
    safety_class: "HIGH",
    integration_wave: 2,
    description: "GP-based surrogate optimization for expensive black-box functions. Acquisition functions: EI, UCB, PI. Latin hypercube initialization. Sample-efficient.",
    source_file: "BayesianOptimizationEngine.ts",
    source_course: "MIT 6.882, Stanford CS229",
    lines: 450,
    mfg_relevance: "HIGH",
    mfg_applications: ["cutting parameter optimization", "tool life optimization", "process tuning with real trials"],
    functions: [
      { name: "BayesianOptimizationEngine.minimize", description: "BO minimization" },
      { name: "BayesianOptimizationEngine.predictGP", description: "GP prediction" },
      { name: "BayesianOptimizationEngine.acquisitionEI", description: "Expected improvement" },
    ],
    consumers: ["expensive_optimizer", "tool_life_tuner", "parameter_optimizer"],
  },
  {
    id: "ALG-SIMPLEX-001",
    name: "Nelder-Mead Simplex",
    type: "optimization",
    complexity_class: "O(n²) per iteration",
    size_complexity: "S",
    safety_class: "MEDIUM",
    integration_wave: 2,
    description: "Derivative-free simplex method for unconstrained optimization. Reflection, expansion, contraction, shrink operations. Robust for noisy objectives.",
    source_file: "OptimizationSimplexEngine.ts",
    lines: 200,
    mfg_relevance: "MEDIUM",
    mfg_applications: ["noisy objective optimization", "derivative-free tuning"],
    functions: [
      { name: "OptimizationSimplexEngine.minimize", description: "Nelder-Mead minimization" },
    ],
    consumers: ["noisy_optimizer", "robust_tuner"],
  },

  // --- QA-MS5 P0-U03: Monte Carlo Simulation Implementations ---
  {
    id: "ALG-MC-001",
    name: "Monte Carlo Engine",
    type: "ml",
    complexity_class: "O(n × d)",
    size_complexity: "M",
    safety_class: "HIGH",
    integration_wave: 2,
    description: "Core Monte Carlo simulation: random distributions (normal, lognormal, uniform, Weibull, beta), statistical analysis, percentiles, confidence intervals. Tolerance stack-up, tool life prediction.",
    source_file: "MonteCarloEngine.ts",
    source_course: "MIT 6.041, Stanford Stats 217",
    lines: 450,
    mfg_relevance: "HIGH",
    mfg_applications: ["tool life prediction", "tolerance stack-up", "process variation analysis", "risk quantification"],
    functions: [
      { name: "MonteCarloEngine.simulate", description: "Run Monte Carlo simulation" },
      { name: "MonteCarloEngine.toolLifePrediction", description: "Tool life MC prediction" },
      { name: "MonteCarloEngine.toleranceStackUp", description: "Tolerance analysis" },
    ],
    consumers: ["tool_life_predictor", "tolerance_analyzer", "risk_quantifier"],
  },
  {
    id: "ALG-MC-PROCESS-001",
    name: "Monte Carlo Process Engine",
    type: "ml",
    complexity_class: "O(n × d)",
    size_complexity: "M",
    safety_class: "HIGH",
    integration_wave: 2,
    description: "Process-focused Monte Carlo for manufacturing variability. Cutting force uncertainty, spindle dynamics, thermal effects, material property variation.",
    source_file: "MonteCarloProcessEngine.ts",
    lines: 380,
    mfg_relevance: "HIGH",
    mfg_applications: ["process uncertainty", "cutting force variation", "spindle dynamics", "thermal uncertainty"],
    functions: [
      { name: "MonteCarloProcessEngine.simulateProcess", description: "Process simulation" },
      { name: "MonteCarloProcessEngine.uncertaintyPropagation", description: "Uncertainty propagation" },
    ],
    consumers: ["process_analyzer", "uncertainty_quantifier"],
  },
  {
    id: "ALG-MC-CAPACITY-001",
    name: "Capacity Monte Carlo Engine",
    type: "ml",
    complexity_class: "O(n × m)",
    size_complexity: "M",
    safety_class: "MEDIUM",
    integration_wave: 2,
    description: "Stochastic capacity planning: machine availability, maintenance events, demand variability, queue simulation.",
    source_file: "CapacityMonteCarloEngine.ts",
    lines: 300,
    mfg_relevance: "HIGH",
    mfg_applications: ["capacity planning", "availability analysis", "queue simulation"],
    functions: [
      { name: "CapacityMonteCarloEngine.simulateCapacity", description: "Capacity simulation" },
    ],
    consumers: ["capacity_planner", "availability_analyzer"],
  },
  {
    id: "ALG-STOCHASTIC-001",
    name: "Stochastic Physics Suite",
    type: "ml",
    complexity_class: "O(n × d)",
    size_complexity: "L",
    safety_class: "HIGH",
    integration_wave: 2,
    description: "Stochastic variants of physics engines: cutting force, deflection, surface finish, thermal, tool life, tool wear, chatter, EDM, grinding. 15+ engines with uncertainty propagation.",
    source_file: "Stochastic*Engine.ts (15 files)",
    lines: 3500,
    mfg_relevance: "HIGH",
    mfg_applications: ["probabilistic physics", "uncertainty quantification", "robust process design"],
    functions: [
      { name: "StochasticCuttingForceEngine.simulate", description: "Force with uncertainty" },
      { name: "StochasticDeflectionEngine.simulate", description: "Deflection with uncertainty" },
      { name: "StochasticToolLifeEngine.simulate", description: "Tool life with uncertainty" },
    ],
    consumers: ["robust_optimizer", "probabilistic_analyzer", "risk_manager"],
  },

  // --- QA-MS5 P0-U04: Neural Network / ML Inference ---
  {
    id: "ALG-ANFIS-001",
    name: "Neuro-Fuzzy Hybrid (ANFIS)",
    type: "ml",
    complexity_class: "O(r × e × n)",
    size_complexity: "L",
    safety_class: "HIGH",
    integration_wave: 2,
    description: "ANFIS (Adaptive Neuro-Fuzzy Inference System), Fuzzy Taguchi, Type-2 Fuzzy Sets, Fuzzy AHP. Hybrid training with membership functions and gradient descent.",
    source_file: "FuzzyNeuralHybridEngine.ts",
    source_course: "Jang (1993), Mendel (2001), Saaty (1980)",
    lines: 420,
    mfg_relevance: "HIGH",
    mfg_applications: ["cutting parameter optimization", "multi-criteria decision", "process modeling"],
    functions: [
      { name: "FuzzyNeuralHybridEngine.anfis", description: "ANFIS inference" },
      { name: "FuzzyNeuralHybridEngine.fuzzyTaguchi", description: "Fuzzy Taguchi optimization" },
      { name: "FuzzyNeuralHybridEngine.fuzzyAHP", description: "Fuzzy AHP ranking" },
    ],
    consumers: ["parameter_optimizer", "decision_maker", "process_modeler"],
  },
  {
    id: "ALG-FUZZY-001",
    name: "Fuzzy Logic Engine",
    type: "ml",
    complexity_class: "O(r × n)",
    size_complexity: "M",
    safety_class: "MEDIUM",
    integration_wave: 2,
    description: "Fuzzy inference with Mamdani/Sugeno methods. Triangular, trapezoidal, Gaussian membership functions. Defuzzification: centroid, bisector, MOM.",
    source_file: "FuzzyLogicEngine.ts",
    lines: 300,
    mfg_relevance: "MEDIUM",
    mfg_applications: ["expert systems", "rule-based control", "imprecise reasoning"],
    functions: [
      { name: "FuzzyLogicEngine.infer", description: "Fuzzy inference" },
      { name: "FuzzyLogicEngine.defuzzify", description: "Defuzzification" },
    ],
    consumers: ["expert_system", "fuzzy_controller"],
  },
  {
    id: "ALG-BAYES-INF-001",
    name: "Bayesian Inference Engine",
    type: "ml",
    complexity_class: "O(n × d²)",
    size_complexity: "M",
    safety_class: "HIGH",
    integration_wave: 2,
    description: "Bayesian inference for parameter estimation. Conjugate priors, MCMC sampling, posterior predictive. Useful for tool life estimation with limited data.",
    source_file: "BayesianInferenceEngine.ts",
    lines: 350,
    mfg_relevance: "HIGH",
    mfg_applications: ["tool life estimation", "parameter uncertainty", "small sample inference"],
    functions: [
      { name: "BayesianInferenceEngine.updatePosterior", description: "Bayesian update" },
      { name: "BayesianInferenceEngine.predictive", description: "Posterior predictive" },
    ],
    consumers: ["tool_life_estimator", "uncertainty_quantifier"],
  },
  {
    id: "ALG-KDE-001",
    name: "KDE Gradient Boost",
    type: "ml",
    complexity_class: "O(n² × d)",
    size_complexity: "M",
    safety_class: "MEDIUM",
    integration_wave: 2,
    description: "Kernel density estimation with gradient boosting. Non-parametric density estimation for process modeling, anomaly detection, distribution fitting.",
    source_file: "KDEGradientBoostEngine.ts",
    lines: 280,
    mfg_relevance: "MEDIUM",
    mfg_applications: ["density estimation", "anomaly detection", "distribution fitting"],
    functions: [
      { name: "KDEGradientBoostEngine.fit", description: "Fit KDE model" },
      { name: "KDEGradientBoostEngine.score", description: "Density score" },
    ],
    consumers: ["anomaly_detector", "distribution_fitter"],
  },
  {
    id: "ALG-QLEARN-001",
    name: "Q-Learning Engine",
    type: "ml",
    complexity_class: "O(s × a × e)",
    size_complexity: "M",
    safety_class: "MEDIUM",
    integration_wave: 3,
    description: "Reinforcement learning Q-Learning for adaptive process control. Epsilon-greedy exploration, Q-table updates, policy extraction.",
    source_file: "QLearningEngine.ts",
    lines: 320,
    mfg_relevance: "MEDIUM",
    mfg_applications: ["adaptive control", "process optimization", "online learning"],
    functions: [
      { name: "QLearningEngine.train", description: "Q-learning training" },
      { name: "QLearningEngine.selectAction", description: "Policy action selection" },
    ],
    consumers: ["adaptive_controller", "online_optimizer"],
  },
  {
    id: "ALG-TRANSFER-001",
    name: "Transfer Learning Engine",
    type: "ml",
    complexity_class: "O(n × d)",
    size_complexity: "M",
    safety_class: "MEDIUM",
    integration_wave: 3,
    description: "Transfer learning for cross-domain knowledge. Feature alignment, domain adaptation, few-shot learning for new material/tool combinations.",
    source_file: "TransferLearningEngine.ts",
    lines: 350,
    mfg_relevance: "MEDIUM",
    mfg_applications: ["knowledge transfer", "new material adaptation", "few-shot learning"],
    functions: [
      { name: "TransferLearningEngine.transfer", description: "Domain transfer" },
      { name: "TransferLearningEngine.adapt", description: "Domain adaptation" },
    ],
    consumers: ["knowledge_transferrer", "domain_adapter"],
  },

  // --- QA-MS5 P0-U05: Statistical Process Control Algorithms ---
  {
    id: "ALG-SPC-CAP-001",
    name: "SPC Process Capability",
    type: "manufacturing",
    complexity_class: "O(n)",
    size_complexity: "M",
    safety_class: "CRITICAL",
    integration_wave: 1,
    description: "Cp, Cpk, Pp, Ppk, Cpm capability indices with ISO 22514-1 compliant measurement uncertainty propagation via Monte Carlo. Predicts reject rates, sigma levels.",
    source_file: "SPCProcessCapabilityEngine.ts",
    source_course: "ASQ CQE Body of Knowledge",
    lines: 350,
    mfg_relevance: "HIGH",
    mfg_applications: ["process capability", "quality prediction", "reject rate estimation"],
    functions: [
      { name: "SPCProcessCapabilityEngine.analyze", description: "Full SPC analysis" },
      { name: "SPCProcessCapabilityEngine.computeCpk", description: "Cpk calculation" },
    ],
    consumers: ["quality_analyzer", "capability_reporter"],
  },
  {
    id: "ALG-NELSON-001",
    name: "Nelson SPC Rules",
    type: "manufacturing",
    complexity_class: "O(n)",
    size_complexity: "S",
    safety_class: "HIGH",
    integration_wave: 1,
    description: "8 Nelson rules for out-of-control detection: single point beyond 3σ, 9 points same side, 6 consecutive increasing/decreasing, 14 alternating, etc.",
    source_file: "NelsonSPCRulesEngine.ts",
    source_course: "Nelson (1984), Western Electric",
    lines: 200,
    mfg_relevance: "HIGH",
    mfg_applications: ["control chart monitoring", "out-of-control detection", "process shifts"],
    functions: [
      { name: "nelsonSPCRulesEngine.check", description: "Check all Nelson rules" },
      { name: "nelsonSPCRulesEngine.getViolations", description: "Get rule violations" },
    ],
    consumers: ["spc_monitor", "control_chart"],
  },
  {
    id: "ALG-SPC-CHART-001",
    name: "SPC Charting Engine",
    type: "manufacturing",
    complexity_class: "O(n)",
    size_complexity: "M",
    safety_class: "HIGH",
    integration_wave: 1,
    description: "Control chart generation: X-bar/R, X-bar/S, I-MR, P, NP, C, U charts. Control limit calculation, subgroup statistics, trend analysis.",
    source_file: "SPCChartingEngine.ts",
    lines: 280,
    mfg_relevance: "HIGH",
    mfg_applications: ["control charts", "process monitoring", "trend detection"],
    functions: [
      { name: "SPCChartingEngine.xbarR", description: "X-bar/R chart" },
      { name: "SPCChartingEngine.iMR", description: "Individual-Moving Range chart" },
    ],
    consumers: ["chart_generator", "process_monitor"],
  },
  {
    id: "ALG-PROC-PREDICT-001",
    name: "Process Capability Prediction",
    type: "manufacturing",
    complexity_class: "O(n × d)",
    size_complexity: "M",
    safety_class: "HIGH",
    integration_wave: 2,
    description: "Predictive process capability using historical data. Estimates future Cpk based on tool wear, material variation, machine drift.",
    source_file: "ProcessCapabilityPredictionEngine.ts",
    lines: 250,
    mfg_relevance: "HIGH",
    mfg_applications: ["predictive quality", "capability forecasting", "preventive action"],
    functions: [
      { name: "ProcessCapabilityPredictionEngine.predict", description: "Predict future Cpk" },
    ],
    consumers: ["predictive_quality", "capability_forecaster"],
  },

  // --- QA-MS5 P0-U06: Cost Optimization / Multi-Objective ---
  {
    id: "ALG-PARETO-001",
    name: "Multi-Objective Pareto Optimizer",
    type: "optimization",
    complexity_class: "O(n² × d)",
    size_complexity: "L",
    safety_class: "HIGH",
    integration_wave: 2,
    description: "Pareto frontier generation for multi-objective machining. Grid sampling with Kienzle/Taylor physics, dominance filtering, frontier extraction. Objectives: cycle time, surface finish, tool life, cost, power.",
    source_file: "MultiObjectiveParetoEngine.ts",
    source_course: "Deb (2001) Multi-Objective Optimization",
    lines: 400,
    mfg_relevance: "HIGH",
    mfg_applications: ["multi-objective machining", "trade-off analysis", "parameter optimization"],
    functions: [
      { name: "MultiObjectiveParetoEngine.generateFrontier", description: "Generate Pareto frontier" },
      { name: "MultiObjectiveParetoEngine.selectKnee", description: "Find knee point" },
    ],
    consumers: ["multi_objective_optimizer", "trade_off_analyzer"],
  },
  {
    id: "ALG-MOEA-001",
    name: "Multi-Objective Evolutionary",
    type: "optimization",
    complexity_class: "O(g × p × d)",
    size_complexity: "L",
    safety_class: "HIGH",
    integration_wave: 2,
    description: "NSGA-II style multi-objective evolutionary algorithm. Non-dominated sorting, crowding distance, elitist selection. For complex Pareto frontiers.",
    source_file: "MultiObjectiveEngine.ts",
    lines: 380,
    mfg_relevance: "HIGH",
    mfg_applications: ["complex multi-objective", "NSGA-II optimization", "evolutionary Pareto"],
    functions: [
      { name: "MultiObjectiveEngine.optimize", description: "MOEA optimization" },
      { name: "MultiObjectiveEngine.nonDominatedSort", description: "Non-dominated sorting" },
    ],
    consumers: ["moea_optimizer", "pareto_evolver"],
  },
  {
    id: "ALG-COOLANT-COST-001",
    name: "Coolant Cost Optimizer",
    type: "manufacturing",
    complexity_class: "O(n)",
    size_complexity: "M",
    safety_class: "MEDIUM",
    integration_wave: 2,
    description: "Lifecycle cost comparison for coolant strategies: MQL, flood, cryogenic, dry, through-tool. Includes acquisition, disposal, filtration, maintenance, tool wear penalty.",
    source_file: "CoolantCostOptimizationEngine.ts",
    source_course: "Shokrani (2012), Pusavec (2010), ISO 14001",
    lines: 320,
    mfg_relevance: "HIGH",
    mfg_applications: ["coolant strategy selection", "lifecycle costing", "sustainability"],
    functions: [
      { name: "CoolantCostOptimizationEngine.compare", description: "Compare coolant strategies" },
      { name: "CoolantCostOptimizationEngine.optimal", description: "Find optimal strategy" },
    ],
    consumers: ["coolant_selector", "cost_analyzer"],
  },
  {
    id: "ALG-SETUP-COST-001",
    name: "Setup Cost Optimizer",
    type: "manufacturing",
    complexity_class: "O(n × m)",
    size_complexity: "M",
    safety_class: "MEDIUM",
    integration_wave: 2,
    description: "Minimize total setup cost: fixture changes, tool changes, part orientation. Sequence optimization for batch manufacturing.",
    source_file: "SetupCostOptimizationEngine.ts",
    lines: 280,
    mfg_relevance: "HIGH",
    mfg_applications: ["setup minimization", "batch optimization", "fixture planning"],
    functions: [
      { name: "SetupCostOptimizationEngine.optimize", description: "Optimize setup sequence" },
    ],
    consumers: ["setup_optimizer", "batch_planner"],
  },
  // ENGINE-AUDIT (2026-06-19, slot:bravo) -- 3 orphaned MIT-OCW ports now wired into prism_algorithm;
  // registered here so the gateway capability-recommend layer (algorithmRegistry.all()) can surface them.
  {
    id: "ALG-CONTROL-STATESPACE-001",
    name: "Linear State-Space Model",
    type: "control",
    complexity_class: "O(n^3)",
    size_complexity: "M",
    safety_class: "MEDIUM",
    integration_wave: 2,
    description: "LTI state-space (A,B,C,D) analysis: characteristic polynomial (Faddeev-LeVerrier), transfer-function derivation, frequency response, and Kalman controllability/observability ranks. MIT-OCW port.",
    source_file: "LinearStateSpaceModel.ts",
    source_course: "MIT 6.003",
    lines: 483,
    mfg_relevance: "MEDIUM",
    mfg_applications: ["servo/feed-drive analysis", "machine dynamics", "control-loop design"],
    functions: [
      { name: "LinearStateSpaceModel.calculate", description: "TF / frequency_response / ranks / char-poly from A,B,C,D" },
    ],
    consumers: ["prism_algorithm:control_statespace"],
  },
  {
    id: "ALG-ML-TSNE-001",
    name: "t-SNE Dimensionality Reduction",
    type: "ml",
    complexity_class: "O(n^2)",
    size_complexity: "L",
    safety_class: "LOW",
    integration_wave: 3,
    description: "t-distributed Stochastic Neighbor Embedding: nonlinear manifold dimensionality reduction (van der Maaten and Hinton 2008). Seeded RNG for deterministic embeddings. MIT-OCW port.",
    source_file: "TSNEAlgorithm.ts",
    source_course: "MIT 6.034",
    lines: 271,
    mfg_relevance: "LOW",
    mfg_applications: ["feature-space visualization", "tool-wear clustering viz", "sensor embedding"],
    functions: [
      { name: "TSNEAlgorithm.embed", description: "Embed high-D points into 2-3D preserving local structure" },
    ],
    consumers: ["prism_algorithm:ml_tsne"],
  },
  {
    id: "ALG-NUMERICAL-FEM1D-001",
    name: "1D Finite Element Method (BVP)",
    type: "numerical",
    complexity_class: "O(n)",
    size_complexity: "M",
    safety_class: "MEDIUM",
    integration_wave: 2,
    description: "1D linear finite-element solver for -d/dx(a du/dx) + c u = f on [0,L] with Dirichlet/Neumann BCs (Thomas tridiagonal solve; nodally exact for the Poisson problem). MIT-OCW port.",
    source_file: "FiniteElementMethod1D.ts",
    source_course: "MIT 18.085",
    lines: 323,
    mfg_relevance: "MEDIUM",
    mfg_applications: ["thermal/structural BVP", "1D heat conduction", "beam deflection"],
    functions: [
      { name: "FiniteElementMethod1D.calculate", description: "Solve the 1D BVP; returns nodal solution + mesh" },
    ],
    consumers: ["prism_algorithm:num_fem_1d"],
  },
];

// ============================================================================
// ALGORITHM TYPES (categories for indexing)
// ============================================================================

/** A L G O R I T H M_ T Y P E S constant.
 */
export const ALGORITHM_TYPES: AlgorithmType[] = [
  "graph",
  "optimization",
  "search",
  "interpolation",
  "manufacturing",
  "numerical",
  "signal",
  "ml",
  "control",
  "toolpath",
  "data_structure",
  "graphics",
  "knowledge",
  "ensemble",
];

// ============================================================================
// ALGORITHM REGISTRY CLASS
// ============================================================================

/** Algorithm Registry engine/manager.
 */
export class AlgorithmRegistry extends BaseRegistry<AlgorithmEntry> {
  private indexByType: Map<string, string[]> = new Map();
  private indexBySafetyClass: Map<string, string[]> = new Map();
  private indexByRelevance: Map<string, string[]> = new Map();
  private indexByWave: Map<number, string[]> = new Map();
  private indexByConsumer: Map<string, string[]> = new Map();

  constructor() {
    super(
      "AlgorithmRegistry",
      path.join(PATHS.STATE_DIR, "algorithm-registry.json"),
      "1.0.0"
    );
  }

  /**
   * Load algorithms from built-ins and files
   */
  async load(): Promise<void> {
    if (this.loaded) return;

    log.info("Loading AlgorithmRegistry...");

    // Load built-in algorithms first
    /** For.
     * @param const - const
     * @returns void
     */
    for (const algo of BUILT_IN_ALGORITHMS) {
      this.entries.set(algo.id, {
        id: algo.id,
        data: algo,
        metadata: {
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          version: 1,
          source: "built-in",
        },
      });
    }

    // Load from scan results / state files
    await this.loadFromScanFile();

    // Load from extracted algorithm directory
    await this.loadFromAlgorithmDir();

    // Build indexes
    this.buildIndexes();

    this.loaded = true;
    log.info(
      `AlgorithmRegistry loaded: ${this.entries.size} algorithms across ${this.indexByType.size} types`
    );
  }

  /**
   * Load algorithms from the MS0 scan file if available
   */
  private async loadFromScanFile(): Promise<void> {
    const scanPaths = [
      path.join(PATHS.STATE_DIR, "MS0_ALGORITHMS_FORMULAS_SCAN.json"),
      path.join(PATHS.STATE_DIR, "algorithm-registry.json"),
    ];

    /** For.
     * @param const - const
     * @returns void
     */
    for (const scanPath of scanPaths) {
      try {
        if (!(await fileExists(scanPath))) continue;

        const data = await readJsonFile<any>(scanPath);

        // Handle the MS0 scan format: { algorithms: { files: [...] } }
        const files = data?.algorithms?.files || data?.files || [];
        if (!Array.isArray(files)) continue;

        let loaded = 0;
        /** For.
         * @param const - const
         * @returns void
         */
        for (const file of files) {
          const algId = this.fileNameToId(file.name);
          if (this.has(algId)) continue;

          const entry = this.parseScanEntry(file, algId);
          if (!entry) continue;

          this.entries.set(algId, {
            id: algId,
            data: entry,
            metadata: {
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
              version: 1,
              source: scanPath,
            },
          });
          loaded++;
        }

        /** If.
         * @param loaded - loaded
         * @returns void
         */
        if (loaded > 0) {
          log.info(`Loaded ${loaded} algorithms from ${scanPath}`);
          return; // Use first successful source
        }
      } catch (error) {
        log.warn(`Failed to load algorithm scan from ${scanPath}: ${error}`);
      }
    }
  }

  /**
   * Load algorithms from extracted algorithm directory
   */
  private async loadFromAlgorithmDir(): Promise<void> {
    const algDir = path.join(PATHS.EXTRACTED_DIR, "algorithms");

    if (!(await fileExists(algDir))) {
      log.debug("Algorithm directory not found, using built-ins only");
      return;
    }

    try {
      const files = await listDirectory(algDir);
      const jsFiles = files.filter(
        (f) => f.name.endsWith(".js") || f.name.endsWith(".json")
      );

      /** For.
       * @param const - const
       * @returns void
       */
      for (const file of jsFiles) {
        const algId = this.fileNameToId(file.name);

        // Skip if already loaded from scan or built-in
        if (this.has(algId)) continue;

        // Create minimal entry from the filename
        this.entries.set(algId, {
          id: algId,
          data: {
            id: algId,
            name: this.fileNameToDisplayName(file.name),
            type: "manufacturing",
            complexity_class: "unknown",
            size_complexity: "S",
            safety_class: "MEDIUM",
            integration_wave: 3,
            description: `Algorithm module: ${file.name}`,
            source_file: file.name,
            mfg_relevance: "MEDIUM",
            functions: [],
          },
          metadata: {
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            version: 1,
            source: file.path,
          },
        });
      }
    } catch (error) {
      log.warn(`Failed to scan algorithm directory: ${error}`);
    }
  }

  /**
   * Build search indexes for fast lookup
   */
  private buildIndexes(): void {
    this.indexByType.clear();
    this.indexBySafetyClass.clear();
    this.indexByRelevance.clear();
    this.indexByWave.clear();
    this.indexByConsumer.clear();

    /** For.
     * @param const - const
     * @param entry] - entry]
     * @returns void
     */
    for (const [id, entry] of this.entries) {
      const algo = entry.data;

      // Index by type
      /** If.
       * @param algo.type - algo.type
       * @returns void
       */
      if (algo.type) {
        if (!this.indexByType.has(algo.type)) {
          this.indexByType.set(algo.type, []);
        }
        this.indexByType.get(algo.type)!.push(id);
      }

      // Index by safety class
      /** If.
       * @param algo.safety_class - algo.safety_class
       * @returns void
       */
      if (algo.safety_class) {
        if (!this.indexBySafetyClass.has(algo.safety_class)) {
          this.indexBySafetyClass.set(algo.safety_class, []);
        }
        this.indexBySafetyClass.get(algo.safety_class)!.push(id);
      }

      // Index by mfg relevance
      /** If.
       * @param algo.mfg_relevance - algo.mfg_relevance
       * @returns void
       */
      if (algo.mfg_relevance) {
        if (!this.indexByRelevance.has(algo.mfg_relevance)) {
          this.indexByRelevance.set(algo.mfg_relevance, []);
        }
        this.indexByRelevance.get(algo.mfg_relevance)!.push(id);
      }

      // Index by integration wave
      /** If.
       * @param algo.integration_wave - algo.integration_wave
       * @returns void
       */
      if (algo.integration_wave) {
        if (!this.indexByWave.has(algo.integration_wave)) {
          this.indexByWave.set(algo.integration_wave, []);
        }
        this.indexByWave.get(algo.integration_wave)!.push(id);
      }

      // Index by consumer
      /** If.
       * @param algo.consumers - algo.consumers
       * @returns void
       */
      if (algo.consumers) {
        /** For.
         * @param const - const
         * @returns void
         */
        for (const consumer of algo.consumers) {
          if (!this.indexByConsumer.has(consumer)) {
            this.indexByConsumer.set(consumer, []);
          }
          this.indexByConsumer.get(consumer)!.push(id);
        }
      }
    }
  }

  // ==========================================================================
  // PUBLIC API: Query Methods
  // ==========================================================================

  /**
   * Get algorithm by ID
   */
  async getAlgorithm(id: string): Promise<AlgorithmEntry | undefined> {
    await this.load();
    return this.get(id);
  }

  /**
   * Get algorithms by type (graph, optimization, search, etc.)
   */
  async getByType(type: AlgorithmType): Promise<AlgorithmEntry[]> {
    await this.load();

    const ids = this.indexByType.get(type) || [];
    return ids.map((id) => this.get(id)).filter(Boolean) as AlgorithmEntry[];
  }

  /**
   * Get algorithms by manufacturing relevance (HIGH, MEDIUM, LOW)
   */
  async getByRelevance(relevance: MfgRelevance): Promise<AlgorithmEntry[]> {
    await this.load();

    const ids = this.indexByRelevance.get(relevance) || [];
    return ids.map((id) => this.get(id)).filter(Boolean) as AlgorithmEntry[];
  }

  /**
   * Get algorithms by safety class
   */
  async getBySafetyClass(
    safetyClass: AlgorithmSafetyClass
  ): Promise<AlgorithmEntry[]> {
    await this.load();

    const ids = this.indexBySafetyClass.get(safetyClass) || [];
    return ids.map((id) => this.get(id)).filter(Boolean) as AlgorithmEntry[];
  }

  /**
   * Get algorithms by integration wave (1 = CRITICAL first, 4 = LOW last)
   */
  async getByWave(wave: number): Promise<AlgorithmEntry[]> {
    await this.load();

    const ids = this.indexByWave.get(wave) || [];
    return ids.map((id) => this.get(id)).filter(Boolean) as AlgorithmEntry[];
  }

  /**
   * Get algorithms for a specific consumer (engine/tool)
   */
  async getForConsumer(consumer: string): Promise<AlgorithmEntry[]> {
    await this.load();

    const ids = this.indexByConsumer.get(consumer) || [];
    return ids.map((id) => this.get(id)).filter(Boolean) as AlgorithmEntry[];
  }

  /**
   * Search algorithms with filters and text query
   */
  async searchAlgorithms(options: {
    query?: string;
    type?: AlgorithmType;
    safety_class?: AlgorithmSafetyClass;
    mfg_relevance?: MfgRelevance;
    integration_wave?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ algorithms: AlgorithmEntry[]; total: number }> {
    await this.load();

    let results: AlgorithmEntry[] = [];

    // Start with most selective index
    /** If.
     * @param options.type - options.type
     * @returns void
     */
    if (options.type) {
      results = await this.getByType(options.type);
    } else if (options.safety_class) {
      results = await this.getBySafetyClass(options.safety_class);
    } else if (options.mfg_relevance) {
      results = await this.getByRelevance(options.mfg_relevance);
    } else if (options.integration_wave) {
      results = await this.getByWave(options.integration_wave);
    } else {
      results = this.all();
    }

    // Apply additional filters
    /** If.
     * @param options.type - options.type
     * @returns void
     */
    if (options.type && !options.safety_class && !options.mfg_relevance) {
      // Already filtered by type
    } else {
      /** If.
       * @param options.type - options.type
       * @returns void
       */
      if (options.type) {
        results = results.filter((a) => a.type === options.type);
      }
    }
    if (
      options.safety_class &&
      !(
        !options.type &&
        options.safety_class &&
        !options.mfg_relevance &&
        !options.integration_wave
      )
    ) {
      results = results.filter(
        (a) => a.safety_class === options.safety_class
      );
    }
    /** If.
     * @param options.mfg_relevance - options.mfg_relevance
     * @returns void
     */
    if (options.mfg_relevance) {
      results = results.filter(
        (a) => a.mfg_relevance === options.mfg_relevance
      );
    }
    /** If.
     * @param options.integration_wave - options.integration_wave
     * @returns void
     */
    if (options.integration_wave !== undefined) {
      results = results.filter(
        (a) => a.integration_wave === options.integration_wave
      );
    }

    // Text search (multi-term AND across all fields)
    /** If.
     * @param options.query - options.query
     * @returns void
     */
    if (options.query && options.query !== "*") {
      const terms = options.query
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 0);
      results = results.filter((algo) => {
        const searchText = [
          algo.name,
          algo.description,
          algo.type,
          algo.source_file,
          algo.source_course || "",
          ...(algo.mfg_applications || []),
          ...algo.functions.map((f) => f.name),
        ]
          .join(" ")
          .toLowerCase();
        return terms.every((term) => searchText.includes(term));
      });
    }

    const total = results.length;

    // Pagination
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    results = results.slice(offset, offset + limit);

    return { algorithms: results, total };
  }

  /**
   * List all algorithms with optional filtering
   */
  async listAlgorithms(options?: {
    type?: AlgorithmType;
    safety_class?: AlgorithmSafetyClass;
    mfg_relevance?: MfgRelevance;
    limit?: number;
    offset?: number;
  }): Promise<{ algorithms: AlgorithmEntry[]; total: number }> {
    await this.load();

    let results: AlgorithmEntry[];

    /** If.
     * @param options?.type - options?.type
     * @returns void
     */
    if (options?.type) {
      results = await this.getByType(options.type);
    } else if (options?.safety_class) {
      results = await this.getBySafetyClass(options.safety_class);
    } else if (options?.mfg_relevance) {
      results = await this.getByRelevance(options.mfg_relevance);
    } else {
      results = this.all();
    }

    const total = results.length;

    // Pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    results = results.slice(offset, offset + limit);

    return { algorithms: results, total };
  }

  /**
   * Get statistics about loaded algorithms
   */
  async getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    bySafetyClass: Record<string, number>;
    byRelevance: Record<string, number>;
    byWave: Record<string, number>;
    consumerCount: number;
  }> {
    await this.load();

    const stats = {
      total: this.entries.size,
      byType: {} as Record<string, number>,
      bySafetyClass: {} as Record<string, number>,
      byRelevance: {} as Record<string, number>,
      byWave: {} as Record<string, number>,
      consumerCount: this.indexByConsumer.size,
    };

    /** For.
     * @param const - const
     * @param ids] - ids]
     * @returns void
     */
    for (const [type, ids] of this.indexByType) {
      stats.byType[type] = ids.length;
    }

    /** For.
     * @param const - const
     * @param ids] - ids]
     * @returns void
     */
    for (const [sc, ids] of this.indexBySafetyClass) {
      stats.bySafetyClass[sc] = ids.length;
    }

    /** For.
     * @param const - const
     * @param ids] - ids]
     * @returns void
     */
    for (const [rel, ids] of this.indexByRelevance) {
      stats.byRelevance[rel] = ids.length;
    }

    /** For.
     * @param const - const
     * @param ids] - ids]
     * @returns void
     */
    for (const [wave, ids] of this.indexByWave) {
      stats.byWave[`wave_${wave}`] = ids.length;
    }

    return stats;
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Convert scan file entry to AlgorithmEntry
   */
  private parseScanEntry(
    file: any,
    algId: string
  ): AlgorithmEntry | null {
    if (!file.name) return null;

    return {
      id: algId,
      name: this.fileNameToDisplayName(file.name),
      type: this.inferType(file.name, file.description || ""),
      complexity_class: this.sizeToComplexityHint(file.complexity),
      size_complexity: file.complexity || "S",
      safety_class: file.safety_class || "MEDIUM",
      integration_wave: file.integration_wave || 3,
      description: file.description || `Algorithm module: ${file.name}`,
      source_file: file.name,
      lines: file.lines,
      mfg_relevance: file.mfg_relevance || "MEDIUM",
      functions: [],
      potential_duplicate_of: file.potential_duplicate_of,
    };
  }

  /**
   * Derive a stable ID from an algorithm filename
   * PRISM_SIGNAL_ALGORITHMS.js -> ALG-SIGNAL-ALGORITHMS
   */
  private fileNameToId(filename: string): string {
    return (
      "ALG-" +
      filename
        .replace(/^PRISM_/, "")
        .replace(/^COMPLETE_/, "")
        .replace(/\.js$/, "")
        .replace(/\.json$/, "")
        .toUpperCase()
        .replace(/_/g, "-")
    );
  }

  /**
   * Convert filename to human-readable display name
   * PRISM_SIGNAL_ALGORITHMS.js -> "Signal Algorithms"
   */
  private fileNameToDisplayName(filename: string): string {
    return filename
      .replace(/^PRISM_/, "")
      .replace(/^COMPLETE_/, "")
      .replace(/\.js$/, "")
      .replace(/\.json$/, "")
      .replace(/_/g, " ")
      .replace(/\bMIT\b/g, "MIT")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /**
   * Infer algorithm type from filename and description
   */
  private inferType(filename: string, description: string): AlgorithmType {
    const lower = (filename + " " + description).toLowerCase();

    if (lower.includes("signal") || lower.includes("fft") || lower.includes("spectral")) return "signal";
    if (lower.includes("graph_neural") || lower.includes("rl_") || lower.includes("policy_gradient") || lower.includes("reinforcement")) return "ml";
    if (lower.includes("graph") && !lower.includes("neural")) return "graph";
    if (lower.includes("toolpath") || lower.includes("tool_path")) return "toolpath";
    if (lower.includes("control") || lower.includes("pid") || lower.includes("digital_control")) return "control";
    if (lower.includes("search")) return "search";
    if (lower.includes("optimi")) return "optimization";
    if (lower.includes("interpol") || lower.includes("nurbs") || lower.includes("bezier") || lower.includes("spline")) return "interpolation";
    if (lower.includes("numerical") || lower.includes("linalg") || lower.includes("ode") || lower.includes("jacobian")) return "numerical";
    if (lower.includes("graphics") || lower.includes("kernel_pass")) return "graphics";
    if (lower.includes("manufacturing") || lower.includes("mfg") || lower.includes("dfm") || lower.includes("taylor") || lower.includes("johnson_cook")) return "manufacturing";
    if (lower.includes("knowledge") || lower.includes("phase7")) return "knowledge";
    if (lower.includes("ensemble")) return "ensemble";
    if (lower.includes("kdtree") || lower.includes("octree") || lower.includes("sorting") || lower.includes("core_algorithms")) return "data_structure";

    return "manufacturing"; // Default for PRISM context
  }

  /**
   * Map size complexity to a rough Big-O hint
   */
  private sizeToComplexityHint(sizeComplexity: string): string {
    switch (sizeComplexity) {
      case "S":
        return "O(n)";
      case "M":
        return "O(n log n)";
      case "L":
        return "O(n^2)";
      case "XL":
        return "O(n^2) or higher";
      default:
        return "unknown";
    }
  }
}

// Export singleton instance
/** Algorithm Registry constant.
 */
export const algorithmRegistry = new AlgorithmRegistry();
