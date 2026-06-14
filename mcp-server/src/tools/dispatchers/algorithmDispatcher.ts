/**
 * Algorithm Dispatcher — Wire 52 Algorithms to MCP Actions
 * PP-AGI-S0/U-S0-06: Wire dormant algorithms from AlgorithmRegistry
 *
 * Exposes algorithms across 11 domains:
 *   - signal: FFT, spectral analysis, digital filtering
 *   - control: PID, Kalman filter, transfer functions
 *   - optimization: gradient descent, ACO, local search
 *   - numerical: linear algebra, ODE solvers, Jacobian
 *   - graph: Dijkstra, topological sort, MST
 *   - search: A*, beam search, IDA*
 *   - interpolation: NURBS, Bezier, splines
 *   - toolpath: morphing spiral, trochoidal, adaptive
 *   - surface: curvature analysis, mesh refinement
 *   - spatial: KD-tree, octree queries
 *   - ml: policy gradient, RL optimization
 *
 * Tool: prism_algorithm
 * Actions: 35 total (see ACTIONS array)
 *
 * @module dispatchers/algorithmDispatcher
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

// ============================================================================
// ACTION DEFINITIONS (40 actions across 11 domains)
// ============================================================================

const SIGNAL_ACTIONS = [
  "signal_fft",              // Fast Fourier Transform
  "signal_spectral",         // Power spectral density
  "signal_filter",           // Digital FIR/IIR filters
  "signal_chatter_predict",  // FFT-based chatter prediction
  // ALGO-SYNERGY (2026-05-29, slot:tango) — peak-preserving polynomial smoothing (NEW)
  "signal_savgol",           // SavitzkyGolayFilter — smooth / differentiate telemetry
] as const;

const CONTROL_ACTIONS = [
  "control_pid",             // PID controller
  "control_pid_tune",        // Ziegler-Nichols auto-tuning
  "control_kalman",          // Extended Kalman Filter
  "control_transfer",        // Transfer function analysis
] as const;

const OPTIMIZATION_ACTIONS = [
  "opt_gradient_descent",    // Steepest descent
  "opt_conjugate_gradient",  // Conjugate gradient method
  "opt_bfgs",                // BFGS quasi-Newton
  "opt_local_search",        // Local search metaheuristic
  "opt_aco_sequence",        // Ant Colony for sequencing
  "opt_lp_solve",            // Linear programming solver
  // ALGO-SYNERGY-MS0 (2026-05-25, slot:tango) — new substrate
  "opt_lbfgsb",              // L-BFGS-B bound-constrained quasi-Newton
  "opt_hypervolume",         // Pareto-front hypervolume quality measure
] as const;

const NUMERICAL_ACTIONS = [
  "num_linalg_solve",        // Linear algebra solve
  "num_ode_solve",           // ODE solver (RK4, adaptive)
  "num_jacobian",            // Jacobian matrix computation
  "num_eigenvalue",          // Eigenvalue decomposition
  "num_monte_carlo",         // Monte Carlo simulation
] as const;

const GRAPH_ACTIONS = [
  "graph_dijkstra",          // Shortest path
  "graph_topological",       // Topological sort
  "graph_mst",               // Minimum spanning tree
  "graph_bfs_dfs",           // Breadth/depth-first search
  // ALGO-SYNERGY-MS0 (2026-05-25, slot:tango) — new substrate
  "graph_pagerank",          // Personalized PageRank / random-walk-with-restart
  // ALGO-SYNERGY (2026-05-29, slot:tango) — heterophily-aware GNN feature aggregation
  "graph_heterophily_aggregate", // H2GCN ego/neighbour-separated, higher-order embedding
] as const;

const SEARCH_ACTIONS = [
  "search_astar",            // A* search
  "search_beam",             // Beam search
  "search_ida_star",         // Iterative deepening A*
  "search_rbfs",             // Recursive best-first
] as const;

const INTERPOLATION_ACTIONS = [
  "interp_nurbs",            // NURBS surface evaluation
  "interp_bezier",           // Bezier curve evaluation
  "interp_spline",           // Cubic spline interpolation
] as const;

const TOOLPATH_ACTIONS = [
  "toolpath_morph_spiral",   // Morphing spiral
  "toolpath_trochoidal",     // Trochoidal milling path
  "toolpath_adaptive",       // Adaptive clearing
  "toolpath_rest",           // Rest machining
] as const;

const SURFACE_ACTIONS = [
  "surface_curvature",       // Surface curvature analysis
  "surface_mesh_refine",     // Ruppert mesh refinement
] as const;

const SPATIAL_ACTIONS = [
  "spatial_kdtree",          // KD-tree nearest neighbor
  "spatial_octree",          // Octree spatial query
  // ALGO-SYNERGY (2026-05-29, slot:tango) — robust geometric fitting (NEW, metrology/CAD/quality)
  "spatial_ransac_fit",      // RANSACHyperplane — robust line/plane/hyperplane fit, outlier rejection + TLS refit
] as const;

const ML_ACTIONS = [
  "ml_policy_gradient",      // Policy gradient RL
  "ml_rl_optimize",          // RL optimization
  // ALGO-SYNERGY (2026-05-29, slot:tango) — expose 5 built-but-unwired ML Algorithm<I,O> classes
  "ml_neural_infer",         // NeuralInference — feed-forward inference
  "ml_regression",           // RegressionEngine — linear/poly regression fit+predict
  "ml_decision_tree",        // DecisionTreeClassifier — CART classification
  "ml_clustering",           // ClusteringEngine — k-means style clustering
  "ml_ensemble_predict",     // EnsemblePredictorModel — ensemble aggregation
  // ALGO-SYNERGY (2026-05-29, slot:tango) — 2 density/medoid clustering primitives (static-shape)
  "ml_dbscan",               // DBSCANAlgorithm — density clustering (labels per point)
  "ml_kmedoids",             // KMedoidsAlgorithm — k-medoids clustering
  // ALGO-SYNERGY (2026-05-29, slot:tango) — neural activation library (foundational DL)
  "ml_activation",           // ActivationFunctionsAlgorithm — relu/sigmoid/tanh/gelu/softmax/...
  // ALGO-SYNERGY (2026-05-29, slot:tango) — Transformer attention operator (NEW)
  "ml_attention",            // ScaledDotProductAttention — softmax(QKᵀ/√d_k+mask)·V
  // ALGO-SYNERGY (2026-05-29, slot:tango) — truncated SVD for LoRA (NEW)
  "ml_lowrank",              // LowRankApproximation — rank-k truncated SVD (power iteration)
  // ALGO-SYNERGY (2026-05-29, slot:tango) — HMM MAP sequence decoding (NEW, deep-reasoning)
  "ml_viterbi",              // ViterbiDecoder — exact HMM MAP path (log-space DP)
  // ALGO-SYNERGY (2026-05-29, slot:tango) — elastic time-series alignment (NEW, cross-domain)
  "ml_dtw",                  // DynamicTimeWarping — warp distance + alignment path
  // ALGO-SYNERGY (2026-05-29, slot:tango) — PCA dimensionality reduction (NEW, composes ml_lowrank)
  "ml_pca",                  // PrincipalComponentAnalysis — components + scores + explained variance
  // ALGO-SYNERGY (2026-05-29, slot:tango) — k-NN retrieval/classify/regress (NEW, RAG core)
  "ml_knn",                  // KNearestNeighbors — cosine/euclidean top-k search + classify + regress
  // ALGO-SYNERGY (2026-05-29, slot:tango) — soft probabilistic clustering (NEW, completes clustering family)
  "ml_gmm",                  // GaussianMixtureModel — EM soft clustering: weights/means/variances/responsibilities
  // ALGO-SYNERGY (2026-05-29, slot:tango) — transformer-block normalization (NEW, pairs with ml_attention)
  "ml_layernorm",            // LayerNormalization — per-sample feature normalization + affine (γ,β)
  // ALGO-SYNERGY (2026-05-29, slot:tango) — n-best sequence decoding (NEW, companion to exact ml_viterbi)
  "ml_beam_search",          // BeamSearchDecoder — top-K decoding over emission/transition log-prob trellis
  // ALGO-SYNERGY (2026-05-29, slot:tango) — multi-head attention (NEW, composes ml_attention per head)
  "ml_multihead_attention",  // MultiHeadAttention — h-head split + per-head ml_attention + concat + Wo projection
  // ALGO-SYNERGY (2026-05-29, slot:tango) — full transformer block (NEW, composes MHA+LayerNorm+FFN+residual)
  "ml_transformer_block",    // TransformerBlock — pre/post-LN self-attention + FFN block, the capstone composition
] as const;

const ACTIONS = [
  ...SIGNAL_ACTIONS,
  ...CONTROL_ACTIONS,
  ...OPTIMIZATION_ACTIONS,
  ...NUMERICAL_ACTIONS,
  ...GRAPH_ACTIONS,
  ...SEARCH_ACTIONS,
  ...INTERPOLATION_ACTIONS,
  ...TOOLPATH_ACTIONS,
  ...SURFACE_ACTIONS,
  ...SPATIAL_ACTIONS,
  ...ML_ACTIONS,
] as const;

type AlgorithmAction = typeof ACTIONS[number];

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function err(message: string) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }], isError: true };
}

// ============================================================================
// DISPATCHER REGISTRATION
// ============================================================================

export function registerAlgorithmDispatcher(server: Server): void {
  server.tool(
    "prism_algorithm",
    `Algorithm execution dispatcher (35 actions). Signal processing, control systems, optimization, numerical methods, graph algorithms, search, interpolation, toolpath generation, surface analysis, spatial indexing, and ML. Domains: signal, control, optimization, numerical, graph, search, interpolation, toolpath, surface, spatial, ml. Actions: ${ACTIONS.join(", ")}`,
    {
      action: z.enum(ACTIONS),
      params: z.record(z.string(), z.any()).optional(),
    },
    async ({ action, params = {} }: { action: AlgorithmAction; params: Record<string, unknown> }) => {
      log.info(`[prism_algorithm] ${action}`);

      try {
        // Lazy-load algorithm engines
        const { algorithmGatewayEngine } = await import("../../engines/AlgorithmGatewayEngine.js");
        const { algorithmRegistry } = await import("../../registries/AlgorithmRegistry.js");

        switch (action) {
          // ============================================================
          // SIGNAL PROCESSING (4 actions)
          // ============================================================
          case "signal_fft": {
            const signal = params.signal as number[];
            const sampleRate = (params.sample_rate_hz as number) || 1000;
            if (!signal || !Array.isArray(signal)) {
              return err("Missing required param: signal (number[])");
            }
            const result = algorithmGatewayEngine.executeFFT({
              signal,
              sample_rate_hz: sampleRate,
              window: (params.window as "hann" | "hamming" | "rectangular") || "hann",
            });
            return ok(result);
          }

          case "signal_spectral": {
            const signal = params.signal as number[];
            const sampleRate = (params.sample_rate_hz as number) || 1000;
            if (!signal || !Array.isArray(signal)) {
              return err("Missing required param: signal (number[])");
            }
            const result = algorithmGatewayEngine.spectralAnalysis({
              signal,
              sample_rate_hz: sampleRate,
            });
            return ok(result);
          }

          case "signal_filter": {
            const signal = params.signal as number[];
            const filterType = (params.filter_type as string) || "lowpass";
            const cutoffHz = (params.cutoff_hz as number) || 100;
            if (!signal || !Array.isArray(signal)) {
              return err("Missing required param: signal (number[])");
            }
            const result = algorithmGatewayEngine.digitalFilter({
              signal,
              filter_type: filterType as "lowpass" | "highpass" | "bandpass",
              cutoff_hz: cutoffHz,
              order: (params.order as number) || 4,
            });
            return ok(result);
          }

          case "signal_chatter_predict": {
            const signal = params.signal as number[];
            const sampleRate = (params.sample_rate_hz as number) || 10000;
            const spindleRpm = (params.spindle_rpm as number) || 5000;
            if (!signal || !Array.isArray(signal)) {
              return err("Missing required param: signal (number[])");
            }
            const result = algorithmGatewayEngine.predictChatter({
              vibration_signal: signal,
              sample_rate_hz: sampleRate,
              spindle_rpm: spindleRpm,
              tooth_count: (params.tooth_count as number) || 4,
            });
            return ok(result);
          }

          // ============================================================
          // CONTROL SYSTEMS (4 actions)
          // ============================================================
          case "control_pid": {
            const kp = (params.kp as number) ?? 1.0;
            const ki = (params.ki as number) ?? 0.1;
            const kd = (params.kd as number) ?? 0.05;
            const setpoint = (params.setpoint as number) ?? 0;
            const current = (params.current as number) ?? 0;
            const result = algorithmGatewayEngine.pidControl({
              kp, ki, kd, setpoint, current,
              dt: (params.dt as number) || 0.01,
              integral_limit: params.integral_limit as number,
            });
            return ok(result);
          }

          case "control_pid_tune": {
            const processGain = (params.process_gain as number) || 1.0;
            const timeConstant = (params.time_constant as number) || 1.0;
            const deadTime = (params.dead_time as number) || 0.1;
            const result = algorithmGatewayEngine.zieglerNicholsTune({
              process_gain: processGain,
              time_constant: timeConstant,
              dead_time: deadTime,
              method: (params.method as "classic" | "some_overshoot" | "no_overshoot") || "classic",
            });
            return ok(result);
          }

          case "control_kalman": {
            const measurement = (params.measurement as number) ?? 0;
            const processNoise = (params.process_noise as number) || 0.01;
            const measurementNoise = (params.measurement_noise as number) || 0.1;
            const result = algorithmGatewayEngine.kalmanFilter({
              measurement,
              process_noise: processNoise,
              measurement_noise: measurementNoise,
              state_estimate: params.state_estimate as number,
              error_covariance: params.error_covariance as number,
            });
            return ok(result);
          }

          case "control_transfer": {
            const numerator = params.numerator as number[];
            const denominator = params.denominator as number[];
            if (!numerator || !denominator) {
              return err("Missing required params: numerator, denominator (number[])");
            }
            const result = algorithmGatewayEngine.transferFunction({
              numerator,
              denominator,
              frequency_range: params.frequency_range as [number, number],
            });
            return ok(result);
          }

          // ============================================================
          // OPTIMIZATION (6 actions)
          // ============================================================
          case "opt_gradient_descent": {
            const objective = params.objective as string;
            const initialPoint = params.initial_point as number[];
            if (!objective || !initialPoint) {
              return err("Missing required params: objective, initial_point");
            }
            const result = algorithmGatewayEngine.gradientDescent({
              objective,
              initial_point: initialPoint,
              learning_rate: (params.learning_rate as number) || 0.01,
              max_iterations: (params.max_iterations as number) || 1000,
              tolerance: (params.tolerance as number) || 1e-6,
            });
            return ok(result);
          }

          case "opt_conjugate_gradient": {
            const A = params.A as number[][];
            const b = params.b as number[];
            if (!A || !b) {
              return err("Missing required params: A (matrix), b (vector)");
            }
            const result = algorithmGatewayEngine.conjugateGradient({
              A, b,
              x0: params.x0 as number[],
              tolerance: (params.tolerance as number) || 1e-8,
            });
            return ok(result);
          }

          case "opt_bfgs": {
            const objective = params.objective as string;
            const initialPoint = params.initial_point as number[];
            if (!objective || !initialPoint) {
              return err("Missing required params: objective, initial_point");
            }
            const result = algorithmGatewayEngine.bfgs({
              objective,
              initial_point: initialPoint,
              max_iterations: (params.max_iterations as number) || 100,
              tolerance: (params.tolerance as number) || 1e-6,
            });
            return ok(result);
          }

          case "opt_local_search": {
            const solution = params.solution as number[];
            const neighborhood = (params.neighborhood as string) || "swap";
            if (!solution) {
              return err("Missing required param: solution (number[])");
            }
            const result = algorithmGatewayEngine.localSearch({
              solution,
              neighborhood: neighborhood as "swap" | "insert" | "2opt",
              max_iterations: (params.max_iterations as number) || 1000,
            });
            return ok(result);
          }

          case "opt_aco_sequence": {
            const nodes = params.nodes as Array<{ id: string; x: number; y: number }>;
            if (!nodes || !Array.isArray(nodes)) {
              return err("Missing required param: nodes (array of {id, x, y})");
            }
            const result = algorithmGatewayEngine.acoSequence({
              nodes,
              ant_count: (params.ant_count as number) || 20,
              iterations: (params.iterations as number) || 100,
              alpha: (params.alpha as number) || 1.0,
              beta: (params.beta as number) || 2.0,
              evaporation: (params.evaporation as number) || 0.5,
            });
            return ok(result);
          }

          case "opt_lp_solve": {
            const c = params.c as number[];
            const A = params.A as number[][];
            const b = params.b as number[];
            if (!c || !A || !b) {
              return err("Missing required params: c (objective), A (constraints), b (bounds)");
            }
            const result = algorithmGatewayEngine.lpSolve({
              c, A, b,
              maximize: (params.maximize as boolean) ?? false,
            });
            return ok(result);
          }

          // ALGO-SYNERGY-MS0/U-ALGO-MAT-01 — L-BFGS-B bound-constrained optimizer.
          // Caller passes a JSON-serializable cost surface OR a code-string
          // objective; we re-import the canonical algorithm and call it directly.
          case "opt_lbfgsb": {
            const { LBFGSBOptimizer } = await import("../../algorithms/LBFGSBOptimizer.js");
            const objExpr = params.objective as string | undefined;
            const initialPoint = params.initial_point as number[] | undefined;
            if (!objExpr || !initialPoint) {
              return err("Missing required params: objective (expression string of x[i]), initial_point");
            }
            // Build the objective+gradient callable from the expression.
            const { safeFunctionEval } = await import("../../utils/safeMathEval.js");
            const paramNames = initialPoint.map((_, i) => `x${i}`);
            const compiled = safeFunctionEval(objExpr, paramNames);
            const evalObj = (x: ReadonlyArray<number>): number => {
              const v = compiled(Math, ...x);
              return typeof v === "number" ? v : NaN;
            };
            const fdStep = (params.fd_step as number) || 1e-5;
            const fun = (x: ReadonlyArray<number>) => {
              const f = evalObj(x);
              const g = new Array<number>(x.length);
              for (let i = 0; i < x.length; i++) {
                const xPlus = Array.from(x); xPlus[i] += fdStep;
                const xMinus = Array.from(x); xMinus[i] -= fdStep;
                g[i] = (evalObj(xPlus) - evalObj(xMinus)) / (2 * fdStep);
              }
              return { f, g };
            };
            const result = LBFGSBOptimizer.calculate({
              fun,
              x0: initialPoint,
              lower: params.lower as number[] | undefined,
              upper: params.upper as number[] | undefined,
              memory: params.memory as number | undefined,
              maxIter: params.max_iterations as number | undefined,
              tolGrad: params.tol_grad as number | undefined,
              tolF: params.tol_f as number | undefined,
            });
            return ok(result);
          }

          // ALGO-SYNERGY-MS0/U-ALGO-MAT-10 — Hypervolume indicator for Pareto fronts.
          case "opt_hypervolume": {
            const { HypervolumeIndicator } = await import("../../algorithms/HypervolumeIndicator.js");
            const points = params.points as number[][] | undefined;
            if (!points || !Array.isArray(points)) {
              return err("Missing required param: points (array of objective vectors)");
            }
            const result = HypervolumeIndicator.calculate({
              points,
              reference: params.reference as number[] | undefined,
              reference_inflation: params.reference_inflation as number | undefined,
              assume_non_dominated: params.assume_non_dominated as boolean | undefined,
            });
            return ok(result);
          }

          // ============================================================
          // NUMERICAL (5 actions)
          // ============================================================
          case "num_linalg_solve": {
            const A = params.A as number[][];
            const b = params.b as number[];
            if (!A || !b) {
              return err("Missing required params: A (matrix), b (vector)");
            }
            const result = algorithmGatewayEngine.linalgSolve({
              A, b,
              method: (params.method as "lu" | "qr" | "svd") || "lu",
            });
            return ok(result);
          }

          case "num_ode_solve": {
            const ode = params.ode as string;
            const y0 = params.y0 as number[];
            const tSpan = params.t_span as [number, number];
            if (!ode || !y0 || !tSpan) {
              return err("Missing required params: ode, y0, t_span");
            }
            const result = algorithmGatewayEngine.odeSolve({
              ode, y0, t_span: tSpan,
              method: (params.method as "rk4" | "euler" | "adaptive") || "rk4",
              step_size: params.step_size as number,
            });
            return ok(result);
          }

          case "num_jacobian": {
            const dhParams = params.dh_params as Array<{ a: number; alpha: number; d: number; theta: number }>;
            if (!dhParams || !Array.isArray(dhParams)) {
              return err("Missing required param: dh_params (Denavit-Hartenberg parameters)");
            }
            const result = algorithmGatewayEngine.computeJacobian({
              dh_params: dhParams,
              joint_angles: params.joint_angles as number[],
            });
            return ok(result);
          }

          case "num_eigenvalue": {
            const A = params.A as number[][];
            if (!A || !Array.isArray(A)) {
              return err("Missing required param: A (matrix)");
            }
            const result = algorithmGatewayEngine.eigenvalue({
              A,
              method: (params.method as "qr" | "power") || "qr",
            });
            return ok(result);
          }

          case "num_monte_carlo": {
            const samples = (params.samples as number) || 10000;
            const model = params.model as string;
            const distributions = params.distributions as Record<string, { type: string; params: number[] }>;
            if (!model) {
              return err("Missing required param: model (expression string)");
            }
            const result = algorithmGatewayEngine.monteCarlo({
              model, samples,
              distributions: distributions || {},
            });
            return ok(result);
          }

          // ============================================================
          // GRAPH (4 actions)
          // ============================================================
          case "graph_dijkstra": {
            const graph = params.graph as Record<string, Record<string, number>>;
            const start = params.start as string;
            const end = params.end as string;
            if (!graph || !start) {
              return err("Missing required params: graph, start");
            }
            const result = algorithmGatewayEngine.dijkstra({ graph, start, end });
            return ok(result);
          }

          case "graph_topological": {
            const nodes = params.nodes as string[];
            const edges = params.edges as Array<[string, string]>;
            if (!nodes || !edges) {
              return err("Missing required params: nodes, edges");
            }
            const result = algorithmGatewayEngine.topologicalSort({ nodes, edges });
            return ok(result);
          }

          case "graph_mst": {
            const edges = params.edges as Array<{ from: string; to: string; weight: number }>;
            if (!edges) {
              return err("Missing required param: edges (weighted edge list)");
            }
            const result = algorithmGatewayEngine.mst({
              edges,
              algorithm: (params.algorithm as "kruskal" | "prim") || "kruskal",
            });
            return ok(result);
          }

          case "graph_bfs_dfs": {
            const graph = params.graph as Record<string, string[]>;
            const start = params.start as string;
            const mode = (params.mode as "bfs" | "dfs") || "bfs";
            if (!graph || !start) {
              return err("Missing required params: graph, start");
            }
            const result = algorithmGatewayEngine.bfsDfs({ graph, start, mode });
            return ok(result);
          }

          // ALGO-SYNERGY-MS0/U-ALGO-RET-04 — Personalized PageRank on a typed graph.
          case "graph_pagerank": {
            const { PersonalizedPageRank } = await import("../../algorithms/PersonalizedPageRank.js");
            const nodes = params.nodes as string[] | undefined;
            const edges = params.edges as Array<{ from: string; to: string; weight?: number }> | undefined;
            if (!nodes || !edges) {
              return err("Missing required params: nodes (string[]), edges ({from, to, weight?}[])");
            }
            const result = PersonalizedPageRank.calculate({
              graph: { nodes, edges },
              seed: params.seed as string[] | Record<string, number> | undefined,
              damping: params.damping as number | undefined,
              maxIter: params.max_iterations as number | undefined,
              tol: params.tolerance as number | undefined,
              topK: params.top_k as number | undefined,
            });
            return ok(result);
          }

          // ALGO-SYNERGY (2026-05-29, slot:tango) — H2GCN heterophily-aware aggregation.
          // Model-side lever for the deferred NN/GNN deploy gate (AUROC≈0.096 heterophily);
          // produces richer node embeddings for india's GraphSAGE pipeline + sierra's graph.
          case "graph_heterophily_aggregate": {
            const { HeterophilyAwareAggregator } = await import("../../algorithms/HeterophilyAwareAggregator.js");
            const features = params.features as number[][] | undefined;
            const edges = params.edges as Array<[number, number]> | undefined;
            if (!features || !edges) {
              return err("Missing required params: features (number[][]), edges ([number,number][])");
            }
            const validation = HeterophilyAwareAggregator.validate({ features, edges });
            if (!validation.valid) {
              return err(`Invalid input: ${(validation.errors ?? []).join("; ")}`);
            }
            const result = HeterophilyAwareAggregator.calculate({
              features,
              edges,
              maxHops: params.max_hops as number | undefined,
              normalize: params.normalize as "mean" | "sum" | undefined,
            });
            return ok(result);
          }

          // ============================================================
          // SEARCH (4 actions)
          // ============================================================
          case "search_astar": {
            const start = params.start as unknown;
            const goal = params.goal as unknown;
            const neighbors = params.neighbors_fn as string;
            const heuristic = params.heuristic_fn as string;
            if (!start || !goal) {
              return err("Missing required params: start, goal");
            }
            const result = algorithmGatewayEngine.aStarSearch({
              start, goal,
              neighbors_fn: neighbors || "default",
              heuristic_fn: heuristic || "euclidean",
            });
            return ok(result);
          }

          case "search_beam": {
            const start = params.start as unknown;
            const beamWidth = (params.beam_width as number) || 5;
            const maxDepth = (params.max_depth as number) || 100;
            if (!start) {
              return err("Missing required param: start");
            }
            const result = algorithmGatewayEngine.beamSearch({
              start, beam_width: beamWidth, max_depth: maxDepth,
              expand_fn: params.expand_fn as string,
              evaluate_fn: params.evaluate_fn as string,
            });
            return ok(result);
          }

          case "search_ida_star": {
            const start = params.start as unknown;
            const goal = params.goal as unknown;
            if (!start || !goal) {
              return err("Missing required params: start, goal");
            }
            const result = algorithmGatewayEngine.idaStar({
              start, goal,
              heuristic_fn: params.heuristic_fn as string,
              max_iterations: (params.max_iterations as number) || 100000,
            });
            return ok(result);
          }

          case "search_rbfs": {
            const start = params.start as unknown;
            const goal = params.goal as unknown;
            if (!start || !goal) {
              return err("Missing required params: start, goal");
            }
            const result = algorithmGatewayEngine.rbfs({
              start, goal,
              heuristic_fn: params.heuristic_fn as string,
              f_limit: params.f_limit as number,
            });
            return ok(result);
          }

          // ============================================================
          // INTERPOLATION (3 actions)
          // ============================================================
          case "interp_nurbs": {
            const controlPoints = params.control_points as number[][];
            const weights = params.weights as number[];
            const knots = params.knots as number[];
            const u = (params.u as number) ?? 0.5;
            const v = params.v as number;
            if (!controlPoints) {
              return err("Missing required param: control_points");
            }
            const result = algorithmGatewayEngine.evaluateNURBS({
              control_points: controlPoints,
              weights: weights || controlPoints.map(() => 1),
              knots: knots || [],
              u, v,
              degree: (params.degree as number) || 3,
            });
            return ok(result);
          }

          case "interp_bezier": {
            const controlPoints = params.control_points as number[][];
            const t = (params.t as number) ?? 0.5;
            if (!controlPoints) {
              return err("Missing required param: control_points");
            }
            const result = algorithmGatewayEngine.evaluateBezier({
              control_points: controlPoints, t,
            });
            return ok(result);
          }

          case "interp_spline": {
            const points = params.points as number[][];
            const x = params.x as number;
            if (!points) {
              return err("Missing required param: points");
            }
            const result = algorithmGatewayEngine.cubicSpline({
              points, x,
              boundary: (params.boundary as "natural" | "clamped") || "natural",
            });
            return ok(result);
          }

          // ============================================================
          // TOOLPATH (4 actions)
          // ============================================================
          case "toolpath_morph_spiral": {
            const boundary = params.boundary as number[][];
            const stepover = (params.stepover as number) || 2.0;
            if (!boundary) {
              return err("Missing required param: boundary (polygon points)");
            }
            const result = algorithmGatewayEngine.morphSpiral({
              boundary, stepover,
              direction: (params.direction as "cw" | "ccw") || "cw",
            });
            return ok(result);
          }

          case "toolpath_trochoidal": {
            const slot = params.slot as { start: number[]; end: number[]; width: number };
            const toolDia = (params.tool_diameter as number) || 10;
            if (!slot) {
              return err("Missing required param: slot ({start, end, width})");
            }
            const result = algorithmGatewayEngine.trochoidalPath({
              slot, tool_diameter: toolDia,
              engagement: (params.engagement as number) || 0.1,
              stepdown: params.stepdown as number,
            });
            return ok(result);
          }

          case "toolpath_adaptive": {
            const boundary = params.boundary as number[][];
            const islands = params.islands as number[][][];
            const toolDia = (params.tool_diameter as number) || 10;
            if (!boundary) {
              return err("Missing required param: boundary");
            }
            const result = algorithmGatewayEngine.adaptiveClearing({
              boundary, islands: islands || [],
              tool_diameter: toolDia,
              max_engagement: (params.max_engagement as number) || 0.4,
              stepdown: (params.stepdown as number) || 2.0,
            });
            return ok(result);
          }

          case "toolpath_rest": {
            const previousPath = params.previous_path as number[][];
            const previousToolDia = (params.previous_tool_diameter as number) || 20;
            const newToolDia = (params.new_tool_diameter as number) || 10;
            if (!previousPath) {
              return err("Missing required param: previous_path");
            }
            const result = algorithmGatewayEngine.restMachining({
              previous_path: previousPath,
              previous_tool_diameter: previousToolDia,
              new_tool_diameter: newToolDia,
              boundary: params.boundary as number[][],
            });
            return ok(result);
          }

          // ============================================================
          // SURFACE (2 actions)
          // ============================================================
          case "surface_curvature": {
            const surface = params.surface as unknown;
            const u = (params.u as number) ?? 0.5;
            const v = (params.v as number) ?? 0.5;
            if (!surface) {
              return err("Missing required param: surface (NURBS or mesh)");
            }
            const result = algorithmGatewayEngine.surfaceCurvature({
              surface, u, v,
            });
            return ok(result);
          }

          case "surface_mesh_refine": {
            const vertices = params.vertices as number[][];
            const triangles = params.triangles as number[][];
            if (!vertices || !triangles) {
              return err("Missing required params: vertices, triangles");
            }
            const result = algorithmGatewayEngine.meshRefinement({
              vertices, triangles,
              min_angle: (params.min_angle as number) || 20,
              max_area: params.max_area as number,
            });
            return ok(result);
          }

          // ============================================================
          // SPATIAL (3 actions)
          // ============================================================
          case "spatial_kdtree": {
            const points = params.points as number[][];
            const query = params.query as number[];
            const k = (params.k as number) || 1;
            if (!points || !query) {
              return err("Missing required params: points, query");
            }
            const result = algorithmGatewayEngine.kdTreeQuery({
              points, query, k,
              radius: params.radius as number,
            });
            return ok(result);
          }

          case "spatial_octree": {
            const points = params.points as number[][];
            const bbox = params.bbox as { min: number[]; max: number[] };
            const query = params.query as { min: number[]; max: number[] };
            if (!points || !bbox) {
              return err("Missing required params: points, bbox");
            }
            const result = algorithmGatewayEngine.octreeQuery({
              points, bbox, query,
            });
            return ok(result);
          }

          // ALGO-SYNERGY (2026-05-29, slot:tango) — RANSAC robust hyperplane fit (metrology/CAD/quality).
          case "spatial_ransac_fit": {
            const { RANSACHyperplane } = await import("../../algorithms/RANSACHyperplane.js");
            const points = params.points as number[][] | undefined;
            const threshold = params.threshold as number | undefined;
            if (!points || typeof threshold !== "number") {
              return err("Missing required params: points (number[][]), threshold (number)");
            }
            const ransacInput = {
              points, threshold,
              iterations: params.iterations as number | undefined,
              seed: params.seed as number | undefined,
              refit: params.refit as boolean | undefined,
            };
            const rv = RANSACHyperplane.validate(ransacInput);
            if (!rv.valid) return err(`Invalid input: ${(rv.errors ?? []).join("; ")}`);
            return ok(RANSACHyperplane.calculate(ransacInput));
          }

          // ============================================================
          // ML (21 actions)
          // ============================================================
          case "ml_policy_gradient": {
            const state = params.state as number[];
            const actionSpace = (params.action_space as number) || 4;
            if (!state) {
              return err("Missing required param: state (feature vector)");
            }
            const result = algorithmGatewayEngine.policyGradient({
              state, action_space: actionSpace,
              learning_rate: (params.learning_rate as number) || 0.01,
              model_path: params.model_path as string,
            });
            return ok(result);
          }

          case "ml_rl_optimize": {
            const environment = params.environment as string;
            const episodes = (params.episodes as number) || 100;
            if (!environment) {
              return err("Missing required param: environment");
            }
            const result = algorithmGatewayEngine.rlOptimize({
              environment, episodes,
              algorithm: (params.algorithm as "ppo" | "dqn" | "a2c") || "ppo",
              max_steps: (params.max_steps as number) || 1000,
            });
            return ok(result);
          }

          // ALGO-SYNERGY (2026-05-29, slot:tango) — 5 built-but-unwired ML classes exposed.
          // Uniform Algorithm<I,O> pattern: caller passes a typed `input` object;
          // each class's own validate() gates before calculate() (R12 — err, not crash).
          case "ml_neural_infer": {
            const { NeuralInference } = await import("../../algorithms/NeuralInference.js");
            const raw = params.input;
            if (!raw || typeof raw !== "object") return err("Missing required param: input (NeuralInferenceInput object)");
            const algo = new NeuralInference();
            const input = raw as Parameters<typeof algo.calculate>[0];
            const v = algo.validate(input);
            if (!v.valid) return err(`Invalid input: ${(v.errors ?? []).join("; ")}`);
            return ok(algo.calculate(input));
          }

          case "ml_regression": {
            const { RegressionEngine } = await import("../../algorithms/RegressionEngine.js");
            const raw = params.input;
            if (!raw || typeof raw !== "object") return err("Missing required param: input (RegressionEngineInput object)");
            const algo = new RegressionEngine();
            const input = raw as Parameters<typeof algo.calculate>[0];
            const v = algo.validate(input);
            if (!v.valid) return err(`Invalid input: ${(v.errors ?? []).join("; ")}`);
            return ok(algo.calculate(input));
          }

          case "ml_decision_tree": {
            const { DecisionTreeClassifier } = await import("../../algorithms/DecisionTreeClassifier.js");
            const raw = params.input;
            if (!raw || typeof raw !== "object") return err("Missing required param: input (DecisionTreeClassifierInput object)");
            const algo = new DecisionTreeClassifier();
            const input = raw as Parameters<typeof algo.calculate>[0];
            const v = algo.validate(input);
            if (!v.valid) return err(`Invalid input: ${(v.errors ?? []).join("; ")}`);
            return ok(algo.calculate(input));
          }

          case "ml_clustering": {
            const { ClusteringEngine } = await import("../../algorithms/ClusteringEngine.js");
            const raw = params.input;
            if (!raw || typeof raw !== "object") return err("Missing required param: input (ClusteringEngineInput object)");
            const algo = new ClusteringEngine();
            const input = raw as Parameters<typeof algo.calculate>[0];
            const v = algo.validate(input);
            if (!v.valid) return err(`Invalid input: ${(v.errors ?? []).join("; ")}`);
            return ok(algo.calculate(input));
          }

          case "ml_ensemble_predict": {
            const { EnsemblePredictorModel } = await import("../../algorithms/EnsemblePredictorModel.js");
            const raw = params.input;
            if (!raw || typeof raw !== "object") return err("Missing required param: input (EnsemblePredictorInput object)");
            const algo = new EnsemblePredictorModel();
            const input = raw as Parameters<typeof algo.calculate>[0];
            const v = algo.validate(input);
            if (!v.valid) return err(`Invalid input: ${(v.errors ?? []).join("; ")}`);
            return ok(algo.calculate(input));
          }

          // ALGO-SYNERGY (2026-05-29, slot:tango) — 2 clustering primitives (static-shape, THROW on bad
          // input → wrap in try/catch so the dispatcher returns err() not a crash, R12).
          case "ml_dbscan": {
            const { DBSCANAlgorithm } = await import("../../algorithms/DBSCANAlgorithm.js");
            const points = params.points as number[][] | undefined;
            const eps = params.eps as number | undefined;
            const minPts = params.min_pts as number | undefined;
            if (!points || typeof eps !== "number" || typeof minPts !== "number") {
              return err("Missing required params: points (number[][]), eps (number), min_pts (number)");
            }
            try {
              const labels = DBSCANAlgorithm.cluster(points, eps, minPts);
              const clusterCount = labels.length ? Math.max(0, ...labels) : 0;
              const noise = labels.filter((l) => l === 0).length;
              return ok({ labels, clusterCount, noise });
            } catch (e) {
              return err(`DBSCAN failed: ${e instanceof Error ? e.message : String(e)}`);
            }
          }

          case "ml_kmedoids": {
            const { KMedoidsAlgorithm } = await import("../../algorithms/KMedoidsAlgorithm.js");
            const points = params.points as number[][] | undefined;
            const k = params.k as number | undefined;
            if (!points || typeof k !== "number") {
              return err("Missing required params: points (number[][]), k (number)");
            }
            try {
              const result = KMedoidsAlgorithm.cluster(points, k, {
                maxIter: params.max_iterations as number | undefined,
              });
              return ok(result);
            } catch (e) {
              return err(`KMedoids failed: ${e instanceof Error ? e.message : String(e)}`);
            }
          }

          // ALGO-SYNERGY (2026-05-29, slot:tango) — neural activation library (apply() THROWS on
          // unknown name → try/catch err-not-crash, R12). softmax/logSoftmax are vector ops.
          case "ml_activation": {
            const { ActivationFunctionsAlgorithm } = await import("../../algorithms/ActivationFunctionsAlgorithm.js");
            const values = params.values as number | number[] | undefined;
            const name = params.name as string | undefined;
            if (values === undefined || !name) {
              return err("Missing required params: values (number|number[]), name (e.g. relu/sigmoid/tanh/gelu/softmax)");
            }
            try {
              let result: number | number[];
              if (name === "softmax" || name === "logSoftmax") {
                if (!Array.isArray(values)) return err(`${name} requires values to be number[]`);
                result = name === "softmax"
                  ? ActivationFunctionsAlgorithm.softmax(values)
                  : ActivationFunctionsAlgorithm.logSoftmax(values);
              } else {
                result = ActivationFunctionsAlgorithm.apply(
                  values,
                  name as Parameters<typeof ActivationFunctionsAlgorithm.apply>[1],
                  ...((params.params as number[] | undefined) ?? []),
                );
              }
              return ok({ result, activation: name });
            } catch (e) {
              return err(`Activation failed: ${e instanceof Error ? e.message : String(e)}`);
            }
          }

          // ALGO-SYNERGY (2026-05-29, slot:tango) — Transformer scaled dot-product attention.
          case "ml_attention": {
            const { ScaledDotProductAttention } = await import("../../algorithms/ScaledDotProductAttention.js");
            const query = params.query as number[][] | undefined;
            const key = params.key as number[][] | undefined;
            const value = params.value as number[][] | undefined;
            if (!query || !key || !value) {
              return err("Missing required params: query (number[][]), key (number[][]), value (number[][])");
            }
            const attnInput = {
              query, key, value,
              scale: params.scale as number | undefined,
              causal: params.causal as boolean | undefined,
              mask: params.mask as number[][] | undefined,
            };
            const av = ScaledDotProductAttention.validate(attnInput);
            if (!av.valid) return err(`Invalid input: ${(av.errors ?? []).join("; ")}`);
            return ok(ScaledDotProductAttention.calculate(attnInput));
          }

          // ALGO-SYNERGY (2026-05-29, slot:tango) — truncated SVD / low-rank approximation (LoRA).
          case "ml_lowrank": {
            const { LowRankApproximation } = await import("../../algorithms/LowRankApproximation.js");
            const matrix = params.matrix as number[][] | undefined;
            const rank = params.rank as number | undefined;
            if (!matrix || typeof rank !== "number") {
              return err("Missing required params: matrix (number[][]), rank (number)");
            }
            const lrInput = {
              matrix, rank,
              maxIter: params.max_iterations as number | undefined,
              tol: params.tolerance as number | undefined,
              seed: params.seed as number | undefined,
            };
            const lv = LowRankApproximation.validate(lrInput);
            if (!lv.valid) return err(`Invalid input: ${(lv.errors ?? []).join("; ")}`);
            return ok(LowRankApproximation.calculate(lrInput));
          }

          // ALGO-SYNERGY (2026-05-29, slot:tango) — Viterbi HMM MAP sequence decoding.
          case "ml_viterbi": {
            const { ViterbiDecoder } = await import("../../algorithms/ViterbiDecoder.js");
            const observations = params.observations as number[] | undefined;
            const startProb = params.start_prob as number[] | undefined;
            const transitionProb = params.transition_prob as number[][] | undefined;
            const emissionProb = params.emission_prob as number[][] | undefined;
            if (!observations || !startProb || !transitionProb || !emissionProb) {
              return err("Missing required params: observations (number[]), start_prob (number[]), transition_prob (number[][]), emission_prob (number[][])");
            }
            const vitInput = {
              observations, startProb, transitionProb, emissionProb,
              logInput: params.log_input as boolean | undefined,
            };
            const vv = ViterbiDecoder.validate(vitInput);
            if (!vv.valid) return err(`Invalid input: ${(vv.errors ?? []).join("; ")}`);
            return ok(ViterbiDecoder.calculate(vitInput));
          }

          // ALGO-SYNERGY (2026-05-29, slot:tango) — Dynamic Time Warping (elastic alignment).
          case "ml_dtw": {
            const { DynamicTimeWarping } = await import("../../algorithms/DynamicTimeWarping.js");
            const a = params.a as number[][] | undefined;
            const b = params.b as number[][] | undefined;
            if (!a || !b) {
              return err("Missing required params: a (number[][]), b (number[][]) — each row a timestep vector");
            }
            const dtwInput = {
              a, b,
              metric: params.metric as "euclidean" | "manhattan" | "sqeuclidean" | undefined,
              window: params.window as number | undefined,
            };
            const dv = DynamicTimeWarping.validate(dtwInput);
            if (!dv.valid) return err(`Invalid input: ${(dv.errors ?? []).join("; ")}`);
            return ok(DynamicTimeWarping.calculate(dtwInput));
          }

          // ALGO-SYNERGY (2026-05-29, slot:tango) — PCA (composes ml_lowrank truncated SVD).
          case "ml_pca": {
            const { PrincipalComponentAnalysis } = await import("../../algorithms/PrincipalComponentAnalysis.js");
            const data = params.data as number[][] | undefined;
            const components = params.components as number | undefined;
            if (!data || typeof components !== "number") {
              return err("Missing required params: data (number[][]), components (number)");
            }
            const pcaInput = {
              data, components,
              center: params.center as boolean | undefined,
              scale: params.scale as boolean | undefined,
              maxIter: params.max_iterations as number | undefined,
              seed: params.seed as number | undefined,
            };
            const pv = PrincipalComponentAnalysis.validate(pcaInput);
            if (!pv.valid) return err(`Invalid input: ${(pv.errors ?? []).join("; ")}`);
            return ok(PrincipalComponentAnalysis.calculate(pcaInput));
          }

          // ALGO-SYNERGY (2026-05-29, slot:tango) — k-NN retrieval / classify / regress (RAG core).
          case "ml_knn": {
            const { KNearestNeighbors } = await import("../../algorithms/KNearestNeighbors.js");
            const queries = params.queries as number[][] | undefined;
            const corpus = params.corpus as number[][] | undefined;
            const kk = params.k as number | undefined;
            if (!queries || !corpus || typeof kk !== "number") {
              return err("Missing required params: queries (number[][]), corpus (number[][]), k (number)");
            }
            const knnInput = {
              queries, corpus, k: kk,
              metric: params.metric as "cosine" | "euclidean" | "manhattan" | undefined,
              task: params.task as "search" | "classify" | "regress" | undefined,
              labels: params.labels as Array<number | string> | undefined,
              weighted: params.weighted as boolean | undefined,
            };
            const kv = KNearestNeighbors.validate(knnInput);
            if (!kv.valid) return err(`Invalid input: ${(kv.errors ?? []).join("; ")}`);
            return ok(KNearestNeighbors.calculate(knnInput));
          }

          // ALGO-SYNERGY (2026-05-29, slot:tango) — GMM soft clustering (EM, completes clustering family).
          case "ml_gmm": {
            const { GaussianMixtureModel } = await import("../../algorithms/GaussianMixtureModel.js");
            const data = params.data as number[][] | undefined;
            const k = params.k as number | undefined;
            if (!data || typeof k !== "number") {
              return err("Missing required params: data (number[][]), k (number)");
            }
            const gmmInput = {
              data, k,
              maxIter: params.max_iterations as number | undefined,
              tol: params.tol as number | undefined,
              seed: params.seed as number | undefined,
              varianceFloor: params.variance_floor as number | undefined,
            };
            const gv = GaussianMixtureModel.validate(gmmInput);
            if (!gv.valid) return err(`Invalid input: ${(gv.errors ?? []).join("; ")}`);
            return ok(GaussianMixtureModel.calculate(gmmInput));
          }

          // ALGO-SYNERGY (2026-05-29, slot:tango) — LayerNorm (pairs with ml_attention → transformer block).
          case "ml_layernorm": {
            const { LayerNormalization } = await import("../../algorithms/LayerNormalization.js");
            const data = params.data as number[][] | undefined;
            if (!data) {
              return err("Missing required param: data (number[][])");
            }
            const lnInput = {
              data,
              gamma: params.gamma as number[] | undefined,
              beta: params.beta as number[] | undefined,
              epsilon: params.epsilon as number | undefined,
            };
            const lv = LayerNormalization.validate(lnInput);
            if (!lv.valid) return err(`Invalid input: ${(lv.errors ?? []).join("; ")}`);
            return ok(LayerNormalization.calculate(lnInput));
          }

          // ALGO-SYNERGY (2026-05-29, slot:tango) — beam-search n-best decoding (companion to exact ml_viterbi).
          case "ml_beam_search": {
            const { BeamSearchDecoder } = await import("../../algorithms/BeamSearchDecoder.js");
            const emissions = params.emissions as number[][] | undefined;
            const beamWidth = params.beam_width as number | undefined;
            if (!emissions || typeof beamWidth !== "number") {
              return err("Missing required params: emissions (number[][]), beam_width (number)");
            }
            const bsInput = {
              emissions, beamWidth,
              transition: params.transition as number[][] | undefined,
              initial: params.initial as number[] | undefined,
              topK: params.top_k as number | undefined,
            };
            const bv = BeamSearchDecoder.validate(bsInput);
            if (!bv.valid) return err(`Invalid input: ${(bv.errors ?? []).join("; ")}`);
            return ok(BeamSearchDecoder.calculate(bsInput));
          }

          // ALGO-SYNERGY (2026-05-29, slot:tango) — multi-head attention (composes ml_attention per head).
          case "ml_multihead_attention": {
            const { MultiHeadAttention } = await import("../../algorithms/MultiHeadAttention.js");
            const query = params.query as number[][] | undefined;
            const key = params.key as number[][] | undefined;
            const value = params.value as number[][] | undefined;
            const numHeads = params.num_heads as number | undefined;
            if (!query || !key || !value || typeof numHeads !== "number") {
              return err("Missing required params: query (number[][]), key (number[][]), value (number[][]), num_heads (number)");
            }
            const mhaInput = {
              query, key, value, numHeads,
              wq: params.wq as number[][] | undefined,
              wk: params.wk as number[][] | undefined,
              wv: params.wv as number[][] | undefined,
              wo: params.wo as number[][] | undefined,
              causal: params.causal as boolean | undefined,
              mask: params.mask as number[][] | undefined,
              scale: params.scale as number | undefined,
            };
            const mv = MultiHeadAttention.validate(mhaInput);
            if (!mv.valid) return err(`Invalid input: ${(mv.errors ?? []).join("; ")}`);
            return ok(MultiHeadAttention.calculate(mhaInput));
          }

          // ALGO-SYNERGY (2026-05-29, slot:tango) — full transformer block (composes MHA + LayerNorm + FFN + residual).
          case "ml_transformer_block": {
            const { TransformerBlock } = await import("../../algorithms/TransformerBlock.js");
            const x = params.x as number[][] | undefined;
            const numHeads = params.num_heads as number | undefined;
            const w1 = params.w1 as number[][] | undefined;
            const b1 = params.b1 as number[] | undefined;
            const w2 = params.w2 as number[][] | undefined;
            const b2 = params.b2 as number[] | undefined;
            if (!x || typeof numHeads !== "number" || !w1 || !b1 || !w2 || !b2) {
              return err("Missing required params: x (number[][]), num_heads (number), w1, b1, w2, b2 (FFN weights)");
            }
            const tbInput = {
              x, numHeads, w1, b1, w2, b2,
              activation: params.activation as "relu" | "gelu" | undefined,
              preNorm: params.pre_norm as boolean | undefined,
              wq: params.wq as number[][] | undefined,
              wk: params.wk as number[][] | undefined,
              wv: params.wv as number[][] | undefined,
              wo: params.wo as number[][] | undefined,
              gamma1: params.gamma1 as number[] | undefined,
              beta1: params.beta1 as number[] | undefined,
              gamma2: params.gamma2 as number[] | undefined,
              beta2: params.beta2 as number[] | undefined,
              epsilon: params.epsilon as number | undefined,
              causal: params.causal as boolean | undefined,
            };
            const tv = TransformerBlock.validate(tbInput);
            if (!tv.valid) return err(`Invalid input: ${(tv.errors ?? []).join("; ")}`);
            return ok(TransformerBlock.calculate(tbInput));
          }

          // ALGO-SYNERGY (2026-05-29, slot:tango) — Savitzky-Golay smoothing/differentiation.
          case "signal_savgol": {
            const { SavitzkyGolayFilter } = await import("../../algorithms/SavitzkyGolayFilter.js");
            const signal = params.signal as number[] | undefined;
            const windowSize = params.window_size as number | undefined;
            if (!signal || typeof windowSize !== "number") {
              return err("Missing required params: signal (number[]), window_size (odd integer ≥3)");
            }
            const sgInput = {
              signal, windowSize,
              polyOrder: params.poly_order as number | undefined,
              deriv: params.deriv as number | undefined,
              delta: params.delta as number | undefined,
            };
            const sv = SavitzkyGolayFilter.validate(sgInput);
            if (!sv.valid) return err(`Invalid input: ${(sv.errors ?? []).join("; ")}`);
            return ok(SavitzkyGolayFilter.calculate(sgInput));
          }

          default: {
            // Fallback: use algorithm gateway selection
            const actionParts = action.split("_");
            const domain = actionParts[0];
            const result = algorithmGatewayEngine.select({
              problem_type: params.problem_type as string || "optimize",
              domain: domain as string,
              data: params,
            });
            return ok(result);
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        log.error(`[prism_algorithm] ${action} error: ${msg}`);
        return err(msg);
      }
    }
  );
}

// Export action count for anti-regression
export const ALGORITHM_DISPATCHER_ACTION_COUNT = ACTIONS.length;
export { ACTIONS as ALGORITHM_ACTIONS };
