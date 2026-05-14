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
] as const;

const ML_ACTIONS = [
  "ml_policy_gradient",      // Policy gradient RL
  "ml_rl_optimize",          // RL optimization
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
          // SPATIAL (2 actions)
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

          // ============================================================
          // ML (2 actions)
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
