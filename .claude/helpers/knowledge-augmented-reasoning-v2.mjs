#!/usr/bin/env node
/**
 * knowledge-augmented-reasoning-v2.mjs — Expanded KAR Hook System
 *
 * Multi-Source Knowledge Injection for Enhanced Reasoning
 *
 * Sources:
 *   - 225 MIT courses with topic mappings
 *   - 285 academic algorithms → PRISM engine mappings
 *   - Cross-disciplinary physics formulas
 *   - 69+ video-learned transcripts (Haas, Okuma, Mazak, etc.)
 *   - 4,493+ tribal knowledge tips
 *   - JM Die program patterns (36,929 files)
 *   - PRISM registry cross-references
 *
 * Fires on: UserPromptSubmit
 * Purpose: Detect domain/task context and inject multi-source knowledge
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

// ═══════════════════════════════════════════════════════════════════════════
// PATHS
// ═══════════════════════════════════════════════════════════════════════════

const BASE = "H:/prism/mcp-server";
const RESOURCES = "H:/prism/resources";

const PATHS = {
  tribalKnowledge: `${BASE}/data/tribal-knowledge.json`,
  tribalCaptured: "H:/prism/state/tribal_captured_tips.json",
  videoLearningRegistry: "H:/prism/data/video-learned/learning-registry.json",
  videoTranscripts: "H:/prism/data/video-learned/transcripts",
  mitCourseIndex: `${RESOURCES}/MIT COURSES/MIT_COURSE_INDEX.json`,
  algorithmRegistry: `${RESOURCES}/MIT COURSES/ALGORITHM_REGISTRY.json`,
  formulaRegistry: `${BASE}/src/registries/FormulaRegistry.ts`,
  algorithmDir: `${BASE}/src/algorithms`,
  jmDieRoot: "H:/prism/JM DIE",
  crossDisciplinary: `${RESOURCES}/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS/PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js`,
};

// ═══════════════════════════════════════════════════════════════════════════
// DOMAIN KNOWLEDGE BASE — Expanded with MIT courses and algorithm mappings
// ═══════════════════════════════════════════════════════════════════════════

const DOMAIN_KNOWLEDGE = {
  // Machine Learning & AI
  optimization: {
    patterns: [/optimi[zs]/i, /minimize/i, /maximize/i, /gradient/i, /convergence/i, /loss.?function/i, /objective/i],
    algorithms: ["GradientDescent", "AdamOptimizer", "LBFGS", "SimulatedAnnealing", "GeneticAlgorithm", "PSO"],
    mitCourses: ["6.079", "6.252J", "15.084J", "6.231"],
    formulas: [
      "GRADIENT DESCENT: θ = θ - α∇J(θ) where α is learning rate",
      "ADAM: m_t = β₁m_{t-1} + (1-β₁)g_t; v_t = β₂v_{t-1} + (1-β₂)g_t²",
      "CONVERGENCE: |J(θ_t) - J(θ_{t-1})| < ε for stopping",
    ],
    prismEngines: ["PRISM_GRADIENT_DESCENT", "PRISM_ADAM_OPTIMIZER", "PRISM_TRUST_REGION_OPTIMIZER"],
  },
  neural_network: {
    patterns: [/neural/i, /network/i, /deep.?learning/i, /backprop/i, /activation/i, /layer/i, /epoch/i, /perceptron/i],
    algorithms: ["NeuralInference", "Backpropagation", "CNN", "RNN", "LSTM", "GRU"],
    mitCourses: ["6.867", "9.520", "6.034"],
    formulas: [
      "BACKPROP: δ_j = (∂E/∂o_j) × f'(net_j) — chain rule",
      "ACTIVATION: ReLU(x)=max(0,x); σ(x)=1/(1+e^-x)",
      "WEIGHT UPDATE: Δw_ij = -η × δ_j × o_i",
    ],
    prismEngines: ["PRISM_NEURAL_NETWORK", "PRISM_NEURAL_ENGINE_ENHANCED", "PRISM_DQN_ENGINE"],
  },
  transformer: {
    patterns: [/transformer/i, /attention/i, /self.?attention/i, /encoder/i, /decoder/i, /embedding/i, /gpt/i, /bert/i],
    algorithms: ["TransformerEngine", "MultiHeadAttention", "PositionalEncoding", "LayerNorm"],
    mitCourses: ["6.867"],
    formulas: [
      "ATTENTION: Attention(Q,K,V) = softmax(QK^T/√d_k)V",
      "MULTI-HEAD: Concat(head_1,...,head_h)W^O",
      "POSITIONAL: PE(pos,2i) = sin(pos/10000^(2i/d))",
    ],
    prismEngines: ["PRISM_TRANSFORMER_ENGINE", "PRISM_ATTENTION_ENGINE"],
  },
  bayesian: {
    patterns: [/bayesian/i, /prior/i, /posterior/i, /likelihood/i, /inference/i, /mcmc/i, /gaussian.?process/i],
    algorithms: ["BayesianOptimizer", "BayesianInferenceEngine", "GaussianProcess", "ThompsonSampling"],
    mitCourses: ["6.041", "6.867", "15.097"],
    formulas: [
      "BAYES: P(θ|D) ∝ P(D|θ) × P(θ)",
      "GAUSSIAN PROCESS: f(x) ~ GP(m(x), k(x,x'))",
      "ACQUISITION: EI(x) = E[max(f(x)-f_best, 0)]",
    ],
    prismEngines: ["PRISM_BAYESIAN_SYSTEM", "PRISM_BAYESIAN_LEARNING", "PRISM_MONTE_CARLO"],
  },
  reinforcement_learning: {
    patterns: [/reinforcement/i, /q.?learning/i, /policy/i, /reward/i, /agent/i, /mdp/i, /dqn/i, /ppo/i],
    algorithms: ["QLearning", "DQN", "PolicyGradient", "ActorCritic", "PPO", "SAC"],
    mitCourses: ["6.231", "6.867", "6.034"],
    formulas: [
      "Q-LEARNING: Q(s,a) ← Q(s,a) + α[r + γ max_a' Q(s',a') - Q(s,a)]",
      "POLICY GRADIENT: ∇J(θ) = E[∇log π_θ(a|s) × R]",
      "BELLMAN: V(s) = max_a [R(s,a) + γ∑P(s'|s,a)V(s')]",
    ],
    prismEngines: ["PRISM_DQN_ENGINE", "PRISM_POLICY_GRADIENT", "PRISM_ACTOR_CRITIC"],
  },

  // Manufacturing Physics
  cutting_force: {
    patterns: [/force/i, /kienzle/i, /cutting/i, /chip/i, /power/i, /torque/i, /merchant/i],
    algorithms: ["KienzleForceModel", "MerchantCircle", "PowerTorqueCalc", "JohnsonCook"],
    mitCourses: ["2.810", "2.003", "3.11"],
    formulas: [
      "KIENZLE: Fc = kc1.1 × b × h^(1-mc)",
      "CHIP THICKNESS: h = fz × sin(κr)",
      "POWER: P = Fc × Vc / 60000 [kW]",
      "SPECIFIC FORCE: kc = kc1.1 × h^(-mc)",
    ],
    prismEngines: ["PRISM_KIENZLE_FORCE", "PRISM_FORCE_CALCULATOR", "PRISM_JOHNSON_COOK_ENGINE"],
    videoSources: ["haas-speeds-feeds-knowledge.json"],
  },
  tool_life: {
    patterns: [/tool.?life/i, /taylor/i, /wear/i, /flank/i, /vb/i, /crater/i, /notch/i],
    algorithms: ["ExtendedTaylorModel", "UsuiWearModel", "BayesianWearModel", "FlankWearModel"],
    mitCourses: ["2.810", "6.867", "15.097"],
    formulas: [
      "TAYLOR: VT^n = C",
      "EXTENDED: VT^n × f^a × ap^b = C",
      "WEAR CRITERION: VB_max = 0.3mm or VB_avg = 0.2mm",
    ],
    prismEngines: ["PRISM_TAYLOR_TOOL_LIFE", "PRISM_TOOL_LIFE_ENGINE", "PRISM_FLANK_WEAR_MODEL"],
  },
  thermal: {
    patterns: [/thermal/i, /temperature/i, /heat/i, /chip.?temp/i, /coolant/i, /cryogenic/i],
    algorithms: ["ThermalPartitionModel", "JaegerTempField", "ShawModel", "FourierHeat"],
    mitCourses: ["2.51", "10.34", "2.141"],
    formulas: [
      "HEAT PARTITION: R = 1/(1 + 0.754√(k_w/k_t × v × a_c / α_t))",
      "JAEGER: T_max ∝ q × √(a × v) / k",
      "STEFAN-BOLTZMANN: P = ε×σ×A×(T⁴-T_amb⁴)",
    ],
    prismEngines: ["PRISM_HEAT_TRANSFER_ENGINE", "PRISM_CUTTING_THERMAL_ENGINE", "PRISM_THERMAL_EXPANSION_ENGINE"],
  },
  chatter: {
    patterns: [/chatter/i, /vibration/i, /stability/i, /lobe/i, /regenerative/i, /modal/i, /frf/i, /sld/i],
    algorithms: ["StabilityLobeDiagram", "RCSA", "FFTAnalyzer", "RegenerativeChatter", "ModalAnalysis"],
    mitCourses: ["2.032", "6.011", "2.004"],
    formulas: [
      "REGENERATIVE: ξ_c = phase lag between cuts",
      "SLD: b_lim = -1 / (2 × Re[G(jω_c)] × Kf)",
      "CHATTER FREQ: ω_c ≈ ω_n × √(1 - 2ζ²)",
    ],
    prismEngines: ["PRISM_STABILITY_LOBES", "PRISM_CHATTER_PREDICTION_ENGINE", "PRISM_VIBRATION_ANALYSIS_ENGINE"],
  },
  deflection: {
    patterns: [/deflection/i, /stiffness/i, /overhang/i, /boring/i, /l.?d/i, /cantilever/i, /bending/i],
    algorithms: ["ToolDeflectionModel", "BoringBarDeflection", "RCSA", "BeamTheory"],
    mitCourses: ["2.003", "3.11", "2.032"],
    formulas: [
      "CANTILEVER: δ = FL³/(3EI)",
      "L/D RULE: Keep L/D < 4 for carbide, < 3 for HSS",
      "DIMENSIONAL ERROR: ≈ 2× static deflection",
    ],
    prismEngines: ["PRISM_DEFLECTION_ENGINE", "PRISM_STIFFNESS_ANALYZER"],
  },
  surface_finish: {
    patterns: [/surface/i, /finish/i, /roughness/i, /ra\b/i, /rz\b/i, /rms/i],
    algorithms: ["SurfaceFinishPredictor", "BUEModel", "ChatterMarksModel"],
    mitCourses: ["2.810", "6.867", "3.22"],
    formulas: [
      "THEORETICAL: Ra = f²/(32r)",
      "BUE EFFECT: adds 0.5-2 μm Ra",
      "PRACTICAL: Ra_actual ≈ Ra_theoretical × 1.2-2.0",
    ],
    prismEngines: ["PRISM_SURFACE_FINISH_PREDICTOR", "PRISM_SURFACE_INTEGRITY_ENGINE"],
  },

  // CAD/CAM/Post
  toolpath: {
    patterns: [/toolpath/i, /cam\b/i, /strategy/i, /contour/i, /pocket/i, /adaptive/i, /hsm/i],
    algorithms: ["ToolpathOptimizer", "AdaptiveClearing", "TrochoidalMilling", "SpiralToolpath"],
    mitCourses: ["6.046J", "2.875", "6.837"],
    formulas: [
      "CUSP HEIGHT: h = r - √(r² - (s/2)²)",
      "STEPOVER: s = 2√(2rh - h²)",
      "MRR: Q = ae × ap × Vf",
    ],
    prismEngines: ["PRISM_TOOLPATH_OPTIMIZER", "PRISM_ADAPTIVE_TOOLPATH", "PRISM_RAPIDS_OPTIMIZER"],
  },
  post_processor: {
    patterns: [/post/i, /g.?code/i, /nc\b/i, /fanuc/i, /siemens/i, /heidenhain/i, /okuma/i, /haas/i, /mazak/i],
    algorithms: ["PostProcessorPipeline", "GCodeGenerator", "CycleOptimizer"],
    mitCourses: ["6.821", "6.005", "16.842"],
    formulas: [
      "G-CODE BLOCKS: N G X Y Z F S T M",
      "CANNED CYCLE: G81-89 (drilling), G70-76 (turning)",
    ],
    prismEngines: ["PRISM_POST_PROCESSOR_PIPELINE", "PRISM_LATHE_POST_PROCESSOR"],
    videoSources: ["fanuc-manual-guide-training-knowledge.json", "mazak-mazatrol-training-knowledge.json"],
  },

  // EDM
  edm: {
    patterns: [/edm\b/i, /wire.?edm/i, /sinker/i, /wedm/i, /electrode/i, /spark/i, /dielectric/i],
    algorithms: ["WEDMSparkGap", "EDMWearModel", "WireOffsetCalc"],
    mitCourses: ["2.810"],
    formulas: [
      "SPARK GAP: typically 0.01-0.05mm",
      "WIRE OFFSET: half wire diameter + spark gap",
      "MRR (EDM): ∝ peak current × pulse duration",
    ],
    prismEngines: ["PRISM_WEDM_ENGINE", "PRISM_SINKER_EDM_ENGINE", "PRISM_EDM_SPARK_ENGINE"],
    videoSources: ["mitsubishi-wedm-knowledge.json"],
    jmDiePatterns: true, // JM Die has significant EDM work
  },

  // Threading
  threading: {
    patterns: [/thread/i, /tap/i, /pitch/i, /helix/i, /lead/i, /tpi/i],
    algorithms: ["ThreadingCycle", "TapCalculator", "ThreadMillCalc"],
    mitCourses: ["2.810"],
    formulas: [
      "PITCH: P = 1/TPI (inch) or mm directly (metric)",
      "TAP FEED: F = RPM / TPI",
      "THREAD DEPTH: H = 0.866 × P (60° thread)",
    ],
    prismEngines: ["PRISM_THREAD_DATA_ENGINE", "PRISM_THREADING_CYCLE_ENGINE"],
  },

  // Statistics/SPC
  statistics: {
    patterns: [/statistic/i, /regression/i, /variance/i, /confidence/i, /hypothesis/i, /cpk/i, /spc/i, /process.?capability/i],
    algorithms: ["AdvancedRegressionEngine", "SPCProcessCapability", "MonteCarloEngine", "HypothesisTest"],
    mitCourses: ["6.041", "18.05", "2.830"],
    formulas: [
      "REGRESSION: y = Xβ + ε; β̂ = (X'X)^(-1)X'y",
      "CPK: min((USL-μ)/(3σ), (μ-LSL)/(3σ))",
      "CONFIDENCE: x̄ ± t_{α/2} × s/√n",
    ],
    prismEngines: ["PRISM_SPC_ENGINE", "PRISM_PROCESS_CAPABILITY_ENGINE", "PRISM_REGRESSION_ENGINE"],
  },

  // Scheduling/Business
  scheduling: {
    patterns: [/schedul/i, /job.?shop/i, /queue/i, /bottleneck/i, /lead.?time/i, /capacity/i],
    algorithms: ["JobShopScheduling", "CriticalPath", "PERT", "DispatchingRules"],
    mitCourses: ["2.854", "15.083J", "2.852"],
    formulas: [
      "LITTLE'S LAW: L = λW (WIP = arrival_rate × wait_time)",
      "UTILIZATION: ρ = λ/μ",
      "LEAD TIME: LT = setup + (qty × cycle_time)",
    ],
    prismEngines: ["PRISM_SCHEDULING_ENGINE", "PRISM_PRODUCTION_SCHEDULER", "PRISM_LEAD_TIME_PREDICTOR"],
  },

  // Geometry/Collision
  geometry: {
    patterns: [/collision/i, /geometry/i, /intersection/i, /mesh/i, /nurbs/i, /bezier/i, /brep/i, /csg/i],
    algorithms: ["CollisionDetection", "GJK", "NURBS", "MeshBoolean", "ConvexHull"],
    mitCourses: ["6.837", "6.838", "6.046J"],
    formulas: [
      "GJK: Support function s(d) = arg max (p·d)",
      "NURBS: C(u) = Σ N_{i,p}(u) × w_i × P_i / Σ N_{i,p}(u) × w_i",
    ],
    prismEngines: ["PRISM_COLLISION_ENGINE", "PRISM_NURBS_ADVANCED_ENGINE", "PRISM_CSG_BOOLEAN_ENGINE"],
  },

  // Cold Heading / Die (JM Die specific)
  cold_heading: {
    patterns: [/cold.?head/i, /die\b/i, /fastener/i, /heading/i, /extrusion/i, /punch/i, /blank/i],
    algorithms: ["ForwardExtrusion", "BackwardExtrusion", "HeadingForce"],
    mitCourses: ["2.810", "3.22"],
    formulas: [
      "HEADING FORCE: F = k × A × UTS × (1 + μ×cot(α))",
      "REDUCTION: R = (A₀ - A₁)/A₀ × 100%",
      "DIE STRESS: σ = F / A_contact",
    ],
    prismEngines: ["PRISM_FORMING_ENGINE", "PRISM_EXTRUSION_ENGINE"],
    jmDiePatterns: true, // JM Die specializes in cold heading dies
    tribalTags: ["die", "punch", "cold-heading", "carbide", "tool-steel"],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// KNOWLEDGE LOADERS
// ═══════════════════════════════════════════════════════════════════════════

let mitCourseCache = null;
let algorithmCache = null;
let tribalCache = null;
let videoKnowledgeCache = {};

async function loadMITCourseIndex() {
  if (mitCourseCache) return mitCourseCache;
  try {
    const raw = await fs.readFile(PATHS.mitCourseIndex, "utf8");
    mitCourseCache = JSON.parse(raw);
    return mitCourseCache;
  } catch {
    return null;
  }
}

async function loadAlgorithmRegistry() {
  if (algorithmCache) return algorithmCache;
  try {
    const raw = await fs.readFile(PATHS.algorithmRegistry, "utf8");
    algorithmCache = JSON.parse(raw);
    return algorithmCache;
  } catch {
    return null;
  }
}

async function loadTribalKnowledge() {
  if (tribalCache) return tribalCache;
  try {
    // Try main location first
    const raw = await fs.readFile(PATHS.tribalCaptured, "utf8");
    tribalCache = JSON.parse(raw);
    return tribalCache;
  } catch {
    try {
      // Fallback to alternative location
      const raw = await fs.readFile(PATHS.tribalKnowledge, "utf8");
      tribalCache = JSON.parse(raw);
      return tribalCache;
    } catch {
      return { tips: [] };
    }
  }
}

async function loadVideoKnowledge(sourceFile) {
  if (videoKnowledgeCache[sourceFile]) return videoKnowledgeCache[sourceFile];
  try {
    const filePath = `${PATHS.videoTranscripts}/${sourceFile}`;
    const raw = await fs.readFile(filePath, "utf8");
    videoKnowledgeCache[sourceFile] = JSON.parse(raw);
    return videoKnowledgeCache[sourceFile];
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DOMAIN DETECTION
// ═══════════════════════════════════════════════════════════════════════════

function detectDomains(prompt) {
  const detected = [];
  const promptLower = prompt.toLowerCase();

  for (const [domain, config] of Object.entries(DOMAIN_KNOWLEDGE)) {
    for (const pattern of config.patterns) {
      if (pattern.test(prompt)) {
        detected.push(domain);
        break;
      }
    }
  }

  // Also detect JM Die specific context
  if (/jm\s*die/i.test(prompt) || /cold.?head/i.test(prompt) || /fastener/i.test(prompt)) {
    if (!detected.includes("cold_heading")) {
      detected.push("cold_heading");
    }
  }

  return detected;
}

// ═══════════════════════════════════════════════════════════════════════════
// KNOWLEDGE INJECTION BUILDERS
// ═══════════════════════════════════════════════════════════════════════════

function buildAlgorithmInjection(domains) {
  const algorithms = new Set();
  const engines = new Set();

  for (const domain of domains.slice(0, 3)) {
    const config = DOMAIN_KNOWLEDGE[domain];
    if (config) {
      config.algorithms?.slice(0, 2).forEach(a => algorithms.add(a));
      config.prismEngines?.slice(0, 2).forEach(e => engines.add(e));
    }
  }

  const parts = [];
  if (algorithms.size > 0) {
    parts.push(`ALGORITHMS: ${[...algorithms].join(", ")}`);
  }
  if (engines.size > 0) {
    parts.push(`PRISM ENGINES: ${[...engines].join(", ")}`);
  }

  return parts.join(" | ");
}

function buildFormulaInjection(domains) {
  const formulas = [];

  for (const domain of domains.slice(0, 3)) {
    const config = DOMAIN_KNOWLEDGE[domain];
    if (config?.formulas) {
      formulas.push(...config.formulas.slice(0, 2));
    }
  }

  if (formulas.length > 0) {
    return `KEY FORMULAS: ${formulas.join(" | ")}`;
  }
  return null;
}

function buildMITCourseInjection(domains) {
  const courses = new Set();

  for (const domain of domains.slice(0, 3)) {
    const config = DOMAIN_KNOWLEDGE[domain];
    if (config?.mitCourses) {
      config.mitCourses.slice(0, 2).forEach(c => courses.add(c));
    }
  }

  if (courses.size > 0) {
    return `MIT COURSE REFS: ${[...courses].join(", ")} (see resources/MIT COURSES/ for deep learning)`;
  }
  return null;
}

async function buildTribalInjection(domains) {
  const tribal = await loadTribalKnowledge();
  if (!tribal?.tips || tribal.tips.length === 0) return null;

  // Collect relevant tags from domains
  const relevantTags = new Set();
  for (const domain of domains) {
    const config = DOMAIN_KNOWLEDGE[domain];
    if (config?.tribalTags) {
      config.tribalTags.forEach(t => relevantTags.add(t.toLowerCase()));
    }
    // Also add domain name as a tag
    relevantTags.add(domain.replace(/_/g, "-").toLowerCase());
  }

  // Filter tips by tags
  const relevant = tribal.tips.filter(tip => {
    const tipTags = (tip.tags || []).map(t => t.toLowerCase());
    return [...relevantTags].some(rt =>
      tipTags.includes(rt) || tipTags.some(tt => tt.includes(rt))
    );
  }).slice(0, 2);

  if (relevant.length > 0) {
    const tipTexts = relevant.map(t => t.text || t.tip || t.description).filter(Boolean);
    if (tipTexts.length > 0) {
      return `TRIBAL TIPS: ${tipTexts.join(" | ")}`;
    }
  }
  return null;
}

async function buildVideoKnowledgeInjection(domains) {
  const videoSources = [];

  for (const domain of domains) {
    const config = DOMAIN_KNOWLEDGE[domain];
    if (config?.videoSources) {
      videoSources.push(...config.videoSources);
    }
  }

  if (videoSources.length === 0) return null;

  const tips = [];
  for (const source of videoSources.slice(0, 2)) {
    const knowledge = await loadVideoKnowledge(source);
    if (knowledge?.videos) {
      for (const video of knowledge.videos.slice(0, 1)) {
        if (video.tribal_tips) {
          tips.push(...video.tribal_tips.slice(0, 2));
        }
      }
    }
  }

  if (tips.length > 0) {
    return `VIDEO LEARNED: ${tips.slice(0, 3).join(" | ")}`;
  }
  return null;
}

function buildJMDieInjection(domains) {
  const hasJMDieRelevance = domains.some(d =>
    DOMAIN_KNOWLEDGE[d]?.jmDiePatterns === true
  );

  if (hasJMDieRelevance) {
    return "JM DIE CONTEXT: Cold heading die shop (36,929 programs). Materials: M2, D2, S7, A2 tool steels, tungsten carbide. Machines: 7 Okuma lathes, 2 Mitsubishi EDMs, 5 mills.";
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// REASONING CHAIN BUILDER
// ═══════════════════════════════════════════════════════════════════════════

function buildReasoningChain(domains) {
  const chains = {
    optimization: "Define objective → Identify constraints → Choose algorithm → Validate convergence",
    neural_network: "Define architecture → Initialize weights → Forward pass → Backprop → Update",
    cutting_force: "Get kc1.1 from material → Calculate chip thickness h → Apply Kienzle → Verify power",
    tool_life: "Get Taylor constants (n,C) → Calculate expected life → Factor in conditions → Plan changes",
    chatter: "Get FRF → Calculate SLD → Find stable regions → Select spindle speed from peaks",
    thermal: "Estimate heat generation → Model partition → Calculate T_max → Check vs tool limit",
    scheduling: "Identify bottleneck → Calculate capacity → Apply dispatching rules → Simulate",
  };

  const relevantChains = domains
    .filter(d => chains[d])
    .map(d => `${d.toUpperCase()}: ${chains[d]}`)
    .slice(0, 2);

  if (relevantChains.length > 0) {
    return `REASONING CHAIN: ${relevantChains.join(" | ")}`;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) { resolve(""); return; }
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(""));
    setTimeout(() => resolve(data), 200);
  });
}

async function main() {
  const stdinRaw = await readStdin();
  let prompt = "";
  try {
    const parsed = JSON.parse(stdinRaw);
    prompt = typeof parsed.prompt === "string" ? parsed.prompt : "";
  } catch {
    prompt = process.env.USER_MESSAGE || process.env.PROMPT || "";
  }

  if (!prompt || prompt.length < 10) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const domains = detectDomains(prompt);
  if (domains.length === 0) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const parts = [];

  // Domain detection
  parts.push(`KAR v2 | DOMAINS: ${domains.slice(0, 4).join(", ")}`);

  // Algorithms and engines
  const algos = buildAlgorithmInjection(domains);
  if (algos) parts.push(algos);

  // Formulas
  const formulas = buildFormulaInjection(domains);
  if (formulas) parts.push(formulas);

  // MIT course references
  const mitRefs = buildMITCourseInjection(domains);
  if (mitRefs) parts.push(mitRefs);

  // Tribal knowledge
  const tribal = await buildTribalInjection(domains);
  if (tribal) parts.push(tribal);

  // Video-learned knowledge
  const videoKnowledge = await buildVideoKnowledgeInjection(domains);
  if (videoKnowledge) parts.push(videoKnowledge);

  // JM Die context
  const jmDie = buildJMDieInjection(domains);
  if (jmDie) parts.push(jmDie);

  // Reasoning chain
  const chain = buildReasoningChain(domains);
  if (chain) parts.push(chain);

  // Cross-reference reminder
  parts.push("Cross-reference with PRISM registries for canonical constants. Import physics from src/physics/constants.ts.");

  process.stdout.write(JSON.stringify({
    additionalContext: parts.join(" | "),
  }));
}

main().catch(() => process.stdout.write(JSON.stringify({ continue: true })));
