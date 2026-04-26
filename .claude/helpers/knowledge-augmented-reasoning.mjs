#!/usr/bin/env node
/**
 * knowledge-augmented-reasoning.mjs — Knowledge-Augmented Reasoning (KAR) Hook
 *
 * Enhances Claude's reasoning by injecting relevant knowledge from PRISM's
 * extensive knowledge base, including:
 *   - MIT course content (6.034 AI, 6.036 ML, deep learning, neural networks)
 *   - Physics formulas and algorithms (Kienzle, Taylor, Johnson-Cook)
 *   - Tribal knowledge (4,493+ tips)
 *   - Video learning transcripts
 *   - Manufacturing playbooks
 *
 * Fires on: UserPromptSubmit
 * Purpose: Detect domain/task context and inject relevant knowledge snippets
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const BASE = "H:/prism/mcp-server";
const FORMULA_REGISTRY = `${BASE}/src/registries/FormulaRegistry.ts`;
const ALGORITHM_REGISTRY = `${BASE}/src/registries/AlgorithmRegistry.ts`;
const TRIBAL_FILE = `${BASE}/data/tribal-knowledge.json`;
const VIDEO_TRANSCRIPTS = `${BASE}/data/video-learned/transcripts`;
const PLAYBOOK_FILE = `${BASE}/data/machining-playbooks.json`;

// Domain detection patterns with associated knowledge sources
const DOMAIN_KNOWLEDGE = {
  optimization: {
    patterns: [/optimi[zs]/i, /minimize/i, /maximize/i, /gradient/i, /convergence/i, /loss function/i],
    algorithms: ["GradientDescent", "AdamOptimizer", "LBFGS", "SimulatedAnnealing", "GeneticAlgorithm"],
    concepts: [
      "GRADIENT DESCENT: θ = θ - α∇J(θ) where α is learning rate",
      "ADAM: Adaptive moment estimation combines momentum + RMSprop",
      "CONVERGENCE: Check |J(θ_t) - J(θ_{t-1})| < ε for stopping criterion",
      "LOCAL MINIMA: Use momentum or stochastic restart to escape",
    ],
  },
  neural_network: {
    patterns: [/neural/i, /network/i, /deep.?learning/i, /backprop/i, /activation/i, /layer/i, /epoch/i],
    algorithms: ["NeuralInference", "Backpropagation", "CNN", "RNN", "Transformer"],
    concepts: [
      "BACKPROP: δ_j = (∂E/∂o_j) × f'(net_j) — chain rule through layers",
      "ACTIVATION: ReLU(x) = max(0,x); Sigmoid(x) = 1/(1+e^-x); tanh for [-1,1]",
      "VANISHING GRADIENT: Use ReLU, batch norm, or skip connections",
      "REGULARIZATION: L2 (weight decay), dropout, early stopping",
    ],
  },
  transformer: {
    patterns: [/transformer/i, /attention/i, /self.?attention/i, /encoder/i, /decoder/i, /embedding/i],
    algorithms: ["TransformerEngine", "MultiHeadAttention", "PositionalEncoding"],
    concepts: [
      "ATTENTION: Attention(Q,K,V) = softmax(QK^T/√d_k)V",
      "MULTI-HEAD: Concat(head_1,...,head_h)W^O where head_i = Attention(QW_i^Q, KW_i^K, VW_i^V)",
      "POSITIONAL: PE(pos,2i) = sin(pos/10000^(2i/d_model))",
      "LAYER NORM: Normalize before attention + feed-forward, not after",
    ],
  },
  cutting_force: {
    patterns: [/force/i, /kienzle/i, /cutting/i, /chip/i, /power/i, /torque/i],
    algorithms: ["KienzleForceModel", "MerchantCircle", "PowerTorqueCalc"],
    concepts: [
      "KIENZLE: Fc = kc1.1 × b × h^(1-mc) where kc1.1 is specific cutting force",
      "CHIP THICKNESS: h = fz × sin(κr) for milling",
      "POWER: P = Fc × Vc / 60000 [kW]",
      "TORQUE: T = Fc × D / 2000 [Nm]",
    ],
  },
  tool_life: {
    patterns: [/tool.?life/i, /taylor/i, /wear/i, /flank/i, /vb/i],
    algorithms: ["ExtendedTaylorModel", "UsuiWearModel", "BayesianWearModel"],
    concepts: [
      "TAYLOR: VT^n = C — cutting speed V, tool life T, exponent n, constant C",
      "EXTENDED TAYLOR: VT^n × f^a × ap^b = C — includes feed and depth",
      "WEAR CRITERION: VB_max = 0.3mm or VB_avg = 0.2mm for carbide",
      "WEAR RATE: dVB/dt ∝ exp(-Q/RT) × σ^m (Arrhenius-type)",
    ],
  },
  thermal: {
    patterns: [/thermal/i, /temperature/i, /heat/i, /chip.?temp/i, /coolant/i],
    algorithms: ["ThermalPartitionModel", "JaegerTempField", "ShawModel"],
    concepts: [
      "HEAT PARTITION: R = 1/(1 + 0.754√(k_w/k_t × v × a_c / α_t))",
      "JAEGER: T_max ∝ q × √(a × v) / k — moving heat source",
      "SHAW: T_shear = τ_s × γ / (ρ × c) — shear plane temperature",
      "COOLANT: Reduce temp by 20-40% with flood, 5-10% with MQL",
    ],
  },
  chatter: {
    patterns: [/chatter/i, /vibration/i, /stability/i, /lobe/i, /regenerative/i, /modal/i],
    algorithms: ["StabilityLobeDiagram", "RCSA", "FFTAnalyzer", "RegenerativeChatter"],
    concepts: [
      "REGENERATIVE: Self-excited vibration from phase between cuts",
      "SLD: b_lim = -1 / (2 × Re[G(jω_c)] × Kf) — stability boundary",
      "SPINDLE TUNING: Run near SLD peaks for max stable depth",
      "DAMPING: Add mass dampers, boring bar sleeves, or variable helix tools",
    ],
  },
  deflection: {
    patterns: [/deflection/i, /stiffness/i, /overhang/i, /boring/i, /l.d/i],
    algorithms: ["ToolDeflectionModel", "BoringBarDeflection", "RCSA"],
    concepts: [
      "CANTILEVER: δ = FL³/(3EI) — deflection at tip under load F",
      "L/D RULE: Keep L/D < 4 for solid carbide, < 3 for HSS",
      "BORING BAR: Use carbide or heavy metal shanks for L/D > 4",
      "ERROR: Dimensional error ≈ 2× static deflection (spring passes)",
    ],
  },
  surface_finish: {
    patterns: [/surface/i, /finish/i, /roughness/i, /ra/i, /rz/i],
    algorithms: ["SurfaceFinishPredictor", "BUEModel", "ChatterMarksModel"],
    concepts: [
      "THEORETICAL: Ra = f²/(32r) — feed f, nose radius r [mm]",
      "BUE EFFECT: Adds 0.5-2 μm Ra from built-up edge breakoff",
      "CHATTER MARKS: Add 1-5 μm Ra from regenerative vibration",
      "PRACTICAL: Ra_actual ≈ Ra_theoretical × (1.2 to 2.0)",
    ],
  },
  bayesian: {
    patterns: [/bayesian/i, /prior/i, /posterior/i, /likelihood/i, /inference/i, /mcmc/i],
    algorithms: ["BayesianOptimizer", "BayesianInferenceEngine", "BayesianWearModel"],
    concepts: [
      "BAYES: P(θ|D) ∝ P(D|θ) × P(θ) — posterior ∝ likelihood × prior",
      "CONJUGATE: Beta-Binomial, Normal-Normal, Gamma-Poisson",
      "MCMC: Sample from posterior when closed form unavailable",
      "ACQUISITION: EI, UCB, PI for Bayesian optimization",
    ],
  },
  statistics: {
    patterns: [/statistic/i, /regression/i, /variance/i, /confidence/i, /hypothesis/i, /cpk/i],
    algorithms: ["AdvancedRegressionEngine", "SPCProcessCapability", "MonteCarloEngine"],
    concepts: [
      "REGRESSION: y = Xβ + ε; β̂ = (X'X)^(-1)X'y",
      "CPK: min((USL-μ)/(3σ), (μ-LSL)/(3σ)) — process capability",
      "CONFIDENCE: x̄ ± t_{α/2} × s/√n for mean, χ² for variance",
      "HYPOTHESIS: Type I error α (false positive), Type II error β (false negative)",
    ],
  },
};

// Read stdin for user prompt
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

// Detect which domains are relevant to the prompt
function detectDomains(prompt) {
  const detected = [];
  for (const [domain, config] of Object.entries(DOMAIN_KNOWLEDGE)) {
    for (const pattern of config.patterns) {
      if (pattern.test(prompt)) {
        detected.push(domain);
        break;
      }
    }
  }
  return detected;
}

// Build knowledge injection based on detected domains
function buildKnowledgeInjection(domains) {
  if (domains.length === 0) return null;

  const parts = [];
  const algorithms = [];
  const concepts = [];

  for (const domain of domains.slice(0, 3)) { // Limit to 3 domains
    const config = DOMAIN_KNOWLEDGE[domain];
    algorithms.push(...config.algorithms.slice(0, 2));
    concepts.push(...config.concepts.slice(0, 2));
  }

  if (algorithms.length > 0) {
    parts.push(`ALGORITHMS: ${[...new Set(algorithms)].join(", ")}`);
  }
  if (concepts.length > 0) {
    parts.push(`KEY FORMULAS: ${concepts.join(" | ")}`);
  }

  return parts.join(" | ");
}

// Load tribal knowledge for specific domain
async function loadTribalKnowledge(domains) {
  try {
    const raw = await fs.readFile(TRIBAL_FILE, "utf8");
    const data = JSON.parse(raw);
    const tips = data.tips || [];

    // Filter tips by domain tags
    const relevant = tips.filter(tip => {
      const tags = (tip.tags || []).map(t => t.toLowerCase());
      return domains.some(d => tags.includes(d) || tags.some(t => t.includes(d)));
    }).slice(0, 3);

    if (relevant.length > 0) {
      return `TRIBAL TIPS: ${relevant.map(t => t.text || t.tip).join(" | ")}`;
    }
  } catch {}
  return null;
}

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
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

  // Add domain detection
  parts.push(`DOMAINS DETECTED: ${domains.join(", ")}`);

  // Add formula/algorithm knowledge
  const knowledge = buildKnowledgeInjection(domains);
  if (knowledge) {
    parts.push(knowledge);
  }

  // Add tribal knowledge if available
  const tribal = await loadTribalKnowledge(domains);
  if (tribal) {
    parts.push(tribal);
  }

  // Add reasoning hints
  parts.push("Apply these formulas/algorithms where relevant. Cross-reference with PRISM registries for constants.");

  process.stdout.write(JSON.stringify({
    additionalContext: `KAR INJECTION: ${parts.join(" | ")}`,
  }));
}

main().catch(() => process.stdout.write(JSON.stringify({ continue: true })));
